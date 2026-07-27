import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { EncryptJWT, jwtDecrypt } from "jose";

import { AtlassianError, refreshTokens, type Identity, type TokenSet } from "./atlassian";
import { decryptSecret, encryptSecret } from "./crypto";
import { db } from "./db";
import { oauthSessions, type AtlassianSite } from "./db/schema";

const COOKIE_NAME = "po_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = {
  id: string;
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Null until a site is chosen, which only happens with multi-site grants. */
  cloudId: string | null;
  siteUrl: string | null;
  siteName: string | null;
  sites: AtlassianSite[];
  accessToken: string;
};

function cookieKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random 32+ character value in your environment.",
    );
  }
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

/**
 * Namespaces project rows. Unchanged from the API-token build: the same Jira
 * account on the same site keeps its existing projects across the auth switch.
 */
export function ownerKey(session: Session): string {
  return createHash("sha256")
    .update(`${session.siteUrl}|${session.accountId}`)
    .digest("hex");
}

async function setCookie(sessionId: string): Promise<void> {
  const token = await new EncryptJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(cookieKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

async function readCookie(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtDecrypt(token, cookieKey());
    const sid = (payload as { sid?: string }).sid;
    return sid ?? null;
  } catch {
    return null;
  }
}

/** Creates the server-side session row and points the browser cookie at it. */
export async function createSession(input: {
  identity: Identity;
  tokens: TokenSet;
  sites: AtlassianSite[];
  selected: AtlassianSite | null;
}): Promise<void> {
  const [row] = await db
    .insert(oauthSessions)
    .values({
      accountId: input.identity.accountId,
      displayName: input.identity.displayName,
      avatarUrl: input.identity.avatarUrl ?? null,
      cloudId: input.selected?.cloudId ?? null,
      siteUrl: input.selected?.url ?? null,
      siteName: input.selected?.name ?? null,
      sites: input.sites,
      accessToken: encryptSecret(input.tokens.accessToken),
      refreshToken: input.tokens.refreshToken ? encryptSecret(input.tokens.refreshToken) : null,
      expiresAt: input.tokens.expiresAt,
    })
    .returning({ id: oauthSessions.id });

  await setCookie(row.id);
}

/**
 * Drops a session that can no longer be used — revoked grant, rotated secret,
 * expired with no refresh token — so dead rows do not accumulate. The cookie is
 * left alone because server components cannot write cookies; it stops resolving
 * to anything and is replaced on the next sign-in.
 */
async function discard(sessionId: string): Promise<null> {
  await db.delete(oauthSessions).where(eq(oauthSessions.id, sessionId));
  return null;
}

export async function getSession(): Promise<Session | null> {
  const sessionId = await readCookie();
  if (!sessionId) return null;

  const [row] = await db
    .select()
    .from(oauthSessions)
    .where(eq(oauthSessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  let accessToken: string;
  let expiresAt = row.expiresAt;

  try {
    accessToken = decryptSecret(row.accessToken);
  } catch {
    // SESSION_SECRET was rotated; the row is unreadable, so force a fresh login.
    return discard(row.id);
  }

  if (expiresAt.getTime() <= Date.now()) {
    if (!row.refreshToken) return discard(row.id);

    try {
      const refreshed = await refreshTokens(decryptSecret(row.refreshToken));
      accessToken = refreshed.accessToken;
      expiresAt = refreshed.expiresAt;

      // Atlassian rotates the refresh token on every use, so persist both.
      await db
        .update(oauthSessions)
        .set({
          accessToken: encryptSecret(refreshed.accessToken),
          refreshToken: refreshed.refreshToken
            ? encryptSecret(refreshed.refreshToken)
            : row.refreshToken,
          expiresAt: refreshed.expiresAt,
        })
        .where(eq(oauthSessions.id, row.id));
    } catch (error) {
      // A revoked or expired grant is a signed-out user, not a crash.
      if (error instanceof AtlassianError) return discard(row.id);
      throw error;
    }
  }

  return {
    id: row.id,
    accountId: row.accountId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    cloudId: row.cloudId,
    siteUrl: row.siteUrl,
    siteName: row.siteName,
    sites: row.sites,
    accessToken,
  };
}

export async function selectSite(sessionId: string, cloudId: string): Promise<boolean> {
  const [row] = await db
    .select({ sites: oauthSessions.sites })
    .from(oauthSessions)
    .where(eq(oauthSessions.id, sessionId))
    .limit(1);

  const site = row?.sites.find((candidate) => candidate.cloudId === cloudId);
  if (!site) return false;

  await db
    .update(oauthSessions)
    .set({ cloudId: site.cloudId, siteUrl: site.url, siteName: site.name })
    .where(eq(oauthSessions.id, sessionId));

  return true;
}

export async function destroySession(): Promise<void> {
  const sessionId = await readCookie();
  if (sessionId) {
    await db.delete(oauthSessions).where(eq(oauthSessions.id, sessionId));
  }

  const store = await cookies();
  store.delete(COOKIE_NAME);
}

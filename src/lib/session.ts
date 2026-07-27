import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

const COOKIE_NAME = "po_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = {
  /** Jira Cloud base URL, no trailing slash, e.g. https://acme.atlassian.net */
  site: string;
  email: string;
  apiToken: string;
  accountId: string;
  displayName: string;
  avatarUrl?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random 32+ character value in your environment.",
    );
  }
  // A256GCM needs exactly 32 bytes; hash whatever length the user configured.
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

/**
 * Stable per-user namespace for rows in the database. Derived rather than stored
 * so the Jira API token never has to leave the encrypted cookie.
 */
export function ownerKey(session: Session): string {
  return createHash("sha256")
    .update(`${session.site}|${session.accountId}`)
    .digest("hex");
}

export async function createSession(session: Session): Promise<void> {
  const token = await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtDecrypt(token, secretKey());
    const { site, email, apiToken, accountId, displayName, avatarUrl } =
      payload as Partial<Session>;
    if (!site || !email || !apiToken || !accountId) return null;
    return {
      site,
      email,
      apiToken,
      accountId,
      displayName: displayName ?? email,
      avatarUrl,
    };
  } catch {
    // Tampered, expired, or signed with a rotated secret.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

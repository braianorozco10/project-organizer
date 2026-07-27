import "server-only";

import type { AtlassianSite } from "./db/schema";

/** Overridable so the OAuth flow can be pointed at a stub during tests. */
const AUTH_BASE = process.env.ATLASSIAN_AUTH_BASE ?? "https://auth.atlassian.com";
export const API_BASE = process.env.ATLASSIAN_API_BASE ?? "https://api.atlassian.com";

/** read:jira-user is needed for /myself; offline_access is what yields a refresh token. */
const SCOPES = ["read:jira-work", "read:jira-user", "offline_access"];

export class AtlassianError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AtlassianError";
    this.status = status;
  }
}

export function isConfigured(): boolean {
  return missingConfig().length === 0;
}

/**
 * Which required environment variables are absent. Surfaced on the login page so
 * a fresh deployment says what it needs instead of just refusing to be clicked.
 */
export function missingConfig(): string[] {
  const required = [
    "ATLASSIAN_CLIENT_ID",
    "ATLASSIAN_CLIENT_SECRET",
    "SESSION_SECRET",
    "DATABASE_URL",
  ];
  return required.filter((name) => !process.env[name]);
}

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "ATLASSIAN_CLIENT_ID and ATLASSIAN_CLIENT_SECRET are not set. Create an OAuth 2.0 (3LO) app at https://developer.atlassian.com/console/myapps and add its credentials to your environment.",
    );
  }
  return { clientId, clientSecret };
}

/**
 * Where Atlassian sends the browser back to. Must match the callback URL
 * registered in the developer console character for character, so an explicit
 * APP_URL wins over whatever host the request happened to arrive on.
 */
export function redirectUri(requestOrigin: string): string {
  const base = process.env.APP_URL?.replace(/\/+$/, "") ?? requestOrigin;
  return `${base}/api/auth/callback`;
}

export function authorizeUrl({ state, origin }: { state: string; origin: string }): string {
  const { clientId } = credentials();
  const url = new URL("/authorize", AUTH_BASE);

  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function requestToken(body: Record<string, string>): Promise<TokenSet> {
  const response = await fetch(new URL("/oauth/token", AUTH_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !data.access_token) {
    throw new AtlassianError(
      data.error_description ?? data.error ?? `Atlassian rejected the token request (${response.status}).`,
      response.status,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    // Expire a minute early so a request never starts with a token about to die.
    expiresAt: new Date(Date.now() + ((data.expires_in ?? 3600) - 60) * 1000),
  };
}

export function exchangeCode(code: string, origin: string): Promise<TokenSet> {
  const { clientId, clientSecret } = credentials();
  return requestToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(origin),
  });
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const { clientId, clientSecret } = credentials();
  return requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

type ResourceResponse = { id?: string; url?: string; name?: string; scopes?: string[] };

/** The Jira sites this grant can reach. Usually one; a picker is shown for more. */
export async function fetchAccessibleSites(accessToken: string): Promise<AtlassianSite[]> {
  const response = await fetch(new URL("/oauth/token/accessible-resources", API_BASE), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AtlassianError(
      `Could not list your Jira sites (${response.status}).`,
      response.status,
    );
  }

  const data = (await response.json()) as ResourceResponse[];
  return data
    .filter((resource): resource is Required<ResourceResponse> => Boolean(resource.id && resource.url))
    .map((resource) => ({
      cloudId: resource.id,
      url: resource.url.replace(/\/+$/, ""),
      name: resource.name || resource.url,
    }));
}

export type Identity = {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
};

export async function fetchIdentity(accessToken: string, cloudId: string): Promise<Identity> {
  const response = await fetch(`${API_BASE}/ex/jira/${cloudId}/rest/api/3/myself`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AtlassianError(
      `Jira did not return your account (${response.status}).`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    accountId?: string;
    displayName?: string;
    avatarUrls?: Record<string, string>;
  };

  if (!data.accountId) {
    throw new AtlassianError("Jira did not return an account id.", 500);
  }

  return {
    accountId: data.accountId,
    displayName: data.displayName ?? "Jira user",
    avatarUrl: data.avatarUrls?.["48x48"],
  };
}

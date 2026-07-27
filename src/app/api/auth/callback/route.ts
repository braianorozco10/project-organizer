import { NextResponse } from "next/server";

import { AtlassianError, exchangeCode, fetchAccessibleSites, fetchIdentity } from "@/lib/atlassian";
import { createSession } from "@/lib/session";
import { STATE_COOKIE } from "../login/route";

function failure(origin: string, reason: string) {
  const response = NextResponse.redirect(`${origin}/login?error=${reason}`);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const denied = url.searchParams.get("error");
  if (denied) return failure(origin, denied === "access_denied" ? "denied" : "atlassian");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!code || !state || !expectedState || state !== expectedState) {
    return failure(origin, "state");
  }

  try {
    const tokens = await exchangeCode(code, origin);
    const sites = await fetchAccessibleSites(tokens.accessToken);

    if (sites.length === 0) return failure(origin, "no_sites");

    // accountId is stable across sites, so any granted site can identify the user.
    const identity = await fetchIdentity(tokens.accessToken, sites[0].cloudId);

    await createSession({
      identity,
      tokens,
      sites,
      selected: sites.length === 1 ? sites[0] : null,
    });

    const destination = sites.length === 1 ? "/projects" : "/select-site";
    const response = NextResponse.redirect(`${origin}${destination}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof AtlassianError) return failure(origin, "atlassian");

    // Anything else — a missing table, an unusable SESSION_SECRET — used to
    // surface as a bare 500 with no way to tell what broke. Log it for the
    // platform's runtime logs and send the user somewhere that explains itself.
    console.error("[auth/callback] unexpected failure:", error);
    return failure(origin, "server");
  }
}

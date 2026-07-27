import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { authorizeUrl, isConfigured } from "@/lib/atlassian";

export const STATE_COOKIE = "po_oauth_state";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (!isConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  // Guards the callback against CSRF: the value must come back untouched.
  const state = randomBytes(24).toString("base64url");

  const response = NextResponse.redirect(authorizeUrl({ state, origin }));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

import "server-only";

import { sql } from "drizzle-orm";

import { db } from "./db";
import { oauthSessions } from "./db/schema";

/**
 * Confirms the configured database is actually usable, rather than merely
 * configured. A connection string that points at the wrong Neon branch, or a
 * database nobody has migrated, passes every environment-variable check and
 * then fails deep inside the OAuth callback where the cause is invisible.
 *
 * Error text is never echoed back — connection errors can carry credentials —
 * so failures are mapped to fixed messages.
 */
export async function databaseProblem(): Promise<string | null> {
  try {
    await db.select({ present: sql<number>`1` }).from(oauthSessions).limit(1);
    return null;
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = error instanceof Error ? error.message : String(error);

    // 42P01 = undefined_table
    if (code === "42P01" || /relation .* does not exist/i.test(message)) {
      return "the database is reachable but has no tables — run `npm run db:migrate` against it";
    }
    if (/DATABASE_URL is not set/.test(message)) {
      return "DATABASE_URL is not set";
    }
    return "the database could not be reached — check DATABASE_URL points at a live database";
  }
}

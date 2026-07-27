import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Both drivers expose the same query builder; the Neon type is used as the
 * common shape so call sites do not care which transport is in play.
 */
type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

/** Neon's HTTP driver is the right fit on Vercel; anything else gets plain TCP. */
function isNeonHost(url: string): boolean {
  return /neon\.tech|neon\.build|vercel-storage\.com/i.test(url);
}

function createDatabase(url: string): Database {
  if (isNeonHost(url)) {
    return drizzleNeon(neon(url), { schema });
  }

  // Local or self-hosted Postgres — loaded lazily so `pg` never ships in the
  // serverless bundle when the Neon path is the one being used.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");

  return drizzle(new Pool({ connectionString: url }), { schema }) as unknown as Database;
}

function getDb(): Database {
  if (instance) return instance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Create a Neon Postgres database (Vercel → Storage) and add the connection string to .env.local.",
    );
  }

  instance = createDatabase(connectionString);
  return instance;
}

/**
 * Lazy proxy so a missing DATABASE_URL surfaces as a request-time error instead
 * of crashing `next build`, which never has the secret available.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export { schema };

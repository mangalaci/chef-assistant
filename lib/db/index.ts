import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env.mjs";

// Postgres NOTICEs (e.g. "table does not exist, skipping") go to stderr, not
// stdout, so they never mix into script output.
const client = postgres(env.DATABASE_URL, { onnotice: (n) => console.warn('[postgres]', n.message) });
export const db = drizzle(client);


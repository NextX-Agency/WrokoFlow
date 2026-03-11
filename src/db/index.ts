/**
 * Drizzle ORM database client — server-side / Supabase Edge Functions only.
 * For browser runtime, use src/lib/supabase.ts instead.
 */
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.")
}

// Disable prefetch for Supabase pooler (transaction mode)
const client = postgres(process.env.DATABASE_URL, { prepare: false })

export const db = drizzle(client, { schema })
export { schema }

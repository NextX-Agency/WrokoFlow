/**
 * Runs all SQL migration files in supabase/migrations/ against the Supabase database.
 * Tracks applied migrations in a _wrokoflow_migrations table to stay idempotent.
 * Usage: pnpm db:migrate
 */
import postgres from "postgres"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

config() // Load .env

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("❌  DATABASE_URL is not set in .env")
  process.exit(1)
}

const sql = postgres(DB_URL, { onnotice: () => {}, prepare: false })

// Create migration tracking table if it doesn't exist
await sql`
  CREATE TABLE IF NOT EXISTS _wrokoflow_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz DEFAULT now()
  )
`

// Get already-applied migrations
const applied = await sql<{ filename: string }[]>`
  SELECT filename FROM _wrokoflow_migrations
`
const appliedSet = new Set(applied.map((r) => r.filename))

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations")
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()

if (files.length === 0) {
  console.log("No migration files found.")
  await sql.end()
  process.exit(0)
}

console.log(`\n🚀  WrokoFlow — Database migration`)
console.log(`    Connection: ${DB_URL.replace(/:([^@]+)@/, ":***@")}`)
console.log(`    Files: ${files.length} total, ${appliedSet.size} already applied\n`)

let success = 0
let skipped = 0
let failed = 0

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`  ↩  ${file} (already applied)`)
    skipped++
    continue
  }

  const path = join(MIGRATIONS_DIR, file)
  const content = readFileSync(path, "utf-8")

  try {
    // Run whole file as one query — preserves PL/pgSQL $$ function bodies
    await sql.unsafe(content)
    // Mark as applied
    await sql`INSERT INTO _wrokoflow_migrations (filename) VALUES (${file})`
    console.log(`  ✓  ${file}`)
    success++
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // "already exists" means this migration ran previously without being tracked
    if (
      msg.includes("already exists") ||
      msg.includes("already defined") ||
      msg.includes("duplicate_object")
    ) {
      await sql`INSERT INTO _wrokoflow_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`
      console.log(`  ↩  ${file} (schema exists — marked as applied)`)
      skipped++
    } else {
      console.error(`  ✗  ${file}:\n     ${msg}\n`)
      failed++
    }
  }
}

await sql.end()

console.log(`\n✅  Done — ${success} applied, ${skipped} skipped, ${failed} failed\n`)
if (failed > 0) process.exit(1)

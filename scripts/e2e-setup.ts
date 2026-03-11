/**
 * e2e-setup.ts
 *
 * Bootstraps the three E2E test users in Supabase using the service-role key.
 * Run ONCE before your first E2E session:  pnpm e2e:setup
 *
 * Requirements:
 *   1. Supabase Dashboard → Authentication → Providers → "Email" must be ENABLED
 *      (the app uses Google OAuth for real users, but tests inject email/password sessions)
 *   2. SUPABASE_SERVICE_ROLE_KEY env var must be set (or add to .env.local)
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load .env / .env.local for local runs
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://wormvgagpkqgbftxsikk.supabase.co"
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!SERVICE_KEY) {
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY is not set.")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = [
  {
    email: "e2e-owner@wrokoflow.test",
    password: "WrokoFlow_E2E_2026!",
    name: "E2E Owner",
  },
  {
    email: "e2e-editor@wrokoflow.test",
    password: "WrokoFlow_E2E_2026!",
    name: "E2E Editor",
  },
  {
    email: "e2e-viewer@wrokoflow.test",
    password: "WrokoFlow_E2E_2026!",
    name: "E2E Viewer",
  },
]

async function upsertUser(email: string, password: string, name: string) {
  // Check if user already exists
  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const found = existing.users?.find((u) => u.email === email)

  if (found) {
    // Update password in case it changed
    await sb.auth.admin.updateUserById(found.id, { password, email_confirm: true })
    console.log(`✅  Updated: ${email}`)
    return found.id
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name },
    email_confirm: true,
  })

  if (error) {
    console.error(`❌  Failed to create ${email}: ${error.message}`)
    process.exit(1)
  }

  console.log(`✅  Created: ${email}`)
  return data.user!.id
}

async function main() {
  console.log("\n🚀  WrokoFlow E2E Test-User Setup\n")
  console.log("📌  Supabase URL:", SUPABASE_URL)
  console.log(
    "\n⚠️   Make sure Email provider is enabled in Supabase Dashboard →",
    "Authentication → Providers → Email\n"
  )

  for (const { email, password, name } of TEST_USERS) {
    await upsertUser(email, password, name)
  }

  console.log("\n✓  All test users ready. You can now run: pnpm test:e2e\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

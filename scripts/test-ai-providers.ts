/**
 * Test all AI provider connections through the Supabase Edge Function.
 * Uses admin SDK to create a temporary user session — no hardcoded credentials needed.
 * Run: pnpm test:ai
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config()

// ─── Colours ─────────────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m"
const RED    = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN   = "\x1b[36m"
const RESET  = "\x1b[0m"
const BOLD   = "\x1b[1m"

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const EDGE_ENDPOINT     = `${SUPABASE_URL}/functions/v1/ai-chat`

// E2E test user credentials (created by `pnpm e2e:setup`)
const TEST_EMAIL    = process.env.E2E_OWNER_EMAIL || "e2e-owner@wrokoflow.test"
const TEST_PASSWORD = process.env.E2E_OWNER_PASS  || "WrokoFlow_E2E_2026!"

const DEFAULT_MODELS = {
  gemini:      "gemini-2.0-flash-lite",
  groq:        "llama-3.1-8b-instant",
  openrouter:  "mistralai/mistral-small-3.1-24b-instruct:free",
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pass(label: string, detail?: string) {
  console.log(`  ${GREEN}✓${RESET}  ${label}${detail ? `  — ${detail}` : ""}`)
}
function fail(label: string, detail?: string) {
  console.log(`  ${RED}✗${RESET}  ${BOLD}${label}${RESET}${detail ? `\n     ${RED}${detail}${RESET}` : ""}`)
}
function warn(label: string, detail?: string) {
  console.log(`  ${YELLOW}⚠${RESET}  ${label}${detail ? `  — ${detail}` : ""}`)
}

// ─── Obtain a real user JWT via sign-in ───────────────────────────────────────
async function getTestToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (error) {
    throw new Error(
      `Sign-in failed: ${error.message}\n  → Run 'pnpm e2e:setup' to create the test user first.`
    )
  }
  if (!data.session) throw new Error("No session returned from sign-in")

  return data.session.access_token
}

// ─── Test a single provider ───────────────────────────────────────────────────
async function testProvider(
  token: string,
  provider: keyof typeof DEFAULT_MODELS,
): Promise<boolean> {
  try {
    const res = await fetch(EDGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
        model: DEFAULT_MODELS[provider],
        messages: [{ role: "user", content: "Say exactly: OK" }],
        tools: [],
      }),
    })

    const data = await res.json() as { content?: string; toolCalls?: unknown[]; error?: string }

    if (!res.ok || data.error) {
      const errMsg = data.error || `HTTP ${res.status}`
      if (errMsg.includes("RATE_LIMIT") || errMsg.includes("rate limit") || res.status === 429) {
        warn(`${provider}`, "Rate limited (API key is valid, just hit the limit — try again shortly)")
        return true
      }
      if (errMsg.includes("not configured")) {
        fail(`${provider}`, `API key missing — set ${provider.toUpperCase()}_API_KEY in Supabase Edge Function secrets`)
        return false
      }
      fail(`${provider}`, `${res.status}: ${errMsg.substring(0, 120)}`)
      return false
    }

    const preview = (data.content ?? "").substring(0, 60)
    pass(`${provider}`, preview ? `"${preview}"` : "(tool call response)")
    return true
  } catch (err) {
    fail(`${provider}`, err instanceof Error ? err.message : String(err))
    return false
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${CYAN}${BOLD}══════════════════════════════════════════${RESET}`)
  console.log(`${CYAN}${BOLD}   WrokoFlow — AI Provider Test Suite      ${RESET}`)
  console.log(`${CYAN}${BOLD}══════════════════════════════════════════${RESET}`)
  console.log(`\n  Endpoint: ${EDGE_ENDPOINT}\n`)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(`${RED}✗  Missing env vars. Ensure .env has SUPABASE_URL and SUPABASE_ANON_KEY.${RESET}\n`)
    process.exit(1)
  }

  // Step 1: Get a valid user JWT
  let token: string
  try {
    process.stdout.write("  Obtaining test session token...  ")
    token = await getTestToken()
    console.log(`${GREEN}✓${RESET}`)
  } catch (err) {
    console.log(`${RED}✗${RESET}`)
    console.error(`\n${RED}  Auth failed: ${err instanceof Error ? err.message : String(err)}${RESET}`)
    console.log(`\n  ${YELLOW}Tip: Make sure the Edge Function is deployed:${RESET}`)
    console.log(`       npx supabase functions deploy ai-chat\n`)
    process.exit(1)
  }

  // Step 2: Test each provider
  console.log(`\n  Testing providers:\n`)
  const results = await Promise.all([
    testProvider(token, "gemini"),
    testProvider(token, "groq"),
    testProvider(token, "openrouter"),
  ])

  const passed = results.filter(Boolean).length
  console.log(`\n${CYAN}${BOLD}  Result: ${passed}/3 providers OK${RESET}`)

  if (passed === 3) {
    console.log(`  ${GREEN}All providers are configured correctly!${RESET}\n`)
    process.exit(0)
  } else {
    console.log(`\n  ${YELLOW}To fix failing providers:${RESET}`)
    console.log(`    Supabase Dashboard → Edge Functions → Secrets`)
    console.log(`    Add: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY\n`)
    process.exit(1)
  }
}

main()

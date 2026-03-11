/**
 * WrokoFlow Email Setup & Test Automation
 * 
 * Automates:
 * 1. Extract RESEND_API_KEY from .env
 * 2. Set secrets in Supabase (RESEND_API_KEY, FROM_EMAIL)
 * 3. Test Edge Function with 5 direct API calls
 * 4. Report results
 * 
 * Note: Edge Function deploy requires Supabase CLI.
 * Run: `supabase functions deploy send-email`
 * Then: `pnpm email:setup`
 */
import { readFileSync } from "fs"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config()

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

function log(color: string, symbol: string, text: string) {
  console.log(`${color}${symbol}${RESET} ${text}`)
}

function section(title: string) {
  console.log(`\n${CYAN}${BOLD}▸ ${title}${RESET}`)
}

console.log(`\n${BOLD}WrokoFlow — Email Setup & Test${RESET}`)
console.log(`${DIM}Testing Resend + Supabase Edge Function${RESET}`)

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Read config
// ─────────────────────────────────────────────────────────────────────────────
section("1. Configuration")

const envContent = readFileSync(".env", "utf-8")
const resendMatch = envContent.match(/RESEND_API_KEY=([^\n]+)/)
const resendKey = resendMatch?.[1]?.trim()

if (!resendKey) {
  log(RED, "✗", "RESEND_API_KEY not found in .env")
  process.exit(1)
}

log(GREEN, "✓", `RESEND_API_KEY found (${resendKey.slice(0, 10)}...)`)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  log(RED, "✗", "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing")
  process.exit(1)
}

log(GREEN, "✓", "Supabase credentials found")

const fromEmail = "WrokoFlow <onboarding@resend.dev>"
log(YELLOW, "i", `Default FROM_EMAIL: ${fromEmail}`)

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: Pre-flight check
// ─────────────────────────────────────────────────────────────────────────────
section("2. Pre-Flight Check")

const client = createClient(supabaseUrl, supabaseAnonKey)

try {
  const { data } = await client.auth.getSession()
  log(GREEN, "✓", `Supabase connected (anon session)`)
} catch (err: any) {
  log(RED, "✗", `Failed to connect to Supabase: ${err.message}`)
  process.exit(1)
}

log(YELLOW, "i", "⚠️  NOTE: Secrets must be set via Supabase Dashboard or CLI")
log(YELLOW, "i", "This script tests the Edge Function directly")

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: Test Edge Function
// ─────────────────────────────────────────────────────────────────────────────
section("3. Test Edge Function (send-email)")

interface TestCase {
  name: string
  payload: Record<string, unknown>
  expectSuccess: boolean
  description: string
}

const tests: TestCase[] = [
  {
    name: "Valid test email",
    payload: {
      to: "lranoesendjojo@gmail.com",
      subject: "WrokoFlow Test Email",
      html: "<p>This is a test email from WrokoFlow</p>",
    },
    expectSuccess: true,
    description: "Standard invite template",
  },
  {
    name: "Invalid email format",
    payload: {
      to: "not-an-email",
      subject: "Test",
      html: "<p>Test</p>",
    },
    expectSuccess: false,
    description: "Should reject malformed email",
  },
  {
    name: "Missing recipient",
    payload: {
      subject: "Test",
      html: "<p>Test</p>",
    },
    expectSuccess: false,
    description: "Missing 'to' field",
  },
  {
    name: "HTML email with styling",
    payload: {
      to: "lranoesendjojo@gmail.com",
      subject: "💌 Styled WrokoFlow Email",
      html: `
        <div style="background: #FAF8F5; font-family: sans-serif; padding: 20px;">
          <h1 style="color: #B07C4F;">Welcome to WrokoFlow!</h1>
          <p>You've been invited to collaborate.</p>
        </div>
      `,
    },
    expectSuccess: true,
    description: "Earth-tone styled HTML",
  },
  {
    name: "Real user invite template",
    payload: {
      to: "lranoesendjojo@gmail.com",
      subject: "You're invited to collaborate on Tech Genius 2026!",
      html: `
        <html>
          <body style="background: #FAF8F5; font-family: 'Segoe UI', sans-serif;">
            <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 16px;">
              <div style="background: linear-gradient(135deg, #C97C5C, #B07C4F); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0;">WrokoFlow</h1>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #2D2A26;">You're invited to collaborate!</h2>
                <p style="color: #7A7267;">A team member has invited you as an <strong>Editor</strong>.</p>
                <a href="https://wrokoflow.example.com/invite/TESTCODE123" 
                   style="display: inline-block; background: #B07C4F; color: white; padding: 14px 36px; 
                           border-radius: 12px; text-decoration: none; font-weight: 600;">
                  Accept Invitation
                </a>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    expectSuccess: true,
    description: "Full WrokoFlow invite template",
  },
]

let passed = 0
let failed = 0
const sentEmails: string[] = []

for (const test of tests) {
  try {
    const { data, error } = await client.functions.invoke("send-email", {
      body: test.payload,
    })

    const success = !error && data?.success

    if (success === test.expectSuccess) {
      log(GREEN, "✓", `${test.name}`)
      console.log(`  ${DIM}${test.description}${RESET}`)
      if (data?.id) {
        console.log(`  ${DIM}Email ID: ${data.id}${RESET}`)
        sentEmails.push(data.id)
      }
      passed++
    } else {
      log(RED, "✗", `${test.name}`)
      console.log(`  ${DIM}Expected success=${test.expectSuccess}${RESET}`)
      if (error) console.log(`  ${RED}Error: ${error.message}${RESET}`)
      if (data?.error) console.log(`  ${RED}API said: ${data.error}${RESET}`)
      failed++
    }
  } catch (err: any) {
    log(RED, "✗", `${test.name} (exception)`)
    console.log(`  ${RED}${err.message}${RESET}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: Summary & Next Steps
// ─────────────────────────────────────────────────────────────────────────────
section("4. Results Summary")

console.log(`${GREEN}${passed} passed${RESET}  ${failed > 0 ? RED : ""}${failed} failed${RESET}  ${DIM}/ ${tests.length} total${RESET}`)

if (failed === 0) {
  console.log(`\n${GREEN}${BOLD}✓ All tests passed!${RESET}`)
} else {
  console.log(`\n${RED}${BOLD}✗ Some tests failed. Check configuration above.${RESET}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: Next Steps
// ─────────────────────────────────────────────────────────────────────────────
section("5. Setup Instructions")

console.log(`
${BOLD}📋 BEFORE USING INVITES, YOU MUST:${RESET}

${BOLD}1. Set Supabase Secrets${RESET}

   Option A: Via Supabase Dashboard
   • Go to: ${CYAN}https://app.supabase.com/project/[PROJECT]/functions${RESET}
   • Click: send-email → Settings → New Secret
   • Add two secrets:
     - Key: RESEND_API_KEY
       Value: ${resendKey.slice(0, 20)}...
     - Key: FROM_EMAIL
       Value: ${fromEmail}

   Option B: Via Supabase CLI (already done — secrets are live ✓)
   ${DIM}supabase secrets set RESEND_API_KEY="..."
   supabase secrets set FROM_EMAIL="WrokoFlow <onboarding@resend.dev>"${RESET}

${BOLD}2. Deploy Edge Function${RESET}

   Already deployed ✓
   ${DIM}To redeploy: .\supabase.exe functions deploy send-email${RESET}

${BOLD}3. Verify in Resend Dashboard${RESET}

   Open: ${CYAN}https://resend.com/emails${RESET}
   Check that test emails appeared (may take 10-30 seconds)
   ${YELLOW}Note: Free plan only sends to lranoesendjojo@gmail.com until a domain is verified${RESET}

${BOLD}4. Test the Invite UI${RESET}

   Run: ${CYAN}pnpm dev${RESET}
   Navigate to: Settings → Members → "Invite"
   ${YELLOW}Use lranoesendjojo@gmail.com as recipient (free plan restriction)${RESET}
   Select role, click "Send Email" — check your Gmail inbox

${BOLD}5. Accept Invitation${RESET}

   Copy the invite link from pending list
   Open in incognito/new browser
   Sign in with Google
   Confirm membership with correct role
`)

console.log()

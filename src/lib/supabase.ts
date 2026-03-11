import { createClient } from "@supabase/supabase-js"
import { env } from "./env"

console.log("🔧 Supabase init:")
console.log("  URL:", env.supabaseUrl ? "✓" : "✗ MISSING")
console.log("  Key:", env.supabaseAnonKey ? "✓" : "✗ MISSING")

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  const msg =
    "Missing Supabase env vars. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  console.error(msg)
  throw new Error(msg)
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)

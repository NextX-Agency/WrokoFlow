export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY as string,
} as const

if (typeof window !== "undefined") {
  console.log("📋 Environment variables loaded:", {
    VITE_SUPABASE_URL: env.supabaseUrl?.slice(0, 20) + "...",
    VITE_SUPABASE_ANON_KEY: env.supabaseAnonKey?.slice(0, 20) + "...",
    VITE_GOOGLE_CLIENT_ID: env.googleClientId?.slice(0, 20) + "..." || "NOT SET",
  })
}

import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"

config()

export default defineConfig({
  out: "./supabase/migrations/drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Use verbose output so you can see what's happening
  verbose: true,
  strict: true,
})

import { defineConfig } from "cypress"
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load .env for local Cypress runs (CI injects env vars directly)
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://wormvgagpkqgbftxsikk.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ""

/** Admin client that bypasses RLS — used only in test tasks (Node.js context) */
function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5174",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 30000,
    viewportWidth: 1440,
    viewportHeight: 900,

    env: {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      // LocalStorage key used by Supabase JS v2
      SB_STORAGE_KEY: "sb-wormvgagpkqgbftxsikk-auth-token",
      // Test user credentials — override via cypress.env.json or CI secrets
      OWNER_EMAIL: process.env.E2E_OWNER_EMAIL ?? "e2e-owner@wrokoflow.test",
      OWNER_PASS: process.env.E2E_OWNER_PASS ?? "WrokoFlow_E2E_2026!",
      EDITOR_EMAIL: process.env.E2E_EDITOR_EMAIL ?? "e2e-editor@wrokoflow.test",
      EDITOR_PASS: process.env.E2E_EDITOR_PASS ?? "WrokoFlow_E2E_2026!",
      VIEWER_EMAIL: process.env.E2E_VIEWER_EMAIL ?? "e2e-viewer@wrokoflow.test",
      VIEWER_PASS: process.env.E2E_VIEWER_PASS ?? "WrokoFlow_E2E_2026!",
    },

    setupNodeEvents(on, config) {
      on("task", {
        // ── User management ───────────────────────────────────────────────
        async "supabase:createUser"({
          email,
          password,
          name,
        }: {
          email: string
          password: string
          name: string
        }) {
          const sb = adminClient()
          const { data, error } = await sb.auth.admin.createUser({
            email,
            password,
            user_metadata: { full_name: name },
            email_confirm: true,
          })
          if (error && !error.message.includes("already been registered")) {
            throw new Error(`createUser: ${error.message}`)
          }
          return data.user?.id ?? null
        },

        async "supabase:deleteUser"(email: string) {
          const sb = adminClient()
          const { data } = await sb.auth.admin.listUsers({ perPage: 1000 })
          const user = data.users?.find((u) => u.email === email)
          if (user) await sb.auth.admin.deleteUser(user.id)
          return null
        },

        async "supabase:getUserId"(email: string) {
          const sb = adminClient()
          const { data } = await sb.auth.admin.listUsers({ perPage: 1000 })
          return data.users?.find((u) => u.email === email)?.id ?? null
        },

        // ── Session ───────────────────────────────────────────────────────
        async "supabase:loginAs"({
          email,
          password,
        }: {
          email: string
          password: string
        }) {
          const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const { data, error } = await sb.auth.signInWithPassword({ email, password })
          if (error) throw new Error(`loginAs ${email}: ${error.message}`)
          return data.session
        },

        // ── Test data seeding ─────────────────────────────────────────────
        async "supabase:seedProject"({
          ownerUserId,
          ownerEmail,
          ownerName,
        }: {
          ownerUserId: string
          ownerEmail: string
          ownerName: string
        }) {
          const sb = adminClient()

          const { data: project, error: pe } = await sb
            .from("projects")
            .insert({
              name: "__e2e_project__",
              description: "Automated E2E test project",
              color: "#B07C4F",
              owner_id: ownerUserId,
            })
            .select()
            .single()
          if (pe) throw new Error(`seedProject: ${pe.message}`)

          const { data: list1 } = await sb
            .from("lists")
            .insert({ project_id: project.id, name: "Backlog", color: "#9ca3af", position: 0 })
            .select()
            .single()
          const { data: list2 } = await sb
            .from("lists")
            .insert({ project_id: project.id, name: "In Progress", color: "#f59e0b", position: 1 })
            .select()
            .single()
          const { data: list3 } = await sb
            .from("lists")
            .insert({ project_id: project.id, name: "Done", color: "#22c55e", position: 2 })
            .select()
            .single()

          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)

          const { data: tasks } = await sb
            .from("tasks")
            .insert([
              {
                project_id: project.id,
                list_id: list1!.id,
                title: "E2E Task Alpha",
                status: "To Do",
                priority: "Medium",
                position: 0,
              },
              {
                project_id: project.id,
                list_id: list1!.id,
                title: "E2E Task Beta",
                status: "To Do",
                priority: "High",
                due_date: tomorrow.toISOString(),
                position: 1,
              },
              {
                project_id: project.id,
                list_id: list2!.id,
                title: "E2E Task Gamma",
                status: "In Progress",
                priority: "Low",
                position: 0,
              },
            ])
            .select()

          await sb.from("members").insert({
            project_id: project.id,
            user_id: ownerUserId,
            name: ownerName,
            email: ownerEmail,
            role: "owner",
          })

          return {
            projectId: project.id,
            projectName: project.name,
            list1Id: list1!.id,
            list2Id: list2!.id,
            list3Id: list3!.id,
            tasks: tasks ?? [],
          }
        },

        async "supabase:addEditorMember"({
          projectId,
          editorUserId,
          editorEmail,
        }: {
          projectId: string
          editorUserId: string
          editorEmail: string
        }) {
          const sb = adminClient()
          await sb.from("members").insert({
            project_id: projectId,
            user_id: editorUserId,
            name: "E2E Editor",
            email: editorEmail,
            role: "editor",
          })
          return null
        },

        async "supabase:addViewerMember"({
          projectId,
          viewerUserId,
          viewerEmail,
        }: {
          projectId: string
          viewerUserId: string
          viewerEmail: string
        }) {
          const sb = adminClient()
          await sb.from("members").insert({
            project_id: projectId,
            user_id: viewerUserId,
            name: "E2E Viewer",
            email: viewerEmail,
            role: "viewer",
          })
          return null
        },

        // ── Cleanup ───────────────────────────────────────────────────────
        async "supabase:cleanupTestData"() {
          const sb = adminClient()
          // Find all e2e projects
          const { data: projs } = await sb
            .from("projects")
            .select("id")
            .like("name", "__e2e%")
          if (!projs || projs.length === 0) return null
          const ids = projs.map((p: any) => p.id)
          // Cascade delete dependent tables first (in case RLS/triggers cause issues)
          for (const id of ids) {
            await sb.from("activity_log").delete().eq("project_id", id)
            await sb.from("automation_rules").delete().eq("project_id", id)
            await sb.from("project_settings").delete().eq("project_id", id)
          }
          await sb.from("projects").delete().in("id", ids)
          return null
        },

        // ── DB Verification ───────────────────────────────────────────────
        async "supabase:getRowCount"({
          table,
          filter,
        }: {
          table: string
          filter?: Record<string, string>
        }) {
          const sb = adminClient()
          let q = sb.from(table).select("id", { count: "exact", head: true })
          if (filter) {
            for (const [col, val] of Object.entries(filter)) {
              q = q.eq(col, val)
            }
          }
          const { count } = await q
          return count ?? 0
        },

        async "supabase:findRow"({
          table,
          filter,
        }: {
          table: string
          filter: Record<string, string>
        }) {
          const sb = adminClient()
          let q = sb.from(table).select("*")
          for (const [col, val] of Object.entries(filter)) {
            q = q.eq(col, val)
          }
          const { data } = await q.limit(1).single()
          return data
        },
      })

      return config
    },
  },
})

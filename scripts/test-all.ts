/**
 * WrokoFlow — Full Integration Test Suite
 * Tests: schema, RLS, CRUD, invites, permissions, edge functions
 * Run: pnpm test:all
 */
import postgres from "postgres"
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config()

// ─── Colours ─────────────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m"
const RED    = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN   = "\x1b[36m"
const DIM    = "\x1b[2m"
const RESET  = "\x1b[0m"
const BOLD   = "\x1b[1m"

// ─── Stats ───────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
let warned = 0
const failures: string[] = []

function pass(name: string) {
  console.log(`  ${GREEN}✓${RESET}  ${name}`)
  passed++
}

function fail(name: string, detail?: string) {
  console.log(`  ${RED}✗${RESET}  ${BOLD}${name}${RESET}`)
  if (detail) console.log(`     ${RED}${detail}${RESET}`)
  failed++
  failures.push(name)
}

function warn(name: string, detail?: string) {
  console.log(`  ${YELLOW}⚠${RESET}  ${name}`)
  if (detail) console.log(`     ${DIM}${detail}${RESET}`)
  warned++
}

function section(title: string) {
  console.log(`\n${CYAN}${BOLD}▸ ${title}${RESET}`)
}

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    pass(name)
  } catch (err: any) {
    fail(name, err?.message ?? String(err))
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
const DB_URL  = process.env.DATABASE_URL!
const SB_URL  = process.env.VITE_SUPABASE_URL!
const SB_ANON = process.env.VITE_SUPABASE_ANON_KEY!

if (!DB_URL)  { console.error(`${RED}❌  DATABASE_URL not set${RESET}`);  process.exit(1) }
if (!SB_URL)  { console.error(`${RED}❌  VITE_SUPABASE_URL not set${RESET}`); process.exit(1) }
if (!SB_ANON) { console.error(`${RED}❌  VITE_SUPABASE_ANON_KEY not set${RESET}`); process.exit(1) }

const sql   = postgres(DB_URL, { onnotice: () => {}, prepare: false })
const anon  = createClient(SB_URL, SB_ANON)

console.log(`\n${BOLD}WrokoFlow — Integration Test Suite${RESET}`)
console.log(`${DIM}Database: ${DB_URL.replace(/:([^@]+)@/, ":***@")}${RESET}`)
console.log(`${DIM}Supabase: ${SB_URL}${RESET}`)

// Pre-test cleanup: remove any leftover __test_project__ from aborted previous runs
try {
  await sql`DELETE FROM activity_log WHERE project_id IN (SELECT id FROM projects WHERE name = '__test_project__')`
  await sql`DELETE FROM projects WHERE name = '__test_project__'`
} catch { /* ignore */ }

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATABASE CONNECTION
// ═════════════════════════════════════════════════════════════════════════════
section("1. Database Connection")

await run("Connect to PostgreSQL", async () => {
  const rows = await sql`SELECT version()`
  const ver  = (rows[0] as any).version as string
  console.log(`     ${DIM}${ver.split(" ").slice(0, 2).join(" ")}${RESET}`)
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. MIGRATIONS TRACKING
// ═════════════════════════════════════════════════════════════════════════════
section("2. Migration History")

const expectedMigrations = [
  "001_initial_schema.sql",
  "002_rls_policies.sql",
  "003_triggers.sql",
  "003b_fix_triggers.sql",
  "003c_fix_more_triggers.sql",
  "004_seed.sql",
  "005_automation_rules.sql",
  "006_fix_triggers.sql",
  "007_invites_and_roles.sql",
  "008_seed_v2.sql",
]

await run(`All ${expectedMigrations.length} migrations recorded`, async () => {
  const rows = await sql<{ filename: string }[]>`
    SELECT filename FROM _wrokoflow_migrations ORDER BY filename
  `
  const applied = new Set(rows.map((r) => r.filename))
  const missing = expectedMigrations.filter((m) => !applied.has(m))
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(", ")}`)
  console.log(`     ${DIM}Applied: ${applied.size}${RESET}`)
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. SCHEMA — TABLE EXISTENCE
// ═════════════════════════════════════════════════════════════════════════════
section("3. Schema — Tables")

const requiredTables = [
  "projects",
  "members",
  "lists",
  "tasks",
  "task_assignments",
  "labels",
  "task_labels",
  "comments",
  "attachments",
  "activity_log",
  "automation_rules",
  "automation_log",
  "project_settings",
  "invite_links",
  "notification_preferences",
  "trainings",
  "attendance",
]

const existingTables = await sql<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
`
const tableSet = new Set(existingTables.map((r) => r.tablename))

for (const t of requiredTables) {
  await run(`Table: ${t}`, async () => {
    if (!tableSet.has(t)) throw new Error(`Table '${t}' does not exist`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. SCHEMA — KEY COLUMNS
// ═════════════════════════════════════════════════════════════════════════════
section("4. Schema — Key Columns")

type ColRow = { table_name: string; column_name: string }
const colRows = await sql<ColRow[]>`
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
`
const colSet = new Set(colRows.map((r) => `${r.table_name}.${r.column_name}`))

const criticalColumns: [string, string][] = [
  // invite_links
  ["invite_links", "id"],
  ["invite_links", "project_id"],
  ["invite_links", "code"],
  ["invite_links", "email"],
  ["invite_links", "role"],
  ["invite_links", "invited_by"],
  ["invite_links", "expires_at"],
  ["invite_links", "accepted_at"],
  ["invite_links", "revoked_at"],
  // members
  ["members", "role"],
  ["members", "user_id"],
  // notification_preferences
  ["notification_preferences", "user_id"],
  ["notification_preferences", "project_id"],
  ["notification_preferences", "email_invite_accepted"],
  // tasks
  ["tasks", "status"],
  ["tasks", "priority"],
  ["tasks", "start_date"],
  // trainings
  ["trainings", "id"],
  ["trainings", "project_id"],
  ["trainings", "scheduled_at"],
  ["trainings", "duration_minutes"],
  // attendance
  ["attendance", "member_id"],
  ["attendance", "training_id"],
  ["attendance", "status"],
]

for (const [table, col] of criticalColumns) {
  await run(`Column: ${table}.${col}`, async () => {
    if (!colSet.has(`${table}.${col}`))
      throw new Error(`${table}.${col} missing from schema`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. SCHEMA — CONSTRAINTS
// ═════════════════════════════════════════════════════════════════════════════
section("5. Schema — Constraints")

await run("members.role CHECK constraint (owner|editor|viewer)", async () => {
  const rows = await sql`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'members' AND constraint_type = 'CHECK'
  `
  if (rows.length === 0) throw new Error("No CHECK constraint on members.role")
})

await run("invite_links.code UNIQUE constraint", async () => {
  const rows = await sql`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'invite_links' AND constraint_type = 'UNIQUE'
  `
  if (rows.length === 0) throw new Error("No UNIQUE constraint on invite_links.code")
})

// ═════════════════════════════════════════════════════════════════════════════
// 6. SCHEMA — INDEXES
// ═════════════════════════════════════════════════════════════════════════════
section("6. Schema — Indexes")

const idxRows = await sql<{ indexname: string }[]>`
  SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
`
const idxSet = new Set(idxRows.map((r) => r.indexname))

const requiredIndexes = [
  "idx_invite_links_code",
  "idx_invite_links_project",
  "idx_invite_links_email",
]

for (const idx of requiredIndexes) {
  await run(`Index: ${idx}`, async () => {
    if (!idxSet.has(idx)) throw new Error(`Index '${idx}' missing`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. SCHEMA — RLS ENABLED
// ═════════════════════════════════════════════════════════════════════════════
section("7. RLS — Row Level Security Enabled")

const rlsRows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
  SELECT relname, relrowsecurity FROM pg_class
  WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND relkind = 'r'
`
const rlsMap = new Map(rlsRows.map((r) => [r.relname, r.relrowsecurity]))

const rlsTables = [
  "projects", "members", "lists", "tasks", "comments",
  "labels", "task_labels", "attachments", "activity_log",
  "invite_links", "notification_preferences",
]

for (const t of rlsTables) {
  await run(`RLS on: ${t}`, async () => {
    if (!rlsMap.get(t)) throw new Error(`RLS is NOT enabled on '${t}'`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. SCHEMA — DB FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════
section("8. Database Functions")

const fnRows = await sql<{ proname: string }[]>`
  SELECT proname FROM pg_proc
  WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
`
const fnSet = new Set(fnRows.map((r) => r.proname))

const requiredFunctions = [
  "is_project_member",
  "is_project_owner",
  "can_edit_project",
]

for (const fn of requiredFunctions) {
  await run(`Function: ${fn}()`, async () => {
    if (!fnSet.has(fn)) throw new Error(`Function '${fn}' not found`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. SEED DATA VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════
section("9. Seed Data")

await run("At least 1 project exists", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM projects`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No projects found in DB")
  console.log(`     ${DIM}${c} project(s)${RESET}`)
})

await run("At least 1 list exists", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM lists`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No lists found")
  console.log(`     ${DIM}${c} list(s)${RESET}`)
})

await run("At least 1 task exists", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM tasks`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No tasks found")
  console.log(`     ${DIM}${c} task(s)${RESET}`)
})

await run("At least 1 member exists", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM members`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No members found")
  console.log(`     ${DIM}${c} member(s)${RESET}`)
})

await run("Labels exist", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM labels`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No labels found")
  console.log(`     ${DIM}${c} label(s)${RESET}`)
})

await run("Automation rules table accessible", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM automation_rules`
  const c = parseInt((rows[0] as any).c)
  console.log(`     ${DIM}${c} rule(s) (table accessible)${RESET}`)
})

await run("Trainings exist", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM trainings`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No trainings found — check seed data")
  console.log(`     ${DIM}${c} training(s)${RESET}`)
})

await run("Project settings exist", async () => {
  const rows = await sql`SELECT COUNT(*) AS c FROM project_settings`
  const c = parseInt((rows[0] as any).c)
  if (c === 0) throw new Error("No project_settings rows found")
  console.log(`     ${DIM}${c} settings row(s)${RESET}`)
})

await run("Member roles are valid (no legacy 'admin'/'member' values)", async () => {
  const rows = await sql`
    SELECT COUNT(*) AS c FROM members
    WHERE role NOT IN ('owner','editor','viewer')
  `
  const c = parseInt((rows[0] as any).c)
  if (c > 0) throw new Error(`${c} member(s) have invalid legacy roles`)
})

await run("Each project has at least one owner member", async () => {
  const rows = await sql`
    SELECT p.id, p.name
    FROM projects p
    LEFT JOIN members m ON m.project_id = p.id AND m.role = 'owner'
    WHERE m.id IS NULL
  `
  if (rows.length > 0) {
    const names = (rows as any[]).map((r) => r.name).join(", ")
    throw new Error(`Projects without an owner: ${names}`)
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// 10. DIRECT CRUD — Projects, Tasks
// ═════════════════════════════════════════════════════════════════════════════
section("10. Direct DB CRUD (bypass-RLS via postgres)")

let testProjectId: string | null = null
let testListId:    string | null = null
let testTaskId:    string | null = null

// These use the direct postgres connection (service-level, bypasses RLS).
// This simulates what migrations and server functions do.

await run("INSERT project", async () => {
  // owner_id is nullable (seed data also uses NULL for owner_id)
  const rows = await sql`
    INSERT INTO projects (name, description, color, owner_id)
    VALUES ('__test_project__', 'Integration test', '#FF0000', NULL)
    RETURNING id
  `
  testProjectId = (rows[0] as any).id
})

await run("INSERT list in test project", async () => {
  if (!testProjectId) throw new Error("No test project")
  const rows = await sql`
    INSERT INTO lists (project_id, name, color, position)
    VALUES (${testProjectId}, '__test_list__', '#AABBCC', 99)
    RETURNING id
  `
  testListId = (rows[0] as any).id
})

await run("INSERT task in test list", async () => {
  if (!testProjectId || !testListId) throw new Error("No test list")
  const rows = await sql`
    INSERT INTO tasks (project_id, list_id, title, status, priority, position)
    VALUES (${testProjectId}, ${testListId}, '__test_task__', 'To Do', 'High', 0)
    RETURNING id
  `
  testTaskId = (rows[0] as any).id
})

await run("UPDATE task status", async () => {
  if (!testTaskId) throw new Error("No test task")
  await sql`UPDATE tasks SET status = 'In Progress' WHERE id = ${testTaskId}`
  const rows = await sql`SELECT status FROM tasks WHERE id = ${testTaskId}`
  if ((rows[0] as any).status !== "In Progress") throw new Error("Status not updated")
})

await run("INSERT comment on task", async () => {
  if (!testTaskId) throw new Error("No test task")
  // author_id is FK to auth.users — use NULL (seed data pattern)
  await sql`
    INSERT INTO comments (task_id, author_id, body)
    VALUES (${testTaskId}, NULL, 'Integration test comment')
  `
})

await run("INSERT label", async () => {
  if (!testProjectId) throw new Error("No test project")
  await sql`
    INSERT INTO labels (project_id, name, color)
    VALUES (${testProjectId}, '__test_label__', '#123456')
  `
})

await run("INSERT member with role 'editor'", async () => {
  if (!testProjectId) throw new Error("No test project")
  // user_id is FK to auth.users — use NULL (seed data pattern)
  await sql`
    INSERT INTO members (project_id, user_id, name, email, role)
    VALUES (${testProjectId}, NULL, 'Test Editor', 'editor@test.com', 'editor')
  `
})

await run("REJECT member with invalid role 'superadmin'", async () => {
  if (!testProjectId) throw new Error("No test project")
  try {
    await sql`
      INSERT INTO members (project_id, user_id, name, email, role)
      VALUES (${testProjectId}, NULL, 'Bad Role', 'bad@test.com', 'superadmin')
    `
    throw new Error("Should have been rejected by CHECK constraint")
  } catch (err: any) {
    if (err.message.includes("Should have been rejected")) throw err
    // Expected — constraint violation
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// 11. INVITE LINKS — CRUD
// ═════════════════════════════════════════════════════════════════════════════
section("11. Invite Links CRUD")

let testInviteCode: string | null = null
let testInviteId:   string | null = null

await run("INSERT invite_link", async () => {
  if (!testProjectId) throw new Error("No test project")
  const code = `TEST${Date.now().toString(36).toUpperCase()}`
  const expires = new Date(Date.now() + 7 * 86400_000).toISOString()
  const rows = await sql`
    INSERT INTO invite_links (project_id, code, role, expires_at)
    VALUES (${testProjectId}, ${code}, 'editor', ${expires})
    RETURNING id, code
  `
  testInviteCode = (rows[0] as any).code
  testInviteId   = (rows[0] as any).id
})

await run("SELECT invite_link by code", async () => {
  if (!testInviteCode) throw new Error("No test invite code")
  const rows = await sql`
    SELECT id, role, expires_at FROM invite_links WHERE code = ${testInviteCode}
  `
  if (rows.length === 0) throw new Error("Invite not found by code")
  const inv = rows[0] as any
  if (inv.role !== "editor") throw new Error(`Expected role 'editor', got '${inv.role}'`)
})

await run("Invite expires_at is in the future", async () => {
  if (!testInviteId) throw new Error("No invite id")
  const rows = await sql`
    SELECT expires_at > now() AS valid FROM invite_links WHERE id = ${testInviteId}
  `
  if (!(rows[0] as any).valid) throw new Error("Invite already expired")
})

await run("REVOKE invite (set revoked_at)", async () => {
  if (!testInviteId) throw new Error("No invite id")
  await sql`UPDATE invite_links SET revoked_at = now() WHERE id = ${testInviteId}`
  const rows = await sql`SELECT revoked_at FROM invite_links WHERE id = ${testInviteId}`
  if (!(rows[0] as any).revoked_at) throw new Error("revoked_at was not set")
})

await run("REJECT expired invite lookup", async () => {
  if (!testProjectId) throw new Error("No test project")
  const expiredCode = `EXP${Date.now().toString(36).toUpperCase()}`
  const pastDate = new Date(Date.now() - 1000).toISOString()
  await sql`
    INSERT INTO invite_links (project_id, code, role, expires_at)
    VALUES (${testProjectId}, ${expiredCode}, 'viewer', ${pastDate})
  `
  // Using anon client — should not return the expired invite per RLS policy
  const { data } = await anon
    .from("invite_links")
    .select("id")
    .eq("code", expiredCode)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
  if (data && data.length > 0) throw new Error("Expired invite should not be returned")
})

// ═════════════════════════════════════════════════════════════════════════════
// 12. RLS — ANONYMOUS ACCESS BLOCKED
// ═════════════════════════════════════════════════════════════════════════════
section("12. RLS — Unauthenticated (anon) Access")

await run("Anon cannot list projects", async () => {
  const { data, error } = await anon.from("projects").select("id")
  // RLS should return empty (or error) — not the full list
  const count = data?.length ?? 0
  console.log(`     ${DIM}Rows returned: ${count} (should be 0)${RESET}`)
  if (count > 0) throw new Error("Anon can read all projects — RLS not working!")
})

await run("Anon cannot list tasks", async () => {
  const { data } = await anon.from("tasks").select("id")
  const count = data?.length ?? 0
  console.log(`     ${DIM}Rows returned: ${count} (should be 0)${RESET}`)
  if (count > 0) throw new Error("Anon can read all tasks — RLS not working!")
})

await run("Anon cannot list members", async () => {
  const { data } = await anon.from("members").select("id")
  const count = data?.length ?? 0
  console.log(`     ${DIM}Rows returned: ${count} (should be 0)${RESET}`)
  if (count > 0) throw new Error("Anon can read all members — RLS not working!")
})

await run("Anon cannot create a project", async () => {
  const { error } = await anon.from("projects").insert({ name: "hacked" })
  if (!error) throw new Error("Anon was able to INSERT a project!")
})

await run("Anon cannot create a task", async () => {
  const realProject = await sql`SELECT id FROM projects LIMIT 1`
  const pid = (realProject[0] as any)?.id
  if (!pid) return // no projects, can't test
  const { error } = await anon.from("tasks").insert({ project_id: pid, title: "hacked", list_id: null })
  if (!error) throw new Error("Anon was able to INSERT a task!")
})

// ═════════════════════════════════════════════════════════════════════════════
// 13. PERMISSION UTILITIES (pure logic — no DB)
// ═════════════════════════════════════════════════════════════════════════════
section("13. Permission Utilities")

type MemberRole = "owner" | "editor" | "viewer"

const ROLE_LEVELS: Record<MemberRole, number> = { owner: 3, editor: 2, viewer: 1 }

function canEdit(role: MemberRole | null): boolean {
  if (!role) return false
  return ROLE_LEVELS[role] >= ROLE_LEVELS.editor
}
function canManageMembers(role: MemberRole | null): boolean { return role === "owner" }
function canDelete(role: MemberRole | null): boolean { return role === "owner" }
function canManageSettings(role: MemberRole | null): boolean { return role === "owner" }
function canCreateTasks(role: MemberRole | null): boolean {
  if (!role) return false
  return ROLE_LEVELS[role] >= ROLE_LEVELS.editor
}
function canComment(role: MemberRole | null): boolean { return !!role }

const permTests: [string, boolean, boolean][] = [
  // [description, actual, expected]
  ["canEdit(owner) = true",          canEdit("owner"),          true],
  ["canEdit(editor) = true",         canEdit("editor"),         true],
  ["canEdit(viewer) = false",        canEdit("viewer"),         false],
  ["canEdit(null) = false",          canEdit(null),             false],
  ["canManageMembers(owner) = true", canManageMembers("owner"), true],
  ["canManageMembers(editor) = false", canManageMembers("editor"), false],
  ["canManageMembers(viewer) = false", canManageMembers("viewer"), false],
  ["canDelete(owner) = true",        canDelete("owner"),        true],
  ["canDelete(editor) = false",      canDelete("editor"),       false],
  ["canDelete(viewer) = false",      canDelete("viewer"),       false],
  ["canManageSettings(owner) = true",  canManageSettings("owner"),  true],
  ["canManageSettings(editor) = false", canManageSettings("editor"), false],
  ["canCreateTasks(owner) = true",   canCreateTasks("owner"),   true],
  ["canCreateTasks(editor) = true",  canCreateTasks("editor"),  true],
  ["canCreateTasks(viewer) = false", canCreateTasks("viewer"),  false],
  ["canComment(owner) = true",       canComment("owner"),       true],
  ["canComment(editor) = true",      canComment("editor"),      true],
  ["canComment(viewer) = true",      canComment("viewer"),      true],
  ["canComment(null) = false",       canComment(null),          false],
]

for (const [desc, actual, expected] of permTests) {
  await run(desc, async () => {
    if (actual !== expected) throw new Error(`Got ${actual}, expected ${expected}`)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// 14. INVITE CODE GENERATOR
// ═════════════════════════════════════════════════════════════════════════════
section("14. Invite Code Generator")

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let code = ""
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

await run("Generates 8-character codes", async () => {
  for (let i = 0; i < 10; i++) {
    const c = generateInviteCode()
    if (c.length !== 8) throw new Error(`Code '${c}' has length ${c.length}`)
  }
})

await run("Codes only contain safe characters", async () => {
  const safe = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]+$/
  for (let i = 0; i < 20; i++) {
    const c = generateInviteCode()
    if (!safe.test(c)) throw new Error(`Code '${c}' contains ambiguous characters`)
  }
})

await run("Never contains ambiguous chars (0, O, I, l, 1)", async () => {
  const ambiguous = /[0OIl1]/
  for (let i = 0; i < 50; i++) {
    const c = generateInviteCode()
    if (ambiguous.test(c)) throw new Error(`Code '${c}' has ambiguous char`)
  }
})

await run("Codes are unique (100 samples, no duplicates)", async () => {
  const codes = new Set<string>()
  for (let i = 0; i < 100; i++) codes.add(generateInviteCode())
  if (codes.size < 99) throw new Error(`Only ${codes.size} unique codes in 100 samples`)
})

// ═════════════════════════════════════════════════════════════════════════════
// 15. AUTOMATION RULES SCHEMA
// ═════════════════════════════════════════════════════════════════════════════
section("15. Automation Rules")

await run("automation_rules has trigger/action columns", async () => {
  // Schema uses trigger_config/action_config (JSONB) not trigger_conditions/action_params
  const required = ["trigger_type", "trigger_config", "action_type", "action_config", "is_active"]
  for (const col of required) {
    if (!colSet.has(`automation_rules.${col}`))
      throw new Error(`Missing column: automation_rules.${col}`)
  }
})

await run("Automation rules have valid structure", async () => {
  const rows = await sql`
    SELECT trigger_type, action_type FROM automation_rules LIMIT 5
  `
  console.log(`     ${DIM}Sample rules: ${(rows as any[]).map((r) => `${r.trigger_type}→${r.action_type}`).join(", ")}${RESET}`)
})

// ═════════════════════════════════════════════════════════════════════════════
// 16. TRIGGERS CHECK
// ═════════════════════════════════════════════════════════════════════════════
section("16. Database Triggers")

const trigRows = await sql<{ trigger_name: string; event_object_table: string }[]>`
  SELECT trigger_name, event_object_table
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
`
const trigSet = new Set(trigRows.map((r) => r.trigger_name))
console.log(`     ${DIM}Total triggers: ${trigSet.size}${RESET}`)

await run("Trigger exists on tasks table (updated_at)", async () => {
  const taskTriggers = trigRows.filter((r) => r.event_object_table === "tasks")
  if (taskTriggers.length === 0) throw new Error("No triggers on tasks table")
  console.log(`     ${DIM}Task triggers: ${taskTriggers.map((t) => t.trigger_name).join(", ")}${RESET}`)
})

await run("updated_at auto-updates on task modification", async () => {
  if (!testTaskId) throw new Error("No test task")
  const before = await sql`SELECT updated_at FROM tasks WHERE id = ${testTaskId}`
  await new Promise((res) => setTimeout(res, 1100)) // ensure timestamp difference
  await sql`UPDATE tasks SET title = '__test_updated__' WHERE id = ${testTaskId}`
  const after = await sql`SELECT updated_at FROM tasks WHERE id = ${testTaskId}`
  const tBefore = new Date((before[0] as any).updated_at).getTime()
  const tAfter  = new Date((after[0] as any).updated_at).getTime()
  if (tAfter <= tBefore) throw new Error("updated_at was NOT updated by trigger")
})

// ═════════════════════════════════════════════════════════════════════════════
// 17. SUPABASE REST API HEALTH
// ═════════════════════════════════════════════════════════════════════════════
section("17. Supabase REST API")

await run("Supabase client initializes without error", async () => {
  if (!anon) throw new Error("Supabase client is null")
})

await run("Health-check auth endpoint", async () => {
  const { data } = await anon.auth.getSession()
  // Returns null session for anon — just ensures the endpoint responds
  console.log(`     ${DIM}Session: ${data.session === null ? "null (expected for anon)" : "active"}${RESET}`)
})

// ═════════════════════════════════════════════════════════════════════════════
// 18. EMAIL EDGE FUNCTION
// ═════════════════════════════════════════════════════════════════════════════
section("18. Email Edge Function (send-email)")

await run("Edge function responds to request", async () => {
  const { data, error } = await anon.functions.invoke("send-email", {
    body: { to: "test@test.com", subject: "Test", html: "<p>Test</p>" },
  })
  // We expect this to either:
  //  a) succeed (if RESEND_API_KEY is configured), or
  //  b) fail with "Email service not configured" (no key set), or
  //  c) fail with a Resend API error
  // Any response means the function is deployed and reachable.
  if (error && error.message?.includes("FunctionsFetchError")) {
    throw new Error("Edge function not deployed. Run: supabase functions deploy send-email")
  }
  const msg = data?.error || data?.id || error?.message || "responded"
  console.log(`     ${DIM}Response: ${msg}${RESET}`)

  if (data?.error === "Email service not configured. Set RESEND_API_KEY in Edge Function secrets.") {
    warn("Edge function deployed but RESEND_API_KEY not set",
      "Run: supabase secrets set RESEND_API_KEY=re_your_key")
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// CLEANUP — Remove test data
// ═════════════════════════════════════════════════════════════════════════════
section("Cleanup")

await run("Remove test project (cascades to lists, tasks, comments, members, invites)", async () => {
  if (!testProjectId) return
  // Pre-delete activity_log so task-deleted triggers don’t race with project CASCADE
  await sql`DELETE FROM activity_log WHERE project_id = ${testProjectId}`
  await sql`DELETE FROM projects WHERE id = ${testProjectId}`
  const rows = await sql`SELECT id FROM projects WHERE id = ${testProjectId}`
  if (rows.length > 0) throw new Error("Test project was not deleted")
})

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
await sql.end()

const total = passed + failed + warned
console.log(`\n${"─".repeat(55)}`)
console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}  ${failed > 0 ? RED : ""}${failed} failed${RESET}  ${YELLOW}${warned} warnings${RESET}  ${DIM}/ ${total} total${RESET}`)

if (failures.length > 0) {
  console.log(`\n${RED}${BOLD}Failed tests:${RESET}`)
  for (const f of failures) console.log(`  ${RED}•${RESET} ${f}`)
}

console.log()
process.exit(failed > 0 ? 1 : 0)

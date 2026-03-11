/**
 * 08-permissions.cy.ts
 * Role-based access: owner / editor / viewer permission gates
 *
 * Permission matrix (from src/lib/permissions.ts):
 *   owner  → can edit, delete project, manage members, create tasks, comment
 *   editor → can edit, create tasks, comment — cannot delete project
 *   viewer → read-only, can comment — cannot create tasks
 */

describe("Role-based permissions", () => {
  const ownerEmail = Cypress.env("OWNER_EMAIL") as string
  const ownerPass = Cypress.env("OWNER_PASS") as string
  const editorEmail = Cypress.env("EDITOR_EMAIL") as string
  const editorPass = Cypress.env("EDITOR_PASS") as string
  const viewerEmail = Cypress.env("VIEWER_EMAIL") as string
  const viewerPass = Cypress.env("VIEWER_PASS") as string

  let projectId: string

  before(() => {
    // Create all three test users once
    cy.task("supabase:createUser", {
      email: ownerEmail,
      password: ownerPass,
      name: "E2E Owner",
    })
    cy.task("supabase:createUser", {
      email: editorEmail,
      password: editorPass,
      name: "E2E Editor",
    })
    cy.task("supabase:createUser", {
      email: viewerEmail,
      password: viewerPass,
      name: "E2E Viewer",
    })
  })

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(ownerEmail).then((seed) => {
      projectId = seed.projectId

      // Add editor and viewer members
      cy.task<string>("supabase:getUserId", editorEmail).then((editorId) => {
        cy.task("supabase:addEditorMember", {
          projectId,
          editorUserId: editorId,
          editorEmail,
        })
      })
      cy.task<string>("supabase:getUserId", viewerEmail).then((viewerId) => {
        cy.task("supabase:addViewerMember", {
          projectId,
          viewerUserId: viewerId,
          viewerEmail,
        })
      })
    })
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  // ── Owner ─────────────────────────────────────────────────────────────────

  describe("Owner", () => {
    beforeEach(() => {
      cy.login(ownerEmail, ownerPass)
      cy.navTo("Board")
    })

    it("can see the Add Task button on board columns", () => {
      cy.get("[data-cy=add-task-btn]", { timeout: 10000 }).should("be.visible")
    })

    it("can open the project delete dialog", () => {
      cy.get("[data-cy=project-switcher-trigger]").click()
      cy.get("[data-cy=project-item]").first().realHover()
      cy.get("[data-cy=delete-project-btn]").first().should("be.visible")
    })
  })

  // ── Editor ────────────────────────────────────────────────────────────────

  describe("Editor", () => {
    beforeEach(() => {
      cy.login(editorEmail, editorPass)
      cy.navTo("Board")
    })

    it("can see the Add Task button (editors can create tasks)", () => {
      cy.get("[data-cy=add-task-btn]", { timeout: 10000 }).should("be.visible")
    })

    it("can create a task", () => {
      cy.get("[data-cy=add-task-btn]").first().click()
      cy.get("[data-cy=new-task-input]").type("Editor created task{enter}")
      cy.contains("Editor created task", { timeout: 8000 }).should("be.visible")
    })

    it("does NOT see the delete project button (editors cannot delete)", () => {
      cy.get("[data-cy=project-switcher-trigger]").click()
      cy.get("[data-cy=project-item]").first().realHover()
      cy.get("[data-cy=delete-project-btn]").should("not.exist")
    })
  })

  // ── Viewer ────────────────────────────────────────────────────────────────

  describe("Viewer", () => {
    beforeEach(() => {
      cy.login(viewerEmail, viewerPass)
      cy.navTo("Board")
    })

    it("can see tasks (read-only access)", () => {
      cy.contains("E2E Task Alpha", { timeout: 10000 }).should("be.visible")
    })

    it("does NOT see the Add Task button (viewers cannot create tasks)", () => {
      cy.get("[data-cy=add-task-btn]").should("not.exist")
    })

    it("does NOT see the delete project button", () => {
      cy.get("[data-cy=project-switcher-trigger]").click()
      cy.get("[data-cy=project-item]").first().realHover()
      cy.get("[data-cy=delete-project-btn]").should("not.exist")
    })

    it("can open and view a task in the detail panel", () => {
      cy.get("[data-cy=task-card]").first().click()
      cy.contains("E2E Task Alpha", { timeout: 8000 }).should("be.visible")
    })

    it("can add a comment (viewers can comment)", () => {
      cy.get("[data-cy=task-card]").first().click()
      cy.contains("button", /comments/i, { timeout: 8000 }).click()
      cy.get("[data-cy=comment-input]").should("be.visible")
      cy.get("[data-cy=comment-input]").type("Viewer comment{enter}")
      cy.contains("Viewer comment", { timeout: 8000 }).should("be.visible")
    })
  })
})

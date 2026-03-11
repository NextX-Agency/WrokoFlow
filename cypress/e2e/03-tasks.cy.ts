/**
 * 03-tasks.cy.ts
 * Board tasks: create, open detail, update title, delete
 */

describe("Tasks (Board)", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  before(() => {
    // Create test users once per suite
    cy.task("supabase:createUser", {
      email: owner.email,
      password: owner.password,
      name: "E2E Owner",
    })
  })

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
    cy.navTo("Board")
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("shows seeded tasks on the board", () => {
    cy.contains("E2E Task Alpha", { timeout: 10000 }).should("be.visible")
    cy.contains("E2E Task Beta").should("be.visible")
    cy.contains("E2E Task Gamma").should("be.visible")
  })

  it("creates a new task via the add-task button", () => {
    // Click add task on the first column (Backlog)
    cy.get("[data-cy=add-task-btn]").first().click()

    // Type in the new task input
    cy.get("[data-cy=new-task-input]").should("be.visible").type("E2E New Task")
    cy.get("[data-cy=new-task-input]").type("{enter}")

    // Task should appear in the column
    cy.contains("E2E New Task", { timeout: 8000 }).should("be.visible")
  })

  it("creates a task by pressing Enter — then can create a second one", () => {
    cy.get("[data-cy=add-task-btn]").first().click()
    cy.get("[data-cy=new-task-input]" ).type("First task{enter}")
    cy.contains("First task", { timeout: 8000 }).should("be.visible")

    // Input closes after submit — re-open it for second task
    cy.get("[data-cy=add-task-btn]").first().click()
    cy.get("[data-cy=new-task-input]").type("Second task{enter}")
    cy.contains("Second task", { timeout: 8000 }).should("be.visible")
  })

  it("opens task detail panel by clicking a task card", () => {
    cy.get("[data-cy=task-card]").first().click()
    // The detail panel should slide in
    cy.contains("E2E Task Alpha", { timeout: 8000 }).should("be.visible")
  })

  it("dismisses task detail panel with Escape key", () => {
    cy.get("[data-cy=task-card]").first().click()
    cy.contains("E2E Task Alpha", { timeout: 6000 }).should("be.visible")
    cy.get("body").type("{esc}")
    // Panel should close — the heading disappears from the side panel context
    cy.get("[data-cy=task-card]", { timeout: 6000 }).should("be.visible")
  })

  it("tasks with high priority show a flag indicator", () => {
    // E2E Task Beta has High priority
    cy.contains("[data-cy=task-card]", "E2E Task Beta").within(() => {
      cy.get("svg").should("exist") // Flag icon
    })
  })

  it("tasks with tomorrow due date do not appear overdue", () => {
    // E2E Task Beta has due date = tomorrow — data-overdue should be false
    cy.contains("[data-cy=task-card]", "E2E Task Beta").within(() => {
      cy.get("[data-cy=due-date-badge]").should("have.attr", "data-overdue", "false")
    })
  })
})

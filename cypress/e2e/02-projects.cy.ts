/**
 * 02-projects.cy.ts
 * Projects: create, switch, delete + confirmation dialog
 */

describe("Projects", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.login(owner.email, owner.password)
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("opens the project switcher", () => {
    cy.get("[data-cy=project-switcher-trigger]").click()
    // Dropdown should appear
    cy.get("[data-cy=new-project-btn]").should("be.visible")
  })

  it("creates a new project via the dialog", () => {
    cy.get("[data-cy=project-switcher-trigger]").click()
    cy.get("[data-cy=new-project-btn]").click()

    // Dialog should open
    cy.contains("Create New Project").should("be.visible")
    cy.get("#name").should("be.visible").type("__e2e_created_project__")
    cy.contains("button", /create project/i).click()

    // Switcher should now show the new project
    cy.get("[data-cy=project-switcher-trigger]", { timeout: 8000 })
      .should("contain.text", "__e2e_created_project__")
  })

  it("switches to an existing project by clicking it in the dropdown", () => {
    // Seed a project first, then reload so React Query fetches the new data
    cy.seedProject(owner.email)
    cy.reload()

    cy.get("[data-cy=project-switcher-trigger]").click()
    cy.get("[data-cy=project-item]", { timeout: 10000 }).first().click()

    // The switcher should now display that project's name
    cy.get("[data-cy=project-switcher-trigger]", { timeout: 6000 }).should(
      "contain.text",
      "__e2e_project__"
    )
  })

  it("deletes a project after confirmation", () => {
    cy.seedProject(owner.email)
    cy.reload()

    // Open switcher and hover the project item to reveal the trash button
    cy.get("[data-cy=project-switcher-trigger]").click()
    cy.get("[data-cy=project-item]", { timeout: 10000 }).first().parents("div").first().realHover()
    cy.get("[data-cy=delete-project-btn]").first().click({ force: true })

    // Confirmation dialog opens
    cy.contains("Delete Project").should("be.visible")
    cy.get("[data-cy=confirm-delete-project]").click()

    // Reload to get fresh data from DB — confirms the deletion persisted
    cy.reload()

    // Project gone from switcher
    cy.get("[data-cy=project-switcher-trigger]", { timeout: 12000 }).should(
      "not.contain.text",
      "__e2e_project__"
    )
  })

  it("cancels project deletion when Cancel is clicked", () => {
    cy.seedProject(owner.email)
    cy.reload()

    cy.get("[data-cy=project-switcher-trigger]").click()
    cy.get("[data-cy=project-item]", { timeout: 10000 }).first().parents("div").first().realHover()
    cy.get("[data-cy=delete-project-btn]").first().click({ force: true })

    cy.contains("Delete Project").should("be.visible")
    cy.contains("button", /cancel/i).click()

    // Project still there
    cy.get("[data-cy=project-switcher-trigger]").click()
    cy.get("[data-cy=project-item]").should("exist")
  })
})

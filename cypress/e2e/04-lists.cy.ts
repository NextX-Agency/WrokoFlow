/**
 * 04-lists.cy.ts
 * Lists: create new list on the board
 */

describe("Lists (Board columns)", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
    cy.navTo("Board")
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("shows the seeded lists on the board", () => {
    cy.contains("Backlog", { timeout: 10000 }).should("be.visible")
    cy.contains("In Progress").should("be.visible")
    cy.contains("Done").should("be.visible")
  })

  it("shows the Add List button at the end of the board", () => {
    cy.get("[data-cy=add-list-btn]", { timeout: 10000 }).should("be.visible")
  })

  it("creates a new list via the Add List button", () => {
    cy.get("[data-cy=add-list-btn]").click()

    cy.get("[data-cy=new-list-input]").should("be.visible")
    cy.get("[data-cy=new-list-input]").type("__e2e_list__")
    cy.get("[data-cy=new-list-input]").type("{enter}")

    cy.contains("__e2e_list__", { timeout: 8000 }).should("be.visible")
  })

  it("cancels list creation with Escape key", () => {
    cy.get("[data-cy=add-list-btn]").click()
    cy.get("[data-cy=new-list-input]").type("Won't be saved")
    cy.get("[data-cy=new-list-input]").type("{esc}")

    // The input disappears and the add button returns
    cy.get("[data-cy=add-list-btn]", { timeout: 6000 }).should("be.visible")
    cy.contains("Won't be saved").should("not.exist")
  })

  it("cancels list creation with the Cancel button", () => {
    cy.get("[data-cy=add-list-btn]").click()
    cy.get("[data-cy=new-list-input]").type("Cancelled")
    cy.contains("button", /cancel/i).click()

    cy.get("[data-cy=add-list-btn]", { timeout: 6000 }).should("be.visible")
    cy.contains("Cancelled").should("not.exist")
  })

  it("does not create a list when name is blank", () => {
    cy.get("[data-cy=add-list-btn]").click()
    // Don't type anything, click Add List
    cy.contains("button", /add list/i).click()
    // The input should still be visible (not submitted)
    cy.get("[data-cy=new-list-input]").should("be.visible")
  })
})

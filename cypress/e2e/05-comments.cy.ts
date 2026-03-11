/**
 * 05-comments.cy.ts
 * Comments: add comment on task, verify it appears, delete comment
 */

describe("Comments", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
    cy.navTo("Board")

    // Open the first task card
    cy.get("[data-cy=task-card]", { timeout: 10000 }).first().click()
    // Switch to Comments tab in the detail panel
    cy.contains("button", /comments/i, { timeout: 8000 }).click()
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("shows the comment input for owner (who can comment)", () => {
    cy.get("[data-cy=comment-input]").should("be.visible")
  })

  it("adds a comment and shows it in the list", () => {
    cy.get("[data-cy=comment-input]").type("Hello E2E comment")
    cy.get("[data-cy=comment-submit]").click()

    cy.contains("Hello E2E comment", { timeout: 8000 }).should("be.visible")
  })

  it("adds a comment by pressing Enter", () => {
    cy.get("[data-cy=comment-input]").type("Enter key comment{enter}")
    cy.contains("Enter key comment", { timeout: 8000 }).should("be.visible")
  })

  it("does not submit an empty comment", () => {
    cy.get("[data-cy=comment-submit]").should("be.disabled")
  })

  it("deletes own comment", () => {
    cy.get("[data-cy=comment-input]").type("To be deleted")
    cy.get("[data-cy=comment-submit]").click()

    cy.contains("To be deleted", { timeout: 8000 }).should("be.visible")

    // Trash icon appears
    cy.get("[data-cy=comment-delete]").first().click()

    cy.contains("To be deleted", { timeout: 6000 }).should("not.exist")
  })
})

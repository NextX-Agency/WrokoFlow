/**
 * 01-auth.cy.ts
 * Auth: session injection, profile dropdown, sign-out
 */

describe("Authentication", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  it("redirects unauthenticated users to /login", () => {
    cy.visit("/board")
    cy.url().should("include", "/login")
  })

  it("logs in via programmatic session injection and lands on dashboard", () => {
    cy.login(owner.email, owner.password)
    cy.url().should("not.include", "/login")
    cy.contains("WrokoFlow", { timeout: 8000 }).should("be.visible")
  })

  describe("when logged in", () => {
    beforeEach(() => {
      cy.login(owner.email, owner.password)
    })

    it("profile button opens dropdown with user info", () => {
      cy.get("[data-cy=profile-btn]").click()
      cy.contains(owner.email).should("be.visible")
    })

    it("profile dropdown has Settings and Sign out items", () => {
      cy.get("[data-cy=profile-btn]").click()
      cy.contains("Settings").should("be.visible")
      cy.contains("Sign out").should("be.visible")
    })

    it("sign-out navigates to /login", () => {
      cy.get("[data-cy=profile-btn]").click()
      cy.get("[data-cy=profile-signout]").click()
      cy.url({ timeout: 8000 }).should("include", "/login")
    })
  })
})

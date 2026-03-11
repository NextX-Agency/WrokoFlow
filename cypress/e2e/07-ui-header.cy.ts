/**
 * 07-ui-header.cy.ts
 * Header: bell notification popover + profile dropdown
 */

describe("Header UI", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  // ── Bell / Activity feed ────────────────────────────────────────────────────

  it("bell button is visible in the header", () => {
    cy.get("[data-cy=bell-btn]").should("be.visible")
  })

  it("clicking the bell button opens the activity popover", () => {
    cy.get("[data-cy=bell-btn]").click()
    // Popover content — activity heading
    cy.contains(/recent activity|activity/i, { timeout: 6000 }).should("be.visible")
  })

  it("activity popover closes when clicking outside", () => {
    cy.get("[data-cy=bell-btn]").click()
    cy.contains(/recent activity|activity/i, { timeout: 6000 }).should("be.visible")
    cy.get("body").click(0, 0)
    cy.contains(/recent activity/i).should("not.exist")
  })

  // ── Profile dropdown ────────────────────────────────────────────────────────

  it("profile avatar button is visible in the header", () => {
    cy.get("[data-cy=profile-btn]").should("be.visible")
  })

  it("clicking the profile avatar opens the dropdown menu", () => {
    cy.get("[data-cy=profile-btn]").click()
    cy.contains(owner.email, { timeout: 6000 }).should("be.visible")
  })

  it("profile dropdown contains Settings link", () => {
    cy.get("[data-cy=profile-btn]").click()
    cy.contains("Settings").should("be.visible")
  })

  it("profile dropdown contains Sign out button", () => {
    cy.get("[data-cy=profile-btn]").click()
    cy.get("[data-cy=profile-signout]").should("be.visible")
  })

  it("clicking Settings in dropdown navigates to /settings", () => {
    cy.get("[data-cy=profile-btn]").click()
    cy.get("[data-cy=profile-settings]").click()
    cy.url({ timeout: 6000 }).should("include", "/settings")
  })
})

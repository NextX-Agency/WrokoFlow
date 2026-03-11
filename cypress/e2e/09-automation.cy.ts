/**
 * 09-automation.cy.ts
 * Automations: navigate to page, create a rule, verify it appears
 */

describe("Automations", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
    cy.navTo("Automations")
    cy.contains("Automations", { timeout: 10000 }).should("be.visible")
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("renders the Automations page heading", () => {
    cy.contains("h1", "Automations").should("be.visible")
    cy.contains("Create rules to automate repetitive actions").should("be.visible")
  })

  it("shows the New Rule button", () => {
    cy.contains("button", /new rule/i).should("be.visible")
  })

  it("opens the Create Automation Rule dialog when New Rule is clicked", () => {
    cy.contains("button", /new rule/i).click()
    cy.contains("Create Automation Rule", { timeout: 6000 }).should("be.visible")
    cy.contains("Rule Name").should("be.visible")
    cy.contains("When (Trigger)").should("be.visible")
  })

  it("creates a new automation rule", () => {
    cy.contains("button", /new rule/i).click()

    // Fill in rule name
    cy.get('input[placeholder*="Auto-close"]').type("__e2e Auto Rule__")

    // Leave trigger as default (status_change), click Create Rule
    cy.contains("button", /create rule/i).click()

    // Rule should appear in the list
    cy.contains("__e2e Auto Rule__", { timeout: 8000 }).should("be.visible")
  })

  it("cancels rule creation without saving", () => {
    cy.contains("button", /new rule/i).click()
    cy.contains("Create Automation Rule", { timeout: 6000 }).should("be.visible")

    // Close dialog via X or Escape
    cy.get("body").type("{esc}")

    cy.contains("Create Automation Rule").should("not.exist")
  })

  it("can toggle an automation rule on/off", () => {
    // Create a rule first
    cy.contains("button", /new rule/i).click()
    cy.get('input[placeholder*="Auto-close"]').type("__e2e Toggle Rule__")
    cy.contains("button", /create rule/i).click()
    cy.contains("__e2e Toggle Rule__", { timeout: 8000 }).should("be.visible")

    // Toggle the switch — it should respond without error
    cy.contains("__e2e Toggle Rule__")
      .closest("[class*='card'], [class*='border']")
      .find("button[role=switch]")
      .click()

    // No error toast should appear — rule remains visible
    cy.contains("__e2e Toggle Rule__").should("be.visible")
  })
})

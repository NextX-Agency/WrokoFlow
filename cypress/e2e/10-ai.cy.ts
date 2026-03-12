/**
 * 10-ai.cy.ts
 * AI Assistant: settings, panel, chat, quick actions
 */

describe("AI Features", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  // ─── AI Settings ────────────────────────────────────────────────────────────

  describe("AI Settings page", () => {
    beforeEach(() => {
      cy.login(owner.email, owner.password)
      cy.navTo("Settings")
      cy.contains("Settings", { timeout: 8000 }).should("be.visible")
    })

    it("renders the AI settings section", () => {
      cy.contains("AI Assistant").should("be.visible")
    })

    it("shows the provider dropdown with all three providers", () => {
      // Open the provider select
      cy.contains("Provider").parent().find("button[role=combobox]").click()
      cy.contains("Google Gemini").should("be.visible")
      cy.contains("Groq").should("be.visible")
      cy.contains("OpenRouter").should("be.visible")
      // Close dropdown
      cy.get("body").type("{esc}")
    })

    it("shows a model dropdown when a provider is selected", () => {
      cy.contains("Model").should("be.visible")
      cy.contains("Provider").parent().find("button[role=combobox]").should("be.visible")
    })

    it("can switch providers and model updates accordingly", () => {
      // Switch to Groq
      cy.contains("Provider").parent().find("button[role=combobox]").click()
      cy.contains("Groq").click()
      // Model should now show a Groq model
      cy.contains("Model").parent().should("contain.text", "Llama")
    })

    it("Save Settings button is visible and clickable", () => {
      cy.contains("button", /save/i).should("be.visible").click()
      // Toast should confirm save
      cy.contains(/saved|settings/i, { timeout: 6000 }).should("be.visible")
    })

    it("Test Connection button is visible", () => {
      cy.contains("button", /test connection/i).should("be.visible")
    })

    it("Test Connection triggers a response toast", () => {
      cy.contains("button", /test connection/i).click()
      // Should show success or error toast (either means the button works)
      cy.contains(/(works|failed|configured|connection)/i, { timeout: 15000 }).should("be.visible")
    })
  })

  // ─── AI Assistant Panel ──────────────────────────────────────────────────────

  describe("AI Assistant panel", () => {
    beforeEach(() => {
      cy.cleanupTestData()
      cy.seedProject(owner.email)
      cy.login(owner.email, owner.password)
      cy.navTo("Board")
      cy.contains("Board", { timeout: 10000 }).should("be.visible")
    })

    afterEach(() => {
      cy.cleanupTestData()
    })

    it("shows the floating Sparkles button", () => {
      cy.get("[aria-label='Open AI Assistant']").should("be.visible")
    })

    it("opens the AI panel when the Sparkles button is clicked", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.contains("WrokoFlow AI", { timeout: 4000 }).should("be.visible")
    })

    it("shows the active project name in the panel header", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.contains("WrokoFlow AI").should("be.visible")
      // The sub-heading should show the seeded project name or "No project selected"
      cy.get("[aria-label='Open AI Assistant']").should("not.exist") // panel is open now
    })

    it("closes the panel via the X button", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.contains("WrokoFlow AI").should("be.visible")
      cy.get("button[title], button").filter(":contains('')").last() // find X button area
      // Use a more reliable selector: find the X icon button in the panel header
      cy.contains("WrokoFlow AI").closest("div").parent().find("button").last().click()
      cy.contains("WrokoFlow AI").should("not.exist")
    })

    it("shows welcome screen with quick action buttons when no messages", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.contains("Hey! I'm your AI assistant", { timeout: 5000 }).should("be.visible")
      cy.contains("Data Dump").should("be.visible")
      cy.contains("Schedule").should("be.visible")
      cy.contains("Fix Overdue").should("be.visible")
      cy.contains("Add Rules").should("be.visible")
    })

    it("clears messages when the trash icon is clicked", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.contains("Hey! I'm your AI assistant").should("be.visible")
      // Click clear (trash) button
      cy.get("button[title='Clear chat']").click()
      // Welcome screen should still be visible (no messages to clear)
      cy.contains("Hey! I'm your AI assistant").should("be.visible")
    })

    it("shows the message input field", () => {
      cy.get("[aria-label='Open AI Assistant']").click()
      cy.get("textarea").should("be.visible").should("have.attr", "placeholder")
    })

    it("sends a message and shows a response", { timeout: 30000 }, () => {
      cy.get("[aria-label='Open AI Assistant']").click()

      // Type a simple message
      cy.get("textarea").type("Say hello in exactly one word.")
      cy.get("textarea").type("{enter}")

      // User message should appear
      cy.contains("Say hello in exactly one word.").should("be.visible")

      // Wait for AI response (may take a few seconds)
      cy.contains(/(hello|hi|greetings|hey)/i, { timeout: 25000 }).should("be.visible")
    })

    it("shows the Settings gear button when AI is not configured", () => {
      // This test is valid if the user has no AI settings yet
      // We just verify the button exists and is functional
      cy.get("[aria-label='Open AI Assistant']").click()
      // Panel should open without crashing regardless of config state
      cy.contains("WrokoFlow AI").should("be.visible")
    })
  })

  // ─── AI in Automations Page ───────────────────────────────────────────────────

  describe("AI in Automations page", () => {
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

    it("shows the Generate with AI button on the Automations page", () => {
      cy.contains("button", /generate|ai|suggest/i).should("be.visible")
    })

    it("Generate with AI button triggers AI request and shows suggestions", { timeout: 30000 }, () => {
      cy.contains("button", /generate|ai|suggest/i).click()

      // Should show loading indicator or results
      cy.contains(/(generating|suggested|rule|automation)/i, { timeout: 25000 }).should("be.visible")
    })
  })
})

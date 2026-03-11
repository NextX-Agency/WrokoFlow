/**
 * 06-calendar.cy.ts
 * Calendar: custom toolbar – Month/Week/Day toggle, Today/Prev/Next navigation
 */

describe("Calendar", () => {
  const owner = {
    email: Cypress.env("OWNER_EMAIL") as string,
    password: Cypress.env("OWNER_PASS") as string,
  }

  beforeEach(() => {
    cy.cleanupTestData()
    cy.seedProject(owner.email)
    cy.login(owner.email, owner.password)
    cy.navTo("Calendar")
    // Wait for the calendar to render
    cy.get("[data-cy=calendar-today-btn]", { timeout: 10000 }).should("be.visible")
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it("renders the custom toolbar with Today / Prev / Next buttons", () => {
    cy.get("[data-cy=calendar-today-btn]").should("be.visible")
    cy.get("[data-cy=calendar-prev-btn]").should("be.visible")
    cy.get("[data-cy=calendar-next-btn]").should("be.visible")
  })

  it("renders the Month / Week / Day view toggle buttons", () => {
    cy.get("[data-cy=calendar-view-month]").should("be.visible")
    cy.get("[data-cy=calendar-view-week]").should("be.visible")
    cy.get("[data-cy=calendar-view-day]").should("be.visible")
  })

  it("switches to Week view", () => {
    cy.get("[data-cy=calendar-view-week]").click()
    // react-big-calendar adds class rbc-time-view in week mode
    cy.get(".rbc-time-view", { timeout: 6000 }).should("exist")
  })

  it("switches to Day view", () => {
    cy.get("[data-cy=calendar-view-day]").click()
    cy.get(".rbc-time-view", { timeout: 6000 }).should("exist")
  })

  it("switches back to Month view", () => {
    cy.get("[data-cy=calendar-view-week]").click()
    cy.get("[data-cy=calendar-view-month]").click()
    cy.get(".rbc-month-view", { timeout: 6000 }).should("exist")
  })

  it("goes to previous month with Prev button", () => {
    // Record the current label (e.g. "June 2025")
    cy.contains(/\d{4}/).invoke("text").then((before) => {
      cy.get("[data-cy=calendar-prev-btn]").click()
      cy.contains(/\d{4}/, { timeout: 4000 })
        .invoke("text")
        .should("not.eq", before)
    })
  })

  it("goes to next month with Next button", () => {
    cy.contains(/\d{4}/).invoke("text").then((before) => {
      cy.get("[data-cy=calendar-next-btn]").click()
      cy.contains(/\d{4}/, { timeout: 4000 })
        .invoke("text")
        .should("not.eq", before)
    })
  })

  it("clicks Prev then Today returns to current month/view", () => {
    cy.get("[data-cy=calendar-prev-btn]").click()
    cy.get("[data-cy=calendar-today-btn]").click()

    // The calendar should show today's date cell highlighted
    cy.get(".rbc-today", { timeout: 6000 }).should("exist")
  })
})

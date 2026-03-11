/// <reference types="cypress" />

// ─── Types ────────────────────────────────────────────────────────────────────
interface SeedResult {
  projectId: string
  projectName: string
  list1Id: string
  list2Id: string
  list3Id: string
  tasks: Array<{ id: string; title: string }>
}

declare global {
  namespace Cypress {
    interface Chainable {
      /** Log in by injecting a Supabase session into localStorage before visiting */
      login(email: string, password: string): Chainable<void>
      /** Seed a test project + lists + tasks for the given owner */
      seedProject(ownerEmail: string): Chainable<SeedResult>
      /** Remove all __e2e_* test data from Supabase */
      cleanupTestData(): Chainable<void>
      /** Navigate to a sidebar route by clicking the nav item */
      navTo(label: string): Chainable<void>
      /** Assert a toast notification is visible */
      expectToast(text: string | RegExp): Chainable<void>
      /** Verify DB row count for a table */
      dbCount(table: string, filter?: Record<string, string>): Chainable<number>
    }
  }
}

// ─── Login via programmatic Supabase session injection ────────────────────────
// This bypasses the Google OAuth flow entirely.
// Works for test users created with email+password via service role.
Cypress.Commands.add("login", (email: string, password: string) => {
  const storageKey = Cypress.env("SB_STORAGE_KEY") as string

  cy.task<object>("supabase:loginAs", { email, password }).then((session) => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(storageKey, JSON.stringify(session))
      },
    })
    // Wait for the app to hydrate the session and redirect away from /login
    cy.url({ timeout: 10000 }).should("not.include", "/login")
  })
})

// ─── Seed project fixture ──────────────────────────────────────────────────────
Cypress.Commands.add("seedProject", (ownerEmail: string) => {
  return cy
    .task<string>("supabase:getUserId", ownerEmail)
    .then((ownerUserId) =>
      cy.task<SeedResult>("supabase:seedProject", {
        ownerUserId,
        ownerEmail,
        ownerName: "E2E Owner",
      })
    )
})

// ─── Cleanup ───────────────────────────────────────────────────────────────────
Cypress.Commands.add("cleanupTestData", () => {
  cy.task("supabase:cleanupTestData")
})

// ─── Sidebar navigation ────────────────────────────────────────────────────────
Cypress.Commands.add("navTo", (label: string) => {
  cy.contains("nav button", label, { timeout: 8000 }).click()
})

// ─── Toast assertion ───────────────────────────────────────────────────────────
Cypress.Commands.add("expectToast", (text: string | RegExp) => {
  // Sonner uses [data-sonner-toast] or li[data-type]
  cy.get("[data-sonner-toaster]", { timeout: 6000 })
    .contains(text)
    .should("be.visible")
})

// ─── DB count helper ──────────────────────────────────────────────────────────
Cypress.Commands.add(
  "dbCount",
  (table: string, filter?: Record<string, string>) => {
    return cy.task<number>("supabase:getRowCount", { table, filter })
  }
)

export {}

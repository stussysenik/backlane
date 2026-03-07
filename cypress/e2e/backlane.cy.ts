/// <reference types="cypress" />

describe("Backlane", () => {
	beforeEach(() => {
		cy.request("POST", "http://127.0.0.1:8787/api/command", {
			type: "resetDemo",
			payload: {},
		});
		cy.visit("/");
	});

	it("recomputes the customer target math", () => {
		cy.get("[data-testid='customers-to-target']").should("contain", "23");
		cy.get("[data-testid='offer-price']")
			.click()
			.type("{selectall}2500")
			.should("have.value", "2500");
		cy.get("[data-testid='apply-settings']").click();
		cy.get("[data-testid='customers-to-target']").should("contain", "16");
	});

	it("filters and edits a seeded playbook", () => {
		cy.get("[data-testid='nav-playbooks']").click();
		cy.get("[data-testid='playbook-search']").type("receivables");
		cy.get("[data-testid='playbook-card-playbook_receivables']").click();
		cy.get("[data-testid='playbook-title']")
			.clear()
			.type("Receivables pulse engine");
		cy.get("[data-testid='save-playbook']").click();
		cy.get("[data-testid='markdown-preview']").should(
			"contain",
			"# Receivables pulse engine",
		);
	});
});

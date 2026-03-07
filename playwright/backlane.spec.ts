import { expect, test } from "@playwright/test";

async function resetDemo(request: Parameters<typeof test.beforeEach>[0]["request"]) {
	await request.post("http://127.0.0.1:8787/api/command", {
		data: {
			type: "resetDemo",
			payload: {},
		},
	});
}

test.beforeEach(async ({ request, page }) => {
	await resetDemo(request);
	await page.goto("/");
});

test("updates the 40k pricing model", async ({ page }) => {
	await expect(page.getByTestId("customers-to-target")).toContainText("23");
	await page.getByTestId("offer-price").fill("2000");
	await page.getByTestId("apply-settings").click();
	await expect(page.getByTestId("customers-to-target")).toContainText("20");
});

test("creates a playbook, exports it, and starts a run", async ({ page }) => {
	await page.getByTestId("nav-playbooks").click();
	await page.getByTestId("create-playbook").click();
	await page.getByTestId("playbook-title").fill("Maestro revenue loop");
	await page.getByTestId("save-playbook").click();
	await expect(page.getByTestId("markdown-preview")).toContainText(
		"# Maestro revenue loop",
	);
	await page.getByTestId("start-run").click();
	await expect(page.getByText("Runner")).toBeVisible();
	await page.locator('[data-testid^="run-step-"]').first().click();
	await expect(page.getByText("50% complete")).toBeVisible();
});

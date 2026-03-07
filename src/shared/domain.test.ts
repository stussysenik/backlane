import { describe, expect, test } from "bun:test";
import {
	createEmptyPlaybook,
	createRunRecord,
	defaultSettings,
	normalizePlaybook,
	projectPlaybook,
	toggleRunStep,
} from "./domain";

describe("domain", () => {
	test("normalizes and clamps playbook input", () => {
		const playbook = createEmptyPlaybook("2026-03-07T09:00:00.000Z", {
			title: "  Calm onboarding  ",
			priceCents: 99,
			runsPerMonth: 999,
			minutesSavedPerRun: 0,
			confidencePercent: 1000,
			tags: ["ops", "ops", ""],
		});

		const result = normalizePlaybook(playbook, "2026-03-07T09:00:00.000Z");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.title).toBe("Calm onboarding");
		expect(result.value.priceCents).toBe(5_000);
		expect(result.value.runsPerMonth).toBe(120);
		expect(result.value.minutesSavedPerRun).toBe(1);
		expect(result.value.confidencePercent).toBe(100);
		expect(result.value.tags).toEqual(["ops"]);
	});

	test("projects playbook economics", () => {
		const playbook = createEmptyPlaybook("2026-03-07T09:00:00.000Z", {
			priceCents: 2_500_00,
			runsPerMonth: 10,
			minutesSavedPerRun: 30,
			confidencePercent: 80,
		});

		const projection = projectPlaybook(playbook, [], defaultSettings);
		expect(projection.metrics.weightedRevenueCents).toBe(200_000);
		expect(projection.metrics.monthlyTimeValueCents).toBe(60_000);
		expect(projection.metrics.compoundedValueCents).toBe(260_000);
		expect(projection.metrics.leverageScore).toBe(104);
	});

	test("marks a run done when every step completes", () => {
		const playbook = createEmptyPlaybook("2026-03-07T09:00:00.000Z");
		const run = createRunRecord(playbook.id, "2026-03-07T10:00:00.000Z");
		const once = toggleRunStep(
			run,
			playbook,
			playbook.steps[0]!.id,
			"2026-03-07T10:03:00.000Z",
		);
		const done = toggleRunStep(
			once,
			playbook,
			playbook.steps[1]!.id,
			"2026-03-07T10:05:00.000Z",
		);

		expect(done.status).toBe("done");
		expect(done.finishedAt).toBe("2026-03-07T10:05:00.000Z");
		expect(done.completedStepIds).toHaveLength(playbook.steps.length);
	});
});

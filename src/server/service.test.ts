import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createWorkspaceService } from "./service";
import { createWorkspaceStore } from "./store";

const cleanupDirs: string[] = [];

afterEach(() => {
	for (const dir of cleanupDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function createFixture() {
	const directory = mkdtempSync(join(tmpdir(), "backlane-test-"));
	cleanupDirs.push(directory);
	const store = createWorkspaceStore(join(directory, "backlane.sqlite"));
	const service = createWorkspaceService(store, () => "2026-03-07T09:00:00.000Z");
	return { store, service };
}

describe("workspace service", () => {
	test("bootstraps with seeded data", () => {
		const { service } = createFixture();
		const snapshot = service.bootstrap();
		expect(snapshot.playbooks.length).toBeGreaterThanOrEqual(3);
		expect(snapshot.dashboard.activeRuns).toBeGreaterThanOrEqual(1);
	});

	test("can create, save, run, and export a playbook", () => {
		const { service } = createFixture();
		const before = service.bootstrap();
		const created = service.createPlaybook();
		const playbook = created.playbooks.find(
			(item) =>
				!before.playbooks.some(
					(previous) => previous.record.id === item.record.id,
				),
		)!.record;

		const saved = service.savePlaybook({
			...playbook,
			title: "Weekly close without chaos",
			steps: playbook.steps.map((step, index) => ({
				...step,
				title: index === 0 ? "Capture exceptions" : step.title,
			})),
		});
		const savedPlaybook = saved.playbooks.find((item) => item.record.id === playbook.id);
		expect(savedPlaybook?.record.title).toBe("Weekly close without chaos");

		const withRun = service.startRun(playbook.id);
		const activeRun = withRun.runs.find(
			(run) => run.playbookId === playbook.id && run.status === "active",
		);
		expect(activeRun).toBeDefined();

		const toggled = service.toggleRunStep(
			activeRun!.id,
			savedPlaybook!.record.steps[0]!.id,
		);
		const updatedRun = toggled.runs.find((run) => run.id === activeRun!.id);
		expect(updatedRun?.completedStepIds).toEqual([
			savedPlaybook!.record.steps[0]!.id,
		]);

		const exported = service.exportPlaybook(playbook.id);
		expect(exported.markdown).toContain("# Weekly close without chaos");
		expect(exported.markdown).toContain("Capture exceptions");
	});
});

import {
	type Playbook,
	type Settings,
	type WorkspaceSnapshot,
	createEmptyPlaybook,
	createRunRecord,
	normalizePlaybook,
	normalizeSettings,
	projectSnapshot,
	reconcileRunWithPlaybook,
	removeById,
	renderPlaybookMarkdown,
	toggleRunStep,
	upsertById,
} from "../shared/domain";
import type { HttpCommand } from "../shared/rpc";
import type { WorkspaceStore } from "./store";

type Clock = () => string;

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;

export function createWorkspaceService(
	store: WorkspaceStore,
	clock: Clock = () => new Date().toISOString(),
) {
	function snapshot(): WorkspaceSnapshot {
		return projectSnapshot(store.load(), clock());
	}

	return {
		bootstrap(): WorkspaceSnapshot {
			return snapshot();
		},

		createPlaybook(): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			workspace.playbooks = [
				createEmptyPlaybook(now),
				...workspace.playbooks,
			];
			store.save(workspace);
			return projectSnapshot(workspace, now);
		},

		savePlaybook(playbook: Playbook): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			const normalized = normalizePlaybook(playbook, now);
			if (!normalized.ok) {
				throw new Error(normalized.error);
			}

			workspace.playbooks = upsertById(workspace.playbooks, normalized.value);
			workspace.runs = workspace.runs.map((run) =>
				run.playbookId === normalized.value.id
					? reconcileRunWithPlaybook(run, normalized.value, now)
					: run,
			);
			store.save(workspace);
			return projectSnapshot(workspace, now);
		},

		deletePlaybook(playbookId: string): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			workspace.playbooks = removeById(workspace.playbooks, playbookId);
			workspace.runs = workspace.runs.filter(
				(run) => run.playbookId !== playbookId,
			);
			store.save(workspace);
			return projectSnapshot(workspace, now);
		},

		startRun(playbookId: string): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			const hasActive = workspace.runs.some(
				(run) => run.playbookId === playbookId && run.status === "active",
			);
			if (!hasActive) {
				workspace.runs = [createRunRecord(playbookId, now), ...workspace.runs];
				store.save(workspace);
			}

			return projectSnapshot(workspace, now);
		},

		toggleRunStep(runId: string, stepId: string): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			const run = workspace.runs.find((item) => item.id === runId);
			if (!run) {
				throw new Error("Run not found.");
			}

			const playbook = workspace.playbooks.find(
				(item) => item.id === run.playbookId,
			);
			if (!playbook) {
				throw new Error("Playbook not found for run.");
			}

			workspace.runs = workspace.runs.map((item) =>
				item.id === runId ? toggleRunStep(item, playbook, stepId, now) : item,
			);
			store.save(workspace);
			return projectSnapshot(workspace, now);
		},

		updateSettings(settings: Partial<Settings>): WorkspaceSnapshot {
			const now = clock();
			const workspace = store.load();
			workspace.settings = normalizeSettings({
				...workspace.settings,
				...settings,
			});
			store.save(workspace);
			return projectSnapshot(workspace, now);
		},

		resetDemo(): WorkspaceSnapshot {
			const now = clock();
			return projectSnapshot(store.reset(), now);
		},

		exportPlaybook(playbookId: string): { markdown: string } {
			const view = snapshot();
			const playbook = view.playbooks.find(
				(candidate) => candidate.record.id === playbookId,
			);
			if (!playbook) {
				throw new Error("Playbook not found.");
			}

			return { markdown: renderPlaybookMarkdown(playbook, view.settings) };
		},
	};
}

export async function runHttpCommand(
	service: WorkspaceService,
	command: HttpCommand,
): Promise<WorkspaceSnapshot | { markdown: string }> {
	switch (command.type) {
		case "bootstrap":
			return service.bootstrap();
		case "createPlaybook":
			return service.createPlaybook();
		case "savePlaybook":
			return service.savePlaybook(command.payload.playbook);
		case "deletePlaybook":
			return service.deletePlaybook(command.payload.playbookId);
		case "startRun":
			return service.startRun(command.payload.playbookId);
		case "toggleRunStep":
			return service.toggleRunStep(
				command.payload.runId,
				command.payload.stepId,
			);
		case "updateSettings":
			return service.updateSettings(command.payload.settings);
		case "resetDemo":
			return service.resetDemo();
		case "exportPlaybook":
			return service.exportPlaybook(command.payload.playbookId);
	}
}

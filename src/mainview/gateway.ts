import type { Playbook, Settings, WorkspaceSnapshot } from "../shared/domain";
import type { BacklaneRPC, HttpCommand } from "../shared/rpc";

export type WorkspaceGateway = {
	mode: "http" | "rpc";
	bootstrap: () => Promise<WorkspaceSnapshot>;
	createPlaybook: () => Promise<WorkspaceSnapshot>;
	savePlaybook: (playbook: Playbook) => Promise<WorkspaceSnapshot>;
	deletePlaybook: (playbookId: string) => Promise<WorkspaceSnapshot>;
	startRun: (playbookId: string) => Promise<WorkspaceSnapshot>;
	toggleRunStep: (runId: string, stepId: string) => Promise<WorkspaceSnapshot>;
	updateSettings: (settings: Partial<Settings>) => Promise<WorkspaceSnapshot>;
	resetDemo: () => Promise<WorkspaceSnapshot>;
	exportPlaybook: (playbookId: string) => Promise<string>;
};

const API_ORIGIN = import.meta.env.VITE_BACKLANE_API_ORIGIN ?? "http://127.0.0.1:8787";

async function sendHttpCommand<T>(command: HttpCommand): Promise<T> {
	const response = await fetch(`${API_ORIGIN}/api/command`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(command),
	});
	const payload = await response.json();
	if (!response.ok) {
		throw new Error(payload.error ?? "Failed to talk to the Backlane API.");
	}
	return payload as T;
}

function createHttpGateway(): WorkspaceGateway {
	return {
		mode: "http",
		bootstrap: () => sendHttpCommand<WorkspaceSnapshot>({ type: "bootstrap", payload: {} }),
		createPlaybook: () =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "createPlaybook",
				payload: {},
			}),
		savePlaybook: (playbook) =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "savePlaybook",
				payload: { playbook },
			}),
		deletePlaybook: (playbookId) =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "deletePlaybook",
				payload: { playbookId },
			}),
		startRun: (playbookId) =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "startRun",
				payload: { playbookId },
			}),
		toggleRunStep: (runId, stepId) =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "toggleRunStep",
				payload: { runId, stepId },
			}),
		updateSettings: (settings) =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "updateSettings",
				payload: { settings },
			}),
		resetDemo: () =>
			sendHttpCommand<WorkspaceSnapshot>({
				type: "resetDemo",
				payload: {},
			}),
		exportPlaybook: async (playbookId) => {
			const payload = await sendHttpCommand<{ markdown: string }>({
				type: "exportPlaybook",
				payload: { playbookId },
			});
			return payload.markdown;
		},
	};
}

async function createRpcGateway(): Promise<WorkspaceGateway> {
	const { default: Electrobun, Electroview } = await import("electrobun/view");
	const rpc = Electroview.defineRPC<BacklaneRPC>({
		maxRequestTime: 5_000,
		handlers: {
			requests: {},
			messages: {},
		},
	});
	const electrobun = new Electrobun.Electroview({ rpc });

	return {
		mode: "rpc",
		bootstrap: () => electrobun.rpc!.request.bootstrap({}),
		createPlaybook: () => electrobun.rpc!.request.createPlaybook({}),
		savePlaybook: (playbook) => electrobun.rpc!.request.savePlaybook({ playbook }),
		deletePlaybook: (playbookId) =>
			electrobun.rpc!.request.deletePlaybook({ playbookId }),
		startRun: (playbookId) => electrobun.rpc!.request.startRun({ playbookId }),
		toggleRunStep: (runId, stepId) =>
			electrobun.rpc!.request.toggleRunStep({ runId, stepId }),
		updateSettings: (settings) =>
			electrobun.rpc!.request.updateSettings({ settings }),
		resetDemo: () => electrobun.rpc!.request.resetDemo({}),
		exportPlaybook: async (playbookId) => {
			const payload = await electrobun.rpc!.request.exportPlaybook({ playbookId });
			return payload.markdown;
		},
	};
}

export async function createGateway(): Promise<WorkspaceGateway> {
	const params = new URLSearchParams(window.location.search);
	const driver = params.get("driver");

	if (driver === "rpc" || window.location.protocol === "views:") {
		return createRpcGateway();
	}

	return createHttpGateway();
}

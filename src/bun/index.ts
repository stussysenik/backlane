import { BrowserView, BrowserWindow, Updater, Utils } from "electrobun/bun";
import type { BacklaneRPC } from "../shared/rpc";
import { createWorkspaceStore } from "../server/store";
import { createWorkspaceService } from "../server/service";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}?driver=rpc`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(`http://127.0.0.1:${DEV_SERVER_PORT}`, { method: "HEAD" });
			return DEV_SERVER_URL;
		} catch {
			console.log("Backlane HMR server not detected, falling back to bundled view.");
		}
	}

	return "views://mainview/index.html?driver=rpc";
}

const store = createWorkspaceStore(
	`${Utils.paths.userData}/backlane/backlane.sqlite`,
);
const service = createWorkspaceService(store);

const rpc = BrowserView.defineRPC<BacklaneRPC>({
	maxRequestTime: 5_000,
	handlers: {
		requests: {
			bootstrap: () => service.bootstrap(),
			createPlaybook: () => service.createPlaybook(),
			savePlaybook: ({ playbook }: { playbook: Parameters<typeof service.savePlaybook>[0] }) =>
				service.savePlaybook(playbook),
			deletePlaybook: ({ playbookId }: { playbookId: string }) =>
				service.deletePlaybook(playbookId),
			startRun: ({ playbookId }: { playbookId: string }) =>
				service.startRun(playbookId),
			toggleRunStep: ({ runId, stepId }: { runId: string; stepId: string }) =>
				service.toggleRunStep(runId, stepId),
			updateSettings: ({ settings }: { settings: Parameters<typeof service.updateSettings>[0] }) =>
				service.updateSettings(settings),
			resetDemo: () => service.resetDemo(),
			exportPlaybook: ({ playbookId }: { playbookId: string }) =>
				service.exportPlaybook(playbookId),
		},
		messages: {},
	},
});

const mainWindow = new BrowserWindow({
	title: "Backlane",
	url: await getMainViewUrl(),
	rpc,
	frame: {
		width: 1440,
		height: 980,
		x: 120,
		y: 80,
	},
});

console.log("Backlane desktop app started.");
console.log(`Backlane data file: ${store.getPath()}`);
void mainWindow;

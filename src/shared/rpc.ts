import type { RPCSchema } from "electrobun/bun";
import type { Playbook, Settings, WorkspaceSnapshot } from "./domain";

export type BacklaneRPC = {
	bun: RPCSchema<{
		requests: {
			bootstrap: {
				params: {};
				response: WorkspaceSnapshot;
			};
			createPlaybook: {
				params: {};
				response: WorkspaceSnapshot;
			};
			savePlaybook: {
				params: { playbook: Playbook };
				response: WorkspaceSnapshot;
			};
			deletePlaybook: {
				params: { playbookId: string };
				response: WorkspaceSnapshot;
			};
			startRun: {
				params: { playbookId: string };
				response: WorkspaceSnapshot;
			};
			toggleRunStep: {
				params: { runId: string; stepId: string };
				response: WorkspaceSnapshot;
			};
			updateSettings: {
				params: { settings: Partial<Settings> };
				response: WorkspaceSnapshot;
			};
			resetDemo: {
				params: {};
				response: WorkspaceSnapshot;
			};
			exportPlaybook: {
				params: { playbookId: string };
				response: { markdown: string };
			};
		};
		messages: {};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {};
	}>;
};

export type HttpCommand =
	| { type: "bootstrap"; payload: {} }
	| { type: "createPlaybook"; payload: {} }
	| { type: "savePlaybook"; payload: { playbook: Playbook } }
	| { type: "deletePlaybook"; payload: { playbookId: string } }
	| { type: "startRun"; payload: { playbookId: string } }
	| { type: "toggleRunStep"; payload: { runId: string; stepId: string } }
	| { type: "updateSettings"; payload: { settings: Partial<Settings> } }
	| { type: "resetDemo"; payload: {} }
	| { type: "exportPlaybook"; payload: { playbookId: string } };

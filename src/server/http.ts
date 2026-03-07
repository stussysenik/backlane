import { createWorkspaceService, runHttpCommand } from "./service";
import { createWorkspaceStore, resolveProjectDataFile } from "./store";
import type { HttpCommand } from "../shared/rpc";

const port = Number(Bun.env.BACKLANE_API_PORT ?? "8787");
const dataFile = Bun.env.BACKLANE_DATA_FILE ?? resolveProjectDataFile();
const store = createWorkspaceStore(dataFile);
const service = createWorkspaceService(store);

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"access-control-allow-origin": "*",
			"access-control-allow-methods": "GET,POST,OPTIONS",
			"access-control-allow-headers": "content-type",
		},
	});
}

Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return json({ ok: true });
		}

		if (request.method === "GET" && url.pathname === "/health") {
			return json({
				ok: true,
				port,
				dataFile,
			});
		}

		if (request.method === "POST" && url.pathname === "/api/command") {
			try {
				const command = (await request.json()) as HttpCommand;
				const response = await runHttpCommand(service, command);
				return json(response);
			} catch (error) {
				return json(
					{
						error:
							error instanceof Error ? error.message : "Unknown server error.",
					},
					400,
				);
			}
		}

		return json({ error: "Not found." }, 404);
	},
});

console.log(`Backlane HTTP API ready on http://127.0.0.1:${port}`);
console.log(`Backlane data file: ${store.getPath()}`);

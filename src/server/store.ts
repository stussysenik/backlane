import Database from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StoredWorkspace } from "../shared/domain";
import { createSeedWorkspace } from "../shared/seed";

export type WorkspaceStore = {
	load: () => StoredWorkspace;
	save: (workspace: StoredWorkspace) => void;
	reset: () => StoredWorkspace;
	getPath: () => string;
};

function ensureParentDirectory(filePath: string): void {
	const parent = dirname(filePath);
	if (!existsSync(parent)) {
		mkdirSync(parent, { recursive: true });
	}
}

export function resolveProjectDataFile(): string {
	return join(process.cwd(), ".backlane", "backlane.sqlite");
}

export function createWorkspaceStore(dbFile: string): WorkspaceStore {
	ensureParentDirectory(dbFile);
	const db = new Database(dbFile, { create: true });
	db.exec(`
		CREATE TABLE IF NOT EXISTS workspace_store (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			data TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)
	`);

	const read = db.prepare("SELECT data FROM workspace_store WHERE id = 1");
	const write = db.prepare(`
		INSERT INTO workspace_store (id, data, updated_at)
		VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			data = excluded.data,
			updated_at = excluded.updated_at
	`);

	function save(workspace: StoredWorkspace): void {
		write.run(JSON.stringify(workspace), new Date().toISOString());
	}

	function load(): StoredWorkspace {
		const row = read.get() as { data: string } | null;
		if (!row) {
			const seed = createSeedWorkspace();
			save(seed);
			return seed;
		}

		return JSON.parse(row.data) as StoredWorkspace;
	}

	function reset(): StoredWorkspace {
		const seed = createSeedWorkspace();
		save(seed);
		return seed;
	}

	return {
		load,
		save,
		reset,
		getPath: () => dbFile,
	};
}

export type RPCSchema<T> = T;

export class BrowserWindow {
	constructor(options: Record<string, unknown>);
}

export const BrowserView: {
	defineRPC<T>(config: {
		maxRequestTime?: number;
		handlers: Record<string, unknown>;
	}): T;
};

export const Updater: {
	localInfo: {
		channel(): Promise<string>;
	};
};

export const Utils: {
	paths: {
		userData: string;
	};
};

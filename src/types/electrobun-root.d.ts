export type ElectrobunConfig = {
	app: {
		name: string;
		identifier: string;
		version: string;
	};
	build?: Record<string, unknown>;
};

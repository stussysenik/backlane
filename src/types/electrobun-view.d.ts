export const Electroview: {
	defineRPC<T>(config: {
		maxRequestTime?: number;
		handlers: Record<string, unknown>;
	}): T;
};

declare const Electrobun: {
	Electroview: new (options: { rpc: unknown }) => {
		rpc?: {
			request: Record<string, (...args: any[]) => Promise<any>>;
		};
	};
};

export default Electrobun;

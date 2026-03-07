import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "Backlane",
		identifier: "com.backlane.desktop",
		version: "0.1.0",
	},
	build: {
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;

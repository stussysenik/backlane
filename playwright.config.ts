import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./playwright",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	reporter: [["list"], ["html", { open: "never" }]],
});

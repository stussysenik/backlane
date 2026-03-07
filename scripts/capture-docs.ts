import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const screenshotsDir = join(root, "docs", "screenshots");
const gifsDir = join(root, "docs", "gifs");
const tempVideoDir = join(root, "docs", ".tmp-video");

mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(gifsDir, { recursive: true });
rmSync(tempVideoDir, { recursive: true, force: true });
mkdirSync(tempVideoDir, { recursive: true });

async function resetDemo(): Promise<void> {
	await fetch("http://127.0.0.1:8787/api/command", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			type: "resetDemo",
			payload: {},
		}),
	});
}

async function captureScreenshots(): Promise<void> {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({
		viewport: {
			width: 1440,
			height: 980,
		},
	});

	await page.goto("http://127.0.0.1:5173");
	await page.screenshot({
		path: join(screenshotsDir, "dashboard.png"),
		fullPage: true,
	});

	await page.getByTestId("nav-playbooks").click();
	await page.screenshot({
		path: join(screenshotsDir, "playbooks.png"),
		fullPage: true,
	});

	await page.getByTestId("nav-runs").click();
	await page.screenshot({
		path: join(screenshotsDir, "runs.png"),
		fullPage: true,
	});

	await browser.close();
}

async function captureGif(): Promise<void> {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		recordVideo: {
			dir: tempVideoDir,
			size: {
				width: 1280,
				height: 900,
			},
		},
		viewport: {
			width: 1280,
			height: 900,
		},
	});
	const page = await context.newPage();
	const video = page.video();

	await page.goto("http://127.0.0.1:5173");
	await page.getByTestId("nav-runs").click();
	await page.getByText("Verify all dependencies").click();
	await page.waitForTimeout(800);

	await context.close();
	await browser.close();

	const videoPath = await video?.path();
	if (!videoPath) {
		throw new Error("Playwright did not produce a video.");
	}

	const outputPath = join(gifsDir, "run-flow.gif");
	const ffmpeg = spawnSync(
		"ffmpeg",
		[
			"-y",
			"-i",
			videoPath,
			"-vf",
			"fps=10,scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
			outputPath,
		],
		{ stdio: "inherit" },
	);

	if (ffmpeg.status !== 0) {
		throw new Error("ffmpeg failed to convert the recorded flow into a GIF.");
	}
}

await resetDemo();
await captureScreenshots();
await resetDemo();
await captureGif();

console.log("Generated documentation assets in docs/screenshots and docs/gifs.");

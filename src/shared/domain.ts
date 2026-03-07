export const stageOptions = ["discover", "design", "prove", "scale"] as const;
export const stepKindOptions = ["capture", "decide", "ship", "verify"] as const;
export const routeOptions = ["dashboard", "playbooks", "runs"] as const;

export type Stage = (typeof stageOptions)[number];
export type StepKind = (typeof stepKindOptions)[number];
export type AppRoute = (typeof routeOptions)[number];

export type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

export type Step = {
	id: string;
	title: string;
	note: string;
	kind: StepKind;
	durationMinutes: number;
};

export type Playbook = {
	id: string;
	title: string;
	audience: string;
	promise: string;
	priceCents: number;
	runsPerMonth: number;
	minutesSavedPerRun: number;
	confidencePercent: number;
	stage: Stage;
	tags: string[];
	steps: Step[];
	createdAt: string;
	updatedAt: string;
};

export type RunRecord = {
	id: string;
	playbookId: string;
	completedStepIds: string[];
	status: "active" | "done";
	startedAt: string;
	finishedAt: string | null;
};

export type Settings = {
	targetMrrCents: number;
	offerPriceCents: number;
	averageHourlyRateCents: number;
};

export type PlaybookMetrics = {
	stepsCount: number;
	completedSteps: number;
	progressPercent: number;
	monthlyTimeValueCents: number;
	weightedRevenueCents: number;
	compoundedValueCents: number;
	monthlyHoursRecovered: number;
	leverageScore: number;
	activeRunCount: number;
};

export type ProjectedPlaybook = {
	record: Playbook;
	metrics: PlaybookMetrics;
	latestRun: RunRecord | null;
};

export type DashboardMetrics = {
	totalCompoundedValueCents: number;
	monthlyHoursRecovered: number;
	activeRuns: number;
	readyToPrice: number;
	customersToTarget: number;
	focusIds: string[];
};

export type WorkspaceSnapshot = {
	generatedAt: string;
	settings: Settings;
	playbooks: ProjectedPlaybook[];
	runs: RunRecord[];
	dashboard: DashboardMetrics;
};

export type StoredWorkspace = {
	playbooks: Playbook[];
	runs: RunRecord[];
	settings: Settings;
};

export const defaultSettings: Settings = {
	targetMrrCents: 4_000_000,
	offerPriceCents: 1_500_00,
	averageHourlyRateCents: 12_000,
};

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function err(error: string): Result<never> {
	return { ok: false, error };
}

export function createId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function toTagList(raw: string): string[] {
	return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function formatMoney(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(cents / 100);
}

export function formatCompactMoney(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 1,
		notation: "compact",
	}).format(cents / 100);
}

export function formatHours(hours: number): string {
	return `${hours.toFixed(1)} h`;
}

export function stageLabel(stage: Stage): string {
	return stage[0]!.toUpperCase() + stage.slice(1);
}

export function kindLabel(kind: StepKind): string {
	return kind[0]!.toUpperCase() + kind.slice(1);
}

export function createEmptyStep(_now: string, overrides?: Partial<Step>): Step {
	return {
		id: overrides?.id ?? createId("step"),
		title: overrides?.title ?? "New step",
		note: overrides?.note ?? "What must be true before this step is done?",
		kind: overrides?.kind ?? "capture",
		durationMinutes: overrides?.durationMinutes ?? 10,
	};
}

export function createEmptyPlaybook(
	now: string,
	overrides?: Partial<Playbook>,
): Playbook {
	return {
		id: overrides?.id ?? createId("playbook"),
		title: overrides?.title ?? "Untitled playbook",
		audience: overrides?.audience ?? "Ops team",
		promise: overrides?.promise ?? "Turn recurring work into something a team can sell, delegate, and trust.",
		priceCents: overrides?.priceCents ?? 2_000_00,
		runsPerMonth: overrides?.runsPerMonth ?? 12,
		minutesSavedPerRun: overrides?.minutesSavedPerRun ?? 25,
		confidencePercent: overrides?.confidencePercent ?? 72,
		stage: overrides?.stage ?? "discover",
		tags: overrides?.tags ?? ["ops", "local-first"],
		steps:
			overrides?.steps ??
			[
				createEmptyStep(now, {
					id: createId("step"),
					title: "Capture the trigger",
					note: "Write the exact condition that starts the workflow.",
					kind: "capture",
					durationMinutes: 8,
				}),
				createEmptyStep(now, {
					id: createId("step"),
					title: "Ship the outcome",
					note: "Deliver the artifact the customer actually pays for.",
					kind: "ship",
					durationMinutes: 14,
				}),
			],
		createdAt: overrides?.createdAt ?? now,
		updatedAt: overrides?.updatedAt ?? now,
	};
}

export function normalizeStep(step: Step): Step {
	return {
		...step,
		title: step.title.trim() || "Untitled step",
		note: step.note.trim(),
		durationMinutes: clamp(Math.round(step.durationMinutes || 0), 1, 240),
		kind: stepKindOptions.includes(step.kind) ? step.kind : "capture",
	};
}

export function normalizePlaybook(
	input: Playbook,
	now: string,
): Result<Playbook> {
	const title = input.title.trim();
	if (!title) {
		return err("Every playbook needs a title.");
	}

	const playbook: Playbook = {
		...input,
		title,
		audience: input.audience.trim() || "Ops team",
		promise: input.promise.trim() || "Build a repeatable workflow.",
		priceCents: clamp(Math.round(input.priceCents || 0), 50_00, 100_000_00),
		runsPerMonth: clamp(Math.round(input.runsPerMonth || 0), 1, 120),
		minutesSavedPerRun: clamp(
			Math.round(input.minutesSavedPerRun || 0),
			1,
			600,
		),
		confidencePercent: clamp(
			Math.round(input.confidencePercent || 0),
			5,
			100,
		),
		stage: stageOptions.includes(input.stage) ? input.stage : "discover",
		tags: [...new Set(input.tags.map((item) => item.trim()).filter(Boolean))],
		steps: input.steps.map(normalizeStep),
		updatedAt: now,
	};

	return ok(playbook);
}

export function normalizeSettings(input: Partial<Settings>): Settings {
	return {
		targetMrrCents: clamp(
			Math.round(input.targetMrrCents ?? defaultSettings.targetMrrCents),
			1_000_00,
			250_000_00,
		),
		offerPriceCents: clamp(
			Math.round(input.offerPriceCents ?? defaultSettings.offerPriceCents),
			100_00,
			25_000_00,
		),
		averageHourlyRateCents: clamp(
			Math.round(
				input.averageHourlyRateCents ?? defaultSettings.averageHourlyRateCents,
			),
			2_000,
			50_000,
		),
	};
}

export function createRunRecord(playbookId: string, now: string): RunRecord {
	return {
		id: createId("run"),
		playbookId,
		completedStepIds: [],
		status: "active",
		startedAt: now,
		finishedAt: null,
	};
}

export function reconcileRunWithPlaybook(
	run: RunRecord,
	playbook: Playbook,
	now: string,
): RunRecord {
	const validIds = new Set(playbook.steps.map((step) => step.id));
	const completedStepIds = run.completedStepIds.filter((id) => validIds.has(id));
	const isDone =
		playbook.steps.length > 0 &&
		playbook.steps.every((step) => completedStepIds.includes(step.id));

	return {
		...run,
		completedStepIds,
		status: isDone ? "done" : "active",
		finishedAt: isDone ? run.finishedAt ?? now : null,
	};
}

export function toggleRunStep(
	run: RunRecord,
	playbook: Playbook,
	stepId: string,
	now: string,
): RunRecord {
	const nextIds = run.completedStepIds.includes(stepId)
		? run.completedStepIds.filter((id) => id !== stepId)
		: [...run.completedStepIds, stepId];

	return reconcileRunWithPlaybook(
		{
			...run,
			completedStepIds: nextIds,
		},
		playbook,
		now,
	);
}

export function upsertById<T extends { id: string }>(
	items: readonly T[],
	nextItem: T,
): T[] {
	const hasExisting = items.some((item) => item.id === nextItem.id);
	if (!hasExisting) {
		return [nextItem, ...items];
	}

	return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

export function removeById<T extends { id: string }>(
	items: readonly T[],
	id: string,
): T[] {
	return items.filter((item) => item.id !== id);
}

export function projectPlaybook(
	playbook: Playbook,
	runs: readonly RunRecord[],
	settings: Settings,
): ProjectedPlaybook {
	const ownRuns = runs
		.filter((run) => run.playbookId === playbook.id)
		.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
	const latestRun = ownRuns[0] ?? null;
	const completedSteps = latestRun?.completedStepIds.length ?? 0;
	const stepsCount = playbook.steps.length;
	const monthlyTimeValueCents = Math.round(
		(playbook.minutesSavedPerRun *
			playbook.runsPerMonth *
			settings.averageHourlyRateCents) /
			60,
	);
	const weightedRevenueCents = Math.round(
		playbook.priceCents * (playbook.confidencePercent / 100),
	);
	const compoundedValueCents = monthlyTimeValueCents + weightedRevenueCents;
	const monthlyHoursRecovered =
		(playbook.minutesSavedPerRun * playbook.runsPerMonth) / 60;

	return {
		record: playbook,
		latestRun,
		metrics: {
			stepsCount,
			completedSteps,
			progressPercent:
				stepsCount === 0 ? 0 : Math.round((completedSteps / stepsCount) * 100),
			monthlyTimeValueCents,
			weightedRevenueCents,
			compoundedValueCents,
			monthlyHoursRecovered,
			leverageScore: Math.max(1, Math.round(compoundedValueCents / 2_500)),
			activeRunCount: ownRuns.filter((run) => run.status === "active").length,
		},
	};
}

export function projectDashboard(
	playbooks: readonly ProjectedPlaybook[],
	settings: Settings,
	runs: readonly RunRecord[],
): DashboardMetrics {
	const sorted = [...playbooks].sort(
		(left, right) => right.metrics.leverageScore - left.metrics.leverageScore,
	);

	return {
		totalCompoundedValueCents: playbooks.reduce(
			(sum, playbook) => sum + playbook.metrics.compoundedValueCents,
			0,
		),
		monthlyHoursRecovered: playbooks.reduce(
			(sum, playbook) => sum + playbook.metrics.monthlyHoursRecovered,
			0,
		),
		activeRuns: runs.filter((run) => run.status === "active").length,
		readyToPrice: playbooks.filter(
			(playbook) =>
				(playbook.record.stage === "prove" || playbook.record.stage === "scale") &&
				playbook.metrics.leverageScore >= 60,
		).length,
		customersToTarget: Math.max(
			1,
			Math.ceil(settings.targetMrrCents / Math.max(settings.offerPriceCents, 1)),
		),
		focusIds: sorted.slice(0, 3).map((playbook) => playbook.record.id),
	};
}

export function projectSnapshot(
	workspace: StoredWorkspace,
	generatedAt: string,
): WorkspaceSnapshot {
	const playbooks = workspace.playbooks
		.map((playbook) => projectPlaybook(playbook, workspace.runs, workspace.settings))
		.sort((left, right) => right.metrics.leverageScore - left.metrics.leverageScore);

	return {
		generatedAt,
		settings: workspace.settings,
		playbooks,
		runs: [...workspace.runs].sort((left, right) =>
			right.startedAt.localeCompare(left.startedAt),
		),
		dashboard: projectDashboard(playbooks, workspace.settings, workspace.runs),
	};
}

export function renderPlaybookMarkdown(
	playbook: ProjectedPlaybook,
	settings: Settings,
): string {
	const tags = playbook.record.tags.map((tag) => `#${tag}`).join(" ");
	return [
		`# ${playbook.record.title}`,
		"",
		`${playbook.record.promise}`,
		"",
		`Audience: ${playbook.record.audience}`,
		`Stage: ${stageLabel(playbook.record.stage)}`,
		`Confidence: ${playbook.record.confidencePercent}%`,
		`Offer anchor: ${formatMoney(playbook.record.priceCents)}`,
		`Monthly target plan: ${formatMoney(settings.targetMrrCents)} via ${formatMoney(settings.offerPriceCents)} offers`,
		tags ? `Tags: ${tags}` : "",
		"",
		"## Why it matters",
		`- Weighted revenue: ${formatMoney(playbook.metrics.weightedRevenueCents)}`,
		`- Time value: ${formatMoney(playbook.metrics.monthlyTimeValueCents)}`,
		`- Compounded value: ${formatMoney(playbook.metrics.compoundedValueCents)}`,
		`- Leverage score: ${playbook.metrics.leverageScore}`,
		"",
		"## Steps",
		...playbook.record.steps.map(
			(step, index) =>
				`${index + 1}. ${step.title} (${kindLabel(step.kind)}, ${step.durationMinutes} min)\n   ${step.note}`,
		),
		"",
	].join("\n");
}

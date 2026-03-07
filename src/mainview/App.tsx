import {
	startTransition,
	useDeferredValue,
	useEffect,
	useState,
} from "react";
import {
	type AppRoute,
	type Playbook,
	type ProjectedPlaybook,
	type RunRecord,
	type Settings,
	type Step,
	type WorkspaceSnapshot,
	createEmptyStep,
	formatCompactMoney,
	formatHours,
	formatMoney,
	kindLabel,
	stageLabel,
	stageOptions,
	stepKindOptions,
	toTagList,
} from "../shared/domain";
import { createGateway, type WorkspaceGateway } from "./gateway";

function App() {
	const [gateway, setGateway] = useState<WorkspaceGateway | null>(null);
	const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
	const [route, setRoute] = useState<AppRoute>("dashboard");
	const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
	const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Playbook | null>(null);
	const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null);
	const [markdown, setMarkdown] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [playbookQuery, setPlaybookQuery] = useState("");
	const deferredQuery = useDeferredValue(playbookQuery.trim().toLowerCase());

	const selectedPlaybook =
		snapshot?.playbooks.find((playbook) => playbook.record.id === selectedPlaybookId) ??
		null;
	const selectedRun =
		snapshot?.runs.find((run) => run.id === selectedRunId) ?? snapshot?.runs[0] ?? null;

	const visiblePlaybooks = snapshot?.playbooks.filter((playbook) => {
		if (!deferredQuery) {
			return true;
		}

		const haystack = [
			playbook.record.title,
			playbook.record.audience,
			playbook.record.promise,
			playbook.record.tags.join(" "),
		]
			.join(" ")
			.toLowerCase();

		return haystack.includes(deferredQuery);
	});

	function applySnapshot(
		next: WorkspaceSnapshot,
		selection?: {
			playbookId?: string | null;
			runId?: string | null;
		},
	): void {
		startTransition(() => {
			setSnapshot(next);
			setSelectedPlaybookId((current) => {
				if (
					selection?.playbookId &&
					next.playbooks.some(
						(playbook) => playbook.record.id === selection.playbookId,
					)
				) {
					return selection.playbookId;
				}

				if (current && next.playbooks.some((playbook) => playbook.record.id === current)) {
					return current;
				}
				return next.playbooks[0]?.record.id ?? null;
			});
			setSelectedRunId((current) => {
				if (selection?.runId && next.runs.some((run) => run.id === selection.runId)) {
					return selection.runId;
				}

				if (current && next.runs.some((run) => run.id === current)) {
					return current;
				}
				return next.runs[0]?.id ?? null;
			});
		});
	}

	async function runSnapshotCommand(
		label: string,
		task: () => Promise<WorkspaceSnapshot>,
	): Promise<WorkspaceSnapshot | null> {
		setBusy(label);
		setError(null);
		try {
			const next = await task();
			applySnapshot(next);
			return next;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Something broke.");
			return null;
		} finally {
			setBusy(null);
		}
	}

	async function refreshMarkdown(playbookId: string | null): Promise<void> {
		if (!gateway || !playbookId) {
			return;
		}

		try {
			const next = await gateway.exportPlaybook(playbookId);
			setMarkdown(next);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not export markdown.");
		}
	}

	useEffect(() => {
		let active = true;

		void (async () => {
			const nextGateway = await createGateway();
			if (!active) {
				return;
			}

			setGateway(nextGateway);
			setBusy("booting");
			try {
				const firstSnapshot = await nextGateway.bootstrap();
				if (!active) {
					return;
				}
				applySnapshot(firstSnapshot);
			} catch (cause) {
				if (!active) {
					return;
				}
				setError(cause instanceof Error ? cause.message : "Could not start Backlane.");
			} finally {
				if (active) {
					setBusy(null);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!snapshot) {
			return;
		}

		const nextPlaybook =
			snapshot.playbooks.find((playbook) => playbook.record.id === selectedPlaybookId) ??
			snapshot.playbooks[0] ??
			null;
		setDraft(nextPlaybook?.record ?? null);
		setSettingsDraft(snapshot.settings);
	}, [snapshot, selectedPlaybookId]);

	useEffect(() => {
		void refreshMarkdown(selectedPlaybookId);
	}, [gateway, selectedPlaybookId, snapshot?.generatedAt]);

	function updateDraft(update: (current: Playbook) => Playbook): void {
		setDraft((current) => (current ? update(current) : current));
	}

	function updateStep(
		stepId: string,
		update: (current: Step) => Step,
	): void {
		updateDraft((current) => ({
			...current,
			steps: current.steps.map((step) => (step.id === stepId ? update(step) : step)),
		}));
	}

	async function onCreatePlaybook(): Promise<void> {
		if (!gateway) {
			return;
		}

		const knownIds = new Set(snapshot?.playbooks.map((playbook) => playbook.record.id));
		setBusy("creating playbook");
		setError(null);
		let next: WorkspaceSnapshot | null = null;
		try {
			next = await gateway.createPlaybook();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Something broke.");
		} finally {
			setBusy(null);
		}

		const created = next?.playbooks.find(
			(playbook) => !knownIds.has(playbook.record.id),
		);
		if (created && next) {
			applySnapshot(next, { playbookId: created.record.id });
			setRoute("playbooks");
		} else if (next) {
			applySnapshot(next);
		}
	}

	async function onSavePlaybook(): Promise<void> {
		if (!gateway || !draft) {
			return;
		}

		const next = await runSnapshotCommand("saving playbook", () =>
			gateway.savePlaybook(draft),
		);
		if (next) {
			await refreshMarkdown(draft.id);
		}
	}

	async function onDeletePlaybook(): Promise<void> {
		if (!gateway || !selectedPlaybookId) {
			return;
		}

		const next = await runSnapshotCommand("deleting playbook", () =>
			gateway.deletePlaybook(selectedPlaybookId),
		);
		if (next?.playbooks[0]) {
			setSelectedPlaybookId(next.playbooks[0].record.id);
		}
	}

	async function onStartRun(playbookId: string): Promise<void> {
		if (!gateway) {
			return;
		}

		const next = await runSnapshotCommand("starting run", () =>
			gateway.startRun(playbookId),
		);
		if (!next) {
			return;
		}

		const selected =
			next.runs.find(
				(run) => run.playbookId === playbookId && run.status === "active",
			) ?? next.runs[0] ?? null;
		if (selected) {
			setSelectedRunId(selected.id);
			setRoute("runs");
		}
	}

	async function onToggleRunStep(runId: string, stepId: string): Promise<void> {
		if (!gateway) {
			return;
		}

		await runSnapshotCommand("updating run", () =>
			gateway.toggleRunStep(runId, stepId),
		);
	}

	async function onApplySettings(): Promise<void> {
		if (!gateway || !settingsDraft) {
			return;
		}

		await runSnapshotCommand("updating model", () =>
			gateway.updateSettings(settingsDraft),
		);
	}

	async function onResetDemo(): Promise<void> {
		if (!gateway) {
			return;
		}

		const next = await runSnapshotCommand("resetting demo", () =>
			gateway.resetDemo(),
		);
		if (next) {
			setRoute("dashboard");
		}
	}

	async function onCopyMarkdown(): Promise<void> {
		if (!markdown) {
			return;
		}

		try {
			await navigator.clipboard.writeText(markdown);
		} catch {
			setError("Clipboard access failed.");
		}
	}

	async function onExportMarkdown(): Promise<void> {
		await refreshMarkdown(selectedPlaybookId);
	}

	if (!snapshot || !draft || !settingsDraft) {
		return (
			<div className="shell loading-shell">
				<div className="loading-card">
					<p className="eyebrow">Backlane</p>
					<h1>Building the workspace…</h1>
					<p>{busy === "booting" ? "Opening the local-first engine." : "Waiting for data."}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="shell" data-testid="app-shell">
			<aside className="sidebar">
				<div className="brand-block">
					<p className="eyebrow">Backlane</p>
					<h1>Compounding playbooks for the back office.</h1>
					<p className="brand-copy">
						Local-first, typed, and testable. Desktop RPC when embedded. HTTP
						when you need browser-grade automation.
					</p>
				</div>

				<nav className="nav-stack">
					<NavButton
						active={route === "dashboard"}
						id="nav-dashboard"
						label="Dashboard"
						meta={formatCompactMoney(snapshot.dashboard.totalCompoundedValueCents)}
						testId="nav-dashboard"
						onClick={() => setRoute("dashboard")}
					/>
					<NavButton
						active={route === "playbooks"}
						id="nav-playbooks"
						label="Playbooks"
						meta={`${snapshot.playbooks.length} systems`}
						testId="nav-playbooks"
						onClick={() => setRoute("playbooks")}
					/>
					<NavButton
						active={route === "runs"}
						id="nav-runs"
						label="Runs"
						meta={`${snapshot.dashboard.activeRuns} active`}
						testId="nav-runs"
						onClick={() => setRoute("runs")}
					/>
				</nav>

				<div className="sidebar-footer">
					<div className="pill-row">
						<span className="pill">mode {gateway?.mode ?? "http"}</span>
						<span className="pill">{busy ? "busy" : "ready"}</span>
					</div>
					<button
						className="ghost-button"
						type="button"
						id="reset-demo"
						data-testid="reset-demo"
						onClick={() => void onResetDemo()}
					>
						Reset demo workspace
					</button>
				</div>
			</aside>

			<main className="main">
				<header className="hero">
					<div>
						<p className="eyebrow">Built to earn its keep</p>
						<h2>
							A desk for turning repeated work into something teams will pay for.
						</h2>
						<p className="hero-copy">
							Backlane scores each workflow by recovered time and weighted revenue,
							then makes the next best playbook impossible to ignore.
						</p>
					</div>
					<div className="hero-actions">
						<button
							className="primary-button"
							type="button"
							id="create-playbook"
							data-testid="create-playbook"
							onClick={() => void onCreatePlaybook()}
						>
							New playbook
						</button>
						<div className="status-card">
							<span>Target</span>
							<strong>{formatMoney(snapshot.settings.targetMrrCents)}</strong>
							<small>{snapshot.dashboard.customersToTarget} customers at current offer</small>
						</div>
					</div>
				</header>

				{error ? <div className="error-banner">{error}</div> : null}

				{route === "dashboard" ? (
					<DashboardView
						snapshot={snapshot}
						settingsDraft={settingsDraft}
						selectedPlaybookId={selectedPlaybookId}
						setSelectedPlaybookId={setSelectedPlaybookId}
						setRoute={setRoute}
						setSettingsDraft={setSettingsDraft}
						onApplySettings={() => void onApplySettings()}
					/>
				) : null}

				{route === "playbooks" ? (
					<section className="content-grid content-grid-wide">
						<div className="panel list-panel">
							<div className="panel-header">
								<div>
									<p className="eyebrow">Library</p>
									<h3>Focus playbooks</h3>
								</div>
									<input
										id="playbook-search"
										data-testid="playbook-search"
										className="search-input"
										value={playbookQuery}
										placeholder="Search playbooks"
									onChange={(event) => setPlaybookQuery(event.target.value)}
								/>
							</div>
							<div className="stack">
								{visiblePlaybooks?.map((playbook) => (
									<PlaybookCard
										key={playbook.record.id}
										playbook={playbook}
										selected={playbook.record.id === draft.id}
										testId={`playbook-card-${playbook.record.id}`}
										onClick={() => setSelectedPlaybookId(playbook.record.id)}
										onStartRun={() => void onStartRun(playbook.record.id)}
									/>
								))}
							</div>
						</div>

						<div className="panel editor-panel">
							<div className="panel-header sticky-header">
								<div>
									<p className="eyebrow">Editor</p>
									<h3>{draft.title}</h3>
								</div>
								<div className="action-row">
										<button
											className="secondary-button"
											type="button"
											id="start-run"
											data-testid="start-run"
											onClick={() => void onStartRun(draft.id)}
										>
										Start run
									</button>
										<button
											className="primary-button"
											type="button"
											id="save-playbook"
											data-testid="save-playbook"
											onClick={() => void onSavePlaybook()}
										>
										Save playbook
									</button>
								</div>
							</div>

							<div className="editor-grid">
								<label className="field">
									<span>Title</span>
										<input
											id="playbook-title"
											data-testid="playbook-title"
											value={draft.title}
											onChange={(event) =>
											updateDraft((current) => ({
												...current,
												title: event.target.value,
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Audience</span>
									<input
										value={draft.audience}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												audience: event.target.value,
											}))
										}
									/>
								</label>

								<label className="field field-wide">
									<span>Promise</span>
									<textarea
										rows={3}
										value={draft.promise}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												promise: event.target.value,
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Offer anchor ($)</span>
									<input
										type="number"
										value={Math.round(draft.priceCents / 100)}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												priceCents: Number(event.target.value || 0) * 100,
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Runs / month</span>
									<input
										type="number"
										value={draft.runsPerMonth}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												runsPerMonth: Number(event.target.value || 0),
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Minutes saved / run</span>
									<input
										type="number"
										value={draft.minutesSavedPerRun}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												minutesSavedPerRun: Number(event.target.value || 0),
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Confidence (%)</span>
									<input
										type="number"
										value={draft.confidencePercent}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												confidencePercent: Number(event.target.value || 0),
											}))
										}
									/>
								</label>

								<label className="field">
									<span>Stage</span>
										<select
											id="playbook-stage"
											data-testid="playbook-stage"
											value={draft.stage}
											onChange={(event) =>
											updateDraft((current) => ({
												...current,
												stage: event.target.value as Playbook["stage"],
											}))
										}
									>
										{stageOptions.map((stage) => (
											<option key={stage} value={stage}>
												{stageLabel(stage)}
											</option>
										))}
									</select>
								</label>

								<label className="field field-wide">
									<span>Tags</span>
									<input
										value={draft.tags.join(", ")}
										onChange={(event) =>
											updateDraft((current) => ({
												...current,
												tags: toTagList(event.target.value),
											}))
										}
									/>
								</label>
							</div>

							<div className="metrics-strip">
								<MiniMetric
									label="Weighted revenue"
									value={formatMoney(selectedPlaybook?.metrics.weightedRevenueCents ?? 0)}
								/>
								<MiniMetric
									label="Time value"
									value={formatMoney(selectedPlaybook?.metrics.monthlyTimeValueCents ?? 0)}
								/>
								<MiniMetric
									label="Compounded"
									value={formatMoney(selectedPlaybook?.metrics.compoundedValueCents ?? 0)}
								/>
								<MiniMetric
									label="Leverage"
									value={`${selectedPlaybook?.metrics.leverageScore ?? 0}`}
								/>
							</div>

							<div className="panel-subsection">
								<div className="section-row">
									<div>
										<p className="eyebrow">Steps</p>
										<h4>Operator checklist</h4>
									</div>
										<button
											className="ghost-button"
											type="button"
											id="add-step"
											data-testid="add-step"
											onClick={() =>
											updateDraft((current) => ({
												...current,
												steps: [...current.steps, createEmptyStep(new Date().toISOString())],
											}))
										}
									>
										Add step
									</button>
								</div>
								<div className="stack">
									{draft.steps.map((step, index) => (
										<div className="step-editor" key={step.id}>
											<div className="step-topline">
												<strong>{index + 1}</strong>
												<label className="field field-grow">
													<span>Step title</span>
													<input
														data-testid={`step-title-${index}`}
														value={step.title}
														onChange={(event) =>
															updateStep(step.id, (current) => ({
																...current,
																title: event.target.value,
															}))
														}
													/>
												</label>
												<label className="field compact-field">
													<span>Kind</span>
													<select
														value={step.kind}
														onChange={(event) =>
															updateStep(step.id, (current) => ({
																...current,
																kind: event.target.value as Step["kind"],
															}))
														}
													>
														{stepKindOptions.map((kind) => (
															<option key={kind} value={kind}>
																{kindLabel(kind)}
															</option>
														))}
													</select>
												</label>
												<label className="field compact-field">
													<span>Min</span>
													<input
														type="number"
														value={step.durationMinutes}
														onChange={(event) =>
															updateStep(step.id, (current) => ({
																...current,
																durationMinutes: Number(event.target.value || 0),
															}))
														}
													/>
												</label>
												<button
													className="icon-button"
													type="button"
													onClick={() =>
														updateDraft((current) => ({
															...current,
															steps: current.steps.filter(
																(candidate) => candidate.id !== step.id,
															),
														}))
													}
												>
													Remove
												</button>
											</div>
											<label className="field">
												<span>Operator note</span>
												<textarea
													rows={2}
													value={step.note}
													onChange={(event) =>
														updateStep(step.id, (current) => ({
															...current,
															note: event.target.value,
														}))
													}
												/>
											</label>
										</div>
									))}
								</div>
							</div>

							<div className="panel-subsection">
								<div className="section-row">
									<div>
										<p className="eyebrow">Markdown</p>
										<h4>Reusable brief</h4>
									</div>
									<div className="action-row">
											<button
												className="ghost-button"
												type="button"
												id="export-playbook"
												data-testid="export-playbook"
												onClick={() => void onExportMarkdown()}
											>
											Refresh export
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void onCopyMarkdown()}
										>
											Copy
										</button>
									</div>
								</div>
								<textarea
									className="markdown-box"
									data-testid="markdown-preview"
									readOnly
									value={markdown}
								/>
							</div>

							<div className="panel-subsection footer-actions">
								<button
									className="danger-button"
									type="button"
									onClick={() => void onDeletePlaybook()}
								>
									Delete playbook
								</button>
							</div>
						</div>
					</section>
				) : null}

				{route === "runs" ? (
					<section className="content-grid content-grid-wide">
						<div className="panel list-panel">
							<div className="panel-header">
								<div>
									<p className="eyebrow">Run queue</p>
									<h3>Operate the system</h3>
								</div>
							</div>
							<div className="stack">
								{snapshot.runs.map((run) => {
									const playbook = snapshot.playbooks.find(
										(item) => item.record.id === run.playbookId,
									);
									return (
										<button
											key={run.id}
											className={`run-card ${selectedRun?.id === run.id ? "selected" : ""}`}
											type="button"
											data-testid={`run-card-${run.id}`}
											onClick={() => setSelectedRunId(run.id)}
										>
											<div>
												<p className="eyebrow">{run.status}</p>
												<h4>{playbook?.record.title ?? "Deleted playbook"}</h4>
											</div>
											<small>{formatRunTime(run.startedAt)}</small>
										</button>
									);
								})}
							</div>
						</div>

						<div className="panel editor-panel">
							{selectedRun ? (
								<RunDetail
									run={selectedRun}
									playbook={
										snapshot.playbooks.find(
											(playbook) => playbook.record.id === selectedRun.playbookId,
										) ?? null
									}
									onToggleStep={(stepId) =>
										void onToggleRunStep(selectedRun.id, stepId)
									}
								/>
							) : (
								<div className="empty-run">
									<p className="eyebrow">Runs</p>
									<h3>No active runs</h3>
									<p>Start a run from any playbook to make the process executable.</p>
								</div>
							)}
						</div>
					</section>
				) : null}
			</main>
		</div>
	);
}

function DashboardView({
	snapshot,
	settingsDraft,
	selectedPlaybookId,
	setSelectedPlaybookId,
	setRoute,
	setSettingsDraft,
	onApplySettings,
}: {
	snapshot: WorkspaceSnapshot;
	settingsDraft: Settings;
	selectedPlaybookId: string | null;
	setSelectedPlaybookId: (playbookId: string) => void;
	setRoute: (route: AppRoute) => void;
	setSettingsDraft: (settings: Settings) => void;
	onApplySettings: () => void;
}) {
	const focusPlaybooks = snapshot.playbooks.filter((playbook) =>
		snapshot.dashboard.focusIds.includes(playbook.record.id),
	);

	return (
		<section className="dashboard">
			<div className="metric-grid">
				<MetricCard
					label="Compounded monthly value"
					value={formatCompactMoney(snapshot.dashboard.totalCompoundedValueCents)}
					copy="Weighted revenue plus recovered operator time."
				/>
				<MetricCard
					label="Recovered hours"
					value={formatHours(snapshot.dashboard.monthlyHoursRecovered)}
					copy="Hours no longer trapped in repetitive work."
				/>
				<MetricCard
					label="Active runs"
					value={`${snapshot.dashboard.activeRuns}`}
					copy="Live execution loops running through the system."
				/>
				<MetricCard
					label="Customers to target"
					value={`${snapshot.dashboard.customersToTarget}`}
					copy="At the current offer anchor."
					testId="customers-to-target"
				/>
			</div>

			<div className="content-grid">
				<div className="panel">
					<div className="panel-header">
						<div>
							<p className="eyebrow">Economics</p>
							<h3>The 40k model</h3>
						</div>
						<button
							className="primary-button"
							type="button"
							id="apply-settings"
							data-testid="apply-settings"
							onClick={onApplySettings}
						>
							Apply model
						</button>
					</div>

					<div className="editor-grid">
						<label className="field">
							<span>Target MRR ($)</span>
								<input
									id="target-mrr"
									data-testid="target-mrr"
									type="number"
								value={Math.round(settingsDraft.targetMrrCents / 100)}
								onChange={(event) =>
									setSettingsDraft({
										...settingsDraft,
										targetMrrCents: Number(event.target.value || 0) * 100,
									})
								}
							/>
						</label>

						<label className="field">
							<span>Offer price ($)</span>
								<input
									id="offer-price"
									data-testid="offer-price"
									type="number"
								value={Math.round(settingsDraft.offerPriceCents / 100)}
								onChange={(event) =>
									setSettingsDraft({
										...settingsDraft,
										offerPriceCents: Number(event.target.value || 0) * 100,
									})
								}
							/>
						</label>

						<label className="field">
							<span>Hourly rate ($)</span>
								<input
									id="hourly-rate"
									data-testid="hourly-rate"
									type="number"
								value={Math.round(settingsDraft.averageHourlyRateCents / 100)}
								onChange={(event) =>
									setSettingsDraft({
										...settingsDraft,
										averageHourlyRateCents: Number(event.target.value || 0) * 100,
									})
								}
							/>
						</label>
					</div>

					<div className="economics-note">
						<strong>{snapshot.dashboard.customersToTarget} customers</strong> gets to
						{" "}
						{formatMoney(snapshot.settings.targetMrrCents)} at the current pricing anchor.
					</div>
				</div>

				<div className="panel">
					<div className="panel-header">
						<div>
							<p className="eyebrow">Focus board</p>
							<h3>What deserves attention now</h3>
						</div>
					</div>

					<div className="stack">
						{focusPlaybooks.map((playbook) => (
							<button
								key={playbook.record.id}
								type="button"
								className={`focus-card ${
									selectedPlaybookId === playbook.record.id ? "selected" : ""
								}`}
								onClick={() => {
									setSelectedPlaybookId(playbook.record.id);
									setRoute("playbooks");
								}}
							>
								<div>
									<p className="eyebrow">{stageLabel(playbook.record.stage)}</p>
									<h4>{playbook.record.title}</h4>
									<p>{playbook.record.promise}</p>
								</div>
								<div className="focus-meta">
									<strong>{playbook.metrics.leverageScore}</strong>
									<small>score</small>
								</div>
							</button>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function RunDetail({
	run,
	playbook,
	onToggleStep,
}: {
	run: RunRecord;
	playbook: ProjectedPlaybook | null;
	onToggleStep: (stepId: string) => void;
}) {
	if (!playbook) {
		return (
			<div className="empty-run">
				<p className="eyebrow">Run</p>
				<h3>Playbook missing</h3>
			</div>
		);
	}

	return (
		<div className="run-detail">
			<div className="panel-header sticky-header">
				<div>
					<p className="eyebrow">Runner</p>
					<h3>{playbook.record.title}</h3>
					<p className="hero-copy">{playbook.record.promise}</p>
				</div>
				<div className="pill-row">
					<span className="pill">{run.status}</span>
					<span className="pill">{playbook.metrics.progressPercent}% complete</span>
				</div>
			</div>

			<div className="progress-strip">
				<div
					className="progress-bar"
					style={{ width: `${playbook.metrics.progressPercent}%` }}
				/>
			</div>

			<div className="stack">
				{playbook.record.steps.map((step) => {
					const checked = run.completedStepIds.includes(step.id);
					return (
						<label
							key={step.id}
							className={`run-step ${checked ? "checked" : ""}`}
							data-testid={`run-step-${step.id}`}
						>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => onToggleStep(step.id)}
							/>
							<div>
								<div className="run-step-topline">
									<strong>{step.title}</strong>
									<span>{step.durationMinutes} min</span>
								</div>
								<p>{step.note}</p>
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
}

function NavButton({
	active,
	id,
	label,
	meta,
	testId,
	onClick,
}: {
	active: boolean;
	id: string;
	label: string;
	meta: string;
	testId: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			id={id}
			className={`nav-button ${active ? "active" : ""}`}
			data-testid={testId}
			onClick={onClick}
		>
			<span>{label}</span>
			<small>{meta}</small>
		</button>
	);
}

function MetricCard({
	label,
	value,
	copy,
	testId,
}: {
	label: string;
	value: string;
	copy: string;
	testId?: string;
}) {
	return (
		<div className="metric-card" data-testid={testId}>
			<p className="eyebrow">{label}</p>
			<strong>{value}</strong>
			<p>{copy}</p>
		</div>
	);
}

function MiniMetric({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="mini-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function PlaybookCard({
	playbook,
	selected,
	testId,
	onClick,
	onStartRun,
}: {
	playbook: ProjectedPlaybook;
	selected: boolean;
	testId: string;
	onClick: () => void;
	onStartRun: () => void;
}) {
	return (
		<div
			className={`playbook-card ${selected ? "selected" : ""}`}
			data-testid={testId}
		>
			<button type="button" className="playbook-card-main" onClick={onClick}>
				<div>
					<p className="eyebrow">{stageLabel(playbook.record.stage)}</p>
					<h4>{playbook.record.title}</h4>
					<p>{playbook.record.promise}</p>
				</div>
				<div className="playbook-card-metrics">
					<strong>{playbook.metrics.leverageScore}</strong>
					<small>{formatCompactMoney(playbook.metrics.compoundedValueCents)}</small>
				</div>
			</button>
			<div className="playbook-card-footer">
				<div className="pill-row">
					{playbook.record.tags.map((tag) => (
						<span key={tag} className="pill">
							#{tag}
						</span>
					))}
				</div>
				<button type="button" className="ghost-button" onClick={onStartRun}>
					Start run
				</button>
			</div>
		</div>
	);
}

function formatRunTime(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export default App;

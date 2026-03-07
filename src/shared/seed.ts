import {
	type Playbook,
	type RunRecord,
	type Settings,
	type Step,
	type StoredWorkspace,
	defaultSettings,
} from "./domain";

function step(
	id: string,
	title: string,
	kind: Step["kind"],
	durationMinutes: number,
	note: string,
): Step {
	return {
		id,
		title,
		kind,
		durationMinutes,
		note,
	};
}

function playbook(input: Playbook): Playbook {
	return input;
}

export function createSeedWorkspace(): StoredWorkspace {
	const settings: Settings = {
		...defaultSettings,
		offerPriceCents: 1_800_00,
	};

	const playbooks: Playbook[] = [
		playbook({
			id: "playbook_onboarding",
			title: "Client onboarding in one calm hour",
			audience: "Agency operators",
			promise:
				"Replace a chaotic kickoff with a reusable, high-trust onboarding sequence.",
			priceCents: 2_500_00,
			runsPerMonth: 10,
			minutesSavedPerRun: 42,
			confidencePercent: 84,
			stage: "scale",
			tags: ["agency", "delivery", "retention"],
			steps: [
				step(
					"step_onboarding_trigger",
					"Capture the signed trigger",
					"capture",
					8,
					"Pull the deal summary and success criteria into the same brief.",
				),
				step(
					"step_onboarding_kickoff",
					"Draft the kickoff packet",
					"ship",
					18,
					"Send agenda, owners, access checklist, and first-30-day milestones.",
				),
				step(
					"step_onboarding_verify",
					"Verify all dependencies",
					"verify",
					12,
					"Confirm access, billing contact, and the real operator on the client side.",
				),
			],
			createdAt: "2026-03-01T09:00:00.000Z",
			updatedAt: "2026-03-06T14:00:00.000Z",
		}),
		playbook({
			id: "playbook_qa",
			title: "Release QA before Friday panic",
			audience: "Product teams",
			promise:
				"Turn pre-release fear into a short, teachable checklist with visible proof.",
			priceCents: 1_600_00,
			runsPerMonth: 14,
			minutesSavedPerRun: 26,
			confidencePercent: 71,
			stage: "prove",
			tags: ["qa", "launch", "software"],
			steps: [
				step(
					"step_qa_scope",
					"Freeze the scope",
					"decide",
					10,
					"List the expected deltas so the team stops testing ghosts.",
				),
				step(
					"step_qa_regression",
					"Run the narrow regression sweep",
					"verify",
					20,
					"Check the checkout, auth, and one revenue event on each surface.",
				),
				step(
					"step_qa_ship",
					"Ship the release brief",
					"ship",
					9,
					"Post confidence, open risks, and rollback notes in one message.",
				),
			],
			createdAt: "2026-03-02T10:30:00.000Z",
			updatedAt: "2026-03-05T12:00:00.000Z",
		}),
		playbook({
			id: "playbook_receivables",
			title: "Receivables follow-up without awkwardness",
			audience: "Founders and finance leads",
			promise:
				"Recover cash faster with a respectful sequence instead of heroic one-off emails.",
			priceCents: 1_200_00,
			runsPerMonth: 18,
			minutesSavedPerRun: 19,
			confidencePercent: 63,
			stage: "design",
			tags: ["finance", "cashflow", "ops"],
			steps: [
				step(
					"step_receivables_queue",
					"Queue the overdue invoices",
					"capture",
					6,
					"Group by days overdue and owner.",
				),
				step(
					"step_receivables_decide",
					"Choose the right message",
					"decide",
					8,
					"Pick friendly reminder, firm reminder, or founder escalation.",
				),
				step(
					"step_receivables_verify",
					"Verify the response",
					"verify",
					5,
					"Mark who replied, who paid, and who needs a next touch.",
				),
			],
			createdAt: "2026-03-03T08:15:00.000Z",
			updatedAt: "2026-03-04T11:10:00.000Z",
		}),
	];

	const runs: RunRecord[] = [
		{
			id: "run_onboarding_active",
			playbookId: "playbook_onboarding",
			completedStepIds: ["step_onboarding_trigger", "step_onboarding_kickoff"],
			status: "active",
			startedAt: "2026-03-07T07:45:00.000Z",
			finishedAt: null,
		},
		{
			id: "run_qa_done",
			playbookId: "playbook_qa",
			completedStepIds: ["step_qa_scope", "step_qa_regression", "step_qa_ship"],
			status: "done",
			startedAt: "2026-03-06T08:00:00.000Z",
			finishedAt: "2026-03-06T08:43:00.000Z",
		},
	];

	return {
		playbooks,
		runs,
		settings,
	};
}

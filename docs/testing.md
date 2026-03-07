# Testing

Backlane ships with four levels of verification.

## 1. Unit

`bun test`

Covers:

- normalization and validation
- leverage scoring
- run completion behavior
- service create/save/run/export flow

## 2. Playwright

`bun run test:playwright`

Covers:

- pricing model updates
- new playbook creation
- markdown export
- run start and step completion

## 3. Cypress

`bun run test:cypress`

Covers:

- pricing regression
- search and filter behavior
- editing a seeded playbook
- markdown preview refresh

## 4. Maestro

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
PATH=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin:$PATH \
bun run test:maestro
```

Notes:

- Maestro web support is still marked beta by the official docs.
- The machine needed Java 17 for Maestro to run.
- The current flow is a smoke test on the seeded active run because Maestro’s web viewport is narrower than the editor-heavy Playbooks screen.

## Browser harness

The renderer has two gateways:

- `rpc`: used by Electrobun desktop mode
- `http`: used by tests and docs generation

That means Playwright, Cypress, and Maestro all exercise the real app surface instead of a toy fixture UI.

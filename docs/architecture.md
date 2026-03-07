# Architecture

Backlane is intentionally small. The interesting part is not raw feature count, it is that the same product behavior can be interpreted through two execution surfaces:

- Electrobun RPC for the desktop app
- Bun HTTP for browser automation and docs capture

## Core idea

The app treats the workspace as immutable domain data:

- `Playbook`
- `RunRecord`
- `Settings`

Commands transform that data. Projections derive the dashboard, leverage scores, and markdown export. The renderer never talks to SQLite directly and never owns business rules.

That is the category-theory-adjacent part of the design: the system is built as small transformations over values, then interpreted through different adapters. One domain, multiple interpreters.

## Layers

### `src/shared`

Pure types and functions:

- constructors
- normalization
- leverage scoring
- run reconciliation
- dashboard projection
- markdown rendering

### `src/server`

Stateful infrastructure:

- SQLite-backed workspace store
- service methods for create, save, run, update, export
- HTTP command handler used by browser mode

### `src/bun`

Electrobun main process:

- boots the desktop window
- loads Vite HMR in development
- exposes the same service through typed RPC

### `src/mainview`

React UI:

- uses a gateway interface
- picks HTTP mode in browser automation
- picks RPC mode in desktop mode
- stays ignorant of persistence details

## Why the persistence looks simple

The workspace store writes whole aggregates as JSON blobs inside SQLite. That is deliberate.

- It keeps the domain model expressive and easy to evolve.
- It avoids premature table design for a small local-first app.
- It keeps mutations easy to reason about in tests.

If the product grew into multi-user sync, the same domain layer could be reinterpreted over a more normalized persistence layer.

## Ergonomics

The code is written in a minimal style:

- small files with single reasons to change
- no framework-heavy state library
- no class hierarchy for its own sake
- explicit data flow from command to snapshot to UI

That keeps the repo teachable and easy to refactor.

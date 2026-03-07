# Research Notes

These notes informed the product direction and stack choices.

## Stack

As of March 7, 2026:

- Electrobun’s official GitHub README describes it as a Bun-based way to build small, cross-platform desktop apps with typed main/webview separation.
- Maestro’s docs explicitly document web automation support and a desktop app for mobile and web testing.

That combination made it practical to build a desktop-first app while still keeping browser-native automation for Playwright, Cypress, and Maestro.

## Category

The product category is workflow capture plus execution.

As of March 7, 2026:

- Scribe’s official pricing page shows a free tier plus paid plans, including a team offer starting at `$59/month` for 5 users with extra seats charged separately.
- Process Street’s official pricing page positions workflow execution as a sales-led product with startup, pro, and enterprise plans.

The conclusion was straightforward: teams already pay for process capture and process execution, but the market still leaves room for a sharper local-first tool focused on:

- leverage scoring
- operator runs
- pricing math
- fast desktop ergonomics

## Sources

- Electrobun GitHub: https://github.com/blackboardsh/electrobun
- Maestro docs: https://docs.maestro.dev/
- Maestro web support: https://docs.maestro.dev/platform-support/web-views
- Scribe pricing: https://scribehow.com/pricing
- Process Street pricing: https://www.process.st/pricing/

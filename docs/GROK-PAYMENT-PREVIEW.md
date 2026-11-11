# Grok website payment-preview handoff

The app integration is draft PR #325. Do not publish paid-launch website copy
until docs/WEB-PAYMENTS.md's external test and live-pilot gates pass.

Prepared source: marketing/grok/src/cloud-copy.ts, routes/index.tsx,
routes/support.tsx, routes/privacy.tsx and components/site-chrome.tsx.
Use the generated payments fields, not a second handwritten price/policy.
Keep the existing Coming soon section, styling, logos, routes and links.

The exported Grok workspace was checked locally on 10 November 2026:

- Original locked dependencies: typecheck passed; Vite production build passed.
  On Windows the package wrapper cannot spawn vite directly (ENOENT). Running
  the same wrapper with `node node_modules/vite/bin/vite.js build` passes.
- Dependency audit: 12 advisories (2 low, 8 moderate, 1 high, 1 critical).
  These are in the Grok workspace, not the Gridlock app's clean audit.
- A private local trial of better-auth 1.7.20, zod 4.6.7 and updated seroval
  removed the high/critical advisories but left 7 moderate development-tool
  advisories. It did **not** pass typecheck. The first patched Better Auth
  release, 1.7.7, has the same compatibility failure.
- Nothing from these dependency trials was published or applied to Grok.

Exact trial errors:

```
src/lib/auth/client.ts(1,10): error TS2305: Module '"better-auth/client/plugins"' has no exported member 'genericOAuthClient'.
src/lib/auth/popup.server.ts(65,35): error TS2339: Property 'signInWithOAuth2' does not exist on type 'InferAPI<...>'.
```

Better Auth's new generic OAuth plugin uses the standard social-sign-in and
callback endpoints. Updating dependencies alone is not a safe release. Have
Grok update its platform-provided auth scaffold with its supported migration,
including preview popup behavior, callback compatibility, state/CSRF checks
and account switching. Do not work around this with `any`, disabled typechecks,
weaker auth, or new redirect/provider settings. If the migration requires an
owner-managed setting, explain the exact change before proceeding.

Relevant audit advisories: [Better Auth account sign-in vulnerability](https://github.com/advisories/GHSA-965c-763c-88jm),
[Zod resource exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Seroval injection](https://github.com/advisories/GHSA-f86p-h4j2-7qgj).
An advisory is not proof the public site has been exploited.

Prompt for Grok:

> Continue the existing Gridlock website project, preview only. Use the five
> reviewed marketing/grok source files from Gridlock PR #325 and the shared
> docs/WEB-PAYMENTS.md contract. Keep all design, existing Coming soon cards,
> routes, domain, hosting, app links, legal company name and optional League
> sync disclosures. Add no league badges or unapproved player data. Check the
> exported dependency findings above: use Grok's supported, patched Better
> Auth scaffold and fix its client/popup API compatibility without weakening
> auth or changing provider/redirect settings. Run typecheck, production build,
> auth tests and audit; report any remaining advisories precisely. Check home,
> Support and Privacy at phone, tablet and desktop widths with no sideways
> scroll. Do not publish until the owner confirms the app's real Stripe
> checkout and live pilot passed. Report actual results, never placeholders.

Prompt for Claude:

> Read CLAUDE.md and AGENTS.md; preserve uncommitted work. Review draft PR #325
> (codex/web-day-pass) in a clean checkout. Do not merge, deploy, publish a
> payment-enabled preview, change accounts/settings/secrets or touch PR #289.
> Review docs/WEB-PAYMENTS.md against the handler, SQL authorization and browser
> receipt logic. Independently test forged/old webhooks, duplicate payment,
> refund replay, account switching, missing adapter, expiration/DST and
> backup/export after expiry. Run every repository check without weakening it.
> Keep the offline Claude preview free of production addresses, cloud config
> and keys. Report exact commit and actual counts; list external Stripe tests
> separately as NOT TESTED unless you witnessed them. Do not equate passing
> local fixtures with a working deployed checkout.

# Gridlock Coach web payments — shared launch contract

Status: implementation under review. Local tests do not prove hosted Stripe
checkout, email delivery or a deployed webhook. **Do not open sales until the
external evidence below is complete.**

## Offer and website copy

- **$19.97 USD per account**, all Coach tools until the next midnight in
  **America/New_York** on the payment date. A purchase at 11:55 PM has five
  minutes left. This is not a 24-hour pass.
- One-time payment; no subscription or automatic renewal.
- Existing invited beta access and active Team/Program grants stay intact.
  Do not change administrator privileges or the admin allowlist.
- Expiration leaves saved seasons, Account & backups, Save everything,
  match/point CSV export, cloud-copy review/restore/deletion and account
  deletion available. New League sync uploads require active live access.
- Gridlock Team and Gridlock Player remain separate apps, Coming soon.
- Refund duplicate charges and purchases where access could not be provided.
  Other requests go to **support@gridlockpb.com**. Verified duplicate and
  undeliverable events trigger an automatic full refund; support reviews other
  delivery failures. Partial refunds leave the pass active.

The website sends customers to https://app.gridlockpb.com/ to create and
confirm an account, sign in and purchase for that account. No public payment
link: the authenticated account ID owns the pass, not an editable email.
`scripts/site-live.js` exports the canonical `WEB_PAYMENTS` wording;
`--grok-copy` regenerates `marketing/grok/src/cloud-copy.ts`.
Keep the existing Grok design, routes, links and hosting. Prepare the wording
as a preview; publish it only after the sandbox flow and live configuration
checks pass and the owner approves opening purchases.

## Protection mechanisms

1. The payment function verifies the caller's Auth user and confirmed email.
   The browser supplies only an action, never an owner, price or redirect.
2. PostgreSQL locks one pending checkout per account/mode. Stripe creation
   uses that order's idempotency key. Repeated taps reuse the same checkout.
   An uncertain creation over 23 hours old requires support inspection before
   another payment, avoiding reuse beyond Stripe's retention window.
3. The server verifies an active, one-time, USD 1997-cent Price in the correct
   mode. Hosted Checkout collects card details directly at Stripe.
4. The webhook verifies the raw-body signature and retrieves the payment,
   checking mode, amount, currency, account and order. A database event ledger
   makes retries harmless. A return URL and Checkout completion grant nothing.
   The signed payment_intent.succeeded event supplies the actual payment time,
   including delayed payment methods. It is a mandatory webhook subscription.
5. PostgreSQL calculates Eastern midnight using IANA timezone rules, including
   DST. Replays cannot extend expiry. Full refunds and disputes revoke paid
   access; a later success notification cannot undo that. Existing grants are
   separate. Duplicate/undeliverable charges request an idempotent full refund.
6. An ES256-signed receipt binds access to account, app origin, mode and expiry.
   Only the public verification key ships. Account changes cancel pending
   responses. Imported seasons and editable local billing values grant nothing.
7. Offline access uses a previously verified receipt until its expiry, never
   beyond the paid midnight. Beta/existing grants recheck within 24 hours.
   Online checks run on focus, return to the tab and every five visible minutes.
   Refund/revocation reaches an offline device at its next online check or
   receipt expiry. Browser clock/storage cannot provide tamper-proof offline
   DRM; cloud writes always use server time and authorization.

The private ledger contains account ID (unlinked on deletion), order and
Stripe Checkout/PaymentIntent IDs, mode, amount/currency, payment/expiry times,
refund/dispute flags, delivery status and event IDs/types/times. It contains
no card number, security code or full webhook payload. Stripe receives email,
internal order/account IDs and purchase details, and processes payment/device/
connection information under https://stripe.com/privacy.
Account deletion removes the login and League sync copy, unlinks Gridlock's
ledger and does not delete Stripe's records. The owner must confirm retention
requirements before final privacy review; do not invent a retention period.

## Rollout — separate test environment first

Use a separate Supabase test project and Stripe sandbox. Check the existing
account/season schema, auth hook names and owner-only policies against the
migration before applying it. Abort on drift. Do not replace owner-only RLS.
The new migration starts public signup and both checkout modes disabled.

1. Rotate the test secret previously pasted into chat; never reuse it. Create
   the one-time $19.97 USD sandbox product/Price. Review eligible methods in
   Stripe. The initial checkout filters dynamic methods to card and Link;
   eligible card wallets are still chosen by Stripe. Do not enable slow bank
   methods for a same-day pass. Advertise wallets only after device testing.
   Connect, Terminal, subscriptions and Invoicing are not needed for this pass.
   The owner must review applicable tax registration/product tax treatment;
   the code does not silently enable Stripe Tax.
2. Generate an ECDSA P-256 signing pair locally. Put its private JWK only in
   the server vault, and retain the public JWK for the build. Do not print or
   send private keys in chat.
3. Set function vault values: `STRIPE_API_KEY` (restricted server key with
   Checkout write, Price/PaymentIntent/Charge read and Refund write),
   `STRIPE_COACH_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`,
   `GRIDLOCK_ACCESS_PRIVATE_JWK`, `GRIDLOCK_STRIPE_MODE=test`,
   `PAYMENTS_APP_URL=<exact test origin/>`, `GRIDLOCK_CHECKOUT_ENABLED=true`.
   Supabase provides its server-only URL/service credential. No service key
   or Stripe secret belongs in the app, source, generated config or logs.
4. Apply `supabase/migrations/202611100001_web_payments.sql` after the existing
   schemas. Deploy `gridlock-payments` and `gridlock-stripe-webhook` using
   `supabase functions deploy <name> --no-verify-jwt`. The first verifies user
   tokens itself; the second verifies Stripe signatures. These checks stay on.
5. Register a **snapshot** webhook at
   `https://<test-project>.supabase.co/functions/v1/gridlock-stripe-webhook`,
   API version **2026-10-28.endive**. Subscribe to payment_intent.succeeded,
   checkout.session.completed, checkout.session.async_payment_succeeded,
   checkout.session.async_payment_failed, checkout.session.expired,
   charge.refunded and charge.dispute.created. Save its signing secret only
   in the vault. Keep the webhook running when new checkout is closed.
6. In the test database enable public_signup_enabled and test_checkout_enabled
   on gridlock_private.payment_settings. Keep live_checkout_enabled false.
   Confirm email confirmation and the existing auth hooks still run. Test
   payments never grant live server-write access.
7. Build with the test public Supabase config and exact test redirect, plus
   `GRINDX_WEB_PAYMENTS_MODE=test` and
   `GRINDX_WEB_ACCESS_PUBLIC_JWK=<public JWK JSON>`: `npm run cloud:build`.
   Publish to an isolated test host. Native/offline builds omit this adapter.
8. Complete the matrix below with new non-beta test accounts. Do not use real
   coaches' accounts, passwords, MFA or seasons.
9. After evidence review, prepare the live product/Price, signing pair and
   webhook. Deploy the reviewed migration/functions with checkout closed.
   Verify existing beta/admin access before opening paid access.
10. With owner approval for a controlled launch, set mode=live but leave
    checkout closed. Publish the web build with live public config and public
    JWK, then confirm the payment wall and existing beta/admin access work.
    Only then enable public_signup_enabled in the production payment settings
    (email confirmation stays required). Create and confirm a new, non-beta
    account and inspect the live wall without submitting payment. Verify
    Stripe's live payments capability, price, endpoint/mode, signing key and
    endpoint delivery diagnostics. Keep GRIDLOCK_LIVE_FLOW_VERIFIED=false.
11. Run successful/declined/3DS/duplicate/refund payment simulations only in
    Stripe's sandbox, using its test payment methods. Stripe's testing guide
    prohibits testing in live mode with real payment details:
    https://docs.stripe.com/testing. Do not manufacture a real charge and refund
    merely to test. Once all sandbox and live configuration evidence passes
    and the owner approves, enable GRIDLOCK_CHECKOUT_ENABLED and database
    live_checkout_enabled, set GRIDLOCK_LIVE_FLOW_VERIFIED=true and publish the
    sales wording. GRIDLOCK_LIVE_PILOT_UIDS may instead limit a staged launch
    to named genuine customers; it is not a live-payment test bypass.
12. Monitor the first genuine purchases: reconcile each Stripe receipt,
    delivered event, order, correct account and usable access until Eastern
    midnight. Refund only for an actual refund request or the approved policy.
    Shut off new checkout if delivery fails, retaining access and support.

Building or merging code changes no live settings or accounts. Without the
payment build options, the current app remains unchanged. Do not enable a
wall when there is no verified way for customers to buy.

## Required external evidence

All external results are **NOT TESTED** until recorded with date, environment,
commit, public build version and non-sensitive event/order references:

- New non-beta signup, actual confirmation email, sign-in, purchase and tools.
- Successful card, declined card, 3DS, cancellation and methods offered.
- Delayed delivery, webhook retry/replay, duplicate taps and duplicate charge.
- Account switching, another user's season denied, beta/admin unchanged.
- Midnight and both DST changes; season/backup/CSV remain after expiration.
- Full/partial refund, dispute and out-of-order success do not revive a pass.
- Phone/tablet/desktop and wallets where offered.
- Live payments capability, correct live price/endpoint/mode and closed-wall
  verification before opening sales; first genuine orders reconciled after.

Run local checks without weakening them: `node test/web-payments.mjs`,
`node test/web-payments-browser.mjs`, `npm run sync`, `npm run app:artifact`,
`npm run check`, `npm run build`, `npm run site:check`, `npm audit`.
Signed fixtures and local PostgreSQL tests are not external checkout evidence.

## Support, monitoring and rollback

Charged without access: do not ask for another payment. Match Stripe payment
and webhook delivery to the order, fix the cause and retry the failed event.
Monitor failed deliveries/function calls and outstanding refund_due orders;
an attempted refund is not a confirmed refund. Review old creating orders in
Stripe before clearing them. Do not log raw events, tokens or credentials.
To stop sales, disable both checkout switches but leave webhook, access checks
and backup/account access running. Never delete payment rows or seasons to
roll back. An older Sites app may bypass the wall, so assess that before
restoring it. Keep the existing host, domain and PR #289 untouched.

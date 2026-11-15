# Required two-factor sign-in and three devices

**Prepared, not live. Do not enable until the hosted staging checklist passes.**

The owner requires two-factor sign-in for Coach, team owners, admins and
Player accounts. Beta/admin/paid entitlements do not exempt an account.
The implementation uses Supabase Auth TOTP authenticators and exactly three
approved Auth sessions per account. A browser profile is a session, not a
physical-device fingerprint. Another browser/private window may use another
place. Tabs sharing the same sign-in do not. The cloud admin page reuses a
verified Coach session in that browser and still checks the admin allowlist.

## What the user sees

1. Confirm the email, sign in and set up an authenticator (or enter its code).
2. Name this device. If three sessions are already approved, choose which old
   one to replace; cancellation changes nothing. Saved seasons are not deleted.
3. Use **Account & backups → Your devices** (Player: **Your devices**) to review
   or remove sessions. Sign-out affects this browser, not the other two.

League sync stays opt-in and uses the existing account ID, revision conflict
checks and draft protection. Device approval never turns sync on, changes a
plan, grants admin access or replaces a season. Three approved devices read
the same account copy. Password-reset links do not bypass MFA or registration.

## Server enforcement

Migration `202611150002_account_security.sql` depends on the season safety and
team membership migrations. It installs **disabled**. No migration or setting
has been applied to the live project as part of this work.

- `gridlock_security_action` takes its identity and session from verified JWT
  claims, checks confirmed/unbanned user, live Auth session, `aal2` and the
  still-verified factor that authenticated that session.
- Claim/revoke operations lock per account. A fourth registration cannot race
  a concurrent registration. Revoked session IDs remain tombstones: a still
  unexpired token cannot re-register itself. Auth sign-out/expiry releases a
  slot on the next registration. No writes to Supabase's managed auth tables.
- Restrictive RLS adds security to existing owner/beta access checks on
  seasons and entitlements. It never replaces those checks.
- Season and team security-definer RPCs are wrapped. Their original functions
  move into a private, unexposed schema with browser grants revoked.
- Admin and account-deletion Edge handlers verify the caller, then call the
  service-only session predicate before privileged reads/writes. A missing
  predicate or failed lookup refuses access. Identity lookup alone still lets
  an admin enroll/verify before requesting other people's records.
- Client network operations stay in `native/gridlock-cloud.js`. Setup secrets
  and one-time codes are not written into storage, logs, copies or source.

An offline device cannot receive remote revocation. A browser that already
completed MFA keeps its local season usable without signal; cloud operations
always check the server again. Returning online/visible checks at most every
30 seconds. Local exports remain available if verification is needed. This
does not prevent someone sharing an authenticator or creating separate email
accounts; do not advertise it as proof of one human per account.

## Build and rollout (after review)

1. Run `npm ci`, `npm run sync`, `npm run app:artifact`, `npm run check`,
   `npm run build`, `npm run site:check`, and `npm audit`. No skips.
2. Use an isolated Supabase test project. Review its existing migrations,
   schemas and policies first. Apply the two prepared migrations in order;
   keep both settings disabled initially. Deploy the updated admin and
   account-deletion handlers there. Never put a service key in any app build.
3. Build a staging Coach app with its public URL/key, staging callback and
   `GRINDX_ACCOUNT_SECURITY=required` using `npm run cloud:build`. This also
   produces current `admin/index.html` with the same shared security scripts.
   Default builds deliberately do not turn on enforcement during preparation.
4. Build Player with `GRINDX_PLAYER_URL` set to the exact approved staging
   Player address and `npm run player:cloud`. Player requires security;
   it never silently falls back to password-only accounts. Membership remains
   in its separately approved private pilot. Player tools/shared content are
   still coming soon; this PR is the account entry, not their public launch.
5. On staging only, enable `public.gridlock_security_settings.enabled` after
   both handlers and clients are ready. Test all cases below with synthetic
   accounts/data and real authenticator apps.
6. Only after recorded staging results pass, approve a production maintenance
   window. Apply the disabled migration, deploy both handlers and cloud clients
   to the existing hosts, verify assets, then enable the reviewed policy.
   Include `/admin/index.html` from the security build; publishing only Coach
   leaves an old admin UI unable to approve devices. Publish native cloud
   clients with the same gate before enabling it for native users.
7. Preserve a tested rollback build. If the new rollout fails, stop and report;
   never silently disable an active MFA policy. Any rollback of enforcement
   requires a deliberate owner decision and must preserve seasons.

## Hosted staging acceptance (still required)

Record PASS/FAIL and evidence, without credentials or QR setup secrets:

- Fresh Coach, owner, admin and Player: email confirmation → password → TOTP
  enrollment → wrong-code retry → verified device → correct role permissions.
- Existing beta/admin access and paid access survive, but each requires MFA.
- Three independent browser stores sync codes/schedules under one test login.
- Fourth session blocks; Cancel retains the three; replacement removes only
  the chosen session. Old JWT/raw RPC and direct REST attempts are denied.
- Two simultaneous fourth-device claims in separate DB connections cannot
  leave four approved sessions (PGlite's single connection does not prove this).
- Account switch during challenge, token refresh, sign-out, email verification,
  password reset, removed authenticator, expired session, offline/reconnect.
- Admin shares this browser's Coach slot and cannot access admin records after
  its device is revoked. Fresh password+TOTP account deletion succeeds only for
  the same approved account. Never test deletion with a real coach.
- A lost authenticator recovery rehearsal. Supabase TOTP does not provide a
  Gridlock recovery-code system here. Keep an authenticator backup securely;
  support must establish account ownership before a separately approved reset.
  Never remove MFA just because someone knows an email or a team code.
- Phone/tablet/desktop: setup, focus/keyboard, readable errors, device list,
  offline saved season and export. Verify actual iOS/Android separately.

Local SQL, mocked Auth/browser tests and existing sync suites are regression
evidence, not a substitute for these hosted checks. No live activation,
customer invitation or MFA reset is authorized by merely building this PR.

Provider references: [Supabase TOTP setup](https://supabase.com/docs/guides/auth/auth-mfa/totp),
[session verification](https://supabase.com/docs/guides/auth/sessions),
[restrictive row policies](https://supabase.com/docs/guides/database/postgres/row-level-security).
Before activation, update the shared Privacy disclosure to include
authenticator enrollment and approved-session labels, creation/last-use times
and revocation. No browser fingerprint or new payment data is collected here.

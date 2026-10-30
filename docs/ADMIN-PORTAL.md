# Gridlock administration

`admin/index.html` lists account users, manages their Free, Team or Program
access, and summarizes season copies. Cloud access goes through
`supabase/functions/gridlock-admin/index.ts`; a verified account alone does
not make someone an administrator.

## What administrators can do

- View paginated users, email-confirmation status, last sign-in and account plans.
- Set a user's plan with no expiry or a future expiry. Free clears the account
  grant and always has no expiry.
- Load seasons coaches explicitly chose to upload and review the counted
  matches, results, calls, penalties, events and opponents.
- Import copies coaches shared manually, without sending those files anywhere.

This portal does not invite users, change passwords, ban or delete users, or
delete cloud seasons. Account recovery uses the coach app. Any account setup
outside this scope is performed through the project's normal Auth dashboard.
Administrator access is separate from plan access: giving someone Program
does not give them the dashboard, and revoking a plan does not remove their
administrator UUID.

## Set up the server

1. Use the existing `public.entitlements` table from `docs/SERVER.md` and the
   `public.seasons` table below. Keep RLS enabled. Coaches may read only their
   own entitlement and may never write it; they may read, upload and delete
   only their own season. Do not grant cross-user access to the public key.
2. Create or identify each administrator's Auth account and have the owner
   confirm its email. Copy the immutable Auth **user UUID**, not the email,
   into the function's `ADMIN_USER_IDS` setting. Deleting and recreating an
   account creates a different UUID and requires a deliberate allowlist change.
3. Set `ADMIN_ALLOWED_ORIGINS` to the exact HTTPS origin hosting the dashboard.
   Separate multiple UUIDs or origins with commas. No wildcard origins.
4. Deploy `gridlock-admin` with gateway JWT verification enabled. The function
   also verifies the bearer token with `auth.getUser()` on every request and
   requires a confirmed email and an allowed UUID before accessing any data.

```sh
supabase secrets set ADMIN_USER_IDS="FIRST_AUTH_UUID,SECOND_AUTH_UUID"
supabase secrets set ADMIN_ALLOWED_ORIGINS="https://YOUR-STAGING-HOST"
supabase functions deploy gridlock-admin
```

The platform provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the
function. The service key stays on the server. Neither a browser role,
user-editable metadata, an email matching the owner nor possession of the
public key authorizes administration. Missing or malformed settings refuse
all administration requests. Remove a UUID from the allowlist to revoke
access; each subsequent request checks the configured list.

The function writes account grants server-side in addition to any existing
billing webhook. It records the verified administrator UUID in `source` and
logs a completed plan change with actor, target, plan, expiry and timestamp.
It does not log credentials, email addresses or season payloads. These platform
logs are best effort, not a separate permanent audit database.

The API accepts only these actions:

| Request | Result |
|---|---|
| `GET ?action=overview&page=1&per_page=50` | `caller`, selected `users`, `page`, `per_page`, `has_more` |
| `GET ?action=seasons&page=1&per_page=100` | `caller`, selected `seasons`, `page`, `per_page`, `has_more` |
| `POST {action:"set_entitlement",user_id,plan,expires_at}` | Confirmed saved entitlement |

POST uses JSON, a target Auth UUID, one of `free`, `team`, `program`, and
`expires_at: null` or a valid future UTC ISO timestamp. Unknown fields, unknown
actions, invalid dates and oversized bodies are refused. Page sizes are at
most 100. Responses are not cacheable. A request without an Origin still needs
the same verified administrator token; CORS is an additional browser control.

## Open the portal

Serve `admin/index.html` over HTTPS on the configured origin. Its `CLOUD`
constant contains only the project URL, public publishable/anon key and
`gridlock-admin` function name. Change those public settings when using another
project; never put a service key in this file. Sign in with the approved
Gridlock account and its normal password.

The portal keeps the password, access token, users and downloaded cloud seasons
only in memory. It does not retain the refresh token. Sign-out, expiry, or an
authorization refusal clears cloud records and invalidates pending results.
The session lasts at most one hour; sign in again to continue. The portal's
Sign out clears its session on this page; it is not an account-wide logout.

Users are paginated. The Seasons tab loads uploaded seasons explicitly and
offers Load more when there are more pages. Totals cover only loaded seasons
and manual imports; they do not imply all coaches have uploaded data.

## Consent and the season store

The default coach build remains offline. A cloud-enabled build offers
**Nexus > League sync**, off until the coach opts in. It uploads the whole
season, including competitive scouting data. Coaches can pause uploads and
delete their uploaded copy. Administrator access does not turn that switch on,
read phone-only seasons, or change the coach's own-row RLS policies.

Keep the sign-in, Nexus and privacy notice consistent with this capability in
the same release. `docs/SERVER.md` describes the opt-in exception to the
default accounts-and-purchases-only behavior.

For a new project, the season schema is:

```sql
create table public.seasons (
  owner uuid primary key references auth.users on delete cascade,
  label text,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.seasons enable row level security;
create policy "own insert" on public.seasons
  for insert with check (auth.uid() = owner);
create policy "own update" on public.seasons
  for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own read" on public.seasons
  for select using (auth.uid() = owner);
create policy "own delete" on public.seasons
  for delete using (auth.uid() = owner);
```

One current season is held per coach; an upload replaces that coach's previous
copy. `native/gridlock-cloud.js` performs authenticated own-row upserts and
deletes. `scripts/cloud-build.js` adds this optional adapter and its public
configuration to a cloud build; canonical `web/index.html` remains fetch-free.
See `docs/CLOUD-AUTH-SETUP.md` for signup and recovery callback setup.

## Plan access in the coach app

After verified cloud sign-in or recovery, an authenticated reopen, or
**More > Plan > Refresh account access**, the adapter reads only the signed-in
user's entitlement. The app validates its owner, plan and expiry and holds the
grant in memory for that account. Sign-out and account changes clear it, and
late replies cannot grant access to another account. Expired or missing grants
give no paid access; malformed grants are refused.

An account grant supplements store access; it does not overwrite store restore
results. Setting an account to Free does not cancel a separate store purchase.
Account-grant changes appear at the next successful refresh, not as a live push.
Offline entry keeps the existing local-account and store behavior; account
grants are not serialized into a season, exported copy or durable restore.
Staging remains fully unlocked while `BILLING_LIVE` is off. These controls do
not enable billing or introduce new paywalls.

## Manual season copies

A coach can use **Nexus > Save a copy** and share the JSON file directly.
Drop it into the portal's Import season copies area. Reading happens in the
browser and does not upload the file. Manual imports remain in this browser
after sign-out and can be removed with the portal's clear-imports control;
clearing them does not delete cloud seasons or the original files. They use a
separate cache from the older portal's mixed-source cache, which is not loaded.

Counts come from what coaches logged, never modeled results. Watched games do
not count toward a coach's record. Renamed calls use the coach's own words.
Loading a manual copy and a cloud copy of the same season can count both;
remove a duplicate manual import before treating the combined totals as a
record.

## Checks

`npm run check` includes `account-entitlements`, `admin-handler` and
`admin-portal`. They use mocked services and DOM state, require no browser,
and send no email or live requests. Run them alone with:

```sh
node scripts/run-checks.js account-entitlements admin-handler admin-portal
```

The handler test strips its pure TypeScript module through Node's
`module.stripTypeScriptTypes` before importing it, so it does not depend on
automatic `.ts` loading. Use Node 22.13 or newer (CI installs current Node 22).
These checks cover authorization, malformed requests, expired/stale account
grants and portal session isolation. Browser inspection and live delivery
testing remain separate validation steps.

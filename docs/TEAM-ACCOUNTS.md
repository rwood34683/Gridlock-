# Team accounts and permissions — prepared foundation

Status: code for review, **not a live Team/Player launch**. No production
migration, account changes or preview activation is part of this PR.

This implements the first two prerequisites for separate Team and Player
apps: account-bound membership and server-enforced roles. It reuses existing
confirmed Supabase accounts; no extra password database or shared team login.
The same account UUID has the same memberships on another signed-in device.
A display name, email, local team selection or preview code is never proof of
membership. `IMPACT-7QX2` and other preview/demo codes grant no server access.

## What each role can do

| Action | Owner | Coach | Player |
| --- | --- | --- | --- |
| See own team name and role | Yes | Yes | Yes |
| See member names, roles and account IDs | All members | All members | Self only |
| Issue/revoke invitations | Yes | No | No |
| Change coach/player roles or remove members | Yes | No | No |
| Transfer ownership to an existing confirmed member | Yes | No | No |
| Leave | After transferring ownership | Yes | Yes |

One owner per team. Changing a role does not grant a paid plan, beta access
or Gridlock administrator access. No team role grants access to anyone's
private Coach season, account email, credentials, billing or admin records.
Team content sharing is the **next** stage, not an accidental side effect of
this foundation. Existing Coach accounts, sync and saved seasons stay as they are.

## Join codes

The owner creates a coach or player invitation. Its 32-character random code
is shown once; the owner shares it privately. Hyphens and letter case do not
matter. It expires after seven days, can be revoked and joins only one account.
Possessing the code authorizes that role, so it must not be posted publicly.
Only a SHA-256 hash is stored. Listing invitations never returns codes or hashes.
If the creation reply is lost, check the invitation list, revoke the unused
invitation and create another; the raw code cannot be recovered.

A retry from the same joined account is safe. Another account cannot reuse it.
After removal or leaving, that consumed code cannot rejoin the team. An existing
player cannot promote themselves by using a coach invitation. Ownership transfer
revokes all outstanding invitations; the new owner issues replacements.

Join attempts are limited to ten per account per minute. Preparation includes
resource bounds of 20 owned/joined teams, 500 members per team and 50 active
invitations per team. These are safety bounds, **not approved product prices or
player licence limits**. Commercial access is deliberately separate.

## Server and client contract

Migration: `supabase/migrations/202611150001_team_membership.sql`.
Tables have RLS enabled and no direct browser grants. The private helper schema
is inaccessible to browser roles. The only browser entry is authenticated
`public.gridlock_team_action(action text, input jsonb)` with a pinned empty
search path. It reads `auth.uid()` from PostgREST's verified JWT, checks confirmed,
unbanned and non-deleted account status, then the feature flag and pilot list on every call.
Never send a service-role key to a browser. The RPC requires a signed-in user
JWT with the existing public project key; a public key alone is not a login.

The optional network adapter exposes `gridlockCloud.teamAccess(action, input)`.
It refreshes the existing session, binds replies to the account that requested
them, and discards them after sign-out, account switch or configuration change.
It never stores team permissions or invitation codes in localStorage, never
automatically calls the service and never grants offline membership. An
unconfirmed network reply is not success and is not automatically retried.
Recovery-only sessions cannot use it. Successful replies are
`{ok:true,user,result}`; failures are `{ok:false,said}` with a server code when
available. Render all returned names as text, never HTML. A future UI must clear
member views on sign-out, refetch on focus, and honor refusals on every action.

| Action | Input fields | Result |
| --- | --- | --- |
| `list` | none | `teams` with current role and permitted members |
| `create` | `name`, `display_name`, UUID `request_id` | `team`; reuse request ID for an uncertain retry |
| `join` | `code`, `display_name` | `team` |
| `get` | `team_id` | `team` |
| `invites` | `team_id` | last 100 invitation IDs, roles, expiry, used/revoked flags |
| `invite` | `team_id`, `revision`, `role` | one-time `invite.code`, invitation metadata, new `revision` |
| `revoke` | `team_id`, `revision`, `invite_id` | new `revision` |
| `role` | `team_id`, `revision`, `user_id`, `role` | new `revision` |
| `remove` / `transfer` | `team_id`, `revision`, `user_id` | new `revision` |
| `leave` | `team_id`, `revision` | new `revision` |

Only `coach` and `player` are accepted invitation/role values. No caller-supplied
actor or extra fields are accepted. A stale revision returns `changed`: reload
the team and ask again; do not silently replay a role change or removal.
All team mutations lock the team row before invitations; joins and code
consumption are atomic. Creation uses an account-bound request ID and per-account
lock to avoid duplicates. Member names and team names are 1–80 characters.

Deleting a member's account removes their membership. Deleting the owner's
account removes the team's membership/invitation metadata; transfer ownership
first to keep the team. It never deletes another person's account or Coach
season. Before adding shared team content, the account-deletion UI and retention
contract must explicitly address that content and ownership transfer.

## Rollout gates — not executed by this PR

1. Review and merge only after all checks pass. The migration is disabled by
   default (`gridlock_team_settings.enabled=false`) with an empty
   `gridlock_team_pilot`. No identities or passwords are embedded in it.
2. With owner approval, apply the migration to a disposable/staging Supabase
   project first, through the normal migration workflow. Verify PostgREST access
   as anonymous and confirmed test users, denied direct table access, real JWT
   expiry, and two simultaneous joins/revocations on separate DB connections.
   Local PGlite tests use actual PostgreSQL but cannot replace these hosted
   authentication and multi-connection checks.
3. Build the separate Team/Player cloud UI around this contract. The committed
   offline previews remain offline and isolated. Do not insert the adapter,
   production URLs, keys or secure join controls into offline previews; do not
   reuse `gridlock.coach.*` storage keys. Shared schedules/codes/data need a
   separate content and conflict-resolution design before they can be enabled.
4. After UI review, provision only approved TEST account UUIDs in
   `gridlock_team_pilot`, giving `can_create=true` only to approved owners.
   Enable the flag in staging and run phone/tablet/laptop create → invite → join
   → role change → remove → transfer/leave with distinct accounts. Verify old
   clients and another team's member cannot get access. No real coach data.
5. Review member-name privacy, deletion and support wording before a public
   launch. Existing beta/signup restrictions remain; this PR does not make
   signup public or enable purchases. Production activation needs separate
   approval and the complete tested cloud UI, not just this migration.

Rollback for an approved pilot is disabling the feature flag. Every subsequent
RPC denies access; retain rows for investigation. Do not drop membership tables
or delete account/season data as a rollback. Revoking a pilot also immediately
denies that account's subsequent RPCs. Data already viewed cannot be recalled.

## Verification

- `node scripts/run-checks.js team-membership team-access` runs the real SQL
  in disposable PostgreSQL (PGlite, a dev-only pinned dependency), switching to
  `authenticated`/`anon` for permission checks, plus transport/session races.
- `npm run check`, `npm run build`, `npm run site:check`, `npm audit` remain
  mandatory. No existing suite or performance limit is relaxed.
- Hosted Supabase, real multi-device sessions and a production Team/Player UI
  are deliberately not claimed as verified by these local tests.

Implementation guidance: [Supabase database functions](https://supabase.com/docs/guides/database/functions),
[row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

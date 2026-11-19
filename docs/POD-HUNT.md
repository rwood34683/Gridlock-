# Pod hunt

Owner choices, 18 November 2026: a small clue on Home; the prize will be chosen
later. This change prepares the game. It does not launch a prize competition,
grant free plans, publish a release or modify a live service.

## What a coach sees

Home ends with **Someone left a pod behind…**. It opens a four-clue paintball
hunt. Correct answers reveal code pieces. Joining them finishes practice;
wrong answers can be retried. The screen says **Practice hunt**, **Prize to be
announced**, and **No prize claimed** at completion. There is no automatic
timer, sound, animation or popup. Pod Wars keeps its existing secret entry.

Practice progress lasts only while the hunt is open. Closing it, reloading,
signing out or leaving Home clears it. It does not call `save()`, change any
season, team, code or score, or add anything to backups and account sync.
The cloud prize round's progress belongs to the verified account and can be
read on another device with **Check prize round**. No app request is made
until that button is pressed. Offline builds can play practice but cannot claim.

The practice solution is intentionally in public code and is not a security
credential. Use different clues and fragments for any prize campaign.

## Prepared server boundary

- `native/gridlock-cloud.js`: authenticated requests, outside `web/index.html`.
  Drops replies after sign-out, account switching or adapter replacement.
- `supabase/functions/gridlock-hunt/`: validates the bearer through Auth,
  confirmed email and enrolled MFA; never accepts an account id from the client.
  Uses the existing allowed-origin setting; this PR does not change it.
- `supabase/migrations/202611180001_pod_hunt.sql`: private answer keys,
  account progress and one winner row per campaign. No campaign is seeded.
  Browser roles cannot read/write the tables or execute the adjudicator.
- Only the edge service can call the SQL function. Each answer and claim takes
  the campaign row lock, checks the server clock and enforces eight attempts
  per account per minute. Old round ids and skipped clues are refused. A claim
  needs all four server-recorded answers, the code, and a team name.
- A primary key on the campaign's winner row prevents a second winner even
  across devices. A retry returns the same receipt without changing the team.
  Deleting the winning account leaves the claimed round closed to other teams.
  No plan, payment, entitlement, season or administrator table is written.
- The team name is self-declared, bound to the captain's authenticated account.
  It does **not** prove membership or enforce one account per physical team.
  The winner means the first valid claim recorded by the server, not the
  earliest client clock or locally completed puzzle. Staff fulfill a prize
  separately after checking the eventual eligibility rules.

## Before launching a prize round

1. Choose the prize, eligibility, start/end times, rules and how the winning
   team will be verified and contacted. Nothing in this PR promises free stats.
2. In a separate test project, apply the migration and deploy `gridlock-hunt`
   with JWT verification and its existing server-only credentials. Never put a
   service credential in a web/native build or a checked-in config.
3. Prepare a draft campaign privately. Supply four stages, each with `title`,
   `clue`, three `options`, an `answer` index 0–2 and a short uppercase `piece`.
   The four pieces in order form the final code. Keep answer keys out of this
   repository and public builds. Set prize/rules and UTC instants for the round.
   Do not edit clues, dates or prize after opening a round.
4. Test real confirmed TEST accounts, MFA, phone/tablet/laptop resume, offline
   retry, rate limits, expiry and concurrent claims through the edge endpoint.
   Check exactly one winner and that no paid access or season changes occur.
   Test backup/export separately to confirm they remain unchanged.
5. Review and authorize a production launch separately. This PR does not apply
   the migration, deploy the function, open a campaign or publish the app.
   Keep the campaign `draft` until testing and owner decisions are complete.
   Changing it to `closed` stops submissions; retain the winner record.

`node scripts/run-checks.js pod-hunt pod-hunt-server` runs the browser and
isolated PostgreSQL checks without live accounts. PGlite is a development-only
dependency and is not shipped. It tests the actual SQL, including queued rival
claims and role permissions; it does not replace testing concurrent network
requests against a staging Supabase project.

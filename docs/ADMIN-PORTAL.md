# The Admin Portal — the season across every coach

`admin/index.html` is a standalone dashboard. It rolls a whole year up across
every coach who sends you their season — matches, record, the breaks they
called, penalties, and a breakdown by event and by opponent.

It has **two sources**, and the first works today with nothing to stand up.

## 1. Files — works now, no backend, no privacy change

Each coach exports from **Nexus › Save a copy** (the app already writes this:
`{"format":"gridlock.coach.copy", …, "data":{…}}`). They send you the file —
email, AirDrop, a shared drive, however. You open `admin/index.html` in a
browser and drop the files in. The reading happens in your browser; nothing is
uploaded.

This keeps the app's promise intact: the coach chooses to hand you a copy, the
same as handing over a clipboard. The privacy notice does not change, because
nothing leaves a phone except by the coach's own Save-a-copy.

Host `admin/index.html` anywhere private (a folder on your machine, an
access-controlled internal URL). It is a single file with no dependencies.

## 2. Cloud collector — the live portal, and what it costs

A live portal means every device **uploads its season** to a store you own, and
the dashboard reads that store. Understand the trade before you switch it on:

- **It reverses the app's central promise.** Today the welcome screen and the
  privacy notice say the season never leaves the phone. A collector means you
  hold every coach's roster, tallies, *and their scouting on teams they play* —
  competitive data belonging to teams who play each other — on a machine you
  own. `docs/SERVER.md`'s "what goes up / what stays" table and the sign-in
  copy **must change in the same release**, or the app is lying about where the
  data is. This is a product decision, not a config flag.
- **Get consent.** A coach must opt in to uploading, in plain words, and be able
  to turn it off and delete what was sent. "Sync my season to my league" is a
  switch he throws, not a default.

### The store (Supabase)

One table holds an uploaded season per coach per push:

```sql
-- One current season per coach, keyed on owner so each push replaces the last.
create table public.seasons (
  owner      uuid primary key references auth.users on delete cascade,
  label      text,                       -- coach or team, for the dashboard
  payload    jsonb not null,             -- the Save-a-copy JSON, verbatim
  updated_at timestamptz not null default now()
);
alter table public.seasons enable row level security;

-- A coach may touch only his own row. The reference adapter upserts on owner
-- (POST … ?on_conflict=owner, Prefer: resolution=merge-duplicates), so insert
-- and update policies both have to pass, and delete lets him remove what he sent.
create policy "own insert" on public.seasons
  for insert with check (auth.uid() = owner);
create policy "own update" on public.seasons
  for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own read"   on public.seasons
  for select using (auth.uid() = owner);
create policy "own delete" on public.seasons
  for delete using (auth.uid() = owner);
```

The **admin** reads across everyone. Do that with an Edge Function gated to an
admin allow-list — never by handing the anon key select rights on the whole
table (that would let any coach read every other coach's season). The reference
function is written for you: **`supabase/functions/admin-seasons/index.ts`**. It
verifies the caller's token, checks their email against an allow-list, and only
then reads `select label, payload from seasons` with the service-role key —
**server-side, never in a browser**.

```bash
supabase functions deploy admin-seasons
supabase secrets set ADMIN_EMAILS="you@club.com,partner@club.com"
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected by the
# platform. Keep verify_jwt ON (the default) so only a real user token gets in.
```

In the dashboard, expand **Load from the cloud collector**, enter your project
URL, the anon key, your admin email and password, and the function name
(`admin-seasons`). It signs you in for a short-lived token, calls the function
with it, and aggregates what comes back beside any files you dropped in. Your
password is not saved; the URL, anon key, email and function name are, so you do
not retype them.

### The upload, from the app

The coach app makes **no `fetch`** — that is why it works in a field with no
signal, and it must stay that way. Uploading is an **adapter the native shell
fills in**, and the reference implementation is written for you:
**`native/gridlock-cloud.js`**. It is deliberately outside `web/`, so it is
never bundled into the app or `site/app.html` and every suite still proves the
app has no `fetch`. It fills in the whole `window.gridlockCloud` contract —
Supabase Auth sign-in plus `pushSeason` / `deleteSeason` against the table above
— using only the anon key, with offline returns that fall through to the phone.

Ship it only in a cloud-enabled build. The shell injects it and configures the
project before it loads:

```js
// In the cloud build only — never added to web/ or inlined into site/app.html.
window.GRIDLOCK_CLOUD = { url: "https://YOUR-PROJECT.supabase.co", anonKey: "…anon public key…" };
// then load native/gridlock-cloud.js  (or, after load: window.gridlockCloudConfigure(url, anonKey))
```

With the file absent — every default build — `window.gridlockCloud` is unset,
League sync does not appear, and the privacy copy stays on "nothing leaves your
phone." The opt-in toggle and the "delete what I sent" control already live on
Nexus (`canSync()` gates them), and a push that fails with `offline:true` is
silent so the coach never notices — the copy on the phone stays the source of
truth. `test/cloud-adapter.js` (the `cloud` suite) exercises the adapter against
a mocked Supabase: sign-in, refusal, offline, the upsert payload, and delete.

### Point the dashboard at it

Open `admin/index.html`, expand **Load from the cloud collector**, paste the
Edge Function URL and the anon key, and Load. It pulls `{label, payload}` rows
and aggregates them beside any files you dropped in.

## What the dashboard counts

All of it is counted from what coaches logged — nothing is modelled, same
contract as the app. Games a coach **watched** (a scouting sheet, not one he
played) never count toward a record. The built-in twelve calls show their
default names unless the coach renamed them, in which case his word is used.

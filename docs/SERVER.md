# The account server

**Supabase hosts the account server. League sync is optional.**

The live cloud build uses the public project settings in `site/contact.json`.
The committed `web/index.html` contains no `fetch`; the cloud build adds the
adapter separately. An unconfigured offline build sends nothing to this server.

## What the account server keeps

Supabase keeps the coach's email, a password hash, an account id, email
confirmation, last sign-in, and plan (Free/Team/Program) with its end date.

**The one exception to keeping the season on the device is opt-in League sync.**
A cloud build asks once per account, straight after the first sign-in and
before the format ("Back up your season": Yes, back it up / Not now). Nothing
is sent unless the coach taps Yes; the answer is the same switch as Nexus >
League sync, and which accounts were asked is kept on the phone under
`gridlock.coach.syncasked`. When the coach turns it on, it uploads the full season and keeps one current
copy with the coach's account on that account server. Gridlock PB LLC's
administrators can review uploaded seasons. This includes rosters, tallies,
results, scouting on opponents, calls, plays and other season records. The
account password is never part of the season upload.

The coach can pause sending, review or restore the copy, or delete what was
sent from Nexus. Pausing does not delete an existing copy. Nexus > Delete
account deletes the login and the League sync copy; local and shared files
are separate. The copy is current state, not a history of backups. Save a copy
before each event for a backup the coach controls.

This is adapter-gated (`window.gridlockCloud.pushSeason`). The Nexus, sign-in
and Help copy branch on `canSync()`; offline wording stays unchanged.
Keep the live website wording in `scripts/site-live.js` and the app wording
consistent whenever this data flow changes.

## Offline-first is not negotiable

On a cloud build, [account device handoff](ACCOUNT-DEVICE-SYNC.md) checks the
account's saved season before uploading. A new device offers the saved season;
an opted-in returning device adopts a newer copy at sign-in or while idle only
when its own season has not changed since its acknowledged save. While visible,
it checks on return/reconnect and every 30 seconds; drafts and recording delay
replacement. Sending still runs within 90 seconds while open and online.
Conflicting edits require
a choice. The selected team and format travel with a full season, without
granting team or account permissions. This uses the existing authenticated
revision RPC and owner-only RLS; it does not enable automatic sharing for
coaches who have declined or paused sync.

A field in Garland has no bars.

1. The local account stays the **working credential**. A successful cloud
   sign-in writes it — salt and hash — so the next launch with no signal opens.
2. A cloud call that fails with `offline:true` **falls through to the phone**
   and says nothing about it. He gets in.
3. Only `ok:false` *without* `offline` is a real refusal, and `said` is shown as
   written.

A server that can lock a coach out between points is worse than no server.

## Setting it up

For the existing live app, use [the owner rebuild instructions](LIVE-REBUILD.md).
The adapter example below explains the integration; it is not an instruction
to replace the configured live services.

1. Create a project at supabase.com. Note the **project URL** and the **anon
   key** — the anon key is public by design and safe in the app; **the service
   role key never ships**, in any build, ever.
2. **Auth → Providers**: enable Email. Enable Apple for Sign in with Apple, and
   Phone if you are turning SMS on (Supabase holds the code, so you do not need
   a verify endpoint of your own — this replaces `window.gridlockVerify`).
3. **Auth → URL Configuration**: set the redirect for password-reset links to
   your deep link, `gridlock://auth/callback`.
4. One table, for what he owns:

```sql
create table public.entitlements (
  user_id    uuid primary key references auth.users on delete cascade,
  plan       text not null default 'free',
  expires_at timestamptz,
  source     text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;

-- A coach reads his own row and nobody else's. He never writes it:
-- entitlements come from RevenueCat's webhook using the service key,
-- server-side, so a client cannot grant itself Team.
create policy "own row" on public.entitlements
  for select using (auth.uid() = user_id);
```

Point RevenueCat's webhook at a Supabase Edge Function that upserts that row.
That is the only thing holding the service key, and it runs on their side.

5. Install and fill in the shim:

```sh
npm i @supabase/supabase-js
npm run sync
```

```js
const sb = createClient(URL, ANON_KEY);
const net = e => ({ offline: true });          // any transport failure
window.gridlockCloud = {
  async signUp(email, password){
    try { const {data, error} = await sb.auth.signUp({email, password});
          return error ? {ok:false, said:error.message} : {ok:true, user:data.user}; }
    catch(e){ return net(e); } },
  async signIn(email, password){
    try { const {data, error} = await sb.auth.signInWithPassword({email, password});
          return error ? {ok:false, said:error.message} : {ok:true, user:data.user}; }
    catch(e){ return net(e); } },
  async sendReset(email){
    try { const {error} = await sb.auth.resetPasswordForEmail(email,
            {redirectTo: "gridlock://auth/callback"});
          return error ? {ok:false, said:error.message} : {ok:true}; }
    catch(e){ return net(e); } },
  signOut(){ sb.auth.signOut(); },
  async session(){ const {data} = await sb.auth.getSession(); return data.session || null; },
};
```

Distinguishing a refusal from a dead network is the shim's whole job. Return
`{offline:true}` for anything that smells like transport — a thrown error, a
timeout, `navigator.onLine === false` — and a real `said` only when Supabase
actually answered.

## What changes on the App Store

Your privacy label moves from **Data Not Collected** to collecting an email
address and a user id, linked to identity. Update the label and the privacy
notice in the same release that ships the shim. If League sync ships, the disclosure must also cover the full-season upload,
its account association and administrator access. It must never claim that
competitive data cannot be reviewed by Gridlock PB LLC.

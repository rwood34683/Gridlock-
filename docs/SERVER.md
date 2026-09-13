# The account server

**Supabase. Accounts and purchases only. The season never leaves the phone.**

Built as an adapter and switched off: `web/index.html` still contains no
`fetch`, so a browser build and every existing suite behave exactly as before
until a shim fills in `window.gridlockCloud`.

## What goes up, and what never does

| Up | Stays on the phone |
|---|---|
| Email, password hash (Supabase's), user id | Roster and player numbers |
| What he bought, and when | Every tally, breakout and result |
| Verified phone number, if SMS is on | Scouting on every opponent |
| | His words for bunkers, calls and jobs |
| | His own plays |

That split is the point. It buys the four things a device alone cannot do — a
customer list, a password he can reset, phone verification, and an account that
survives a lost phone — without you holding competitive data belonging to teams
who play each other.

**The privacy copy must stay true to this table.** The sign-in panel already
branches: with a server it says the email and purchases are kept and the season
never leaves the device. Change the table, change the copy, in the same commit.

## Offline-first is not negotiable

A field in Garland has no bars.

1. The local account stays the **working credential**. A successful cloud
   sign-in writes it — salt and hash — so the next launch with no signal opens.
2. A cloud call that fails with `offline:true` **falls through to the phone**
   and says nothing about it. He gets in.
3. Only `ok:false` *without* `offline` is a real refusal, and `said` is shown as
   written.

A server that can lock a coach out between points is worse than no server.

## Setting it up

1. Create a project at supabase.com. Note the **project URL** and the **anon
   key** — the anon key is public by design and safe in the app; **the service
   role key never ships**, in any build, ever.
2. **Auth → Providers**: enable Email. Enable Apple for Sign in with Apple, and
   Phone if you are turning SMS on (Supabase holds the code, so you do not need
   a verify endpoint of your own — this replaces `window.gridlockVerify`).
3. **Auth → URL Configuration**: set the redirect for password-reset links to
   your deep link, `gridlock://reset`.
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
            {redirectTo: "gridlock://reset"});
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
notice in the same release that ships the shim. The rest of the claim survives
and is worth keeping sharp: *nothing about your team, or anybody else's, is on
a machine we own.*

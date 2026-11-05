# Google and Apple sign-in (cloud build)

The cloud build can offer **Continue with Google** and **Continue with Apple**
beside email and password. It is off until the owner finishes the setup below
and switches it on in the build. Nothing in this repository changes the live
Supabase project, Google Cloud or the Apple Developer account. Those steps are
the owner's.

Sources: Supabase's current guides, read from the docs source on 5 Nov 2026:
[Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[Sign in with Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple),
[PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) and
[Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).
The wire format follows `@supabase/auth-js` 2.119.0.

## How it works

- **Where it lives.** `web/index.html` still makes no network calls. The
  optional adapter, `native/gridlock-cloud.js`, does the work, and only cloud
  builds include it.
- **Starting.** Continue with Google (or Apple) starts Supabase's **PKCE code
  flow**:
  - The adapter makes a random code verifier and keeps it on this phone under
    `grindx.cloud.oauth`, for at most 10 minutes.
  - It opens `/auth/v1/authorize?provider=…&redirect_to=…&code_challenge=…&code_challenge_method=s256`.
  - Only the SHA-256 challenge leaves the phone.
- **Coming back.** The provider returns to the build's callback address with
  `?code=`.
  - The adapter removes the code from the address bar before anything else
    runs.
  - It uses the kept verifier once and deletes it.
  - It exchanges the code at `/auth/v1/token?grant_type=pkce`.
  - It then asks `/auth/v1/user` who the token belongs to. Only the server's
    answer is the identity.
- **Callbacks the app refuses, with a sentence on screen:**
  - **Not started here.** A callback with no verifier on this phone: another
    device, another tab, a forwarded link, or a reload after the code was used.
  - **Too old.** A verifier more than 10 minutes old.
  - **Cancelled or refused.** A callback that carries `error` or `error_code`.
  - **Not confirmed.** A code the server refuses, or a token whose `/user` is
    a different account.
- **What it never trusts.** The callback itself, and anything the app keeps
  locally (the `oauth` account kind, `S.entered`), are never treated as proof.
  - Beta invitations, plans (`entitlements`), cloud seasons (row-level
    security) and the administrator portal (UUID allowlist plus its own MFA)
    are all enforced by the server, exactly as for email accounts.
  - The plan is read after sign-in through the same `getEntitlement()` call.
- **What the phone keeps.** A coach signed in this way has no password on the
  phone. The local account record is
  `{kind:"oauth", provider, uid, email, cloud:true}`.
  - Offline, the app opens as it was, and the season is untouched.
  - Signing in again needs a signal.
  - Sign out (STAFF › Nexus › Sign out, which asks first) works the same as for
    every account.
- **Native shells.** Google refuses sign-in inside an app's own web view.
  - The native shell offers these buttons only if it provides
    `window.gridlockOpenAuth(url)`, which opens the system browser
    (for example with `@capacitor/browser`, not installed today).
  - Until then the phone apps show no Google or Apple button from the cloud
    adapter.
  - The existing native Sign in with Apple path (`window.gridlockApple`) is
    unchanged. Where it exists, the cloud Apple button is not shown, so a phone
    never shows two Apple buttons.

## Owner setup: Google

1. In Google Cloud's **Google Auth Platform**:
   - **Audience:** set it to the people allowed to sign in.
   - **Data Access (Scopes):** add `openid`; `userinfo.email` and
     `userinfo.profile` are there by default. Add nothing else.
   - **Branding:** add the Gridlock name, logo, privacy page
     (`https://gridlockpb.com/privacy`) and support page.
   - Brand verification can take a few business days. A custom domain such as
     `auth.gridlockpb.com` for the Supabase project shows coaches a familiar
     name instead of `tldgxtrvbzlnydlysdln.supabase.co`.
2. **Clients → Create OAuth client → Web application:**
   - **Authorized JavaScript origins:** `https://app.gridlockpb.com`.
   - **Authorized redirect URIs:** the callback shown on Supabase's Google
     provider page, `https://tldgxtrvbzlnydlysdln.supabase.co/auth/v1/callback`.
3. In **Supabase → Authentication → Sign In / Providers → Google**:
   - Turn it on.
   - Paste the **Client ID** and **Client Secret**.
   - The secret goes only here. Never put it in `site/contact.json`, an
     environment variable for `cloud-build.js`, a commit, a chat or a log.

## Owner setup: Apple (web)

1. **Apple Developer → Certificates, Identifiers & Profiles:**
   - **Team ID.** Note your Team ID (10 characters).
   - **Email relay.** Register `gridlockpb.com` (and the sending address used
     by Supabase's SMTP, `support@gridlockpb.com`) under **Sign in with Apple
     for Email Communication**, so mail reaches coaches who hide their email.
   - **App ID.** An App ID with the **Sign in with Apple** capability
     (`com.upra.gridlock.coach`, or the App ID the iPhone app uses). Leave
     server-to-server notifications blank; Supabase does not use them.
   - **Services ID.** A Services ID, for example `com.upra.gridlock.coach.web`.
     - Domain: `tldgxtrvbzlnydlysdln.supabase.co`.
     - Return URL: `https://tldgxtrvbzlnydlysdln.supabase.co/auth/v1/callback`.
   - **Signing key.** Under **Keys**, create a signing key for Sign in with
     Apple and download `AuthKey_XXXXXXXXXX.p8`.
     - Keep the file offline and private.
     - If it is ever exposed, revoke it and make a new one.
2. Generate the client secret from the `.p8` file with Supabase's generator on
   the Apple guide page. It runs in the browser; use Chrome or Firefox, not
   Safari.
3. In **Supabase → Authentication → Sign In / Providers → Apple**:
   - Turn it on.
   - **Client IDs:** put the **Services ID first**, then any native App IDs.
     Supabase uses the first entry for the web flow; a native ID first breaks
     web sign-in.
   - **Secret Key:** paste the generated secret.
4. **Rotate the Apple secret every 6 months.** Apple expires it, and web sign-in
   stops working the day it does. Put a recurring reminder in the calendar now.

## Owner setup: Supabase URL configuration and linking

- **Redirect URLs** must include the exact callback each build uses:
  `https://app.gridlockpb.com/` today, plus `gridlock://auth/callback` for the
  native cloud build. These are already required for email links. Do not add
  broad wildcards.
- **Allow manual linking** (Authentication settings). Turn it on to let a
  signed-in coach use **Link Google / Link Apple** in Nexus. While it is off,
  linking says so and changes nothing.
- **Beta invitations.** Keep **Allow new users to sign up** off while the beta
  is invitation-only. Supabase then refuses a Google or Apple sign-in that
  would create a new user, and the app shows "not on the beta list yet". The
  app has no beta list of its own; the server decides.

## Switching it on in the build

After the dashboard steps, build with the providers that are actually
configured:

```sh
GRINDX_AUTH_PROVIDERS=google,apple npm run cloud:build
```

You can instead add `"providers": ["google", "apple"]` under `cloud` in
`site/contact.json`. Only these two names are accepted, and anything else stops
the build. The generated `gridlock-config.js` gains a `providers` list and
nothing else; no secret is ever an input to the build. With no providers set
(the default), the build shows no Google or Apple button.

Deploy as `docs/CLOUD-AUTH-SETUP.md` says, from a fresh checkout of
origin/main.

## Invited emails and Apple's private relay

- **Hide My Email.** A coach who chooses Apple's Hide My Email gives Supabase an
  address like `abc123@privaterelay.appleid.com`, not the address he was
  invited at.
- **Invitations.** An invitation is to an email address, so the relay address
  matches no invited user.
  - With signups closed, that Apple sign-in is refused ("not on the beta list
    yet").
  - With signups open, it creates a separate account with its own empty plan
    and cloud copy.
- **What to tell such a coach.** Accept the invite and sign in with the invited
  email, then use **Link Apple** in Nexus. Apple then opens that same account
  whatever address Apple shows.
- **Relay mail.** It reaches him only if the sending domain is registered with
  Apple (step 1 above).

## An existing email-and-password coach

- **Automatic linking, same email.** Supabase links identities with the same
  email to one user automatically. A coach whose Google address is the
  confirmed email he already signs in with lands on the same account: same
  user id, same plan, same cloud copy.
  - Supabase drops unconfirmed identities when it links, so an unconfirmed
    signup typed with someone else's address cannot capture their Google
    sign-in.
  - Email confirmation is required on this project and must stay on.
- **The app never links accounts itself.** It does not compare emails, and it
  never treats an unverified email as a match.
  - For a different address, or Apple's relay, linking is **manual**: sign in
    the usual way, then **Link Google / Link Apple** in Nexus.
  - The adapter starts the link with the signed-in coach's own token, and on
    the way back checks the server's answer is that same account id. If it is
    not, it links nothing and keeps him signed in as before.
- **A provider account that already has its own Gridlock account** cannot be
  linked onto another. The server refuses, and the app says so.
- **The season is never part of this.** It lives on the phone. Switching sign-in
  method or linking changes which login opens the account, not the season. An
  account with League sync on keeps its one cloud copy under the same user id.

## Deleting a Google- or Apple-only account

Account deletion re-checks the password (and the authenticator code when MFA is
on). An account with no password is told how to get one:
1. Sign out.
2. On the sign-in screen, tap Forgot password and use the account's email.
3. Set a password from the email, sign in with it, then delete the account.

A relay address works for this only once the email relay is registered with
Apple.

## Privacy notice

The current notice says the account server keeps "your email, a password hash,
an account id". Before switching providers on, update the notice (in
`scripts/site-live.js`, `docs/SERVER.md` and the app's cloud wording, in one
commit) to say that signing in with Google or Apple shares that account's email
and an account id with the account server. This change was not made here,
because the wording is the owner's to confirm.

## Checks

- `node test/social-sign-in.cjs` checks the adapter against a scripted account
  server: the challenge and verifier, one-time use, expiry, foreign callbacks,
  cancellation, closed signups, a refused or mismatched token, no signal,
  linking with the coach's own token, linking onto another account, sign-out
  mid-link, manual linking turned off, native opening, email links beside the
  new callbacks, and the build's provider list.
- `node test/social-sign-in-ui.cjs` checks what the coach sees: no buttons
  offline, unconfigured or on the new-password screen; one Apple button only;
  44 px targets on phone and tablet; signing in keeps no password and keeps the
  season; a refused callback stays out; Apple with a hidden email; Link in
  Nexus; and STAFF › Nexus › Sign out still asking first.
- Neither check touches a real provider or project. A real device test is still
  owed once the dashboard is configured: sign in, cancel, link and sign out,
  for both providers, on the web build.

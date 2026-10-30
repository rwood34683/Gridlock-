# Cloud authentication setup

This applies to the newer Claude Gridlock app, whose canonical source is
`web/index.html` and whose optional adapter is `native/gridlock-cloud.js`.
The older Codex app uses different environment names and SQL tables. Do not
apply its migrations to this app's project.

## Current staging services

The owner-created Supabase project is `gridlock-staging`, project reference
`tldgxtrvbzlnydlysdln`. Its `seasons` and `entitlements` tables use row-level
security. Resend custom SMTP is configured for `support@gridlockpb.com` and a
test invitation to the owner was delivered on October 29, 2026. The SMTP
credential belongs only in Supabase's SMTP password setting. It never belongs
in these build variables or any client file. Resend documents the API key as
the SMTP password in its [Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp).

Email confirmation is required. Successful email delivery alone does not prove
the complete account-creation or password-recovery flow has passed on a phone.

## Build configuration

Set the following in the build environment, then run `npm run build:cloud`:

```text
GRINDX_SUPABASE_URL=https://tldgxtrvbzlnydlysdln.supabase.co
GRINDX_SUPABASE_ANON_KEY=<public sb_publishable_ key or legacy anon JWT>
GRINDX_AUTH_REDIRECT_URL=<exact callback URL for this build>
```

The legacy `GRINDX_` environment names are intentional. Only public keys are
accepted. Modern `sb_secret_` keys and JWTs whose role is not `anon` fail the
build. The project URL must be an HTTPS origin, without credentials, path,
query or fragment. Supabase distinguishes client-safe publishable/legacy anon
keys from privileged secret/service-role keys in its
[API-key reference](https://supabase.com/docs/guides/getting-started/api-keys).
The adapter sends the public key on `apikey`; `Authorization: Bearer` carries
the signed-in user's access token only. Publishable keys are not JWTs and must
not be substituted for a user token in that header, as documented under
[known limitations](https://supabase.com/docs/guides/getting-started/api-keys#known-limitations).

For a hosted web app, use its exact HTTPS entry-page URL, for example
`https://staging.example.com/index.html`. For a local web test use the exact
localhost entry-page URL, including its port. For a Gridlock native cloud build
use `gridlock://auth/callback`; the registered variant callbacks are
`grindx://auth/callback` and `lockdown://auth/callback`.

The explicit callback must have no credentials, query or fragment. If omitted,
the adapter uses the current web page's origin and path; on native Gridlock it
uses `gridlock://auth/callback`. Set the explicit value for a native brand
variant. The callback is included in the generated public config.

Output is `dist/cloud/`. Custom output paths must be named children of `dist/`.
The committed offline `web/` source is unchanged. The build fingerprints all
public files, including the adapter and generated configuration, so a new key,
callback, or adapter revision produces a new offline-cache version.

## Supabase URL configuration

In Authentication → URL Configuration, set Site URL to the chosen hosted app
entry page. Add each exact callback used by the staging web and native builds
to Redirect URLs. Avoid a broad wildcard. The email templates must use
Supabase's confirmation URL so email verification happens before the app
receives the callback. The project initially used `http://localhost:3000`;
confirm and replace that default when a tested staging app is hosted. See
Supabase's [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
and [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates).

The callback handler consumes the access and refresh tokens from a URL
fragment, verifies the user with Supabase, and clears the fragment before
rendering. This follows Supabase's
[implicit-flow callback format](https://supabase.com/docs/guides/auth/sessions/implicit-flow).
It does not implement a server-side PKCE authorization-code exchange.

Do not point production email links at an unhosted or untested page. Changing
these settings is a separate deployment step; the code changes do not change
the live dashboard or publish a website.

## Verification before release

- Create an account with confirmation required. The app must ask the coach to
  check email and must not enter the signed-in app before confirmation.
- Confirm a fresh signup link and sign in with the confirmed password.
- Request recovery, open the link, set a new password, sign out, and prove the
  old password fails while the new password works. Try expired and malformed
  links and a disconnected phone without losing the season.
- Exercise the native callback on a physical device, including a cold launch
  and an already-open app. Verify the built shell includes the cloud adapter.
- Repeat with two accounts and verify server row isolation, sign-out behavior,
  offline re-entry, and explicit removal of an uploaded season.
- Run `npm run check`, including `cloud-build`, `cloud-build-security`,
  `cloud-session` and the authentication regression suites.

The current two-table backend does not provide self-service Auth-account
deletion or verified store purchase entitlements. Removing an uploaded season
is not deleting the Auth account. Before an account-backed paid release,
complete those server workflows, store setup, privacy review and final device
checks. Do not mark the app ready solely because SMTP or the local tests pass.

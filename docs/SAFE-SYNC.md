# Season and account safety

Cloud storage holds one current season copy per account. A phone/tablet does not
silently replace another device's work. Every upload/removal calls
`gridlock_write_season` with the previously accepted server revision. The database
serializes same-owner writes, rejects stale revisions and retains an empty deletion
marker. Old builds cannot bypass this check through direct table writes.

Use **Nexus > Review or restore cloud season** on a second device. The app validates
the copy, preserves the current local season as a recovery copy, asks before
replacement and accepts the server revision only after restoration. Sharing stays
paused. If the cloud copy was removed, restarting sharing requires an explicit
confirmation. There is no automatic cross-device merge.

Edits during the 90-second cooldown schedule a trailing upload. Offline/errors keep
the copy dirty and retry, including on reconnect. Conflicts pause sharing and show
a review message. Sign-out, account changes and removal invalidate pending work.
Uploads are limited to 2 MB. The admin loads at most five complete cloud copies per
page and ignores deletion markers.

New offline password verifiers use PBKDF2-HMAC-SHA256 with a unique 16-byte salt,
600,000 iterations and a 256-bit result. A correct legacy offline sign-in upgrades
the verifier before entry; successful cloud sign-in/recovery writes the new format.
The original password is never stored. Offline access still depends on protecting
the device and its local app data.

Admin sign-in requires a verified `aal2` session, checked server-side with both
`auth.getUser` and `auth.getClaims`. Password-only sessions can obtain their own
allowlisted identity and MFA requirement, but no user/season records or mutations.
Each admin enrolls their own TOTP authenticator, then verifies a code. Enrollment
secrets and tokens remain in memory and clear on sign-out/expiry. Plan updates and
their durable audit row commit in one service-role-only database function.

**Nexus > Delete account** requires the current password, the exact phrase
`DELETE MY ACCOUNT`, and an authenticator code when enabled. The separate
`gridlock-account` function checks a recent password authentication, confirmed
identity, required MFA and exact confirmation; it accepts no target-user ID.
It deletes only the verified caller. Database cascades remove the cloud season and
entitlement, and an Auth deletion trigger anonymizes their admin-audit references.
The local phone season and previously shared/exported files stay on their devices.
Never exercise this operation against real accounts as an automated test.

## Deployment and validation

Apply `supabase/migrations/202610300001_safe_season_sync.sql` to the Coach staging
schema before publishing the new cloud build. Do not apply it to the separate
organization-based Codex app. Deploy `gridlock-admin` and `gridlock-account` with
the existing server-injected Supabase values and exact `ADMIN_ALLOWED_ORIGINS`.
The existing immutable `ADMIN_USER_IDS` allowlist remains required for admin access.
Keep platform JWT verification enabled. No server key belongs in a client build.

The migration can be tested inside a rollback together with `test/safe-sync.sql`.
Tests create only disposable Auth identities. Unit suites `season-safety`,
`account-deletion`, `admin-handler` and `admin-portal` exercise conflicts, retries,
password verification, MFA, imports and deletion authorization without live users.
Live owner sign-in, individual MFA enrollment and physical device checks remain
separate acceptance steps. Billing remains disabled until store verification is
implemented and tested.

Supabase references: [TOTP enrollment and verification](https://supabase.com/docs/guides/auth/auth-mfa/totp),
[verified JWT claims](https://supabase.com/docs/reference/javascript/auth-getclaims).

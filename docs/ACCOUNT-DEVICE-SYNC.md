# One account across devices

Sign in with the same Gridlock account email on the laptop, tablet and phone.
The display name and team name are labels, not access credentials. Account
server row-level security continues to bind the saved season to the authenticated
Supabase user id. No server settings, permissions or migration changes are needed.

League sync is optional. It sends the full season to the account server, where
Gridlock PB LLC's administrators can review it. A new device checks for that
copy before offering the format questions or sending local data. Choose **Use
my saved season** to continue it and turn on sync for this device. **Keep working
here — sync off** keeps the local season and sends nothing.

With sync enabled, wait for a confirmed save in **More → Account & backups →
League sync** before changing devices. **Send now** sends pending changes.
On the other device, sign in or choose **Continue on this device**. A device
that previously synced can automatically adopt a newer saved season at sign-in
only if it has no unshared changes. An active screen is never silently replaced
by a background download. This is a handoff of one current season, not concurrent
multi-coach editing or live score streaming.

If both copies changed, the app asks which to use. Choosing the saved season
first keeps this device's season as a local recovery copy. Choosing this device's
season explicitly confirms replacement of the server copy. The server still
refuses if another device changes it after that check. Save both as files before
choosing if you need to combine their records. File import's Merge option remains
available; the sync flow never guesses how conflicting scores should combine.

The selected team, schedule, format, roster, scouting, plays and match records
travel in the full season. A squad-only import does not change which team or
match this device is working on. Passwords, session tokens and purchases are not
season data. A different account cannot automatically upload the previous
account's local season. A deleted server copy stays deleted until an explicit
choice to send again. Manual **Review or restore cloud season** retains its
existing behavior: restore, then keep sync paused.

Checkpoints contain a SHA-256 hash and acknowledged revision, scoped by project
and account id. They are consistency evidence, not authority: all network reads
and writes still require the authenticated server session and existing RLS.
Failed storage, sign-out, deletion, another tab taking ownership and late replies
must not resume sharing or overwrite local work.

This branch is separate from the Stripe day-pass work. Re-run both sets of
checks together before merging them: expired paid access must retain backups
and account reads while continuing to enforce the paid upload gate.

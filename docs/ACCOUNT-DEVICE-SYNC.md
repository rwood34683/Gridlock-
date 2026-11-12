# One account across devices

Use the same Gridlock email on your laptop, tablet and phone.

1. **Save here.** Open **More → Account & backups → League sync**. Turn it on,
   tap **Sync now**, and wait for **Saved to your account**.
2. **Sign in there.** Open Gridlock on your other device and sign in with that
   same email.
3. **Open your season.** Tap **Use my saved season**.

Already signed in? Open **More → Account & backups → League sync** and tap
**Get saved season**. If both devices have changes, the app asks which copy to
use. Do not switch until the first device confirms its save.

League sync is optional. It sends the full season to the account server, where
Gridlock PB LLC's administrators can review it. A new device checks for that
copy before offering the format questions or sending local data. Choose **Use
my saved season** to continue it and turn on sync for this device. **Not now —
keep sync off** keeps the local season and sends nothing.

The app continues saving while you work and have a signal. A device that
previously synced can automatically adopt a newer saved season at sign-in
only if it has no unshared changes. An active screen is never silently replaced
by a background download. This is a handoff of one current season, not concurrent
multi-coach editing or live score streaming.

Choosing the saved season
first keeps this device's season as a local recovery copy. Choosing this device's
season explicitly confirms replacement of the server copy. The server still
refuses if another device changes it after that check. Save both as files before
choosing if you need to combine their records. File import's Merge option remains
available; the sync flow never guesses how conflicting scores should combine.

The selected team, schedule, format, roster, scouting, plays and match records
travel in the full season, including team codes, signal words, play calls and
bunker calls. This matches the owner's 11 November recording, “Syncing Data
Across Devices” (https://app.heypocket.com/app/share/wrHsHQt1). The three-device
suite compares those values explicitly after both tablet and phone restore.
A squad-only import does not change which team or
match this device is working on. Passwords, session tokens and purchases are not
season data. A different account cannot automatically upload the previous
account's local season. A deleted server copy stays deleted until an explicit
choice to send again. **More backup options → Review or restore cloud season** retains its
existing behavior: restore, then keep sync paused.

The display name and team name are labels, not access credentials. Server
row-level security binds the saved season to the authenticated Supabase user id.
No server settings, permissions or migration changes are needed.

Checkpoints contain a SHA-256 hash and acknowledged revision, scoped by project
and account id. They are consistency evidence, not authority: all network reads
and writes still require the authenticated server session and existing RLS.
Failed storage, sign-out, deletion, another tab taking ownership and late replies
must not resume sharing or overwrite local work.

This branch is separate from the Stripe day-pass work. Re-run both sets of
checks together before merging them: expired paid access must retain backups
and account reads while continuing to enforce the paid upload gate.

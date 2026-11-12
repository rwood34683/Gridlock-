# One account across devices

Use the same Gridlock email on your laptop, tablet and phone.

1. **Save here.** Open **More → Account & backups → League sync**. Turn it on,
   tap **Sync now**, and wait for **Saved to your account**.
2. **Sign in there.** Open Gridlock on your other device and sign in with that
   same email.
3. **Open your season.** Tap **Use my saved season** the first time on that
   device. After that, leave sync on.

Already signed in with sync on? The app checks when you return or reconnect,
and every 30 seconds while visible. **More → Account & backups → League sync →
Get saved season** checks immediately. If both devices have changes, sync pauses
and asks which copy to use. Do not switch until the first device confirms its save.

League sync is optional. It sends the full season to the account server, where
Gridlock PB LLC's administrators can review it. A new device checks for that
copy before offering the format questions or sending local data. Choose **Use
my saved season** to continue it and turn on sync for this device. **Not now —
keep sync off** keeps the local season and sends nothing.

The app sends changes within 90 seconds while open and online. Tap **Sync now**
before switching devices. A device that previously synced can automatically
adopt a newer saved season at sign-in or while it is idle, only if its season
has no unshared changes. Receiving waits while typing, recording, drawing,
dictating or running a break clock. A reply is checked again before applying
it. Hidden tabs do not poll, and an offline read leaves the local season usable.
This is a handoff of one current season, not concurrent multi-coach editing or
live score streaming. Device-only boards, practice logs and display settings
stay on that device; automatic receiving does not reset them.

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
existing behavior: restore, then keep sync paused. Replacing from a file also
cancels pending account reads and keeps sync paused until an explicit choice.

The display name and team name are labels, not access credentials. Server
row-level security binds the saved season to the authenticated Supabase user id.
No server settings, permissions or migration changes are needed.

Checkpoints contain a SHA-256 hash and acknowledged revision, scoped by project
and account id. They are consistency evidence, not authority: all network reads
and writes still require the authenticated server session and existing RLS.
Failed storage, sign-out, deletion, another tab taking ownership and late replies
must not resume sharing or overwrite local work.

`test/automatic-season.cjs` checks foreground events, periodic receiving,
codes/names/roster/schedule equality, unsaved drafts, edits during a read,
offline reconnect, conflicts, account changes, deletion and refused storage.
It uses the real adapter against a simulated server. It does not replace a
live test with a dedicated test account on physical devices.

This branch is separate from the Stripe day-pass work. Re-run both sets of
checks together before merging them: expired paid access must retain backups
and account reads while continuing to enforce the paid upload gate.

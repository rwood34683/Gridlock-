# Coach home — recording decisions, 11 November 2026

Source: https://app.heypocket.com/app/share/ilMMFmQt
Pocket title: Scout App Dashboard Navigation Discussion.
Verified the shared title against the full connector transcript, recording
`c32f85d6-1d8b-45e8-983f-6bd2db926101`.

- 0:08–0:45: opening straight into a technical field screen disorients a new
  coach. Put Playbook, Tally, Scout and Sightlines on a dashboard first.
- 0:52–1:21: the coach should know what they want to do and what each tool does
  before opening it. Short descriptions matter more than more numbers.
- 1:26–1:38: make the first experience easy to follow and let the coach choose.

Implemented: Home after backup/format for an empty sheet; four explained tool
cards; current-sheet continuation; loaded schedule context; Reports and backups.
The existing five tool tabs remain direct. Home beside the event name is a
consistent return path on phone and tablet without squeezing a sixth tab into
the phone bar. No automatic tutorial or invented metrics. Active match sign-in
and reload resume the screen already in use.

Claude's separate preview/audit changes are preserved. This branch starts from
main c857c5738f7af4580c61d477e3e5c8c96d1ce04e and does not replace Claude's
branch or publish its previews. Synchronization requires bringing the reviewed
PRs together, rebuilding all artifacts from one commit, and comparing hashes;
a matching prompt alone is not proof that the apps match.

## Account follows the coach

Second source: https://app.heypocket.com/app/share/wrHsHQt1
Pocket title: Syncing Data Across Devices, recording
`ac9b8e36-2fe8-4375-8828-fcc03efdaaf9` (0:08–0:38).
The requirement is the same saved team, codes and season on laptop, tablet and
phone after signing into the same account, rather than data stranded on one device.

Existing PR #326 (`codex/account-device-sync`) implements this handoff and is
still open. Continue that PR; do not duplicate it or claim it is already live.
Its contract is Save here → Sign in there → Use my saved season. The account id,
not a typed display name or team code, owns the server copy. Preserve the
opt-in disclosure, offline local saves, confirmed upload status, recovery copies,
revision checks and explicit conflict choices. Codes must travel with the season.
This is not live concurrent editing: two devices with unshared changes must
resolve the conflict rather than silently overwrite a coach's work.

The Home PR does not enable cloud services or alter access. Validate #326
together with Home and Claude's audit branch before release; record the common
source commit, rebuilt artifact hashes and a test-account cross-device handoff.

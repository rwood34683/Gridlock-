# Gridlock recording notes — 11 November 2026

These notes use the three shared transcripts, not just Pocket's generated
summaries. Times refer to the recording. Unrelated personal conversation is
omitted. Suggestions in a recording are not proof that a feature is shipped,
an account permission, or a final pricing decision.

## 1. Gridlock App Launch Marketing

Source: https://app.heypocket.com/app/share/A5TylTYh

- **15:22–16:47:** Show actual screens and a short coaching workflow in launch
  videos and social posts. Demonstrate choosing the team, checking the day,
  scouting, logging a point and reviewing it. Keep the tutorial optional.
- **16:45:** A new coach needs a short explanation of how to use the app,
  rather than a long feature list.
- **17:48:** The schedule and knowing when to scout the next opponent were
  especially useful in the booth demonstration. Put those tasks first.
- **18:05–18:36:** Selected industry contacts could try the app and give
  feedback. Complimentary access and outreach need a separate owner decision;
  this recording does not grant admin access or authorize sending invitations.
- **22:10–22:52:** Discussed a free Player app with a separate paid practice
  feature: keep drills, progress and sharing with a coach together. A roughly
  $10 price was discussed; the billing period was unclear and is not approved.

Product implication: show a useful game-day loop, make the schedule easy to
find, and demonstrate it with recorded data. Proposed release dates in this
conversation are not a verified release schedule.

## 2. Coaching App Pricing and Features

Source: https://app.heypocket.com/app/share/PV286cqX

- **2:23–2:43:** A short coaching-hub tutorial should teach the real workflow.
- **5:50:** Quick player observations should cover what the observer actually
  saw, including alive/dead and shooting. Unknown stays unknown.
- **17:05–20:44:** Tally and Scout must not start against a team the coach did
  not select. The owner's later explicit choice is blank on first use/new
  match, while an active match resumes regardless of its age. Saved sheets stay.
- **21:38–21:48:** Keep the secondary UPRA branding out of the main task flow;
  retain the existing powered-by identity.
- **26:27–27:10:** Standing and kneeling matter to sightlines. A stance cannot
  be added with guessed bunker or eye heights; current standing-only evidence
  and the unresolved heights remain in docs/SIGHTLINES-HEIGHTS.md.
- **29:04–33:10:** Discussed $20/day, $200/year, Standard/Unlimited and possibly
  two coach seats per team. These are proposals, not replacements for the
  approved $19.97 one-account pass ending at midnight America/New_York, with
  no automatic renewal. Team limits, seat ownership and annual pricing remain
  undecided. Do not change billing from these notes.
- **33:19–35:11:** Players may scout; team owners, coaches and scouts need
  different permissions. Team admin must never imply platform administrator.
- **35:22–36:25:** Two field-side observers need clear team/end assignments
  when sides switch. The Coach split-deck choice remains our match plus a
  waiting/next-up view, not management of both matches.
- **36:25–37:53:** Staff should eventually share point data and confirm what
  happened. A proposed future review state is awaiting confirmation / confirmed /
  needs review. It must not block ordinary coach logging or claim referee
  authority. Real membership, authorization, conflict handling and an explicit
  confirmation are required; an entered team code is not sufficient.

## 3. Scout App Session Logging Discussion

Source: https://app.heypocket.com/app/share/Q3IrvEk0

The title says Scout, but the described Log session screen is the separate
Player preview's Practice screen, not the Coach match-point sheet.

- **0:12–0:50, 2:02–3:21:** The result box is unclear: is its number a session
  number, or the drill result? Enter the result directly (for example, 1 hit out
  of 10), number sessions automatically, and show the graph immediately after
  saving. Notes must not be needed to calculate the result.
- **3:29–4:11:** Starting over should give a fresh progress view without
  silently erasing earlier sessions. Preserve history and make the reset's
  effect explicit. A local history is not a tamper-proof audit.
- **1:16–1:59, 4:15–5:01:** A player's own entries need clear provenance.
  Self-reported practice is useful for personal progress; joining a team does
  not turn it into verified performance. The transcript calls earlier entries
  "void" for team reporting, not a request to delete personal history.
- **4:17–5:01:** Coach visibility should eventually follow a real team
  relationship. Today the preview is offline: sharing is a manual copy the
  player chooses to send. Do not imply automatic sharing or verified membership.
- **5:20–5:32:** Keep the experience understandable for lower-division teams.
- **6:28–6:58:** Team selection and the Tally/Scout distinction must be clear.
  Preserve the Coach rule: Tally for our match, Scout for observing other teams.
- **7:58:** "A311" is mentioned without enough context to identify a repository
  revision. It is not used as a source commit.

## Implementation and existing work

Checked against main c857c5738f7af4580c61d477e3e5c8c96d1ce04e and Claude's
preview branch 5ea3ccdb2f922fab5324b27d4c30a93838420158. Status is as of this
review; an open PR is not a deployed feature.

During implementation Claude added three audit commits, ending at
44e120267e230f1d5ceb206ab80faaed9b7be03a. They are preserved in this review
branch: schedule/report corrections, safe blank-sheet and observation handling,
and separate Player/Team storage and backups. Only the overlapping manual-share
sentence was reconciled, retaining its meaning and adding the self-report label.

| Need | Where it stands |
| --- | --- |
| Team schedule and when to scout | Already in Coach: Your team's day, Play and scout by the clock, Before you play them. CLAUDE.md items 63, 75 and 80. |
| Optional introduction | Coach already has Show me how it works. Marketing recording/video remains an owner task, not an auto-opening tutorial. |
| Quick player status and counted percentages | Main includes PRs #330, #331 and #333. Current status, unknowns and overlapping observations remain separate. |
| Blank first use/new match; resume active | On Claude's preview branch, item 86; preserved by this follow-up. Not claimed deployed. |
| Same account across devices | Existing PR #326; do not duplicate its opt-in and conflict protections. |
| Coach split-deck waiting/next-up | Existing PR #327; shared field-staff operation is separate future work. |
| Voice recap on the right point | Existing PR #328; it does not provide a shared live microphone or team-code permissions. |
| Daily bunker tables and heat maps | Existing PR #329; actual logged counts, separate went-there/shot-there views. |
| Verified day-pass purchases | Draft PR #325. Live checkout verification and owner rollout actions remain; no launch claim here. |
| Practice session entry, chart and history | This follow-up fixes the separate Player preview only. No Coach season keys or live services change. |
| Shared staff roles and coach-verified practice | Not implemented. Needs authenticated team membership, explicit sharing, record ownership, review provenance and conflict/revocation tests. |

## Scope of this follow-up

- Clear result/unit labels, fixed drill denominators and counted percentages.
- Automatic session numbers and an immediate chart after a successful save.
- Reject impossible results and invalid dates; never say Saved after a refused
  storage write.
- Start a fresh chart without deleting earlier sessions. Earlier results stay
  visible and in the full backup and manual practice share.
- Say self-reported and explain manual sharing. No fabricated coach approval,
  membership validation, live sync, permissions, pricing or purchase changes.
- Test the real controls on phone and tablet, storage failures, reload, charts,
  sharing and history retention. Keep existing tests and limits intact.

The Player preview changes are a small PR into Claude's preview branch,
continuing the independent preview review. That branch already contains main
and the separate apps. Rebuilding those apps in a second PR to main would
duplicate Claude's work. Merge/release decisions remain with the owner.

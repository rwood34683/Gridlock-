# GRIDLOCK System — Overskill build prompt
**GRIDLOCK System · powered by UPRA · Coach Edition**

Copy everything below this line into Overskill as the product description.

---

## What to build

Build **GRIDLOCK**, a professional paintball coaching and league-ops app.

This is not a cartoon game. It is a sideline tool a coach uses on an iPhone or iPad during a point: call the break, direct five players, log who went out, scout the other team, name bunkers, run a clinic, and (for league staff) blast updates to Ops / Refs / Registration / Vendors.

Tone: dark, stadium-night, gold accents, chalk-white type, field green. Clean and professional. Never cartoony.

Brand lockup:
- Product name: **GRIDLOCK**
- Line under the name: **SYSTEM**
- Edition: **COACH EDITION**
- Tagline: **Call the break. Direct the five. Own the point.**
- Footer: **GRIDLOCK System · powered by UPRA**
- Training-aid disclaimer on Playbook and Scout: officials govern the live call. Heuristic reads are not predictions.

Do **not** use the word “GunzUp” anywhere in the product, code, or copy. Call that feature **Shot lanes**.

---

## Who uses it (roles)

Use Overskill built-in sign-in (email + Google + Apple). Add a role field on the user.

1. **Guest** — can look around, run the tutorial, and **join a class** with a code. Cannot create classes or send league blasts.
2. **Staff / Coach** — signed-in coach. Owns playbook, tally, scout, roster, classes they create, bunker names.
3. **League admin** — staff who can also manage League groups and send blasts. Same login; admin tools live under League.
4. **Participant** — a player filling a class form. No account required.

First screen is a **promo**, never the tutorial.

Promo options:
- Staff — create account
- Staff — log in
- Tutorial
- Continue as guest

After they enter the app, every tab can show a small first-time popup that explains what that control does and why. Remember “don’t show this tip again” per control.

Staff login is required to:
- Create a class (code + QR)
- Open League admin (groups + blasts)

Joining a class does **not** require login.

---

## Platforms and layout

- Phone: bottom tabs — Playbook, Tally, Scout, Sightlines, More.
- Tablet / large screen: side rail with the same destinations.
- More contains: Walk, Lineups, Movement, Assess, Codes, Bunker stats, Team, Messages, Classes, League, Nexus (device / events / settings).
- Dark navy background (`#0b1220`), panel cards, gold (`#f0c14b`) primary buttons, red left-team paths, blue right-team paths.

---

## Shared field (used in many tabs)

A top-down paintball field, not a golf course.

- Grid turf, bunker footprints that look like real inflatable shapes (dorito triangles, cans, temples, wedges, snake, bricks) — more “shapey,” not circles only.
- Labels: **DORITO SIDE** at the top of the field, **SNAKE SIDE** at the bottom.
- Official-style bunker codes on the layout (MD, MW, GP, T, Br, C, Tr, etc.).
- Teams and players can **rename bunkers**. Those names overlay the official codes on the canvas.
- Changing the **event** changes the **layout everywhere** (Playbook, Tally, Scout, Sightlines, Walk, Movement, bunker stats).
- Seed at least one full layout: **NXL Tampa Bay Open / Cincinnati-style** bunker map. Allow more layouts later (regional events).

Player motion:
- Five players per side.
- Each player has a unique path for the selected layout + selected break (script).
- Paths start on the start line and plant on a bunker.
- Staggered delays (buzzer, then snake runner first, support later).
- Ease-out interpolation. Optional **Smooth** (Catmull–Rom) chip.
- Endpoints stay exact.
- Face chevron and shot cone travel **with** the player along the path. They do not jump to the plant until the player arrives.
- Customize mode: drag the path end-handle, drag the gold aim tip, **Erase path**, **Reset all**.
- **Play path / Play break** restarts all five from the buzzer.

Directional facing and shooting (Playbook — Direct your players):
- Per player: Face on/off, Shot on/off, Primary | Secondary position (P|S), zone.
- When Face is tapped, an **8-way pad** appears: ↖ ↑ ↗ ← → ↙ ↓ ↘ (forward, back, left, right, diagonals, back-left, back-right).
- Shot can target a **lane, zone, or named bunker** — not only an arrow.
- Live overlay on the field.

---

## Tab-by-tab product

### 1. Playbook (home for coaches)

Purpose: call this point.

Flow: 1. Pick the field / event. 2. Pick the break. 3. Direct the five. 4. Log it.

Event banner at top shows current event + layout key (example: NXL Tampa Bay Open · TBO). Tapping it changes event; the layout updates on every tab.

Toolbar (same chips, left to right):
1. **★ Active set** — current live break + aggression read.
2. **▶ Script** — opening script. Step the first breaks you pre-called from scouting.
3. **⇄ Counter** — the answer to the opponent’s likely break.
4. **◆ Roles** — tag each player’s job (feeds face / shot / P|S / zone).
5. **Cards** — assignment cards you can read off or share: “here’s your job.”
6. **Opp** — opponent library. “They run X → we run Y.”
7. **⚡ Rep** — recognition drill. Run the current break at the coach until the call is instant (target under 2 seconds).
8. **✓ Log break** — log what you actually called. Feeds self-scout predictability later.

Also on Playbook (not always a toolbar chip): Customize paths, Play / Pause path, Smooth, Erase, Name bunkers.

Scripts / breaks to seed:
Hold & Read, Balanced Break, Snake Stack, Dorito Flood, Conservative, Counter Break, Wire Split, Tower / Center, Clean / Lane Trade, Contain Both Wires, Lock the Lanes, Blitz.

Each break has unique paths on the current layout (not one generic animation).

### 2. Tally

Sideline sheet for who went out.

Per point:
- Point number
- Your five + their five
- Out / alive
- How they went out (shot, moved-into, etc.)
- Optional: **shot at** bunker, **moved to** bunker
- That bunker traffic feeds Bunker stats

Keep it fast to tap with gloves. Big targets. Dark sheet look.

### 3. Scout

This tab must match a dual-pit matchup board.

**Top: two opponent cards**
- Left pit and right pit.
- Team name + points (example: Blast Camp US 200 pts / Rejects US 186 pts).
- Dropdown to pick the team.
- Label: OPPONENT (LEFT) / OPPONENT (RIGHT).
- **TENDENCY (YOUR FILM READ):** Snake · Balanced · Dorito.
- **THREAT (SEEDED):** 1–5 stars, tap to set.
- **NOTES:** break tendencies, key players, snake runner, weaknesses.

**Field under the cards**
- Same layout as Playbook.
- Red paths = left team, blue paths = right team.
- Role numbers on players.
- Gunfight rings and X = out.
- Legend: left team · right team · gunfight · out.
- Controls: **Roles: on/off** · **Play break** · **Shot lanes: on/off** · **How to anticipate** menu.

**Sub-tabs**
- Matchup & Sim
- Breakouts
- Historical layers
- Games & replay

**Matchup & Sim**
- Win% bar (red left / blue right), example Blast Camp 44% vs Rejects 56%.
- Plan-read sentence. Label it a **heuristic / training aid, not a prediction.**
- Wire chips (Snake front / Snake / Center-50 / Dorito).
- Ref note.
- Sample point sentence.
- **Who goes where** columns for both teams (1–5 and 6–10 with jobs like snake MW, GP, MT 50, C lane, MD hold).
- **Anticipate cards** per team: Likely · Tells at the line · Your counter.
- **Counter-picker:** “If you’re LEFT vs RIGHT’s likely SNAKE break.”
  - Match state chips: Ahead · Even · Must-score.
  - Ranked list of breaks with aggression dots and win%.
  - Safer breaks rise when Ahead; aggressive breaks rise when Must-score.
  - Copy matchup card button.

**Division scout board**
- Division picker (seed: CIN · Semi-Pro X-Ball).
- Search team.
- Columns: # · TEAM · REG (PAID / PEND) · FILM · TENDENCY (S / Bal / D) · THREAT stars.
- Tap a row → load right pit. Long-press → load left pit.
- Seed teams including: Beefy Boys, Blast Camp, Brooklyn Wolfpack, Clutch City Oilers, Distortion Immortals, Hurricanes SP, KC Missouri Allstars, Las Vegas Shock, Legacy Factory, Louisville Asylum, Malicious, Miami Effect, New Jersey Filthy, Rejects.

### 4. Sightlines

Pick a bunker. Draw clear shot lines that do **not** pass through bunker footprints (circle + polygon blocking). Coach uses this on the walk.

### 5. Walk

Field-walk notes tied to the current layout. Short notes per bunker or wire.

### 6. Lineups

Who is on this point. Five slots. Primary and secondary positions.

### 7. Movement

Bunker-to-bunker moves after the break (who rotated where). Feeds bunker visit stats.

### 8. Assess

Grade a player after a point or game: name, score, notes. Stays with the roster.

### 9. Codes

Team code words for the event. Short list. Fast to add.

### 10. Bunker stats

From tally + movement + calls:
- Visits
- Shots
- Holds
- Eliminations
Heat overlay on the field. Filter by layout.

### 11. Team

Roster: name, number, P position, S position, notes.
Team join code.
**Bunker calls** for this team on the current layout (team name + per-player nicknames). Show a mini field so they see which bunker they are naming.

### 12. Messages

Squad notes for the active team. Coach messages stay with the team.

### 13. Classes (clinics)

Staff creates a class:
- Title, notes, start time
- Unique join code like **GL-7K2M**
- QR for `gridlock://class/GL-XXXX` and a web link `?c=GL-XXXX`
- Open / close forms
- Share sheet

Participants (no account):
- Classes → Join class → enter code
- Form: full name, phone or email (optional), experience (New / Rec / Division / Pro-semi), preferred wire (Snake / Dorito / Center / Flex / Back), notes, checkbox “training sign-in form”
- Submit

Staff sees the response list under that class.

Offline rule if no cloud yet: forms live with the device that created the class. With Overskill database, store Class and ClassResponse tables so any signed-in staff on that league can see them.

### 14. League (admin only)

Default groups: **Ops, Refs, Registration, Vendors**.
Admin can:
- Add a group
- Delete a group
- Open a group
- Add member (name, phone, optional role note)
- Delete member

**Text / notification blast**
- Pick one or more groups
- Write the update
- Send
- Recipients = unique members with a phone or email

Use Overskill built-ins:
- Push notification to members who have the app
- Email to members with email
- Also offer **Open phone Messages** with the phone list + body prefilled (native SMS)

Log every blast: body, groups, recipient count, time, staff name.

This is not a spam tool. Show a one-line note: only message people who agreed to league ops texts.

### 15. Nexus

Device + events:
- Active layout / event list
- Optional HTTPS event feed URL (blank = offline seed events)
- Staff sign out
- Show tutorial again (remember their last “don’t show” answers)
- Privacy / export note

---

## Data tables (let Overskill create these)

- User (email, role: guest|staff|admin, displayName)
- Team (code, name)
- Player (name, number, primaryPosition, secondaryPosition, notes, teamId, optional photo URL, optional public league player id)
- Play / Script log
- Message
- AssessmentEntry
- TallyEntry (point, player, out, shotAtBunker, movedToBunker, layoutKey)
- ScoutEntry (team, layout, breakName, notes)
- ScoutTeamProfile (name, points, region, filmCount, tendency, threat, notes) for the division board
- BunkerCall (layoutKey, bunkerId, teamName, playerNames)
- ClassSession (joinCode, title, detail, startsAt, isOpen, staffId)
- ClassResponse (sessionId, name, contact, experience, preferredWire, notes, agreed)
- LeagueGroup (name)
- LeagueMember (groupId, name, phone, email, roleNote)
- LeagueBlast (body, groupNames, recipientCount, staffId)
- PathEdit (layoutKey, scriptId, playerId, from, to, via, aim, faceDeg)
- Event (name, layoutKey, date)

---

## Seed content

- Promo copy and logo lockup above.
- One complete bunker layout (Tampa Bay Open / Cincinnati footprints) with official names.
- Break catalog listed in Playbook.
- CIN Semi-Pro scout board teams listed in Scout.
- League groups: Ops, Refs, Registration, Vendors.
- Demo class is optional; do not auto-open tutorial.

---

## Built-in Overskill pieces to use (do not reinvent)

- Sign-in: email, Google, Apple
- Database tables above
- File / image upload for player photos later
- Email send for class confirmations and league blasts
- Push notifications for league blasts
- Payments later (Coach vs League plan). For v1 ship the product free-to-use with a visible “GRIDLOCK System · powered by UPRA” mark. Add a simple paid flag on Team later if needed (Paid / Pending like the scout board REG column).

---

## What good looks like

- A coach can open Playbook, pick TBO, tap Script, watch five unique paths run, turn on Face for player 1, pick ↗ on the 8-way pad, aim the shot at a bunker, and log the break in under a minute.
- A coach can open Scout, set Blast Camp vs Rejects, mark Balanced vs Snake, tap Play break, read the anticipate cards, pick Even, and copy the matchup card.
- A clinic host can create “Friday clinic,” share GL-XXXX / QR, and see sign-in forms.
- A league admin can add refs to Refs, type “Pit gate opens 8:00,” blast Ops + Refs, and see the log.

---

## What not to build

- No cartoon players, no golf-course turf.
- No auto-start tutorial on launch.
- No requiring an account to join a class.
- No cloud-only dead ends: if a network call fails, keep last local data.
- Do not invent live official scores. Seed data is a training aid.
- Do not scrape or display copyrighted player photos unless the user uploads them. Use initials + jersey color until a photo is attached.
- Never print or say the banned feature name; the control is **Shot lanes**.

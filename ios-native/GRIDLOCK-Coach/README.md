# GRIDLOCK · Coach Edition (iOS) v1

Native SwiftUI + SwiftData port of the GRIDLOCK coach web app (powered by UPRA).

Training aid for tournament paintball coaches: playbook on real event layouts, team roster + codes, messages, tally, scout, assessment, sightlines, and field walk.

**Not affiliated with any league or event series.** Official rulebook and on-field officials govern every live call.

---

## Xcode setup

1. **File → New → Project → iOS → App**
   - Product Name: `GRIDLOCK` (or `Gridlock Coach`)
   - Interface: **SwiftUI** · Language: **Swift**
   - Storage: None (we bring SwiftData)

2. **Delete** template `ContentView.swift` and `*App.swift`

3. Drag every file from this `GRIDLOCK-Coach` folder into the project:
   - ✅ Copy items if needed
   - ✅ Create groups
   - ✅ Add to app target

4. Confirm **Target Membership** on all `.swift` files (only one `@main`: `GRIDLOCKApp.swift`)

5. **General → Minimum Deployments → iOS 17.0+** (18.x is fine)

6. Supported destinations: **iPhone** and **iPad**

7. **Product → Clean Build Folder** → **Build** → **Run**

### Common errors

| Error | Fix |
|-------|-----|
| Undefined symbol `_main` | Template App still present or `GRIDLOCKApp.swift` not in target |
| Invalid redeclaration | Duplicate files nested under a folder — remove nested copies |
| PersistentModel / Identifiable actor errors | Do **not** add `extension Team: Identifiable` etc. on `@Model` types |
| Red errors after paste | Clean Build Folder |

---

## v1 feature set (Coach edition)

| Tab | What works |
|-----|------------|
| **Playbook** | Cincinnati field with real bunker shapes, Situation (Up/Even/Down/Must-win), break scripts, role directives (face/shot/P/S), log break |
| **Tally** | Point events (elim, penalty, bunker, alive…) persisted in SwiftData |
| **Scout** | Opponent break log on layout |
| **Sightlines** | Field map (ray-cast math in later build) |
| **Walk** | Field map + GunzUp link |
| **Lineups** | 5-slot lineup builder (roster-aware) |
| **Movement** | From→to bunker movement log |
| **Assess** | Player scores over time |
| **Codes** | Team call catalog (HTML seed categories + editable) |
| **Team** | Create team, share code, roster |
| **Messages** | Coach ↔ team messages |
| **Nexus** | Edition / offline status |

**iPhone:** bottom tabs · **iPad:** sidebar + detail

---

## Architecture

- `GRIDLOCKApp.swift` — `@main`, SwiftData container
- `AppState.swift` — `@Observable` session state
- `Models.swift` — Team, Player, Play, Message, AssessmentEntry, TallyEntry, ScoutEntry + Bunker/FieldLayout
- `Theme.swift` — dark palette (`gl*` / `grid*`)
- `Views/` — one file per tab + adaptive `ContentView` + shared `FieldCanvasView.swift` (bunker map)

---

## Next builds

- Break animation paths on field canvas
- Sightline ray-cast from bunker polygons
- Lineup clocks (250ms tick parity)
- Full RAW bunker sets for SEF / TEX / EUR
- Player edition companion


## Resilience (event-day)

- `Resilience.swift` — `GridlockAgent` bootstraps SwiftData with automatic repair (wipe corrupt store → rebuild → memory fallback). Never crash-loops on launch.
- Safe saves with rollback on failure.
- UI list caps for tally/scout/messages/assess under long events.
- **Nexus → Run load test** inserts 50 synthetic points to pressure the store on a test device.

### 10k downloads

Architecture is offline-first per device. 10k coaches do not hit a shared write path. Scale risk is App Store / CDN delivery and device-side storage growth — not a central API. Keep network features (Nexus sync, tickets) optional and behind explicit user action when added.


## Event catalog (world events)

GRIDLOCK does **not** scrape PBLeagues from every phone.

1. A **server-side** job (daily, rate-limited, identifiable User-Agent) reads **public** event listing pages / calendars.
2. It publishes `events.json` to a CDN (see `events.sample.json`).
3. The app calls `EventFeedService.refresh()` → layout picker shows upcoming events.

**Important:** PBLeagues pages list **registration metadata** (name, dates, city). They do **not** publish bunker coordinates. Layout maps still come from independent field drawings (NXL schematics, GunzUp, etc.) linked via `layoutKey` when known.

Set `EventFeedService.feedURL` to your real HTTPS endpoint before production.

Respect `robots.txt` Content-Signals (`search=yes`, `ai-train=no`). Prefer a partnership or licensed data deal with PBLeagues for commercial scale.


### Coach-submitted events

Layout picker → **Add event** stores events on-device (`gridlock_coach_events.json`). Merged with seed + optional remote feed. Swipe to delete. No third-party scraping.

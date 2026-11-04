# The NXL World Cup field

Status on 4 November 2026: **the field is in the app** as `nwc`, "NXL World Cup ·
Kissimmee", measured off the official labeled 2D NXL published that day (the
maps print 11–15 Nov 2026, Kissimmee FL). `docs/LAYOUTS.md` › "How the NXL World
Cup was digitized" has the method and the mirror check. What follows is the
runbook it was added by, kept for the record.

## What is ready now

- **The schedule.** All 78 World Cup games read so far are in the app (More ›
  Schedule), keyed to the field `nwc`.
  - Until `nwc` exists, a game opens on the field the coach is on, and the app
    says so: "The NXL World Cup field is not in the app yet, so this sheet is on
    …".
  - Once `nwc` is in `LAYOUTS`, every World Cup game opens on it with no other
    change. The calendar then shows the event days.
- **The event file.** `layouts/events/nxl_2026_world_cup.json` carries the
  dates from the schedule.
- **The method.** The pipeline that measured the Lone Star Open
  (`tools/digitize_lonestar.py`, `tools/emit_lonestar.py`) reads an official
  NXL labeled 2D on its printed 10-ft grid. NXL prints the World Cup map in the
  same style.

## What to send

Send these as soon as NXL posts them, as files rather than screenshots where
possible:

1. **The official labeled 2D.** This is the top-down map with bunker names on
   it. It is the one that is required.
2. The unlabeled 2D, if there is one. It is used to check the paint colours.
3. Any 3D renders. They confirm which way the doritos and giant pluses face.

## Adding it (about half a day once the map is here)

1. Save the map as `layouts/images/nxl_2026_worldcup_2d_labeled.jpg`. Record
   where and when it was read in the event file's `sources`.
2. Make `tools/digitize_worldcup.py` from `tools/digitize_lonestar.py`. Change:
   - the source image;
   - the four printed grid corners (`X0, X1, Y0, Y1`), measured off this image;
   - the table that says which measured blob carries which printed label.

   Run it. The mirror check must come back tight, as Lone Star's did (27 pairs,
   sd 0.27 ft). A loose check means a bunker was misread.
3. Make `tools/emit_worldcup.py` from `tools/emit_lonestar.py`. Run it to write
   the bunkers into the event file and the app's `NWC` block.
4. Add the field to `LAYOUTS` in `web/index.html` with:
   - `key: "nwc"`;
   - `when` and `days: ["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]`;
   - a `source` line naming the official map.
5. Add `["nwc", "nxl_2026_world_cup.json"]` to `tools/plants.js`. Then run
   `node tools/plants.js --write`. Never hand-edit `BREAK_PLANTS`.
6. Run `node tools/verify_bunkers.js` and `npm run check`. Take a screenshot of
   the field on a phone and on an iPad. A green suite is not proof the field
   looks right.
7. Commit and open a PR. Once it is merged:
   - deploy the web app;
   - run `npm run sync` for the phone apps;
   - rebuild the Claude preview as described in `docs/PREVIEW.md`.

## If a coach needs it before the update lands

On the phone: More › Nexus › Events › **Build a field**, with the event's map
put under it. Sizes still come from the bunker book. Each bunker's colour is
read off the map, and the field says it was placed by eye.

Sheets charted on a built field stay on that field. A built field is a separate
`my:` field, so the schedule's games do not open on it. Those sheets do not move
onto the measured World Cup field when it lands.

## Timing to plan around

- The web app at app.gridlockpb.com updates as soon as it is deployed.
- The App Store and Google Play builds need store review. Allow for that if
  coaches will use the installed app at the event.

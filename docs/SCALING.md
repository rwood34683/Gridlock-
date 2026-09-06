# Scaling and load

## There is no server

The app makes **zero network calls**. Everything lives in `localStorage` on the
device, and both store builds bundle `web/` into the binary. You can verify it:

```bash
grep -nE "fetch\(|XMLHttpRequest|WebSocket|https?://" web/index.html
```

So 10,000 downloads costs nothing in backend load, because there is no backend.
There is nothing to rate-limit, nothing to autoscale, and no database to shard.
The only thing 10,000 downloads touches is the App Store and Play CDN, which
Apple and Google run.

What *can* fall over is the device. That is what the harness measures.

## Running it

```bash
npm run serve      # terminal 1
npm run loadtest   # terminal 2
```

The harness throttles the CPU 4x — roughly a mid-range Android phone, not a
laptop — then seeds a **full competitive season** and measures the app under it:

| Seeded | Volume |
|---|---|
| Points tallied | 400 (about eight events) |
| Clinic sign-ins | 600 across 12 classes |
| League members | 300 across four groups |
| Ops blasts | 500 |
| Squad messages | 800 |
| Logged rotations | 1200 (about three a point) |
| Player grades | 500 |
| Directed players | all five on all five breaks |
| Named bunkers | 20 |

## Results

Measured on a 4x-throttled CPU with the season above loaded:

| Measurement | Value | Budget |
|---|---|---|
| Cold start to interactive | 106 ms | < 1000 ms |
| A full season in storage | 389 KB | — |
| Share of the 5 MB quota | 7.6 % | < 60 % |
| Render Playbook (p95) | 49 ms | < 100 ms |
| Render Tally (p95) | 34 ms | < 100 ms |
| Render Scout (p95) | 32 ms | < 100 ms |
| Render Sightlines (p95) | 40 ms | < 100 ms |
| Render Movement (p95) | 40 ms | < 250 ms |
| Render Assess (p95) | 28 ms | < 250 ms |
| Render Bunker stats (p95) | 40 ms | < 250 ms |
| Render division board (p95) | 37 ms | < 150 ms |
| Break animation, mean frame | 16.9 ms | < 22 ms |
| Break animation, worst frame | 29 ms | < 60 ms |
| 120 sideline taps, p50 / p95 | 29 / 36 ms | < 80 / 200 ms |
| JS heap after a full match | 3 MB | < 120 MB |
| localStorage headroom left | 4.5 MB | > 2 MB |

Everything sits inside budget with a wide margin. A season of real use fills
under 5% of the storage quota, so a coach would have to log roughly twenty
seasons before running out.

### What the harness has actually caught

**A full `render()` on every animation frame.** `playPath()` rebuilt the whole
document — division table included — sixty times a second. It now repaints only
the field SVGs (`paintField()`).

| Per frame | Mean | p95 | Ceiling |
|---|---|---|---|
| Full `render()` | 11.1 ms | 16.3 ms | 90 fps |
| `paintField()` | 5.2 ms | 6.8 ms | 193 fps |

2.1x cheaper — and more importantly, replacing `innerHTML` sixty times a second
destroyed scroll position and input focus while a break was playing.

**Bunker pickers on every row of the tally log.** Adding the optional shot-at
and moved-to fields put two selects on all 40 visible rows, each holding all 58
bunkers of the layout — about 4,600 option nodes on every repaint. Tally's p95
went to **265 ms** and the harness failed it. The pickers now render only on the
point you are actually on, which is both faster and safer (you cannot nudge an
old point's sheet by accident):

| | Before | After |
|---|---|---|
| Render Tally, p95 | 265 ms | 34 ms |
| 120 sideline taps, wall clock | 19 s | 8 s |
| Break animation, worst frame | 71 ms | 29 ms |

Worth noting that one fix moved three unrelated numbers — the option nodes were
being rebuilt on every state change, not just on Tally.

## What to load test when a backend does exist

Nothing above tells you anything about server capacity, because there is no
server. The moment one is added — the spec wants Classes and League to sync
across devices — these become the real questions:

- **Class join is the spike.** A clinic host shares one code and 50 people hit
  the same endpoint inside a minute. That is the burst shape to test, not
  steady RPS.
- **League blasts fan out.** One tap can mean 300 push notifications plus 300
  emails. Test the provider's rate limits, not yours.
- **Scout reads are hot, writes are rare.** The division board is the same
  payload for everybody at an event — cache it hard.
- **Everything else stays local.** Playbook, Tally, Sightlines and Walk have no
  reason to touch a network. Keep them offline-first; a sideline has no signal.

## Known limits today

- **Nothing syncs.** A class created on one phone is invisible on another, and
  the staff password lives in `localStorage` in plain text. Fine for a local
  demo, not fine once two people need the same data. This is the reason to add
  a backend, not performance.
- **`localStorage` is synchronous.** At 245 KB a season the write cost is
  invisible; if the schema grows an order of magnitude, move to IndexedDB.
- **No data is ever pruned.** Nothing deletes old points or blasts. Add
  retention before a multi-season team hits the quota.

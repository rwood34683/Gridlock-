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

## Results

Measured on a 4x-throttled CPU with the season above loaded:

| Measurement | Value | Budget |
|---|---|---|
| Cold start to interactive | 108 ms | < 1000 ms |
| A full season in storage | 245 KB | — |
| Share of the 5 MB quota | 4.8 % | < 60 % |
| Render Playbook (p95) | 33 ms | < 100 ms |
| Render Tally (p95) | 49 ms | < 100 ms |
| Render Scout (p95) | 36 ms | < 100 ms |
| Render Sightlines (p95) | 37 ms | < 100 ms |
| Render division board (p95) | 44 ms | < 150 ms |
| Break animation, mean frame | 18.6 ms | < 22 ms |
| Break animation, worst frame | 41 ms | < 60 ms |
| 120 sideline taps, p50 / p95 | 27 / 34 ms | < 80 / 200 ms |
| JS heap after a full match | 2 MB | < 120 MB |
| localStorage headroom left | 4.75 MB | > 2 MB |

Everything sits inside budget with a wide margin. A season of real use fills
under 5% of the storage quota, so a coach would have to log roughly twenty
seasons before running out.

### The one thing that was actually slow

`playPath()` used to call `render()` on every animation frame, which rebuilt the
entire document — division table included — sixty times a second. It now
repaints only the field SVGs (`paintField()`).

Measured on Scout with the division board open, 4x throttle:

| Per frame | Mean | p95 | Ceiling |
|---|---|---|---|
| Full `render()` | 11.1 ms | 16.3 ms | 90 fps |
| `paintField()` | 5.2 ms | 6.8 ms | 193 fps |

2.1x cheaper — and more importantly, replacing `innerHTML` sixty times a second
destroyed scroll position and input focus while a break was playing. It doesn't
any more.

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

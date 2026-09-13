# The paywall

What is built, what is not, and the exact steps to switch it on.

## Where it stands

The gate is **built, tested and off.** `BILLING_LIVE = false` in `web/index.html`,
so `planOf()` returns `program` and nobody hits a wall. Flipping that one
constant to `true` turns the whole thing on.

Nothing else in the app needs changing to sell. What is missing is the store
plumbing underneath it — see *Switching it on*.

## What is free, forever

Everything a coach does **while a point is on**. A tool that stops working on a
Saturday is not a tool.

- Playbook — all twelve breaks on every measured field, Face, Shot, Job, Log it
- Tally — the bunker-first break chart, the point sheet, the score, and
  *Where the points come from*
- Sightlines, Walk, Movement, Bunker stats
- Team, Lineups, Codes, Messages, and every word he renames
- **Save a copy**
- The match he is on

Two of those a freemium app would normally charge for, and both are free for
the same reason — **there is no server here**:

- **Save a copy** is the only backup a season has. A wall in front of it makes
  his own data a hostage.
- **Lineups** is read mid-point, inside the loop.

## What Team adds

The between-events half.

| | |
|---|---|
| Scout | The whole opponent library — their five, the calls they run, your answer to each, Layers, the season board |
| Cards | One card a man |
| Rep | The recognition drill |
| Assess | Grade a player, and his season average |
| Every sheet | Open any match kept, not only the one in play |
| Three phones | You and two assistants |

Adding a screen to the wall is one line in `PAID`, plus a sentence in
`PAID_WHY`. A **tab** is named by its tab alone (`"scout"`), a single screen by
its `helpKey()` (`"more/assess"`), and `gateKey()` checks the exact screen
before falling back to the tab — so a new Scout sub-tab is covered the day it
ships rather than shipping open.

## Prices

| | Monthly | Season (auto-renew) |
|---|---|---|
| Free | — | — |
| Team | $14.99 | **$99** |
| Program | $49 | $399 |

Plus a **$25 event pass**, one weekend, no subscription.

Monthly is priced so the season is obviously the better buy. Paintball is
seasonal: a coach on monthly pays for eight months and cancels in November, and
half of those never come back. The season renews itself in February while he is
not thinking about it.

Apple takes **15%** under $1M/yr (Small Business Program — apply for it).

## Switching it on

### 1. App Store Connect

Create these, matching the ids the app already asks for:

| Product id | Type | Price |
|---|---|---|
| `team_season` | Auto-renewable subscription, 1 year | $99 |
| `team_month` | Auto-renewable subscription, 1 month | $14.99 |
| `event_pass` | Non-consumable | $25 |

Put `team_season` and `team_month` in **one subscription group** so a coach can
move between them without buying twice. Google Play needs the same three ids.

### 2. RevenueCat

- One project, both apps (iOS and Android) inside it.
- One **entitlement** called `team`, with all three products attached to it.
- Copy the public SDK key for each platform.

### 3. The plugin

```sh
npm i @revenuecat/purchases-capacitor
npm run sync
```

Then write the shim — it is the only new code — filling in
`window.gridlockBilling` before the app renders:

```js
window.gridlockBilling = {
  async buy(id)   { /* Purchases.purchaseStoreProduct */ return entitlementOrNull(); },
  async restore() { /* Purchases.restorePurchases   */ return entitlementOrNull(); },
};
```

Both must resolve to `{plan, exp, source}` or `null`, where `plan` is
`"free" | "team" | "program"` and `exp` is a timestamp in milliseconds (`0` for
a non-expiring purchase). The app caches whatever comes back through
`window.gridlockEntitle()`, and reads that cache offline — which is the point,
because a field has no signal. The cache is a **convenience, never evidence**:
Restore purchases asks the store, and the store is the only proof.

Call `window.gridlockEntitle()` once on launch with whatever RevenueCat already
knows, so a coach who paid last season is not asked again.

### 4. Flip it

Set `BILLING_LIVE = true`, run the suite, take the screenshots.

## Why not licence keys

There is a signed-key system (GRIDKEY2) in the other repo — ECDSA P-256, device
binding, three activations. **It cannot be the App Store paywall.** Apple's
guideline 3.1.1 requires in-app purchase to unlock features in an App Store app,
and a key sold on a website that unlocks Scout is a rejection, not a grey area.

Keys are still right for two things: selling a web build direct off your own
site, and a field or league buying seats on an invoice.

## Previewing it

More → Plan → **Show me the free plan** (staff only). It changes what is on
screen and nothing else — it buys nothing and cancels nothing. Use it to walk
the free tier before shipping, because a passing suite is not a screenshot.

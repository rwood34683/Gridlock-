# Team and Player previews

Gridlock is three separate apps:

| App | Source | State |
|---|---|---|
| **Coach** | `web/` (built into `ios/`, `android/`, `site/app.html`) | The app that ships |
| **Team** | `teasers/team/index.html` | Preview: coming soon |
| **Player** | `teasers/player/index.html` | Preview: coming soon |

The Team and Player files are the owner's standalone builds (10 Nov 2026),
kept apart from the coach app on purpose:

- Nothing in `web/`, `site/`, `ios/` or `android/` loads, links to or copies them.
- They keep their own storage keys (`gridlock_*`, with underscores), so they
  never read or write a coach's season (`gridlock.coach.*`).
- The brand build (`npm run brand`) does not touch them.

Each file has these changes from the original:

- It carries a **PREVIEW · COMING SOON** ribbon.
- It is titled *Gridlock Team · preview* or *Gridlock Player · preview*.
- The "Admin" link to a page that does not exist is removed.
- The third-party 3D field-walk button is removed, so the word is gone under
  the house rule and the button no longer opens a network link.

The landing page teases both apps in its **Coming soon** section and says
neither is available yet. `test/teasers.cjs` holds all of this.

To open one, serve this folder with `npx serve teasers` or open the file in a
browser. Before either app ships, it gets the same passes the coach app had:
house rules, copy, devices, storage safety, and Help on every screen.

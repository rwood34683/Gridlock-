# Finding tools and returning to the menu

Local browser review on 8 November 2026, starting from main `753f3ac`.
The fixtures contain a synthetic season; no live account or coach data was used.

Before this change, searching for **players**, **score**, **League sync** or
**export** returned zero tools on both 390 × 844 and 1024 × 768 screens.
Opening Reports discarded keyboard focus. Back to More returned to scroll zero,
with Reports below the visible area and no current-screen accessibility state.

After this change:

- Players finds Team (and Assess); score finds Tally; League sync finds
  Account & backups; export finds Reports.
- Main-screen shortcuts appear only during a matching search. They use the
  existing navigation and access checks. Clearing search restores the usual menu.
- Back from Reports brings its row into view and returns focus to it. A filtered
  menu keeps the query. The regression also checks 667 × 375 phone landscape.
- Navigation from a focused control moves focus to the named main area. Search
  input and same-screen feedback retain focus. Main navigation announces the
  current screen; Scout buttons expose their selected state.

`phone-search-before.png` / `phone-search-after.png` and their tablet versions
show the score search. The `*-back-*` pairs show returning from Reports.
All screenshots use the same test season and viewport before and after.

Regression coverage is in `test/ux-players.cjs`; rendering and device checks
retain their existing thresholds. This is automated browser evidence, not a
claim that a coach has completed the sideline tryout or used a screen reader.

# Optional reference only

Nothing in this folder is a required Gridlock schema.

`proposed-scout-tally-template.json` and `proposed-game-tallies.sql` were drafted on our side so a World Cup game can be joined to a team entry and a roster person. **Inspect Gridlock's existing Scout and Tally models first.** If those models already cover this, ignore these files and map into yours. If you want a starting point, use them as a reference and keep source IDs and VERIFY flags.

Do not treat empty `tallies[]` arrays as real scout data — they were not observed on film and were not invented.

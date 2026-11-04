# Device evidence

Screenshots use the repo's synthetic seed, no live account or team data.
The requested limits are unchanged: header right edge at most viewport + 1px,
running text at most 80 characters per measured line.

| Scenario | Before | After |
| --- | --- | --- |
| 402 × 874, break clock and score, Arial fallback | Staff ends at 408.27px (fails) | Last visible chip ends at 386px (passes) |
| 667 × 375, Scout, Arial fallback | Worst measured leaf is 68 characters/line | Worst measured leaf is 68 characters/line |

The Windows system-font baseline passed all 233 existing device checks. The
header failure reproduces with the generic Arial fallback; the 99-character
Scout report did not reproduce on this host. The landscape rule previously
allowed 70ch (zero-glyph units, not actual characters). Proportional text can
fit over 80 characters in that width. Reducing it to 60ch leaves a safer reading
measure. Screenshots show its narrower text blocks; the measurement threshold
was not changed. The compact clock-header rule now extends through phone
widths below 480px, rather than stopping just before the 402px Pro viewport.
It retains the existing compact-header behavior of hiding the Staff label.

Fallback screenshots (also linked in the PR):

- [Header before](before-fallback/header-clock.png), [header after](after-fallback/header-clock.png).
- [Scout before](before-fallback/scout-landscape.png), [Scout after](after-fallback/scout-landscape.png).

`before/` and `after/` also capture the unchanged device suite with this host's
system fonts. JSON beside each set records the measured geometry.

Reproduce the fallback check and screenshots with:

```powershell
node scripts/capture-layout-evidence.js docs/qa/cloud-copy/after-fallback
```

The command exits nonzero if either existing limit fails. It launches its own
local server and closes the browser/server; it never visits a live service.

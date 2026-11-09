# Bunker heights on Sightlines

Sightlines has two ways to judge a lane:

- **Every bunker blocks.** This is the default, and the flat answer every
  other screen uses: the lanes off the break, the bunker book and Walk.
- **Both standing.** Both men are on their feet, so they look along a level
  line at eye height. A bunker that stands lower than that line does not block
  the lane between them.

The rule is the one the app keeps everywhere: **never guess a number.** A
bunker kind counts as "lower than a standing man's eyes" only when two
published sources agree that it is. Every other kind blocks, as it always has.

## What two sources agree on

| What | Figure | Sources |
|---|---|---|
| Standing eye height | 1.64 m | US DoD *Anthropometric Guidelines*, male standing eye height 64.7 in ([denix.osd.mil](https://www.denix.osd.mil/ergo-wg/denix-files/sites/58/2016/04/AnthropometricGuidelines.doc)); a military anthropometry survey, standing eye height 163.6 ± 6.6 cm ([PMC7767597](https://pmc.ncbi.nlm.nih.gov/articles/PMC7767597)) |
| Snake beam (SB) | 0.76 m, under 1.64 m | The NXL Sup'Air official set lists snake beams at 10 ft × 2.5 ft × 2.5 ft ([moneypaintballglobal.com](https://moneypaintballglobal.com/product/nxl-wpbo-psp-sup-air-official-paintball-bunkers/)). A guide to inflatable bunkers puts a snake at typically under a metre high. |
| Cake (Ck) | 1.0 m, under 1.64 m | The same NXL Sup'Air set lists cakes at 5 ft × 5 ft × 3.3 ft. Yolloy lists a tall cake at 1.5 m × 1.5 m × 1.5 m ([made-in-china.com](https://yolloy.en.made-in-china.com/product/perQGvEUIZYu/China-New-Camouflage-45-Sup-Inflatable-Air-Paintball-Bunkers.html)), which is still under 1.64 m. |

`BUNKER_HEIGHT_M` in `web/index.html` holds those two kinds and
`EYE_STANDING_M` holds the eye height. `underEyes(b)` is the test.

## What does not agree, so it still blocks

| Kind | Published heights |
|---|---|
| Maya temple | 2.5 m ([max-leisure.com](https://max-leisure.com/products/maya-temple-air-bunker)); 4.5 ft (a 20-piece Sup'Air kit) |
| Small dorito | 5 ft (NXL Sup'Air set); 4.5 ft ([mightysports.com](https://mightysports.com/index.php?route=product%2Fcategory&path=77)); 5 ft 7 (AIRBUNKER) |
| Dorito | 6.6 ft (NXL set, "large"); 6 ft (Mighty, "medium"); 6 ft 11 (AIRBUNKER, "medium"); 2.1 m (Yolloy) |
| Temple | 1.5 m (Yolloy); none found from a second maker |
| Giant brick | 1.0 m (one retailer); a different maker's "Brick" is 1.25 m |
| Cylinder | 160 cm (one listing); no second figure found |
| Can, tree, wing, giant wing, giant plus, mini-W | No published height found |

## Kneeling and prone

No published kneeling or prone eye height was found. The searches turned up
standing and sitting tables only, plus one shooter's own 30 cm in a forum
post. So Sightlines offers neither, and says so on screen.

## Not checked from here

The makers' own spec sheets could not be opened from this session:
air-bunker.com, en.airmir.su, estrategopaintball.com and
moneypaintballglobal.com all fail to resolve, so the figures above are as the
search results quote them. To add a kind, put two agreeing published
heights for it in the first table and in `BUNKER_HEIGHT_M` together.
`test/sight-standing.cjs` pins the list. A kind measured on the owner's
own field, with a tape on an inflated bunker, would also count, as long as
the doc says so.

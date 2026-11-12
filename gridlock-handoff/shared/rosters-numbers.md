# Pro jersey numbers

## Coverage

- **Lone Star Open 2026 (EID 9321) Pro** — player names from local PBLeagues allowlist `/workspace/paintball/lso/rosters/pro-allowlist.json` (parsed from `showteams.cgi?EID=9321&LID=316` / per-team `roster.cgi`).
- **Jersey numbers are not published** on LSO Pro roster pages or in LSO Pro match-stat point lineups (all `jersey: null` in local JSON; sample LSO stats pages have empty point tables).
- **Numbers below** come only from public PBLeagues **2026 NXL Pro match-stat pages** that do print `#NN` next to the player:
  - Tampa Bay Open 2026 — https://mlpb.pbleagues.com/event/9198/schedule (Pro X-Ball stats)
  - Mid-Atlantic Open 2026 — https://mlpb.pbleagues.com/event/9319/schedule (Pro X-Ball stats)
- **NXL World Cup 2026 (EID 9322)** — Pro / Championship-Pro authenticated rosters are present under `/workspace/paintball/world-cup-2026/` but every `jersey_number` is null; public WC Pro roster pages show empty player tables; WC Pro match stats are not yet populated with `#` lineups (event starts 11 Nov 2026). No WC numbers listed.
- Players with no PBLeagues `#` in those stats sources are marked **`no #`**. Nothing was guessed. Leading-zero variants (`#04` / `#4`) are treated as the same number.

## Lone Star Open 2026 Pro (names) + 2026 NXL Pro match-stat numbers

### Atlanta Jungle Cats

- no # Alexander Povilaitis
- no # Michael McGowan
- #32 Ronny Tiner II
- #22 Davis Stephens
- #7 Joey Dipolito
- no # Joseph Oller III
- #8 Aaron Rios
- no # Aaron Pate

### Chicago Aftershock

- #42 Ryan Hoskinson
- #21 Jared Lackey
- no # Clayton Hughes
- #19 Joseph Rooney
- no # Gant MacLellan
- #16 Maxim Stancel
- #3 Mason Hinds
- #1 Jet Isidro
- no # Daniela Rojas Jr

### Chicago Distortion

- #47 Nate Roberts
- #23 Kevin Wenck
- #22 Jackson Blue  *(conflict also #4; using most-sourced)*
- #10 Jeren Perez
- #04 David Haber-Mattie
- #67 Michael Unger
- #7 Matthew Askren
- no # Alex D'Acquisto
- #36 Gunther Stumpf

### CK Hurricanes

- #56 Michael Brown
- no # Shon Saucedo
- #53 Kaito Warner Jr
- no # Sam Brinkman
- no # Logan Dyer
- #20 Andrew Bell
- no # Jake Raffield
- #88 Konstantin Fedorov
- #13 John Brinkman
- no # Duran Martinez
- no # Charles Dowden Vii

### Detroit Infamous

- #69 Kyle Bowen
- #2 Rob Velez
- #31 Trevor Resar
- #53 Nathan Aboulhosn
- #18 Sam Silberg
- #7 Kevin Rudulph
- #4 Dany Schonauer
- #41 Ryan Hall  *(conflict also #29; using most-sourced)*
- #88 Zack Patient
- #3 Jonah Jamroz

### Edmonton Impact

- #28 John Parrish
- #20 Brandon Cornell
- #57 Chad George
- #99 Timothy Stanczak
- #1 Justin Cornell
- #13 Nicholas Leival
- #24 Dalton Vanderbyl
- #12 Tyler Harmon
- no # Tyler Panlilio
- #23 Conner Kelley
- #10 Zachary Yachimec

### Houston Heat

- #32 Cody Mickowski
- #04 Ronnie Dizon
- #85 Ryan Moorhead
- #18 Austin Bufton
- no # Samuel Monville
- no # Connor Nelson
- #27 Andres Ramos Saldana
- #77 Mikhail Knyazev

### Los Angeles Collision

- #5 Ethan Jose Castro
- #85 Lucas Alindajao III
- #7 Jordan Boyum
- #00 Guillermo Ramirez
- no # Lucas Tamura
- #25 Evan Middleton
- #27 Daniel Park
- #2 Avery Nguyen
- #16 Vince Newell
- #23 Brandon Trujillo

### Los Angeles Ironmen

- #9 Alex Rosati Jr
- #7 Caleb Abuhl
- #22 Christopher Lennon
- #5 Henry Sentz
- #12 Cj Canter II
- #6 Jesse Stephens Jr  *(conflict also #17; using most-sourced)*
- #17 Patrick Kraft Jr
- #2 Kyle Nicholaou

### New Jersey Leverage

- #8 Christopher Sanborn
- no # Mark Meiterman
- no # Zach Moran
- no # Travis Baskin Sr
- #3 Alfred De Los Santos
- #18 Scott Graham
- no # Gilbert Sakaguchi II
- #0 Joseph Altamore Jr
- #11 Rob Altamore
- #1 Chris Caputo

### New York Xtreme

- no # Jose Navarro
- #13 Josh Taylor
- #26 Chris Tiru
- #3 Shahyar Hussain
- no # Charles Givens
- #77 Shawn Demers
- #26 Frederic Berkley
- #12 Sebastian Ivan Lopez
- #24 Jared Cester

### PaintballFIT

- #10 Cyrus Garringer
- #81 Jacob Johnson
- #45 Tyler Luckau
- #4 Jonathan Chavez
- #00 Scott Stewart
- no # Trenton Mason-Salinas
- #12 Jacob Sebaugh

### Perris ASG Aftermath

- #51 Stephen Mazurek
- #4 Julian Velazquez
- #14 Zack Carter
- no # Angel Frutos
- #44 Eric Arrieta
- #95 Grayson Gladstone
- no # James Green
- #8 Cody Woodruff
- #7 Jeremy Doan
- #34 Devon Stuart  *(conflict also #24; using most-sourced)*

### Red Legion

- #11 Alexander Berdnikov
- #92 Pavel Karsliev
- no # Michael Johnson
- #19 Corey Hall
- #23 Sergey Solnyshkov
- #75 Kirill Prikhidni
- #33 Daniil Kuzmin
- #27 Leonid Smotrov
- #10 Thomas Hara  *(conflict also #12; using most-sourced)*
- #15 Edilberto Vasquez Jr

### Royal City Seadogs

- #17 Austin Kaus
- #40 Shayne Salmon
- #8 Nick Campbell
- #19 Derrick Weltz
- #54 Ryan Chantler
- #9 Clayton Rizzardo Jr
- #5 Mark Gawlikowski
- #11 Conor Smith

### San Antonio X-Factor

- #22 Cody Bayless
- #21 William (Billy) Bernacchia III
- #3 Demetrius Ninios
- #12 Matt Jackson
- #93 Carlos Cortes Jr
- #7 Thomas Guest
- #45 Colt Roberts
- #0 Nico Hyde
- #2 Alex Martinez
- #23 Tj Danner Jr

### San Diego Dynasty

- #3 Kyle Barry
- no # Ryan Greenspan
- no # Alex Fraige
- #8 Harrison Frye
- #16 Stephen Omara
- #32 Yosh Rau
- #50 Joe Barrett
- #92 Archie Barnes
- #21 Eliot Weaver
- #13 Arturo Andrade
- #79 Michael Urena
- #44 Blake Yarber

### Seattle Uprising

- #23 Alec Holland
- #5 Graham Arnold
- #4 Nathan Schroeder
- #2 Austin Woodward
- #20 Shane Howe
- #100 Ben Challenger
- #21 Cole Scott
- #3 Alexander Borromeo
- #00 Joel Eaton

### Tampa Bay Damage

- #18 Bryan Smith
- #31 Jacob Edwards
- #7 Chad Busiere
- #16 Christopher Horn
- #10 Chris Schehr
- #89 Alex Goldman
- #22 Mark Ireland
- no # Christos Botsolas Jr
- #9 Keith Brown Jr
- #23 Daniel Holliday
- #33 Marcello Margott

### TonTon Arsenal

- #15 Hugo Verhaeghe
- #7 Peter Anfossi
- no # Thomas Portier Jr
- #91 Axel Gaudin Sr
- #2 Ben Carroll
- #89 Thomas Szpytma
- no # Adrien Krompholtz

## Number conflicts (same player, different `#` across 2026 Pro stats)

- **Chicago Distortion — Jackson Blue:** #22, #4 (sources: TBO EID 9198)
- **Detroit Infamous — Ryan Hall:** #41, #29 (sources: TBO EID 9198)
- **Los Angeles Ironmen — Jesse Stephens Jr:** #6, #17 (sources: MAO EID 9319)
- **Perris ASG Aftermath — Devon Stuart:** #34, #24 (sources: TBO EID 9198)
- **Red Legion — Thomas Hara:** #10, #12 (sources: MAO EID 9319)

## NXL World Cup 2026 Pro — jersey status

Event: https://pbleagues.com/event/9322/info / teams https://pbleagues.com/event/9322/teams

Authenticated Pro / Championship-Pro roster captures: **24** team entries, **212** players — **0** with a non-null `jersey_number`.

World Cup Pro teams (names only; all `no #` on PBLeagues roster field):

### ALA Warsaw (Pro X-Ball (Thu-Sun))

- no # Quentin Duchene
- no # Zbyszek Piotrowski
- no # Marcin Polec
- no # Michal Sokolowski
- no # Marek Sokolowski
- no # Dawid Staniaszek
- no # Szymon Wierzbicki
- no # Franek Wierzbicki

### Atlanta Jungle Cats (Pro X-Ball (Thu-Sun))

- no # Joey Dipolito
- no # Michael McGowan
- no # Joseph Oller
- no # Aaron Pate
- no # Alexander Povilaitis
- no # Aaron Rios
- no # Davis Stephens
- no # Ronny Tiner

### CK Hurricanes (Pro X-Ball (Thu-Sun))

- no # Andrew Bell
- no # Sam Brinkman
- no # John Brinkman
- no # Michael Brown
- no # Logan Dyer
- no # Konstantin Fedorov
- no # Duran Martinez
- no # Jake Raffield
- no # Shon Saucedo
- no # Kaito Warner

### Chicago Aftershock (Pro X-Ball (Thu-Sun))

- no # Mark Frans
- no # Mason Hinds
- no # Ryan Hoskinson
- no # Jet Isidro
- no # Jared Lackey
- no # Daniela Rojas
- no # Joseph Rooney
- no # Maxim Stancel

### Chicago Distortion (Pro X-Ball (Thu-Sun))

- no # Nikolao Asabedo
- no # Matthew Askren
- no # Jackson Blue
- no # Alex D'Acquisto
- no # Lance Grewell
- no # Andrew Malsam
- no # Jeren Perez
- no # Nate Roberts
- no # Gunther Stumpf
- no # Michael Unger
- no # Kevin Wenck

### Detroit Infamous (Pro X-Ball (Thu-Sun))

- no # Nathan Aboulhosn
- no # Kyle Bowen
- no # Ryan Hall
- no # Jonah Jamroz
- no # Zack Patient
- no # Trevor Resar
- no # Kevin Rudulph
- no # Dany Schonauer
- no # Sam Silberg
- no # Rob Velez

### Edmonton Impact (Championship - Pro X-Ball (Thu-Sun))

- no # Brandon Cornell
- no # Justin Cornell
- no # Chad George
- no # Tyler Harmon
- no # Conner Kelley
- no # Nicholas Leival
- no # Tyler Panlilio
- no # John Parrish
- no # Timothy Stanczak
- no # Dalton Vanderbyl
- no # Zachary Yachimec

### Houston Heat (Pro X-Ball (Thu-Sun))

- no # Austin Bufton
- no # Ronnie Dizon
- no # Mikhail Knyazev
- no # Cody Mickowski
- no # Ryan Moorhead
- no # Connor Nelson
- no # Andres Ramos Saldana

### LTF (Pro X-Ball (Thu-Sun))

- *(no players in authenticated capture)*

### Los Angeles Collision (Pro X-Ball (Thu-Sun))

- no # Lucas Alindajao
- no # Jordan Boyum
- no # Ethan Jose Castro
- no # Evan Middleton
- no # Daniel Park
- no # Guillermo Ramirez
- no # Lucas Tamura
- no # Brandon Trujillo

### Los Angeles Ironmen (Pro X-Ball (Thu-Sun))

- no # Caleb Abuhl
- no # Cj Canter
- no # Patrick Kraft
- no # Christopher Lennon
- no # Avery Nguyen
- no # Kyle Nicholaou
- no # Alex Rosati
- no # Henry Sentz
- no # Jesse Stephens

### New Jersey Leverage (Pro X-Ball (Thu-Sun))

- no # Joseph Altamore
- no # Rob Altamore
- no # Travis Baskin
- no # Chris Caputo
- no # Alfred De Los Santos
- no # Scott Graham
- no # Mark Meiterman
- no # Zach Moran
- no # Gilbert Sakaguchi
- no # Christopher Sanborn

### New York Xtreme (Pro X-Ball (Thu-Sun))

- no # Frederic Berkley
- no # Josh Calleja
- no # Jared Cester
- no # Shawn Demers
- no # Charles Givens
- no # Shahyar Hussain
- no # Sebastian Ivan Lopez
- no # Jose Navarro
- no # Timmy Roberts
- no # Josh Taylor
- no # Chris Tiru

### PaintballFIT (Pro X-Ball (Thu-Sun))

- no # Jonathan Chavez
- no # Cyrus Garringer
- no # Jacob Johnson
- no # Tyler Luckau
- no # Trenton Mason-Salinas
- no # Jacob Sebaugh
- no # Scott Stewart

### Perris ASG Aftermath (Pro X-Ball (Thu-Sun))

- no # Eric Arrieta
- no # Zack Carter
- no # Jeremy Doan
- no # Angel Frutos
- no # Grayson Gladstone
- no # James Green
- no # Stephen Mazurek
- no # Devon Stuart
- no # Julian Velazquez
- no # Cody Woodruff

### Puerto Rico tppcrew (Pro X-Ball (Thu-Sun))

- no # Kariel Concepcion
- no # Raymundo Del Rosario
- no # Jc Maldonado
- no # Loys Rafael
- no # Kaleed Ramirez García
- no # Julian Reyes
- no # Yaziel Rios
- no # Amin Rodriguez
- no # Carlos Santiago
- no # Adrian Santiago Torres

### Ranger Warsaw (Championship - Pro X-Ball (Thu-Sun))

- no # Jakub Bielski
- no # Kacper Dziedziczak
- no # Franciszek Kryj
- no # Micha Kumierczyk
- no # Marek Ozog
- no # Jacek Parczewski
- no # Truls Parsson
- no # Maciej Pasternak

### Red Legion (Championship - Pro X-Ball (Thu-Sun))

- no # Alexander Berdnikov
- no # Corey Hall
- no # Thomas Hara
- no # Michael Johnson
- no # Pavel Karsliev
- no # Daniil Kuzmin
- no # Kirill Prikhidni
- no # Leonid Smotrov
- no # Sergey Solnyshkov
- no # Edilberto Vasquez

### Royal City Seadogs (Pro X-Ball (Thu-Sun))

- no # Nick Campbell
- no # Ryan Chantler
- no # Austin Kaus
- no # Clayton Rizzardo
- no # Shayne Salmon
- no # Conor Smith
- no # Derrick Weltz

### San Antonio X-Factor (Pro X-Ball (Thu-Sun))

- no # Cody Bayless
- no # William (Billy) Bernacchia
- no # Carlos Cortes
- no # Tj Danner
- no # Thomas Guest
- no # Nico Hyde
- no # Matt Jackson
- no # Alex Martinez
- no # Demetrius Ninios
- no # Colt Roberts

### San Diego Dynasty (Pro X-Ball (Thu-Sun))

- no # Arturo Andrade
- no # Archie Barnes
- no # Joe Barrett
- no # Kyle Barry
- no # Alex Fraige
- no # Harrison Frye
- no # Ryan Greenspan
- no # Stephen Omara
- no # Yosh Rau
- no # Michael Urena
- no # Eliot Weaver
- no # Blake Yarber

### Seattle Uprising (Pro X-Ball (Thu-Sun))

- no # Graham Arnold
- no # Alexander Borromeo
- no # Ben Challenger
- no # Joel Eaton
- no # Alec Holland
- no # Shane Howe
- no # Nathan Schroeder
- no # Cole Scott
- no # Austin Woodward

### Tampa Bay Damage (Championship - Pro X-Ball (Thu-Sun))

- no # Christos Botsolas
- no # Keith Brown
- no # Chad Busiere
- no # Jacob Edwards
- no # Alex Goldman
- no # Daniel Holliday
- no # Christopher Horn
- no # Mark Ireland
- no # Marcello Margott
- no # Chris Schehr
- no # Bryan Smith

### TonTon Arsenal (Pro X-Ball (Thu-Sun))

- no # Peter Anfossi
- no # Ben Carroll
- no # Axel Gaudin
- no # Adrien Krompholtz
- no # Thomas Portier
- no # Thomas Szpytma
- no # Hugo Verhaeghe

## Source files (local)

- `/workspace/paintball/lso/rosters/README.md`
- `/workspace/paintball/lso/rosters/pro-allowlist.json`
- `/workspace/paintball/lso/rosters/pro-index.json`
- `/workspace/paintball/lso/rosters/pro-*.json` / `pro-*.html` / `showteams-9321.html`
- `/workspace/paintball/world-cup-2026/rosters.json` + `world-cup-2026.sqlite` (`roster_memberships.jersey_number`)

## Counts

- LSO allowlist players: 187
- With a PBLeagues 2026 Pro stats `#`: 154
- `no #` (not found on those stats pages): 33
- Conflict rows: 5


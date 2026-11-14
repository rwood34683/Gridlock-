import {
  Page,
  Section,
  Text,
  Table,
  Segmented,
  Select,
  Callout,
  Metrics,
  Rows,
  Input,
  Button,
  useState,
  useEffect,
  useMemo,
} from "grok/canvas";

// DATA-START
// GAMES tuples: [id, day, date, time, fieldIdx, pit, divIdx, roundIdx, homeIdx, awayIdx, score, statusIdx]
const PULLED_AT = "2026-11-14T06:34:59.900942-05:00";
const F = ["NXL Pro","Lone Wolf","Infamous","Defy","NXL","Hormesis","G.I. Sportz","Planet Eclipse","DYE","HK*Army","Mounds","Eclipse","Sup'Air 10v10"];
const D = ["Pro 3v3 X-Ball","Amateur 3v3 X-Ball","Semi-Pro X-Ball","Division 2 X-Ball","Division 3 X-Ball","Division 4 X-Ball","Masters X-Ball","Pro X-Ball","WNXL Pro X-Ball","Division 5 X-Ball","Champions - Division 2 X-Ball","Champions - Division 4 X-Ball","Commander's Cup X-Ball","Champions - Division 5 X-Ball","Champions - Division 3 X-Ball","Mounds - Open 5v5","Champions - Semi-Pro X-Ball","Youth Advanced 5v5","Division 5 5v5","Division 4 5v5","Female - WNXL Amateur 5v5","Division 3 5v5","Classic Mounds 10v10","Amateur 10v10"];
const T = [
"New Jersey Jesters","ZuriCaos","Houston Heat","LTF","New York Wrecking Crew","Shock","Chicago Aftershock","Puerto Rico tppcrew",
"Chicago Distortion","Aruba Madness","Rejects","Los Angeles Ironmen","ALA Warsaw","Texas Hurricanes","Seattle Uprising","Ranger Warsaw",
"Dallas SUWT","San Diego Dynasty","Oregon IKONIK","Brooklyn Wolfpack","Orlando Red Legion","Royal City Seadogs","Texas FIT","San Antonio X-Factor",
"Edmonton Impact","Perris ASG Aftermath","Los Angeles Collision","Las Vegas Shock","Brimstone Smoke","Team Crowley","Blackhawks D5","CBM",
"WAR","Beerkats","Gunshine X","Veteran Militia Whiskey","Detroit Infamous","Tampa Bay Damage","El Clan","Veteran Militia Romeo",
"Havok","Veteran Militia Hotel","Life Alert","Rain City Rejects","Clutch City Oilers","Shut up we're trying","BEEFY BOYS","Cleveland Chaos",
"INCURSION","CWE POWER","BC Riot","NFO FACTORY","Night Fury black","Washed Up Boyz","Sykaryos 3","S.N.A.F.U.",
"NQ Sports Paintball","Nasty Mob","South Shore Reapers","Upstate Avalanche","LAX MACHINE","New York Khaos","Konvicts Lockdown","The Leftovers OG II",
"The Leftovers OG III","MB55 Purple","Philippine Titos","Red Legion D4x","HAVOC","Matrix","Malicious","OG Killerz",
"Warped Army","Go-Getters","Devious Dawgs","WILD DOGS LATINOAMERICA","Pennsylvania Hawks","Trash Pandas","New Jersey Leverage","New York Xtreme",
"Aggression","Papeletto Team","The Leftovers OG","Veteran Militia Mike","Veteran Militia Kilo","Punishers Paintball","Toronto Chargers","SMSC",
"ICT Weekend Warriors","Eastside","Elite IO","Carolina Threat","CARIBBEAN LEGENDS","New Jersey Filthy 4","Chaos Crew","The Leftovers II",
"LOUISVILLE FUSION","TCP Micro Machine","Raze D4","NYPD Finest Paintball","SHARKS","Complex White","Thunder Valley Blackout","Denver Altitude",
"Sykaryos","Brawl","Full Paintball Colombia","NME","PA Hawks D2","ARMADA","Toulouse Purple","Aftershock",
"New England Old","Suricatos","CK Hurricanes","The Leftovers","AG Knights","Splat Houston","JACKALS","Team Hyperion",
"Wasted","OGB","TCP Vintage Machine","The Other Guys","TEMPLARIOS","Reckless","Veteran Militia Echo","The Goodfellaz",
"The Jokers","PTN","Raze","Project x","Bear Ridge Saints","Drakaina","The Heroines","Thunder Valley Voltage",
"Coup","Sacramento Legacy","TPP Black swans","BANDIDOS ELITE","The Leftovers III","APF FAMILY","GRD","Hostile goats featuring Colfax Creatures",
"TROPA D5","Gulf Coast Ragtag Army Red","Nasty","Gulf Coast Ragtag Army","Control","Corrupt","New England Storm","JakkBoyz",
"KNOXVILLE KNIGHTS","CARIBBEAN ALLSTARZ","Defy Kidz","LORDS","Hydra Kidz","OG Carolina Threat","AAA JACKALS 2","Reckless techs",
"West Coast Sharks 5","SHOCK","Spread Eagle Tavern","Army","VETERANS ARMEE FRANCAISE","New Jersey Filthy 5","Bear Ridge 5","Team Blank",
"Shut Up They're Trying","Rat Kings","New Jersey High Rollers","Northern Lights","Femmes Fatale","Baltimore Nevermores","Omaha Jamz","Saints",
"NR FACTORY","DILLIGAF","KC Missouri Allstars","FUSION TEAM","Eastsidee","Atlanta Jungle Cats","Ripper Crew","316 Threat",
"Relentless","TPP Factory","Hustle","PHILIPPINES","Rejects.","BREAKOUT","Coup Athletics","Revolution",
"Nashville Coyotes","Lot Lizard Wranglers","Texas Demolition","EAVL","CEP","Collision II","STL Threat","NARCOS",
"Noobies","LVL","Care Bear Militia","Kahnawake warriors","WRECKAGE","OCTANE Gold","Raiders X Apex","Smoke",
"Legacy Gorillas","BR FACTORY","Free Smoke","Trance","Ikonik Black","Smoke Patrol 507","Reapers.","ANONYMOUS",
"New York Aces","PR Jesters","Beach Bandits","Kings and Queens","Ottawa Luxury","Veteran Militia Charlie","IRONCLAD","Tri-City Storm",
"302 DESTROYERS","DEFY Factory","Ducks","Sunday Sleepers","APEX.","Raleigh Razorbacks","Virginia Irregulars","Legacy Factory",
"Miami Effect","Pittsburgh Mastodon","Panda Express Elite","TAKEOVER","S.N.A.F.U. 2","Destiny Germany","The Leftovers IV","San Diego Odyssey D-5",
"TROPA","The Leftovers II.5","NJ Jesters","Atlanta OutKast","PaintballFIT","TonTon Arsenal","Outlaw AP Prime","RUFIANES",
"Ontario Landsharks","IKONIK Gold","Afterlife D4","PA Hawks 2","The Leftovers III.5","OG Boys Australia","TCP Battle Machine","ODIN",
"New York Tyrants","New Jersey Filthy 3","Dallas Vibe","San Francisco Sirens","The Royals","The Immortal Angels","Nashville Coyotes Ravenous","Da Homies Rejects",
"Mayhem Tigers","Pusher Boyz North","Doc's Raiders","SMOKE","All-Americans 2","BTA","Avalanche PB Mech","Denver Purge",
"Killa Bees","The Wolverines","Desert Edge","S.D.G. Livewire","Veteran Militia Oscar","The Leftovers Mech","Image","Red Legion",
"Preferred mob","Blast Camp","Marines","Navy","Air Force","Division 3 Ochos - 8","Division 3 Ochos - 9","Division 3 Ochos - 7",
"Division 3 Ochos - 10","Division 4 1/16 - 16","Division 4 1/16 - 17","Division 4 1/16 - 15 Gold","Division 4 1/16 - 18","Division 4 1/16 - 14","Division 4 1/16 - 19","Division 4 1/16 - 13",
"Division 4 1/16 - 20","Division 5 Ochos - 5","Division 5 Ochos - 12","Division 5 Ochos - 6","Division 5 Ochos - 11","Division 5 Ochos - 7","Division 5 Ochos - 10 Fool's Gold","Division 5 Ochos - 8",
"Division 5 Ochos - 9","Division 3 Ochos - 1","Division 3 Ochos - 16","Division 3 Ochos - 2","Division 3 Ochos - 15","Division 4 1/16 - 12","Division 4 1/16 - 21","Division 4 1/16 - 11",
"Division 4 1/16 - 22","Division 4 1/16 - 10","Division 4 1/16 - 23","Division 4 1/16 - 9","Division 4 1/16 - 24","Division 5 Quarters - 4","Division 5 Quarters - 5","Division 5 Quarters - 3",
"Division 5 Quarters - 6","Division 3 Ochos - 5","Division 3 Ochos - 12","Division 3 Ochos - 6","Division 3 Ochos - 11 GT1","Division 4 1/16 - 8","Division 4 1/16 - 25","Division 4 1/16 - 7",
"Division 4 1/16 - 26","Division 4 1/16 - 6","Division 4 1/16 - 27 Rebels","Division 4 1/16 - 5","Division 4 1/16 - 28","Division 5 Quarters - 2","Division 5 Quarters - 7","Division 5 Quarters - 1",
"Division 5 Quarters - 8","Division 3 Ochos - 4","Division 3 Ochos - 13","Division 3 Ochos - 3","Division 3 Ochos - 14 GT2","Division 4 Ochos - 8","Division 4 Ochos - 9","Division 4 Ochos - 7",
"Division 4 Ochos - 10","Division 4 Ochos - 6","Division 4 Ochos - 11","Division 4 Ochos - 5","Division 4 Ochos - 12","Division 3 Quarters - 4","Division 3 Quarters - 5","Division 3 Quarters - 3",
"Division 3 Quarters - 6","Division 4 Ochos - 1","Division 4 Ochos - 16","Division 4 Ochos - 2","Division 4 Ochos - 15 Gold","Division 4 Ochos - 3","Division 4 Ochos - 14","Division 4 Ochos - 4",
"Division 4 Ochos - 13","Division 3 Quarters - 2","Division 3 Quarters - 7","Division 3 Quarters - 1","Division 3 Quarters - 8","Division 4 Quarters - 4","Division 4 Quarters - 5","Division 4 Quarters - 3",
"Division 4 Quarters - 6","Open Winner A","Open Winner B","Division 2 Quarters - 4","Division 2 Quarters - 5","Division 2 Quarters - 3","Division 2 Quarters - 6","Division 4 Quarters - 2",
"Division 4 Quarters - 7","Division 4 Quarters - 1","Division 4 Quarters - 8","Semi-Pro Ochos - 5 St. Mary's","Semi-Pro Ochos - 12","Semi-Pro Ochos - 6","Semi-Pro Ochos - 11","Division 2 Quarters - 2",
"Division 2 Quarters - 7","Division 2 Quarters - 1","Division 2 Quarters - 8","Semi-Pro Ochos - 7 1","Semi-Pro Ochos - 10 Black","Semi-Pro Ochos - 8","Semi-Pro Ochos - 9 Blue","Semi-Pro Quarters - 4",
"Semi-Pro Quarters - 5 St. Mary's","Semi-Pro Quarters - 3","Semi-Pro Quarters - 6","Semi-Pro Quarters - 2","Semi-Pro Quarters - 7 1","Semi-Pro Quarters - 1","Semi-Pro Quarters - 8","WNXL Quarters - 4 Gold",
"WNXL Quarters - 5 Blue","WNXL Quarters - 3","WNXL Quarters - 6","Division 2 Semifinals - 2","Division 2 Semifinals - 3","Division 2 Semifinals - 1","Division 2 Semifinals - 4","Division 3 Semifinals - 2",
"Division 3 Semifinals - 3","Division 3 Semifinals - 1","Division 3 Semifinals - 4","Division 5 Semifinals - 2","Division 5 Semifinals - 3","Division 5 Semifinals - 1","Division 5 Semifinals - 4","WNXL Semifinals - 2",
"WNXL Semifinals - 3","WNXL Semifinals - 1","WNXL Semifinals - 4 Gold","Division 4 Semifinals - 2","Division 4 Semifinals - 3","Division 4 Semifinals - 1","Division 4 Semifinals - 4","Semi-Pro Semifinals - 2",
"Semi-Pro Semifinals - 3","Semi-Pro Semifinals - 1","Semi-Pro Semifinals - 4","Division 3 Consolation A","Division 3 Consolation B","Division 2 Winner A","Division 2 Winner B","Division 3 Winner A",
"Division 3 Winner B","Division 5 Consolation A","Division 5 Consolation B","Division 5 Winner A","Division 5 Winner B","WNXL Winner A","WNXL Winner B","Semi-Pro Winner A",
"Semi-Pro Winner B","Division 4 Consolation A","Division 4 Consolation B","Division 4 Winner A","Division 4 Winner B","Division 2 Consolation A","Division 2 Consolation B","Semi-Pro Consolation A",
"Semi-Pro Consolation B","The Leftovers Kidz","AG Kids","Bear Ridge Kidz","Savage Patch Kids","NOLA Savages","PHANTOM","University of Maryland Terrapins",
"Veteran Militia Golf","Bethill Ballers","UCF Knights-Black","DECEPTION D5","Cowboy Killers","Storm Riders","Cleantake Paintball","Hot Garbage",
"Donk's Disciples","The Leftovers VI","Savage Factory","Dyehard","NYK Black","5th Element","Rejected Co","CBM Cubs",
"HYPER","ZuriCaos M.W.K.","Golden Isles Ghost","The Other Guys 2","Nola Savages","Shock Kidz MW","Ragtags","South Florida Syndicate",
"Alliance","Embry-Riddle Eagles","Veteran Militia Delta","Enemy","Xclusive X","Elite Dynasty","Youngstown Dimension","The Leftovers V",
"Pionniers","Magic City Steel","Unhinged","TIFUZI","Rapinas","Spider team","NMI","West Coast Sharks 4",
"Menteanah","Queen City Royals - Purple","TexeCutioners by PBGateway","Reckoning","Tampa Bay Raptors","PHILIPPINES D4","Plaguebearers","NFO NEW YORK",
"Magic City Vulcans","Avalanche PB","Heathens","THOSE GUYS","Tampa Bay Vengeance","Surreal","Chicago Cherubs","BANDIDAS PK",
"SMSC Ladyz","TCP Diamond Machine","OKC Vengeance","Sparrows","NJ High Rollers","Outlaw AP Warriors","OCTANE Elite","Papeletto",
"Papeletto Dark","Papeletto Legends","Raiders","Autistic Trash Pandas","STL Threat D3","Orlando Invaders","Beach Bandits Humidity","DeaD RaBBiTs",
"Miami Kings","Veteran Militia Fox","ColdBlooded Warriors","Free Smoke.","Medellin criminals","ODIN VIDUR","Dauntless Black","Hydra",
"Nola-Savage","Wreckers","Tampa Bay Exile","Puffy Bunker Bois","TPP Most Wanted","University of Central Florida Knights","CBM Cubs Blue","Carolina Warriors",
"Coldblooded Quack Pack","Contra","THE NOBODYS","NEW YORK BANDITS","The Leftovers IV.5","ODIN JALK","S.D.G. Hammer Cats","No Ceilings",
"Bio-Hazard Purple","S.D.G.Hammer Cats Bravo","Vice City Mafia","Veteran Militia Zulu","Moisture Missiles","PILIPINAS","Veteran Militia","Cunning Stunts",
"PMDR Paintball Monkeys","WOLF PACK","Veteran Militia Bravo","Steel City Bombers","Texas Sannin","POSTAL","Bethel Jesters","INTENT",
"Masters Consolation A Blue","Masters Consolation B","Masters Winner A","Masters Winner B Black","Masters Semifinals - 2 Black","Masters Semifinals - 3 Blue","Masters Semifinals - 1","Masters Semifinals - 4",
"Masters Quarters - 4","Masters Quarters - 5","Masters Quarters - 3 Blue","Masters Quarters - 6","Open Quarters - 4","Open Quarters - 5","Open Quarters - 1","Open Quarters - 8",
"Open Quarters - 3","Open Quarters - 6","Open Quarters - 2","Open Quarters - 7 Green","Open Semifinals - 1","Open Semifinals - 4","Open Semifinals - 2","Open Semifinals - 3",
"Open Consolation A","Open Consolation B","Semi-Pro 1/16 - 7 1","Semi-Pro 1/16 - 10 Black","Semi-Pro 1/16 - 8","Semi-Pro 1/16 - 9 Blue","Semi-Pro 1/16 - 5 St. Mary's","Semi-Pro 1/16 - 12",
"Semi-Pro 1/16 - 6","Semi-Pro 1/16 - 11","Semi-Pro Ochos - 1","Semi-Pro Ochos - 2","Semi-Pro Ochos - 3","Semi-Pro Ochos - 4","Division 2 Ochos - 1","Division 2 Ochos - 8",
"Division 2 Ochos - 2","Division 2 Ochos - 7","Division 2 Ochos - 3","Division 2 Ochos - 6","Division 2 Ochos - 4","Division 2 Ochos - 5","Division 3 1/16 - 1","Division 3 1/16 - 16",
"Division 3 1/16 - 2","Division 3 1/16 - 15","Division 3 1/16 - 8","Division 3 1/16 - 9","Division 3 1/16 - 7","Division 3 1/16 - 10","Division 3 1/16 - 4","Division 3 1/16 - 13",
"Division 3 1/16 - 3","Division 3 1/16 - 14 GT2","Division 3 1/16 - 5","Division 3 1/16 - 12","Division 3 1/16 - 6","Division 3 1/16 - 11 GT1","Division 4 1/32 - 16","Division 4 1/32 - 17",
"Division 4 1/32 - 15 Gold","Division 4 1/32 - 18","Division 4 1/32 - 14","Division 4 1/32 - 19","Division 4 1/32 - 13","Division 4 1/32 - 20","Division 4 1/32 - 12","Division 4 1/32 - 21",
"Division 4 1/32 - 11","Division 4 1/32 - 22","Division 4 1/32 - 10","Division 4 1/32 - 23","Division 4 1/32 - 9","Division 4 1/32 - 24","Division 4 1/32 - 8","Division 4 1/32 - 25",
"Division 4 1/32 - 7","Division 4 1/32 - 26","Division 4 1/32 - 6","Division 4 1/32 - 27 Rebels","Division 4 1/32 - 5","Division 4 1/32 - 28","Division 4 1/16 - 1","Division 4 1/16 - 2",
"Division 4 1/16 - 3","Division 4 1/16 - 4","Division 5 1/16 - 7","Division 5 1/16 - 10 Fool's Gold","Division 5 1/16 - 8","Division 5 1/16 - 9","Division 5 1/16 - 5","Division 5 1/16 - 12",
"Division 5 1/16 - 6","Division 5 1/16 - 11","Division 5 Ochos - 1","Division 5 Ochos - 2","Division 5 Ochos - 3","Division 5 Ochos - 4","Pro Ochos","Pro Quarters",
"Pro Semifinals","Pro Finals","Bracket B #2 Gold","Bracket A #3 Blue","Bracket A #2","Bracket B #3","Bracket B #1","Bracket A #1",
"Butchers Northwest","Alabama Paintball","Bear Ridge 10","JUSTICE","WARBIRDS","Pro Edge Goon Squad","Pathways Recovery Center powered by WAVY PINE MANAGEMENT","Veteran Militia Geo",
"The Union","SIERRA","THE FARM","Scattershot"
];
const R = ["Prelims","Ochofinals","Quarters","Semifinals","Finals","Ochos","1/16","1/32"];
const S = ["Final","Final (forfeit)","Unofficial","No score posted","Scheduled"];
const G1: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4071627,"Wed","2026-11-11","7:00 AM",0,1,0,0,0,1,"5-0",0],
[4071628,"Wed","2026-11-11","7:15 AM",0,1,0,0,2,3,"5-0",0],
[4071629,"Wed","2026-11-11","7:30 AM",0,1,0,0,4,5,"7-3",0],
[4071630,"Wed","2026-11-11","7:45 AM",0,1,0,0,6,7,"3-5",0],
[4071631,"Wed","2026-11-11","8:00 AM",0,1,0,0,8,9,"5-2",0],
[4071649,"Wed","2026-11-11","8:00 AM",1,1,0,0,10,1,"6-1",0],
[4071632,"Wed","2026-11-11","8:15 AM",0,1,0,0,11,12,"4-3",0],
[4071650,"Wed","2026-11-11","8:15 AM",1,1,0,0,13,3,"6-1",0],
[4071633,"Wed","2026-11-11","8:30 AM",0,1,0,0,14,15,"6-1",0],
[4071651,"Wed","2026-11-11","8:30 AM",1,1,0,0,16,5,"4-5",0],
[4071634,"Wed","2026-11-11","8:45 AM",0,1,0,0,17,18,"6-1",0],
[4071652,"Wed","2026-11-11","8:45 AM",1,1,0,0,19,7,"3-5",0],
[4071635,"Wed","2026-11-11","9:00 AM",0,1,0,0,20,21,"6-2",0],
[4071653,"Wed","2026-11-11","9:00 AM",1,1,0,0,22,9,"6-3",0],
[4071636,"Wed","2026-11-11","9:15 AM",0,1,0,0,23,24,"2-5",0],
[4071654,"Wed","2026-11-11","9:15 AM",1,1,0,0,25,12,"5-0",0],
[4071637,"Wed","2026-11-11","9:30 AM",0,1,0,0,0,10,"2-3",0],
[4071655,"Wed","2026-11-11","9:30 AM",1,1,0,0,26,15,"1-4",0],
[4071638,"Wed","2026-11-11","9:45 AM",0,1,0,0,2,13,"3-4",0],
[4071656,"Wed","2026-11-11","9:45 AM",1,1,0,0,27,18,"2-4",0],
[4071639,"Wed","2026-11-11","10:00 AM",0,1,0,0,4,16,"5-0",0],
[4079450,"Wed","2026-11-11","10:00 AM",1,1,1,0,28,29,"0-3",0],
[4079461,"Wed","2026-11-11","10:00 AM",1,2,1,0,30,31,"2-3",0],
[4071640,"Wed","2026-11-11","10:15 AM",0,1,0,0,6,19,"4-3",0],
[4079451,"Wed","2026-11-11","10:25 AM",1,1,1,0,32,33,"3-2",0],
[4079462,"Wed","2026-11-11","10:25 AM",1,2,1,0,34,35,"3-0",0],
[4071641,"Wed","2026-11-11","10:30 AM",0,1,0,0,36,24,"7-4",0],
[4071642,"Wed","2026-11-11","10:45 AM",0,1,0,0,37,21,"1-5",0],
[4079452,"Wed","2026-11-11","10:50 AM",1,1,1,0,38,39,"4-1",0],
[4079463,"Wed","2026-11-11","10:50 AM",1,2,1,0,40,41,"1-4",0],
[4071643,"Wed","2026-11-11","11:00 AM",0,1,0,0,8,22,"2-4",0],
[4071644,"Wed","2026-11-11","11:15 AM",0,1,0,0,11,25,"3-4",0],
[4079453,"Wed","2026-11-11","11:15 AM",1,1,1,0,42,43,"0-3",0],
[4079464,"Wed","2026-11-11","11:15 AM",1,2,1,0,28,31,"3-4",0],
[4071645,"Wed","2026-11-11","11:30 AM",0,1,0,0,14,26,"5-0",0],
[4079454,"Wed","2026-11-11","11:40 AM",1,1,1,0,32,30,"3-0",0],
[4079465,"Wed","2026-11-11","11:40 AM",1,2,1,0,34,38,"2-3",0],
[4071646,"Wed","2026-11-11","11:45 AM",0,1,0,0,17,27,"5-1",0],
[4071647,"Wed","2026-11-11","12:00 PM",0,1,0,0,36,23,"4-5",0],
[4079455,"Wed","2026-11-11","12:05 PM",1,1,1,0,35,40,"1-3",0],
[4079466,"Wed","2026-11-11","12:05 PM",1,2,1,0,29,42,"3-1",0],
[4071648,"Wed","2026-11-11","12:15 PM",0,1,0,0,37,20,"3-6",0],
[4079456,"Wed","2026-11-11","12:30 PM",1,1,1,0,33,43,"2-4",0],
[4079467,"Wed","2026-11-11","12:30 PM",1,2,1,0,41,28,"2-4",0],
[4079457,"Wed","2026-11-11","12:55 PM",1,1,1,0,31,39,"3-1",0],
[4079468,"Wed","2026-11-11","12:55 PM",1,2,1,0,29,40,"3-0",0],
[4047263,"Wed","2026-11-11","1:00 PM",0,1,0,1,4,7,"5-0",0],
[4047264,"Wed","2026-11-11","1:15 PM",0,1,0,1,21,10,"6-4",0],
[4079458,"Wed","2026-11-11","1:20 PM",1,1,1,0,42,35,"3-0",0],
[4079469,"Wed","2026-11-11","1:20 PM",1,2,1,0,38,33,"3-5",0],
[4047265,"Wed","2026-11-11","1:30 PM",0,1,0,1,37,13,"5-2",0],
[4047266,"Wed","2026-11-11","1:45 PM",0,1,0,1,14,17,"3-5",0],
[4079459,"Wed","2026-11-11","1:45 PM",1,1,1,0,34,43,"2-3",0],
[4079470,"Wed","2026-11-11","1:45 PM",1,2,1,0,30,41,"1-4",0],
[4047267,"Wed","2026-11-11","2:00 PM",0,1,0,1,24,22,"6-1",0],
[4079460,"Wed","2026-11-11","2:10 PM",1,1,1,0,32,39,"2-1",0],
[4047268,"Wed","2026-11-11","2:15 PM",0,1,0,1,23,25,"4-3",0],
[4047269,"Wed","2026-11-11","2:30 PM",0,1,0,2,20,4,"5-3",0],
[4047270,"Wed","2026-11-11","2:45 PM",0,1,0,2,21,37,"3-4",0],
[4047271,"Wed","2026-11-11","3:00 PM",0,1,0,2,36,17,"3-4",0],
[4085885,"Wed","2026-11-11","3:00 PM",1,1,1,2,31,41,"1-2",0],
[4085887,"Wed","2026-11-11","3:00 PM",1,2,1,2,32,38,"3-0",0],
[4047272,"Wed","2026-11-11","3:15 PM",0,1,0,2,24,23,"4-2",0],
[4047273,"Wed","2026-11-11","3:30 PM",0,1,0,3,20,37,"2-5",0],
[4086958,"Wed","2026-11-11","3:30 PM",1,1,1,3,43,32,"0-2",0],
[4086959,"Wed","2026-11-11","3:30 PM",1,2,1,3,29,41,"0-3",0],
[4047274,"Wed","2026-11-11","3:45 PM",0,1,0,3,24,17,"6-1",0],
[4086960,"Wed","2026-11-11","4:00 PM",0,1,1,4,32,41,"2-3",0],
[4047275,"Wed","2026-11-11","4:15 PM",0,1,0,4,24,37,"3-2",0],
[4085905,"Thu","2026-11-12","7:00 AM",1,1,2,0,4,44,"6-1",0],
[4085915,"Thu","2026-11-12","7:00 AM",1,2,2,0,45,46,"3-4",0],
[4085925,"Thu","2026-11-12","7:00 AM",2,1,3,0,47,48,"6-3",0],
[4085935,"Thu","2026-11-12","7:00 AM",2,2,3,0,49,50,"4-5",0],
[4085945,"Thu","2026-11-12","7:00 AM",3,1,4,0,51,52,"4-0",0],
[4085957,"Thu","2026-11-12","7:00 AM",3,2,4,0,53,54,"4-3",0],
[4085969,"Thu","2026-11-12","7:00 AM",4,1,5,0,55,56,"6-3",0],
[4085982,"Thu","2026-11-12","7:00 AM",4,2,4,0,57,58,"5-2",0],
[4085994,"Thu","2026-11-12","7:00 AM",5,1,5,0,59,60,"W-F",1],
[4086006,"Thu","2026-11-12","7:00 AM",5,2,5,0,61,62,"4-0",0],
[4086018,"Thu","2026-11-12","7:00 AM",6,1,6,0,63,64,"3-0",0],
[4086035,"Thu","2026-11-12","7:00 AM",6,2,6,0,65,66,"0-3",0],
[4086052,"Thu","2026-11-12","7:00 AM",7,1,5,0,67,68,"2-5",0],
[4086065,"Thu","2026-11-12","7:00 AM",7,2,5,0,69,70,"4-4",0],
[4086078,"Thu","2026-11-12","7:00 AM",8,1,5,0,71,72,"3-5",0],
[4086091,"Thu","2026-11-12","7:00 AM",8,2,5,0,73,74,"4-3",0],
[4086104,"Thu","2026-11-12","7:00 AM",9,1,2,0,27,75,"8-3",0],
[4086115,"Thu","2026-11-12","7:00 AM",9,2,2,0,76,77,"1-6",0],
[4085889,"Thu","2026-11-12","7:30 AM",0,1,7,0,8,12,"2-6",0],
[4085897,"Thu","2026-11-12","7:30 AM",0,2,7,0,78,79,"7-3",0],
[4086019,"Thu","2026-11-12","7:30 AM",6,1,6,0,80,81,"0-3",0],
[4086036,"Thu","2026-11-12","7:30 AM",6,2,6,0,82,83,"3-4",0],
[4085946,"Thu","2026-11-12","7:45 AM",3,1,4,0,32,84,"6-4",0],
[4085958,"Thu","2026-11-12","7:45 AM",3,2,4,0,85,86,"4-5",0],
[4085970,"Thu","2026-11-12","7:45 AM",4,1,5,0,87,88,"1-5",0],
[4085983,"Thu","2026-11-12","7:45 AM",4,2,4,0,89,90,"6-3",0],
[4085995,"Thu","2026-11-12","7:45 AM",5,1,5,0,91,92,"4-0",0],
[4086007,"Thu","2026-11-12","7:45 AM",5,2,5,0,93,94,"5-1",0],
[4086053,"Thu","2026-11-12","7:45 AM",7,1,5,0,95,96,"1-5",0],
[4086066,"Thu","2026-11-12","7:45 AM",7,2,5,0,97,1,"5-4",0],
[4086079,"Thu","2026-11-12","7:45 AM",8,1,5,0,98,99,"5-1",0],
[4086092,"Thu","2026-11-12","7:45 AM",8,2,5,0,100,101,"1-5",0],
[4085906,"Thu","2026-11-12","7:55 AM",1,1,2,0,102,103,"7-4",0],
[4085916,"Thu","2026-11-12","7:55 AM",1,2,2,0,0,104,"7-2",0],
[4085926,"Thu","2026-11-12","7:55 AM",2,1,3,0,105,106,"6-1",0],
[4085936,"Thu","2026-11-12","7:55 AM",2,2,3,0,107,108,"9-4",0],
[4086105,"Thu","2026-11-12","7:55 AM",9,1,2,0,70,109,"6-1",0],
[4086116,"Thu","2026-11-12","7:55 AM",9,2,2,0,19,110,"1-6",0],
[4086020,"Thu","2026-11-12","8:00 AM",6,1,6,0,111,112,"0-3",0],
[4086037,"Thu","2026-11-12","8:00 AM",6,2,6,0,113,64,"1-4",0],
[4085890,"Thu","2026-11-12","8:30 AM",0,1,7,0,11,26,"5-3",0],
[4085898,"Thu","2026-11-12","8:30 AM",0,2,7,0,114,21,"6-5",0],
[4085947,"Thu","2026-11-12","8:30 AM",3,1,4,0,115,52,"3-4",0],
[4085959,"Thu","2026-11-12","8:30 AM",3,2,4,0,116,54,"5-2",0],
[4085971,"Thu","2026-11-12","8:30 AM",4,1,5,0,117,56,"3-3",0],
[4085984,"Thu","2026-11-12","8:30 AM",4,2,4,0,118,58,"5-1",0],
[4085996,"Thu","2026-11-12","8:30 AM",5,1,5,0,119,60,"W-F",1],
[4086008,"Thu","2026-11-12","8:30 AM",5,2,5,0,120,62,"6-2",0],
[4086021,"Thu","2026-11-12","8:30 AM",6,1,6,0,81,63,"3-0",0],
[4086038,"Thu","2026-11-12","8:30 AM",6,2,6,0,121,122,"3-0",0],
[4086054,"Thu","2026-11-12","8:30 AM",7,1,5,0,67,123,"5-5",0],
[4086067,"Thu","2026-11-12","8:30 AM",7,2,5,0,124,70,"4-0",0],
[4086080,"Thu","2026-11-12","8:30 AM",8,1,5,0,125,126,"4-4",0],
];
const G2: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4086093,"Thu","2026-11-12","8:30 AM",8,2,5,0,127,128,"3-3",0],
[4085907,"Thu","2026-11-12","8:50 AM",1,1,2,0,27,76,"5-0",0],
[4085917,"Thu","2026-11-12","8:50 AM",1,2,2,0,45,75,"7-6",0],
[4085927,"Thu","2026-11-12","8:50 AM",2,1,3,0,129,48,"4-3",0],
[4085937,"Thu","2026-11-12","8:50 AM",2,2,3,0,50,130,"4-3",0],
[4086106,"Thu","2026-11-12","8:50 AM",9,1,2,0,46,77,"5-4",0],
[4086117,"Thu","2026-11-12","8:50 AM",9,2,2,0,44,131,"5-0",0],
[4086022,"Thu","2026-11-12","9:00 AM",6,1,6,0,65,83,"3-0",0],
[4086039,"Thu","2026-11-12","9:00 AM",6,2,6,0,112,113,"2-3",0],
[4085948,"Thu","2026-11-12","9:15 AM",3,1,4,0,32,51,"4-4",0],
[4085960,"Thu","2026-11-12","9:15 AM",3,2,4,0,53,86,"6-3",0],
[4085972,"Thu","2026-11-12","9:15 AM",4,1,5,0,55,88,"3-5",0],
[4085985,"Thu","2026-11-12","9:15 AM",4,2,4,0,57,90,"5-3",0],
[4085997,"Thu","2026-11-12","9:15 AM",5,1,5,0,59,92,"4-2",0],
[4086009,"Thu","2026-11-12","9:15 AM",5,2,5,0,61,94,"4-0",0],
[4086055,"Thu","2026-11-12","9:15 AM",7,1,5,0,95,68,"4-5",0],
[4086068,"Thu","2026-11-12","9:15 AM",7,2,5,0,69,1,"4-4",0],
[4086081,"Thu","2026-11-12","9:15 AM",8,1,5,0,98,72,"2-3",0],
[4086094,"Thu","2026-11-12","9:15 AM",8,2,5,0,100,74,"4-1",0],
[4085891,"Thu","2026-11-12","9:30 AM",0,1,7,0,17,8,"7-2",0],
[4085899,"Thu","2026-11-12","9:30 AM",0,2,7,0,14,78,"7-1",0],
[4086023,"Thu","2026-11-12","9:30 AM",6,1,6,0,66,82,"3-0",0],
[4086040,"Thu","2026-11-12","9:30 AM",6,2,6,0,111,121,"1-4",0],
[4085908,"Thu","2026-11-12","9:45 AM",1,1,8,0,132,133,"2-5",0],
[4085918,"Thu","2026-11-12","9:45 AM",1,2,8,0,134,135,"4-2",0],
[4085928,"Thu","2026-11-12","9:45 AM",2,1,3,0,47,106,"4-4",0],
[4085938,"Thu","2026-11-12","9:45 AM",2,2,3,0,49,108,"5-4",0],
[4086107,"Thu","2026-11-12","9:45 AM",9,1,2,0,4,109,"5-0",0],
[4086118,"Thu","2026-11-12","9:45 AM",9,2,2,0,0,103,"6-4",0],
[4085949,"Thu","2026-11-12","10:00 AM",3,1,4,0,115,84,"2-4",0],
[4085961,"Thu","2026-11-12","10:00 AM",3,2,4,0,85,116,"4-5",0],
[4085973,"Thu","2026-11-12","10:00 AM",4,1,5,0,87,117,"2-2",0],
[4085986,"Thu","2026-11-12","10:00 AM",4,2,4,0,89,118,"4-0",0],
[4085998,"Thu","2026-11-12","10:00 AM",5,1,5,0,91,119,"4-3",0],
[4086010,"Thu","2026-11-12","10:00 AM",5,2,5,0,93,120,"4-0",0],
[4086024,"Thu","2026-11-12","10:00 AM",6,1,6,0,80,122,"3-3",0],
[4086041,"Thu","2026-11-12","10:00 AM",6,2,9,0,136,137,"3-0",0],
[4086056,"Thu","2026-11-12","10:00 AM",7,1,9,0,138,139,"3-1",0],
[4086069,"Thu","2026-11-12","10:00 AM",7,2,9,0,140,141,"0-3",0],
[4086082,"Thu","2026-11-12","10:00 AM",8,1,5,0,71,125,"0-4",0],
[4086095,"Thu","2026-11-12","10:00 AM",8,2,5,0,73,127,"5-5",0],
[4085892,"Thu","2026-11-12","10:30 AM",0,1,7,0,11,12,"2-4",0],
[4085900,"Thu","2026-11-12","10:30 AM",0,2,7,0,114,79,"8-4",0],
[4086025,"Thu","2026-11-12","10:30 AM",6,1,9,0,142,143,"2-2",0],
[4086042,"Thu","2026-11-12","10:30 AM",6,2,9,0,144,145,"1-4",0],
[4086057,"Thu","2026-11-12","10:35 AM",7,1,5,0,123,96,"2-3",0],
[4086070,"Thu","2026-11-12","10:35 AM",7,2,5,0,97,124,"4-2",0],
[4085909,"Thu","2026-11-12","10:40 AM",1,1,2,0,102,19,"1-6",0],
[4085919,"Thu","2026-11-12","10:40 AM",1,2,2,0,18,146,"6-3",0],
[4085929,"Thu","2026-11-12","10:40 AM",2,1,3,0,105,129,"3-2",0],
[4085939,"Thu","2026-11-12","10:40 AM",2,2,3,0,107,130,"6-1",0],
[4086108,"Thu","2026-11-12","10:40 AM",9,1,2,0,70,131,"5-0",0],
[4086119,"Thu","2026-11-12","10:40 AM",9,2,2,0,104,110,"2-7",0],
[4085950,"Thu","2026-11-12","10:45 AM",3,1,10,0,147,148,"4-3",0],
[4085962,"Thu","2026-11-12","10:45 AM",3,2,10,0,116,149,"1-6",0],
[4085974,"Thu","2026-11-12","10:45 AM",4,1,4,0,150,151,"5-1",0],
[4085987,"Thu","2026-11-12","10:45 AM",4,2,4,0,152,153,"0-4",0],
[4085999,"Thu","2026-11-12","10:45 AM",5,1,11,0,154,155,"4-0",0],
[4086011,"Thu","2026-11-12","10:45 AM",5,2,11,0,156,157,"2-3",0],
[4086083,"Thu","2026-11-12","10:45 AM",8,1,5,0,99,126,"4-0",0],
[4086096,"Thu","2026-11-12","10:45 AM",8,2,5,0,101,128,"3-4",0],
[4086026,"Thu","2026-11-12","11:05 AM",6,1,9,0,158,159,"0-3",0],
[4086043,"Thu","2026-11-12","11:05 AM",6,2,9,0,160,137,"3-1",0],
[4086058,"Thu","2026-11-12","11:20 AM",7,1,9,0,161,162,"2-3",0],
[4086071,"Thu","2026-11-12","11:20 AM",7,2,9,0,140,139,"0-3",0],
[4087537,"Thu","2026-11-12","11:30 AM",0,1,12,2,163,164,"5-4",0],
[4086084,"Thu","2026-11-12","11:30 AM",8,1,13,0,165,166,"1-2",0],
[4086097,"Thu","2026-11-12","11:30 AM",8,2,13,0,167,168,"2-2",0],
[4085975,"Thu","2026-11-12","12:15 PM",4,1,4,0,151,169,"2-6",0],
[4085988,"Thu","2026-11-12","12:15 PM",4,2,4,0,150,153,"3-1",0],
[4086000,"Thu","2026-11-12","12:15 PM",5,1,11,0,154,157,"5-1",0],
[4086012,"Thu","2026-11-12","12:15 PM",5,2,11,0,156,155,"5-1",0],
[4085910,"Thu","2026-11-12","12:20 PM",1,1,8,0,170,171,"5-4",0],
[4085920,"Thu","2026-11-12","12:20 PM",1,2,8,0,172,173,"4-6",0],
[4085930,"Thu","2026-11-12","12:20 PM",2,1,3,0,174,175,"2-5",0],
[4085940,"Thu","2026-11-12","12:20 PM",2,2,3,0,176,177,"4-3",0],
[4086109,"Thu","2026-11-12","12:20 PM",9,1,2,0,178,146,"5-0",0],
[4086120,"Thu","2026-11-12","12:20 PM",9,2,2,0,18,179,"4-2",0],
[4085951,"Thu","2026-11-12","12:25 PM",3,1,10,0,147,149,"4-6",0],
[4085963,"Thu","2026-11-12","12:25 PM",3,2,10,0,116,148,"4-3",0],
[4086027,"Thu","2026-11-12","12:25 PM",6,1,9,0,180,143,"1-1",0],
[4086044,"Thu","2026-11-12","12:25 PM",6,2,9,0,136,145,"4-2",0],
[4085893,"Thu","2026-11-12","12:30 PM",0,1,7,0,2,3,"7-4",0],
[4085901,"Thu","2026-11-12","12:30 PM",0,2,7,0,181,7,"8-7",0],
[4086059,"Thu","2026-11-12","12:40 PM",7,1,9,0,138,161,"3-3",0],
[4086072,"Thu","2026-11-12","12:40 PM",7,2,9,0,141,162,"3-0",0],
[4086085,"Thu","2026-11-12","12:50 PM",8,1,5,0,182,183,"4-0",0],
[4086098,"Thu","2026-11-12","12:50 PM",8,2,5,0,184,185,"2-5",0],
[4085976,"Thu","2026-11-12","1:00 PM",4,1,4,0,186,187,"0-4",0],
[4085989,"Thu","2026-11-12","1:00 PM",4,2,4,0,188,189,"4-2",0],
[4086001,"Thu","2026-11-12","1:00 PM",5,1,5,0,190,191,"4-2",0],
[4086013,"Thu","2026-11-12","1:00 PM",5,2,5,0,192,193,"3-3",0],
[4086028,"Thu","2026-11-12","1:00 PM",6,1,9,0,142,158,"3-1",0],
[4086045,"Thu","2026-11-12","1:00 PM",6,2,9,0,144,160,"1-4",0],
[4085911,"Thu","2026-11-12","1:15 PM",1,1,2,0,194,195,"6-1",0],
[4085921,"Thu","2026-11-12","1:15 PM",1,2,2,0,196,197,"4-6",0],
[4085931,"Thu","2026-11-12","1:15 PM",2,1,3,0,198,199,"4-4",0],
[4085941,"Thu","2026-11-12","1:15 PM",2,2,3,0,200,201,"5-6",0],
[4086060,"Thu","2026-11-12","1:15 PM",7,1,5,0,202,203,"5-3",0],
[4086073,"Thu","2026-11-12","1:15 PM",7,2,5,0,204,205,"5-3",0],
[4086110,"Thu","2026-11-12","1:15 PM",9,1,14,0,206,207,"0-4",0],
[4086121,"Thu","2026-11-12","1:15 PM",9,2,14,0,208,209,"3-1",0],
[4085952,"Thu","2026-11-12","1:20 PM",3,1,4,0,210,211,"4-4",0],
[4085964,"Thu","2026-11-12","1:20 PM",3,2,4,0,212,213,"5-1",0],
[4085894,"Thu","2026-11-12","1:30 PM",0,1,7,0,36,25,"3-6",0],
[4085902,"Thu","2026-11-12","1:30 PM",0,2,7,0,23,6,"10-5",0],
[4086029,"Thu","2026-11-12","1:35 PM",6,1,9,0,180,159,"2-1",0],
[4086046,"Thu","2026-11-12","1:35 PM",6,2,9,0,214,215,"3-3",0],
[4086086,"Thu","2026-11-12","1:35 PM",8,1,5,0,216,42,"3-3",0],
[4086099,"Thu","2026-11-12","1:35 PM",8,2,5,0,217,218,"4-0",0],
[4085977,"Thu","2026-11-12","1:45 PM",4,1,4,0,152,169,"1-5",0],
[4085990,"Thu","2026-11-12","1:45 PM",4,2,4,0,219,220,"3-5",0],
[4086002,"Thu","2026-11-12","1:45 PM",5,1,5,0,221,222,"0-4",0],
[4086014,"Thu","2026-11-12","1:45 PM",5,2,5,0,223,224,"5-3",0],
[4086061,"Thu","2026-11-12","2:00 PM",7,1,5,0,225,226,"3-1",0],
[4086074,"Thu","2026-11-12","2:00 PM",7,2,5,0,227,228,"2-2",0],
[4086111,"Thu","2026-11-12","2:00 PM",9,1,13,0,165,168,"3-0",0],
[4086122,"Thu","2026-11-12","2:00 PM",9,2,13,0,167,166,"3-2",0],
[4085953,"Thu","2026-11-12","2:05 PM",3,1,4,0,44,9,"1-3",0],
[4085965,"Thu","2026-11-12","2:05 PM",3,2,4,0,229,230,"4-0",0],
[4085912,"Thu","2026-11-12","2:10 PM",1,1,2,0,231,232,"7-2",0],
[4085922,"Thu","2026-11-12","2:10 PM",1,2,2,0,178,233,"4-2",0],
];
const G3: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4085932,"Thu","2026-11-12","2:10 PM",2,1,3,0,234,174,"6-1",0],
[4085942,"Thu","2026-11-12","2:10 PM",2,2,3,0,235,177,"6-1",0],
[4086030,"Thu","2026-11-12","2:10 PM",6,1,9,0,236,237,"3-0",0],
[4086047,"Thu","2026-11-12","2:10 PM",6,2,9,0,238,239,"1-4",0],
[4086087,"Thu","2026-11-12","2:20 PM",8,1,5,0,240,241,"5-1",0],
[4086100,"Thu","2026-11-12","2:20 PM",8,2,5,0,242,243,"0-4",0],
[4085895,"Thu","2026-11-12","2:30 PM",0,1,7,0,244,2,"2-3",0],
[4085903,"Thu","2026-11-12","2:30 PM",0,2,7,0,245,181,"3-4",0],
[4085978,"Thu","2026-11-12","2:30 PM",4,1,4,0,246,247,"5-2",0],
[4085991,"Thu","2026-11-12","2:30 PM",4,2,4,0,188,248,"1-2",0],
[4086003,"Thu","2026-11-12","2:30 PM",5,1,5,0,190,249,"2-2",0],
[4086015,"Thu","2026-11-12","2:30 PM",5,2,5,0,192,250,"2-2",0],
[4086112,"Thu","2026-11-12","2:35 PM",9,1,2,0,179,251,"4-5",0],
[4086031,"Thu","2026-11-12","2:45 PM",6,1,9,0,252,253,"0-3",0],
[4086048,"Thu","2026-11-12","2:45 PM",6,2,9,0,215,254,"4-1",0],
[4086062,"Thu","2026-11-12","2:45 PM",7,1,5,0,255,203,"3-2",0],
[4086075,"Thu","2026-11-12","2:45 PM",7,2,5,0,256,205,"4-3",0],
[4085954,"Thu","2026-11-12","2:50 PM",3,1,4,0,33,211,"2-4",0],
[4085966,"Thu","2026-11-12","2:50 PM",3,2,4,0,257,213,"5-2",0],
[4085913,"Thu","2026-11-12","3:05 PM",1,1,8,0,258,259,"4-2",0],
[4085923,"Thu","2026-11-12","3:05 PM",1,2,8,0,260,261,"5-0",0],
[4085933,"Thu","2026-11-12","3:05 PM",2,1,3,0,198,175,"3-4",0],
[4085943,"Thu","2026-11-12","3:05 PM",2,2,3,0,176,201,"7-3",0],
[4086088,"Thu","2026-11-12","3:05 PM",8,1,5,0,216,182,"3-3",0],
[4086101,"Thu","2026-11-12","3:05 PM",8,2,5,0,217,184,"3-4",0],
[4085979,"Thu","2026-11-12","3:15 PM",4,1,4,0,200,187,"2-5",0],
[4085992,"Thu","2026-11-12","3:15 PM",4,2,4,0,189,219,"4-0",0],
[4086004,"Thu","2026-11-12","3:15 PM",5,1,5,0,191,221,"5-1",0],
[4086016,"Thu","2026-11-12","3:15 PM",5,2,5,0,224,193,"4-0",0],
[4086113,"Thu","2026-11-12","3:15 PM",9,1,14,0,206,209,"4-3",0],
[4086123,"Thu","2026-11-12","3:15 PM",9,2,14,0,208,207,"4-0",0],
[4086032,"Thu","2026-11-12","3:20 PM",6,1,9,0,236,262,"1-1",0],
[4086049,"Thu","2026-11-12","3:20 PM",6,2,9,0,214,263,"2-3",0],
[4085896,"Thu","2026-11-12","3:30 PM",0,1,7,0,36,3,"7-4",0],
[4085904,"Thu","2026-11-12","3:30 PM",0,2,7,0,23,7,"6-4",0],
[4086063,"Thu","2026-11-12","3:30 PM",7,1,5,0,202,226,"4-0",0],
[4086076,"Thu","2026-11-12","3:30 PM",7,2,5,0,204,228,"1-4",0],
[4085955,"Thu","2026-11-12","3:35 PM",3,1,4,0,210,9,"2-2",0],
[4085967,"Thu","2026-11-12","3:35 PM",3,2,4,0,229,212,"4-0",0],
[4086089,"Thu","2026-11-12","3:50 PM",8,1,5,0,241,185,"1-5",0],
[4086102,"Thu","2026-11-12","3:50 PM",8,2,5,0,242,183,"1-3",0],
[4086033,"Thu","2026-11-12","3:55 PM",6,1,9,0,237,253,"2-3",0],
[4086050,"Thu","2026-11-12","3:55 PM",6,2,9,0,239,254,"3-4",0],
[4085914,"Thu","2026-11-12","4:00 PM",1,1,2,0,194,232,"3-8",0],
[4085924,"Thu","2026-11-12","4:00 PM",1,2,2,0,233,251,"6-1",0],
[4085934,"Thu","2026-11-12","4:00 PM",2,1,3,0,234,199,"5-0",0],
[4085944,"Thu","2026-11-12","4:00 PM",2,2,3,0,200,235,"3-5",0],
[4085980,"Thu","2026-11-12","4:00 PM",4,1,4,0,186,247,"4-4",0],
[4085993,"Thu","2026-11-12","4:00 PM",4,2,4,0,248,220,"1-5",0],
[4086005,"Thu","2026-11-12","4:00 PM",5,1,5,0,249,222,"3-2",0],
[4086017,"Thu","2026-11-12","4:00 PM",5,2,5,0,223,250,"4-0",0],
[4086114,"Thu","2026-11-12","4:00 PM",9,1,2,0,231,196,"6-4",0],
[4086124,"Thu","2026-11-12","4:00 PM",9,2,2,0,195,197,"2-6",0],
[4086064,"Thu","2026-11-12","4:15 PM",7,1,5,0,225,255,"5-1",0],
[4086077,"Thu","2026-11-12","4:15 PM",7,2,5,0,227,256,"3-1",0],
[4085956,"Thu","2026-11-12","4:20 PM",3,1,4,0,44,33,"4-2",0],
[4085968,"Thu","2026-11-12","4:20 PM",3,2,4,0,257,230,"4-0",0],
[4086034,"Thu","2026-11-12","4:30 PM",6,1,9,0,252,262,"0-3",0],
[4086051,"Thu","2026-11-12","4:30 PM",6,2,9,0,238,263,"0-3",0],
[4086090,"Thu","2026-11-12","4:35 PM",8,1,5,0,243,42,"3-2",0],
[4086103,"Thu","2026-11-12","4:35 PM",8,2,5,0,240,218,"2-1",0],
[4085981,"Thu","2026-11-12","4:45 PM",4,1,4,0,246,200,"5-2",0],
[4086141,"Fri","2026-11-13","7:00 AM",1,1,2,0,4,70,"6-1",0],
[4086151,"Fri","2026-11-13","7:00 AM",1,2,2,0,103,110,"5-0",0],
[4086161,"Fri","2026-11-13","7:00 AM",2,1,3,0,130,108,"5-5",0],
[4086171,"Fri","2026-11-13","7:00 AM",2,2,3,0,129,106,"5-3",0],
[4086181,"Fri","2026-11-13","7:00 AM",3,1,4,0,85,53,"4-0",0],
[4086192,"Fri","2026-11-13","7:00 AM",3,2,4,0,84,51,"1-5",0],
[4086203,"Fri","2026-11-13","7:00 AM",4,1,4,0,57,118,"5-1",0],
[4086216,"Fri","2026-11-13","7:00 AM",4,2,5,0,88,56,"5-2",0],
[4086228,"Fri","2026-11-13","7:00 AM",5,1,5,0,92,60,"W-F",1],
[4086240,"Fri","2026-11-13","7:00 AM",5,2,5,0,94,62,"4-4",0],
[4086252,"Fri","2026-11-13","7:00 AM",6,1,6,0,112,83,"4-3",0],
[4086269,"Fri","2026-11-13","7:00 AM",6,2,6,0,113,122,"3-3",0],
[4086286,"Fri","2026-11-13","7:00 AM",7,1,5,0,124,1,"1-5",0],
[4086299,"Fri","2026-11-13","7:00 AM",7,2,5,0,67,95,"5-6",0],
[4086312,"Fri","2026-11-13","7:00 AM",8,1,5,0,73,101,"1-4",0],
[4086324,"Fri","2026-11-13","7:00 AM",8,2,5,0,72,125,"1-4",0],
[4086336,"Fri","2026-11-13","7:00 AM",9,1,2,0,0,102,"4-6",0],
[4086347,"Fri","2026-11-13","7:00 AM",9,2,2,0,19,104,"8-4",0],
[4098294,"Fri","2026-11-13","7:00 AM",10,1,15,0,264,265,"W-L",1],
[4098295,"Fri","2026-11-13","7:05 AM",10,1,15,0,266,267,"W-L",1],
[4098296,"Fri","2026-11-13","7:10 AM",10,1,15,0,268,269,"L-W",1],
[4098297,"Fri","2026-11-13","7:15 AM",10,1,15,0,270,271,"",3],
[4098298,"Fri","2026-11-13","7:20 AM",10,1,15,0,272,273,"W-L",1],
[4098299,"Fri","2026-11-13","7:25 AM",10,1,15,0,274,275,"W-L",1],
[4086125,"Fri","2026-11-13","7:30 AM",0,1,7,0,11,8,"4-3",0],
[4086133,"Fri","2026-11-13","7:30 AM",0,2,7,0,114,78,"3-5",0],
[4086253,"Fri","2026-11-13","7:30 AM",6,1,6,0,121,64,"3-0",0],
[4086270,"Fri","2026-11-13","7:30 AM",6,2,6,0,81,82,"4-1",0],
[4098300,"Fri","2026-11-13","7:30 AM",10,1,15,0,276,28,"L-W",1],
[4098301,"Fri","2026-11-13","7:35 AM",10,1,15,0,277,111,"W-L",1],
[4098302,"Fri","2026-11-13","7:40 AM",10,1,15,0,265,187,"L-W",1],
[4086182,"Fri","2026-11-13","7:45 AM",3,1,4,0,116,86,"5-3",0],
[4086193,"Fri","2026-11-13","7:45 AM",3,2,4,0,32,52,"3-4",0],
[4086204,"Fri","2026-11-13","7:45 AM",4,1,4,0,89,58,"5-1",0],
[4086217,"Fri","2026-11-13","7:45 AM",4,2,5,0,55,117,"4-0",0],
[4086229,"Fri","2026-11-13","7:45 AM",5,1,5,0,59,119,"2-1",0],
[4086241,"Fri","2026-11-13","7:45 AM",5,2,5,0,93,61,"2-2",0],
[4086287,"Fri","2026-11-13","7:45 AM",7,1,5,0,97,70,"3-1",0],
[4086300,"Fri","2026-11-13","7:45 AM",7,2,5,0,123,68,"3-5",0],
[4086313,"Fri","2026-11-13","7:45 AM",8,1,5,0,100,128,"2-3",0],
[4086325,"Fri","2026-11-13","7:45 AM",8,2,5,0,98,126,"4-0",0],
[4098303,"Fri","2026-11-13","7:45 AM",10,1,15,0,267,278,"L-W",1],
[4098304,"Fri","2026-11-13","7:50 AM",10,1,15,0,269,264,"",3],
[4086142,"Fri","2026-11-13","7:55 AM",1,1,2,0,109,131,"1-2",0],
[4086152,"Fri","2026-11-13","7:55 AM",1,2,2,0,27,46,"3-8",0],
[4086162,"Fri","2026-11-13","7:55 AM",2,1,3,0,107,50,"4-7",0],
[4086172,"Fri","2026-11-13","7:55 AM",2,2,3,0,105,47,"4-5",0],
[4086337,"Fri","2026-11-13","7:55 AM",9,1,2,0,45,77,"0-5",0],
[4086348,"Fri","2026-11-13","7:55 AM",9,2,2,0,75,76,"8-3",0],
[4098305,"Fri","2026-11-13","7:55 AM",10,1,15,0,271,266,"L-W",1],
[4086254,"Fri","2026-11-13","8:00 AM",6,1,6,0,80,65,"1-4",0],
[4086271,"Fri","2026-11-13","8:00 AM",6,2,6,0,112,66,"2-4",0],
[4098306,"Fri","2026-11-13","8:00 AM",10,1,15,0,273,268,"W-L",1],
[4098307,"Fri","2026-11-13","8:05 AM",10,1,15,0,275,270,"",3],
[4098308,"Fri","2026-11-13","8:10 AM",10,1,15,0,28,272,"W-L",1],
[4098309,"Fri","2026-11-13","8:15 AM",10,1,15,0,111,274,"W-L",1],
[4098310,"Fri","2026-11-13","8:20 AM",10,1,15,0,187,276,"W-L",1],
[4098311,"Fri","2026-11-13","8:25 AM",10,1,15,0,278,277,"W-L",1],
[4086126,"Fri","2026-11-13","8:30 AM",0,1,7,0,17,26,"6-3",0],
[4086134,"Fri","2026-11-13","8:30 AM",0,2,7,0,14,21,"4-5",0],
];
const G4: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4086183,"Fri","2026-11-13","8:30 AM",3,1,4,0,85,54,"6-4",0],
[4086194,"Fri","2026-11-13","8:30 AM",3,2,4,0,115,51,"0-4",0],
[4086205,"Fri","2026-11-13","8:30 AM",4,1,4,0,118,90,"3-3",0],
[4086218,"Fri","2026-11-13","8:30 AM",4,2,5,0,87,56,"4-0",0],
[4086230,"Fri","2026-11-13","8:30 AM",5,1,5,0,91,60,"W-F",1],
[4086242,"Fri","2026-11-13","8:30 AM",5,2,5,0,120,94,"5-1",0],
[4086255,"Fri","2026-11-13","8:30 AM",6,1,6,0,111,63,"4-1",0],
[4086272,"Fri","2026-11-13","8:30 AM",6,2,6,0,121,81,"3-0",0],
[4086288,"Fri","2026-11-13","8:30 AM",7,1,5,0,69,124,"2-4",0],
[4086301,"Fri","2026-11-13","8:30 AM",7,2,5,0,67,96,"1-5",0],
[4086314,"Fri","2026-11-13","8:30 AM",8,1,5,0,101,127,"6-2",0],
[4086326,"Fri","2026-11-13","8:30 AM",8,2,5,0,71,99,"1-5",0],
[4098312,"Fri","2026-11-13","8:30 AM",10,1,15,0,264,273,"W-L",1],
[4098313,"Fri","2026-11-13","8:35 AM",10,1,15,0,266,275,"W-L",1],
[4098314,"Fri","2026-11-13","8:40 AM",10,1,15,0,265,269,"L-W",1],
[4098315,"Fri","2026-11-13","8:45 AM",10,1,15,0,267,271,"W-L",1],
[4086143,"Fri","2026-11-13","8:50 AM",1,1,2,0,70,44,"2-7",0],
[4086153,"Fri","2026-11-13","8:50 AM",1,2,2,0,0,19,"3-2",0],
[4086163,"Fri","2026-11-13","8:50 AM",2,1,3,0,49,130,"2-4",0],
[4086173,"Fri","2026-11-13","8:50 AM",2,2,3,0,106,48,"4-4",0],
[4086338,"Fri","2026-11-13","8:50 AM",9,1,2,0,102,110,"4-2",0],
[4086349,"Fri","2026-11-13","8:50 AM",9,2,2,0,103,104,"6-1",0],
[4098316,"Fri","2026-11-13","8:50 AM",10,1,15,0,268,28,"L-W",1],
[4098317,"Fri","2026-11-13","8:55 AM",10,1,15,0,270,111,"W-L",1],
[4086256,"Fri","2026-11-13","9:00 AM",6,1,6,0,122,83,"3-0",0],
[4086273,"Fri","2026-11-13","9:00 AM",6,2,6,0,80,64,"3-0",0],
[4098318,"Fri","2026-11-13","9:00 AM",10,1,15,0,272,276,"W-L",1],
[4098319,"Fri","2026-11-13","9:05 AM",10,1,15,0,274,277,"",3],
[4098320,"Fri","2026-11-13","9:10 AM",10,1,15,0,269,187,"L-W",1],
[4086184,"Fri","2026-11-13","9:15 AM",3,1,4,0,53,116,"3-3",0],
[4086195,"Fri","2026-11-13","9:15 AM",3,2,4,0,84,52,"2-3",0],
[4086206,"Fri","2026-11-13","9:15 AM",4,1,4,0,89,57,"6-2",0],
[4086219,"Fri","2026-11-13","9:15 AM",4,2,5,0,117,88,"2-2",0],
[4086231,"Fri","2026-11-13","9:15 AM",5,1,5,0,119,92,"4-4",0],
[4086243,"Fri","2026-11-13","9:15 AM",5,2,5,0,93,62,"3-2",0],
[4086289,"Fri","2026-11-13","9:15 AM",7,1,5,0,1,70,"5-4",0],
[4086302,"Fri","2026-11-13","9:15 AM",7,2,5,0,95,123,"4-3",0],
[4086315,"Fri","2026-11-13","9:15 AM",8,1,5,0,74,128,"0-4",0],
[4086327,"Fri","2026-11-13","9:15 AM",8,2,5,0,72,126,"5-1",0],
[4098321,"Fri","2026-11-13","9:15 AM",10,1,15,0,271,278,"L-W",1],
[4098322,"Fri","2026-11-13","9:20 AM",10,1,15,0,28,264,"L-W",1],
[4098323,"Fri","2026-11-13","9:25 AM",10,1,15,0,111,266,"W-L",1],
[4086127,"Fri","2026-11-13","9:30 AM",0,1,7,0,279,37,"5-3",0],
[4086135,"Fri","2026-11-13","9:30 AM",0,2,7,0,24,15,"7-1",0],
[4086257,"Fri","2026-11-13","9:30 AM",6,1,6,0,111,82,"4-1",0],
[4086274,"Fri","2026-11-13","9:30 AM",6,2,6,0,65,113,"3-0",0],
[4098324,"Fri","2026-11-13","9:30 AM",10,1,15,0,273,265,"W-L",1],
[4098325,"Fri","2026-11-13","9:35 AM",10,1,15,0,275,267,"L-W",1],
[4098326,"Fri","2026-11-13","9:40 AM",10,1,15,0,276,268,"W-L",1],
[4086144,"Fri","2026-11-13","9:45 AM",1,1,2,0,18,178,"4-3",0],
[4086154,"Fri","2026-11-13","9:45 AM",1,2,2,0,75,77,"0-5",0],
[4086164,"Fri","2026-11-13","9:45 AM",2,1,3,0,50,108,"5-0",0],
[4086174,"Fri","2026-11-13","9:45 AM",2,2,3,0,47,129,"3-4",0],
[4086339,"Fri","2026-11-13","9:45 AM",9,1,2,0,4,131,"5-0",0],
[4086350,"Fri","2026-11-13","9:45 AM",9,2,2,0,27,45,"4-3",0],
[4098327,"Fri","2026-11-13","9:45 AM",10,1,15,0,277,270,"L-W",1],
[4098328,"Fri","2026-11-13","9:50 AM",10,1,15,0,187,272,"W-L",1],
[4098329,"Fri","2026-11-13","9:55 AM",10,1,15,0,278,274,"L-W",1],
[4086185,"Fri","2026-11-13","10:00 AM",3,1,4,0,86,54,"5-1",0],
[4086196,"Fri","2026-11-13","10:00 AM",3,2,4,0,32,115,"5-1",0],
[4086207,"Fri","2026-11-13","10:00 AM",4,1,4,0,90,58,"5-1",0],
[4086220,"Fri","2026-11-13","10:00 AM",4,2,5,0,87,55,"1-3",0],
[4086232,"Fri","2026-11-13","10:00 AM",5,1,5,0,91,59,"1-2",0],
[4086244,"Fri","2026-11-13","10:00 AM",5,2,5,0,61,120,"4-0",0],
[4086258,"Fri","2026-11-13","10:00 AM",6,1,9,0,145,137,"3-4",0],
[4086275,"Fri","2026-11-13","10:00 AM",6,2,6,0,66,63,"3-0",0],
[4086290,"Fri","2026-11-13","10:00 AM",7,1,9,0,141,161,"2-3",0],
[4086303,"Fri","2026-11-13","10:00 AM",7,2,9,0,140,162,"1-4",0],
[4086316,"Fri","2026-11-13","10:00 AM",8,1,5,0,73,100,"5-1",0],
[4086328,"Fri","2026-11-13","10:00 AM",8,2,5,0,99,125,"4-2",0],
[4098330,"Fri","2026-11-13","10:00 AM",10,1,15,0,269,28,"W-L",1],
[4098331,"Fri","2026-11-13","10:05 AM",10,1,15,0,271,111,"",3],
[4098332,"Fri","2026-11-13","10:10 AM",10,1,15,0,276,264,"L-W",1],
[4098333,"Fri","2026-11-13","10:15 AM",10,1,15,0,277,266,"W-L",1],
[4098334,"Fri","2026-11-13","10:20 AM",10,1,15,0,268,187,"W-L",1],
[4098335,"Fri","2026-11-13","10:25 AM",10,1,15,0,270,278,"W-L",1],
[4086128,"Fri","2026-11-13","10:30 AM",0,1,7,0,17,12,"4-5",0],
[4086136,"Fri","2026-11-13","10:30 AM",0,2,7,0,14,79,"6-2",0],
[4086259,"Fri","2026-11-13","10:30 AM",6,1,9,0,136,160,"2-4",0],
[4086276,"Fri","2026-11-13","10:30 AM",6,2,9,0,158,143,"0-3",0],
[4098336,"Fri","2026-11-13","10:30 AM",10,1,15,0,28,265,"W-L",1],
[4086291,"Fri","2026-11-13","10:35 AM",7,1,5,0,97,69,"5-1",0],
[4086304,"Fri","2026-11-13","10:35 AM",7,2,5,0,68,96,"4-4",0],
[4098337,"Fri","2026-11-13","10:35 AM",10,1,15,0,111,267,"W-L",1],
[4086145,"Fri","2026-11-13","10:40 AM",1,1,16,0,200,280,"2-5",0],
[4086155,"Fri","2026-11-13","10:40 AM",1,2,16,0,281,10,"4-3",0],
[4086165,"Fri","2026-11-13","10:40 AM",2,1,3,0,107,49,"5-6",0],
[4086175,"Fri","2026-11-13","10:40 AM",2,2,3,0,105,48,"6-1",0],
[4086340,"Fri","2026-11-13","10:40 AM",9,1,2,0,44,109,"5-1",0],
[4086351,"Fri","2026-11-13","10:40 AM",9,2,2,0,46,76,"5-0",0],
[4098338,"Fri","2026-11-13","10:40 AM",10,1,15,0,264,272,"W-L",1],
[4086186,"Fri","2026-11-13","10:45 AM",3,1,10,0,148,149,"5-0",0],
[4086197,"Fri","2026-11-13","10:45 AM",3,2,10,0,116,147,"4-5",0],
[4086208,"Fri","2026-11-13","10:45 AM",4,1,4,0,153,169,"2-2",0],
[4086221,"Fri","2026-11-13","10:45 AM",4,2,4,0,152,151,"5-1",0],
[4086233,"Fri","2026-11-13","10:45 AM",5,1,13,0,168,166,"3-0",0],
[4086245,"Fri","2026-11-13","10:45 AM",5,2,13,0,167,165,"3-2",0],
[4086317,"Fri","2026-11-13","10:45 AM",8,1,5,0,74,127,"3-5",0],
[4086329,"Fri","2026-11-13","10:45 AM",8,2,5,0,71,98,"1-5",0],
[4098339,"Fri","2026-11-13","10:45 AM",10,1,15,0,266,274,"L-W",1],
[4098340,"Fri","2026-11-13","10:50 AM",10,1,15,0,273,269,"W-L",1],
[4098341,"Fri","2026-11-13","10:55 AM",10,1,15,0,275,271,"W-L",1],
[4098342,"Fri","2026-11-13","11:00 AM",10,1,15,0,265,276,"W-L",1],
[4086260,"Fri","2026-11-13","11:05 AM",6,1,9,0,144,137,"3-2",0],
[4086277,"Fri","2026-11-13","11:05 AM",6,2,9,0,142,159,"2-3",0],
[4098343,"Fri","2026-11-13","11:05 AM",10,1,15,0,267,277,"W-L",1],
[4098344,"Fri","2026-11-13","11:10 AM",10,1,15,0,272,268,"W-L",1],
[4098345,"Fri","2026-11-13","11:15 AM",10,1,15,0,274,270,"L-W",1],
[4086292,"Fri","2026-11-13","11:20 AM",7,1,9,0,138,141,"4-1",0],
[4086305,"Fri","2026-11-13","11:20 AM",7,2,9,0,139,161,"2-4",0],
[4098346,"Fri","2026-11-13","11:20 AM",10,1,15,0,187,273,"W-L",1],
[4098347,"Fri","2026-11-13","11:25 AM",10,1,15,0,278,275,"W-L",1],
[4098291,"Fri","2026-11-13","11:30 AM",0,1,12,3,282,284,"5-7",0],
[4098292,"Fri","2026-11-13","11:30 AM",0,2,12,3,283,163,"5-7",0],
[4098348,"Fri","2026-11-13","11:30 AM",10,1,15,0,276,269,"L-W",1],
[4098349,"Fri","2026-11-13","11:35 AM",10,1,15,0,277,271,"",3],
[4098350,"Fri","2026-11-13","11:40 AM",10,1,15,0,268,264,"L-W",1],
[4098351,"Fri","2026-11-13","11:45 AM",10,1,15,0,270,266,"",3],
[4098352,"Fri","2026-11-13","11:50 AM",10,1,15,0,272,265,"",3],
[4098353,"Fri","2026-11-13","11:55 AM",10,1,15,0,274,267,"L-W",1],
[4098354,"Fri","2026-11-13","12:00 PM",10,1,15,0,28,273,"W-L",1],
[4086234,"Fri","2026-11-13","12:05 PM",5,1,11,0,155,157,"4-0",0],
];
const G5: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4086246,"Fri","2026-11-13","12:05 PM",5,2,11,0,156,154,"2-4",0],
[4098355,"Fri","2026-11-13","12:05 PM",10,1,15,0,111,275,"W-L",1],
[4098356,"Fri","2026-11-13","12:10 PM",10,1,15,0,264,187,"",3],
[4086209,"Fri","2026-11-13","12:15 PM",4,1,4,0,150,169,"4-3",0],
[4086222,"Fri","2026-11-13","12:15 PM",4,2,4,0,151,153,"5-1",0],
[4086318,"Fri","2026-11-13","12:15 PM",8,1,5,0,42,182,"2-3",0],
[4086330,"Fri","2026-11-13","12:15 PM",8,2,5,0,217,241,"3-1",0],
[4098357,"Fri","2026-11-13","12:15 PM",10,1,15,0,266,278,"L-W",1],
[4086146,"Fri","2026-11-13","12:20 PM",1,1,8,0,170,133,"3-6",0],
[4086156,"Fri","2026-11-13","12:20 PM",1,2,8,0,171,135,"0-5",0],
[4086166,"Fri","2026-11-13","12:20 PM",2,1,3,0,201,177,"3-5",0],
[4086176,"Fri","2026-11-13","12:20 PM",2,2,3,0,199,175,"3-5",0],
[4086341,"Fri","2026-11-13","12:20 PM",9,1,2,0,178,251,"5-0",0],
[4086352,"Fri","2026-11-13","12:20 PM",9,2,2,0,18,233,"3-1",0],
[4098358,"Fri","2026-11-13","12:20 PM",10,1,15,0,269,272,"W-L",1],
[4086261,"Fri","2026-11-13","12:25 PM",6,1,9,0,160,145,"3-3",0],
[4086278,"Fri","2026-11-13","12:25 PM",6,2,9,0,180,158,"2-2",0],
[4098359,"Fri","2026-11-13","12:25 PM",10,1,15,0,271,274,"W-L",1],
[4086129,"Fri","2026-11-13","12:30 PM",0,1,7,0,244,25,"2-4",0],
[4086137,"Fri","2026-11-13","12:30 PM",0,2,7,0,245,6,"7-6",0],
[4098360,"Fri","2026-11-13","12:30 PM",10,1,15,0,265,268,"L-W",1],
[4098361,"Fri","2026-11-13","12:35 PM",10,1,15,0,267,270,"L-W",1],
[4086293,"Fri","2026-11-13","12:40 PM",7,1,9,0,139,162,"1-3",0],
[4086306,"Fri","2026-11-13","12:40 PM",7,2,9,0,138,140,"3-0",0],
[4098362,"Fri","2026-11-13","12:40 PM",10,1,15,0,273,276,"W-L",1],
[4098363,"Fri","2026-11-13","12:45 PM",10,1,15,0,275,277,"L-W",1],
[4086235,"Fri","2026-11-13","12:50 PM",5,1,5,0,191,222,"4-2",0],
[4086247,"Fri","2026-11-13","12:50 PM",5,2,5,0,223,192,"5-3",0],
[4098364,"Fri","2026-11-13","12:50 PM",10,1,15,0,187,28,"L-W",1],
[4098365,"Fri","2026-11-13","12:55 PM",10,1,15,0,278,111,"W-L",1],
[4086210,"Fri","2026-11-13","1:00 PM",4,1,4,0,247,187,"0-4",0],
[4086223,"Fri","2026-11-13","1:00 PM",4,2,4,0,189,220,"4-4",0],
[4086262,"Fri","2026-11-13","1:00 PM",6,1,9,0,144,136,"3-0",0],
[4086279,"Fri","2026-11-13","1:00 PM",6,2,9,0,143,159,"0-2",0],
[4086319,"Fri","2026-11-13","1:00 PM",8,1,5,0,218,184,"0-4",0],
[4086331,"Fri","2026-11-13","1:00 PM",8,2,5,0,216,242,"6-2",0],
[4086187,"Fri","2026-11-13","1:05 PM",3,1,4,0,229,213,"4-0",0],
[4086198,"Fri","2026-11-13","1:05 PM",3,2,4,0,9,211,"3-1",0],
[4086147,"Fri","2026-11-13","1:15 PM",1,1,16,0,200,10,"0-5",0],
[4086157,"Fri","2026-11-13","1:15 PM",1,2,16,0,281,280,"3-2",0],
[4086167,"Fri","2026-11-13","1:15 PM",2,1,3,0,176,235,"3-2",0],
[4086177,"Fri","2026-11-13","1:15 PM",2,2,3,0,198,174,"4-4",0],
[4086294,"Fri","2026-11-13","1:15 PM",7,1,5,0,228,205,"4-2",0],
[4086307,"Fri","2026-11-13","1:15 PM",7,2,5,0,226,203,"4-0",0],
[4086342,"Fri","2026-11-13","1:15 PM",9,1,2,0,195,196,"1-6",0],
[4086353,"Fri","2026-11-13","1:15 PM",9,2,2,0,231,194,"5-4",0],
[4086130,"Fri","2026-11-13","1:30 PM",0,1,7,0,24,37,"2-3",0],
[4086138,"Fri","2026-11-13","1:30 PM",0,2,7,0,279,15,"4-5",0],
[4086236,"Fri","2026-11-13","1:35 PM",5,1,5,0,221,249,"1-3",0],
[4086248,"Fri","2026-11-13","1:35 PM",5,2,5,0,224,250,"1-3",0],
[4086263,"Fri","2026-11-13","1:35 PM",6,1,9,0,238,215,"0-3",0],
[4086280,"Fri","2026-11-13","1:35 PM",6,2,9,0,142,180,"4-1",0],
[4086211,"Fri","2026-11-13","1:45 PM",4,1,4,0,150,152,"2-1",0],
[4086224,"Fri","2026-11-13","1:45 PM",4,2,4,0,248,219,"6-3",0],
[4086320,"Fri","2026-11-13","1:45 PM",8,1,5,0,240,185,"2-5",0],
[4086332,"Fri","2026-11-13","1:45 PM",8,2,5,0,42,183,"0-4",0],
[4086188,"Fri","2026-11-13","1:50 PM",3,1,4,0,212,230,"5-1",0],
[4086199,"Fri","2026-11-13","1:50 PM",3,2,4,0,210,33,"2-3",0],
[4086295,"Fri","2026-11-13","2:00 PM",7,1,5,0,204,256,"4-2",0],
[4086308,"Fri","2026-11-13","2:00 PM",7,2,5,0,202,255,"3-2",0],
[4086148,"Fri","2026-11-13","2:10 PM",1,1,8,0,259,261,"4-3",0],
[4086158,"Fri","2026-11-13","2:10 PM",1,2,8,0,172,260,"5-1",0],
[4086168,"Fri","2026-11-13","2:10 PM",2,1,3,0,200,177,"1-6",0],
[4086178,"Fri","2026-11-13","2:10 PM",2,2,3,0,234,175,"6-1",0],
[4086264,"Fri","2026-11-13","2:10 PM",6,1,9,0,263,239,"4-1",0],
[4086281,"Fri","2026-11-13","2:10 PM",6,2,9,0,262,253,"2-3",0],
[4086343,"Fri","2026-11-13","2:10 PM",9,1,2,0,146,251,"4-5",0],
[4086354,"Fri","2026-11-13","2:10 PM",9,2,2,0,233,179,"6-2",0],
[4086237,"Fri","2026-11-13","3:00 PM",5,1,5,0,190,222,"4-0",0],
[4086249,"Fri","2026-11-13","3:00 PM",5,2,5,0,223,193,"4-1",0],
[4086131,"Fri","2026-11-13","2:30 PM",0,1,7,0,244,3,"3-4",0],
[4086139,"Fri","2026-11-13","2:30 PM",0,2,7,0,245,7,"4-6",0],
[4086212,"Fri","2026-11-13","2:30 PM",4,1,4,0,186,200,"2-5",0],
[4086225,"Fri","2026-11-13","2:30 PM",4,2,4,0,188,220,"4-1",0],
[4086321,"Fri","2026-11-13","2:30 PM",8,1,5,0,241,184,"4-3",0],
[4086333,"Fri","2026-11-13","2:30 PM",8,2,5,0,216,243,"2-5",0],
[4086189,"Fri","2026-11-13","2:35 PM",3,1,4,0,257,229,"2-3",0],
[4086200,"Fri","2026-11-13","2:35 PM",3,2,4,0,44,211,"5-1",0],
[4086265,"Fri","2026-11-13","2:45 PM",6,1,9,0,214,254,"4-1",0],
[4086282,"Fri","2026-11-13","2:45 PM",6,2,9,0,252,237,"0-3",0],
[4086296,"Fri","2026-11-13","2:45 PM",7,1,5,0,227,205,"3-5",0],
[4086309,"Fri","2026-11-13","2:45 PM",7,2,5,0,225,203,"0-2",0],
[4086149,"Fri","2026-11-13","3:05 PM",1,1,8,0,258,173,"4-1",0],
[4086159,"Fri","2026-11-13","3:05 PM",1,2,8,0,134,132,"5-0",0],
[4086169,"Fri","2026-11-13","3:05 PM",2,1,3,0,235,201,"2-6",0],
[4086179,"Fri","2026-11-13","3:05 PM",2,2,3,0,174,199,"2-5",0],
[4086238,"Fri","2026-11-13","3:45 PM",5,1,5,0,191,249,"2-1",0],
[4086250,"Fri","2026-11-13","3:45 PM",5,2,5,0,192,224,"4-2",0],
[4086344,"Fri","2026-11-13","3:05 PM",9,1,2,0,232,196,"5-6",0],
[4086355,"Fri","2026-11-13","3:05 PM",9,2,2,0,194,197,"7-2",0],
[4086213,"Fri","2026-11-13","3:15 PM",4,1,4,0,246,187,"4-1",0],
[4086226,"Fri","2026-11-13","3:15 PM",4,2,4,0,189,248,"4-0",0],
[4086322,"Fri","2026-11-13","3:15 PM",8,1,5,0,218,185,"1-5",0],
[4086334,"Fri","2026-11-13","3:15 PM",8,2,5,0,242,182,"1-5",0],
[4086190,"Fri","2026-11-13","3:20 PM",3,1,4,0,213,230,"2-2",0],
[4086201,"Fri","2026-11-13","3:20 PM",3,2,4,0,33,9,"2-1",0],
[4086266,"Fri","2026-11-13","3:20 PM",6,1,9,0,215,239,"1-2",0],
[4086283,"Fri","2026-11-13","3:20 PM",6,2,9,0,236,253,"3-3",0],
[4086132,"Fri","2026-11-13","3:30 PM",0,1,7,0,36,2,"2-3",0],
[4086140,"Fri","2026-11-13","3:30 PM",0,2,7,0,23,181,"5-0",0],
[4086297,"Fri","2026-11-13","3:30 PM",7,1,5,0,256,228,"1-5",0],
[4086310,"Fri","2026-11-13","3:30 PM",7,2,5,0,255,226,"0-4",0],
[4086239,"Fri","2026-11-13","4:30 PM",5,1,5,0,190,221,"4-0",0],
[4086251,"Fri","2026-11-13","4:30 PM",5,2,5,0,250,193,"5-1",0],
[4086267,"Fri","2026-11-13","3:55 PM",6,1,9,0,238,214,"1-4",0],
[4086284,"Fri","2026-11-13","3:55 PM",6,2,9,0,237,262,"1-2",0],
[4086150,"Fri","2026-11-13","4:00 PM",1,1,2,0,231,195,"4-1",0],
[4086160,"Fri","2026-11-13","4:00 PM",1,2,2,0,146,179,"5-4",0],
[4086170,"Fri","2026-11-13","4:00 PM",2,1,3,0,200,176,"3-8",0],
[4086180,"Fri","2026-11-13","4:00 PM",2,2,3,0,234,198,"4-1",0],
[4086214,"Fri","2026-11-13","4:00 PM",4,1,4,0,200,247,"2-1",0],
[4086227,"Fri","2026-11-13","4:00 PM",4,2,4,0,188,219,"2-3",0],
[4086323,"Fri","2026-11-13","4:00 PM",8,1,5,0,243,183,"1-1",0],
[4086335,"Fri","2026-11-13","4:00 PM",8,2,5,0,217,240,"2-1",0],
[4086345,"Fri","2026-11-13","4:00 PM",9,1,14,0,207,209,"3-2",0],
[4086356,"Fri","2026-11-13","4:00 PM",9,2,14,0,208,206,"3-3",0],
[4086191,"Fri","2026-11-13","4:05 PM",3,1,4,0,257,212,"5-1",0],
[4086202,"Fri","2026-11-13","4:05 PM",3,2,4,0,44,210,"1-5",0],
[4086298,"Fri","2026-11-13","4:15 PM",7,1,5,0,227,204,"1-5",0],
[4086311,"Fri","2026-11-13","4:15 PM",7,2,5,0,225,202,"2-4",0],
[4086268,"Fri","2026-11-13","4:30 PM",6,1,9,0,263,254,"4-1",0],
[4086285,"Fri","2026-11-13","4:30 PM",6,2,9,0,236,252,"4-1",0],
];
const G6: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4086215,"Fri","2026-11-13","4:45 PM",4,1,4,0,246,186,"5-1",0],
[4086346,"Fri","2026-11-13","4:45 PM",9,1,2,0,232,197,"6-5",0],
[4086441,"Sat","2026-11-14","7:00 AM",1,1,8,0,171,133,"",4],
[4086447,"Sat","2026-11-14","7:00 AM",1,2,8,0,172,259,"",4],
[4086425,"Sat","2026-11-14","7:30 AM",0,1,16,0,281,200,"",4],
[4086433,"Sat","2026-11-14","7:30 AM",0,2,16,0,280,10,"",4],
[4086442,"Sat","2026-11-14","7:55 AM",1,1,8,0,132,135,"",4],
[4086448,"Sat","2026-11-14","7:55 AM",1,2,8,0,173,260,"",4],
[4086426,"Sat","2026-11-14","8:30 AM",0,1,7,0,26,12,"",4],
[4086434,"Sat","2026-11-14","8:30 AM",0,2,7,0,21,79,"",4],
[4086443,"Sat","2026-11-14","8:50 AM",1,1,8,0,172,258,"",4],
[4086449,"Sat","2026-11-14","8:50 AM",1,2,8,0,134,170,"",4],
[4086427,"Sat","2026-11-14","9:30 AM",0,1,7,0,17,11,"",4],
[4086435,"Sat","2026-11-14","9:30 AM",0,2,7,0,14,114,"",4],
[4086444,"Sat","2026-11-14","9:45 AM",1,1,8,0,173,261,"",4],
[4086450,"Sat","2026-11-14","9:45 AM",1,2,8,0,135,133,"",4],
[4086428,"Sat","2026-11-14","10:30 AM",0,1,7,0,26,8,"",4],
[4086436,"Sat","2026-11-14","10:30 AM",0,2,7,0,21,78,"",4],
[4086445,"Sat","2026-11-14","10:40 AM",1,1,8,0,134,171,"",4],
[4086451,"Sat","2026-11-14","10:40 AM",1,2,8,0,259,260,"",4],
[4086446,"Sat","2026-11-14","11:35 AM",1,1,8,0,170,132,"",4],
[4086452,"Sat","2026-11-14","11:35 AM",1,2,8,0,258,261,"",4],
[4086429,"Sat","2026-11-14","12:30 PM",0,1,7,0,25,3,"",4],
[4086437,"Sat","2026-11-14","12:30 PM",0,2,7,0,6,7,"",4],
[4086430,"Sat","2026-11-14","1:30 PM",0,1,7,0,24,279,"",4],
[4086438,"Sat","2026-11-14","1:30 PM",0,2,7,0,37,15,"",4],
[4086431,"Sat","2026-11-14","2:30 PM",0,1,7,0,25,2,"",4],
[4086439,"Sat","2026-11-14","2:30 PM",0,2,7,0,6,181,"",4],
[4086432,"Sat","2026-11-14","3:30 PM",0,1,7,0,244,36,"",4],
[4086440,"Sat","2026-11-14","3:30 PM",0,2,7,0,245,23,"",4],
[4089287,"Sun","2026-11-15","9:00 AM",1,1,8,2,674,675,"",4],
[4089289,"Sun","2026-11-15","9:00 AM",1,2,8,2,676,677,"",4],
[4099536,"Sun","2026-11-15","10:20 AM",2,1,4,3,407,408,"",4],
[4099538,"Sun","2026-11-15","10:20 AM",2,2,4,3,409,410,"",4],
[4089288,"Sun","2026-11-15","11:00 AM",1,1,8,3,678,416,"",4],
[4089290,"Sun","2026-11-15","11:00 AM",1,2,8,3,679,418,"",4],
[4099534,"Sun","2026-11-15","12:00 PM",2,1,4,4,427,428,"",4],
[4099533,"Sun","2026-11-15","1:15 PM",0,2,4,4,431,432,"",4],
[4089286,"Sun","2026-11-15","2:10 PM",0,1,8,4,437,438,"",4],
[4098884,"Fri","2026-11-13","12:15 PM",3,1,6,2,65,112,"3-0",0],
[4098885,"Fri","2026-11-13","12:15 PM",3,2,6,2,81,111,"4-2",0],
[4099541,"Sat","2026-11-14","12:45 PM",2,1,3,5,234,201,"",4],
[4099553,"Sat","2026-11-14","1:15 PM",1,1,2,6,44,0,"",4],
[4099557,"Sat","2026-11-14","1:15 PM",1,2,2,6,27,102,"",4],
[4099542,"Sat","2026-11-14","1:45 PM",2,1,3,5,50,175,"",4],
[4099544,"Sat","2026-11-14","1:45 PM",2,2,3,5,105,129,"",4],
[4099554,"Sat","2026-11-14","2:10 PM",1,1,2,6,77,194,"",4],
[4099558,"Sat","2026-11-14","2:10 PM",1,2,2,6,178,233,"",4],
[4099555,"Sat","2026-11-14","3:05 PM",1,1,2,5,4,389,"",4],
[4099559,"Sat","2026-11-14","3:05 PM",1,2,2,5,46,387,"",4],
[4099556,"Sat","2026-11-14","4:00 PM",1,1,2,5,231,381,"",4],
[4099560,"Sat","2026-11-14","4:00 PM",1,2,2,5,18,379,"",4],
[4099563,"Sun","2026-11-15","7:00 AM",1,1,2,2,391,392,"",4],
[4099566,"Sun","2026-11-15","7:00 AM",1,2,2,2,393,394,"",4],
[4099549,"Sun","2026-11-15","7:00 AM",2,1,10,2,147,384,"",4],
[4099550,"Sun","2026-11-15","7:00 AM",2,2,10,2,149,386,"",4],
[4099551,"Sun","2026-11-15","7:00 AM",3,1,10,2,148,372,"",4],
[4099552,"Sun","2026-11-15","7:00 AM",3,2,10,2,116,374,"",4],
[4099564,"Sun","2026-11-15","8:00 AM",1,1,2,2,395,396,"",4],
[4099567,"Sun","2026-11-15","8:00 AM",1,2,2,2,397,398,"",4],
[4099547,"Sun","2026-11-15","10:00 AM",1,1,3,3,403,404,"",4],
[4099548,"Sun","2026-11-15","10:00 AM",1,2,3,3,405,406,"",4],
[4099565,"Sun","2026-11-15","12:00 PM",1,1,2,3,423,424,"",4],
[4099568,"Sun","2026-11-15","12:00 PM",1,2,2,3,425,426,"",4],
[4099545,"Sun","2026-11-15","1:15 PM",0,1,3,4,429,430,"",4],
[4099561,"Sun","2026-11-15","2:10 PM",0,2,2,4,439,440,"",4],
[4099546,"Sun","2026-11-15","4:00 PM",1,1,3,4,445,446,"",4],
[4099562,"Sun","2026-11-15","4:00 PM",1,2,2,4,447,448,"",4],
[4099521,"Sat","2026-11-14","7:00 AM",2,1,4,6,89,44,"",4],
[4099527,"Sat","2026-11-14","7:00 AM",2,2,4,6,229,53,"",4],
[4099522,"Sat","2026-11-14","7:50 AM",2,1,4,6,187,57,"",4],
[4099528,"Sat","2026-11-14","7:50 AM",2,2,4,6,257,52,"",4],
[4099523,"Sat","2026-11-14","8:40 AM",2,1,4,6,150,9,"",4],
[4099529,"Sat","2026-11-14","8:40 AM",2,2,4,6,246,220,"",4],
[4099524,"Sat","2026-11-14","9:30 AM",2,1,4,6,51,189,"",4],
[4099530,"Sat","2026-11-14","9:30 AM",2,2,4,6,116,169,"",4],
[4099525,"Sat","2026-11-14","10:20 AM",2,1,4,5,305,285,"",4],
[4099531,"Sat","2026-11-14","10:20 AM",2,2,4,5,307,287,"",4],
[4099526,"Sat","2026-11-14","11:10 AM",2,1,4,5,339,323,"",4],
[4099535,"Sun","2026-11-15","8:00 AM",2,1,14,2,207,351,"",4],
[4099537,"Sun","2026-11-15","8:00 AM",2,2,14,2,208,349,"",4],
[4099539,"Sun","2026-11-15","8:00 AM",3,1,14,2,209,363,"",4],
[4099540,"Sun","2026-11-15","8:00 AM",3,2,14,2,206,361,"",4],
[4099473,"Sat","2026-11-14","7:00 AM",8,1,9,6,236,142,"",4],
[4099477,"Sat","2026-11-14","7:00 AM",8,2,9,6,215,214,"",4],
[4099474,"Sat","2026-11-14","7:35 AM",8,1,9,6,159,144,"",4],
[4099478,"Sat","2026-11-14","7:35 AM",8,2,9,6,162,262,"",4],
[4099475,"Sat","2026-11-14","8:10 AM",8,1,9,5,263,303,"",4],
[4099479,"Sat","2026-11-14","8:10 AM",8,2,9,5,138,301,"",4],
[4099476,"Sat","2026-11-14","8:45 AM",8,1,9,5,160,299,"",4],
[4099480,"Sat","2026-11-14","8:45 AM",8,2,9,5,253,297,"",4],
[4099532,"Sat","2026-11-14","11:10 AM",2,2,4,5,337,321,"",4],
[4099543,"Sat","2026-11-14","12:45 PM",2,2,3,5,176,49,"",4],
[4099483,"Sun","2026-11-15","8:50 AM",2,1,13,2,168,319,"",4],
[4099484,"Sun","2026-11-15","8:50 AM",2,2,13,2,167,317,"",4],
[4099485,"Sun","2026-11-15","8:50 AM",3,1,13,2,165,335,"",4],
[4099487,"Sun","2026-11-15","8:50 AM",3,2,13,2,166,333,"",4],
[4099486,"Sun","2026-11-15","10:20 AM",3,1,9,3,411,412,"",4],
[4099488,"Sun","2026-11-15","10:20 AM",3,2,9,3,413,414,"",4],
[4099481,"Sun","2026-11-15","1:45 PM",1,1,9,4,433,434,"",4],
[4099482,"Sun","2026-11-15","1:45 PM",1,2,9,4,435,436,"",4],
[4099337,"Fri","2026-11-13","2:00 PM",10,1,15,2,270,187,"W-L",1],
[4099338,"Fri","2026-11-13","2:05 PM",10,1,15,2,264,267,"W-L",1],
[4099339,"Fri","2026-11-13","2:10 PM",10,1,15,2,278,269,"L-W",1],
[4099340,"Fri","2026-11-13","2:15 PM",10,1,15,2,28,111,"L-W",1],
[4099363,"Fri","2026-11-13","2:20 PM",5,1,6,3,66,81,"4-3",0],
[4099364,"Fri","2026-11-13","2:20 PM",5,2,6,3,121,65,"2-3",0],
[4099341,"Fri","2026-11-13","2:20 PM",10,1,15,2,187,270,"L-W",1],
[4099342,"Fri","2026-11-13","2:25 PM",10,1,15,2,267,264,"",3],
[4099343,"Fri","2026-11-13","2:30 PM",10,1,15,2,269,278,"L-W",1],
[4099344,"Fri","2026-11-13","2:35 PM",10,1,15,2,111,28,"",3],
[4099345,"Fri","2026-11-13","2:40 PM",10,1,15,2,270,187,"",3],
[4099346,"Fri","2026-11-13","2:45 PM",10,1,15,2,264,267,"W-L",1],
[4099347,"Fri","2026-11-13","2:50 PM",10,1,15,2,278,269,"W-L",1],
[4099348,"Fri","2026-11-13","2:55 PM",10,1,15,2,28,111,"L-W",1],
[4099365,"Sun","2026-11-15","7:30 AM",0,1,7,5,670,670,"",4],
[4099371,"Sun","2026-11-15","7:30 AM",0,2,7,5,670,670,"",4],
[4099366,"Sun","2026-11-15","8:30 AM",0,1,7,5,670,670,"",4],
[4099372,"Sun","2026-11-15","8:30 AM",0,2,7,5,670,670,"",4],
[4099367,"Sun","2026-11-15","9:30 AM",0,1,7,2,671,671,"",4],
[4099373,"Sun","2026-11-15","9:30 AM",0,2,7,2,671,671,"",4],
[4099368,"Sun","2026-11-15","10:30 AM",0,1,7,2,671,671,"",4],
];
const G7: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4099374,"Sun","2026-11-15","10:30 AM",0,2,7,2,671,671,"",4],
[4099369,"Sun","2026-11-15","12:15 PM",0,1,7,3,672,672,"",4],
[4099375,"Sun","2026-11-15","12:15 PM",0,2,7,3,672,672,"",4],
[4099370,"Sun","2026-11-15","3:10 PM",0,1,7,4,673,673,"",4],
[4099489,"Sat","2026-11-14","7:00 AM",3,1,5,7,98,101,"",4],
[4099496,"Sat","2026-11-14","7:00 AM",3,2,5,7,128,217,"",4],
[4099503,"Sat","2026-11-14","7:00 AM",4,1,5,7,68,55,"",4],
[4099508,"Sat","2026-11-14","7:00 AM",4,2,5,7,243,99,"",4],
[4099490,"Sat","2026-11-14","7:50 AM",3,1,5,7,93,125,"",4],
[4099497,"Sat","2026-11-14","7:50 AM",3,2,5,7,182,72,"",4],
[4099504,"Sat","2026-11-14","7:50 AM",4,1,5,7,190,1,"",4],
[4099509,"Sat","2026-11-14","7:50 AM",4,2,5,7,228,204,"",4],
[4099491,"Sat","2026-11-14","8:40 AM",3,1,5,7,61,250,"",4],
[4099498,"Sat","2026-11-14","8:40 AM",3,2,5,7,88,191,"",4],
[4099505,"Sat","2026-11-14","8:40 AM",4,1,5,7,59,225,"",4],
[4099510,"Sat","2026-11-14","8:40 AM",4,2,5,7,96,91,"",4],
[4099492,"Sat","2026-11-14","9:30 AM",3,1,5,6,185,289,"",4],
[4099499,"Sat","2026-11-14","9:30 AM",3,2,5,6,325,315,"",4],
[4099506,"Sat","2026-11-14","9:30 AM",4,1,5,6,223,291,"",4],
[4099511,"Sat","2026-11-14","9:30 AM",4,2,5,6,327,313,"",4],
[4099493,"Sat","2026-11-14","10:20 AM",3,1,5,6,202,293,"",4],
[4099500,"Sat","2026-11-14","10:20 AM",3,2,5,6,329,311,"",4],
[4099507,"Sat","2026-11-14","10:20 AM",4,1,5,6,97,295,"",4],
[4099512,"Sat","2026-11-14","10:20 AM",4,2,5,6,331,309,"",4],
[4099494,"Sat","2026-11-14","11:10 AM",3,1,5,5,353,341,"",4],
[4099501,"Sat","2026-11-14","11:10 AM",3,2,5,5,355,343,"",4],
[4099495,"Sat","2026-11-14","12:45 PM",3,1,5,5,357,345,"",4],
[4099502,"Sat","2026-11-14","12:45 PM",3,2,5,5,359,347,"",4],
[4099515,"Sun","2026-11-15","9:30 AM",2,1,11,2,156,367,"",4],
[4099517,"Sun","2026-11-15","9:30 AM",2,2,11,2,154,365,"",4],
[4099519,"Sun","2026-11-15","9:30 AM",3,1,11,2,157,377,"",4],
[4099520,"Sun","2026-11-15","9:30 AM",3,2,11,2,155,375,"",4],
[4099516,"Sun","2026-11-15","11:10 AM",2,1,5,3,419,420,"",4],
[4099518,"Sun","2026-11-15","11:10 AM",2,2,5,3,421,422,"",4],
[4099513,"Sun","2026-11-15","2:25 PM",1,1,5,4,441,442,"",4],
[4099514,"Sun","2026-11-15","2:25 PM",1,2,5,4,443,444,"",4],
[4099440,"Fri","2026-11-13","4:30 PM",0,1,6,4,121,81,"0-3",0],
[4099441,"Fri","2026-11-13","4:30 PM",0,2,6,4,65,66,"3-1",0],
[4099442,"Fri","2026-11-13","3:30 PM",10,1,15,3,264,270,"W-L",1],
[4099443,"Fri","2026-11-13","3:35 PM",10,1,15,3,111,278,"L-W",1],
[4099444,"Fri","2026-11-13","3:40 PM",10,1,15,3,270,264,"W-L",1],
[4099445,"Fri","2026-11-13","3:45 PM",10,1,15,3,278,111,"W-L",1],
[4099446,"Fri","2026-11-13","3:50 PM",10,1,15,3,264,270,"L-W",1],
[4099447,"Fri","2026-11-13","3:55 PM",10,1,15,3,111,278,"",3],
[4099466,"Fri","2026-11-13","4:15 PM",10,1,15,4,264,111,"W-L",1],
[4099467,"Fri","2026-11-13","4:20 PM",10,1,15,4,270,278,"L-W",1],
[4099468,"Fri","2026-11-13","4:25 PM",10,1,15,4,111,264,"",3],
[4099469,"Fri","2026-11-13","4:30 PM",10,1,15,4,278,270,"W-L",1],
[4099470,"Fri","2026-11-13","4:35 PM",10,1,15,4,264,111,"W-L",1],
[4099471,"Fri","2026-11-13","4:40 PM",10,1,15,4,270,278,"",3],
[4099472,"Sat","2026-11-14","11:30 AM",0,1,12,4,284,163,"",4],
[4099813,"Sat","2026-11-14","7:00 AM",5,1,18,0,454,265,"",4],
[4099977,"Sat","2026-11-14","7:00 AM",6,1,18,0,455,456,"",4],
[4100125,"Sat","2026-11-14","7:00 AM",7,1,18,0,457,38,"",4],
[4099569,"Sat","2026-11-14","7:00 AM",10,1,22,0,680,273,"",4],
[4099617,"Sat","2026-11-14","7:00 AM",12,1,23,0,681,682,"",4],
[4099814,"Sat","2026-11-14","7:03 AM",5,1,18,0,458,459,"",4],
[4099978,"Sat","2026-11-14","7:03 AM",6,1,18,0,460,461,"",4],
[4100126,"Sat","2026-11-14","7:03 AM",7,1,18,0,462,463,"",4],
[4099815,"Sat","2026-11-14","7:07 AM",5,1,18,0,464,465,"",4],
[4099979,"Sat","2026-11-14","7:07 AM",6,1,18,0,466,467,"",4],
[4100127,"Sat","2026-11-14","7:07 AM",7,1,18,0,468,469,"",4],
[4099618,"Sat","2026-11-14","7:07 AM",12,1,23,0,683,684,"",4],
[4099570,"Sat","2026-11-14","7:08 AM",10,1,22,0,28,268,"",4],
[4099816,"Sat","2026-11-14","7:10 AM",5,1,18,0,470,471,"",4],
[4099980,"Sat","2026-11-14","7:10 AM",6,1,18,0,472,473,"",4],
[4100128,"Sat","2026-11-14","7:10 AM",7,1,18,0,474,475,"",4],
[4099817,"Sat","2026-11-14","7:14 AM",5,1,18,0,265,476,"",4],
[4099981,"Sat","2026-11-14","7:14 AM",6,1,18,0,477,478,"",4],
[4100129,"Sat","2026-11-14","7:14 AM",7,1,18,0,479,480,"",4],
[4099619,"Sat","2026-11-14","7:14 AM",12,1,23,0,685,264,"",4],
[4099571,"Sat","2026-11-14","7:16 AM",10,1,22,0,278,187,"",4],
[4099818,"Sat","2026-11-14","7:17 AM",5,1,18,0,459,454,"",4],
[4099982,"Sat","2026-11-14","7:17 AM",6,1,18,0,461,455,"",4],
[4100130,"Sat","2026-11-14","7:17 AM",7,1,18,0,463,457,"",4],
[4099819,"Sat","2026-11-14","7:21 AM",5,1,18,0,465,458,"",4],
[4099983,"Sat","2026-11-14","7:21 AM",6,1,18,0,456,466,"",4],
[4100131,"Sat","2026-11-14","7:21 AM",7,1,18,0,38,468,"",4],
[4099620,"Sat","2026-11-14","7:21 AM",12,1,23,0,686,687,"",4],
[4099820,"Sat","2026-11-14","7:24 AM",5,1,18,0,471,464,"",4],
[4099984,"Sat","2026-11-14","7:24 AM",6,1,18,0,473,460,"",4],
[4100132,"Sat","2026-11-14","7:24 AM",7,1,18,0,475,462,"",4],
[4099572,"Sat","2026-11-14","7:24 AM",10,1,22,0,688,689,"",4],
[4099821,"Sat","2026-11-14","7:28 AM",5,1,18,0,476,470,"",4],
[4099985,"Sat","2026-11-14","7:28 AM",6,1,18,0,467,477,"",4],
[4100133,"Sat","2026-11-14","7:28 AM",7,1,18,0,469,479,"",4],
[4099621,"Sat","2026-11-14","7:28 AM",12,1,23,0,224,6,"",4],
[4099822,"Sat","2026-11-14","7:31 AM",5,1,18,0,454,465,"",4],
[4099986,"Sat","2026-11-14","7:31 AM",6,1,18,0,478,472,"",4],
[4100134,"Sat","2026-11-14","7:31 AM",7,1,18,0,480,474,"",4],
[4099573,"Sat","2026-11-14","7:32 AM",10,1,22,0,277,266,"",4],
[4099823,"Sat","2026-11-14","7:35 AM",5,1,18,0,265,459,"",4],
[4099987,"Sat","2026-11-14","7:35 AM",6,1,18,0,466,461,"",4],
[4100135,"Sat","2026-11-14","7:35 AM",7,1,18,0,468,463,"",4],
[4099622,"Sat","2026-11-14","7:35 AM",12,1,23,0,684,681,"",4],
[4099824,"Sat","2026-11-14","7:38 AM",5,1,18,0,458,471,"",4],
[4099988,"Sat","2026-11-14","7:38 AM",6,1,18,0,455,473,"",4],
[4100136,"Sat","2026-11-14","7:38 AM",7,1,18,0,457,475,"",4],
[4099574,"Sat","2026-11-14","7:40 AM",10,1,22,0,273,690,"",4],
[4099825,"Sat","2026-11-14","7:42 AM",5,1,18,0,464,470,"",4],
[4099989,"Sat","2026-11-14","7:42 AM",6,1,18,0,477,456,"",4],
[4100137,"Sat","2026-11-14","7:42 AM",7,1,18,0,479,38,"",4],
[4099623,"Sat","2026-11-14","7:42 AM",12,1,23,0,682,685,"",4],
[4099826,"Sat","2026-11-14","7:45 AM",5,1,18,0,459,476,"",4],
[4099990,"Sat","2026-11-14","7:45 AM",6,1,18,0,460,472,"",4],
[4100138,"Sat","2026-11-14","7:45 AM",7,1,18,0,462,474,"",4],
[4099575,"Sat","2026-11-14","7:48 AM",10,1,22,0,691,28,"",4],
[4099827,"Sat","2026-11-14","7:49 AM",5,1,18,0,471,454,"",4],
[4099991,"Sat","2026-11-14","7:49 AM",6,1,18,0,467,478,"",4],
[4100139,"Sat","2026-11-14","7:49 AM",7,1,18,0,469,480,"",4],
[4099624,"Sat","2026-11-14","7:49 AM",12,1,23,0,687,683,"",4],
[4099828,"Sat","2026-11-14","7:52 AM",5,1,18,0,465,265,"",4],
[4099992,"Sat","2026-11-14","7:52 AM",6,1,18,0,473,466,"",4],
[4100140,"Sat","2026-11-14","7:52 AM",7,1,18,0,475,468,"",4],
[4099829,"Sat","2026-11-14","7:56 AM",5,1,18,0,470,458,"",4],
[4099993,"Sat","2026-11-14","7:56 AM",6,1,18,0,461,477,"",4],
[4100141,"Sat","2026-11-14","7:56 AM",7,1,18,0,463,479,"",4],
[4099576,"Sat","2026-11-14","7:56 AM",10,1,22,0,689,278,"",4],
[4099625,"Sat","2026-11-14","7:56 AM",12,1,23,0,264,224,"",4],
[4099830,"Sat","2026-11-14","7:59 AM",5,1,18,0,476,464,"",4],
[4099994,"Sat","2026-11-14","7:59 AM",6,1,18,0,472,455,"",4],
[4100142,"Sat","2026-11-14","7:59 AM",7,1,18,0,474,457,"",4],
];
const G8: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4099831,"Sat","2026-11-14","8:03 AM",5,1,18,0,459,471,"",4],
[4099995,"Sat","2026-11-14","8:03 AM",6,1,18,0,456,467,"",4],
[4100143,"Sat","2026-11-14","8:03 AM",7,1,18,0,38,469,"",4],
[4099626,"Sat","2026-11-14","8:03 AM",12,1,23,0,6,686,"",4],
[4099577,"Sat","2026-11-14","8:04 AM",10,1,22,0,187,680,"",4],
[4099832,"Sat","2026-11-14","8:06 AM",5,1,18,0,470,454,"",4],
[4099996,"Sat","2026-11-14","8:06 AM",6,1,18,0,478,460,"",4],
[4100144,"Sat","2026-11-14","8:06 AM",7,1,18,0,480,462,"",4],
[4099833,"Sat","2026-11-14","8:10 AM",5,1,18,0,458,476,"",4],
[4099997,"Sat","2026-11-14","8:10 AM",6,1,18,0,477,473,"",4],
[4100145,"Sat","2026-11-14","8:10 AM",7,1,18,0,479,475,"",4],
[4099627,"Sat","2026-11-14","8:10 AM",12,1,23,0,685,684,"",4],
[4099578,"Sat","2026-11-14","8:12 AM",10,1,22,0,268,277,"",4],
[4099834,"Sat","2026-11-14","8:13 AM",5,1,18,0,471,265,"",4],
[4099998,"Sat","2026-11-14","8:13 AM",6,1,18,0,466,472,"",4],
[4100146,"Sat","2026-11-14","8:13 AM",7,1,18,0,468,474,"",4],
[4099835,"Sat","2026-11-14","8:17 AM",5,1,18,0,454,464,"",4],
[4099999,"Sat","2026-11-14","8:17 AM",6,1,18,0,467,461,"",4],
[4100147,"Sat","2026-11-14","8:17 AM",7,1,18,0,469,463,"",4],
[4099628,"Sat","2026-11-14","8:17 AM",12,1,23,0,681,687,"",4],
[4099836,"Sat","2026-11-14","8:20 AM",5,1,18,0,465,459,"",4],
[4100000,"Sat","2026-11-14","8:20 AM",6,1,18,0,455,460,"",4],
[4100148,"Sat","2026-11-14","8:20 AM",7,1,18,0,457,462,"",4],
[4099579,"Sat","2026-11-14","8:20 AM",10,1,22,0,690,691,"",4],
[4099837,"Sat","2026-11-14","8:24 AM",5,1,18,0,265,470,"",4],
[4100001,"Sat","2026-11-14","8:24 AM",6,1,18,0,456,478,"",4],
[4100149,"Sat","2026-11-14","8:24 AM",7,1,18,0,38,480,"",4],
[4099629,"Sat","2026-11-14","8:24 AM",12,1,23,0,224,682,"",4],
[4099838,"Sat","2026-11-14","8:27 AM",5,1,18,0,464,458,"",4],
[4100002,"Sat","2026-11-14","8:27 AM",6,1,18,0,472,477,"",4],
[4100150,"Sat","2026-11-14","8:27 AM",7,1,18,0,474,479,"",4],
[4099580,"Sat","2026-11-14","8:28 AM",10,1,22,0,266,688,"",4],
[4099839,"Sat","2026-11-14","8:31 AM",5,1,18,0,476,465,"",4],
[4100003,"Sat","2026-11-14","8:31 AM",6,1,18,0,473,467,"",4],
[4100151,"Sat","2026-11-14","8:31 AM",7,1,18,0,475,469,"",4],
[4099630,"Sat","2026-11-14","8:31 AM",12,1,23,0,683,686,"",4],
[4099840,"Sat","2026-11-14","8:34 AM",5,1,18,0,470,459,"",4],
[4100004,"Sat","2026-11-14","8:34 AM",6,1,18,0,460,466,"",4],
[4100152,"Sat","2026-11-14","8:34 AM",7,1,18,0,462,468,"",4],
[4099581,"Sat","2026-11-14","8:36 AM",10,1,22,0,28,680,"",4],
[4099841,"Sat","2026-11-14","8:38 AM",5,1,18,0,458,454,"",4],
[4100005,"Sat","2026-11-14","8:38 AM",6,1,18,0,461,456,"",4],
[4100153,"Sat","2026-11-14","8:38 AM",7,1,18,0,463,38,"",4],
[4099631,"Sat","2026-11-14","8:38 AM",12,1,23,0,264,6,"",4],
[4099842,"Sat","2026-11-14","8:41 AM",5,1,18,0,464,265,"",4],
[4100006,"Sat","2026-11-14","8:41 AM",6,1,18,0,478,455,"",4],
[4100154,"Sat","2026-11-14","8:41 AM",7,1,18,0,480,457,"",4],
[4099582,"Sat","2026-11-14","8:44 AM",10,1,22,0,273,689,"",4],
[4099843,"Sat","2026-11-14","8:45 AM",5,1,18,0,471,465,"",4],
[4100007,"Sat","2026-11-14","8:45 AM",6,1,18,0,467,472,"",4],
[4100155,"Sat","2026-11-14","8:45 AM",7,1,18,0,469,474,"",4],
[4099632,"Sat","2026-11-14","8:45 AM",12,1,23,0,687,685,"",4],
[4099844,"Sat","2026-11-14","8:48 AM",5,1,18,0,454,476,"",4],
[4100008,"Sat","2026-11-14","8:48 AM",6,1,18,0,477,460,"",4],
[4100156,"Sat","2026-11-14","8:48 AM",7,1,18,0,479,462,"",4],
[4099845,"Sat","2026-11-14","8:52 AM",5,1,18,0,459,464,"",4],
[4100009,"Sat","2026-11-14","8:52 AM",6,1,18,0,456,473,"",4],
[4100157,"Sat","2026-11-14","8:52 AM",7,1,18,0,38,475,"",4],
[4099583,"Sat","2026-11-14","8:52 AM",10,1,22,0,278,277,"",4],
[4099633,"Sat","2026-11-14","8:52 AM",12,1,23,0,684,224,"",4],
[4099846,"Sat","2026-11-14","8:55 AM",5,1,18,0,265,458,"",4],
[4100010,"Sat","2026-11-14","8:55 AM",6,1,18,0,466,455,"",4],
[4100158,"Sat","2026-11-14","8:55 AM",7,1,18,0,468,457,"",4],
[4099847,"Sat","2026-11-14","8:59 AM",5,1,18,0,465,470,"",4],
[4100011,"Sat","2026-11-14","8:59 AM",6,1,18,0,461,478,"",4],
[4100159,"Sat","2026-11-14","8:59 AM",7,1,18,0,463,480,"",4],
[4099634,"Sat","2026-11-14","8:59 AM",12,1,23,0,686,681,"",4],
[4099584,"Sat","2026-11-14","9:00 AM",10,1,22,0,691,187,"",4],
[4099848,"Sat","2026-11-14","9:02 AM",5,1,18,0,476,471,"",4],
[4100012,"Sat","2026-11-14","9:02 AM",6,1,18,0,460,467,"",4],
[4100160,"Sat","2026-11-14","9:02 AM",7,1,18,0,462,469,"",4],
[4099849,"Sat","2026-11-14","9:06 AM",5,1,19,0,481,482,"",4],
[4100013,"Sat","2026-11-14","9:06 AM",6,1,18,0,472,456,"",4],
[4100161,"Sat","2026-11-14","9:06 AM",7,1,18,0,474,38,"",4],
[4099635,"Sat","2026-11-14","9:06 AM",12,1,23,0,682,264,"",4],
[4099585,"Sat","2026-11-14","9:08 AM",10,1,22,0,688,28,"",4],
[4099850,"Sat","2026-11-14","9:09 AM",5,1,17,0,449,450,"",4],
[4100014,"Sat","2026-11-14","9:09 AM",6,1,18,0,455,477,"",4],
[4100162,"Sat","2026-11-14","9:09 AM",7,1,18,0,457,479,"",4],
[4099851,"Sat","2026-11-14","9:13 AM",5,1,19,0,483,484,"",4],
[4100015,"Sat","2026-11-14","9:13 AM",6,1,18,0,473,461,"",4],
[4100163,"Sat","2026-11-14","9:13 AM",7,1,18,0,475,463,"",4],
[4099636,"Sat","2026-11-14","9:13 AM",12,1,23,0,6,683,"",4],
[4099852,"Sat","2026-11-14","9:16 AM",5,1,19,0,485,486,"",4],
[4100016,"Sat","2026-11-14","9:16 AM",6,1,18,0,478,466,"",4],
[4100164,"Sat","2026-11-14","9:16 AM",7,1,18,0,480,468,"",4],
[4099586,"Sat","2026-11-14","9:16 AM",10,1,22,0,268,273,"",4],
[4099853,"Sat","2026-11-14","9:20 AM",5,1,17,0,451,452,"",4],
[4100017,"Sat","2026-11-14","9:20 AM",6,1,19,0,487,488,"",4],
[4099637,"Sat","2026-11-14","9:20 AM",12,1,23,0,224,687,"",4],
[4099854,"Sat","2026-11-14","9:23 AM",5,1,19,0,489,490,"",4],
[4100018,"Sat","2026-11-14","9:23 AM",6,1,19,0,491,492,"",4],
[4099587,"Sat","2026-11-14","9:24 AM",10,1,22,0,277,690,"",4],
[4099855,"Sat","2026-11-14","9:27 AM",5,1,19,0,493,494,"",4],
[4100019,"Sat","2026-11-14","9:27 AM",6,1,19,0,495,496,"",4],
[4099638,"Sat","2026-11-14","9:27 AM",12,1,23,0,685,686,"",4],
[4099856,"Sat","2026-11-14","9:30 AM",5,1,17,0,453,449,"",4],
[4100020,"Sat","2026-11-14","9:30 AM",6,1,19,0,497,498,"",4],
[4099588,"Sat","2026-11-14","9:32 AM",10,1,22,0,266,691,"",4],
[4099857,"Sat","2026-11-14","9:34 AM",5,1,19,0,484,481,"",4],
[4100021,"Sat","2026-11-14","9:34 AM",6,1,19,0,488,499,"",4],
[4099639,"Sat","2026-11-14","9:34 AM",12,1,23,0,264,684,"",4],
[4099858,"Sat","2026-11-14","9:37 AM",5,1,19,0,482,485,"",4],
[4100022,"Sat","2026-11-14","9:37 AM",6,1,19,0,492,487,"",4],
[4099589,"Sat","2026-11-14","9:40 AM",10,1,22,0,680,688,"",4],
[4099859,"Sat","2026-11-14","9:41 AM",5,1,17,0,450,452,"",4],
[4100023,"Sat","2026-11-14","9:41 AM",6,1,19,0,496,491,"",4],
[4099640,"Sat","2026-11-14","9:41 AM",12,1,23,0,681,683,"",4],
[4099860,"Sat","2026-11-14","9:44 AM",5,1,19,0,490,483,"",4],
[4100024,"Sat","2026-11-14","9:44 AM",6,1,19,0,498,495,"",4],
[4099861,"Sat","2026-11-14","9:48 AM",5,1,19,0,486,493,"",4],
[4100025,"Sat","2026-11-14","9:48 AM",6,1,19,0,499,497,"",4],
[4099590,"Sat","2026-11-14","9:48 AM",10,1,22,0,689,268,"",4],
[4099641,"Sat","2026-11-14","9:48 AM",12,1,23,0,682,6,"",4],
[4099862,"Sat","2026-11-14","9:51 AM",5,1,17,0,453,451,"",4],
[4100026,"Sat","2026-11-14","9:51 AM",6,1,19,0,487,496,"",4],
[4099863,"Sat","2026-11-14","9:55 AM",5,1,19,0,494,489,"",4],
[4100027,"Sat","2026-11-14","9:55 AM",6,1,19,0,488,492,"",4],
[4099642,"Sat","2026-11-14","9:55 AM",12,1,23,0,686,224,"",4],
[4099591,"Sat","2026-11-14","9:56 AM",10,1,22,0,690,278,"",4],
[4099864,"Sat","2026-11-14","9:58 AM",5,1,19,0,485,484,"",4],
[4100028,"Sat","2026-11-14","9:58 AM",6,1,19,0,491,498,"",4],
];
const G9: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4099865,"Sat","2026-11-14","10:02 AM",5,1,17,0,452,449,"",4],
[4100029,"Sat","2026-11-14","10:02 AM",6,1,19,0,495,497,"",4],
[4099643,"Sat","2026-11-14","10:02 AM",12,1,23,0,687,264,"",4],
[4099592,"Sat","2026-11-14","10:04 AM",10,1,22,0,187,266,"",4],
[4099866,"Sat","2026-11-14","10:05 AM",5,1,19,0,481,490,"",4],
[4100030,"Sat","2026-11-14","10:05 AM",6,1,19,0,492,499,"",4],
[4099867,"Sat","2026-11-14","10:09 AM",5,1,19,0,493,482,"",4],
[4100031,"Sat","2026-11-14","10:09 AM",6,1,19,0,498,487,"",4],
[4099644,"Sat","2026-11-14","10:09 AM",12,1,23,0,683,685,"",4],
[4099868,"Sat","2026-11-14","10:12 AM",5,1,17,0,450,453,"",4],
[4100032,"Sat","2026-11-14","10:12 AM",6,1,19,0,496,488,"",4],
[4099593,"Sat","2026-11-14","10:12 AM",10,1,22,0,273,28,"",4],
[4099869,"Sat","2026-11-14","10:16 AM",5,1,19,0,483,489,"",4],
[4100033,"Sat","2026-11-14","10:16 AM",6,1,19,0,497,491,"",4],
[4099645,"Sat","2026-11-14","10:16 AM",12,1,23,0,684,682,"",4],
[4099870,"Sat","2026-11-14","10:19 AM",5,1,19,0,486,494,"",4],
[4100034,"Sat","2026-11-14","10:19 AM",6,1,19,0,499,495,"",4],
[4099594,"Sat","2026-11-14","10:20 AM",10,1,22,0,277,689,"",4],
[4099871,"Sat","2026-11-14","10:23 AM",5,1,17,0,449,451,"",4],
[4100035,"Sat","2026-11-14","10:23 AM",6,1,19,0,492,498,"",4],
[4099646,"Sat","2026-11-14","10:23 AM",12,1,23,0,6,681,"",4],
[4099872,"Sat","2026-11-14","10:26 AM",5,1,19,0,490,485,"",4],
[4100036,"Sat","2026-11-14","10:26 AM",6,1,19,0,497,487,"",4],
[4099595,"Sat","2026-11-14","10:28 AM",10,1,22,0,187,690,"",4],
[4099873,"Sat","2026-11-14","10:30 AM",5,1,19,0,484,493,"",4],
[4100037,"Sat","2026-11-14","10:30 AM",6,1,19,0,491,499,"",4],
[4099647,"Sat","2026-11-14","10:30 AM",12,1,23,0,264,686,"",4],
[4099874,"Sat","2026-11-14","10:33 AM",5,1,17,0,452,453,"",4],
[4100038,"Sat","2026-11-14","10:33 AM",6,1,19,0,498,488,"",4],
[4099596,"Sat","2026-11-14","10:36 AM",10,1,22,0,266,278,"",4],
[4099875,"Sat","2026-11-14","10:37 AM",5,1,19,0,489,481,"",4],
[4100039,"Sat","2026-11-14","10:37 AM",6,1,19,0,487,495,"",4],
[4099648,"Sat","2026-11-14","10:37 AM",12,1,23,0,224,683,"",4],
[4099876,"Sat","2026-11-14","10:40 AM",5,1,19,0,482,486,"",4],
[4100040,"Sat","2026-11-14","10:40 AM",6,1,19,0,496,492,"",4],
[4099877,"Sat","2026-11-14","10:44 AM",5,1,17,0,451,450,"",4],
[4100041,"Sat","2026-11-14","10:44 AM",6,1,19,0,488,497,"",4],
[4099597,"Sat","2026-11-14","10:44 AM",10,1,22,0,680,691,"",4],
[4099649,"Sat","2026-11-14","10:44 AM",12,1,23,0,682,687,"",4],
[4099878,"Sat","2026-11-14","10:47 AM",5,1,19,0,494,483,"",4],
[4100042,"Sat","2026-11-14","10:47 AM",6,1,19,0,495,491,"",4],
[4099879,"Sat","2026-11-14","10:51 AM",5,1,19,0,493,490,"",4],
[4100043,"Sat","2026-11-14","10:51 AM",6,1,19,0,499,496,"",4],
[4099650,"Sat","2026-11-14","10:51 AM",12,1,23,0,685,681,"",4],
[4099598,"Sat","2026-11-14","10:52 AM",10,1,22,0,268,688,"",4],
[4099880,"Sat","2026-11-14","10:54 AM",5,1,17,0,449,452,"",4],
[4100044,"Sat","2026-11-14","10:54 AM",6,1,19,0,497,492,"",4],
[4099881,"Sat","2026-11-14","10:58 AM",5,1,19,0,485,489,"",4],
[4100045,"Sat","2026-11-14","10:58 AM",6,1,19,0,491,487,"",4],
[4099651,"Sat","2026-11-14","10:58 AM",12,1,23,0,684,6,"",4],
[4099599,"Sat","2026-11-14","11:00 AM",10,1,22,0,278,273,"",4],
[4099882,"Sat","2026-11-14","11:01 AM",5,1,19,0,486,484,"",4],
[4100046,"Sat","2026-11-14","11:01 AM",6,1,19,0,495,488,"",4],
[4099883,"Sat","2026-11-14","11:05 AM",5,1,17,0,451,453,"",4],
[4100047,"Sat","2026-11-14","11:05 AM",6,1,19,0,498,496,"",4],
[4099652,"Sat","2026-11-14","11:05 AM",12,1,23,0,683,264,"",4],
[4099884,"Sat","2026-11-14","11:08 AM",5,1,19,0,481,483,"",4],
[4100048,"Sat","2026-11-14","11:08 AM",6,1,19,0,487,499,"",4],
[4099600,"Sat","2026-11-14","11:08 AM",10,1,22,0,691,277,"",4],
[4099885,"Sat","2026-11-14","11:12 AM",5,1,19,0,482,494,"",4],
[4100049,"Sat","2026-11-14","11:12 AM",6,1,19,0,492,495,"",4],
[4099653,"Sat","2026-11-14","11:12 AM",12,1,23,0,686,682,"",4],
[4099886,"Sat","2026-11-14","11:15 AM",5,1,17,0,450,449,"",4],
[4100050,"Sat","2026-11-14","11:15 AM",6,1,19,0,488,491,"",4],
[4099601,"Sat","2026-11-14","11:16 AM",10,1,22,0,688,187,"",4],
[4099887,"Sat","2026-11-14","11:19 AM",5,1,19,0,489,493,"",4],
[4100051,"Sat","2026-11-14","11:19 AM",6,1,19,0,496,497,"",4],
[4099654,"Sat","2026-11-14","11:19 AM",12,1,23,0,681,224,"",4],
[4099888,"Sat","2026-11-14","11:22 AM",5,1,19,0,490,486,"",4],
[4100052,"Sat","2026-11-14","11:22 AM",6,1,19,0,499,498,"",4],
[4099602,"Sat","2026-11-14","11:24 AM",10,1,22,0,28,266,"",4],
[4099889,"Sat","2026-11-14","11:26 AM",5,1,17,0,452,451,"",4],
[4099655,"Sat","2026-11-14","11:26 AM",12,1,23,0,687,684,"",4],
[4099890,"Sat","2026-11-14","11:29 AM",5,1,19,0,483,485,"",4],
[4099603,"Sat","2026-11-14","11:32 AM",10,1,22,0,689,680,"",4],
[4099891,"Sat","2026-11-14","11:33 AM",5,1,19,0,484,482,"",4],
[4099656,"Sat","2026-11-14","11:33 AM",12,1,23,0,6,685,"",4],
[4099892,"Sat","2026-11-14","11:36 AM",5,1,17,0,453,450,"",4],
[4099893,"Sat","2026-11-14","11:40 AM",5,1,19,0,494,481,"",4],
[4099604,"Sat","2026-11-14","11:40 AM",10,1,22,0,690,268,"",4],
[4099894,"Sat","2026-11-14","11:43 AM",5,1,19,0,486,489,"",4],
[4099895,"Sat","2026-11-14","11:47 AM",5,1,17,0,451,449,"",4],
[4099605,"Sat","2026-11-14","11:48 AM",10,1,22,0,691,273,"",4],
[4099896,"Sat","2026-11-14","11:50 AM",5,1,19,0,493,483,"",4],
[4099897,"Sat","2026-11-14","11:54 AM",5,1,19,0,482,490,"",4],
[4099733,"Sat","2026-11-14","11:55 AM",4,1,19,0,500,501,"",4],
[4099606,"Sat","2026-11-14","11:56 AM",10,1,22,0,278,688,"",4],
[4099898,"Sat","2026-11-14","11:57 AM",5,1,17,0,452,450,"",4],
[4099734,"Sat","2026-11-14","11:58 AM",4,1,19,0,502,503,"",4],
[4099899,"Sat","2026-11-14","12:01 PM",5,1,19,0,485,481,"",4],
[4099735,"Sat","2026-11-14","12:02 PM",4,1,19,0,504,505,"",4],
[4099900,"Sat","2026-11-14","12:04 PM",5,1,19,0,484,494,"",4],
[4099607,"Sat","2026-11-14","12:04 PM",10,1,22,0,277,28,"",4],
[4099736,"Sat","2026-11-14","12:05 PM",4,1,19,0,506,507,"",4],
[4099901,"Sat","2026-11-14","12:08 PM",5,1,17,0,449,453,"",4],
[4099737,"Sat","2026-11-14","12:09 PM",4,1,19,0,508,509,"",4],
[4099902,"Sat","2026-11-14","12:11 PM",5,1,19,0,483,486,"",4],
[4100053,"Sat","2026-11-14","12:11 PM",6,1,20,0,510,511,"",4],
[4099738,"Sat","2026-11-14","12:12 PM",4,1,19,0,503,500,"",4],
[4099608,"Sat","2026-11-14","12:12 PM",10,1,22,0,187,689,"",4],
[4100054,"Sat","2026-11-14","12:14 PM",6,1,20,0,512,513,"",4],
[4099903,"Sat","2026-11-14","12:15 PM",5,1,19,0,489,482,"",4],
[4099739,"Sat","2026-11-14","12:16 PM",4,1,19,0,501,504,"",4],
[4099904,"Sat","2026-11-14","12:18 PM",5,1,17,0,450,451,"",4],
[4100055,"Sat","2026-11-14","12:18 PM",6,1,20,0,514,511,"",4],
[4099740,"Sat","2026-11-14","12:19 PM",4,1,19,0,507,502,"",4],
[4099609,"Sat","2026-11-14","12:20 PM",10,1,22,0,266,268,"",4],
[4100056,"Sat","2026-11-14","12:21 PM",6,1,20,0,513,510,"",4],
[4099905,"Sat","2026-11-14","12:22 PM",5,1,19,0,481,493,"",4],
[4099741,"Sat","2026-11-14","12:23 PM",4,1,19,0,505,508,"",4],
[4099906,"Sat","2026-11-14","12:25 PM",5,1,19,0,490,484,"",4],
[4100057,"Sat","2026-11-14","12:25 PM",6,1,20,0,512,514,"",4],
[4099742,"Sat","2026-11-14","12:26 PM",4,1,19,0,509,506,"",4],
[4100058,"Sat","2026-11-14","12:28 PM",6,1,20,0,513,511,"",4],
[4099610,"Sat","2026-11-14","12:28 PM",10,1,22,0,690,680,"",4],
[4099907,"Sat","2026-11-14","12:29 PM",5,1,17,0,453,452,"",4],
[4099743,"Sat","2026-11-14","12:30 PM",4,1,19,0,504,503,"",4],
[4099908,"Sat","2026-11-14","12:32 PM",5,1,19,0,494,485,"",4],
[4100059,"Sat","2026-11-14","12:32 PM",6,1,20,0,510,514,"",4],
[4099744,"Sat","2026-11-14","12:33 PM",4,1,19,0,500,507,"",4],
[4100060,"Sat","2026-11-14","12:35 PM",6,1,20,0,511,512,"",4],
[4099611,"Sat","2026-11-14","12:36 PM",10,1,22,0,688,277,"",4],
];
const G10: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4099745,"Sat","2026-11-14","12:37 PM",4,1,19,0,508,501,"",4],
[4100061,"Sat","2026-11-14","12:39 PM",6,1,20,0,514,513,"",4],
[4099746,"Sat","2026-11-14","12:40 PM",4,1,19,0,502,506,"",4],
[4100062,"Sat","2026-11-14","12:42 PM",6,1,20,0,510,132,"",4],
[4099747,"Sat","2026-11-14","12:44 PM",4,1,19,0,505,509,"",4],
[4099612,"Sat","2026-11-14","12:44 PM",10,1,22,0,273,187,"",4],
[4100063,"Sat","2026-11-14","12:46 PM",6,1,20,0,511,512,"",4],
[4099748,"Sat","2026-11-14","12:47 PM",4,1,19,0,507,504,"",4],
[4100064,"Sat","2026-11-14","12:49 PM",6,1,20,0,514,513,"",4],
[4099749,"Sat","2026-11-14","12:51 PM",4,1,19,0,503,508,"",4],
[4099613,"Sat","2026-11-14","12:52 PM",10,1,22,0,268,691,"",4],
[4100065,"Sat","2026-11-14","12:53 PM",6,1,20,0,132,511,"",4],
[4099750,"Sat","2026-11-14","12:54 PM",4,1,19,0,506,500,"",4],
[4100066,"Sat","2026-11-14","12:56 PM",6,1,20,0,512,510,"",4],
[4099751,"Sat","2026-11-14","12:58 PM",4,1,19,0,501,505,"",4],
[4100067,"Sat","2026-11-14","1:00 PM",6,1,20,0,515,516,"",4],
[4099614,"Sat","2026-11-14","1:00 PM",10,1,22,0,689,266,"",4],
[4099752,"Sat","2026-11-14","1:01 PM",4,1,19,0,509,502,"",4],
[4100068,"Sat","2026-11-14","1:03 PM",6,1,20,0,513,132,"",4],
[4099753,"Sat","2026-11-14","1:05 PM",4,1,19,0,508,507,"",4],
[4100069,"Sat","2026-11-14","1:07 PM",6,1,20,0,511,516,"",4],
[4099754,"Sat","2026-11-14","1:08 PM",4,1,19,0,504,506,"",4],
[4099615,"Sat","2026-11-14","1:08 PM",10,1,22,0,680,278,"",4],
[4100070,"Sat","2026-11-14","1:10 PM",6,1,20,0,514,515,"",4],
[4099755,"Sat","2026-11-14","1:12 PM",4,1,19,0,505,503,"",4],
[4100071,"Sat","2026-11-14","1:14 PM",6,1,20,0,132,512,"",4],
[4099756,"Sat","2026-11-14","1:15 PM",4,1,19,0,500,502,"",4],
[4099616,"Sat","2026-11-14","1:16 PM",10,1,22,0,28,690,"",4],
[4100072,"Sat","2026-11-14","1:17 PM",6,1,20,0,516,510,"",4],
[4099757,"Sat","2026-11-14","1:19 PM",4,1,19,0,501,509,"",4],
[4099909,"Sat","2026-11-14","1:21 PM",5,1,21,0,517,235,"",4],
[4100073,"Sat","2026-11-14","1:21 PM",6,1,20,0,511,515,"",4],
[4099758,"Sat","2026-11-14","1:22 PM",4,1,19,0,506,508,"",4],
[4099910,"Sat","2026-11-14","1:24 PM",5,1,21,0,518,519,"",4],
[4100074,"Sat","2026-11-14","1:24 PM",6,1,20,0,132,514,"",4],
[4099759,"Sat","2026-11-14","1:26 PM",4,1,19,0,507,505,"",4],
[4099911,"Sat","2026-11-14","1:28 PM",5,1,21,0,520,521,"",4],
[4100075,"Sat","2026-11-14","1:28 PM",6,1,20,0,513,516,"",4],
[4099760,"Sat","2026-11-14","1:29 PM",4,1,19,0,502,504,"",4],
[4099912,"Sat","2026-11-14","1:31 PM",5,1,21,0,522,523,"",4],
[4100076,"Sat","2026-11-14","1:31 PM",6,1,20,0,515,512,"",4],
[4099761,"Sat","2026-11-14","1:33 PM",4,1,19,0,503,501,"",4],
[4099913,"Sat","2026-11-14","1:35 PM",5,1,21,0,494,524,"",4],
[4100077,"Sat","2026-11-14","1:35 PM",6,1,20,0,516,132,"",4],
[4099762,"Sat","2026-11-14","1:36 PM",4,1,19,0,509,500,"",4],
[4099693,"Sat","2026-11-14","1:38 PM",3,1,19,0,525,526,"",4],
[4099914,"Sat","2026-11-14","1:38 PM",5,1,21,0,527,528,"",4],
[4100078,"Sat","2026-11-14","1:38 PM",6,1,20,0,515,510,"",4],
[4099763,"Sat","2026-11-14","1:40 PM",4,1,19,0,505,506,"",4],
[4099694,"Sat","2026-11-14","1:41 PM",3,1,19,0,529,530,"",4],
[4099915,"Sat","2026-11-14","1:42 PM",5,1,21,0,531,532,"",4],
[4100079,"Sat","2026-11-14","1:42 PM",6,1,20,0,516,514,"",4],
[4099764,"Sat","2026-11-14","1:43 PM",4,1,19,0,508,502,"",4],
[4099695,"Sat","2026-11-14","1:45 PM",3,1,19,0,533,534,"",4],
[4099916,"Sat","2026-11-14","1:45 PM",5,1,21,0,235,535,"",4],
[4100080,"Sat","2026-11-14","1:45 PM",6,1,20,0,132,515,"",4],
[4099765,"Sat","2026-11-14","1:47 PM",4,1,19,0,501,507,"",4],
[4099696,"Sat","2026-11-14","1:48 PM",3,1,19,0,536,537,"",4],
[4099917,"Sat","2026-11-14","1:49 PM",5,1,21,0,517,519,"",4],
[4100081,"Sat","2026-11-14","1:49 PM",6,1,20,0,512,516,"",4],
[4099766,"Sat","2026-11-14","1:50 PM",4,1,19,0,504,500,"",4],
[4099697,"Sat","2026-11-14","1:52 PM",3,1,19,0,43,538,"",4],
[4099918,"Sat","2026-11-14","1:52 PM",5,1,21,0,520,518,"",4],
[4100082,"Sat","2026-11-14","1:52 PM",6,1,20,0,515,513,"",4],
[4099767,"Sat","2026-11-14","1:54 PM",4,1,19,0,503,509,"",4],
[4099698,"Sat","2026-11-14","1:55 PM",3,1,19,0,530,525,"",4],
[4099919,"Sat","2026-11-14","1:56 PM",5,1,21,0,521,522,"",4],
[4100083,"Sat","2026-11-14","1:56 PM",6,1,20,0,516,132,"",4],
[4099768,"Sat","2026-11-14","1:57 PM",4,1,19,0,502,505,"",4],
[4099699,"Sat","2026-11-14","1:59 PM",3,1,19,0,526,533,"",4],
[4099920,"Sat","2026-11-14","1:59 PM",5,1,21,0,523,494,"",4],
[4100084,"Sat","2026-11-14","1:59 PM",6,1,20,0,510,515,"",4],
[4099769,"Sat","2026-11-14","2:01 PM",4,1,19,0,506,501,"",4],
[4099700,"Sat","2026-11-14","2:02 PM",3,1,19,0,537,529,"",4],
[4099921,"Sat","2026-11-14","2:03 PM",5,1,21,0,524,527,"",4],
[4100085,"Sat","2026-11-14","2:03 PM",6,1,19,0,539,540,"",4],
[4099770,"Sat","2026-11-14","2:04 PM",4,1,19,0,500,508,"",4],
[4099701,"Sat","2026-11-14","2:06 PM",3,1,19,0,534,43,"",4],
[4099922,"Sat","2026-11-14","2:06 PM",5,1,21,0,532,528,"",4],
[4100086,"Sat","2026-11-14","2:06 PM",6,1,19,0,541,542,"",4],
[4099771,"Sat","2026-11-14","2:08 PM",4,1,19,0,507,503,"",4],
[4099702,"Sat","2026-11-14","2:09 PM",3,1,19,0,538,536,"",4],
[4099923,"Sat","2026-11-14","2:10 PM",5,1,21,0,531,535,"",4],
[4100087,"Sat","2026-11-14","2:10 PM",6,1,19,0,543,544,"",4],
[4099772,"Sat","2026-11-14","2:11 PM",4,1,19,0,509,504,"",4],
[4099703,"Sat","2026-11-14","2:13 PM",3,1,19,0,533,530,"",4],
[4099924,"Sat","2026-11-14","2:13 PM",5,1,21,0,519,235,"",4],
[4100088,"Sat","2026-11-14","2:13 PM",6,1,19,0,545,546,"",4],
[4099773,"Sat","2026-11-14","2:15 PM",4,1,19,0,547,272,"",4],
[4099704,"Sat","2026-11-14","2:16 PM",3,1,19,0,525,537,"",4],
[4099925,"Sat","2026-11-14","2:17 PM",5,1,21,0,520,517,"",4],
[4100089,"Sat","2026-11-14","2:17 PM",6,1,19,0,548,535,"",4],
[4099774,"Sat","2026-11-14","2:18 PM",4,1,19,0,549,550,"",4],
[4099705,"Sat","2026-11-14","2:20 PM",3,1,19,0,43,526,"",4],
[4099926,"Sat","2026-11-14","2:20 PM",5,1,21,0,521,518,"",4],
[4100090,"Sat","2026-11-14","2:20 PM",6,1,19,0,542,539,"",4],
[4099775,"Sat","2026-11-14","2:22 PM",4,1,19,0,551,552,"",4],
[4099706,"Sat","2026-11-14","2:23 PM",3,1,19,0,529,536,"",4],
[4099927,"Sat","2026-11-14","2:24 PM",5,1,21,0,522,494,"",4],
[4100091,"Sat","2026-11-14","2:24 PM",6,1,19,0,540,543,"",4],
[4099776,"Sat","2026-11-14","2:25 PM",4,1,19,0,553,554,"",4],
[4099707,"Sat","2026-11-14","2:27 PM",3,1,19,0,534,538,"",4],
[4099928,"Sat","2026-11-14","2:27 PM",5,1,21,0,527,555,"",4],
[4100092,"Sat","2026-11-14","2:27 PM",6,1,19,0,546,541,"",4],
[4099777,"Sat","2026-11-14","2:29 PM",4,1,19,0,556,557,"",4],
[4099708,"Sat","2026-11-14","2:30 PM",3,1,19,0,537,533,"",4],
[4099929,"Sat","2026-11-14","2:31 PM",5,1,21,0,523,558,"",4],
[4100093,"Sat","2026-11-14","2:31 PM",6,1,19,0,544,548,"",4],
[4099778,"Sat","2026-11-14","2:32 PM",4,1,19,0,550,547,"",4],
[4099709,"Sat","2026-11-14","2:34 PM",3,1,19,0,530,43,"",4],
[4099930,"Sat","2026-11-14","2:34 PM",5,1,21,0,535,532,"",4],
[4100094,"Sat","2026-11-14","2:34 PM",6,1,19,0,535,545,"",4],
[4099779,"Sat","2026-11-14","2:36 PM",4,1,19,0,272,551,"",4],
[4099710,"Sat","2026-11-14","2:37 PM",3,1,19,0,536,525,"",4],
[4099931,"Sat","2026-11-14","2:38 PM",5,1,21,0,235,524,"",4],
[4100095,"Sat","2026-11-14","2:38 PM",6,1,19,0,543,542,"",4],
[4099780,"Sat","2026-11-14","2:39 PM",4,1,19,0,554,549,"",4],
[4099711,"Sat","2026-11-14","2:41 PM",3,1,19,0,526,534,"",4],
[4099932,"Sat","2026-11-14","2:41 PM",5,1,21,0,528,520,"",4],
[4100096,"Sat","2026-11-14","2:41 PM",6,1,19,0,539,546,"",4],
[4099781,"Sat","2026-11-14","2:43 PM",4,1,19,0,552,556,"",4],
[4099712,"Sat","2026-11-14","2:44 PM",3,1,19,0,538,529,"",4],
];
const G11: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4099657,"Sat","2026-11-14","2:45 PM",2,1,19,0,559,560,"",4],
[4099933,"Sat","2026-11-14","2:45 PM",5,1,21,0,519,531,"",4],
[4100097,"Sat","2026-11-14","2:45 PM",6,1,19,0,548,540,"",4],
[4099782,"Sat","2026-11-14","2:46 PM",4,1,19,0,557,553,"",4],
[4099658,"Sat","2026-11-14","2:48 PM",2,1,19,0,561,562,"",4],
[4099713,"Sat","2026-11-14","2:48 PM",3,1,19,0,43,537,"",4],
[4099934,"Sat","2026-11-14","2:48 PM",5,1,21,0,522,517,"",4],
[4100098,"Sat","2026-11-14","2:48 PM",6,1,19,0,541,545,"",4],
[4099783,"Sat","2026-11-14","2:50 PM",4,1,19,0,551,550,"",4],
[4099714,"Sat","2026-11-14","2:51 PM",3,1,19,0,533,536,"",4],
[4099659,"Sat","2026-11-14","2:52 PM",2,1,19,0,563,564,"",4],
[4099935,"Sat","2026-11-14","2:52 PM",5,1,21,0,555,521,"",4],
[4100099,"Sat","2026-11-14","2:52 PM",6,1,19,0,544,535,"",4],
[4099784,"Sat","2026-11-14","2:53 PM",4,1,19,0,547,554,"",4],
[4099660,"Sat","2026-11-14","2:55 PM",2,1,19,0,565,566,"",4],
[4099715,"Sat","2026-11-14","2:55 PM",3,1,19,0,534,530,"",4],
[4099936,"Sat","2026-11-14","2:55 PM",5,1,21,0,494,558,"",4],
[4100100,"Sat","2026-11-14","2:55 PM",6,1,19,0,546,543,"",4],
[4099785,"Sat","2026-11-14","2:57 PM",4,1,19,0,556,272,"",4],
[4099716,"Sat","2026-11-14","2:58 PM",3,1,19,0,525,529,"",4],
[4099661,"Sat","2026-11-14","2:59 PM",2,1,19,0,560,567,"",4],
[4099937,"Sat","2026-11-14","2:59 PM",5,1,21,0,532,527,"",4],
[4100101,"Sat","2026-11-14","2:59 PM",6,1,19,0,542,548,"",4],
[4099786,"Sat","2026-11-14","3:00 PM",4,1,19,0,549,553,"",4],
[4099662,"Sat","2026-11-14","3:02 PM",2,1,19,0,562,559,"",4],
[4099717,"Sat","2026-11-14","3:02 PM",3,1,19,0,526,538,"",4],
[4099938,"Sat","2026-11-14","3:02 PM",5,1,21,0,518,523,"",4],
[4100102,"Sat","2026-11-14","3:02 PM",6,1,19,0,545,539,"",4],
[4099787,"Sat","2026-11-14","3:04 PM",4,1,19,0,552,557,"",4],
[4099718,"Sat","2026-11-14","3:05 PM",3,1,19,0,536,43,"",4],
[4099663,"Sat","2026-11-14","3:06 PM",2,1,19,0,564,561,"",4],
[4099939,"Sat","2026-11-14","3:06 PM",5,1,21,0,535,528,"",4],
[4100103,"Sat","2026-11-14","3:06 PM",6,1,19,0,540,544,"",4],
[4099788,"Sat","2026-11-14","3:07 PM",4,1,19,0,554,551,"",4],
[4099664,"Sat","2026-11-14","3:09 PM",2,1,19,0,566,563,"",4],
[4099719,"Sat","2026-11-14","3:09 PM",3,1,19,0,537,534,"",4],
[4099940,"Sat","2026-11-14","3:09 PM",5,1,21,0,531,524,"",4],
[4100104,"Sat","2026-11-14","3:09 PM",6,1,19,0,535,541,"",4],
[4099789,"Sat","2026-11-14","3:11 PM",4,1,19,0,550,556,"",4],
[4099720,"Sat","2026-11-14","3:12 PM",3,1,19,0,529,533,"",4],
[4099665,"Sat","2026-11-14","3:13 PM",2,1,19,0,567,565,"",4],
[4099941,"Sat","2026-11-14","3:13 PM",5,1,21,0,235,558,"",4],
[4100105,"Sat","2026-11-14","3:13 PM",6,1,19,0,548,546,"",4],
[4099790,"Sat","2026-11-14","3:14 PM",4,1,19,0,553,547,"",4],
[4099666,"Sat","2026-11-14","3:16 PM",2,1,19,0,559,564,"",4],
[4099721,"Sat","2026-11-14","3:16 PM",3,1,19,0,530,526,"",4],
[4099942,"Sat","2026-11-14","3:16 PM",5,1,21,0,555,522,"",4],
[4100106,"Sat","2026-11-14","3:16 PM",6,1,19,0,543,545,"",4],
[4099791,"Sat","2026-11-14","3:18 PM",4,1,19,0,272,552,"",4],
[4099722,"Sat","2026-11-14","3:19 PM",3,1,19,0,538,525,"",4],
[4099667,"Sat","2026-11-14","3:20 PM",2,1,19,0,560,562,"",4],
[4099943,"Sat","2026-11-14","3:20 PM",5,1,21,0,517,494,"",4],
[4100107,"Sat","2026-11-14","3:20 PM",6,1,19,0,544,542,"",4],
[4099792,"Sat","2026-11-14","3:21 PM",4,1,19,0,557,549,"",4],
[4099668,"Sat","2026-11-14","3:23 PM",2,1,19,0,561,566,"",4],
[4099723,"Sat","2026-11-14","3:23 PM",3,1,19,0,534,536,"",4],
[4099944,"Sat","2026-11-14","3:23 PM",5,1,21,0,532,520,"",4],
[4100108,"Sat","2026-11-14","3:23 PM",6,1,19,0,539,541,"",4],
[4099793,"Sat","2026-11-14","3:25 PM",4,1,19,0,556,554,"",4],
[4099724,"Sat","2026-11-14","3:26 PM",3,1,19,0,43,529,"",4],
[4099669,"Sat","2026-11-14","3:27 PM",2,1,19,0,563,565,"",4],
[4099945,"Sat","2026-11-14","3:27 PM",5,1,21,0,523,519,"",4],
[4100109,"Sat","2026-11-14","3:27 PM",6,1,19,0,540,535,"",4],
[4099794,"Sat","2026-11-14","3:28 PM",4,1,19,0,551,553,"",4],
[4099670,"Sat","2026-11-14","3:30 PM",2,1,19,0,562,567,"",4],
[4099725,"Sat","2026-11-14","3:30 PM",3,1,19,0,526,537,"",4],
[4099946,"Sat","2026-11-14","3:30 PM",5,1,21,0,527,521,"",4],
[4100110,"Sat","2026-11-14","3:30 PM",6,1,19,0,545,548,"",4],
[4099795,"Sat","2026-11-14","3:32 PM",4,1,19,0,552,550,"",4],
[4099726,"Sat","2026-11-14","3:33 PM",3,1,19,0,533,525,"",4],
[4099671,"Sat","2026-11-14","3:34 PM",2,1,19,0,566,559,"",4],
[4099947,"Sat","2026-11-14","3:34 PM",5,1,21,0,528,518,"",4],
[4100111,"Sat","2026-11-14","3:34 PM",6,1,19,0,546,544,"",4],
[4099796,"Sat","2026-11-14","3:35 PM",4,1,19,0,547,549,"",4],
[4099672,"Sat","2026-11-14","3:37 PM",2,1,19,0,564,560,"",4],
[4099727,"Sat","2026-11-14","3:37 PM",3,1,19,0,530,538,"",4],
[4099948,"Sat","2026-11-14","3:37 PM",5,1,21,0,558,524,"",4],
[4100112,"Sat","2026-11-14","3:37 PM",6,1,19,0,541,543,"",4],
[4099797,"Sat","2026-11-14","3:39 PM",4,1,19,0,272,557,"",4],
[4099728,"Sat","2026-11-14","3:40 PM",3,1,19,0,529,534,"",4],
[4099673,"Sat","2026-11-14","3:41 PM",2,1,19,0,565,561,"",4],
[4099949,"Sat","2026-11-14","3:41 PM",5,1,21,0,535,555,"",4],
[4100113,"Sat","2026-11-14","3:41 PM",6,1,19,0,542,540,"",4],
[4099798,"Sat","2026-11-14","3:42 PM",4,1,19,0,553,556,"",4],
[4099674,"Sat","2026-11-14","3:44 PM",2,1,19,0,567,563,"",4],
[4099729,"Sat","2026-11-14","3:44 PM",3,1,19,0,536,526,"",4],
[4099950,"Sat","2026-11-14","3:44 PM",5,1,21,0,235,531,"",4],
[4100114,"Sat","2026-11-14","3:44 PM",6,1,19,0,535,539,"",4],
[4099799,"Sat","2026-11-14","3:46 PM",4,1,19,0,554,552,"",4],
[4099730,"Sat","2026-11-14","3:47 PM",3,1,19,0,525,43,"",4],
[4099675,"Sat","2026-11-14","3:48 PM",2,1,19,0,562,566,"",4],
[4099951,"Sat","2026-11-14","3:48 PM",5,1,21,0,520,522,"",4],
[4100115,"Sat","2026-11-14","3:48 PM",6,1,19,0,544,545,"",4],
[4099800,"Sat","2026-11-14","3:49 PM",4,1,19,0,549,551,"",4],
[4099676,"Sat","2026-11-14","3:51 PM",2,1,19,0,565,559,"",4],
[4099731,"Sat","2026-11-14","3:51 PM",3,1,19,0,537,530,"",4],
[4099952,"Sat","2026-11-14","3:51 PM",5,1,21,0,519,494,"",4],
[4100116,"Sat","2026-11-14","3:51 PM",6,1,19,0,548,541,"",4],
[4099801,"Sat","2026-11-14","3:53 PM",4,1,19,0,550,272,"",4],
[4099732,"Sat","2026-11-14","3:54 PM",3,1,19,0,538,533,"",4],
[4099677,"Sat","2026-11-14","3:55 PM",2,1,19,0,561,567,"",4],
[4099953,"Sat","2026-11-14","3:55 PM",5,1,21,0,558,532,"",4],
[4100117,"Sat","2026-11-14","3:55 PM",6,1,19,0,540,546,"",4],
[4099802,"Sat","2026-11-14","3:56 PM",4,1,19,0,557,547,"",4],
[4099678,"Sat","2026-11-14","3:58 PM",2,1,19,0,566,560,"",4],
[4099954,"Sat","2026-11-14","3:58 PM",5,1,21,0,518,517,"",4],
[4100118,"Sat","2026-11-14","3:58 PM",6,1,19,0,543,539,"",4],
[4099803,"Sat","2026-11-14","4:00 PM",4,1,19,0,552,553,"",4],
[4099679,"Sat","2026-11-14","4:02 PM",2,1,19,0,559,563,"",4],
[4099955,"Sat","2026-11-14","4:02 PM",5,1,21,0,521,523,"",4],
[4100119,"Sat","2026-11-14","4:02 PM",6,1,19,0,542,535,"",4],
[4099804,"Sat","2026-11-14","4:03 PM",4,1,19,0,556,549,"",4],
[4099680,"Sat","2026-11-14","4:05 PM",2,1,19,0,564,562,"",4],
[4099956,"Sat","2026-11-14","4:05 PM",5,1,21,0,528,555,"",4],
[4100120,"Sat","2026-11-14","4:05 PM",6,1,19,0,541,544,"",4],
[4099805,"Sat","2026-11-14","4:07 PM",4,1,19,0,272,554,"",4],
[4099681,"Sat","2026-11-14","4:09 PM",2,1,19,0,560,565,"",4],
[4099957,"Sat","2026-11-14","4:09 PM",5,1,21,0,524,535,"",4],
[4100121,"Sat","2026-11-14","4:09 PM",6,1,19,0,545,540,"",4],
[4099806,"Sat","2026-11-14","4:10 PM",4,1,19,0,551,547,"",4],
[4099682,"Sat","2026-11-14","4:12 PM",2,1,19,0,563,561,"",4],
[4099958,"Sat","2026-11-14","4:12 PM",5,1,21,0,527,520,"",4],
];
const G12: Array<[number, string, string, string, number, number, number, number, number, number, string, number]> = [
[4100122,"Sat","2026-11-14","4:12 PM",6,1,19,0,539,548,"",4],
[4099807,"Sat","2026-11-14","4:14 PM",4,1,19,0,550,557,"",4],
[4099683,"Sat","2026-11-14","4:16 PM",2,1,19,0,567,564,"",4],
[4099959,"Sat","2026-11-14","4:16 PM",5,1,21,0,522,519,"",4],
[4100123,"Sat","2026-11-14","4:16 PM",6,1,19,0,546,542,"",4],
[4099808,"Sat","2026-11-14","4:17 PM",4,1,19,0,549,552,"",4],
[4099684,"Sat","2026-11-14","4:19 PM",2,1,19,0,565,562,"",4],
[4099960,"Sat","2026-11-14","4:19 PM",5,1,21,0,558,531,"",4],
[4100124,"Sat","2026-11-14","4:19 PM",6,1,19,0,535,543,"",4],
[4099809,"Sat","2026-11-14","4:21 PM",4,1,19,0,553,272,"",4],
[4099685,"Sat","2026-11-14","4:23 PM",2,1,19,0,561,559,"",4],
[4099961,"Sat","2026-11-14","4:23 PM",5,1,21,0,494,235,"",4],
[4099810,"Sat","2026-11-14","4:24 PM",4,1,19,0,547,556,"",4],
[4099686,"Sat","2026-11-14","4:26 PM",2,1,19,0,563,560,"",4],
[4099962,"Sat","2026-11-14","4:26 PM",5,1,21,0,517,523,"",4],
[4099811,"Sat","2026-11-14","4:28 PM",4,1,19,0,554,550,"",4],
[4099687,"Sat","2026-11-14","4:30 PM",2,1,19,0,566,564,"",4],
[4099963,"Sat","2026-11-14","4:30 PM",5,1,21,0,555,518,"",4],
[4099812,"Sat","2026-11-14","4:31 PM",4,1,19,0,557,551,"",4],
[4099688,"Sat","2026-11-14","4:33 PM",2,1,19,0,559,567,"",4],
[4099964,"Sat","2026-11-14","4:33 PM",5,1,21,0,528,521,"",4],
[4099689,"Sat","2026-11-14","4:37 PM",2,1,19,0,562,563,"",4],
[4099965,"Sat","2026-11-14","4:37 PM",5,1,21,0,524,532,"",4],
[4099690,"Sat","2026-11-14","4:40 PM",2,1,19,0,560,561,"",4],
[4099966,"Sat","2026-11-14","4:40 PM",5,1,21,0,535,527,"",4],
[4099691,"Sat","2026-11-14","4:44 PM",2,1,19,0,564,565,"",4],
[4099967,"Sat","2026-11-14","4:44 PM",5,1,21,0,519,558,"",4],
[4099692,"Sat","2026-11-14","4:47 PM",2,1,19,0,567,566,"",4],
[4099968,"Sat","2026-11-14","4:47 PM",5,1,21,0,555,520,"",4],
[4099969,"Sat","2026-11-14","4:51 PM",5,1,21,0,494,531,"",4],
[4099970,"Sat","2026-11-14","4:54 PM",5,1,21,0,523,235,"",4],
[4099971,"Sat","2026-11-14","4:58 PM",5,1,21,0,518,522,"",4],
[4099972,"Sat","2026-11-14","5:01 PM",5,1,21,0,521,517,"",4],
[4099973,"Sat","2026-11-14","5:05 PM",5,1,21,0,524,528,"",4],
[4099974,"Sat","2026-11-14","5:08 PM",5,1,21,0,558,535,"",4],
[4099975,"Sat","2026-11-14","5:12 PM",5,1,21,0,532,555,"",4],
[4099976,"Sat","2026-11-14","5:15 PM",5,1,21,0,531,527,"",4],
];
const GAMES = [...G1, ...G2, ...G3, ...G4, ...G5, ...G6, ...G7, ...G8, ...G9, ...G10, ...G11, ...G12];
const ROSTER_COUNTS: Record<string, { coaches: number; players: number }> = {"0|0":{"coaches":2,"players":10},"1|0":{"coaches":0,"players":6},"2|0":{"coaches":0,"players":0},"3|0":{"coaches":0,"players":0},"4|0":{"coaches":0,"players":10},"5|0":{"coaches":0,"players":0},"6|0":{"coaches":0,"players":0},"7|0":{"coaches":0,"players":0},"8|0":{"coaches":0,"players":0},"9|0":{"coaches":0,"players":9},"11|0":{"coaches":0,"players":0},"12|0":{"coaches":0,"players":8},"13|0":{"coaches":0,"players":0},"14|0":{"coaches":0,"players":0},"15|0":{"coaches":1,"players":8},"16|0":{"coaches":0,"players":0},"17|0":{"coaches":0,"players":0},"18|0":{"coaches":0,"players":0},"19|0":{"coaches":0,"players":0},"20|0":{"coaches":0,"players":0},"21|0":{"coaches":2,"players":8},"22|0":{"coaches":0,"players":0},"23|0":{"coaches":0,"players":0},"24|0":{"coaches":0,"players":0},"25|0":{"coaches":0,"players":0},"26|0":{"coaches":0,"players":0},"27|0":{"coaches":0,"players":0},"28|1":{"coaches":0,"players":1},"29|1":{"coaches":0,"players":9},"30|1":{"coaches":0,"players":6},"31|1":{"coaches":0,"players":5},"32|1":{"coaches":1,"players":10},"33|1":{"coaches":0,"players":9},"34|1":{"coaches":0,"players":9},"35|1":{"coaches":0,"players":6},"36|0":{"coaches":0,"players":0},"37|0":{"coaches":0,"players":0},"38|1":{"coaches":0,"players":6},"39|1":{"coaches":0,"players":6},"40|1":{"coaches":0,"players":5},"41|1":{"coaches":0,"players":8},"42|1":{"coaches":0,"players":4},"43|1":{"coaches":0,"players":6},"4|2":{"coaches":0,"players":10},"44|2":{"coaches":0,"players":7},"45|2":{"coaches":0,"players":8},"46|2":{"coaches":1,"players":9},"47|3":{"coaches":0,"players":8},"48|3":{"coaches":0,"players":9},"49|3":{"coaches":0,"players":7},"50|3":{"coaches":1,"players":7},"51|4":{"coaches":0,"players":12},"52|4":{"coaches":0,"players":8},"53|4":{"coaches":1,"players":8},"54|4":{"coaches":0,"players":0},"55|5":{"coaches":0,"players":7},"56|5":{"coaches":0,"players":7},"57|4":{"coaches":1,"players":11},"58|4":{"coaches":0,"players":9},"59|5":{"coaches":1,"players":7},"60|5":{"coaches":0,"players":0},"61|5":{"coaches":1,"players":10},"62|5":{"coaches":1,"players":12},"63|6":{"coaches":1,"players":7},"64|6":{"coaches":0,"players":7},"65|6":{"coaches":1,"players":8},"66|6":{"coaches":1,"players":15},"67|5":{"coaches":0,"players":8},"68|5":{"coaches":0,"players":8},"69|5":{"coaches":0,"players":8},"70|5":{"coaches":0,"players":11},"71|5":{"coaches":1,"players":9},"72|5":{"coaches":0,"players":5},"73|5":{"coaches":0,"players":8},"74|5":{"coaches":1,"players":9},"27|2":{"coaches":0,"players":0},"75|2":{"coaches":0,"players":8},"76|2":{"coaches":1,"players":10},"77|2":{"coaches":0,"players":7},"8|7":{"coaches":1,"players":11},"12|7":{"coaches":0,"players":8},"78|7":{"coaches":2,"players":10},"79|7":{"coaches":1,"players":11},"80|6":{"coaches":0,"players":7},"81|6":{"coaches":1,"players":8},"82|6":{"coaches":1,"players":8},"83|6":{"coaches":0,"players":11},"32|4":{"coaches":0,"players":9},"84|4":{"coaches":0,"players":10},"85|4":{"coaches":0,"players":9},"86|4":{"coaches":1,"players":10},"87|5":{"coaches":0,"players":9},"88|5":{"coaches":0,"players":7},"89|4":{"coaches":1,"players":9},"90|4":{"coaches":0,"players":8},"91|5":{"coaches":1,"players":10},"92|5":{"coaches":0,"players":7},"93|5":{"coaches":0,"players":0},"94|5":{"coaches":0,"players":8},"95|5":{"coaches":1,"players":8},"96|5":{"coaches":0,"players":8},"97|5":{"coaches":0,"players":7},"1|5":{"coaches":0,"players":7},"98|5":{"coaches":1,"players":8},"99|5":{"coaches":1,"players":10},"100|5":{"coaches":0,"players":7},"101|5":{"coaches":0,"players":7},"102|2":{"coaches":0,"players":9},"103|2":{"coaches":0,"players":9},"0|2":{"coaches":1,"players":10},"104|2":{"coaches":0,"players":11},"105|3":{"coaches":0,"players":9},"106|3":{"coaches":0,"players":7},"107|3":{"coaches":1,"players":10},"108|3":{"coaches":1,"players":8},"70|2":{"coaches":0,"players":8},"109|2":{"coaches":1,"players":11},"19|2":{"coaches":0,"players":10},"110|2":{"coaches":0,"players":9},"111|6":{"coaches":0,"players":12},"112|6":{"coaches":0,"players":8},"113|6":{"coaches":0,"players":5},"11|7":{"coaches":2,"players":9},"26|7":{"coaches":1,"players":8},"114|7":{"coaches":1,"players":10},"21|7":{"coaches":2,"players":7},"115|4":{"coaches":1,"players":9},"116|4":{"coaches":1,"players":8},"117|5":{"coaches":0,"players":8},"118|4":{"coaches":0,"players":11},"119|5":{"coaches":1,"players":10},"120|5":{"coaches":0,"players":8},"121|6":{"coaches":1,"players":9},"122|6":{"coaches":0,"players":11},"123|5":{"coaches":0,"players":9},"124|5":{"coaches":0,"players":7},"125|5":{"coaches":1,"players":8},"126|5":{"coaches":0,"players":7},"127|5":{"coaches":1,"players":9},"128|5":{"coaches":0,"players":8},"129|3":{"coaches":0,"players":10},"130|3":{"coaches":1,"players":10},"131|2":{"coaches":0,"players":1},"17|7":{"coaches":2,"players":12},"14|7":{"coaches":2,"players":9},"132|8":{"coaches":1,"players":8},"133|8":{"coaches":1,"players":8},"134|8":{"coaches":1,"players":9},"135|8":{"coaches":1,"players":10},"136|9":{"coaches":1,"players":9},"137|9":{"coaches":0,"players":9},"138|9":{"coaches":0,"players":7},"139|9":{"coaches":0,"players":7},"140|9":{"coaches":1,"players":5},"141|9":{"coaches":0,"players":8},"142|9":{"coaches":0,"players":7},"143|9":{"coaches":1,"players":9},"144|9":{"coaches":1,"players":7},"145|9":{"coaches":0,"players":8},"18|2":{"coaches":0,"players":10},"146|2":{"coaches":0,"players":8},"147|10":{"coaches":1,"players":12},"148|10":{"coaches":1,"players":7},"116|10":{"coaches":1,"players":10},"149|10":{"coaches":1,"players":7},"150|4":{"coaches":1,"players":9},"151|4":{"coaches":0,"players":12},"152|4":{"coaches":0,"players":8},"153|4":{"coaches":0,"players":8},"154|11":{"coaches":1,"players":8},"155|11":{"coaches":1,"players":10},"156|11":{"coaches":0,"players":8},"157|11":{"coaches":0,"players":8},"158|9":{"coaches":1,"players":7},"159|9":{"coaches":1,"players":7},"160|9":{"coaches":0,"players":6},"161|9":{"coaches":1,"players":5},"162|9":{"coaches":0,"players":9},"163|12":{"coaches":2,"players":15},"164|12":{"coaches":0,"players":9},"165|13":{"coaches":0,"players":6},"166|13":{"coaches":1,"players":12},"167|13":{"coaches":0,"players":7},"168|13":{"coaches":1,"players":8},"169|4":{"coaches":1,"players":8},"170|8":{"coaches":1,"players":7},"171|8":{"coaches":1,"players":9},"172|8":{"coaches":1,"players":10},"173|8":{"coaches":1,"players":8},"174|3":{"coaches":1,"players":9},"175|3":{"coaches":0,"players":8},"176|3":{"coaches":0,"players":8},"177|3":{"coaches":0,"players":9},"178|2":{"coaches":0,"players":10},"179|2":{"coaches":1,"players":8},"180|9":{"coaches":1,"players":7},"2|7":{"coaches":1,"players":7},"3|7":{"coaches":0,"players":0},"181|7":{"coaches":1,"players":8},"7|7":{"coaches":1,"players":10},"182|5":{"coaches":0,"players":10},"183|5":{"coaches":1,"players":10},"184|5":{"coaches":1,"players":9},"185|5":{"coaches":1,"players":6},"186|4":{"coaches":1,"players":8},"187|4":{"coaches":1,"players":9},"188|4":{"coaches":1,"players":9},"189|4":{"coaches":1,"players":9},"190|5":{"coaches":0,"players":11},"191|5":{"coaches":0,"players":8},"192|5":{"coaches":1,"players":10},"193|5":{"coaches":0,"players":9},"194|2":{"coaches":0,"players":0},"195|2":{"coaches":0,"players":0},"196|2":{"coaches":1,"players":6},"197|2":{"coaches":1,"players":9},"198|3":{"coaches":1,"players":11},"199|3":{"coaches":0,"players":10},"200|3":{"coaches":0,"players":8},"201|3":{"coaches":0,"players":8},"202|5":{"coaches":0,"players":10},"203|5":{"coaches":0,"players":8},"204|5":{"coaches":0,"players":10},"205|5":{"coaches":0,"players":10},"206|14":{"coaches":0,"players":8},"207|14":{"coaches":1,"players":11},"208|14":{"coaches":1,"players":10},"209|14":{"coaches":1,"players":11},"210|4":{"coaches":0,"players":8},"211|4":{"coaches":0,"players":8},"212|4":{"coaches":0,"players":6},"213|4":{"coaches":0,"players":7},"36|7":{"coaches":2,"players":10},"25|7":{"coaches":1,"players":10},"23|7":{"coaches":0,"players":10},"6|7":{"coaches":2,"players":8},"214|9":{"coaches":1,"players":8},"215|9":{"coaches":1,"players":9},"216|5":{"coaches":1,"players":8},"42|5":{"coaches":0,"players":7},"217|5":{"coaches":1,"players":7},"218|5":{"coaches":0,"players":10},"219|4":{"coaches":1,"players":9},"220|4":{"coaches":0,"players":10},"221|5":{"coaches":0,"players":9},"222|5":{"coaches":0,"players":7},"223|5":{"coaches":0,"players":0},"224|5":{"coaches":0,"players":10},"225|5":{"coaches":0,"players":9},"226|5":{"coaches":0,"players":8},"227|5":{"coaches":1,"players":10},"228|5":{"coaches":0,"players":11},"44|4":{"coaches":0,"players":7},"9|4":{"coaches":0,"players":9},"229|4":{"coaches":0,"players":11},"230|4":{"coaches":0,"players":12},"231|2":{"coaches":1,"players":9},"232|2":{"coaches":0,"players":0},"233|2":{"coaches":1,"players":8},"234|3":{"coaches":0,"players":9},"235|3":{"coaches":0,"players":11},"236|9":{"coaches":0,"players":7},"237|9":{"coaches":0,"players":7},"238|9":{"coaches":1,"players":6},"239|9":{"coaches":1,"players":8},"240|5":{"coaches":1,"players":9},"241|5":{"coaches":1,"players":6},"242|5":{"coaches":0,"players":11},"243|5":{"coaches":0,"players":9},"244|7":{"coaches":2,"players":7},"245|7":{"coaches":1,"players":7},"246|4":{"coaches":0,"players":10},"247|4":{"coaches":1,"players":6},"248|4":{"coaches":0,"players":11},"249|5":{"coaches":0,"players":7},"250|5":{"coaches":0,"players":9},"251|2":{"coaches":1,"players":6},"252|9":{"coaches":1,"players":7},"253|9":{"coaches":0,"players":7},"254|9":{"coaches":0,"players":9},"255|5":{"coaches":0,"players":8},"256|5":{"coaches":0,"players":8},"33|4":{"coaches":0,"players":10},"257|4":{"coaches":0,"players":10},"258|8":{"coaches":1,"players":7},"259|8":{"coaches":1,"players":9},"260|8":{"coaches":1,"players":8},"261|8":{"coaches":1,"players":8},"200|4":{"coaches":0,"players":8},"262|9":{"coaches":0,"players":8},"263|9":{"coaches":1,"players":10},"264|15":{"coaches":0,"players":8},"265|15":{"coaches":0,"players":7},"266|15":{"coaches":0,"players":7},"267|15":{"coaches":0,"players":8},"268|15":{"coaches":0,"players":6},"269|15":{"coaches":1,"players":6},"270|15":{"coaches":0,"players":0},"271|15":{"coaches":0,"players":8},"272|15":{"coaches":0,"players":5},"273|15":{"coaches":0,"players":8},"274|15":{"coaches":0,"players":8},"275|15":{"coaches":0,"players":8},"276|15":{"coaches":0,"players":8},"28|15":{"coaches":0,"players":1},"277|15":{"coaches":0,"players":0},"111|15":{"coaches":0,"players":8},"187|15":{"coaches":1,"players":8},"278|15":{"coaches":1,"players":8},"279|7":{"coaches":2,"players":10},"37|7":{"coaches":1,"players":11},"24|7":{"coaches":2,"players":11},"15|7":{"coaches":1,"players":8},"200|16":{"coaches":0,"players":10},"280|16":{"coaches":1,"players":11},"281|16":{"coaches":1,"players":8},"10|16":{"coaches":0,"players":11},"282|12":{"coaches":2,"players":15},"283|12":{"coaches":2,"players":14},"284|12":{"coaches":2,"players":12},"449|17":{"coaches":0,"players":0},"450|17":{"coaches":1,"players":8},"451|17":{"coaches":0,"players":7},"452|17":{"coaches":1,"players":8},"453|17":{"coaches":1,"players":7},"454|18":{"coaches":1,"players":7},"265|18":{"coaches":0,"players":7},"455|18":{"coaches":1,"players":7},"456|18":{"coaches":0,"players":8},"457|18":{"coaches":0,"players":1},"38|18":{"coaches":0,"players":7},"458|18":{"coaches":1,"players":5},"459|18":{"coaches":0,"players":6},"460|18":{"coaches":0,"players":8},"461|18":{"coaches":0,"players":7},"462|18":{"coaches":1,"players":8},"463|18":{"coaches":1,"players":7},"464|18":{"coaches":0,"players":8},"465|18":{"coaches":1,"players":7},"466|18":{"coaches":0,"players":7},"467|18":{"coaches":0,"players":5},"468|18":{"coaches":1,"players":8},"469|18":{"coaches":1,"players":7},"470|18":{"coaches":1,"players":8},"471|18":{"coaches":0,"players":6},"472|18":{"coaches":1,"players":7},"473|18":{"coaches":1,"players":4},"474|18":{"coaches":0,"players":7},"475|18":{"coaches":0,"players":5},"476|18":{"coaches":0,"players":8},"477|18":{"coaches":0,"players":6},"478|18":{"coaches":0,"players":8},"479|18":{"coaches":0,"players":8},"480|18":{"coaches":1,"players":8},"481|19":{"coaches":0,"players":7},"482|19":{"coaches":0,"players":6},"483|19":{"coaches":1,"players":6},"484|19":{"coaches":0,"players":7},"485|19":{"coaches":0,"players":8},"486|19":{"coaches":0,"players":4},"487|19":{"coaches":1,"players":6},"488|19":{"coaches":0,"players":6},"489|19":{"coaches":0,"players":6},"490|19":{"coaches":0,"players":6},"491|19":{"coaches":0,"players":6},"492|19":{"coaches":0,"players":6},"493|19":{"coaches":0,"players":6},"494|19":{"coaches":0,"players":0},"495|19":{"coaches":1,"players":6},"496|19":{"coaches":0,"players":5},"497|19":{"coaches":0,"players":8},"498|19":{"coaches":0,"players":8},"499|19":{"coaches":0,"players":0},"500|19":{"coaches":0,"players":6},"501|19":{"coaches":1,"players":7},"502|19":{"coaches":0,"players":6},"503|19":{"coaches":1,"players":8},"504|19":{"coaches":0,"players":5},"505|19":{"coaches":0,"players":7},"506|19":{"coaches":0,"players":7},"507|19":{"coaches":0,"players":7},"508|19":{"coaches":0,"players":6},"509|19":{"coaches":0,"players":7},"510|20":{"coaches":1,"players":6},"511|20":{"coaches":0,"players":7},"512|20":{"coaches":0,"players":6},"513|20":{"coaches":0,"players":7},"514|20":{"coaches":1,"players":8},"132|20":{"coaches":0,"players":5},"515|20":{"coaches":1,"players":8},"516|20":{"coaches":0,"players":6},"517|21":{"coaches":1,"players":8},"235|21":{"coaches":0,"players":8},"518|21":{"coaches":0,"players":8},"519|21":{"coaches":0,"players":6},"520|21":{"coaches":0,"players":8},"521|21":{"coaches":0,"players":6},"522|21":{"coaches":1,"players":8},"523|21":{"coaches":0,"players":7},"494|21":{"coaches":0,"players":0},"524|21":{"coaches":1,"players":6},"525|19":{"coaches":0,"players":8},"526|19":{"coaches":1,"players":8},"527|21":{"coaches":0,"players":6},"528|21":{"coaches":0,"players":8},"529|19":{"coaches":0,"players":7},"530|19":{"coaches":0,"players":6},"531|21":{"coaches":0,"players":6},"532|21":{"coaches":0,"players":6},"533|19":{"coaches":0,"players":7},"534|19":{"coaches":1,"players":8},"536|19":{"coaches":1,"players":7},"537|19":{"coaches":1,"players":7},"43|19":{"coaches":0,"players":6},"538|19":{"coaches":0,"players":8},"539|19":{"coaches":0,"players":8},"540|19":{"coaches":0,"players":8},"541|19":{"coaches":1,"players":6},"542|19":{"coaches":0,"players":6},"543|19":{"coaches":1,"players":8},"544|19":{"coaches":0,"players":7},"545|19":{"coaches":0,"players":6},"546|19":{"coaches":0,"players":7},"547|19":{"coaches":0,"players":7},"272|19":{"coaches":1,"players":8},"548|19":{"coaches":1,"players":7},"535|19":{"coaches":0,"players":8},"549|19":{"coaches":0,"players":6},"550|19":{"coaches":0,"players":8},"551|19":{"coaches":0,"players":6},"552|19":{"coaches":0,"players":7},"553|19":{"coaches":0,"players":8},"554|19":{"coaches":0,"players":7},"555|21":{"coaches":0,"players":8},"556|19":{"coaches":0,"players":6},"557|19":{"coaches":0,"players":8},"558|21":{"coaches":0,"players":7},"559|19":{"coaches":0,"players":8},"560|19":{"coaches":0,"players":8},"561|19":{"coaches":0,"players":0},"562|19":{"coaches":0,"players":7},"563|19":{"coaches":1,"players":7},"564|19":{"coaches":0,"players":8},"565|19":{"coaches":0,"players":5},"566|19":{"coaches":1,"players":7},"567|19":{"coaches":0,"players":8},"681|23":{"coaches":0,"players":4},"682|23":{"coaches":0,"players":12},"683|23":{"coaches":0,"players":12},"684|23":{"coaches":0,"players":3},"685|23":{"coaches":0,"players":14},"264|23":{"coaches":0,"players":12},"686|23":{"coaches":0,"players":11},"687|23":{"coaches":0,"players":15},"6|23":{"coaches":0,"players":20}};
// DATA-END

// Derived from the same pull as DATA. TEAM_GROUP is the prelim group posted on PBLeagues (stable mid-event). ROSTER_PLAYERS is names only — no jersey numbers — from the Nov 8 event-roster package.
const TEAM_GROUP: Record<string, string> = {"0|0":"E","1|0":"E","2|0":"D","3|0":"D","4|0":"C","5|0":"C","6|0":"B","7|0":"B","8|0":"K","9|0":"K","10|0":"E","11|0":"J","12|0":"J","13|0":"D","14|0":"H","15|0":"H","16|0":"C","17|0":"G","18|0":"G","19|0":"B","20|0":"A","21|0":"A","22|0":"K","23|0":"F","24|0":"F","25|0":"J","26|0":"H","27|0":"G","28|1":"A","29|1":"A","30|1":"A","31|1":"A","32|1":"A","33|1":"A","34|1":"A","35|1":"A","36|0":"F","37|0":"A","38|1":"A","39|1":"A","40|1":"A","41|1":"A","42|1":"A","43|1":"A","4|2":"B","44|2":"B","45|2":"C","46|2":"C","47|3":"D","48|3":"D","49|3":"E","50|3":"E","51|4":"B","52|4":"B","53|4":"G","54|4":"G","55|5":"J","56|5":"J","57|4":"F","58|4":"F","59|5":"E","60|5":"E","61|5":"D","62|5":"D","63|6":"A","64|6":"A","65|6":"A","66|6":"A","67|5":"G","68|5":"G","69|5":"H","70|5":"H","71|5":"L","72|5":"L","73|5":"O","74|5":"O","27|2":"C","75|2":"C","76|2":"C","77|2":"C","8|7":"D","12|7":"D","78|7":"E","79|7":"E","80|6":"A","81|6":"A","82|6":"A","83|6":"A","32|4":"B","84|4":"B","85|4":"G","86|4":"G","87|5":"J","88|5":"J","89|4":"F","90|4":"F","91|5":"E","92|5":"E","93|5":"D","94|5":"D","95|5":"G","96|5":"G","97|5":"H","1|5":"H","98|5":"L","99|5":"L","100|5":"O","101|5":"O","102|2":"D","103|2":"D","0|2":"D","104|2":"D","105|3":"D","106|3":"D","107|3":"E","108|3":"E","70|2":"B","109|2":"B","19|2":"D","110|2":"D","111|6":"A","112|6":"A","113|6":"A","11|7":"D","26|7":"D","114|7":"E","21|7":"E","115|4":"B","116|4":"G","117|5":"J","118|4":"F","119|5":"E","120|5":"D","121|6":"A","122|6":"A","123|5":"G","124|5":"H","125|5":"L","126|5":"L","127|5":"O","128|5":"O","129|3":"D","130|3":"E","131|2":"B","17|7":"D","14|7":"E","132|8":"A","133|8":"A","134|8":"A","135|8":"A","136|9":"D","137|9":"D","138|9":"F","139|9":"F","140|9":"F","141|9":"F","142|9":"C","143|9":"C","144|9":"D","145|9":"D","18|2":"E","146|2":"E","147|10":"A","148|10":"A","116|10":"A","149|10":"A","150|4":"E","151|4":"E","152|4":"E","153|4":"E","154|11":"A","155|11":"A","156|11":"A","157|11":"A","158|9":"C","159|9":"C","160|9":"D","161|9":"F","162|9":"F","165|13":"A","166|13":"A","167|13":"A","168|13":"A","169|4":"E","170|8":"A","171|8":"A","172|8":"B","173|8":"B","174|3":"B","175|3":"B","176|3":"C","177|3":"C","178|2":"E","179|2":"E","180|9":"C","2|7":"B","3|7":"B","181|7":"C","7|7":"C","182|5":"N","183|5":"N","184|5":"M","185|5":"M","186|4":"D","187|4":"D","188|4":"C","189|4":"C","190|5":"B","191|5":"B","192|5":"F","193|5":"F","194|2":"F","195|2":"F","196|2":"F","197|2":"F","198|3":"B","199|3":"B","200|3":"C","201|3":"C","202|5":"C","203|5":"C","204|5":"K","205|5":"K","206|14":"A","207|14":"A","208|14":"A","209|14":"A","210|4":"H","211|4":"H","212|4":"J","213|4":"J","36|7":"B","25|7":"B","23|7":"C","6|7":"C","214|9":"E","215|9":"E","216|5":"N","42|5":"N","217|5":"M","218|5":"M","219|4":"C","220|4":"C","221|5":"B","222|5":"B","223|5":"F","224|5":"F","225|5":"C","226|5":"C","227|5":"K","228|5":"K","44|4":"H","9|4":"H","229|4":"J","230|4":"J","231|2":"F","232|2":"F","233|2":"E","234|3":"B","235|3":"C","236|9":"B","237|9":"B","238|9":"E","239|9":"E","240|5":"M","241|5":"M","242|5":"N","243|5":"N","244|7":"B","245|7":"C","246|4":"D","247|4":"D","248|4":"C","249|5":"B","250|5":"F","251|2":"E","252|9":"B","253|9":"B","254|9":"E","255|5":"C","256|5":"K","33|4":"H","257|4":"J","258|8":"B","259|8":"B","260|8":"B","261|8":"B","200|4":"D","262|9":"B","263|9":"E","264|15":"B","265|15":"B","266|15":"A","267|15":"A","268|15":"B","269|15":"B","270|15":"A","271|15":"A","272|15":"B","273|15":"B","274|15":"A","275|15":"A","276|15":"B","28|15":"B","277|15":"A","111|15":"A","187|15":"B","278|15":"A","279|7":"A","37|7":"A","24|7":"A","15|7":"A","200|16":"A","280|16":"A","281|16":"A","10|16":"A","454|18":"A","265|18":"A","455|18":"B","456|18":"B","457|18":"C","38|18":"C","680|22":"A","273|22":"A","681|23":"A","682|23":"A","458|18":"A","459|18":"A","460|18":"B","461|18":"B","462|18":"C","463|18":"C","464|18":"A","465|18":"A","466|18":"B","467|18":"B","468|18":"C","469|18":"C","683|23":"A","684|23":"A","28|22":"A","268|22":"A","470|18":"A","471|18":"A","472|18":"B","473|18":"B","474|18":"C","475|18":"C","476|18":"A","477|18":"B","478|18":"B","479|18":"C","480|18":"C","685|23":"A","264|23":"A","278|22":"A","187|22":"A","686|23":"A","687|23":"A","688|22":"A","689|22":"A","224|23":"A","6|23":"A","277|22":"A","266|22":"A","690|22":"A","691|22":"A","481|19":"E","482|19":"E","449|17":"A","450|17":"A","483|19":"E","484|19":"E","485|19":"E","486|19":"E","451|17":"A","452|17":"A","487|19":"B","488|19":"B","489|19":"E","490|19":"E","491|19":"B","492|19":"B","493|19":"E","494|19":"E","495|19":"B","496|19":"B","453|17":"A","497|19":"B","498|19":"B","499|19":"B","500|19":"F","501|19":"F","502|19":"F","503|19":"F","504|19":"F","505|19":"F","506|19":"F","507|19":"F","508|19":"F","509|19":"F","510|20":"A","511|20":"A","512|20":"A","513|20":"A","514|20":"A","132|20":"A","515|20":"A","516|20":"A","517|21":"A","235|21":"A","518|21":"A","519|21":"A","520|21":"A","521|21":"A","522|21":"A","523|21":"A","494|21":"A","524|21":"A","525|19":"C","526|19":"C","527|21":"A","528|21":"A","529|19":"C","530|19":"C","531|21":"A","532|21":"A","533|19":"C","534|19":"C","535|21":"A","536|19":"C","537|19":"C","43|19":"C","538|19":"C","539|19":"G","540|19":"G","541|19":"G","542|19":"G","543|19":"G","544|19":"G","545|19":"G","546|19":"G","547|19":"D","272|19":"D","548|19":"G","535|19":"G","549|19":"D","550|19":"D","551|19":"D","552|19":"D","553|19":"D","554|19":"D","555|21":"A","556|19":"D","557|19":"D","558|21":"A","559|19":"A","560|19":"A","561|19":"A","562|19":"A","563|19":"A","564|19":"A","565|19":"A","566|19":"A","567|19":"A"};
const ROSTER_PLAYERS: Record<string, string[]> = {"24|7":["Brandon Cornell","Justin Cornell","Chad George","Tyler Harmon","Conner Kelley","Nicholas Leival","Tyler Panlilio","John Parrish","Timothy Stanczak","Dalton Vanderbyl","Zachary Yachimec"],"15|7":["Jakub Bielski","Kacper Dziedziczak","Franciszek Kryj","Micha Kumierczyk","Marek Ozog","Jacek Parczewski","Truls Parsson","Maciej Pasternak"],"279|7":["Alexander Berdnikov","Corey Hall","Thomas Hara","Michael Johnson","Pavel Karsliev","Daniil Kuzmin","Kirill Prikhidni","Leonid Smotrov","Sergey Solnyshkov","Edilberto Vasquez"],"37|7":["Christos Botsolas","Keith Brown","Chad Busiere","Jacob Edwards","Alex Goldman","Daniel Holliday","Christopher Horn","Mark Ireland","Marcello Margott","Chris Schehr","Bryan Smith"],"12|7":["Quentin Duchene","Zbyszek Piotrowski","Marcin Polec","Michal Sokolowski","Marek Sokolowski","Dawid Staniaszek","Szymon Wierzbicki","Franek Wierzbicki"],"181|7":["Joey Dipolito","Michael McGowan","Joseph Oller","Aaron Pate","Alexander Povilaitis","Aaron Rios","Davis Stephens","Ronny Tiner"],"6|7":["Mark Frans","Mason Hinds","Ryan Hoskinson","Jet Isidro","Jared Lackey","Daniela Rojas","Joseph Rooney","Maxim Stancel"],"8|7":["Nikolao Asabedo","Matthew Askren","Jackson Blue","Alex D'Acquisto","Lance Grewell","Andrew Malsam","Jeren Perez","Nate Roberts","Gunther Stumpf","Michael Unger","Kevin Wenck"],"114|7":["Andrew Bell","Sam Brinkman","John Brinkman","Michael Brown","Logan Dyer","Konstantin Fedorov","Duran Martinez","Jake Raffield","Shon Saucedo","Kaito Warner"],"36|7":["Nathan Aboulhosn","Kyle Bowen","Ryan Hall","Jonah Jamroz","Zack Patient","Trevor Resar","Kevin Rudulph","Dany Schonauer","Sam Silberg","Rob Velez"],"2|7":["Austin Bufton","Ronnie Dizon","Mikhail Knyazev","Cody Mickowski","Ryan Moorhead","Connor Nelson","Andres Ramos Saldana"],"26|7":["Lucas Alindajao","Jordan Boyum","Ethan Jose Castro","Evan Middleton","Daniel Park","Guillermo Ramirez","Lucas Tamura","Brandon Trujillo"],"11|7":["Caleb Abuhl","Cj Canter","Patrick Kraft","Christopher Lennon","Avery Nguyen","Kyle Nicholaou","Alex Rosati","Henry Sentz","Jesse Stephens"],"78|7":["Joseph Altamore","Rob Altamore","Travis Baskin","Chris Caputo","Alfred De Los Santos","Scott Graham","Mark Meiterman","Zach Moran","Gilbert Sakaguchi","Christopher Sanborn"],"79|7":["Frederic Berkley","Josh Calleja","Jared Cester","Shawn Demers","Charles Givens","Shahyar Hussain","Sebastian Ivan Lopez","Jose Navarro","Timmy Roberts","Josh Taylor","Chris Tiru"],"244|7":["Jonathan Chavez","Cyrus Garringer","Jacob Johnson","Tyler Luckau","Trenton Mason-Salinas","Jacob Sebaugh","Scott Stewart"],"25|7":["Eric Arrieta","Zack Carter","Jeremy Doan","Angel Frutos","Grayson Gladstone","James Green","Stephen Mazurek","Devon Stuart","Julian Velazquez","Cody Woodruff"],"7|7":["Kariel Concepcion","Raymundo Del Rosario","Jc Maldonado","Loys Rafael","Kaleed Ramirez García","Julian Reyes","Yaziel Rios","Amin Rodriguez","Carlos Santiago","Adrian Santiago Torres"],"21|7":["Nick Campbell","Ryan Chantler","Austin Kaus","Clayton Rizzardo","Shayne Salmon","Conor Smith","Derrick Weltz"],"23|7":["Cody Bayless","William (Billy) Bernacchia","Carlos Cortes","Tj Danner","Thomas Guest","Nico Hyde","Matt Jackson","Alex Martinez","Demetrius Ninios","Colt Roberts"],"17|7":["Arturo Andrade","Archie Barnes","Joe Barrett","Kyle Barry","Alex Fraige","Harrison Frye","Ryan Greenspan","Stephen Omara","Yosh Rau","Michael Urena","Eliot Weaver","Blake Yarber"],"14|7":["Graham Arnold","Alexander Borromeo","Ben Challenger","Joel Eaton","Alec Holland","Shane Howe","Nathan Schroeder","Cole Scott","Austin Woodward"],"245|7":["Peter Anfossi","Ben Carroll","Axel Gaudin","Adrien Krompholtz","Thomas Portier","Thomas Szpytma","Hugo Verhaeghe"],"173|8":["Caitlyn Eisenhauer","Crista Gonzales","Lauren McGowan","Sony Phinitsovanna","Brittney Rife","Ali Saczawa","Esther Van Ee","Dallas Whitright"],"132|8":["Kelsey Hooker","Andrea Ibarrola","Ivonne Navarrete","Melissa Neese","Jessica Osborne","April Pope","Kristen Stanley","Azureed Tucker"],"258|8":["Vayda Dux","Nicole Gates","Hadley Korsman","Jessica Maidlow","Rebecca Pflueger","Jessica Salinas","Mikaela Wilkins"],"133|8":["Michele Fiegert","Linda Graue","Julia Haugberg Andersen","Carina Karterud","Elise Stavsoien Kolstad-Lea","Warinda Maneesod","Louise Ukkelberg Dahle","Christine Van Weidmann-Truong"],"172|8":["Tami Adamson","Karla Andrade Alvarez","Lysette Barnes","Mercedes Dozal","Casey Erb","Heather Groezinger","Monica Lopez-Aliaga","Andrea Martinez","Cloe Serino","Angelina Tejeda"],"170|8":["Allison Balmores","Carly Colamesta","Isabella Elezaj","Alexys Giaccio","A. Sobbe Glass","Christina Starr","Caitlin Woodward"],"171|8":["Jordan Adams","Cassidy Bernaski","Jennifer Burgi","Erin Klar","Yvonne Leon","Marie Muizelaar","Meaghan Oakes","Cassandra Schellenberg","Hannah Urquhart"],"259|8":["Anna Burge","Karli Collins","Allison Cook","Hailey Froese","Adriana Loustaunau","Kelly Ludtke","Tessa Osterhage","Vivian Pham","Kaitlyn Riggs"],"134|8":["Mina Amundsen","Andreina Blanco","Gerkary Bracho","Jenn Fulk","Katie Kelley","Alexis Lazer","Hailey Leyva","Daniela Rojas","Alicia Valdivia"],"261|8":["Alana Busch","Julie Colau","Zoe Harvey","Cakes Reed","Alison Reuter","Alexis Severson","Victoria Wilhelm - Todd","Laurel Ziemann"],"260|8":["Angelimar Cuevas Torres","Bianca Fiz","Andrea Fernanda Gomez Gonzalez","Gina Lopez","Daniela Pulido Moyano","Bruna Resende","Yei Rojas","Leidy Rojas Castellanos"],"135|8":["Camilla Ariano","Anderlin Blanco","Lauren Boger","Gillian Brigman","Natasha Lopez","Brittney Marshall","Tommie Martin","Caitlyn Taylor","Paige Vasser","Morgan Whipple"],"12|0":["Quentin Duchene","Zbyszek Piotrowski","Marcin Polec","Michal Sokolowski","Marek Sokolowski","Dawid Staniaszek","Szymon Wierzbicki","Franek Wierzbicki"],"9|0":["Indy Chan","Joshua Croes","Gionathan Helder","Rayon Henriquez","Meyson Henriquez","Dillon Lampe","Junior Montilla Heredia","Alixon Pieters","Lionel Raphaela"],"0|0":["Kevin Cavanaugh","Jared Cester","Chazz Daniels","Brian Goldberg","Micah Hayes","Shahyar Hussain","Anton Kuchigashev","Corey Macon Walter","John Peterson","Jake Snyder"],"4|0":["Alex Barker","Seth Brown","Colton Doll","Tommy Hawkins","Mason Lombo","Owen Pinch","Steven Reyes","Jackson Rhudy","Ian Rolfsen","Ben Sloffer"],"15|0":["Jakub Bielski","Kacper Dziedziczak","Franciszek Kryj","Micha Kumierczyk","Marek Ozog","Jacek Parczewski","Truls Parsson","Maciej Pasternak"],"21|0":["Nick Campbell","Ryan Chantler","Cody Chong","Austin Kaus","Clayton Rizzardo","Shayne Salmon","Conor Smith","Derrick Weltz"],"1|0":["Israel Gregorio Hidalgo Villarreal","Ramon Naranjo","Felipe Ramirez","William Ramirez Salguero","Fausto Valencia","Ricardo Villacis"],"33|1":["Austin Arguelles","Dalton Ashley","Jason Bonner","Logan Heath","Neal Hicks","Matt Hodges","Connor Hodges","Gurjit Sandhu","Quentin Stevenson"],"30|1":["John Chichin","Nicholas Genao","Matthew Genao","Glenn Gross","Jeremiah Orta","Thomas Tracy"],"28|1":["William Messer"],"31|1":["Adam Ellis","Jeremy Felty","John Ostromecki","Dennis Raden","Azureed Tucker"],"38|1":["Carlos Aguirre","Mauricio Barca","Oswaldo Ceballos","Joaquin Orozco","Andres Temoli","Franco Vega Ferlin"],"34|1":["Dakota Arnold","Curtis Dunigan","Patrick Fisher","Joshua Heldwein","Christian Migliore","Joey Nushart","Alex Phelps","Joshua Sowers","Chris Michael Suglia"],"40|1":["Travis Cannon","Zach Green","Seth McClaine","Dakota Tonnessen-Visaggio","Christian Wiesenberg"],"42|1":["Josh Becker","Jacob Bochicchio","Logan Cate","Chris Mauney"],"43|1":["Eric Brekke","Talan DeMeyer","Kent Ketter","Brent Osterhage","Tessa Osterhage","Dylan Reule"],"29|1":["Kyle Koenig","Tyler Lyden","Carey Mathews","Chad Mooney","Mac Mosier","Raymundo Murguia","Jerrod Murphy","Scott Surles","Jason Williams"],"41|1":["Xavier Bolle","Joshua Keyes","Edwin Kruer","Sergio Padilla","Emmanuel Rodriguez","Dennis Scardino","Jm Serge","Kurtis Wiedenbeck"],"39|1":["Michael Durham","Michael Moquin","Logan Peralta","Jonathan Shay","Brandon Sterle","Joe Winters"],"35|1":["John Paul Johnson","Gavin Johnson","Aaron Knoll","Jesse Martin","James Vilora","Christel Weltzin"],"32|1":["Spencer Barry","Trey Beattie","Jayden Bruckbauer","Alex Caldwell","Derek Gilroy","Alex Lennon","Anthony Lennon","Keegan Lindsay","Jordan Massengale","Joshua Wittig"],"281|16":["Kyle Baran","Jackson \"Noodle Knees\" Frey","Andrew Geraghty","Zach Hoeg","Vasilios Kanakaris","Cody Lapapa","Jacob Mesko","Austin Olivan"],"200|16":["Dominic DeVivo","Taylor Dixon","Matheo Duro","Alex Gerow","Weston Kurtz","Chris Kutzler","Jonah Rodriguez","Ryan Rodriguez","Andy Schoemaker","Mark Schumacher"],"280|16":["Aidan Chasman","Matthew Darula","Jonathan Darula","Thomas Greenleaf","Harrison Gross","Matt Kilbashian","Samuel Lana","Isaac Luke","Thomas Mantoni","Robert Runowicz","Jake Thorn"],"10|16":["Andreina Blanco","Alec Brown","Ronald Cox","Alec Dennison","Mark Farkas","Cody Houghton","Brandon Johnson","William Matney","Hugh Prescod","Jeziel Quiros-Barria","Keeshawn Royal"],"116|10":["Jacob Brault","Evan Eames","Mark Getty","Will McLean","Matthew McWhinnie","Kyle Menard","Jonvante Nijjar","Spencer Niland","Leland Richman","James Wilcoxen"],"148|10":["Austin Caster","Stephen Davies","Matthew Davies","Jenn Fulk","Brandon Hogan","Alex Kvasnicka","Josh Maffeo"],"149|10":["Miles Carter","Jon Diefenderfer","Robert Jachetti","Michael Janiec","Nick Koehler","Jagger Pinto","Dominic Pinto"],"147|10":["Chase Baxter","James Capers","Nathaniel Combs","Dakota Davis","Omar Montoya","Joseph Petrucelli","Henry Portillo","Dominique Pratt","James Rigsby","Gabe Rodriguez","Jonathan Turner","Ashton Wright"],"209|14":["Marek Danhoff","David Gaskey","Van Hayden Griggs","Richard Hansen","Erik Herstol","Anthony Kackert","Scott Kellum","Benett Maurer","Timothy Miller","Blair Bino Ware","Coile Yarberry"],"208|14":["Kelvin Betancourt","Nicholas Dinolfo","Dillon Lampe","Jasper Long","Manuel Luscher","Clayton Nichols","Charles Piker","Emmanuel Rodriguez","Williams Rodriguez","Bryson Sanchez"],"206|14":["Brett Evans","Mark Fleischer","Gino Forte","Peter Gioello","Mark Griffith","David Hundley","Luke Laney","Caleb Spires"],"207|14":["Christopher Beasley","Jacob Carter","Andrew Gobin","Justin Gravel-Vallée","Carey Mathews","Mac Mosier","Raymundo Murguia","Dylan Rogge","Blakely Sigmon","Corey Sniegowski","John Williams"],"154|11":["Edward Bolton","Brian Branchcomb","Aidan Gorman","Landen Heil","Christopher Lackey","James McCartney","Dominic Nates","Daniel Segura"],"156|11":["Bo Bennett","Isaiah Harger","Kobe Johnson","Hadley Korsman","Kaiden Korsman","James Martin","Kellan McCormack","Nicholas Ross"],"155|11":["Abel Aguilera","Christian Aliviado","Brenden Chavez","Geovanni Colocho","Bobby Contreras","Derrick Cozart","Endor Gutierrez","Sonny Hernandez","Brett Meyer","Jacob White"],"157|11":["Justin Fricke","Taylor Gray","Andrew Klein","Johnathan Knight","Matt Martin","Carson Meyer","Jon Mikolajczak","Thomas Wessels"],"166|13":["Nicholas Burns","Parker Burns","Gavin Burt","Peter Edwards-Luke","Thomas Fountain","Payne Hamby","Steven Harman","Caimon Harris Luke","Rexx Hudgins","Tanner Morrison","Trystan Osborne","Aaron Wu"],"165|13":["Jaclyn Beri","Erin Bing","Jason Bing","Kurt Knecht","Brayden Marosek","Wesley Schooley"],"168|13":["Lane Carter","Jacob Douglas","Jack Dustin","Hayden Garcia","Ashton Johnson","Robert \"Peebutt\" Ortiz","Nathan Perry","Zack Rosen"],"167|13":["Raiden Ah Sam","Justin Dodrill","Cameron Fife","Sydney Helton","Christopher Rivas","Christian Whitlock","Chris Wolf"],"109|2":["Oscar Cueva","Mario Escobedo","Narciso Garces Juarez","Corey Jones","Evan McCarty","Jeronimo Patino Benavent","Carlos Ramirez","Andrew Rees Pears Evans Stewart","Jorma Shores","Martin Valverde Flores","Luis Guillermo Zermeño"],"46|2":["Angel Alarcon","Aj Aybar","Oliver Bendixen","Joseluis Chavarria","Daniel Diaz-Queirolo","David Puchalski","Austin Saunders","Thorne Smith","Gabe Sutherland"],"19|2":["Johnny Christ","Matthew Courtenay","Brent Curry","Michael Hansson","Charles Lessig","Aiden McGrade","Daniel Milisits","John Muro","Chris Petersen","Kris Strazza"],"196|2":["Collin Cherry","Christian Cifuentes","Wyller Gomes","Martell Hutchinson","Evan Manners","Franklin Roberts"],"44|2":["Lawson Benedict","Christopher Boyd","Jordan Luengas","Joshua Navarro","David Ratchford","Josh Taylor","Tyson Williams"],"197|2":["Aaron Chepiga","Keshawn Hopkins-Scott","Timothy Jones","Jason McDonald","Bryan Narcisse","Travis Newsome","Sean Phillips","Jose Regidor","Jon Trevino"],"103|2":["Sammy Barry","Will Cunane","Brady Oldham","Franklin Paredes","C.J. Schamber","Kyle Weaver","Corwin Weber","Dylan White","Russell Wiarda"],"179|2":["Marcus Camacho Campione","Rafael Dias","Milhem Farhat","Gabriel Ferreira","Tiago Martins","Marcelo Rozental","Matheus Santos","Marcos Valente"],"178|2":["Todd Boyer","Alex Cross","Jacob Downing","Matt Edens","Jeremy Frey","Gavin Lee","Clayton Long","Cameron Long","Johnny Stewart","Joe Twickler"],"231|2":["Warren Barker","Ryan Carothers","Nestor Castro","Austin Coggins","Blake Conner","Jason Delashmet","Jose Dina","Zayden Gonzales","Nathan Rosso"],"70|2":["Tayler Allen","Kyle Corriea","Ryan Cotter","Keith Devit","Anthony Kearney","Johnell Lorenzo","Layne Parenti","Conor Walsh"],"146|2":["Ben Cunningham","Danny Del Signore","Michael Doyle","Kenny Frank","Ryan Kutchey","Sean Oliver","Alan Outeiral","Stacy Smith"],"0|2":["Alex Bispo","Kevin Cavanaugh","Chazz Daniels","Brian Goldberg","Micah Hayes","Anton Kuchigashev","Corey Macon Walter","John Peterson","Jake Snyder","Allen Tate"],"4|2":["Alex Barker","Seth Brown","Colton Doll","Tommy Hawkins","Mason Lombo","Owen Pinch","Steven Reyes","Jackson Rhudy","Ian Rolfsen","Ben Sloffer"],"18|2":["Jason Belling","David Best","Justin Hunter","Zach Lundgren","Kobe Sigrah","Porter Stanley","Thomas Taylor","Keith Taylor","Jesse Watkins","Robert White"],"251|2":["Jesus Esquivel","Julien Gazzola","Jonathan Gengler","Kristopher Gonzalez","Carlos Perez","Thibault Remi"],"76|2":["Matthew D'Arienzo","Mael Jacquemin","Nathan Manfredi","Gregory Montalvo","Hilton Patton","Tobias Sell","Mario Viggiani","Will Bad Guy Weeams","Keith White","Rick Williams"],"233|2":["Cole Benevento","Joe Biondo","Aaron Carter","John Debaldo","Owen Goin","Joshua Lehman","Evan Luther","Brandon Portman"],"131|2":["Carlos Perez"],"45|2":["Brandon Allison","Justin Glidewell","Ryan Hilscher","Derek Neubauer","Jerry Phillips","Connor Sanders","Christopher Tucker","Ernesto Vazquez"],"104|2":["Ricardo Stephen Alkins Villarroel","Pablo Almanza","Mario Ballado Larios","Juan Cagigal","Irving Camacho","Alberto Castillo Franco","Rodrigo Del Rio Moreno","Martin Alejandro Mancera Guerrero","Jose Moreno Flores","Ivonne Navarrete","Jordan Richards"],"102|2":["Juan Cardona","Derek Friedhoff","Jake Hundley","Vladimir Kozirev","Michael Lowery","Eli Roberts","Tyler Sheppard","Harrison “Big Jerry” Stanton","Alex Zudell"],"110|2":["Alex Abraham","Mikael Etienney","Fabrice Gambin","Brice Gaudin","William Hughes","Achille Jaillard","Matteo Jimenez","Hajatiana Randriamalala","Heritiana Randriamalala"],"77|2":["Joseph Bennett","Dylan Fennell","Joe Hoe","Adam Jeffrey","Louis Koffi","Ravi Parmar","Nathan Pitt"],"75|2":["Jorge Alemany","Martin De Frutos","Diego Gallego","Andres Gallego","Jose Osoria","Felipe Ramirez","Esteban Sibaja","Alejandro Velazquez"],"50|3":["Blake Baumeister","Cory Gonzalez","Aidan Jahnke","Jesus Morales","Todd Stahoviak","Trevor Stewart","Steve Trayes"],"105|3":["Jonathan Adkins","Mike Baker","Dalton Conn","Anthony Ingagliato","Ajahi Jernigan","Braxton Kusumoto","Ethan Martin","Thomas Sellers","Imaikamakanaokalani White"],"47|3":["Josh Beasley","Robert Chapple","Ben Foster","Eric Lomeli","Paul Mastin","Christian Morris","Matthew Moyer","Tadd Parker"],"49|3":["Niko Dejesus","Greg Hrostek","Nicholas Kelling","Austin Mayo","Nicholas Messier","Carter Peckinpaugh","Travis Rudd"],"106|3":["Camilo Bernal","Jorge Escobar","Carlos Escobar Berrio","Fernando Llinas","Sebastian Rodriguez Rios","Yeimer Romero Granados","Andres Santos Polo"],"48|3":["Wayne Black","Timothy Creedon","Gavin Day","Curt Hettrich","Kenny Johng","Jonathan Lee","Angel Molina","Julian Pasion","John Steward"],"201|3":["Jacob Cruse","Owen Dexter","Nick Horn","Nick Ludwig","Dylan Newton","Stephane Salet","Cody Shook","Michael Wolfe"],"199|3":["Jose Aponte Rodriguez","Hunter Barnes","Jose Cardoso Filho","Norman Cuencas Laureano","Hector Gonzalez","Brett Hiner","Devin McCulloch","Christopher Rangel","Oscar Rios","Andres Rivas"],"107|3":["James Feliciano","Hayden Gonzalez","Cameron Hall","Dylan Jolly","David Magid","Matthew Martin","Kyle Matthews","Christopher Tavares","Gianni Tavarez","Zachary Vaughan"],"200|3":["Hayden Bevis","Jordan Butt","Andrew Castellana","Aidan Connor","Kelvin Fernandez","Cameron Ivey","Tyler Kelvy","Xavier Nieves"],"176|3":["Austin Arruda","Daniel Cenci","Ryan Cosey","David Crump","Tremaine Grant","William Holler","Brett Lagana","Antwan Schiano"],"174|3":["Kyle Breith","Russell Cain","Andrew Collins","Derek Gable","Darren Isom","Ross Plum","Jonathan Vargo","Austin Verbeke","Michael White"],"108|3":["William Burgess","Joseph Cho","Ben Crumrine","Kevin Dagenais","Dimitri Faircloth","Daniel Galeana","Joey Larochelle Miron","Garrett Luksich"],"234|3":["Robert Beasley","Jonathan Bianchi","Braden Flanders","Jacob Gomez","Benjamin Hubbard","Leland Hubbard","Austin Keller","Hunter Naz Nasrallah","Riley Roberts"],"129|3":["Keegan Brosman","Nathan Erb","Myles Henry","Kyle Hoskovich","Cody McAfee","Russel Moretto","Brenden Reid","Zach Sweeting","Kyle Topness","Jimmy Vuong"],"130|3":["Jonathon Conant","Jack Cruz","James Fabijancic","Brian Goniwicha","Rodney Gravitter","Gavyn Hosfelt","Richard Idema","Robert McKeever","Joshua Myers","Chris Wireman"],"175|3":["Miguel Alcantara Montiel","Edwin Carboc","Mateo Dagostino","Mark Gerber","Floris Keizer","Fadi Salem","P Nico Salgado","Gregory Turton"],"198|3":["Nicolas Arango","Joshua Broaddus","Jesse Davis","Austen Embrich","Aden Guttmann","Damion Matteson","Mason Mendez","Alex Phelps","Sean Staelins","Stephen Storll","Alex Wigand"],"235|3":["Robert Bayard","Gerkary Bracho","Jose Bustamante","Cody Clarkson","Brett Daily","Tyler Dudley","Tyler Lawless","Nicolas Leclerc","Janmichael Rios","Alexis Rodriguez","Andrew Saginor"],"116|4":["Matt Clark","Camdon Dutra","Derek Lambert","William McNeal","Aaron Mitchell","Jacob Morrill","Liam Osterfield","Shane Perkins"],"9|4":["Indy Chan","Joshua Croes","Dylan Galeano Velez","Gionathan Helder","Rayon Henriquez","Meyson Henriquez","Junior Montilla Heredia","Alixon Pieters","Lionel Raphaela"],"33|4":["Austin Arguelles","Dalton Ashley","Jason Bonner","Logan Heath","Neal Hicks","Matt Hodges","Connor Hodges","Gurjit Sandhu","Wesley Smith","Quentin Stevenson"],"189|4":["Justin Ainsworth","Jake Boger","Jeremy Draxler","Logan Goldinger","Robert Herring","Dillon Holmesley","William Long","Justin Thompson","Zachary Thompson"],"153|4":["Melvin Gonzalez","Leandro Lozada","Sergio Moya","Ramon Naranjo","Pedro Ojeda","Jonathan Vidal Peńa Aracena","Erick Pimentel","Jose Torres"],"44|4":["Chris Ballou","Braylon Degrave","Luis Diaz Guzman","Fermin Hernandez","Edward Horbelt","Luis Martinez","Nicholas Neira"],"89|4":["Jacob Bartholow","Austin Castro","Marcus Clark","Chance Holmes","Trenton Hunt","Collin Laster","Scott Sakowski","Austin Setzer","Mike Weaver"],"90|4":["Vivien Fessy","Pierre Fessy","Jean-Marie Gerbier","Damien Gerbier","Sebastien Gerbier","Geoffrey Micheau","Philippe Micheau","Aurélien Noble"],"210|4":["Joshua Bergert","David Herrera","Michael Iglesias","Jesse Marrero","Ismael Monte De Oca","Juan Pardilla","Juan Rivas","Jeremy Roark"],"186|4":["Matthew Bursey","Jonathan Friedrich","Dylan Jutras","Tyler Kerfoot","Caleb Kitchen","Kody MacDonald","Jaiden Oliver","Ben Perreault"],"212|4":["Brian Butterfield","Michael Hummel","Cooper Stapleton","Zach Steward","Jason \"Jay\" Turner","Alexander (Xander) Watson"],"118|4":["Damon Brundige","Tim Cannizzo","Christoffer Catanzaro","Nicole Hemingway","Michael Labeef","Timothy LaBeef","Kahl McGill","Kristel McGill","Jeremy Meier","Jonelle Weaver","Nathan Williams"],"151|4":["Anthony Bonck","Emanuel Bravo","Hernan Buenfil","John Camacho Estrada","Alex Diaz","John Fortune","Dariel Garcia","Jason T Hoehn","Bishop Hoehn","Chris Maze","Bryan Oaks","Joel Villafane"],"219|4":["Ian Anderson","Jackson Dunn","Jaden Go","Spencer Hopp","Collen Jordan","Christopher Molloy","Audrey Vazquez","Tyler Wayne","Kristina Webb"],"152|4":["Christopher Anglin","Kelley Cates","Brett Gibson","Michael Goins","Aaron Keene","Tyler Murphy","Robert Schoolfield","Chris Suglia"],"57|4":["Daniel Budrecki","Skyler Campbell","Joshua Jones","Liam MacBell","Masiyia McLaughlin","Johnathon Johnny 5 Muniz","Paul Pickett","Nicholas Repanti","Anthony Taylor","Sean Teets","Mikaela Wilkins"],"150|4":["Ryan Allen","Roy Brouwer","Matthew Dunderdale","Travis Durning","Matthew Flynn","Colin Gruszka","Ryan Jakubiak","Jordan Lyndes","Rob Whitaker"],"257|4":["Joseph Bruno","John Burriesci","Jason Cabanillas","Brian Catania","Carly Colamesta","James Fraley","Joseph Giannone","Edan Iss","Brandon Kilgore","Meyer Robinson"],"51|4":["Jose Almanzar","Michael Arlotta","Sky Avni","Anthony Bono","Jorge Coladas","Jonathan Coladas","Tyler Conte","Donald Kitchen","Christopher McOrmick","Lazaro Royero","Zac Shisler","Nicholas Taranto"],"52|4":["Rafael Franco Rabago","Jorge Garcia Angeles","Luis Enrique Garcia Angeles","Juan Jimenez","Diego Pérez Pérez","Emilio Salgado Flores","Leonardo Tapia Cardenas","Arturo Velazquez"],"200|4":["Nathan Duro","Patrick Guerro","Benjamin Jacobs","Adam Kloo","Zach Pine","Ryan Pyle","Matthew Threatt-Peters","Juan Torres"],"248|4":["Logan Antolak","Adrian Baldassarra","Hunter Campbell","Cameron Canonico","Morgan Hale","Cody Knight","Isaac Oliver","Rowan Prasad","Max Vandorsser","Sam Wilson","Alex Young"],"220|4":["Alex Blackburn","Josh Cameron","Michael Desormeaux","Joshua Gastelum","Eric Gravelle","Corey Lamkin","Jeffrey Laporte","Raphael Sabourin","Brady Shail","Hayden Walford-Davis"],"246|4":["Cade Blackwelder","Cameron Blanco","Kevin Erwin","Joel Kurtz","Adrian Lopez","Grayson Manning","Tyler Middleton","Pate Smith","Jacob Thompson","Jonathan Valdivia"],"187|4":["Ethan Albright","Arimar Eslava","Darius Eslava","Xander Eslava","Douglas Lewis","Michael Panlilio","Brandon Panlilio","Caleb Panlilio","Niko Podesta"],"85|4":["Brandon Barber","Colton Curtis","Macuyler Dunn","Austin Eisenhauer","Chad Figuerado","Will Harvey","Jackson Lillecrapp","Michael Sidley","Jack Silva"],"229|4":["Logan Baity","Aj Barrett","Reece Cox","Sean Dolan","Jaiden Franklin","Cameron Handyside","Ashton Ostrander","Carson Preston","Andrew Renegar","Tyler Soots","Andrew Willard"],"169|4":["Peter Dejoseph","Spencer Fitch","Jamal Forrest","Sean Harding","Adam Morgenstern","William Prendergast","Shawn Ruiz","Mathew Swist"],"188|4":["Jaydan Correa","Maxwell Crespo","Anthony Gomes","Shane McBride","Jose Meza","Devin O'Hara","Jomar Perez","Justin Waller","Chance-Jiselo Wright"],"247|4":["Fernando Cagigal Carrillo","Omar Callejas","Santiago Callejas","Aaron Garcia","Julio Robles","Ricardo Zavala Zendejas"],"213|4":["Juan Espinosa","Juan Ford","Antonio Leone","Jorge Perez","Luis Pulido","Davy Rodriguez","Alejandro Victoria Riande"],"58|4":["Nicholas Ailes","Andy Castillo","Jonah Hamilton","Karlo Munoz","Joseph Murphy","Adam Nastari","Adam Richards","Charlie Russo","Fabio Tracanna"],"115|4":["Julie Colau","Antuane Dennard","Derek Dk Llewellyn","Gianluca Locicero","Matt McGonagle","Charles Neagle","Shane Pepp","Isaac Stabell","James Wilhelm-Todd"],"86|4":["Matt Belcastro","Andrew Dumoulin","Jesse Fitchett","Bradley King","Jeremy Maillet","James Michanos","Christian Moniz","Brett Robinson","Chase Robinson","Matthew Steel"],"211|4":["Matthew Craven","Cody Ferguson","Colby Goode","Eddie Le","Francesco Marchese","Cameron McDonald","Robert Samples","Lyle Wilks"],"84|4":["Joshua Keyes","Tyler Lawhorn","Jacob Miller","Sergio Padilla","Michael Payne","Louis Race","Levi Smith","Ashton Stockard","Christopher Wells","Zach Wilks"],"230|4":["Brandon Barnes","Adam Butner","Thomas Dills","Sean Gleason","Tyler Kowalski","Ryan (Rj) Nuber","Adam Ortiz","Andy Peterson","Taj Pleban","Landon Pleban","Dominic Whitfield","Jacob Woods"],"32|4":["Spencer Barry","Trey Beattie","Alex Caldwell","Derek Gilroy","Alex Lennon","Anthony Lennon","Keegan Lindsay","Jordan Massengale","Joshua Wittig"],"53|4":["Preston Cain","Chance Courville","Erick Eaton","Matt Mahony","Hudson Miller","Alan Robinson","Trevor Schooley","Nicholas Wohler"],"224|5":["Jeff Burnett","Daniel Chaoui","Myran Jones","Zachary Leuci","Jason McCusker","Ryan McNally","Eric Rinkerman","Michael Steele","Nathan Taylor","Rick White"],"183|5":["Kyle Allen","Trapper Callender","Cory Hageman","Jordan Lanam","Benjamin Lewis","Emilio Love","Phoenix Moerner","Eric Morrissey","Adam Sheets","Kaey-Den Tan"],"250|5":["Marc Crawford","Max Dolinger","Nicholas Hadarits","Dade Pauley","Colin Schmitt","Tripp (Arthur) Sheppard","Matthew Slaven","Dawson Smith","Luis Zuniga"],"228|5":["Miles Attar","Manuel Batlle","Chase Cuason","Alex Davis","Nicholas Jerry","Alexander Klaumenzer","Haydon Lind","Stratton Merkle","Nik Nemeth","Phillip Vergara Lim","Andres Vila"],"243|5":["Kevin Ayala","Dylan Harrison","John Laney","Holman Nokham","Cj Osborne","Dyllan Oudthone","Lane Torbush","Dimitrios Vavlas","James Wren"],"218|5":["Andrew Behrends","Michael Brown","Jakobe Grant","Christopher Hill","George Hyde","Ryan McDermott","Samuel Sandoval","Monte Sandoval","Timothy Sergent","Ben Wilson"],"202|5":["Zachariah Bodnar","Jeremy Felty","Kevin Mont","John Ostromecki","Antonio Prieto","Dennis Raden","Griffin Sennett","Joshua Smith","Juztin Wolphe","Jorden Wolphe"],"92|5":["Arcadio Abreu","Irving Colon","Ellrich Henriquez","Kevin Herrera","Exequiel Ortiz","Franklin Valdez","Edilberto Vasquez"],"91|5":["Joshua Geoghegan","Juan House","Austin Irizarry","Sean Mas","Sterling Mitchell","Bryan Morgan","William Pate","Derrick Proctor","Cody Ruffo","Kennon Smith"],"94|5":["Cory Baker","Milan Dezelich","Milan Dezelich Sr.","David Hardy","Sebastian Hickerson","James Omara","Ryan Sarkozy","Chris Westergaard"],"101|5":["Tyler Brower","Carlos De La Torre","Dom Lopes","Michael Morriss","Joseph Smith","Caden Waters","Chance Weber"],"190|5":["Devon Bray","Jayden Bruckbauer","Christopher Coffman","Brennan Connor","Anthony Lucero","Matthew Maruna","Jonathan Perez","Willie Robison","Kyle Wenzel","Dalton Williams","Matthew Winstead"],"225|5":["Luke Alexie","Luis Brizuela","Abel Calvillo","Sergio Carrero","Tino Covarrubias","Chris Hernandez","Rudy Salazar","Leo Villasenor","Paul Vo"],"74|5":["Bryan Avila","Santos Campos","Jonathan Francom-Clark","Stephen Hughes","Zachary Orson","Anthony Rasey","Lincoln Rogers","Scott Rogers","Robert Sakounphong"],"226|5":["Allen Anderson","Martin Bentley","Kyle Dresh","L Goldsmith","Harry Griffin","Brandon Sparkes","Luis Sparkes","Adam Tregent"],"73|5":["Kevin Alayon","Glenn Blevins","John Donnelly","Jack Gannon","Evan Jackson","Trenton Martin","Jacob Stonitsch","Ricky Tussey"],"68|5":["Christopher Dachel","Robb Gunvalson","Chase Jendrysik","Hunter Jendrysik","Logan McColloch","Cory Miller","Joshua Moreland","Eric Wedul"],"88|5":["Tyler Do","Kelby Kircher","Tyler Mullen","Owen Mullen","Tyson Pritchett","Tanner Radford","William Wyatt"],"249|5":["Daniel Crowley","Colby Finnerty","Rylan Hoyt","Brian Hoyt","Kylie Lima","Joshua Midwin","Alexander Shafer"],"222|5":["David Caton","Riley Gilberti","Christopher Hicks","James Hottinger","Eric Juliano","William Laughlin","Alexander Toy"],"203|5":["Atea Bennett","Brent Dailleboust","Ranatakete Glasgow","George Jacobs","Micheil Klostermann","Sean Meaney","Matthew Millette","Donald Stephen-Dunn"],"62|5":["Garrett Applegate","Andrew Gibson","Michael Hondo","Aaron Johnson","Joshua Lunn","Nigel McComas","Tahbleek Pridgen","Christopher Skimmiehorn","Andrew Tessin","Kaidyn Watkins","Jaidon Woods","Phillip Woods"],"42|5":["Devin Baldridge","Josh Becker","Jacob Bochicchio","Colton Buchanan","Logan Cate","Chris Mauney","Dan Rice"],"193|5":["Kyle Bassett","Scott Campbell","Skyler Collins","Jon Jones","Eurico Medina","Edward Miller","Roy Sances","Lenny Storer","Alex Vinke"],"96|5":["Jason Clark","Tyler Haddock","Curt Havrilka","Jamon Moseley","Nathan Paulsen","Joshua Powell","Cole St. John","Jeffery Teter"],"70|5":["Elliot Barry","Brian Doyle","Bradley Goodman","Stephen Iovino","Christopher Luebbers","Dennis Martinez","Jack Owens","Anthony Peralta","Jonathan Santos","Marc Scheipeter","Brendan Wrubel"],"69|5":["Michael Barone","Dennis Chandan","Efthimios Dagalidis","John Ebersole","Matthew Hays","Ryan Hendricks","Jon Roux","John-Mark Sound"],"192|5":["Justin Brister","Connor Brister","Brian Fercho","Kyle Koenig","Aaron Newby","Daniel Seibert","Christopher Sons","Charles Speed","Matthew Starling","David Williamson"],"216|5":["Francisco Bonano","Kieran Ellis","Spencer Landry","Daniel Lee","Waldo Martinez","Justin Riccitelli","Chris Tausek","Zachary Trinca"],"61|5":["Oscar Acevedo","Sean Uno Bastarache","Caleb Carlson","Samuel Cox","Elijah Cruz","Christopher Dentale","Edwin Flores","Quinn Grimes","Anthony Hirschfield","Michael Reed"],"256|5":["Stephen Conte","Janssen Cutajar","Theresa Cutajar","Jonathan Ferrer","Alexander Gangemi","Justin Perry","Joshua Pointek","Ben Shimmel"],"242|5":["Joseph Alva","Timothy Hyland","Nyjeir Johnson","Monica Lopez-Aliaga","Geronimo Medina","Timothy Morrison","Matthew Paynton","Alex Reh","Timothy Trentacoste","Daniel Vogelbacher","Nathaniel Williams"],"56|5":["Juan Alemany","Alfredo Cardona","Emmanuel Irizarry","Jorge Justiniano","Christian Lopez","Giovanni Mercado Rosado","Herson Rodriguez"],"99|5":["Afdhal Azmeer","Ant Fenimore","Jamel Hart","Robert Hoffmann","Matthew Hutson","Christopher Hutson","Ryan Payne","Nick Perullo","Michael L Tinelli","Luis Velandia"],"205|5":["Tommaso Bellifemine","Gabriel Davila Lopez","Bradley Fleming","Timothy Foley","Cory Gunning","Christos Kezemides","Adam Long","Asher McLaughlin","Cesar Serra","Kyle Smith"],"255|5":["Oscar Canchica","Jose Fernando Hernandez","Jorge Huechacona Sanchez","Gustavo Leguizamo Peña","Santiago Tellez","Manuel Torres Mendez","Sebastian Vallejo Alzate","Sadel Watterson"],"71|5":["Jack Blandino","Tyler Gonzales","Jake Labonte","Esteban Lopez","Nick Messier","Jeremy Neves","Stephen O'Neill","David Painter","Brian Spechuilli"],"217|5":["Rey Alamo","Keith Gonzalez","Kidannys Jimenez","Joseph McNicholas","Eric Muir","Yampole Rodriguez","Jean Carlo Santiago Colon"],"98|5":["Sean Bauers","Preston Clark","Matthew Geldersma","Conner Kelley","Taran Kelley","Aden Kelley","Christopher Pagan","Jacob Venhuizen"],"125|5":["Bryan Aldecoa","Alexander Alicea Morales","Francisco Colon","Jordan Diaz","Luis Jose Flores Robles","Oscar Pabon Rodriguez","Gustavo Pons","Joel Santiago"],"67|5":["Jose Fuentes","Jafet Jimenez","Vasiliy Kvachegin","Yaniel Lopez","Timothy Miller","Allen Murray","Vladmir Ribeiro","Jake Turner"],"184|5":["Tim Goodwin","Sheldon Grant","Tim Hall","Carlos Murguia-Pulido","Jandan Palmer","Robert Quintanilla","Isaiah Rogers","Coty Stone","Brandon Yee"],"191|5":["Joshua Camara","Travis Espinosa","Mike Giacomo","Matthew Greco","Donald Hill","Dalton Hughes","Tristen Leto","Thomas Poynter"],"182|5":["Eric Beall","Jacob Boblits","Kenyen Chum","Brian Crenshaw","Ian Gruenberg","Alex Krzyston","Edward Maydan","Nicholas Nonziato","Austin Rose","Ryan Simmons"],"55|5":["Adam Brown","Brandon Cummings","John Horn","Preston Maynard","Matthew Maynard","Leo Perez","Joseph Van Buren"],"100|5":["Grady Benson","John Bricker","Alexander Christner","Owen Krick","Lauren Messner","Dewayne Mullenaux","Zachary Robertson"],"87|5":["Daniel Baker","Brayden Baker","Landan Baker","Dawson Baker","Aricka Cooper","Johnathon Dunn","Alan Hood","Dreama Jones","Drea Kyle"],"117|5":["Nicolas Jimenez","Sebastian Jimenez","Joseph Lapuebla","Jose Molina","Ivan Podorozhnyi","Jonathan Salas","Datu Tuliao","Ulises Velazquez"],"227|5":["Charlie Buckley","Brian Crahan","Nicholas Hannis","Liam Hannis","Anthony Machado","Zachary Milhard","Mark Ozdemir","James Raymond","Nathan Uporsky","Murray Vanderheyden Panzer"],"97|5":["Alejandro Keuvelaar","Izik Luscher","Kaden Nelson","Jackson Rhodea","Derek Seth","Richard Steinebach","Richard Wood"],"119|5":["Kamerin Blanchard","Don Buckner","Dane Cowden","Ben Dobson","Lester Espino","Daniel Gallego","Bailey Johnson","Christian Larzelere","Derrick Leffler","Troy Montero"],"124|5":["Jose Hernan Acevedo Orozco","Alejandro Delgado","Daniel Garcia Salas","Fabian Gonzalez Valencia","Santiago Narvaez","Juan Quintana","Luis Villota Gomez"],"127|5":["Capella Advincula","Matt Brobston","Jonny Cheek","Oscar Cruz","Raymond How","Michael Jones","Michael Rivera","Tim Schafer","Todd Smith"],"128|5":["Jordan Dery","Typhoon Dikici","Connor Ierullo","Nick Osmond","Nick Pantin","Will Rawski","Mike Riley","Tyler Rutherford"],"95|5":["Florian Budin","Luca Dummermuth","Amarrio Eccleston","Dylan Edgar","Amir Greene","Alex Navarro","Joe Rivers","Keaton Stephen Cutler"],"241|5":["Johnathan Levy","Gabriel Musselman","Simon Ringham","Randy Singh","Dominic Testa","Cody Walls"],"123|5":["Giancarlo Fantone","Jonathan Julien","Dan Kilpatrick","Daniel Nieto","Erick Pena","Jose Sigler","Rashard Thermilus","Michael Thompson","Diego Villatoro"],"185|5":["Benny Barbosa","Fabian Otero","Teddy Rijos Otero","Charlisac Sanchez","Domiro Sousa Camejo","Carlos Torres"],"240|5":["Richie Beam","Bryan Berrios","Christian Deleon","Adam Foulks","Kevin Hoffman","Jordan Masters","Aris 'Chabs' Talingdan","Jordan Tracy","Adam Woodburn"],"59|5":["Lucas Bailey","Connor Jones","Jared Ladue","Anthony Napolitano","Jack Symons","Erick Valenzuela","Edwin Valenzuelas"],"221|5":["Jake Chapman","Benjamin Lennon","Stephen Lennon","Larry Lintz","Corey Lockhart","Jesse Martin","Michael McDaniel","Phillip Mears","Jeffrey Willits"],"126|5":["Xavier Bolle","Timothy English","Jimmie Hazzard","Edwin Kruer","Emmanuel Rodriguez","Dennis Scardino","Jm Serge"],"72|5":["Damian Blowers","Zach Feliciano-Williams","Anthony Ferraro","Joel Thornton","Clint Westwood"],"120|5":["Ryan Chartin","Clarke Glenn","Gregory Guidry","James Hill","Rawlin Johnson","Marcus Johnson","Mathew Thibodeaux"],"204|5":["Manuel Balance","Henry Brito","Luis Castillo","Jaron Gilliard","Dario Montes","Pedro Perez","Dadier Rosario","Kevin Salcedo","Matt Treanor","Manuel Trueba"],"1|5":["Israel Gregorio Hidalgo Villarreal","Eric Morales Salguero","Juan Paez","William Ramirez Salguero","Alejandro Rodriguez","Fausto Valencia","Ricardo Villacis"],"158|9":["Frank Affrunti","Carey Hartranft","Lucas LaBrie","Samantha Martini","Toby Parker","Daunte Roberts","Preston Wright"],"215|9":["Luis Brao","Aidan Galan","Alexander Hernandez","Aidan Hernandez","Manuel Nolivos","Jose Ortiz","Allan Paiz","Vincent Valente","Daniel F. Vazquez-Estevez"],"141|9":["Hector Benitez","Sebastian Benitez","Angel Hernández","Rafael Jaime Ruiz","Ismael Orama","Julio Pino","Danovan Rios Guzman","Jerry Rivera"],"139|9":["Nestor Aguirre Sepulveda","Vicente Alcala","Daniel Fernandez","Wesley Morales","Benjamin Nazario","Andino Nazario","Kevin Ramos"],"136|9":["Casey Baria","Greydon Baria","Tal Bruno","Josh Easterly","Nolan Easterly","Rodney Rivera","Nick Toleos","Michael Tomas-Escobar","Jacob Tomas-Escobar"],"263|9":["Paul Amarante","Carter Beson","Isaiah Gonzalez","Blake Gray","Josiah Lozano","Marcus Martinez","Joed Ortiz","Isaias Sanchez","Nicholas Santiago","Angelo Sperrazza"],"237|9":["Mandy Bertram","Rowan Bogemans","Sebastian Gross","Jason Ramon Kreider","Pascal Markus","Barry Ozeroff","Norman Scheer"],"180|9":["Jayden Calafiore","Jose Carrillo","Payton Castro","Marcello Catania","Trever DeBerry","Ramon Holmes","Luis Medina"],"142|9":["Ryan Blasingame","Aj Brown","Karli Collins","Joe De Los Santos","David Kirk","Jonathan McGill-Baker","Brendan Pollard"],"145|9":["Adam Corley","Andrew Corley","Jameson Gray","Gizela Iniguez","Mason Lipker","Christian Maldonado","Dalton Taylor","Levi Taylor"],"143|9":["Nate Beerman","William Caskey","Sam Delgado","John Galvin","Seth McClaine","John Ogimachi","Derek Pomar","Christian Wiesenberg","Jared Williams"],"262|9":["Stuart Bratton","Jon Morrell","Nathaniel Morse","Kenneth (Casey) Robinson","Juan Rodriguez","Dylan Socha","Zachary Stamper","Andrew Woodin"],"253|9":["Lincoln Andersen","Riva Brown","Lachlan Brown-Sacagio","Moe El-Assad","Kodi Moses","Chester Rocela","Michael Simpson"],"214|9":["Hiram Matos","Christian Montanez","Elvis Padilla","Kevin Padilla Ortiz","Christian Pagan","Victor Pinero","Samuel Rosario","Hector Zabala"],"159|9":["Angel Berrios","Emmanuel Chinea","Avimael Gonzalez","Kevin Melendez Robles","Luis Nieves Cumba","Ismael Alexis Torres","Roberto Vazquez"],"236|9":["Nicholas Cherep","Joshua Christian","Gabriel Paganelli","Edgar Ramiro","Steven Smith","James Taylor","Raysean White"],"137|9":["Mason Davis","Guillermo Falla","Alex Fong","Jordan Jensen","Alejandro Perez","Hilton Sorkazian","Jeff Thompson","Angelo Uribe","Shane Wignall"],"239|9":["Steven Appelbaum","Geoffrey Cercado","Riley Jones","Noah Jones","Brandon Kimura","Lerik Silva","Chris Vanderstar","Greg Zebrowski"],"161|9":["Max Boudreaux","Nathaniel Dahlman","Parx Stancel","Mikey Verstraete","Alan Zajack"],"162|9":["Chris Gentile","Joshua Hornsby","John McClernan","Joe Moffei","Tyler Sadler","Frank Salera","Adam Tampe","Michael Tole","Richard Valenia"],"254|9":["Christopher Bass","Austin Brown","Shane Mills","Colton Nelson","Ashley Olsen","Jonathan Shay","Brandon Sterle","Franklin Trout","Paeton Wheeler"],"140|9":["Nicholas Capraro","Jay Gilliard","James Keogan","George Renaud","Scott Smith"],"252|9":["Ryan Bainer","Abram Gardipee","Matthew Long","Eric Pettit","Michael Seifert","Braelen Stevens","Shawn Wilkins"],"238|9":["Camilla Backman","Mark Campbell","Caleb Evans","John Johnson","Anthony Rodriguez","Gage Simpson"],"138|9":["Lionell Aslarona","Francy Bautista","Jason Eccles","Grant Ganley","Joey Hernandez","Michael Kingsbury","Ricardo Ortiz"],"144|9":["Johncarlos Acosta","Ricardo Baptista","Tim James","Evan McNamara","Corey Platt","Emilio Taillefer","Michael Torsiello"],"160|9":["Drake Chain","Roland Chick","Leo Germanelo","Robert Lechuga","Raymond Moore","Hunter Portillo"],"111|6":["Brett Barron","Dave Cook","Paul Everett","Manny Francia","Chris Hudson","Brock Jolliff","Richard Kirman","Alfred Lopez-Alaiga","Michael Paxson","Adam Philpott","Nick Shows","Aaron Tholey"],"80|6":["Russell Carpenter","Stuart Hughes","Heston Kearley","Andy Lovatt-Smith","Marc Morgan","Bartosz Onysek","Johan Strampraat"],"65|6":["Patrick Arnold","Brandon Barber","Richard Blount","Michael Donlin","Chad Figuerado","Robert Lim","Dave Sabol","Richard Uran"],"112|6":["Charles Dejesus","Glen Fibel","Nicholas Messier","Jeffery Mooney","David Painter","George Renaud","Anthony Vitale","John Williams"],"121|6":["Scotty Allen","Jason Bonner","Richard Bryant","Charles Dean","Logan Heath","Adam Hitchcock","Keith Roll","Wesley Smith","Jake Topping"],"81|6":["Carlos Alves Filho","Jaime Barbosa Neto","Jose Cardoso Filho","Vinicius De Brito","Thiago Languinho","Eric Lima","Rafael Magalhaes","Norberto Medeiros"],"66|6":["Capella Advincula","Nick Banta","Quincy Boayes","Mapp Chhim","Arimar Eslava","Rocky Knuth","Douglas Lewis","Jeffrey Munoz","Michael Panlilio","Ryan Podesta","Louis Race","Christopher Rangel","Hans Ryan","Aris 'Chabs' Talingdan","Timothy Trentacoste"],"113|6":["Oscar Canchica","Delvis Hernandez","Gustavo Leguizamo Peña","Gina Lopez","Willie Ramirez"],"122|6":["Matthew Geldersma","Robyn Irish","Ricky Macomber","Kristin Morrissey","Keith Nelson","Ben Rhodea","Jonathan Shay","Richard Steinebach","Brandon Sterle","Franklin Trout","William Wright"],"82|6":["Paul Binion","Luis Carrillo","Ryan Chartin","Leo Donoghue","Chris Grover","Rawlin Johnson","Matt McGonagle","Eric Pettit"],"63|6":["Brent Buchanan","Ryan Giudice","Brian Jones","Eric Owhadi","Jay Rogers","Nick Rusch","Joseph Williams"],"64|6":["Shawn Clark","Michael Earley","Allen Harris-Santana","Marcus King","Jose Lopez","Simon Ringham","Gordon Schorer"],"83|6":["Joshua Delgado","Michael Gonzales","Roberto Guzman Hau","John Paul Johnson","John Kinsey","Aaron Knoll","Corey Lockhart","Jesse Martin","George Martinez","Chloe Rountree","Omar Ruiz"],"523|21":["Austin Arguelles","Erik Contreras","Daniel Galeana","George Joslin","Grayson Manning","Matt McGonagle","Christopher Ramirez"],"527|21":["Adam Benarrosh","Jamal Forrest","Scott Johnston","Charles Lam","Adam Morgenstern","Orlando Silva"],"531|21":["Joshua Bergert","David Herrera","Jesse Marrero","Ismael Monte De Oca","Juan Pardilla","Jeremy Roark"],"532|21":["Paul Bucheli Marun","Bianca Fiz","Delvis Hernandez","Cristian Jimenez","Jorge Madrid","Daniela Pulido Moyano"],"528|21":["Lared Fernandez","Eric Hernandez","Alexander Mauri","Larry Morales","Michael Orlosky","Julio Padilla","Juan Perez","Lawrence Reynolds"],"518|21":["Cory Gunning","Jeremy Hagood","Christos Kezemides","Adam Long","Michael Mazzola","Asher McLaughlin","Cesar Serra","Dane Shaw"],"517|21":["David Cuervo","Jackson Lillecrapp","Adrian Lopez","Adam Lopez","Trenton Martin","Tyler Middleton","Ryan Podesta","Niko Podesta"],"519|21":["Jose Cardoso Filho","Vinicius De Brito","Timothy Jones","Thiago Languinho","Eric Lima","Rafael Magalhaes"],"520|21":["Fabio Burine","Daniel Da Paz","Gabriel Ferreira","Rodrigo Lopes","Tiago Martins","Matheus Santos","Edson Silva","Marcos Valente"],"521|21":["Carlos Alves Filho","Jaime Barbosa Neto","Norberto Medeiros","Yan Oliveira","Marcelo Rozental","Diego Villatoro"],"522|21":["Kris Campbell","Mark Griffith","Marcus Herrin","David Hundley","Michael Kaufman","Luke Laney","Robert Skivington","Modesto Teresi"],"524|21":["Austen Embrich","Aden Guttmann","Damion Matteson","Alex Phelps","Sean Staelins","Stephen Storll"],"235|21":["Robert Bayard","Jose Bustamante","Tyler Cunningham","Thomas Hundertpfund","Chris Love","Vernard Morgan","Jason Rodis","Antonio Sanchez"],"558|21":["Capella Advincula","Alec Ambrosic","Richard Axtell","Craig Bennett","Wesley Eitel","Logan Heath","Christopher Rangel"],"555|21":["Joshua Keyes","Tyler Lawhorn","Jacob Miller","Sergio Padilla","Louis Race","Levi Smith","Ashton Stockard","Zach Wilks"],"505|19":["Arvad Budijanto","Barkley Espiritosanto","Brayden Harris","Everett O'Connor","Andrew Schecter","Robert Shelton","Dallas Spencer"],"526|19":["Brice Ackerman","Michael Brown","Camren Knapper","Tanner Knapper","Ryan McDermott","Samuel Sandoval","Timothy Sergent","Alex Shields"],"566|19":["Joshua Cornett","Michael Crum","Justin Durrette","Ralph Keating","Jamaal Mills","Tom Packett","Joey Roe"],"552|19":["Jaelin Ayala","Barry Ayala","Jeramiah Cuevas","Mark Emerick","Orlando Jimenez","Victor Maldonado-Torres","Danny Marcum"],"543|19":["Ben Hatchel","Brenden Manning","Dylan Miller","John Monroe","Cairo Prisco","Ricardo Rodriguez","Daniel Truesdale","Ethan Turner"],"542|19":["Ian Ellis","Adam Ellis","Jeremy Felty","John Ostromecki","Antonio Prieto","Joshua Smith"],"544|19":["Andrew Duquette","Matthew Guglielmelli","Robert Jackson","Daniel Kimbril","Hunter Lynch","Scott Miller","Quinton Weidman"],"530|19":["Maxwell Carter","Handen Cherry","Marco Garza","Aidan Medley","Cole Neuman","Kyle Snider"],"545|19":["Michael Colabufo","Jesse Herron","Stephen Thomas","Daylon Threatt","Ely Wells","David Williamson"],"559|19":["Corey Moses","Billy Pearsall","Robby Podgorski","Adam Roe","Nicholas Rutsis","Gordon Schorer","Joshua Sowers","Guy Weiss"],"534|19":["Jorge De La Cruz","Tyrell Dobson","Douglas Grady","Richard Janis","Frank Renjifo","John Riego","Jonathan Verrill","Connor Wells"],"485|19":["Guadalupe Aleman","Adrian Barajas","Eduardo Conde","Fermin Hernandez","Jorge Martinez","John Pyron","Tariq Qazi","Terrance Williams"],"481|19":["Coleman Bartlam","Nicolas Bush","Landon Campos","Mya Farmer","Adam Oleary","Brody Sawyer","Lucas Young"],"483|19":["Brandon Cassario","Chris Catanzaro","Mauricio De Souza","John Murphy","Sean Rush","Javier Santos"],"506|19":["Charles A Culpepper","Zachary Bostic","Isaiah Byrd","Owen Hood","Jackson King","Eugene Lemonds","James Wascom"],"535|19":["Phoebe Blain","Canyon Blake","Harrison Gray","Isaiah Harger","Isaac Harger","Hadley Korsman","Kellan McCormack","Matthew Palmer"],"567|19":["Casey Acuff","Jason Bonk","Austin Houghton","John Jenkins","Gage Jenkins","Brandan O'Berry","Cameron Rocco","William Swartz"],"272|19":["Kenan Cain","Jeremiah Duckworth","Randall Dutra","Silvio Guerra","Austin Hagstrom","Ben Hill","Tyler Howard","Cody Walls"],"489|19":["Justin Carter","Daulton Jackson","Eddie Le","Adrian Lopez","Jesse McWhorter","William Turner"],"504|19":["Jason Guy","Dalton Hodo","Justin Jones","Michael Meaney","Ronny Strozier"],"496|19":["Ivanovich Garcia","Benivan Garcia","Oliver Perez","Cristopher Rodriguez","Nicolas Safe Olivo"],"556|19":["Jay Feliciano","Joshua Fetterhoff","Lance George","Allen Heishman","Haudiel Martin","Jackson Warner"],"547|19":["Raymond Galan","Daniel Hernandez","Dimerson Nunez","Carlos Pinela","Jose Ramirez","Justin Stark","Angel Vega"],"503|19":["Paulino Earvin","Mario Garcia","Justin Giovinazzo","Linny Ha","Marqual Ramos","Gaetano Randazzo","Sebastian Santos","Jeremiah Torres"],"551|19":["Christian Agard","Dominic Cantrell","Anthony Cruz","Masiyia McLaughlin","Karlton Riley","Vashaud Wright"],"536|19":["Brendan Cossar","Gavin Johnson","Marcus Kempen","Camden Roark","Monte Sandoval","Taylor Smith","Christopher Sons"],"549|19":["Oscar Canchica","Marti Cardona","Gabriel Galindo Fontanilla","Andres Mora","Carlos Palma","Jose Tijaro Llanos"],"533|19":["Joseph Carrero","Sam Friederichs","Allen Harris-Santana","Francisco Marquina","Jorge Moscosso","Eduardo Palencia","Ruben Rosa Nieves"],"525|19":["Eric Barfield","Michael Blattner","Jacinto Carrasco","Danny Dryburgh","Ricardo Lagares Jr","Robert Pribyl","Dimitrios Skevakis","Michael Wert"],"501|19":["Ezra Brown","Jose Figueroa-Vazquez","Anthony Monfreda","Dominic Moya","Alexander Nafpliotis","Samuel Pierzynski","Blayke Vermaas"],"557|19":["Whil Arntzen","Chrispher Cesar","Benedicto Encabo","Joseph Matundan","Athanasios BingBong Nafpliotis","Mark Olpindo","Daniel Quiapo","Datu Tuliao"],"488|19":["Gino Boucher","Jean-Francois Fortin","Simon Lapointe","Jason Lebel","Jason Quirion","Brian Thibodeau"],"502|19":["Christopher Giardini","Mike Kurtz","James McNell","Andrew Mehmel","Lucas Mehmel","Nickolas Smith"],"560|19":["Edwin Carboc","William Covellone","Kris Hsia","Blake Kelly","Ryan Matthews","Ethan Matthews","Hector Soto"],"565|19":["Reagan Franklin","Thorsten Grossberger","Gary Loy","Bradley McCourry","Justin Russell"],"539|19":["Afdhal Azmeer","Michael D'Addario","Michael Esposito","Rui Graca","Andy Lovatt-Smith","Ryan Payne","Michael L Tinelli","Luis Velandia"],"497|19":["Ryan Allen","Saabir Berrian","Ezekiel Birochak","Drake Cook","Tanner Ivey","Ricky Andrew Kilby","Collin McNamara","Keith Vaughn"],"43|19":["Eric Brekke","Talan DeMeyer","Kent Ketter","Brent Osterhage","Tessa Osterhage","Dylan Reule"],"492|19":["Gustavo Alves","Rafael Alves Da Silva","Thiago Lima","Adriano Marconatto","Gael Silva","Gustavo Silva"],"550|19":["Bryan Adams","Jack Adkins","Joshua Devericks","Erik Gonzalez","Luke Harbach","Kage Kelley","Stephen McRoberts","Dylan Watson"],"553|19":["Bailey Bridges","Stephen Harris","Noble Joiner","Charles Logan","Mason Logan","Dustin Scott","Jeremy Street","James Williams"],"493|19":["Kleber Da Silva","Cassio De Sousa","Danilo De Souza","Fabricio Jukemura","Caio Mereu","Oswaldo Rossato"],"563|19":["Leandro Avila","Jordan Caprice","Brent Hill","Chris Ive","Michael Puma","Brett Robinson","Zachary Strachan"],"509|19":["Aaron Carty","Christopher Coleman","Anthony Conchado","Matthew Corvino","Ryan Stahnke","Chase Westermann","James Wyatt"],"538|19":["John Alford","Brennan Battaglia","Samuel Berry","John Bridgeman","Cameron McClenton","Timothy Miller","Allen Murray","Isaiah Sanchez"],"500|19":["Jeffery Bates","Cody Crist","James Cruz","Erwin Gurion","David Schultz","Robin Schultz"],"508|19":["Parker Fox","Iver Marjerison","William McKenna","Patrick McKenna","Brandon Mojica","Daniel Mojica"],"564|19":["Pierre Blackman","Dylan Fiene","Tony Hendricks","Cheyenne Maynard","Nathaniel Medeiros","Christian Noon","Ricky Ramirez","Cameron Woodard Dickinson"],"498|19":["Juan Cantu","Auston Ferrer","Stephen Malugani","Brandon Phan","Dylon Silva","Paul Silva","Abram Silva","Robert Wilkerson"],"548|19":["Issac Alarcon","Jesse Bernal","Dennis Chandan","Ryan Chartin","David Sim","Teofilo Sim","Leland Smith"],"487|19":["Lucas Bice","Josh Jones","Dave McDaniels","Antoine Mungo","Casey Roberts","Brian Roth"],"546|19":["Brandon Day","Joseph Ducote","Aidan Duran","Jorge Garcia","Alex Navarro","James Sutton","Dane Webb"],"507|19":["Jacob Emery","Sonny Frank","Kevan Howard","Michael Manygoats","Jose Ortiz","William Pagan","Chris Papamichail"],"491|19":["Yanik Blanchard","Michael Chainey","Charles Gagnon","Fred Gagnon","Alexandre Janelle-Goode","Willie Lafond"],"540|19":["Matthew Bucaro","Raymond Downey","Tj Hutchinson","Kenneth McLeod","Sebastian Montanez","Jacob Mueller-Tew","Xavier Toro","Christian Torres"],"490|19":["Aiden Bull","Austin Bull","Teagan Morrissey","Adam Snider","Kane Snider","Jakob Snider"],"541|19":["Alberto Baez","Brandon Bahadur","James Clifford","Akeem Garcia-Watson","Brandon Nieves","Jackson Sibbitt"],"562|19":["John Bethea","Aarron Derossett","Michael Durham","Scott Hall","Emmanuel Heggins","Kevin Khanthavongsay","Caleb Leger"],"482|19":["Manuel De La Rosa","Michael Gonzales","Gage Kilcollins","Mack Ream","Dakota Tonnessen-Visaggio","Christopher Vicente"],"529|19":["Timothy English","Jimmie Hazzard","Edwin Kruer","Steven Manzoni Manzoni","Emmanuel Rodriguez","Dennis Scardino","William Sides"],"554|19":["Kris Chavannes","Kristian Chavannes","Matthew Concha","Osniel Dearmas","Gabriel Escalona","Jose Pico","Joe Rivers"],"495|19":["Marlon Aguilar","Drake Chain","Brian DuBois","Leo Germanelo","Raymond Moore","Hunter Portillo"],"537|19":["Justin Avila","Grant Brewer","Chris Bucher","Matthew DePaola","Justin Lamb","Zach Silman","James Whiting"],"484|19":["Travis Casey","Justin Cotto","Joseph Diaz","Andrew Eby","David Glenn","Joshua Glenn","Christian Palmer"],"486|19":["Justin Bernik","Chris Kudler","Timothy Lockwood","Dave Sabol"],"469|18":["Gabriel Belliveau","Zachary Bourque","Louis Alexandre LeBlanc","Andrew Muzzerall","Marc Muzzerall","Koby Muzzerall","Mike Robichaud"],"480|18":["Ethan Axsom","Travis Cadmus","Paublo Iglesias","Jeremiah Sink","Keanu Sink","Kyle Slaven","Barry Starling","Roger Whobrey"],"457|18":["Lauren Weeks"],"471|18":["Anjay Boyd","Trystan Dyer","Luis Hernandez","Johnny Kerekes","Kevin Mont","Alex Moran"],"462|18":["Dominic Alonso","Bryce Casas","Lorenzo Casas","Angelo Iparraguirre","Alexander Morales","Erick Pena","Edgar Rodriguez","Angel Villarreal"],"460|18":["David Hunt","Dustin Jones","Brandon Kelley","Jacob Kosik","Colin Kovalchek","Brandon Nuding","Cody Spriggs","Alexander Suter"],"459|18":["William Bye","Kaelen Jewell","Levi Stagge","Cody Thompson","Kenneth Thompson","Jordan Weber"],"464|18":["Derrick Bushnell","Cole Corbo","Dawson E Johnson","Andrew Hernandez","Deebo Pearson","Tres Saranthus","Bryce Tuton","Jackson Wolf"],"467|18":["Stephen Bowman","Connor Kavanagh","Phil Mason","Karl Norris","Graham Smith Smith"],"38|18":["Carlos Aguirre","Mauricio Barca","Oswaldo Ceballos","Gonzalo Correa","Joaquin Orozco","Andres Temoli","Franco Vega Ferlin"],"474|18":["Chandler Biondi","Andrew Blood","Timothy Cullinen","Andrew Franz","James Hyder","Dan Mancinelli","Jeremy Wiser"],"463|18":["Nicholas Bruns","Chris Grover","Chad Lasala","Corey Lasala","Ethan Powell","John Wagner","Joshua Wiest"],"472|18":["Malakai Fleming","Maison Fleming","Nathan Gould","Jai Lobikis","Connor Maher","Tristan Perez","Dylan White"],"476|18":["Kevin Alayon","Julious Avila","Victor Bonilla","Jordan Bunnell","Cole Carroll","Alex Diaz","Kane Dunagan","Zane Neiman"],"468|18":["Kevin Carley","Samuel Cox","Matthew Funez","Paul Giunta","Don Hylton","Mike Marino","David Rosa","Natesh Samaroo"],"454|18":["Kyle Ciraldo","Antonio Cruz Hernandez","Cody Herron","Shawn McIntyre","Jesus Menendez Ramirez","Omar Ortiz Martinez","Karter Wittwer"],"265|18":["Nicholas Caves","Timothy Foster","Bryan Jenks","Evan Jenks","Ricky Macomber","Dj Scheller","Amanda Scheller"],"478|18":["Brandon Danner","Stephen Helsel","Jason Lockey","Joshua Salinger","Dustin Shadler","Kowen Spigelmeyer","Kevin Spigelmeyer","Michael Welgo"],"466|18":["Jonathan Barker","Brett Fangue","Joshua Garcia","Parker Gerlach","Justin Lemons","James Male","Ethan Quayle"],"477|18":["Evan Claypool","Skylor Clover","Terence Eckrich","Craig Forbes","Stefan Jaskot","Kyle Miller"],"479|18":["Heriberto Flores","Michael Garcia","Bryan Nava","Christian Proulx","Diego Rodriguez","Rickie Simmons","Daniel Soler","Freddy Torres"],"461|18":["Ray Beniquez","R Kent","Waldo Martinez","Chris Mezzatesta","Angel Padilla","Allan Pinedo","J. Michael Robey"],"465|18":["Titus Amport","Nathan Blanchard","Jarred Bowdoin","Jason Directo","Dylan George","Jonathan Mejia-Smith","Jaquan Rouse"],"475|18":["Justin Cano","Vincent Disalvo","Zachary Sardinia","Samuel Shaw","Allison Vick"],"458|18":["Wyatt Armstrong","Conrad Herwig","Chance Peifer","Jack Rubin","Max Telakowiec"],"455|18":["Alex Chung","Derrick Liu","Daniel Michaels","Ben Pham","Porter Steere","Tomoki Weddington","Kenji Ignacio Yamada"],"456|18":["Ben Andrews","Anthony Brabants","Jorge Ceballos","John Jackson","Chris Lindsey","Travis Rivera","Frank Salera","Micah Wilder"],"473|18":["Andrew Flores","Mao Manosalvas","Marco Teran","Fausto Valencia"],"511|20":["Veronica Cancel","Zuleika Carrasquillo","Jomary Carrion","Lurayma Diaz","Jamie Dones","Jacqueline Droz","Michelle Nieves"],"132|20":["Haleigh Ashtin","Amanda Elgin","Andrea Layne","Jessica Navarrete Ochoa","Lidia Verdugo Estrada"],"510|20":["Allison Hrovatin","Stephanie Kuecker","Shamara Miller","Alexandra Ponce","Irene Sanchez","Kim Szymkowski"],"516|20":["Alyssa Camarata","Taylor Crowe","Lillian Meyer","Vanessa Presha","Angjelique Robison","Isabelle Trudel"],"514|20":["Alyssa Boling","Anna Burge","Tiffany Cox","Morgan Howard","Autumn McAllister","Marissa McKinley","Sage Nolen","Brandy Turner"],"512|20":["Kamryn Campbell","Aricka Cooper","Dreama Jones","Grace Prendeville","Mariah Sims","Sophia Williams"],"515|20":["Phoebe Blain","Alexus Fussell","Sydney Helton","Misty Mackinzie","Jessica Maidlow","Laila Maynard","Avery Snowden","Chelsey Summers"],"513|20":["Kalley Bass","Katie Bopp-Bull","Robyn Irish","Kiersten Jones","Kristin Morrissey","Isabelle Shay","Hannah Snider"],"681|23":["Rod Griffin","Odeh Issis","Chris Powers","Curtis Wood"],"682|23":["Justin Dennis","Darren Etengoff","Clayton Etengoff","Ryan Giudice","Alexander Green","Preston Hulsey","Shawn Huskins","Justin Jones","Chloe Rountree","Cody Smith","Joshua Stanley","Kristen Stanley"],"6|23":["Brett Barron","Christian Collins","Dave Cook","Jose Diaz","Manny Francia","Chris Hudson","Brock Jolliff","Richard Kirman","Andre Lopes","Alfred Lopez-Alaiga","Gant MacLellan","Julian Maliszewski","Michael Paxson","Adam Philpott","Chris Phoenix","Stephen Reidy","Mike Ricciardi","Spesh Robinson","P Nico Salgado","Aaron Tholey"],"683|23":["Michael Bianco","Matthew Claus","Arvin Cortez","Francis Cullen","Daniel Duong","Jesse Frederick","Tj Heinmiller","Ryan Lehan","Kayla Lehan","John Lewers","John Ransone","Mikey Tapscott"],"264|23":["Taran Durkin","Max Foley","Alex Garcia","Matthew Gementera","Ben Hudson","Oz Ives","Henry Johnson","Zak Norman","Daniel Renier","Alan Smith","Sam Smith","Jim Williams"],"686|23":["Bryan Chow","Brandon Hayakawa","Krystiana Jacobsen","Robert Janisch","Ryan Martin","Josh Messler","Rory Namimatsu","Oscar Rios","Andres Rivas","Jacob Stewart","Anthony Williams"],"685|23":["Kennan Charles","William Cheatwood","James Cobb","Kevin Erwin","Ryver Lacy","Brad Larkin","George Larkin Iii","Jose Molina","Caleb Owens","Jake Raffield","John Schauf","Cliff Shivers","Kyle Soares","Jonathan Valdivia"],"687|23":["Radames Bolt","Tyler Cunningham","Harry De Jesus","Naysha De Jesus","Joshua Eby","Derek Kolakowski","Jose Lopez","Michael Moquin","Michael Payne","Josue Rios","Jeremy Roark","Jeffery Rosenberg","Cody Rosenberg","Torry Savage","Shakina Wood"],"684|23":["Logan Anderson","J.D. Ophoven","Jake Turner"],"457|23":["Ralph Keating","Donald Walker","Robert Weeks","Landon Weeks","Lauren Weeks","Ross Williamson"],"153|23":["Arcadio Abreu","Jose Dina","Melvin Gonzalez","Kevin Herrera","Leandro Lozada","Sergio Moya","Pedro Ojeda","Jonathan Vidal Peńa Aracena","Erick Pimentel","Jose Torres","Franklin Valdez","Edilberto Vasquez"],"559|23":["Bryan Adams","Dylan Bebee","Mike Bogolub","Thomas Colon","Parker Fox","Nelo Freijomel","Richard Johnson","Chris Lathpakdy","Zack Lucas","Chris Papamichail","Robby Podgorski","Paul Pratt","Lawrence Reynolds","Adam Roe","Gordon Schorer","James Sutton","Kevin Veres","Guy Weiss","Kyle Williams"],"61|23":["Oscar Acevedo","Kevin Carley","Caleb Carlson","Samuel Cox","Elijah Cruz","Christopher Dentale","Edwin Flores","Matthew Funez","Paul Giunta","Quinn Grimes","Jamel Hart","Anthony Hirschfield","Don Hylton","Mike Marino","Zachary Mason","Michael Reed","David Rosa","Natesh Samaroo","Shawn Vangorder"],"187|23":["Armand Aluquin","Quincy Boayes","Xander Eslava","Darius Eslava","Arimar Eslava","Rocky Knuth","Aiden McGrade","Jeffrey Munoz","Joey Nushart","Caleb Panlilio","Franklin Paredes","Ryan Podesta","Niko Podesta","Louis Race","Jacob Racho","Christopher Rangel","Hans Ryan","C.J. Schamber","Nick Shows","Ramon Tejera"],"479|23":["Ryan Bainer","Keith Dunnam","Amanda Elgin","Jacob Emery","Michael Garcia","Justin Giovinazzo","Scott Johnstone","Brandon King","Mark Kruzell","Calvin Nass","Bryan Nava","Zachary Suits","Joe Valerio"],"268|22":["Nicholas DeFinis","Paul Heads","Justin Lenker","Joe Munoz","Ryan Nardontonia","Jonny Shiver","M Snyder","Dylan Wagner"],"28|22":["William Messer"],"680|22":["Ty Callao-Zeman","Mapp Chhim","James Golder","Evan Greco","Will Hansen","Steve Johnson","Gabriel Liden","William McClane","Andrew Mondoy","Phillip Morina","Evan Neale","Tim Taylor","Todd Wichelmann","Chris Wilson","Blythe Wurster"],"266|22":["Dominick Brown","Christos Dakovanos","Colby Gilbert","John Harris","David Iniguez","Kraig Martin","Christopher Oliver","Royce Phillips","Mahanaim Robles","William Rose","Zac Shepherd","Scott Surles","Jason Williams"],"278|22":["Tyler Carter","Justin Clark","Michael Doherty","Jason Fajardo","John Fram","Collin Laster","Steven Leadore","Christopher Mewborn","William Raber","Aaron Rios","Morgan Walker"],"187|22":["Armand Aluquin","Quincy Boayes","Jonathan Delacruz","Eric Higman","Brian Jones","Joey Nushart","Todd Overcash","Stephen Palisoc","Bill Peck","Ferdinand Piano","Louis Race","Charlie Racho","Jacob Racho","Hans Ryan","Mark Tingzon"],"691|22":["Dustan Aadland","James Booth","Diego Dominguez","Dan Estrada","Abram Gardipee","Donovan Kaapana","Derek Kaapana","Adam Libby","Matthew Long","Toby Petersen","Michael Seifert","Jacob Thomas","Faylisa Valle"],"689|22":["Xavier Berube","Kevin Dagenais","Samuel Ferland","Justin Gravel-Vallée","Joey Larochelle Miron","John-William Pelletier-Hainey","Danick Schmitt"],"690|22":["Christopher Anglin","Lesley Cantrell","Sebastian Islas-Ottone","Joel Kronk","Stephen McClanahan","Paul Renfroe","Michael Schaefer","Ira Smith","Ethan Vines","Dylan Wiggins"],"688|22":["Jonathan Aslakson","Aj Aybar","Cary Bredfield","Jimmie Burden","Rocky Knuth","Achai Kortt","Robert Kortt","Brian Meggison","Chad Sable","Jeremiah Shrabel","Kenneth Smith","Logan Williams","Joe Winters"],"273|22":["Leo Donoghue","Todd Fonze","Dan Freeman","Dirk Gadberry","Dylan Gadberry","Daniel McDiarmid","Lance Nguyen","Jose Padilla","Fidel Rangel","Peter Salindong","Brian Sauer"],"111|15":["Brett Barron","Dave Cook","Manny Francia","Chris Hudson","Brock Jolliff","Julian Maliszewski","Adam Philpott","Spesh Robinson"],"268|15":["Paul Heads","Justin Lenker","Joe Munoz","Ryan Nardontonia","M Snyder","Dylan Wagner"],"28|15":["William Messer"],"269|15":["Jayce Aguilar","James Golder","William McClane","Phillip Morina","Tim Taylor","Todd Wichelmann"],"271|15":["Brent Buchanan","Riley Dodson","Josue Molina","Max Pena","Steven Puent","Dane Raggio","Gage Simpson","Nathan Tillmanns"],"274|15":["Aydin Blonski","Brett Burgi","Jennifer Burgi","Joshua MacLee","Dan Saunders","Austin Saunders","Jayden Saunders","David Towsley"],"266|15":["Colby Gilbert","David Iniguez","Kraig Martin","Royce Phillips","William Rose","Zac Shepherd","Scott Surles"],"278|15":["Tyler Carter","Justin Clark","Michael Doherty","Jason Fajardo","John Fram","Steven Leadore","Christopher Mewborn","William Raber"],"272|15":["Jeremiah Duckworth","Randall Dutra","Silvio Guerra","Austin Hagstrom","Ben Hill"],"264|15":["Taran Durkin","Max Foley","Ben Hudson","Oz Ives","Henry Johnson","Zak Norman","Daniel Renier","Alan Smith"],"187|15":["Armand Aluquin","Quincy Boayes","Darius Eslava","Xander Eslava","Joey Nushart","Jacob Racho","Hans Ryan","Nick Shows"],"265|15":["Jaxxon Caves","Timothy Foster","Leo Foster","Bryan Jenks","Ricky Macomber","Dj Scheller","Amanda Scheller"],"275|15":["Joshua Devericks","Jacob Giles","Luke Harbach","Kage Kelley","Johnny McElroy","Steve McRoberts","Jeremy Street","Dylan Watson"],"267|15":["Michael Brown","Justin Gravel-Vallée","Tyler Lyden","Raymundo Murguia","Carlos Murguia-Pulido","Blakely Sigmon","Lane Torbush","John Williams"],"273|15":["Leo Donoghue","Todd Fonze","Dirk Gadberry","Dylan Gadberry","Daniel McDiarmid","Lance Nguyen","Peter Salindong","Brian Sauer"],"276|15":["Ben Andrews","Nicholas Hagberg","Chris Hansmeyer","John Jackson","Dustin Marshall","Travis Rivera","Frank Salera","Joe Winters"],"284|12":["Lucas Alindajao","Christopher Beasley","Steven Boger","Jake Crawford","Nicholas Dodge","Michael Durham","Michael Moquin","Brendan Ressler","Thomas Routzahn","Randall Sheppard","Logan Thomas","Joe Winters"],"163|12":["Capella Advincula","Wilkes Barrett","Colin Bousman","Wesley Eitel","Stephen Gaskin","John Grable","Robert Jordan","Brandon Kehoe","Chris Lindsey","Andrew Mehmel","Benny Rivera","Travis Rivera","Michael Rodriguez","Michael Turner","James Vilora"],"282|12":["Richard Axtell","Daniel Connors","Jose Dina","Michael Drews","James Finney","Tony Garcia","Ricky Hlavaty","George Joslin","John Kinsey","Dominic Pinto","Christopher Ramirez","Mike Ricciardi","Josh West","Colton Wise","Adam Woodburn"],"283|12":["Sam Furda","Scott Hall","Bradley Hamstengel","John Paul Johnson","Derek Dk Llewellyn","Joshua Midwin","Jacob Miller","Austin Paschall","Logan Peralta","James Phonxaya","Ryan Prendeville","Emmanuel Rodriguez","Scott Sakowski","Kaitlyn Smith"],"164|12":["Xavier Bolle","Alex Chailleux","Erik Chateau","Meesemaecker Gwladys","Eric Owhadi","Stephane Pian","Jm Serge","Wendy Stewart","Gerard Tran Nghia"],"450|17":["Colin Baxter","Jace Capobianco","Tyler Gonzales","Mike McWhinnie","Brayden Montplaisir","Joshua Musso","Jameson Osterfield","Cameron Pelkey"],"451|17":["Brayden Baker","Isaiah Byrd","Charlie England","Owen Kob","Trystan Osborne","Cayden Renfroe","Preston Siniard"],"453|17":["Nicolas Da Silva","Caitlyn Eisenhauer","Dyfri Gobourn","Logan Harris","Adrian Lopez","Adam Lopez","Jackson Senft"],"452|17":["Wesley Chittendon","Blaise Despoy","Brady Gawaresky","Vincent Gawaresky","Cooper Harrison","Kaiden Jarman","Lucas Nickel","Connor Stinson"],"61|1":["Oscar Acevedo","Samuel Cox","Christopher Dentale","Anthony Hirschfield"],"131|1":["Carlos Perez"]};

type Game = {
  id: string;
  day: string;
  date: string;
  time: string;
  field: string;
  pit: number;
  division: string;
  round: string;
  home: string;
  away: string;
  score: string;
  status: string;
};
type GameRow = [number, string, string, string, number, number, number, number, number, number, string, number];
type RosterCount = { coaches: number; players: number };
type DayKey = "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type LiveDay = "now" | DayKey;
type ViewKey = "sat" | "now" | "brackets" | "standings" | "sheet" | "team" | "day";
type SheetElim = { side: "home" | "away"; name: string; how: string; by: string };
type SheetPoint = { n: number; winner: "home" | "away" | ""; at: string; notes: string; elims: SheetElim[] };
type Sheet = { points: SheetPoint[]; halfAfter: number; final: boolean };

function expand(g: GameRow): Game {
  return {
    id: String(g[0]),
    day: g[1],
    date: g[2],
    time: g[3],
    field: F[g[4]],
    pit: g[5],
    division: D[g[6]],
    round: R[g[7]],
    home: T[g[8]],
    away: T[g[9]],
    score: g[10],
    status: S[g[11]],
  };
}

const ALL: Game[] = (GAMES as GameRow[]).map(expand);

const DAYS: DayKey[] = ["Wed", "Thu", "Fri", "Sat", "Sun"];
const DATES: Record<DayKey, string> = {
  Wed: "2026-11-11",
  Thu: "2026-11-12",
  Fri: "2026-11-13",
  Sat: "2026-11-14",
  Sun: "2026-11-15",
};
const FIELD_ORDER = [
  "NXL Pro",
  "Lone Wolf",
  "Infamous",
  "Defy",
  "NXL",
  "Hormesis",
  "G.I. Sportz",
  "Planet Eclipse",
  "DYE",
  "HK*Army",
  "Mounds",
  "Sup'Air 10v10",
  "Eclipse",
];
const SLOT_MS = 55 * 60 * 1000;
const SLOT_NAME =
  /(?:Ochos|Ochofinals|Quarters|Semifinals|Finals|1\/16|1\/32|Prelims|Consolation)\s*-\s*\d+|\bConsolation\s+[AB]\b|\bWinner\s+[AB]\b|\bBracket\s+[A-Z]\s*#/i;
const PRO_SLOT = /^Pro (Ochos|Quarters|Semifinals|Finals)$/i;
const ROUND_ORDER = ["1/32", "1/16", "Ochos", "Ochofinals", "Quarters", "Semifinals", "Finals", "Consolation"];
const HOW_OPTIONS = ["", "Laned", "Traded", "Run-through", "Snake crawl", "Bounce", "Unknown"];
const SHEET_KEY = "wc2026.scoresheet.v1";
const VIEW_OPTIONS = [
  { value: "sat", label: "Saturday" },
  { value: "now", label: "On the field" },
  { value: "brackets", label: "Brackets" },
  { value: "standings", label: "Standings" },
  { value: "sheet", label: "Scoresheet" },
  { value: "team", label: "By team" },
  { value: "day", label: "By day" },
];

function etNow(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
}

function parseTimeParts(t: string): { h: number; m: number } {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { h: 0, m: 0 };
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, m: min };
}

function gameStart(g: Game): Date {
  const [year, month, dayN] = g.date.split("-").map(Number);
  const { h, m } = parseTimeParts(g.time);
  return new Date(year, month - 1, dayN, h, m, 0);
}

function minutes(t: string): number {
  const { h, m } = parseTimeParts(t);
  return h * 60 + m;
}

function fieldIdx(name: string): number {
  const i = FIELD_ORDER.indexOf(name);
  return i < 0 ? 99 : i;
}

function formatPulled(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${text} ET`;
}

function formatClock(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSlot(name: string): boolean {
  if (!name) return true;
  return PRO_SLOT.test(name) || SLOT_NAME.test(name);
}

function statusTone(s: string): "success" | "warning" | "danger" | undefined {
  if (s === "Final") return "success";
  if (s.startsWith("Final") || s.startsWith("Unofficial")) return "warning";
  if (s === "No score posted") return "danger";
  return undefined;
}

function scoreCell(g: Game) {
  const text = g.score || "—";
  const tone = statusTone(g.status);
  return tone ? { text, tone } : text;
}

function statusCell(g: Game) {
  const tone = statusTone(g.status);
  return tone ? { text: g.status, tone } : g.status;
}

function sortGames(a: Game, b: Game): number {
  return gameStart(a).getTime() - gameStart(b).getTime() || fieldIdx(a.field) - fieldIdx(b.field) || a.pit - b.pit;
}

function timesOn(day: DayKey): string[] {
  const date = DATES[day];
  const set = new Set<string>();
  for (const g of ALL) if (g.date === date) set.add(g.time);
  return [...set].sort((a, b) => minutes(a) - minutes(b));
}

function initialEventDay(): DayKey {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const k = names[etNow(new Date()).getDay()];
  return DAYS.includes(k as DayKey) ? (k as DayKey) : "Thu";
}

const EVENT_DAY = initialEventDay();

const DIVISIONS: string[] = (() => {
  const set = new Set(ALL.map((g) => g.division));
  const rest = [...set].sort();
  return rest.includes("Pro X-Ball") ? ["Pro X-Ball", ...rest.filter((d) => d !== "Pro X-Ball")] : rest;
})();

const TEAM_OPTIONS: { value: string; label: string }[] = (() => {
  const map = new Map<string, string>();
  for (const row of GAMES as GameRow[]) {
    const divIdx = row[6];
    for (const nameIdx of [row[8], row[9]]) {
      const name = T[nameIdx];
      if (!name || isSlot(name)) continue;
      const value = `${nameIdx}|${divIdx}`;
      if (!map.has(value)) map.set(value, `${name} · ${D[divIdx]}`);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
})();

function fieldPit(g: Game): string {
  return `${g.field} P${g.pit}`;
}

function parseScore(score: string): { h: number; a: number } | null {
  const m = score.match(/^\s*(-?\d+)\s*[-–]\s*(-?\d+)\s*$/);
  if (!m) return null;
  return { h: Number(m[1]), a: Number(m[2]) };
}

function postedWinner(g: Game): string {
  if (!(g.status === "Final" || g.status.startsWith("Final"))) return "";
  if (isSlot(g.home) || isSlot(g.away)) return "";
  const sc = parseScore(g.score);
  if (!sc) return "";
  if (sc.h > sc.a) return g.home;
  if (sc.a > sc.h) return g.away;
  return "";
}

function mark(g: Game, clock: Date, nextIds: Set<string>): string {
  const t = gameStart(g).getTime();
  const now = clock.getTime();
  if (t < now && now <= t + SLOT_MS) return "NOW";
  if (nextIds.has(g.id)) return "NEXT";
  return "";
}

function nextIdsAt(clock: Date, games: Game[]): Set<string> {
  const now = clock.getTime();
  const upcoming = games.filter((g) => gameStart(g).getTime() > now).sort(sortGames);
  const ids = new Set<string>();
  const firstByField = new Map<string, number>();
  for (const g of upcoming) {
    const t = gameStart(g).getTime();
    const prev = firstByField.get(g.field);
    if (prev === undefined) {
      firstByField.set(g.field, t);
      ids.add(g.id);
    } else if (t === prev) ids.add(g.id);
  }
  return ids;
}

type StandingRow = { team: string; gp: number; w: number; l: number; t: number; pf: number; pa: number; diff: number; pts: number };

function emptyRow(team: string): StandingRow {
  return { team, gp: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, diff: 0, pts: 0 };
}

function applyPrelim(table: Map<string, StandingRow>, g: Game) {
  if (isSlot(g.home) || isSlot(g.away)) return;
  const sc = parseScore(g.score);
  if (!sc) return;
  const home = table.get(g.home) ?? emptyRow(g.home);
  const away = table.get(g.away) ?? emptyRow(g.away);
  home.gp += 1;
  away.gp += 1;
  home.pf += sc.h;
  home.pa += sc.a;
  away.pf += sc.a;
  away.pa += sc.h;
  home.diff = home.pf - home.pa;
  away.diff = away.pf - away.pa;
  if (sc.h > sc.a) {
    home.w += 1;
    away.l += 1;
    home.pts += 2;
  } else if (sc.a > sc.h) {
    away.w += 1;
    home.l += 1;
    away.pts += 2;
  } else {
    home.t += 1;
    away.t += 1;
    home.pts += 1;
    away.pts += 1;
  }
  table.set(g.home, home);
  table.set(g.away, away);
}

function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.pf - a.pf || a.team.localeCompare(b.team));
}

function teamKeyOf(name: string, division: string): string {
  const ni = T.indexOf(name);
  const di = D.indexOf(division);
  if (ni < 0 || di < 0) return "";
  return `${ni}|${di}`;
}

function groupOf(name: string, division: string): string {
  const k = teamKeyOf(name, division);
  return (k && TEAM_GROUP[k]) || "—";
}

function rosterOf(name: string, division: string): string[] {
  const k = teamKeyOf(name, division);
  return (k && ROSTER_PLAYERS[k]) || [];
}

function loadSheets(): Record<string, Sheet> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(SHEET_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Sheet>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSheets(all: Record<string, Sheet>) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SHEET_KEY, JSON.stringify(all));
  } catch {
    /* private / blocked storage */
  }
}

function blankPoint(n: number): SheetPoint {
  return { n, winner: "", at: "", notes: "", elims: [] };
}

function ensureSheet(s: Sheet | undefined): Sheet {
  if (s && Array.isArray(s.points)) return s;
  return { points: [blankPoint(1)], halfAfter: 0, final: false };
}

function runningScore(sheet: Sheet): { h: number; a: number } {
  let h = 0;
  let a = 0;
  for (const p of sheet.points) {
    if (p.winner === "home") h += 1;
    if (p.winner === "away") a += 1;
  }
  return { h, a };
}

function roundRank(name: string): number {
  if (name.toLowerCase().startsWith("consolation")) return ROUND_ORDER.indexOf("Consolation");
  const i = ROUND_ORDER.indexOf(name);
  return i < 0 ? 50 : i;
}

export default function App() {
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const clock = etNow(tick);

  const [view, setView] = useState<ViewKey>(EVENT_DAY === "Sat" || EVENT_DAY === "Sun" ? "sat" : "now");
  const [liveDay, setLiveDay] = useState<LiveDay>("now");
  const [liveTime, setLiveTime] = useState("");
  const [teamKey, setTeamKey] = useState(TEAM_OPTIONS[0]?.value ?? "");
  const [byDay, setByDay] = useState<DayKey>(EVENT_DAY);
  const [byDiv, setByDiv] = useState(DIVISIONS.includes("Pro X-Ball") ? "Pro X-Ball" : DIVISIONS[0] ?? "");
  const [satField, setSatField] = useState("All fields");
  const [satDiv, setSatDiv] = useState("All divisions");
  const [satTeam, setSatTeam] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [usSide, setUsSide] = useState<"home" | "away">("home");
  const [sheets, setSheets] = useState<Record<string, Sheet>>({});
  const [sheetSaved, setSheetSaved] = useState("");

  useEffect(() => {
    setSheets(loadSheets());
  }, []);

  const liveTimes = useMemo(() => timesOn(liveDay === "now" ? EVENT_DAY : liveDay), [liveDay]);

  useEffect(() => {
    if (liveDay === "now") return;
    if (!liveTime || !liveTimes.includes(liveTime)) setLiveTime(liveTimes[0] ?? "");
  }, [liveDay, liveTimes, liveTime]);

  const preview = useMemo(() => {
    if (liveDay === "now") return clock;
    const [year, month, dayN] = DATES[liveDay].split("-").map(Number);
    const { h, m } = parseTimeParts(liveTime || liveTimes[0] || "7:00 AM");
    return new Date(year, month - 1, dayN, h, m, 0);
  }, [liveDay, liveTime, liveTimes, clock]);

  const onField = useMemo(() => {
    const end = preview.getTime();
    const start = end - SLOT_MS;
    return ALL.filter((g) => {
      const t = gameStart(g).getTime();
      return t > start && t <= end;
    }).sort(sortGames);
  }, [preview]);

  const upNext = useMemo(() => {
    const nowMs = preview.getTime();
    const byField = new Map<string, Game[]>();
    for (const g of ALL) {
      if (gameStart(g).getTime() <= nowMs) continue;
      const list = byField.get(g.field) ?? [];
      list.push(g);
      byField.set(g.field, list);
    }
    const fields = [...byField.keys()].sort((a, b) => fieldIdx(a) - fieldIdx(b));
    const out: Game[] = [];
    for (const f of fields) {
      const list = (byField.get(f) ?? []).sort(sortGames);
      const nextT = gameStart(list[0]).getTime();
      for (const g of list) if (gameStart(g).getTime() === nextT) out.push(g);
    }
    return out;
  }, [preview]);

  const teamGames = useMemo(() => {
    if (!teamKey) return [] as Game[];
    const [nameIdx, divIdx] = teamKey.split("|").map(Number);
    const name = T[nameIdx];
    const div = D[divIdx];
    return ALL.filter((g) => g.division === div && (g.home === name || g.away === name)).sort(sortGames);
  }, [teamKey]);

  const dayGames = useMemo(() => {
    const date = DATES[byDay];
    return ALL.filter((g) => g.date === date && g.division === byDiv).sort(sortGames);
  }, [byDay, byDiv]);

  const satGames = useMemo(() => ALL.filter((g) => g.date === DATES.Sat).sort(sortGames), []);
  const satFields = useMemo(() => {
    const set = new Set(satGames.map((g) => g.field));
    return ["All fields", ...[...set].sort((a, b) => fieldIdx(a) - fieldIdx(b))];
  }, [satGames]);
  const satDivs = useMemo(() => {
    const set = new Set(satGames.map((g) => g.division));
    return ["All divisions", ...[...set].sort()];
  }, [satGames]);
  const satTeamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of satGames) {
      for (const name of [g.home, g.away]) {
        if (!name || isSlot(name)) continue;
        const value = teamKeyOf(name, g.division);
        if (value && !map.has(value)) map.set(value, `${name} · ${g.division}`);
      }
    }
    return [{ value: "", label: "Pick a team" }, ...[...map.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))];
  }, [satGames]);

  const satFiltered = useMemo(() => {
    return satGames.filter((g) => {
      if (satField !== "All fields" && g.field !== satField) return false;
      if (satDiv !== "All divisions" && g.division !== satDiv) return false;
      return true;
    });
  }, [satGames, satField, satDiv]);

  const satNext = useMemo(() => nextIdsAt(clock, satGames), [clock, satGames]);

  const satTeamGames = useMemo(() => {
    if (!satTeam) return [] as Game[];
    const [nameIdx, divIdx] = satTeam.split("|").map(Number);
    const name = T[nameIdx];
    const div = D[divIdx];
    return satGames.filter((g) => g.division === div && (g.home === name || g.away === name));
  }, [satTeam, satGames]);

  const bracketDiv = byDiv;
  const bracketRounds = useMemo(() => {
    const games = ALL.filter((g) => g.division === bracketDiv && g.round && g.round !== "Prelims").sort(sortGames);
    const resolved = new Set<string>();
    for (const g of games) {
      if (!isSlot(g.home)) resolved.add(g.home);
      if (!isSlot(g.away)) resolved.add(g.away);
    }
    const byRound = new Map<string, Game[]>();
    for (const g of games) {
      const list = byRound.get(g.round) ?? [];
      list.push(g);
      byRound.set(g.round, list);
    }
    return [...byRound.entries()]
      .sort((a, b) => roundRank(a[0]) - roundRank(b[0]) || a[0].localeCompare(b[0]))
      .map(([round, list]) => ({
        round,
        games: list.map((g) => {
          const win = postedWinner(g);
          const later = games.filter((x) => roundRank(x.round) > roundRank(g.round));
          const onLater = win ? later.some((x) => x.home === win || x.away === win) : false;
          const projected = win && !onLater && later.length > 0 && !resolved.has(win) ? win : "";
          return { g, win, onLater, projected };
        }),
      }));
  }, [bracketDiv]);

  const standingGroups = useMemo(() => {
    const prelims = ALL.filter((g) => g.division === byDiv && g.round === "Prelims");
    const official = new Map<string, Map<string, StandingRow>>();
    const unofficial = new Map<string, Map<string, StandingRow>>();
    const ensure = (m: Map<string, Map<string, StandingRow>>, group: string, name: string) => {
      if (!m.has(group)) m.set(group, new Map());
      const t = m.get(group)!;
      if (name && !isSlot(name) && !t.has(name)) t.set(name, emptyRow(name));
    };
    for (const g of prelims) {
      const grp = groupOf(g.home, g.division) !== "—" ? groupOf(g.home, g.division) : groupOf(g.away, g.division);
      ensure(official, grp, g.home);
      ensure(official, grp, g.away);
      if (g.status === "Final" || g.status.startsWith("Final")) applyPrelim(official.get(grp)!, g);
      else if (g.status.startsWith("Unofficial")) {
        ensure(unofficial, grp, g.home);
        ensure(unofficial, grp, g.away);
        applyPrelim(unofficial.get(grp)!, g);
      }
    }
    const names = [...official.keys()].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));
    return names.map((group) => ({
      group,
      official: sortStandings([...(official.get(group)?.values() ?? [])]),
      unofficial: sortStandings([...(unofficial.get(group)?.values() ?? [])].filter((r) => r.gp > 0)),
    }));
  }, [byDiv]);

  const sheetGame = useMemo(() => ALL.find((g) => g.id === sheetId) ?? null, [sheetId]);
  const sheet = ensureSheet(sheetId ? sheets[sheetId] : undefined);
  const run = runningScore(sheet);
  const sheetOptions = useMemo(() => {
    const list = (view === "sat" ? satFiltered : ALL).slice().sort(sortGames);
    const src = list.length ? list : ALL;
    return src.map((g) => ({
      value: g.id,
      label: `${g.day} ${g.time} · ${fieldPit(g)} · ${g.home} vs ${g.away}`,
    }));
  }, [view, satFiltered]);

  const roster: RosterCount | undefined = teamKey ? (ROSTER_COUNTS as Record<string, RosterCount>)[teamKey] : undefined;
  const teamName = teamKey ? T[Number(teamKey.split("|")[0])] : "";
  const teamRows = teamGames.map((g) => {
    const opp = g.home === teamName ? g.away : g.home;
    const bits = [fieldPit(g)];
    if (g.round) bits.push(g.round);
    if (g.score) bits.push(g.score);
    bits.push(g.status);
    return {
      lead: `${g.day} ${g.time}`,
      title: `vs ${opp}`,
      detail: bits.join(" · "),
      meta: `game ${g.id}`,
    };
  });

  const finalN = ALL.filter((g) => g.status === "Final" || g.status.startsWith("Final")).length;
  const unofficialN = ALL.filter((g) => g.status.startsWith("Unofficial")).length;
  const satOn = satGames.filter((g) => mark(g, clock, satNext) === "NOW").length;

  const liveCaption =
    liveDay === "now"
      ? `Eastern clock ${formatClock(clock)}`
      : `Previewing ${liveDay} ${liveTime || liveTimes[0] || ""} ET`;

  function updateSheet(next: Sheet) {
    if (!sheetId) return;
    const all = { ...sheets, [sheetId]: next };
    setSheets(all);
    saveSheets(all);
    setSheetSaved(`Saved on this device at ${formatClock(clock)} ET`);
  }

  function exportTally(): string {
    if (!sheetGame) return "";
    const vs = usSide === "home" ? sheetGame.away : sheetGame.home;
    const rows: Record<string, unknown>[] = [];
    for (const p of sheet.points) {
      for (const e of p.elims) {
        if (!e.name) continue;
        const side: "us" | "them" = e.side === usSide ? "us" : "them";
        let at = Date.now();
        if (p.at) {
          const { h, m } = parseTimeParts(p.at.includes("M") ? p.at : `${p.at} AM`);
          if (h || m) {
            const start = gameStart(sheetGame);
            at = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0).getTime();
          }
        }
        const row: Record<string, unknown> = {
          pt: p.n,
          side,
          name: e.name,
          at,
          m: sheetGame.id,
          script: p.notes || "",
          layout: "nwc",
          vs,
        };
        if (e.how) row.how = e.how;
        if (e.by) row.by = e.by;
        rows.push(row);
      }
    }
    return JSON.stringify(
      {
        format: "gridlock.tally.outs",
        layout: "nwc",
        game_id: sheetGame.id,
        home: sheetGame.home,
        away: sheetGame.away,
        us: usSide,
        running: `${run.h}-${run.a}`,
        final: sheet.final,
        note: "Tally shape is {pt, side, name, at, m, script, layout, vs, how?, by?}. side is us/them from the We're toggle. Saved scoresheets stay on this device only.",
        tally: rows,
      },
      null,
      2,
    );
  }

  const satTeamName = satTeam ? T[Number(satTeam.split("|")[0])] : "";

  function standingTable(rows: StandingRow[]) {
    return (
      <Table
        columns={["Team", "GP", "W", "L", "T", "PF", "PA", "Diff", "Pts"]}
        rows={rows.map((r) => [
          r.team,
          String(r.gp),
          String(r.w),
          String(r.l),
          String(r.t),
          String(r.pf),
          String(r.pa),
          r.diff > 0 ? `+${r.diff}` : String(r.diff),
          String(r.pts),
        ])}
      />
    );
  }

  function gameRow(g: Game, extra?: string) {
    const tag = extra || mark(g, clock, satNext);
    const lead = tag ? `${tag} · ${g.time}` : g.time;
    return [lead, fieldPit(g), g.round || "", g.home, g.away, scoreCell(g), statusCell(g)];
  }

  return (
    <Page
      title="World Cup 2026 Live Schedule"
      width="wide"
      summary="Saturday field grid and team lookup, live on-the-field view, brackets that fill as PBLeagues resolves placeholders, standings computed from posted prelim scores, and a per-device scoresheet with Gridlock tally export."
      sources={["https://pbleagues.com/event/9322/schedule"]}
    >
      <Callout tone="info" lead={`Scores as of ${formatPulled(PULLED_AT)}.`}>
        The field clock uses your current time in Eastern and redraws every 60 seconds. Schedule, brackets, and standings come from the DATA block and update when this page is refreshed from PBLeagues. Scoresheets are stored only in this browser (local storage), not in the refresh. PBLeagues seeding rules may differ from the computed table.
      </Callout>
      <Metrics
        metrics={[
          { value: String(ALL.length), label: "Games posted" },
          { value: String(finalN), label: "Final" },
          { value: String(unofficialN), label: "Unofficial" },
          { value: String(satGames.length), label: "Saturday games" },
        ]}
      />
      <Segmented options={VIEW_OPTIONS} value={view} onChange={(v) => setView(v as ViewKey)} />

      {view === "sat" ? (
        <Section heading="Saturday Nov 14" id="saturday" caption={`Eastern clock ${formatClock(clock)} · ${satOn} on the field now · 55-minute slot`}>
          <Text>Where is my team, and where is every field. NOW / NEXT follow your Eastern clock. Pick a game in Scoresheet to keep a point-by-point sheet.</Text>
          {satTeamOptions.length > 1 ? (
            <Select label="Where is my team" options={satTeamOptions} value={satTeam} onChange={setSatTeam} />
          ) : null}
          {satTeamGames.length > 0 ? (
            <Table
              columns={["Time", "Field", "Round", "Home", "Away", "Score", "Status"]}
              rows={satTeamGames.map((g) => {
                const tag = mark(g, clock, satNext);
                return [tag ? `${tag} · ${g.time}` : g.time, fieldPit(g), g.round || "", g.home === satTeamName ? `${g.home} (you)` : g.home, g.away === satTeamName ? `${g.away} (you)` : g.away, scoreCell(g), statusCell(g)];
              })}
            />
          ) : satTeam ? (
            <Text>No Saturday games posted for that team.</Text>
          ) : null}
          <Select label="Field" options={satFields} value={satField} onChange={setSatField} />
          <Select label="Division" options={satDivs} value={satDiv} onChange={setSatDiv} />
          {satFiltered.length > 0 ? (
            <Table
              columns={["Time", "Field", "Round", "Home", "Away", "Score", "Status"]}
              rows={satFiltered.map((g) => gameRow(g))}
            />
          ) : (
            <Text>No Saturday games match those filters.</Text>
          )}
        </Section>
      ) : null}

      {view === "now" ? (
        <Section heading="On the field now" id="on-field" caption={liveCaption}>
          <Segmented
            options={[{ value: "now", label: "Now" }, ...DAYS.map((d) => ({ value: d, label: d }))]}
            value={liveDay}
            onChange={(v) => setLiveDay(v as LiveDay)}
          />
          {liveDay !== "now" && liveTimes.length > 0 ? (
            <Select label="Start time" options={liveTimes} value={liveTime || liveTimes[0]} onChange={setLiveTime} />
          ) : null}
          <Text>A game is on the field from its start through the next 55 minutes (about a one-hour slot). Up next is the following start on each field.</Text>
          {onField.length > 0 ? (
            <>
              <Text>On the field</Text>
              <Table
                columns={["Time", "Field", "Division", "Home", "Away", "Score", "Status"]}
                rows={onField.map((g) => [g.time, fieldPit(g), g.division, g.home, g.away, scoreCell(g), statusCell(g)])}
              />
            </>
          ) : (
            <Text>Nothing on the field at this clock time.</Text>
          )}
          {upNext.length > 0 ? (
            <>
              <Text>Up next</Text>
              <Table
                columns={["Time", "Field", "Division", "Home", "Away", "Score", "Status"]}
                rows={upNext.map((g) => [g.time, fieldPit(g), g.division, g.home, g.away, scoreCell(g), statusCell(g)])}
              />
            </>
          ) : null}
        </Section>
      ) : null}

      {view === "brackets" ? (
        <Section heading="Brackets" id="brackets" caption="Only tickets PBLeagues has posted. Placeholders stay pending until the source fills them. Projected means a final winner has not yet been written onto the next ticket.">
          {DIVISIONS.length > 0 ? (
            <Select label="Division" options={DIVISIONS} value={byDiv} onChange={setByDiv} />
          ) : null}
          {bracketRounds.length === 0 ? (
            <Text>No bracket games are posted yet in this division (prelims only, or the slate is not up).</Text>
          ) : (
            bracketRounds.map((block) => (
              <Section key={block.round} heading={block.round}>
                <Table
                  columns={["When", "Field", "Home", "Away", "Score", "Status", "Advance"]}
                  rows={block.games.map(({ g, win, onLater, projected }) => [
                    `${g.day} ${g.time}`,
                    fieldPit(g),
                    isSlot(g.home) ? `Pending · ${g.home}` : g.home,
                    isSlot(g.away) ? `Pending · ${g.away}` : g.away,
                    scoreCell(g),
                    statusCell(g),
                    win && onLater ? `${win} advanced` : projected ? `Projected · ${projected}` : win ? `${win} wins` : "—",
                  ])}
                />
              </Section>
            ))
          )}
        </Section>
      ) : null}

      {view === "standings" ? (
        <Section heading="Standings" id="standings" caption="Computed from posted prelim scores. Official = Final and Final (forfeit). Unofficial is listed separately and is not in the official table. PBLeagues seeding rules may differ.">
          {DIVISIONS.length > 0 ? (
            <Select label="Division" options={DIVISIONS} value={byDiv} onChange={setByDiv} />
          ) : null}
          <Text>Pts are 2 per win and 1 per tie, from the posted score, not a published NXL seed list.</Text>
          {standingGroups.length === 0 ? (
            <Text>No prelim games in this division.</Text>
          ) : (
            standingGroups.map((g) => (
              <Section key={g.group} heading={g.group === "—" ? "Prelims" : `Group ${g.group}`}>
                {g.official.some((r) => r.gp > 0) ? null : <Text>No official posted results yet. Teams in this group:</Text>}
                {standingTable(g.official)}
                {g.unofficial.length > 0 ? (
                  <>
                    <Text>Unofficial (not in the official table)</Text>
                    {standingTable(g.unofficial)}
                  </>
                ) : null}
              </Section>
            ))
          )}
        </Section>
      ) : null}

      {view === "sheet" ? (
        <Section heading="Scoresheet" id="scoresheet" caption="Point-by-point entry for one game. Saved only in this browser's local storage — it does not sync and is not part of the 15-minute schedule refresh.">
          <Select
            label="Game"
            options={[{ value: "", label: "Pick a game" }, ...sheetOptions]}
            value={sheetId}
            onChange={setSheetId}
          />
          {sheetGame ? (
            <>
              <Text>{`${sheetGame.day} ${sheetGame.time} · ${fieldPit(sheetGame)} · ${sheetGame.division} · ${sheetGame.round} · posted ${sheetGame.score || "no score"} ${sheetGame.status}`}</Text>
              <Text>{`${sheetGame.home} vs ${sheetGame.away}`}</Text>
              <Segmented
                options={[
                  { value: "home", label: `We're ${sheetGame.home}` },
                  { value: "away", label: `We're ${sheetGame.away}` },
                ]}
                value={usSide}
                onChange={(v) => setUsSide(v as "home" | "away")}
              />
              <Text>{`Running score ${run.h}–${run.a}${sheet.halfAfter ? ` · halftime after point ${sheet.halfAfter}` : ""}${sheet.final ? " · final" : ""}`}</Text>
              <Text>{`${sheetGame.home} players: ${rosterOf(sheetGame.home, sheetGame.division).join(", ") || "no roster names on this page"}`}</Text>
              <Text>{`${sheetGame.away} players: ${rosterOf(sheetGame.away, sheetGame.division).join(", ") || "no roster names on this page"}`}</Text>
              {sheet.points.map((p, idx) => (
                <Section key={p.n} heading={`Point ${p.n}`}>
                  <Segmented
                    options={[
                      { value: "", label: "No winner yet" },
                      { value: "home", label: sheetGame.home },
                      { value: "away", label: sheetGame.away },
                    ]}
                    value={p.winner}
                    onChange={(v) => {
                      const points = sheet.points.map((x, i) => (i === idx ? { ...x, winner: v as SheetPoint["winner"] } : x));
                      updateSheet({ ...sheet, points });
                    }}
                  />
                  <Input
                    label="Time (ET)"
                    value={p.at}
                    placeholder="10:15 AM"
                    onChange={(v) => {
                      const points = sheet.points.map((x, i) => (i === idx ? { ...x, at: v } : x));
                      updateSheet({ ...sheet, points });
                    }}
                  />
                  <Input
                    label="Notes / break called"
                    value={p.notes}
                    placeholder="optional"
                    onChange={(v) => {
                      const points = sheet.points.map((x, i) => (i === idx ? { ...x, notes: v } : x));
                      updateSheet({ ...sheet, points });
                    }}
                  />
                  {p.elims.map((e, ei) => (
                    <Section key={`${p.n}-${ei}`} heading={`Elimination ${ei + 1}`}>
                      <Segmented
                        options={[
                          { value: "home", label: sheetGame.home },
                          { value: "away", label: sheetGame.away },
                        ]}
                        value={e.side}
                        onChange={(v) => {
                          const points = sheet.points.map((x, i) =>
                            i === idx
                              ? { ...x, elims: x.elims.map((y, yi) => (yi === ei ? { ...y, side: v as "home" | "away" } : y)) }
                              : x,
                          );
                          updateSheet({ ...sheet, points });
                        }}
                      />
                      <Select
                        label="Player out (names only; no invented numbers)"
                        options={[
                          { value: "", label: "Select or type below" },
                          ...(e.side === "home" ? rosterOf(sheetGame.home, sheetGame.division) : rosterOf(sheetGame.away, sheetGame.division)).map((n) => ({
                            value: n,
                            label: n,
                          })),
                        ]}
                        value={e.name}
                        onChange={(v) => {
                          const points = sheet.points.map((x, i) =>
                            i === idx ? { ...x, elims: x.elims.map((y, yi) => (yi === ei ? { ...y, name: v } : y)) } : x,
                          );
                          updateSheet({ ...sheet, points });
                        }}
                      />
                      <Input
                        label="Player name if not in the list"
                        value={e.name}
                        onChange={(v) => {
                          const points = sheet.points.map((x, i) =>
                            i === idx ? { ...x, elims: x.elims.map((y, yi) => (yi === ei ? { ...y, name: v } : y)) } : x,
                          );
                          updateSheet({ ...sheet, points });
                        }}
                      />
                      <Select
                        label="How"
                        options={HOW_OPTIONS.map((h) => ({ value: h, label: h || "—" }))}
                        value={e.how}
                        onChange={(v) => {
                          const points = sheet.points.map((x, i) =>
                            i === idx ? { ...x, elims: x.elims.map((y, yi) => (yi === ei ? { ...y, how: v } : y)) } : x,
                          );
                          updateSheet({ ...sheet, points });
                        }}
                      />
                      <Input
                        label="By (optional)"
                        value={e.by}
                        onChange={(v) => {
                          const points = sheet.points.map((x, i) =>
                            i === idx ? { ...x, elims: x.elims.map((y, yi) => (yi === ei ? { ...y, by: v } : y)) } : x,
                          );
                          updateSheet({ ...sheet, points });
                        }}
                      />
                    </Section>
                  ))}
                  <Button
                    label="Add elimination"
                    onClick={() => {
                      const points = sheet.points.map((x, i) =>
                        i === idx ? { ...x, elims: [...x.elims, { side: "home" as const, name: "", how: "", by: "" }] } : x,
                      );
                      updateSheet({ ...sheet, points });
                    }}
                  />
                </Section>
              ))}
              <Button
                label="Add point"
                onClick={() => updateSheet({ ...sheet, points: [...sheet.points, blankPoint(sheet.points.length + 1)] })}
              />
              <Button
                label={sheet.halfAfter ? `Halftime after point ${sheet.halfAfter}` : "Mark halftime after last point"}
                onClick={() => updateSheet({ ...sheet, halfAfter: sheet.points.length })}
              />
              <Button label={sheet.final ? "Final marked" : "Mark final"} onClick={() => updateSheet({ ...sheet, final: true })} />
              {sheetSaved ? <Text>{sheetSaved}</Text> : null}
              <Section heading="Export Gridlock tally JSON">
                <Text>Copy this into a season copy or a Codex/Claude session. side is us/them from the We're toggle above. layout is nwc. This does not upload anywhere.</Text>
                <Input label="Tally JSON" value={exportTally()} onChange={() => undefined} />
              </Section>
              <Section heading="Printable scoresheet">
                <Text>{`NXL World Cup 2026 · ${sheetGame.division} · ${sheetGame.round}`}</Text>
                <Text>{`${sheetGame.day} ${sheetGame.time} ET · ${fieldPit(sheetGame)} · game ${sheetGame.id}`}</Text>
                <Text>{`Home: ${sheetGame.home}`}</Text>
                <Text>{rosterOf(sheetGame.home, sheetGame.division).join(" · ") || "players: ________________"}</Text>
                <Text>{`Away: ${sheetGame.away}`}</Text>
                <Text>{rosterOf(sheetGame.away, sheetGame.division).join(" · ") || "players: ________________"}</Text>
                <Table
                  columns={["Pt", "Winner", "Time", "Score", "Notes / elims"]}
                  rows={(sheet.points.length ? sheet.points : [blankPoint(1), blankPoint(2), blankPoint(3), blankPoint(4), blankPoint(5)]).map((p) => {
                    const upTo = { h: 0, a: 0 };
                    for (const x of sheet.points) {
                      if (x.n > p.n) break;
                      if (x.winner === "home") upTo.h += 1;
                      if (x.winner === "away") upTo.a += 1;
                    }
                    const elimText = p.elims.filter((e) => e.name).map((e) => `${e.name}${e.how ? ` (${e.how})` : ""}`).join("; ");
                    return [
                      String(p.n),
                      p.winner === "home" ? sheetGame.home : p.winner === "away" ? sheetGame.away : "",
                      p.at || "",
                      p.winner ? `${upTo.h}-${upTo.a}` : "",
                      [p.notes, elimText].filter(Boolean).join(" · "),
                    ];
                  })}
                />
                <Text>Halftime ________    Final ________    Official / unofficial ________</Text>
                <Button
                  label="Print"
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                />
              </Section>
            </>
          ) : (
            <Text>Pick a game to open a scoresheet. A blank printable grid is included once a game is selected.</Text>
          )}
        </Section>
      ) : null}

      {view === "team" ? (
        <Section heading="By team" id="by-team">
          {TEAM_OPTIONS.length > 0 ? (
            <Select label="Team" options={TEAM_OPTIONS} value={teamKey || TEAM_OPTIONS[0].value} onChange={setTeamKey} />
          ) : null}
          {roster ? <Text>{`${roster.coaches} coaches · ${roster.players} players`}</Text> : null}
          {teamRows.length > 0 ? <Rows rows={teamRows} /> : null}
        </Section>
      ) : null}

      {view === "day" ? (
        <Section heading="By day" id="by-day">
          <Segmented options={DAYS} value={byDay} onChange={setByDay} />
          {DIVISIONS.length > 0 ? (
            <Select label="Division" options={DIVISIONS} value={byDiv} onChange={setByDiv} />
          ) : null}
          {dayGames.length > 0 ? (
            <Table
              columns={["Time", "Field", "Round", "Home", "Away", "Score", "Status"]}
              rows={dayGames.map((g) => [g.time, fieldPit(g), g.round || "", g.home, g.away, scoreCell(g), statusCell(g)])}
            />
          ) : (
            <Text>No games posted for that day and division.</Text>
          )}
        </Section>
      ) : null}
    </Page>
  );
}

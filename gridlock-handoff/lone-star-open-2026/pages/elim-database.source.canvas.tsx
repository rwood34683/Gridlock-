import {
  Page,
  Section,
  Text,
  Table,
  Callout,
  Select,
  Input,
  useState,
  useMemo,
} from "grok/canvas";

type Player = {
  name: string;
  team: string;
  number: string;
  role: string;
  source: string;
};

type Elim = {
  event: string;
  division: string;
  match: string;
  point: string;
  timestamp: string;
  playerOut: string;
  jersey: string;
  elimType: string;
  area: string;
  notes: string;
  scoreAfter: string;
  breakBunker?: string;
  moves?: string;
};

const EV = "Lone Star Open 2026";
const DIV = "Pro";
const MATCH = "Tampa Bay Damage vs Red Legion (Pro Finals)";

function r(
  point: string,
  timestamp: string,
  playerOut: string,
  jersey: string,
  elimType: string,
  area: string,
  notes: string,
  scoreAfter: string
): Elim {
  return { event: EV, division: DIV, match: MATCH, point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

const PLAYERS: Player[] = [
  { name: "Jacob Edwards", team: "Tampa Bay Damage", number: "#31", role: "starter", source: "Pro Paintball DB LSO + film; Sat Set 5 film also claimed #21/#33 vs Margott #33 — jersey VERIFY film-only" },
  { name: "Alex Goldman", team: "Tampa Bay Damage", number: "#89", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Marcello Margott", team: "Tampa Bay Damage", number: "#33", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Chris Schehr", team: "Tampa Bay Damage", number: "#10", role: "starter", source: "Pro Paintball DB LSO; # from film jersey" },
  { name: "Bryan Smith", team: "Tampa Bay Damage", number: "#18", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Christos Botsolas", team: "Tampa Bay Damage", number: "#4", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Keith Brown Jr", team: "Tampa Bay Damage", number: "#9", role: "roster", source: "Pro Paintball DB LSO + film" },
  { name: "Chad Busiere", team: "Tampa Bay Damage", number: "#7", role: "roster", source: "Pro Paintball DB LSO + film" },
  { name: "Daniel Holliday", team: "Tampa Bay Damage", number: "#23", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Christopher Horn", team: "Tampa Bay Damage", number: "#16", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Mark Ireland", team: "Tampa Bay Damage", number: "#22", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Alexander Berdnikov", team: "Red Legion", number: "#11", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Michael Johnson", team: "Red Legion", number: "#3", role: "starter", source: "Pro Paintball DB LSO; # from film jersey" },
  { name: "Pavel Karsliev", team: "Red Legion", number: "#92", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Kirill Prikhidni", team: "Red Legion", number: "#75", role: "starter", source: "Pro Paintball DB LSO + film (buzzer confirmed part2)" },
  { name: "Leonid Smotrov", team: "Red Legion", number: "#27", role: "starter", source: "Pro Paintball DB LSO + film" },
  { name: "Sergey Solnyshkov", team: "Red Legion", number: "#23", role: "starter", source: "Pro Paintball DB LSO + film (#23; also possible #0 on film)" },
  { name: "Corey Hall", team: "Red Legion", number: "#19", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Thomas Hara", team: "Red Legion", number: "unknown", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Daniil Kuzmin", team: "Red Legion", number: "#33", role: "roster", source: "Pro Paintball DB LSO + film (pit ID part2)" },
  { name: "Edilberto Vasquez Jr", team: "Red Legion", number: "#15", role: "roster", source: "Pro Paintball DB LSO" },
  { name: "Jacob Sebaugh", team: "Paintball FIT", number: "#12", role: "film", source: "MLPB+ Sat Set 5 + PBLeagues (was Sebaugh / Sebrugh); #12 per film" },
  { name: "Scott Stewart", team: "Paintball FIT", number: "#0/#9 VERIFY", role: "film", source: "MLPB+ Sat Set 5 + PBLeagues (name confirmed; # film-only, Fri Set 5 pit shows #9)" },
  { name: "Jonathan Chavez", team: "Paintball FIT", number: "#00", role: "film", source: "PBLeagues Sat Set 5 preferred; prior film #4/#84 conflict retained in notes" },
  { name: "Chavez (prior #4/#84)", team: "Paintball FIT", number: "#4 / #84 (conflict)", role: "film", source: "YouTube film room (c00 #4, c01 #84) — superseded preferred #00 Jonathan" },
  { name: "Trenton Mason-Salinas", team: "Paintball FIT", number: "#34", role: "film", source: "MLPB+ Sat Set 5 + PBLeagues (was Mason-Salinas)" },
  { name: "Tyler Luckau", team: "Paintball FIT", number: "#45/#15 VERIFY", role: "film", source: "PBLeagues name confirmed (graphic 'Luchau'); # film-only, film shows both #45 and #15 (Fri Set 5 pit)" },
  { name: "Cyrus Garringer", team: "Paintball FIT", number: "#10", role: "film", source: "YouTube film room + PBLeagues Sat Set 5" },
  { name: "Jacob Johnson", team: "Paintball FIT", number: "#81", role: "film", source: "MLPB+ Sat Set 5 film ID + PBLeagues (name confirmed; # film-only)" },
  { name: "Hussain", team: "NY Xtreme", number: "#3", role: "film", source: "YouTube film room" },
  { name: "Navarro", team: "NY Xtreme", number: "#10", role: "film", source: "YouTube film room" },
  { name: "Lopez", team: "NY Xtreme", number: "#12", role: "film", source: "YouTube film room" },
  { name: "Taylor", team: "NY Xtreme", number: "#13", role: "film", source: "YouTube film room (c01 notes list under FIT — verify)" },
  { name: "Berkley", team: "NY Xtreme", number: "#26", role: "film", source: "YouTube film room" },
  { name: "unknown", team: "NY Xtreme", number: "#77", role: "film", source: "YouTube film room" },
  { name: "Johnson", team: "NY Xtreme", number: "#81", role: "film", source: "YouTube film room (c01 notes list under FIT — verify)" },
  { name: "Sebald", team: "NY Xtreme", number: "#115", role: "film", source: "YouTube film room" },
  { name: "Hawkins", team: "Wrecking Crew", number: "#0", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Taylor", team: "Wrecking Crew", number: "#7", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Reyes", team: "Wrecking Crew", number: "#11", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Barker", team: "Wrecking Crew", number: "#12", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Pinch", team: "Wrecking Crew", number: "#14", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Sloffer", team: "Wrecking Crew", number: "#22", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Dou", team: "Wrecking Crew", number: "#45", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "unknown", team: "Wrecking Crew", number: "#6", role: "film", source: "YouTube team cam" },
  { name: "unknown", team: "Wrecking Crew", number: "#44", role: "film", source: "YouTube team cam" },
  { name: "Findlay", team: "Ikonik", number: "#77", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Rolfsen", team: "Ikonik", number: "#25", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "Huntley", team: "Ikonik", number: "#18", role: "film", source: "YouTube team cam + PBLeagues Semi-Pro" },
  { name: "unknown", team: "Ikonik", number: "#21", role: "film", source: "YouTube team cam" },
  { name: "unknown", team: "Ikonik", number: "#33", role: "film", source: "YouTube team cam" },
  { name: "unknown", team: "Ikonik", number: "#5", role: "film", source: "YouTube team cam" },
  { name: "Williams", team: "Noobies", number: "#3", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Connor", team: "Noobies", number: "#7", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Navarro", team: "Noobies", number: "#8", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Schoemaker", team: "Noobies", number: "#20", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Rodriguez", team: "Noobies", number: "#33", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#57", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#83", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#88", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Dixon", team: "Noobies", number: "#181", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Kurtz", team: "Clutch City Oilers", number: "#2", role: "film", source: "YouTube raw cam vUCxjSV5Rao (rest unidentifiable from this angle)" },
  { name: "Williams", team: "Noobies", number: "#3", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Connor", team: "Noobies", number: "#7", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Navarro", team: "Noobies", number: "#8", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Schoemaker", team: "Noobies", number: "#20", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Rodriguez", team: "Noobies", number: "#33", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#57", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#83", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "unknown", team: "Noobies", number: "#88", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Dixon", team: "Noobies", number: "#181", role: "film", source: "YouTube raw cam vUCxjSV5Rao" },
  { name: "Kurtz", team: "Clutch City Oilers", number: "#2", role: "film", source: "YouTube raw cam vUCxjSV5Rao (rest unidentifiable this angle)" },
  { name: "Jet (Jetski)", team: "Chicago Aftershock", number: "#1", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Mason Hinds", team: "Chicago Aftershock", number: "#3", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Stancel", team: "Chicago Aftershock", number: "#16", role: "film", source: "Sat broadcast 3hxWhjK29Ac (ID tentative)" },
  { name: "Rooney", team: "Chicago Aftershock", number: "#19", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Lackey", team: "Chicago Aftershock", number: "#21", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Clay Hughes", team: "Chicago Aftershock", number: "#27", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Hoskinson (Hoski)", team: "Chicago Aftershock", number: "#42", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Josh Taylor Jr", team: "NY Xtreme", number: "#13", role: "film", source: "Sat broadcast 3hxWhjK29Ac (full name for Taylor #13)" },
  { name: "Fred Berkley", team: "NY Xtreme", number: "#26", role: "film", source: "Sat broadcast 3hxWhjK29Ac (also spelled Berkeley)" },
  { name: "Demers", team: "NY Xtreme", number: "#77", role: "film", source: "Sat broadcast 3hxWhjK29Ac (names the unknown #77)" },
  { name: "Balke", team: "NY Xtreme", number: "#72", role: "film", source: "Sat broadcast 3hxWhjK29Ac part A" },
  { name: "Ronnie Dizon", team: "Houston Heat", number: "#4", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Bufton (Austin/Jacob)", team: "Houston Heat", number: "#18", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues (first name unclear)" },
  { name: "Andres Ramos Saldana", team: "Houston Heat", number: "#27", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Cody Mickowski", team: "Houston Heat", number: "#32", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Samuel Monville", team: "Houston Heat", number: "#66", role: "film", source: "Sat Set 4 MLPB+ + PBLeagues roster spelling (was Sam on film)" },
  { name: "Mikhail Knyazev (Mishka)", team: "Houston Heat", number: "#77", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Ryan Moorhead", team: "Houston Heat", number: "#85", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Joey Dipolito", team: "Atlanta Jungle Cats", number: "#7", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Davis Stephens", team: "Atlanta Jungle Cats", number: "#22", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Joseph Oller", team: "Atlanta Jungle Cats", number: "#80", role: "film", source: "Sat broadcast 3hxWhjK29Ac + PBLeagues" },
  { name: "Ronny Tyner (Tiner)", team: "Atlanta Jungle Cats", number: "unknown", role: "roster", source: "PBLeagues; seen on film" },
  { name: "Aaron Pate", team: "Atlanta Jungle Cats", number: "unknown", role: "roster", source: "PBLeagues" },
  { name: "Alexander Povilaitis", team: "Atlanta Jungle Cats", number: "unknown", role: "roster", source: "PBLeagues" },
  { name: "Aaron Rios", team: "Atlanta Jungle Cats", number: "unknown", role: "roster", source: "PBLeagues" },
  { name: "Sterre… (partial)", team: "Atlanta Jungle Cats", number: "#21", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "unknown", team: "Atlanta Jungle Cats", number: "#24", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "unknown", team: "Atlanta Jungle Cats", number: "#97", role: "film", source: "Sat broadcast 3hxWhjK29Ac" },
  { name: "Chavez", team: "Tampa Bay Damage", number: "#84", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 3 (FIT roster also lists a Chavez #4/#84 — conflict)" },
  { name: "Blaine", team: "Atlanta Jungle Cats", number: "#90", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 3" },
  { name: "McGowan", team: "Atlanta Jungle Cats", number: "#5", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 3" },
  { name: "Oller (Set 3 jersey)", team: "Atlanta Jungle Cats", number: "#3 (Set 3) vs #80 (Heat game) — conflict", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 3" },
  { name: "Nathan Schroeder", team: "Seattle Uprising", number: "#4", role: "film", source: "PBLeagues Sat Set 5 preferred (was Nate Schroeder / Shrader); Set 2 film" },
  { name: "Graham Arnold", team: "Seattle Uprising", number: "#5", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Alec Holland", team: "Seattle Uprising", number: "#23", role: "film", source: "PBLeagues Sat Set 5 preferred (was Ryan Holland #23 ambiguous)" },
  { name: "Alexander Borromeo", team: "Seattle Uprising", number: "#8 (A/B) / #3 (C) — conflict", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Austin Woodward", team: "Seattle Uprising", number: "#2", role: "film", source: "MLPB+ Sat Set 5 film #2 (also #3 notes) + PBLeagues; jersey VERIFY film-only" },
  { name: "Ben Challenger", team: "Seattle Uprising", number: "unknown", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Cole Scott", team: "Seattle Uprising", number: "#21", role: "film", source: "Sat Set 2 + PBLeagues Sat Set 5; Uprising only — Sat Set 5 XF #21 Scott claim left unknown/VERIFY (no Scott on XF)" },
  { name: "Zach Patient", team: "Detroit Infamous", number: "#88 (part A listed #28 Uprising — conflict)", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Cody Bowen", team: "Detroit Infamous", number: "#69", role: "film", source: "Sat Set 2 film ID; roster: Kyle only (PBLeagues LSO Pro — no Cody Bowen)" },
  { name: "Kyle Bowen", team: "Detroit Infamous", number: "#69", role: "film", source: "MLPB+ Sat Set 4 (buzzer → Inf 9–4); PBLeagues roster: Kyle only" },
  { name: "Schonauer", team: "Detroit Infamous", number: "#49", role: "film", source: "Sat Set 2 film #49; PBLeagues jersey null; Sat Set 4 film #4 Dany Schonauer" },
  { name: "Dany Schonauer", team: "Detroit Infamous", number: "#4", role: "film", source: "MLPB+ Sat Set 4 (P13 snake); PBLeagues jersey null; film #4 (prior Set2 #49)" },
  { name: "Rob Velez", team: "Detroit Infamous", number: "#90 (part C only)", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Sam Silberg", team: "Detroit Infamous", number: "#19 (A) / #13 (B) — conflict", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Nathan (Abou-Hosn?)", team: "Detroit Infamous", number: "unknown", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Eaton", team: "unclear (Uprising or Infamous)", number: "#89", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Thomas Guest", team: "San Antonio X-Factor", number: "#7", role: "film", source: "MLPB+ Sat Set 5 buzzer + PBLeagues (was Tom Guest); #7 vs #9 film VERIFY" },
  { name: "Cody Bayless", team: "San Antonio X-Factor", number: "#22", role: "film", source: "PBLeagues Sat Set 5 preferred (was Bayliss); Set 2 + Set 5 film" },
  { name: "Tj Danner Jr", team: "San Antonio X-Factor", number: "#23", role: "film", source: "PBLeagues Sat Set 5 preferred (was TJ Danner / Danier)" },
  { name: "Matt Jackson", team: "San Antonio X-Factor", number: "#12", role: "film", source: "Sat Set 2 + Sat Set 5 film + PBLeagues" },
  { name: "Colt Roberts", team: "San Antonio X-Factor", number: "#45", role: "film", source: "PBLeagues Sat Set 5 (not Nate); #45 vs #22 film VERIFY" },
  { name: "William (Billy) Bernacchia III", team: "San Antonio X-Factor", number: "#21", role: "film", source: "PBLeagues Sat Set 5 preferred; prior #21/#1 conflict noted" },
  { name: "Ninios", team: "San Antonio X-Factor", number: "#3", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Nico Hyde", team: "unclear (X-Factor in A / Hurricanes in B)", number: "unknown", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Logan Dyer", team: "CK Hurricanes", number: "#15", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Konstantin Fedorov (Federov)", team: "CK Hurricanes", number: "#88", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Drew Bell", team: "CK Hurricanes", number: "#58", role: "film", source: "Sat Set 2 film #58; PBLeagues jersey null; Sat Set 4 film #20 Andrew Bell" },
  { name: "Andrew Bell", team: "CK Hurricanes", number: "#20", role: "film", source: "MLPB+ Sat Set 4 (P9); PBLeagues jersey null; film #20 (prior Drew #58)" },
  { name: "Justin Brinkman", team: "CK Hurricanes", number: "#11", role: "film", source: "Sat broadcast 3hxWhjK29Ac Set 2" },
  { name: "Aaron Brown", team: "CK Hurricanes", number: "#56", role: "film", source: "Sat Set 2 film ID; roster: Michael only (PBLeagues LSO Pro — no Aaron Brown)" },
  { name: "Jake Raffield", team: "CK Hurricanes", number: "#24/#26 VERIFY", role: "film", source: "MLPB+ Sat Set 4 (buzzer → Canes 3–2); PBLeagues name confirmed; # film-only, film shows #24 and #26" },
  { name: "Sam Brinkman", team: "CK Hurricanes", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk (RL vs Canes); VERIFY vs Justin Brinkman #11" },
  { name: "Kaito Warner Jr", team: "CK Hurricanes", number: "#53 VERIFY (film)", role: "film", source: "Sun broadcast -NxgYj0epvk (RL vs Canes); PBLeagues name/team confirmed; # film-only from Fri 'Warner #53'" },
  { name: "Duran Martinez", team: "CK Hurricanes", number: "#18 VERIFY (film)", role: "film", source: "Sun broadcast -NxgYj0epvk (RL vs Canes); PBLeagues name confirmed; # film-only (Fri Set 5 pit #18)" },
  { name: "Michael Brown", team: "CK Hurricanes", number: "#56", role: "film", source: "MLPB+ Sat Set 4 film ID; PBLeagues roster: Michael only (no Aaron)" },
  { name: "Gant MacLellan", team: "Chicago Aftershock", number: "#56", role: "film", source: "MLPB+ Sat Set 4 (P3); PBLeagues Aftershock; VERIFY side: film dual-feed" },
  { name: "Daniela Rojas Jr", team: "Chicago Aftershock", number: "#30", role: "film", source: "MLPB+ Sat Set 4 walkoff survivor FINAL Canes 8–5" },
  { name: "Maxim Stancel", team: "Chicago Aftershock", number: "#16", role: "film", source: "MLPB+ Sat Set 4 walkoff; merges prior Stancel #16" },
  { name: "Jonah Jamroz", team: "Detroit Infamous", number: "#9", role: "film", source: "MLPB+ Sat Set 4 notes / allowlist (film confirm sparse)" },
  { name: "LJ Guess", team: "San Antonio X-Factor", number: "unknown", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "Brandon Holland", team: "San Antonio X-Factor", number: "unknown", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "George Saldana", team: "Houston Heat", number: "#8", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "Howe", team: "Seattle Uprising", number: "unknown", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "Sam", team: "Seattle Uprising", number: "unknown", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "Holland", team: "Seattle Uprising", number: "#99 (vs Ryan Holland #23 — verify)", role: "film", source: "Fri broadcast 40IX7cok6Vk" },
  { name: "Malloy", team: "Red Legion", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF (VERIFY — also listed FIT in c1)" },
  { name: "Colt", team: "Paintball FIT", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Ben Carroll", team: "TonTon Arsenal", number: "#02", role: "film", source: "Sun broadcast -NxgYj0epvk QF (as Benny Carroll); Fri Set 9 MLPB+ close-up graphic 'Carroll #02' (film-graphic entry, not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (TonTon)" },
  { name: "Fromholz", team: "TonTon Arsenal", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF (Kromholz/Krombholz spelling — verify)" },
  { name: "Enfosi", team: "TonTon Arsenal", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Hugo", team: "TonTon Arsenal", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Cody Woodruff", team: "Perris ASG Aftermath", number: "#8", role: "film", source: "Sun broadcast -NxgYj0epvk QF; Sat Set 9 #8 yellow-flag penalty (film tagged Collision — team VERIFY; PBLeagues Aftermath)" },
  { name: "Devin Stuart", team: "Perris ASG Aftermath", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Eric Arrieta", team: "Perris ASG Aftermath", number: "#44", role: "film", source: "Sun broadcast -NxgYj0epvk QF; Sat Set 9 #44 (film tagged Collision — team VERIFY; PBLeagues Aftermath)" },
  { name: "Grayson Gladstone", team: "Perris ASG Aftermath", number: "#95", role: "film", source: "Sun broadcast -NxgYj0epvk QF; Sat Set 9 pit cam #95 + PBLeagues Aftermath" },
  { name: "Mazurick", team: "Perris ASG Aftermath", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF (also Mazurek)" },
  { name: "Zach Carter", team: "Perris ASG Aftermath", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Jeremy Dohn", team: "Perris ASG Aftermath", number: "unknown", role: "film", source: "Sun broadcast -NxgYj0epvk QF" },
  { name: "Stanczak", team: "Edmonton Impact", number: "#99", role: "film", source: "MLPB+ Sun Set 4 semis (RL vs Impact)" },
  { name: "Rabackoff", team: "Edmonton Impact", number: "#20", role: "film", source: "MLPB+ Sun Set 4 semis (buzzer → Impact 4)" },
  { name: "Yachimec", team: "Edmonton Impact", number: "#24", role: "film", source: "MLPB+ Sun Set 4 semis" },
  { name: "Leival / Levine (spelling VERIFY)", team: "Edmonton Impact", number: "#13", role: "film", source: "MLPB+ Sun Set 4 semis; spelling VERIFY" },
  { name: "Axel Gaudin Sr", team: "TonTon Arsenal", number: "#91", role: "film", source: "MLPB+ Sun Set 4 semis + Sat Set 10 film #91; PBLeagues TonTon (earlier Red Legion tag corrected)" },
  { name: "Anfossi (Enfosi/Infossi VERIFY)", team: "TonTon Arsenal", number: "#7", role: "film", source: "MLPB+ Sun Set 4 semis (buzzer → TonTon 5); spelling VERIFY vs Enfosi" },
  { name: "Szpytma", team: "TonTon Arsenal", number: "#89", role: "film", source: "MLPB+ Sun Set 4 semis; Fri Set 6 vs Dynasty graphic (snake runner, bunker)" },
  { name: "Zaghini", team: "TonTon Arsenal", number: "#31", role: "film", source: "MLPB+ Sun Set 4 semis" },
  { name: "Stephen Omara", team: "San Diego Dynasty", number: "#16", role: "film", source: "MLPB+ Sat Set 7 buzzer P2 (film Omara16/O'Mara16) + PBLeagues" },
  { name: "Yosh Rau", team: "San Diego Dynasty", number: "#32", role: "film", source: "MLPB+ Sat Set 7 + PBLeagues; Sun QF Rau #32" },
  { name: "Harrison Frye", team: "San Diego Dynasty", number: "#8", role: "film", source: "MLPB+ Sat Set 7 buzzer P7 (film Frye #8) + PBLeagues" },
  { name: "Alex Fraige", team: "San Diego Dynasty", number: "#13", role: "film", source: "MLPB+ Sat Set 7 film #13 — VERIFY: Fraige or Andrade (both PBLeagues Dynasty; jersey film-only)" },
  { name: "Henry Sentz", team: "Los Angeles Ironmen", number: "#5", role: "film", source: "MLPB+ Sat Set 7 film #5 + PBLeagues" },
  { name: "Patrick Kraft Jr", team: "Los Angeles Ironmen", number: "#17", role: "film", source: "MLPB+ Sat Set 7 film #17 + PBLeagues" },
  { name: "Jesse Stephens Jr", team: "Los Angeles Ironmen", number: "#29", role: "film", source: "MLPB+ Sat Set 7 film 'Stephens #29' + PBLeagues" },
  { name: "Vince Newell", team: "Los Angeles Collision", number: "#16", role: "film", source: "MLPB+ Sat Set 7 film #16 + PBLeagues EID 9321 Collision (name confirmed high; #16 film-only)" },
  { name: "Hugo Verhaeghe", team: "TonTon Arsenal", number: "#15", role: "film", source: "MLPB+ Sat Set 7 FINAL buzzer + PBLeagues TonTon (p2 Collision tag rejected)" },
  { name: "Tyler Harmon", team: "Edmonton Impact", number: "#12", role: "film", source: "MLPB+ Sat Set 8 buzzer P8; name/team PBLeagues-confirmed, number from film" },
  { name: "Caleb Abuhl", team: "Los Angeles Ironmen", number: "#7", role: "film", source: "MLPB+ Sat Set 9 film Abuhl #7 (buzzers P3 + P6) + PBLeagues Ironmen" },
  { name: "Christopher Lennon", team: "Los Angeles Ironmen", number: "#22", role: "film", source: "MLPB+ Sat Set 9 film Lennon #22 + PBLeagues Ironmen" },
  { name: "Clayton Rizzardo Jr", team: "Royal City Seadogs", number: "#9", role: "film", source: "MLPB+ Sat Set 9 film 'C. Rizzardo #9' + PBLeagues Seadogs" },
  { name: "Brandon Trujillo", team: "Los Angeles Collision", number: "#23", role: "film", source: "MLPB+ Sat Set 9 film #23 + PBLeagues Collision; OT-forcing buzzer side VERIFY" },
  { name: "Ethan Jose Castro", team: "Los Angeles Collision", number: "#5", role: "film", source: "MLPB+ Sat Set 9 pit cam #5 Castro (no elim) + PBLeagues Collision" },
  { name: "Avery Nguyen", team: "Los Angeles Collision", number: "#2", role: "film", source: "MLPB+ Sat Set 9 pit cam (mislabeled 'Aftermath pit') + PBLeagues Collision" },
  { name: "Jordan Boyum", team: "Los Angeles Collision", number: "#7", role: "film", source: "MLPB+ Sat Set 9 pit cam (mislabeled 'Aftermath pit') + PBLeagues Collision" },
  { name: "Guillermo Ramirez", team: "Los Angeles Collision", number: "#00", role: "film", source: "MLPB+ Sat Set 9 pit cam (mislabeled 'Aftermath pit') + PBLeagues Collision; confirmed PBLeagues Roster pro-allowlist.json event 9321 (LA Collision)" },
  { name: "Evan Middleton", team: "Los Angeles Collision", number: "#25", role: "film", source: "MLPB+ Sat Set 9 pit cam (mislabeled 'Aftermath pit') + PBLeagues Collision" },
  { name: "James Green", team: "Perris ASG Aftermath", number: "#42", role: "film", source: "MLPB+ Sat Set 9 film #42 Green (film tagged Collision OT out — team VERIFY) + PBLeagues Aftermath" },
  { name: "Michael Urena", team: "San Diego Dynasty", number: "#79", role: "film", source: "MLPB+ Sat Set 10 film Urena #79 + PBLeagues Dynasty" },
  { name: "Blake Yarber", team: "San Diego Dynasty", number: "#44", role: "film", source: "MLPB+ Sat Set 10 film 'Farber'; Fri Set 9 close-up graphic 'Yarber #44' (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Dynasty)" },
  { name: "Chris Caputo", team: "New Jersey Leverage", number: "unknown", role: "film", source: "Fri Set 9 MLPB+ close-up graphic 'Caputo' (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Leverage)" },
  { name: "Sanborn", team: "New Jersey Leverage", number: "unknown", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Leverage)" },
  { name: "De Los Santos", team: "New Jersey Leverage", number: "unknown", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Leverage)" },
  { name: "Graham", team: "New Jersey Leverage", number: "#9", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Leverage)" },
  { name: "Arturo Andrade", team: "San Diego Dynasty", number: "#13", role: "film", source: "Fri Set 9 MLPB+ close-up graphic 'Andrade #13' (not assigned to elims); name confirmed PBLeagues Roster pro-allowlist.json event 9321 (Dynasty); separate Sat Set 7 Fraige/Andrade #13 jersey VERIFY still open" },
  { name: "unknown (graphic 'Harry'; possibly Harrison Frye) VERIFY", team: "San Diego Dynasty", number: "unknown", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); 'Harry' not a roster name per PBLeagues Roster pro-allowlist.json event 9321" },
  { name: "unknown TonTon #95 (graphic 'Giger', not on roster) VERIFY", team: "TonTon Arsenal", number: "#95", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); not on any roster per PBLeagues Roster pro-allowlist.json event 9321" },
  { name: "Blue", team: "Chicago Distortion", number: "#22", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Distortion)" },
  { name: "Unger", team: "Chicago Distortion", number: "#67", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Distortion)" },
  { name: "Haber-Mattie", team: "Chicago Distortion", number: "#4", role: "film", source: "Fri Set 9 MLPB+ close-up graphic 'Haber #4' (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 as Haber-Mattie (Distortion)" },
  { name: "Nate Roberts", team: "Chicago Distortion", number: "#47", role: "film", source: "Fri Set 9 MLPB+ close-up graphic (not assigned to elims); confirmed PBLeagues Roster pro-allowlist.json event 9321 (Distortion)" },
];

const WN = "Raw team cam (G_Lilly_Films wuAO5srx5rA); film cuts between points, no scoreboard";
const WS = "unclear (no scoreboard)";
const NN = "Raw cam (G_Lilly_Films vUCxjSV5Rao), mostly behind Noobies; far-side elims often off-screen";
const CN = "Sat broadcast 3hxWhjK29Ac (dual-feeds Heat/Jungle Cats)";
const HN = "Sat broadcast 3hxWhjK29Ac (dual-feed with Aftershock/NYX); A = VOD ~18–43 clip, B = VOD ~43–64 clip";

const S2N = "Sat broadcast 3hxWhjK29Ac (Set 2 dual-feed Uprising/Infamous + X-Factor/Hurricanes); A = VOD ~88–113, B = ~113–138, C = ~138–165 clip; clip timestamps";

const S3N = "Sat broadcast 3hxWhjK29Ac (Set 3 dual-feed with FIT/NYX); A = VOD ~165–190, B = ~190–end clip; scoreboard often mislabeled";

const FN = "Fri broadcast 40IX7cok6Vk (dual-feed XF/Aftershock + Uprising/Heat); A = VOD ~50–62, B = ~62–74, C = ~74–86 clip; clip timestamps";

const ROWS: Elim[] = [
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "1",
    timestamp: "file ~0:56 | clock 10:00",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "lane",
    area: "breakout / home-center",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "0-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "1",
    timestamp: "file ~0:59 | clock 10:00",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "breakout / home-mid",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "0-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "1",
    timestamp: "file ~1:28 | clock ~9:xx",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "snap/lane",
    area: "snake",
    notes: "Breaks stalemate; cascades to point",
    scoreAfter: "0-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "1",
    timestamp: "file ~1:40–1:47",
    playerOut: "Sergey Solnyshkov (+ remaining unknown)",
    jersey: "#23 Red Legion",
    elimType: "elim/concede off-cam",
    area: "field closeout",
    notes: "Solnyshkov visible among remaining; Damage walks open to end point",
    scoreAfter: "Damage 1 – RL 0 @ 8:57",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "2",
    timestamp: "file ~4:05 | clock 8:57",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "breakout mid/home",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "1-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "2",
    timestamp: "file ~4:06 | clock 8:57",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "lane",
    area: "breakout home/center",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "1-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "2",
    timestamp: "file ~4:31",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "shot",
    area: "snake (rolling)",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "1-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "2",
    timestamp: "file ~4:55",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "run-through",
    area: "center wedge",
    notes: "Damage center run-through",
    scoreAfter: "1-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "2",
    timestamp: "file ~4:56",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "run-through",
    area: "snake corner",
    notes: "Same run-through; buzzer hang ~5:00",
    scoreAfter: "Damage 2 – RL 0 @ 8:05",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "3",
    timestamp: "file ~7:25 | clock 8:05",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "breakout home/top",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "2-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "3",
    timestamp: "file ~7:26 | clock 8:05",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "breakout top dorito",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "2-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "3",
    timestamp: "file ~7:29 | clock 8:05",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "lane",
    area: "snake corner",
    notes: "Official MLPB+ screenrec part1",
    scoreAfter: "2-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "3",
    timestamp: "file ~7:31",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "shot",
    area: "snake",
    notes: "RL to ~4v2",
    scoreAfter: "2-0 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "3",
    timestamp: "file ~7:50–8:00",
    playerOut: "unknown (remaining)",
    jersey: "Tampa Bay Damage",
    elimType: "elim/concede off-cam",
    area: "field closeout",
    notes: "RL closes numbers advantage",
    scoreAfter: "Damage 2 – RL 1 @ 7:28",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "4",
    timestamp: "chunk02 ~0:23 | clock 7:28",
    playerOut: "unknown",
    jersey: "Red Legion",
    elimType: "breakout dive kill",
    area: "snake",
    notes: "Official MLPB+ screenrec part1 chunk02",
    scoreAfter: "2-1 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "4",
    timestamp: "chunk02 ~0:45 | clock 7:28",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "shot",
    area: "center",
    notes: "Official MLPB+ screenrec part1 chunk02",
    scoreAfter: "2-1 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "4",
    timestamp: "chunk02 ~1:03",
    playerOut: "Alexander Berdnikov",
    jersey: "#11 Red Legion",
    elimType: "shot while running",
    area: "dorito",
    notes: "Yellow flag on Damage; RL awarded point",
    scoreAfter: "Damage 2 – RL 2 @ 6:39",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "5",
    timestamp: "chunk02 ~3:19 | clock 6:39",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "breakout dive kill",
    area: "snake",
    notes: "False-start abort then reset before this point",
    scoreAfter: "2-2 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "5",
    timestamp: "chunk02 ~3:20 | clock 6:39",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "center break",
    notes: "Catastrophic break for Damage",
    scoreAfter: "2-2 in progress",
  },
  {
    event: "Lone Star Open 2026",
    division: "Pro",
    match: "Tampa Bay Damage vs Red Legion (Pro Finals)",
    point: "5",
    timestamp: "chunk02 ~3:21 | clock 6:39",
    playerOut: "unknown",
    jersey: "Tampa Bay Damage",
    elimType: "lane",
    area: "center/dorito break",
    notes: "Michael Johnson #3 holds GP29 center; point ends off-cam",
    scoreAfter: "RL 3 – Damage 2 @ 6:02",
  },
  r("6", "part2 ~0:46 | clock 6:02", "unknown", "Red Legion", "lane", "breakout back center", "CORRECTED: Damage wiped RL on field; refs award RL (penalty)", "3-2 in progress"),
  r("6", "part2 ~0:48 | clock 6:02", "unknown", "Red Legion", "lane", "breakout snake", "CORRECTED pass part2_00", "3-2 in progress"),
  r("6", "part2 ~0:56", "Leonid Smotrov", "#27 Red Legion", "shot", "dorito", "Marker up; named on film", "3-2 in progress"),
  r("6", "part2 ~1:21", "Alexander Berdnikov", "#11 Red Legion", "shot", "snake", "Named on film", "3-2 in progress"),
  r("6", "part2 ~1:26", "unknown", "Red Legion", "cleanup", "center/dorito", "Damage hits buzzer ~1:29 (bug 3–3); penalty → RL point", "RL 4 – Damage 2 @ 5:15"),
  r("7", "part2 ~4:34 | clock 5:15", "unknown", "Red Legion", "lane", "breakout snake", "Damage left after side switch; Schehr/Edwards/Margott/Brown Jr/Goldman line", "4-2 in progress"),
  r("7", "part2 ~4:36 | clock 5:15", "unknown", "Red Legion", "lane", "breakout back center", "Official MLPB+ screenrec part2", "4-2 in progress"),
  r("7", "part2 ~6:23", "unknown", "Red Legion", "shot", "center (Silverbelly)", "Official MLPB+ screenrec part2", "4-2 in progress"),
  r("7", "part2 ~6:30", "unknown", "Red Legion", "shot", "back snake corner", "Shot by advancing snake", "4-2 in progress"),
  r("7", "part2 ~6:36", "unknown", "Red Legion", "shot", "dorito", "Damage buzzer ~6:45", "Damage 3 – RL 4 @ 3:03"),
  r("8", "part2 ~0:13 | clock ~2:16", "unknown", "Tampa Bay Damage", "shot", "snake side tall bunker", "part2_01; scoreboard may lag as 4–2", "4-2/4-3 in progress"),
  r("8", "part2 ~0:25 | clock ~2:05", "unknown", "Red Legion", "shot", "tall dark bunker L", "part2_01", "4-2/4-3 in progress"),
  r("8", "part2 ~0:43 | clock ~1:46", "Alexander Berdnikov", "#11 Red Legion", "shot", "walks off R", "Name visible ~0:53 file", "4-2/4-3 in progress"),
  r("8", "part2 ~1:00–1:01", "Kirill Prikhidni (buzzer)", "#75 Red Legion", "buzzer", "center Silverbelly push", "Prikhidni #75 confirmed on film; board shows RL 5–2", "RL 5 – Damage 2 @ 1:30"),
  r("HT", "part2 ~3:15 | clock ~1:18", "unknown", "Tampa Bay Damage", "shot", "snake", "End-half attempt; NO POINT awarded", "RL 5–2 in progress"),
  r("HT", "part2 ~3:20 | clock ~1:13", "Alex Goldman", "#89 Tampa Bay Damage", "shot", "deep snake", "#89 clear on film", "RL 5–2 in progress"),
  r("HT", "part2 ~3:43 | clock ~0:50", "unknown", "Tampa Bay Damage", "shot", "center-right X bunker", "part2_01 named reconcile", "RL 5–2 in progress"),
  r("HT", "part2 ~3:45 | clock ~0:49", "unknown", "Tampa Bay Damage", "walks off", "right", "part2_01", "RL 5–2 in progress"),
  r("HT", "part2 ~4:33–4:35 | clock 0:00", "Chris Schehr (buzzer waved off)", "#10 Tampa Bay Damage", "buzzer dive (waived)", "home / buzzer", "Clock hit 0:00; ref waves off. Halftime RL 5–2", "Halftime RL 5 – Damage 2"),
  r("9", "part3 ~1:08 | clock 6:09", "unknown", "Tampa Bay Damage", "shot in bunker", "snake", "2H open Damage 3 – RL 6 (early 2H gap uncaptured)", "3-6 in progress"),
  r("9", "part3 ~1:37 | clock 5:38", "unknown", "Red Legion", "walks off", "dorito", "Official MLPB+ screenrec part3", "3-6 in progress"),
  r("9", "part3 ~1:41 | clock 5:35", "unknown", "Tampa Bay Damage", "walks off", "center", "Official MLPB+ screenrec part3", "3-6 in progress"),
  r("9", "part3 ~1:44 | clock 5:32", "unknown", "Red Legion", "walks off", "center/right", "Official MLPB+ screenrec part3", "3-6 in progress"),
  r("9", "part3 ~1:46 | clock 5:29", "Marcello Margott", "#33 Tampa Bay Damage", "walks off", "center", "Named on film", "3-6 in progress"),
  r("9", "part3 ~1:50 | clock 5:28", "Keith Brown Jr", "#9 Tampa Bay Damage", "walks off", "center", "Named on film; buzzer/final RL outs off-cam", "Damage 4 – RL 6"),
  r("10", "part3 ~4:00 | clock ~5:24", "unknown", "Red Legion", "breakout", "snake", "Official MLPB+ screenrec part3", "4-6 in progress"),
  r("10", "part3 ~4:09 | clock ~5:11", "unknown", "Red Legion", "bunker", "dorito", "Official MLPB+ screenrec part3", "4-6 in progress"),
  r("10", "part3 ~4:14 | clock ~5:10", "unknown", "Tampa Bay Damage", "bunker", "center", "Official MLPB+ screenrec part3", "4-6 in progress"),
  r("10", "part3 ~4:26 | clock ~4:58", "unknown", "Red Legion", "walks off", "snake", "Score corrects to 5-6 @ ~4:44 pits", "Damage 5 – RL 6"),
  r("11", "part3 ~7:43 | clock ~4:42", "unknown", "Tampa Bay Damage", "shot", "home bunker", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~7:46", "unknown", "Red Legion", "shot", "center", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~7:50", "unknown", "Red Legion", "shot", "dorito", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~7:51", "unknown", "Red Legion", "shot", "home/back center", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~8:14", "unknown", "Red Legion", "shot", "snake", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~8:26", "unknown", "Red Legion", "walks off", "center", "Official MLPB+ screenrec part3", "5-6 in progress"),
  r("11", "part3 ~8:40", "Alex Goldman (buzzer)", "#89 Tampa Bay Damage", "buzzer", "home", "Uncontested buzzer ties match", "Damage 6 – RL 6"),
  r("12", "part3 ~11:00 | clock 3:31", "unknown", "Red Legion", "breakout", "snake", "RL loses 2 wide off break; continues into part3_01", "6-6 in progress"),
  r("12", "part3 ~11:03 | clock 3:28", "unknown", "Red Legion", "breakout", "dorito", "Official MLPB+ screenrec part3", "6-6 in progress"),
  r("12", "part3_01 ~0:43 | clock ~2:32", "Keith Brown Jr", "#9 Tampa Bay Damage", "walks off", "snake side", "Other close-out elims / buzzer not fully shown", "Damage 7 – RL 6 @ 1:59"),
  r("13", "part3_01 ~3:12 | clock 2:10", "unknown", "Red Legion", "shot", "sliding into snake", "Official MLPB+ screenrec part3", "7-6 in progress"),
  r("13", "part3_01 ~3:14 | clock 2:08", "unknown", "Red Legion", "yellow-flag penalty pull", "center/snake", "Official MLPB+ screenrec part3", "7-6 in progress"),
  r("13", "part3_01 ~3:41 | clock 1:40", "unknown", "Red Legion", "walks off", "dorito", "Official MLPB+ screenrec part3", "7-6 in progress"),
  r("13", "part3_01 ~4:01 | clock 1:23", "unknown", "Red Legion", "bunkered", "back dorito", "Damage run-through", "7-6 in progress"),
  r("13", "part3_01 ~4:02", "unknown", "Red Legion", "concede/shot", "back snake", "Damage buzzes ~4:03; replay: Solnyshkov #23 pack hit prior point", "Damage 8 – RL 6 @ 1:23"),
  r("13", "part3_01 replay", "Sergey Solnyshkov", "#23 Red Legion", "pack hit (replay)", "behind Silverbelly", "Replay of prior point; #23 confirmed", "note / prior point"),
  r("14", "part3_02 ~01:54 | clock ~1:19", "unknown", "Tampa Bay Damage", "breakout shot", "snake", "Open Damage 8 – RL 6 @ 1:22", "8-6 in progress"),
  r("14", "part3_02 ~01:56 | clock ~1:17", "unknown", "Tampa Bay Damage", "diving bunker", "center", "Official MLPB+ screenrec part3", "8-6 in progress"),
  r("14", "part3_02 ~02:08 | clock ~1:06", "Chris Schehr", "#10 Tampa Bay Damage", "shot", "center-left", "Walks off; named on film", "8-6 in progress"),
  r("14", "part3_02 ~02:13 | clock ~1:00", "Marcello Margott", "#33 Tampa Bay Damage", "elim", "snake side", "Named on film", "8-6 in progress"),
  r("14", "part3_02 ~02:16 | clock 0:54", "unknown (buzzer)", "Red Legion", "buzzer", "home", "RL buzzes → 8–7", "Damage 8 – RL 7 @ 0:54"),
  r("15", "part3_02 ~04:34 | clock ~0:49", "unknown", "Tampa Bay Damage", "breakout shot", "snake", "Final point; Margott late buzzer nullified", "8-7 in progress"),
  r("15", "part3_02 ~04:46 | clock ~0:38", "unknown", "Red Legion", "shot", "center", "Yellow pants; hand up", "8-7 in progress"),
  r("15", "part3_02 ~04:54 | clock ~0:30", "unknown", "Tampa Bay Damage", "shot", "snake", "Official MLPB+ screenrec part3", "8-7 in progress"),
  r("15", "part3_02 ~05:11 | clock ~0:12", "unknown", "Red Legion", "shot", "center", "Hand up", "8-7 in progress"),
  r("15", "part3_02 ~05:13–05:19 | clock ~0:03", "Marcello Margott (buzzer nullified)", "#33 Tampa Bay Damage", "buzzer (PENALTY nullified)", "center sprint / dive", "Yellow flag ~05:20; bug briefly 9–7 then void. Match ends 8–7", "FINAL Damage 8 – RL 7"),
  f("1", "c00 ~1:38 | clock 14:39", "Sebaugh", "Paintball FIT (POV; # unclear here, #12 in c01)", "shot", "running/sliding to snake L", "YouTube film room c00", "0-0 in progress"),
  f("1", "c00 ~1:58", "unknown", "NY Xtreme", "walks off gun up", "right", "YouTube film room c00", "0-0 in progress"),
  f("1", "c00 ~3:21", "Stewart", "#0 Paintball FIT", "walks off gun up", "left-center", "YouTube film room c00", "0-0 in progress"),
  f("1", "c00 ~3:31", "Luchau", "#45 Paintball FIT", "shot head/upper", "back right-center", "FIT clutches point; buzzer off-cam", "FIT 1 – NYX 0"),
  f("2", "c00 ~4:38 | clock 12:35", "unknown", "NY Xtreme", "shot diving", "snake L", "NYX wins point off-cam", "FIT 1 – NYX 1"),
  f("3", "c00 ~6:26", "unknown (#77)", "#77 NY Xtreme", "shot hopper", "center-right", "Rest of point off-cam", "FIT 2 – NYX 1"),
  f("4", "c00 ~6:54 | clock 10:59", "unknown (#12)", "#12 Paintball FIT", "breakout dive", "back right bunker", "FIT #12 — possibly Sebaugh (#12 in c01)", "2-1 in progress"),
  f("4", "c00 ~7:13 | clock 10:39", "Sebaugh", "Paintball FIT", "shot crawling", "snake", "Notes list both #12 and Sebaugh out — may be duplicate; verify", "2-1 in progress"),
  f("4", "c01 ~0:18", "unknown", "NY Xtreme", "off-screen", "unknown", "→ 5v3", "2-1 in progress"),
  f("4", "c01 ~0:21 | clock 10:15", "Sebaugh", "#12 Paintball FIT", "shot leaning (POV splat)", "back blue triangle", "Conflicts with Sebaugh out at c00 ~7:13 — verify on film", "2-1 in progress"),
  f("4", "c01 ~0:30", "unknown", "NY Xtreme", "off-screen", "unknown", "→ 4v1", "2-1 in progress"),
  f("4", "c01 ~0:32 | clock 10:04", "Hussain", "#3 NY Xtreme", "bunkered by running FIT", "red triangle", "FIT closes point", "FIT 3 – NYX 1"),
  f("5", "c01 ~1:40 | clock 9:44", "Hussain", "#3 NY Xtreme", "shot across field", "blue cylinder", "YouTube film room c01", "3-1 in progress"),
  f("5", "c01 ~1:44 | clock 9:40", "Mason-Salinas", "#34 Paintball FIT", "shot crawling", "snake", "YouTube film room c01", "3-1 in progress"),
  f("5", "c01 ~1:55", "Sebaugh", "#12 Paintball FIT", "shot in bunker (POV)", "unknown", "More elims truncated in source notes; FIT wins point", "FIT 4 – NYX 1"),
  f("6", "c01 ~2:xx", "none logged", "—", "no elims logged", "—", "Short point; NYX may have conceded / prior penalty", "FIT 5 – NYX 1"),
  f("7", "c01 ~3:30 | clock 8:47", "Sebaugh", "#12 Paintball FIT", "POV hit", "backfield", "Rest of point off-cam", "FIT 6 – NYX 1"),
  f("8", "c01 ~4:23", "Navarro", "#10 NY Xtreme", "walks off", "unknown", "YouTube film room c01", "6-1 in progress"),
  f("8", "c01 ~4:26", "Hussain", "#3 NY Xtreme", "walks off", "unknown", "YouTube film room c01", "6-1 in progress"),
  f("8", "c01 ~4:34", "unknown", "NY Xtreme", "ref waves out", "center", "YouTube film room c01", "6-1 in progress"),
  f("8", "c01 ~4:58 | clock 7:37", "unknown", "NY Xtreme", "bunkered by Luchau #45 snake run", "unknown", "FIT wins point. Graphic lag: bug still shows 6–1 at end of VOD; this point makes it 7–1", "FINAL FIT 7 – NYX 1 (graphic shows 6–1)"),
  w("0:26", "Pinch", "#14 Wrecking Crew", "shot behind Dorito", "Dorito", WN, WS),
  w("1:46", "Barker", "#12 Wrecking Crew", "unclear (walking off)", "mid", WN, WS),
  w("2:38", "Pinch", "#14 Wrecking Crew", "shot behind Dorito", "Dorito", WN, WS),
  w("3:13", "unknown", "Ikonik", "shot diving snake", "snake", WN, WS),
  w("3:20", "Barker", "#12 Wrecking Crew", "unclear walking off", "Dorito", WN, WS),
  w("3:25", "Taylor", "#7 Wrecking Crew", "unclear walking off", "mid", WN, WS),
  w("3:35", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("3:54", "Reyes", "#11 Wrecking Crew", "shot behind center pin", "center", WN, WS),
  w("4:09", "Barker", "#12 Wrecking Crew", "unclear walking off", "mid", WN, WS),
  w("4:34", "unknown (#6)", "#6 Wrecking Crew", "unclear walking off", "snake", WN, WS),
  w("4:44", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("5:03", "unknown", "Ikonik", "shot diving/crawling snake", "snake", WN, WS),
  w("5:32", "Pinch", "#14 Wrecking Crew", "unclear walking off", "Dorito", WN, WS),
  w("5:50", "Pinch", "#14 Wrecking Crew", "shot diving snake off break", "snake", WN, WS),
  w("6:39", "unknown", "Wrecking Crew", "unclear walking off", "mid", WN, WS),
  w("6:58", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("8:16", "Hawkins", "#0 Wrecking Crew", "unclear walking off", "mid", WN, WS),
  w("8:32", "Barker", "#12 Wrecking Crew", "unclear walking off", "Dorito", WN, WS),
  w("10:09", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("10:13", "Dou", "#45 Wrecking Crew", "unclear walking off", "mid", WN, WS),
  w("11:52", "Sloffer", "#22 Wrecking Crew", "shot behind Dorito", "Dorito", WN, WS),
  w("12:06", "unknown", "Wrecking Crew", "unclear walking off", "Dorito", WN, WS),
  w("12:22", "unknown (#44)", "#44 Wrecking Crew", "shot while running", "mid", WN, WS),
  w("12:25", "unknown", "Wrecking Crew", "shot behind Dorito", "Dorito", WN, WS),
  w("12:44", "unknown", "Wrecking Crew", "shot in snake", "snake", WN, WS),
  w("13:30", "Rolfsen", "#25 Ikonik", "unclear walking off", "Dorito", WN, WS),
  w("13:42", "unknown", "Ikonik", "shot running to Dorito", "Dorito", WN, WS),
  w("14:39", "Findlay", "#77 Ikonik", "unclear walking off", "mid", WN, WS),
  w("14:51", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("15:00", "Pinch", "#14 Wrecking Crew", "shot diving snake off break", "snake", WN, WS),
  w("15:45", "unknown", "Wrecking Crew", "shot in snake", "snake", WN, WS),
  w("16:03", "Barker", "#12 Wrecking Crew", "unclear walking off", "Dorito", WN, WS),
  w("16:13", "unknown", "Ikonik", "unclear walking off", "mid", WN, WS),
  w("16:19", "unknown (#21)", "#21 Ikonik", "unclear walking off", "mid", WN, WS),
  w("16:22", "unknown", "Ikonik", "unclear walking off", "mid", WN + ". Last elim on film. Final score from PBLeagues (not film): https://pbleagues.com/event/9321/schedule?action=stats&id=4022165", "FINAL Wrecking Crew 8 – Ikonik 4 (PBLeagues; film has no scoreboard)"),
  n("1", "1:01", "unknown", "Noobies", "walks off, marker down", "center", NN, "Noobies 0 – Oilers 0 in progress"),
  n("2", "2:16", "unknown", "Noobies", "walks off, hand raised", "left", NN, "Noobies 0 – Oilers 1 in progress"),
  n("2", "2:25", "unknown", "Clutch City Oilers", "lying on ground under ref", "left", NN + "; Noobies win point", "Noobies 1 – Oilers 1"),
  n("3", "4:31", "unknown (#88)", "#88 Noobies", "hand on head walk-off", "center", NN, "Noobies 1 – Oilers 1 in progress"),
  n("3", "4:37", "unknown", "team unclear", "lying on ground, ref pointing", "far right", NN, "Noobies 1 – Oilers 1 in progress"),
  n("3", "4:42", "unknown", "Noobies", "walks off, marker down", "center right", NN + "; Oilers win point", "Noobies 1 – Oilers 2"),
  n("4", "6:07", "unknown", "Noobies", "walks off (background)", "left", NN, "Noobies 1 – Oilers 2 in progress"),
  n("4", "6:24", "unknown", "Noobies", "walks off looking down", "left", NN + "; Noobies win point", "Noobies 2 – Oilers 2"),
  n("5", "9:30", "unknown (#83)", "#83 Noobies", "shot running, walk-off", "Dorito", NN, "Noobies 2 – Oilers 2 in progress"),
  n("5", "9:33", "unknown", "Noobies", "walks off, marker down", "right", NN + "; Oilers win point", "Noobies 2 – Oilers 3"),
  n("6", "10:39", "unknown", "Clutch City Oilers", "walks off, marker raised (pink pods)", "snake", NN + "; Noobies win point", "Noobies 3 – Oilers 3"),
  n("7", "12:28", "unknown", "team unclear", "lying on ground (background)", "far left", NN + "; Noobies win point", "Noobies 4 – Oilers 3"),
  n("8", "14:21", "unknown", "Noobies", "walks off, marker raised", "center", NN, "Noobies 4 – Oilers 3 in progress"),
  n("8", "14:24", "unknown", "Noobies", "taking mask off", "start box", NN + "; Oilers win point → overtime", "Noobies 4 – Oilers 4"),
  n("9 (OT)", "16:16", "unknown", "Noobies", "walks off, marker down", "center", NN, "Noobies 4 – Oilers 4 in progress (OT)"),
  n("9 (OT)", "16:22", "unknown", "Noobies", "walks off, marker raised", "left", NN + "; Oilers win OT point. PBLeagues agrees: https://pbleagues.com/event/9321/schedule?action=stats&id=4022166", "FINAL Oilers 5 – Noobies 4 (OT)"),
  c("1", "A ~03:25 (clock 14:08)", "unknown", "NY Xtreme", "shot by Jet #1 (commentary only)", "center / clover", CN + "; broadcast cutaway — elim not on camera; Point 1, Aftershock win; ID from commentary", "Aftershock 1 – NYX 0"),
  c("2", "clock 10:37", "unknown", "team unclear", "—", "—", CN + "; broadcast cutaway — elim not on camera; Point 2, NYX win; no elims on camera", "Aftershock 1 – NYX 1"),
  c("3", "A ~12:40", "Clay Hughes", "#27 Chicago Aftershock", "walk-off", "unclear", CN + "; broadcast cutaway — elim not on camera except walk-off; Point 3, Aftershock win", "Aftershock 2 – NYX 1"),
  c("4", "A ~18:27 (clock 9:54)", "Lopez", "#12 NY Xtreme", "walk-off", "unclear", CN + "; broadcast cutaway — elim not on camera except walk-off; Point 4, Aftershock win", "Aftershock 3 – NYX 1"),
  c("5", "B1 ~00:29 / 9:15", "Lackey", "#21 Chicago Aftershock", "pinched", "snake tower", CN, "Aftershock 3 – NYX 1 in progress"),
  c("5", "B1 ~00:43 / 9:07", "Hoskinson", "#42 Chicago Aftershock", "walk-off (unclear)", "Dorito", CN, "Aftershock 3 – NYX 1 in progress"),
  c("5", "B1 ~00:54 / 8:54", "Mason Hinds", "#3 Chicago Aftershock", "bunkered by Hussain #3", "snake 2", CN, "Aftershock 3 – NYX 1 in progress"),
  c("5", "B1 ~00:57 / 8:54", "Hussain", "#3 NY Xtreme", "walk-off (trade/penalty after bunker)", "snake", CN + "; NYX win point", "Aftershock 3 – NYX 2"),
  c("6", "B1 ~04:30 / 8:22", "Josh Taylor Jr", "#13 NY Xtreme", "walk-off", "unclear", CN, "Aftershock 3 – NYX 2 in progress"),
  c("6", "B1 ~04:32 / 8:21", "Hussain", "#3 NY Xtreme", "walk-off", "unclear", CN, "Aftershock 3 – NYX 2 in progress"),
  c("6", "B1 ~04:46 / 8:05", "Demers", "#77 NY Xtreme", "walk-off", "unclear", CN + "; Aftershock win point", "Aftershock 4 – NYX 2"),
  c("7", "B1 ~08:26 / 7:55", "unknown", "team unclear", "shot", "center", CN, "Aftershock 4 – NYX 2 in progress"),
  c("7", "B1 ~08:31 / 7:45", "unknown ×2", "Chicago Aftershock", "break losses + minor penalty (off-cam)", "unclear", CN + "; two Aftershock players in one row; off camera", "Aftershock 4 – NYX 2 in progress"),
  c("7", "B1 ~08:40 / 7:36", "Lopez", "#12 NY Xtreme", "shot (teammate sprinting)", "mid", CN, "Aftershock 4 – NYX 2 in progress"),
  c("7", "B1 ~08:58 / 7:19", "Josh Taylor Jr", "#13 NY Xtreme", "walk-off", "unclear", CN, "Aftershock 4 – NYX 2 in progress"),
  c("7", "B1 ~09:02 / 7:17", "Navarro", "#10 NY Xtreme", "walk-off", "unclear", CN + "; NYX win point", "Aftershock 4 – NYX 3"),
  c("8", "B1 (clock ~7:04)", "Demers", "#77 NY Xtreme", "bunkered by Hughes #27 (B1) / #21 (summary) — conflict", "center", CN + "; B1 transcript truncated mid-point", "Aftershock 4 – NYX 3 in progress"),
  c("8", "B1 (clock ~6:50)", "unknown (multiple)", "team unclear", "break elims (off-cam)", "unclear", CN + "; broadcast cutaway — elim not on camera", "Aftershock 4 – NYX 3 in progress"),
  c("8", "B1 ~14:03", "Clay Hughes", "#27 Chicago Aftershock", "walk-off", "unclear", CN + "; Aftershock win point", "Aftershock 5 – NYX 3"),
  c("9", "B1 ~16:14 / 6:07", "unknown", "team unclear", "shot off break", "unclear", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:29 / 5:52", "unknown", "Chicago Aftershock", "shot", "center / clover", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:31 / 5:52", "Fred Berkley", "#26 NY Xtreme", "shot", "unclear", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:40 / 5:43", "Jet (Jetski)", "#1 Chicago Aftershock", "walk-off", "unclear", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:40 / 5:43", "Hoskinson", "#42 Chicago Aftershock", "walk-off", "unclear", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:51 / 5:33", "Josh Taylor Jr", "#13 NY Xtreme", "shot by Lackey #21 / Hinds #3 snake push", "Dorito 3", CN, "Aftershock 5 – NYX 3 in progress"),
  c("9", "B1 ~16:58", "Stancel (?)", "#16 Chicago Aftershock", "walk-off after buzzer", "unclear", CN + "; Stancel ID tentative; Aftershock win point", "Aftershock 6 – NYX 3"),
  c("10", "B1 ~19:04 / ~4:55", "Hoskinson", "#42 Chicago Aftershock", "shot by Lopez #12 (3-pack)", "snake / tower / back", CN + "; Lopez 3-pack; order within 19:04–19:20 approximate", "Aftershock 6 – NYX 3 in progress"),
  c("10", "B1 ~19:12 / ~4:55", "Jet (Jetski)", "#1 Chicago Aftershock", "shot by Lopez #12 (3-pack)", "snake / tower / back", CN + "; Lopez 3-pack; order within 19:04–19:20 approximate", "Aftershock 6 – NYX 3 in progress"),
  c("10", "B1 ~19:20 / ~4:55", "unknown", "Chicago Aftershock", "shot by Lopez #12 (3-pack)", "snake / tower / back", CN + "; Lopez 3-pack; order within 19:04–19:20 approximate", "Aftershock 6 – NYX 3 in progress"),
  c("10", "B1 ~19:23", "Navarro", "#10 NY Xtreme", "walk-off", "unclear", CN, "Aftershock 6 – NYX 3 in progress"),
  c("10", "B1 ~19:46 / 4:41", "Demers", "#77 NY Xtreme", "walk-off", "unclear", CN + "; NYX win point", "Aftershock 6 – NYX 4"),
  c("11", "B2 (no ts)", "unknown", "Chicago Aftershock", "shot off break", "unclear", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Fred Berkley", "#26 NY Xtreme", "shot", "tower", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Hoskinson", "#42 Chicago Aftershock", "shot", "snake", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Lackey", "#21 Chicago Aftershock", "shot by Demers #77", "unclear", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Demers", "#77 NY Xtreme", "trade with Hinds #3", "unclear", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Mason Hinds", "#3 Chicago Aftershock", "trade with Demers #77", "unclear", CN + "; B2 clip; order per notes", "Aftershock 6 – NYX 4 in progress"),
  c("11", "B2 (no ts)", "Rooney", "#19 Chicago Aftershock", "shot by Taylor #13", "unclear", CN + "; B2 clip; order per notes; NYX win point", "Aftershock 6 – NYX 5"),
  c("12", "B2 (no ts)", "unknown", "Chicago Aftershock", "shot by Demers #77 run-through", "unclear", CN + "; Demers multi-elim run-through", "Aftershock 6 – NYX 5 in progress"),
  c("12", "B2 (no ts)", "unknown", "Chicago Aftershock", "shot by Demers #77 run-through", "unclear", CN + "; Demers multi-elim run-through", "Aftershock 6 – NYX 5 in progress"),
  c("12", "B2 (no ts)", "unknown", "Chicago Aftershock", "shot by Demers #77 run-through", "unclear", CN + "; Demers multi-elim run-through", "Aftershock 6 – NYX 5 in progress"),
  c("12", "B2 (no ts)", "unknown", "Chicago Aftershock", "shot by Demers #77 run-through", "unclear", CN + "; Demers multi-elim run-through", "Aftershock 6 – NYX 5 in progress"),
  c("12", "B2 (no ts)", "unknown (last)", "Chicago Aftershock", "trade (last player)", "unclear", CN + "; notes say 'trade last' — traded NYX player unconfirmed; NYX win point", "Aftershock 6 – NYX 6"),
  c("13", "B2 (no ts)", "Fred Berkley", "#26 NY Xtreme", "shot", "tower", CN + "; B2 clip", "Aftershock 6 – NYX 6 in progress"),
  c("13", "B2 (no ts)", "Lopez", "#12 NY Xtreme", "shot", "Dorito", CN + "; B2 clip", "Aftershock 6 – NYX 6 in progress"),
  c("13", "B2 (no ts)", "Clay Hughes", "#27 Chicago Aftershock", "shot", "Dorito", CN + "; B2 clip", "Aftershock 6 – NYX 6 in progress"),
  c("13", "B2 (no ts)", "Demers", "#77 NY Xtreme", "shot", "snake", CN + "; B2 clip", "Aftershock 6 – NYX 6 in progress"),
  c("13", "B2 (no ts)", "remaining NYX", "NY Xtreme", "concede", "—", CN + "; Aftershock win point", "Aftershock 7 – NYX 6"),
  c("14", "B2 (no ts)", "unknown ×2", "NY Xtreme", "shot off break", "unclear", CN + "; two NYX players in one row", "Aftershock 7 – NYX 6 in progress"),
  c("14", "B2 (no ts)", "Lackey", "#21 Chicago Aftershock", "shot", "unclear", CN, "Aftershock 7 – NYX 6 in progress"),
  c("14", "B2 (no ts)", "Demers", "#77 NY Xtreme", "shot", "unclear", CN, "Aftershock 7 – NYX 6 in progress"),
  c("14", "B2 (no ts)", "Hussain", "#3 NY Xtreme", "pulled (Demers minor penalty)", "—", CN, "Aftershock 7 – NYX 6 in progress"),
  c("14", "B2 (no ts)", "Clay Hughes", "#27 Chicago Aftershock", "MAJOR penalty — playing on", "—", CN, "Aftershock 7 – NYX 6 in progress"),
  c("14", "B2 (no ts)", "remaining Aftershock", "Chicago Aftershock", "wiped", "—", CN + "; NYX win point", "Aftershock 7 – NYX 7"),
  c("15", "B2 (no ts)", "Hoskinson", "#42 Chicago Aftershock", "shot on dive", "clover", CN, "Aftershock 7 – NYX 7 in progress"),
  c("15", "B2 (no ts)", "unknown ×2", "NY Xtreme", "shot by Hinds #3 snake run", "snake", CN + "; two NYX in one row", "Aftershock 7 – NYX 7 in progress"),
  c("15", "B2 (no ts)", "remaining NYX", "NY Xtreme", "concede", "—", CN + "; Aftershock win point", "Aftershock 8 – NYX 7"),
  c("16", "B2 (no ts)", "Demers", "#77 NY Xtreme", "shot after horn", "unclear", CN, "Aftershock 8 – NYX 7 in progress"),
  c("16", "B2 (no ts)", "unknown", "NY Xtreme", "minor penalty", "—", CN, "Aftershock 8 – NYX 7 in progress"),
  c("16", "B2 (no ts)", "NYX (team)", "NY Xtreme", "MAJOR penalty under 60s — penalty point awarded", "—", CN + "; Final per film + PBLeagues https://pbleagues.com/event/9321/schedule?action=stats&id=4022295", "FINAL Aftershock 9 – NYX 7"),
  h("1", "A 00:44", "Ryan Moorhead", "#85 Houston Heat", "shot on break", "Dorito", HN, "Heat 0 – Jungle Cats 0 in progress"),
  h("1", "A 01:11", "Cody Mickowski", "#32 Houston Heat", "shot", "snake", HN, "Heat 0 – Jungle Cats 0 in progress"),
  h("1", "A 01:34", "Andres Ramos Saldana", "#27 Houston Heat", "shot by Dipolito #7", "unclear", HN + "; Jungle Cats win point", "Heat 0 – Jungle Cats 1"),
  h("2", "A 04:27", "unknown", "Atlanta Jungle Cats", "shot", "D-side", HN, "Heat 0 – Jungle Cats 1 in progress"),
  h("2", "A 04:34", "Davis Stephens", "#22 Atlanta Jungle Cats", "shot", "snake", HN, "Heat 0 – Jungle Cats 1 in progress"),
  h("2", "A 04:48", "unknown (≥2)", "Atlanta Jungle Cats", "shot by Saldana #27 through gap", "unclear", HN + "; at least 2 Cats in one row; Heat win point", "Heat 1 – Jungle Cats 1"),
  h("3", "A 10:44", "unknown ×3", "Atlanta Jungle Cats", "shot off break", "unclear", HN + "; 3 Cats in one row; feed returned from Aftershock ~10:38", "Heat 1 – Jungle Cats 1 in progress"),
  h("3", "A 10:55", "remaining Cats", "Atlanta Jungle Cats", "concede", "—", HN + "; Heat win point", "Heat 2 – Jungle Cats 1"),
  h("4", "A 13:33", "unknown", "Atlanta Jungle Cats", "shot off break", "unclear", HN, "Heat 2 – Jungle Cats 1 in progress"),
  h("4", "A 15:13", "Joseph Oller", "#80 Atlanta Jungle Cats", "shot", "snake 3", HN, "Heat 2 – Jungle Cats 1 in progress"),
  h("4", "A 15:25", "Andres Ramos Saldana", "#27 Houston Heat", "shot by Stephens #22", "unclear", HN, "Heat 2 – Jungle Cats 1 in progress"),
  h("4", "A 15:37", "Mikhail Knyazev (Mishka)", "#77 Houston Heat", "shot", "D2", HN, "Heat 2 – Jungle Cats 1 in progress"),
  h("4", "A 16:18", "Cody Mickowski", "#32 Houston Heat", "pinched", "snake", HN + "; Jungle Cats win point", "Heat 2 – Jungle Cats 2"),
  h("5", "A 19:48", "unknown", "Atlanta Jungle Cats", "shot", "D-side", HN, "Heat 2 – Jungle Cats 2 in progress"),
  h("5", "A 19:50", "unknown", "Houston Heat", "shot", "unclear", HN, "Heat 2 – Jungle Cats 2 in progress"),
  h("5", "A 19:57", "Ronny Tyner (Tiner)", "Atlanta Jungle Cats", "shot by Moorhead #85", "Dorito", HN, "Heat 2 – Jungle Cats 2 in progress"),
  h("5", "A 22:45", "unknown", "Atlanta Jungle Cats", "shot by Moorhead #85", "clover", HN + "; Heat win point", "Heat 3 – Jungle Cats 2"),
  h("6", "B before 1:55", "unknown", "Houston Heat", "off-screen", "unclear", HN + "; feed joined mid-point ~1:55", "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B 2:24", "Ronnie Dizon", "#4 Houston Heat", "shot", "tower", HN, "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B 2:26", "Bufton (Austin/Jacob)", "#18 Houston Heat", "shot", "Dorito", HN + "; first name unclear", "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B 2:40", "Andres Ramos Saldana", "#27 Houston Heat", "shot", "center", HN, "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B 2:57", "unknown", "Atlanta Jungle Cats", "shot", "snake", HN, "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B 3:18", "Cody Mickowski", "#32 Houston Heat", "concede", "snake", HN, "Heat 3 – Jungle Cats 2 in progress"),
  h("6", "B buzzer", "Joseph Oller", "#80 Atlanta Jungle Cats", "out at buzzer", "unclear", HN + "; Jungle Cats win point; ties 3-3", "Heat 3 – Jungle Cats 3"),
  h("7", "B 6:34", "unknown", "Atlanta Jungle Cats", "shot", "unclear", HN + "; feed returned from Aftershock ~5:29", "Heat 3 – Jungle Cats 3 in progress"),
  h("7", "B 6:36", "Sam Monville", "#66 Houston Heat", "minor penalty", "—", HN, "Heat 3 – Jungle Cats 3 in progress"),
  h("7", "B 6:37", "Mikhail Knyazev (Mishka)", "#77 Houston Heat", "pulled (penalty)", "—", HN, "Heat 3 – Jungle Cats 3 in progress"),
  h("7", "B 6:39", "unknown", "Atlanta Jungle Cats", "shot", "unclear", HN, "Heat 3 – Jungle Cats 3 in progress"),
  h("7", "B 7:19", "unknown", "Atlanta Jungle Cats", "shot by Moorhead #85", "unclear", HN, "Heat 3 – Jungle Cats 3 in progress"),
  h("7", "B 7:22 (clock 1:08)", "remaining Cats", "Atlanta Jungle Cats", "concede", "—", HN + "; Heat win point. Film reaches 4–3 @1:08 remaining; broadcast never shows final whistle. PBLeagues confirms 4–3: https://pbleagues.com/event/9321/schedule?action=stats&id=4022285", "FINAL Heat 4 – Jungle Cats 3"),
  upi("1", "A 02:20", "unknown (multi)", "Detroit Infamous", "shot by Arnold #5", "unclear", S2N + "; multiple Infamous in one row", "Uprising 0 – Infamous 0 in progress"),
  upi("1", "A 02:22", "remaining Infamous", "Detroit Infamous", "concede", "—", S2N + "; Uprising win point", "Uprising 1 – Infamous 0"),
  upi("2", "A 04:54", "Rob Velez", "Detroit Infamous (#90 per part C)", "shot", "unclear", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 04:57", "Zach Patient", "#28 (part A lists as Uprising; part B/C #88 Infamous)", "shot", "unclear", S2N + "; team/number conflict", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:07", "unknown", "Detroit Infamous", "shot on break", "unclear", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:09", "Nate Schroeder (Shrader)", "#4 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:12", "Sam Silberg", "#19 Detroit Infamous (#13 in part B)", "shot", "unclear", S2N + "; number conflict", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:19", "Graham Arnold", "#5 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:29", "Eaton", "#89 (team unclear — film list mixed)", "shot", "unclear", S2N + "; team conflict", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:42", "Ryan Holland", "#23 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:45", "unknown", "Detroit Infamous", "shot", "snake", S2N + "", "Uprising 1 – Infamous 0 in progress"),
  upi("2", "A 05:52", "unknown", "Detroit Infamous", "shot by Woodward #2", "unclear", S2N + "; Uprising win point", "Uprising 2 – Infamous 0"),
  upi("3", "A 09:45", "Alexander Borromeo", "#8 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 2 – Infamous 0 in progress"),
  upi("3", "A 09:57", "unknown", "Detroit Infamous", "shot", "unclear", S2N + "", "Uprising 2 – Infamous 0 in progress"),
  upi("3", "A 11:26", "unknown", "Detroit Infamous", "shot by Woodward #2", "unclear", S2N + "", "Uprising 2 – Infamous 0 in progress"),
  upi("3", "A 11:40", "Cody Bowen", "#69 Detroit Infamous", "trade with Schroeder #4", "unclear", S2N + "", "Uprising 2 – Infamous 0 in progress"),
  upi("3", "A 11:40", "Nate Schroeder (Shrader)", "#4 Seattle Uprising", "trade with Bowen #69", "unclear", S2N + "", "Uprising 2 – Infamous 0 in progress"),
  upi("3", "A 11:43", "last Infamous", "Detroit Infamous", "shot", "unclear", S2N + "; Uprising win point", "Uprising 3 – Infamous 0"),
  upi("4", "A 16:21", "Nathan (Abou-Hosn?)", "Detroit Infamous", "shot", "unclear", S2N + "", "Uprising 3 – Infamous 0 in progress"),
  upi("4", "A 16:26", "unknown", "Detroit Infamous", "shot", "unclear", S2N + "", "Uprising 3 – Infamous 0 in progress"),
  upi("4", "A 16:33", "Alexander Borromeo", "#8 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 3 – Infamous 0 in progress"),
  upi("4", "A 16:41", "unknown", "Detroit Infamous", "shot", "D-side", S2N + "", "Uprising 3 – Infamous 0 in progress"),
  upi("4", "A 16:46", "unknown", "Detroit Infamous", "shot", "back center", S2N + "", "Uprising 3 – Infamous 0 in progress"),
  upi("4", "A 16:51", "remaining Infamous", "Detroit Infamous", "concede", "—", S2N + "; Uprising win point", "Uprising 4 – Infamous 0"),
  upi("5", "A 20:17", "Kevin \"Cali\" Rudolph", "#7 Detroit Infamous", "shot", "unclear", S2N + "", "Uprising 4 – Infamous 0 in progress"),
  upi("5", "A 20:31", "Cody Bowen", "#69 Detroit Infamous", "shot", "unclear", S2N + "", "Uprising 4 – Infamous 0 in progress"),
  upi("5", "A 20:45", "Eaton", "#89 (team unclear)", "shot", "unclear", S2N + "", "Uprising 4 – Infamous 0 in progress"),
  upi("5", "A 20:54", "Woodward", "#2 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 4 – Infamous 0 in progress"),
  upi("5", "A 21:05", "unknown", "Detroit Infamous", "MAJOR penalty — ends point", "—", S2N + "; Uprising win point; clip A ends 5–0", "Uprising 5 – Infamous 0"),
  upi("6", "B 1:03", "Ben Challenger", "Seattle Uprising", "bunkered / trade with Patient #88", "unclear", S2N + "", "Uprising 5 – Infamous 0 in progress"),
  upi("6", "B 1:03", "Zach Patient", "#88 Detroit Infamous", "trade with Challenger", "unclear", S2N + "", "Uprising 5 – Infamous 0 in progress"),
  upi("6", "B 1:12", "unknown", "Seattle Uprising", "minor penalty pull", "—", S2N + "", "Uprising 5 – Infamous 0 in progress"),
  upi("6", "B 1:59", "remaining Uprising", "Seattle Uprising", "concede", "—", S2N + "; Infamous win point", "Uprising 5 – Infamous 1"),
  upi("7", "B 7:41", "Alexander Borromeo (Bormeo)", "#8 Seattle Uprising", "shot on break", "D-side", S2N + "", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 7:54", "unknown ×2", "Detroit Infamous", "shot", "D-side", S2N + "; two Infamous in one row", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 8:01", "Woodward", "#2 Seattle Uprising", "shot", "D4", S2N + "", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 8:27", "Graham Arnold", "#5 Seattle Uprising", "shot by Patient #88", "snake", S2N + "", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 8:45", "Zach Patient", "#88 Detroit Infamous", "shot by Shrader #4", "unclear", S2N + "", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 9:02", "Nate Schroeder (Shrader)", "#4 Seattle Uprising", "shot on run", "unclear", S2N + "", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 9:06", "Ryan Holland? (unclear)", "Seattle Uprising", "concede", "—", S2N + "; notes read 'Inf concede/Holland?' — Infamous won point, so likely last Uprising (Holland) conceding; unclear", "Uprising 5 – Infamous 1 in progress"),
  upi("7", "B 9:09", "Rob Velez (hangs flag)", "Detroit Infamous", "buzzer — point end", "—", S2N + "; Infamous win point", "Uprising 5 – Infamous 2"),
  upi("8", "B 12:28", "unknown (trade)", "both teams", "trade", "D-side", S2N + "; trade on D-side; players unclear", "Uprising 5 – Infamous 2 in progress"),
  upi("8", "B 12:29", "Cole Scott", "#21 Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 5 – Infamous 2 in progress"),
  upi("8", "B 12:40", "Cody Bowen", "#69 Detroit Infamous", "shot by Challenger", "unclear", S2N + "", "Uprising 5 – Infamous 2 in progress"),
  upi("8", "B 12:44", "unknown", "Detroit Infamous", "shot by Challenger", "unclear", S2N + "", "Uprising 5 – Infamous 2 in progress"),
  upi("8", "B 13:17", "remaining Infamous", "Detroit Infamous", "wiped; Uprising buzzer", "—", S2N + "; Uprising win point", "Uprising 6 – Infamous 2"),
  upi("9", "B 16:30", "Cole Scott", "#21 Seattle Uprising", "shot", "D-side cyclops", S2N + "", "Uprising 6 – Infamous 2 in progress"),
  upi("9", "B 16:37", "Graham Arnold", "#5 Seattle Uprising", "shot", "snake", S2N + "", "Uprising 6 – Infamous 2 in progress"),
  upi("9", "B 16:47", "unknown", "Seattle Uprising", "shot", "unclear", S2N + "", "Uprising 6 – Infamous 2 in progress"),
  upi("9", "B 16:53", "remaining Uprising", "Seattle Uprising", "Infamous buzzer", "—", S2N + "; Infamous win point", "Uprising 6 – Infamous 3"),
  upi("10", "B 21:41", "unknown", "Detroit Infamous", "shot on break", "D-side", S2N + "", "Uprising 6 – Infamous 3 in progress"),
  upi("10", "B 21:47", "Schonauer", "#49 Detroit Infamous", "shot", "snake", S2N + "", "Uprising 6 – Infamous 3 in progress"),
  upi("10", "B 22:19", "Alexander Borromeo (Bormeo)", "#8 Seattle Uprising", "trade with Silberg #13", "unclear", S2N + "", "Uprising 6 – Infamous 3 in progress"),
  upi("10", "B 22:19", "Sam Silberg", "#13 Detroit Infamous (#19 in part A)", "trade with Borromeo", "unclear", S2N + "", "Uprising 6 – Infamous 3 in progress"),
  upi("10", "B 22:36", "remaining Infamous", "Detroit Infamous", "concede", "—", S2N + "; Uprising win point → 7–3", "Uprising 7 – Infamous 3"),
  upi("11", "C ~0:56", "unknown (Infamous)", "Detroit Infamous", "shot by Cole Scott dive", "snake/clover", S2N + "; post-7 point, clock ~2:51; no score change; raw note 'Scott Inf dive snake clover' — direction unclear", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~1:03", "Cody Bowen? / Uprising player (unclear)", "unclear", "shot via Holland gap", "gap", S2N + "; post-7 point, clock ~2:51; no score change; raw note 'Bowen Up by Holland gap' — unclear who is out", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~1:08", "Eaton", "#89 (team unclear)", "shot", "D-side", S2N + "; post-7 point, clock ~2:51; no score change", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~1:10–1:15", "unknown (multi)", "both teams", "kill festival", "unclear", S2N + "; post-7 point, clock ~2:51; no score change; multiple elims in one row", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~1:23–1:34", "Ryan Holland? / Infamous player", "#23 (unclear)", "shot", "D-side", S2N + "; post-7 point, clock ~2:51; no score change; raw note 'Holland #23 Inf D' — unclear", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~2:30", "Rob Velez", "#90 Detroit Infamous", "shot by Borromeo", "snake", S2N + "; post-7 point, clock ~2:51; no score change", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~3:03", "Zach Patient", "#88 Detroit Infamous", "trade with Borromeo", "center", S2N + "; post-7 point, clock ~2:51; no score change", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C ~3:03", "Alexander Borromeo", "#3 per part C (#8 in A/B) Seattle Uprising", "trade with Patient #88", "center", S2N + "; post-7 point, clock ~2:51; no score change; number conflict", "Uprising 7 – Infamous 3 in progress"),
  upi("11", "C @0:24 clock", "—", "—", "time expires (no elims)", "—", S2N + "; Final whistle. PBLeagues confirms 7–3: https://pbleagues.com/event/9321/schedule?action=stats&id=4022286", "FINAL Uprising 7 – Infamous 3"),
  xfc("1", "A 03:20", "Billy Bernacchia", "#21 San Antonio X-Factor (#1 in part B)", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 0 in progress"),
  xfc("1", "A 03:31", "Nico Hyde", "team unclear (XF in A / Canes in B)", "trade", "unclear", S2N + "; team conflict: XF in part A, Canes in part B", "X-Factor 0 – Hurricanes 0 in progress"),
  xfc("1", "A 03:33", "unknown", "CK Hurricanes", "trade with Hyde", "unclear", S2N + "", "X-Factor 0 – Hurricanes 0 in progress"),
  xfc("1", "A 03:38", "Tom Guest", "#7 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 0 in progress"),
  xfc("1", "A 03:54", "Cody Bayless (Bayliss)", "#22 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 0 in progress"),
  xfc("1", "A 03:56", "TJ Danner (Danier)", "#23 San Antonio X-Factor", "concede", "—", S2N + "; Hurricanes win point", "X-Factor 0 – Hurricanes 1"),
  xfc("2", "A ~07:15", "TJ Danner (Danier)", "#23 San Antonio X-Factor", "shot on break", "unclear", S2N + "", "X-Factor 0 – Hurricanes 1 in progress"),
  xfc("2", "A 07:22", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 1 in progress"),
  xfc("2", "A 07:31", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 1 in progress"),
  xfc("2", "A 07:42", "Matt Jackson", "#12 San Antonio X-Factor", "minor penalty + pull", "—", S2N + "", "X-Factor 0 – Hurricanes 1 in progress"),
  xfc("2", "A 08:14", "Colt Roberts", "#45 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 1 in progress"),
  xfc("2", "A 08:17", "Billy Bernacchia", "#21 San Antonio X-Factor", "shot on run-through", "unclear", S2N + "; Hurricanes win point", "X-Factor 0 – Hurricanes 2"),
  xfc("3", "A 13:54", "Nico Hyde", "team unclear", "trade", "snake 3", S2N + "; team conflict: XF in part A, Canes in part B", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 13:56", "unknown", "CK Hurricanes", "trade with Hyde", "snake 3", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 14:01", "unknown", "CK Hurricanes", "shot", "D-side", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 14:24", "Cody Bayless (Bayliss)", "#22 San Antonio X-Factor", "shot on dive", "unclear", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 14:56", "unknown", "CK Hurricanes", "shot by Guest #7", "unclear", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 15:02", "Logan Dyer", "#15 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 15:08", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 0 – Hurricanes 2 in progress"),
  xfc("3", "A 15:10", "remaining Hurricanes", "CK Hurricanes", "wiped", "—", S2N + "; X-Factor win point", "X-Factor 1 – Hurricanes 2"),
  xfc("4", "A 17:58", "Cody Bayless (Bayliss)", "#22 San Antonio X-Factor", "shot on break", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:03", "Drew Bell", "#58 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:09", "unknown", "San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:14", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:23", "unknown", "CK Hurricanes", "shot", "snake", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:43", "Colt Roberts", "#45 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:48", "unknown", "CK Hurricanes", "shot", "D-side", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:55", "unknown", "San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 2 in progress"),
  xfc("4", "A 18:57", "remaining X-Factor", "San Antonio X-Factor", "concede", "—", S2N + "; Hurricanes win point", "X-Factor 1 – Hurricanes 3"),
  xfc("5", "A 21:55", "unknown", "CK Hurricanes", "shot by Guest #7", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:15", "Matt Jackson", "#12 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:23", "Billy Bernacchia", "#21 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:28", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:31", "Colt Roberts", "#45 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:48", "Logan Dyer", "#15 CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 1 – Hurricanes 3 in progress"),
  xfc("5", "A 22:52", "Tom Guest", "#7 San Antonio X-Factor", "shot", "unclear", S2N + "; Hurricanes win point; clip A ends 1–4", "X-Factor 1 – Hurricanes 4"),
  xfc("6", "B 2:58", "Justin Brinkman", "#11 CK Hurricanes", "shot on break", "unclear", S2N + "", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 3:02", "unknown (trade)", "both teams", "trade", "snake", S2N + "", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 3:17", "Cody Bayless", "#22 San Antonio X-Factor", "shot through gap", "unclear", S2N + "", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 3:29", "unknown", "San Antonio X-Factor", "shot", "D-side", S2N + "", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 3:52", "Logan Dyer / Tom Guest (trade?)", "#15 CK Hurricanes / #7 San Antonio X-Factor", "trade (unclear)", "unclear", S2N + "; raw note 'Dyer/Guest trade?'", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 5:39", "unknown", "CK Hurricanes", "shot by Danner #23 pack", "unclear", S2N + "", "X-Factor 1 – Hurricanes 4 in progress"),
  xfc("6", "B 5:46", "remaining Hurricanes", "CK Hurricanes", "out", "—", S2N + "; X-Factor win point", "X-Factor 2 – Hurricanes 4"),
  xfc("7", "B 10:14", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 2 – Hurricanes 4 in progress"),
  xfc("7", "B 11:13", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 2 – Hurricanes 4 in progress"),
  xfc("7", "B 11:16", "remaining Hurricanes", "CK Hurricanes", "X-Factor point", "—", S2N + "; X-Factor win point", "X-Factor 3 – Hurricanes 4"),
  xfc("8", "B 15:02", "Konstantin Fedorov", "#88 CK Hurricanes", "shot by Bernacchia", "unclear", S2N + "", "X-Factor 3 – Hurricanes 4 in progress"),
  xfc("8", "B 15:05", "Billy Bernacchia", "#1 San Antonio X-Factor", "shot by Dyer #15", "unclear", S2N + "", "X-Factor 3 – Hurricanes 4 in progress"),
  xfc("8", "B 15:13", "unknown (multi)", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 3 – Hurricanes 4 in progress"),
  xfc("8", "B 15:24", "unknown", "CK Hurricanes", "shot by Ninios #3", "unclear", S2N + "", "X-Factor 3 – Hurricanes 4 in progress"),
  xfc("8", "B 15:29", "remaining Hurricanes", "CK Hurricanes", "X-Factor point", "—", S2N + "; X-Factor win point; ties 4–4", "X-Factor 4 – Hurricanes 4"),
  xfc("9", "B 19:38", "unknown", "CK Hurricanes", "shot by Danner #23 trap", "unclear", S2N + "", "X-Factor 4 – Hurricanes 4 in progress"),
  xfc("9", "B 19:57", "Colt Roberts", "#45 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 4 – Hurricanes 4 in progress"),
  xfc("9", "B 20:07", "TJ Danner", "#23 San Antonio X-Factor", "minor penalty", "—", S2N + "", "X-Factor 4 – Hurricanes 4 in progress"),
  xfc("9", "B 20:12", "Matt Jackson", "#12 San Antonio X-Factor", "pulled (penalty)", "—", S2N + "", "X-Factor 4 – Hurricanes 4 in progress"),
  xfc("9", "B 20:45", "remaining X-Factor", "San Antonio X-Factor", "concede", "—", S2N + "; Hurricanes win point", "X-Factor 4 – Hurricanes 5"),
  xfc("10", "B 23:52", "Ninios", "#3 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 23:52", "unknown ×2", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 24:35", "Matt Jackson", "#12 San Antonio X-Factor", "shot by Fedorov #88", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 24:41", "Konstantin Fedorov", "#88 CK Hurricanes", "trade with Danner", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 24:41", "TJ Danner", "#23 San Antonio X-Factor", "trade with Fedorov", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 24:45", "Billy Bernacchia", "#1 San Antonio X-Factor", "shot", "unclear", S2N + "", "X-Factor 4 – Hurricanes 5 in progress"),
  xfc("10", "B 24:48", "remaining X-Factor", "San Antonio X-Factor", "concede", "—", S2N + "; Hurricanes win point; clip B ends 4–6", "X-Factor 4 – Hurricanes 6"),
  xfc("11", "C ~4:06", "Tom Guest", "#7 San Antonio X-Factor", "shot", "unclear", S2N + "; clip C opens 4–6, clock ~1:10", "X-Factor 4 – Hurricanes 6 in progress"),
  xfc("11", "C ~4:06", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "; clip C opens 4–6, clock ~1:10", "X-Factor 4 – Hurricanes 6 in progress"),
  xfc("11", "C ~4:15", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "unclear", S2N + "; clip C opens 4–6, clock ~1:10", "X-Factor 4 – Hurricanes 6 in progress"),
  xfc("11", "C ~4:15–4:26", "remaining Hurricanes", "CK Hurricanes", "off-cam", "unclear", S2N + "; clip C opens 4–6, clock ~1:10", "X-Factor 4 – Hurricanes 6 in progress"),
  xfc("11", "C ~4:26", "—", "CK Hurricanes", "Ninios #3 buzzer — point end", "—", S2N + "; X-Factor win point", "X-Factor 5 – Hurricanes 6"),
  xfc("12", "C ~8:16/8:19", "unknown", "CK Hurricanes", "shot by Bernacchia", "tower/door", S2N + "", "X-Factor 5 – Hurricanes 6 in progress"),
  xfc("12", "C ~8:24", "Konstantin Fedorov", "#88 CK Hurricanes", "pinched", "unclear", S2N + "", "X-Factor 5 – Hurricanes 6 in progress"),
  xfc("12", "C ~8:27", "unknown", "CK Hurricanes", "shot", "unclear", S2N + "", "X-Factor 5 – Hurricanes 6 in progress"),
  xfc("12", "C ~8:28", "unknown", "CK Hurricanes", "minor penalty pull", "—", S2N + "", "X-Factor 5 – Hurricanes 6 in progress"),
  xfc("12", "C ~8:35", "unknown", "CK Hurricanes", "shot by Guest #7", "unclear", S2N + "", "X-Factor 5 – Hurricanes 6 in progress"),
  xfc("12", "C ~8:38", "—", "CK Hurricanes", "Guest #7 buzzer — point end", "—", S2N + "; X-Factor win point under a minute; ties 6–6", "X-Factor 6 – Hurricanes 6"),
  xfc("13", "C @0:05 clock", "—", "—", "time expires (no elims)", "—", S2N + "; Regulation ends 6–6 → OT", "X-Factor 6 – Hurricanes 6"),
  xfc("OT", "C ~14:04", "Aaron Brown", "#56 CK Hurricanes", "shot", "D-side", S2N + "; OT 3v3", "X-Factor 6 – Hurricanes 6 in progress"),
  xfc("OT", "C ~14:08", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "center", S2N + "; OT 3v3", "X-Factor 6 – Hurricanes 6 in progress"),
  xfc("OT", "C ~14:15", "Logan Dyer", "#15 CK Hurricanes", "shot", "snake", S2N + "; OT 3v3", "X-Factor 6 – Hurricanes 6 in progress"),
  xfc("OT", "C ~14:24", "—", "CK Hurricanes", "Danner #23 buzzer — OT win", "—", S2N + "; OT 3v3. PBLeagues confirms 7–6: https://pbleagues.com/event/9321/schedule?action=stats&id=4022296", "FINAL X-Factor 7 – Hurricanes 6 (OT)"),
  dmj("1", "A 1:30", "unknown", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 0 – Jungle Cats 0 in progress"),
  dmj("1", "A 1:57", "Blaine", "#90 Atlanta Jungle Cats", "minor penalty", "unclear", S3N + "", "Damage 0 – Jungle Cats 0 in progress"),
  dmj("1", "A 2:04", "Oller", "#3 Atlanta Jungle Cats", "pulled (penalty)", "unclear", S3N + "", "Damage 0 – Jungle Cats 0 in progress"),
  dmj("1", "A 2:38", "McGowan", "#5 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 0 – Jungle Cats 0 in progress"),
  dmj("1", "A 2:40", "Ronny Tiner (Tyner)", "#32 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 0 – Jungle Cats 0 in progress"),
  dmj("1", "A 3:13", "Davis Stephens (Stevens)", "#22 Atlanta Jungle Cats", "shot by Edwards", "unclear", S3N + "; Damage win point", "Damage 1 – Jungle Cats 0"),
  dmj("2", "A 5:58", "Blaine", "#90 Atlanta Jungle Cats", "shot by Goldman (Mouse)", "unclear", S3N + "", "Damage 1 – Jungle Cats 0 in progress"),
  dmj("2", "A 6:03", "McGowan", "#5 Atlanta Jungle Cats", "shot by Goldman (Mouse)", "unclear", S3N + "", "Damage 1 – Jungle Cats 0 in progress"),
  dmj("2", "A 6:04", "Alex Goldman (Mouse)", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 1 – Jungle Cats 0 in progress"),
  dmj("2", "A 6:24", "Ronny Tiner (Tyner)", "#32 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 1 – Jungle Cats 0 in progress"),
  dmj("2", "A 6:37", "Oller", "#3 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 1 – Jungle Cats 0 in progress"),
  dmj("2", "A 6:40", "Davis Stephens (Stevens)", "#22 Atlanta Jungle Cats", "concede", "unclear", S3N + "; Damage win point", "Damage 2 – Jungle Cats 0"),
  dmj("3", "A 9:57", "Alex Goldman (Mouse)", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 2 – Jungle Cats 0 in progress"),
  dmj("3", "A 10:04", "Horn", "#16 Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 2 – Jungle Cats 0 in progress"),
  dmj("3", "A 12:12", "Chavez", "#84 Tampa Bay Damage", "bunkered", "unclear", S3N + "", "Damage 2 – Jungle Cats 0 in progress"),
  dmj("3", "A 12:13", "unknown", "Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 2 – Jungle Cats 0 in progress"),
  dmj("3", "A 12:25", "remaining Cats", "Atlanta Jungle Cats", "concede", "unclear", S3N + "; Damage win point", "Damage 3 – Jungle Cats 0"),
  dmj("4", "A 13:21", "Blaine", "#90 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 3 – Jungle Cats 0 in progress"),
  dmj("4", "A 13:21", "unknown", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 3 – Jungle Cats 0 in progress"),
  dmj("4", "A 14:52", "unknown ×2", "Tampa Bay Damage", "shot", "unclear", S3N + "; two Damage in one row", "Damage 3 – Jungle Cats 0 in progress"),
  dmj("4", "A 14:55", "Davis Stephens (Stevens)", "#22 Atlanta Jungle Cats", "shot by Goldman (Mouse)", "unclear", S3N + "", "Damage 3 – Jungle Cats 0 in progress"),
  dmj("4", "A 14:57", "Oller", "#3 Atlanta Jungle Cats", "shot by Goldman (Mouse)", "unclear", S3N + "", "Damage 3 – Jungle Cats 0 in progress"),
  dmj("4", "A 15:01", "Alex Goldman (Mouse)", "Tampa Bay Damage", "MAJOR penalty", "unclear", S3N + "; Damage win point", "Damage 4 – Jungle Cats 0"),
  dmj("5", "A 22:08–22:24", "unknown ×3", "Atlanta Jungle Cats", "shot", "unclear", S3N + "; three Cats in one row", "Damage 4 – Jungle Cats 0 in progress"),
  dmj("5", "A 22:31", "remaining Cats", "Atlanta Jungle Cats", "concede", "unclear", S3N + "; Damage win point; Part A ends; film shows only 5 Damage points but part B joins at 6–2 — one Damage + two Cats points not on film", "Damage 5 – Jungle Cats 0"),
  dmj("6", "B 3:32", "Marcello Margott", "#33 Tampa Bay Damage", "shot", "unclear", S3N + "; part B joins ~3:28 at Damage 6–2, clock 6:48", "Damage 6 – Jungle Cats 2 in progress"),
  dmj("6", "B 3:37", "Busiere", "#7 Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 2 in progress"),
  dmj("6", "B 3:50", "Brown", "Tampa Bay Damage", "shot by Tiner #32", "unclear", S3N + "", "Damage 6 – Jungle Cats 2 in progress"),
  dmj("6", "B 3:52", "Smith", "#18 Tampa Bay Damage", "shot by Tiner #32", "unclear", S3N + "", "Damage 6 – Jungle Cats 2 in progress"),
  dmj("6", "B 3:54", "unknown", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 2 in progress"),
  dmj("6", "B ~3:55", "—", "Atlanta Jungle Cats", "Tiner #32 buzzer — point end", "unclear", S3N + "; Jungle Cats win point", "Damage 6 – Jungle Cats 3"),
  dmj("7", "B 7:48", "McGowan", "#5 Atlanta Jungle Cats", "pulled (penalty)", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 8:01/8:03", "unknown ×2", "Tampa Bay Damage", "walked", "unclear", S3N + "; two Damage in one row", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 8:40", "unknown", "Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 8:56", "Jacob Edwards", "#22 Tampa Bay Damage", "shot by Tiner #32", "unclear", S3N + "; Damage roster has Edwards #31 on Finals rows — number conflict", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 10:39", "Busiere", "#7 Tampa Bay Damage", "shot by Stephens #22", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 10:42", "Marcello Margott", "#33 Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 10:46", "Alex Goldman (Mouse)", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B 10:50", "Oller", "#3 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 6 – Jungle Cats 3 in progress"),
  dmj("7", "B ~10:51", "—", "Tampa Bay Damage", "Stephens #22 buzzer — point end", "unclear", S3N + "; Jungle Cats win point", "Damage 6 – Jungle Cats 4"),
  dmj("8", "B 14:18–14:34", "unknown ×4 + Ronny Tiner", "Atlanta Jungle Cats", "break wipe", "unclear", S3N + "; Damage win point; Cats wiped incl. Tiner #32", "Damage 7 – Jungle Cats 4"),
  dmj("9", "B 16:51", "Blaine", "#90 Atlanta Jungle Cats", "trade with Smith #18", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 16:53", "Smith", "#18 Tampa Bay Damage", "trade with Blaine #90", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 16:55", "McGowan", "#5 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 17:06", "Oller", "#3 Atlanta Jungle Cats", "pulled (penalty)", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 17:08", "Davis Stephens (Stevens)", "#22 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 17:13", "Ronny Tiner (Tyner)", "#32 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B 17:21", "unknown", "Tampa Bay Damage", "shot", "unclear", S3N + "", "Damage 7 – Jungle Cats 4 in progress"),
  dmj("9", "B ~17:25 (clock ~0:45)", "—", "Atlanta Jungle Cats", "Damage buzzer — point end", "unclear", S3N + "; Damage win point", "Damage 8 – Jungle Cats 4"),
  dmj("10", "B 18:16/18:18", "unknown ×2", "Atlanta Jungle Cats", "shot off break", "unclear", S3N + "; two Cats in one row", "Damage 8 – Jungle Cats 4 in progress"),
  dmj("10", "B 18:20", "Blaine", "#90 Atlanta Jungle Cats", "MAJOR penalty", "unclear", S3N + "", "Damage 8 – Jungle Cats 4 in progress"),
  dmj("10", "B 18:22", "unknown (collateral)", "Atlanta Jungle Cats", "pulled (Blaine major collateral)", "unclear", S3N + "", "Damage 8 – Jungle Cats 4 in progress"),
  dmj("10", "B 18:27", "Ronny Tiner (Tyner)", "#32 Atlanta Jungle Cats", "shot", "unclear", S3N + "", "Damage 8 – Jungle Cats 4 in progress"),
  dmj("10", "B ~20:47", "—", "Atlanta Jungle Cats", "Damage buzzer — point end", "unclear", S3N + "; Damage win point; PBLeagues confirms 9–4: https://pbleagues.com/event/9321/schedule?action=stats&id=4022287", "FINAL Damage 9 – Jungle Cats 4"),
  xfa("? (1v1)", "A ~5:10", "Hoskinson", "#42 Chicago Aftershock", "shot by Meter Ninios XF (1v1, inadvertent horn)", "Dorito", FN + "; XF point; commentary AS still lead ~3–2", "AS ~3 – XF ~2"),
  xfa("?", "A ~8:40", "Cody Bayless", "San Antonio X-Factor", "shot off break / lane", "break lane", FN, "in progress"),
  xfa("?", "A ~8:44", "Billy Bernacchia", "#21 San Antonio X-Factor", "trade with Lackey AS", "snake", FN, "in progress"),
  xfa("?", "A ~8:44", "Lackey", "Chicago Aftershock", "trade with Bernacchia XF", "snake", FN, "in progress"),
  xfa("?", "A ~8:48", "unknown", "Chicago Aftershock", "shot", "Dorito", FN, "in progress"),
  xfa("?", "A ~9:07", "TJ Danner", "San Antonio X-Factor", "shot by Jet AS", "Dorito", FN, "in progress"),
  xfa("?", "A ~9:11", "Tom Guest", "#7 San Antonio X-Factor", "concede (Coach Ryan Brand) — Guest #7 vs Hinds #91", "snake", FN + "; Aftershock point", "AS point"),
  xfa("?", "B open", "Hoskinson", "#42 Chicago Aftershock", "walks off (pairing unclear)", "unclear", FN + "; Mixed open; may belong to Heat/Up feed point", "unclear"),
  xfa("? (XF win)", "B (no ts)", "Billy Bernacchia", "San Antonio X-Factor", "shot", "unclear", FN, "in progress"),
  xfa("? (XF win)", "B (no ts)", "LJ Guess", "San Antonio X-Factor", "shot", "unclear", FN, "in progress"),
  xfa("? (XF win)", "B (no ts)", "unknown (AS outs)", "Chicago Aftershock", "shot", "unclear", FN + "; notes list unspecified AS outs", "in progress"),
  xfa("? (XF win)", "B (no ts)", "TJ Danner", "San Antonio X-Factor", "trade with Hinds #03 AS", "unclear", FN, "in progress"),
  xfa("? (XF win)", "B (no ts)", "Mason Hinds", "#03 Chicago Aftershock", "shot by Colt Roberts XF (trade w/ Danner)", "unclear", FN, "in progress"),
  xfa("? (XF win)", "B (no ts)", "Hoskinson", "#42 Chicago Aftershock", "shot", "unclear", FN + "; XF wins point", "XF 2 – AS 4? (inferred)"),
  xfa("XF 2–AS 5", "B @6:51 clock", "unknown ×2", "San Antonio X-Factor", "shot off break", "unclear", FN + "; two XF + two AS on break", "in progress"),
  xfa("XF 2–AS 5", "B @6:51 clock", "unknown ×2", "Chicago Aftershock", "shot off break", "unclear", FN, "in progress"),
  xfa("XF 2–AS 5", "B (no ts)", "Meaters Ninios", "San Antonio X-Factor", "shot", "unclear", FN, "in progress"),
  xfa("XF 2–AS 5", "B (no ts)", "TJ Danner", "San Antonio X-Factor", "shot", "unclear", FN, "in progress"),
  xfa("XF 2–AS 5", "B (no ts)", "Cody Bayless", "San Antonio X-Factor", "shot", "unclear", FN, "in progress"),
  xfa("XF 2–AS 5", "B (no ts)", "unknown", "Chicago Aftershock", "shot", "unclear", FN, "in progress"),
  xfa("XF 2–AS 5", "B @5:09 clock", "Colt Roberts", "#45 San Antonio X-Factor", "concede", "unclear", FN + "; Aftershock point", "AS 6 – XF 2"),
  xfa("XF 2–AS 6 (conflict)", "B @1:37 clock", "San Monville", "#66 San Antonio X-Factor (listed XF; roster has Monville #66 Heat — verify)", "shot", "unclear", FN + "; SCORE CONFLICT: watcher said XF 3–AS 7 @0:36; chunk C opens AS 6–2 (prefer C)", "in progress"),
  xfa("XF 2–AS 6 (conflict)", "B (no ts)", "Andres Saldana", "#27 San Antonio X-Factor (listed XF; roster has Saldana #27 Heat — verify)", "trade with Ben Challenger AS", "unclear", FN, "in progress"),
  xfa("XF 2–AS 6 (conflict)", "B (no ts)", "Ben Challenger", "Chicago Aftershock", "trade with Saldana", "unclear", FN + "; Challenger previously listed Uprising — verify", "in progress"),
  xfa("XF 2–AS 6 (conflict)", "B (no ts)", "Brandon Holland", "San Antonio X-Factor", "shot on run-through", "run-through", FN, "in progress"),
  xfa("XF 2–AS 6 (conflict)", "B @0:36 clock", "remaining AS", "Chicago Aftershock", "concede", "—", FN + "; Watcher: XF 3–AS 7; conflicts with C", "unclear (conflict)"),
  xfa("AS 6–2", "C ~0:56 (clock 5:00)", "Billy Bernacchia", "San Antonio X-Factor", "shot by Clay Hughes AS", "snake", FN, "in progress"),
  xfa("AS 6–2", "C ~1:11", "Nico", "San Antonio X-Factor", "shot by Clay Hughes AS", "center", FN, "in progress"),
  xfa("AS 6–2", "C ~1:23", "Cody Bayless", "#6 San Antonio X-Factor", "shot", "Dorito 3", FN, "in progress"),
  xfa("AS 6–2", "C ~1:51", "unknown", "San Antonio X-Factor", "shot", "back center", FN, "in progress"),
  xfa("AS 6–2", "C ~2:01", "TJ Danner", "#22 San Antonio X-Factor", "shot", "center/snake", FN + "; Aftershock point", "AS 7 – XF 2"),
  xfa("AS 7–2", "C ~4:28–4:30 (clock 3:31)", "unknown", "San Antonio X-Factor", "shot off break", "unclear", FN + "; three XF off break", "in progress"),
  xfa("AS 7–2", "C ~4:28–4:30 (clock 3:31)", "unknown", "San Antonio X-Factor", "shot off break", "unclear", FN + "; three XF off break", "in progress"),
  xfa("AS 7–2", "C ~4:28–4:30 (clock 3:31)", "unknown", "San Antonio X-Factor", "shot off break", "unclear", FN + "; three XF off break", "in progress"),
  xfa("AS 7–2", "C ~4:51", "Rooney", "#19 Chicago Aftershock", "shot by Tom Guest XF", "snake", FN, "in progress"),
  xfa("AS 7–2", "C ~4:58", "Tom Guest", "#7 San Antonio X-Factor", "shot", "center", FN, "in progress"),
  xfa("AS 7–2", "C 5:08", "—", "San Antonio X-Factor", "Clay Hughes #27 AS buzzer — mercy", "—", FN + "; Mercy ends game", "FINAL Chicago Aftershock 8 – San Antonio X-Factor 2 (mercy)"),
  uph("?", "A ~0:08", "Cody Mickowski", "#22 Houston Heat", "shot", "snake line", FN, "in progress"),
  uph("?", "A ~0:23", "unknown", "Houston Heat", "shot", "center", FN, "in progress"),
  uph("?", "A ~0:38", "Alex Borromeo", "Seattle Uprising", "shot by Dezon Heat on run", "Dorito run", FN, "in progress"),
  uph("?", "A ~0:42", "Ronnie Dezon", "#4 Houston Heat", "overshot", "center", FN, "in progress"),
  uph("?", "A ~0:46", "George Saldana", "#8 Houston Heat", "concede", "—", FN + "; Uprising point (two-point lead per commentary)", "Uprising +2"),
  uph("?", "A ~11:07", "Ryan Moorhead", "Houston Heat", "shot", "Dorito", FN, "in progress"),
  uph("?", "A ~11:32", "Ronnie Dezon", "#4 Houston Heat", "MAJOR on run-through trade with Sam", "run-through", FN, "in progress"),
  uph("?", "A ~11:36", "Sam", "Seattle Uprising", "trade with Dezon", "run-through", FN, "in progress"),
  uph("?", "A ~11:40", "George Saldana", "#8 Houston Heat", "penalty pull (major collateral)", "—", FN + "; Chunk ends mid-point; Bufton #18 alive in snake", "in progress"),
  uph("?", "B open", "Bufton", "#18 Houston Heat", "pull", "unclear", FN + "; Mixed open (pairing unclear)", "unclear"),
  uph("Up 6–Heat 2", "B @1:38 clock", "Bufton", "Houston Heat", "shot", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Howe", "Seattle Uprising", "shot", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Woodward", "Seattle Uprising", "pull", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Nate Schroeder", "Seattle Uprising", "trade with Ronnie Heat", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Ronnie (Dezon)", "Houston Heat", "trade with Schroeder", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Holland", "#99 Seattle Uprising", "shot", "unclear", FN, "in progress"),
  uph("Up 6–Heat 2", "B (no ts)", "Eaton", "Seattle Uprising", "shot by Mishka Heat", "unclear", FN + "; Heat point", "Uprising 6 – Heat 3"),
  uph("Up 6–Heat 3", "C cutaway", "Mishka Knyazev", "Houston Heat", "shot", "unclear", FN + "; Broadcast cutaway during XF/AS chunk C", "in progress"),
  uph("Up 6–Heat 3", "C cutaway", "—", "Houston Heat", "Saldana #27 Uprising buzzer (listed Uprising; verify jersey/team)", "—", FN + "; Final confirmed on broadcast cutaway", "FINAL Seattle Uprising 7 – Houston Heat 3"),
  // Atlanta Jungle Cats vs Detroit Infamous (Fri dual-feed)
  jci("1 (0–0)", "C (no ts)", "Ryan Hall", "Atlanta Jungle Cats", "trade with Velez", "unclear", "chunk C (early)", "in progress"),
  jci("1 (0–0)", "C (no ts)", "Velez", "#88 Detroit Infamous", "trade with Hall", "unclear", "chunk C; #88 conflict: Patient also listed #88 (later #98)", "in progress"),
  jci("1 (0–0)", "C (no ts)", "Pate", "#29 Detroit Infamous", "trade", "unclear", "chunk C; TEAM CONFLICT: chunk D commentary calls Aaron Pate Cats #2; #29 also listed for Silberberg", "in progress"),
  jci("1 (0–0)", "C (no ts)", "Bowan", "#4 Atlanta Jungle Cats", "shot by Pate", "unclear", "chunk C; Bowan #4 Cats vs Bowen #69 Inf — possible name conflict", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Bowan", "#4 Atlanta Jungle Cats", "shot", "unclear", "chunk C", "in progress"),
  jci("3 (0–1)", "C (no ts)", "unknown", "Atlanta Jungle Cats", "shot", "unclear", "chunk C", "in progress"),
  jci("3 (0–1)", "C (no ts)", "unknown", "Detroit Infamous", "shot", "unclear", "chunk C", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Oller", "#3 Atlanta Jungle Cats", "trade with Cali Kevin", "unclear", "chunk C", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Cali Kevin", "Detroit Infamous", "trade with Oller", "unclear", "chunk C", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Dippolito (D'Ippolito)", "Detroit Infamous", "shot", "unclear", "chunk C; final notes list D'Ippolito under Cats too — team conflict", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Silberberg (Silberg)", "Detroit Infamous", "shot", "unclear", "chunk C; final notes give #29 (also Pate's #) — verify", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Pate", "#29 Detroit Infamous", "pull", "—", "chunk C; team conflict (see P1)", "in progress"),
  jci("3 (0–1)", "C (no ts)", "Jamros (Jamroz)", "Atlanta Jungle Cats", "pull", "—", "chunk C", "in progress"),
  jci("5 (0–1)", "C (no ts)", "Silberberg", "Detroit Infamous", "break penalty", "—", "chunk C; announcer says score should be 2–0", "in progress"),
  jci("5 (0–1)", "C (no ts)", "Reeser", "Detroit Infamous", "penalty (body)", "—", "chunk C", "in progress"),
  jci("5 (0–1)", "C (no ts)", "unknown", "Detroit Infamous", "shot", "unclear", "chunk C", "in progress"),
  jci("5 (0–1)", "C (no ts)", "Patient", "#88 Detroit Infamous", "trade with Povilaitis", "unclear", "chunk C; JERSEY CONFLICT #88 (Velez) vs #98 in final notes", "in progress"),
  jci("5 (0–1)", "C (no ts)", "Povilaitis (Povelaitis)", "#808 Atlanta Jungle Cats", "trade with Patient", "unclear", "chunk C", "in progress"),
  jci("5 (0–1)", "C (no ts)", "unknown", "Atlanta Jungle Cats", "shot by Velez", "unclear", "chunk C", "in progress"),
  jci("5 (0–1)", "C (no ts)", "Velez", "#88 Detroit Infamous", "shot by McGowan/Stevens", "unclear", "chunk C", "1–1 (graphic @9:11 in A)"),
  jci("1–1", "A @9:11 clock", "Bowen", "#69 Detroit Infamous", "shot", "mid", "chunk A; two mid", "in progress"),
  jci("1–1", "A (no ts)", "McGowan", "#5 Atlanta Jungle Cats", "shot", "unclear", "chunk A; Cats concede", "Infamous 2 – Jungle Cats 1"),
  jci("Inf 2–1", "A (no ts)", "Reeser", "Detroit Infamous", "shot by Stevens #22", "unclear", "chunk A; Inf Dorito3 pull", "in progress"),
  jci("Inf 2–1", "A (no ts)", "Velez", "#88 Detroit Infamous", "shot after 3-pack", "center", "chunk A", "in progress"),
  jci("Inf 2–1", "A (no ts)", "Povilaitis", "#808 Atlanta Jungle Cats", "major penalty", "—", "chunk A; Infamous point", "Infamous 3 – Jungle Cats 1"),
  jci("Inf 3–1", "D ~5:10 clock", "unknown ×4+", "Atlanta Jungle Cats", "wipe off break (≥4 Cats)", "break", "chunk D; one row for multi-elim wipe, count ≥4", "Infamous 4 – Jungle Cats 1"),
  jci("Inf 4–1", "D @4:56 clock", "unknown", "Detroit Infamous", "shot by Cats player (called Velez — team conflict)", "break", "chunk D", "in progress"),
  jci("Inf 4–1", "D (no ts)", "unknown", "Detroit Infamous", "walked", "unclear", "chunk D", "in progress"),
  jci("Inf 4–1", "D (no ts)", "unknown", "Atlanta Jungle Cats", "trade (Inf minor penalty)", "Dorito", "chunk D; Cats Dorito run-down; Aaron Pate (Cats #2 per Bri Walz) prior major — conflicts with Pate Inf #29", "in progress"),
  jci("Inf 4–1", "D (no ts)", "unknown", "Detroit Infamous", "minor penalty trade", "—", "chunk D; D-full notes give conflicting progressions (Inf 5–2 / 6–2 vs frames Inf 5–Cats 4); main notes used", "Infamous 5 – Jungle Cats 2"),
  jci("Inf 5–2", "E (no ts)", "—", "Detroit Infamous", "Oller #3 Cats buzzer", "—", "chunk E; Cats point", "Infamous 5 – Jungle Cats 3"),
  jci("Inf 5–3", "E (no ts)", "Patient", "#98 Detroit Infamous", "major penalty (playing on)", "—", "chunk E; swings point to Cats; #98 vs #88 conflict", "Infamous 5 – Jungle Cats 4"),
  jci("FINAL", "E clock 0:11", "—", "—", "clock-out", "—", "Inf holds; source YT 40IX7cok6Vk", "FINAL Detroit Infamous 5 – Atlanta Jungle Cats 4"),
  // CK Hurricanes vs New York Xtreme (Fri dual-feed)
  cnx("2 (0–0)", "C @14:48 clock", "Justin Brinkman", "CK Hurricanes", "shot", "snake", "chunk C; TEAM CONFLICT: chunk D lists Brinkman #8 NYX (roster: Canes #11)", "in progress"),
  cnx("2 (0–0)", "C (no ts)", "unknown ×2", "CK Hurricanes", "early elims (2 Canes)", "unclear", "chunk C", "in progress"),
  cnx("2 (0–0)", "C (no ts)", "unknown", "New York Xtreme (NY Xtreme)", "minor penalty pull", "—", "chunk C", "in progress"),
  cnx("2 (0–0)", "C (no ts)", "Harris Husain", "#3 New York Xtreme (NY Xtreme)", "shot by Dyer", "mid", "chunk C; shooter Dyer listed NYX in C/A notes but roster has Logan Dyer Canes #15 — team conflict", "in progress"),
  cnx("2 (0–0)", "C (no ts)", "Josh Taylor", "#13 New York Xtreme (NY Xtreme)", "shot by Fedorov", "Dorito", "chunk C; JERSEY CONFLICT Taylor #13 vs #9 (chunk D)", "Hurricanes 1 – NYX 0"),
  cnx("4 (1–0)", "C (no ts)", "Harris Husain", "#3 New York Xtreme (NY Xtreme)", "arm break", "unclear", "chunk C", "in progress"),
  cnx("4 (1–0)", "C (no ts)", "Navarro", "New York Xtreme (NY Xtreme)", "shot", "Dorito3", "chunk C; TEAM CONFLICT: chunk D lists Navarro #10 Canes", "in progress"),
  cnx("4 (1–0)", "C (no ts)", "Berkley (Berkeley)", "New York Xtreme (NY Xtreme)?", "shot", "unclear", "chunk C listed NYX; TEAM CONFLICT: A & D list Berkeley Canes #20", "in progress"),
  cnx("4 (1–0)", "C (no ts)", "Josh Taylor", "#13 New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk C; #13 vs #9", "Hurricanes 2 – NYX 0"),
  cnx("6 (2–0)", "C (no ts)", "unknown", "New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk C", "in progress"),
  cnx("6 (2–0)", "C (no ts)", "Harris Husain", "#3 New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk C", "in progress"),
  cnx("6 (2–0)", "C (no ts)", "Michael Brown", "#56 CK Hurricanes", "shot", "mid", "chunk C; roster has Aaron Brown #56 — first-name conflict", "Hurricanes 2 – NYX 0 (graphic @11:47 in A)"),
  cnx("Canes 2–0", "A ~0:05–0:07", "Demers", "#77 New York Xtreme (NY Xtreme)", "shot after 3-pack (buzzer)", "snake/mid", "chunk A; NYX point", "Hurricanes 2 – NYX 1"),
  cnx("Canes 2–1", "A @11:28 clock", "unknown", "CK Hurricanes", "break out", "unclear", "chunk A", "in progress"),
  cnx("Canes 2–1", "A (no ts)", "Josh Taylor", "New York Xtreme (NY Xtreme)", "shot", "Dorito2", "chunk A", "in progress"),
  cnx("Canes 2–1", "A (no ts)", "unknown ×2", "CK Hurricanes", "shot", "tower", "chunk A; 2 Canes tower", "in progress"),
  cnx("Canes 2–1", "A (no ts)", "Demers", "#77 New York Xtreme (NY Xtreme)", "shot by Berkeley", "unclear", "chunk A", "in progress"),
  cnx("Canes 2–1", "A (no ts)", "unknown", "#20 New York Xtreme (NY Xtreme)?", "shot", "unclear", "chunk A; #20 listed NYX but Berkley #20 is Canes in D — conflict", "in progress"),
  cnx("Canes 2–1", "A (no ts)", "Harris Husain", "#3 New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk A; NYX still won point per later graphic", "Hurricanes 2 – NYX 2"),
  cnx("2–2", "A @9:31 clock", "unknown ×2", "CK Hurricanes", "shot", "unclear", "chunk A", "in progress"),
  cnx("2–2", "A (no ts)", "Martinez", "New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk A", "in progress"),
  cnx("2–2", "A (no ts)", "Logan Dyer", "New York Xtreme (NY Xtreme)?", "shot", "unclear", "chunk A lists NYX; roster Canes #15 — TEAM CONFLICT", "in progress"),
  cnx("2–2", "A @8:32 clock", "Harris Husain", "#3 New York Xtreme (NY Xtreme)", "shot", "unclear", "chunk A ends mid-point", "in progress"),
  cnx("2–2", "D @8:15 clock", "Berkley", "#20 CK Hurricanes", "shot", "snake", "chunk D; back out", "in progress"),
  cnx("2–2", "D @5:15 clock", "Josh Taylor", "#9 New York Xtreme (NY Xtreme)", "shot", "Dorito-snake", "chunk D; #9 vs #13", "in progress"),
  cnx("2–2", "D @4:40 clock", "Navarro", "#10 CK Hurricanes", "shot by Brinkman #8 NYX", "center", "chunk D; Canes concede; Navarro/Brinkman team flipped vs chunk C", "Hurricanes 2 – NYX 3"),
  cnx("NYX 3–2", "D @4:17 clock", "Josh Taylor", "#9 New York Xtreme (NY Xtreme)", "shot", "break", "chunk D", "in progress"),
  cnx("NYX 3–2", "D @3:28 clock", "Berkley", "#20 CK Hurricanes", "shot", "Dorito", "chunk D", "in progress"),
  cnx("NYX 3–2", "D @3:10 clock", "Navarro", "#10 CK Hurricanes", "shot", "unclear", "chunk D", "in progress"),
  cnx("NYX 3–2", "D @3:04 clock", "Kaito Warner Jr", "#53 CK Hurricanes", "shot", "Dorito", "PBLeagues name confirmed; #53 film-only VERIFY. chunk D; later Canes reach 3–3 (elims not logged)", "3–3"),
  cnx("3–3", "D-full (no ts)", "—", "CK Hurricanes", "Canes win point", "—", "chunk D-full; no individual elims logged", "Hurricanes 4 – NYX 3"),
  cnx("Canes 4–3", "D-full (no ts)", "—", "CK Hurricanes", "Canes win point", "—", "chunk D-full; possibly 5–3 — verify", "Hurricanes 5 – NYX 3 (soft)"),
  cnx("FINAL", "E (no ts)", "—", "—", "final", "—", "score TBD — Hurricanes win confirmed by commentary/interview (Fedorov postgame). PBLeagues lists cross-paired scores; verify", "FINAL CK Hurricanes win (score TBD)"),
  // Tampa Bay Damage vs Houston Heat (Fri dual-feed)
  dmh("1", "A @15:00 clock", "Moorhead", "#9 Houston Heat", "shot by Edwards", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Saldana", "#27 Houston Heat", "trade with Goldman", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Alex Goldman", "#89 Tampa Bay Damage", "trade with Saldana", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Edwards", "#11 Tampa Bay Damage", "shot", "unclear", "chunk A (notes list #11; DB roster lists Jacob Edwards #31 — verify)", "in progress"),
  dmh("1", "A (no ts)", "Smith", "#91 Tampa Bay Damage", "shot by Dizon run", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Marcello Margott", "#33 Tampa Bay Damage", "shot by Dizon run", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Dizon", "#4 Houston Heat", "shot by Scheer", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Bufton", "Houston Heat", "shot by Scheer", "unclear", "chunk A", "in progress"),
  dmh("1", "A (no ts)", "Mickowski", "#32 Houston Heat", "shot by Scheer — Damage win point", "unclear", "chunk A", "Damage 1 – Heat 0"),
  dmh("2", "A (no ts)", "Dizon", "#4 Houston Heat", "shot", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "Saldana", "#27 Houston Heat", "trade", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "unknown", "Tampa Bay Damage", "trade with Saldana", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "Mickowski", "#32 Houston Heat", "shot", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "Busiere", "Tampa Bay Damage", "shot", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "unknown", "Houston Heat", "shot by Brown", "unclear", "chunk A", "in progress"),
  dmh("2", "A (no ts)", "Moorhead", "#9 Houston Heat", "shot by Brown — Damage win point", "unclear", "chunk A", "Damage 2 – Heat 0"),
  dmh("3", "A @11:57 clock", "Brown", "#9 Tampa Bay Damage", "shot", "snake", "chunk A", "in progress"),
  dmh("3", "A (no ts)", "Edwards", "#11 Tampa Bay Damage", "shot", "unclear", "chunk A", "in progress"),
  dmh("3", "A (no ts)", "Busiere", "Tampa Bay Damage", "shot", "unclear", "chunk A", "in progress"),
  dmh("3", "A (no ts)", "Smith", "#91 Tampa Bay Damage", "shot", "unclear", "chunk A", "in progress"),
  dmh("3", "A (no ts)", "Marcello Margott", "#33 Tampa Bay Damage", "concede — Heat win point", "—", "chunk A", "Damage 2 – Heat 1"),
  dmh("Dmg 2–0 (mid)", "B (no ts)", "Horn", "Tampa Bay Damage", "spin penalty", "—", "chunk B; same point as P3? notes place Heat point here — verify sequencing", "in progress"),
  dmh("Dmg 2–0 (mid)", "B (no ts)", "unknown", "Tampa Bay Damage", "shot", "unclear", "chunk B", "in progress"),
  dmh("Dmg 2–0 (mid)", "B (no ts)", "Dizon", "#4 Houston Heat", "penalty — Heat still win point", "—", "chunk B", "Damage 2 – Heat 1"),
  dmh("4", "B (no ts)", "Mishka", "Houston Heat", "shot", "off the break", "chunk B", "in progress"),
  dmh("4", "B (no ts)", "Saldana", "#27 Houston Heat", "shot", "clover", "chunk B", "in progress"),
  dmh("4", "B (no ts)", "Dizon", "#4 Houston Heat", "shot", "unclear", "chunk B", "in progress"),
  dmh("4", "B (no ts)", "Mickowski", "#32 Houston Heat", "shot by Smith; Heat concede — Damage win point", "unclear", "chunk B (notes spell Makowski)", "Damage 3 – Heat 1"),
  dmh("5", "B (no ts)", "unknown x2", "Houston Heat", "shot by Goldman (Mouse)", "snake", "chunk B", "in progress"),
  dmh("5", "B (no ts)", "Saldana", "#27 Houston Heat", "trade with Edwards", "unclear", "chunk B", "in progress"),
  dmh("5", "B (no ts)", "Edwards", "#11 Tampa Bay Damage", "trade with Saldana", "unclear", "chunk B; Edwards ankle injury discussed ~11:10 (crutches in pit)", "in progress"),
  dmh("5", "B (no ts)", "unknown", "Houston Heat", "bunkered by Brown; Heat concede — Damage win point", "unclear", "chunk B", "Damage 4 – Heat 1"),
  dmh("6", "C (no ts)", "Smith", "#91 Tampa Bay Damage", "shot", "snake tower", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "Moorhead", "#9 Houston Heat", "shot", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "unknown", "Tampa Bay Damage", "shot", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "Dizon", "#4 Houston Heat", "shot by Goldman (Mouse)", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "unknown", "Tampa Bay Damage", "shot", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "Monville", "Houston Heat", "shot", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "Mishka", "Houston Heat", "shot", "unclear", "chunk C", "in progress"),
  dmh("6", "C (no ts)", "last Heat player", "Houston Heat", "shot — Damage buzzer", "—", "chunk C", "Damage 5 – Heat 1"),
  dmh("7", "C (no ts)", "Bufton", "Houston Heat", "shot", "unclear", "chunk C", "in progress"),
  dmh("7", "C (no ts)", "Busiere", "Houston Heat (listed; verify — usually Damage)", "shot", "unclear", "chunk C; VERIFY team — notes list Busiere on Heat", "in progress"),
  dmh("7", "C (no ts)", "Scheer", "Tampa Bay Damage", "shot", "island", "chunk C", "in progress"),
  dmh("7", "C (no ts)", "Mishka", "Houston Heat", "shot by Smith", "unclear", "chunk C", "in progress"),
  dmh("7", "C (no ts)", "Mickowski", "#32 Houston Heat", "shot by Margott", "unclear", "chunk C", "in progress"),
  dmh("7", "C (no ts)", "Dizon", "#4 Houston Heat", "shot on run — Damage buzzer", "unclear", "chunk C", "Damage 6 – Heat 1"),
  dmh("8", "C (no ts)", "unknown x3", "Tampa Bay Damage", "shot by Mickowski/Moorhead run", "unclear", "chunk C", "in progress"),
  dmh("8", "C (no ts)", "Mickowski", "#32 Houston Heat", "shot", "clover", "chunk C", "in progress"),
  dmh("8", "C (no ts)", "Monville", "Houston Heat", "shot by Goldman (Mouse) at buzzer — Heat buzzer", "—", "chunk C", "Damage 6 – Heat 2"),
  dmh("9", "D @1:40 clock", "—", "Tampa Bay Damage", "Damage win point (elims not logged)", "—", "chunk D; garbage-time clock burn; Marky Ireland interview", "Damage 7 – Heat 2"),
  dmh("FINAL", "D (no ts)", "—", "—", "final", "—", "Source YT https://www.youtube.com/watch?v=40IX7cok6Vk (~148–202m dual-feed w/ Aftershock vs FIT)", "FINAL Tampa Bay Damage 7 – Houston Heat 2"),
  // Chicago Aftershock vs PaintballFIT (Fri dual-feed)
  afv("1", "A (no ts)", "Chavez", "#4 PaintballFIT", "shot", "off break", "chunk A", "in progress"),
  afv("1", "A (no ts)", "Jet", "Chicago Aftershock", "shot by Stewart", "unclear", "chunk A", "in progress"),
  afv("1", "A (no ts)", "Stewart", "#0 PaintballFIT", "major penalty (playing on)", "—", "chunk A", "in progress"),
  afv("1", "A (no ts)", "Dr Seba", "PaintballFIT", "penalty body", "—", "chunk A; Seba listed FIT here but as AS shooter in chunk B — VERIFY team", "in progress"),
  afv("1", "A (no ts)", "Luchau", "#115 PaintballFIT", "penalty body", "—", "chunk A", "Aftershock 1 – FIT 0"),
  afv("2", "A (no ts)", "Seba", "PaintballFIT", "shot", "unclear", "chunk A; VERIFY team", "in progress"),
  afv("2", "A (no ts)", "unknown", "Chicago Aftershock", "shot", "unclear", "chunk A", "in progress"),
  afv("2", "A (no ts)", "Luchau", "#115 PaintballFIT", "shot", "unclear", "chunk A", "in progress"),
  afv("2", "A (no ts)", "Hughes", "Chicago Aftershock", "shot", "unclear", "chunk A", "in progress"),
  afv("2", "A (no ts)", "Stewart", "#0 PaintballFIT", "shot", "unclear", "chunk A", "in progress"),
  afv("2", "A (no ts)", "Chavez", "#4 PaintballFIT", "shot", "unclear", "chunk A", "Aftershock 2 – FIT 0"),
  afv("3", "B (no ts)", "Salinas", "#34 PaintballFIT", "shot", "unclear", "chunk B", "in progress"),
  afv("3", "B (no ts)", "Chavez", "#4 PaintballFIT", "shot", "unclear", "chunk B", "in progress"),
  afv("3", "B (no ts)", "Clay", "PaintballFIT (listed)", "shot by Seba (AS)", "unclear", "chunk B; Clay (Hughes) usually AS — VERIFY team flip", "in progress"),
  afv("3", "B (no ts)", "Colt", "Chicago Aftershock", "shot by Lackey", "unclear", "chunk B; team assumed", "in progress"),
  afv("3", "B (no ts)", "Stewart", "#0 PaintballFIT", "bunkered by Lackey", "unclear", "chunk B; Lackey is FIT — VERIFY (possible team flip)", "in progress"),
  afv("3", "B (no ts)", "Lackey", "#21 PaintballFIT", "friendly fire by Seba", "unclear", "chunk B; VERIFY Seba team", "Aftershock 3 – FIT 0"),
  afv("4", "B (no ts)", "Garringer", "#10 PaintballFIT", "minor + body", "—", "chunk B", "in progress"),
  afv("4", "B (no ts)", "Salinas", "#34 PaintballFIT", "trade with AS player", "unclear", "chunk B", "in progress"),
  afv("4", "B (no ts)", "Stewart", "#0 PaintballFIT", "trade with Heinz", "unclear", "chunk B", "in progress"),
  afv("4", "B (no ts)", "Heinz", "Chicago Aftershock", "trade with Stewart", "unclear", "chunk B", "in progress"),
  afv("4", "B (no ts)", "Luchau", "#115 PaintballFIT", "shot by Stansill", "unclear", "chunk B", "Aftershock 4 – FIT 0"),
  afv("5", "B (no ts)", "Heinz", "Chicago Aftershock", "shot", "off break", "chunk B", "in progress"),
  afv("5", "B (no ts)", "unknown", "Chicago Aftershock", "shot by Chavez", "D-side", "chunk B", "in progress"),
  afv("5", "B (no ts)", "unknown x2", "Chicago Aftershock", "blasted", "unclear", "chunk B; FIT wins point", "Aftershock 4 – FIT 1"),
  afv("6", "C (no ts)", "Stewart", "#0 PaintballFIT", "shot", "unclear", "chunk C", "in progress"),
  afv("6", "C (no ts)", "unknown", "Chicago Aftershock", "shot", "Dorito", "chunk C", "in progress"),
  afv("6", "C (no ts)", "Clay Hughes", "PaintballFIT (listed)", "shot", "unclear", "chunk C; usually AS — VERIFY team flip", "in progress"),
  afv("6", "C (no ts)", "unknown", "PaintballFIT", "shot", "snake", "chunk C", "in progress"),
  afv("6", "C (no ts)", "Heinz", "Chicago Aftershock", "shot by Salinas", "unclear", "chunk C", "in progress"),
  afv("6", "C (no ts)", "Jet", "Chicago Aftershock", "shot by Salinas", "unclear", "chunk C; FIT buzzer", "Aftershock 4 – FIT 2"),
  afv("7", "C (no ts)", "unknown x4", "Chicago Aftershock", "wiped off break", "off break", "chunk C; FIT buzzer", "Aftershock 4 – FIT 3"),
  afv("8", "C (no ts)", "Stewart", "#0 PaintballFIT", "shot", "unclear", "chunk C", "in progress"),
  afv("8", "C (no ts)", "Hughes", "PaintballFIT (listed)", "shot", "unclear", "chunk C; Hughes usually AS — VERIFY team flip", "in progress"),
  afv("8", "C (no ts)", "unknown", "Chicago Aftershock", "penalty", "Dorito", "chunk C", "in progress"),
  afv("8", "C (no ts)", "unknown x2", "PaintballFIT", "shot by Jet", "unclear", "chunk C; AS buzzer", "Aftershock 5 – FIT 3"),
  afv("9–12", "D (to @3:24 clock)", "—", "PaintballFIT", "FIT win 4 straight points (elims not logged)", "—", "chunk D; FIT comeback", "FIT 7 – Aftershock 5"),
  afv("13", "finish (no ts)", "—", "PaintballFIT", "FIT win point (elims not logged)", "—", "finish chunk", "FIT 8 – Aftershock 5"),
  afv("14–16", "finish (no ts)", "Garringer", "#10 PaintballFIT", "team kill by Lackey", "unclear", "finish chunk; point not specified", "in progress"),
  afv("14–16", "finish (no ts)", "Stewart", "#0 (listed AS)", "team kill by Hinds (#3 AS)", "unclear", "finish chunk; Stewart listed AS in late point, usually FIT — VERIFY team flip (team kill only holds if AS)", "in progress"),
  afv("14–16", "finish (no ts)", "—", "—", "remaining points (elims not logged)", "—", "finish path 5-8 → 6-8 → 6-9 → 6-10", "FIT 10 – Aftershock 6"),
  afv("FINAL", "finish (no ts)", "—", "—", "final", "—", "Source YT https://www.youtube.com/watch?v=40IX7cok6Vk (~148–218m, dual-feed w/ Damage vs Heat then finish alone)", "FINAL PaintballFIT 10 – Chicago Aftershock 6"),
  upc("1", "A (~218–240m)", "unknown", "Atlanta Jungle Cats", "off break", "Snake", "", "Uprising 1 – Cats 0"),
  upc("1", "A (~218–240m)", "unknown", "Atlanta Jungle Cats", "shot by Arnold (Up)", "Dorito", "", "Uprising 1 – Cats 0"),
  upc("1", "A (~218–240m)", "McGowan", "Atlanta Jungle Cats", "eliminated", "Back center", "", "Uprising 1 – Cats 0"),
  upc("1", "A (~218–240m)", "unknown (x2)", "Atlanta Jungle Cats", "run-through by Arnold (Up)", "Center", "", "Uprising 1 – Cats 0"),
  upc("2", "A (~218–240m)", "unknown", "Atlanta Jungle Cats", "laydown", "Door", "", "Uprising 2 – Cats 0"),
  upc("2", "A (~218–240m)", "Rios", "Seattle Uprising", "trade", "Dorito", "traded w/ Borromeo", "Uprising 2 – Cats 0"),
  upc("2", "A (~218–240m)", "Borromeo", "Atlanta Jungle Cats", "trade", "Dorito", "traded w/ Rios", "Uprising 2 – Cats 0"),
  upc("2", "A (~218–240m)", "Oller", "Atlanta Jungle Cats", "eliminated", "Snake 3", "", "Uprising 2 – Cats 0"),
  upc("2", "A (~218–240m)", "McGowan", "Atlanta Jungle Cats", "eliminated", "Back center", "Up wins at buzzer", "Uprising 2 – Cats 0"),
  upc("3", "A (~218–240m)", "Eaton", "Seattle Uprising", "eliminated", "Dorito", "", "Uprising 2 – Cats 1"),
  upc("3", "A (~218–240m)", "Woodward", "Seattle Uprising", "eliminated", "Dorito temple", "", "Uprising 2 – Cats 1"),
  upc("3", "A (~218–240m)", "Shrader", "Seattle Uprising", "eliminated", "Snake 1", "", "Uprising 2 – Cats 1"),
  upc("3", "A (~218–240m)", "Cole Scott", "Seattle Uprising", "trade", "Center", "traded w/ Cats player", "Uprising 2 – Cats 1"),
  upc("3", "A (~218–240m)", "unknown", "Atlanta Jungle Cats", "trade", "Center", "traded w/ Cole Scott; Cats win", "Uprising 2 – Cats 1"),
  upc("4", "A (~8:36 clock)", "Arnold", "Seattle Uprising", "pulled by ref", "Snake", "ref pull", "Uprising 2 – Cats 2"),
  upc("4", "A (~8:36 clock)", "Challenger", "Seattle Uprising", "trade", "—", "traded w/ Stevens", "Uprising 2 – Cats 2"),
  upc("4", "A (~8:36 clock)", "Stevens", "Atlanta Jungle Cats", "trade", "—", "traded w/ Challenger", "Uprising 2 – Cats 2"),
  upc("4", "A (~8:36 clock)", "Cole Scott", "Seattle Uprising", "eliminated on run", "Dorito", "", "Uprising 2 – Cats 2"),
  upc("4", "A (~8:36 clock)", "Eaton", "Seattle Uprising", "eliminated on run", "Dorito", "Cats win; scoreboard lag — trust visual IDs", "Uprising 2 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "Borromeo", "Atlanta Jungle Cats", "eliminated", "D-side", "", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "Challenger", "Seattle Uprising", "eliminated", "Center", "", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "unknown", "Atlanta Jungle Cats", "shot by Shrader (Up)", "—", "", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "Shrader", "Seattle Uprising", "eliminated", "—", "", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "unknown", "Atlanta Jungle Cats", "shot by Holland (Up)", "D-side", "chunk cut mid-point", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "Woodward/Holland", "Seattle Uprising", "mentioned early", "D-side", "announcer mixup on Holland — VERIFY", "Uprising 3 – Cats 2"),
  upc("5", "A→B1 (~238–245m)", "Dipolito", "Atlanta Jungle Cats", "shot by Holland (Up)", "Center can", "Up wins", "Uprising 3 – Cats 2"),
  upc("6", "B1 (~240–256m)", "Borromeo", "Atlanta Jungle Cats", "off break", "D temple", "", "Uprising 3 – Cats 3"),
  upc("6", "B1 (~240–256m)", "Cole Scott", "Seattle Uprising", "off break", "Snake clover", "", "Uprising 3 – Cats 3"),
  upc("6", "B1 (~240–256m)", "Holland", "Seattle Uprising", "shot by Ohl (Cats)", "Snake 3", "", "Uprising 3 – Cats 3"),
  upc("6", "B1 (~240–256m)", "Stevens", "Atlanta Jungle Cats", "eliminated", "Snake", "", "Uprising 3 – Cats 3"),
  upc("6", "B1 (~240–256m)", "Ohl", "Atlanta Jungle Cats", "eliminated", "Snake", "", "Uprising 3 – Cats 3"),
  upc("6", "B1 (~240–256m)", "Shrader", "Seattle Uprising", "eliminated", "D-side", "Cats tie", "Uprising 3 – Cats 3"),
  upc("7", "B1 (~240–256m)", "Shrader", "Seattle Uprising", "sacrifice", "Wedge", "took a Cats kill with him", "Uprising 4 – Cats 3"),
  upc("7", "B1 (~240–256m)", "unknown", "Atlanta Jungle Cats", "shot by Shrader (Up)", "Wedge area", "", "Uprising 4 – Cats 3"),
  upc("7", "B1 (~240–256m)", "unknown", "Atlanta Jungle Cats", "eliminated", "D-side", "", "Uprising 4 – Cats 3"),
  upc("7", "B1 (~240–256m)", "Pate", "Atlanta Jungle Cats", "shot by Arnold (Up)", "Dorito", "Up wins", "Uprising 4 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "unknown", "Atlanta Jungle Cats", "early out", "D-side", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "unknown", "Atlanta Jungle Cats", "early out", "Snake", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "Challenger", "Seattle Uprising", "clipped", "—", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "Tyner", "Atlanta Jungle Cats", "eliminated", "—", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "unknown", "Seattle Uprising", "shot by Stevens (Cats)", "—", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "Rios", "Atlanta Jungle Cats", "shot by Cole Scott", "—", "VERIFY Rios team (usually Uprising)", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "unknown", "Atlanta Jungle Cats", "eliminated", "Dorito temple", "", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "Dipolito", "Seattle Uprising", "eliminated", "Snake 3", "VERIFY team (listed Up; Cats roster)", "Uprising 5 – Cats 3"),
  upc("8", "B1 end→B2 (~254–262m, @4:13)", "Stevens", "Atlanta Jungle Cats", "teamkill/shot by Scott", "Middle", "Up 5-3", "Uprising 5 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "unknown", "Atlanta Jungle Cats", "shot by Challenger (Up)", "Mid", "", "Uprising 6 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "Borromeo", "Atlanta Jungle Cats", "eliminated", "Dorito", "", "Uprising 6 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "Woodward", "Atlanta Jungle Cats", "shot by McGowan", "—", "VERIFY (Woodward listed Cats)", "Uprising 6 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "Arnold", "Atlanta Jungle Cats", "shot by Holland", "—", "VERIFY (Arnold listed Cats)", "Uprising 6 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "McGowan", "Seattle Uprising", "eliminated", "Dorito tower", "VERIFY (McGowan listed Up)", "Uprising 6 – Cats 3"),
  upc("9", "B2 (@7:01, clock ~0:03)", "unknown (last Cats)", "Atlanta Jungle Cats", "shot by Holland (Up)", "Backline", "Up wins @~0:03", "Uprising 6 – Cats 3"),
  upc("FINAL", "B2 @7:01", "—", "—", "final", "—", "Source YT https://www.youtube.com/watch?v=40IX7cok6Vk (~218–272m dual-feed)", "FINAL Seattle Uprising 6 – Atlanta Jungle Cats 3"),
  xfn("1", "A (~218–240m)", "Nico Hyde", "New York Xtreme", "shot by Hussein (XF)", "Mid", "off break", "XF 1 – NYX 0"),
  xfn("1", "A (~218–240m)", "Bernacchia", "New York Xtreme", "trade", "Snake", "traded w/ XF player", "XF 1 – NYX 0"),
  xfn("1", "A (~218–240m)", "unknown", "San Antonio X-Factor", "trade", "Snake", "traded w/ Bernacchia", "XF 1 – NYX 0"),
  xfn("1", "A (~218–240m)", "Danner", "New York Xtreme", "trade", "—", "traded w/ Hussein", "XF 1 – NYX 0"),
  xfn("1", "A (~218–240m)", "Hussein", "San Antonio X-Factor", "trade", "—", "traded w/ Danner; Bayless wins at buzzer", "XF 1 – NYX 0"),
  xfn("2", "A (~218–240m)", "Josh Taylor", "San Antonio X-Factor", "eliminated", "—", "", "XF 2 – NYX 0"),
  xfn("2", "A (~218–240m)", "Hussein", "San Antonio X-Factor", "eliminated", "—", "", "XF 2 – NYX 0"),
  xfn("2", "A (~218–240m)", "Meter Ninios", "San Antonio X-Factor", "eliminated", "Back corner", "", "XF 2 – NYX 0"),
  xfn("2", "A (~218–240m)", "Bernacchia", "New York Xtreme", "eliminated", "Snake", "", "XF 2 – NYX 0"),
  xfn("2", "A (~218–240m)", "Navarro", "New York Xtreme", "eliminated", "Center", "", "XF 2 – NYX 0"),
  xfn("2", "A (~218–240m)", "unknown (up to 3)", "New York Xtreme", "run-through by Matt Jackson (XF)", "—", "XF wins", "XF 2 – NYX 0"),
  xfn("3", "A (~218–240m)", "unknown (x2)", "San Antonio X-Factor", "shot by Demers (NYX)", "Dorito/back", "misID Hyde/Tom Guest flagged — VERIFY", "XF 2 – NYX 1"),
  xfn("3", "A (~218–240m)", "Bayless", "San Antonio X-Factor", "shot by Demers (NYX)", "—", "", "XF 2 – NYX 1"),
  xfn("3", "A (~218–240m)", "Demers", "New York Xtreme", "shot by Jackson (XF)", "—", "NYX wins point", "XF 2 – NYX 1"),
  xfn("4", "A (~218–240m)", "Colt Roberts", "San Antonio X-Factor", "eliminated", "D-side", "", "XF 3 – NYX 1"),
  xfn("4", "A (~218–240m)", "Bernacchia", "New York Xtreme", "trade/FF", "Center", "", "XF 3 – NYX 1"),
  xfn("4", "A (~218–240m)", "Navarro", "New York Xtreme", "trade/FF", "Center", "", "XF 3 – NYX 1"),
  xfn("4", "A (~218–240m)", "Nico Hyde", "New York Xtreme", "eliminated", "D-side", "NYX concedes; notes '3-1 NYX' label — VERIFY leader", "XF 3 – NYX 1"),
  xfn("5", "B1 (~240–256m)", "Nico Hyde", "San Antonio X-Factor", "shot by Berkley (NYX)", "—", "VERIFY Hyde team (NYX roster)", "XF 4 – NYX 1"),
  xfn("5", "B1 (~240–256m)", "Meter Minios", "San Antonio X-Factor", "limp off", "—", "", "XF 4 – NYX 1"),
  xfn("5", "B1 (~240–256m)", "Harris", "New York Xtreme", "eliminated", "—", "VERIFY (Harris listed NYX)", "XF 4 – NYX 1"),
  xfn("5", "B1 (~240–256m)", "Berkley", "New York Xtreme", "penalty + pulled", "Snake", "XF wins; scoreboard lag 2-2 vs 3-1", "XF 4 – NYX 1"),
  xfn("6", "B1 (~240–256m)", "Chesser", "New York Xtreme", "eliminated", "D-side", "", "XF 4 – NYX 2 (VERIFY: notes say XF 4-2 after NYX concede)"),
  xfn("6", "B1 (~240–256m)", "Lopez", "New York Xtreme", "eliminated", "D-side", "", "XF 4 – NYX 2 (VERIFY: notes say XF 4-2 after NYX concede)"),
  xfn("6", "B1 (~240–256m)", "Berkley", "New York Xtreme", "eliminated", "Center", "NYX concedes (Harris last)", "XF 4 – NYX 2 (VERIFY: notes say XF 4-2 after NYX concede)"),
  xfn("7", "B1 (~240–256m)", "Bernacchia", "San Antonio X-Factor", "off break", "—", "VERIFY (listed XF); Harris Hussein trade note", "XF 5 – NYX 2"),
  xfn("7", "B1 (~240–256m)", "Berkley", "New York Xtreme", "eliminated", "—", "", "XF 5 – NYX 2"),
  xfn("7", "B1 (~240–256m)", "Demers", "New York Xtreme", "eliminated", "Snake", "", "XF 5 – NYX 2"),
  xfn("7", "B1 (~240–256m)", "Navarro", "New York Xtreme", "run-down by Meter Minios (XF)", "—", "XF buzzer", "XF 5 – NYX 2"),
  xfn("8", "B2 (~256–272m)", "Demers", "New York Xtreme", "off break", "Dorito", "", "XF 6 – NYX 2"),
  xfn("8", "B2 (~256–272m)", "Harris Hussain", "New York Xtreme", "eliminated", "Back/snake", "VERIFY team", "XF 6 – NYX 2"),
  xfn("8", "B2 (~256–272m)", "Navarro", "New York Xtreme", "shot by Bayless (XF)", "Snake 1", "", "XF 6 – NYX 2"),
  xfn("9", "B2 (~256–272m)", "unknown", "New York Xtreme", "eliminated", "Dorito corner", "", "XF 7 – NYX 2"),
  xfn("9", "B2 (~256–272m)", "Colt Roberts", "San Antonio X-Factor", "eliminated", "Dorito clover", "", "XF 7 – NYX 2"),
  xfn("9", "B2 (~256–272m)", "Josh Taylor", "New York Xtreme", "eliminated", "Center", "VERIFY Taylor team (XF roster)", "XF 7 – NYX 2"),
  xfn("9", "B2 (~256–272m)", "unknown (x2)", "New York Xtreme", "run-through", "Backline", "", "XF 7 – NYX 2"),
  xfn("10", "B2 @14:27", "Demers", "New York Xtreme", "off break", "Dorito", "", "XF 8 – NYX 2"),
  xfn("10", "B2 @14:27", "Berkley", "New York Xtreme", "eliminated", "Center wedge", "", "XF 8 – NYX 2"),
  xfn("10", "B2 @14:27", "unknown (x2)", "New York Xtreme", "run-through", "—", "mercy ends game", "XF 8 – NYX 2"),
  xfn("FINAL", "B2 @14:27", "—", "—", "final (mercy)", "—", "Source YT https://www.youtube.com/watch?v=40IX7cok6Vk (~218–272m dual-feed)", "FINAL San Antonio X-Factor 8 – New York Xtreme 2 (mercy)"),
  asm("1", "start (~6–22m)", "unknown (x2)", "Chicago Aftershock", "run-through by Clay Hughes", "—", "Hughes listed as MATH running — VERIFY Hughes team (Hughes #27 is AS roster)", "MATH 1 – AS 0"),
  asm("1", "start (~6–22m)", "Stewart", "Perris ASG Aftermath", "trade", "Snake", "trade with AS snake player", "MATH 1 – AS 0"),
  asm("1", "start (~6–22m)", "unknown", "Chicago Aftershock", "trade", "Snake", "traded with Stewart", "MATH 1 – AS 0"),
  asm("1", "start (~6–22m)", "Hoski", "Chicago Aftershock #42", "eliminated", "Dorito", "", "MATH 1 – AS 0"),
  asm("1", "start (~6–22m)", "Stancil", "Chicago Aftershock", "eliminated 1v2", "—", "MATH buzzer", "MATH 1 – AS 0"),
  asm("2", "start/early (~15–22m)", "Mazurek", "Perris ASG Aftermath #51", "eliminated", "Dorito", "aka Mizurick in start notes", "MATH 1 – AS 1"),
  asm("2", "start/early (~15–22m)", "Carter", "Perris ASG Aftermath #14", "eliminated", "Dorito", "", "MATH 1 – AS 1"),
  asm("2", "start/early (~15–22m)", "Woodruff", "Perris ASG Aftermath #8", "eliminated", "Dorito", "", "MATH 1 – AS 1"),
  asm("2", "start/early (~15–22m)", "unknown (x3)", "Chicago Aftershock", "shot by Gladstone (MATH)", "Snake", "", "MATH 1 – AS 1"),
  asm("2", "start/early (~15–22m)", "Gladstone", "Perris ASG Aftermath #95", "bunkered by Rooney (AS)", "Snake", "Rooney buzzer", "MATH 1 – AS 1"),
  asm("3", "start/early", "Hoski", "Chicago Aftershock #42", "eliminated", "D3", "", "MATH 2 – AS 1"),
  asm("3", "start/early", "Hinds", "Chicago Aftershock #3", "eliminated", "—", "'Hines' in early notes", "MATH 2 – AS 1"),
  asm("3", "start/early", "Stancil", "Chicago Aftershock", "eliminated", "—", "'Stansl' in early notes", "MATH 2 – AS 1"),
  asm("3", "start/early", "Jetski", "Chicago Aftershock #1", "shot by Stewart (MATH)", "Snake", "AS concede / MATH buzzer", "MATH 2 – AS 1"),
  asm("4", "early (~15–40m)", "Gladstone", "Perris ASG Aftermath #95", "eliminated", "—", "", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "Hughes", "Chicago Aftershock #27", "trade", "—", "trade with Green; VERIFY Hughes team", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "Green", "Perris ASG Aftermath #42", "trade", "—", "trade with Hughes", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "unknown", "Chicago Aftershock", "shot by Carter (MATH)", "Snake", "", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "Lackey", "Chicago Aftershock #21", "eliminated", "—", "", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "Rooney", "Chicago Aftershock #19", "shot by Woodruff (MATH)", "—", "", "MATH 2 – AS 2"),
  asm("4", "early (~15–40m)", "Carter", "Perris ASG Aftermath #14", "shot by Jetski (AS)", "—", "Jetski buzzer", "MATH 2 – AS 2"),
  asm("5", "early @~8:55→8:14", "—", "—", "BROADCAST SKIP", "—", "MATH 2-2→3-2 point not shown on broadcast; no elims logged", "MATH 3 – AS 2"),
  asm("6", "early/bridge (~37–40m)", "Hoski", "Chicago Aftershock #42", "eliminated", "—", "", "MATH 4 – AS 2"),
  asm("6", "early/bridge (~37–40m)", "Jetski", "Chicago Aftershock #1", "eliminated", "—", "", "MATH 4 – AS 2"),
  asm("6", "early/bridge (~37–40m)", "Hughes", "Chicago Aftershock #27", "minor penalty", "—", "VERIFY Hughes team", "MATH 4 – AS 2"),
  asm("6", "early/bridge (~37–40m)", "Lackey", "Chicago Aftershock #21", "penalty body (pulled)", "—", "", "MATH 4 – AS 2"),
  asm("6", "bridge @7:11", "unknown (x2)", "Chicago Aftershock", "eliminated", "D-side", "AS concede @7:11", "MATH 4 – AS 2"),
  asm("7", "bridge (~37–47m)", "Hinds", "Chicago Aftershock #3", "minor penalty", "—", "", "MATH 5 – AS 2"),
  asm("7", "bridge (~37–47m)", "Jetski", "Chicago Aftershock #1", "penalty collateral", "—", "", "MATH 5 – AS 2"),
  asm("7", "bridge (~37–47m)", "Hughes", "Chicago Aftershock #27", "penalty collateral", "—", "VERIFY Hughes team", "MATH 5 – AS 2"),
  asm("7", "bridge (~37–47m)", "unknown (x3)", "Perris ASG Aftermath", "shot", "—", "", "MATH 5 – AS 2"),
  asm("7", "bridge @6:37", "Rooney", "Chicago Aftershock #19", "eliminated", "—", "", "MATH 5 – AS 2"),
  asm("7", "bridge @6:37", "Hoski", "Chicago Aftershock #42", "eliminated", "—", "MATH buzzer @6:37", "MATH 5 – AS 2"),
  asm("8", "bridge (~37–47m)", "unknown", "Chicago Aftershock", "off break by Doan (MATH)", "BC", "", "MATH 6 – AS 2"),
  asm("8", "bridge (~37–47m)", "Lackey", "Chicago Aftershock #21", "shot by Arrieta (MATH)", "—", "", "MATH 6 – AS 2"),
  asm("8", "bridge (~37–47m)", "unknown", "Chicago Aftershock", "eliminated", "Center", "Arrieta buzzer", "MATH 6 – AS 2"),
  asm("9", "bridge (~37–47m)", "Woodruff", "Perris ASG Aftermath #8", "eliminated", "—", "", "MATH 6 – AS 3"),
  asm("9", "bridge (~37–47m)", "Jetski", "Chicago Aftershock #1", "eliminated", "—", "", "MATH 6 – AS 3"),
  asm("9", "bridge (~37–47m)", "Rooney", "Chicago Aftershock #19", "eliminated", "—", "", "MATH 6 – AS 3"),
  asm("9", "bridge (~37–47m)", "unknown", "Perris ASG Aftermath", "bunkered by Hughes (AS)", "—", "VERIFY Hughes team", "MATH 6 – AS 3"),
  asm("9", "bridge (~37–47m)", "unknown", "Perris ASG Aftermath", "shot by Hoski (AS)", "—", "Lackey buzzer", "MATH 6 – AS 3"),
  asm("10", "finish (~40–62m)", "unknown (x2)", "Chicago Aftershock", "eliminated (+ minor penalty)", "—", "", "MATH 7 – AS 3"),
  asm("10", "finish (~40–62m)", "Mazurek", "Perris ASG Aftermath #51", "eliminated", "—", "AS concede", "MATH 7 – AS 3"),
  asm("11", "finish (~40–62m)", "Arrieta", "Perris ASG Aftermath #44", "shot by Jetski (AS)", "—", "", "MATH 8 – AS 3"),
  asm("11", "finish (~40–62m)", "Jetski", "Chicago Aftershock #1", "minor penalty", "—", "", "MATH 8 – AS 3"),
  asm("11", "finish (~40–62m)", "unknown", "Chicago Aftershock", "penalty pull (teammate)", "—", "AS concede", "MATH 8 – AS 3"),
  asm("12", "finish (~40–62m)", "Gant", "Chicago Aftershock", "eliminated", "—", "", "MATH 9 – AS 3"),
  asm("12", "finish (~40–62m)", "Carter", "Perris ASG Aftermath #14", "eliminated", "—", "", "MATH 9 – AS 3"),
  asm("12", "finish (~40–62m)", "unknown (x3)", "Chicago Aftershock", "wipe", "—", "mercy ends game", "MATH 9 – AS 3"),
  asm("FINAL", "finish (~62m)", "—", "—", "final (mercy)", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk (~6–62m dual-feed w/ RL vs Canes); one broadcast-skipped point (2-2→3-2); VERIFY Hughes team", "FINAL Perris ASG Aftermath 9 – Chicago Aftershock 3 (mercy)"),
];
function dup(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Tampa Bay Damage vs Seattle Uprising (Sun QF dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (~62–115m dual-feed w/ Dynasty/Impact; clips a, b, finish); " + notes, scoreAfter };
}
const DUP_ROWS: Elim[] = [
  dup("1", "clip a (~62–80m)", "unknown", "Seattle Uprising", "point won by Damage", "—", "per-elim detail not captured on dual-feed", "TB 1 – SEA 0"),
  dup("2", "clip a (~62–80m)", "unknown", "Seattle Uprising", "point won by Damage", "—", "per-elim detail not captured on dual-feed", "TB 2 – SEA 0"),
  dup("3", "clip b (~80–95m)", "Busiere", "Tampa Bay Damage", "team kill by Brown (TB)", "—", "Uprising wins point", "TB 2 – SEA 1"),
  dup("4", "clip b (~80–95m)", "Challenger", "Tampa Bay Damage (listed)", "eliminated", "—", "VERIFY Challenger team (listed Damage; expected Uprising)", "TB 3 – SEA 1"),
  dup("5", "finish (~95–115m)", "Holland", "Seattle Uprising", "eliminated", "—", "", "TB 4 – SEA 1"),
  dup("5", "finish (~95–115m)", "Borromeo", "Tampa Bay Damage (listed)", "eliminated", "—", "VERIFY Borromeo team (listed TB here, Up in clip b)", "TB 4 – SEA 1"),
  dup("5", "finish (~95–115m)", "Smith", "Tampa Bay Damage", "shot by Arnold (SEA)", "—", "", "TB 4 – SEA 1"),
  dup("5", "finish (~95–115m)", "Mouse Goldman", "Tampa Bay Damage", "trade w/ Schrader", "—", "", "TB 4 – SEA 1"),
  dup("5", "finish (~95–115m)", "Schrader", "Seattle Uprising", "trade w/ Mouse", "—", "", "TB 4 – SEA 1"),
  dup("5", "finish (~95–115m)", "Woodward", "Seattle Uprising", "shot by Edwards (TB)", "—", "Damage wins point", "TB 4 – SEA 1"),
  dup("6", "finish (~95–115m)", "Borromeo", "Tampa Bay Damage (listed)", "eliminated", "—", "VERIFY Borromeo team", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Smith", "Seattle Uprising (listed)", "shot by Edwards (TB)", "—", "VERIFY Smith team (listed SEA)", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Graham", "—", "major penalty", "—", "w/ Scott", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Scott", "Seattle Uprising", "major penalty", "—", "w/ Graham", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Nate", "—", "trade + penalty", "—", "w/ Brian Smith", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Brian Smith", "—", "trade + penalty", "—", "w/ Nate", "TB 5 – SEA 1"),
  dup("6", "finish (~95–115m)", "Holland", "Seattle Uprising", "shot by Mouse (TB)", "—", "dual graphic @12:47 Damage 5-1", "TB 5 – SEA 1"),
  dup("7", "finish (~95–115m)", "Mouse Goldman", "Tampa Bay Damage", "eliminated", "—", "", "TB 5 – SEA 2"),
  dup("7", "finish (~95–115m)", "Keith Brown", "Tampa Bay Damage", "eliminated", "—", "Uprising wins point", "TB 5 – SEA 2"),
  dup("7", "finish (~95–115m)", "unknown", "Tampa Bay Damage", "eliminated", "D-side", "", "TB 5 – SEA 2"),
  dup("end", "finish (~110–115m)", "Woodward", "Seattle Uprising", "off break", "—", "notes log a closing point after 5-2; final stands 5-2 — VERIFY", "TB 5 – SEA 2"),
  dup("end", "finish (~110–115m)", "Holland", "Seattle Uprising", "minor penalty", "—", "", "TB 5 – SEA 2"),
  dup("end", "finish (~110–115m)", "Arnold", "Seattle Uprising", "eliminated (sent)", "—", "", "TB 5 – SEA 2"),
  dup("end", "finish (~110–115m)", "Shrader", "Seattle Uprising", "eliminated", "—", "", "TB 5 – SEA 2"),
  dup("FINAL", "finish (~115m)", "—", "—", "final", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk; VERIFY Borromeo/Challenger team flips", "FINAL Tampa Bay Damage 5 – Seattle Uprising 2"),
];
ROWS.push(...DUP_ROWS);

function idy(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Edmonton Impact vs San Diego Dynasty (Sun QF dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (~62–138m dual-feed w/ Damage/Uprising; clips qf a, b, c, late-a); " + notes, scoreAfter };
}
const IDY_ROWS: Elim[] = [
  idy("1", "clip a (~62–82m)", "unknown", "San Diego Dynasty", "point won by Impact", "—", "per-elim detail not captured on dual-feed", "EDM 1 – SD 0"),
  idy("2", "clip a (~62–82m)", "unknown", "Edmonton Impact", "point won by Dynasty", "—", "per-elim detail not captured on dual-feed", "EDM 1 – SD 1"),
  idy("3", "clip a (~62–82m)", "unknown", "San Diego Dynasty", "point won by Impact", "—", "per-elim detail not captured on dual-feed", "EDM 2 – SD 1"),
  idy("4", "clip b (~82–100m)", "unknown", "San Diego Dynasty", "point won by Impact", "—", "notes log '1-3 Imp' — read as Impact 3-1; VERIFY score path", "EDM 3 – SD 1"),
  idy("4", "clip b (~82–100m)", "Fry", "Edmonton Impact (listed)", "named on film", "—", "VERIFY Fry/Frye team (listed Impact here, Dynasty in other clips)", "EDM 3 – SD 1"),
  idy("5", "clip b (~82–100m)", "unknown", "Edmonton Impact", "point won by Dynasty", "—", "Rau, ABJ, LJ, Dalton listed Dyn on clip b (VERIFY Dalton — Imp in late-a)", "EDM 3 – SD 2"),
  idy("6", "clip c (~100–118m)", "unknown", "San Diego Dynasty", "point won by Impact", "—", "", "EDM 4 – SD 2"),
  idy("7", "clip c (~100–118m)", "unknown", "San Diego Dynasty", "point won by Impact", "—", "", "EDM 5 – SD 2"),
  idy("7", "clip c (~100–118m)", "ABJ", "Edmonton Impact (listed)", "named on film", "—", "VERIFY ABJ team (listed Imp here, Dyn elsewhere); Leval listed Dyn (VERIFY — Imp roster)", "EDM 5 – SD 2"),
  idy("8", "clip c (~100–118m)", "unknown", "Edmonton Impact", "point won by Dynasty", "—", "live @~2:17 at 5-3", "EDM 5 – SD 3"),
  idy("9", "late-a @1:50", "—", "San Diego Dynasty", "concede (open)", "—", "Dynasty concedes point", "EDM 6 – SD 3"),
  idy("10", "late-a", "ABJ", "San Diego Dynasty", "eliminated", "Dorito", "VERIFY ABJ team flip", "EDM 6 – SD 4"),
  idy("10", "late-a", "Dalton", "Edmonton Impact", "eliminated", "Snake", "", "EDM 6 – SD 4"),
  idy("10", "late-a", "Stanszak", "Edmonton Impact", "shot by Weaver (SD #21)", "—", "", "EDM 6 – SD 4"),
  idy("10", "late-a", "Weaver #21", "San Diego Dynasty", "eliminated", "Snake", "Dynasty buzzer", "EDM 6 – SD 4"),
  idy("11", "late-a", "Rau #32", "San Diego Dynasty", "shot by Cornell (EDM)", "—", "", "EDM 7 – SD 4"),
  idy("11", "late-a", "Cornell", "Edmonton Impact", "trade", "Dorito", "trade w/ Dynasty Dorito player", "EDM 7 – SD 4"),
  idy("11", "late-a", "unknown", "San Diego Dynasty", "trade w/ Cornell", "Dorito", "", "EDM 7 – SD 4"),
  idy("11", "late-a", "ABJ", "San Diego Dynasty", "eliminated on run", "Snake", "VERIFY ABJ team flip", "EDM 7 – SD 4"),
  idy("11", "late-a", "O'Mara #16", "Edmonton Impact (listed)", "eliminated", "—", "VERIFY O'Mara team (listed Imp; usually Dyn)", "EDM 7 – SD 4"),
  idy("11", "late-a", "unknown", "San Diego Dynasty", "eliminated (last)", "Dorito", "Impact buzzer", "EDM 7 – SD 4"),
  idy("FINAL", "late-a (~138m)", "—", "—", "final", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk; VERIFY O'Mara/Fry/ABJ team flips; early points score-only", "FINAL Edmonton Impact 7 – San Diego Dynasty 4"),
];
ROWS.push(...IDY_ROWS);

function rlf(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Red Legion vs PaintballFIT (Sun QF dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (~138–183m dual-feed; clips late-b, late-c1, late-c2); " + notes, scoreAfter };
}
const RLF_ROWS: Elim[] = [
  rlf("1", "late-b", "unknown", "Red Legion", "point won by FIT", "—", "score-only", "RL 0 – FIT 1"),
  rlf("2", "late-b", "unknown", "PaintballFIT", "point won by RL", "—", "score-only", "RL 1 – FIT 1"),
  rlf("3", "late-b", "unknown", "PaintballFIT", "point won by RL", "—", "score-only", "RL 2 – FIT 1"),
  rlf("4", "late-b", "unknown", "Red Legion", "point won by FIT", "—", "score-only", "RL 2 – FIT 2"),
  rlf("5", "late-b", "unknown", "PaintballFIT", "point won by RL", "—", "score-only", "RL 3 – FIT 2"),
  rlf("6", "c1 ~0:43", "Malloy", "PaintballFIT", "break walk-off", "center/back", "VERIFY Malloy team (listed RL elsewhere)", "RL 4 – FIT 2"),
  rlf("6", "c1 ~0:47", "Corey Hall", "Red Legion", "trade", "center", "", "RL 4 – FIT 2"),
  rlf("6", "c1 ~0:47", "unknown", "PaintballFIT", "trade", "center", "", "RL 4 – FIT 2"),
  rlf("6", "c1 ~0:52", "Colt", "PaintballFIT", "shot on fill", "center", "", "RL 4 – FIT 2"),
  rlf("6", "c1 ~0:55", "Chavez", "PaintballFIT", "clipped", "Dorito", "", "RL 4 – FIT 2"),
  rlf("6", "c1 ~0:56", "Garringer", "PaintballFIT", "clipped", "Dorito", "FIT concede", "RL 4 – FIT 2"),
  rlf("7", "c1 ~5:03", "Colt", "PaintballFIT", "shot (goggles)", "outside back center", "", "RL 5 – FIT 2"),
  rlf("7", "c1 ~5:07", "unknown", "PaintballFIT", "shot by Solnyshkov", "back center", "", "RL 5 – FIT 2"),
  rlf("7", "c1 ~5:08", "unknown", "PaintballFIT", "shot by Solnyshkov", "back center", "", "RL 5 – FIT 2"),
  rlf("7", "c1 ~5:11", "Stewart", "PaintballFIT", "shot", "snake", "film says Stuart", "RL 5 – FIT 2"),
  rlf("7", "c1 ~5:30", "Corey Hall", "Red Legion", "smoked by Garringer", "center brick", "", "RL 5 – FIT 2"),
  rlf("7", "c1 ~6:49", "Chavez", "PaintballFIT", "landmine penalty", "Dorito3/Aztec", "", "RL 5 – FIT 2"),
  rlf("7", "c1 ~7:18", "Garringer", "PaintballFIT", "clock/concede", "Snake3", "", "RL 5 – FIT 2"),
  rlf("8", "c2 ~0:40", "Sergey Solnyshkov", "Red Legion", "shot by Chavez", "Dorito can", "", "RL 5 – FIT 3"),
  rlf("8", "c2 ~1:05", "Corey Hall", "Red Legion", "shot by Chavez", "inside Dorito", "", "RL 5 – FIT 3"),
  rlf("8", "c2 ~1:21", "Pavel Karsliev", "Red Legion", "picked off", "Dorito", "", "RL 5 – FIT 3"),
  rlf("8", "c2 ~1:25", "Malloy", "Red Legion", "last man out", "back center", "VERIFY Malloy team (listed FIT in c1)", "RL 5 – FIT 3"),
  rlf("9", "c2 ~3:56", "Malloy", "Red Legion", "breakout", "—", "VERIFY Malloy team", "RL 5 – FIT 4"),
  rlf("9", "c2 ~3:56", "Kirill Prikhidni", "Red Legion", "breakout", "—", "", "RL 5 – FIT 4"),
  rlf("9", "c2 ~4:11", "Stewart", "PaintballFIT", "shot wide", "snake", "film says Stuart", "RL 5 – FIT 4"),
  rlf("9", "c2 ~5:00", "Corey Hall", "Red Legion", "shot by Mason-Salinas", "center/snake", "", "RL 5 – FIT 4"),
  rlf("9", "c2 ~5:35", "Mason-Salinas", "PaintballFIT", "shot by Karsliev", "—", "", "RL 5 – FIT 4"),
  rlf("9", "c2 ~5:45", "Pavel Karsliev", "Red Legion", "trade w/ Sebaugh", "—", "", "RL 5 – FIT 4"),
  rlf("9", "c2 ~5:45", "Sebaugh", "PaintballFIT", "trade w/ Karsliev", "—", "film says Seba", "RL 5 – FIT 4"),
  rlf("9", "c2 ~6:07", "Sergey Solnyshkov", "Red Legion", "shot by Garringer", "Silverbelly", "", "RL 5 – FIT 4"),
  rlf("10", "c2 ~8:48", "Sergey Solnyshkov", "Red Legion", "breakout", "snake", "", "RL 5 – FIT 4 (clock)"),
  rlf("10", "c2 ~8:58", "Cyrus Garringer", "PaintballFIT", "eliminated", "center", "", "RL 5 – FIT 4 (clock)"),
  rlf("10", "c2 ~9:04", "Pavel Karsliev", "Red Legion", "trade w/ Sebaugh", "Silverbelly", "", "RL 5 – FIT 4 (clock)"),
  rlf("10", "c2 ~9:04", "Sebaugh", "PaintballFIT", "trade w/ Karsliev", "—", "film says Seba", "RL 5 – FIT 4 (clock)"),
  rlf("10", "c2 ~9:09", "Leonid Smotrov", "Red Legion", "eliminated", "snake", "", "RL 5 – FIT 4 (clock)"),
  rlf("FINAL", "c2 (~183m)", "—", "—", "final (clock expires)", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk; VERIFY Malloy team; early points score-only", "FINAL Red Legion 5 – PaintballFIT 4"),
];
ROWS.push(...RLF_ROWS);

function tta(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "TonTon Arsenal vs Perris ASG Aftermath (Sun QF dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (~138–183m dual-feed; clips late-b, late-c1, late-c2); " + notes, scoreAfter };
}
const TTA_ROWS: Elim[] = [
  tta("1", "late-b", "unknown", "Perris ASG Aftermath", "point won by TonTon", "—", "score-only", "TT 1 – AM 0"),
  tta("2", "late-b", "unknown", "Perris ASG Aftermath", "point won by TonTon", "—", "score-only", "TT 2 – AM 0"),
  tta("3", "late-b", "unknown", "Perris ASG Aftermath", "point won by TonTon", "—", "score-only", "TT 3 – AM 0"),
  tta("4", "late-b", "unknown", "TonTon Arsenal", "point won by Aftermath", "—", "score-only", "TT 3 – AM 1"),
  tta("5", "late-b", "unknown", "Perris ASG Aftermath", "point won by TonTon", "—", "score-only", "TT 4 – AM 1"),
  tta("6", "c1 ~2:54", "Cody Woodruff", "Perris ASG Aftermath", "eliminated", "Dorito", "", "TT 5 – AM 1"),
  tta("6", "c1 ~2:57", "Devin Stuart", "Perris ASG Aftermath", "shot on fill", "Dorito", "", "TT 5 – AM 1"),
  tta("6", "c1 ~3:08", "Arrieta (+ remaining)", "Perris ASG Aftermath", "concede", "corner", "", "TT 5 – AM 1"),
  tta("7", "c1 ~8:46", "Benny Carroll", "TonTon Arsenal", "eliminated", "back center/Dorito", "", "TT 5 – AM 2"),
  tta("7", "c1 ~9:38", "Gladstone", "Perris ASG Aftermath", "trade w/ Fromholz", "center top", "", "TT 5 – AM 2"),
  tta("7", "c1 ~9:39", "Fromholz", "TonTon Arsenal", "trade w/ Gladstone", "—", "", "TT 5 – AM 2"),
  tta("7", "c1 ~9:49", "Mazurick", "Perris ASG Aftermath", "shot by Enfosi", "Dorito sideline", "", "TT 5 – AM 2"),
  tta("7", "c1 ~11:09", "Enfosi", "TonTon Arsenal", "eliminated", "back center tower", "", "TT 5 – AM 2"),
  tta("7", "c1 ~11:20", "Zach Carter", "Perris ASG Aftermath", "OOB", "snake", "", "TT 5 – AM 2"),
  tta("7", "c1 ~11:27", "Hugo", "TonTon Arsenal", "clock/concede", "—", "", "TT 5 – AM 2"),
  tta("8", "c2 ~2:38", "Gladstone", "Perris ASG Aftermath", "minor penalty", "snake", "", "TT 6 – AM 2"),
  tta("8", "c2 ~2:42", "Krombholz", "Perris ASG Aftermath (listed)", "eliminated", "snake", "VERIFY team (late-b listed Kromholz TonTon); possibly same as Fromholz", "TT 6 – AM 2"),
  tta("8", "c2 ~2:56", "Jeremy Dohn", "Perris ASG Aftermath", "eliminated", "Dorito clover", "", "TT 6 – AM 2"),
  tta("9", "c2 ~7:22", "Arrieta", "Perris ASG Aftermath", "shot by Hugo", "snake", "", "TT 7 – AM 2"),
  tta("9", "c2 ~7:26", "unknown", "Perris ASG Aftermath", "shot by Hugo", "snake", "", "TT 7 – AM 2"),
  tta("9", "c2 ~7:29", "Fozi", "Perris ASG Aftermath (listed)", "ref checkout", "Dorito", "after Mazurek line; VERIFY Fozi name/team (Enfosi TonTon?)", "TT 7 – AM 2"),
  tta("10", "c2 ~10:31", "unknown", "Perris ASG Aftermath", "eliminated", "snake attack", "1 of 2", "TT 8 – AM 2"),
  tta("10", "c2 ~10:31", "unknown", "Perris ASG Aftermath", "eliminated", "snake attack", "2 of 2", "TT 8 – AM 2"),
  tta("10", "c2 ~10:37", "Cody Woodruff", "Perris ASG Aftermath", "eliminated", "Dorito cross-field", "", "TT 8 – AM 2"),
  tta("10", "c2 ~10:48", "—", "Perris ASG Aftermath", "penalty", "—", "mercy point", "TT 8 – AM 2"),
  tta("FINAL", "c2 (~183m)", "—", "—", "final (mercy)", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk; VERIFY Krombholz/Fozi; early points score-only", "FINAL TonTon Arsenal 8 – Perris ASG Aftermath 2"),
];
ROWS.push(...TTA_ROWS);

function rlc(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Red Legion vs CK Hurricanes (Sun ochos dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (early dual-feed w/ AS/MATH; late-a FINAL point); " + notes, scoreAfter };
}
const RLC_ROWS: Elim[] = [
  rlc("1", "early", "unknown", "CK Hurricanes", "point won by RL", "—", "score-only; THIN — broadcast often on AS/MATH dual-feed; per-elim sparse", "RL 1 – Canes 0"),
  rlc("2", "early", "unknown", "CK Hurricanes", "point won by RL", "—", "score-only; THIN — broadcast often on AS/MATH dual-feed; per-elim sparse", "RL 2 – Canes 0"),
  rlc("3", "mid ~0:00–0:05", "Jake Raffield", "#24 CK Hurricanes", "shot", "snake (pushing toward stand-up wedge)", "mid-cut (wall ~18–36m of YT -NxgYj0epvk); clip opens mid-point at RL 2–0; clock 11:20", "RL 2 – Canes 0 in progress"),
  rlc("3", "mid ~1:22–1:29", "unknown", "CK Hurricanes", "shot by Corey Hall #19 (RL) cross-field", "back-center", "mid-cut; clock 9:57; Canes concede", "RL 3 – Canes 0"),
  rlc("4", "mid ~4:16–4:18", "Pavel Karsliev", "Red Legion", "shot by Konstantin Fedorov #88 (Canes) VERIFY", "off break", "mid-cut; early; shooter likely Fedorov from back-center; clock 9:43", "RL 3 – Canes 0 in progress"),
  rlc("4", "mid ~4:16–4:26", "Jake Raffield + 2 unknown", "#24 CK Hurricanes (x3)", "shot", "off break / early", "mid-cut; three Canes out (two off break, third shortly); only Fedorov + Brown left; clock ~9:39", "RL 3 – Canes 0 in progress"),
  rlc("4", "mid ~4:49–4:54", "Michael Brown", "CK Hurricanes", "shot by Corey Hall #19 (RL)", "snake push", "mid-cut; clock 9:10; broadcast cuts away, RL wins point off-screen", "RL 4 – Canes 0"),
  rlc("5", "mid ~8:40–8:45", "Pavel Karsliev + Leonid Smotrov", "Red Legion (x2)", "shot", "middle (off break)", "mid-cut; both RL shot off break; clock 8:44", "RL 4 – Canes 0 in progress"),
  rlc("5", "mid ~8:48–9:02", "remaining Canes incl. Konstantin Fedorov", "#88 CK Hurricanes", "shot by Corey Hall #19 (RL)", "field cleared from snake", "mid-cut; Hall untouched on snake clears field; clock 8:28", "RL 5 – Canes 0"),
  rlc("6", "late-a ~6:18", "unknown", "CK Hurricanes", "shot", "snake back/home", "clock 8:16", "Canes 0 – RL 5 in progress"),
  rlc("6", "late-a ~6:30", "Konstantin Fedorov", "#88 CK Hurricanes", "shot", "Dorito corner", "clock 8:04", "Canes 0 – RL 5 in progress"),
  rlc("6", "late-a ~6:32", "unknown", "CK Hurricanes", "shot", "snake brick", "clock 8:02", "Canes 0 – RL 5 in progress"),
  rlc("6", "late-a ~6:34", "unknown", "CK Hurricanes", "shot by Michael Johnson (RL)", "center clover", "clock 8:00", "Canes 0 – RL 5 in progress"),
  rlc("6", "late-a ~6:45", "Logan Dyer", "#15 CK Hurricanes", "shot by Corey Hall #19 (RL)", "snake", "desperation; clock ~7:50", "Canes 0 – RL 5 in progress"),
  rlc("FINAL", "late-a (clock 7:28)", "—", "—", "final (Corey Hall #19 buzzer)", "—", "Source YT https://www.youtube.com/watch?v=-NxgYj0epvk; PBLeagues agrees https://pbleagues.com/event/9321/schedule?action=stats&id=4022649; pt 1 thin/broadcast-skipped; pts 3–5 from mid-cut; mid-cut also saw FINAL @~7:46 clock (late-a @7:28 VERIFY)", "FINAL Red Legion 6 – CK Hurricanes 0"),
];
ROWS.push(...RLC_ROWS);

function rli(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Red Legion vs Edmonton Impact (Sun Set 4 semis MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ nxl-txo-26-sun-g4 set4-chunks dual-feed; " + notes, scoreAfter };
}
const RLI_ROWS: Elim[] = [
  rli("1", "p1a ~01:08 | clock ~13:51", "unknown", "Red Legion", "lane", "breakout / snake (home run)", "MLPB+ set4 dual-feed; Impact/RL open 0-0 @15:00", "Impact 1 – RL 0 in progress"),
  rli("1", "p1a ~02:05", "unknown (VERIFY #9?)", "Red Legion", "yellow-flag penalty", "Dorito", "MLPB+ set4; jersey VERIFY", "Impact 1 – RL 0 in progress"),
  rli("1", "p1a ~02:20–02:26 | clock 13:51", "unknown (remaining)", "Red Legion", "concede/walk-off", "field closeout", "Hits not all shown; Impact wins point", "Impact 1 – RL 0"),
  rli("2", "p1b ~01:12", "unknown", "Edmonton Impact", "shot running", "Dorito bottom-right", "MLPB+ set4 p1b; Impact bottom / RL top", "Impact 2 – RL 0 in progress"),
  rli("2", "p1b ~01:21", "unknown", "Red Legion", "shot / concede off-cam VERIFY", "back-center", "Impact awarded point; concede/off-cam VERIFY", "Impact 2 – RL 0"),
  rli("3", "p1b ~04:10 / replay ~04:51", "unknown", "Red Legion", "breakout", "Dorito", "Live + replay; RL bottom / Impact top", "Impact 2 – RL 0 in progress"),
  rli("3", "p1b ~04:11 / replay ~04:53", "unknown", "Edmonton Impact", "breakout", "Dorito", "MLPB+ set4 p1b", "Impact 2 – RL 0 in progress"),
  rli("3", "p1b ~04:30", "unknown", "Edmonton Impact", "shot", "snake", "MLPB+ set4 p1b", "Impact 2 – RL 0 in progress"),
  rli("3", "p1b ~05:10", "unknown (+ RL #92 trade/penalty VERIFY)", "Edmonton Impact / Red Legion", "trade/penalty VERIFY", "center-snake", "Both walk; RL #92 involved VERIFY", "Impact 2 – RL 0 in progress"),
  rli("3", "p1b buzzer", "unknown (buzzer)", "Red Legion", "buzzer", "home", "RL wins point", "Impact 2 – RL 1"),
  rli("4", "p2a ~04:05 | clock 12:24", "unknown", "Edmonton Impact", "shot", "post-break center", "Board open RL 1 – Impact 2", "Impact 2 – RL 1 in progress"),
  rli("4", "p2a ~04:07", "unknown", "Edmonton Impact", "breakout", "Dorito", "MLPB+ set4 p2a", "Impact 2 – RL 1 in progress"),
  rli("4", "p2a ~04:39 | clock 11:45", "Pavel Karsliev (SAFE check — not elim)", "#92 Red Legion", "checked SAFE", "field", "Not an elim; RL wins point → 2-2", "RL 2 – Impact 2"),
  rli("5", "p2b ~01:58 | clock 11:45", "unknown", "Edmonton Impact", "breakout slide", "Dorito", "Impact left / RL right", "RL 2 – Impact 2 in progress"),
  rli("5", "p2b ~03:31", "Alexander Berdnikov", "#77 Red Legion (VERIFY vs #11 roster)", "shot (hit off-cam)", "center/snake", "Jersey # VERIFY; more elims 02:10–03:48 off-cam", "RL 2 – Impact 2 in progress"),
  rli("5", "p2b ~04:08 | clock 10:10", "unknown (remaining)", "Edmonton Impact", "concede/off-cam", "field closeout", "VERIFY sparse mid-point elims dual-feed", "RL 3 – Impact 2"),
  rli("6", "p3a ~00:52 | clock 10:10", "unknown", "Edmonton Impact", "snake insert", "snake", "Board jump ~01:07 shows Impact 4 – RL 4 @9:56 — VERIFY glitch", "RL 3 – Impact 2 in progress"),
  rli("6", "p3a ~00:56", "unknown", "Edmonton Impact", "shot", "back center/home", "Treat as RL extends to 4–2 (score path); dual-feed glitch", "RL 4 – Impact 2"),
  rli("7", "p3a ~02:40 | clock 9:56", "unknown", "Red Legion", "breakout snake insert", "snake", "Two breaks/restarts @9:56; open as Impact 2 – RL 4", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~02:42", "unknown", "Edmonton Impact", "breakout", "Dorito", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~03:16", "unknown", "Red Legion", "shot", "snake corner", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~03:18", "unknown", "Red Legion", "shot", "mid Dorito", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~03:42", "unknown", "Red Legion", "shot", "Dorito corner", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~03:44", "unknown", "Red Legion", "shot", "back center", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~03:50", "unknown", "Red Legion", "shot", "snake", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~04:19", "unknown", "Edmonton Impact", "shot", "mid Dorito", "MLPB+ set4 p3a", "RL 4 – Impact 2 in progress"),
  rli("7", "p3a ~04:24 | clock 8:32", "unknown", "Edmonton Impact", "shot", "snake corner", "RL wins point", "RL 5 – Impact 2"),
  rli("8", "p3b between points", "Gaudin", "#91 Red Legion", "walks off", "pit/between points", "Walks off between points before break", "RL 5 – Impact 2 in progress"),
  rli("8", "p3b ~03:22 | clock 8:32", "unknown", "Edmonton Impact", "breakout", "Dorito back-right", "RL left / Impact right", "RL 5 – Impact 2 in progress"),
  rli("8", "p3b ~04:02", "unknown", "Red Legion", "shot VERIFY", "back-center/Dorito", "VERIFY", "RL 5 – Impact 2 in progress"),
  rli("8", "p3b ~04:22 | clock 7:27", "Stanczak", "#99 Edmonton Impact", "shot", "Dorito/center", "Named on film; Impact wins point", "Impact 3 – RL 5"),
  rli("9", "p4a ~01:45 | clock 7:27", "unknown", "Edmonton Impact", "shot", "center/back Dorito", "Impact left / RL right", "Impact 3 – RL 5 in progress"),
  rli("9", "p4a ~01:50–01:52", "unknown", "Edmonton Impact", "shot (ref)", "snake/back center", "RL wins point", "RL 6 – Impact 3"),
  rli("10", "p4a ~05:04 | clock 6:52", "unknown", "Edmonton Impact", "breakout", "Dorito", "Impact 3-out break", "RL 6 – Impact 3 in progress"),
  rli("10", "p4a ~05:05", "unknown", "Edmonton Impact", "breakout", "snake", "MLPB+ set4 p4a", "RL 6 – Impact 3 in progress"),
  rli("10", "p4a ~05:06", "unknown", "Edmonton Impact", "breakout", "back-center", "MLPB+ set4 p4a", "RL 6 – Impact 3 in progress"),
  rli("10", "p4a ~05:15", "unknown", "Edmonton Impact", "shot", "back-center", "MLPB+ set4 p4a", "RL 6 – Impact 3 in progress"),
  rli("10", "p4a ~05:20–05:22", "unknown", "Edmonton Impact", "bunkered / RL buzzer", "snake back", "RL run-through; dual-feed also in p4b ~00:08–01:21 wipe", "RL 7 – Impact 3"),
  rli("11", "p5a ~01:15–01:26 | clock ~3:xx", "Rabackoff (buzzer)", "#20 Edmonton Impact", "buzzer", "home", "Named on film; Impact to 4", "Impact 4 – RL 7"),
  rli("12", "p5a ~02:18", "unknown", "Red Legion", "breakout", "back-left", "Board glitch briefly shows TonTon/Damage", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~02:22", "unknown", "Red Legion", "breakout slide", "snake", "MLPB+ set4 p5a", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~02:32", "unknown", "Red Legion", "shot VERIFY", "center", "VERIFY", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~02:35", "unknown", "Edmonton Impact", "shot", "Dorito", "MLPB+ set4 p5a", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~02:38", "unknown", "Red Legion", "shot", "Dorito", "Point continues; later restart", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~04:02", "unknown", "Edmonton Impact", "shot", "Dorito run", "Second break ~03:54", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~04:16", "unknown", "Edmonton Impact", "shot", "center", "MLPB+ set4 p5a", "Impact 4 – RL 7 in progress"),
  rli("12", "p5a ~04:22–04:25 | clock ~", "unknown", "Edmonton Impact", "shot / RL buzzer", "Dorito", "RL buzzer ~04:25 → RL 8", "RL 8 – Impact 4"),
  rli("13", "p5b ~00:43 | clock 2:03", "Leival / Levine (spelling VERIFY)", "#13 Edmonton Impact", "elim off-cam VERIFY", "pit (elim off-cam)", "Feed freeze ~01:08–02:01 @1:08 clock", "RL 8 – Impact 4 in progress"),
  rli("13", "p5b ~02:02 | clock 1:06", "unknown (remaining)", "Edmonton Impact", "concede/off-cam", "field closeout", "Board RL 9 – Impact 4 after freeze", "RL 9 – Impact 4"),
  rli("14", "p5b ~05:15 | clock ~0:02", "Kirill Prikhidni (buzzer)", "#75 Red Legion", "buzzer (run-through dive)", "home / center", "Replay break ~04:10; FINAL", "FINAL Red Legion 10 – Edmonton Impact 4"),
  rli("FINAL", "p5b ~05:22 | clock 0:02", "—", "—", "final", "—", "Source MLPB+ nxl-txo-26-sun-g4 set4-chunks p1a–p5b dual-feed; VERIFY Berdnikov #, Leival/Levine spelling, board glitches", "FINAL Red Legion 10 – Edmonton Impact 4")
];
ROWS.push(...RLI_ROWS);

function dtt(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Tampa Bay Damage vs TonTon Arsenal (Sun Set 4 semis MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ nxl-txo-26-sun-g4 set4-chunks dual-feed; " + notes, scoreAfter };
}
const DTT_ROWS: Elim[] = [
  dtt("1", "p1a ~03:13 | clock 15:00", "unknown", "Tampa Bay Damage", "lane", "breakout / snake", "Open TonTon 0 – Damage 0; point not finalized on bug @12:33", "0-0 in progress"),
  dtt("1", "p1a ~03:15", "unknown", "TonTon Arsenal", "lane", "breakout / Dorito", "MLPB+ set4 p1a", "0-0 in progress"),
  dtt("1", "p1a ~04:17", "unknown", "Tampa Bay Damage", "snap/gunfight", "mid-Dorito", "MLPB+ set4 p1a", "0-0 in progress"),
  dtt("1", "p1a ~05:08", "unknown (VERIFY #91 name TA…)", "#91 TonTon Arsenal", "gunfight", "back-center/home", "Name VERIFY", "0-0 in progress"),
  dtt("1", "p1a ~05:18 | clock 12:33", "unknown (VERIFY #29?)", "TonTon Arsenal", "shot", "snake", "Board still 0-0 end of p1a; D1 finalized off-cam between chunks → Damage 1 (score-only)", "Damage 1 – TonTon 0 (score-only / off-cam)"),
  dtt("2", "p1b ~02:17", "unknown", "TonTon Arsenal", "breakout", "Dorito", "Damage bottom / TonTon top", "Damage 1 – TonTon 0 in progress"),
  dtt("2", "p1b ~02:22", "unknown", "TonTon Arsenal", "shot", "back center", "MLPB+ set4 p1b", "Damage 1 – TonTon 0 in progress"),
  dtt("2", "p1b ~02:40", "unknown", "TonTon Arsenal", "shot", "snake", "Damage snake push", "Damage 1 – TonTon 0 in progress"),
  dtt("2", "p1b ~03:07–03:13", "unknown", "TonTon Arsenal", "shot / Damage buzzer", "back Dorito", "Damage buzzer ~03:13", "Damage 2 – TonTon 0"),
  dtt("3", "p2a ~00:27 | clock 11:26", "unknown", "TonTon Arsenal", "breakout run", "Dorito", "Open TonTon 0 – Damage 2", "Damage 2 – TonTon 0 in progress"),
  dtt("3", "p2a ~01:13", "unknown", "TonTon Arsenal", "shot + flag", "snake", "MLPB+ set4 p2a", "Damage 2 – TonTon 0 in progress"),
  dtt("3", "p2a ~01:14", "unknown", "TonTon Arsenal", "pulled penalty", "center W", "From flag", "Damage 2 – TonTon 0 in progress"),
  dtt("3", "p2a ~01:38", "unknown", "TonTon Arsenal", "shot", "back Dorito", "MLPB+ set4 p2a", "Damage 2 – TonTon 0 in progress"),
  dtt("3", "p2a ~02:18", "unknown (#13)", "#13 TonTon Arsenal", "shot", "center W", "Leval? VERIFY vs Impact #13", "Damage 2 – TonTon 0 in progress"),
  dtt("3", "p2a ~02:27 | clock 8:44", "unknown (last)", "TonTon Arsenal", "shot", "snake corner", "SCORES 3–3 graphic glitch ~03:10 VERIFY", "Damage 3 – TonTon 0"),
  dtt("3b", "p2a ~02:50 | clock 9:04", "Zaghini", "#31 TonTon Arsenal", "shot (head/hopper)", "Dorito", "Clock jump; may be next-point breakout", "Damage 3 – TonTon 0 in progress"),
  dtt("4", "p2b ~00:43 | clock 8:36", "unknown", "Tampa Bay Damage", "shot (run-through attempt)", "Dorito", "Damage left / TonTon right", "Damage 3 – TonTon 0 in progress"),
  dtt("4", "p2b ~00:47", "unknown", "Tampa Bay Damage", "shot", "center", "MLPB+ set4 p2b", "Damage 3 – TonTon 0 in progress"),
  dtt("4", "p2b ~00:48 | clock 7:37", "Alex Goldman", "#89 Tampa Bay Damage", "shot (last man)", "snake", "Named on film; TonTon wins point", "TonTon 1 – Damage 3"),
  dtt("5", "p2b ~04:57", "unknown", "Tampa Bay Damage", "breakout", "Dorito", "ANOMALY point; TonTon left / Damage right", "TonTon 1 – Damage 3 in progress"),
  dtt("5", "p2b ~04:58", "unknown", "Tampa Bay Damage", "breakout", "center", "Damage 3-out break then TonTon 5v2 push", "TonTon 1 – Damage 3 in progress"),
  dtt("5", "p2b ~05:01", "unknown", "Tampa Bay Damage", "breakout", "back Dorito", "MLPB+ set4 p2b", "TonTon 1 – Damage 3 in progress"),
  dtt("5", "p2b ~05:33 | clock 7:02", "unknown (TonTon hang-with-hit / major VERIFY)", "TonTon Arsenal", "hang-with-hit / major → point awarded VERIFY", "field", "Abrupt end after TonTon 5v2 push; Damage awarded — VERIFY anomaly", "Damage 4 – TonTon 1 (anomaly)"),
  dtt("6", "p3a ~01:49", "unknown", "TonTon Arsenal", "breakout", "Dorito outside", "Damage left / TonTon right", "Damage 4 – TonTon 1 in progress"),
  dtt("6", "p3a ~02:06", "unknown", "TonTon Arsenal", "shot", "snake corner", "MLPB+ set4 p3a", "Damage 4 – TonTon 1 in progress"),
  dtt("6", "p3a ~02:08", "unknown", "Tampa Bay Damage", "snake trade", "snake", "MLPB+ set4 p3a", "Damage 4 – TonTon 1 in progress"),
  dtt("6", "p3a ~02:11", "unknown", "TonTon Arsenal", "shot", "back center", "MLPB+ set4 p3a", "Damage 4 – TonTon 1 in progress"),
  dtt("6", "p3a ~02:15", "unknown", "TonTon Arsenal", "shot", "Dorito", "MLPB+ set4 p3a", "Damage 4 – TonTon 1 in progress"),
  dtt("6", "p3a ~02:20 | clock 6:41", "unknown (last)", "TonTon Arsenal", "concede", "Dorito corner", "Damage wins point", "Damage 5 – TonTon 1"),
  dtt("7", "p3b ~00:24 | clock 6:28", "unknown (dark jersey)", "team VERIFY", "yellow-flag penalty", "snake", "Team VERIFY; SCORES 6–6 glitch before settle", "Damage 5 – TonTon 1 in progress"),
  dtt("7", "p3b ~00:28", "unknown", "team VERIFY", "walks deadbox", "center/Dorito", "VERIFY team", "Damage 5 – TonTon 1 in progress"),
  dtt("7", "p3b ~02:24", "unknown (remaining)", "TonTon Arsenal", "concede/off-cam", "field closeout", "Board Damage 6 – TonTon 1 after 6–6 glitch", "Damage 6 – TonTon 1"),
  dtt("8", "p3b ~05:23", "unknown", "Tampa Bay Damage", "breakout", "back-center", "Clip ends mid-point; p4a opens TonTon 2 – Damage 6", "Damage 6 – TonTon 1 in progress"),
  dtt("8", "p3b ~05:25", "unknown", "TonTon Arsenal", "breakout snake push", "snake", "MLPB+ set4 p3b", "Damage 6 – TonTon 1 in progress"),
  dtt("8", "p3b ~05:32 → p4a board", "unknown (remaining)", "Tampa Bay Damage", "concede/off-cam", "field closeout", "Thin closeout dual-feed; TonTon wins → 2–6", "TonTon 2 – Damage 6"),
  dtt("9", "p4a ~02:46 | clock 3:33", "unknown", "TonTon Arsenal", "breakout", "snake", "Board open TonTon 2 – Damage 6", "TonTon 2 – Damage 6 in progress"),
  dtt("9", "p4a ~02:48", "unknown", "TonTon Arsenal", "breakout", "Dorito", "MLPB+ set4 p4a", "TonTon 2 – Damage 6 in progress"),
  dtt("9", "p4a ~02:51", "unknown", "TonTon Arsenal", "breakout VERIFY", "back-center/Dorito", "VERIFY", "TonTon 2 – Damage 6 in progress"),
  dtt("9", "p4a ~03:10", "unknown", "TonTon Arsenal", "shot", "Dorito", "Implied from truncated note", "TonTon 2 – Damage 6 in progress"),
  dtt("9", "p4a ~03:43–04:13", "unknown", "TonTon Arsenal", "bunkered (Damage run-through)", "center/snake", "Damage wins → 7–2", "Damage 7 – TonTon 2"),
  dtt("9b", "p4b ~03:56", "unknown", "Tampa Bay Damage", "breakout", "snake", "Mid point after D7-T2 board; may be T3 start", "Damage 7 – TonTon 2 in progress"),
  dtt("9b", "p4b ~03:58", "unknown", "Tampa Bay Damage", "breakout", "center X", "MLPB+ set4 p4b", "Damage 7 – TonTon 2 in progress"),
  dtt("9b", "p4b ~04:20–04:26", "Szpytma", "#89 TonTon Arsenal", "shot (ground replay)", "Dorito", "Named on film; replay ~04:26", "Damage 7 – TonTon 2 in progress"),
  dtt("9b", "p4b ~04:23", "unknown", "Tampa Bay Damage", "shot", "Dorito", "MLPB+ set4 p4b", "Damage 7 – TonTon 2 in progress"),
  dtt("10", "p4b–p5a gap", "unknown", "Tampa Bay Damage", "point won by TonTon (score-only)", "—", "Dual-feed skip; score reaches Damage 7 – TonTon 3", "TonTon 3 – Damage 7 (score-only)"),
  dtt("11", "p4b–p5a gap", "unknown", "Tampa Bay Damage", "point won by TonTon (score-only)", "—", "Dual-feed skip; p5a opens Damage 7 – TonTon 4", "TonTon 4 – Damage 7 (score-only)"),
  dtt("12", "p5a ~05:22", "unknown", "Tampa Bay Damage", "breakout", "snake", "Board Damage 7 – TonTon 4; Damage top / TonTon bottom", "TonTon 4 – Damage 7 in progress"),
  dtt("12", "p5a ~05:27", "unknown", "TonTon Arsenal", "shot VERIFY", "center snake", "VERIFY", "TonTon 4 – Damage 7 in progress"),
  dtt("12", "p5a ~05:31", "unknown", "Tampa Bay Damage", "shot", "back center", "MLPB+ set4 p5a", "TonTon 4 – Damage 7 in progress"),
  dtt("12", "p5a ~05:42", "unknown", "Tampa Bay Damage", "shot", "Dorito", "MLPB+ set4 p5a", "TonTon 4 – Damage 7 in progress"),
  dtt("12", "p5a ~05:54–06:11", "Anfossi (buzzer)", "#7 TonTon Arsenal", "buzzer (snake run)", "snake / home", "Was Enfosi/Infossi in earlier notes — same player VERIFY spelling", "TonTon 5 – Damage 7"),
  dtt("13", "p5b ~03:09 | clock 0:23", "unknown", "TonTon Arsenal", "stands/walks VERIFY", "Dorito", "Last 23s break ~02:49", "TonTon 5 – Damage 7 in progress"),
  dtt("FINAL", "p5b clock 0:00", "—", "—", "final (clock expires)", "—", "Source MLPB+ nxl-txo-26-sun-g4 set4-chunks p1a–p5b dual-feed; VERIFY D4 anomaly, T3/T4 thin, Anfossi spelling", "FINAL Tampa Bay Damage 7 – TonTon Arsenal 5")
];
ROWS.push(...DTT_ROWS);

function sih(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Detroit Infamous vs Houston Heat (Sat Set 4 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 4 sat4-chunks dual-feed; " + notes, scoreAfter };
}
const SIH_ROWS: Elim[] = [
  sih("1", "sat4-p1 ~01:42", "unknown", "Houston Heat", "shot off-cam", "snake", "Heat snake elim off-cam", "Infamous 0 – Heat 0 in progress"),
  sih("1", "sat4-p1 ~01:45", "unknown", "Houston Heat", "shot", "dorito", "Inf buzzer ~01:48 → 1–0", "Infamous 1 – Heat 0"),
  sih("2", "sat4-p1 ~05:17", "unknown", "Detroit Infamous", "breakout", "back center", "VERIFY: film awards Heat; graphic said Inf 2–0", "Infamous 1 – Heat 0 in progress"),
  sih("2", "sat4-p1 ~05:22", "unknown", "Detroit Infamous", "breakout", "snake", "VERIFY dual-feed / graphic bug", "Infamous 1 – Heat 0 in progress"),
  sih("2", "sat4-p1 ~05:24", "unknown", "Detroit Infamous", "breakout", "dorito", "Heat buzzer ~06:14; true ~1–1", "Infamous 1 – Heat 1"),
  sih("3", "sat4-p1 ~10:31", "unknown", "Houston Heat", "breakout", "dorito", "Clip ends mid-point; P3 closeout thin / dual-feed VERIFY", "Infamous 1 – Heat 1 in progress"),
  sih("4", "sat4-p2 ~03:09 | clock 11:06", "unknown", "Detroit Infamous", "shot", "center-snake", "VERIFY who; scoreboard lag common this set", "Infamous ~3 – Heat 0 in progress (graphic)"),
  sih("4", "sat4-p2 ~03:21 | clock 10:54", "unknown (remaining)", "Houston Heat", "concede", "various", "Heat concede; Inf extends early lead", "Infamous 4 – Heat 0"),
  sih("5", "sat4-mid ~00:15", "unknown", "Houston Heat", "breakout", "dorito", "VERIFY; score in Inf 4–0", "Infamous 4 – Heat 0 in progress"),
  sih("5", "sat4-mid ~00:27", "unknown", "Houston Heat", "bunker", "dorito", "VERIFY", "Infamous 4 – Heat 0 in progress"),
  sih("5", "sat4-mid ~00:48", "Andres Ramos Saldana", "#27 Houston Heat", "bunker", "center/snake", "Named on film", "Infamous 4 – Heat 0 in progress"),
  sih("5", "sat4-mid ~00:54", "unknown", "Houston Heat", "bunker", "snake back", "VERIFY", "Infamous 4 – Heat 0 in progress"),
  sih("5", "sat4-mid ~01:07", "unknown", "Houston Heat", "bunker", "back center", "Inf pinch/squeeze → Inf 5–0", "Infamous 5 – Heat 0"),
  sih("6", "sat4-mid ~05:20", "unknown", "Houston Heat", "breakout", "dorito", "VERIFY", "Infamous 5 – Heat 0 in progress"),
  sih("6", "sat4-mid ~05:23", "unknown", "Detroit Infamous", "bunker", "dorito", "VERIFY", "Infamous 5 – Heat 0 in progress"),
  sih("6", "sat4-mid ~05:27", "unknown", "Detroit Infamous", "bunker", "center", "VERIFY", "Infamous 5 – Heat 0 in progress"),
  sih("6", "sat4-mid ~05:32", "unknown", "Houston Heat", "bunker", "snake", "VERIFY", "Infamous 5 – Heat 0 in progress"),
  sih("6", "sat4-mid ~05:41", "unknown", "Detroit Infamous", "bunker", "snake", "VERIFY", "Infamous 5 – Heat 0 in progress"),
  sih("6", "sat4-mid ~05:48", "unknown", "Detroit Infamous", "bunker", "back center", "Heat buzzer ~05:51 → Inf 5–1", "Infamous 5 – Heat 1"),
  sih("7", "sat4 gap (mid→bridge)", "unknown", "Houston Heat", "point won by Infamous (score-only)", "—", "THIN gap dual-feed; Inf → ~6–1 VERIFY path", "Infamous 6 – Heat 1 (score-only VERIFY)"),
  sih("8", "sat4 gap (mid→bridge)", "unknown", "Detroit Infamous", "point won by Heat (score-only)", "—", "THIN gap; bridge P9 enters ~Inf 6–2", "Infamous 6 – Heat 2 (score-only VERIFY)"),
  sih("9", "sat4-bridgeA ~01:21", "unknown", "Detroit Infamous", "breakout", "back center", "VERIFY", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:22", "unknown", "Houston Heat", "breakout", "dorito", "VERIFY", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:24", "unknown", "Detroit Infamous", "breakout", "dorito", "VERIFY", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:46", "unknown", "Houston Heat", "shot", "snake", "VERIFY", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:54", "unknown", "Houston Heat", "shot", "center", "VERIFY", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:55", "unknown (Inf 1/3 VERIFY)", "Detroit Infamous", "shot off-cam", "various", "Off-cam Inf elim during Heat push; order approximate", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:56", "unknown (Inf 2/3 VERIFY)", "Detroit Infamous", "shot off-cam", "various", "Off-cam Inf elim during Heat push; order approximate", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~01:57", "unknown (Inf 3/3 VERIFY)", "Detroit Infamous", "shot off-cam", "various", "Off-cam Inf elim during Heat push; order approximate", "Infamous 6 – Heat 2 in progress"),
  sih("9", "sat4-bridgeA ~02:02", "Samuel Monville (buzzer)", "#66 Houston Heat", "buzzer (snake run)", "snake / home", "Samuel Monville #66 snake steal; PBLeagues roster spelling", "Infamous 6 – Heat 3"),
  sih("10", "sat4-bridgeA ~04:28", "unknown", "Detroit Infamous", "breakout", "dorito", "VERIFY; simultaneous Heat snake break", "Infamous 6 – Heat 3 in progress"),
  sih("10", "sat4-bridgeA ~04:28", "unknown", "Houston Heat", "breakout", "snake", "VERIFY", "Infamous 6 – Heat 3 in progress"),
  sih("10", "sat4-bridgeA ~04:29", "unknown", "Houston Heat", "breakout", "dorito", "VERIFY", "Infamous 6 – Heat 3 in progress"),
  sih("10", "sat4-bridgeA ~04:30", "unknown", "Detroit Infamous", "breakout", "back center", "VERIFY", "Infamous 6 – Heat 3 in progress"),
  sih("10", "sat4-bridgeA ~04:32", "unknown", "Houston Heat", "breakout", "back center", "VERIFY", "Infamous 6 – Heat 3 in progress"),
  sih("10", "sat4-bridgeA ~04:34", "unknown", "Detroit Infamous", "shot", "snake corner", "2v2 stalemate rest of clip; score stays 6–3", "Infamous 6 – Heat 3"),
  sih("11", "sat4 gap (bridgeA→B)", "unknown", "Detroit Infamous", "point won by Heat (score-only)", "—", "THIN; bridgeB next point enters Inf 6 – Heat 4", "Infamous 6 – Heat 4 (score-only VERIFY)"),
  sih("12", "sat4-bridgeB ~02:05", "unknown", "Houston Heat", "breakout", "snake", "VERIFY", "Infamous 6 – Heat 4 in progress"),
  sih("12", "sat4-bridgeB ~02:09", "unknown", "Houston Heat", "shot", "dorito corner", "VERIFY", "Infamous 6 – Heat 4 in progress"),
  sih("12", "sat4-bridgeB ~04:14 (1/3)", "unknown (Heat 1/3)", "Houston Heat", "concede", "snake", "After Inf snake push; 0 Inf losses this point", "Infamous 6 – Heat 4 in progress"),
  sih("12", "sat4-bridgeB ~04:14 (2/3)", "unknown (Heat 2/3)", "Houston Heat", "concede", "back", "After Inf snake push; 0 Inf losses this point", "Infamous 6 – Heat 4 in progress"),
  sih("12", "sat4-bridgeB ~04:14 (3/3)", "unknown (Heat 3/3)", "Houston Heat", "concede", "dorito", "After Inf snake push; 0 Inf losses this point", "Infamous 6 – Heat 4 in progress"),
  sih("12", "sat4-bridgeB ~04:17", "unknown (Inf buzzer)", "Detroit Infamous", "buzzer", "home", "Inf → 7–4", "Infamous 7 – Heat 4"),
  sih("13", "sat4-late ~00:57", "Dany Schonauer", "#4 Detroit Infamous", "shot", "snake", "Named on film; PBLeagues jersey null; film #4 (prior Set2 #49)", "Infamous 7 – Heat 4 in progress"),
  sih("13", "sat4-late ~01:02", "unknown", "Houston Heat", "shot", "dorito", "VERIFY", "Infamous 7 – Heat 4 in progress"),
  sih("13", "sat4-late ~01:07", "unknown", "Houston Heat", "shot", "center", "Point → Inf 8–4 ~01:38", "Infamous 8 – Heat 4"),
  sih("14", "sat4-late ~05:21", "unknown", "Houston Heat", "shot", "snake", "VERIFY; P14 ongoing Inf 8–4", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-late ~05:27", "unknown", "Detroit Infamous", "shot", "snake", "VERIFY", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-late ~05:43", "unknown", "Houston Heat", "shot", "dorito", "VERIFY", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-late ~05:47", "unknown", "Detroit Infamous", "shot", "dorito", "VERIFY", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-late ~05:50", "unknown", "Houston Heat", "shot", "center", "VERIFY", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-close ~00:05", "unknown", "Houston Heat", "shot", "dorito", "P14 continue from late clip", "Infamous 8 – Heat 4 in progress"),
  sih("14", "sat4-close ~00:34", "Kyle Bowen (buzzer)", "#69 Detroit Infamous", "buzzer", "home", "Heat timeout :09; match over. PBLeagues roster: Kyle only (no Cody)", "FINAL Infamous 9 – Heat 4"),
  sih("FINAL", "sat4-close ~00:34", "—", "—", "final", "—", "Source MLPB+ saturday-set-4… ~65m sat4-chunks dual-feed; early graphic VERIFY (P2 Heat on film)", "FINAL Detroit Infamous 9 – Houston Heat 4")
];
ROWS.push(...SIH_ROWS);

function sca(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "CK Hurricanes vs Chicago Aftershock (Sat Set 4 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 4 sat4-chunks dual-feed; " + notes, scoreAfter };
}
const SCA_ROWS: Elim[] = [
  sca("1", "sat4-p1 ~02:40", "unknown", "Chicago Aftershock", "breakout", "back center", "VERIFY", "Canes 0 – Aftershock 0 in progress"),
  sca("1", "sat4-p1 ~02:57", "unknown", "CK Hurricanes", "snap", "dorito", "VERIFY", "Canes 0 – Aftershock 0 in progress"),
  sca("1", "sat4-p1 ~03:37", "unknown", "Chicago Aftershock", "bunker", "center", "VERIFY", "Canes 0 – Aftershock 0 in progress"),
  sca("1", "sat4-p1 ~03:40", "unknown", "Chicago Aftershock", "bunker", "snake", "VERIFY", "Canes 0 – Aftershock 0 in progress"),
  sca("1", "sat4-p1 ~03:42", "Jared Lackey", "#21 Chicago Aftershock", "walk-off", "dorito", "VERIFY walkoff; Canes buzzer → 1–0. VERIFY side: roster Aftershock; film dual-feed", "Canes 1 – Aftershock 0"),
  sca("2", "sat4-p1 ~07:11", "unknown", "Chicago Aftershock", "breakout", "back center", "VERIFY", "Canes 1 – Aftershock 0 in progress"),
  sca("2", "sat4-p1 ~07:12", "unknown", "Chicago Aftershock", "breakout", "dorito", "VERIFY", "Canes 1 – Aftershock 0 in progress"),
  sca("2", "sat4-p1 ~07:59", "unknown", "Chicago Aftershock", "bunker", "snake", "VERIFY", "Canes 1 – Aftershock 0 in progress"),
  sca("2", "sat4-p1 ~08:01", "unknown", "Chicago Aftershock", "bunker", "center", "VERIFY", "Canes 1 – Aftershock 0 in progress"),
  sca("2", "sat4-p1 ~08:03", "unknown", "Chicago Aftershock", "bunker", "dorito", "Canes buzzer → 2–0", "Canes 2 – Aftershock 0"),
  sca("3", "sat4-p2 ~00:41 | clock 11:16", "unknown", "CK Hurricanes", "shot", "snake 1", "VERIFY; early snake; scoreboard may lag", "Canes 2 – Aftershock 0 in progress"),
  sca("3", "sat4-p2 ~01:21 | clock 10:35", "Gant MacLellan", "#56 Chicago Aftershock", "shot", "center-dorito", "VERIFY #56. VERIFY side: roster Aftershock; film dual-feed", "Canes 2 – Aftershock 0 in progress"),
  sca("3", "sat4-p2 ~01:26 | clock 10:30", "Clayton Hughes", "#27 Chicago Aftershock", "walked off", "back left", "Named on film. VERIFY side: roster Aftershock; film dual-feed", "Canes 2 – Aftershock 0 in progress"),
  sca("3", "sat4-p2 ~01:36 | clock 10:26", "unknown (remaining Canes)", "CK Hurricanes", "concede", "various", "AS wins point; end-of-clip score Canes 2 – AS 1", "Canes 2 – Aftershock 1"),
  sca("4", "sat4-mid ~02:22", "unknown", "Chicago Aftershock", "breakout", "snake", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~02:27", "unknown", "CK Hurricanes", "bunker", "snake", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~02:37", "unknown", "Chicago Aftershock", "bunker", "dorito", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~02:48", "unknown", "CK Hurricanes", "bunker", "dorito", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~03:22", "unknown", "CK Hurricanes", "bunker", "dorito back", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~04:06", "unknown", "Chicago Aftershock", "bunker", "snake", "VERIFY", "Canes 2 – Aftershock 1 in progress"),
  sca("4", "sat4-mid ~04:08", "unknown", "CK Hurricanes", "bunker", "center", "AS buzzer ~04:12 → 2–2", "Canes 2 – Aftershock 2"),
  sca("5", "sat4-mid ~07:59", "unknown", "Chicago Aftershock", "breakout", "snake", "VERIFY", "Canes 2 – Aftershock 2 in progress"),
  sca("5", "sat4-mid ~08:05", "unknown", "Chicago Aftershock", "bunker", "dorito", "VERIFY", "Canes 2 – Aftershock 2 in progress"),
  sca("5", "sat4-mid ~08:16", "unknown", "Chicago Aftershock", "bunker", "center", "VERIFY", "Canes 2 – Aftershock 2 in progress"),
  sca("5", "sat4-mid ~08:24", "unknown", "CK Hurricanes", "bunker", "dorito", "VERIFY", "Canes 2 – Aftershock 2 in progress"),
  sca("5", "sat4-mid ~08:30", "unknown", "Chicago Aftershock", "bunker", "back center", "VERIFY", "Canes 2 – Aftershock 2 in progress"),
  sca("5", "sat4-mid ~08:39", "unknown", "Chicago Aftershock", "bunker", "snake", "Jake Raffield #26 Canes buzzer ~09:07", "Canes 3 – Aftershock 2"),
  sca("5", "sat4-mid ~09:07", "Jake Raffield (buzzer)", "#26 CK Hurricanes", "buzzer", "home", "Named on film", "Canes 3 – Aftershock 2"),
  sca("6", "sat4 gap (mid→bridge)", "unknown", "Chicago Aftershock", "point won by Canes (score-only)", "—", "THIN gap; bridge P7 opens ~Canes 4–2", "Canes 4 – Aftershock 2 (score-only VERIFY)"),
  sca("7", "sat4-bridgeA ~00:13", "unknown", "Chicago Aftershock", "shot", "dorito", "VERIFY", "Canes 4 – Aftershock 2 in progress"),
  sca("7", "sat4-bridgeA ~00:19", "unknown", "Chicago Aftershock", "penalty", "center", "VERIFY", "Canes 4 – Aftershock 2 in progress"),
  sca("7", "sat4-bridgeA ~00:26", "unknown", "Chicago Aftershock", "bunkered", "snake", "Canes buzzer ~00:27 → 5–2", "Canes 5 – Aftershock 2"),
  sca("8", "sat4-bridgeA ~03:01", "unknown", "Chicago Aftershock", "breakout", "back center", "VERIFY", "Canes 5 – Aftershock 2 in progress"),
  sca("8", "sat4-bridgeA ~03:02", "unknown", "CK Hurricanes", "breakout", "dorito", "VERIFY", "Canes 5 – Aftershock 2 in progress"),
  sca("8", "sat4-bridgeA ~03:03", "unknown", "Chicago Aftershock", "breakout", "dorito", "VERIFY", "Canes 5 – Aftershock 2 in progress"),
  sca("8", "sat4-bridgeA ~03:22", "unknown", "Chicago Aftershock", "shot", "center", "VERIFY", "Canes 5 – Aftershock 2 in progress"),
  sca("8", "sat4-bridgeA ~03:23", "unknown", "Chicago Aftershock", "shot", "snake", "VERIFY", "Canes 5 – Aftershock 2 in progress"),
  sca("8", "sat4-bridgeA ~03:25", "unknown", "Chicago Aftershock", "bunkered", "back right", "Canes buzzer ~03:29 → 6–2", "Canes 6 – Aftershock 2"),
  sca("9", "sat4-bridgeB ~00:11", "unknown", "CK Hurricanes", "shot", "dorito corner", "VERIFY early", "Canes 6 – Aftershock 2 in progress"),
  sca("9", "sat4-bridgeB ~01:02", "Andrew Bell", "#20 CK Hurricanes", "shot", "back center", "Named on film; PBLeagues jersey null; film #20 (prior Drew Bell #58)", "Canes 6 – Aftershock 2 in progress"),
  sca("9", "sat4-bridgeB ~01:05", "unknown (#3? Canes)", "CK Hurricanes", "shot", "dorito", "VERIFY #3", "Canes 6 – Aftershock 2 in progress"),
  sca("9", "sat4-bridgeB ~01:14", "unknown", "Chicago Aftershock", "penalty/concession VERIFY", "various", "No buzzer; AS had man advantage; → Canes 7–2 VERIFY", "Canes 7 – Aftershock 2"),
  sca("10", "sat4-bridgeB ~05:19", "unknown", "CK Hurricanes", "shot", "back center", "VERIFY early", "Canes 7 – Aftershock 2 in progress"),
  sca("10", "sat4-bridgeB ~05:51", "unknown", "Chicago Aftershock", "bunkered", "dorito corner", "By Canes run", "Canes 7 – Aftershock 2 in progress"),
  sca("10", "sat4-bridgeB ~05:52 (1/3)", "unknown (AS 1/3)", "Chicago Aftershock", "concede", "various", "Canes buzzer ~05:55 → 8–2; order approximate", "Canes 7 – Aftershock 2 in progress"),
  sca("10", "sat4-bridgeB ~05:53 (2/3)", "unknown (AS 2/3)", "Chicago Aftershock", "concede", "various", "Canes buzzer ~05:55 → 8–2; order approximate", "Canes 7 – Aftershock 2 in progress"),
  sca("10", "sat4-bridgeB ~05:54 (3/3)", "unknown (AS 3/3)", "Chicago Aftershock", "concede", "various", "Canes buzzer ~05:55 → 8–2; order approximate", "Canes 8 – Aftershock 2"),
  sca("11", "sat4-late ~02:43", "unknown", "CK Hurricanes", "shot", "snake (dive)", "VERIFY; scoreboard lag after 8–2", "Canes 8 – Aftershock 2 in progress"),
  sca("11", "sat4-late ~02:57", "unknown (#03 AS)", "#03 Chicago Aftershock", "shot", "dorito", "VERIFY unmapped #03 (Hinds #3?); AS wins point — scoreAfter VERIFY lag", "Canes 8 – Aftershock 3 (graphic 7–4 VERIFY)"),
  sca("12", "sat4-close ~03:05–03:40", "unknown", "Chicago Aftershock", "elim off-cam", "various", "Elims indistinct off-cam VERIFY", "Canes ~7 – Aftershock ~4 in progress (VERIFY)"),
  sca("12", "sat4-close ~03:46", "Ryan Hoskinson (buzzer)", "#42 Chicago Aftershock", "buzzer (snake)", "snake", "Yellow flag then point awarded; AS → 5 path", "Canes 7 – Aftershock 5 (scoreboard VERIFY)"),
  sca("13", "sat4-final ~01:21", "unknown", "Chicago Aftershock", "shot", "home/center", "Drone replay; enter ~7–5", "Canes 7 – Aftershock 5 in progress"),
  sca("13", "sat4-final ~01:22", "unknown", "Chicago Aftershock", "shot", "center 50", "VERIFY", "Canes 7 – Aftershock 5 in progress"),
  sca("13", "sat4-final ~01:33", "unknown", "CK Hurricanes", "shot", "dorito", "VERIFY", "Canes 7 – Aftershock 5 in progress"),
  sca("13", "sat4-final ~01:38", "unknown", "Chicago Aftershock", "shot", "dorito", "VERIFY", "Canes 7 – Aftershock 5 in progress"),
  sca("13", "sat4-final ~01:42", "unknown", "Chicago Aftershock", "shot", "snake", "VERIFY", "Canes 7 – Aftershock 5 in progress"),
  sca("13", "sat4-final ~01:45", "unknown", "Chicago Aftershock", "shot", "back center", "→ Canes 8–5", "Canes 8 – Aftershock 5"),
  sca("14", "sat4-final ~03:40", "unknown", "CK Hurricanes", "breakout", "center", "VERIFY; 36s left", "Canes 8 – Aftershock 5 in progress"),
  sca("14", "sat4-final ~03:41", "unknown", "Chicago Aftershock", "breakout", "dorito", "VERIFY", "Canes 8 – Aftershock 5 in progress"),
  sca("14", "sat4-final ~03:42", "unknown", "CK Hurricanes", "dive", "snake", "VERIFY", "Canes 8 – Aftershock 5 in progress"),
  sca("14", "sat4-final ~04:08", "— (clock expires)", "—", "clock-out", "—", "Walkoff AS #42 Hoskinson, #16 Stancel, #30 Daniela Rojas Jr; FINAL", "FINAL Canes 8 – Aftershock 5"),
  sca("FINAL", "sat4-final ~04:08 | clock 0:00", "—", "—", "final", "—", "Source MLPB+ saturday-set-4… ~65m sat4-chunks dual-feed; late scoreboard lag VERIFY; do not log Tampa/Jungle Cats overrun", "FINAL CK Hurricanes 8 – Chicago Aftershock 5")
];
ROWS.push(...SCA_ROWS);

function sdu(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Tampa Bay Damage vs Seattle Uprising (Sat Set 5 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 5 sat5-chunks dual-feed; " + notes, scoreAfter };
}
const SDU_ROWS: Elim[] = [
  // P1 → Damage 1–0
  sdu("1", "sat5-p1 ~01:20", "unknown", "Seattle Uprising", "shot", "center", "VERIFY dual-feed open; NYX flash SCOREBOARD-LAG", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:25", "unknown", "Seattle Uprising", "shot", "back right", "VERIFY", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:30", "unknown", "Seattle Uprising", "shot", "dorito", "VERIFY", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:35", "unknown", "Tampa Bay Damage", "shot", "various", "Damage one out early", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:38", "unknown", "Seattle Uprising", "shot", "snake", "VERIFY", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:40", "unknown", "Seattle Uprising", "shot", "back right", "VERIFY", "Damage 0 – Uprising 0 in progress"),
  sdu("1", "sat5-p1 ~01:43", "Alex Goldman (buzzer) VERIFY", "#89 Tampa Bay Damage", "buzzer", "home", "VERIFY: film also claimed Edwards buzzer; Goldman #89 preferred when #89 visible; Edwards vs Margott #33 separate", "Damage 1 – Uprising 0"),
  // P2 → Damage 2–0
  sdu("2", "sat5-open ~02:49", "unknown", "Tampa Bay Damage", "shot", "dorito", "VERIFY", "Damage 1 – Uprising 0 in progress"),
  sdu("2", "sat5-open ~02:51", "unknown", "Seattle Uprising", "trade", "dorito", "Dorito trade", "Damage 1 – Uprising 0 in progress"),
  sdu("2", "sat5-open ~03:50", "Austin Woodward", "#2 Seattle Uprising", "shot", "center", "Named #2 on film; prior notes also #3 — jersey VERIFY film-only", "Damage 1 – Uprising 0 in progress"),
  sdu("2", "sat5-open ~04:02", "unknown", "Seattle Uprising", "shot", "snake", "VERIFY", "Damage 1 – Uprising 0 in progress"),
  sdu("2", "sat5-open ~04:05", "Marcello Margott (buzzer) VERIFY", "#33 Tampa Bay Damage", "buzzer", "home", "VERIFY #33 identity: Margott is #33 on allowlist/PLAYERS; film also claimed Edwards on #33 buzzer — keep VERIFY", "Damage 2 – Uprising 0"),
  // P3 → Up 1 (thin; SCOREBOARD-LAG flash 1-1 rejected)
  sdu("3", "sat5 gap (open→early)", "unknown", "Tampa Bay Damage", "point won by Uprising (score-only)", "—", "THIN dual-feed; board flash 1-1 @04:09 SCOREBOARD-LAG — visual held Damage 2–0 then Up point → 2–1 VERIFY path", "Damage 2 – Uprising 1 (score-only VERIFY)"),
  // P4 → Damage 3–1
  sdu("4", "sat5-mid ~01:00", "unknown", "Seattle Uprising", "shot", "dorito", "Up dorito/snake/center wipe then Damage closeout", "Damage 2 – Uprising 1 in progress"),
  sdu("4", "sat5-mid ~01:05", "unknown", "Seattle Uprising", "shot", "snake", "VERIFY", "Damage 2 – Uprising 1 in progress"),
  sdu("4", "sat5-mid ~01:10", "unknown", "Seattle Uprising", "shot", "center", "VERIFY", "Damage 2 – Uprising 1 in progress"),
  sdu("4", "sat5-mid ~01:24", "unknown (Damage buzzer)", "Tampa Bay Damage", "buzzer", "home", "Damage → 3–1; mid graphic later 4–1 rejected as SCOREBOARD-LAG", "Damage 3 – Uprising 1"),
  // P5 → Up 2 (bridge)
  sdu("5", "sat5-bridge ~00:15", "unknown", "Tampa Bay Damage", "shot", "back center", "Damage back center pulled; board Up 2 – Damage 3", "Damage 3 – Uprising 2"),
  // P6 → Up 3 (thin to enter P7 at 3–3)
  sdu("6", "sat5 gap (bridge→clipA)", "unknown", "Tampa Bay Damage", "point won by Uprising (score-only)", "—", "THIN; clip-A Point 7 enters 3–3 VERIFY path", "Damage 3 – Uprising 3 (score-only VERIFY)"),
  // P7 → Damage 4–3 (wipe + Up penalty)
  sdu("7", "sat5-clipA ~02:54 | clock 2:44", "unknown", "Tampa Bay Damage", "shot", "snake", "Up snake cross; enter 3–3", "Damage 3 – Uprising 3 in progress"),
  sdu("7", "sat5-clipA ~03:21 | clock 2:17", "unknown", "Tampa Bay Damage", "shot", "dorito", "VERIFY", "Damage 3 – Uprising 3 in progress"),
  sdu("7", "sat5-clipA ~03:31 | clock 2:07", "unknown", "Tampa Bay Damage", "shot", "back center", "VERIFY", "Damage 3 – Uprising 3 in progress"),
  sdu("7", "sat5-clipA ~03:39 | clock 1:59", "unknown", "Tampa Bay Damage", "shot", "snake", "VERIFY", "Damage 3 – Uprising 3 in progress"),
  sdu("7", "sat5-clipA ~03:41 | clock 1:57", "unknown", "Tampa Bay Damage", "shot", "dorito", "Last Damage front; Up wipe then penalty", "Damage 3 – Uprising 3 in progress"),
  sdu("7", "sat5-clipA ~03:43", "— (Uprising penalty)", "Seattle Uprising", "yellow-flag penalty → point awarded", "buzzer area", "Up methodical wipe then undisciplined penalty; point to Damage", "Damage 4 – Uprising 3"),
  // Hold / FINAL clock
  sdu("8", "sat5-late ~04:08", "unknown", "Seattle Uprising", "breakout", "dorito", "0:44 left; Damage holding 4–3", "Damage 4 – Uprising 3 in progress"),
  sdu("8", "sat5-late ~04:30", "unknown", "Tampa Bay Damage", "shot", "snake", "VERIFY", "Damage 4 – Uprising 3 in progress"),
  sdu("8", "sat5-late ~04:41", "unknown", "Seattle Uprising", "shot", "dorito", "VERIFY", "Damage 4 – Uprising 3 in progress"),
  sdu("8", "sat5-late ~04:45", "unknown", "Seattle Uprising", "shot", "center", "VERIFY", "Damage 4 – Uprising 3 in progress"),
  sdu("8", "sat5-late ~04:54 | clock 0:00", "— (clock expires)", "—", "clock-out", "—", "Match end; late containment", "FINAL Damage 4 – Uprising 3"),
  sdu("FINAL", "sat5-late ~04:54 | clock 0:00", "—", "—", "final", "—", "Source MLPB+ saturday-set-5… sat5-chunks dual-feed; skip p5-b overrun / Inf-Heat after ~5:06 p5-a; SCOREBOARD-LAG heavy; VERIFY #33 Edwards vs Margott", "FINAL Tampa Bay Damage 4 – Seattle Uprising 3")
];
ROWS.push(...SDU_ROWS);

function pfx(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "PaintballFIT vs San Antonio X-Factor (Sat Set 5 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 5 sat5-chunks dual-feed; " + notes, scoreAfter };
}
const PFX_ROWS: Elim[] = [
  // P1 → XF 1–0 (FIT wipe; Guest buzzer)
  pfx("1", "sat5-p1 ~04:20", "unknown", "Paintball FIT", "shot", "snake", "FIT wipe on break/early", "X-Factor 0 – FIT 0 in progress"),
  pfx("1", "sat5-p1 ~04:25", "unknown", "Paintball FIT", "shot", "back right", "VERIFY", "X-Factor 0 – FIT 0 in progress"),
  pfx("1", "sat5-p1 ~04:30", "unknown", "Paintball FIT", "shot", "mid", "VERIFY", "X-Factor 0 – FIT 0 in progress"),
  pfx("1", "sat5-p1 ~04:35", "unknown", "Paintball FIT", "shot", "back center", "VERIFY", "X-Factor 0 – FIT 0 in progress"),
  pfx("1", "sat5-p1 ~04:44", "Jacob Sebaugh", "#12 Paintball FIT", "shot", "dorito", "Last FIT; spelling Jacob Sebaugh (not Sebrugh)", "X-Factor 0 – FIT 0 in progress"),
  pfx("1", "sat5-p1 ~05:03", "Thomas Guest (buzzer)", "#7 San Antonio X-Factor", "buzzer", "home", "XF 0 casualties; Guest #7 vs #9 film conflict — jersey VERIFY film-only", "X-Factor 1 – FIT 0"),
  // P2 → FIT 1–1 (no on-cam elims)
  pfx("2", "sat5-early ~00:19", "unknown", "San Antonio X-Factor", "point won by FIT (score-only / off-cam)", "—", "No on-cam elims; → 1–1", "FIT 1 – X-Factor 1 (score-only VERIFY)"),
  // P3 → FIT 2–1
  pfx("3", "sat5-early ~04:44 | clock 11:11", "unknown", "San Antonio X-Factor", "shot", "dorito", "XF dorito early out", "FIT 1 – X-Factor 1 in progress"),
  pfx("3", "sat5-early ~05:20", "unknown", "San Antonio X-Factor", "shot", "center", "FIT center pressure", "FIT 1 – X-Factor 1 in progress"),
  pfx("3", "sat5-early ~05:32", "unknown (FIT point)", "Paintball FIT", "buzzer / closeout", "home", "Board → FIT 2–1", "FIT 2 – X-Factor 1"),
  // P4 → XF 2–2
  pfx("4", "sat5-mid ~03:20", "unknown", "Paintball FIT", "wipe (multi)", "various", "FIT wipe in ~30s; packed wipe split as score path — individual IDs thin VERIFY", "FIT 2 – X-Factor 1 in progress"),
  pfx("4", "sat5-mid ~03:52", "unknown (XF buzzer)", "San Antonio X-Factor", "buzzer", "home", "XF ties 2–2", "X-Factor 2 – FIT 2"),
  // P5 → FIT 3–2
  pfx("5", "sat5-bridge ~02:00", "unknown", "San Antonio X-Factor", "shot", "snake", "FIT snake pressure", "FIT 2 – X-Factor 2 in progress"),
  pfx("5", "sat5-bridge ~02:05", "unknown", "San Antonio X-Factor", "shot", "dorito", "FIT dorito", "FIT 2 – X-Factor 2 in progress"),
  pfx("5", "sat5-bridge ~02:10", "unknown", "Paintball FIT", "shot", "snake", "XF snake pulled", "FIT 2 – X-Factor 2 in progress"),
  pfx("5", "sat5-bridge ~02:15", "unknown", "Paintball FIT", "shot", "center", "XF center out", "FIT 2 – X-Factor 2 in progress"),
  pfx("5", "sat5-bridge ~02:20", "unknown", "Paintball FIT", "shot", "dorito", "XF dorito out", "FIT 2 – X-Factor 2 in progress"),
  pfx("5", "sat5-bridge ~02:27", "unknown (FIT buzzer)", "Paintball FIT", "buzzer", "home", "FIT → 3–2", "FIT 3 – X-Factor 2"),
  // Bridge next point ongoing (Scott conflict) — thin into P6
  pfx("5", "sat5-bridge after 3-2", "unknown (Scott #21? CONFLICT)", "team VERIFY", "shot", "dorito", "Film claimed Scott #21 XF dorito; Cole Scott is Uprising on allowlist — leave unknown/VERIFY; do not map to XF", "FIT 3 – X-Factor 2 in progress (VERIFY)"),
  // P6 → XF 3–3 (clip-A Point 6)
  pfx("6", "sat5-clipA ~00:24 | clock 7:30", "unknown", "Paintball FIT", "shot", "center/50", "Enter XF 2 – FIT 3; FIT aggressive early", "FIT 3 – X-Factor 2 in progress"),
  pfx("6", "sat5-clipA ~01:06 | clock 6:48", "unknown", "Paintball FIT", "shot", "snake", "XF cross", "FIT 3 – X-Factor 2 in progress"),
  pfx("6", "sat5-clipA ~01:13 | clock 6:42", "unknown", "Paintball FIT", "shot", "back center", "VERIFY", "FIT 3 – X-Factor 2 in progress"),
  pfx("6", "sat5-clipA ~01:21 | clock 6:35", "unknown", "Paintball FIT", "shot", "dorito", "XF wins point → 3–3", "X-Factor 3 – FIT 3"),
  // P7 → FIT 4–3 (Sebaugh 5-alive buzzer)
  pfx("7", "sat5-late ~01:08", "unknown", "San Antonio X-Factor", "shot", "dorito", "VERIFY", "X-Factor 3 – FIT 3 in progress"),
  pfx("7", "sat5-late ~02:54", "unknown", "San Antonio X-Factor", "shot", "snake", "XF snake crawl", "X-Factor 3 – FIT 3 in progress"),
  pfx("7", "sat5-late ~03:15", "Jacob Sebaugh (buzzer)", "#12 Paintball FIT", "buzzer", "home", "Sebaugh #12 buzzer with 5 alive (1v5 hold pattern); spelling Jacob Sebaugh", "FIT 4 – X-Factor 3"),
  // P8 → XF 4–4
  pfx("8", "sat5-xf-tie ~01:07 | clock 2:38", "Trenton Mason-Salinas", "#34 Paintball FIT", "shot", "center", "XF snake pinch; film IDs XF #45 Colt Roberts, #23 Tj Danner Jr, #22 Cody Bayless, #12 Matt Jackson; FIT #81 Jacob Johnson", "FIT 4 – X-Factor 3 in progress"),
  pfx("8", "sat5-xf-tie ~01:13", "unknown (XF buzzer)", "San Antonio X-Factor", "buzzer", "home", "Start was XF 3 – FIT 4; → 4–4", "X-Factor 4 – FIT 4"),
  // P9 → FIT 5–4 FINAL
  pfx("9", "sat5-final ~00:26", "unknown", "San Antonio X-Factor", "walk-off", "dorito", "XF dorito walkoff @4–4", "X-Factor 4 – FIT 4 in progress"),
  pfx("9", "sat5-final ~01:03", "unknown (FIT center push)", "Paintball FIT", "buzzer / closeout", "center / home", "FIT center push wins → 5–4; alternate clip ts ~3:40 XF dorito / ~3:50 FIT center buzzer same closeout VERIFY timeline", "FINAL FIT 5 – X-Factor 4"),
  pfx("FINAL", "sat5-final ~01:03 / ~03:50", "—", "—", "final", "—", "Source MLPB+ saturday-set-5… sat5-chunks dual-feed; film ends ~5:06 p5-a — exclude Inf/Heat overrun; SCOREBOARD-LAG (Damage 0-0 overlay on FIT pit); VERIFY Guest #7/#9, Roberts #45/#22, Scott team conflict", "FINAL PaintballFIT 5 – San Antonio X-Factor 4")
];
ROWS.push(...PFX_ROWS);

function s6s(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Royal City Seadogs vs New Jersey Leverage (Sat Set 6 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 6 set6 dual-feed; " + notes, scoreAfter };
}
const S6S_ROWS: Elim[] = [
  s6s("1", "set6-p1-a1 ~01:20", "unknown", "New Jersey Leverage", "shot", "back right", "overhead", "Seadogs 0 – Leverage 0 in progress"),
  s6s("1", "set6-p1-a1 ~01:38", "Nick Campbell", "#88 Royal City Seadogs", "shot", "back left (Hydra)", "Nick Campbell = Seadogs (PBLeagues). Number from film only: #88 jersey; p4a pit shows #08 — number VERIFY", "Seadogs 0 – Leverage 0 in progress"),
  s6s("1", "set6-p1-a1 ~01:42", "unknown", "New Jersey Leverage", "shot", "mid right", "", "Seadogs 0 – Leverage 0 in progress"),
  s6s("1", "set6-p1-a1 ~01:56", "unknown", "New Jersey Leverage", "shot", "back center", "4v2 Seadogs at cutaway ~02:02; p1-b ~00:11 Leverage wedge check is a P1 replay (deduped)", "Seadogs 0 – Leverage 0 in progress"),
  s6s("1", "set6 gap (p1-a1 cutaway→p1-b)", "— (Seadogs point, off-cam)", "Royal City Seadogs", "point won by Seadogs (score-only)", "—", "Finish off-cam; inferred from 2–0 after P2. VERIFY", "Seadogs 1 – Leverage 0 (score-only VERIFY)"),
  s6s("2", "set6-p1-b ~00:49", "unknown", "New Jersey Leverage", "snap/lane", "Silverbelly left", "", "Seadogs 1 – Leverage 0 in progress"),
  s6s("2", "set6-p1-b ~01:02", "unknown", "New Jersey Leverage", "lane/snap", "back right", "drone view", "Seadogs 1 – Leverage 0 in progress"),
  s6s("2", "set6-p1-b ~01:48", "unknown", "New Jersey Leverage", "run-through", "tall blue cylinder", "Seadogs tape push", "Seadogs 1 – Leverage 0 in progress"),
  s6s("2", "set6-p1-b ~01:50", "Shayne Salmon (buzzer)", "#40 Royal City Seadogs", "buzzer", "home", "Salmon #40 per pit graphic; overlay mixing Distortion/MATH graphics — visual ID used", "Seadogs 2 – Leverage 0"),
  s6s("3", "set6-p1-b ~03:46", "unknown (white headwrap)", "New Jersey Leverage", "break/lane", "backline", "", "Seadogs 2 – Leverage 0 in progress"),
  s6s("3", "set6-p1-b ~03:59", "unknown #10 VERIFY", "#10 Royal City Seadogs", "walk-off", "backline", "No #10 among Seadogs film IDs — VERIFY how and who", "Seadogs 2 – Leverage 0 in progress"),
  s6s("3", "set6-p1-b ~04:09", "unknown", "New Jersey Leverage", "snap/lane", "Silverbelly", "", "Seadogs 2 – Leverage 0 in progress"),
  s6s("3", "set6-p2-a1 ~01:43 | clock 9:46", "— (Leverage penalty)", "New Jersey Leverage", "penalty → mass walk-off (point awarded)", "center W + snake + dorito", "Ref penalty on Leverage center; remaining Leverage walk off (count not on film). Overlay briefly Aftermath 2–0 — SCOREBOARD-LAG", "Seadogs 3 – Leverage 0"),
  s6s("4", "set6-p2-a2 wipe ~00:00–00:15 (order 1/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "center X", "Leverage full wipe ~15s; no per-elim times in notes", "Seadogs 3 – Leverage 0 in progress"),
  s6s("4", "set6-p2-a2 wipe ~00:00–00:15 (order 2/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "snake corner", "Leverage full wipe", "Seadogs 3 – Leverage 0 in progress"),
  s6s("4", "set6-p2-a2 wipe ~00:00–00:15 (order 3/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "back center", "Leverage full wipe", "Seadogs 3 – Leverage 0 in progress"),
  s6s("4", "set6-p2-a2 wipe ~00:00–00:15 (order 4/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "dorito", "Leverage full wipe", "Seadogs 3 – Leverage 0 in progress"),
  s6s("4", "set6-p2-a2 wipe ~00:00–00:15 (order 5/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "snake", "Leverage full wipe", "Seadogs 3 – Leverage 0 in progress"),
  s6s("4", "set6-p2-a2 after wipe (~00:15+)", "unknown (Seadogs snake runner buzzer)", "Royal City Seadogs", "buzzer", "Leverage gate", "", "Seadogs 4 – Leverage 0"),
  s6s("5", "set6-p2-b2r ~00:05–00:16", "unknown", "Royal City Seadogs", "shot (off-cam)", "dorito", "One Seadogs dorito out not clearly filmed — VERIFY", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ≤01:15 (order 1/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "snake (break)", "Dual-feed: team by kit (Leverage black/white/grey vs Seadogs teal) — VERIFY; only last elim timed", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ≤01:15 (order 2/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "snake corner", "Team by kit — VERIFY", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ≤01:15 (order 3/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "dorito 1", "Team by kit — VERIFY", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ≤01:15 (order 4/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "back center", "Team by kit — VERIFY", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ~01:15 (order 5/5)", "unknown", "New Jersey Leverage", "shot (wipe)", "dorito corner bunker", "Team by kit — VERIFY", "Seadogs 4 – Leverage 0 in progress"),
  s6s("5", "set6-p2-b2r ~01:16", "unknown (Seadogs buzzer)", "Royal City Seadogs", "buzzer", "home (dorito tape push)", "VERIFY dual-feed score path", "Seadogs 5 – Leverage 0 (VERIFY)"),
  s6s("6", "set6-p3 ~01:40 | clock 8:02", "unknown", "Royal City Seadogs", "shot", "snake back lane", "", "Seadogs 5 – Leverage 0 in progress"),
  s6s("6", "set6-p3 ~02:24 | clock 7:18", "unknown", "Royal City Seadogs", "lane/snap", "dorito", "", "Seadogs 5 – Leverage 0 in progress"),
  s6s("6", "set6-p3 ~02:30 | clock 7:12", "unknown", "Royal City Seadogs", "lane/snap", "center", "", "Seadogs 5 – Leverage 0 in progress"),
  s6s("6", "set6-p3 ~02:57", "unknown (Leverage snake runner buzzer)", "New Jersey Leverage", "buzzer", "home (snake run)", "Leverage first point", "Seadogs 5 – Leverage 1"),
  s6s("7", "set6-p3 ~06:25 | clock 6:28", "unknown", "Royal City Seadogs", "run-through", "snake", "Run-through by Leverage snake runner", "Seadogs 5 – Leverage 1 in progress"),
  s6s("7", "set6-p3 ~06:28 | clock 6:25", "unknown (Leverage runner)", "New Jersey Leverage", "penalty pull", "snake", "", "Seadogs 5 – Leverage 1 in progress"),
  s6s("7", "set6-p4a ~00:03 | clock 6:21", "unknown", "New Jersey Leverage", "penalty pull", "dorito", "p3/p4a edge: separate pull (dorito vs snake) — VERIFY not a dup", "Seadogs 5 – Leverage 1 in progress"),
  s6s("7", "set6-p4a ~00:42 | clock 5:42", "unknown (Seadogs buzzer)", "Royal City Seadogs", "buzzer", "home", "", "Seadogs 6 – Leverage 1"),
  s6s("8", "set6-p4b ~00:58 | clock 3:44", "unknown", "New Jersey Leverage", "shot", "snake", "Break ~00:44 clock 3:55; Leverage wipe", "Seadogs 6 – Leverage 1 in progress"),
  s6s("8", "set6-p4b ~01:04 | clock 3:39", "unknown", "New Jersey Leverage", "shot", "snake temple/corner", "", "Seadogs 6 – Leverage 1 in progress"),
  s6s("8", "set6-p4b ~01:17 | clock 3:26", "unknown", "New Jersey Leverage", "shot", "center cylinder", "", "Seadogs 6 – Leverage 1 in progress"),
  s6s("8", "set6-p4b ~01:21 | clock 3:22", "unknown", "New Jersey Leverage", "shot", "dorito", "", "Seadogs 6 – Leverage 1 in progress"),
  s6s("8", "set6-p4b ~01:26 | clock 3:16", "unknown", "New Jersey Leverage", "shot", "dorito back corner", "", "Seadogs 6 – Leverage 1 in progress"),
  s6s("8", "set6-p4b ~01:31 | clock 3:12", "unknown (Seadogs buzzer)", "Royal City Seadogs", "buzzer", "home", "p4a also logged a Seadogs point (clock 5:39→3:59; 3 LEV outs dorito/snake/dorito) to 7–1 with overlay stuck 6–1 — conflicts with this clock-continuous point + FINAL overlay; p4a point held off Page, VERIFY", "Seadogs 7 – Leverage 1"),
  s6s("FINAL", "set6-p4b ~03:52 (FINAL overlay)", "—", "—", "final", "—", "Source MLPB+ Saturday Set 6 dual-feed (p1-a1…p4b + part3 salvage). Overlay wrong-game flips — visual ID used. Roster-confirmed Seadogs: Campbell, Derrick Weltz #19. VERIFY Campbell number #88/#08, Seadogs #10, p4a duplicate point", "FINAL Royal City Seadogs 7 – New Jersey Leverage 1")
];
ROWS.push(...S6S_ROWS);

function s6a(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Perris ASG Aftermath vs Chicago Distortion (Sat Set 6 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 6 set6 dual-feed; " + notes, scoreAfter };
}
const S6A_ROWS: Elim[] = [
  s6a("1", "set6-p1-a2 ~00:04", "unknown", "Perris ASG Aftermath (black/red VERIFY)", "shot", "center Spick-and-Span X", "Black/red = Aftermath: score path (Aftermath 3–0 entering P4) means Aftermath won P1, and Grayson Gladstone #95 (AFM, roster-confirmed) is on black/red. Black/red #4 also visible = unnamed Aftermath #4 (VERIFY)", "Aftermath 0 – Distortion 0 in progress"),
  s6a("1", "set6-p1-a2 ~00:23", "unknown", "Chicago Distortion (yellow/black VERIFY)", "shot", "far center-right", "Yellow/black = Distortion (black/red winner = Aftermath per score path + Gladstone)", "Aftermath 0 – Distortion 0 in progress"),
  s6a("1", "set6-p1-a2 ~00:26", "unknown", "Chicago Distortion (yellow/black VERIFY)", "shot (ref pull)", "far left snake", "Kit→team VERIFY", "Aftermath 0 – Distortion 0 in progress"),
  s6a("1", "set6-p1-a2 ~00:29", "unknown", "Chicago Distortion (yellow/black VERIFY)", "shot", "far right", "Kit→team VERIFY", "Aftermath 0 – Distortion 0 in progress"),
  s6a("1", "set6-p1-a2 ~00:39", "unknown", "Chicago Distortion (yellow/black VERIFY)", "close-range", "far back-right", "Kit→team VERIFY", "Aftermath 0 – Distortion 0 in progress"),
  s6a("1", "set6-p1-a2 ~00:41 | clock 13:16", "unknown (black/red buzzer)", "Perris ASG Aftermath", "buzzer", "home", "Overlay stuck MATH 0–0 Distortion — SCOREBOARD-LAG", "Aftermath 1 – Distortion 0"),
  s6a("2", "set6 gap (p1→p2)", "—", "Perris ASG Aftermath", "point won by Aftermath (score-only)", "—", "Not on film (feed on Seadogs/Leverage)", "Aftermath 2 – Distortion 0 (score-only VERIFY)"),
  s6a("3", "set6 gap (p1→p2)", "—", "Perris ASG Aftermath", "point won by Aftermath (score-only)", "—", "Not on film; pit graphic Aftermath 3–0 at p2-a2", "Aftermath 3 – Distortion 0 (score-only)"),
  s6a("4", "set6-p2-a2 ~02:14", "unknown", "Perris ASG Aftermath", "break", "dorito top-right", "", "Aftermath 3 – Distortion 0 in progress"),
  s6a("4", "set6-p2-a2 ~02:15", "unknown", "Chicago Distortion", "break", "snake entry", "", "Aftermath 3 – Distortion 0 in progress"),
  s6a("4", "set6-p2-a2 ~02:18", "unknown", "Chicago Distortion", "slide hit", "snake cylinder", "", "Aftermath 3 – Distortion 0 in progress"),
  s6a("4", "set6-p2-b1r ~00:11", "unknown", "Chicago Distortion", "walk-off", "snake bottom-left", "drone; p2-a2/p2-b1r edge deduped by area", "Aftermath 3 – Distortion 0 in progress"),
  s6a("4", "set6-p2-b1r ~00:19", "unknown", "Chicago Distortion", "walk-off", "center/snake near A-bunker", "Nate Roberts #47 DIS (PBLeagues; film graphic said Matt) on silver can (not out)", "Aftermath 3 – Distortion 0 in progress"),
  s6a("4", "set6-p2-b1r ~00:43", "unknown (Aftermath buzzer)", "Perris ASG Aftermath", "buzzer", "home (both wires pushed)", "Pit: Carter #14, Mazurek #51, Devon Stuart #34 (all Aftermath, roster-confirmed), #99. Overlay wrongly Seadogs 4–0 — SCOREBOARD-LAG", "Aftermath 4 – Distortion 0"),
  s6a("5", "set6-p3 ~00:11 | clock 9:10", "Stephen Mazurek", "#51 Perris ASG Aftermath", "lane/snap", "dorito", "Corrected: notes tagged DIS by kit assumption; PBLeagues confirms Aftermath. Aftermath-side out in a point Aftermath won", "Aftermath 4 – Distortion 0 in progress"),
  s6a("5", "set6-p3 (after ~00:11)", "unknown (Aftermath point)", "Perris ASG Aftermath", "point won by Aftermath", "—", "Closeout not described; overlay flip 00:20–01:03", "Aftermath 5 – Distortion 0"),
  s6a("6", "set6-p3 ~04:05 | clock 9:06", "unknown", "Chicago Distortion", "lane off break", "center", "Clock 9:06 vs prior point 9:10 — VERIFY clock/overlay", "Aftermath 5 – Distortion 0 in progress"),
  s6a("6", "set6-p3 ~04:33 | clock 8:40", "Michael Unger", "#67 Chicago Distortion", "shot", "dorito", "Film 'Mike Unger'; PBLeagues Michael Unger", "Aftermath 5 – Distortion 0 in progress"),
  s6a("6", "set6-p3 ~04:40 | clock 8:33", "Zack Carter", "#14 Perris ASG Aftermath", "shot", "snake", "Corrected: notes tagged DIS; PBLeagues confirms Aftermath", "Aftermath 5 – Distortion 0 in progress"),
  s6a("6", "set6-p3 ~05:01 | clock 8:12", "Stephen Mazurek", "#51 Perris ASG Aftermath", "shot", "snake", "Also out P5 (separate point, clock 9:10) — not a duplicate", "Aftermath 5 – Distortion 0 in progress"),
  s6a("6", "set6-p3 ~05:29", "unknown (Aftermath buzzer)", "Perris ASG Aftermath", "buzzer", "home", "", "Aftermath 6 – Distortion 0"),
  s6a("7", "set6-p4b ~01:44 | clock 2:59", "unknown", "Chicago Distortion", "shot", "snake", "Break ~01:34 clock 3:09; Distortion wipe", "Aftermath 6 – Distortion 0 in progress"),
  s6a("7", "set6-p4b ~01:54 | clock 2:50", "unknown", "Chicago Distortion", "shot", "center", "", "Aftermath 6 – Distortion 0 in progress"),
  s6a("7", "set6-p4b ~02:01 | clock 2:43", "unknown", "Chicago Distortion", "shot", "dorito", "", "Aftermath 6 – Distortion 0 in progress"),
  s6a("7", "set6-p4b ~02:08 | clock 2:36", "unknown", "Chicago Distortion", "shot", "dorito back corner", "", "Aftermath 6 – Distortion 0 in progress"),
  s6a("7", "set6-p4b ~02:12 | clock 2:33", "unknown", "Chicago Distortion", "shot", "snake back corner", "", "Aftermath 6 – Distortion 0 in progress"),
  s6a("7", "set6-p4b ~02:14", "unknown (Aftermath buzzer)", "Perris ASG Aftermath", "buzzer", "home", "p4a ~02:35 glimpse of a Distortion buzzer (→6–1) unconfirmed — not logged as a point; VERIFY", "Aftermath 7 – Distortion 0 (or 7–1 VERIFY)"),
  s6a("FINAL", "set6-p4b ~02:14", "—", "—", "final", "—", "Source MLPB+ Saturday Set 6 dual-feed (p1-a2…p4b + part3 salvage). Final not on graphic: 7–0 per p4b, 7–1 if p4a DIS buzzer glimpse real. Roster-confirmed: Gladstone, Mazurek, Carter, Stuart = Aftermath; Nate Roberts = Distortion. Colors: black/red = Aftermath. Winner unchanged. VERIFY Aftermath #4 (unnamed), 7–0 vs 7–1", "FINAL Perris ASG Aftermath 7 – Chicago Distortion 0 (VERIFY 7–1)")
];
ROWS.push(...S6A_ROWS);

function s7d(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "San Diego Dynasty vs Los Angeles Ironmen (Sat Set 7 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 7 set7 dual-feed (parts 1–3, 4-SALVAGE, 5, 7-tail + clean recapture 8–9; overlaps deduped by clock + score path); " + notes, scoreAfter };
}
const S7D_ROWS: Elim[] = [
  s7d("1", "clock 14:43 | set7-p2-A 00:41", "unknown", "San Diego Dynasty", "shot", "center / dorito", "p2 elim pattern alternates suspiciously (possible misread) — VERIFY", "Dynasty 0 – Ironmen 0 in progress"),
  s7d("1", "clock ? | set7-p2-A 01:03", "unknown", "Los Angeles Ironmen", "shot", "snake", "p2 alternating pattern — VERIFY", "Dynasty 0 – Ironmen 0 in progress"),
  s7d("1", "clock ? | set7-p2-A 01:13", "unknown", "San Diego Dynasty", "shot", "dorito", "p2 alternating pattern — VERIFY", "Dynasty 0 – Ironmen 0 in progress"),
  s7d("1", "clock ? | set7-p2-A 01:54", "unknown", "Los Angeles Ironmen", "shot", "dorito", "p2 alternating pattern — VERIFY", "Dynasty 0 – Ironmen 0 in progress"),
  s7d("1", "clock ? | set7-p2-A 02:29", "unknown", "Los Angeles Ironmen", "shot", "center", "p2 alternating pattern — VERIFY", "Dynasty 0 – Ironmen 0 in progress"),
  s7d("1", "clock ? | set7-p2-A 03:07", "unknown", "Los Angeles Ironmen", "run-through", "snake", "Dynasty wins point", "Dynasty 1 – Ironmen 0"),
  s7d("2", "clock ? | set7-p2-B 02:30", "Stephen Omara (buzzer)", "#16 San Diego Dynasty", "buzzer", "home", "Break B00:39 clock 12:10. Notes list 9 alternating elims with no per-elim detail — not itemized (VERIFY). Film 'Omara16/O'Mara16'; PBLeagues Stephen Omara", "Dynasty 2 – Ironmen 0"),
  s7d("3", "clock 9:11 | set7-p1-a 00:14", "unknown", "San Diego Dynasty (VERIFY team)", "lane", "snake-center lane", "p2 shows this point from clock 10:23 (8 alternating elims, not itemized; '1v1 Sentz vs DYN at 9:34' conflicts with these later outs — VERIFY). p1 overlay team labels look swapped (p1 showed 'IRN 2-1'/'IRN 3-1' vs DYN-led score path) — team VERIFY", "Dynasty 2 – Ironmen 0 in progress"),
  s7d("3", "clock 8:57 | set7-p1-a 00:39", "unknown", "San Diego Dynasty (VERIFY team)", "shot", "dorito-center", "p1 team labels VERIFY", "Dynasty 2 – Ironmen 0 in progress"),
  s7d("3", "clock ? | set7-p1-a 00:41", "unknown", "San Diego Dynasty (VERIFY team)", "walk-off", "home", "Point ends; overlay 'IRN 2-1' read as Dynasty 2–1 (Ironmen win) per score path — VERIFY winner", "Dynasty 2 – Ironmen 1 (VERIFY)"),
  s7d("4", "clock 8:56 | set7-p1-b 00:03", "unknown", "San Diego Dynasty (VERIFY team)", "lane off break", "snake", "Break clock ~8:57. p1 team labels VERIFY", "Dynasty 2 – Ironmen 1 in progress"),
  s7d("4", "clock 8:34 | set7-p1-b 00:25", "Yosh Rau", "#32 San Diego Dynasty", "shot", "center", "Film Rau#32; PBLeagues Yosh Rau", "Dynasty 2 – Ironmen 1 in progress"),
  s7d("4", "clock 8:01 | set7-p1-b 00:59", "unknown", "San Diego Dynasty (VERIFY team)", "shot", "dorito", "p1 team labels VERIFY", "Dynasty 2 – Ironmen 1 in progress"),
  s7d("4", "clock ? | set7-p1-b ~01:0x", "unknown #7 (point winner)", "#7 (team VERIFY)", "point won", "—", "VERIFY: film name 'Abuhalimeh' #7 not on any PBLeagues EID 9321 roster; team not confirmed Ironmen so not mapped (low-confidence near match Caleb Abuhl, Ironmen); overlay 'IRN 3-1' read as Dynasty 3–1 per score path (Dynasty 4–1 next) — winner VERIFY", "Dynasty 3 – Ironmen 1 (VERIFY)"),
  s7d("5", "clock 6:53 | set7-p3-a 02:44", "unknown", "Los Angeles Ironmen", "shot", "snake", "Break p3-a 01:31", "Dynasty 3 – Ironmen 1 in progress"),
  s7d("5", "clock 6:16 | set7-p3-a 03:20", "unknown", "Los Angeles Ironmen", "shot", "back-left", "", "Dynasty 3 – Ironmen 1 in progress"),
  s7d("5", "clock ? | set7-p3-a 03:33", "unknown (Dynasty buzzer)", "San Diego Dynasty", "buzzer", "home", "Overlay DYN 4–1", "Dynasty 4 – Ironmen 1"),
  s7d("6", "clock 5:47 | set7-p4s 00:55", "unknown", "Los Angeles Ironmen", "shot", "snake crawl", "Break p4s 00:36 clock 6:06", "Dynasty 4 – Ironmen 1 in progress"),
  s7d("6", "clock 5:11 | set7-p4s 01:31", "unknown", "San Diego Dynasty", "ref call", "center / dorito", "", "Dynasty 4 – Ironmen 1 in progress"),
  s7d("6", "clock 5:09 | set7-p4s 01:34", "Jesse Stephens Jr", "#29 Los Angeles Ironmen", "shot", "dorito run", "Film 'Stephens #29'; PBLeagues Jesse Stephens Jr. Out in a point Ironmen won", "Dynasty 4 – Ironmen 1 in progress"),
  s7d("6", "clock ? | set7-p4s ~01:45", "unknown (Ironmen point)", "Los Angeles Ironmen", "point won by Ironmen", "—", "", "Dynasty 4 – Ironmen 2"),
  s7d("7", "clock 5:04 | set7-p8-A 01:35", "unknown", "San Diego Dynasty", "lane off break", "back-left (snake side)", "Clean recapture fills p4 freeze gap. Break A01:27 clock 5:09", "Dynasty 4 – Ironmen 2 in progress"),
  s7d("7", "clock 5:01 | set7-p8-A 01:38", "unknown", "Los Angeles Ironmen", "lane off break", "back-right (dorito side)", "", "Dynasty 4 – Ironmen 2 in progress"),
  s7d("7", "clock 4:42 | set7-p8-A 01:56", "unknown", "Los Angeles Ironmen", "run-through", "center", "", "Dynasty 4 – Ironmen 2 in progress"),
  s7d("7", "clock 4:35 | set7-p8-A 02:07", "Harrison Frye (buzzer)", "#8 San Diego Dynasty", "buzzer", "home", "Film Frye #8; PBLeagues Harrison Frye", "Dynasty 5 – Ironmen 2"),
  s7d("8", "clock 4:02 | set7-p5-A 03:41", "Patrick Kraft Jr", "#17 Los Angeles Ironmen", "crawl", "snake 1", "Break A02:57 clock 4:35 (p8 overlap: break ~4:31). p5 used as primary — p8 logs 7+ Ironmen outs this point (overcount, held off Page). p8 also has Kraft Jr snake out (clock 3:20) = same elim", "Dynasty 5 – Ironmen 2 in progress"),
  s7d("8", "clock 3:02 | set7-p5-A 04:41", "unknown #13 (Fraige or Andrade)", "#13 San Diego Dynasty", "shot", "center / dorito", "VERIFY #13: Fraige or Andrade (both PBLeagues Dynasty; jersey film-only). p8 has Fraige #13 as the buzzer (clock 2:56) not out; p1 listed #13 as Andrade — jersey VERIFY", "Dynasty 5 – Ironmen 2 in progress"),
  s7d("8", "clock ~2:56 | set7-p5-A ~04:5x", "unknown (Dynasty point)", "San Diego Dynasty", "buzzer", "home", "p8 credits Fraige #13 buzzer (VERIFY). p8 extra outs held off: DYN back center 4:26; IRN back right 4:24, snake 4:03, center 4:01, back right 3:58, back left 3:49, Sentz #5 dorito 3:08 (overcount)", "Dynasty 6 – Ironmen 2"),
  s7d("9", "clock ~2:29 | set7-p5-B 04:54", "unknown", "San Diego Dynasty", "shot", "dorito 1", "Break B04:28 clock 2:55", "Dynasty 6 – Ironmen 2 in progress"),
  s7d("9", "clock ~2:28 | set7-p5-B 04:55", "unknown", "San Diego Dynasty", "shot", "snake 1", "", "Dynasty 6 – Ironmen 2 in progress"),
  s7d("9", "clock ~2:23 | set7-p5-B 05:00", "unknown", "San Diego Dynasty", "shot", "back center", "", "Dynasty 6 – Ironmen 2 in progress"),
  s7d("9", "clock ~2:05 | set7-p5-B 05:18", "unknown (Ironmen buzzer)", "Los Angeles Ironmen", "buzzer", "home", "p9-a shows this point (score 6–3 at clock 2:08) with 3 Ironmen outs — Sentz #5 gunfight D/center a00:54, unknown snake a01:17, Stephens #29 gunfight center/D a01:42 — conflicting with an Ironmen win; held off Page as likely team flip of the p5 Dynasty outs. VERIFY", "Dynasty 6 – Ironmen 3"),
  s7d("10", "clock 1:58 | set7-p9-a 03:52", "unknown", "Los Angeles Ironmen", "lane off break", "back center / D-side", "Clean recapture (p6 frozen here; p6 confirms Dynasty win ~1:52)", "Dynasty 6 – Ironmen 3 in progress"),
  s7d("10", "clock ? | set7-p9-a 04:06", "unknown (Dynasty point)", "San Diego Dynasty", "point won by Dynasty", "—", "Overlay 7–3", "Dynasty 7 – Ironmen 3"),
  s7d("11", "clock 1:42 | set7-p9-b 04:34", "unknown", "Los Angeles Ironmen", "lane off break", "snake", "", "Dynasty 7 – Ironmen 3 in progress"),
  s7d("11", "clock 1:36 | set7-p9-b 04:41", "unknown", "Los Angeles Ironmen", "gunfight", "center / D-side", "", "Dynasty 7 – Ironmen 3 in progress"),
  s7d("11", "clock 1:19 | set7-p9-b 04:57", "unknown", "Los Angeles Ironmen", "shot", "back center", "", "Dynasty 7 – Ironmen 3 in progress"),
  s7d("11", "clock 0:47 | set7-p9-b 05:30", "Henry Sentz", "#5 Los Angeles Ironmen", "gunfight", "center / D-side", "Film Sentz #5; PBLeagues Henry Sentz. Broadcast glitch p9-b 05:39–05:40 — winner not on film", "Dynasty 7 – Ironmen 3 in progress"),
  s7d("11", "clock 0:47 | set7-p7 screen (coverage log 12:25)", "unknown (Ironmen point)", "Los Angeles Ironmen", "point won by Ironmen (score-only)", "—", "Inferred from DYN 7–4 IRN on screen at clock 0:47 despite 4 Ironmen outs filmed — VERIFY", "Dynasty 7 – Ironmen 4 (VERIFY)"),
  s7d("12", "clock 0:35 | set7-p7tail 01:05", "unknown", "San Diego Dynasty", "shot", "center (star bunker)", "Break p7tail 00:53 clock 0:46", "Dynasty 7 – Ironmen 4 in progress"),
  s7d("12", "clock 0:06 | set7-p7tail 01:43", "Jesse Stephens Jr", "#29 Los Angeles Ironmen", "shot", "snake", "Out in a point Ironmen won", "Dynasty 7 – Ironmen 4 in progress"),
  s7d("12", "clock ~0:00 | set7-p7tail ~01:50", "unknown (Ironmen point)", "Los Angeles Ironmen", "point won by Ironmen", "—", "Overlay DYN 7–5; p7tail switches to Set 6 autoplay at 03:05 (discarded)", "Dynasty 7 – Ironmen 5 (overlay, VERIFY)"),
  s7d("FINAL", "clock 0:00 | set7-p7tail overlay", "—", "—", "final", "—", "Final NOT confirmed on film: p7tail overlay 7–5, 7–4 seen on screen at clock 0:47, p9-b glitch hides the result; no official source in /workspace/paintball/official. Dynasty win not in doubt; margin VERIFY. Points 3–4 team labels and winners VERIFY (p1 overlay swap)", "FINAL San Diego Dynasty 7 – Los Angeles Ironmen 5 (VERIFY — not on film)")
];
ROWS.push(...S7D_ROWS);

function s7t(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "TonTon Arsenal vs Los Angeles Collision (Sat Set 7 MLPB+)", point, timestamp, playerOut, jersey, elimType, area, notes: "MLPB+ Sat Set 7 set7 dual-feed (parts 1–3, 4-SALVAGE, 5 + clean recapture 8–9; overlaps deduped by clock + score path); " + notes, scoreAfter };
}
const S7T_ROWS: Elim[] = [
  s7t("1", "clock ? | set7-p2-A 04:13", "unknown", "Los Angeles Collision", "break", "—", "Break A04:09 clock 15:00. p2 alternating pattern — VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 04:34", "unknown", "TonTon Arsenal", "shot", "dorito", "VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 04:38", "unknown", "Los Angeles Collision", "shot", "dorito", "VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 04:41", "unknown", "TonTon Arsenal", "shot", "snake", "VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 04:59", "unknown", "Los Angeles Collision", "shot", "snake", "VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 05:01", "unknown", "TonTon Arsenal", "shot", "center", "VERIFY", "TonTon 0 – Collision 0 in progress"),
  s7t("1", "clock ? | set7-p2-A 05:25", "unknown", "TonTon Arsenal", "run-through", "—", "Collision wins point", "TonTon 0 – Collision 1"),
  s7t("2", "clock 13:40 | set7-p2-B 03:24", "— (TonTon point, score-only)", "TonTon Arsenal", "point won by TonTon (score-only)", "—", "Notes list 8 elims with no per-elim detail — not itemized (VERIFY)", "TonTon 1 – Collision 1"),
  s7t("3", "clock 12:19 | set7-p1-a 02:04", "unknown", "Los Angeles Collision", "shot", "snake", "Break clock 12:47", "TonTon 1 – Collision 1 in progress"),
  s7t("3", "clock 11:33 | set7-p1-a 02:50", "unknown", "TonTon Arsenal", "shot", "dorito-center", "", "TonTon 1 – Collision 1 in progress"),
  s7t("3", "clock 10:22 | set7-p1-a 04:02", "unknown (remaining Collision)", "Los Angeles Collision", "concede", "—", "Overlay showed TON 3–0 — score path says 2–1; overlay VERIFY", "TonTon 2 – Collision 1 (VERIFY)"),
  s7t("4", "clock 9:46 | set7-p1-b 02:30", "unknown", "Los Angeles Collision", "shot", "snake-center", "Break clock 10:14", "TonTon 2 – Collision 1 in progress"),
  s7t("4", "clock 8:29 | set7-p1-b 03:48", "unknown", "Los Angeles Collision", "shot", "center", "", "TonTon 2 – Collision 1 in progress"),
  s7t("4", "clock 7:46 | set7-p1-b 04:32", "unknown", "Los Angeles Collision", "shot", "dorito", "", "TonTon 2 – Collision 1 in progress"),
  s7t("4", "clock 6:46 | set7-p1-b 05:32", "unknown", "Los Angeles Collision", "shot", "center", "", "TonTon 2 – Collision 1 in progress"),
  s7t("4", "clock 6:19 | set7-p1-b 06:00", "unknown (last Collision)", "Los Angeles Collision", "pulled", "home", "TonTon wins point. Overlay TON 4–0; p3-a 00:12 overlay TON 3–1 matches score path", "TonTon 3 – Collision 1"),
  s7t("5", "clock 5:53 | set7-p3-a 04:27", "unknown #95", "#95 TonTon Arsenal", "lane off break", "back-right", "Break p3-a 04:24. VERIFY: film name 'Giger' is not on any PBLeagues EID 9321 roster — left unnamed", "TonTon 3 – Collision 1 in progress"),
  s7t("5", "clock 5:19 | set7-p3-a 05:01", "unknown", "TonTon Arsenal", "shot", "center / snake crawl", "", "TonTon 3 – Collision 1 in progress"),
  s7t("5", "clock ? | set7-p3-a 05:56", "unknown (point end)", "—", "buzzer", "home", "Notes say Collision buzzer (overlay 3–2), but clean recapture shows TON 4–1 at clock 2:42 and only 9 points fit FINAL 5–4 → TonTon win implied. Winner VERIFY. p3-b 00:26–01:57 frozen", "TonTon 4 – Collision 1 (VERIFY)"),
  s7t("6", "clock 2:31 | set7-p8-A 00:11", "unknown", "TonTon Arsenal", "gunfight", "snake", "Clean recapture (p4s same point: Collision buzzer 04:26)", "TonTon 4 – Collision 1 in progress"),
  s7t("6", "clock 2:13 | set7-p8-A 00:31", "Vince Newell (buzzer)", "#16 Los Angeles Collision", "buzzer", "center run", "Film #16; PBLeagues Vince Newell (Collision, name confirmed; #16 film-only). p4s said snake run", "TonTon 4 – Collision 2"),
  s7t("7", "clock 2:10 | set7-p8-A 04:02", "unknown", "TonTon Arsenal", "lane off break", "back-right (dorito side)", "Break A03:59 clock 2:13. Earlier break A02:41 clock 2:13 was aborted/reset (clock rolled back) — its 2 Collision back-center outs NOT logged", "TonTon 4 – Collision 2 in progress"),
  s7t("7", "clock 2:03 | set7-p8-A 04:09", "unknown", "TonTon Arsenal", "shot", "snake", "p5 has TON snake dive/crawl at clock 1:44 — same out? VERIFY", "TonTon 4 – Collision 2 in progress"),
  s7t("7", "clock 1:56 | set7-p8-A 04:15", "unknown", "Los Angeles Collision", "shot", "center", "", "TonTon 4 – Collision 2 in progress"),
  s7t("7", "clock 1:40 | set7-p8-A 04:31", "unknown", "TonTon Arsenal", "shot", "center", "", "TonTon 4 – Collision 2 in progress"),
  s7t("7", "clock 1:17 | set7-p8-A 04:54", "Vince Newell (buzzer)", "#16 Los Angeles Collision", "buzzer", "home", "VERIFY: p5 has #16 Newell OUT (penalty flag) center/dorito at clock 1:17 instead", "TonTon 4 – Collision 3"),
  s7t("8", "clock 1:07 | set7-p8-B 04:15", "unknown", "TonTon Arsenal", "lane off break", "back-left", "Break B04:12 clock 1:10. p5 version of this point differs (COL #25 center off break 1:14, COL doritos 0:49, TON center 0:40, TON snake 0:25) — clean recapture p8 used; VERIFY", "TonTon 4 – Collision 3 in progress"),
  s7t("8", "clock 0:51 | set7-p8-B 04:31", "unknown", "TonTon Arsenal", "shot", "back center", "", "TonTon 4 – Collision 3 in progress"),
  s7t("8", "clock 0:44 | set7-p8-B 04:38", "unknown", "TonTon Arsenal", "shot", "snake", "", "TonTon 4 – Collision 3 in progress"),
  s7t("8", "clock 0:42 | set7-p8-B 04:40", "unknown", "TonTon Arsenal", "shot", "dorito", "", "TonTon 4 – Collision 3 in progress"),
  s7t("8", "clock 0:26 | set7-p8-B 04:56", "unknown (last TonTon)", "TonTon Arsenal", "walk-off", "—", "", "TonTon 4 – Collision 3 in progress"),
  s7t("8", "clock 0:09 | set7-p8-B 05:17", "unknown (Collision buzzer)", "Los Angeles Collision", "buzzer", "home", "", "TonTon 4 – Collision 4"),
  s7t("9", "clock ? | set7-p9-a 05:18", "unknown", "Los Angeles Collision", "gunfight", "snake side", "Decider at 4–4 (clock 0:09 left — possible OT/sudden-death, VERIFY). Overlay clock in p9 tracks the other field — clip time is reliable", "TonTon 4 – Collision 4 in progress"),
  s7t("9", "clock ? | set7-p9-b 00:23", "unknown", "Los Angeles Collision", "run-through", "snake", "Run-through by TonTon down snake", "TonTon 4 – Collision 4 in progress"),
  s7t("9", "clock ? | set7-p9-b 00:32", "unknown", "Los Angeles Collision", "gunfight", "center / D-side", "", "TonTon 4 – Collision 4 in progress"),
  s7t("9", "clock ? | set7-p9-b 00:40", "Hugo Verhaeghe (buzzer)", "#15 TonTon Arsenal", "buzzer", "home", "Film Verhaeghe #15; PBLeagues TonTon roster (p2 notes' Collision tag rejected)", "TonTon 5 – Collision 4"),
  s7t("FINAL", "clock ? | set7-p9-b 00:44 (FINAL graphic)", "—", "—", "final", "—", "FINAL confirmed on screen. Points 2–5 scores VERIFY (overlay conflicts; inferred path); aborted reset point not logged", "FINAL TonTon Arsenal 5 – Los Angeles Collision 4")
];
ROWS.push(...S7T_ROWS);

const S8_P1 = "p1 pass LOW CONFIDENCE (uniform 5–8s spacing) — VERIFY";
const S8_SRC = "MLPB+ Sat Set 8 set8 dual-feed (p1–p3, p4-a/b, p6-gap + p7-gap recapture, p5-a/b; jersey key IMP brown/black, LEV black/white/grey, RL red/black, DIS yellow/black); ";
const S8_TEAM: Record<string, string> = { I: "Edmonton Impact", L: "New Jersey Leverage", R: "Red Legion", D: "Chicago Distortion", IT: "Edmonton Impact / New Jersey Leverage (TOP side — team VERIFY)", IB: "Edmonton Impact / New Jersey Leverage (BOTTOM side — team VERIFY)", RT: "Red Legion / Chicago Distortion (TOP side — team VERIFY)", RB: "Red Legion / Chicago Distortion (BOTTOM side — team VERIFY)" };
const S8_N: Record<string, string> = { P1: S8_P1, F3: "Feed flips p3-a 00:58/02:38 VERIFY", T6: "TOP side = loser of point → likely Red Legion (team VERIFY by jersey red/black)", C8: "Off break; continues into p4-a; feed flip p3-b 04:04 VERIFY", F3b: "Feed flip p3-b 01:23 VERIFY", G: "Gap recapture" };
function s8(match: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, score]) => ({
    event: EV, division: DIV, match, point, timestamp, playerOut,
    jersey: S8_TEAM[jersey] ?? jersey, elimType, area,
    notes: S8_SRC + notes.replace(/^(P1|F3b|F3|T6|C8|G)\b/, (m) => S8_N[m]),
    scoreAfter: score.endsWith("+") ? score.slice(0, -1) + " in progress" : score,
  }));
}
ROWS.push(...s8("Edmonton Impact vs New Jersey Leverage (Sat Set 8 MLPB+)", [
  ["1", "clock 15:00 break | set8-p1-a 1:13", "unknown", "L", "lane", "dorito", "P1; breakout p1-a 1:07", "Impact 0 – Leverage 0+"],
  ["1", "clock 15:00 break | set8-p1-a 1:15", "unknown", "L", "lane", "snake", "P1; breakout p1-a 1:07", "Impact 0 – Leverage 0+"],
  ["1", "clock 15:00 break | set8-p1-a 1:48", "unknown", "L", "snap", "center / dorito", "P1; breakout p1-a 1:07", "Impact 0 – Leverage 0+"],
  ["1", "clock 15:00 break | set8-p1-a 1:57", "unknown", "L", "snap", "snake", "P1; breakout p1-a 1:07", "Impact 0 – Leverage 0+"],
  ["1", "clock 15:00 break | set8-p1-a 2:08", "unknown", "L", "bunkered", "center", "P1; breakout p1-a 1:07; Impact wins point (p1-a 2:41)", "Impact 1 – Leverage 0"],
  ["2", "clock ? (break 13:33) | set8-p1-a 5:13", "unknown", "I", "lane", "snake", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-a 5:27", "unknown", "L", "snap", "dorito", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-a 5:35", "unknown", "L", "snap", "center", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-b 0:03", "unknown", "L", "snap", "snake", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-b 0:13", "unknown", "I", "shot", "center", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-b 0:21", "unknown", "I", "shot", "snake", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-b 0:31", "unknown", "I", "shot", "dorito", "P1", "Impact 1 – Leverage 0+"],
  ["2", "clock ? (break 13:33) | set8-p1-b 0:38", "unknown", "I", "concession", "center", "P1; concession VERIFY; Leverage buzzer p1-b 0:40 wins point", "Impact 1 – Leverage 1"],
  ["3", "clock ? (break 11:59) | set8-p1-b 3:45", "unknown", "L", "lane", "dorito", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 3:51", "unknown", "I", "lane", "center / snake", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 4:02", "unknown", "L", "shot", "snake", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 4:18", "unknown", "L", "shot", "center", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 4:32", "unknown", "I", "shot", "dorito", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 4:41", "unknown", "I", "bunkered", "center", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 4:54", "unknown", "L", "shot", "dorito", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock ? (break 11:59) | set8-p1-b 5:04", "unknown", "L", "bunkered", "snake", "P1", "Impact 1 – Leverage 1+"],
  ["3", "clock 9:55 | set8-p2-a 00:00", "unknown #99", "#99 Edmonton Impact", "shot", "center (off break, carryover)", "Carryover from p1; scoreboard flip p2-a 00:05 VERIFY; Impact wins point", "Impact 2 – Leverage 1"],
  ["4", "clock 9:43 | set8-p2-a 03:10", "unknown", "L", "run-through", "snake", "", "Impact 2 – Leverage 1+"],
  ["4", "clock 9:39 | set8-p2-a 03:14", "unknown", "I", "lane", "center / snake gap", "", "Impact 2 – Leverage 1+"],
  ["4", "clock 9:30 | set8-p2-a 03:25", "unknown", "I", "snap", "back center", "", "Impact 2 – Leverage 1+"],
  ["4", "clock 9:17 | set8-p2-a 03:39", "unknown", "I", "bunkered", "dorito", "", "Impact 2 – Leverage 1+"],
  ["4", "clock 8:58 | set8-p2-a 04:02", "unknown", "I", "walk-off", "unclear", "", "Impact 2 – Leverage 1+"],
  ["4", "clock 8:58 | set8-p2-a 04:04", "unknown #71", "#71 New Jersey Leverage", "ref pull / walk-off", "doritos", "Unclear walk-off; Leverage wins point", "Impact 2 – Leverage 2"],
  ["5", "clock 8:49 | set8-p2-b 00:15", "unknown", "L", "lane", "dorito", "", "Impact 2 – Leverage 2+"],
  ["5", "clock 8:37 | set8-p2-b 00:27", "unknown", "L", "snap", "snake", "", "Impact 2 – Leverage 2+"],
  ["5", "clock 8:31 | set8-p2-b 00:32", "unknown", "L", "lane", "back center", "", "Impact 2 – Leverage 2+"],
  ["5", "clock 8:21 | set8-p2-b 00:43", "unknown", "L", "bunkered / run-through", "dorito", "Impact wins point; feed flip p2-b 01:19 VERIFY", "Impact 3 – Leverage 2"],
  ["6", "clock 7:48 | set8-p2-b 04:31", "unknown", "L", "lane", "dorito", "", "Impact 3 – Leverage 2+"],
  ["6", "clock 7:39 | set8-p2-b 04:41", "unknown", "I", "snap", "snake", "", "Impact 3 – Leverage 2+"],
  ["6", "clock 7:28 | set8-p2-b 04:52", "unknown", "L", "lane", "snake", "", "Impact 3 – Leverage 2+"],
  ["6", "clock 7:17 | set8-p2-b 05:03", "unknown", "L", "lane", "back center", "", "Impact 3 – Leverage 2+"],
  ["6", "clock 7:06 | set8-p2-b 05:13", "unknown", "L", "bunkered", "doritos", "Impact wins point", "Impact 4 – Leverage 2"],
  ["6 (VERIFY)", "clock 7:26 | set8-p3-a 00:13", "unknown", "IT", "unclear", "dorito", "p3 carryover; may belong to P6 end — point label VERIFY", "Impact 4 – Leverage 2"],
  ["6 (VERIFY)", "clock 7:25 | set8-p3-a 00:14", "unknown", "IT", "unclear", "back center", "p3 carryover; Impact #1 Cornell buzzer p3-a 00:44 but board stays 4–2 (overlay bug 'New York Xtreme 2-4' 00:53) — VERIFY", "Impact 4 – Leverage 2"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 03:58", "unknown", "IT", "lane", "snake", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:02", "unknown", "IB", "lane", "back center", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:06", "unknown", "IB", "lane", "snake", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:14", "unknown", "IT", "unclear", "dorito", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:22", "unknown", "IB", "unclear", "center", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:28", "unknown", "IT", "unclear", "snake", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:35", "unknown", "IT", "unclear", "center", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:46", "unknown", "IB", "unclear", "dorito", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-a 04:53", "unknown", "IB", "unclear", "center", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-b 00:02", "unknown", "IB", "unclear", "dorito", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-b 00:03", "unknown", "IB", "unclear", "back center", "F3", "Impact 4 – Leverage 2+"],
  ["7", "clock 6:50 (overhead frozen) | set8-p3-b 00:04", "unknown", "IT", "unclear", "dorito", "F3; Leverage wins (walk-off, board LEV 3-4 IMP p3-b 01:19)", "Impact 4 – Leverage 3"],
  ["8", "clock 5:36 | set8-p3-b 04:53", "unknown", "IT", "lane", "center", "C8", "Impact 4 – Leverage 3+"],
  ["8", "clock 5:35 | set8-p3-b 04:54", "unknown", "IB", "lane", "dorito", "C8", "Impact 4 – Leverage 3+"],
  ["8", "clock 5:34 | set8-p3-b 04:55", "unknown", "IT", "lane", "snake", "C8", "Impact 4 – Leverage 3+"],
  ["8", "clock 5:10 | set8-p4-a", "unknown", "L", "shot", "snake", "", "Impact 4 – Leverage 3+"],
  ["8", "clock 4:30 | set8-p4-a", "unknown", "L", "shot", "center", "", "Impact 4 – Leverage 3+"],
  ["8", "clock 4:18 | set8-p4-a", "unknown", "L", "shot", "snake", "", "Impact 4 – Leverage 3+"],
  ["8", "clock ? | set8-p4-a 01:21", "Tyler Harmon (buzzer)", "#12 Edmonton Impact", "buzzer", "home", "Tyler Harmon #12 hits buzzer (name/team PBLeagues-confirmed; number from film); Impact wins point", "Impact 5 – Leverage 3"],
  ["9", "clock 3:53 | set8-p4-a", "unknown", "I", "shot", "center", "", "Impact 5 – Leverage 3+"],
  ["9", "clock 3:48 | set8-p4-a", "unknown", "L", "shot", "dorito", "", "Impact 5 – Leverage 3+"],
  ["9", "clock 3:44 | set8-p4-a", "unknown", "I", "diving", "snake", "", "Impact 5 – Leverage 3+"],
  ["9", "clock 3:19 | set8-p4-a", "unknown", "I", "shot", "center / dorito", "", "Impact 5 – Leverage 3+"],
  ["9", "clock ? | set8-p4-b", "—", "—", "point won", "—", "Leverage wins point (no further elims itemized)", "Impact 5 – Leverage 4"],
  ["10", "clock 1:44 | set8-p6-gap", "unknown", "I", "shot", "dorito", "G", "Impact 5 – Leverage 4+"],
  ["10", "clock 1:39 | set8-p6-gap", "unknown", "L", "shot", "snake", "G", "Impact 5 – Leverage 4+"],
  ["10", "clock 1:29 | set8-p6-gap", "unknown", "L", "shot", "dorito", "G; Leverage wins point", "Impact 5 – Leverage 5"],
  ["11", "clock 1:11 | set8-p7-gap", "unknown", "I", "shot", "dorito", "G", "Impact 5 – Leverage 5+"],
  ["11", "clock 1:05 | set8-p7-gap", "unknown", "L", "shot", "snake", "G", "Impact 5 – Leverage 5+"],
  ["11", "clock 0:59 | set8-p7-gap", "unknown", "L", "shot", "center", "G", "Impact 5 – Leverage 5+"],
  ["11", "clock 0:52 | set8-p7-gap", "unknown", "I", "shot", "snake", "G; Impact wins point", "Impact 6 – Leverage 5"],
  ["12", "clock 0:37 | set8-p5-a", "unknown", "L", "off break", "dorito", "", "Impact 6 – Leverage 5+"],
  ["12", "clock 0:32 | set8-p5-a", "unknown", "I", "shot", "snake", "", "Impact 6 – Leverage 5+"],
  ["12", "clock 0:24 | set8-p5-a", "unknown", "L", "shot", "center", "", "Impact 6 – Leverage 5+"],
  ["12", "clock 0:11 | set8-p5-a", "unknown", "I", "shot", "dorito", "Impact wins point", "Impact 7 – Leverage 5"],
  ["13", "clock 0:13 | set8-p5-b", "unknown", "L", "shot", "snake", "", "Impact 7 – Leverage 5+"],
  ["13", "clock 0:05 | set8-p5-b", "unknown", "L", "shot", "dorito", "Impact wins point; time expired", "Impact 8 – Leverage 5"],
  ["FINAL", "clock 0:00 | set8-p5-b 00:40 (FINAL graphic)", "—", "—", "final", "—", "FINAL graphic on screen: Edmonton Impact 8 – New Jersey Leverage 5 (CONFIRMED). P6/P7 carryover label VERIFY. Autoplay into Set 9 at p5-b 01:16 discarded.", "Impact 8 – Leverage 5"],
]));
ROWS.push(...s8("Red Legion vs Chicago Distortion (Sat Set 8 MLPB+)", [
  ["1", "clock 15:00 break | set8-p1-a 3:34", "unknown", "D", "lane", "snake", "P1; breakout p1-a 3:28", "Red Legion 0 – Distortion 0+"],
  ["1", "clock 15:00 break | set8-p1-a 3:47", "unknown", "D", "lane", "dorito", "P1; breakout p1-a 3:28", "Red Legion 0 – Distortion 0+"],
  ["1", "clock 15:00 break | set8-p1-a 3:56", "unknown", "D", "snap", "center", "P1; breakout p1-a 3:28", "Red Legion 0 – Distortion 0+"],
  ["1", "clock 15:00 break | set8-p1-a 4:08", "unknown", "R", "snap", "snake", "P1; breakout p1-a 3:28", "Red Legion 0 – Distortion 0+"],
  ["1", "clock 15:00 break | set8-p1-a 4:15", "unknown", "D", "snap", "center / dorito", "P1; breakout p1-a 3:28; Red Legion wins point (p1-a 4:22)", "Red Legion 1 – Distortion 0"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:06", "unknown", "D", "lane", "dorito", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:14", "unknown", "R", "lane", "snake", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:21", "unknown", "D", "snap", "snake", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:28", "unknown", "R", "snap", "center", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:34", "unknown", "D", "shot", "center", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:42", "unknown", "D", "shot", "dorito", "P1", "Red Legion 1 – Distortion 0+"],
  ["2", "clock ? (break 14:13) | set8-p1-b 2:49", "unknown", "D", "bunkered", "snake", "P1; Red Legion wins point (p1-b 2:51). Dual-feed desync p1-b 3:13 (unnamed #92 pit shot under IMP-LEV graphics; team VERIFY — no 'Deev' on any PBLeagues roster; desync means he may be from the Impact–Leverage match) — VERIFY", "Red Legion 2 – Distortion 0"],
  ["3", "clock 13:11 | set8-p2-a 01:13", "unknown", "R", "lane / snap", "snake", "", "Red Legion 2 – Distortion 0+"],
  ["3", "clock 13:01 | set8-p2-a 01:22", "unknown", "R", "lane", "center", "", "Red Legion 2 – Distortion 0+"],
  ["3", "clock 12:57 | set8-p2-a 01:25", "unknown", "R", "walk-off", "doritos", "", "Red Legion 2 – Distortion 0+"],
  ["3", "clock 12:41 | set8-p2-a 01:42", "unknown", "R", "lane", "back center", "", "Red Legion 2 – Distortion 0+"],
  ["3", "clock 12:19 | set8-p2-a 02:07", "Nate Roberts", "#47 Chicago Distortion", "overshoot / ref pull", "dorito", "Nate Roberts #47 (PBLeagues-confirmed); Distortion wins point", "Red Legion 2 – Distortion 1"],
  ["4", "clock 12:09 | set8-p2-a 04:42", "unknown", "R", "lane", "dorito", "", "Red Legion 2 – Distortion 1+"],
  ["4", "clock 12:04 | set8-p2-a 04:47", "unknown", "D", "lane", "dorito", "", "Red Legion 2 – Distortion 1+"],
  ["4", "clock 11:57 | set8-p2-a 04:54", "unknown", "D", "lane", "center", "", "Red Legion 2 – Distortion 1+"],
  ["4", "clock 11:49 | set8-p2-a 05:01", "unknown", "R", "snap", "snake", "", "Red Legion 2 – Distortion 1+"],
  ["4", "clock 11:39 | set8-p2-a 05:12", "unknown", "D", "bunkered / run-through", "snake", "Red Legion wins point; feed flip p2-a 05:16 VERIFY", "Red Legion 3 – Distortion 1"],
  ["5", "clock 11:54 | set8-p2-b 02:13", "unknown", "R", "lane", "center", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 11:30 | set8-p2-b 02:39", "unknown", "R", "snap / lane", "snake", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 11:18 | set8-p2-b 02:51", "unknown", "D", "snap", "center", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 11:08 | set8-p2-b 03:00", "unknown", "R", "lane", "dorito", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 10:55 | set8-p2-b 03:13", "unknown", "R", "lane", "back center", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 10:32 | set8-p2-b 03:37", "unknown", "D", "snap", "doritos", "", "Red Legion 3 – Distortion 1+"],
  ["5", "clock 10:27 | set8-p2-b 03:42", "unknown", "R", "walk-off", "unclear", "Distortion wins point", "Red Legion 3 – Distortion 2"],
  ["6", "clock 9:12 | set8-p3-a 01:45", "unknown", "RT", "lane", "center", "T6", "Red Legion 3 – Distortion 2+"],
  ["6", "clock 9:10 | set8-p3-a 01:47", "unknown", "RT", "lane", "snake", "T6", "Red Legion 3 – Distortion 2+"],
  ["6", "clock 8:38 | set8-p3-a 02:22", "unknown", "RT", "ref pull", "center / dorito", "T6; Distortion buzzer p3-a 02:25", "Red Legion 3 – Distortion 3"],
  ["7", "clock 8:33 | set8-p3-b 02:30", "unknown", "RT", "lane", "center", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 8:29 | set8-p3-b 02:34", "unknown", "RB", "lane", "dorito", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 8:03 | set8-p3-b 03:00", "unknown", "RT", "unclear", "snake", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 8:01 | set8-p3-b 03:02", "unknown", "RB", "unclear", "center", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 7:58 | set8-p3-b 03:05", "unknown", "RB", "unclear", "dorito", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 7:57 | set8-p3-b 03:06", "unknown", "RB", "unclear", "snake", "F3b", "Red Legion 3 – Distortion 3+"],
  ["7", "clock 7:27 | set8-p3-b 03:36", "unknown", "RB", "run-through / bunkered", "snake", "F3b; Red Legion buzzer p3-b 03:47", "Red Legion 4 – Distortion 3"],
  ["8", "clock 6:57 | set8-p4-a", "unknown", "R", "shot", "dorito", "", "Red Legion 4 – Distortion 3+"],
  ["8", "clock 6:48 | set8-p4-a", "unknown", "D", "laned", "center", "Red Legion wins point", "Red Legion 5 – Distortion 3"],
  ["9", "clock 6:13 | set8-p4-b", "unknown", "R", "off break", "dorito", "", "Red Legion 5 – Distortion 3+"],
  ["9", "clock 6:08 | set8-p4-b", "unknown", "D", "off break", "snake", "", "Red Legion 5 – Distortion 3+"],
  ["9", "clock 5:45 | set8-p4-b", "unknown", "R", "shot", "snake", "", "Red Legion 5 – Distortion 3+"],
  ["9", "clock 5:35 | set8-p4-b", "unknown", "D", "shot", "dorito", "", "Red Legion 5 – Distortion 3+"],
  ["9", "clock 5:28 | set8-p4-b", "unknown", "D", "shot", "center", "Red Legion wins point", "Red Legion 6 – Distortion 3"],
  ["10", "clock 4:46 | set8-p6-gap", "unknown", "R", "shot", "dorito", "G", "Red Legion 6 – Distortion 3+"],
  ["10", "clock 4:42 | set8-p6-gap", "unknown", "D", "shot", "snake", "G", "Red Legion 6 – Distortion 3+"],
  ["10", "clock 4:27 | set8-p6-gap", "unknown", "D", "laned", "center", "G", "Red Legion 6 – Distortion 3+"],
  ["10", "clock 4:25 | set8-p6-gap", "unknown", "R", "shot", "snake", "G", "Red Legion 6 – Distortion 3+"],
  ["10", "clock 4:13 | set8-p6-gap", "unknown", "D", "shot", "dorito", "G; Distortion wins point (last elim is Distortion yet DIS wins — team side VERIFY)", "Red Legion 6 – Distortion 4"],
  ["11", "clock 3:25 | set8-p7-gap", "unknown", "D", "shot", "snake", "G", "Red Legion 6 – Distortion 4+"],
  ["11", "clock 3:22 | set8-p7-gap", "unknown", "R", "shot", "dorito", "G", "Red Legion 6 – Distortion 4+"],
  ["11", "clock 3:10 | set8-p7-gap", "unknown", "D", "shot", "center", "G", "Red Legion 6 – Distortion 4+"],
  ["11", "clock 2:56 | set8-p7-gap", "unknown", "R", "shot", "snake", "G", "Red Legion 6 – Distortion 4+"],
  ["11", "clock 2:48 | set8-p7-gap", "unknown", "D", "shot", "dorito", "G; Red Legion wins point — last solid score", "Red Legion 7 – Distortion 4"],
  ["FINAL", "clock ? | no FINAL graphic", "—", "—", "final", "—", "Red Legion win certain; final score VERIFY (7–4 last solid). p5-a claimed points 8–11 (RL 8-4…11-4, breakouts ~28s apart at clock 1:49/1:21/0:44) left OFF Page pending recheck.", "Red Legion 7+ – Distortion 4 (VERIFY)"],
]));

const S9_SRC = "MLPB+ Sat Set 9 set9 dual-feed (p1–p5, p6-a/b, p7gap recapture, p8; jersey/team per film, names PBLeagues-checked; pit-cam team labels unreliable); ";
const S9_TEAM: Record<string, string> = {"I": "Los Angeles Ironmen", "S": "Royal City Seadogs", "C": "Los Angeles Collision", "A": "Perris ASG Aftermath", "CA": "Los Angeles Collision / Perris ASG Aftermath (team VERIFY)"};
function s9(match: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, score]) => ({
    event: EV, division: DIV, match, point, timestamp, playerOut,
    jersey: S9_TEAM[jersey] ?? jersey, elimType, area,
    notes: S9_SRC + notes,
    scoreAfter: score.endsWith("+") ? score.slice(0, -1) + " in progress" : score,
  }));
}
ROWS.push(...s9("Los Angeles Ironmen vs Royal City Seadogs (Sat Set 9 MLPB+)", [
  ["1", "clock ~14:44 | set9-p1-a 00:14", "unknown", "I", "lane", "snake", "Breakout", "Ironmen 0 – Seadogs 0+"],
  ["1", "clock 12:48 | set9-p1-a 02:11", "unknown", "I", "diving", "snake 2", "", "Ironmen 0 – Seadogs 0+"],
  ["1", "clock 11:17 | set9-p1-a 03:44", "Caleb Abuhl", "#7 Los Angeles Ironmen", "shot (cross-field)", "snake", "Film Abuhl #7; PBLeagues Ironmen (Caleb Abuhl)", "Ironmen 0 – Seadogs 0+"],
  ["1", "clock 11:08 | set9-p1-a 03:52", "—", "S", "buzzer", "—", "Seadogs buzzer; Seadogs win point", "Ironmen 0 – Seadogs 1"],
  ["2", "clock 10:24 | set9-p1-b 02:37", "unknown", "S", "shot", "center", "", "Ironmen 0 – Seadogs 1+"],
  ["2", "clock 10:11 | set9-p1-b 02:51", "unknown", "I", "shot", "center", "", "Ironmen 0 – Seadogs 1+"],
  ["2", "clock 09:14 | set9-p1-b 03:49", "unknown", "I", "shot", "center", "", "Ironmen 0 – Seadogs 1+"],
  ["2", "clock 09:07 | set9-p1-b 03:56", "unknown", "I", "shot", "snake", "", "Ironmen 0 – Seadogs 1+"],
  ["2", "clock 09:04 | set9-p1-b 04:00", "Clayton Rizzardo Jr", "#9 Royal City Seadogs", "shot", "dorito", "Film 'C. Rizzardo #9'; PBLeagues Seadogs (Clayton Rizzardo Jr)", "Ironmen 0 – Seadogs 1+"],
  ["2", "clock ? | set9-p1-b 04:07", "—", "S", "buzzer", "—", "Seadogs buzzer; Seadogs win point", "Ironmen 0 – Seadogs 2"],
  ["3", "clock ? | set9-p2-a 00:55", "Caleb Abuhl (buzzer)", "#7 Los Angeles Ironmen", "buzzer", "center (run up center)", "Abuhl #7 runs up center + buzzer; Ironmen win point (point outs not visible in p2 clip)", "Ironmen 1 – Seadogs 2"],
  ["4", "clock ? (restart 8:16) | set9-p2-a 05:14", "unknown", "S", "lane", "dorito", "Replay of aborted point (clock reset 8:01→8:16); aborted-attempt outs p2-a 04:24–04:40 discarded", "Ironmen 1 – Seadogs 2+"],
  ["4", "clock ? (restart 8:16) | set9-p2-a 05:14", "unknown", "I", "lane", "dorito", "Replay of aborted point (clock reset 8:01→8:16); aborted-attempt outs p2-a 04:24–04:40 discarded", "Ironmen 1 – Seadogs 2+"],
  ["4", "clock ? (restart 8:16) | set9-p2-b 00:21", "unknown", "I", "shot", "snake", "", "Ironmen 1 – Seadogs 2+"],
  ["4", "clock ? (restart 8:16) | set9-p2-b 00:29", "unknown", "I", "lane", "dorito", "", "Ironmen 1 – Seadogs 2+"],
  ["4", "clock ? (restart 8:16) | set9-p2-b 01:01", "unknown", "I", "shot (from snake)", "back center", "Seadogs buzzer p2-b 01:18; Seadogs win point", "Ironmen 1 – Seadogs 3"],
  ["5", "clock ? | set9-p2-b 01:42", "unknown", "S", "lane", "snake", "Sides switched", "Ironmen 1 – Seadogs 3+"],
  ["5", "clock ? | set9-p2-b 01:45", "unknown", "I", "lane", "snake", "", "Ironmen 1 – Seadogs 3+"],
  ["5", "clock ? | set9-p2-b 01:52", "unknown", "S", "lane", "home", "", "Ironmen 1 – Seadogs 3+"],
  ["5", "clock ? | set9-p2-b 03:12", "unknown", "I", "bunkered (Seadogs tape runner)", "dorito", "", "Ironmen 1 – Seadogs 3+"],
  ["5", "clock ? | set9-p2-b 03:15", "unknown", "I", "run-through", "center", "Seadogs buzzer p2-b 03:17; Seadogs win point", "Ironmen 1 – Seadogs 4"],
  ["6", "clock ? | set9-p3-a 01:49", "unknown", "S", "off break", "center", "Broadcast graphics bugged in p3 ('Houston', 'New York Xtreme' labels ignored)", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 02:22", "Christopher Lennon", "#22 Los Angeles Ironmen", "shot", "dorito", "Film Lennon #22; PBLeagues Ironmen (Christopher Lennon)", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 02:44", "unknown", "I", "shot", "snake", "", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 03:26", "unknown", "S", "shot", "dorito", "", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 04:00", "unknown", "S", "shot", "center / dorito", "", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 04:13", "unknown", "S", "lane / overshoot", "snake (running)", "", "Ironmen 1 – Seadogs 4+"],
  ["6", "clock ? | set9-p3-a 04:21", "Caleb Abuhl (buzzer)", "#7 Los Angeles Ironmen", "buzzer", "—", "Abuhl #7 buzzer; Ironmen win point. Graphic later shows Seadogs 3–2 vs film count 4–2 — score VERIFY. HT/pits follow (p3-a 04:22–p3-b 00:57)", "Ironmen 2 – Seadogs 4 (VERIFY: graphic 2–3)"],
  ["7", "clock 0:51 | set9-p3-b 05:32", "unknown", "I", "off break", "snake", "Restart after Ironmen timeout (aborted breakout p3-b 03:04 — Seadogs center out 03:09 discarded); graphic Seadogs 3–2 @0:55 (VERIFY vs film 4–2)", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:50 | set9-p3-b 05:33", "unknown", "I", "shot", "center", "", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:48 | set9-p3-b 05:35", "unknown", "S", "shot", "dorito", "", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:44 | set9-p3-b 05:39", "unknown", "I", "shot", "dorito", "", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:37 | set9-p3-b 05:46", "unknown", "I", "shot", "back center", "Ironmen wiped (~0:37)", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock ? | set9-p3-b 05:54", "unknown", "S", "late hit", "—", "Late hit — VERIFY (may not be a real elim)", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:14 | set9-p4-b 02:49", "unknown", "I", "shot", "snake", "p4-b broadcast replay footage of the final point — likely DUPLICATE of P7 outs above (≥7 Ironmen outs if both counted); if a separate last point, score would be 6–2 — VERIFY", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:12 | set9-p4-b 02:51", "unknown", "I", "shot", "center", "p4-b broadcast replay footage of the final point — likely DUPLICATE of P7 outs above (≥7 Ironmen outs if both counted); if a separate last point, score would be 6–2 — VERIFY", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:10 | set9-p4-b 02:53", "unknown", "I", "shot (implied)", "dorito", "p4-b broadcast replay footage of the final point — likely DUPLICATE of P7 outs above (≥7 Ironmen outs if both counted); if a separate last point, score would be 6–2 — VERIFY; out implied", "Ironmen 2 – Seadogs 4+"],
  ["7", "clock 0:01 | set9-p4-b 03:02", "—", "S", "buzzer", "—", "Seadogs buzzer at 0:01; Seadogs win point; time expires", "Ironmen 2 – Seadogs 5 (VERIFY)"],
  ["FINAL", "clock 0:00 | set9-p4-b / p8 (no FINAL graphic)", "—", "—", "final", "—", "Seadogs win on time (certain). No FINAL graphic seen (p4–p8). Graphic showed 3–2 before last Seadogs point (→ 4–2); film count 5–2 — final score VERIFY. Campbell #08 shown on pit cam (p4-a downtime; PBLeagues Seadogs).", "Ironmen 2 – Seadogs 5 (VERIFY; graphic path → 4–2)"],
]));
ROWS.push(...s9("Los Angeles Collision vs Perris ASG Aftermath (Sat Set 9 MLPB+)", [
  ["1", "clock 14:43 | set9-p1-a 05:10", "unknown", "C", "lane", "snake", "Breakout; DUAL-FEED graphics lag — VERIFY", "Collision 0 – Aftermath 0+"],
  ["1", "clock 14:28 | set9-p1-a 05:25", "unknown", "C", "shot", "dorito", "DUAL-FEED graphics lag — VERIFY", "Collision 0 – Aftermath 0+"],
  ["1", "clock 14:24 | set9-p1-a 05:28", "unknown", "C", "shot", "snake", "DUAL-FEED graphics lag — VERIFY", "Collision 0 – Aftermath 0+"],
  ["1", "clock 13:20 | set9-p1-b 00:33", "unknown", "C", "bunkered / run-through", "dorito (push)", "DUAL-FEED graphics lag — VERIFY", "Collision 0 – Aftermath 0+"],
  ["1", "clock 13:06 | set9-p1-b 00:47", "unknown", "C", "shot", "center", "Aftermath buzzer 12:49 (p1-b 01:08); Aftermath win flawless", "Collision 0 – Aftermath 1"],
  ["2", "clock 12:37 | set9-p1-b 05:07", "unknown", "C", "shot", "dorito (push)", "", "Collision 0 – Aftermath 1+"],
  ["2", "clock 12:34 | set9-p1-b 05:10", "unknown", "A", "shot", "snake", "", "Collision 0 – Aftermath 1+"],
  ["2", "clock 12:29 | set9-p1-b 05:15", "unknown", "C", "shot", "center", "", "Collision 0 – Aftermath 1+"],
  ["2", "clock ~12:26 | set9-p1-b 05:22", "unknown", "A", "shot", "snake", "", "Collision 0 – Aftermath 1+"],
  ["2", "clock 12:26 | set9-p1-b 05:26", "Arrieta (VERIFY team)", "#44 Los Angeles Collision / Perris ASG Aftermath (team VERIFY)", "shot", "center / dorito", "Film tagged Collision #44 Arrieta; PBLeagues lists Eric Arrieta on Aftermath; pit cams mislabeled (Ironmen label over Collision; p4 'Collision pit' Arrieta) — team VERIFY. Point unresolved at clip end; graphic AFT 2–0 @12:26 → Aftermath win (VERIFY)", "Collision 0 – Aftermath 2 (VERIFY)"],
  ["3", "clock 12:21 | set9-p2-a 01:54", "unknown", "C", "lane", "home", "Other outs unobservable (tight cams); Collision buzzer p2-a 04:20; Collision win point (AFT 2–1 @10:03)", "Collision 1 – Aftermath 2"],
  ["4", "clock 9:59 | set9-p2-b 04:33", "unknown", "C", "lane", "snake", "Sides switched", "Collision 1 – Aftermath 2+"],
  ["4", "clock 9:56 | set9-p2-b 04:36", "unknown", "A", "lane", "dorito", "", "Collision 1 – Aftermath 2+"],
  ["4", "clock 9:53 | set9-p2-b 04:38", "unknown", "C", "lane", "home", "", "Collision 1 – Aftermath 2+"],
  ["4", "clock ? | set9-p3-a 00:02", "Brandon Trujillo", "#23 Los Angeles Collision", "shot", "—", "Film Trujillo #23 (Collision); PBLeagues Collision (Brandon Trujillo)", "Collision 1 – Aftermath 2+"],
  ["4", "clock ? | set9-p3-a 00:30", "unknown", "A", "lane (cross-field)", "dorito", "", "Collision 1 – Aftermath 2+"],
  ["4", "clock ? | set9-p3-a 00:46", "#17 (buzzer)", "#17 Perris ASG Aftermath", "buzzer", "—", "Film shows Aftermath #17 buzzer, but graphic then reads 2–2 (Collision win) — point winner VERIFY; #17 unnamed (candidates Velazquez/Frutos/Doan/Stuart)", "Collision 2 – Aftermath 2 (VERIFY)"],
  ["5", "clock 9:24 | set9-p3-b 01:03", "unknown", "C", "off break", "center", "Graphic COL 2–AFT 2 confirmed @8:28; aborted cutaway breakout p3-a 00:55 (Aftermath snake out) discarded", "Collision 2 – Aftermath 2+"],
  ["5", "clock 9:23 | set9-p3-b 01:04", "unknown", "A", "off break", "dorito", "", "Collision 2 – Aftermath 2+"],
  ["5", "clock ~8:00 | set9-p3-b 02:34", "Woodruff (VERIFY team)", "#8 Los Angeles Collision / Perris ASG Aftermath (team VERIFY)", "penalty (yellow flag)", "dorito", "Film: Collision #8 Woodruff yellow-flag penalty; PBLeagues lists Cody Woodruff on Aftermath — team VERIFY", "Collision 2 – Aftermath 2+"],
  ["5", "clock ~8:00 | set9-p3-b 02:34", "unknown", "CA", "penalty pull (1-for-1)", "snake", "1-for-1 pull with Woodruff penalty; film says Collision snake — team VERIFY (same team as Woodruff)", "Collision 2 – Aftermath 2+"],
  ["5", "clock 7:54 | set9-p3-b 02:46", "—", "A", "point won", "—", "Aftermath win point (graphic AFT 3–2 @7:54)", "Collision 2 – Aftermath 3"],
  ["6", "clock 7:53 | set9-p4-b 04:09", "unknown", "C", "shot", "dorito", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:52 | set9-p4-b 04:14", "unknown", "A", "shot", "snake", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:49 | set9-p4-b 04:18", "unknown", "C", "shot", "center", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:48 | set9-p4-b 04:20", "unknown", "A", "shot", "center", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:13 | set9-p4-b 04:38", "unknown", "C", "shot", "snake", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:09 | set9-p4-b 04:42", "unknown", "C", "shot", "center / back center", "", "Collision 2 – Aftermath 3+"],
  ["6", "clock 7:06 | set9-p4-b 04:44", "unknown", "C", "shot", "dorito", "Aftermath buzzer 7:01 (p4-b 04:49); Aftermath win 5-for-2 (graphic AFT 4–2 @6:52)", "Collision 2 – Aftermath 4"],
  ["7", "clock ~6:46 | set9-p5 00:51", "unknown", "C", "lane", "snake", "Breakout", "Collision 2 – Aftermath 4+"],
  ["7", "clock ~6:43 | set9-p5 00:54", "unknown", "A", "lane", "dorito", "Breakout", "Collision 2 – Aftermath 4+"],
  ["7", "clock ~6:34 | set9-p5 01:03", "unknown", "A", "shot", "snake", "", "Collision 2 – Aftermath 4+"],
  ["7", "clock ~6:11 | set9-p5 01:26", "unknown", "A", "shot", "center", "", "Collision 2 – Aftermath 4+"],
  ["7", "clock ~5:37 | set9-p5 02:01", "unknown", "A", "shot (cross-field from Collision snake)", "dorito", "", "Collision 2 – Aftermath 4+"],
  ["7", "clock ~5:35 | set9-p5 02:03", "unknown", "A", "bunkered / run-through (Collision center)", "center / home", "Collision buzzer ~p5 02:06; Collision win point (COL 3–4 @4:29)", "Collision 3 – Aftermath 4"],
  ["8", "clock ~4:04 | set9-p6-a 00:04", "unknown", "A", "shot", "center", "", "Collision 3 – Aftermath 4+"],
  ["8", "clock ~3:55 | set9-p6-a 00:16", "unknown", "A", "shot", "dorito", "Collision win point (COL 4–4 @3:54)", "Collision 4 – Aftermath 4"],
  ["8", "clock 3:35 | set9-p7gap-a 00:04", "unknown", "A", "bunkered", "snake", "Point label VERIFY: p7gap puts this out in a 4–3→4–4 point starting 3:40 (Collision buzzer p7gap-a 01:28); p6 already shows 4–4 @3:54 and calls the 3:51 point WAVED OFF (Collision major, Ref #90) — point assignment VERIFY. p6 waved-off outs (back center 02:40, snake 02:42, dorito 02:46, snake run-through 03:00) discarded", "Collision 4 – Aftermath 4 (VERIFY)"],
  ["9", "clock ~1:52 | set9-p6-b 01:38", "unknown", "A", "shot", "snake", "Point started 2:09 after timeout, Collision down a man; p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock ? | set9-p6-b 01:42", "unknown", "C", "shot", "center", "p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock ? | set9-p6-b 01:46", "unknown", "A", "shot", "dorito", "p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock ? | set9-p6-b 01:53", "unknown", "A", "shot", "center", "p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock ? | set9-p6-b 02:00", "unknown", "A", "shot", "snake corner", "p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock ? | set9-p6-b 02:05", "unknown", "A", "shot", "dorito", "p6 pass (its 'buzzer penalty → Aftermath 5–4' call superseded by p7gap: Collision won 5–4); possible overlap with #12 row — VERIFY", "Collision 4 – Aftermath 4+"],
  ["9", "clock 0:54 | set9-p7gap-a 04:51", "#12 (unnamed)", "#12 Perris ASG Aftermath", "bunkered", "snake", "Aftermath #12 unnamed (candidates Velazquez/Frutos/Doan/Stuart) — VERIFY; Collision buzzer p7gap-a 05:27; Collision win point (graphic COL 5–4 @0:23)", "Collision 5 – Aftermath 4"],
  ["10", "clock ~0:06 | set9-p7gap-b 02:44", "unknown", "C", "run-through", "center / dorito", "From broadcast replay (p7gap-b)", "Collision 5 – Aftermath 4+"],
  ["10", "clock ~0:04 | set9-p7gap-b 02:51", "unknown", "C", "bunkered", "dorito", "From broadcast replay (p7gap-b)", "Collision 5 – Aftermath 4+"],
  ["10", "clock 0:02 | set9-p7gap-b 02:20", "Trujillo #23 (buzzer)", "#23 Los Angeles Collision / Perris ASG Aftermath (team VERIFY)", "buzzer", "—", "Film credits the OT-forcing buzzer at 0:02 to Aftermath, but PBLeagues lists Brandon Trujillo on Collision — side VERIFY. Graphic 'AFTERMATH 5 OVERTIME COLLISION 5'", "Collision 5 – Aftermath 5"],
  ["OT", "clock OT ? | set9-p7gap-b 03:41", "unknown", "C", "lane", "back center", "", "Collision 5 – Aftermath 5+"],
  ["OT", "clock OT ? | set9-p7gap-b 03:43", "unknown", "C", "lane", "back right", "", "Collision 5 – Aftermath 5+"],
  ["OT", "clock OT ? | set9-p7gap-b 04:19", "unknown", "C", "bunkered", "snake", "", "Collision 5 – Aftermath 5+"],
  ["OT", "clock OT ? | set9-p7gap-b 04:22", "unknown", "C", "run-through", "back center", "Aftermath buzzer p7gap-b 04:29; Aftermath win OT", "Collision 5 – Aftermath 6"],
  ["OT", "clock OT ~2:59 | set9-p8-a 03:42", "Green (VERIFY team)", "#42 Los Angeles Collision / Perris ASG Aftermath (team VERIFY)", "shot (diving)", "snake 1 (off break)", "p8 live view of the OT point (drone wide shot) — may DUPLICATE a p7gap OT row above — VERIFY; film tagged Collision #42 Green, PBLeagues lists James Green on Aftermath — team VERIFY", "Collision 5 – Aftermath 6"],
  ["OT", "clock OT ~1:15 | set9-p8-b 01:13", "unknown", "C", "escorted off", "dorito / center", "p8 live view of the OT point (drone wide shot) — may DUPLICATE a p7gap OT row above — VERIFY; elim VERIFY", "Collision 5 – Aftermath 6"],
  ["FINAL", "clock OT end | set9-p7gap-b 04:47 (FINAL graphic)", "—", "—", "final", "—", "FINAL graphic 'AFTERMATH WINS 6-5 FINAL' (CONFIRMED; also MATH 6-5 COLLISION p8-b 01:28). p6 'match end at 5–4' rejected. VOD end p8-b 02:28 (Set 10 tease) and autoplay to Set 8 p8-b 03:03 discarded.", "Collision 5 – Aftermath 6"],
]));

const S10_SRC = "MLPB+ Sat Set 10 set10 dual-feed (p1–p3, p11-a, clip5; p12 clean gap recapture VOD 33:15–45:15 supersedes frozen p4-a/b; team by PBLeagues name, pit-cam labels unreliable); ";
const S10_TEAM: Record<string, string> = {"I": "Edmonton Impact", "D": "San Diego Dynasty", "R": "Red Legion", "T": "TonTon Arsenal"};
function s10(match: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, score]) => ({
    event: EV, division: DIV, match, point, timestamp, playerOut,
    jersey: S10_TEAM[jersey] ?? jersey, elimType, area,
    notes: S10_SRC + notes,
    scoreAfter: score.endsWith("+") ? score.slice(0, -1) + " in progress" : score,
  }));
}
ROWS.push(...s10("Edmonton Impact vs San Diego Dynasty (Sat Set 10 MLPB+)", [
  ["1", "clock 15:00 break | set10-p1-a", "—", "—", "point won", "—", "GAP — no elims visible (frozen stretches); Dynasty wins point", "Impact 0 – Dynasty 1"],
  ["2", "clock ? | set10-p2-a", "—", "—", "point won", "—", "GAP — p2-a mostly frozen, no elims visible; Dynasty wins point", "Impact 0 – Dynasty 2"],
  ["3", "clock 11:35 (break 12:21) | set10-p2-b", "unknown", "I", "shot", "left", "", "Impact 0 – Dynasty 2+"],
  ["3", "clock 11:30 (break 12:21) | set10-p2-b", "Yosh Rau", "#32 San Diego Dynasty", "shot", "center-left", "Rau #32 PBLeagues Dynasty", "Impact 0 – Dynasty 2+"],
  ["3", "clock 11:21 (break 12:21) | set10-p2-b", "unknown", "I", "shot", "left", "Dynasty buzzer 11:16; Dynasty wins point", "Impact 0 – Dynasty 3"],
  ["4", "clock 10:23 break (overlay frozen) | set10-p3-a", "unknown", "D", "unclear", "unclear", "Possible DUPLICATE of next point (break 10:22 overhead replay?) — VERIFY", "Impact 0 – Dynasty 3+"],
  ["4", "clock 10:23 break (overlay frozen) | set10-p3-a", "unknown", "D", "unclear", "unclear", "Possible DUPLICATE of next point (break 10:22 overhead replay?) — VERIFY", "Impact 0 – Dynasty 3+"],
  ["4", "clock 10:23 break (overlay frozen) | set10-p3-a", "unknown", "I", "unclear", "unclear", "Possible DUPLICATE of next point (break 10:22 overhead replay?) — VERIFY", "Impact 0 – Dynasty 3+"],
  ["4", "clock ? | set10-p3-a (frozen)", "—", "—", "point won", "—", "GAP — result not on film; Impact win assumed from score continuity (p3-b shows 2–4 after next two points) — VERIFY", "Impact 1 – Dynasty 3 (VERIFY)"],
  ["5", "clock 10:04 (break 10:22 overhead) | set10-p3-a", "unknown", "I", "shot", "unclear", "Overhead view; may be replay of 10:23 point — DUPLICATE VERIFY", "Impact 1 – Dynasty 3+"],
  ["5", "clock 9:45 (break 10:22 overhead) | set10-p3-a", "unknown", "I", "shot", "unclear", "Overhead view; may be replay of 10:23 point — DUPLICATE VERIFY", "Impact 1 – Dynasty 3+"],
  ["5", "clock 9:39 (break 10:22 overhead) | set10-p3-a", "unknown", "I", "shot", "unclear", "Overhead view; may be replay of 10:23 point — DUPLICATE VERIFY", "Impact 1 – Dynasty 3+"],
  ["5", "clock 9:30 (break 10:22 overhead) | set10-p3-a", "unknown", "I", "shot", "unclear", "Overhead view; may be replay of 10:23 point — DUPLICATE VERIFY; Dynasty buzzer 9:25 (film pass said 5–1; continuity gives 4–1) — VERIFY", "Impact 1 – Dynasty 4 (VERIFY)"],
  ["6", "clock 9:13–8:49 (individual times not logged) | set10-p3-b", "unknown", "D", "shot", "unclear", "5 Dynasty outs in window", "Impact 1 – Dynasty 4+"],
  ["6", "clock 9:13–8:49 (individual times not logged) | set10-p3-b", "unknown", "D", "shot", "unclear", "5 Dynasty outs in window", "Impact 1 – Dynasty 4+"],
  ["6", "clock 9:13–8:49 (individual times not logged) | set10-p3-b", "unknown", "D", "shot", "unclear", "5 Dynasty outs in window", "Impact 1 – Dynasty 4+"],
  ["6", "clock 9:13–8:49 (individual times not logged) | set10-p3-b", "unknown", "D", "shot", "unclear", "5 Dynasty outs in window", "Impact 1 – Dynasty 4+"],
  ["6", "clock 9:13–8:49 (individual times not logged) | set10-p3-b", "unknown", "D", "shot", "unclear", "5 Dynasty outs in window; Impact wins point", "Impact 2 – Dynasty 4"],
  ["7", "clock 7:34 (break 7:47) | set10-p12-a gap recapture", "unknown", "I", "snap", "back dorito lane", "Clean recapture supersedes frozen p4-a/b", "Impact 2 – Dynasty 4+"],
  ["7", "clock 7:13 (break 7:47) | set10-p12-a gap recapture", "unknown", "D", "lane", "snake", "Clean recapture supersedes frozen p4-a/b", "Impact 2 – Dynasty 4+"],
  ["7", "clock 7:06 (break 7:47) | set10-p12-a gap recapture", "unknown", "I", "snap", "center / snake", "Clean recapture supersedes frozen p4-a/b", "Impact 2 – Dynasty 4+"],
  ["7", "clock 5:44 (break 7:47) | set10-p12-a gap recapture", "Cornell (VERIFY)", "#20 Edmonton Impact", "gunfight", "snake", "Clean recapture supersedes frozen p4-a/b; Film #20 Cornell; Impact has Brandon + Justin Cornell — first name VERIFY; #20 vs #1 may be two players", "Impact 2 – Dynasty 4+"],
  ["7", "clock 4:58 (break 7:47) | set10-p12-a gap recapture", "unknown", "I", "bunkered / run-through", "back center", "Clean recapture supersedes frozen p4-a/b; Dynasty center run-through", "Impact 2 – Dynasty 4+"],
  ["7", "clock 4:55 (break 7:47) | set10-p12-a gap recapture", "unknown", "I", "cross-field", "dorito", "Clean recapture supersedes frozen p4-a/b; Dynasty buzzer 4:54; Dynasty wins point. p4-b 'DYN 5–2' point (c5:57; outs 5:02/4:50/4:27/4:23/4:56/4:55) treated as SAME point, not double-counted — VERIFY", "Impact 2 – Dynasty 5"],
  ["8", "clock 4:02 (break 4:09) | set10-p12-b gap recapture", "unknown", "I", "lane", "back snake", "", "Impact 2 – Dynasty 5+"],
  ["8", "clock 3:57 (break 4:09) | set10-p12-b gap recapture", "unknown", "D", "shot", "center / snake", "", "Impact 2 – Dynasty 5+"],
  ["8", "clock 3:55 (break 4:09) | set10-p12-b gap recapture", "unknown", "D", "shot", "back center", "", "Impact 2 – Dynasty 5+"],
  ["8", "clock 3:50 (break 4:09) | set10-p12-b gap recapture", "unknown #50", "#50 San Diego Dynasty", "shot", "snake", "Dynasty #50 name VERIFY (no roster match on film)", "Impact 2 – Dynasty 5+"],
  ["8", "clock 3:39 (break 4:09) | set10-p12-b gap recapture", "unknown", "D", "shot", "back dorito", "", "Impact 2 – Dynasty 5+"],
  ["8", "clock 3:15 (break 4:09) | set10-p12-b gap recapture", "unknown", "D", "bunkered / run-through", "back center", "Impact run-through; Impact buzzer 3:13; Impact wins point", "Impact 3 – Dynasty 5"],
  ["9", "clock 2:58 (break 3:07) | set10-p11-a", "unknown", "I", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:49 (break 3:07) | set10-p11-a", "unknown", "D", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:35 (break 3:07) | set10-p11-a", "unknown", "D", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:31 (break 3:07) | set10-p11-a", "unknown", "I", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:16 (break 3:07) | set10-p11-a", "unknown", "D", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:09 (break 3:07) | set10-p11-a", "unknown", "D", "shot", "unclear", "", "Impact 3 – Dynasty 5+"],
  ["9", "clock 2:05 (break 3:07) | set10-p11-a", "unknown", "D", "shot", "unclear", "Impact wins point", "Impact 4 – Dynasty 5"],
  ["10", "clock 1:00 (break 1:06) | set10-clip5", "unknown", "I", "shot", "unclear", "", "Impact 4 – Dynasty 5+"],
  ["10", "clock 0:51 (break 1:06) | set10-clip5", "unknown", "D", "shot", "unclear", "", "Impact 4 – Dynasty 5+"],
  ["10", "clock 0:49 (break 1:06) | set10-clip5", "unknown", "I", "shot", "unclear", "", "Impact 4 – Dynasty 5+"],
  ["10", "clock 0:47 (break 1:06) | set10-clip5", "unknown", "I", "shot", "unclear", "", "Impact 4 – Dynasty 5+"],
  ["10", "clock 0:45 (break 1:06) | set10-clip5", "unknown", "I", "shot", "unclear", "Dynasty wins point", "Impact 4 – Dynasty 6"],
  ["FINAL", "clock 0:00 | set10-clip5 (no FINAL graphic)", "—", "—", "final", "—", "Provisional FINAL Dynasty 6–4 — no FINAL graphic, VERIFY. Possible duplicates: P4/P5 (10:23 vs 10:22 break) and P7 vs p4-b c5:57 — VERIFY. Names seen (no elim): Dynasty Urena #79, Blake Yarber; Impact Stanczak, Harmon #12, Cornell #1.", "Impact 4 – Dynasty 6 (VERIFY)"],
]));
ROWS.push(...s10("Red Legion vs TonTon Arsenal (Sat Set 10 MLPB+)", [
  ["1", "clock 14:10 | set10-p1-b", "Alexander Berdnikov", "#11 Red Legion", "ref escort", "unclear", "Ref escort; PBLeagues Red Legion", "Red Legion 0 – TonTon 0+"],
  ["1", "clock 13:25 | set10-p1-b", "unknown", "R", "shot", "far left", "", "Red Legion 0 – TonTon 0+"],
  ["1", "clock 13:10 | set10-p1-b", "unknown", "R", "shot", "center-right", "TonTon wins point", "Red Legion 0 – TonTon 1"],
  ["2", "clock 10:24 | set10-p2-b", "unknown #77", "#77 Red Legion", "shot", "right", "RL #77 name VERIFY (separate from Berdnikov #11 on film)", "Red Legion 0 – TonTon 1+"],
  ["2", "clock 10:19 | set10-p2-b", "unknown", "T", "shot", "left", "", "Red Legion 0 – TonTon 1+"],
  ["2", "clock 10:16 | set10-p2-b", "Alexander Berdnikov (buzzer)", "#11 Red Legion", "buzzer", "—", "Berdnikov #11 hits buzzer; Red Legion wins point", "Red Legion 1 – TonTon 1"],
  ["3", "clock 10:02 (break 10:16) | set10-p2-b", "unknown", "T", "shot", "right", "", "Red Legion 1 – TonTon 1+"],
  ["3", "clock 9:51 (break 10:16) | set10-p2-b", "unknown", "T", "shot", "left", "", "Red Legion 1 – TonTon 1+"],
  ["3", "clock 9:36 (break 10:16) | set10-p2-b", "unknown", "R", "shot", "right", "", "Red Legion 1 – TonTon 1+"],
  ["3", "clock 9:27 (break 10:16) | set10-p2-b", "unknown", "T", "shot", "center-left", "", "Red Legion 1 – TonTon 1+"],
  ["3", "clock ? | set10-p2-b (FROZEN from 04:46)", "—", "—", "point won", "—", "GAP — result not on film; Red Legion likely (3 TON outs vs 1 RL) — VERIFY", "Red Legion 2 – TonTon 1 (VERIFY)"],
  ["4", "clock ? | between p2-b and p3-a", "—", "—", "point won", "—", "GAP — point missing from film; TonTon point required by score continuity (2–3 by 7:41) — VERIFY", "Red Legion 2 – TonTon 2 (VERIFY)"],
  ["5", "clock 8:11 (break 8:18) | set10-p3-a", "unknown", "T", "shot", "center", "", "Red Legion 2 – TonTon 2+"],
  ["5", "clock 8:08 (break 8:18) | set10-p3-a", "unknown", "R", "shot", "left", "", "Red Legion 2 – TonTon 2+"],
  ["5", "clock 8:03 (break 8:18) | set10-p3-a", "unknown", "T", "shot", "right", "", "Red Legion 2 – TonTon 2+"],
  ["5", "clock 7:55 | set10-p3-a", "—", "—", "buzzer (claimed)", "—", "CONFLICT: p3-a claims Red Legion buzzer 7:55 → RL 3–2; p3-b shows TonTon 3–2 at 7:41. Continuity (TON 4–2 next, final 3–8) favors TonTon — VERIFY", "Red Legion 2 – TonTon 2+"],
  ["5", "clock 7:43 | set10-p3-b", "unknown", "R", "run-through", "snake", "TonTon wins point (p3-b, 7:41) — VERIFY vs 7:55 RL buzzer", "Red Legion 2 – TonTon 3 (VERIFY)"],
  ["6", "clock 7:34–7:09 (4 outs) | set10-p3-b", "unknown", "R", "shot", "unclear", "4 Red Legion outs 7:34–7:09 (individual times approximate)", "Red Legion 2 – TonTon 3+"],
  ["6", "clock 7:34–7:09 (4 outs) | set10-p3-b", "unknown", "R", "shot", "unclear", "4 Red Legion outs 7:34–7:09 (individual times approximate)", "Red Legion 2 – TonTon 3+"],
  ["6", "clock 7:34–7:09 (4 outs) | set10-p3-b", "unknown", "R", "shot", "unclear", "4 Red Legion outs 7:34–7:09 (individual times approximate)", "Red Legion 2 – TonTon 3+"],
  ["6", "clock 7:34–7:09 (4 outs) | set10-p3-b", "unknown", "R", "shot", "unclear", "4 Red Legion outs 7:34–7:09 (individual times approximate); TonTon wins point", "Red Legion 2 – TonTon 4"],
  ["7", "clock 6:06 (break 6:09) | set10-p12-a gap recapture", "unknown", "T", "lane", "dorito (runner)", "Clean recapture supersedes frozen p4-a/b", "Red Legion 2 – TonTon 4+"],
  ["7", "clock 6:01 (break 6:09) | set10-p12-a gap recapture", "unknown", "R", "snap", "snake", "", "Red Legion 2 – TonTon 4+"],
  ["7", "clock 5:53 (break 6:09) | set10-p12-a gap recapture", "unknown", "R", "snap", "back center", "", "Red Legion 2 – TonTon 4+"],
  ["7", "clock 5:50 (break 6:09) | set10-p12-a gap recapture", "unknown", "R", "snap", "dorito", "", "Red Legion 2 – TonTon 4+"],
  ["7", "clock 5:47 (break 6:09) | set10-p12-a gap recapture", "unknown", "R", "snap", "back dorito", "", "Red Legion 2 – TonTon 4+"],
  ["7", "clock 5:42 (break 6:09) | set10-p12-a gap recapture", "unknown", "R", "snap", "snake", "TonTon buzzer 5:38; TonTon wins point", "Red Legion 2 – TonTon 5"],
  ["8", "clock 5:35 (break 5:38) | set10-p12-b gap recapture", "unknown", "R", "lane", "dorito (runner)", "", "Red Legion 2 – TonTon 5+"],
  ["8", "clock 5:34 (break 5:38) | set10-p12-b gap recapture", "unknown", "R", "lane", "center (off break)", "", "Red Legion 2 – TonTon 5+"],
  ["8", "clock 5:26 (break 5:38) | set10-p12-b gap recapture", "unknown", "R", "snap", "snake", "", "Red Legion 2 – TonTon 5+"],
  ["8", "clock 5:21 (break 5:38) | set10-p12-b gap recapture", "unknown", "R", "snap", "back center", "", "Red Legion 2 – TonTon 5+"],
  ["8", "clock 5:12 (break 5:38) | set10-p12-b gap recapture", "unknown", "R", "bunkered", "back dorito", "TonTon snake/center push; TonTon buzzer 5:07; TonTon wins point", "Red Legion 2 – TonTon 6"],
  ["9", "clock 3:13 (break 3:20) | set10-p11-a", "unknown", "R", "shot", "unclear", "", "Red Legion 2 – TonTon 6+"],
  ["9", "clock 3:08 (break 3:20) | set10-p11-a", "unknown", "T", "shot", "unclear", "", "Red Legion 2 – TonTon 6+"],
  ["9", "clock 3:02 (break 3:20) | set10-p11-a", "unknown", "T", "shot", "unclear", "", "Red Legion 2 – TonTon 6+"],
  ["9", "clock 2:57 (break 3:20) | set10-p11-a", "unknown", "R", "shot", "unclear", "", "Red Legion 2 – TonTon 6+"],
  ["9", "clock 2:54 (break 3:20) | set10-p11-a", "unknown", "R", "shot", "unclear", "", "Red Legion 2 – TonTon 6+"],
  ["9", "clock 2:47 (break 3:20) | set10-p11-a", "unknown", "R", "shot", "unclear", "TonTon wins point. p11-a logged 'TON 6–2' but p12-b already reached 6–2 — continuity gives 7–2, VERIFY", "Red Legion 2 – TonTon 7 (VERIFY)"],
  ["10", "clock ? | between p11-a and clip5", "—", "—", "point won", "—", "GAP — Red Legion point missing from film; required by clip5 score 3–7 — VERIFY", "Red Legion 3 – TonTon 7 (VERIFY)"],
  ["11", "clock 0:17 | set10-clip5", "Red Legion buzzer (overturned)", "Red Legion", "buzzer → penalty", "—", "Red Legion buzzer overturned by penalty; point awarded to TonTon. Time expires.", "Red Legion 3 – TonTon 8"],
  ["FINAL", "clock 0:00 | set10-clip5 (no FINAL graphic)", "—", "—", "final", "—", "Provisional FINAL TonTon 8–3 — no FINAL graphic, VERIFY. Conflicts: 7:55 RL buzzer vs 7:41 TON 3–2; TON 6–2 vs 7–2. Names seen (no elim): TonTon Gaudin Sr #91, Verhaeghe #15, Szpytma, Carroll, Portier Jr, Anfossi; Red Legion Smotrov #27, Solnyshkov.", "Red Legion 3 – TonTon 8 (VERIFY)"],
]));

const S11_SRC = "MLPB+ Sat Set 11 D1 set11 dual-feed (p1 salvage 420s, p2 salvage 540s, p3 720s; heavy overlay/feed desync, p3 near darkness; names film-only, PBLeagues D1 rosters login-gated); ";
function s11(match: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: "D1", match, point, timestamp, playerOut, jersey, elimType, area,
    notes: S11_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...s11("Dallas Meanies vs GRD (Sat Set 11 D1 MLPB+)", [
  ["1", "clock ~10:00 (break) | set11-p1 00:57", "unknown", "Dallas Meanies", "shot", "snake side", "", "GRD 0 – Dallas Meanies 0 in progress"],
  ["1", "clock ~9:31 | set11-p1 01:01", "Foster (VERIFY)", "#21 Dallas Meanies", "shot", "unclear", "Walks off; VERIFY film-only name (PBLeagues D1 roster login-gated); GRD wins point. Overlay flips to Blank/SUT at p1 01:06 while Meanies on screen — VERIFY", "GRD 1 – Dallas Meanies 0"],
  ["2", "clock ~9:00 | set11-p1 05:03", "DeMott (VERIFY)", "#77 GRD", "shot", "snake", "Dove snake 04:53, shot 05:03, walks 05:20; VERIFY film-only name (PBLeagues D1 roster login-gated). Meanies #69 Shue pushed snake 04:44. SCOREBOARD CONFLICT: overlay credits GRD but on-field looked like Meanies buzzer 05:25 — point winner VERIFY", "GRD 2 – Dallas Meanies 0 (VERIFY)"],
  ["3", "clock ~8:24–6:06 | set11-p2 01:10", "unknown", "Dallas Meanies", "shot", "dorito side", "", "GRD 2 – Dallas Meanies 0 in progress"],
  ["3", "clock ~8:24–6:06 | set11-p2 01:43", "Foster (VERIFY)", "#21 Dallas Meanies", "shot", "unclear", "VERIFY film-only name (PBLeagues D1 roster login-gated)", "GRD 2 – Dallas Meanies 0 in progress"],
  ["3", "clock ~8:24–6:06 | set11-p2 01:54", "unknown", "Dallas Meanies", "shot", "center", "", "GRD 2 – Dallas Meanies 0 in progress"],
  ["3", "clock ~8:24–6:06 | set11-p2 02:18", "Shue (VERIFY)", "#69 Dallas Meanies", "shot", "snake", "VERIFY film-only name (PBLeagues D1 roster login-gated)", "GRD 2 – Dallas Meanies 0 in progress"],
  ["3", "clock ~8:24–6:06 | set11-p2 02:51", "unknown", "Dallas Meanies", "shot", "dorito side", "GRD wins point", "GRD 3 – Dallas Meanies 0"],
  ["FINAL", "clock ~6:06 (last seen) | set11-p2 03:13 / p3 08:12", "—", "—", "final", "—", "UNOFFICIAL — last on-screen score GRD 3–0; no FINAL graphic, no PBLeagues result. VERIFY. p3 08:12 GRD players arguing with refs in darkness.", "GRD 3 – Dallas Meanies 0 (unofficial, VERIFY)"],
]));
ROWS.push(...s11("Team Blank vs Shut Up They're Trying (Sat Set 11 D1 MLPB+)", [
  ["1", "clock ~10:00 (break) | set11-p1 02:32", "unknown", "Team Blank", "shot", "center", "", "Shut Up They're Trying 0 – Team Blank 0 in progress"],
  ["1", "clock ~9:50 | set11-p1 02:40", "unknown", "Team Blank", "shot", "unclear", "", "Shut Up They're Trying 0 – Team Blank 0 in progress"],
  ["1", "clock ~9:31 | set11-p1 02:59", "unknown", "Team Blank", "shot", "unclear", "Last Blank player walks off; SUT wins point", "Shut Up They're Trying 1 – Team Blank 0"],
  ["2", "clock ~9:00–7:17 | set11-p1 06:58", "—", "—", "point won", "—", "GAP — feed cuts at p1 07:00 (SUT shooting from dorito side); SUT win INFERRED — VERIFY", "Shut Up They're Trying 2 – Team Blank 0 (VERIFY)"],
  ["3", "clock ~7:17 (break) | set11-p2 04:21", "unknown", "Team Blank", "shot", "snake side", "Off break", "Shut Up They're Trying 2 – Team Blank 0 in progress"],
  ["3", "clock ~7:00 | set11-p2 04:36", "unknown", "Team Blank", "shot", "center", "Pushing center; Team Blank wins point (buzzer p2 05:25)", "Shut Up They're Trying 2 – Team Blank 1"],
  ["4", "clock ~5:24–4:31 | set11-p2 07:11", "unknown", "Shut Up They're Trying", "shot", "center", "SUT #07 Carter pushed center p2 07:05 (no elim; Carter VERIFY film-only, not Aftermath's Carter)", "Shut Up They're Trying 2 – Team Blank 1 in progress"],
  ["4", "clock ~5:24–4:31 | set11-p2 07:35", "unknown", "Shut Up They're Trying", "shot", "dorito", "SUT #07 Carter pushed center p2 07:05 (no elim; Carter VERIFY film-only, not Aftermath's Carter)", "Shut Up They're Trying 2 – Team Blank 1 in progress"],
  ["4", "clock ~5:24–4:31 | set11-p2 07:51", "unknown", "Shut Up They're Trying", "shot", "back center", "SUT #07 Carter pushed center p2 07:05 (no elim; Carter VERIFY film-only, not Aftermath's Carter). SCOREBOARD CONFLICT: overlay credits SUT but Blank pushed and hit buzzer p2 08:04 — point winner VERIFY", "Shut Up They're Trying 3 – Team Blank 1 (VERIFY)"],
  ["5", "clock ~4:31 (break) | set11-p3 00:23", "unknown", "Shut Up They're Trying", "shot", "off break", "", "Shut Up They're Trying 3 – Team Blank 1 in progress"],
  ["5", "clock ~4:00 | set11-p3 01:28", "unknown", "Shut Up They're Trying", "shot", "dorito", "", "Shut Up They're Trying 3 – Team Blank 1 in progress"],
  ["5", "clock ~3:50 | set11-p3 01:31", "Dustin (VERIFY)", "#25 Shut Up They're Trying", "shot", "unclear", "Walks off; first name only — surname needed; VERIFY film-only name (PBLeagues D1 roster login-gated)", "Shut Up They're Trying 3 – Team Blank 1 in progress"],
  ["5", "clock ~3:50 | set11-p3 01:31", "Weatherford (VERIFY)", "#9 Shut Up They're Trying", "shot", "unclear", "Walks off with #25; VERIFY film-only name (PBLeagues D1 roster login-gated). SCOREBOARD CONFLICT: overlay credits SUT (4–1 at p3 03:48) but on field Blank cleared — point winner VERIFY", "Shut Up They're Trying 4 – Team Blank 1 (VERIFY)"],
  ["6", "clock 4:31 frozen (dark) | set11-p3 03:00", "unknown", "Team Blank", "shot", "unclear", "Near darkness; buzzer p3 03:28; reviewer: SUT win but scoreboard stays 4–1 and overlaps P5 timing — VERIFY", "Shut Up They're Trying 4 – Team Blank 1 (VERIFY)"],
  ["7", "clock ~3:28 (dark) | set11-p3 06:14", "unknown", "Team Blank", "shot", "unclear", "Near darkness — VERIFY", "Shut Up They're Trying 4 – Team Blank 1 in progress (VERIFY)"],
  ["7", "clock ~3:28 (dark) | set11-p3 07:16", "unknown", "unknown (team VERIFY)", "bunkered", "unclear", "Near darkness; winner unclear, feed cuts to players arguing with refs — VERIFY", "Shut Up They're Trying 4 – Team Blank 1 (VERIFY)"],
  ["FINAL", "clock last seen | set11-p3 (VOD end)", "—", "—", "final", "—", "UNOFFICIAL — last on-screen score SUT 4–1; no FINAL graphic before VOD end, no PBLeagues result. VERIFY.", "Shut Up They're Trying 4 – Team Blank 1 (unofficial, VERIFY)"],
]));

// Fri Set 6 — Dynasty vs Seadogs (PARTIAL: VOD 0:20–22:50 only; gaps after ~22:50 pending recapture)
const F6_SRC = "MLPB+ Fri Set 6 (VOD 0:20–22:50; PARTIAL set, later points pending recapture). Jerseys: Dynasty blue, Seadogs grey/black/teal; numbers unread on film; ";
const F6_P13 = "elim count incomplete vs 5v5 (film review missed some) — ";
const F6_V = "point winner VERIFY (overlay vs film disagree; team colors may be flipped) — ";
function f6(raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: "San Diego Dynasty vs Royal City Seadogs (Fri Set 6 MLPB+)", point, timestamp, playerOut, jersey, elimType, area,
    notes: F6_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...f6([
  ["1", "clock 14:00", "unknown", "Royal City Seadogs", "laned", "dorito", F6_P13 + "Dynasty wins point", "Dynasty 1 – Seadogs 0"],
  ["2", "clock 13:46", "unknown", "Royal City Seadogs", "shot off break", "center (crawling)", F6_P13 + F6_V, "Dynasty 1 – Seadogs 0 in progress"],
  ["2", "clock 13:14", "unknown", "Royal City Seadogs", "snap/laned", "snake", F6_P13 + F6_V, "Dynasty 1 – Seadogs 0 in progress"],
  ["2", "clock 12:49", "unknown", "Royal City Seadogs", "bunkered (run-through)", "snake", F6_P13 + F6_V + "run-through by Dynasty", "Dynasty 1 – Seadogs 0 in progress"],
  ["2", "clock 12:48", "unknown", "San Diego Dynasty", "trade", "snake", F6_P13 + F6_V + "traded on run-through; Seadogs win point per film", "Dynasty 1 – Seadogs 1 (VERIFY)"],
  ["3", "clock 12:28", "unknown", "San Diego Dynasty", "laned", "dorito", F6_P13 + F6_V, "Dynasty 1 – Seadogs 1 in progress (VERIFY)"],
  ["3", "clock 12:12", "unknown", "Royal City Seadogs", "snap", "snake", F6_P13 + F6_V, "Dynasty 1 – Seadogs 1 in progress (VERIFY)"],
  ["3", "clock 11:36", "unknown", "San Diego Dynasty", "snap", "center", F6_P13 + F6_V, "Dynasty 1 – Seadogs 1 in progress (VERIFY)"],
  ["3", "clock 11:27", "unknown", "San Diego Dynasty", "snap", "snake", F6_P13 + F6_V + "Seadogs win point per film", "Dynasty 1 – Seadogs 2 (VERIFY)"],
  ["4", "clock 11:22", "unknown", "Royal City Seadogs", "laned", "dorito", F6_V + "point start 11:26", "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 11:19", "unknown", "San Diego Dynasty", "gunfight", "snake corner", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 11:06", "unknown", "Royal City Seadogs", "gunfight", "dorito", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 11:02", "unknown", "San Diego Dynasty", "gunfight", "center-left", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 10:03", "unknown", "San Diego Dynasty", "snap", "snake", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 10:01", "unknown", "Royal City Seadogs", "trade", "snake", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 9:49", "unknown", "San Diego Dynasty", "gunfight", "dorito outer", F6_V, "Dynasty 1 – Seadogs 2 in progress (VERIFY)"],
  ["4", "clock 9:42", "unknown", "San Diego Dynasty", "run-through", "dorito tape", F6_V + "Seadogs win point @9:36 per film. SCORE CONFLICT: overlay showed Dynasty 2–1 then 2–2; later live capture showed Dynasty 4–2. Points after VOD ~22:50 pending recapture. PART2 SALVAGE CHECK (VERIFY): fri6-part2 (VOD ~12:20–22:50) shows a point from Seadogs 2 – Dynasty 1 to 2–2, Dynasty hang (bug misread 1–2), elims in order: Seadogs snake, Dynasty dorito, Seadogs dorito, Dynasty dorito, Dynasty center, Seadogs snake, Seadogs dorito, Dynasty center, Seadogs center (hit sliding). Same VOD window and start score as this P4, and P1–4 already carry a team-color-flip VERIFY, so this is treated as the SAME point (not inserted). If so, the P4 winner is Dynasty (2–2, matching the overlay), not Seadogs 1–3, and per-row teams in P4 are likely flipped. Scores left as-is pending review. The Dynasty 2–2→3–2 point before P5 and the Seadogs 2→3 point after P5 are still not in captured footage.", "Dynasty 1 – Seadogs 3 per film (overlay 2–2; VERIFY)"],
]));

// Fri Set 6 — Dynasty vs Seadogs point 5 (match-deciding) from fri6-part3
const F6P5 = "Source fri6-part3; overlay clock frozen ~7:36–7:37, clip time used for order; point 5 starts Dynasty 3–2 at 7:55; Dynasty win to 4–2 (graphic read as FINAL, but g1 shows live play to 4–4 later; FINAL pending, VERIFY) — ";
ROWS.push(...f6([
  ["5", "clock 7:37 (clock frozen; clip p3 3:08)", "unknown", "Royal City Seadogs", "lane/snap", "dorito insert", F6P5, "Dynasty 3 – Seadogs 2 in progress"],
  ["5", "clock 7:37 (clock frozen; clip p3 3:36)", "unknown", "Royal City Seadogs", "lane/snap", "dorito side", F6P5, "Dynasty 3 – Seadogs 2 in progress"],
  ["5", "clock 7:37 (clock frozen; clip p3 3:49)", "unknown", "San Diego Dynasty", "lane/snap", "center X", F6P5, "Dynasty 3 – Seadogs 2 in progress"],
  ["5", "clock 7:36 (clock frozen; clip p3 5:40)", "unknown", "Royal City Seadogs", "lane/snap", "back center", F6P5, "Dynasty 3 – Seadogs 2 in progress"],
  ["5", "clock 7:36 (clock frozen; clip p3 6:35)", "unknown", "Royal City Seadogs", "bunkered", "snake", F6P5 + "Dynasty player ran snake tape", "Dynasty 3 – Seadogs 2 in progress"],
  ["5", "clock 7:36 (clock frozen; clip p3 6:44)", "unknown", "Royal City Seadogs", "bunkered", "dorito side", F6P5 + "last alive, bunkered by pushing Dynasty player. Score 4–2 at part3; FINAL pending (VERIFY). Next covered point starts Seadogs 3 – Dynasty 4: the 4–2→4–3 Seadogs point is NOT covered (VERIFY gap).", "Dynasty 4 – Seadogs 2 (FINAL pending, VERIFY)"],
]));

// Fri Set 6 — Dynasty vs Seadogs live points after P5 (fri6-part5/part6; confirmed live by fri6-partg1)
const F6DUP = "Source fri6-part5/part6; live play (not replay) per fri6-partg1, which shows it continuing to SCORES 4–4. Was flagged VERIFY-DUP; now counted. Renumbered P9/P10 → P6/P7; the 4–2→4–3 point is not covered, so the point # is VERIFY (true # may be 7/8); P6 and P7 may be one point (g1 shows a single point 3–4→4–4), VERIFY. Seadogs black/teal, Dynasty blue; bug Seadogs 3 – Dynasty 4. ";
ROWS.push(...f6([
  ["6", "clock 5:48", "unknown", "Royal City Seadogs", "lane/snap", "snake side (diving in)", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["6", "clock 5:00", "unknown", "Royal City Seadogs", "lane/snap", "dorito side", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["6", "clock 4:54", "unknown", "Royal City Seadogs", "lane/snap", "center-left", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["6", "clock 4:43", "unknown", "Royal City Seadogs", "lane/snap", "back snake", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["6", "clock 4:10", "unknown", "San Diego Dynasty", "lane/snap", "dorito side", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["6", "clock 3:51", "unknown #34", "#34 Royal City Seadogs", "unknown (not conceded)", "unknown", F6DUP + "Seadogs player in #34 jersey; film first read 'Stuart' but overlay was wrong; not conceding (his team scored). No Seadogs Stuart on event roster — name VERIFY.", "Dynasty 4 – Seadogs 3 in progress"],
  ["7", "clock 5:00", "unknown", "San Diego Dynasty", "lane/snap", "snake", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["7", "clock 4:29", "unknown", "San Diego Dynasty", "lane/snap", "snake", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["7", "clock 4:15", "unknown", "San Diego Dynasty", "lane/snap", "center-right", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["7", "clock 4:10", "unknown", "Royal City Seadogs", "walk-off", "near side net", F6DUP, "Dynasty 4 – Seadogs 3 in progress"],
  ["7", "clock 3:59", "unknown", "San Diego Dynasty", "lane/snap", "dorito", F6DUP + "fri6-partg1 (VOD ~34:30–42:10) shows this as live play, not a replay: bug Seadogs 3 – Dynasty 4 frozen 5:07; Dynasty snake out and Seadogs dorito pulled on penalty (frozen clock), Seadogs center 4:57, Seadogs snake 4:53, Dynasty dorito 4:49, Seadogs snake 4:14, Dynasty center 4:11, Dynasty center 4:03, Dynasty dorito 4:01; Seadogs hang; graphic SCORES 4–4 (Dynasty 5 outs, Seadogs 4). These match the P9/P10 rows here, so no new rows. SCORE CONFLICT VERIFY: a live 4–4 contradicts the part3 'FINAL Dynasty 4–2' (P5). That FINAL may belong to another match, or these rows should be retallied as real points. Dead-time names: Dynasty #79 Urena (roster Michael Urena), #92 Barnes Jr (roster Archie Barnes, 'Jr' VERIFY), #09 C. Rezzardo (not on rosters). Seadogs win point (hang) → 4–4; FINAL pending (g2 from VOD ~42:10).", "Dynasty 4 – Seadogs 4 (g1 SCORES 4–4)"],
]));

// Fri Set 6 — Dynasty vs Seadogs from fri6-partg2 (VOD ~42:10–54:10; match clock; scorebug = truth)
const F6G2 = "Source fri6-partg2 (VOD ~42:10–54:10), match clock; scorebug as truth. ";
ROWS.push(...f6([
  ["8", "clock 3:58", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2 + "Point starts 4–4 at 3:59.", "Dynasty 4 – Seadogs 4 in progress"],
  ["8", "clock 3:56", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2, "Dynasty 4 – Seadogs 4 in progress"],
  ["8", "clock 3:55", "unknown", "San Diego Dynasty", "lane/snap", "snake", F6G2, "Dynasty 4 – Seadogs 4 in progress"],
  ["8", "clock 3:37", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6G2 + "Seadogs hang; Seadogs win point.", "Dynasty 4 – Seadogs 5"],
  ["9", "clock 3:21", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2 + "Point starts Seadogs 5–4 at 3:28.", "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:19", "unknown", "San Diego Dynasty", "lane/snap", "snake", F6G2, "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:15", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6G2, "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:13", "unknown", "Royal City Seadogs", "lane/snap", "center", F6G2, "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:11", "unknown", "San Diego Dynasty", "lane/snap", "center", F6G2, "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:09", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6G2, "Dynasty 4 – Seadogs 5 in progress"],
  ["9", "clock 3:07", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2 + "5th Seadogs out (at cap, not over; brief said over cap, VERIFY). Dynasty hang; Dynasty win point.", "Dynasty 5 – Seadogs 5"],
  ["10", "clock 2:23", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6G2 + "Point starts 5–5 at 2:29.", "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:20", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:15", "unknown", "San Diego Dynasty", "lane/snap", "snake", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:11", "unknown", "San Diego Dynasty", "lane/snap", "dorito", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:09", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:04", "unknown", "Royal City Seadogs", "lane/snap", "center", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 2:02", "unknown", "San Diego Dynasty", "lane/snap", "center", F6G2, "Dynasty 5 – Seadogs 5 in progress"],
  ["10", "clock 1:57", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6G2 + "Dynasty hang; Dynasty win point.", "Dynasty 6 – Seadogs 5"],
  ["11", "clock 1:24", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6G2 + "Point starts Dynasty 6–5 at 1:30.", "Dynasty 6 – Seadogs 5 in progress"],
  ["11", "clock 1:22", "unknown", "San Diego Dynasty", "lane/snap", "dorito", F6G2, "Dynasty 6 – Seadogs 5 in progress"],
  ["11", "clock 1:20", "unknown", "Royal City Seadogs", "penalty", "center", F6G2 + "Pulled on penalty. parth1 (VOD ~54:00–60:40) reads Seadogs center 1:22, likely this same out (not added). parth1 has no Dynasty dorito 1:22 (VERIFY). g2's 7–5 'FINAL' graphic was actually a SCORES graphic (Dynasty 7, Seadogs 5); match continued.", "Dynasty 6 – Seadogs 5 in progress"],
]));
const F6H1 = "Source fri6-parth1 salvage (VOD ~54:00–60:40), match clock; scorebug as truth. ";
ROWS.push(...f6([
  ["11", "clock 1:19", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6H1, "Dynasty 6 – Seadogs 5 in progress"],
  ["11", "clock 1:18", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6H1, "Dynasty 6 – Seadogs 5 in progress"],
  ["11", "clock 1:17", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6H1 + "5th Seadogs out (cap). Dynasty hang 1:12; Dynasty win point. SCORES graphic Dynasty 7, Seadogs 5. POINT # VERIFY: 6–5 → 7–5 is the 12th point by score but labeled P11 (one earlier point uncaptured; numbers not rewritten).", "Dynasty 7 – Seadogs 5"],
  ["12", "clock 1:12 (frozen)", "unknown", "Royal City Seadogs", "lane/snap", "snake", F6H1 + "Point starts Dynasty 7–5 (true point 13 by score, VERIFY).", "Dynasty 7 – Seadogs 5 in progress"],
  ["12", "clock 0:47", "unknown", "Royal City Seadogs", "lane/snap", "dorito", F6H1, "Dynasty 7 – Seadogs 5 in progress"],
  ["12", "clock 0:34", "unknown", "Royal City Seadogs", "lane/snap", "center", F6H1, "Dynasty 7 – Seadogs 5 in progress"],
  ["12", "clock 0:26", "Ryan Chantler", "#54 Royal City Seadogs", "bunkered", "snake", F6H1 + "Film '#54 Chantler', confirmed on replay; Ryan Chantler on Seadogs roster (roster lists no number). Bunkered by Dynasty #44 'Farber' = Blake Yarber #44 (Dynasty roster; earlier film reads 'Farber'). Dynasty hang, likely Yarber (VERIFY); Dynasty win point. Graphic Seadogs 5, Dynasty 8. Last point at 8–5: no elims, time ran out (this was g3's '8–5 at 0:15 + Seadogs hang' read; no extra Dynasty point, no 8–6). MATCH STATUS: FINAL Dynasty 8 – Seadogs 5 per final scorebug; no FINAL graphic (VERIFY).", "Dynasty 8 – Seadogs 5 (FINAL per scorebug, VERIFY)"],
]));

// Fri Set 6 — TonTon Arsenal vs Perris ASG Aftermath (relabeled from 'Dynasty vs TonTon')
const F6T_SRC = "MLPB+ Fri Set 6 (fri6-part3/part4 + fri6-partg1). Match relabeled TonTon Arsenal vs Perris ASG Aftermath: the old 'Dynasty vs TonTon' label came from a broadcast-overlay error, corrected by the MLPB+ VOD title/description plus g1 scorebug (MATH/TOW), jerseys and rosters (Green #42, Stuart = Aftermath). Opponent team fields switched Dynasty → Aftermath; P7 per-row teams VERIFY (g1 reads flipped). P1–2 from fri6-part1; points 3–5 pending part2 review; point # by score. ";
function f6t(raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: "Tonton Arsenal vs Perris ASG Aftermath (Fri Set 6 MLPB+)", point, timestamp, playerOut, jersey, elimType, area,
    notes: F6T_SRC + notes, scoreAfter,
  }));
}
const F6TP1 = "Source fri6-part1 (VOD 0:20–12:20), match clock; other elims this point off camera. ";
ROWS.push(...f6t([
  ["1", "clock 13:17", "unknown", "TonTon Arsenal", "lane/snap", "snake (head-first dive)", F6TP1 + "Point starts 0–0. Aftermath win point. Stephen Mazurek #51 (Aftermath, roster) seen walking off; note only, no row.", "Aftermath 1 – TonTon 0"],
  ["2", "clock 11:36", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TP1 + "TonTon win point.", "Aftermath 1 – TonTon 1"],
]));
const F6TP2 = "Source fri6-part2 salvage (VOD ~12:20–22:50), match clock. ";
ROWS.push(...f6t([
  ["3", "clock 10:39", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TP2 + "Point starts 1–1.", "Aftermath 1 – TonTon 1 in progress"],
  ["3", "clock 10:36", "unknown", "Perris ASG Aftermath", "lane/snap", "center", F6TP2, "Aftermath 1 – TonTon 1 in progress"],
  ["3", "clock 10:34", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TP2, "Aftermath 1 – TonTon 1 in progress"],
  ["3", "clock 10:31", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TP2, "Aftermath 1 – TonTon 1 in progress"],
  ["3", "clock 10:29", "unknown", "Perris ASG Aftermath", "ref called", "snake", F6TP2 + "TonTon hang; TonTon win point.", "Aftermath 1 – TonTon 2"],
  ["4", "clock 10:27", "unknown #10", "#10 Perris ASG Aftermath", "hit sliding", "center", F6TP2 + "Point starts TonTon 2–1. #10 name not confirmed (VERIFY).", "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock ~10:22", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TP2 + "Approximate clock.", "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 9:59", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TP2, "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 9:28", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TP2, "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 9:25", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TP2, "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 9:22", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TP2, "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 8:49", "Zack Carter", "#14 Perris ASG Aftermath", "lane/snap", "dorito", F6TP2 + "Name 'Carter' on film; Zack Carter is on the Aftermath roster (roster lists no number, #14 VERIFY).", "Aftermath 1 – TonTon 2 in progress"],
  ["4", "clock 8:35", "unknown", "TonTon Arsenal", "pulled", "snake", F6TP2 + "James Green #42 (Aftermath, roster) hangs; Aftermath win point. P5 (2–2 → TonTon 3–2, TonTon win) UNCAPTURED: Page P6 starts TonTon 3–2 (VERIFY gap).", "Aftermath 2 – TonTon 2"],
]));
const P7F = "overlay clock frozen at 6:18; p4 clip time used. Point 7 starts TonTon 4–2 at 6:48. ";
ROWS.push(...f6t([
  ["6", "clock 7:05", "unknown", "TonTon Arsenal", "lane/snap", "dorito side", "Point starts TonTon 3–2 at 7:59.", "Aftermath 2 – TonTon 3 in progress"],
  ["6", "clock 6:14", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito side", "", "Aftermath 2 – TonTon 3 in progress"],
  ["6", "clock 5:59", "unknown", "Perris ASG Aftermath", "bunkered", "snake", "Bunkered by TonTon #89 Szpytma (name from graphic). TonTon win point.", "Aftermath 2 – TonTon 4"],
  ["7", "clock frozen; clip p4 1:21", "unknown", "TonTon Arsenal (VERIFY)", "lane/snap", "snake", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 1:46", "unknown", "TonTon Arsenal (VERIFY)", "lane/snap", "center", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 1:50", "unknown", "Perris ASG Aftermath (VERIFY)", "lane/snap", "center", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 2:45", "unknown", "Perris ASG Aftermath (VERIFY)", "lane/snap", "dorito", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 2:51", "unknown", "TonTon Arsenal (VERIFY)", "lane/snap", "dorito", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 4:35", "unknown", "TonTon Arsenal (VERIFY)", "lane/snap", "dorito", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 6:17", "unknown", "Perris ASG Aftermath (VERIFY)", "lane/snap", "center", P7F, "Aftermath 2 – TonTon 4 in progress"],
  ["7", "clock frozen; clip p4 7:07", "unknown", "TonTon Arsenal (VERIFY)", "lane/snap", "back dorito", P7F + "last alive; Aftermath win point: James Green #42 (Aftermath, roster confirmed) hangs, g1 clip 1:10 buzzer, bug MATH 3 – TOW 4 at 3:51. fri6-partg1-salvage (VOD ~34:30–42:10) covers this same 4–2→4–3 transition at clock 5:18→3:51 with the bug reading 'MATH 3 – TOW 4' (opponent = Aftermath per bug). g1 reads: opponent outs dorito 4:59, center 4:54, snake 4:17; TonTon outs dorito 4:48, 4:38; Green hang applied (no penalty; bug consistent). g1 team-per-out reads conflict with this point's existing rows (team colors likely flipped), so no rows added; per-row teams VERIFY. Match identity resolved: TonTon vs Aftermath.", "Aftermath 3 – TonTon 4"],
  ["8", "clock 6:10", "unknown", "TonTon Arsenal", "laned off break", "back dorito", "Point starts TonTon 4–3 at 6:12. fri6-partg1: dead/aborted start before this point (no elims); restart at clock 3:51 with opponent (Aftermath per bug) outs dorito 3:46, snake 3:44; g1 clip ends mid-point. The clocks differ from this point's rows (6:12 start) and team reads are shaky, so no rows added (VERIFY whether this is the same point). Dead-time names: #7 Anfossi (roster Peter Anfossi, TonTon), #97 Gaudin (roster Axel Gaudin Sr, Page has #91, number VERIFY), #34 Stuart (roster Devin Stuart is Aftermath, not TonTon, VERIFY), #95 Geer (not on rosters).", "Aftermath 3 – TonTon 4 in progress"],
  ["8", "clock 5:35", "unknown", "Perris ASG Aftermath", "lane/snap", "snake side", "", "Aftermath 3 – TonTon 4 in progress"],
  ["8", "clock 5:11", "unknown", "TonTon Arsenal", "bunkered", "snake", "Bunkered by Aftermath.", "Aftermath 3 – TonTon 4 in progress"],
  ["8", "clock 5:11", "unknown", "Perris ASG Aftermath", "penalty/trade", "snake", "Penalty/trade on same play.", "Aftermath 3 – TonTon 4 in progress"],
  ["8", "clock 5:10", "unknown", "TonTon Arsenal", "run-through", "center/dorito", "Aftermath run-through up center/dorito; run-through, count VERIFY.", "Aftermath 3 – TonTon 4 in progress"],
  ["8", "clock 5:10", "unknown", "TonTon Arsenal", "run-through", "center/dorito", "Aftermath run-through clears remaining TonTon; run-through, count VERIFY. Aftermath win point. Last seen at 4–4 (point 8); FINAL not captured — recapture needed.", "Aftermath 4 – TonTon 4 (last seen; FINAL not captured)"],
]));

// Fri Set 6 — TonTon vs Aftermath from fri6-partg2 (VOD ~42:10–54:10; match clock; scorebug = truth)
const F6TG2 = "Source fri6-partg2 (VOD ~42:10–54:10), match clock; scorebug as truth; Aftermath orange/black/white. ";
ROWS.push(...f6t([
  ["9", "clock 3:20", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TG2 + "Point starts TonTon 5 – Aftermath 3 at 3:25. SCORE CONFLICT VERIFY: Page P8 ended Aftermath 4 – TonTon 4; bug says TonTon 5–3, so P8 was likely a TonTon win (g1 mid-point at 3:44) and the 4–4 a misread. A #02 'Carroll' was seen: roster Ben Carroll is TonTon, Aftermath has no Carroll; VERIFY, not assigned to any row.", "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 3:19", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 3:16", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 3:13", "unknown", "Perris ASG Aftermath", "lane/snap", "center", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 3:12", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 3:09", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 2:56", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 5 in progress"],
  ["9", "clock 2:45", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TG2 + "5th Aftermath out (at cap, not over; brief said over cap, VERIFY). TonTon hang; TonTon win point. Hugo Verhaeghe #15 (TonTon, roster confirmed) seen walking off after the point; note only, no row.", "Aftermath 3 – TonTon 6"],
  ["10", "clock 2:31", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TG2 + "Point starts TonTon 6–3 at 2:34.", "Aftermath 3 – TonTon 6 in progress"],
  ["10", "clock 2:29", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 6 in progress"],
  ["10", "clock 2:29", "unknown", "TonTon Arsenal", "lane/snap", "center", F6TG2, "Aftermath 3 – TonTon 6 in progress"],
  ["10", "clock 2:27", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 6 in progress"],
  ["10", "clock 2:25", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 6 in progress"],
  ["10", "clock 2:22", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TG2 + "Aftermath reached buzzer but drew a penalty; point awarded to TonTon.", "Aftermath 3 – TonTon 7"],
  ["11", "clock 2:13", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TG2 + "Point starts TonTon 7–3 at 2:18.", "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:12", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:10", "unknown", "Perris ASG Aftermath", "lane/snap", "center", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:08", "unknown", "TonTon Arsenal", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:06", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:04", "unknown", "TonTon Arsenal", "lane/snap", "dorito", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 2:03", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", F6TG2, "Aftermath 3 – TonTon 7 in progress"],
  ["11", "clock 1:23", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", F6TG2 + "5th Aftermath out (at cap, not over; brief said over cap, VERIFY). TonTon buzzer waved off on penalty at 0:25; point to Aftermath. Clip ends at 7–4; next point captured in fri6-parth1.", "Aftermath 4 – TonTon 7"],
]));
ROWS.push(...f6t([
  ["12", "clock 0:24", "unknown", "TonTon Arsenal", "lane/snap", "dorito", "Source fri6-parth1 salvage (VOD ~54:00–60:40), match clock. Point starts TonTon 7–4 at 0:25.", "Aftermath 4 – TonTon 7 in progress"],
  ["12", "clock 0:22", "unknown", "Perris ASG Aftermath", "lane/snap", "snake", "Source fri6-parth1 salvage (VOD ~54:00–60:40), match clock.", "Aftermath 4 – TonTon 7 in progress"],
  ["12", "clock 0:20", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito", "Source fri6-parth1 salvage (VOD ~54:00–60:40), match clock.", "Aftermath 4 – TonTon 7 in progress"],
  ["12", "clock 0:13", "unknown", "Perris ASG Aftermath", "lane/snap", "center", "Source fri6-parth1 salvage (VOD ~54:00–60:40), match clock. TonTon hang 0:02; TonTon win point. Graphic TonTon 8, Aftermath 4. MATCH STATUS: FINAL TonTon 8 – Aftermath 4 per scorebug graphic; no FINAL label (VERIFY).", "Aftermath 4 – TonTon 8 (FINAL per scorebug, VERIFY)"],
]));

// Fri Set 7 — Ironmen vs Leverage (PARTIAL: VOD 0:25–10:55 only; gaps ~15:20–24:30 etc pending recapture)
const F7_SRC = "MLPB+ Fri Set 7 (PARTIAL set; gaps ~15:20–24:30 etc pending recapture). Colors corrected: Ironmen RED, Leverage black/pink; overlay scores wrong (showed 1–1, 2–2) — film used; ";
const F7_GAP = "point number + score VERIFY (gap after pt4; overlay showed IRN 3-1). ";
const F7_SIDE = "team side VERIFY — jersey colors corrected later (Ironmen red, Leverage black/pink). ";
function f7(raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: "Los Angeles Ironmen vs New Jersey Leverage (Fri Set 7 MLPB+)", point, timestamp, playerOut, jersey, elimType, area,
    notes: F7_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...f7([
  ["1", "clock 14:58", "unknown", "Los Angeles Ironmen", "laned", "wide dorito (off break)", F7_SIDE, "Ironmen 0 – Leverage 0 in progress"],
  ["1", "clock 13:31", "unknown", "Los Angeles Ironmen", "snap", "home", F7_SIDE, "Ironmen 0 – Leverage 0 in progress"],
  ["1", "clock 12:10", "Cj Canter II", "#12 Los Angeles Ironmen", "snap", "snake corner", "Film graphic 'Canter #12'; PBLeagues Ironmen Cj Canter II — roster-confirmed", "Ironmen 0 – Leverage 0 in progress"],
  ["1", "clock 12:09", "Henry Sentz", "#5 Los Angeles Ironmen", "snap", "center W", "Film graphic 'Sentz #5'; PBLeagues Ironmen Henry Sentz — roster-confirmed", "Ironmen 0 – Leverage 0 in progress"],
  ["1", "clock 12:06", "unknown #9", "#9 Los Angeles Ironmen", "walk-off (conceded)", "dorito", F7_SIDE + "#9 name unknown (PBLeagues has no jersey #s). Leverage win point with 5 alive", "Ironmen 0 – Leverage 1"],
  ["2", "clock 11:59", "unknown", "New Jersey Leverage", "laned", "home (off break)", F7_SIDE + "Break 12:04", "Ironmen 0 – Leverage 1 in progress"],
  ["2", "clock 11:28", "unknown", "New Jersey Leverage", "snap", "dorito", F7_SIDE, "Ironmen 0 – Leverage 1 in progress"],
  ["2", "clock 11:25", "unknown", "New Jersey Leverage", "snap", "back corner", F7_SIDE, "Ironmen 0 – Leverage 1 in progress"],
  ["2", "clock 11:22", "unknown", "Los Angeles Ironmen", "snap", "back dorito", F7_SIDE, "Ironmen 0 – Leverage 1 in progress"],
  ["2", "clock 11:20", "unknown", "New Jersey Leverage", "snap", "center", F7_SIDE, "Ironmen 0 – Leverage 1 in progress"],
  ["2", "clock ~10:55", "unknown", "New Jersey Leverage", "shot (off-camera)", "snake", F7_SIDE + "Ironmen buzzer 10:54, win point.", "Ironmen 1 – Leverage 1"],
  ["3", "clock 10:49", "unknown", "Los Angeles Ironmen", "laned", "dorito", "Point start 10:54 (1–1); part2 VOD ~10:45–15:20", "Ironmen 1 – Leverage 1 in progress"],
  ["3", "clock 10:47", "unknown", "Los Angeles Ironmen", "laned", "home", "", "Ironmen 1 – Leverage 1 in progress"],
  ["3", "clock 10:44", "unknown", "Los Angeles Ironmen", "laned", "snake corner", "", "Ironmen 1 – Leverage 1 in progress"],
  ["3", "clock 10:37", "unknown", "Los Angeles Ironmen", "laned", "snake 1", "", "Ironmen 1 – Leverage 1 in progress"],
  ["3", "clock 10:33", "unknown", "Los Angeles Ironmen", "laned", "center W", "Ironmen wiped; Leverage buzzer 10:11, win point. fri7-partg2 (VOD ~10:00–17:45) reads this as 2–0 → 2–1, Leverage hang (#1 Chris Caputo, roster-confirmed Leverage), with Ironmen outs at snake back 10:49 (off the break), snake 10:28, dorito back 10:01, center 9:57 and snake corner 9:41 (bunkered by Caputo). This point already has 5 Ironmen outs (cap), and g2's clock window overlaps P3+P4, so no rows added. Score label VERIFY: g2 has Ironmen leading 2–0, but the Page's P1 is a Leverage win.", "Ironmen 1 – Leverage 2"],
  ["4", "clock 9:59", "unknown", "Los Angeles Ironmen", "laned", "home", "Point start 10:03", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:57", "unknown", "New Jersey Leverage", "laned", "snake", "", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:56", "unknown", "Los Angeles Ironmen", "laned", "dorito", "", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:50", "unknown", "New Jersey Leverage", "laned", "center", "", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:47", "unknown", "New Jersey Leverage", "laned", "dorito corner", "", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:41", "unknown", "New Jersey Leverage", "snap", "dorito", "", "Ironmen 1 – Leverage 2 in progress"],
  ["4", "clock 9:37", "Chris Caputo", "#1 New Jersey Leverage", "bunkered", "dorito", "Film #1 Caputo seen; PBLeagues Leverage Chris Caputo — roster-confirmed. Ironmen buzzer 9:30, win point. fri7-partg2 reads the next point as 2–1 → 3–1, Ironmen hang, with Leverage outs at dorito 9:27, snake 9:25, center 9:21, snake back 9:11, dorito 8:58 and an Ironmen dorito out at 9:23. Leverage is at the 5-out cap here and g2's times fall after this point's 9:30 buzzer, so no rows added (clock offset VERIFY). SCORE CONFLICT (g1 'P4 ends 2–2 vs 2–1'): g2 confirms the score went through 2–1 (Ironmen 2 – Leverage 1 before P5), so g1's 2–1 bug is correct and this row's 2–2 is likely wrong. Point labels and scores not rewritten because P1–P4 labels conflict with g2 (VERIFY).", "Ironmen 2 – Leverage 2 (VERIFY: g1/g2 say Ironmen 2 – Leverage 1)"],
  ["5", "clock 7:39", "unknown", "New Jersey Leverage", "lane/snap", "snake back", "Source fri7-partg1 (VOD ~15:15–27:15), match clock. Point starts Ironmen 2 – Leverage 1 per g1 bug. SCORE CONFLICT VERIFY: Page P4 ends Ironmen 2 – Leverage 2. Other Leverage outs off camera.", "Ironmen 2 – Leverage 1 in progress (VERIFY)"],
  ["5", "clock 7:12", "unknown", "New Jersey Leverage", "shot in the back", "snake", "Source fri7-partg1 (VOD ~15:15–27:15), match clock.", "Ironmen 2 – Leverage 1 in progress (VERIFY)"],
  ["5", "clock 7:09", "unknown", "New Jersey Leverage", "lane/snap", "dorito", "Source fri7-partg1 (VOD ~15:15–27:15), match clock. Ironmen hang; Ironmen win point. Other Leverage outs off camera.", "Ironmen 3 – Leverage 1 (VERIFY)"],
  ["6", "clock 6:59", "unknown", "New Jersey Leverage", "lane/snap", "dorito corner", F7_GAP + "Source fri7-partg1 (VOD ~15:15–27:15), match clock. g1 bug: point is Ironmen 3–1 → 4–1, Ironmen hang (same point as this P6). g1 also reads Leverage center 5:36 and dorito 5:32; the Page's 5:42 center/dorito (crawling) likely matches one of them, so they are not added (count VERIFY).", "Ironmen 3 – Leverage 1 in progress (VERIFY)"],
  ["6", "clock 6:53", "unknown", "New Jersey Leverage", "laned", "snake (dive)", F7_GAP + "Pt X1 start 7:06 (part4-SALVAGE)", "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["6", "clock 5:42", "unknown", "New Jersey Leverage", "laned", "center/dorito (crawling)", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["6", "clock 5:04", "unknown", "New Jersey Leverage", "cross-field", "snake", F7_GAP + "fri7-partg1 dedupe: g1 reads #7 bunkered in snake 5:04 (same out). Film name 'Abuhl': roster Caleb Abuhl is on Ironmen, not Leverage, so name/team VERIFY and not assigned.", "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["6", "clock ~4:39", "remaining Leverage players (count unknown)", "New Jersey Leverage", "walk-off (conceded)", "—", F7_GAP + "Single row for concede; one-row-per-elim not possible — count VERIFY. Ironmen win point", "Ironmen +1 (score VERIFY; overlay IRN 3–1)"],
  ["7", "clock 4:29", "unknown", "Los Angeles Ironmen", "laned", "dorito", F7_GAP + "Pt X2 start 4:39", "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["7", "clock 4:24", "unknown", "Los Angeles Ironmen", "snap", "snake", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["7", "clock 4:18", "unknown", "Los Angeles Ironmen", "laned", "back right", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["7", "clock 4:07", "unknown", "Los Angeles Ironmen", "snap", "center", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["7", "clock 3:43", "unknown", "Los Angeles Ironmen", "laned", "home", F7_GAP + "Ironmen wiped; Leverage win point flawless", "Leverage +1 (score VERIFY)"],
  ["8", "clock 2:55", "unknown", "Los Angeles Ironmen", "laned", "snake (dive)", F7_GAP + "Pt X3 start 2:58 (part5-SALVAGE)", "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["8", "clock 2:34", "unknown", "New Jersey Leverage", "laned", "center (crawling)", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["8", "clock 2:24", "unknown", "New Jersey Leverage", "snap", "snake", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["8", "clock 2:13", "unknown", "New Jersey Leverage", "snap", "dorito", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["8", "clock 2:04", "unknown", "Los Angeles Ironmen", "snap", "dorito", F7_GAP, "Ironmen ? – Leverage ? in progress (VERIFY)"],
  ["8", "clock 1:59", "remaining Leverage players (count unknown)", "New Jersey Leverage", "bunkered (run-through)", "center", F7_GAP + "Single row for remaining bunkered; one-row-per-elim not possible — count VERIFY. Ironmen win point", "Ironmen +1 (score VERIFY)"],
  ["9", "clock 0:53", "unknown", "Los Angeles Ironmen", "bunkered", "dorito", F7_GAP + "point # VERIFY. Source fri7-part6/part7. Pt start 1:59 at Ironmen 4–2 (film). Bunkered by pushing Leverage player", "Ironmen 4 – Leverage 2 in progress (VERIFY)"],
  ["9", "clock 0:46", "unknown", "Los Angeles Ironmen", "laned/snapped (VERIFY)", "snake", F7_GAP + "point # VERIFY. Source fri7-part6/part7. Leverage win point", "Ironmen 4 – Leverage 3 (VERIFY)"],
  ["FINAL", "clock 0:25–0:00", "— (no elims)", "—", "none (time expired)", "—", F7_GAP + "point # VERIFY. Source fri7-part6/part7. Notes/summary row, not an elim: pt start 0:25 at 4–3, no elims, time expired. FINAL Ironmen 4–3 Leverage. OPEN GAP VERIFY (speed rule, no recapture): VOD ~15:20–24:30 gaps; P1–P4 labels/scores conflict with g2; g2 clock offset; P6/P8 'remaining players' counts; P6–P8 scores unknown. FINAL stays VERIFY.", "FINAL Ironmen 4 – Leverage 3 (VERIFY)"],
]));

// Fri Set 7 — Collision vs Distortion (PARTIAL; first seen point in progress; point numbers VERIFY)
const F7C_SRC = "MLPB+ Fri Set 7 (PARTIAL set; gaps pending recapture). Point numbers VERIFY (Pt A/B/C labeled 2/3/4; overlay suggests Collision led 1–0 before Pt A); ";
function f7c(raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: "Los Angeles Collision vs Chicago Distortion (Fri Set 7 MLPB+)", point, timestamp, playerOut, jersey, elimType, area,
    notes: F7C_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...f7c([
  ["2", "clock 12:50", "unknown #72", "#72 Chicago Distortion", "laned", "center-left", "Pt A in progress at 12:53; #72 unnamed. 3 earlier Collision elims not seen", "Collision 1 – Distortion 0 in progress (VERIFY)"],
  ["2", "clock 12:44", "unknown", "Los Angeles Collision", "snap", "snake", "", "Collision 1 – Distortion 0 in progress (VERIFY)"],
  ["2", "clock 12:40", "unknown", "Los Angeles Collision", "run-through", "center/dorito", "Distortion buzzer 12:38, win point", "Collision 1 – Distortion 1"],
  ["3", "clock 12:29", "unknown", "Chicago Distortion", "laned", "home", "Pt B start 12:31 (1–1)", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 12:26", "unknown", "Chicago Distortion", "laned", "dorito corner", "", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 12:13", "unknown", "Los Angeles Collision", "laned", "snake corner", "", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 12:06", "unknown", "Los Angeles Collision", "laned", "home", "", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 12:02", "unknown", "Chicago Distortion", "laned", "snake 1", "", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 12:00", "unknown", "Chicago Distortion", "laned", "center", "", "Collision 1 – Distortion 1 in progress"],
  ["3", "clock 11:53", "unknown", "Chicago Distortion", "run-through", "back right", "Collision win point 11:48. fri7-partg2 (VOD ~10:00–17:45) confirms 1–1 → 2–1, Collision hang. g2's Distortion dorito 12:28, center 12:10, snake 12:05, dorito 12:03, back center 12:01 and Collision snake 12:15 are taken as the same outs as this point's rows (Distortion already at the 5-out cap; g2's center 12:10 and dorito 12:03 not added, VERIFY). The earlier Collision 1–0 point is still Point 1 and uncaptured.", "Collision 2 – Distortion 1"],
  ["4", "clock ~11:47", "unknown", "Los Angeles Collision", "laned off break", "—", "Pt C start 11:48, sides switched", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:43", "unknown", "Chicago Distortion", "laned", "dorito corner", "", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:39", "unknown", "Los Angeles Collision", "laned", "center", "", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:36", "unknown", "Los Angeles Collision", "laned", "snake", "", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:32", "unknown", "Chicago Distortion", "laned", "center", "fri7-partg2 reads center 11:33 on a yellow flag (same out). g2 snake run 11:44 (off the break) is taken as the existing 11:43 dorito-corner row (sides switched, VERIFY). g2 Collision snake 11:35 = existing 11:36 row; g2 Collision dorito 11:41 not added (Collision already at 5 outs in this point, VERIFY).", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:37", "unknown", "Chicago Distortion", "lane/snap", "dorito", "Source fri7-partg2 (VOD ~10:00–17:45), match clock.", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:32", "unknown", "Chicago Distortion", "penalty (pulled)", "home", "Source fri7-partg2 (VOD ~10:00–17:45), match clock. Home player pulled for the penalty.", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 11:29", "Jackson Blue", "#22 Chicago Distortion", "eliminated", "snake corner", "Source fri7-partg2 (VOD ~10:00–17:45), match clock. Film '#22 Jackson Blue'; Jackson Blue on Distortion roster (roster lists no number). Point stopped. g2: point ended on a penalty, likely Collision win (VERIFY). CONFLICT: this Page and g1 have this point continuing to a Distortion win (Askren buzzer 10:31, 2–2). The 11:21/10:37 rows may belong to the next point (VERIFY); not rewritten.", "Collision 2 – Distortion 1 in progress (g2: likely Collision 3 – Distortion 1, VERIFY)"],
  ["4", "clock 11:21", "unknown", "Los Angeles Collision", "laned", "home", "fri7-partg1 (VOD ~15:15–27:15) covers this point (Collision 2–1 → 2–2, Distortion hang): snake 11:36 dup of existing row; g1 Collision dorito 11:16 not added, since this point already has 5 Collision outs (cap; may match 10:37 dorito, VERIFY).", "Collision 2 – Distortion 1 in progress"],
  ["4", "clock 10:37", "unknown", "Los Angeles Collision", "snap", "dorito", "Collision wiped; Distortion win point — Matthew Askren #7 (Distortion; film 'Matt Askren', PBLeagues Matthew Askren) hit buzzer 10:31 (not an elim). Later points pending recapture.", "Collision 2 – Distortion 2"],
  ["5", "clock 10:07", "unknown", "Los Angeles Collision", "laned", "dorito (dive)", "Pt start 10:20 (2–2); part4/5-SALVAGE", "Collision 2 – Distortion 2 in progress"],
  ["5", "clock ~9:40–9:10", "unknown", "Los Angeles Collision", "off-camera", "snake", "Exact time VERIFY (off-camera)", "Collision 2 – Distortion 2 in progress"],
  ["5", "clock 8:53", "unknown", "Los Angeles Collision", "snap", "dorito corner", "", "Collision 2 – Distortion 2 in progress"],
  ["5", "clock 8:43", "unknown", "Los Angeles Collision", "snap", "home", "", "Collision 2 – Distortion 2 in progress"],
  ["5", "clock 8:39", "unknown", "Los Angeles Collision", "bunkered (run-through)", "snake corner", "Collision wiped; Distortion win point (film). fri7-partg1 CONFLICT (VERIFY, no rows added; this point is at the 5-out cap): g1 splits 10:20–8:52 into TWO points. (a) From 2–2, Distortion hang, bug didn't update (Distortion 3–2 VERIFY): Collision snake back 10:15 + dorito corner 10:12 (both off break), center/snake 9:56, mid dorito 9:53, far dorito 9:52. (b) Next point, clip ends unfinished: Collision snake corner 9:05, center/dorito 9:01, dorito 8:57, snake 8:53, center 8:52; Distortion dorito corner 9:00; 5 Collision outs so Distortion likely won (result VERIFY; ending after clip, gap). If g1 is right, these P5 rows mix two points and later scores shift by one.", "Collision 2 – Distortion 3"],
  ["6", "clock 7:56", "unknown", "Chicago Distortion", "laned", "dorito (dive)", "Pt start 8:03", "Collision 2 – Distortion 3 in progress"],
  ["6", "clock 7:48", "unknown", "Los Angeles Collision", "snap", "snake", "", "Collision 2 – Distortion 3 in progress"],
  ["6", "clock 7:46", "unknown", "Los Angeles Collision", "snap", "center", "", "Collision 2 – Distortion 3 in progress"],
  ["6", "clock 7:29", "unknown", "Los Angeles Collision", "snap", "dorito corner", "", "Collision 2 – Distortion 3 in progress"],
  ["6", "clock 7:13", "unknown", "Los Angeles Collision", "bunkered (run-through)", "home", "Distortion win point (film)", "Collision 2 – Distortion 4"],
  ["7", "clock 5:50", "unknown", "Chicago Distortion", "off the break", "dorito", "point # VERIFY; SCORE VERIFY: earlier rows show Distortion 4–2 but this film shows 3–3 at pt start 5:54. Source fri7-part6/part7. Winner not shown (VERIFY)", "Collision 3 – Distortion 3 in progress (VERIFY)"],
  ["7", "clock 4:35", "unknown", "Chicago Distortion", "walk-off (how unknown)", "unknown", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Point winner not shown (VERIFY); next point starts 4–4", "Collision 4 – Distortion 4 (VERIFY)"],
  ["8", "clock 3:16", "unknown", "Los Angeles Collision", "laned/snapped", "snake", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Pt start 3:27 at 4–4", "Collision 4 – Distortion 4 in progress (VERIFY)"],
  ["8", "clock 3:13", "unknown", "Los Angeles Collision", "laned/snapped", "dorito", "point # VERIFY; score VERIFY. Source fri7-part6/part7", "Collision 4 – Distortion 4 in progress (VERIFY)"],
  ["8", "clock 2:52", "unknown", "Los Angeles Collision", "bunkered", "center", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Distortion push through center/dorito gap; Distortion win point", "Collision 4 – Distortion 5 (VERIFY)"],
  ["9", "clock 2:50", "unknown", "Los Angeles Collision", "off the break", "dorito", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Pt start 2:56 at Distortion 5–4 (clock times as given; VERIFY)", "Collision 4 – Distortion 5 in progress"],
  ["9", "clock 2:45", "unknown", "Los Angeles Collision", "laned", "back center", "point # VERIFY; score VERIFY. Source fri7-part6/part7", "Collision 4 – Distortion 5 in progress"],
  ["9", "clock 2:37", "unknown", "Los Angeles Collision", "laned", "center star", "point # VERIFY; score VERIFY. Source fri7-part6/part7", "Collision 4 – Distortion 5 in progress"],
  ["9", "clock 2:25", "unknown", "Los Angeles Collision", "bunkered", "back snake corner", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Bunkered by Distortion player running the snake", "Collision 4 – Distortion 5 in progress"],
  ["9", "clock 2:20", "Guillermo Ramirez", "#00 Los Angeles Collision", "eliminated (last alive)", "center/snake", "point # VERIFY; score VERIFY. Source fri7-part6/part7. Distortion win clean, 5 alive. Earlier graphic read FINAL Distortion 6–4 Collision, but fri7-part8 shows match continuing (overlay Collision 7–5) — score VERIFY", "Collision 4 – Distortion 6 per earlier graphic (score VERIFY)"],
  ["10", "clock 0:43", "unknown", "Los Angeles Collision", "run-through (running)", "dorito side", "point # VERIFY; score VERIFY. Source fri7-part8-SALVAGE-680s. Pt start 0:46, overlay Collision 7–5 (overlay team order VERIFY)", "Collision 7 – Distortion 5 in progress (overlay; VERIFY)"],
  ["10", "clock 0:40", "unknown", "Los Angeles Collision", "eliminated", "center-right dorito bunker", "point # VERIFY; score VERIFY. Source fri7-part8-SALVAGE-680s", "Collision 7 – Distortion 5 in progress (overlay; VERIFY)"],
  ["10", "clock 0:37", "unknown", "Chicago Distortion", "walk-off", "snake side", "point # VERIFY; score VERIFY. Source fri7-part8-SALVAGE-680s", "Collision 7 – Distortion 5 in progress (overlay; VERIFY)"],
  ["10", "clock 0:27", "unknown", "Chicago Distortion", "pulled by ref", "snake bunker", "point # VERIFY; score VERIFY. Source fri7-part8-SALVAGE-680s. Collision win point on ref stop 0:26", "Collision 8 – Distortion 5 (overlay; VERIFY)"],
  ["FINAL", "clock 0:22", "unknown", "Chicago Distortion", "run-through (running)", "snake side", "FINAL point # VERIFY. Source fri7-part8-SALVAGE-680s. Pt start 0:26 at overlay Collision 8–5", "Collision 8 – Distortion 5 in progress (VERIFY)"],
  ["FINAL", "clock 0:21", "unknown", "Chicago Distortion", "eliminated", "center-left", "FINAL point # VERIFY. Source fri7-part8-SALVAGE-680s", "Collision 8 – Distortion 5 in progress (VERIFY)"],
  ["FINAL", "clock 0:09", "unknown", "Los Angeles Collision", "eliminated", "far left", "FINAL point # VERIFY. Source fri7-part8-SALVAGE-680s. Time expired, no buzzer. VERIFY: overlay Collision 8–5 vs earlier graphic Distortion 6–4. OPEN GAP VERIFY (speed rule, no recapture): Point 1 (Collision 1–0) uncaptured; P4 end (penalty Collision win vs Distortion 2–2); P5 two-point split (g1); P7 score (3–3 vs 4–2) and winner; P10/FINAL point numbers.", "FINAL Collision 8 – Distortion 5 (VERIFY: overlay Collision 8–5 vs earlier graphic Distortion 6–4)"],
]));

function asm(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Chicago Aftershock vs Perris ASG Aftermath (Sun dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Sun broadcast -NxgYj0epvk (clips start, early, bridge, finish; overlaps de-duped); " + notes, scoreAfter };
}

function upc(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Seattle Uprising vs Atlanta Jungle Cats (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Up/Cats + XF/NYX; clips A, B1, B2); " + notes, scoreAfter };
}

function xfn(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "San Antonio X-Factor vs New York Xtreme (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Up/Cats + XF/NYX; clips A, B1, B2); " + notes, scoreAfter };
}

function afv(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Chicago Aftershock vs PaintballFIT (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Damage/Heat + AS/FIT; clips A–D + finish); " + notes, scoreAfter };
}

function dmh(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Tampa Bay Damage vs Houston Heat (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Damage/Heat + AS/FIT, VOD ~148–202m; clips A–D); " + notes, scoreAfter };
}

function jci(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Atlanta Jungle Cats vs Detroit Infamous (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Canes/NYX + Cats/Inf, VOD ~88–146; clips A–E); " + notes, scoreAfter };
}

function cnx(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "CK Hurricanes vs New York Xtreme (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes: "Fri broadcast 40IX7cok6Vk (dual-feed Canes/NYX + Cats/Inf, VOD ~88–146; clips A–E); " + notes, scoreAfter };
}

function xfa(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "San Antonio X-Factor vs Chicago Aftershock (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function uph(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Seattle Uprising vs Houston Heat (Fri dual-feed)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}


// Fri Set 8 — Impact vs Seadogs + Red Legion vs Aftermath (fri8-part1/part2; players unknown)
const F8_SRC = "MLPB+ Fri Set 8 (fri8-part1/part2), match clock. ";
const F8_INC = "elims may be incomplete (dual-feed cutaways). ";
function f8(m: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: m, point, timestamp, playerOut, jersey, elimType, area,
    notes: F8_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...f8("Edmonton Impact vs Royal City Seadogs (Fri Set 8 MLPB+)", [
  ["2", "clock 13:02", "unknown", "Royal City Seadogs", "laned off break", "dorito", "pt1 not captured (Impact led 1–0). Point 2 starts Impact 1–0 at 13:04.", "Impact 1 – Seadogs 0 in progress"],
  ["2", "clock 13:00", "unknown", "Edmonton Impact", "lane/snap", "back snake", "", "Impact 1 – Seadogs 0 in progress"],
  ["2", "clock 12:55", "unknown", "Edmonton Impact", "unknown", "snake", "", "Impact 1 – Seadogs 0 in progress"],
  ["2", "clock 12:51", "unknown", "Edmonton Impact", "unknown", "dorito", "", "Impact 1 – Seadogs 0 in progress"],
  ["2", "clock 12:50", "unknown", "Edmonton Impact", "unknown", "back center", "", "Impact 1 – Seadogs 0 in progress"],
  ["2", "clock 12:37", "unknown", "Edmonton Impact", "bunkered/run-through", "behind center can", "Bunkered by pushing Seadogs player; Seadogs win point. " + F8_INC, "Impact 1 – Seadogs 1"],
  ["3", "clock 11:04", "unknown", "Royal City Seadogs", "laned off break", "snake", "Point 3 starts 1–1 at 11:07.", "Impact 1 – Seadogs 1 in progress"],
  ["3", "clock 11:02", "unknown", "Royal City Seadogs", "laned off break", "dorito", "Broadcast cut away; point winner unknown, VERIFY. " + F8_INC, "Impact 1 – Seadogs 1 in progress (winner VERIFY)"],
  ["5", "clock 9:26", "unknown", "Royal City Seadogs", "lane/snap", "dorito", "Source fri8-g1 (VOD ~20:00–31:56, match clock; joined mid-point). g1 covers 2–2 onward, so it does NOT fill the missing points (P1 and the 1–1 → 2–2 gap stay uncaptured).", "Impact 2 – Seadogs 2 in progress"],
  ["5", "clock 9:04", "unknown", "Royal City Seadogs", "unknown", "center tall cylinder", "fri8-g1 reads Seadogs #40 center-dorito out at 9:03 (same out; #40 unnamed). Source fri8-part3-SALVAGE/part4. Pt3 (1–1 at 11:07) unresolved; next score seen 2–2, so one point fell in capture gap. Point 5 starts 2–2 at 9:53. point # VERIFY.", "Impact 2 – Seadogs 2 in progress"],
  ["5", "clock 9:01", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part3-SALVAGE/part4. point # VERIFY.", "Impact 2 – Seadogs 2 in progress"],
  ["5", "clock 8:51", "unknown", "Royal City Seadogs", "unknown", "snake", "Source fri8-part3-SALVAGE/part4. Impact win point; fri8-g1: Impact hang at 8:48 by #12 Tyler Harmon (Impact roster). point # VERIFY. " + F8_INC, "Impact 3 – Seadogs 2"],
  ["6", "clock 8:46", "unknown", "Royal City Seadogs", "lane/snap", "snake (run)", "Source fri8-g1 (VOD ~20:00–31:56), match clock. point # VERIFY.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:45", "unknown", "Royal City Seadogs", "lane/snap", "back center", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:44", "unknown", "Edmonton Impact", "lane/snap", "snake (run)", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:42", "unknown", "Royal City Seadogs", "lane/snap", "dorito corner", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:31", "unknown", "Royal City Seadogs", "lane/snap", "center", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:29", "unknown", "Royal City Seadogs", "lane/snap", "snake", "Source fri8-g1, match clock. 5th Seadogs out (cap).", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:14", "unknown", "Edmonton Impact", "unknown", "snake", "Source fri8-part3-SALVAGE/part4. Point 6 starts Impact 3–2 at 8:48. point # VERIFY.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 8:10", "unknown", "Edmonton Impact", "unknown", "center", "Source fri8-part3-SALVAGE/part4. point # VERIFY.", "Impact 3 – Seadogs 2 in progress"],
  ["6", "clock 7:54", "unknown", "Edmonton Impact", "unknown", "dorito", "Source fri8-part3-SALVAGE/part4. Seadogs win point. Point 7 starts 3–3 at 7:53; capture ends here. point # VERIFY. " + F8_INC, "Impact 3 – Seadogs 3 in progress"],
  ["6", "clock 7:53", "Conner Kelley", "#23 Edmonton Impact", "penalty", "back center", "Source fri8-g1, match clock. #23 Kelley (Impact roster). Impact #99 Timothy Stanczak (Impact roster) buzzed at 7:56, but the penalty on Kelley gave the point to the Seadogs. 5th Impact out (cap).", "Impact 3 – Seadogs 3"],
  ["7", "clock 7:50", "unknown", "Edmonton Impact", "lane/snap", "snake (run)", "Source fri8-g1 (VOD ~20:00–31:56), match clock. g1 Seadogs outs (dorito run 7:49, snake corner 7:29, center 6:55, dorito 6:53) not added: this point already has more than 5 Seadogs rows (6:53/6:55 likely = ~6:53 'center to dorito'), VERIFY. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 7:48", "unknown", "Edmonton Impact", "lane/snap", "back center", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 7:27", "unknown", "Edmonton Impact", "lane/snap", "dorito", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 6:57", "unknown", "Edmonton Impact", "lane/snap", "snake", "Source fri8-g1, match clock.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 6:52", "unknown", "Edmonton Impact", "lane/snap", "back center", "Source fri8-g1, match clock. 5th Impact out (cap). g1: Seadogs win at 6:35 by #05 Mark Gawlikowski (Seadogs roster); scorebug not updated, so Seadogs 4–3 VERIFY. CONFLICT: the Page's film recheck has this as one point continuing to an Impact win (buzzer 4:25). Resolved by fri8-partg2: single point, Impact win 4–3 (see P7 4:52 row); g1's 6:35 Seadogs-win read was wrong. g2 lists only Seadogs outs, so these g1 Impact outs are VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock ~7:01", "unknown", "Royal City Seadogs", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Point 7 starts 3–3 at 7:53. Time approx. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock ~6:53", "unknown", "Royal City Seadogs", "unknown", "center to dorito", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock ~6:36", "unknown", "Royal City Seadogs", "unknown", "center", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock ~6:35", "unknown #5", "#5 Royal City Seadogs", "unknown", "center", "BULLOCK 5 printed on jersey (not a graphic); not on event roster; VERIFY. fri8-g1 reads Seadogs #05 Gawlikowski winning the point at 6:35, not being eliminated (VERIFY). Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. No point end at 6:35; play continued. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 5:40", "unknown", "Royal City Seadogs", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 5:34", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 5:15", "unknown", "Royal City Seadogs", "unknown", "center", "Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 5:05", "unknown", "Royal City Seadogs", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. point # VERIFY.", "Impact 3 – Seadogs 3 in progress"],
  ["7", "clock 4:52", "unknown", "Royal City Seadogs", "unknown", "near center", "graphic 'EDMONTON IMPACT 19 WELTZ'; Impact jersey; roster lists Weltz on Seadogs, VERIFY. Source fri8-part5-SALVAGE/part5b-SALVAGE. film recheck: single point; earlier split was wrong. Impact win point, buzzer 4:25 by Impact #19. fri8-partg2 (VOD ~32:12–40:09, match clock) RESOLVES the P7 split: a single point, 3–3 → Impact 4–3, confirmed by a SCORES graphic showing 4–3. g1's 'Seadogs win at 6:35' read is wrong. g2 Seadogs outs at 6:33 (off the break, running to the dorito side), 6:29 (mid-dive into the snake), 6:05 (crawling up the snake), 4:41 (yellow pants, laying down behind the tall center-left bunker, Impact center push) and 4:24 (back-left, shot by the Impact snake player) are taken as existing rows. This point already has more than 5 Seadogs rows, so none added (count VERIFY). Seadogs #09 Clayton Rizzardo Jr (Seadogs roster) seen walking off dead; not mapped to a specific out (VERIFY). g2: Impact #1 Cornell hung the flag at 3:36 (two Cornells, Brandon and Justin, on the Impact roster, so first name VERIFY; buzzer time/player conflicts with 4:25 #19, VERIFY). point # VERIFY. " + F8_INC, "Impact 4 – Seadogs 3"],
  ["8", "clock 4:14", "unknown", "Royal City Seadogs", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Point 8 starts 4–3 at 4:25 (renumbered from old pt 9 after film-recheck merge). point # VERIFY.", "Impact 4 – Seadogs 3 in progress"],
  ["8", "clock 4:09", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Point still live at capture end (4:00). point # VERIFY.", "Impact 4 – Seadogs 3 in progress"],
  ["8", "clock 3:53", "unknown", "Royal City Seadogs", "shot", "behind dorito bunker", "Source fri8-part6. Impact win point, buzzer 3:39. point # VERIFY. " + F8_INC, "Impact 5 – Seadogs 3"],
  ["9", "clock 2:28", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part6. Point 9 starts 5–3 at 3:00 (renumbered from old pt 10). point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 2:00", "unknown", "Edmonton Impact", "unknown", "snake", "Source fri8-part6. point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 1:35", "unknown", "Royal City Seadogs", "unknown", "center", "Source fri8-part6. point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 1:00", "unknown", "Edmonton Impact", "unknown", "snake", "Source fri8-part6. point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 0:43", "unknown", "Edmonton Impact", "unknown", "center-left", "Source fri8-part6. point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 0:20", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part6. point # VERIFY.", "Impact 5 – Seadogs 3 in progress"],
  ["9", "clock 0:06", "unknown", "Edmonton Impact", "unknown", "dorito", "Source fri8-part6. Seadogs win point, buzzer 0:02. point # VERIFY. " + F8_INC, "Impact 5 – Seadogs 4"],
  ["FINAL", "clock 0:08", "unknown", "Royal City Seadogs", "unknown", "dorito", "Source fri8-part6. Final point starts 5–4 (logged sequence; earlier note said 6–4 at 0:27). Score VERIFY: after merge the logged sequence reaches 5–4, but LED FINAL reads Impact 6–4, so one Impact point is unaccounted for (possibly in the final point or a capture gap).", "Impact 5 – Seadogs 4 in progress (VERIFY)"],
  ["FINAL", "clock 0:05", "unknown", "Edmonton Impact", "unknown", "snake", "Source fri8-part6. Time expires. FINAL Impact 6–4 Seadogs per LED. OPEN GAP VERIFY: the frozen stretch after fri8-partg2 VOD 40:09 won't be recaptured (Rob's speed rule), so everything after Impact 4–3 rests on part6 only; FINAL 6–4 VERIFY. Score VERIFY: logged sequence reaches only 5–4 after the merge; one Impact point unaccounted for. " + F8_INC, "FINAL Impact 6 – Seadogs 4"],
]));
ROWS.push(...f8("Red Legion vs Perris ASG Aftermath (Fri Set 8 MLPB+)", [
  ["1", "clock 14:29", "unknown", "Perris ASG Aftermath", "unknown", "back snake", "Point starts 14:43, joined in progress.", "RL 0 – Aftermath 0 in progress"],
  ["1", "clock 14:20", "unknown", "Red Legion", "unknown", "center-left", "", "RL 0 – Aftermath 0 in progress"],
  ["1", "clock 14:18", "unknown", "Perris ASG Aftermath", "unknown", "center", "RL win point. " + F8_INC, "RL 1 – Aftermath 0"],
  ["2", "clock 14:11", "unknown", "Perris ASG Aftermath", "laned off break", "dorito", "", "RL 1 – Aftermath 0 in progress"],
  ["2", "clock 14:08", "unknown", "Red Legion", "unknown", "center can", "", "RL 1 – Aftermath 0 in progress"],
  ["2", "clock 14:05", "unknown", "Red Legion", "unknown", "snake", "", "RL 1 – Aftermath 0 in progress"],
  ["2", "clock 13:50", "unknown", "Perris ASG Aftermath", "unknown", "snake", "", "RL 1 – Aftermath 0 in progress"],
  ["2", "clock 13:07", "unknown", "Red Legion", "unknown", "dorito", "", "RL 1 – Aftermath 0 in progress"],
  ["2", "clock 13:03", "unknown", "Perris ASG Aftermath", "unknown", "center", "RL win point; point end off-camera. " + F8_INC, "RL 2 – Aftermath 0"],
  ["3", "clock 12:57", "unknown", "Perris ASG Aftermath", "laned off break", "dorito", "", "RL 2 – Aftermath 0 in progress"],
  ["3", "clock 12:54", "unknown", "Red Legion", "unknown", "dorito", "", "RL 2 – Aftermath 0 in progress"],
  ["3", "clock 12:52", "unknown", "Red Legion", "unknown", "center", "", "RL 2 – Aftermath 0 in progress"],
  ["3", "clock 12:40", "unknown", "Perris ASG Aftermath", "unknown", "center", "", "RL 2 – Aftermath 0 in progress"],
  ["3", "clock 12:37", "unknown", "Perris ASG Aftermath", "unknown", "snake", "", "RL 2 – Aftermath 0 in progress"],
  ["3", "clock 12:35", "unknown", "Perris ASG Aftermath", "unknown", "dorito", "RL win point. " + F8_INC, "RL 3 – Aftermath 0"],
  ["5", "clock 10:59", "unknown", "Perris ASG Aftermath", "unknown", "snake", "Source fri8-part3-SALVAGE/part4. 4–0 point fell in capture gap (not logged). Point 5 starts RL 4–0 at 11:51. Clock gap 10:44→9:59, elims may be missing. fri8-g1 (VOD ~20:00–31:56) reads 6 Aftermath outs: dorito run 11:48, back center 11:45, dorito 11:01, snake corner 10:28, back center 10:20, center-dorito 10:03. This point already has 5 Aftermath outs (cap), so none added; g1's 11:01/10:03 likely = 10:59/9:59, and the 6-out read is VERIFY. RL hang 9:33 (g1).", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 11:47", "unknown", "Red Legion", "lane/snap", "snake (run)", "Source fri8-g1, match clock.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 11:09", "unknown", "Red Legion", "lane/snap", "center", "Source fri8-g1, match clock.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 11:07", "unknown", "Red Legion", "lane/snap", "dorito", "Source fri8-g1, match clock.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 9:59", "unknown", "Perris ASG Aftermath", "unknown", "center", "Source fri8-part3-SALVAGE/part4. After clock gap 10:44→9:59.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 9:51", "unknown", "Perris ASG Aftermath", "unknown", "dorito", "Source fri8-part3-SALVAGE/part4.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 9:44", "unknown", "Perris ASG Aftermath", "shot", "behind center 'A' logo bunker", "Source fri8-part3-SALVAGE/part4.", "RL 4 – Aftermath 0 in progress"],
  ["5", "clock 9:34", "unknown", "Perris ASG Aftermath", "unknown", "back center", "Source fri8-part3-SALVAGE/part4. RL win point. " + F8_INC, "RL 5 – Aftermath 0"],
  ["6", "clock 9:08", "unknown", "Perris ASG Aftermath", "unknown", "center", "Source fri8-part3-SALVAGE/part4. Point 6 starts RL 5–0 at 9:33. fri8-g1 center 9:17 and snake 9:12 likely = this row and the 8:55 snake (clock VERIFY); not added.", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 9:32", "unknown", "Perris ASG Aftermath", "lane/snap", "dorito (run)", "Source fri8-g1, match clock.", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 9:29", "unknown", "Perris ASG Aftermath", "lane/snap", "back center", "Source fri8-g1, match clock. g1 snake run 9:28 not added: would be a 6th Aftermath out (cap), VERIFY.", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 9:26", "unknown", "Red Legion", "lane/snap", "snake (run)", "Source fri8-g1, match clock.", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 9:14", "unknown", "Red Legion", "lane/snap", "center", "Source fri8-g1, match clock. RL hang 8:53 (g1).", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 9:02", "unknown", "Perris ASG Aftermath", "unknown", "dorito", "Source fri8-part3-SALVAGE/part4.", "RL 5 – Aftermath 0 in progress"],
  ["6", "clock 8:55", "unknown", "Perris ASG Aftermath", "unknown", "snake", "Source fri8-part3-SALVAGE/part4. RL win point. " + F8_INC, "RL 6 – Aftermath 0"],
  ["7", "clock ~8:30", "unknown", "Perris ASG Aftermath", "unknown", "dorito", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Point 7 starts RL 6–0 at 8:53. Times approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~8:20", "unknown", "#28 Red Legion", "unknown", "center", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~8:09", "unknown", "Perris ASG Aftermath", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~7:41", "unknown", "Red Legion", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~7:20", "unknown", "Red Legion", "unknown", "back center", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~6:52", "unknown", "Perris ASG Aftermath", "unknown", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~6:36", "unknown", "Red Legion", "bunkered", "snake", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Time approx.", "RL 6 – Aftermath 0 in progress"],
  ["7", "clock ~6:34", "unknown", "Red Legion", "unknown", "center", "Source fri8-part5-SALVAGE/part5b-SALVAGE. Aftermath win point, buzzer 6:32. Time approx. " + F8_INC, "RL 6 – Aftermath 1"],
  ["9", "clock 5:12", "unknown", "Perris ASG Aftermath", "unknown", "snake", "Source fri8-part6. pt8 RL win implied, elims not shown. Point 9 starts RL 7–1 at 5:26.", "RL 7 – Aftermath 1 in progress"],
  ["9", "clock 5:07", "unknown", "Red Legion", "unknown", "dorito", "Source fri8-part6. Feed cut away ~5:05; broadcast ended coverage; FINAL not shown. OPEN GAP VERIFY: the frozen stretch after fri8-partg2 VOD 40:09 won't be recaptured (Rob's speed rule); FINAL logged as last filmed RL 7–1 (VERIFY).", "RL 7 – Aftermath 1 in progress"],
]));

// Fri Set 9 — Dynasty vs Leverage + TonTon vs Distortion (fri9-p1; players unknown; clip time, not match clock)
const F9_SRC = "MLPB+ Fri Set 9 (fri9-p1), clip time (match clock not read per elim). ";
const F9_INC = "elims may be incomplete (dual-feed cutaways). ";
function f9(m: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: m, point, timestamp, playerOut, jersey, elimType, area,
    notes: F9_SRC + notes + (m === "TonTon Arsenal vs Chicago Distortion (Fri Set 9 MLPB+)" ? (notes ? " " : "") + F9_TT_JERSEY : ""), scoreAfter,
  }));
}
const F9_TT_JERSEY = "Orange/black jerseys lettered NEW YORK XTREME, but names Anfossi/Carroll are TonTon-registered; team = TonTon (VOD title/roster), jersey lettering mismatch noted.";
ROWS.push(...f9("San Diego Dynasty vs New Jersey Leverage (Fri Set 9 MLPB+)", [
  ["1", "clip fri9-p1 1:19", "unknown", "New Jersey Leverage", "laned off break", "dorito", "Point 1 starts 0–0 at clock 15:00.", "Dynasty 0 – Leverage 0 in progress"],
  ["1", "clip fri9-p1 1:21", "unknown", "San Diego Dynasty", "snap", "center", "", "Dynasty 0 – Leverage 0 in progress"],
  ["1", "clip fri9-p1 1:40", "unknown", "San Diego Dynasty", "bunkered", "dorito", "Bunkered by Leverage run up the center. Leverage win point. " + F9_INC, "Dynasty 0 – Leverage 1"],
  ["2", "clip fri9-p1 3:17", "unknown", "San Diego Dynasty", "laned off break", "snake", "Point 2 starts Lev 1–0 at clock 13:26.", "Dynasty 0 – Leverage 1 in progress"],
  ["2", "clip fri9-p1 3:18", "unknown", "New Jersey Leverage", "laned off break", "dorito", "", "Dynasty 0 – Leverage 1 in progress"],
  ["2", "clip fri9-p1 3:20", "unknown", "New Jersey Leverage", "snap", "center", "", "Dynasty 0 – Leverage 1 in progress"],
  ["2", "clip fri9-p1 3:21", "unknown", "New Jersey Leverage", "snap", "back", "", "Dynasty 0 – Leverage 1 in progress"],
  ["2", "clip fri9-p1 3:25", "unknown", "New Jersey Leverage", "bunkered", "bottom", "Bunkered by Dynasty snake runner. Dynasty win point. " + F9_INC, "Dynasty 1 – Leverage 1"],
  ["3", "clip fri9-p1 4:57", "unknown", "San Diego Dynasty", "laned off break", "dorito", "Point 3 starts 1–1 at clock 12:06.", "Dynasty 1 – Leverage 1 in progress"],
  ["3", "clip fri9-p1 4:59", "unknown", "New Jersey Leverage", "laned off break", "dorito", "", "Dynasty 1 – Leverage 1 in progress"],
  ["3", "clip fri9-p1 5:05", "unknown", "San Diego Dynasty", "snap/lane", "snake", "", "Dynasty 1 – Leverage 1 in progress"],
  ["3", "clip fri9-p1 5:26", "unknown", "San Diego Dynasty", "laned (cross-field)", "unknown", "Cross-field lane from Leverage snake player.", "Dynasty 1 – Leverage 1 in progress"],
  ["3", "clip fri9-p1 5:41", "unknown", "San Diego Dynasty", "snap", "center", "", "Dynasty 1 – Leverage 1 in progress"],
  ["3", "clip fri9-p1 5:46", "unknown", "San Diego Dynasty", "bunkered/run-through", "dorito", "Bunkered by Leverage center run-through. Leverage win point, lead 2–1. " + F9_INC, "Dynasty 1 – Leverage 2"],
  ["4", "clip fri9-p2 05:38", "unknown", "San Diego Dynasty", "unknown", "far side (location approx)", "Source clip fri9-p2 (overlaps p1). Point 4 starts Lev 2–1 at clock 10:02 (LED).", "Dynasty 1 – Leverage 2 in progress"],
  ["4", "clip fri9-p2 05:52", "unknown", "New Jersey Leverage", "unknown", "near side (location approx)", "Source clip fri9-p2.", "Dynasty 1 – Leverage 2 in progress"],
  ["4", "clip fri9-p2 06:05", "unknown", "San Diego Dynasty", "unknown", "unknown", "Source clip fri9-p2.", "Dynasty 1 – Leverage 2 in progress"],
  ["4", "clip fri9-p2 06:21", "unknown", "San Diego Dynasty", "unknown", "unknown", "Source clip fri9-p2.", "Dynasty 1 – Leverage 2 in progress"],
  ["4", "clip fri9-p2 06:23", "unknown", "San Diego Dynasty", "unknown", "center-right (location approx)", "Source clip fri9-p2.", "Dynasty 1 – Leverage 2 in progress"],
  ["4", "clip fri9-p2 06:25", "unknown", "San Diego Dynasty", "unknown", "unknown", "Source clip fri9-p2. Leverage win point, lead 3–1. " + F9_INC, "Dynasty 1 – Leverage 3"],
  ["5", "clip fri9-p2 08:52", "unknown", "New Jersey Leverage", "unknown", "back center (location approx)", "Source clip fri9-p2. Point 5 starts Lev 3–1 at clock 9:16.", "Dynasty 1 – Leverage 3 in progress"],
  ["5", "clip fri9-p2 09:04", "unknown", "New Jersey Leverage", "unknown", "unknown", "Source clip fri9-p2.", "Dynasty 1 – Leverage 3 in progress"],
  ["5", "clip fri9-p2 09:14", "unknown", "New Jersey Leverage", "unknown", "unknown", "Source clip fri9-p2.", "Dynasty 1 – Leverage 3 in progress"],
  ["5", "clip fri9-p2 09:17", "unknown", "New Jersey Leverage", "unknown", "unknown", "Source clip fri9-p2.", "Dynasty 1 – Leverage 3 in progress"],
  ["5", "clip fri9-p2 09:20", "unknown", "New Jersey Leverage", "unknown", "center-right (location approx)", "Source clip fri9-p2. Dynasty win point, 2–3. " + F9_INC, "Dynasty 2 – Leverage 3"],
  ["6", "clip fri9-p1 11:40", "unknown", "San Diego Dynasty", "laned off break", "snake", "Point 6 starts Lev 3–2 at 8:32.", "Dynasty 2 – Leverage 3 in progress"],
  ["6", "clip fri9-p1 11:41", "unknown", "New Jersey Leverage", "laned off break", "dorito", "", "Dynasty 2 – Leverage 3 in progress"],
  ["6", "clip fri9-p1 11:43", "unknown", "New Jersey Leverage", "snap", "center", "", "Dynasty 2 – Leverage 3 in progress"],
  ["6", "clip fri9-p1 11:51", "unknown", "New Jersey Leverage", "bunkered", "unknown", "Bunkered by Dynasty snake push. Dynasty win point, 3–3. " + F9_INC, "Dynasty 3 – Leverage 3"],
  ["7", "clock 7:58", "unknown", "San Diego Dynasty", "unknown", "back center", "Source fri9-g1 salvage (VOD ~24:00–30:55), match clock; fills held p3 gap. SCORE VERIFY: g1 scorebug reads Leverage 3–2 → 4–2, but Page P6 is a Dynasty win to 3–3 and P9 starts Lev 5–Dyn 3, so the bug's Dynasty count likely lagged; Page sequence used. Point # by Page sequence (P7), VERIFY.", "Dynasty 3 – Leverage 3 in progress"],
  ["7", "clock 7:44", "unknown", "New Jersey Leverage", "unknown", "snake", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 3 in progress"],
  ["7", "clock 7:20", "unknown", "San Diego Dynasty", "unknown", "mid snake", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 3 in progress"],
  ["7", "clock 7:18", "unknown", "San Diego Dynasty", "shot", "center", "Source fri9-g1, match clock. Shot from the dorito side.", "Dynasty 3 – Leverage 3 in progress"],
  ["7", "clock ~7:08", "unknown", "San Diego Dynasty", "unknown", "back center (likely, VERIFY)", "Source fri9-g1, match clock. Leverage hang; Leverage win point. " + F9_INC, "Dynasty 3 – Leverage 4 (VERIFY: g1 bug 4–2)"],
  ["8", "clock 6:53", "unknown", "New Jersey Leverage", "shot", "snake", "Source fri9-g1, match clock. Shot just after diving in. Point # VERIFY.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 6:39", "unknown", "San Diego Dynasty", "unknown", "mid snake", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 6:12", "unknown", "San Diego Dynasty", "unknown", "top dorito", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 6:10", "unknown", "San Diego Dynasty", "unknown", "mid dorito", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 6:07", "unknown", "New Jersey Leverage", "unknown", "top dorito", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 5:44", "unknown", "San Diego Dynasty", "unknown", "back center", "Source fri9-g1, match clock.", "Dynasty 3 – Leverage 4 in progress"],
  ["8", "clock 5:42", "unknown", "San Diego Dynasty", "bunkered/run-through", "snake corner", "Source fri9-g1, match clock. Leverage center player ran it through, shot the last Dynasty player and buzzed; Leverage hang, win point. 5th Dynasty out (cap). Consistent with P9 starting Lev 5–Dyn 3. " + F9_INC, "Dynasty 3 – Leverage 5 (VERIFY: g1 bug 5–2)"],
  ["9", "clock 5:00", "unknown", "New Jersey Leverage", "shot (running)", "dorito", "Source fri9-partg2 (VOD 30:56–42:56), match clock. Point starts Leverage 5–2 per bug; Dynasty down a man on a penalty. POINT/SCORE VERIFY (unclear): Page sequence has Lev 5–Dyn 3 after P8, and the p4 rows already labeled P9 start Lev 5–Dyn 3. Either this is an extra Dynasty point (bug Dyn 2 → 3) and the existing P9 onward would be P10+, or the bug lagged. Labeled 9; not renumbered.", "Dynasty 2 – Leverage 5 in progress (bug; VERIFY)"],
  ["9", "clock 4:55", "unknown", "New Jersey Leverage", "unknown", "center", "Source fri9-partg2, match clock.", "Dynasty 2 – Leverage 5 in progress (bug; VERIFY)"],
  ["9", "clock 4:53", "Eliot Weaver", "#21 San Diego Dynasty", "pulled by ref (penalty)", "unknown", "Source fri9-partg2, match clock. #21 Weaver on the Dynasty roster (roster lists no number). Point end unclear; score after Dynasty 3–5 per g2 (VERIFY).", "Dynasty 3 – Leverage 5 (VERIFY)"],
]));
ROWS.push(...f9("TonTon Arsenal vs Chicago Distortion (Fri Set 9 MLPB+)", [
  ["1", "clip fri9-p1 2:37", "unknown", "TonTon Arsenal", "laned off break", "snake", "Point 1 starts 0–0 at clock 15:00.", "TonTon 0 – Distortion 0 in progress"],
  ["1", "clip fri9-p1 2:38", "unknown", "Chicago Distortion", "laned off break", "dorito", "", "TonTon 0 – Distortion 0 in progress"],
  ["1", "clip fri9-p1 2:42", "unknown", "TonTon Arsenal", "snap", "center", "", "TonTon 0 – Distortion 0 in progress"],
  ["1", "clip fri9-p1 2:54", "unknown", "TonTon Arsenal", "snap", "dorito", "", "TonTon 0 – Distortion 0 in progress"],
  ["1", "clip fri9-p1 3:02", "unknown", "TonTon Arsenal", "snap/bunkered", "back", "Distortion win point. " + F9_INC, "TonTon 0 – Distortion 1"],
  ["2", "clip fri9-p1 6:18", "unknown", "TonTon Arsenal", "laned off break", "dorito", "Point 2 starts Dist 1–0 at clock 14:33.", "TonTon 0 – Distortion 1 in progress"],
  ["2", "clip fri9-p1 6:19", "unknown", "Chicago Distortion", "laned off break", "dorito", "", "TonTon 0 – Distortion 1 in progress"],
  ["2", "clip fri9-p1 6:20", "unknown", "TonTon Arsenal", "laned off break", "snake", "Finish not shown; TonTon win per LED 1–1, VERIFY. " + F9_INC, "TonTon 1 – Distortion 1 (VERIFY)"],
  ["3", "clip fri9-p1 7:26", "unknown", "Chicago Distortion", "laned off break", "snake", "Point 3 starts 1–1 at clock 13:34.", "TonTon 1 – Distortion 1 in progress"],
  ["3", "clip fri9-p1 7:27", "unknown", "Chicago Distortion", "laned off break", "dorito", "", "TonTon 1 – Distortion 1 in progress"],
  ["3", "clip fri9-p1 7:29", "unknown", "Chicago Distortion", "snap", "center", "", "TonTon 1 – Distortion 1 in progress"],
  ["3", "clip fri9-p1 7:39", "unknown", "Chicago Distortion", "bunkered", "unknown", "Bunkered by TonTon dorito push. TonTon win point. " + F9_INC, "TonTon 2 – Distortion 1"],
  ["4", "clip fri9-p1 8:10", "unknown", "Chicago Distortion", "laned off break", "snake", "Point 4 starts TT 2–1 at clock 12:32.", "TonTon 2 – Distortion 1 in progress"],
  ["4", "clip fri9-p1 8:11", "unknown", "TonTon Arsenal", "laned off break", "dorito", "", "TonTon 2 – Distortion 1 in progress"],
  ["4", "clip fri9-p1 8:13", "unknown", "Chicago Distortion", "snap", "center", "", "TonTon 2 – Distortion 1 in progress"],
  ["4", "clip fri9-p1 8:23", "unknown", "Chicago Distortion", "snap", "dorito", "", "TonTon 2 – Distortion 1 in progress"],
  ["4", "clip fri9-p1 8:28", "unknown", "Chicago Distortion", "bunkered", "back", "Bunkered by TonTon snake runner. TonTon win point. " + F9_INC, "TonTon 3 – Distortion 1"],
  ["5", "clip fri9-p1 8:51", "unknown", "TonTon Arsenal", "laned off break", "dorito", "Point 5 starts TT 3–1 at clock 11:58.", "TonTon 3 – Distortion 1 in progress"],
  ["5", "clip fri9-p1 8:53", "unknown", "Chicago Distortion", "laned off break", "snake", "", "TonTon 3 – Distortion 1 in progress"],
  ["5", "clip fri9-p1 8:56", "unknown", "Chicago Distortion", "snap", "dorito", "", "TonTon 3 – Distortion 1 in progress"],
  ["5", "clip fri9-p1 9:00", "unknown", "TonTon Arsenal", "snap", "center", "", "TonTon 3 – Distortion 1 in progress"],
  ["5", "clip fri9-p1 9:05", "unknown", "Chicago Distortion", "shot", "center", "Shot from TonTon snake. TonTon win point. " + F9_INC, "TonTon 4 – Distortion 1"],
  ["6", "clip fri9-p1 10:07", "unknown", "Chicago Distortion", "laned off break", "dorito", "Point 6 starts TT 4–1 at clock 11:18.", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clip fri9-p1 10:08", "unknown", "TonTon Arsenal", "laned off break", "snake", "", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clip fri9-p1 10:10", "unknown", "TonTon Arsenal", "snap", "center", "", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clip fri9-p1 10:33", "unknown", "TonTon Arsenal", "snap", "snake", "", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clip fri9-p1 10:45", "unknown", "TonTon Arsenal", "bunkered", "back", "Bunkered by Distortion snake runner. Distortion win point, 4–2. fri9-g1 (VOD ~24:00–30:55, match clock) covers this same point (from TonTon 4–1) and reads a TonTon player buzzing; the scorebug then showed TonTon 4–Distortion 2 and still read 4–2 at 10:29 game clock (seek 30:56). RESULT VERIFY: Distortion win per bug vs TonTon buzzer (possible penalty or graphics error). g1 Distortion snake 11:08 (diving in off the break) not added: may be the existing off-break dorito row and would be a 6th Distortion out (cap), VERIFY. This is not the p3 gap: P7 (TT 4–2 → 5–2) is still uncaptured." + F9_INC, "TonTon 4 – Distortion 2 (result VERIFY)"],
  ["6", "clock 11:02", "unknown", "Chicago Distortion", "unknown", "center", "Source fri9-g1 salvage, match clock.", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clock 10:58", "unknown", "Chicago Distortion", "unknown", "back dorito", "Source fri9-g1, match clock.", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clock 10:50", "unknown", "Chicago Distortion", "unknown", "mid dorito", "Source fri9-g1, match clock.", "TonTon 4 – Distortion 1 in progress"],
  ["6", "clock 10:42", "unknown", "Chicago Distortion", "unknown", "back center", "Source fri9-g1, match clock. 5th Distortion out (cap). TonTon buzzer per g1; bug says Distortion point (VERIFY).", "TonTon 4 – Distortion 2 (result VERIFY)"],
]));

function upi(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Seattle Uprising vs Detroit Infamous (Sat Set 2)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function xfc(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "San Antonio X-Factor vs CK Hurricanes (Sat Set 2)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}


function dmj(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Tampa Bay Damage vs Atlanta Jungle Cats (Sat Set 3)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function h(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Houston Heat vs Atlanta Jungle Cats (Sat Set 1)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function c(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "Chicago Aftershock vs New York Xtreme (Sat Set 1)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function n(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: "Semi-Pro / D1 Xball", match: "Noobies vs Clutch City Oilers (D1 Semi-Pro OT)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function w(timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: "Semi-Pro / D1 Xball", match: "Wrecking Crew vs Ikonik (D1 Semi-Pro)", point: "?", timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

function f(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: DIV, match: "PaintballFIT vs New York Xtreme (Sat Set 3)", point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter };
}

// Fri Set 9 part 4 (fri9-p4) appended 2026-11-01 04:50 ET. Scorebug verified on frames at 0:02 (Dis 2–TT 5), 6:12 (Lev 5–Dyn 4), 10:56 (Dyn 5–Lev 5). Player IDs not readable per elim. Dyn/Lev pts 6–8 and TT/Dis pt 7 fall in the held p3 window (gap).
ROWS.push(...f9("TonTon Arsenal vs Chicago Distortion (Fri Set 9 MLPB+)", [
  ["7", "clock 10:28", "unknown", "Chicago Distortion", "unknown", "back center/snake", "Source fri9-partg2 (VOD 30:56–42:56), match clock. Fills held p3 gap: P7 starts TT 4–Dis 2 (score after P6 still VERIFY).", "TonTon 4 – Distortion 2 in progress"],
  ["7", "clock 9:48", "unknown", "Chicago Distortion", "unknown", "center", "Source fri9-partg2, match clock.", "TonTon 4 – Distortion 2 in progress"],
  ["7", "clock 9:36", "unknown", "Chicago Distortion", "shot", "dorito", "Source fri9-partg2, match clock.", "TonTon 4 – Distortion 2 in progress"],
  ["7", "clock 9:23", "unknown", "Chicago Distortion", "unknown", "back right", "Source fri9-partg2, match clock.", "TonTon 4 – Distortion 2 in progress"],
  ["7", "clock 9:06", "unknown", "Chicago Distortion", "shot", "snake", "Source fri9-partg2, match clock. 5th Distortion out (cap). TonTon hang; TonTon win point.", "TonTon 5 – Distortion 2"],
  ["8", "clip fri9-p4 1:13", "unknown", "TonTon Arsenal", "laned off break", "dorito", "Point 8 starts TT 5–Dis 2 (scorebug, timeout graphic). Pt 7 now filled from fri9-partg2. fri9-partg2 TonTon outs at back center 8:42, dorito 7:59 (shot moving) and center 6:39 (shot running) taken as the same outs as this point's TonTon rows (already 5 TonTon outs, cap), so not added (VERIFY).", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clock 8:46", "unknown", "Chicago Distortion", "unknown", "back left/dorito", "Source fri9-partg2, match clock. May be the same out as this point's clip 1:42 center row (VERIFY).", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clip fri9-p4 1:42", "unknown", "Chicago Distortion", "snap", "center", "", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clip fri9-p4 1:50", "unknown", "TonTon Arsenal", "snap", "center", "", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clip fri9-p4 2:05", "unknown", "TonTon Arsenal", "snap", "dorito", "", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clip fri9-p4 2:37", "unknown", "TonTon Arsenal", "snap", "snake", "", "TonTon 5 – Distortion 2 in progress"],
  ["8", "clip fri9-p4 3:45", "unknown", "TonTon Arsenal", "bunkered", "center", "Bunkered/run-through by Distortion #89 Szpytma (VERIFY name). Distortion win point. CONFLICT VERIFY: fri9-partg2 says Distortion #7 Matthew Askren (Distortion roster) hung the flag. " + F9_INC, "TonTon 5 – Distortion 3"],
  ["9", "clip fri9-p4 7:11", "unknown", "Chicago Distortion", "laned off break", "dorito", "Point 9 starts TT 5–3.", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 7:14", "unknown", "Chicago Distortion", "laned off break", "center", "", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 7:35", "unknown", "TonTon Arsenal", "snap", "snake", "", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 7:49", "unknown", "TonTon Arsenal", "snap", "dorito", "", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 8:00", "unknown", "TonTon Arsenal", "snap", "center", "", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 8:18", "unknown", "TonTon Arsenal", "snap", "snake", "", "TonTon 5 – Distortion 3 in progress"],
  ["9", "clip fri9-p4 8:22", "unknown", "Chicago Distortion", "bunkered", "snake", "Run-through late point; TonTon hang buzzer 8:30. TonTon win point. fri9-g3 salvage (VOD ~42:55–48:55, match clock) confirms TonTon 6–3 (SCORES graphic 'Chicago Distortion 3 – TonTon Arsenal 6'; hang not shown). g3 TonTon outs at 5:27 snake side and 5:06 back center/dorito taken as this point's existing snake/dorito rows; adding them would make 6 TonTon outs (cap), VERIFY. OPEN GAP VERIFY: g3 feed froze at TonTon 6–3 with #703 Portier and #7 Anfossi in the box (both on the TonTon roster, not Distortion as the feed note said, VERIFY). Not recaptured (Rob's speed rule)." + F9_INC, "TonTon 6 – Distortion 3"],
  ["10", "clip fri9-p4 11:53", "unknown", "Chicago Distortion", "laned off break", "center", "Point 10 starts TT 6–3; clip ends mid-point at 11:59, continues in p5.", "TonTon 6 – Distortion 3 in progress"],
]));
ROWS.push(...f9("San Diego Dynasty vs New Jersey Leverage (Fri Set 9 MLPB+)", [
  ["9", "clip fri9-p4 4:50", "unknown", "San Diego Dynasty", "laned off break", "dorito", "Point 9 starts Lev 5–Dyn 3. Pts 7–8 filled from fri9-g1. fri9-partg2 (VOD 30:56–42:56) reads this point as 3–5 → 4–5 with Urena hanging: Leverage center 4:05 (shot), Dynasty dorito 3:45 (shot) and Leverage dorito 3:43, all taken as this point's existing rows (not added). POINT # VERIFY: fri9-partg2 has an extra point before this one (see the penalty-point rows labeled 9 above).", "Dynasty 3 – Leverage 5 in progress"],
  ["9", "clip fri9-p4 5:04", "unknown", "San Diego Dynasty", "laned off break", "center", "", "Dynasty 3 – Leverage 5 in progress"],
  ["9", "clip fri9-p4 5:37", "unknown", "New Jersey Leverage", "snap", "center", "", "Dynasty 3 – Leverage 5 in progress"],
  ["9", "clip fri9-p4 5:44", "unknown", "New Jersey Leverage", "snap", "snake", "", "Dynasty 3 – Leverage 5 in progress"],
  ["9", "clip fri9-p4 5:53", "unknown", "New Jersey Leverage", "snap", "snake", "", "Dynasty 3 – Leverage 5 in progress"],
  ["9", "clip fri9-p4 6:01", "unknown", "New Jersey Leverage", "snap", "dorito", "Dynasty #79 Urena hangs buzzer 6:08. Dynasty win point (scorebug flashed 4–4 at 6:10, corrected to Lev 5–Dyn 4 at 6:11). " + F9_INC, "Dynasty 4 – Leverage 5"],
  ["10", "clip fri9-p4 9:35", "unknown", "New Jersey Leverage", "laned off break", "snake", "Point 10 starts Lev 5–Dyn 4.", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clip fri9-p4 9:47", "unknown", "New Jersey Leverage", "laned off break", "center", "", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clip fri9-p4 10:04", "unknown", "San Diego Dynasty", "snap", "dorito", "", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clip fri9-p4 10:14 | g3 clock 2:22", "Kyle Barry", "#3 San Diego Dynasty", "snap", "snake (g3: back left/snake)", "fri9-g3 film read full name BARRY at 2:22 back left/snake; Kyle Barry is on the Dynasty roster (high-confidence match). Mapped to this existing snake out rather than added as a new row. CONFLICT VERIFY: this point's p4 note credits Barry with the buzzer hang.", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clock 3:15", "Dynasty #16 (O'Hara on graphic, name VERIFY)", "#16 San Diego Dynasty", "unknown", "behind center bunker", "Source fri9-g3 salvage (VOD ~42:55–48:55), match clock. No O'Hara is on any Pro roster, so the name is VERIFY (not mapped to Thomas Hara, who is Red Legion).", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clip fri9-p4 10:20", "unknown", "New Jersey Leverage", "snap", "dorito", "", "Dynasty 4 – Leverage 5 in progress"],
  ["10", "clip fri9-p4 10:35", "unknown", "New Jersey Leverage", "snap", "center", "Dynasty #3 Barry hangs buzzer 10:41. Dynasty win point, 5–5; fri9-g3 SCORES graphic confirms 5–5 (hang not shown). CONFLICT VERIFY: g3 has Barry eliminated at 2:22. " + F9_INC, "Dynasty 5 – Leverage 5"],
]));
// Fri Set 9 part 5 (fri9-p5) appended 2026-11-01 04:55 ET. Scorebug verified on frames at 0:15 (TT 7–Dis 3, so TonTon won pt 10), 4:20 (Lev 5–Dyn 6), 6:10 (Dis 3–TT 8). Set 9 VOD ended and MLPB+ autoplayed Fri Set 7 at clip 8:25; nothing after 8:25 (or in fri9-part6) is Set 9. No FINAL graphic seen; last points FINAL VERIFY.
ROWS.push(...f9("San Diego Dynasty vs New Jersey Leverage (Fri Set 9 MLPB+)", [
  ["11", "clip fri9-p5 1:18", "unknown", "New Jersey Leverage", "bunkered", "center", "Point 11 starts 5–5.", "Dynasty 5 – Leverage 5 in progress"],
  ["11", "clip fri9-p5 1:23", "unknown", "New Jersey Leverage", "shot", "back", "", "Dynasty 5 – Leverage 5 in progress"],
  ["11", "clip fri9-p5 1:25", "unknown", "New Jersey Leverage", "shot", "snake", "", "Dynasty 5 – Leverage 5 in progress"],
  ["11", "clip fri9-p5 1:34", "unknown", "New Jersey Leverage", "shot", "dorito", "", "Dynasty 5 – Leverage 5 in progress"],
  ["11", "clip fri9-p5 1:50", "unknown", "New Jersey Leverage", "bunkered", "center", "Run-through bunker by Dynasty.", "Dynasty 5 – Leverage 5 in progress"],
  ["11", "clip fri9-p5 1:50", "unknown", "San Diego Dynasty", "trade", "center", "Bunkering Dynasty player traded out. Penalty flag seen on replay 2:30 (detail unclear). Dynasty win point. " + F9_INC, "Dynasty 6 – Leverage 5"],
  ["12", "clip fri9-p5 5:05", "unknown", "New Jersey Leverage", "laned off break", "snake", "Point 12 starts Dyn 6–Lev 5, clock 0:43 (scorebug).", "Dynasty 6 – Leverage 5 in progress"],
  ["12", "clip fri9-p5 5:07", "unknown", "New Jersey Leverage", "laned off break", "back", "", "Dynasty 6 – Leverage 5 in progress"],
  ["12", "clip fri9-p5 5:12", "unknown", "New Jersey Leverage", "shot", "dorito", "", "Dynasty 6 – Leverage 5 in progress"],
  ["12", "clip fri9-p5 5:14", "unknown", "New Jersey Leverage", "shot", "back", "", "Dynasty 6 – Leverage 5 in progress"],
  ["12", "clip fri9-p5 5:17", "unknown", "New Jersey Leverage", "shot", "back", "Dynasty win point; scorebug Lev 5–Dyn 7 at 6:07. Last point seen before VOD end; FINAL Dynasty 7–5 VERIFY (no FINAL graphic). OPEN GAP VERIFY: g3 last filmed Dynasty 5–5; P11–P12 rest on p5 only; not recaptured (speed rule). FINAL Dynasty 7–5 stays VERIFY. " + F9_INC, "Dynasty 7 – Leverage 5"],
]));
ROWS.push(...f9("TonTon Arsenal vs Chicago Distortion (Fri Set 9 MLPB+)", [
  ["11", "clip fri9-p5 3:17", "unknown", "Chicago Distortion", "shot", "center", "Point 10 ended TonTon win (scorebug TT 7–Dis 3 at 0:12). Point 11 starts TT 7–3.", "TonTon 7 – Distortion 3 in progress"],
  ["11", "clip fri9-p5 3:35", "unknown", "Chicago Distortion", "shot", "dorito", "", "TonTon 7 – Distortion 3 in progress"],
  ["11", "clip fri9-p5 3:38", "unknown", "Chicago Distortion", "shot", "back", "", "TonTon 7 – Distortion 3 in progress"],
  ["11", "clip fri9-p5 3:41", "unknown", "Chicago Distortion", "shot", "snake", "TonTon hang buzzer 3:46. TonTon win point. " + F9_INC, "TonTon 8 – Distortion 3"],
  ["12", "clip fri9-p5 6:41", "unknown", "Chicago Distortion", "laned off break", "center", "Point 12 starts TT 8–Dis 3.", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 6:43", "unknown", "Chicago Distortion", "laned off break", "dorito", "", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 6:46", "unknown", "TonTon Arsenal", "shot", "snake", "", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 6:48", "unknown", "Chicago Distortion", "shot", "snake", "Distortion player dove into snake (replay 6:50).", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 7:09", "unknown", "Chicago Distortion", "shot", "dorito", "", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 7:11", "unknown", "TonTon Arsenal", "shot", "dorito", "", "TonTon 8 – Distortion 3 in progress"],
  ["12", "clip fri9-p5 7:30", "unknown", "Chicago Distortion", "shot", "back", "TonTon hang buzzer 7:31. TonTon win point; scorebug not updated before VOD end, so 9–3 and FINAL VERIFY. OPEN GAP VERIFY: g3 last filmed TonTon 6–3 before freezing; P10–P12 rest on p4/p5 only; not recaptured (speed rule). FINAL TonTon 9–3 stays VERIFY. " + F9_INC, "TonTon 9 – Distortion 3"],
]));

// Fri Set 10 — Impact vs Ironmen + Collision vs Red Legion (fri10-p1/p2; players unknown; clip time, not match clock). Appended 2026-11-01 ET.
const F10_SRC = "MLPB+ Fri Set 10 (fri10), clip time; film-only; dual-feed. ";
const F10_RB = "Ironmen/Red Legion both red/black, team VERIFY. ";
const F10_MB = "Multiple breakouts at frozen 2–1 graphic; may be several points or replays; point split VERIFY. ";
function f10(m: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: DIV, match: m, point, timestamp, playerOut, jersey, elimType, area,
    notes: F10_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...f10("Edmonton Impact vs Los Angeles Ironmen (Fri Set 10 MLPB+)", [
  ["1", "clip fri10-p1 0:27", "unknown", "Edmonton Impact", "laned off break", "back center", "Point 1 starts 0–0 at clock 14:39.", "Impact 0 – Ironmen 0 in progress"],
  ["1", "clip fri10-p1 1:05", "unknown", "Edmonton Impact", "snap", "dorito", "", "Impact 0 – Ironmen 0 in progress"],
  ["1", "clip fri10-p1 1:13", "unknown", "Los Angeles Ironmen", "bunkered", "snake", F10_RB, "Impact 0 – Ironmen 0 in progress"],
  ["1", "clip fri10-p1 1:29", "unknown", "Edmonton Impact", "bunkered", "snake", "", "Impact 0 – Ironmen 0 in progress"],
  ["1", "clip fri10-p1 1:49", "unknown", "Edmonton Impact", "bunkered", "back center", "", "Impact 0 – Ironmen 0 in progress"],
  ["1", "clip fri10-p1 2:15", "unknown", "Edmonton Impact", "bunkered", "snake", "Ironmen win point (graphic 1–0 at 12:38).", "Impact 0 – Ironmen 1"],
  ["2", "clip fri10-p1 5:49", "unknown", "Edmonton Impact", "laned off break", "snake", "Point 2 starts 1–0 at clock 12:38.", "Impact 0 – Ironmen 1 in progress"],
  ["2", "clip fri10-p1 5:54", "unknown", "Edmonton Impact", "bunkered", "dorito", "", "Impact 0 – Ironmen 1 in progress"],
  ["2", "clip fri10-p1 6:02", "unknown", "Los Angeles Ironmen", "bunkered", "snake", F10_RB, "Impact 0 – Ironmen 1 in progress"],
  ["2", "clip fri10-p1 6:16", "unknown", "Edmonton Impact", "laned off break", "center", "", "Impact 0 – Ironmen 1 in progress"],
  ["2", "clip fri10-p1 6:27", "unknown", "Edmonton Impact", "bunkered", "snake", "", "Impact 0 – Ironmen 1 in progress"],
  ["2", "clip fri10-p1 6:47", "unknown", "Edmonton Impact", "bunkered", "snake", "Graphic still 1–0 at 10:29 next point; pt2 result VERIFY (possible replay/overlap).", "Impact 0 – Ironmen 1 (result VERIFY)"],
  ["3", "clip fri10-p1 7:56", "unknown", "Edmonton Impact", "laned off break", "dorito", "Point 3 starts 1–0 at clock 10:29.", "Impact 0 – Ironmen 1 in progress"],
  ["3", "clip fri10-p1 8:08", "unknown", "Edmonton Impact", "bunkered", "snake", "Ironmen win point (graphic 2–0 at 9:45).", "Impact 0 – Ironmen 2"],
  ["4", "clip fri10-p1 10:48", "unknown", "Edmonton Impact", "snap", "snake", "Point 4 starts 2–0 at clock 9:45.", "Impact 0 – Ironmen 2 in progress"],
  ["4", "clip fri10-p1 10:53", "unknown", "Los Angeles Ironmen", "snap", "center", F10_RB + "End of point not recorded (chunk boundary). Impact win point (graphic 2–1 at 8:51, fri10-p2 0:04).", "Impact 1 – Ironmen 2"],
  ["5", "clip fri10-p2 4:41", "unknown", "Edmonton Impact", "laned off break", "center", F10_MB + "Point 5 starts 2–1 (graphic 2–1 from fri10-p2 4:33 through clock 3:22; breakouts at 4:33, 5:30, 7:39, 9:11, 10:06).", "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 4:45", "unknown", "Los Angeles Ironmen", "laned off break", "snake", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 5:04", "unknown", "Edmonton Impact", "snap", "dorito", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 5:12", "unknown", "Los Angeles Ironmen", "bunkered", "dorito", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 5:38", "unknown", "Los Angeles Ironmen", "bunkered", "snake", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 5:43", "unknown", "Edmonton Impact", "laned off break", "dorito", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 6:29", "unknown", "Los Angeles Ironmen", "laned off break", "snake", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 6:34", "unknown", "Edmonton Impact", "bunkered", "center", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 6:49", "unknown", "Edmonton Impact", "bunkered", "dorito", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 7:15", "unknown", "Los Angeles Ironmen", "bunkered", "center", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 7:51", "unknown", "Edmonton Impact", "laned off break", "snake", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 8:26", "unknown", "Los Angeles Ironmen", "bunkered", "dorito", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 8:36", "unknown", "Edmonton Impact", "bunkered", "center", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 8:53", "unknown", "Edmonton Impact", "bunkered", "dorito", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 9:21", "unknown", "Los Angeles Ironmen", "laned off break", "snake", F10_RB + F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 9:27", "unknown", "Edmonton Impact", "bunkered", "center", F10_MB, "Impact 1 – Ironmen 2 in progress"],
  ["5", "clip fri10-p2 10:14", "unknown", "Edmonton Impact", "laned off break", "snake", F10_MB + "Graphic Impact 1–3 Ironmen at fri10-p2 10:34; Ironmen credited point VERIFY.", "Impact 1 – Ironmen 3 (VERIFY)"],
  ["6", "clip fri10-p3 07:31", "unknown", "Edmonton Impact", "unknown", "back center", "Point 6 starts Ironmen 3–1 (graphic at 2:54). Breakout 01:22, no elims seen until 07:31; possible missing elims.", "Impact 1 – Ironmen 3 in progress"],
  ["6", "clip fri10-p3 08:15", "unknown", "Edmonton Impact", "unknown", "dorito", "", "Impact 1 – Ironmen 3 in progress"],
  ["6", "clip fri10-p3 08:21", "unknown", "Edmonton Impact", "unknown", "snake", "Ironmen win point (graphic 4–1 at 1:10).", "Impact 1 – Ironmen 4"],
  ["FINAL", "clip fri10-p3 11:27", "unknown", "Edmonton Impact", "unknown", "snake", "Point 7 starts 4–1 (graphic at 1:09). p4 00:06–07:16 frozen frame (box stall). OPEN GAP VERIFY: stall window not recaptured (speed rule); any elims in it are missing.", "Impact 1 – Ironmen 4 in progress"],
  ["FINAL", "clip fri10-p3 11:34", "unknown", "Edmonton Impact", "unknown", "dorito", "Ironmen buzzer at fri10-p4 00:03; graphic \"1 0:06 5\" = Ironmen 5–1. FINAL Ironmen 5–1 Impact (graphic at 0:06; no FINAL graphic seen; VERIFY).", "Impact 1 – Ironmen 5 FINAL (VERIFY)"],
]));
ROWS.push(...f10("Los Angeles Collision vs Red Legion (Fri Set 10 MLPB+)", [
  ["1", "clip fri10-p1 4:09", "unknown", "Red Legion", "laned off break", "center", F10_RB + "Point 1 starts 0–0 at clock 14:57.", "Collision 0 – Red Legion 0 in progress"],
  ["1", "clip fri10-p1 4:24", "unknown", "Red Legion", "snap", "snake", F10_RB, "Collision 0 – Red Legion 0 in progress"],
  ["1", "clip fri10-p1 4:25", "unknown", "Red Legion", "snap", "dorito", F10_RB + "Collision win point (graphic 1–0 at 14:09).", "Collision 1 – Red Legion 0"],
  ["2", "clip fri10-p1 9:19", "unknown", "Red Legion", "laned off break", "dorito", F10_RB + "Point 2 starts 1–0.", "Collision 1 – Red Legion 0 in progress"],
  ["2", "clip fri10-p1 9:30", "unknown", "Red Legion", "laned off break", "snake", F10_RB, "Collision 1 – Red Legion 0 in progress"],
  ["2", "clip fri10-p1 9:35", "unknown", "Los Angeles Collision", "laned off break", "center", "Collision win point (graphic 2–0 at 13:07).", "Collision 2 – Red Legion 0"],
  ["3", "clip fri10-p2 0:21", "unknown", "Red Legion", "laned off break", "center", F10_RB + "Point 3 starts 2–0.", "Collision 2 – Red Legion 0 in progress"],
  ["3", "clip fri10-p2 0:32", "unknown", "Los Angeles Collision", "snap", "center", "", "Collision 2 – Red Legion 0 in progress"],
  ["3", "clip fri10-p2 0:53", "unknown", "Red Legion", "bunkered", "snake", F10_RB, "Collision 2 – Red Legion 0 in progress"],
  ["3", "clip fri10-p2 1:14", "unknown", "Red Legion", "snap", "dorito", F10_RB, "Collision 2 – Red Legion 0 in progress"],
  ["3", "clip fri10-p2 1:22", "unknown", "Los Angeles Collision", "bunkered", "dorito", "Collision win point (graphic 3–0 at 11:49).", "Collision 3 – Red Legion 0"],
  ["4", "clip fri10-p2 11:42", "unknown", "Red Legion", "laned off break", "snake", F10_RB + "Point 4 starts 3–0 at clock 11:41. 7-sec point, VERIFY. Collision win point (graphic 4–0 at 11:34).", "Collision 4 – Red Legion 0"],
  ["5", "clip fri10-p3 09:24", "unknown", "Red Legion", "unknown", "back center", F10_RB + "Point 5 starts Collision 4–0 (graphic at 11:34). Graphic says RL won despite 3 RL out first; winner VERIFY.", "Collision 4 – Red Legion 0 in progress"],
  ["5", "clip fri10-p3 09:29", "unknown", "Red Legion", "unknown", "snake corner", F10_RB + "Winner VERIFY.", "Collision 4 – Red Legion 0 in progress"],
  ["5", "clip fri10-p3 09:33", "unknown", "Red Legion", "unknown", "dorito", F10_RB + "Winner VERIFY.", "Collision 4 – Red Legion 0 in progress"],
  ["5", "clip fri10-p3 10:06", "unknown", "Los Angeles Collision", "unknown", "center bunker", "Winner VERIFY.", "Collision 4 – Red Legion 0 in progress"],
  ["5", "clip fri10-p3 10:10", "unknown", "Los Angeles Collision", "unknown", "dorito", "Red Legion win point per graphic 4–1 at 10:42; winner VERIFY (3 RL out first).", "Collision 4 – Red Legion 1 (VERIFY)"],
  ["6", "clip fri10-p4 08:29", "unknown", "Red Legion", "unknown", "back", F10_RB + "Point 6 starts 4–1 (graphic at 10:40).", "Collision 4 – Red Legion 1 in progress"],
  ["6", "clip fri10-p4 08:54", "unknown", "Los Angeles Collision", "unknown", "back center", "", "Collision 4 – Red Legion 1 in progress"],
  ["6", "clip fri10-p4 09:05", "unknown", "Los Angeles Collision", "unknown", "snake", "", "Collision 4 – Red Legion 1 in progress"],
  ["6", "clip fri10-p4 09:25", "unknown", "Red Legion", "unknown", "dorito", F10_RB + "Collision win point (graphic 5–1 at 9:15).", "Collision 5 – Red Legion 1"],
  ["7", "clip fri10-p4 10:29", "unknown", "Los Angeles Collision", "unknown", "back", "Point 7 starts 5–1 VERIFY (graphic at 9:14 reads 4–1, conflicting).", "Collision 5 – Red Legion 1 in progress (VERIFY)"],
  ["7", "clip fri10-p4 10:39", "unknown", "Red Legion", "unknown", "snake corner", F10_RB, "Collision 5 – Red Legion 1 in progress (VERIFY)"],
  ["7", "clip fri10-p4 10:55", "unknown", "Red Legion", "unknown", "back center", F10_RB, "Collision 5 – Red Legion 1 in progress (VERIFY)"],
  ["7", "clip fri10-p4 11:21", "unknown", "Los Angeles Collision", "unknown", "dorito", "", "Collision 5 – Red Legion 1 in progress (VERIFY)"],
  ["7", "clip fri10-p4 11:24", "unknown", "Red Legion", "unknown", "snake", F10_RB + "Continues into p5.", "Red Legion win, 5–2 (graphic at p5 0:35, 7:35)"],
  ["8", "clip fri10-p5 2:39", "unknown", "Los Angeles Collision", "unknown", "dorito", "Point 8 starts 5–2 at 7:35. Game clock frozen 7:35; p5 3:29–4:54 frozen/break stretch (OPEN GAP VERIFY: not recaptured, speed rule); point result VERIFY (likely Collision 6–2 per graphic; graphic flashed 3–5 at drone cut).", "Collision 5 – Red Legion 2 in progress"],
  ["8", "clip fri10-p5 2:44", "unknown", "Los Angeles Collision", "unknown", "unknown", "Game clock frozen 7:35; point result VERIFY.", "Collision 5 – Red Legion 2 in progress"],
  ["8", "clip fri10-p5 2:48", "unknown #16", "Los Angeles Collision", "unknown", "unknown", "Jersey #16 from film. Point result VERIFY (likely Collision 6–2 per graphic at p5 4:55).", "Collision 6 – Red Legion 2 (VERIFY)"],
  ["9", "clip fri10-p5 8:52", "unknown", "unknown", "no elims seen", "unknown", "Placeholder row, no elim. Aborted breakout at p5 8:52 restarted 9:33; point over by 9:50; elims not shown.", "Collision win, 7–2 (graphic 7:26)"],
  ["10", "clip fri10-p6 4:11", "unknown", "Red Legion", "unknown", "snake", F10_RB + "Breakout p5 11:48; long point.", "Collision 7 – Red Legion 2 in progress"],
  ["10", "clip fri10-p6 5:27", "unknown", "Los Angeles Collision", "unknown", "dorito", "Breakout p5 11:48; long point.", "Red Legion win, 7–3 (graphic 6:07)"],
  ["11", "clip fri10-p6 7:23", "unknown", "Red Legion", "unknown", "dorito", F10_RB, "Collision 7 – Red Legion 3 in progress"],
  ["11", "clip fri10-p6 7:28", "unknown", "Los Angeles Collision", "unknown", "snake", "", "Collision 7 – Red Legion 3 in progress"],
  ["11", "clip fri10-p6 7:31", "unknown", "Los Angeles Collision", "unknown", "center", "", "Collision 7 – Red Legion 3 in progress"],
  ["11", "clip fri10-p6 7:33", "unknown", "Los Angeles Collision", "unknown", "dorito", "", "Collision 7 – Red Legion 3 in progress"],
  ["11", "clip fri10-p6 8:28", "unknown", "Los Angeles Collision", "unknown", "snake", "Red Legion buzzer p6 8:56.", "Red Legion win, 7–4 (graphic 5:23)"],
  ["12", "clip fri10-p6 9:51", "unknown", "Los Angeles Collision", "unknown", "snake", "", "Collision 7 – Red Legion 4 in progress"],
  ["12", "clip fri10-p6 9:53", "unknown", "Los Angeles Collision", "unknown", "center", "", "Collision 7 – Red Legion 4 in progress"],
  ["12", "clip fri10-p6 9:58", "unknown", "Red Legion", "unknown", "snake", F10_RB, "Collision 7 – Red Legion 4 in progress"],
  ["12", "clip fri10-p6 10:02", "unknown", "Los Angeles Collision", "unknown", "dorito", "", "Collision 7 – Red Legion 4 in progress"],
  ["12", "clip fri10-p6 10:08", "unknown", "Los Angeles Collision", "unknown", "center", "Red Legion buzzer p6 10:14, no graphic, VERIFY. Continues in p7+; match not final. Next graphic shows 7–6 (p7 0:17).", "Red Legion win, 7–5 (buzzer, VERIFY)"],
  ["13", "clip fri10-p7 0:38", "unknown", "Los Angeles Collision", "unknown", "far snake", "p6/p7 boundary gap: one RL point not seen. OPEN GAP VERIFY: not recaptured (speed rule); the RL point-13 boundary and point numbers stay VERIFY. Point 13 starts 7–6 (graphic 7–6 at 4:21).", "Collision 7 – Red Legion 6 in progress"],
  ["13", "clip fri10-p7 1:26", "unknown", "Los Angeles Collision", "unknown", "deep snake (crawl)", "", "Collision 7 – Red Legion 6 in progress"],
  ["13", "clip fri10-p7 1:33", "unknown", "Los Angeles Collision", "unknown", "center", "", "Collision 7 – Red Legion 6 in progress"],
  ["13", "clip fri10-p7 1:53", "unknown", "Los Angeles Collision", "unknown", "center-right can", "Walked off. Red Legion buzzer p7 2:07 (graphic 7–7 at 2:36). Name graphic PRIHIDNI at p7 3:34, team VERIFY.", "Red Legion win, 7–7"],
  ["14", "clip fri10-p7 4:18", "unknown", "Los Angeles Collision", "unknown", "center (run)", "Point 14 starts 7–7 (graphic at 2:35).", "Collision 7 – Red Legion 7 in progress"],
  ["14", "clip fri10-p7 4:47", "unknown", "Los Angeles Collision", "unknown", "right (diving)", "", "Collision 7 – Red Legion 7 in progress"],
  ["14", "clip fri10-p7 4:56", "unknown", "Los Angeles Collision", "unknown", "left", "Walked off. Red Legion win (graphic 8–7 at 1:53). Name graphic 'SOLNISHKOV' at p7 5:06 = Sergey Solnyshkov (Red Legion #23, PBLeagues confirmed); not the eliminated player.", "Red Legion win, 8–7"],
  ["15", "clip fri10-p7 8:14", "unknown", "Los Angeles Collision", "unknown", "far snake", "Point 15 starts RL 8–7 (graphic at 1:49).", "Collision 7 – Red Legion 8 in progress"],
  ["15", "clip fri10-p7 8:23", "unknown", "Los Angeles Collision", "unknown", "center bunker", "", "Collision 7 – Red Legion 8 in progress"],
  ["15", "clip fri10-p7 8:42", "unknown", "Los Angeles Collision", "unknown", "center (run)", "Red Legion win (graphic 9–7 at 1:06).", "Red Legion win, 9–7"],
  ["FINAL", "clip fri10-p7 11:56", "unknown", "Los Angeles Collision", "no elims seen", "", "Point began 9–7 with 0:04 left (p7 11:56); recording ended. FINAL Red Legion 9–7 Collision presumed (VERIFY; last 4 sec not captured). OPEN GAP VERIFY: Set 10 stall windows and the p6/p7 RL boundary point not recaptured (speed rule).", "FINAL Red Legion 9 – Collision 7 (VERIFY)"],
]));
const S5_SRC = "MLPB+ Sun Set 5 (sun5), clip time; film-only; game in progress (parts 1–2 only). ";
function s5(m: string, raw: string[][]): Elim[] {
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: "Semi-Pro — Sun Set 5", match: m, point, timestamp, playerOut, jersey, elimType, area,
    notes: S5_SRC + notes, scoreAfter,
  }));
}
ROWS.push(...s5("Noobies vs New Jersey Jesters (Sun Set 5 MLPB+)", [
  ["1", "clip sun5-p1 1:30", "unknown (teal/black)", "Noobies", "unknown", "breakout mid-left", "Off the break; how unreadable, VERIFY. Noobies teal/black, NJJ blue/orange.", "Noobies 0 – NJJ 0 in progress"],
  ["1", "clip sun5-p1 2:14", "Rodriguez", "Noobies #33", "bunkered/run-through", "dorito, behind tall cylinder", "Name from graphic RODRIGUEZ; spelling VERIFY. NJJ win point 1.", "Noobies 0 – NJJ 1"],
  ["3", "clip sun5-p2 8:09", "Schoemaker", "Noobies #20", "unknown", "back right / dorito side", "Point 2: drone view, no readable elims; NJJ won (2–0), no rows. Name from graphic SCHOEMAKER; spelling VERIFY; how unreadable. Noobies win point 3.", "Noobies 1 – NJJ 2 in progress"],
  ["4", "clip sun5-p3a 5:09", "Kutzler", "Noobies #57", "unknown", "snake side", "Name from graphic KUTZLER; film-only, spelling VERIFY. Noobies teal/black; walked off, how unreadable. Noobies win point 4.", "Noobies 2 – NJJ 2"],
  ["6", "clip sun5-p4 4:25", "Walter", "Noobies #13", "unknown", "dorito side", "Point 5: clip opens mid-point, no elims seen; NJJ won (NJJ 3–2), no rows. Name from graphic WALTER; film-only, spelling VERIFY; how unreadable. NJJ win point 6.", "Noobies 2 – NJJ 4"],
  ["7", "clip sun5-p4 7:23", "unknown", "Noobies #9", "penalty", "dorito side", "Penalty flag thrown at his bunker; multiple Noobies then walked off for penalty (not recorded individually, VERIFY). Point 7 winner unknown: video frozen p4 9:06–11:59, recapture needed.", "Noobies 2 – NJJ 4 in progress"],
]));
ROWS.push(...s5("Puerto Rico tppcrew vs Las Vegas Shock (Sun Set 5 MLPB+)", [
  ["1", "clip sun5-p1 5:07", "unknown (black/gold)", "Las Vegas Shock", "unknown", "dorito / mid right", "How unreadable, VERIFY. tpp red/black, Shock black/gold.", "tppcrew 0 – Shock 0 in progress"],
  ["1", "clip sun5-p1 5:39", "Guest", "Puerto Rico tppcrew #88", "unknown", "dorito side", "Name from graphic GUEST; spelling VERIFY; how unreadable.", "tppcrew 0 – Shock 0 in progress"],
  ["1", "clip sun5-p1 5:43", "unknown (red/black)", "Puerto Rico tppcrew", "unknown", "center / breakout", "How unreadable, VERIFY. Shock win point 1.", "tppcrew 0 – Shock 1"],
  ["2", "clip sun5-p1 11:32", "unknown (red/black)", "Puerto Rico tppcrew", "hit while sliding", "mid / center", "Black frames p1 10:48–10:49. Shock win point 2.", "tppcrew 0 – Shock 2"],
  ["3", "clip sun5-p2 10:17", "unknown (black/gold)", "Las Vegas Shock", "unknown", "right / dorito", "How unreadable, VERIFY.", "tppcrew 0 – Shock 2 in progress"],
  ["3", "clip sun5-p2 10:44", "unknown (red/black)", "Puerto Rico tppcrew", "unknown", "back left / snake", "How unreadable, VERIFY. tppcrew win point 3.", "tppcrew 1 – Shock 2 in progress"],
  ["6", "clip sun5-p4 6:20", "Santiago", "Puerto Rico tppcrew #17", "unknown", "dorito side", "Points 4–5 not captured (breakout p3a 5:57, then ~9-min capture gap); Shock won both (2–1 → 4–1, from later graphics); recapture needed. Name from graphic SANTIAGO; film-only, spelling VERIFY; how unreadable. tppcrew win point 6.", "tppcrew 2 – Shock 4 in progress"],
]));
const F5_SRC = "Fri Set 5 (MLPB+ fri5), clip time (p2 = fri5-p2salvage); film-only; ";
function f5(m: string, raw: string[][]): Elim[] {
  const st = m.startsWith("PaintballFIT") ? "FINAL FIT 8 – Hurricanes 4. " : "FINAL Damage 5 – Infamous 3 (arena scoreboard, fri5-partd6 clip 3:16; d4 had shown 4–3 at the P8 0:00 clock). ";
  return raw.map(([point, timestamp, playerOut, jersey, elimType, area, notes, scoreAfter]) => ({
    event: EV, division: "Pro", match: m, point, timestamp, playerOut, jersey, elimType, area,
    notes: F5_SRC + st + notes, scoreAfter,
  }));
}
ROWS.push(...f5("Tampa Bay Damage vs Detroit Infamous (Fri Set 5)", [
  ["1", "clip fri5-p1 1:18", "unknown", "Detroit Infamous", "bunkered/run-through", "mid / dorito", "Damage dark blue/black, Infamous white skeleton. Killer TBD #31 Jacob Edwards (Damage, roster confirmed). First ~1.5 min of VOD not captured (recapture); early pt1 elims may be missing.", "Damage 0 – Infamous 0 in progress"],
  ["1", "clip fri5-partd1 2:40", "unknown", "Detroit Infamous", "shot running/diving", "up center-dorito", "Recapture fri5-partd1 (VOD start); point 1 in progress at 14:47.", "Damage 0 – Infamous 0 in progress"],
  ["1", "clip fri5-partd1 2:54", "unknown", "Detroit Infamous #89", "waved out by refs, walking off", "unknown", "Film: Infamous colors (black/white/blue), in Infamous pit; waved out before the Damage hang. VERIFY: graphic/model read Goldman; not on Infamous check-in roster (Roster: Bowen, Velez, Resar, Aboulhosn, Silberg, Rudulph, Schonauer, Hall, Patient, Jamroz); Alex Goldman is Damage.", "Damage 0 – Infamous 0 in progress"],
  ["1", "clip fri5-p1 1:52", "unknown", "Detroit Infamous", "bunkered", "snake", "Damage win point 1. fri5-partd1: Infamous snake-side out 1:04 and '#31' bunker-checked out center/dorito 2:26 match existing p1 snake (this row) and mid/dorito (1:18) rows; #31 likely the Damage killer Jacob Edwards (team read VERIFY). Damage #31 hangs 2:55; Damage win 1–0 at match clock 11:58.", "Damage 1 – Infamous 0"],
  ["2", "clip fri5-p1 9:47", "unknown", "Detroit Infamous (VERIFY)", "lane", "snake", "Review labeled Damage but Damage won the point; team VERIFY (likely Infamous).", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-p1 9:51", "unknown", "Detroit Infamous (VERIFY)", "bunkered/run-through", "dorito / mid", "Review labeled Damage but Damage won the point; team VERIFY (likely Infamous).", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-p1 9:59", "unknown", "Detroit Infamous (VERIFY)", "lane", "snake", "Review labeled Damage but Damage won the point; team VERIFY (likely Infamous).", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-partd1 6:24", "unknown", "Detroit Infamous", "unknown", "back center", "Recapture fri5-partd1; order vs p1 rows VERIFY.", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-partd1 6:56", "unknown", "Tampa Bay Damage", "unknown", "snake", "Recapture fri5-partd1; order VERIFY.", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-partd1 7:05", "unknown", "Tampa Bay Damage", "unknown", "center-left", "Recapture fri5-partd1; order VERIFY.", "Damage 1 – Infamous 0 in progress"],
  ["2", "clip fri5-p1 10:34", "unknown", "Detroit Infamous (VERIFY)", "bunkered", "snake", "Review labeled Damage but Damage won the point; team VERIFY (likely Infamous). Damage win point 2. fri5-partd1 recapture: Infamous dorito off break 6:16, snake 6:20, snake (advanced) 7:01 map to existing p1 rows; back center 6:24 added; Infamous dorito out 7:23 not added (would exceed 5 Infamous outs; VERIFY, may be this row). Damage hang 7:31; Damage 2–0 at match clock 10:31. Point 3 breakout at clip end (10:31); d2 continues.", "Damage 2 – Infamous 0"],
  ["3", "clip fri5-partd2 0:46", "unknown", "Tampa Bay Damage", "unknown", "back-left snake", "Recapture fri5-partd2: the previously missing match point 3, starting at match clock 10:18.", "Damage 2 – Infamous 0 in progress"],
  ["3", "clip fri5-partd2 1:15", "Jacob Edwards", "Tampa Bay Damage #31", "ref signals out", "center / dorito", "Roster confirmed #31; number from film.", "Damage 2 – Infamous 0 in progress"],
  ["3", "clip fri5-partd2 1:43", "unknown", "Tampa Bay Damage", "unknown", "dorito", "", "Damage 2 – Infamous 0 in progress"],
  ["3", "clip fri5-partd2 1:54", "unknown", "Tampa Bay Damage", "unknown", "snake", "Infamous win point 3: Infamous #53 Aboulhosn (on Infamous check-in roster) hangs at 2:04; Infamous 1 – Damage 2 at match clock 8:22.", "Damage 2 – Infamous 1"],
  ["4", "clip fri5-p2salvage 6:46", "unknown", "Tampa Bay Damage", "unknown", "back / breakout", "Match pt3 not captured/unseen (Infamous win, graphic Infamous 1 – Damage 2), recapture. Walked off, overhead view, how unreadable. p2salvage froze at 6:59 (recapture window 8:47–8:58 ET); point continues in fri5-p3 (graphic p3 6:34 Infamous 1 – Damage 2, breakout graphic 8:12). Damage win point 4 (3–1).", "Damage 2 – Infamous 1 in progress"],
  ["4", "clip fri5-p3 0:23", "unknown", "Detroit Infamous", "snapped/laned", "snake, behind red can", "", "Damage 2 – Infamous 1 in progress"],
  ["4", "clip fri5-p3 0:48", "Jacob Edwards", "Tampa Bay Damage #31", "snapped/laned", "dorito", "Roster confirmed; number from film. fri5-partd2 (point from 8:22): Damage dorito out 9:37 or 10:26 = this row, back center 10:53 = p2salvage back/breakout row (mapping VERIFY).", "Damage 2 – Infamous 1 in progress"],
  ["4", "clip fri5-partd2 10:26", "unknown", "Tampa Bay Damage", "unknown", "dorito (second Damage dorito out)", "Recapture fri5-partd2; order vs p3 rows VERIFY.", "Damage 2 – Infamous 1 in progress"],
  ["4", "clip fri5-partd2 11:27", "unknown", "Tampa Bay Damage", "unknown", "near back center", "Recapture fri5-partd2. 11:39 Infamous player pushes deep down snake; Infamous #37 holding snake at 11:57; clip ends at match clock 5:45, point continues in d3.", "Damage 2 – Infamous 1 in progress"],
  ["4", "clip fri5-p3 2:19", "unknown", "Detroit Infamous", "laned running/diving", "snake", "Damage win point 4. Catch-up fri5-partc1 (VOD ~17:36–29:36): point started match clock 6:12 (Infamous 1 – Damage 2), Damage won 3:48; no extra elims seen. fri5-partd3: score Damage 3–1 at 3:48 confirms Damage P4 win; d2 P4 rows precede this result.", "Damage 3 – Infamous 1"],
  ["5", "clip fri5-partd3 4:15", "unknown", "Tampa Bay Damage", "unknown", "unknown", "Salvage fri5-partd3 (point from 3:48); Infamous #3 Jamroz exchanging; order vs p3 rows VERIFY.", "Damage 3 – Infamous 1 in progress"],
  ["5", "clip fri5-p3 8:16", "unknown", "Detroit Infamous", "snapped/laned", "back center / dorito", "", "Damage 3 – Infamous 1 in progress"],
  ["5", "clip fri5-p3 8:34", "Jamroz", "Detroit Infamous #3", "snapped/laned", "snake", "Name from graphic JAMROZ; film-only, spelling VERIFY. fri5-partc1 catch-up: Infamous player shot from behind by a Damage player up the snake at match clock 3:14, likely this same elim (not added as a separate row; VERIFY). Infamous win point 5 at 1:52 (graphic Infamous 2 – Damage 3). Video frozen p3 8:49–10:42 (~09:15–09:17 ET), recapture.", "Damage 3 – Infamous 2"],
  ["6", "clip fri5-p4 2:51", "unknown", "Detroit Infamous", "laned off break", "snake", "", "Damage 3 – Infamous 2 in progress"],
  ["6", "clip fri5-p4 2:54", "unknown", "Tampa Bay Damage", "laned off break", "dorito", "", "Damage 3 – Infamous 2 in progress"],
  ["6", "clip fri5-partc2 1:41", "unknown", "Detroit Infamous", "snapped/laned", "back right dorito", "Catch-up fri5-partc2. Damage win point 6 at match clock 1:08 (graphic 4–2). Score-order discrepancy: c1 ended Infamous 2 – Damage 3, c2 graphic reads Damage 4–2; consistent with Damage 4 – Infamous 2. fri5-partd3 (P6 from 1:52): Infamous back-right out 9:30 = this row; 9:49 likely Infamous low center bunker, pulled by ref (team VERIFY, not added). Broadcast froze 10:37 on FIT pit showing Patient #88 (Patient is on Infamous roster; VERIFY).", "Damage 4 – Infamous 2"],
  ["7", "clip fri5-p4 6:43", "unknown", "Tampa Bay Damage", "laned off break", "dorito", "fri5-partc2 5:26: Damage dorito-side player out, likely this same elim (not added separately; VERIFY). c2 rain freeze 4:56–5:10.", "Damage 4 – Infamous 2 in progress"],
  ["7", "clip fri5-p4 6:55", "unknown", "Tampa Bay Damage", "laned / run-through", "to center", "", "Damage 4 – Infamous 2 in progress"],
  ["7", "clip fri5-partd4 1:12", "unknown", "Tampa Bay Damage", "unknown", "back right", "Salvage fri5-partd4 (point from clock 1:08/0:44); order vs p4 rows VERIFY.", "Damage 4 – Infamous 2 in progress"],
  ["7", "clip fri5-p4 7:05", "unknown", "Tampa Bay Damage", "bunkered", "snake", "Infamous win point 7 at match clock 0:38 (c2 graphic 3–4); Kevin Rudulph #7 (Infamous; roster confirmed, high confidence, pro-allowlist event 9321; c2 read 'Rudolph') hit the buzzer. fri5-partd4: Rudulph hangs 1:53 → Infamous 3–4 at 0:38, consistent. Damage timeout after. p4 frozen 10:48–11:17 and capture lost ~09:29–09:31 ET, recapture.", "Damage 4 – Infamous 3"],
  ["8", "clip fri5-partc2 11:25", "unknown", "Detroit Infamous", "snapped", "dorito side", "Catch-up fri5-partc2; point 8 started after Damage timeout (clock 0:38 per c2). Clip ends before result; c3 continues.", "Damage 4 – Infamous 3 in progress"],
  ["8", "clip fri5-partc2 11:28", "unknown", "Detroit Infamous", "bunkered by diving Damage player", "snake", "Catch-up fri5-partc2.", "Damage 4 – Infamous 3 in progress"],
  ["8", "clip fri5-part5, match clock 0:02", "unknown", "Detroit Infamous", "no elims seen in part5 (2 Infamous elims from partc2 above)", "", "Part 5 salvage (~09:31:49 ET on). Point 8 starts Damage 4 – Infamous 3; Jacob Edwards #31 (Damage, roster confirmed) hangs the buzzer at 0:02. No elims seen. Replay (skeleton vs yellow/black/red team) ambiguous, not logged. Point where score went to 3–4 is partly on the catch-up list. Live end not captured (freeze windows). VOD ended ~10:00 ET and autoplayed Set 4; nothing after is Set 5. FINAL confirmed Damage 5 – Infamous 3 by arena scoreboard (fri5-partd6 clip 3:16), consistent with the Edwards buzzer hang. Note: d4 had shown graphic 4–3 at the P8 0:00 clock (lagging graphic).", "Damage 5 – Infamous 3"],
]));
ROWS.push(...f5("PaintballFIT vs CK Hurricanes (Fri Set 5)", [
  ["1", "clip fri5-p1 6:33", "unknown", "CK Hurricanes", "run-through/bunkered", "mid center beam", "FIT white/navy/red stars, Canes light blue patterned. Killer FIT #43 Spicka, film-only, spelling VERIFY.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-partd1 3:49", "unknown", "CK Hurricanes", "laned diving off break", "dorito side", "Recapture fri5-partd1; order vs fri5-p1 rows VERIFY.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-partd1 4:03", "unknown", "CK Hurricanes", "unknown", "dorito side", "Recapture fri5-partd1.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-partd1 4:25", "unknown", "CK Hurricanes", "unknown", "snake side", "Recapture fri5-partd1.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-partd1 4:28", "unknown", "PaintballFIT", "unknown", "dorito side", "Recapture fri5-partd1.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-partd1 4:36", "unknown", "CK Hurricanes", "unknown", "snake", "Recapture fri5-partd1.", "FIT 0 – Hurricanes 0 in progress"],
  ["1", "clip fri5-p1 8:41", "Tyler Luckau", "PaintballFIT #45", "lane/snap", "snake / mid", "Roster confirmed #45 Tyler Luckau (graphic read 'Luchau'). FIT win point 1. fri5-partd1: FIT snake-side out 4:00 = this row; Canes back center out 4:38 = existing mid center beam row (6:33); FIT hang 4:41; FIT 1–0 at match clock 13:26.", "FIT 1 – Hurricanes 0"],
  ["2", "clip fri5-p2salvage 0:36", "unknown", "PaintballFIT", "snap/lane", "mid / dorito", "", "FIT 1 – Hurricanes 0 in progress"],
  ["2", "clip fri5-p2salvage 1:29", "unknown", "PaintballFIT", "lane", "back right dorito", "", "FIT 1 – Hurricanes 0 in progress"],
  ["2", "clip fri5-p2salvage 2:40", "unknown", "CK Hurricanes", "bunkered", "mid", "", "FIT 1 – Hurricanes 0 in progress"],
  ["2", "clip fri5-partd1 11:00", "unknown", "CK Hurricanes", "unknown", "dorito", "Recapture fri5-partd1; feed frozen 8:39–10:31.", "FIT 1 – Hurricanes 0 in progress"],
  ["2", "clip fri5-p2salvage 2:41", "unknown", "CK Hurricanes", "bunkered", "center snake", "FIT win point 2. fri5-partd1: Canes center 11:01 and snake 11:04 = existing mid and this row; FIT run-through down snake and hang 11:05; FIT 2–0 at match clock 13:06.", "FIT 2 – Hurricanes 0"],
  ["3", "clip fri5-p2salvage 5:11", "unknown", "CK Hurricanes", "run-through/bunkered", "dorito", "", "FIT 2 – Hurricanes 0 in progress"],
  ["3", "clip fri5-p2salvage 5:16", "unknown", "CK Hurricanes", "bunkered", "center snake", "FIT win point 3. fri5-partd2: Canes snake out 3:19 = this row (center snake); feed frozen 3:34–8:14 (clock 12:43→12:41); FIT hang 8:31; FIT 3–0 at match clock 12:28.", "FIT 3 – Hurricanes 0"],
  ["4", "clip fri5-p3 4:26", "unknown", "PaintballFIT", "snapped/laned", "center star bunker", "Point 4 starts FIT 3–0 (graphic p3 12:28).", "FIT 3 – Hurricanes 0 in progress"],
  ["4", "clip fri5-p3 4:55", "unknown", "PaintballFIT", "snapped/laned", "dorito", "", "FIT 3 – Hurricanes 0 in progress"],
  ["4", "clip fri5-p3 5:25", "unknown", "PaintballFIT", "bunkered/run-through", "center can", "", "FIT 3 – Hurricanes 0 in progress"],
  ["4", "clip fri5-partd3 1:11", "unknown", "PaintballFIT", "unknown", "back-left snake", "Salvage fri5-partd3; FIT back-center out off break 0:46 = existing center star row (VERIFY); order VERIFY.", "FIT 3 – Hurricanes 0 in progress"],
  ["4", "clip fri5-partd3 1:18", "unknown", "CK Hurricanes", "unknown", "snake", "Salvage fri5-partd3.", "FIT 3 – Hurricanes 0 in progress"],
  ["4", "clip fri5-p3 5:26", "unknown", "CK Hurricanes", "traded (right after bunker move)", "center can", "fri5-partd3: Canes center-right bunker shot close range by advancing FIT player 2:26 = this row; Canes hang 2:33 (FIT 3–1 at 10:43). Hurricanes win point 4 (Canes hang, match clock 10:43, per fri5-partc1 catch-up; point started 12:28 at FIT 3 – Canes 0; no extra elims seen). fri5-partc1: source feed rain-froze 9:58–9:53 at the start of point 5. Video frozen p3 8:49–10:42 (~09:15–09:17 ET), recapture.", "FIT 3 – Hurricanes 1"],
  ["5", "clip fri5-p4 0:12", "unknown", "CK Hurricanes", "laned sliding in", "snake", "", "FIT 3 – Hurricanes 1 in progress"],
  ["5", "clip fri5-p4 0:50", "unknown", "PaintballFIT", "bunkered/shot out", "snake", "", "FIT 3 – Hurricanes 1 in progress"],
  ["5", "clip fri5-partd3 6:48", "unknown", "CK Hurricanes", "unknown", "back-right dorito", "Salvage fri5-partd3; FIT back-center out off break 6:28 = existing p4 1:03 back center row; order VERIFY.", "FIT 3 – Hurricanes 1 in progress"],
  ["5", "clip fri5-partd3 7:56", "unknown", "PaintballFIT", "unknown", "dorito", "Salvage fri5-partd3.", "FIT 3 – Hurricanes 1 in progress"],
  ["5", "clip fri5-partd3 8:02", "unknown", "CK Hurricanes", "unknown", "back center", "Salvage fri5-partd3; FIT #10 Garringer hang → 4–1 at 8:47.", "FIT 3 – Hurricanes 1 in progress"],
  ["5", "clip fri5-p4 1:03", "unknown", "PaintballFIT", "snapped/laned", "back center", "FIT win point 5: #10 Cyrus Garringer (FIT, player list) hangs, fri5-partc2 0:22, match clock 8:47.", "FIT 4 – Hurricanes 1"],
  ["6", "clip fri5-p4 4:41", "unknown", "CK Hurricanes", "laned off break", "dorito run-down", "", "FIT 4 – Hurricanes 1 in progress"],
  ["6", "clip fri5-partc2 3:00", "unknown", "CK Hurricanes", "laned diving off break", "center 50", "Catch-up fri5-partc2.", "FIT 4 – Hurricanes 1 in progress"],
  ["6", "clip fri5-partc2 3:34", "unknown", "CK Hurricanes", "unknown", "snake side", "Catch-up fri5-partc2.", "FIT 4 – Hurricanes 1 in progress"],
  ["6", "clip fri5-p4 5:44", "Dyer", "CK Hurricanes #15", "snap/bunker exchange", "dorito", "Name from graphic DYER; film-only, spelling VERIFY. Ref yellow penalty flag on the exchange. Hurricanes win point 6 despite only Canes elims shown; FIT elims not seen. fri5-partc2 3:51: Canes #0 Chavez snapped out back-right dorito, likely this same elim (not added separately; name/number conflict with Dyer #15, VERIFY; player list has Jonathan Chavez as FIT #00). fri5-partc4 pits show FIT #04 Chavez, supporting Chavez = FIT, so a Canes Chavez read is likely wrong. Win at match clock 7:33 (FIT 4–2); FIT timeout after. fri5-partd4 7:48: Canes #15 Dyer walking off before the Canes win, supporting this row.", "FIT 4 – Hurricanes 2"],
  ["7", "clip fri5-p4 9:14", "unknown", "CK Hurricanes", "laned off break", "snake", "FIT timeout before point 7.", "FIT 4 – Hurricanes 2 in progress"],
  ["7", "clip fri5-p4 9:37", "unknown", "PaintballFIT", "snapped", "dorito", "", "FIT 4 – Hurricanes 2 in progress"],
  ["7", "clip fri5-p4 10:08", "unknown", "CK Hurricanes", "laned", "center", "", "FIT 4 – Hurricanes 2 in progress"],
  ["7", "clip fri5-partc2 8:23", "unknown", "PaintballFIT", "unknown", "center layout", "Catch-up fri5-partc2; relative order vs p4 rows VERIFY.", "FIT 4 – Hurricanes 2 in progress"],
  ["7", "clip fri5-p4 10:11", "unknown", "CK Hurricanes", "laned", "dorito", "FIT win point 7 at match clock 6:17 (partc2; fri5-partd4 confirms 5–2, FIT #45 pushing center). p4 frozen 10:48–11:17 and capture lost ~09:29–09:31 ET, recapture.", "FIT 5 – Hurricanes 2"],
  ["8", "clip fri5-partd4 8:58", "unknown", "CK Hurricanes", "unknown", "center", "Salvage fri5-partd4 (~8:58–9:03); order vs part5 row VERIFY.", "FIT 5 – Hurricanes 2 in progress"],
  ["8", "clip fri5-partd4 9:03", "unknown", "CK Hurricanes", "unknown", "back center", "Salvage fri5-partd4; FIT 6–2 at 5:46; broadcast frozen 10:25 on.", "FIT 5 – Hurricanes 2 in progress"],
  ["8", "clip fri5-part5, match clock 5:47", "unknown", "CK Hurricanes", "unknown", "snake", "Part 5 salvage (~09:31:49 ET on); point started clock 6:13. FIT hang at 5:46. FIT win point 8. fri5-partc3 0:46 (clock ~5:47) shows the same Canes snake-side elim.", "FIT 6 – Hurricanes 2"],
  ["9", "clip fri5-part5, match clock 5:44", "unknown", "PaintballFIT", "unknown", "center", "FIT left, Canes right.", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 5:40", "unknown", "CK Hurricanes", "unknown", "snake", "", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 5:35", "unknown", "CK Hurricanes", "unknown", "center", "", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 5:32", "unknown", "PaintballFIT", "unknown", "dorito", "", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 5:14", "unknown", "PaintballFIT", "unknown", "snake", "", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 5:07", "unknown", "CK Hurricanes #88", "shot on bunker/hopper", "dorito", "#88 from film; name unknown, VERIFY.", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock 4:53", "Cyrus Garringer (VERIFY)", "PaintballFIT #10", "unknown", "dorito", "fri5-partc3 8:23 (clock 5:21→4:32 across freeze): FIT #10 dorito-side out; graphic/model read 'Springer' but #10 = Cyrus Garringer per earlier graphic + roster, name read conflict VERIFY; mapped to this row (clock VERIFY). c3 also shows Canes snake-side out (5:29), dorito-side out team unclear (5:21), center out team unclear (5:06), all treated as existing point 9 rows (point already has 5 FIT outs). c3 feed frozen 3:16–7:35 (clock 5:20→5:18). Canes #53 Warner and #18 Martinez pushing up at end.", "FIT 6 – Hurricanes 2 in progress"],
  ["9", "clip fri5-part5, match clock ~4:30", "unknown", "PaintballFIT", "unknown", "center", "Off-camera live; elim from replay. Kaito Warner Jr (Canes, PBLeagues confirmed; #53 film-only VERIFY) hangs at 4:27. Hurricanes win point 9. Point 10 began 4:15; clip ended 4:08, continues in part 6. fri5-partd5 salvage (scorebug 6–2→6–3; model read shaky, VERIFY): FIT lane snake 4:40 and FIT back-center walk-off 4:22 not added (FIT already at 5 outs this point); Canes Warner #53 'snap dorito-back' 4:24 conflicts with the Warner hang at 4:27 (likely mis-read; not added). fri5-partd6 replay at clip 2:21 (after the FINAL) shows Warner #53 walking off eliminated, top snake side; it can't be tied to P9, so the hang stays and this is VERIFY.", "FIT 6 – Hurricanes 3"],
  ["10", "clip fri5-part6, clock 1:57", "unknown", "PaintballFIT", "unknown", "snake", "Part 6 salvage; clock reset to short point clock. Canes left, FIT right.", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-partd5 (clock 4:12)", "unknown", "PaintballFIT", "unknown", "back center", "Salvage fri5-partd5 (FIT vs Canes, scorebug 6–3→6–4); order vs part6/c3 rows VERIFY.", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-partd5 (clock 4:09)", "unknown", "CK Hurricanes", "unknown", "dorito", "Salvage fri5-partd5; order VERIFY.", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-partd5 (clock 3:34)", "unknown", "PaintballFIT", "unknown", "center", "Salvage fri5-partd5; order VERIFY. Other d5 FIT reads this point (dorito 4:06, back-center 4:00/3:32/3:02, snake 3:56, dorito tape 3:36, dorito bunker 3:04) treated as duplicates of existing rows or replays (model flagged replays 02:43–03:24); not added. Conflict: d5 reads 3:04 as FIT dorito bunker, but c3 has a Canes center out at 3:04 (VERIFY).", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-partc3 11:26 (clock 3:36)", "unknown", "PaintballFIT", "unknown", "dorito side", "Catch-up fri5-partc3; point started 4:19. Order vs part6 rows (different clock) VERIFY.", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-partc3 11:58 (clock 3:04)", "unknown", "CK Hurricanes", "unknown", "center", "Catch-up fri5-partc3; clip ends, c4 continues.", "FIT 6 – Hurricanes 3 in progress"],
  ["10", "clip fri5-part6, clock 1:35", "Andrew Bell", "CK Hurricanes #20", "penalty-flagged / out", "snake", "Graphic read 'Bells'; roster Andrew Bell, VERIFY. Hurricanes win point 10. fri5-partc4: Bell waved out behind snake-side bunker at clip 1:17, same elim; detail conflict (penalty-flagged vs waved out) VERIFY. c4 scoreboard shows Canes win at 1:25 (here clock 1:35), FIT 6–4. c4 FIT dorito-side out (1:45) and FIT snake-side out (1:52) match existing point 10 FIT dorito (c3) and snake (part6) rows, not duplicated; a FIT walk-off (2:46) likely one of them; order vs score update VERIFY. FIT timeout at 1:35. fri5-partd5: scorebug reads 6–4 by clock ~3:02, then the d5 reads at 2:02–1:26 (FIT dorito 2:02, Canes dorito 1:59, FIT center 1:55, FIT snake-back 1:42, FIT center 1:39, Canes Bell #20 penalty 1:35; then FIT snake tape 1:44, Canes center 1:39, FIT dorito tape 1:36) end in a penalty and a Canes timeout at 1:26 with FIT 6–4. They line up with existing part6 P10/P11 rows (same clock values), so they are not added. VERIFY whether part6's Bell penalty belongs to this point or the post-6–4 penalty. Pit shots (no elims): FIT #34 Trenton Mason-Salinas, Canes #56 Michael Brown, #18 Duran Martinez (Hurricanes roster file lists Brown and Martinez; Mason-Salinas from the Page player list).", "FIT 6 – Hurricanes 4"],
  ["11", "clip fri5-part6, clock 1:45", "unknown", "PaintballFIT", "unknown", "center", "FIT left.", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-part6, clock 1:37", "unknown", "CK Hurricanes", "unknown", "snake", "", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-part6, clock 1:35", "unknown", "PaintballFIT", "unknown", "snake", "", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-part6, clock 1:30", "unknown", "CK Hurricanes", "unknown", "dorito", "", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-partc4 5:03", "unknown", "CK Hurricanes", "unknown", "center (crawler)", "Catch-up fri5-partc4; order vs part6 rows VERIFY.", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-part6, clock 1:24", "unknown", "PaintballFIT", "unknown", "dorito", "", "FIT 6 – Hurricanes 4 in progress"],
  ["11", "clip fri5-part6, clock 0:48", "unknown", "PaintballFIT", "unknown", "back center", "Canes hung at 0:39 but score went FIT 7–4: FIT win point 11, likely via penalty, VERIFY. fri5-partc4 shows a FIT hang at clip 6:13, score FIT 7–4 at 0:33, which supports the FIT win (Canes-hang read VERIFY). c4 FIT dorito-side out (4:55) matches the existing point 11 FIT dorito row; FIT walk-off at 5:20 likely the same. c4 feed frozen 6:18–8:53.", "FIT 7 – Hurricanes 4"],
  ["12", "clip fri5-part6, clock 1:30", "unknown", "PaintballFIT", "unknown", "snake", "Canes left.", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-part6, clock 1:27", "unknown", "CK Hurricanes", "unknown", "center", "", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-part6, clock 1:22", "unknown", "PaintballFIT", "unknown", "dorito", "", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-partd6 0:24", "unknown", "CK Hurricanes", "unknown", "back snake", "Salvage fri5-partd6 (point from scorebug Canes 4 – FIT 7, game clock 0:33; '7–7' was a misread). d6 Canes snake top 0:19, center 0:22 and dorito bottom 0:27 = existing center and replay rows; order VERIFY.", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-partd6 0:25", "unknown", "CK Hurricanes", "unknown", "back dorito", "Salvage fri5-partd6; 5th Canes out.", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-part6, clock ~0:26 (replay)", "unknown", "CK Hurricanes", "unknown", "dorito", "From replay; clock VERIFY. Live showed one Canes walk-off at 0:44, off-camera.", "FIT 7 – Hurricanes 4 in progress"],
  ["12", "clip fri5-part6, clock ~0:15 (replay)", "unknown", "CK Hurricanes", "unknown", "snake", "From replay; clock VERIFY. FIT hang; FIT win point 12. FINAL. fri5-partc4 confirms live: Canes dorito-side out 9:40 and snake-side out 9:49 (= the two replay rows), FIT hang 11:26, FINAL 8–4 at clock 0:05. c4 graphics glitched with Damage/Infamous logos ('SCORES 4-4', 'SCORES 8-4'), ignored. Pit names seen (c4): Canes #56 Brown, FIT #04 Chavez, FIT #34 Mason-Salinas, #115 Luchau (roster has Tyler Luckau #45, number VERIFY), #12 Sebaugh. fri5-partd6: FINAL graphic at clip 2:36 reads PaintballFIT 8 – CK Hurricanes 4. Score progression checks out: 1–0, 2–0, 3–0, 3–1, 4–1, 4–2, 5–2, 6–2, 6–3, 6–4, 7–4, 8–4 (P11 FIT win via penalty, still VERIFY). d6 clip 1:41: Canes #20 Andrew Bell in the penalty box with two other Canes; doesn't show which point drew the penalty, so P10/P11 placement stays VERIFY.", "FINAL PaintballFIT 8 – CK Hurricanes 4"],
]));
const XFC_SRC = "MLPB+ Sun Semi Finals split game (xf-canes-part1 from VOD ~0:30, first ~30s missed; xf-canes-part2 salvage); match clock; film-only. ";
function xsf(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: "Pro", match: "San Antonio X-Factor vs CK Hurricanes (Sun Semi Finals, split game)", point, timestamp, playerOut, jersey, elimType, area, notes: XFC_SRC + notes, scoreAfter };
}
ROWS.push(
  xsf("1", "xf-canes-part1 clock 11:46", "unknown", "CK Hurricanes #28", "unknown", "center", "XF left. Canes #28 name unknown. Brief named 'New Orleans Hurricanes'; logged as CK Hurricanes to match existing rows.", "XF 0 – Canes 0 in progress"),
  xsf("1", "xf-canes-part1 clock 11:30", "unknown", "San Antonio X-Factor", "unknown", "dorito", "", "XF 0 – Canes 0 in progress"),
  xsf("1", "xf-canes-part1 clock 10:23", "unknown", "San Antonio X-Factor", "unknown", "snake", "", "XF 0 – Canes 0 in progress"),
  xsf("1", "xf-canes-part1 clock 10:19", "Matt Jackson", "San Antonio X-Factor #12", "unknown", "center / dorito", "Name PBLeagues confirmed; # film.", "XF 0 – Canes 0 in progress"),
  xsf("1", "xf-canes-part1 clock 10:08", "unknown", "San Antonio X-Factor", "unknown", "dorito", "Cox #99 (Canes; film-only name, not on any Pro roster, VERIFY) hangs 10:08. Canes win point 1.", "XF 0 – Canes 1"),
  xsf("2", "xf-canes-part1 clock 9:07", "unknown", "CK Hurricanes", "unknown", "dorito", "XF right.", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:53", "unknown", "San Antonio X-Factor", "unknown", "center", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:46", "unknown", "San Antonio X-Factor", "unknown", "snake", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:23", "unknown", "CK Hurricanes", "unknown", "snake", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:18", "unknown", "CK Hurricanes", "unknown", "center", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:11", "unknown", "San Antonio X-Factor", "unknown", "dorito", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 8:07", "Cox", "CK Hurricanes #99", "unknown", "dorito", "Film-only name; no Cox on any Pro roster, VERIFY.", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 7:49", "unknown", "San Antonio X-Factor", "shot crawling", "center", "", "XF 0 – Canes 1 in progress"),
  xsf("2", "xf-canes-part1 clock 7:35", "unknown", "CK Hurricanes", "penalty-flagged out", "near XF buzzer", "Colt Roberts #8 (XF; PBLeagues confirmed, not Nate Roberts; # film) hangs 7:30. XF win point 2.", "XF 1 – Canes 1"),
  xsf("3", "xf-canes-part1 clock 7:13", "unknown", "San Antonio X-Factor", "unknown", "snake", "XF left.", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 7:07", "unknown", "CK Hurricanes", "unknown", "dorito", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 6:43", "unknown", "CK Hurricanes", "unknown", "center", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 6:14", "unknown", "San Antonio X-Factor", "unknown", "snake", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 6:07", "unknown", "San Antonio X-Factor", "unknown", "center", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 5:57", "unknown", "San Antonio X-Factor", "unknown", "dorito", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 5:36", "unknown", "CK Hurricanes", "unknown", "center", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 4:42", "unknown", "CK Hurricanes", "unknown", "snake", "", "XF 1 – Canes 1 in progress"),
  xsf("3", "xf-canes-part1 clock 4:32", "unknown", "CK Hurricanes", "unknown", "dorito", "XF hang 4:28, no graphic. Result/score VERIFY: part 2 opens with graphic XF 1–1 Canes at 2:50, so P3 and/or P4 may not have counted (or scoreboard lag).", "XF 2 – Canes 1 (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:40", "Cox", "CK Hurricanes #99", "unknown", "center", "XF left. Film-only name, VERIFY.", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:30", "unknown", "San Antonio X-Factor", "unknown", "snake", "", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:24", "unknown", "CK Hurricanes", "unknown", "snake", "", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:20", "unknown", "San Antonio X-Factor", "unknown", "dorito", "", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:15", "unknown", "CK Hurricanes", "unknown", "center", "", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:08", "unknown", "CK Hurricanes", "unknown", "dorito", "", "XF 2 – Canes 1 in progress (VERIFY)"),
  xsf("4", "xf-canes-part1 clock 3:06", "unknown", "CK Hurricanes", "unknown", "center", "XF hang 3:02, no graphic. Result/score VERIFY: conflicts with part 2 graphic XF 1–1 at 2:50.", "XF 3 – Canes 1 (VERIFY)"),
  xsf("5", "xf-canes-part2 clock 2:37", "unknown", "San Antonio X-Factor", "unknown", "snake (insert)", "Part 2 opens with graphic XF 1–1 Canes at 2:50 (conflicts with P3/P4 XF hangs; scores from here follow graphics).", "XF 1 – Canes 1 in progress"),
  xsf("5", "xf-canes-part2 clock 2:23", "unknown", "CK Hurricanes #?0", "pulled by ref", "snake", "Jersey partly read (#?0).", "XF 1 – Canes 1 in progress"),
  xsf("5", "xf-canes-part2 clock 2:21", "unknown", "CK Hurricanes", "shot running", "snake", "XF hang; XF win point (graphic 2–1).", "XF 2 – Canes 1"),
  xsf("6", "xf-canes-part2 clock 2:00", "unknown", "San Antonio X-Factor", "unknown", "snake", "", "XF 2 – Canes 1 in progress"),
  xsf("6", "xf-canes-part2 clock ~1:43", "unknown", "CK Hurricanes", "unknown", "snake", "Clock not shown; ~1:43 VERIFY.", "XF 2 – Canes 1 in progress"),
  xsf("6", "xf-canes-part2 clock 1:00", "unknown", "San Antonio X-Factor", "unknown", "center", "", "XF 2 – Canes 1 in progress"),
  xsf("6", "xf-canes-part2 clock 0:58", "unknown", "San Antonio X-Factor", "unknown", "dorito", "", "XF 2 – Canes 1 in progress"),
  xsf("6", "xf-canes-part2 clock 0:56", "unknown", "CK Hurricanes", "unknown", "center", "", "XF 2 – Canes 1 in progress"),
  xsf("6", "xf-canes-part2 clock 0:31", "unknown", "San Antonio X-Factor", "unknown", "center → snake", "Canes win point (graphic 2–2). Regulation expires.", "XF 2 – Canes 2"),
  xsf("OT", "xf-canes-part7 OT clock 3:34", "unknown", "CK Hurricanes", "unknown", "snake side", "OT sourced only from catch-up xf-canes-part7 (VOD ~17:00–end; clean continuous OT, all alive at OT 4:30 through FINAL graphic). Jerseys illegible. Replaced earlier OT rows: part2 (OT 4:24 XF out diving dorito; OT 4:20 Canes snake, capture froze 4:07) and part3 (Canes snake 2:42, snake 2:13, dorito 1:07, back right 0:38, center back 0:34; XF hang 0:31). Part3 was Uprising/Impact autoplay, so those OT reads may belong to that game. No names in removed rows.", "XF 2 – Canes 2 in progress (OT)"),
  xsf("OT", "xf-canes-part7 OT clock 1:30", "unknown", "CK Hurricanes", "unknown", "snake side", "", "XF 2 – Canes 2 in progress (OT)"),
  xsf("OT", "xf-canes-part7 OT clock 0:58", "unknown", "CK Hurricanes", "unknown", "center", "XF player sprints down center and hangs at 0:40; X-Factor win OT. FINAL graphic at clip 4:12. No XF players lost in OT. Given the graphic sequence, P3/P4 XF hangs likely did not count (stay VERIFY).", "FINAL San Antonio X-Factor 3 – CK Hurricanes 2"),
);
const UPI_SF_SRC = "MLPB+ Sun Semi Finals split game (xf-canes-part3 onward); match clock; film-only; numbers film-only. Team colour mapping VERIFY for whole game; point-winner attributions may be flipped. ";
function usf(point: string, timestamp: string, playerOut: string, jersey: string, elimType: string, area: string, notes: string, scoreAfter: string): Elim {
  return { event: EV, division: "Pro", match: "Seattle Uprising vs Edmonton Impact (Sun Semi Finals, split game)", point, timestamp, playerOut, jersey, elimType, area, notes: UPI_SF_SRC + notes, scoreAfter };
}
ROWS.push(
  usf("1", "xf-canes-part3 clock 14:03", "unknown", "Seattle Uprising", "unknown", "snake", "Impact left, Uprising right. Unassigned reads from xf-canes-part3 removed from XF vs Canes OT (part3 was Uprising/Impact autoplay; clock labeled OT, no clear match to these rows, team VERIFY): out snake 2:42, snake 2:13, dorito 1:07, back right 0:38, center back 0:34; hang 0:31. Ground shots seen (not tied to elims): Uprising #99, Uprising #12, #9 Woodward and Borromeo (Seattle Uprising per player list; on-screen graphic shows Woodward on Uprising, camo).", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 13:52", "unknown", "Edmonton Impact", "unknown", "snake", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 13:48", "unknown", "Edmonton Impact", "unknown", "center", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 12:31", "unknown", "Seattle Uprising", "unknown", "snake", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 12:07", "unknown", "Edmonton Impact", "unknown", "dorito", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 11:44", "unknown", "Seattle Uprising", "unknown", "dorito", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 10:59", "unknown", "Seattle Uprising", "unknown", "center / snake", "", "Uprising 0 – Impact 0 in progress"),
  usf("1", "xf-canes-part3 clock 10:15", "unknown", "Seattle Uprising", "unknown", "center", "Impact hang; Impact win point 1 (9:46).", "Uprising 0 – Impact 1"),
  usf("2", "xf-canes-part3 clock 9:16", "unknown", "Edmonton Impact #90", "pulled by ref after slide", "dorito", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 8:43", "unknown", "Seattle Uprising", "unknown", "snake", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 8:37", "unknown", "Edmonton Impact", "unknown", "snake", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 8:09", "unknown", "Seattle Uprising", "unknown", "center", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 8:04", "unknown", "Edmonton Impact", "unknown", "dorito", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 8:01", "unknown", "Seattle Uprising", "unknown", "dorito", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part3 clock 6:28", "unknown", "Seattle Uprising", "shot by advancing center player", "snake", "Point continues in part 4.", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part4 clock 5:57", "Austin Woodward", "Seattle Uprising", "unknown", "snake", "", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part4 clock 5:22", "Alec Holland", "Seattle Uprising #24", "unknown", "center / left", "PBLeagues roster: Alec Holland, Uprising (film tagged Impact). #24 film-only.", "Uprising 0 – Impact 1 in progress"),
  usf("2", "xf-canes-part4 clock 5:21", "Findlay (VERIFY)", "Edmonton Impact #23", "unknown", "center", "Findlay film-only VERIFY; team as film. #1 Cornell (Brandon/Justin VERIFY; Edmonton Impact per PBLeagues roster; hanging team VERIFY) hangs 5:21; point winner per graphic, attribution VERIFY.", "Uprising 1 – Impact 1"),
  usf("3", "xf-canes-part4 clock 5:21 break", "unknown", "unknown", "unknown", "unknown", "Elims not captured, catch-up: capture froze ~2:44–~1:53 (2:44 and 2:30 freeze windows). Impact win point 3 per graphic.", "Uprising 1 – Impact 2"),
  usf("4", "xf-canes-part4 clock 0:09", "unknown", "unknown", "unknown", "unknown", "Point started off-camera; elims not captured, catch-up. #12 Tyler Harmon (Edmonton Impact per PBLeagues roster; hanging team VERIFY) hangs 0:09; point winner per graphic, attribution VERIFY. Regulation ends; Split-game VOD ends at 2-2 after the P4 hang (0:09); no OT or FINAL in this VOD (checked full 16:40 video; outro at ~16:29). Result of this split game = 2-2 per VOD.", "Uprising 2 – Impact 2"),
);

// Movement pass (Sun Pro Finals) from /workspace/paintball/lso/movement/notes/finals-p1..p3.md. Fills existing rows only; no new rows.
const MV_FINALS = "Tampa Bay Damage vs Red Legion (Pro Finals)";
const MV_TB1 = "team break: 5-wide (snake corner, snake gap/can, home, dorito gap/can, D1) — player not tied to row (VERIFY)";
const MV_TB2 = "team break: 5-wide (snake 1 dive, back snake, home, back dorito, D1) — player not tied to row (VERIFY)";
const MV_TB3 = "team break: snake corner, S1, home, D1, dorito corner — player not tied to row (VERIFY)";
const MV_OVR: Record<string, [string, string]> = {
  "3|file ~7:31": ["snake corner", "dove into snake 8:02; out right after (clock ~8:03). Near the part1_00 freeze (file 08:46), timeline VERIFY"],
  "4|chunk02 ~0:23 | clock 7:28": ["snake corner", "into snake 7:24; out on the snake dive"],
  "5|chunk02 ~3:19 | clock 6:39": ["snake corner", "into snake 6:32; out on the snake dive (other Damage snake player crawled up 6:14)"],
  "6|part2 ~0:56": ["D1", "held D1; out at D1 5:42 (name from jersey back; Leonid Smotrov is on the Red Legion roster)"],
  "6|part2 ~1:21": ["team break: 5-wide (snake 1 dive, back snake, home, back dorito, D1) — position not on wide shot (VERIFY)", "out 5:21 per overhead (Alexander Berdnikov is on the Red Legion roster); earlier moves not filmed, VERIFY"],
  "7|part2 ~4:34 | clock 5:15": ["snake 1 dive", "S1→S2 4:54; out at S2 4:52"],
  "8|part2 ~0:13 | clock ~2:16": ["back snake", "back snake→S1 3:17, S1→S2 2:48; out at S2 2:20 (overhead notes call this the RL 4-2→5-2 point; Page point 8, numbering VERIFY)"],
  "9|part3 ~1:08 | clock 6:09": ["snake corner", "snake →S3/S4 6:09; out ~6:09 (first filmed point after the missing 3–5→3–6 gap)"],
  "12|part3 ~11:03 | clock 3:28": ["D1", "D1→D2 3:30; out at dorito ~3:28"],
};
function mvDefault(p: string): [string, string] {
  const n = Number(p);
  if (p === "HT") return [MV_TB2, "Movement VERIFY: HT rows (clock ~1:18–0:00) not matched to overhead notes."];
  if (n <= 5) return [MV_TB1, n === 3 ? "Movement VERIFY: part1_00 frozen from file 08:46; this point sits at the freeze boundary." : ""];
  if (n <= 8) return [MV_TB2, ""];
  if (n === 9) return [MV_TB3, "Movement VERIFY: Damage 3–5 → RL 3–6 point not on film; part3 movement starts at 3–6."];
  if (n === 13) return [MV_TB3, "Movement VERIFY: score-sequence conflict (film 7–6 → 8–6 vs Page FINAL 8–7)."];
  if (n >= 14) return [MV_TB3, "Movement VERIFY: final point; overhead clip ends at 1:19 (also the 8–6 vs 8–7 sequence conflict)."];
  return [MV_TB3, ""];
}
for (const r of ROWS) {
  if (r.match !== MV_FINALS) continue;
  const v = MV_OVR[r.point + "|" + r.timestamp] ?? mvDefault(r.point);
  if (v[0]) r.breakBunker = v[0];
  if (v[1]) r.moves = v[1];
}

// Movement pass (Sun ochos RL vs Canes) from movement/notes/yt-000-036.md. Times are BROADCAST VIDEO min:sec (not match clock); outs matched by point order + lane. Notes' team labels for Fedorov (Canes on roster), Carzlev (Karsliev = RL), Johnson (Michael Johnson = RL), Malloy (not on Canes roster) do not match PBLeagues: VERIFY.
const MV_RLC = "Red Legion vs CK Hurricanes (Sun ochos dual-feed)";
const MV_RLC_TB = "team break: D-corner, D-wedge, center brick, S-wedge, S-corner (both teams) — player not tied to row (VERIFY)";
const MV_RLC_NB = "team break: not given in overhead notes (VERIFY)";
const MV_RLC_OVR: Record<string, [string, string]> = {
  "1|early": ["team break — RL: D-wedge, center 50 brick, snake corner, snake wedge, back center; Canes: D-wedge, center brick, center X, snake wedge, snake (VERIFY)", "video 6:54 break: Canes center-X player out 6:56; RL brick player up 6:57; RL snake-side into snake 7:00; Canes snake-side out 7:01 (summary row, players not tied, VERIFY)"],
  "2|early": [MV_RLC_TB, "video 11:20 point: notes' 'Fedorov (RL)' D1 11:28/D2 11:42/D3 11:51 then 3 kills — Konstantin Fedorov is CK Hurricanes on PBLeagues, team VERIFY; RL dorito out 11:32, RL back center out 11:35 (summary row, VERIFY)"],
  "4|mid ~4:16–4:18": [MV_RLC_NB, "first out of the point, off the break (notes video 20:12 'Carzlev (Canes)'; Pavel Karsliev is Red Legion on PBLeagues, team label VERIFY)"],
  "4|mid ~4:16–4:26": [MV_RLC_NB, "two Canes out snake side ~video 20:30 (packed row; which players VERIFY)"],
  "4|mid ~4:49–4:54": [MV_RLC_NB, "snake push; shot by Corey Hall after Hall went up the snake video 20:47 (Hall kills 20:51 and 20:53)"],
  "6|late-a ~6:30": ["D corner", "filled the D corner video 22:48; out at the Dorito corner (notes label him RL; Konstantin Fedorov is CK Hurricanes on PBLeagues, VERIFY)"],
  "6|late-a ~6:34": ["center clover", "Canes player to the clover video 22:42; out at the center clover (notes name 'Carzlev' is not on the Canes roster, VERIFY)"],
  "6|late-a ~6:45": [MV_RLC_NB, "Canes ran wide snake video 22:39; shot by Corey Hall after Hall went up the snake 23:42 (kills 23:51 and 23:56)"],
  "FINAL|late-a (clock 7:28)": [MV_RLC_NB, "Corey Hall up the snake video 23:42, kills 23:51 and 23:56, hangs 24:08"],
};
for (const r of ROWS) {
  if (r.match !== MV_RLC) continue;
  const o = MV_RLC_OVR[r.point + "|" + r.timestamp];
  let v: [string, string];
  if (o) v = o;
  else if (r.point === "3") v = [MV_RLC_TB, "video 15:34 point: RL center out 15:58; Leonid Smotrov (RL back center) out 16:03; Alexander Berdnikov hangs 17:29; notes' Fedorov/Carzlev/Johnson/Malloy team labels VERIFY — this out not tied to a film move (VERIFY)"];
  else if (r.point === "5") v = ["unbroadcast point (VERIFY)", "Movement VERIFY: 4–0 → 5–0 point not broadcast on the overhead footage."];
  else v = [MV_RLC_NB, "video 22:34 point: RL player out 23:13, Canes player out 23:19 — this out not tied (VERIFY)"];
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Movement pass (Sun AS vs AM dual-feed) from movement/notes/yt-000-036.md + yt-036-072.md. VIDEO times, not match clock. Roster team used, not notes'. Name checks: Clay Hughes=Clayton Hughes AS ok; Hinds, Lackey, Rooney AS ok; Mazurek, Arrieta, Doan, Woodruff, Gladstone AM ok; Stansil~Maxim Stancel, Hoski/Hosky~Ryan Hoskinson, Devin Stewart~Devon Stuart (spelling VERIFY); Green/Greene=James Green is Aftermath (team flipped, VERIFY); Koski, Jetski not on allowlist (VERIFY).
const MV_AA = "Chicago Aftershock vs Perris ASG Aftermath (Sun dual-feed)";
const MV_AA_5W = "team break: D-corner, D-wedge, center brick, S-wedge, S-corner (both teams) — player not tied (VERIFY)";
const MV_AA_NB = "team break: not given in overhead notes (VERIFY)";
const MV_AA_DEF: Record<string, [string, string]> = {
  "1": ["team break — AS: 3 to center X/brick, S-corner, D-corner; AM: S-corner, S-wedge, center brick, D-wedge, D-corner (VERIFY)", "pre-1–0 stretch: notes call this point AS 1–0 but Page has AM 1–0 — out not tied to film (VERIFY)"],
  "2": [MV_AA_5W, "notes video 13:06 point / 12:47 point with no overhead — point mapping and this out VERIFY"],
  "3": [MV_AA_5W, "notes video 18:21 point (→ 2–1) — this out not tied to a film move (VERIFY)"],
  "4": ["3–2 gap: not in overhead notes (VERIFY)", "Movement VERIFY: 2–1 → 3–2 stretch not covered by the notes."],
  "5": ["3–2 gap: not in overhead notes (VERIFY)", "Movement VERIFY: 2–1 → 3–2 stretch not covered by the notes."],
  "6": [MV_AA_NB, "notes 3–2 → 4–2 point — this out not tied (VERIFY)"],
  "7": [MV_AA_NB, "notes 4–2 → 5–2 point — this out not tied (VERIFY)"],
  "8": [MV_AA_NB, "notes 5–2 → 6–2: AS back middle out, Lackey out D-side, 3 more AS out — this out not tied (VERIFY)"],
  "9": [MV_AA_NB, "notes 6–2 → 6–3: AM Woodruff out, rest of AM out — this out not tied (VERIFY)"],
  "10": [MV_AA_NB, "AS down a man, 4-man full press up the middle, minor penalty, all out (team move; players not tied, VERIFY)"],
  "11": ["not on film (VERIFY)", "Movement VERIFY: 7–3 → 9–3 not on film."],
  "12": ["not on film (VERIFY)", "Movement VERIFY: 7–3 → 9–3 not on film."],
  "FINAL": ["not on film (VERIFY)", "Movement VERIFY: 7–3 → 9–3 not on film."],
};
const MV_AA_OVR: Record<string, [string, string]> = {
  "3|Hinds": [MV_AA_5W, "to the center tower video 18:36, out 18:37"],
  "3|Hoski": [MV_AA_5W, "notes: Hosky to the center clover video 18:26, out 18:30 — Page area D3 and name ~Ryan Hoskinson (VERIFY)"],
  "6|Hoski": ["D-brick (VERIFY)", "AS Hoski D-brick, out (name ~Ryan Hoskinson, VERIFY)"],
  "6|Jetski": ["center/snake (VERIFY)", "center/snake, out (Jetski not on allowlist, VERIFY)"],
  "6|Hughes": ["snake", "down the snake, kills Eric Arrieta, then minor penalty"],
  "6|Lackey": [MV_AA_NB, "pulled (minor penalty)"],
  "7|Hinds": ["center", "doubles back center, releases up the middle, minor penalty"],
  "7|Jetski": ["center (VERIFY)", "center, pulled (Jetski not on allowlist, VERIFY)"],
  "7|Hughes": ["snake", "snake, out"],
  "7|Rooney": ["D-side", "D-side, out"],
  "7|Hoski": ["D-side (VERIFY)", "D-side, out (name ~Ryan Hoskinson, VERIFY)"],
  "7|unknown (x3)": [MV_AA_NB, "notes say AM played the pocket with no losses — conflicts with this row (VERIFY)"],
  "8|unknown|BC": ["back middle", "AS back middle, out (player unnamed)"],
  "8|Lackey": ["D-side", "D-side, out — shot in the back by Eric Arrieta sprinting the D-side"],
  "9|Jetski": ["D-brick (VERIFY)", "D-brick, crosses the middle, out (Jetski not on allowlist, VERIFY)"],
  "9|Rooney": [MV_AA_NB, "out"],
  "9|Woodruff": [MV_AA_NB, "out"],
  "10|Mazurek": [MV_AA_NB, "out (AM Mazurek out on the 6–3 → 7–3 point)"],
};
for (const r of ROWS) {
  if (r.match !== MV_AA) continue;
  const v = MV_AA_OVR[r.point + "|" + r.playerOut + "|" + r.area] ?? MV_AA_OVR[r.point + "|" + r.playerOut] ?? MV_AA_DEF[r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Movement pass (Sun QFs TB vs SEA, EDM vs SD) from movement/notes/yt-072-108.md + yt-108-144.md (commentary names). vt = batch video time; plain m:ss = match clock. Roster teams used. Name checks: Brian Smith~Bryan Smith, Sheer~Chris Schehr, Shrader/Schrader~Nathan Schroeder, Laval/Leival=Nicholas Leival, Yakhim~Zachary Yachimec (spelling VERIFY); Stanczak (Timothy Stanczak, Impact) and Frye (Harrison Frye, Dynasty) shown on both teams in notes: VERIFY; ABJ=Archie Barnes (Dynasty); Challenger/Borromeo are Uprising on roster.
const MV_QF_TB = "Tampa Bay Damage vs Seattle Uprising (Sun QF dual-feed)";
const MV_QF_ED = "Edmonton Impact vs San Diego Dynasty (Sun QF dual-feed)";
const MV_QF_NB = "team break: not given in notes (VERIFY)";
const MV_QF_DEF: Record<string, [string, string]> = {
  "TB|1": ["not in notes (VERIFY)", "Movement VERIFY: 0–1 point not in the notes batch."],
  "TB|2": ["team break — Damage: Margott back center, Busiere D-side, K. Brown snake side, Goldman middle (VERIFY)", "Uprising: Graham Arnold D-side out vt 01:06, Uprising swept — this out not tied (VERIFY)"],
  "TB|3": [MV_QF_NB, "2–0 → 2–1 point — this out not tied (VERIFY)"],
  "TB|4": [MV_QF_NB, "Uprising lose 2 fast; Arnold left 1v3, concede — this out not tied (VERIFY)"],
  "TB|5": [MV_QF_NB, "notes' 3–1 → 4–1 point; notes give 5–1 vs Page path (numbering VERIFY) — this out not tied (VERIFY)"],
  "TB|6": [MV_QF_NB, "notes' point ends in a major pulling Graham Arnold and Cole Scott, concede; Damage 5–1 numbering vs Page path VERIFY — this out not tied (VERIFY)"],
  "TB|7": ["break not shown (VERIFY)", "5–1 → 5–2 point — this out not tied (VERIFY)"],
  "TB|end": ["break not shown (VERIFY)", "notes say Uprising hang the 5–2 point — conflicts with this out (VERIFY)"],
  "TB|FINAL": ["—", "FINAL Damage 5–2 per commentary"],
  "ED|1": ["not in notes (VERIFY)", "Movement VERIFY: point before the notes batch."],
  "ED|2": ["not in notes (VERIFY)", "Movement VERIFY: point before the notes batch."],
  "ED|3": ["team break — Impact: Vanderbyl D-side, J. Cornell snake, Harmon back center, Frye snake side; Dynasty: Urena snake, Yarber snake side, Andrade snake-side tower, Stanczak back center, Weaver D clover (Frye/Stanczak team VERIFY)", "Dynasty outs: Yarber shot by Justin Cornell vt 04:43, Andrade dead-out vt 04:29, Weaver out to a Stanczak drop shot vt 05:39 — this row not tied (VERIFY)"],
  "ED|4": [MV_QF_NB, "Dynasty: Urena out to Cornell 10:50, Archie Barnes out 10:53 — this row not tied (VERIFY)"],
  "ED|5": ["missing point (VERIFY)", "Movement VERIFY: notes path 3–1 → 4–1 → 4–2 does not match Page 3–2; 4–1 → 4–2 point missing."],
  "ED|6": [MV_QF_NB, "notes' 3–1 → 4–1 point (Page 4–2; numbering VERIFY): Dynasty Yarber out 9:45, Arturo Andrade out to Harmon vt 21:01, Rau shot by Stanczak vt 20:49, O'Mara out to B. Cornell — this row not tied (VERIFY)"],
  "ED|7": ["no overhead (VERIFY)", "Movement VERIFY: 4–2 → 5–2 point has no overhead."],
  "ED|8": [MV_QF_NB, "Dynasty 3–5 point (break 5:30 wide) — this Impact out not tied (VERIFY)"],
  "ED|9": [MV_QF_NB, "Impact Leival out off the break 3:20; Weaver (Dynasty) shot by Justin Cornell 1:07; Dynasty concede — row not tied (VERIFY)"],
  "ED|10": [MV_QF_NB, "6–3 → 6–4 point — this out not tied (VERIFY)"],
  "ED|11": ["not in notes (VERIFY)", "Movement VERIFY: 6–4 → 7–4 final point not in the notes."],
  "ED|FINAL": ["not in notes (VERIFY)", "Movement VERIFY: 7–4 final point not in the notes."],
};
const MV_QF_OVR: Record<string, [string, string]> = {
  "TB|3|Busiere": ["D-side", "D-side → brick vt 12:35, out to friendly fire from Keith Brown vt 12:48"],
  "TB|4|Challenger": [MV_QF_NB, "shot cross-field vt 17:41 (Damage minor); Page lists Damage but Ben Challenger is Uprising on roster (VERIFY)"],
  "TB|5|Smith": [MV_QF_NB, "out to Graham Arnold vt 22:22 (notes 'Brian' ~ Bryan Smith; point numbering VERIFY)"],
  "TB|5|Mouse Goldman": ["middle (VERIFY)", "middle, then runs the snake vt 22:41 (point numbering VERIFY)"],
  "TB|5|Woodward": [MV_QF_NB, "walks vt 21:56 (point numbering VERIFY)"],
  "TB|5|Schrader": [MV_QF_NB, "kills Jacob Edwards vt 23:02, then major penalty (name ~Nathan Schroeder; point numbering VERIFY)"],
  "TB|6|Graham": [MV_QF_NB, "pulled on Shrader's major (Graham Arnold; point numbering VERIFY)"],
  "TB|6|Scott": [MV_QF_NB, "pulled on Shrader's major (Cole Scott; point numbering VERIFY)"],
  "TB|7|Keith Brown": ["break not shown (VERIFY)", "outside snake gap, shot by Cole Scott 1:18"],
  "TB|7|Mouse Goldman": ["break not shown (VERIFY)", "drops to the middle 2:25"],
  "TB|7|unknown|D-side": ["small D brick (VERIFY)", "likely Jacob Edwards: small D brick, trades at 2:40 (row unnamed, VERIFY)"],
  "ED|4|Fry": ["D3 (VERIFY)", "Frye D3 per notes; Harrison Frye is Dynasty on roster, Page lists Impact (VERIFY)"],
  "ED|7|ABJ": ["no overhead (VERIFY)", "no overhead; Archie Barnes is Dynasty on roster, Page lists Impact (VERIFY)"],
  "ED|10|Dalton": [MV_QF_NB, "Dalton Vanderbyl out 1:25 (lane not given this point; Page area Snake, VERIFY)"],
  "ED|10|Stanszak": [MV_QF_NB, "not named in 6–3 → 6–4 notes; Stanczak team shown both ways (VERIFY)"],
  "ED|10|Weaver #21": [MV_QF_NB, "Eliot Weaver attacks the middle 1:22 (Page area Snake, VERIFY)"],
};
for (const r of ROWS) {
  const k = r.match === MV_QF_TB ? "TB" : r.match === MV_QF_ED ? "ED" : "";
  if (!k) continue;
  const v = MV_QF_OVR[k + "|" + r.point + "|" + r.playerOut + "|" + r.area] ?? MV_QF_OVR[k + "|" + r.point + "|" + r.playerOut] ?? MV_QF_DEF[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Movement pass (Sun QFs RL vs FIT, TonTon vs AM) from movement/notes/yt-108-144.md + yt-144-183.md (commentary; clock = match clock). Roster teams used. Names: Chavez, Garringer (notes 'Geringer'), Scott Stewart, Mason-Salinas = FIT; Colt Luchau ~ Tyler Luckau, Seba ~ Jacob Sebaugh (VERIFY); Malloy not on any allowlist roster (VERIFY); 'Sergey' = Sergey Solnyshkov (RL). TonTon: Portier, Anfossi (Enfosi/Fozi), Hugo Verhaeghe, Ben Carroll, Axel Gaudin; Spitsma ~ Thomas Szpytma, Promholtz/Fromholz/Krombholz ~ Adrien Krompholtz (VERIFY); Greany unmatched (VERIFY). AM: Devin Stuart ~ Devon Stuart, Mazurick = Mazurek, Dohn = Doan.
const MV_Q2_RF = "Red Legion vs PaintballFIT (Sun QF dual-feed)";
const MV_Q2_TA = "TonTon Arsenal vs Perris ASG Aftermath (Sun QF dual-feed)";
const MV_Q2_NB = "team break: not given in notes (VERIFY)";
const MV_Q2_DEF: Record<string, [string, string]> = {
  "RF|1": [MV_Q2_NB, "notes' first point is RL 1–0 (Sergey kills Stewart and Luchau; Hall cross-field kill) but Page P1 is FIT 1–0 — order VERIFY, row not tied"],
  "RF|2": [MV_Q2_NB, "notes' 1–0 → 1–1 FIT point: no break shot; Luchau back center out, Malloy out, Hall pops the clover — order VERIFY, row not tied"],
  "RF|3": ["no overhead (VERIFY)", "Movement VERIFY: 1–1 → 2–1 point has no overhead (Smotrov kills Chavez per commentary)."],
  "RF|4": [MV_Q2_NB, "2–1 → 2–2: Smotrov snake can and Sergey back center out early; Malloy shot + penalty, Hall pulled; Karsliev concedes — row not tied (VERIFY)"],
  "RF|5": [MV_Q2_NB, "2–2 → 3–2: Karsliev runs the D-side to the buzzer, kills Mason-Salinas and Seba; Stewart out early — row not tied (VERIFY)"],
  "RF|6": [MV_Q2_NB, "3–2 → 4–2 point — this out not tied (VERIFY)"],
  "RF|7": [MV_Q2_NB, "notes path 4–2 → 4–3 → 4–4 → 5–4 does not match Page 5–2 here (VERIFY)"],
  "RF|8": [MV_Q2_NB, "notes path 4–2 → 4–3 → 4–4 → 5–4 does not match Page 5–3 here (VERIFY)"],
  "RF|9": [MV_Q2_NB, "notes path 4–2 → 4–3 → 4–4 → 5–4 does not match Page 5–4 here (VERIFY)"],
  "RF|10": [MV_Q2_NB, "final point (0:15): Malloy snake kills Geringer, Karsliev D-side kills Chavez, Smotrov up the center to the buzzer — row not tied (VERIFY)"],
  "RF|FINAL": ["—", "final point: Malloy (not on roster, VERIFY) snake kills Garringer; Karsliev D-side kills Chavez; Smotrov up the center, buzzer"],
  "TA|1": [MV_Q2_NB, "P1 (yt-108-144): AM Arrieta S1 out 12:29, Gladstone fills, Carter S3; TonTon Gaudin D-side out 14:15; cut away before the end — row not tied (VERIFY)"],
  "TA|2": ["not in notes (VERIFY)", "Movement VERIFY: 1–0 → 2–0 point not in the notes."],
  "TA|3": ["team break — TonTon: Portier snake corner, Anfossi snake can, Szpytma back center, Krompholtz D can, Gaudin D back corner; AM: Arrieta snake corner, Woodruff inside, Stuart snake side, Doan dorito side (VERIFY)", "2–0 → 3–0: Woodruff out early inside, Arrieta trades, Krompholtz kills Doan — row not tied (VERIFY)"],
  "TA|4": [MV_Q2_NB, "3–0 → 3–1: TonTon lose 2 off the break incl. Hugo; Gladstone cleans up — row not tied (VERIFY)"],
  "TA|5": ["not shown (VERIFY)", "Movement VERIFY: 3–1 → 4–1 point not shown."],
  "TA|6": ["no overhead (VERIFY)", "Movement VERIFY: 4–1 → 5–1 point has no overhead (AM conservative; Mazurek and Carter last alive, concede)."],
  "TA|7": [MV_Q2_NB, "notes' 5–1 → 6–1 mercy point (Page 5–2; numbering VERIFY) — row not tied"],
  "TA|8": ["not in notes (VERIFY)", "Movement VERIFY: broadcast ends at 6–1 mercy; Page point 6–2 not on film."],
  "TA|9": ["not in notes (VERIFY)", "Movement VERIFY: broadcast ends at 6–1 mercy; Page point 7–2 not on film."],
  "TA|10": ["not in notes (VERIFY)", "Movement VERIFY: broadcast ends at 6–1 mercy; Page point 8–2 not on film."],
  "TA|FINAL": ["—", "VERIFY: broadcast calls a TonTon mercy-rule win at 6–1; Page FINAL 8–2 (score unchanged)."],
};
const MV_Q2_OVR: Record<string, [string, string]> = {
  "RF|6|Chavez": ["D3", "D3, pulled on a penalty"],
  "RF|6|Garringer": ["snake (VERIFY)", "snake, out per notes (Page area Dorito, VERIFY)"],
  "RF|6|Malloy": [MV_Q2_NB, "Malloy not on allowlist; Page lists FIT (VERIFY)"],
  "RF|10|Cyrus Garringer": [MV_Q2_NB, "killed by Malloy on the snake (Malloy not on roster; Page area center, VERIFY)"],
  "RF|10|Pavel Karsliev": ["D-side (VERIFY)", "D-side, kills Chavez (Page has him out at Silverbelly, VERIFY)"],
  "RF|10|Leonid Smotrov": [MV_Q2_NB, "up the center to the buzzer (Page has him out on the snake, VERIFY)"],
  "TA|6|Cody Woodruff": ["inside (VERIFY)", "out early inside (notes' 2–0 → 3–0 point; numbering VERIFY)"],
  "TA|6|Devin Stuart": ["snake side (VERIFY)", "snake side, shoots Portier (notes' 2–0 → 3–0 point; numbering VERIFY)"],
  "TA|6|Arrieta (+ remaining)": ["snake corner (VERIFY)", "snake corner, trades (notes' 2–0 → 3–0 point; numbering VERIFY)"],
  "TA|7|Benny Carroll": [MV_Q2_NB, "drops (notes' mercy point; numbering VERIFY)"],
  "TA|7|Hugo": ["S1 (VERIFY)", "S1 (notes' mercy point; numbering VERIFY)"],
  "TA|7|Mazurick": ["D-side (VERIFY)", "blown open on the D-side, then AM concede (notes' mercy point; numbering VERIFY)"],
  "TA|7|Gladstone": [MV_Q2_NB, "notes' 3–0 → 3–1 point: middle, cleans up, runs center to the buzzer (numbering VERIFY)"],
};
for (const r of ROWS) {
  const k = r.match === MV_Q2_RF ? "RF" : r.match === MV_Q2_TA ? "TA" : "";
  if (!k) continue;
  const v = MV_Q2_OVR[k + "|" + r.point + "|" + r.playerOut] ?? MV_Q2_DEF[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Movement pass (Sun Set 4 semis) from movement/notes/set4-p1-3.md + set4-p4-5b.md. LOW CONFIDENCE watches: team-break only, no player-specific values; clock = match clock.
const MV_SF_RI = "Red Legion vs Edmonton Impact (Sun Set 4 semis MLPB+)";
const MV_SF_DT = "Tampa Bay Damage vs TonTon Arsenal (Sun Set 4 semis MLPB+)";
const MV_SF_LC = " (VERIFY, low-conf overhead)";
const MV_SF_NO: [string, string] = ["no overhead (VERIFY)", "Movement VERIFY: point not shown in the low-conf notes."];
const MV_SF: Record<string, [string, string]> = {
  "RI|1": ["team break: RL snake wedge, snake mini, home, D wedge, D pin; Impact snake corner, snake pin, home, D pin, D mini" + MV_SF_LC, "Impact win, buzzer 14:03" + MV_SF_LC],
  "RI|2": ["team break: not described, break 13:51" + MV_SF_LC, "Impact win on a penalty (2–0)" + MV_SF_LC],
  "RI|3": ["team break: not described, break 13:32" + MV_SF_LC, "RL win (2–1)" + MV_SF_LC],
  "RI|4": ["team break: not described, break 12:24" + MV_SF_LC, "RL win (2–2)" + MV_SF_LC],
  "RI|5": ["no overhead (VERIFY)", "Movement VERIFY: notes claim Impact won 3 straight to 5–2 off camera; Page has RL 3–2."],
  "RI|6": ["no overhead (VERIFY)", "Movement VERIFY: notes claim Impact won 3 straight to 5–2 off camera; Page has RL 4–2."],
  "RI|7": ["no overhead (VERIFY)", "Movement VERIFY: notes claim Impact won 3 straight to 5–2 off camera; Page has RL 5–2."],
  "RI|8": ["team break: not described, break 8:32" + MV_SF_LC, "notes call this Impact 6–2; Page has Impact 3–5 (score label conflict, VERIFY)"],
  "RI|9": ["team break: RL into S2 7:22 and D2 7:17, break 7:27" + MV_SF_LC, "RL buzzer 6:52 (6–3)" + MV_SF_LC],
  "RI|10": ["team break: both teams into S1, break 6:52" + MV_SF_LC, "Impact up the D-side 6:38; RL buzzer 4:16 (7–3)" + MV_SF_LC],
  "RI|11": ["team break: not described, break 4:09" + MV_SF_LC, "Impact up the D-side 3:45; buzzer 2:43 (7–4)" + MV_SF_LC],
  "RI|12": MV_SF_NO,
  "RI|13": MV_SF_NO,
  "RI|14": ["team break: not described, break 1:08" + MV_SF_LC, "RL buzzer 0:02 (10–4)" + MV_SF_LC],
  "RI|FINAL": ["—", "FINAL RL 10–4; notes' 5–2/6–2 Impact path conflicts with Page (VERIFY)"],
  "DT|1": ["team break: Damage snake corner, snake wedge, home, D mini, D wedge; TonTon snake wedge, home, center mini, D wedge, D mini" + MV_SF_LC, "Damage win, break 15:00" + MV_SF_LC],
  "DT|2": MV_SF_NO,
  "DT|3": ["team break: not described" + MV_SF_LC, "notes have TonTon winning at 12:23 / 11:26 / 10:25 to 3–2 TonTon; Page has Damage 3–0 (conflict, VERIFY)"],
  "DT|3b": ["team break: not described" + MV_SF_LC, "notes' TonTon 3–2 path conflicts with Page Damage 3–0 (VERIFY)"],
  "DT|4": ["team break: not described, break 8:52" + MV_SF_LC, "notes: Damage 3–3 → 4–3; Page has TonTon 1–3 (conflict, VERIFY)"],
  "DT|5": ["team break: not described, break 7:37" + MV_SF_LC, "notes: Damage 5–3; Page has Damage 4–1 (conflict, VERIFY)"],
  "DT|6": MV_SF_NO,
  "DT|7": MV_SF_NO,
  "DT|8": ["team break: not described" + MV_SF_LC, "TonTon win, buzzer 3:33 (6–2)" + MV_SF_LC],
  "DT|9": ["team break: Damage into S1 3:30, break 3:33" + MV_SF_LC, "Damage deeper into the snake 2:13; buzzer 2:07 (7–2)" + MV_SF_LC],
  "DT|9b": ["team break: not described, break 2:07" + MV_SF_LC, "TonTon win, buzzer 1:35 (7–3); Page labels this 9b (VERIFY)"],
  "DT|10": ["team break: not described, break 2:07" + MV_SF_LC, "TonTon 7–3 point, buzzer 1:35; Page row is score-only (VERIFY)"],
  "DT|11": MV_SF_NO,
  "DT|12": MV_SF_NO,
  "DT|13": MV_SF_NO,
  "DT|FINAL": ["—", "FINAL Damage 7–5; 7–3 → 7–5 not shown, and notes' 3–2 TonTon / 5–3 Damage path conflicts with Page (VERIFY)"],
};
for (const r of ROWS) {
  const k = r.match === MV_SF_RI ? "RI" : r.match === MV_SF_DT ? "DT" : "";
  if (!k) continue;
  const v = MV_SF[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Sun Semi Finals split games — split.md (parts 1,3,4,7; part 2 missing), LOW confidence, team-break only
const MV_SP_XC = "San Antonio X-Factor vs CK Hurricanes (Sun Semi Finals, split game)";
const MV_SP_UI = "Seattle Uprising vs Edmonton Impact (Sun Semi Finals, split game)";
const MV_SP_NO: [string, string] = ["no overhead (VERIFY)", "Movement VERIFY: point not shown, or in missing part 2, of split notes."];
const MV_SP: Record<string, [string, string]> = {
  "XC|1": ["no overhead (VERIFY)", "No break overhead. XF later seen at back center, center wedge, near D, top snake; XF wedge player moves into snake 13:00 (VERIFY, low-conf overhead)"],
  "XC|2": ["team break: Canes snake, back center, D, inner D; XF snake, inner snake, back center, D, inner D (VERIFY, low-conf overhead)", "Canes snake out 10:02, D out 8:44; XF push 8:34 (VERIFY, low-conf overhead)"],
  "XC|3": ["team break 7:30, positions not listed (VERIFY, low-conf overhead)", "Canes D out 5:42, snake out 4:18; XF snake advances, crosses the 50 at 4:00; notes end 2:58 unresolved (VERIFY, low-conf overhead)"],
  "XC|4": MV_SP_NO,
  "XC|5": MV_SP_NO,
  "XC|6": MV_SP_NO,
  "XC|OT": ["no overhead (VERIFY)", "OT: XF snake pushes 2:40 and clears; buzzer 2:34 (VERIFY, low-conf overhead)"],
  "UI|1": ["no overhead (VERIFY)", "One Uprising player out off the break; Uprising snake out 12:59, D out 12:07; Impact snake crosses the 50 at 12:27 (VERIFY, low-conf overhead)"],
  "UI|2": ["no overhead (VERIFY)", "Uprising snake out 9:34; Uprising back center shifts toward snake 5:02, out 3:24; Impact snake keeps pushing; buzzer 2:32. Notes call this Impact 2–0, Page has 1–1 (VERIFY, low-conf overhead)"],
  "UI|3": MV_SP_NO,
  "UI|4": MV_SP_NO,
};
for (const r of ROWS) {
  const k = r.match === MV_SP_XC ? "XC" : r.match === MV_SP_UI ? "UI" : "";
  if (!k) continue;
  const v = MV_SP[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
}

// Sat Set 1 + Set 3 movement — notes/sat s1-a, s1-b, s2-c (Set 3 part), s3-a, s3-b; named moves only (generic 5-slot breakouts omitted)
const MV_S13_AN = "Chicago Aftershock vs New York Xtreme (Sat Set 1)";
const MV_S13_HC = "Houston Heat vs Atlanta Jungle Cats (Sat Set 1)";
const MV_S13_DC = "Tampa Bay Damage vs Atlanta Jungle Cats (Sat Set 3)";
const MV_S13_FN = "PaintballFIT vs New York Xtreme (Sat Set 3)";
const MV_S13_NO: [string, string] = ["no overhead (VERIFY)", "Movement VERIFY: point not shown in the Sat notes."];
const MV_S13: Record<string, [string, string]> = {
  "AN|1": ["no overhead (VERIFY)", "AS: Jet (Isidro, VERIFY) back center → center wedge 14:19 → big brick 14:15 → through the middle 11:21."],
  "AN|2": ["no overhead (VERIFY)", "Notes' NYX point (desynced, names VERIFY): AS lose 3 off the break; NYX buzzer 11:00. Score-path VERIFY: notes AS 2–0 before NYX's first point, Page NYX 1–1."],
  "AN|3": ["no overhead (VERIFY)", "Notes' AS 2–0 point mapped here (score-path VERIFY). NYX: Hussain ('Harris Hussein', VERIFY) out off the break; Navarro out 13:46; Lopez D3, out to Hoskinson 12:13; Demers back corner; a player read as Oller (Cats, VERIFY) S3. AS: a player read as Taylor (NYX, VERIFY) out off the break; Jet up the middle 13:30, cross-court kill 11:46; Clay Hughes S1 12:38; Hoskinson down the D-side 12:13."],
  "AN|4": ["no overhead (VERIFY)", "Desynced (names VERIFY): NYX Hussain secondary; Navarro clover; Lackey ('Laki') out first."],
  "AN|5": ["no overhead (VERIFY)", "NYX push the D-side; AS push the snake 50. The clip cuts off mid-point."],
  "AN|6": MV_S13_NO,
  "AN|7": MV_S13_NO,
  "AN|8": ["no overhead", "NYX: snake corner player out off the break; Demers snake tower, bunkered by Clay Hughes; 'Aztek' (name VERIFY) last alive on the D-side, out. AS: Hughes center tower → through the middle, bunkers Demers."],
  "AN|9": ["no overhead", "NYX: center player out on the break; Josh Taylor D3, last alive, out. AS: Jet and Hoskinson out; Stancel up the D-side; Lackey and Hinds hold the snake side."],
  "AN|10": ["no overhead", "NYX: snake pin → brick; Navarro S2 kill; Lopez cuts the middle for a 3-pack. AS: Hoskinson shot running to the snake clover off the break; Jet through the middle to the brick."],
  "AN|11": ["no overhead (VERIFY)", "Movement VERIFY: notes skip two points to 6–7, while the Page has three (P11–P13)."],
  "AN|12": ["no overhead (VERIFY)", "Movement VERIFY: notes skip two points to 6–7, while the Page has three (P11–P13)."],
  "AN|13": ["no overhead (VERIFY)", "Movement VERIFY: notes skip two points to 6–7, while the Page has three (P11–P13)."],
  "AN|14": ["no overhead", "NYX: Berkley snake tower, out; a NYX D-side player shoots Hoskinson; Josh Taylor and Lopez down the D-side; Demers through the center, trades with Hinds; Taylor shoots Rooney. AS: Hoskinson and Lackey snake clover; center player out on the break; Rooney into D1, last alive, out; Hinds center trade."],
  "AN|15": ["no overhead (VERIFY)", "NYX: Demers short, out; Hussain snake tower, pulled on Demers's minor; Berkley back center, out. A 'Smughes' major concedes the point (team and name VERIFY)."],
  "AN|16": ["no overhead", "AS: Hoskinson runs for the D clover, out on the break; Mason Hinds runs down the snake and clears NYX; Lackey doubles the snake, out. Buzzer."],
  "HC|1": ["no overhead", "Heat: Mickowski snake corner; Moorhead D-side; Saldana snake clover 12:11 → snake dorito 12:05. Cats: two players to S3 and the snake corner; Dipolito closes it 11:21."],
  "HC|2": ["no overhead", "Heat: Saldana past the 50 on the snake 11:09, wraps, gets a kill. Cats: Stephens out early on the snake 11:05."],
  "HC|3": ["no overhead", "Cats lose 3 off the break. Heat: Saldana S4 10:25; Mickowski runs 10:21; Cats concede."],
  "HC|4": ["no overhead", "Heat: back center player out 10:15; Saldana clover 9:49; Knyazev D-side 9:41, out 8:12; Mickowski pinched out 7:31. Cats: Oller S3 9:49; Stephens backs him up → S4 7:53 → D brick 7:47 with Dipolito → down the snake 7:34; Tiner trades with Knyazev on the D-side 8:12."],
  "HC|5": ["team break: Heat tower + can (VERIFY, desync)", "Desynced, names VERIFY: Saldana S3 7:05; Knyazev out wide, out 6:50; Dizon S1 6:45; Moorhead D brick, kills Tiner 6:51; Mickowski back right corner. Cut before the point ends."],
  "HC|6": MV_S13_NO,
  "HC|7": ["no overhead (VERIFY)", "Clip joins with 0:09 left; no break shot. VERIFY: notes call the score 3–4 at that point, Page has 3–3 before this point and the final at clock 1:08."],
  "DC|1": ["no overhead (VERIFY)", "Goldman wraps the center brick and kills McGowan, last alive (VERIFY: the Page's last out is Stephens)."],
  "DC|2": ["no overhead (VERIFY)", "No visual. Notes: Margott and 'Chad Bouchez' (≈ Busiere, VERIFY) out of the D clover; Damage concede. Score-path VERIFY: notes 1–1, Page Damage 2–0."],
  "DC|3": ["no overhead (VERIFY)", "Score-path VERIFY (notes 1–1 → Damage 2–1). Damage: Margott back center Aztec → snake Aztec 13:30 → into the snake 12:43; Bryan Smith snake corner; Busiere center wedge; Edwards kills Stephens 11:55. Cats: 'Blane' (not on the allowlist, VERIFY) snake, minor 13:10 (Smith pulled); Stephens snake side → back center 12:16 → snake GP29 12:05, out 11:55; Tiner and McGowan out 12:26."],
  "DC|4": ["no overhead (VERIFY)", "Score-path VERIFY (notes 2–1 → 3–1). Cats: 'Blane' (VERIFY) snake corner → snake clover, killed by Goldman; McGowan D corner, killed by Goldman; Stephens back center, out to Schehr 11:11; Tiner out 11:21. Damage: Goldman snake corner → clover, 2 kills, then out."],
  "DC|5": ["no overhead (VERIFY)", "Score-path VERIFY (notes 3–1 → 4–1). Damage: Goldman big center brick, shot 10:32; Schehr out; Margott back center; Keith Brown barrel. Cats: Stephens snake corner → back center 10:17 → D-side 10:10. (The notes' 4–1 → 5–1 point has no Page point.)"],
  "DC|6": ["no overhead", "Damage: Margott mid, out 6:43; Busiere out 6:39; Smith, Schehr and Brown out early. Cats: Tiner D-side → D bunker 6:22, multiple kills."],
  "DC|7": ["no overhead", "Cats: Blane (VERIFY) S1 6:12; McGowan wraps the center brick 5:48, out 5:40; Oller snake side; Tiner D brick 5:11, up the D-side, kills Edwards 4:31; Stephens Aztec 3:54 → D-side 3:51, kills Goldman 2:39 and Margott 2:35. Damage: Goldman to the snake 50 at 5:58; Edwards D1 5:17; Busiere out 2:48 (goggle); Margott back center."],
  "DC|8": ["no overhead (VERIFY)", "Movement VERIFY: notes go 6–4 → 8–4 in one point (extra point on a penalty); this 7–4 point isn't shown."],
  "DC|9": ["no overhead (VERIFY)", "Notes' 6–4 → 8–4 penalty point (VERIFY). Cats: Blane (VERIFY) out 1:29; Ireland out in the clover 1:29 and Horn D-side trade 0:59 (both Damage on the roster, listed as Cats; VERIFY). Damage: Schehr deep into the clover 2:15, penalty 0:53; Smith into the opposite clover 2:15."],
  "DC|10": ["no overhead (VERIFY)", "Cats: Blane (VERIFY) down the snake, out 0:31; Ireland clover kill 0:28 and Horn pushes D 0:17 (both Damage on the roster, VERIFY). Damage: Smith attacks the brick 0:41."],
  "FN|1": ["no overhead (VERIFY)", "Hussain ('Harris Hussein', VERIFY) S1; Mason-Salinas S3 (notes say NYX, roster says FIT; VERIFY); Chavez out. Notes say NYX won this point; Page and the highlight scorebug say FIT 1–0."],
  "FN|2": ["no overhead (VERIFY)", "FIT: Stewart through the middle to the center brick, survives; Mason-Salinas (FIT on the roster, VERIFY) over the top early. NYX: Hussain out early. 'Blane' (Cats name, VERIFY) out about 12:07."],
  "FN|3": ["no overhead (VERIFY)", "FIT: Stewart D tower. NYX: Hussain back center, out 11:18; Lopez out 11:13; Josh Taylor out 11:03; concede."],
  "FN|4": ["no overhead (VERIFY)", "NYX: Demers clover; Josh Taylor out off the break; Navarro shot in the back 10:22; Lopez out 10:14. FIT: 'Smith' (not on the FIT roster, VERIFY) wins the gunfight 10:05."],
  "FN|5": ["no overhead (VERIFY)", "Commentary: Chavez D3; Berkley out to Sebaugh."],
  "FN|6": MV_S13_NO,
  "FN|7": ["no overhead (VERIFY)", "Notes: NYX penalty off the break, concede. VERIFY: the Page logs Sebaugh out at 8:47 in this point."],
  "FN|8": ["no overhead (VERIFY)", "NYX: Lopez back-left snake → next snake bunker 8:19, out 8:09; Hussain penalty 8:11, Navarro pulled; Berkley and Taylor last two. FIT: Luckau ('Colt Luchau', VERIFY) mid D-side, bunkered 7:27. Highlight scorebug still shows 6–1."],
};
// player-specific overrides: key|point|playerOut prefix
const MV_S13_P: [string, string, string, string, string][] = [
  ["AN", "3", "Clay Hughes", "S1 (VERIFY)", "Clay Hughes S1 12:38 (notes' AS 2–0 point, score-path VERIFY)"],
  ["AN", "8", "Demers", "snake tower", "Demers snake tower, bunkered by Clay Hughes."],
  ["AN", "8", "Clay Hughes", "center tower", "Clay Hughes center tower → through the middle, bunkers Demers."],
  ["AN", "9", "Josh Taylor", "D3", "Josh Taylor D3, last alive, out."],
  ["AN", "9", "Stancel", "D-side (VERIFY)", "Stancel up the D-side (Page ID 'Stancel (?)', VERIFY)."],
  ["AN", "10", "Hoskinson", "snake clover", "Hoskinson shot running to the snake clover off the break."],
  ["AN", "10", "Jet", "brick (VERIFY)", "Jet (Isidro, VERIFY) through the middle to the brick."],
  ["AN", "10", "Navarro", "S2", "Navarro S2, gets a kill."],
  ["AN", "14", "Lackey", "snake clover", "Lackey snake clover."],
  ["AN", "14", "Demers", "center", "Demers through the center, trades with Hinds."],
  ["AN", "15", "Hussain", "snake tower (VERIFY)", "Hussain ('Harris Hussein', VERIFY) snake tower, pulled on Demers's minor."],
  ["HC", "1", "Ryan Moorhead", "D-side", "Moorhead D-side."],
  ["HC", "1", "Cody Mickowski", "snake corner", "Mickowski snake corner, out 11:51."],
  ["HC", "1", "Andres Ramos Saldana", "snake clover", "Saldana snake clover 12:11 → snake dorito 12:05, out 11:51."],
  ["HC", "2", "Davis Stephens", "snake", "Stephens out early on the snake 11:05."],
  ["HC", "4", "Joseph Oller", "S3", "Oller S3 9:49."],
  ["HC", "4", "Andres Ramos Saldana", "clover", "Saldana clover 9:49."],
  ["HC", "4", "Mikhail Knyazev", "D-side", "Knyazev D-side 9:41; trades with Tiner, out 8:12."],
  ["HC", "4", "Cody Mickowski", "snake", "Mickowski pinched out 7:31."],
  ["HC", "5", "Ronny Tyner", "D-side (VERIFY)", "Tiner killed by Moorhead from the D brick 6:51 (desync, VERIFY)."],
  ["DC", "1", "McGowan", "center (VERIFY)", "Killed by Goldman wrapping the center brick, last alive (VERIFY: the Page's last out is Stephens)."],
  ["DC", "4", "Blaine", "snake corner (VERIFY)", "Blaine/'Blane' (not on the allowlist, VERIFY) snake corner → snake clover, killed by Goldman."],
  ["DC", "4", "Davis Stephens", "back center (VERIFY)", "Stephens back center, out to Schehr 11:11 (score-path VERIFY)."],
  ["DC", "4", "Oller", "(VERIFY)", "Oller: no named move in the notes (VERIFY)."],
  ["DC", "4", "Alex Goldman", "snake corner (VERIFY)", "Goldman snake corner → clover, 2 kills, then out (score-path VERIFY)."],
  ["DC", "6", "Marcello Margott", "mid", "Margott mid, out 6:43."],
  ["DC", "6", "Busiere", "—", "Busiere out 6:39."],
  ["DC", "6", "Brown", "—", "Keith Brown out early."],
  ["DC", "6", "Smith", "—", "Bryan Smith out early."],
  ["DC", "7", "McGowan", "center brick", "McGowan wraps the center brick 5:48, out 5:40."],
  ["DC", "7", "Jacob Edwards", "D1", "Edwards D1 5:17, killed by Tiner 4:31."],
  ["DC", "7", "Busiere", "—", "Busiere out 2:48 (goggle)."],
  ["DC", "7", "Marcello Margott", "back center", "Margott back center, killed by Stephens 2:35."],
  ["DC", "7", "Alex Goldman", "snake", "Goldman to the snake 50 at 5:58, killed by Stephens 2:39."],
  ["DC", "7", "Oller", "snake side", "Oller snake side."],
  ["DC", "9", "Blaine", "(VERIFY)", "Blaine/'Blane' (VERIFY) out 1:29."],
  ["DC", "9", "Smith", "clover (VERIFY)", "Smith into the opposite clover 2:15 (penalty-point VERIFY)."],
  ["DC", "10", "Blaine", "snake (VERIFY)", "Blaine/'Blane' (VERIFY) down the snake, out 0:31."],
  ["FN", "8", "Navarro", "(VERIFY)", "Navarro pulled on Hussain's penalty 8:11 (VERIFY)."],
  ["FN", "8", "Hussain", "(VERIFY)", "Hussain ('Harris Hussein', VERIFY) penalty 8:11."],
];
for (const r of ROWS) {
  const k = r.match === MV_S13_AN ? "AN" : r.match === MV_S13_HC ? "HC" : r.match === MV_S13_DC ? "DC" : r.match === MV_S13_FN ? "FN" : "";
  if (!k) continue;
  const v = MV_S13[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
  const p = MV_S13_P.find((x) => x[0] === k && x[1] === r.point && r.playerOut.startsWith(x[2]));
  if (p) { r.breakBunker = p[3]; r.moves = p[4]; }
}

// Sat Set 2 movement — notes/sat s2-a, s2-b, s2-c (OT); named commentary only
const MV_S2_UI = "Seattle Uprising vs Detroit Infamous (Sat Set 2)";
const MV_S2_XC = "San Antonio X-Factor vs CK Hurricanes (Sat Set 2)";
const MV_S2_NO: [string, string] = ["no overhead (VERIFY)", "Movement VERIFY: point not covered by named commentary."];
const MV_S2: Record<string, [string, string]> = {
  "UI|1": ["no overhead", "Uprising: Graham Arnold and Nathan Schroeder snake 50 clover, Arnold gets the inside kills. Infamous: Rudulph back snake corner."],
  "UI|2": ["no overhead (VERIFY)", "Infamous: Velez out on the break; Patient clover; Silberg D-side; 'Paul' (not on the allowlist, VERIFY) snake 3, clipped cross-field by Woodward. Uprising: Schroeder, Arnold and Eaton (D-side) out; Woodward small brick on the dorito side, cross-field kill."],
  "UI|3": ["no overhead (VERIFY)", "Uprising: Woodward shoots his way into the dorito clover; Schroeder floats → snake 1, traded; Arnold floats; Borromeo out. Infamous: Aboulhosn ('Nathan', VERIFY) out; Rudulph dorito corner, wraps; Bowen trades with Schroeder."],
  "UI|4": ["no overhead (VERIFY)", "Movement VERIFY: no footage (notes 3–0 → 4–0)."],
  "UI|5": ["no overhead (VERIFY)", "Infamous: Rudulph snake, out; Bowen Spick and Span clover, trades. Uprising: Eaton D-side, out; Arnold snake 1, desperation run; Challenger snake 1 (footage flips his team; he's Uprising on the roster). After the play Holland hits Resar ('Reeser'), major on Infamous (footage flips the teams; Alec Holland is Uprising on the roster, VERIFY)."],
  "UI|6": MV_S2_NO,
  "UI|7": MV_S2_NO,
  "UI|8": ["no overhead", "Uprising: Ben Challenger snake side → snake 50, kills Bowen and more."],
  "UI|9": ["no overhead (VERIFY)", "Infamous: Silberg up and over the middle; Jonah (Jamroz) up the middle; Rudulph to the buzzer. Uprising: Challenger D-side; Graham Arnold pushes the snake, out; Cole Scott D cyclops (Uprising on the roster; commentary team VERIFY)."],
  "UI|10": ["no overhead (VERIFY)", "Infamous: Schonauer snake, out early; Silberg D3, trades with Borromeo; Rudulph vs Schroeder; concede. Commentary puts Cole Scott(?) on the Infamous D clover (bunkered by Ryan Hall) and Eaton(?) on the Infamous D3; both are Uprising on the roster (VERIFY). Uprising: Borromeo trades; Holland fills the snake."],
  "UI|11": ["no overhead (VERIFY)", "Time expires. Resar ('Reeser') pushes the middle late; Velez over the start gate (VERIFY: the Page logs Velez out on the snake 2:30)."],
  "XC|1": ["no overhead", "Bernacchia (XF on the roster; the footage lists him on Canes) charges the middle → snake brick, out early. XF: Hyde clover, trades; Guest out; Bayless out crossing the 50; Danner last alive, concedes."],
  "XC|2": ["no overhead", "XF: Jackson minor pulls 2; Danner dies on the break; Colt Roberts out; Bernacchia clover run-through, gets a kill, then out."],
  "XC|3": MV_S2_NO,
  "XC|4": MV_S2_NO,
  "XC|5": ["no overhead", "XF: Hyde out on the break running to the D corner; Jackson snake; Roberts middle; Guest last alive, concedes; Bernacchia snake dorito. Canes: Fedorov out; Dyer snake."],
  "XC|6": MV_S2_NO,
  "XC|7": MV_S2_NO,
  "XC|8": ["no overhead", "XF: Matt Jackson up the middle; Bernacchia snake 50, kills Fedorov, killed by Dyer. Canes: Fedorov snake crawl, out; Dyer behind Fedorov, out."],
  "XC|9": ["no overhead (VERIFY)", "XF: Ninios snake; Jackson middle, pulled on Danner's minor; Danner door, minor; Colt Roberts door → big D brick, out; 'Dixon Yang' (not on the allowlist, VERIFY) last alive, concedes. Canes: 'Meter' (not on the allowlist, VERIFY) snake dorito."],
  "XC|10": ["no overhead (VERIFY)", "Canes: Dyer snake corner; Brinkman (Sam or John, VERIFY) inside snake; 'Meter' (VERIFY) out; Fedorov back center → back corner → D3, kills Jackson, trades with Danner. XF: Jackson snake, out; Danner trades; Bernacchia out; XF concede."],
  "XC|11": ["no overhead (VERIFY)", "Movement VERIFY: notes say 6–4 → 6–5 XF is not shown."],
  "XC|12": ["no overhead", "XF: Tom Guest up the middle, kill, to the buzzer; Bernacchia crosses the snake 50. Canes: Fedorov out."],
  "XC|13": MV_S2_NO,
  "XC|OT": ["overhead from the break", "XF: Danner D corner → D1, survives; Jackson center wedge, survives; Bernacchia snake short corner → S1, survives. Canes: Dyer snake corner, out; Brown (VERIFY: roster has Michael Brown, the Page has Aaron Brown) D corner, out; Fedorov D/center-right → D2, out."],
};
const MV_S2_P: [string, string, string, string, string][] = [
  ["UI", "2", "Rob Velez", "—", "Velez out on the break."],
  ["UI", "2", "Zach Patient", "clover", "Patient clover."],
  ["UI", "2", "Sam Silberg", "D-side", "Silberg D-side."],
  ["UI", "2", "Nate Schroeder", "—", "Schroeder out."],
  ["UI", "2", "Graham Arnold", "—", "Arnold out."],
  ["UI", "2", "Eaton", "D-side", "Eaton D-side, out."],
  ["UI", "3", "Alexander Borromeo", "—", "Borromeo out."],
  ["UI", "3", "Cody Bowen", "(VERIFY)", "Bowen trades with Schroeder (Page 'Cody', roster Kyle Bowen; VERIFY)."],
  ["UI", "3", "Nate Schroeder", "snake 1", "Schroeder floats → snake 1, traded with Bowen."],
  ["UI", "4", "Alexander Borromeo", "(VERIFY)", "No footage (VERIFY)."],
  ["UI", "5", "Kevin", "snake", "Rudulph snake, out."],
  ["UI", "5", "Cody Bowen", "clover (VERIFY)", "Bowen Spick and Span clover, trades (Page 'Cody', roster Kyle; VERIFY)."],
  ["UI", "5", "Eaton", "D-side", "Eaton D-side, out."],
  ["UI", "8", "Cody Bowen", "(VERIFY)", "Killed by Challenger from the snake 50 (Bowen first name VERIFY)."],
  ["UI", "9", "Cole Scott", "D cyclops", "Cole Scott D cyclops (Uprising on the roster)."],
  ["UI", "9", "Graham Arnold", "snake", "Arnold pushes the snake, out."],
  ["UI", "10", "Schonauer", "snake", "Schonauer snake, out early."],
  ["UI", "10", "Alexander Borromeo", "—", "Borromeo trades with Silberg."],
  ["UI", "10", "Sam Silberg", "D3", "Silberg D3, trades with Borromeo."],
  ["UI", "11", "Rob Velez", "start gate (VERIFY)", "Velez over the start gate (VERIFY vs the Page's snake out 2:30)."],
  ["XC", "1", "Billy Bernacchia", "middle", "Bernacchia charges the middle → snake brick, out early."],
  ["XC", "1", "Nico Hyde", "clover", "Hyde clover, trades."],
  ["XC", "1", "Tom Guest", "—", "Guest out."],
  ["XC", "1", "Cody Bayless", "50", "Bayless out crossing the 50."],
  ["XC", "1", "TJ Danner", "—", "Danner last alive, concedes."],
  ["XC", "2", "TJ Danner", "—", "Danner dies on the break."],
  ["XC", "2", "Matt Jackson", "—", "Jackson minor, pulls 2."],
  ["XC", "2", "Colt Roberts", "—", "Roberts out."],
  ["XC", "2", "Billy Bernacchia", "clover", "Bernacchia clover run-through, gets a kill, then out."],
  ["XC", "5", "Matt Jackson", "snake", "Jackson snake."],
  ["XC", "5", "Konstantin Fedorov", "—", "Fedorov out."],
  ["XC", "5", "Colt Roberts", "middle", "Roberts middle."],
  ["XC", "5", "Logan Dyer", "snake", "Dyer snake."],
  ["XC", "5", "Tom Guest", "—", "Guest last alive, concedes."],
  ["XC", "5", "Billy Bernacchia", "snake dorito", "Bernacchia snake dorito."],
  ["XC", "8", "Konstantin Fedorov", "snake", "Fedorov snake crawl, killed by Bernacchia."],
  ["XC", "8", "Billy Bernacchia", "snake 50", "Bernacchia snake 50, kills Fedorov, killed by Dyer."],
  ["XC", "9", "Colt Roberts", "door → D brick", "Roberts door → big D brick, out."],
  ["XC", "9", "TJ Danner", "door", "Danner door, minor."],
  ["XC", "9", "Matt Jackson", "middle", "Jackson middle, pulled on Danner's minor."],
  ["XC", "10", "Ninios", "snake (VERIFY)", "Ninios snake (notes put this in the 4–4 point; VERIFY)."],
  ["XC", "10", "Matt Jackson", "snake", "Jackson snake, killed by Fedorov."],
  ["XC", "10", "Konstantin Fedorov", "back center → D3", "Fedorov back center → back corner → D3, kills Jackson, trades with Danner."],
  ["XC", "10", "TJ Danner", "—", "Danner trades with Fedorov."],
  ["XC", "10", "Billy Bernacchia", "—", "Bernacchia out."],
  ["XC", "12", "Konstantin Fedorov", "—", "Fedorov out."],
  ["XC", "OT", "Aaron Brown", "D corner (VERIFY)", "Brown D corner, out (roster Michael Brown vs Page Aaron; VERIFY)."],
  ["XC", "OT", "Konstantin Fedorov", "D2", "Fedorov D/center-right → D2, out."],
  ["XC", "OT", "Logan Dyer", "snake corner", "Dyer snake corner, out."],
];
for (const r of ROWS) {
  const k = r.match === MV_S2_UI ? "UI" : r.match === MV_S2_XC ? "XC" : "";
  if (!k) continue;
  const v = MV_S2[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
  const p = MV_S2_P.find((x) => x[0] === k && x[1] === String(r.point) && r.playerOut.startsWith(x[2]));
  if (p) { r.breakBunker = p[3]; r.moves = p[4]; }
}

// Sat Set 5 (s5-a, s5-b: generic slot reads, team-break VERIFY) + Sat Set 4 (no notes files: no usable film)
const MV_S5_DU = "Tampa Bay Damage vs Seattle Uprising (Sat Set 5 MLPB+)";
const MV_S5_FX = "PaintballFIT vs San Antonio X-Factor (Sat Set 5 MLPB+)";
const MV_S4_IH = "Detroit Infamous vs Houston Heat (Sat Set 4 MLPB+)";
const MV_S4_CA = "CK Hurricanes vs Chicago Aftershock (Sat Set 4 MLPB+)";
const MV_S5_TB = "team break (VERIFY, generic slot read)";
const MV_S5_NO: [string, string] = ["no overhead (VERIFY)", "Movement VERIFY: no overhead footage for this point (generic slot notes only)."];
const MV_S5: Record<string, [string, string]> = {
  "DU|1": [MV_S5_TB, "Both teams' dorito players push dorito 1 → 3. The notes name Garringer (PaintballFIT on the roster, not in this match; VERIFY). Scorebug VERIFY: notes say Up 1–0, the Page says Damage 1–0."],
  "DU|2": [MV_S5_TB, "Damage dorito push. Names on screen: Holland, Arnold, Eaton, Woodward (Uprising) and 'Biliere' (not on the allowlist; ≈ Busiere, VERIFY). Scorebug VERIFY: notes say 1–1, the Page says Damage 2–0."],
  "DU|3": [MV_S5_TB, "The notes name Margott on the Damage 2–1 point (score-only row, VERIFY)."],
  "DU|4": MV_S5_NO, "DU|5": MV_S5_NO, "DU|6": MV_S5_NO, "DU|7": MV_S5_NO, "DU|8": MV_S5_NO,
  "DU|FINAL": ["no overhead (VERIFY)", "No overhead footage. Scorebug read Up 3 – Damage 4 at 0:44 on the clock; the bug is unreliable all set (VERIFY)."],
  "FX|1": [MV_S5_TB, "Both teams' snake players reach snake 2. The notes name Sebaugh, Guest and Bernacchia."],
  "FX|2": MV_S5_NO, "FX|3": MV_S5_NO, "FX|4": MV_S5_NO,
  "FX|5": [MV_S5_TB, "FIT's dorito player runs dorito 1 → 4, buzzer 10:05. The notes name Roberts (XF)."],
  "FX|6": MV_S5_NO,
  "FX|7": [MV_S5_TB, "Scorebug VERIFY: notes say 3–3 → XF 4–3, the Page says FIT 4–3. XF's snake player kills early; FIT's snake player reaches the snake 50, then out; 'Sebruch' (≈ Sebaugh, FIT, VERIFY) walks off."],
  "FX|8": [MV_S5_TB, "XF's snake player → snake 50 at 2:31, kills the last FIT player."],
  "FX|9": [MV_S5_TB, "FIT's dorito player → 2nd dorito, runs the buzzer; both snake players reach the snake 50. A timeout graphic replays the breakout while the scorebug is frozen (VERIFY)."],
  "FX|FINAL": ["no overhead (VERIFY)", "FINAL row; no separate movement."],
};
const MV_S5_P: [string, string, string, string, string][] = [
  ["DU", "2", "Austin Woodward", "(VERIFY)", "Woodward is named on screen in the notes' 1–1 point (generic read, VERIFY)."],
  ["DU", "2", "Marcello Margott", "(VERIFY)", "The notes name Margott on the Damage 2–1 point, not this one (VERIFY)."],
  ["FX", "1", "Jacob Sebaugh", "snake 2 (VERIFY)", "Sebaugh named; the snake players reach snake 2 (generic read, VERIFY)."],
  ["FX", "1", "Thomas Guest", "snake 2 (VERIFY)", "Guest named; the snake players reach snake 2 (generic read, VERIFY)."],
  ["FX", "7", "Jacob Sebaugh", "(VERIFY)", "'Sebruch' walks off (≈ Sebaugh; scorebug conflict, VERIFY)."],
];
for (const r of ROWS) {
  if (r.match === MV_S4_IH || r.match === MV_S4_CA) { r.breakBunker = "no usable film (VERIFY)"; r.moves = "no usable film (VERIFY)"; continue; }
  const k = r.match === MV_S5_DU ? "DU" : r.match === MV_S5_FX ? "FX" : "";
  if (!k) continue;
  const v = MV_S5[k + "|" + r.point];
  if (!v) continue;
  r.breakBunker = v[0];
  r.moves = v[1];
  const p = MV_S5_P.find((x) => x[0] === k && x[1] === String(r.point) && r.playerOut.startsWith(x[2]));
  if (p) { r.breakBunker = p[3]; r.moves = p[4]; }
}

// Sat Sets 6–10 (silent MLPB+ captures): not reviewed for movement
const MV_S610 = /\(Sat Set (6|7|8|9|10) MLPB\+\)$/;
for (const r of ROWS) {
  if (!MV_S610.test(r.match)) continue;
  r.breakBunker = "not reviewed for movement, silent capture (VERIFY)";
  r.moves = "not reviewed for movement, silent capture (VERIFY)";
}

// Friday Pro movement: YT dual-feed (Fri notes), Fri Set 5 (no notes), Fri Sets 6–10 (silent MLPB+)
const MV_FRI_P: [number, string, string][] = [[434,"team break VERIFY","Ryan Hoskinson: shot at Dorito (per Fri notes) — breakout not named (VERIFY)"],[435,"team break VERIFY","Cody Bayless: shot off break in a lane, bunker not named (VERIFY)"],[437,"team break VERIFY","Jared Lackey: trade at snake (per Fri notes) — breakout not named (VERIFY)"],[461,"team break VERIFY","Nico Hyde: shot at center (per Fri notes) — breakout not named (VERIFY)"],[462,"team break VERIFY","Cody Bayless: shot at Dorito 3 (per Fri notes) — breakout not named (VERIFY)"],[468,"team break VERIFY","Joseph Rooney: shot at snake (per Fri notes) — breakout not named (VERIFY)"],[471,"team break VERIFY","Cody Mickowski: shot at snake line (per Fri notes) — breakout not named (VERIFY)"],[476,"team break VERIFY","Ryan Moorhead: shot at Dorito (per Fri notes) — breakout not named (VERIFY)"],[510,"team break VERIFY","Kyle Bowen: shot at mid (per Fri notes) — breakout not named (VERIFY)"],[513,"team break VERIFY","Rob Velez: shot after 3-pack at center (per Fri notes) — breakout not named (VERIFY)"],[527,"team break VERIFY","Josh Taylor: shot at Dorito (per Fri notes) — breakout not named (VERIFY)"],[529,"team break VERIFY","Jose Navarro: shot at Dorito3 (per Fri notes) — breakout not named (VERIFY)"],[534,"team break VERIFY","Michael Brown: shot at mid (per Fri notes) — breakout not named (VERIFY)"],[535,"team break VERIFY","Shawn Demers: shot after 3-pack (buzzer) at snake/mid (per Fri notes) — breakout not named (VERIFY)"],[537,"team break VERIFY","Josh Taylor: shot at Dorito2 (per Fri notes) — breakout not named (VERIFY)"],[547,"team break VERIFY","Josh Taylor: shot at Dorito-snake (per Fri notes) — breakout not named (VERIFY)"],[549,"team break VERIFY","Josh Taylor: shot at break (per Fri notes) — breakout not named (VERIFY)"],[552,"team break VERIFY","Kaito Warner Jr: shot at Dorito (per Fri notes) — breakout not named (VERIFY)"],[581,"team break VERIFY","Andres Ramos Saldana: shot at clover (per Fri notes) — breakout not named (VERIFY)"],[603,"team break VERIFY","Cody Mickowski: shot at clover (per Fri notes) — breakout not named (VERIFY)"],[607,"team break VERIFY","Jonathan Chavez: shot off break (per Fri notes) — breakout not named (VERIFY)"],[651,"team break VERIFY","Michael McGowan: eliminated at Back center (per Fri notes) — breakout not named (VERIFY)"],[656,"team break VERIFY","Joseph Oller III: eliminated at Snake 3 (per Fri notes) — breakout not named (VERIFY)"],[657,"team break VERIFY","Michael McGowan: eliminated at Back center (per Fri notes) — breakout not named (VERIFY)"],[658,"team break VERIFY","Joel Eaton: eliminated at Dorito (per Fri notes) — breakout not named (VERIFY)"],[659,"team break VERIFY","Austin Woodward: eliminated at Dorito temple (per Fri notes) — breakout not named (VERIFY)"],[661,"team break VERIFY","Cole Scott: trade at Center (per Fri notes) — breakout not named (VERIFY)"],[663,"team break VERIFY","Graham Arnold: pulled at Snake (per Fri notes) — breakout not named (VERIFY)"],[666,"team break VERIFY","Cole Scott: eliminated on run at Dorito (per Fri notes) — breakout not named (VERIFY)"],[667,"team break VERIFY","Joel Eaton: eliminated on run at Dorito (per Fri notes) — breakout not named (VERIFY)"],[669,"team break VERIFY","Ben Challenger: eliminated at Center (per Fri notes) — breakout not named (VERIFY)"],[674,"team break VERIFY","Joey Dipolito: shot at Center can (per Fri notes) — breakout not named (VERIFY)"],[676,"Snake clover (off break, per Fri notes)","Cole Scott: off break at Snake clover (per Fri notes)"],[677,"team break VERIFY","Alec Holland: shot at Snake 3 (per Fri notes) — breakout not named (VERIFY)"],[684,"team break VERIFY","Aaron Pate: shot at Dorito (per Fri notes) — breakout not named (VERIFY)"],[710,"team break VERIFY","Jose Navarro: eliminated at Center (per Fri notes) — breakout not named (VERIFY)"],[715,"team break VERIFY","Colt Roberts: eliminated at D-side (per Fri notes) — breakout not named (VERIFY)"],[717,"team break VERIFY","Jose Navarro: trade/FF at Center (per Fri notes) — breakout not named (VERIFY)"],[722,"team break VERIFY","Frederic Berkley: penalty + pulled at Snake (per Fri notes) — breakout not named (VERIFY)"],[724,"team break VERIFY","Sebastian Ivan Lopez: eliminated at D-side (per Fri notes) — breakout not named (VERIFY)"],[725,"team break VERIFY","Frederic Berkley: eliminated at Center (per Fri notes) — breakout not named (VERIFY)"],[728,"team break VERIFY","Shawn Demers: eliminated at Snake (per Fri notes) — breakout not named (VERIFY)"],[729,"team break VERIFY","Jose Navarro: run-down (per Fri notes) — breakout not named (VERIFY)"],[730,"Dorito (off break, per Fri notes)","Shawn Demers: off break at Dorito (per Fri notes)"],[732,"team break VERIFY","Jose Navarro: shot at Snake 1 (per Fri notes) — breakout not named (VERIFY)"],[734,"team break VERIFY","Colt Roberts: eliminated at Dorito clover (per Fri notes) — breakout not named (VERIFY)"],[735,"team break VERIFY","Josh Taylor: eliminated at Center (per Fri notes) — breakout not named (VERIFY)"],[737,"Dorito (off break, per Fri notes)","Shawn Demers: off break at Dorito (per Fri notes)"],[738,"team break VERIFY","Frederic Berkley: eliminated at Center wedge (per Fri notes) — breakout not named (VERIFY)"]];
ROWS.forEach((r, i) => {
  if (!/\(Fri /.test(r.match)) return;
  if (/MLPB\+\)$/.test(r.match)) { r.breakBunker = r.moves = "not reviewed for movement, silent capture (VERIFY)"; return; }
  if (/dual-feed\)$/.test(r.match)) { r.breakBunker = "team break VERIFY"; r.moves = "no movement in notes (VERIFY)"; }
  else { r.breakBunker = r.moves = "no movement in notes (VERIFY)"; }
  const p = MV_FRI_P.find((x) => x[0] === i);
  if (p) { r.breakBunker = p[1]; r.moves = p[2]; }
});

export default function App() {
  const [match, setMatch] = useState<string>("all");
  const [team, setTeam] = useState<string>("all");
  const [point, setPoint] = useState<string>("all");
  const [rosterTeam, setRosterTeam] = useState<string>("all");
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = new Set(ROWS.map((r) => r.match));
    return ["all", ...Array.from(s)];
  }, []);

  const points = useMemo(() => {
    const base = match === "all" ? ROWS : ROWS.filter((r) => r.match === match);
    const s = new Set(base.map((r) => r.point));
    const sorted = Array.from(s).sort((a, b) => {
      if (a === "HT") return 1;
      if (b === "HT") return -1;
      if (a === "?") return 1;
      if (b === "?") return -1;
      return parseFloat(a) - parseFloat(b);
    });
    return ["all", ...sorted];
  }, [match]);

  const rosterRows = useMemo(() => {
    return PLAYERS.filter((p) => rosterTeam === "all" || p.team === rosterTeam).map((p) => [
      p.name,
      p.team,
      p.number,
      p.role,
      p.source,
    ]);
  }, [rosterTeam]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (match !== "all" && r.match !== match) return false;
      if (point !== "all" && r.point !== point) return false;
      const j = r.jersey.toLowerCase();
      const p = r.playerOut.toLowerCase();
      if (team === "damage" && !j.includes("damage") && !p.includes("goldman") && !p.includes("margott") && !p.includes("schehr") && !p.includes("brown") && !p.includes("edwards") && !p.includes("busiere"))
        return false;
      if (team === "legion" && !j.includes("legion") && !p.includes("berdnikov") && !p.includes("solnyshkov") && !p.includes("johnson") && !p.includes("smotrov") && !p.includes("prikhidni") && !p.includes("karsliev") && !p.includes("kuzmin"))
        return false;
      if (team === "fit" && !j.includes("paintball fit")) return false;
      if (team === "nyx" && !j.includes("ny xtreme")) return false;
      if (team === "wc" && !j.includes("wrecking crew")) return false;
      if (team === "ikonik" && !j.includes("ikonik")) return false;
      if (team === "noobies" && !j.includes("noobies")) return false;
      if (team === "oilers" && !j.includes("oilers")) return false;
      if (team === "aftershock" && !j.includes("aftershock")) return false;
      if (team === "heat" && !j.includes("houston heat")) return false;
      if (team === "junglecats" && !j.includes("jungle cats")) return false;
      if (team === "uprising" && !j.includes("seattle uprising")) return false;
      if (team === "infamous" && !j.includes("detroit infamous")) return false;
      if (team === "xfactor" && !j.includes("x-factor")) return false;
      if (team === "hurricanes" && !j.includes("ck hurricanes")) return false;
      if (team === "seadogs" && !j.includes("seadogs") && !p.includes("campbell") && !p.includes("salmon")) return false;
      if (team === "leverage" && !j.includes("leverage")) return false;
      if (team === "distortion" && !j.includes("distortion") && !p.includes("unger")) return false;
      if (team === "aftermath" && !j.includes("aftermath") && !p.includes("mazurek") && !p.includes("carter")) return false;
      if (team === "dynasty" && !j.includes("dynasty") && !p.includes("omara") && !p.includes("o'mara") && !p.includes("yosh rau") && !p.includes("rau #32") && !p.includes("frye") && !p.includes("fraige")) return false;
      if (team === "ironmen" && !j.includes("ironmen") && !p.includes("sentz") && !p.includes("kraft") && !p.includes("stephens jr")) return false;
      if (team === "collision" && !j.includes("collision") && !p.includes("newell")) return false;
      if (team === "impact") {
        const hit =
          j.includes("edmonton impact") ||
          j.includes("impact") ||
          p.includes("stanczak") ||
          p.includes("stanszak") ||
          p.includes("rabackoff") ||
          p.includes("yachimec") ||
          p.includes("leival") ||
          p.includes("levine") ||
          p.includes("cornell") ||
          p.includes("dalton");
        if (!hit) return false;
      }
      if (team === "tonton") {
        const hit =
          j.includes("tonton") ||
          p.includes("anfossi") ||
          p.includes("enfosi") ||
          p.includes("infossi") ||
          p.includes("szpytma") ||
          p.includes("zaghini") ||
          p.includes("carroll") ||
          p.includes("fromholz") ||
          p.includes("krombholz") ||
          p.includes("kromholz") ||
          p.includes("hugo") ||
          p.includes("verhaeghe");
        if (!hit) return false;
      }
      if (!qq) return true;
      const hay = [r.event, r.division, r.match, r.point, r.timestamp, r.playerOut, r.jersey, r.elimType, r.area, r.notes, r.scoreAfter]
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [match, team, point, q]);

  const tableRows = filtered.map((r) => [
    r.event,
    r.division,
    r.match,
    r.point,
    r.timestamp,
    r.playerOut,
    r.jersey,
    r.elimType,
    r.area,
    r.scoreAfter,
    r.breakBunker ?? "",
    r.moves ?? "",
    r.notes,
  ]);

  return (
    <Page
      title="Lone Star Open 2026 — Elim Database"
      summary="Master elimination log plus named player roster for the full event. Filter elims by match, team, or point. Names first whenever VOD, graphics, roster, or commentary IDs them; otherwise marked unknown until updated."
      width="full"
      sources={[
        "Official MLPB+ Lone Star Open VOD screen capture parts 1–3",
        "https://www.propaintballdb.com/teams/tampa-bay-damage",
        "https://www.propaintballdb.com/teams/red-legion",
        "https://woods.pbleagues.com/event/9321/schedule?action=stats&id=4024686",
        "Paintball Film Room notes 2026-10-24",
        "MLPB+ nxl-txo-26-sun-g4 Set 4 semis (p1a–p5b dual-feed chunks)",
        "https://mlpb.pbleagues.com/cgi-bin/showteams.cgi?EID=9321&LID=316",
        "https://www.youtube.com/watch?v=Zp8_RYqo6bs",
        "https://www.youtube.com/watch?v=wuAO5srx5rA",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022165",
        "https://www.youtube.com/watch?v=vUCxjSV5Rao",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022166",
        "https://www.youtube.com/watch?v=3hxWhjK29Ac",
        "https://www.youtube.com/watch?v=40IX7cok6Vk",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022295",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022285",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022286",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022296",
        "https://pbleagues.com/event/9321/schedule?action=stats&id=4022287",
      ]}
    >
      <Callout tone="success" lead="Pro Finals OFFICIAL pass COMPLETE">
        Damage 8–7 Red Legion. Source: official MLPB+ screenrec parts 1–3. Points 1–15 (+ HT waived attempt). Named film IDs include Berdnikov, Smotrov, Prikhidni #75, Solnyshkov #23, Goldman #89, Margott #33, Schehr #10, Brown Jr #9; others stay unknown until IDed. Gap: early second half between HT (RL 5–2) and part3 open (Damage 3–RL 6) not in capture. Next: remaining LSO queue.
      </Callout>

      <Callout tone="info" lead="PaintballFIT vs New York Xtreme (Sat Set 3) added">
        FIT wins 7–1 (last on-screen graphic 6–1; FIT won one more point the bug never updated for). Source: YouTube film room Zp8_RYqo6bs chunks 00–01. Some elims truncated in source notes; Sebaugh appears out more than once in point 4 — verify.
      </Callout>

      <Callout tone="info" lead="Wrecking Crew vs Ikonik (D1 Semi-Pro) added">
        Wrecking Crew 8–4 Ikonik. Film is a raw team cam (G_Lilly_Films, https://www.youtube.com/watch?v=wuAO5srx5rA) with no scoreboard and cuts between points, so point numbers are marked ? and point winners are not assigned. Final score is from PBLeagues, not film: https://pbleagues.com/event/9321/schedule?action=stats&id=4022165. Many elims are unknown players walking off.
      </Callout>

      <Callout tone="info" lead="Noobies vs Clutch City Oilers (D1 Semi-Pro OT) added">
        Oilers 5–4 Noobies in overtime; film and PBLeagues agree (https://pbleagues.com/event/9321/schedule?action=stats&id=4022166). Raw cam (https://www.youtube.com/watch?v=vUCxjSV5Rao) sits mostly behind Noobies, so far-side Oilers elims are often off-screen and most players are unidentified.
      </Callout>

      <Callout tone="info" lead="Chicago Aftershock vs New York Xtreme (Sat Set 1) added">
        Aftershock 9–7 NYX; film and PBLeagues agree (https://pbleagues.com/event/9321/schedule?action=stats&id=4022295). Final point awarded on an NYX major penalty under 60s. The Saturday broadcast (https://www.youtube.com/watch?v=3hxWhjK29Ac) dual-feeds Houston Heat vs Atlanta Jungle Cats, so many Aftershock/NYX elims are off camera, especially points 1–4; those are sparse or placeholder rows. Points numbered 1–16 across the full game by score.
      </Callout>

      <Callout tone="info" lead="Houston Heat vs Atlanta Jungle Cats (Sat Set 1) added">
        Heat 4–3 Jungle Cats. Film (https://www.youtube.com/watch?v=3hxWhjK29Ac, dual-feed with Aftershock/NYX) reaches 4–3 with 1:08 left but never shows the final whistle; PBLeagues confirms 4–3 (https://pbleagues.com/event/9321/schedule?action=stats&id=4022285). Timestamps: A = VOD ~18–43 clip, B = VOD ~43–64 clip. Several Cats elims unidentified.
      </Callout>

      <Callout tone="info" lead="Sun QF finals added: Red Legion 5–4 PaintballFIT (clock) and TonTon Arsenal 8–2 Perris ASG Aftermath (mercy)">
        Source: Sun broadcast https://www.youtube.com/watch?v=-NxgYj0epvk (~138–183m dual-feed; clips late-b, late-c1, late-c2). Early points in both games are score-only. VERIFY: Malloy team (RL vs FIT), Krombholz team (Aftermath vs TonTon Kromholz/Fromholz), Fozi name/team.
      </Callout>
      <Callout tone="info" lead="Red Legion 6–0 CK Hurricanes (Sun ochos) added">
        FINAL Red Legion 6 – CK Hurricanes 0 (Corey Hall #19 buzzer, 7:28 left). Pts 1–5 score-only (broadcast on AS/MATH dual-feed); point 6 detailed from late-a. PBLeagues: https://pbleagues.com/event/9321/schedule?action=stats&id=4022649
      </Callout>

      <Callout tone="info" lead="Sun Set 4 Pro semis added (MLPB+)">
        Red Legion 10 – Edmonton Impact 4; Tampa Bay Damage 7 – TonTon Arsenal 5. Source: MLPB+ nxl-txo-26-sun-g4 set4-chunks (p1a–p5b dual-feed). Named: Rabackoff #20, Stanczak #99, Anfossi #7, Szpytma #89, Gaudin #91, Goldman #89, Prikhidni #75. Dual-feed scoreboard glitches and thin/score-only points marked VERIFY.
      </Callout>

      <Callout tone="info" lead="Sat Set 4 Pro finals added (MLPB+)">
        Detroit Infamous 9 – Houston Heat 4; CK Hurricanes 8 – Chicago Aftershock 5. Source: MLPB+ saturday-set-4… ~65m sat4-chunks dual-feed. Named: Kyle Bowen #69, Dany Schonauer #4, Samuel Monville #66, Jake Raffield #26, Andrew Bell #20, Ryan Hoskinson #42, Jared Lackey #21, Clayton Hughes #27, Gant MacLellan #56, Andres Ramos Saldana #27. PBLeagues backfill: Samuel (not Sam); Kyle only / Michael only; MacLellan/Hughes/Lackey Aftershock. VERIFY: Inf P2 graphic, late Canes scoreboard lag, thin mid-gap points; film jersey #s (PBLeagues jersey null).
      </Callout>

      <Callout tone="info" lead="Sat Set 5 Pro dual-feed added (MLPB+)">
        Tampa Bay Damage 4 – Seattle Uprising 3; PaintballFIT 5 – San Antonio X-Factor 4. Source: MLPB+ saturday-set-5… sat5-chunks dual-feed (skip p5-b Inf/Heat overrun after ~5:06 p5-a). Named: Alex Goldman #89, Marcello Margott #33, Austin Woodward #2, Jacob Sebaugh #12, Thomas Guest #7, Trenton Mason-Salinas #34. PBLeagues preferred spellings applied where film supports. VERIFY film-only jersey conflicts: Edwards vs Margott #33; Guest #7/#9; Colt Roberts #45/#22; Scott #21 XF claim (Cole Scott = Uprising — left unknown). SCOREBOARD-LAG heavy on Damage path.
      </Callout>

      <Callout tone="info" lead="Sat Set 6 Pro dual-feed added (MLPB+)">
        Royal City Seadogs 7 – New Jersey Leverage 1 (FINAL overlay); Perris ASG Aftermath 7 – Chicago Distortion 0 (final not on graphic — 7–1 possible, VERIFY). Source: MLPB+ Saturday Set 6 set6 chunks (p1–p4b + part3 salvage; overlaps deduped). Named: Nick Campbell #88, Shayne Salmon #40 (Seadogs); Michael Unger #67, Nate Roberts #47 (Distortion); Stephen Mazurek #51, Zack Carter #14, Grayson Gladstone #95, Devon Stuart #34 (Aftermath, PBLeagues-confirmed). Kit check: black/red = Aftermath in this match (score path + Gladstone + pit celebration); Mazurek/Carter outs are Aftermath outs — no change to winner. Still VERIFY: Campbell #88/#08, Seadogs #10, Leverage #8, unnamed Aftermath #4 (P1 black/red), 7–0 vs 7–1. Overlay wrong-game flips throughout — visual ID used. A p4a Seadogs point that conflicts with the FINAL overlay is held off the Page.
      </Callout>

      <Callout tone="info" lead="Sat Set 7 Pro dual-feed added (MLPB+)">
        TonTon Arsenal 5 – Los Angeles Collision 4 (FINAL graphic on screen); San Diego Dynasty 7 – Los Angeles Ironmen 5 (overlay only — final NOT confirmed on film; 7–4 seen at clock 0:47; VERIFY). Source: MLPB+ Saturday Set 7 set7 chunks (p1–p3, p4 salvage, p5, p7 tail + clean recapture p8–p9 from VOD ~35:04; overlaps deduped by clock + score path; Set 6 autoplay discarded). Named: Stephen Omara #16, Yosh Rau #32, Harrison Frye #8, #13 Fraige or Andrade VERIFY (Dynasty); Henry Sentz #5, Patrick Kraft Jr #17, Jesse Stephens Jr #29 (Ironmen); Vince Newell #16 (Collision); Hugo Verhaeghe #15 (TonTon). Held off Page: p8 Ironmen overcount (7+ outs in one point), TonTon/Collision aborted reset point, p9 Ironmen outs in the 6–3 point (likely team flip). VERIFY: #13 Fraige or Andrade, Newell out vs buzzer (name confirmed, #16 film-only), unnamed TonTon #95 ('Giger' not on any roster) / unnamed #7 ('Abuhalimeh' not on any roster), Dynasty–Ironmen final (no official score), p1 overlay team swap (DYN–IRN P3–4), TonTon–Collision P2–5 score path, decider OT status.
      </Callout>

      <Callout tone="info" lead="Sat Set 8 Pro dual-feed added (MLPB+)">
        Edmonton Impact 8 – New Jersey Leverage 5 (FINAL graphic on screen, CONFIRMED). Red Legion def. Chicago Distortion — final score VERIFY (7–4 last solid score; no FINAL graphic). Claimed RL points 8–11 from p5-a (three breakouts inside ~1:10 of game clock) were LEFT OFF the Page pending recheck. Source: MLPB+ Saturday Set 8 set8 chunks (p1–p3, p4-a/b, p6-gap/p7-gap recapture, p5-a/b; Set 9 autoplay discarded). p1 rows low-confidence; p3 rows TOP/BOTTOM side only (team VERIFY). Named: Tyler Harmon #12 (Impact, buzzer P8; PBLeagues-confirmed, number from film); Nate Roberts #47 (Distortion, PBLeagues-confirmed); Cornell #1 (Impact, buzzer glimpse — VERIFY, Brandon or Justin). Unnamed numbers: Impact #99, Leverage #71, #92 (team VERIFY — no 'Deev' on any roster; feed desync, may be from the other match).
      </Callout>

      <Callout tone="info" lead="Sat Set 9 Pro dual-feed added (MLPB+)">
        Perris ASG Aftermath 6 – Los Angeles Collision 5 in OT (FINAL graphic 'AFTERMATH WINS 6-5 FINAL', CONFIRMED; p6 pass's 'match over at 5–4' rejected — Collision led 5–4 @0:23, tied 5–5 on a 0:02 buzzer, Aftermath won OT). Royal City Seadogs def. Los Angeles Ironmen on time — final score VERIFY (no FINAL graphic; graphic showed 3–2 before the last Seadogs point → 4–2; film count 5–2). Source: MLPB+ Saturday Set 9 set9 chunks (p1–p5, p6-a/b, p7gap recapture, p8; VOD-end autoplay discarded). Discarded: outs from aborted/replayed points (IRN–SEA clock reset 8:01→8:16; aborted breakout after Ironmen timeout; COL–AFT cutaway breakout p3-a 00:55) and the COL–AFT 3:51 point waved off after a Collision major. Named (PBLeagues-checked): Caleb Abuhl #7, Christopher Lennon #22 (Ironmen); Clayton Rizzardo Jr #9 (Seadogs); Brandon Trujillo #23 (Collision). Team VERIFY (film side vs PBLeagues): Arrieta #44, Woodruff #8, Green #42 (film Collision, PBLeagues Aftermath); Trujillo #23 OT-forcing buzzer credited to Aftermath on film. Unnamed: Aftermath #17 (buzzer), #12. Broadcast pit-cam labels were swapped/mislabeled throughout (Collision names under 'Aftermath pit' and vice versa); team mapped by PBLeagues name. p4-b IRN–SEA replay outs and p8 OT live-view outs kept but flagged as possible duplicates.
      </Callout>

      <Callout tone="info" lead="Sat Set 11 D1 dual-feed added (MLPB+) — finals UNOFFICIAL">
        GRD 3 – Dallas Meanies 0 and Shut Up They're Trying 4 – Team Blank 1 are the last on-screen scores (no FINAL graphic, no PBLeagues result) — VERIFY. Scoreboard-conflict points marked VERIFY: Meanies/GRD P2; Blank/SUT P4, P5, P6, P7 (P6–P7 in near darkness). SUT P2 win inferred (feed cut). Film-only names, all VERIFY (PBLeagues D1 rosters need login): Foster #21, Shue #69 (Meanies); DeMott #77 (GRD); Carter #07 (not Aftermath's Carter), Dustin #25 (first name only), Weatherford #9 (Shut Up They're Trying).
      </Callout>

      <Callout tone="info" lead="Sat Set 10 Pro dual-feed added (MLPB+)">
        San Diego Dynasty 6 – Edmonton Impact 4 and TonTon Arsenal 8 – Red Legion 3 — both PROVISIONAL (no FINAL graphic; VERIFY). Red Legion's late buzzer (clock 0:17) was overturned by a penalty; TonTon awarded the point. Score paths reconciled point by point (clean p12 gap recapture first, then score continuity): RL/TON 7:55 RL buzzer vs 7:41 TON 3–2 (VERIFY, TON kept); TON 6–2 vs 7–2 (continuity → 7–2, VERIFY); possible duplicate Dynasty 5–2 point (p4-b c5:57 folded into the p12 point, not double-counted); possible duplicate Impact/Dynasty points at the 10:23/10:22 breaks (kept separate by continuity, VERIFY). Gap-marker rows where a point result is missing from film (IMP/DYN P1, P2, P4; RL/TON P3, P4, P10). Named on film: Berdnikov #11 (RL, buzzer P2), Yosh Rau #32 (Dynasty), Cornell #20 (Impact — Brandon or Justin VERIFY; #1 vs #20 may be two players). Unnamed: Dynasty #50, Red Legion #77 (VERIFY). Pit-cam labels were unreliable; teams assigned by PBLeagues name.
      </Callout>

      <Section heading="Player roster">
        <Select
          label="Team"
          value={rosterTeam}
          onChange={setRosterTeam}
          options={[
            { value: "all", label: "Both teams" },
            { value: "Tampa Bay Damage", label: "Tampa Bay Damage" },
            { value: "Red Legion", label: "Red Legion" },
            { value: "Paintball FIT", label: "Paintball FIT" },
            { value: "NY Xtreme", label: "NY Xtreme" },
            { value: "Wrecking Crew", label: "Wrecking Crew (New York Wrecking Crew)" },
            { value: "Ikonik", label: "Ikonik (Oregon IKONIK)" },
            { value: "Noobies", label: "Noobies" },
            { value: "Clutch City Oilers", label: "Clutch City Oilers" },
            { value: "Chicago Aftershock", label: "Chicago Aftershock" },
            { value: "Houston Heat", label: "Houston Heat" },
            { value: "Atlanta Jungle Cats", label: "Atlanta Jungle Cats" },
            { value: "Seattle Uprising", label: "Seattle Uprising" },
            { value: "Detroit Infamous", label: "Detroit Infamous" },
            { value: "San Antonio X-Factor", label: "San Antonio X-Factor" },
            { value: "CK Hurricanes", label: "CK Hurricanes" },
            { value: "TonTon Arsenal", label: "TonTon Arsenal" },
            { value: "Edmonton Impact", label: "Edmonton Impact" },
            { value: "Perris ASG Aftermath", label: "Perris ASG Aftermath" },
            { value: "San Diego Dynasty", label: "San Diego Dynasty" },
            { value: "Los Angeles Ironmen", label: "Los Angeles Ironmen" },
            { value: "Los Angeles Collision", label: "Los Angeles Collision" },
          ]}
        />
        <Text>{`${rosterRows.length} players`}</Text>
        <Table
          columns={["Name", "Team", "Number", "Role", "Source"]}
          rows={rosterRows}
          align={["start", "start", "start", "start", "start"]}
        />
      </Section>

      <Section heading="Filters">
        <Select
          label="Match"
          value={match}
          onChange={setMatch}
          options={matches.map((m) => (m === "all" ? { value: "all", label: "All matches" } : { value: m, label: m }))}
        />
        <Select
          label="Player out team"
          value={team}
          onChange={setTeam}
          options={[
            { value: "all", label: "All teams" },
            { value: "damage", label: "Tampa Bay Damage" },
            { value: "legion", label: "Red Legion" },
            { value: "fit", label: "Paintball FIT" },
            { value: "nyx", label: "NY Xtreme" },
            { value: "wc", label: "Wrecking Crew (New York Wrecking Crew)" },
            { value: "ikonik", label: "Ikonik (Oregon IKONIK)" },
            { value: "noobies", label: "Noobies" },
            { value: "oilers", label: "Clutch City Oilers" },
            { value: "aftershock", label: "Chicago Aftershock" },
            { value: "heat", label: "Houston Heat" },
            { value: "junglecats", label: "Atlanta Jungle Cats" },
            { value: "uprising", label: "Seattle Uprising" },
            { value: "infamous", label: "Detroit Infamous" },
            { value: "xfactor", label: "San Antonio X-Factor" },
            { value: "hurricanes", label: "CK Hurricanes" },
            { value: "impact", label: "Edmonton Impact" },
            { value: "tonton", label: "TonTon Arsenal" },
            { value: "seadogs", label: "Royal City Seadogs" },
            { value: "leverage", label: "New Jersey Leverage" },
            { value: "distortion", label: "Chicago Distortion" },
            { value: "aftermath", label: "Perris ASG Aftermath" },
            { value: "dynasty", label: "San Diego Dynasty" },
            { value: "ironmen", label: "Los Angeles Ironmen" },
            { value: "collision", label: "Los Angeles Collision" },
          ]}
        />
        <Select
          label="Point"
          value={point}
          onChange={setPoint}
          options={points.map((p) =>
            p === "all"
              ? { value: "all", label: "All points" }
              : p === "HT"
                ? { value: "HT", label: "HT waived (no point)" }
                : { value: p, label: `Point ${p}` }
          )}
        />
        <Input label="Search" value={q} onChange={setQ} placeholder="name, jersey, bunker, type…" />
        <Text>{`${filtered.length} of ${ROWS.length} eliminations showing`}</Text>
      </Section>

      <Section heading="Eliminations" caption="Timestamps are from the official screen-capture file timeline unless noted; match clock is the broadcast overlay when shown. Player out uses full name when known; unknown means not yet IDed on film. Point HT is the waved-off end-of-half attempt (no score).">
        <Table
          columns={[
            "Event",
            "Div",
            "Match",
            "Pt",
            "Timestamp",
            "Player out",
            "Jersey / team",
            "Type",
            "Area",
            "Score after",
            "Break bunker",
            "Moves",
            "Notes",
          ]}
          rows={tableRows}
          align={[
            "start",
            "start",
            "start",
            "end",
            "start",
            "start",
            "start",
            "start",
            "start",
            "start",
            "start",
            "start",
            "start",
          ]}
        />
      </Section>
    </Page>
  );
}

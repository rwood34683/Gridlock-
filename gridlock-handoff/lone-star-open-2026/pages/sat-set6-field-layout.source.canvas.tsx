import {
  Page,
  Section,
  Text,
  Callout,
  Grid,
  Bars,
  Table,
  Segmented,
  Properties,
  useState,
  useMemo,
  useGrokTheme,
} from "grok/canvas";

type TeamKey = "seadogs" | "leverage" | "aftermath" | "distortion";

type LaneStats = {
  snake: number;
  dorito: number;
  center: number;
  home: number;
  break: number;
};

type TeamPack = {
  key: TeamKey;
  name: string;
  colors: string;
  matchup: string;
  outsN: number;
  killsN: number;
  outs: LaneStats;
  kills: LaneStats;
  layoutNotes: string[];
  playerSeeds: { player: string; jersey: string; role: string; note: string }[];
  confidence: string;
};

const TEAMS: TeamPack[] = [
  {
    key: "seadogs",
    name: "Royal City Seadogs",
    colors: "cyan / teal",
    matchup: "vs New Jersey Leverage (primary feed)",
    outsN: 7,
    killsN: 25,
    outs: { snake: 28, dorito: 29, center: 14, home: 29, break: 0 },
    kills: { snake: 32, dorito: 24, center: 24, home: 12, break: 8 },
    layoutNotes: [
      "Only 7 filmed outs all game (won 7–1): spread evenly across snake, dorito, home (Campbell #88 Hydra; #10 backline) — no single weak lane.",
      "Kill map leans snake (32%) then dorito/center (24% each): repeated Leverage wipes P4, P5, P8 off both wires.",
      "Closers: Salmon #40 buzzer P2; snake-runner buzzer P4; tape push P5. Only loss P6 was a 3-out Leverage snake run.",
    ],
    playerSeeds: [
      { player: "Nick Campbell", jersey: "#88", role: "home / Hydra", note: "Out Point 1 Hydra back-left vs Leverage" },
      { player: "Shayne Salmon", jersey: "#40", role: "closer / wire", note: "Point 2 buzzer → Seadogs 2–0" },
      { player: "Seadogs #10", jersey: "#10", role: "home", note: "Point 3 backline walk-off; name VERIFY" },
    ],
    confidence: "film-only · n outs=7 · n kills=25 · full set (FINAL 7–1)",
  },
  {
    key: "leverage",
    name: "New Jersey Leverage",
    colors: "black / red",
    matchup: "vs Royal City Seadogs",
    outsN: 25,
    killsN: 7,
    outs: { snake: 32, dorito: 24, center: 24, home: 12, break: 8 },
    kills: { snake: 28, dorito: 29, center: 14, home: 29, break: 0 },
    layoutNotes: [
      "Snake side is the leak: 32% of outs (Silverbelly snaps, snake corner/temple); dorito and center 24% each.",
      "Three full wipes filmed (P4, P5, P8) plus a center penalty → mass walk-off on P3; two more penalty pulls on P7.",
      "Only point won (P6) came from a snake run — their kills were dorito/home/snake-back lanes in that point.",
    ],
    playerSeeds: [
      { player: "Leverage (unnamed)", jersey: "—", role: "Silverbelly / snake", note: "Repeated snap outs Point 2 + Point 3" },
      { player: "Leverage (unnamed)", jersey: "—", role: "dorito / cylinder", note: "Run-through bunker Point 2 on Seadogs tape push" },
    ],
    confidence: "film-only · n outs=25 · n kills=7 · full set (FINAL 1–7)",
  },
  {
    key: "aftermath",
    name: "Perris ASG Aftermath",
    colors: "black / red (score path + Gladstone)",
    matchup: "vs Chicago Distortion (dual-feed)",
    outsN: 5,
    killsN: 15,
    outs: { snake: 40, dorito: 20, center: 20, home: 0, break: 20 },
    kills: { snake: 40, dorito: 20, center: 14, home: 13, break: 13 },
    layoutNotes: [
      "Re-read with the full set: Aftermath won 7–0 (or 7–1 VERIFY), so the P1 black/red winner is treated as Aftermath; the P1 wipe is Distortion's.",
      "Kills lean snake (40%) — Distortion wipes P7 and snake walk-offs P4; tiny out sample (n=5, incl. Mazurek ×2 and Carter, PBLeagues-confirmed Aftermath).",
      "Grayson Gladstone #95 on the black/red side fits the Aftermath roster.",
    ],
    playerSeeds: [
      { player: "Grayson Gladstone", jersey: "#95", role: "snake (film)", note: "Seen in snake on black/red; roster-confirmed Aftermath" },
      { player: "Stephen Mazurek", jersey: "#51", role: "dorito / snake", note: "Out P5 dorito and P6 snake (separate points); roster-confirmed Aftermath" },
      { player: "Zack Carter", jersey: "#14", role: "snake", note: "Out P6 snake; roster-confirmed Aftermath" },
      { player: "Aftermath #4 (unnamed)", jersey: "#4", role: "unknown", note: "Seen on black/red in P1 (p1-a2) — name VERIFY" },
    ],
    confidence: "VERIFY dual-feed · n outs=5 · n kills=15 · full set (FINAL 7–0/7–1)",
  },
  {
    key: "distortion",
    name: "Chicago Distortion",
    colors: "black / red",
    matchup: "vs Aftermath (+ Seadogs cutaways VERIFY)",
    outsN: 15,
    killsN: 5,
    outs: { snake: 40, dorito: 20, center: 14, home: 13, break: 13 },
    kills: { snake: 40, dorito: 20, center: 20, home: 0, break: 20 },
    layoutNotes: [
      "Snake is where they die: 40% of outs (snake entry/cylinder P4, snake + snake back corner P7).",
      "Dorito 20% (Unger #67 P6); last-point P7 was a 5-man wipe in ~30s.",
      "Film IDs: Nate Roberts #47 (PBLeagues; graphic said Matt), Unger #67, D'Acquisto #27, Wenck #23 — Distortion wore yellow/black in P1.",
    ],
    playerSeeds: [
      { player: "Nate Roberts", jersey: "#47", role: "front / break", note: "Named on break cutaway; silver can P4 (PBLeagues-confirmed)" },
      { player: "Michael Unger", jersey: "#67", role: "dorito", note: "Out P6 dorito" },
    ],
    confidence: "VERIFY dual-feed · n outs=15 · n kills=5 · full set",
  },
];

function pctBars(stats: LaneStats, n: number, kind: string) {
  const order: (keyof LaneStats)[] = ["snake", "dorito", "center", "home", "break"];
  return order
    .filter((k) => stats[k] > 0)
    .map((k) => ({
      label: k,
      value: stats[k],
      display: `${stats[k]}%`,
      meta: `${kind} · n=${n}`,
    }));
}

function FieldMap({ team }: { team: TeamPack }) {
  const theme = useGrokTheme();
  const heat = team.outs;
  const max = Math.max(heat.snake, heat.dorito, heat.center, heat.home, heat.break, 1);
  const fill = theme.dataviz.categorical[0];
  const op = (v: number) => 0.12 + (0.78 * v) / max;
  const label = theme.text.primary;
  const muted = theme.text.tertiary;
  const border = theme.border.default;
  const paper = theme.bg.base;
  const font = theme.font.family;
  const fsLabel = theme.font.label.fontSize;
  const fsCap = theme.font.caption.fontSize;

  return (
    <svg viewBox="0 0 640 360" width="100%" role="img" aria-label={`${team.name} field heat from outs`}>
      <rect x="0" y="0" width="640" height="360" fill={paper} stroke={border} strokeWidth="1" rx="12" />
      <text x="20" y="28" fill={label} fontSize={fsLabel} fontFamily={font}>
        Out-location heat (darker = higher share of filmed outs)
      </text>
      <text x="20" y="48" fill={muted} fontSize={fsCap} fontFamily={font}>
        {`${team.colors} · ${team.confidence}`}
      </text>
      <rect x="40" y="70" width="560" height="250" fill="none" stroke={border} strokeWidth="2" rx="4" />
      <line x1="320" y1="70" x2="320" y2="320" stroke={border} strokeWidth="1" strokeDasharray="6 4" />
      <rect x="360" y="90" width="220" height="90" fill={fill} opacity={op(heat.dorito)} rx="6" />
      <text x="470" y="140" textAnchor="middle" fill={label} fontSize={fsLabel} fontFamily={font}>
        {`Dorito ${heat.dorito}%`}
      </text>
      <rect x="60" y="90" width="220" height="90" fill={fill} opacity={op(heat.snake)} rx="6" />
      <text x="170" y="140" textAnchor="middle" fill={label} fontSize={fsLabel} fontFamily={font}>
        {`Snake ${heat.snake}%`}
      </text>
      <rect x="220" y="195" width="200" height="55" fill={fill} opacity={op(heat.center)} rx="6" />
      <text x="320" y="228" textAnchor="middle" fill={label} fontSize={fsLabel} fontFamily={font}>
        {`Center ${heat.center}%`}
      </text>
      <rect x="200" y="265" width="240" height="40" fill={fill} opacity={op(heat.home)} rx="6" />
      <text x="320" y="291" textAnchor="middle" fill={label} fontSize={fsLabel} fontFamily={font}>
        {`Home / back ${heat.home}%`}
      </text>
      <text x="50" y="340" fill={muted} fontSize={fsCap} fontFamily={font}>
        {`Breakout losses (not a bunker zone): ${heat.break}%`}
      </text>
    </svg>
  );
}

export default function App() {
  const [teamKey, setTeamKey] = useState<TeamKey>("seadogs");
  const team = useMemo(() => TEAMS.find((t) => t.key === teamKey) ?? TEAMS[0], [teamKey]);
  const outBars = pctBars(team.outs, team.outsN, "outs");
  const killBars = pctBars(team.kills, team.killsN, "kills");

  return (
    <Page
      title="LSO Sat Set 6 — Field Layout & Tendencies"
      summary="Per-team field heat and lane percentages from the full Saturday Set 6 film (Seadogs/Leverage + Aftermath/Distortion). Percentages are share of filmed eliminations in each zone — small-n and dual-feed VERIFY."
      width="wide"
      sources={[
        "https://cursor.com/canvas/store-24ed7f4b-1ee1-4c10-bd00-2f369baa9125/892f0e63-84f9-4379-b5dd-28b0b07bbdf7",
        "https://cursor.com/canvas/store-24ed7f4b-1ee1-4c10-bd00-2f369baa9125/a9406542-765e-4ada-a15f-fbfc39c469cf",
      ]}
    >
      <Callout tone="info" lead="Full set — refreshed 2026-10-31">
        Lane % now from all Set 6 rows on the Elim Page (p1–p4b + part3 salvage, overlaps deduped). Finals: Seadogs 7–1 Leverage; Aftermath 7–0 Distortion (7–1 VERIFY). Excludes buzzers, score-only points and the P3 Leverage penalty mass walk-off. Small n and dual-feed VERIFY still apply, especially Aftermath outs (n=5) and Seadogs outs (n=7).
      </Callout>

      <Section heading="Team">
        <Segmented
          value={teamKey}
          onChange={setTeamKey}
          options={[
            { value: "seadogs", label: "Seadogs" },
            { value: "leverage", label: "Leverage" },
            { value: "aftermath", label: "Aftermath" },
            { value: "distortion", label: "Distortion" },
          ]}
        />
        <Properties
          items={[
            { label: "Team", value: team.name },
            { label: "Colors", value: team.colors },
            { label: "Matchup", value: team.matchup },
            { label: "Sample", value: team.confidence },
          ]}
        />
      </Section>

      <Section heading="Field layout (out heat)">
        <FieldMap team={team} />
        <Text>{team.layoutNotes[0]}</Text>
        <Text>{team.layoutNotes[1]}</Text>
        <Text>{team.layoutNotes[2]}</Text>
      </Section>

      <Section heading="Where they get out">
        <Bars bars={outBars} />
        <Text>{`Share of this team's filmed eliminations by zone (n=${team.outsN}).`}</Text>
      </Section>

      <Section heading="Where they get kills">
        <Bars bars={killBars} />
        <Text>{`Share of opponent eliminations by zone while this team is the opponent on film (n=${team.killsN}).`}</Text>
      </Section>

      <Section heading="Named seeds">
        <Table
          columns={["Player", "Jersey", "Role / lane", "Note"]}
          rows={team.playerSeeds.map((p) => [p.player, p.jersey, p.role, p.note])}
        />
      </Section>

      <Section heading="All-team snapshot">
        <Table
          columns={["Team", "Outs n", "Top out zone", "Kills n", "Top kill zone", "Confidence"]}
          rows={TEAMS.map((t) => {
            const topOut = (Object.entries(t.outs) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
            const topKill = (Object.entries(t.kills) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
            return [
              t.name,
              String(t.outsN),
              `${topOut[0]} ${topOut[1]}%`,
              String(t.killsN),
              `${topKill[0]} ${topKill[1]}%`,
              t.confidence.includes("VERIFY") ? "VERIFY" : "film-only",
            ];
          })}
        />
      </Section>
    </Page>
  );
}

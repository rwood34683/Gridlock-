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

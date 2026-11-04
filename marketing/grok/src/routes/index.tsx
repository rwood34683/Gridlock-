import { CLOUD_COPY } from "@/cloud-copy";
import { createFileRoute } from "@tanstack/react-router";
import { Binoculars, Crosshair, ListChecks, Route as RouteIcon } from "lucide-react";
import { GetGridlock, Platforms, Shell } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridlock Coach" },
      {
        name: "description",
        content:
          "Two minutes between points. When you look down, the answer is already there: the call, the score, who’s on, and what they ran last time. Gridlock System, powered by UPRA.",
      },
    ],
  }),
  component: Home,
});

const TOOLS = [
  {
    n: "01",
    name: "Playbook",
    icon: RouteIcon,
    body: "Pick the field and the break, or write your own. Route, face, shot lane and job for each of the five, in your team’s own words.",
  },
  {
    n: "02",
    name: "Tally",
    icon: ListChecks,
    body: "Chart the break bunker by bunker. Tap who won the point. It calls match point, overtime or a tie.",
  },
  {
    n: "03",
    name: "Scout",
    icon: Binoculars,
    body: "Their five by name. The calls you’ve seen them run, and your answer to each. Watch a game you’re not in and scout both teams.",
  },
  {
    n: "04",
    name: "Sightlines",
    icon: Crosshair,
    body: "From any bunker, drag the lane to where you shoot and see what’s in the way, in feet.",
  },
] as const;

function Home() {
  return (
    <Shell>
      <main>
        <Hero />
        <Tools />
        <OneDay />
        <Holds />
        <aside className="border-t border-line">
          <p className="mx-auto max-w-3xl px-5 py-8 text-signal">
            Scout reads and sightlines are coaching aids, not predictions or a substitute for the officials’ live call.
          </p>
        </aside>
        <Close />
      </main>
    </Shell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative">
        <img
          src="/brand/gridlock-splash.jpg"
          alt="Gridlock"
          width={1600}
          height={900}
          fetchPriority="high"
          className="block w-full object-cover object-center sm:h-80 lg:h-96"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-bg" aria-hidden />
      </div>
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-14">
        <div>
          <p className="kicker rise">Gridlock System · powered by UPRA</p>
          <h1 className="hero-title rise rise-2 mt-4 text-fg">
            <span>Direct the five.</span>
            <span>Own the point.</span>
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-lede font-medium text-fg">
            Two minutes between points. When you look down, the answer is already there: the call, the score, who’s on, and what they ran last time.
          </p>
          <p className="rise rise-3 mt-3 text-lede font-medium text-signal">
            Paintball. Coaches, players, league staff.
          </p>
          <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <GetGridlock className="btn btn-primary w-full sm:w-auto">Get Gridlock</GetGridlock>
            <a href="#tools" className="btn btn-line w-full sm:w-auto">
              See the tools
            </a>
          </div>
          <p className="rise rise-4 mt-3 text-signal">Invited beta testers · Opens in your browser</p>
          <Platforms className="rise rise-4 mt-5 font-display text-lg font-bold tracking-wide text-signal" />
        </div>
        <Sheet />
      </div>
    </section>
  );
}

function Sheet() {
  const rows = [
    ["Score", "One tap. It stays on top."],
    ["The call", "What they ran last time."],
    ["The five", "Bunker, lane, job."],
    ["Clock", "It counts down."],
  ];
  return (
    <aside className="card relative overflow-hidden p-5" aria-label="The sheet. Score, the call, the five, and the break clock. No live score.">
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />
      <p className="kicker">When you look down</p>
      <ul className="mt-2">
        {rows.map(([name, detail]) => (
          <li key={name} className="border-t border-line py-3">
            <p className="display text-card text-fg">{name}</p>
            <p className="text-signal">{detail}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Tools() {
  return (
    <section id="tools" className="scroll-mt-header border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="display text-section text-fg">The tools</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <article key={tool.name} className="card-mark flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-accent" aria-hidden />
                  <span className="font-display text-2xl font-bold text-signal">{tool.n}</span>
                </div>
                <h3 className="display text-card text-fg">{tool.name}</h3>
                <p className="text-signal">{tool.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarkCard({
  id,
  eyebrow,
  title,
  body,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  const repeat = eyebrow.replace(/\.$/, "").toLowerCase() === title.replace(/\.$/, "").toLowerCase();
  return (
    <article id={id} className="card-mark scroll-mt-header flex flex-col p-5">
      {repeat ? null : <p className="kicker">{eyebrow}</p>}
      <h3 className={`display text-card text-fg ${repeat ? "" : "mt-3"}`}>{title}</h3>
      <p className="mt-3 text-signal">{body}</p>
    </article>
  );
}

function OneDay() {
  const cards = [
    {
      id: "field",
      eyebrow: "01 / The night before",
      title: "Walk onto the field already knowing it.",
      body: "The event’s field is already there, measured off the official map. Pick the breaks you run or tap your own onto the bunkers, and every player gets a card with his bunker, his lane and his job in your team’s words.",
    },
    {
      id: "walk",
      eyebrow: "02 / The field walk",
      title: "Tap a bunker. See what it sees.",
      body: "Your notes stand beside the bunker like sticky notes. Ask what can be seen from there and the lanes draw themselves, clear or blocked, in feet.",
    },
    {
      id: "points",
      eyebrow: "03 / Between points",
      title: "Score it, call it, set the five.",
      body: "One tap for who won it. The break clock counts itself down. Two taps to swap a man. The next call sits under the score, with what they ran last time in this spot and how often.",
    },
    {
      id: "chart",
      eyebrow: "04 / Off the buzzer",
      title: "Tap the bunker. That’s the log.",
      body: "Tap where each man went. Wrong bunker? Undo. No forms, no typing, no lists while the point is live.",
    },
    {
      id: "scout",
      eyebrow: "05 / The next opponent",
      title: "Scout them from the fence.",
      body: "Pick the game off the schedule and tap Watch this game. Chart both teams; none of it touches your own record.",
    },
    {
      id: "sunday",
      eyebrow: "06 / The drive home",
      title: "What you learned Saturday is waiting Sunday.",
      body: "Your record at the event, the bunkers that win you points, the calls that were read, and your answer to each team’s favourite break. Then the drill: two seconds to name a break from the field alone.",
    },
  ];
  return (
    <section id="day" className="scroll-mt-header border-t border-line bg-inset">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="kicker">One day at an event</p>
        <h2 className="display text-section mt-3 max-w-4xl text-fg">Calm on the sideline.</h2>
        <p className="mt-4 max-w-2xl text-lede text-fg">
          Two minutes between points, and every tap saves time instead of costing it. Look down and the answer is there: the call, the score, who’s on, what they ran last time. Look up and coach.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <MarkCard key={card.id} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Holds() {
  const cards = [
    {
      eyebrow: "The look",
      title: "The look.",
      body: "Stadium dark: black ground, red light, off-white type that reads under lights and in full sun. The real layout for every event, bunkers in the colours the map paints them. Each pit its own wire colour, every shot lane white, so a glance is enough. Thumb-sized buttons, and on an iPad the field and the sheet stand side by side.",
    },
    {
      eyebrow: "The quality",
      title: "The quality.",
      body: "Bunkers measured off the event’s own map, not guessed. Every number is counted from what you logged, never invented, and when there is not enough logged yet it says so. Wrong bunker, wrong man, wrong score: one tap undoes it.",
    },
    {
      eyebrow: "The ease",
      title: "The ease.",
      body: "The score, the call and the five live on one sheet. Name the breaks, the bunkers and the jobs the way your team shouts them. A ? on every screen answers the question for that screen. Answer the format once and every match starts with it.",
    },
    {
      eyebrow: "The field has no bars",
      title: "The field has no bars.",
      body: CLOUD_COPY.offline,
    },
  ];
  return (
    <section id="hold" className="scroll-mt-header border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="kicker">How it looks, how it holds up, how it handles</p>
        <h2 className="display text-section mt-3 max-w-4xl text-fg">Built for one hand and two minutes.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <MarkCard key={card.eyebrow} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section id="call" className="bg-primary">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="display text-close text-fg">Make your call.</h2>
        <p className="mt-4 font-display text-3xl font-bold uppercase tracking-wide text-fg">Then look up.</p>
        <Platforms className="mt-5 font-display text-2xl font-bold tracking-wide text-fg" />
        <div className="mt-8">
          <GetGridlock className="btn btn-on-red w-full sm:w-auto">Get Gridlock</GetGridlock>
        </div>
      </div>
    </section>
  );
}

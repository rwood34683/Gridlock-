import { CLOUD_COPY } from "@/cloud-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Gridlock Coach" },
      {
        name: "description",
        content:
          "Your account, optional full-season League sync, administrator review, and how to pause, restore or delete a copy.",
      },
    ],
  }),
  component: Privacy,
});

const POINTS = [
  "Your working season is saved on your device.",
  "We do not sell data.",
  "There are no ads, no analytics and no tracking.",
  "Account sign-in uses our account server.",
  "League sync is off until you turn it on.",
] as const;

function Privacy() {
  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="kicker">Privacy</p>
        <h1 className="display text-page mt-3 text-fg">Your season. Your choice to sync.</h1>
        <p className="mt-3 text-signal">Privacy notice · November 3, 2026</p>
        <ul className="mt-8">
          {POINTS.map((point) => (
            <li key={point} className="border-t border-line py-4 text-lede font-semibold text-fg">
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-8 space-y-4 text-fg">
          <p>
            Your season stays on the device. It works with no signal once you have signed in there. If you turn on League sync, a full-season copy is kept with your account on our account server, where Gridlock PB LLC's administrators can review it. Keep a file before each event for a backup you control.
          </p>
          <p className="text-signal">
            Save a copy is a file you keep. It gives you a backup you control and can carry to another phone.
          </p>
          <p>
            <Link to="/support" hash="save" className="text-signal underline-offset-4 hover:underline">
              How to save and load a copy
            </Link>
          </p>
        </div>
        <section className="card mt-12 p-5" aria-labelledby="account-title">
          <h2 id="account-title" className="display text-section text-fg">Your account</h2>
          <p className="mt-3 text-fg">{CLOUD_COPY.account}</p>
          <p className="mt-3 text-fg">Gridlock PB LLC's administrators can review accounts and manage plans. They cannot see your password.</p>
        </section>
        <section className="card mt-12 p-5" aria-labelledby="device-title">
          <h2 id="device-title" className="display text-section text-fg">What stays on the device</h2>
          <p className="mt-3 text-fg">Playbook, tally, scout, sightlines, the schedule, player cards, the record, lineups, grades, messages, field notes, voice-log text, and class sign-ins and contacts you enter all live on that device. The app also keeps your email and a salted hash of your password on the device, so you can sign in with no signal. In a browser, the season is in that browser's storage for app.gridlockpb.com. The installed app also keeps a second copy in the phone's app storage.</p>
        </section>
        <section className="card mt-12 p-5" aria-labelledby="sync-title">
          <h2 id="sync-title" className="display text-section text-fg">League sync: your choice</h2>
          <p className="mt-3 text-fg">{CLOUD_COPY.sync}</p>
          <p className="mt-3 text-fg">A full season includes your roster, tallies and results, scouting on other teams, field notes, your words for bunkers and calls, your plays and other season records. Your account password is not part of that upload.</p>
        </section>
        <section className="card mt-12 p-5" aria-labelledby="voice-title">
          <h2 id="voice-title" className="display text-section text-fg">Voice log</h2>
          <p className="mt-3 text-fg">Voice log asks for the microphone only after you tap Start listening. Your phone's or browser's speech service turns speech into text and may send audio to its own servers to do it. Gridlock keeps the text on your device, never the audio.</p>
        </section>
        <section className="card mt-12 p-5">
          <h2 className="display text-section text-fg">This site and the app</h2>
          <p className="mt-3 text-fg">
            gridlockpb.com is the public page for Gridlock Coach, hosted by Vercel. The app at app.gridlockpb.com is delivered through Cloudflare. Like any website, they receive ordinary connection information such as your IP address. Signing in, creating an account, confirming your email, resetting a password, checking your plan and League sync contact the account server, which receives the same kind of information. There are no ads and no analytics on this site.
          </p>
          <p className="mt-3 text-signal">Gridlock PB LLC · Florida, USA</p>
          <a
            href="mailto:support@gridlockpb.com"
            className="mt-4 flex min-h-11 items-center break-all font-display text-xl font-bold uppercase tracking-wide text-fg hover:text-accent"
          >
            support@gridlockpb.com
          </a>
        </section>
      </main>
    </Shell>
  );
}

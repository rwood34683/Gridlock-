import { CLOUD_COPY } from "@/cloud-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Shell } from "@/components/site-chrome";
import { APP_URL } from "@/app-url";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Gridlock Coach" },
      {
        name: "description",
        content:
          "Save a copy from More → Nexus, load it on a new phone, and reach Gridlock PB LLC.",
      },
    ],
  }),
  component: Support,
});

const FAQ = [
  {q: "Where does League sync keep my season?", a: CLOUD_COPY.sync},
  {
    q: "How do I save the season?",
    a: "More → Nexus → Save a copy. That file is the backup.",
  },
  {
    q: "How do I load a copy on a new phone?",
    a: "Save a copy on the phone you coach with. Move that file yourself. On the new phone, open Gridlock Coach and load the copy from More → Nexus. The app keeps it on the phone.",
  },
  {
    q: "Does it work with no signal?",
    a: "After the app has loaded, the coaching tools work without signal. You need a signal for a new sign-in, account creation, password resets and League sync.",
  },
  {
    q: "What is the account?",
    a: CLOUD_COPY.account,
  },
  {
    q: "Who is it for?",
    a: "Coaches, players and league staff. Paintball. Built for X-Ball and 5-man, together on the sideline.",
  },
  {
    q: "What does the break clock follow?",
    a: "You set it when you sign in. It counts down on its own.",
  },
  {
    q: "What does the horn mark?",
    a: "End, tie or overtime.",
  },
  {
    q: "Are penalties called in the app?",
    a: "Penalties are recorded, never called.",
  },
  {
    q: "Are scout reads and sightlines a prediction?",
    a: "No. Scout reads and sightlines are coaching aids, not predictions or a substitute for the officials’ live call.",
  },
  {
    q: "What is the lane control called?",
    a: "Shot lanes. White on the field, so a glance is enough. In the playbook: route, face, shot lane and job for each of the five.",
  },
  {
    q: "What is Rep?",
    a: "A break draws on the field with no name. You have two seconds to call it.",
  },
  {
    q: "What is Counter?",
    a: "Your answer to each team’s favourite break. The count is what you logged. When there isn’t enough yet, it says so.",
  },
  {
    q: "Does scouting change my record?",
    a: "No. Watch this game charts both teams, and none of it touches your own record.",
  },
] as const;

function Support() {
  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="kicker">Support</p>
        <h1 className="display text-page mt-3 text-fg">Save the season. Move the phone.</h1>
        <p className="mt-4 text-lede text-fg">
          Your working season is saved on this device. Keep a file before every event. If you turned on League sync, you can also review or restore its current server copy in Nexus.
        </p>

        <section id="beta" className="scroll-mt-header mt-12">
          <h2 className="display text-section text-fg">Beta sign-in</h2>
          <p className="mt-4 text-fg">
            Invited testers create a Gridlock account with their invited email, or sign in with their existing Gridlock password. Password resets are available on the sign-in screen.
          </p>
          <a href={APP_URL} className="btn btn-primary mt-6 w-full sm:w-auto">
            Get Gridlock
          </a>
        </section>

        <section id="save" className="scroll-mt-header mt-12">
          <h2 className="display text-section text-fg">Save a copy</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {["More", "Nexus", "Save a copy"].map((step, i) => (
              <li key={step} className="card px-4 py-5">
                <span className="kicker">0{i + 1}</span>
                <p className="display mt-2 text-3xl text-fg">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-signal">That file is a backup you control. It is also how you move a saved season to another phone.</p>
        </section>

        <section id="load" className="scroll-mt-header mt-12">
          <h2 className="display text-section text-fg">Load a copy on a new phone</h2>
          <ol className="mt-5 space-y-4">
            {[
              "On the phone you coach with: More → Nexus → Save a copy.",
              "Move that file yourself. The app keeps it on the phone.",
              "On the new phone, open Gridlock Coach. In More → Nexus, load the copy.",
            ].map((step, i) => (
              <li key={step} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-line pt-4">
                <span className="display text-3xl text-signal">0{i + 1}</span>
                <p className="text-fg">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-signal">League sync is another way to move the current season: sign in on the new phone, then review and restore the server copy in Nexus before turning on sending.</p>
        </section>

        <section className="mt-14" aria-labelledby="faq-title">
          <h2 id="faq-title" className="display text-section text-fg">
            FAQ
          </h2>
          <div className="mt-4 border-b border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-t border-line">
                <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-3 text-lede font-semibold text-fg">
                  {item.q}
                  <ChevronDown className="size-5 shrink-0 text-signal transition-transform duration-150 ease-out group-open:rotate-180" aria-hidden />
                </summary>
                <p className="pb-4 text-fg">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="card mt-14 p-5" aria-labelledby="contact-title">
          <h2 id="contact-title" className="display text-section text-fg">
            Gridlock support
          </h2>
          <p className="mt-3 text-fg">
            For account help, password-reset questions, feedback, or bug reports, email{" "}
            <a href="mailto:support@gridlockpb.com" className="text-signal underline-offset-4 hover:underline">
              support@gridlockpb.com
            </a>
            . Include your device/browser and any error message. Keep passwords and verification codes private.
          </p>
          <p className="mt-3 text-signal">Gridlock PB LLC · Florida, USA</p>
          <a
            href="mailto:support@gridlockpb.com"
            className="mt-4 flex min-h-11 items-center font-display text-xl font-bold uppercase tracking-wide text-fg underline-offset-4 hover:text-accent hover:underline"
          >
            support@<wbr />gridlockpb.com
          </a>
          <p className="mt-4">
            <Link to="/privacy" className="text-signal underline-offset-4 hover:underline">
              Privacy
            </Link>
          </p>
        </section>
      </main>
    </Shell>
  );
}

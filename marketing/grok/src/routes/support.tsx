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
          "Sign in across devices, reset your password, save or restore a season, and reach Gridlock support.",
      },
    ],
  }),
  component: Support,
});

const FAQ = [
  {q: "What does the Coach pass include?", a: CLOUD_COPY.payments.title + ". " + CLOUD_COPY.payments.offer + " " + CLOUD_COPY.payments.renewal},
  {q: "When does my pass end?", a: CLOUD_COPY.payments.expiry},
  {q: "What if I paid but cannot get in?", a: CLOUD_COPY.payments.help},
  {q: "Can I get a refund?", a: CLOUD_COPY.payments.refund},
  {q: "What about my existing beta or admin access?", a: CLOUD_COPY.payments.existing},
  {
    q: "Can I use the same account on my phone and computer?",
    a: "Yes. Open the app and use the same account email and password on each device. Purchases belong to that account. Your season stays on the device unless you move a saved copy or restore your League sync copy in Account & backups.",
  },
  {
    q: "I reset my password but still cannot sign in.",
    a: "Use the email on your Gridlock account. Different emails are different accounts; a password reset does not move a purchase. Request one new link, open the newest email and save your new password. Use it on every device. If it still fails, email support with the error message. Keep passwords and verification codes private.",
  },
  {
    q: "How do I delete my account?",
    a: "More → Account & backups → Delete account permanently deletes your login and the League sync copy. Files you saved or shared and seasons on your devices stay until you delete them there. Payment records are handled as described in Privacy.",
  },
  {q: "Where does League sync keep my season?", a: CLOUD_COPY.sync},
  {
    q: "How do I save the season?",
    a: "More → Account & backups → Save everything. That file is your backup, and you can save it after your pass ends.",
  },
  {
    q: "How do I load a copy on a new phone?",
    a: "Save a copy on the phone you coach with. Move that file yourself. On the new phone, sign in to Gridlock Coach and load the copy from More → Account & backups. The app keeps it on the phone. Moving a copy does not buy or extend a pass.",
  },
  {
    q: "Does it work with no signal?",
    a: "Check your active pass online before the event. You can then coach without a signal until the pass ends. A new device, account creation, password resets, payment and League sync need a connection. Your saved season, backups and exports remain after expiration.",
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
          Your working season is saved on this device. Keep a file before every event. If you turned on League sync, you can also review or restore its current server copy in Account & backups.
        </p>

        <section id="beta" className="scroll-mt-header mt-12">
          <h2 className="display text-section text-fg">Sign in and purchase</h2>
          <p className="mt-4 text-fg">
            {CLOUD_COPY.payments.purchase}
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-fg">
            <li>Open the app. Create your account and confirm the email, or sign in.</li>
            <li>Choose Buy today’s pass and complete Stripe checkout for that account.</li>
            <li>Return to the app and choose Check access if needed. Do not pay again if you were charged.</li>
          </ol>
          <a href={APP_URL} className="btn btn-primary mt-6 w-full sm:w-auto">
            Sign in to purchase
          </a>
        </section>

        <section id="save" className="scroll-mt-header mt-12">
          <h2 className="display text-section text-fg">Save a copy</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {["More", "Account & backups", "Save everything"].map((step, i) => (
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

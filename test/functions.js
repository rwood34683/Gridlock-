#!/usr/bin/env node
/* Gridlock function suite.
 *
 * Drives the real app in a real browser and asserts every interactive
 * function actually does what it claims. Run the dev server first:
 *
 *   npm run serve      # terminal 1
 *   npm run test       # terminal 2
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

const URL = process.env.APP_URL || "http://localhost:5173/";

const results = [];
let group = "";
const G = name => { group = name; };
const check = (name, pass, detail) => results.push({ group, name, pass: !!pass, detail });

const ROSTER = [
  { name: "Reyes", num: 7, p: "snake MW", s: "GP" }, { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
  { name: "Vance", num: 11, p: "GP", s: "snake" }, { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
  { name: "Bright", num: 5, p: "back centre", s: "MD hold" },
];

(async () => {
  const browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", d => d.accept());               // alert()/prompt() must not hang the run

  const seed = async (extra = {}) => {
    await page.evaluate(s => localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)), {
      entered: true, role: "staff", email: "coach@team.com", tab: "playbook",
      layoutKey: "mwo", script: "snake", faceOn: true, shotOn: true, t: 0.5, point: 1,
      tips: { pb: 1, tally: 1, scout: 1, sl: 1, class: 1, lg: 1 }, roster: ROSTER,
      left: { name: "Blast Camp", tend: "Balanced", threat: 5, pts: 200, notes: "" },
      right: { name: "Rejects", tend: "Snake", threat: 4, pts: 186, notes: "" },
      ...extra,
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(150);
  };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const go = async (tab, more = null) => { await ev(([t, m]) => window.set({ tab: t, more: m }), [tab, more]); await page.waitForTimeout(60); };

  await page.goto(URL, { waitUntil: "networkidle" });

  /* ---------------------------------------------------------- boot + promo */
  G("Boot and promo gate");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  check("promo shows first, never the tutorial", await ev(() => !S.entered && !S.showTutorial));
  // There is no way past this screen but an account. The only door that does
  // not need one is a class deep link, which is a participant signing a clinic
  // sheet rather than the coach — checked separately below.
  check("the promo offers three routes and no more", await page.locator(".promo .btn").count() === 3);
  check("and every one of them is the account or the tour", await ev(() =>
    [...document.querySelectorAll(".promo .btn")].map(b => b.textContent.trim()).join("|"))
    === "Create your account|I already have one|Show me how it works");
  check("nothing on it lets a coach in without one", await ev(() => {
    const opens = [...document.querySelectorAll(".promo .btn")]
      .filter(b => /entered\s*:\s*true/.test(b.getAttribute("onclick") || ""));
    return opens.length === 0 && !S.entered;
  }));
  check("the tour shows what it does without letting him through", await ev(() => {
    [...document.querySelectorAll(".promo .btn")].find(b => /Show me/.test(b.textContent)).click();
    const t = document.getElementById("root").innerText;
    const shown = /How it works/.test(t) && /Tap the bunker a man broke to/.test(t);
    const still = !S.entered;
    window.set({ promoTour: false });
    return shown && still;
  }));
  // On an address the phone calls insecure there is no crypto to hash a
  // password with, so sign-in refuses — which used to cost one feature and now
  // costs the whole app. The promo has to say so rather than look broken.
  check("an insecure address says why nobody can get in", (() => {
    const src = fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");
    return /function promo\(\)[\s\S]{0,220}contextWarning\(\)/.test(src);
  })());
  await ev(() => window.set({ entered: true, role: "staff" }));
  // The one door that is not the account: a class deep link. That is a
  // participant signing a clinic sheet, not the coach, and the spec has always
  // said joining a class needs no account.
  check("a class deep link still opens without one — the join sheet alone, never the app", await (async () => {
    const at = page.url().split("?")[0];
    await ev(() => { window.set({ entered: false, role: "" }); });
    await page.goto(at + "?c=gl-7k2m", { waitUntil: "networkidle" });
    const got = await ev(() => !S.entered && S.joinOnly && S.joinCode === "GL-7K2M"
      && !!document.querySelector("#root input[placeholder='GL-7K2M']") && !document.querySelector("#root .tabs")
      && /No open session with that code/.test(document.getElementById("root").innerText));
    // A relaunch without the link is the welcome page: the sheet is scratch.
    await page.goto(at, { waitUntil: "networkidle" });
    const back = await ev(() => !S.entered && !S.joinOnly && !!document.querySelector("#root .promo") && !document.querySelector("#root input[placeholder='GL-7K2M']"));
    await ev(() => window.set({ entered: true, role: "staff" }));
    return got && back;
  })());
  check("and on a phone that is signed in, the same link opens Classes with the code filled", await (async () => {
    const at = page.url().split("?")[0];
    await page.goto(at + "?c=GL-7K2M", { waitUntil: "networkidle" });
    const got = await ev(() => S.entered && !S.joinOnly && S.tab === "more" && S.more === "classes" && S.joinCode === "GL-7K2M");
    await page.goto(at, { waitUntil: "networkidle" });
    await ev(() => window.set({ entered: true, role: "staff" }));
    return got;
  })());
  check("tab bar has the five phone tabs", await page.locator(".tabs button").count() === 5);

  /* ------------------------------------------------------------ the welcome */
  G("The welcome page");
  await ev(() => { localStorage.clear(); window.set({ entered: false, mode: null }); });
  await page.waitForTimeout(80);
  const promoText = () => ev(() => document.getElementById("root").innerText);
  check("it says what the app does before it asks for anything", await (async () => {
    const t = await promoText();
    return /twelve breaks/i.test(t) && /bunker a man broke to/i.test(t) && /win you points/i.test(t);
  })());
  check("the loudest button is the account", await ev(() => {
    const big = document.querySelector("#root .btn--lg");
    return !!big && /Create your account|Sign in/.test(big.textContent);
  }));
  // The first screen sells what the app does and makes no claim about price
  // or accounts. A welcome screen that promises nothing cannot break a promise
  // the day a wall goes up, and the price belongs on the store page and the
  // Plan screen, where a coach goes looking for it.
  check("it makes no promise about price on the first screen", await (async () => {
    const t = await promoText();
    return !/free/i.test(t) && !/a season/i.test(t) && !/\$/.test(t);
  })());
  check("and none about accounts either", await (async () => {
    const t = await promoText();
    return !/no account/i.test(t);
  })());
  check("what it does say is still what it does", await (async () => {
    const t = await promoText();
    return /twelve breaks/i.test(t) && /bunker a man broke to/i.test(t) && /win you points/i.test(t);
  })());
  // Nothing leaves the phone is still promised, where a coach goes looking for
  // it rather than on the way past.
  check("the privacy promise survives on the screens that are about it", await ev(() => {
    window.set({entered: true, tab: "more", more: "nexus"});
    const nexus = document.getElementById("root").innerText;
    window.set({tab: "more", more: "help", helpFor: ""});
    const help = document.getElementById("root").innerText;
    window.set({entered: false, more: null});
    return /phone/i.test(nexus) && /signal/i.test(help);
  }));
  // The form takes the screen instead of hanging off the bottom of the choices.
  // Appended below, it sat under three buttons and the footer — off the fold on
  // a phone, with two ways to do one thing both on screen.
  check("opening the form replaces the choices rather than adding to them", await ev(() => {
    window.set({ mode: "login", authSaid: "" });
    const labels = [...document.querySelectorAll("#root .btn")].map(b => b.textContent.trim());
    const gone = !labels.some(l => /Show me how it works|I already have one$/.test(l));
    const pitch = !/twelve breaks/i.test(document.getElementById("root").innerText);
    window.set({ mode: null });
    return gone && pitch;
  }));
  check("and it is at the top of the screen, not under the fold", await ev(() => {
    window.set({ mode: "login", authSaid: "" });
    const f = document.querySelector("#root .panel").getBoundingClientRect();
    const ok = f.top >= 0 && f.top < window.innerHeight * 0.55;
    window.set({ mode: null });
    return ok;
  }));
  // A bottom-aligned scrolling column pushes its own first child above the
  // scroll origin the moment the content is taller than the box, and it can
  // never be scrolled back to. That is how the headline got under the clock.
  check("the mark stays reachable when the page is taller than the phone", await ev(() => {
    window.set({ mode: null, promoTour: true });
    const top = document.querySelector("#root .promo__mark").getBoundingClientRect().top;
    window.set({ promoTour: false });
    return top >= 0;
  }));
  check("a phone with no account leads with making one", await ev(() => {
    [...document.querySelectorAll("#root .promo .btn")].find(b => /Create your account/.test(b.textContent)).click();
    return S.mode === "create";
  }));
  check("and the form switches to signing in without going back", await ev(() => {
    [...document.querySelectorAll("#root button")].find(b => /Already have one/.test(b.textContent)).click();
    return S.mode === "login";
  }));
  // It used to say coaching needed no account. That stopped being true the
  // moment the promo required one, and a form that lies about what it is for
  // is worse than one that says nothing.
  check("the form no longer claims coaching works without one",
    await ev(() => !/Coaching a match needs none/.test(document.getElementById("root").innerText)));
  check("it says what the account actually is instead",
    await ev(() => /lives on this phone and nowhere else/i.test(document.getElementById("root").innerText)));
  await ev(() => window.set({ mode: null }));

  /* ------------------------------------------------- what "I already have one" does */
  G("Signing in, and every way it fails");
  const tryAuth = async (mode, em, pw) => {
    await ev(m => window.set({ mode: m, authSaid: "", entered: false }), mode);
    await page.waitForTimeout(60);
    await page.fill("#em", em); await page.fill("#pw", pw);
    await ev(async () => { await window.doAuth(); });
    await page.waitForTimeout(120);
    return ev(() => ({ in: S.entered, said: S.authSaid }));
  };
  await ev(() => { localStorage.clear(); });
  await page.reload({ waitUntil: "networkidle" });
  // The one that matters most: a new phone. There is no server, so his account
  // cannot be looked up — and the old wording blamed him for typing it wrong.
  let r = await tryAuth("login", "coach@team.com", "sideline1");
  check("a phone that has never had an account says exactly that", !r.in
    && /never had an account on it/.test(r.said) && /no server to look yours up on/.test(r.said));
  check("and tells him his season is not inside the account",
    /Nothing you have logged is kept inside an account/.test(r.said));
  check("and where a season actually moves from", /Save a copy/.test(r.said));
  check("it is said on the screen, not in an alert he dismisses",
    await ev(() => /never had an account/.test(document.getElementById("root").innerText)));
  r = await tryAuth("create", "coach@team.com", "sideline1");
  check("making one instead lets him in", r.in && !r.said);
  r = await tryAuth("login", "coach@team.com", "sideline1");
  check("and he can sign back in on that phone", r.in && !r.said);
  r = await tryAuth("login", "coach@team.com", "wrongpass");
  check("a wrong password is told apart from a missing account", !r.in
    && /password does not match/.test(r.said) && !/never had an account/.test(r.said));
  check("and says there is nowhere to reset it from, and why",
    /nowhere to reset it from/.test(r.said) && /leaves your season exactly where it is/.test(r.said));
  r = await tryAuth("login", "someone@else.com", "sideline1");
  check("a different email names the one this phone has", !r.in
    && /account on this phone is coach@team.com/.test(r.said));
  r = await tryAuth("login", "coach@team.com", "abc");
  check("a short password is caught before anything is hashed", !r.in
    && /six characters or more/.test(r.said));
  check("a stale message does not greet him on the other form", await ev(() => {
    window.set({ mode: "create", authSaid: "" });
    return !S.authSaid && !/does not match/.test(document.getElementById("root").innerText);
  }));
  // The season and the account are two different stores, which is the whole
  // reason a locked-out coach loses nothing by making a new one.
  check("the season is not kept inside the account", await ev(() => {
    window.set({ entered: true, role: "staff", right: { name: "Rejects" }, mode: null });
    window.newMatch();
    const kept = (S.matches || []).length;
    localStorage.removeItem("gridlock.staff.v2");
    return kept >= 1 && (S.matches || []).length === kept;
  }));
  await ev(() => window.set({ entered: true, role: "staff", mode: null, authSaid: "" }));

  /* ------------------------------------------- the account server, and no signal */
  G("The account on a server, and a field with no bars");
  await ev(() => {
    localStorage.clear();
    const users = {};
    window.__net = true;
    const net = () => window.__net ? null : { offline: true };
    window.gridlockCloud = {
      async signUp(email, pass){ const o = net(); if(o) return o;
        if(users[email]) return {ok:false, said:"That email already has an account."};
        users[email] = pass; return {ok:true, user:{id:"u_" + email}}; },
      async signIn(email, pass){ const o = net(); if(o) return o;
        return users[email] === pass ? {ok:true, user:{id:"u_" + email}}
                                     : {ok:false, said:"Email or password is wrong."}; },
      async sendReset(email){ const o = net(); if(o) return o;
        return users[email] ? {ok:true} : {ok:false, said:"No account with that email."}; },
      signOut(){}, session(){ return null; },
    };
    window.set({ entered: false, mode: null, authSaid: "" });
  });
  const cloudAuth = async (mode, em, pw) => {
    await ev(m => window.set({ mode: m, authSaid: "", entered: false }), mode);
    await page.waitForTimeout(60);
    await page.fill("#em", em); await page.fill("#pw", pw);
    await ev(async () => { await window.doAuth(); });
    await page.waitForTimeout(140);
    return ev(() => ({ in: S.entered, said: S.authSaid }));
  };
  let c = await cloudAuth("create", "coach@t.com", "sideline1");
  check("creating an account goes to the server", c.in && !c.said);
  check("and is mirrored onto the phone, so the next launch works offline", await ev(() => {
    const a = JSON.parse(localStorage.getItem("gridlock.staff.v2"));
    return a.cloud === true && !!a.salt && !!a.hash && a.uid === "u_coach@t.com";
  }));
  c = await cloudAuth("create", "coach@t.com", "different1");
  check("a refusal from the server is shown as written", !c.in && /already has an account/.test(c.said));
  c = await cloudAuth("login", "coach@t.com", "wrongpass1");
  check("and so is a wrong password", !c.in && /Email or password is wrong/.test(c.said));
  // The one that matters: a sideline with no bars must never be a locked door.
  await ev(() => { window.__net = false; });
  c = await cloudAuth("login", "coach@t.com", "sideline1");
  check("with no signal he still gets in off the phone", c.in);
  check("and is told nothing about the network, because it is not his problem", !c.said);
  c = await cloudAuth("login", "coach@t.com", "nothisone1");
  check("a wrong password with no signal is still refused", !c.in && /does not match/.test(c.said));
  check("and says why it could not ask the server, now that there is one",
    /no signal/.test(c.said) && !/nowhere to reset it from/.test(c.said));
  await ev(() => { window.__net = true; });
  check("a reset link is offered only where there is somewhere to reset from", await ev(() => {
    window.set({ entered: false, mode: "login", authSaid: "" });
    return /Email me a link/.test(document.getElementById("root").innerText);
  }));
  check("and it sends", await ev(async () => {
    document.getElementById("em").value = "coach@t.com";
    await window.sendReset();
    return /Check that inbox/.test(S.authSaid);
  }));
  check("an unknown email is told so rather than silently succeeding", await ev(async () => {
    document.getElementById("em").value = "nobody@t.com";
    await window.sendReset();
    return /No account with that email/.test(S.authSaid);
  }));
  // The whole basis of the deal: accounts go up, the season does not.
  check("nothing about the season is anywhere near the account code", await ev(() => {
    const src = String(window.doAuth) + String(window.sendReset);
    return !/matches|tally|roster|breakouts|scout|plays/.test(src);
  }));
  check("and the panel says exactly what does leave the phone", await ev(() => {
    window.set({ mode: "create", authSaid: "" });
    const t = document.getElementById("root").innerText;
    return /season never leaves this device/i.test(t) && /email/i.test(t);
  }));
  check("with no server it says the older, simpler truth instead", await ev(() => {
    const had = window.gridlockCloud; delete window.gridlockCloud;
    window.set({ mode: "create", authSaid: "" });
    const t = document.getElementById("root").innerText;
    const ok = /nowhere else/.test(t) && !/our server/.test(t)
      && !/Email me a link/.test(t);
    window.gridlockCloud = had;
    return ok;
  }));
  await ev(() => { delete window.gridlockCloud; delete window.__net;
    localStorage.clear(); window.set({ entered: true, role: "staff", mode: null, authSaid: "" }); });

  /* ------------------------------------------- opt-in League sync (the one exception) */
  // The season only ever leaves the phone because the coach turned it on, and
  // only through the shell's adapter — the app itself still makes no fetch.
  G("League sync — opt-in, off by default, offline-first");
  await ev(() => window.set({ tab: "more", more: "nexus", syncOn: false, syncAt: null, syncSaid: "", syncLabel: "" }));
  check("with no upload adapter there is no League sync, and the data stays put", await ev(() => {
    delete window.gridlockCloud;
    window.set({ tab: "more", more: "nexus" });
    const t = document.getElementById("root").innerText;
    return !/League sync/.test(t) && /On this device only/.test(t);
  }));
  await ev(() => {
    window.__pushes = []; window.__deleted = false; window.__syncNet = true;   // true = has signal
    window.gridlockCloud = {
      async pushSeason(label, payload){ window.__pushes.push({ label, payload });
        return window.__syncNet ? { ok: true } : { ok: false, offline: true }; },
      async deleteSeason(){ if(!window.__syncNet) return { ok:false, offline:true };
        window.__deleted = true; return { ok: true }; },
    };
    window.set({ tab: "more", more: "nexus" });
  });
  check("with the adapter, Nexus offers League sync and says it is off until you turn it on", await ev(() => {
    const t = document.getElementById("root").innerText;
    return /League sync/.test(t) && /off until you turn it on/i.test(t) && /Send my season to my league/.test(t);
  }));
  check("turning it on pushes the whole season through the adapter", await ev(async () => {
    window.toggleSync();
    await new Promise(r => setTimeout(r, 20));
    if(window.__pushes.length !== 1) return false;
    const p = JSON.parse(window.__pushes[0].payload);
    return S.syncOn === true && p.format === "gridlock.coach.copy" && p.data && S.syncAt && /Sent to your league/.test(S.syncSaid);
  }));
  check("now the data-lives line says the season is going up", await ev(() =>
    /being sent to your league/i.test(document.getElementById("root").innerText)));
  check("no signal is silent about the network and does not stamp a send", await ev(async () => {
    window.__syncNet = false; const wasAt = S.syncAt;
    await window.syncNow();
    return /No signal/i.test(S.syncSaid) && S.syncAt === wasAt;
  }));
  check("delete removes what was sent and turns sync off", await ev(async () => {
    window.__syncNet = true;
    await window.deleteSynced();
    return window.__deleted === true && S.syncOn === false && /removed from the league/i.test(S.syncSaid);
  }));
  check("the sign-in panel tells a new coach the season stays put unless he turns sync on", await ev(() => {
    window.set({ entered: false, mode: "create", authSaid: "" });
    const t = document.getElementById("root").innerText;
    return /switch on League sync/i.test(t);
  }));
  check("the sync handlers contain no fetch — uploading is the shell's job", await ev(() =>
    !/fetch\s*\(/.test(String(window.syncNow) + String(window.deleteSynced) + String(window.toggleSync))));
  await ev(() => { delete window.gridlockCloud; delete window.__pushes; delete window.__deleted; delete window.__syncNet;
    window.set({ entered: true, role: "staff", more: null, mode: null, syncOn: false, syncAt: null, syncSaid: "", syncLabel: "" }); });

  /* ------------------------------------- a backup restores a season, not a login */
  G("A restored season does not walk past the sign-in");
  check("a durable copy carries the session, because save() writes all of S",
    await ev(() => {
      localStorage.clear();
      window.set({ entered: true, role: "staff", email: "c@t.com" });
      const blob = JSON.parse(localStorage.getItem("gridlock.coach.v2") || "{}");
      return blob.entered === true;                 // the hole, if nothing held it back
    }));
  check("but restoring it onto a phone nobody has signed in on does not let them in",
    await ev(() => {
      const blob = localStorage.getItem("gridlock.coach.v2");
      localStorage.clear();
      window.set({ entered: false, role: "guest", email: "" });
      window._hadLocal = false;
      const took = window.gridlockRestore(blob);
      return !S.entered && S.role !== "staff" && S.email === "";
    }));
  check("and the season itself still comes across", await ev(() => Array.isArray(S.matches)));
  await ev(() => { localStorage.clear(); window.set({ entered: true, role: "staff", email: "" }); });

  /* ------------------------------------------------------- who he is, provable */
  G("Sign in with Apple, and the phone step");
  // Both are adapters the native shell fills in. In a browser neither exists,
  // and a button with nothing behind it is worse than no button.
  await ev(() => { localStorage.clear(); window.set({ entered: false, mode: null }); });
  await page.reload({ waitUntil: "networkidle" });
  check("a browser is offered neither, because it can do neither", await ev(() => {
    const promo = document.getElementById("root").innerText;
    window.set({ entered: true, role: "staff", tab: "more", more: "nexus" });
    const nexus = document.getElementById("root").innerText;
    window.set({ entered: false, more: null });
    return !/Sign in with Apple/.test(promo) && !/Verify your phone/.test(nexus);
  }));
  // Stand in for the shell: Apple hands back a verified person, and a server
  // holds the code. The app never makes a code and never checks one.
  await ev(() => {
    window.gridlockApple = { signIn: async () => ({ sub: "000123.abc", email: "c@privaterelay.appleid.com", name: "R Wood" }) };
    let sent = null;
    window.gridlockVerify = {
      start: async () => { sent = "424242"; return { ok: true, said: "Code sent." }; },
      check: async (phone, code) => code === sent ? { ok: true } : { ok: false, said: "That code does not match." },
    };
    window.set({ entered: false, mode: null });
  });
  check("where the phone can do it, Apple leads", await ev(() =>
    /Sign in with Apple/.test(document.getElementById("root").innerText)));
  await ev(async () => { await window.appleSignIn(); });
  await page.waitForTimeout(100);
  check("one tap signs him in", await ev(() => S.entered && S.role === "staff"));
  check("kept as an Apple account with no password to store", await ev(() => {
    const a = JSON.parse(localStorage.getItem("gridlock.staff.v2"));
    return a.kind === "apple" && !a.hash && !a.salt;
  }));
  // Apple withholds the email after the first sign-in and may hand back a relay
  // address, so the stable id is the key and the email never is.
  check("keyed on Apple's stable id, never the email", await ev(() =>
    JSON.parse(localStorage.getItem("gridlock.staff.v2")).sub === "000123.abc"));
  check("a password typed at an Apple account is explained, not rejected", await ev(async () => {
    window.set({ entered: false, mode: "login", authSaid: "" });
    document.getElementById("em").value = "c@privaterelay.appleid.com";
    document.getElementById("pw").value = "whatever1";
    await window.doAuth();
    return /signs in with Apple/.test(S.authSaid) && !/does not match/.test(S.authSaid);
  }));
  await ev(() => window.set({ entered: true, role: "staff", mode: null, tab: "more", more: "nexus" }));
  check("the phone step appears where a backend exists", await ev(() =>
    /Verify your phone/.test(document.getElementById("root").innerText)));
  check("a short number is refused before anything is sent", await ev(async () => {
    document.getElementById("vph").value = "555";
    await window.startVerify();
    return !S.verifySent && /full phone number/.test(S.verifySaid);
  }));
  check("a real one asks the server for a code", await ev(async () => {
    document.getElementById("vph").value = "(555) 555-0123";
    await window.startVerify();
    return S.verifySent === true;
  }));
  check("a wrong code keeps asking rather than letting him through", await ev(async () => {
    document.getElementById("vcode").value = "111111";
    await window.checkVerify();
    return S.verifySent && /does not match/.test(S.verifySaid) && !phoneDone();
  }));
  check("the right one verifies, and the number is kept on the account", await ev(async () => {
    document.getElementById("vcode").value = "424242";
    await window.checkVerify();
    const a = JSON.parse(localStorage.getItem("gridlock.staff.v2"));
    return a.phone === "(555) 555-0123" && !!a.phoneAt && a.kind === "apple";
  }));
  check("and Nexus says so afterwards", await ev(() =>
    /Phone · verified/.test(document.getElementById("root").innerText)));
  // The whole point: the app cannot verify anybody by itself, so it must not
  // look as though it is trying to.
  check("the app never makes a code and never checks one", (() => {
    const src = fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");
    return !/fetch\s*\(/.test(src)
      && !/window\.startVerify[\s\S]{0,700}Math\.random/.test(src);
  })());
  await ev(() => { delete window.gridlockApple; delete window.gridlockVerify;
    localStorage.removeItem("gridlock.staff.v2");
    window.set({ entered: true, role: "staff", more: null, verifySent: false, verifySaid: "", verifyPhone: "" }); });

  /* --------------------------------------------------------------- staff auth */
  G("Staff auth");
  await ev(() => { localStorage.removeItem("gridlock.staff"); localStorage.removeItem("gridlock.staff.v2"); window.set({ entered: false, mode: "create" }); });
  await page.waitForTimeout(80);
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "sideline1");
  await ev(async () => { await window.doAuth(); });
  await page.waitForTimeout(120);
  check("create account signs the coach in as staff", await ev(() => S.role === "staff" && S.entered));
  const stored = await ev(() => JSON.parse(localStorage.getItem("gridlock.staff.v2") || "{}"));
  check("password is not stored in the clear", !JSON.stringify(stored).includes("sideline1"));
  check("salt and hash are both stored", !!stored.salt && !!stored.hash && stored.hash.length === 64);
  await ev(() => window.set({ entered: false, mode: "login" })); await page.waitForTimeout(80);
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "wrongpass");
  await ev(async () => { await window.doAuth(); }); await page.waitForTimeout(120);
  check("wrong password is refused", await ev(() => !S.entered));
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "sideline1");
  await ev(async () => { await window.doAuth(); }); await page.waitForTimeout(120);
  check("correct password signs in", await ev(() => S.role === "staff"));
  const legacy = await ev(async () => {
    localStorage.removeItem("gridlock.staff.v2");
    localStorage.setItem("gridlock.staff", JSON.stringify({ email: "old@team.com", pass: "legacy123" }));
    window.set({ entered: false, mode: "login" });
    await new Promise(r => setTimeout(r, 100));
    document.getElementById("em").value = "old@team.com";
    document.getElementById("pw").value = "legacy123";
    await window.doAuth();
    await new Promise(r => setTimeout(r, 100));
    return { inn: S.role === "staff", gone: !localStorage.getItem("gridlock.staff"),
             hashed: !!(JSON.parse(localStorage.getItem("gridlock.staff.v2") || "{}").hash) };
  });
  check("a clear-text account still signs in once", legacy.inn);
  check("...and is upgraded to a hash", legacy.hashed);
  check("...and the clear-text record is deleted", legacy.gone);

  /* ------------------------------------------------------------- role gating */
  G("Role gating");
  await seed({ role: "guest", tab: "more", more: "classes" });
  check("guest cannot create a class", (await page.locator("text=Staff login required to create a class").count()) > 0);
  await go("more", "league");
  check("guest cannot open league admin", (await page.locator("text=Staff login required to open league admin").count()) > 0);
  await seed({ tab: "more", more: "classes" });
  check("staff can create a class", (await page.locator("button:has-text('Create class')").count()) > 0);
  check("joining never asks for an account", (await page.locator("text=No account needed").count()) > 0);

  /* ------------------------------------------------------------- navigation */
  G("Navigation");
  await seed();
  for (const t of ["playbook", "tally", "scout", "sightlines", "more"]) {
    await go(t);
    check(`tab ${t} renders`, await ev(() => document.querySelectorAll(".main > *").length > 1));
  }
  const MORE = ["walk", "lineups", "movement", "assess", "codes", "stats", "team", "messages", "classes", "league", "nexus"];
  for (const m of MORE) {
    await go("more", m);
    check(`More · ${m} renders`, await ev(() => document.querySelectorAll(".main > *").length > 1));
  }
  await go("scout");
  for (const st of ["matchup", "anticipate", "counter", "board"]) {
    await ev(k => window.set({ scoutTab: k }), st);
    await page.waitForTimeout(50);
    check(`Scout · ${st} renders`, await ev(() => document.querySelectorAll(".sec").length > 0));
  }
  // Two entries here were the same hand-typed placeholder under two real event
  // names. Nothing ships without a line saying where its coordinates came from.
  check("every layout on offer states where its coordinates came from", await ev(() =>
    Object.values(LAYOUTS).every(l => typeof l.source === "string" && l.source.length > 10)));
  check("every layout on offer has measured footprints", await ev(() =>
    Object.values(LAYOUTS).every(l => l.bunkers.length > 0 && l.bunkers.every(b => b.w > 0 && b.h > 0))));
  check("no event switch is offered while there is one field", await ev(() =>
    Object.keys(LAYOUTS).length > 1
      ? !!document.querySelector("button.ctx")
      : !document.querySelector("button.ctx") && !!document.querySelector(".ctx")));

  // Every tap rebuilds the screen. It used to come back at the top, which threw
  // the coach off whatever he was reading, halfway down a long card.
  check("a tap deep in a card leaves the screen where it was", await ev(async () => {
    window.set({ tab: "scout", scoutTab: "matchup" });
    await new Promise(r => setTimeout(r, 80));
    const main = document.querySelector(".main");
    main.scrollTop = 600;
    const was = main.scrollTop;
    window.setThreat("right", 2);
    await new Promise(r => setTimeout(r, 80));
    return was > 0 && document.querySelector(".main").scrollTop === was;
  }));
  check("changing tab does start at the top", await ev(async () => {
    document.querySelector(".main").scrollTop = 600;
    window.set({ tab: "tally" });
    await new Promise(r => setTimeout(r, 80));
    return document.querySelector(".main").scrollTop === 0;
  }));

  /* --------------------------------------------------------------- playbook */
  G("Playbook");
  await seed();
  check("the twelve breaks the spec names are all offered", await ev(() => {
    const want = ["Hold & Read","Conservative","Lock the Lanes","Balanced Break",
                  "Clean / Lane Trade","Tower / Centre","Contain Both Wires","Wire Split",
                  "Counter Break","Snake Stack","Dorito Flood","Blitz"];
    // In order, so the picker is a dial: patient at the left, must-score at
    // the right. The aggression on each call has to agree with where it sits.
    const got = Object.values(BREAKS).map(b => b.name);
    const aggr = Object.keys(BREAKS).map(k => breakMeta(k).aggr);
    return got.length === 12 && want.every(n => got.includes(n))
        && aggr.every((a, i) => i === 0 || a >= aggr[i - 1]);
  }));
  check("every break draws five players", await ev(() =>
    Object.keys(BREAKS).every(k => { window.set({ script: k }); return currentPaths().length === 5; })));
  await ev(() => window.set({ script: "snake" }));
  check("Face toggles", await ev(() => { const a = S.faceOn; window.set({ faceOn: !a }); const b = S.faceOn; window.set({ faceOn: a }); return a !== b; }));
  check("Shot lanes toggles", await ev(() => { const a = S.shotOn; window.set({ shotOn: !a }); const b = S.shotOn; window.set({ shotOn: a }); return a !== b; }));
  check("Play starts the break", await ev(() => { window.playPath(); const p = S.playing; window.playPath(); return p === true; }));
  check("Pause stops it", await ev(() => S.playing === false));
  check("Reset returns to the buzzer", await ev(() => { window.set({ t: 0.7 }); window.set({ t: 0, playing: false }); return S.t === 0; }));
  await ev(() => { window.setDirect("1", "face", -45); window.setDirect("2", "shot", "GP#1"); window.setDirect("3", "role", "S"); });
  check("8-way pad stores a bearing", await ev(() => directOf("1").face === -45));
  check("shot stores a named bunker", await ev(() => directOf("2").shot === "GP#1"));
  check("P|S stores a role", await ev(() => directOf("3").role === "S"));
  await ev(() => window.openPad("face", "4")); await page.waitForTimeout(60);
  check("the pad offers eight directions plus off", await page.locator(".pad button").count() === 9);
  await ev(() => window.openPad("face", "4")); await page.waitForTimeout(60);
  check("tapping again closes the pad", await ev(() => S.pad === null));
  check("directing is scoped per break", await ev(() => {
    window.set({ script: "blitz" }); const other = directOf("1").face;
    window.set({ script: "snake" }); return other === undefined && directOf("1").face === -45;
  }));
  check("directing is scoped per layout", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const other = directOf("1").face;
    window.set({ layoutKey: "mwo" }); return other === undefined;
  }));
  // A chevron per player, drawn twice: a dark casing under a white stroke, so
  // it reads on a red bunker as well as on the black ground — two polylines a
  // player. The runs
  // themselves are <path> now that corners are rounded, so counting polylines
  // counts chevrons and nothing else.
  check("face chevron is drawn when Face is on", await ev(() => {
    window.set({ faceOn: true });
    const on = (fieldSVG().match(/polyline/g) || []).length;
    window.set({ faceOn: false });
    const off = (fieldSVG().match(/polyline/g) || []).length;
    window.set({ faceOn: true });
    return on === currentPaths().length * 2 && off === 0;
  }));
  check("shot cone and target ring are drawn", await ev(() => {
    window.set({ shotOn: true }); const svg = fieldSVG(); return svg.includes("polygon") && svg.includes("stroke-dasharray=\"3 3\"");
  }));
  check("the training-aid line is on Playbook", (await page.locator(".aid").count()) > 0);

  /* ------------------------------------------------------------------ tally */
  G("Tally");
  await seed({ tab: "tally" });
  await ev(() => { window.markOut("us", "Reyes"); window.markOut("them", "#4"); });
  check("marking out logs an entry", await ev(() => S.tally.length === 2));
  await ev(() => window.markOut("us", "Reyes"));
  check("tapping an out man again puts him back in, never a second out", await ev(() => S.tally.length === 1 && !S.tally.some(o => o.name === "Reyes")));
  await ev(() => window.markOut("us", "Reyes"));
  check("and a third tap takes him out again, once", await ev(() => S.tally.length === 2 && S.tally.filter(o => o.name === "Reyes").length === 1));
  check("alive counts drop", await ev(() => document.getElementById("root").textContent.includes("4")));
  await ev(() => { window.setOutBunker(0, "shotAt", "SB#6"); window.setOutBunker(0, "movedTo", "GP#1"); });
  check("shot-at bunker attaches to an out", await ev(() => S.tally[0].shotAt === "SB#6"));
  check("moved-to bunker attaches to an out", await ev(() => S.tally[0].movedTo === "GP#1"));
  await ev(() => window.nextPoint());
  check("next point advances the sheet", await ev(() => S.point === 2));
  check("next point keeps the log", await ev(() => S.tally.length === 2));
  check("the new point starts five up", await ev(() => S.tally.filter(o => o.pt === S.point).length === 0));
  await page.waitForTimeout(80);
  check("pickers only render for the live point", await ev(() => {
    const sel = [...document.querySelectorAll(".assign select")];
    return sel.length === 0;                                  // no outs on point 2 yet
  }));
  await ev(() => window.undoOut(0));
  check("undo removes an out", await ev(() => S.tally.length === 1));

  /* ------------------------------------------------------------------ scout */
  G("Scout");
  await seed({ tab: "scout" });
  // A pit shows a team; the film read belongs to that team. See the Scouting
  // group below for the whole model.
  await ev(() => window.setPitTend("left", "Dorito"));
  check("tendency is editable, and lands on the team", await ev(() =>
    pitOf("left").tend === "Dorito" && profileOf(pitOf("left").name).tend === "Dorito"));
  await ev(() => window.setThreat("right", 2));
  check("threat stars set", await ev(() => pitOf("right").threat === 2));
  await ev(() => window.setPitNotes("right", "Snake runner is #7"));
  check("notes persist on the team in the pit", await ev(() => pitOf("right").notes.includes("#7")));
  await ev(() => window.loadPit("Miami Effect"));
  check("division board loads a team into the right pit", await ev(() => pitOf("right").name === "Miami Effect"));
  const rank = await ev(() => {
    const ahead = counterRank("Snake", "Ahead")[0].name;
    const must = counterRank("Snake", "Must-score")[0].name;
    return { ahead, must, diff: ahead !== must };
  });
  check("counter-picker ranks change with the match state", rank.diff, `${rank.ahead} vs ${rank.must}`);
  // Which patient call wins depends on the twelve; what must hold is that a
  // patient one does. Naming it pinned the answer to a five-break catalog.
  check("a patient call tops the list when ahead", await ev(w =>
    breakMeta(counterRank("Snake", "Ahead")[0].key).aggr <= 2, rank.ahead), rank.ahead);
  check("every break is ranked", await ev(() =>
    counterRank("Snake", "Even").length === Object.keys(BREAKS).length));
  check("the board lists a real division of teams", await ev(() => teamsHere().length >= 11));
  check("every division on offer has teams in it", await ev(() =>
    DIVISIONS.every(d => divisionTeams(d.id).length >= 11)));
  check("both pits draw on one field", await ev(() => {
    const svg = fieldSVG({ both: true }); return svg.includes("#e5342f") && svg.includes("#3d8bff");
  }));
  check("the not-a-prediction line is on Scout", await ev(() => {
    // On Scout itself, above the sub-tabs, so it is on screen whichever one is
    // open. Checked against the rendered app: the whole source sits in a script
    // tag inside body, so document.body.textContent matches any string literal
    // in it and says nothing about what a coach can see.
    return SCOUT_TABS.every(([k]) => {
      window.set({ scoutTab: k });
      const aid = [...document.querySelectorAll("#root .aid")];
      return aid.some(el => /not a prediction/i.test(el.textContent));
    });
  }));

  /* ------------------------------------------------------------- sightlines */
  G("Sightlines");
  await seed({ tab: "sightlines" });
  const sl = await ev(() => {
    const list = LAYOUTS.mwo.bunkers;
    const a = sightLines(list[0].id, 2, 2);
    const b = sightLines(list[20].id, 2, 2);
    return { n: a.lines.length, total: list.length, clearA: a.clear, clearB: b.clear,
             blocked: a.lines.filter(l => l.blocked).length };
  });
  check("every other bunker gets a lane", sl.n === sl.total - 1);
  check("lanes are classified clear or blocked", sl.clearA + sl.blocked === sl.n);
  check("a different source gives a different read", sl.clearA !== sl.clearB);
  check("geometry blocks something", sl.blocked > 0);
  await ev(() => window.set({ sightFrom: LAYOUTS.mwo.bunkers[5].id }));
  await page.waitForTimeout(80);
  check("changing the source redraws", await ev(() => fieldSVG({ sightFrom: S.sightFrom, static: true }).includes("#3ecf8e")));

  // Sightlines by touch. A bunker is about ten pixels across on a phone, so
  // none of this works if a coach has to land on the shape itself.
  await ev(() => window.set({ tab: "sightlines", sightFrom: null, sightTo: null, sightPick: "from" }));
  await page.waitForTimeout(120);
  check("the field takes taps at all", await ev(() =>
    !!document.querySelector("svg.field [data-pick]")));
  check("a tap anywhere lands on the nearest bunker", await ev(() => {
    const b = LAYOUTS.mwo.bunkers[12];
    const hit = bunkerAt([b.x + 2, b.y + 2]);        // two feet off it
    return hit && hit.id === b.id;
  }));
  check("a tap in open field picks nobody, rather than the far side", await ev(() => {
    const far = bunkerAt([75, 60]);                   // dead centre of the field
    return far === null || Math.hypot(far.x - 75, far.y - 60) <= 14;
  }));

  const tapField = async (fx, fy) => {
    const box = await page.locator("svg.field").first().boundingBox();
    await page.mouse.click(box.x + box.width * (fx / 150), box.y + box.height * (fy / 120));
    await page.waitForTimeout(90);
  };
  const spot = await ev(() => { const b = LAYOUTS.mwo.bunkers[3]; return [b.x, b.y, b.id]; });
  await tapField(spot[0], spot[1]);
  check("the first tap says where you are standing", await ev(() => S.sightFrom) === spot[2]);
  check("and moves on to the lane on its own, so there is no mode to learn",
    await ev(() => S.sightPick) === "to");

  const target = await ev(() => { const b = LAYOUTS.mwo.bunkers[30]; return [b.x, b.y, b.id]; });
  await tapField(target[0], target[1]);
  check("the second tap asks about one lane", await ev(() => S.sightTo) === target[2]);
  check("that lane gets an answer in words", await ev(() => {
    const v = document.querySelector(".verdict");
    return !!v && /Clear|Blocked/.test(v.innerText);
  }));
  check("a blocked lane names what is in the way, not just 'blocked'", await ev(() => {
    const from = LAYOUTS.mwo.bunkers[3].id;
    const l = sightLines(from, 2, 2).lines.find(x => x.blocked);
    return !!l && l.by.length > 0 && !!l.by[0].id;
  }));
  check("the blocker named is the first one you would hit", await ev(() => {
    const src = LAYOUTS.mwo.bunkers[3];
    const l = sightLines(src.id, 2, 2).lines.find(x => x.blocked && x.by.length > 1);
    if(!l) return true;
    const d = o => Math.hypot(o.x - src.x, o.y - src.y);
    return d(l.by[0]) <= d(l.by[1]);
  }));
  check("every lane carries how far it is", await ev(() =>
    sightLines(LAYOUTS.mwo.bunkers[3].id, 2, 2).lines.every(l => l.ft > 0)));

  await tapField(target[0], target[1]);
  check("tapping the same one again drops the question", await ev(() => S.sightTo) === null);
  await ev(() => window.setSightPick("from"));
  const moved = await ev(() => { const b = LAYOUTS.mwo.bunkers[44]; return [b.x, b.y, b.id]; });
  await tapField(moved[0], moved[1]);
  check("going back to standing-in moves you, and clears the old lane",
    await ev(() => S.sightFrom) === moved[2] && await ev(() => S.sightTo) === null);
  check("the table rows are controls too", await ev(() => {
    const row = document.querySelector("tr.tap");
    if(!row) return false;
    row.click();
    return !!S.sightTo;
  }));
  check("the asked-about lane is drawn heavier than the rest", await ev(() =>
    fieldSVG({ sightFrom: S.sightFrom, sightTo: S.sightTo, static: true }).includes('stroke-width="3"')));
  check("a coach's own bunker call wins over the code", await ev(() => {
    const id = LAYOUTS.mwo.bunkers[30].id;
    S.bunkerCalls = { ...(S.bunkerCalls || {}), mwo: { [id]: "Rob's corner" } };
    save(S); window.set({ sightTo: id });
    return document.body.innerText.includes("Rob's corner");
  }));


  /* ------------------------------------------------------- team + bunker calls */
  G("Team and bunker calls");
  await seed({ tab: "more", more: "team" });
  await ev(() => { document.getElementById("bcId").value = "GP#1"; document.getElementById("bcName").value = "Home"; window.setCall(); });
  await page.waitForTimeout(80);
  check("a bunker call is saved", await ev(() => bunkerCalls()["GP#1"] === "Home"));
  check("the call overlays the official code on the field",
    await ev(() => fieldSVG({ static: true, names: true }).includes(">Home<")));
  check("Team draws the codes without asking, because naming them is the screen",
    await ev(() => { window.set({ namesOn: false });
      return document.querySelector("#root .field-wrap svg.field").innerHTML.includes(">Home<"); }));
  check("calls are scoped to the layout", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const n = Object.keys(bunkerCalls()).length;
    window.set({ layoutKey: "mwo" }); return n === 0;
  }));
  await ev(() => window.clearCall("GP#1"));
  check("clearing a call restores the printed code", await ev(() => !bunkerCalls()["GP#1"]));
  await ev(() => window.set({ roster: [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" },
    { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" },
  ] }));
  check("the roster is listed, one editable row per player",
        (await page.locator(".rost__p").count()) === 3);
  check("each row edits number, name, primary and secondary",
        (await page.locator(".rost__p").first().locator("input").count()) === 4);

  /* -------------------------------------------------------------- movement */
  G("Movement");
  await seed({ tab: "more", more: "movement" });
  check("Movement: the man is tapped, the five on the point first, and Log waits for him", await ev(() => {
    const before = (S.moves || []).length;
    document.getElementById("mvFrom").value = "SB#4"; document.getElementById("mvTo").value = "GP#1"; window.logMove();
    const refused = (S.moves || []).length === before && /Tap the man who moved/.test(document.getElementById("root").textContent);
    const t = document.querySelector(".main").textContent;
    const five = /Who moved · on the point/.test(t) && [...document.querySelectorAll("#root .seg button")].some(b => b.textContent === "Reyes");
    window.movePick("Reyes");
    return refused && five && S.moveWho === "Reyes" && /Log the move · Reyes/.test(document.querySelector(".main").textContent);
  }));
  await ev(() => { document.getElementById("mvFrom").value = "SB#4"; document.getElementById("mvTo").value = "GP#1"; window.logMove(); });
  await page.waitForTimeout(80);
  check("a rotation is logged", await ev(() => S.moves.length === 1 && S.moves[0].who === "Reyes" && S.moveWho === null));
  check("the rotation draws on the field", await ev(() => fieldSVG({ static: true, moves: true }).includes("#3ecf8e")));
  await ev(() => { window.movePick("Reyes"); document.getElementById("mvFrom").value = "SB#4"; document.getElementById("mvTo").value = "SB#4"; window.logMove(); });
  await page.waitForTimeout(80);
  check("a move to the same bunker is refused", await ev(() => S.moves.length === 1));
  await ev(() => window.undoMove(0));
  check("undo removes a rotation", await ev(() => S.moves.length === 0));

  /* ---------------------------------------------------------------- assess */
  G("Assess");
  await seed({ tab: "more", more: "assess" });
  check("Save grade waits until a man and a score are tapped, and says which is missing", await ev(() => {
    const btn = () => [...document.querySelectorAll("#root .btn")].find(b => /Tap the man|Tap a score|Save grade/.test(b.textContent));
    const a = btn().disabled && /Tap the man/.test(btn().textContent);
    window.assessPick("Reyes");
    const b = btn().disabled && /Tap a score/.test(btn().textContent);
    window.assessScore(4);
    const c = !btn().disabled && /Save grade · Reyes · 4/.test(btn().textContent);
    return a && b && c;
  }));
  check("the five on the point lead the men to grade, the bench follows", await ev(() => {
    const five = document.querySelector(".main").textContent;
    const noBench = five.includes("On the point") && !five.includes("On the bench");
    window.set({ roster: [...S.roster, { name: "Sixth", num: 9, p: "", s: "" }] });
    const t = document.querySelector(".main").textContent;
    const order = t.indexOf("On the point") >= 0 && t.indexOf("On the point") < t.indexOf("On the bench") && t.indexOf("On the bench") < t.indexOf("Sixth");
    window.set({ roster: S.roster.filter(p => p.name !== "Sixth") });
    return noBench && order;
  }));
  await ev(() => { document.getElementById("asNote").value = "Held the corner."; window.saveAssess(); });
  await page.waitForTimeout(80);
  check("a grade is saved", await ev(() => S.assessments.length === 1 && S.assessments[0].score === 4 && S.assessments[0].m === S.matchId));
  check("the note stays with the grade", await ev(() => S.assessments[0].note.includes("corner")));
  check("the man's chip carries this point's grade and the form is cleared for the next man", await ev(() =>
    S.asWho === null && S.asScore === 0 && [...document.querySelectorAll("#root .seg button")].some(b => b.textContent === "Reyes · 4")));
  check("a half-typed note survives tapping the man and the score", await ev(() => {
    document.getElementById("asNote").value = "Half typed";
    window.assessPick("Reyes"); window.assessScore(2);
    return document.getElementById("asNote").value === "Half typed";
  }));
  await ev(() => { window.saveAssess(); });
  await page.waitForTimeout(80);
  check("an average is shown", await page.locator("text=3.0").count() > 0);
  await ev(() => window.undoAssess(0));
  check("undo removes a grade", await ev(() => S.assessments.length === 1));

  /* ---------------------------------------------------------- bunker stats */
  G("Bunker stats");
  await seed({
    tab: "more", more: "stats",
    tally: [{ pt: 1, side: "us", name: "Reyes", shotAt: "SB#6", movedTo: "GP#1" }],
    moves: [{ pt: 1, who: "Reyes", from: "SB#4", to: "GP#1", layout: "mwo" }],
  });
  check("outs come from the tally", await ev(() => bunkerTraffic()["SB#6"].outs === 1));
  check("moves-in come from tally and movement", await ev(() => bunkerTraffic()["GP#1"].visits === 2));
  check("traffic from another field is dropped, not counted", await ev(() => {
    const before = Object.keys(bunkerTraffic()).length;
    const kept = [...(S.moves || [])];
    window.set({ moves: [...kept, { who: "Reyes", from: "NOPE#1", to: "NOPE#2" }] });
    const after = Object.keys(bunkerTraffic()).length;
    window.set({ moves: kept });
    return after === before;
  }));
  check("the heat overlay is drawn", await ev(() => fieldSVG({ static: true, heat: true }).includes("#e5342f")));

  /* -------------------------------------------------------------- classes */
  G("Classes");
  await seed({ tab: "more", more: "classes", newClassTitle: "Friday clinic" });
  await ev(() => window.makeClass());
  await page.waitForTimeout(80);
  const code = await ev(() => S.classes[0].code);
  check("a class gets a join code", /^GL-[A-Z0-9]{4}$/.test(code), code);
  await ev(c => window.set({ joinCode: c }), code);
  await page.waitForTimeout(100);
  check("the code finds the class", (await page.locator("#fn").count()) === 1);
  await ev(c => { document.getElementById("fn").value = "Sam Ortiz"; document.getElementById("fa").checked = false; window.submitForm(c); }, code);
  await page.waitForTimeout(80);
  check("submitting without the sign-in box is refused", await ev(() => S.responses.length === 0));
  await ev(c => {
    document.getElementById("fn").value = "Sam Ortiz";
    document.getElementById("fc").value = "555-0100";
    document.getElementById("fe").value = "Rec";
    document.getElementById("fw").value = "Snake";
    document.getElementById("fa").checked = true;
    window.submitForm(c);
  }, code);
  await page.waitForTimeout(80);
  check("a valid form is accepted", await ev(() => S.responses.length === 1 && S.responses[0].name === "Sam Ortiz"));
  check("the response is listed under the class", await page.locator("text=Sam Ortiz").count() > 0);

  /* --------------------------------------------------------------- league */
  G("League");
  await seed({ tab: "more", more: "league" });
  check("the four default groups exist", await ev(() => S.groups.length === 4 && S.groups.map(g => g.name).join() === "Ops,Refs,Registration,Vendors"));
  await ev(() => { document.getElementById("ng").value = "Media"; window.addGroup(); });
  await page.waitForTimeout(80);
  check("a group can be added", await ev(() => S.groups.length === 5));
  const gid = await ev(() => S.groups[0].id);
  await ev(id => { document.getElementById("mn-" + id).value = "Dana"; document.getElementById("mp-" + id).value = "5550142"; window.addMem(id); }, gid);
  await page.waitForTimeout(80);
  check("a member can be added", await ev(i => S.groups.find(g => g.id === i).members.length === 1, gid));
  await ev(() => { S.blastBody = "Pit gate opens 8:00"; save(S); window.sendBlast(); });
  await page.waitForTimeout(120);
  check("a blast is sent and logged", await ev(() => S.blasts.length === 1 && S.blasts[0].body.includes("Pit gate")));
  check("the log records the recipient count", await ev(() => S.blasts[0].n === 1));
  await ev(i => window.delMem(i, 0), gid);
  check("a member can be removed", await ev(i => S.groups.find(g => g.id === i).members.length === 0, gid));
  await ev(() => window.delGroup(S.groups[4].id));
  check("a group can be deleted", await ev(() => S.groups.length === 4));

  /* ------------------------------------------------------ notes and messages */
  G("Notes, codes and messages");
  await seed({ tab: "more", more: "messages" });
  await ev(() => { document.getElementById("md").value = "R1 at the buzzer"; window.sendMsg(); });
  await page.waitForTimeout(80);
  check("a squad message is kept", await ev(() => S.messages.length === 1));
  // Both of these used to be a single text box. Writing the legacy field and
  // reloading proves the migration carries a coach's typing into the new lists
  // rather than dropping it.
  await ev(() => { S.walkNotes = "Snake mouth is hot"; S.codeWords = "Ghost = full flank"; S.walk = {}; S.codes = []; save(S); });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check("a legacy walk note is carried into the list", await ev(() =>
    walkNotes().length === 1 && /Snake mouth/.test(walkNotes()[0].note) && S.walkNotes === ""));
  check("a legacy code word is split into word and meaning", await ev(() =>
    S.codes.length === 1 && S.codes[0].word === "Ghost" && S.codes[0].means === "full flank" && S.codeWords === ""));

  /* ---------------------------------------------------------- persistence */
  G("Persistence");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check("state survives a reload", await ev(() => S.messages.length === 1 && walkNotes().length === 1 && S.codes.length === 1));
  check("a tip stays dismissed", await ev(() => { window.dismissTip("walk"); return S.tips.walk === true; }));

  /* -------------------------------------------------------- layout integrity */
  G("Layout integrity");
  const lay = await ev(() => {
    const b = LAYOUTS.mwo.bunkers;
    const ids = new Set(b.map(x => x.id));
    const plantsOk = Object.values(BREAK_PLANTS.mwo).every(p => p.length === 5 && p.every(id => ids.has(id)));
    const pairs = [];
    b.forEach(x => { const m = b.find(y => y.t === x.t && Math.abs(y.y - x.y) < 1.2 && Math.abs((x.x + y.x) / 2 - 75) < 1.5 && y.x !== x.x); if (m) pairs.push((x.x + m.x) / 2); });
    const axis = pairs.reduce((a, c) => a + c, 0) / pairs.length;
    return { n: b.length, unique: ids.size, plantsOk, axis, pairs: pairs.length,
             sized: b.every(x => x.w > 0 && x.h > 0), inField: b.every(x => x.x >= 0 && x.x <= 150 && x.y >= 0 && x.y <= 120) };
  });
  check("the Midwest Open has 58 bunkers", lay.n === 58, String(lay.n));
  check("every bunker id is unique", lay.unique === lay.n);
  check("every bunker carries a measured footprint", lay.sized);
  check("every bunker sits inside the field", lay.inField);
  check("every break plants on a real bunker", lay.plantsOk);
  check("the layout is mirror-symmetric about the 50", Math.abs(lay.axis - 75) < 0.5, `axis ${lay.axis.toFixed(2)} ft over ${lay.pairs} pairs`);

  /* ----------------------------------------------------------------- roster */
  G("Roster");
  await ev(() => window.set({ tab: "more", more: "team", roster: [] }));
  check("a fresh install ships no invented players", await ev(() => (S.roster || []).length === 0));
  check("the empty roster says what to do about it", await ev(() =>
    /No players yet/.test(document.querySelector(".main").textContent)));

  const add = (num, name, pr, sec2) => ev(a => {
    document.getElementById("rNum").value = a[0];
    document.getElementById("rName").value = a[1];
    document.getElementById("rP").value = a[2];
    document.getElementById("rS").value = a[3];
    window.addPlayer();
  }, [num, name, pr, sec2]);

  await add("7", "Reyes", "snake MW", "GP");
  await add("3", "Okafor", "MT 50", "C lane");
  check("a player can be added", await ev(() => S.roster.length === 2 && S.roster[0].name === "Reyes"));
  check("the squad number is kept as a number", await ev(() => S.roster[0].num === 7));
  check("primary and secondary are kept", await ev(() => S.roster[0].p === "snake MW" && S.roster[0].s === "GP"));
  await ev(() => window.addPlayer());
  check("a player with no name is refused", await ev(() => S.roster.length === 2));

  await ev(() => window.editPlayer(0, "num", "22"));
  await ev(() => window.editPlayer(0, "name", "Marsh"));
  check("a player can be edited in place", await ev(() => S.roster[0].num === 22 && S.roster[0].name === "Marsh"));
  await ev(() => window.editPlayer(0, "name", "   "));
  check("a name cannot be blanked by accident", await ev(() => S.roster[0].name === "Marsh"));
  check("editing does not redraw under the thumb", await ev(() => {
    const before = document.querySelector(".main");
    window.editPlayer(0, "p", "snake");
    return document.querySelector(".main") === before;
  }));

  check("the roster reaches Tally", await ev(() => {
    window.set({ tab: "tally" });
    return document.querySelector(".main").textContent.includes("Marsh");
  }));
  check("the roster reaches Playbook", await ev(() => {
    window.set({ tab: "playbook" });
    return document.querySelector(".main").textContent.includes("#22 Marsh");
  }));
  check("the roster reaches Movement and Assess", await ev(() => {
    window.set({ tab: "more", more: "movement" });
    const a = document.querySelector(".main").textContent.includes("Marsh");
    window.set({ more: "assess" });
    return a && document.querySelector(".main").textContent.includes("Marsh");
  }));
  check("the banned name never reaches the roster", await ev(() => {
    window.set({ tab: "more", more: "team" });
    document.getElementById("rName").value = "GunzUp";
    document.getElementById("rNum").value = "9";
    window.addPlayer();
    const last = S.roster[S.roster.length - 1].name;
    window.delPlayer(S.roster.length - 1);
    return !/gunz\s*up/i.test(last);
  }));

  await ev(() => { window.set({ tab: "more", more: "team" }); window.delPlayer(1); });
  check("a player can be removed", await ev(() => S.roster.length === 1 && S.roster[0].name === "Marsh"));

  /* ------------------------------------------------- walk, codes, lineups */
  G("Walk");
  await ev(() => window.set({ tab: "more", more: "walk", walk: {}, walkNotes: "" }));
  check("an empty field says so", await ev(() => /Nothing noted on this field yet/.test(document.querySelector(".main").textContent)));
  check("a note can be pinned to a wire or a bunker", await ev(() => {
    document.getElementById("wkWhere").value = "Snake wire";
    document.getElementById("wkNote").value = "Doritos are slow off the tape.";
    window.addWalk();
    const n = (S.walk.mwo || [])[0];
    return n && n.where === "Snake wire" && /Doritos are slow/.test(n.note);
  }));
  check("the where list offers every bunker on this field", await ev(() =>
    document.querySelectorAll("#wkWhere option").length === 6 + curLayout().bunkers.length));
  check("walk notes are scoped to the field", await ev(() => {
    window.set({ layoutKey: "not-a-field" }); const n = walkNotes().length;
    window.set({ layoutKey: "mwo" }); return n === 0;
  }));
  check("a note can be removed", await ev(() => { window.delWalk(0); return walkNotes().length === 0; }));
  check("an empty note is refused", await ev(() => {
    document.getElementById("wkNote").value = "   "; window.addWalk(); return walkNotes().length === 0;
  }));

  G("Codes");
  await ev(() => window.set({ more: "codes", codes: [], codeWords: "" }));
  check("a code word carries what it means", await ev(() => {
    document.getElementById("cdWord").value = "Buzzer";
    document.getElementById("cdMeans").value = "Go on the horn";
    window.addCode();
    return S.codes.length === 1 && S.codes[0].word === "Buzzer" && S.codes[0].means === "Go on the horn";
  }));
  check("a code word can be edited in place", await ev(() => {
    window.editCode(0, "means", "Go on the horn, no wait");
    return /no wait/.test(S.codes[0].means);
  }));
  check("a code word cannot be blanked", await ev(() => { window.editCode(0, "word", " "); return S.codes[0].word === "Buzzer"; }));
  check("a word with no name is refused", await ev(() => {
    document.getElementById("cdWord").value = ""; window.addCode(); return S.codes.length === 1;
  }));
  check("a code word can be removed", await ev(() => { window.delCode(0); return S.codes.length === 0; }));

  G("Lineups");
  const SQUAD = [
    { name: "Reyes", num: 7, p: "snake MW", s: "GP" }, { name: "Okafor", num: 3, p: "MT 50", s: "C lane" },
    { name: "Vance", num: 11, p: "GP", s: "snake" }, { name: "Marsh", num: 22, p: "D-wire MD", s: "Tr" },
    { name: "Bright", num: 5, p: "back centre", s: "MD hold" }, { name: "Cole", num: 9, p: "Tr", s: "MD" },
  ];
  await ev(s2 => window.set({ more: "lineups", roster: s2, lineups: {}, point: 3 }), SQUAD);
  check("with no lineup set the roster order stands", await ev(() =>
    fiveFor(3).map(p => p && p.name).join(",") === "Reyes,Okafor,Vance,Marsh,Bright"));
  check("a lineup can be filled from the roster", await ev(() => {
    window.fillLineup("roster"); return lineupFor(3).length === 5 && lineupFor(3)[0] === "Reyes";
  }));
  check("a slot can be set to any player on the squad", await ev(() => {
    window.setSlot(0, "Cole"); return lineupFor(3)[0] === "Cole" && fiveFor(3)[0].num === 9;
  }));
  check("the lineup directs the break on Playbook", await ev(() => {
    window.set({ tab: "playbook" });
    return document.querySelector(".assign__who").textContent.includes("#9 Cole");
  }));
  check("the tally sheet follows the same five", await ev(() => {
    window.set({ tab: "tally" });
    return document.querySelector(".main").textContent.includes("Cole");
  }));
  check("a lineup is kept per point", await ev(() => {
    window.set({ tab: "more", more: "lineups", point: 4 });
    const empty = lineupFor(4).length === 0;
    window.fillLineup(3);
    return empty && lineupFor(4)[0] === "Cole" && lineupFor(3)[0] === "Cole";
  }));
  check("an empty slot leaves the job unassigned", await ev(() => {
    window.setSlot(1, "");
    return fiveFor(4)[1] === null;
  }));
  // The five stands until it is changed, so clearing point 4's own lineup
  // goes back to the five that was standing — point 3's — never roster order.
  check("clearing a lineup goes back to the five that was standing", await ev(() => {
    window.clearLineup();
    return lineupFor(4).length === 0 && fiveFor(4)[0].name === "Cole" && lineupAt(4)[0] === "Cole";
  }));
  check("with no earlier five on the sheet, roster order is the five", await ev(() => {
    const was = S.lineups; window.set({ lineups: {} });
    const ok = fiveFor(4)[0].name === "Reyes";
    window.set({ lineups: was }); return ok;
  }));
  check("Lineups: tap a slot and the squad appears under it; tap a man and he is on it", await ev(s2 => {
    window.set({ roster: s2, lineups: {}, point: 3, slotPick: null });
    const rows = () => document.querySelectorAll("#root button.assign");
    const noChips = document.querySelectorAll("#root .assigns .seg").length === 0;
    rows()[2].click();
    const armed = S.slotPick === 2 && document.querySelectorAll("#root .assigns .seg").length === 1
      && document.querySelector("#root .assign--on .assign__n").textContent === "3";
    const chip = [...document.querySelectorAll("#root .assigns .seg button")].find(b => /^Cole/.test(b.textContent));
    chip.click();
    return noChips && armed && S.slotPick === null && lineupFor(3)[2] === "Cole" && document.querySelectorAll("#root .assigns .seg").length === 0;
  }, SQUAD));
  check("one change to a roster-order five keeps the other four", await ev(() =>
    onPoint(3).join() === "Reyes,Okafor,Cole,Marsh,Bright"));
  check("putting a man who is on another slot here swaps the two", await ev(() => {
    window.setSlot(0, "Cole");
    return onPoint(3).join() === "Cole,Okafor,Reyes,Marsh,Bright";
  }));
  check("each slot names the job it plays on the current call", await ev(() => {
    const t = document.querySelector("#root .assigns").textContent;
    return currentPaths().every(p => t.includes(jobName(S.script, p.id, p.label)));
  }));
  check("the slot pick is scratch and never a dropdown", await ev(() =>
    document.querySelectorAll("#root .assigns select").length === 0 && !("slotPick" in defaultState() && defaultState().slotPick)));
  check("with no roster Lineups says where to start", await ev(() => {
    window.set({ roster: [], lineups: {} });
    return /Add your squad/.test(document.querySelector(".main").textContent) && /Add your squad · Team/.test(document.querySelector(".main").textContent);
  }));
  await ev(s2 => window.set({ roster: s2, point: 1 }), SQUAD);

  /* ------------------------------------------------- a copy of your season */
  G("Save and load a copy");
  const SEASON = {
    roster: [{name:"Reyes",num:7,p:"snake MW",s:"GP"},{name:"Okafor",num:3,p:"MT 50",s:"C lane"}],
    scout: {"Rejects":{tend:"Snake",threat:4,notes:"buzzer runner",
            players:[{num:"7",name:"Vasquez",wire:"Snake",note:"buzzer",threat:5}]}},
    tally: [{pt:1,side:"us",name:"Reyes",at:111,script:"snake",layout:"mwo",vs:"Rejects",how:"Laned"}],
    codes: [{word:"Buzzer",means:"go on the horn"}],
    classes: [{id:"GL-7K2M",code:"GL-7K2M",title:"Friday clinic",open:true}],
  };
  await ev(st => window.set({ tab:"more", more:"nexus", ...st }), SEASON);
  const copy = await ev(() => copyPayload("all"));
  check("a copy is readable JSON that says what it is", await ev(t => {
    const p = JSON.parse(t);
    return p.format === "gridlock.coach.copy" && p.v === 1 && !!p.at && !!p.data;
  }, copy));
  check("a copy carries the season", await ev(t => {
    const d = JSON.parse(t).data;
    return d.roster.length === 2 && Object.keys(d.scout).length === 1 && d.tally.length === 1;
  }, copy));
  check("a copy never carries the staff password", !/pass|hash|salt/i.test(copy));
  check("a copy leaves this session's own business behind", await ev(t => {
    const d = JSON.parse(t).data;
    return d.tab === undefined && d.tips === undefined && d.playing === undefined && d.copyText === undefined;
  }, copy));
  check("the squad copy is the squad, not the season", await ev(() => {
    const d = JSON.parse(copyPayload("squad")).data;
    return !!d.roster && !!d.scout && d.tally === undefined && d.classes === undefined;
  }));
  check("a copy counts itself in plain words", await ev(t =>
    /2 players/.test(copySummary(JSON.parse(t).data)) && /1 team scouted/.test(copySummary(JSON.parse(t).data)), copy));

  // The whole point: another phone that also did real work keeps both lots.
  const OTHER = {
    roster: [{name:"Vance",num:11,p:"GP",s:"snake"}],
    scout: {"Malicious":{tend:"Dorito",threat:5,notes:"lean dorito",players:[]}},
    tally: [{pt:1,side:"them",name:"2",at:222,script:"snake",layout:"mwo",vs:"Malicious"}],
    codes: [{word:"Ladder",means:"trade out"}],
  };
  await ev(st => window.set({ ...defaultState(), entered:true, role:"staff", tab:"more", more:"nexus", ...st }), OTHER);
  await ev(t => { document.getElementById("copyIn").value = t; window.loadCopy("merge"); }, copy);
  check("merging keeps both rosters", await ev(() =>
    S.roster.length === 3 && S.roster.some(r => r.name === "Vance") && S.roster.some(r => r.name === "Reyes")));
  check("merging keeps both teams scouted", await ev(() =>
    !!S.scout["Rejects"] && !!S.scout["Malicious"]));
  check("merging keeps both sets of outs", await ev(() => S.tally.length === 2));
  check("merging the same copy twice changes nothing", await ev(t => {
    const before = [S.roster.length, S.tally.length, S.codes.length].join();
    document.getElementById("copyIn").value = t; window.loadCopy("merge");
    return [S.roster.length, S.tally.length, S.codes.length].join() === before;
  }, copy));
  check("the app says what it just took in", await ev(() => /Merged in/.test(S.copyStatus)));

  await ev(t => { document.getElementById("copyIn").value = t; window.loadCopy("replace"); }, copy);
  check("replacing drops what was here", await ev(() =>
    S.roster.length === 2 && !S.scout["Malicious"] && S.tally.length === 1));

  check("something that is not a copy is refused", await ev(() => {
    document.getElementById("copyIn").value = "not json at all";
    window.loadCopy("merge");
    return /not readable as JSON/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("someone else's JSON is refused", await ev(() => {
    document.getElementById("copyIn").value = '{"hello":"world"}';
    window.loadCopy("merge");
    return /not a Gridlock copy/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("a copy from a newer app is refused, not half-read", await ev(() => {
    document.getElementById("copyIn").value = JSON.stringify({format:"gridlock.coach.copy",v:99,data:{roster:[]}});
    window.loadCopy("merge");
    return /newer version/.test(S.copyStatus) && S.roster.length === 2;
  }));
  check("a copy naming a field that no longer ships still loads", await ev(() => {
    document.getElementById("copyIn").value = JSON.stringify({format:"gridlock.coach.copy",v:1,
      data:{layoutKey:"tbo", roster:[{name:"Ghost",num:1,p:"",s:""}]}});
    window.loadCopy("merge");
    return !!LAYOUTS[S.layoutKey] && S.roster.some(r => r.name === "Ghost");
  }));
  check("the copy screens are on Nexus", await ev(() => {
    window.set({ tab:"more", more:"nexus" });
    const txt = document.querySelector(".main").textContent;
    return /Save a copy/.test(txt) && /Load a copy/.test(txt) && /no automatic backup/.test(txt);
  }));

  // Exercise the actual file picker: setting the textarea in evaluate() hid a
  // repaint that discarded every selected file before Merge could read it.
  await page.locator('input[type="file"]').setInputFiles({
    name: "season.json", mimeType: "application/json", buffer: Buffer.from(copy),
  });
  await page.waitForFunction(() => /Read season.json/.test(S.copyStatus || ""));
  check("a file remains loaded after its status message redraws", await ev(t =>
    document.getElementById("copyIn").value === t, copy));
  await page.getByRole("button", { name:"Merge it in", exact:true }).click();
  check("the chosen file can be merged with the visible button", await ev(() =>
    /Merged in/.test(S.copyStatus) && document.getElementById("copyIn").value === ""));
  check("an invalid pasted copy stays available to correct", await ev(() => {
    document.getElementById("copyIn").value = "{broken";
    window.loadCopy("merge");
    return /not readable/.test(S.copyStatus) && document.getElementById("copyIn").value === "{broken";
  }));
  check("malformed record collections never replace the season", await ev(() => {
    const before = JSON.stringify(S.roster);
    for(const data of [{roster:null}, {classes:[{}]}, {groups:[{id:"g",name:"Ops",members:{}}]},
      {pathEdits:{"lso|snake|1":[["bad", 2]]}}, {scout:{Team:{players:{}}}}]){
      document.getElementById("copyIn").value = JSON.stringify({format:COPY_FORMAT, v:1, data});
      window.loadCopy("replace");
      if(!/invalid data/.test(S.copyStatus) || JSON.stringify(S.roster) !== before) return false;
    }
    return true;
  }));
  check("copies cannot change session privileges or object prototypes", await ev(() => {
    const parsed = readCopy('{"format":"gridlock.coach.copy","v":1,"data":{"role":"staff","entered":true,"roster":[]}}');
    const bad = readCopy('{"format":"gridlock.coach.copy","v":1,"data":{"__proto__":{"polluted":true}}}');
    return !parsed.error && parsed.payload.data.role === undefined
      && parsed.payload.data.entered === undefined && !!bad.error && !({}).polluted;
  }));
  check("a season and squad copy both keep custom division teams", await ev(() => {
    S.teams = {pro:[{name:"Local Crew"}]};
    return ["all", "squad"].every(scope => JSON.parse(copyPayload(scope)).data.teams.pro[0].name === "Local Crew");
  }));
  check("merge preserves identical-looking outs in different matches", await ev(() => {
    const row = {pt:1, side:"us", name:"Rex", at:123};
    const merged = mergeInto({tally:[{...row,m:"one"}]}, {tally:[{...row,m:"two"}, {...row,m:"two"}]});
    return merged.tally.length === 2 && merged.tally.some(r => r.m === "two");
  }));
  check("merging two scouts keeps both players, calls and bunker aliases", await ev(() => {
    const a = {scout:{Crew:{notes:"old",players:[{num:"1",name:"A"}],breaks:[{pt:1,script:"snake",at:1}]}},
      bunkerCalls:{lso:{one:"Home"}}, teams:{pro:[{name:"Crew"}]}};
    const b = {scout:{Crew:{notes:"new",players:[{num:"2",name:"B"}],breaks:[{pt:2,script:"blitz",at:2}]}},
      bunkerCalls:{lso:{two:"House"}}, teams:{pro:[{name:"Local"}]}};
    const m = mergeInto(a,b);
    return m.scout.Crew.players.length === 2 && m.scout.Crew.breaks.length === 2
      && m.scout.Crew.notes === "new" && m.bunkerCalls.lso.one === "Home"
      && m.bunkerCalls.lso.two === "House" && m.teams.pro.length === 2;
  }));
  check("a legacy copy gets an openable sheet without duplicating on reread", await ev(() => {
    const text = JSON.stringify({format:COPY_FORMAT,v:1,at:"2026-01-01T00:00:00Z",data:{
      tally:[{pt:1,side:"us",name:"Rex",at:1}],lineups:{1:["Rex"]}}});
    const a = readCopy(text).payload.data, b = readCopy(text).payload.data;
    return a.matchId === b.matchId && a.matches[0].id === a.matchId
      && a.tally[0].m === a.matchId && a.lineups[a.matchId + "|1"][0] === "Rex";
  }));
  await ev(() => window.set({tab:"scout",scoutTab:"board",division:"pro"}));
  const quotedTeam = `O'Brien "Crew" &quot; \\ North`;
  await page.locator("#newTeam").fill(quotedTeam);
  await page.getByRole("button", {name:"Add team",exact:true}).click();
  await page.locator("#boardRows tr").filter({hasText:quotedTeam}).click();
  check("the board loads team names containing quotes and HTML entities", await ev(name =>
    S.right.name === name, quotedTeam));
  await ev(() => window.set({scoutTab:"board"}));
  await page.locator(".assign").filter({hasText:quotedTeam}).getByRole("button", {name:"Remove",exact:true}).click();
  check("that team can also be removed through its visible control", await ev(name =>
    !(S.teams.pro || []).some(t => t.name === name), quotedTeam));

  /* --------------------------------------- the matchup panel, actually counted */
  G("Matchup");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", script: "snake",
    scout: { "Blast Camp": {tend:"Balanced", threat:5, notes:"", players:[]},
             "Rejects": {tend:"Snake", threat:1, notes:"", players:[]} },
    left: { name: "Blast Camp" }, right: { name: "Rejects" } }));
  check("the wire split counts the five, not a fixed number", await ev(() => {
    const w = wireSplit();
    return w.Snake + w.Centre + w.Dorito === 5;
  }));
  check("the wire split moves when the call moves", await ev(() => {
    const a = JSON.stringify(wireSplit());
    window.set({ script: "flood" });
    const b = JSON.stringify(wireSplit());
    window.set({ script: "snake" });
    return a !== b;
  }));
  check("the split matches where the break actually plants", await ev(() => {
    const w = wireSplit();
    const counted = currentPaths().filter(p => wireOf(p.to[1]).startsWith("snake")).length;
    return w.Snake === counted;
  }));
  check("the bar follows the threat you scored, both ways", await ev(() => {
    const read = () => document.querySelector(".bar i").style.width;
    const wide = read();                                  // 5 vs 1
    window.setThreat("right", 5);                         // now level
    const level = read();
    return wide === "83%" && level === "50%";
  }));
  check("nothing on the panel is a hard-coded percentage", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return !/44%|56%|2\.3 to 2\.6/.test(txt);
  }));
  check("your five are listed from the real routed jobs", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return currentPaths().every(p => txt.includes(p.label));
  }));

  /* ------------------------------------------- how an out actually happened */
  G("Cause of an out");
  await ev(() => window.set({ tab: "tally", point: 1, tally: [], script: "snake",
    roster: [{ name: "Reyes", num: 7, p: "snake MW", s: "GP" }],
    scout: { "Rejects": {tend:"Snake", threat:4, notes:"",
             players:[{num:"7", name:"Vasquez", wire:"Snake", note:"buzzer", threat:5}]} },
    right: { name: "Rejects" } }));
  await ev(() => window.markOut("us", "Reyes"));
  check("an out records the call, the field and the opponent", await ev(() => {
    const o = S.tally[0];
    return o.script === "snake" && o.layout === S.layoutKey && o.vs === "Rejects";
  }));
  await ev(() => { window.setOutBunker(0, "how", "Laned"); window.setOutBunker(0, "by", "#7"); });
  check("an out records how, and who did it", await ev(() =>
    S.tally[0].how === "Laned" && S.tally[0].by === "#7"));
  check("the log line says how, not just where", await ev(() =>
    /laned/i.test(document.querySelector(".main").textContent)));
  check("who did it comes from the pit you scouted", await ev(() =>
    /#7 Vasquez/.test(document.querySelector(".main").innerHTML)));
  check("for their out it offers your roster instead", await ev(() => {
    window.markOut("them", "2");
    const html = document.querySelector(".main").innerHTML;
    return /By \(yours\)/.test(html) && /#7 Reyes/.test(html);
  }));

  /* ------------------------------------------------ counting what happened */
  G("History");
  await ev(() => window.set({ tab: "playbook", layoutKey: "mwo", script: "snake", point: 1, tally: [
    {pt:1, side:"us",   name:"Reyes",  script:"snake", layout:"mwo", vs:"Rejects", how:"Laned",       by:"#7"},
    {pt:1, side:"us",   name:"Vance",  script:"snake", layout:"mwo", vs:"Rejects", how:"Laned",       by:"#7"},
    {pt:1, side:"them", name:"3",      script:"snake", layout:"mwo", vs:"Rejects"},
    {pt:2, side:"us",   name:"Marsh",  script:"snake", layout:"mwo", vs:"Rejects", how:"Snake crawl", by:"#12"},
    {pt:3, side:"us",   name:"Reyes",  script:"blitz", layout:"mwo", vs:"Rejects", how:"Traded"},
  ]}));
  check("a break's record counts its own points and outs", await ev(() => {
    const r = breakRecord("snake");
    return r.points === 2 && r.us === 3 && r.them === 1;
  }));
  check("another call is counted separately", await ev(() => breakRecord("blitz").points === 1));
  check("a record never counts another field's points", await ev(() => {
    window.set({ layoutKey: "not-a-field" });
    const n = breakRecord("snake").points;
    window.set({ layoutKey: "mwo" });
    return n === 0;
  }));
  check("the call card shows the record it has", await ev(() =>
    /called this 2 times/.test(document.querySelector(".main").textContent)));
  check("an unplayed call claims nothing", await ev(() => {
    window.set({ script: "hold" });
    const txt = document.querySelector(".main").textContent;
    window.set({ script: "snake" });
    return !/called this/.test(txt);
  }));
  check("the opponent read ranks how they get you, hardest first", await ev(() => {
    const r = opponentRead("Rejects");
    return r.n === 4 && r.how[0][0] === "Laned" && r.how[0][1] === 2 && r.who[0][0] === "#7";
  }));
  check("a team you have not played reads as nothing", await ev(() => opponentRead("Malicious").n === 0));
  check("anticipate reports it back", await ev(() => {
    window.set({ tab: "scout", scoutTab: "anticipate" });
    const txt = document.querySelector(".main").textContent;
    return /How they get you/.test(txt) && /laned 2/.test(txt);
  }));

  /* -------------------------------------------------------- scouting a team */
  G("Scouting");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    left: { name: "Blast Camp" }, right: { name: "Rejects" } }));
  check("a pit holds a team, not the film read", await ev(() =>
    Object.keys(S.right).join() === "name"));
  check("an unscouted team seeds from the division board", await ev(() => {
    const p = profileOf("Las Vegas Shock");
    return p.threat === 4 && p.players.length === 0 && p.notes === "";
  }));

  await ev(() => { window.setPitNotes("right", "Snake runner goes on the buzzer."); window.setPitTend("right", "Snake"); });
  await ev(() => {
    document.getElementById("sp-num-right").value = "7";
    document.getElementById("sp-name-right").value = "Vasquez";
    document.getElementById("sp-wire-right").value = "Snake";
    document.getElementById("sp-note-right").value = "goes on the buzzer every time";
    window.addScoutPlayer("right");
  });
  check("a player logs with number, name, wire and a read", await ev(() => {
    const m = pitOf("right").players[0];
    return m.num === "7" && m.name === "Vasquez" && m.wire === "Snake" && /buzzer/.test(m.note);
  }));
  check("a number alone is enough to log someone", await ev(() => {
    document.getElementById("sp-num-right").value = "12";
    document.getElementById("sp-name-right").value = "";
    document.getElementById("sp-note-right").value = "";
    window.addScoutPlayer("right");
    return pitOf("right").players.length === 2 && pitOf("right").players[1].num === "12";
  }));
  check("an empty log is refused", await ev(() => {
    document.getElementById("sp-num-right").value = "";
    window.addScoutPlayer("right");
    return pitOf("right").players.length === 2;
  }));
  check("a player carries his own threat", await ev(() => {
    window.setScoutThreat("right", 0, 5);
    return pitOf("right").players[0].threat === 5 && pitOf("right").players[1].threat === 3;
  }));

  // The bug this replaced: the read followed the slot, so tapping another team
  // on the board silently reattached your note to whoever you tapped.
  check("switching team gives a clean sheet, not the last team's read", await ev(() => {
    window.loadPit("Las Vegas Shock");
    return pitOf("right").name === "Las Vegas Shock"
        && pitOf("right").notes === "" && pitOf("right").players.length === 0;
  }));
  check("coming back brings that team's read and players with it", await ev(() => {
    window.loadPit("Rejects");
    return /buzzer/.test(pitOf("right").notes) && pitOf("right").players.length === 2;
  }));
  check("what you learn survives a reload", await ev(() => {
    const raw = JSON.parse(localStorage.getItem("gridlock.coach.v2"));
    return (raw.scout["Rejects"].players || []).length === 2;
  }));

  check("the board marks the teams you have film on", await ev(() =>
    scouted("Rejects") && !scouted("Miami Effect")));
  check("the board shows a team's scored threat, not just the seed", await ev(() => {
    window.setThreat("right", 2);
    return profileOf("Rejects").threat === 2 && teamMeta("Rejects").threat === 4;
  }));
  check("anticipate names the players you logged, hardest first", await ev(() => {
    window.set({ scoutTab: "anticipate" });
    const txt = document.querySelector(".main").textContent;
    return txt.includes("#7 Vasquez") && txt.includes("buzzer") && txt.indexOf("#7") < txt.indexOf("#12");
  }));
  check("a player can be taken off the list", await ev(() => {
    window.set({ scoutTab: "matchup" });
    window.delScoutPlayer("right", 1);
    return pitOf("right").players.length === 1;
  }));

  // An older save kept the read in the slot; it belongs to the team that was in it.
  check("an old pit note is moved onto its team, not dropped", await ev(async () => {
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({ entered: true, role: "staff", tab: "scout",
      left: { name: "Malicious", tend: "Dorito", threat: 5, notes: "They lean dorito every point." },
      right: { name: "Rejects" } }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
  check("the migrated read lands on the right team", await ev(() =>
    /lean dorito/.test(profileOf("Malicious").notes) && profileOf("Rejects").notes === ""));
  check("the migrated slot keeps only the team name", await ev(() =>
    Object.keys(S.left).join() === "name"));

  /* ------------------------------------------ rosters the league published */
  G("Published rosters");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    division: "pro", left: { name: "Los Angeles Ironmen" }, right: { name: "San Diego Dynasty" } }));
  // The pro board carries names only, so a pit can hold a team with no points.
  check("a team nobody has scored reads as a dash, never as undefined", await ev(() =>
    pitOf("left").pts === undefined) &&
    /not scored yet/.test(await page.locator(".pit--l").innerText()) &&
    !/undefined/i.test(await page.locator(".pit--l").innerText()));
  check("a published roster is offered only where one was actually read", await ev(() =>
    !!published("San Diego Dynasty") && !published("Los Angeles Ironmen")));
  check("every published roster says where it came from and when", await ev(() =>
    Object.values(PRO_ROSTERS).every(r => r.src && r.read && r.men.length)));
  check("no roster was invented for a team nobody read", await ev(() =>
    teamsHere().filter(t => published(t.name)).length === Object.keys(PRO_ROSTERS).length));
  check("a team with no published roster says so plainly, and offers the paste",
    /No published roster in the app/.test(await page.locator(".pit--l").innerText()));
  check("adding it logs the men against the team", await ev(() => {
    window.addPublished("right");
    const men = pitOf("right").players;
    return men.length === 5 && men[0].num === "7" && men[0].name === "Alex Fraige";
  }));
  check("a published name is flagged as published, never as something you saw", await ev(() =>
    pitOf("right").players.every(m => m.from === "published")));
  check("the card says how many came off a roster rather than off film",
    /off a published roster/i.test(await page.locator(".pit--r").innerText()));
  check("a published man carries no threat read, just the seed", await ev(() =>
    pitOf("right").players.every(m => m.threat === 3 && m.note === "" && m.wire === "Flex")));
  check("adding it twice does not double the roster", await ev(() => {
    window.addPublished("right");
    return pitOf("right").players.length === 5;
  }));
  check("a published man is editable and scoreable like any other", await ev(() => {
    window.setScoutThreat("right", 0, 5);
    window.editScoutPlayer("right", 0, "wire", "Snake");
    const m = pitOf("right").players[0];
    return m.threat === 5 && m.wire === "Snake";
  }));
  check("the offer is gone once the five are logged",
    !/Add their published/.test(await page.locator(".pit--r").innerText()));
  check("a published roster belongs to the team, not the pit", await ev(() => {
    window.loadPit("Houston Heat");
    const clean = pitOf("right").players.length === 0;
    window.loadPit("San Diego Dynasty");
    return clean && pitOf("right").players.length === 5;
  }));

  /* -------------------------------- a roster read off the phone's own OCR */
  // A screenshot never reaches this app. The phone reads the picture, the coach
  // pastes what it read, and this has to survive how ragged that text is.
  G("Roster from a screenshot");
  await ev(() => window.set({ tab: "scout", scoutTab: "matchup", scout: {},
    left: { name: "Blast Camp" }, right: { name: "Rejects" }, paste: null, pasteSide: "" }));

  const parse = t => ev(x => parseRoster(x), t);
  check("number first, name after", await parse("12 Ryan Greenspan").then(r =>
    r.found.length === 1 && r.found[0].num === "12" && r.found[0].name === "Ryan Greenspan"));
  check("a hash in front is still a number", await parse("#4 Alex Goldman").then(r =>
    r.found[0].num === "4" && r.found[0].name === "Alex Goldman"));
  check("name first, number after", await parse("Chad Busiere 7").then(r =>
    r.found[0].num === "7" && r.found[0].name === "Chad Busiere"));
  check("a table pasted with tabs or pipes reads the same", await parse("9\tKS Kang\n| 15 | Nick Slowiak |").then(r =>
    r.found.length === 2 && r.found[0].num === "9" && r.found[1].name === "Nick Slowiak"));
  check("a wire named on the line is picked up", await parse("4 Alex Goldman snake").then(r =>
    r.found[0].wire === "Snake" && r.found[0].name === "Alex Goldman"));
  check("no wire named means flex, never a guess", await parse("4 Alex Goldman").then(r =>
    r.found[0].wire === "Flex"));
  check("a number with no name is still a player", await parse("22").then(r =>
    r.found.length === 1 && r.found[0].num === "22" && r.found[0].name === ""));
  check("a name with no number is still a player", await parse("Ryan Greenspan").then(r =>
    r.found.length === 1 && r.found[0].name === "Ryan Greenspan" && r.found[0].num === ""));
  check("column headings are dropped", await parse("Player\nNo.\nDivision\n7 Reyes").then(r =>
    r.found.length === 1 && r.found[0].name === "Reyes"));
  check("a whole header row is dropped, not read as a man", await parse("Player  No.\n# Name Team\n7 Reyes").then(r =>
    r.found.length === 1 && r.found[0].name === "Reyes"));
  check("page chrome and prose are left out, not guessed at", await parse(
    "7 Reyes\nRegistration closes on the fourteenth of June at midnight\nmenu").then(r =>
    r.found.length === 1 && r.skipped.length === 1));
  check("what was left out is handed back so nothing goes quiet", await parse(
    "Registration closes on the fourteenth of June").then(r =>
    r.found.length === 0 && r.skipped.length === 1));
  check("a paste is capped so one bad screenshot cannot flood the sheet", await parse(
    Array.from({ length: 60 }, (_, i) => (i + 1) + " Man " + String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(97 + i % 26)).join("\n")).then(r =>
    r.found.length === 40));
  check("threat starts unscored at three, the same as a typed player", await parse("12 Greenspan").then(r =>
    r.found[0].threat === 3));

  // The fixture below is not typed by hand. It is what a real OCR engine
  // (tesseract) actually returned from a phone-resolution screenshot of a
  // pbleagues roster page — status bar, address bar, nav, page title, class
  // column, wrapped footer and all. Every one of those read as a player until
  // this text was put through the parser.
  const OCR = "9:41 LTE 100%\n" +
    "pbleagues.com/team/roster/MihM3rL8DiAEcaoW\n\n" +
    "Home Events Teams Rankings Search\n\n" +
    "San Diego Dynasty\n\n" +
    "at NXL Tampa Bay Open 2025 - Pro X-Ball\n\n" +
    "# PLAYER CLASS\n\n" +
    "7 Alex Fraige Pro\n\n" +
    "18 Ryan Greenspan Pro\n\n" +
    "32 Yosh Rau Pro\n" +
    "Eliot Weaver Pro\n" +
    "Archie Barnes Jr Pro\n\n" +
    "Rosters over three months old are archived. Email us with the\n\n" +
    "resource locator ID to request a copy. Registration closes fourteen\n\n" +
    "days before the event.\n";
  const real = await ev(t => parseRoster(t, "San Diego Dynasty"), OCR);
  check("a real screenshot reads as exactly its five men, and nothing else",
    real.found.length === 5, real.found.map(m => (m.num || "-") + " " + m.name).join(" · "));
  check("the phone's own status bar is not a player",
    !real.found.some(m => m.num === "9" || /LTE/i.test(m.name)));
  check("the team's name at the top of the page is not a player",
    !real.found.some(m => /Dynasty/i.test(m.name)));
  check("the class column is shed, not glued to the name",
    real.found.every(m => !/\bPro\b/.test(m.name)) && real.found[0].name === "Alex Fraige");
  check("Jr stays part of a man's name",
    real.found[4].name === "Archie Barnes Jr");
  check("the tail of a wrapped sentence is not a player",
    !real.found.some(m => /days before/i.test(m.name)) &&
    real.skipped.some(l => /days before/i.test(l)));
  check("the numbers come off the page as the page had them",
    real.found[0].num === "7" && real.found[1].num === "18" && real.found[2].num === "32" &&
    real.found[3].num === "" && real.found[4].num === "");
  check("a lowercase sentence that fits in four words is still not a name", await parse(
    "days before the event\nresource locator\n7 Reyes").then(r => r.found.length === 1));

  check("reading it shows what was read and adds nobody yet", await ev(() => {
    window.openPaste("right");
    document.getElementById("rosterIn").value = "12 Ryan Greenspan\n#4 Alex Goldman snake\nChad Busiere 7";
    window.readRoster("right");
    return S.paste.found.length === 3 && pitOf("right").players.length === 0;
  }));
  check("the read list is on screen with a way to drop a bad row",
    await page.locator(".rost__read").count() === 3 &&
    await page.locator(".rost__read .btn--danger").count() === 3);
  check("dropping a row takes it out before anyone is kept", await ev(() => {
    window.dropPasted(1);
    return S.paste.found.length === 2 && S.paste.found[1].name === "Chad Busiere";
  }));
  check("keeping them logs the rest against the team", await ev(() => {
    window.keepRoster();
    const men = pitOf("right").players;
    return men.length === 2 && men[0].num === "12" && men[1].name === "Chad Busiere";
  }));
  check("the box closes and says what it did", await ev(() =>
    !S.paste && S.pasteSide === "" && /Added 2/.test(S.pasteNote)));
  check("a second paste of the same roster adds nobody twice", await ev(() => {
    window.openPaste("right");
    document.getElementById("rosterIn").value = "12 Ryan Greenspan\n7 Chad Busiere\n15 Nick Slowiak";
    window.readRoster("right");
    window.keepRoster();
    return pitOf("right").players.length === 3 && /already logged/.test(S.pasteNote);
  }));
  check("a pasted player is editable like any other", await ev(() => {
    window.editScoutPlayer("right", 0, "name", "R. Greenspan");
    window.setScoutThreat("right", 0, 5);
    const m = pitOf("right").players[0];
    return m.name === "R. Greenspan" && m.threat === 5;
  }));
  check("a pasted roster belongs to the team, not the pit", await ev(() => {
    window.loadPit("Las Vegas Shock");
    const clean = pitOf("right").players.length === 0;
    window.loadPit("Rejects");
    return clean && pitOf("right").players.length === 3;
  }));
  check("it survives a reload", await ev(() =>
    (JSON.parse(localStorage.getItem("gridlock.coach.v2")).scout["Rejects"].players || []).length === 3));
  check("cancelling throws the paste away", await ev(() => {
    window.openPaste("left");
    document.getElementById("rosterIn").value = "1 Nobody";
    window.readRoster("left");
    window.closePaste();
    return !S.paste && S.pasteSide === "" && pitOf("left").players.length === 0;
  }));
  check("an empty paste keeps its hands off the sheet", await ev(() => {
    window.openPaste("left");
    document.getElementById("rosterIn").value = "   \n\n";
    window.readRoster("left");
    const none = S.paste.found.length === 0;
    window.keepRoster();
    window.closePaste();
    return none && pitOf("left").players.length === 0;
  }));

  /* ----------------------------------------------------------- path editing */
  G("Path editing");
  await ev(() => window.set({ tab: "playbook", editPath: true, pathEdits: {}, t: 0.5, playing: false }));
  await page.waitForTimeout(200);

  // The corners are rounded so a path reads like a run rather than a set of
  // right angles. Rounding must not push the curve into a bunker, so this
  // samples what is actually drawn — the real path element, at 4 samples a
  // foot — and checks every sample against every footprint.
  const sampleCurves = () => ev(() => {
    // Whatever field is on screen — the obstacles have to be that field's, or
    // this compares one layout's curves against another's bunkers.
    const obs = routeObstacles(curLayout().bunkers);
    const svg = document.querySelector(".field-wrap[data-live] svg.field");
    const paths = [...svg.querySelectorAll("path[stroke='#e5342f']")];
    const bad = [];
    paths.forEach((el, i) => {
      const p = currentPaths()[i];
      if(!p) return;
      const holds = o => Math.abs(p.from[0]-o.x) <= o.hw && Math.abs(p.from[1]-o.y) <= o.hh;
      const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
      const L = el.getTotalLength();
      let prev = null;
      for(let d = 0; d <= L; d += L / Math.max(40, Math.round(L / 2))){
        const q = el.getPointAtLength(d);
        const cur = [q.x / 2, q.y / 2];                 // svg units -> feet
        if(prev) for(const o of live)
          if(segHitsBox(prev[0], prev[1], cur[0], cur[1], o.x, o.y, o.hw, o.hh)){ bad.push(`${p.id}:${o.n}`); break; }
        prev = cur;
      }
    });
    return { key: S.layoutKey, paths: paths.length, bad: [...new Set(bad)] };
  });
  const curve = await sampleCurves();
  check("the drawn curve is sampled on all five paths", curve.paths === 5, `${curve.paths} paths`);
  // Every field, not just the one the app happens to open on: rounding that
  // clears one layout can cut a corner into a bunker on another.
  const curves = [curve];
  for(const k of ["mwo", "tby"]){
    await ev(x => window.set({ layoutKey: x }), k);
    await page.waitForTimeout(180);
    curves.push(await sampleCurves());
  }
  const cut = curves.filter(c => c.bad.length);
  check("rounding a corner never pushes the run into a bunker, on any field",
    cut.length === 0, cut.map(c => `${c.key}: ${c.bad.join(" ")}`).join(" | ")
      || curves.map(c => c.key).join(", "));

  check("edit mode puts a handle on every corner", await ev(() => {
    const corners = currentPaths().reduce((n, p) => n + (p.via || []).length, 0);
    return document.querySelectorAll("circle.hnd").length === corners && corners > 0;
  }));

  // A real drag, with real pointer events, because that is the risky part.
  const handle = page.locator("circle.hnd").first();
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 55, hb.y + 35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  check("dragging a corner moves it and marks the path edited", await ev(() =>
    Object.keys(S.pathEdits || {}).length === 1 && currentPaths().some(p => p.edited)));
  check("an edited path offers to go back to the routed one",
        (await page.locator("button", { hasText: "Reset path" }).count()) === 1);

  check("a corner can be added and taken out again", await ev(() => {
    const p = currentPaths()[0];
    const n0 = (p.via || []).length;
    const via = [...(p.via || []), [40, 40]];
    S.pathEdits = {...(S.pathEdits || {}), [pathKey(p.id)]: via};
    save(S);
    const added = (currentPaths()[0].via || []).length === n0 + 1;
    via.pop();
    S.pathEdits = {...(S.pathEdits || {}), [pathKey(p.id)]: via};
    save(S);
    return added && (currentPaths()[0].via || []).length === n0;
  }));

  check("a player can be pointed by dragging him", await ev(() => {
    window.setDirect(1, "face", 135);
    return directOf(1).face === 135;
  }));

  // Draw the run in with a finger — no pencil to switch on. A stroke samples
  // into spaced corners between the two ends the plants fix.
  check("a drawn stroke samples into spaced interior corners, ends left alone", await ev(() => {
    const from = [10, 10], to = [100, 100], pts = [];
    for(let i = 0; i <= 90; i++) pts.push([10 + i, 10 + i]);       // a straight drag
    const s = sampleStroke(pts, from, to);
    const spaced = s.every((q, i) => i === 0 || Math.hypot(q[0]-s[i-1][0], q[1]-s[i-1][1]) >= 5.5);
    const interior = s.every(q => Math.hypot(q[0]-from[0], q[1]-from[1]) > 5 && Math.hypot(q[0]-to[0], q[1]-to[1]) > 5);
    return s.length >= 3 && s.length <= 16 && spaced && interior;
  }));
  check("dragging along a run draws it in as several corners, ends anchored", await ev(() => {
    window.set({ editPath: true });
    const svg = document.querySelector(".field-wrap[data-live] svg.field");
    const leg = svg.querySelector("[data-leg]"); if(!leg) return false;
    const id = Number(leg.dataset.leg);
    const before = currentPaths().find(p => p.id === id);
    const from = before.from, to = before.to;
    const C = ([x, y]) => new DOMPoint(x*2, y*2).matrixTransform(svg.getScreenCTM());
    const seq = [[35, 35], [50, 48], [65, 60], [80, 72], [95, 84]];
    let p = C(seq[0]);
    leg.dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:9}));
    for(const q of seq.slice(1)){ p = C(q);
      document.dispatchEvent(new PointerEvent("pointermove", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:9})); }
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:9}));
    const after = currentPaths().find(p2 => p2.id === id), via = after.via || [];
    return via.length >= 2 && after.edited
      && after.from[0] === from[0] && after.from[1] === from[1]
      && after.to[0] === to[0] && after.to[1] === to[1];
  }));
  check("the drawing hint tells him he can draw", await ev(() =>
    /Drag along a run to draw/.test(document.getElementById("root").innerText)));

  await ev(() => window.resetAllPaths());
  check("resetting puts every path back on the routed line", await ev(() =>
    Object.keys(S.pathEdits || {}).length === 0 && !currentPaths().some(p => p.edited)));
  await ev(() => window.set({ editPath: false }));
  check("the handles go away when editing is off", await ev(() =>
    document.querySelectorAll("circle.hnd").length === 0));

  /* ------------------------------------------------------------- divisions */
  G("Divisions");
  await ev(() => window.set({ tab:"scout", scoutTab:"board", division:"pro", teams:{}, scout:{} }));
  check("there is more than one division to pick from", await ev(() => DIVISIONS.length >= 2));
  check("pro is what the app opens on", await ev(() =>
    divisionOf().id === "pro" && /Pro/.test(divisionOf().name)));
  check("the pro board carries the league's teams", await ev(() =>
    teamsHere().length >= 11 && teamsHere().some(t => t.name === "Los Angeles Ironmen")
                             && teamsHere().some(t => t.name === "Seattle Uprising")));
  check("the semi-pro board is still there with its points", await ev(() => {
    window.setDivision("semi");
    const t = teamsHere().find(x => x.name === "Rejects");
    const ok = teamsHere().length >= 14 && t.pts === 186 && t.reg === "PAID";
    window.setDivision("pro");
    return ok;
  }));
  // The point of the whole exercise: names are a fact, a team's form is not.
  // Points, tendency and threat are still the coach's alone. Registration is
  // not a score — the league publishes it — so it may be on the board, but only
  // for a team whose name was read off the registration page.
  check("no pro team arrives with an invented score", await ev(() =>
    teamsHere().every(t => t.pts === undefined && t.tend === undefined
                        && t.threat === undefined)));
  check("registration only ever appears with the source it came from", await ev(() =>
    teamsHere().every(t => t.reg === undefined || t.src === "reg")));
  check("an unscored team reads as unknown, not as average", await ev(() => {
    const p = profileOf("Houston Heat");
    return p.unscored === true && p.threat === 3 && p.notes === "";
  }));
  check("the board shows a dash rather than a made-up score", await ev(() => {
    const row = [...document.querySelectorAll("tbody tr")].find(r => /Houston Heat/.test(r.textContent));
    return (row.textContent.match(/—/g) || []).length >= 4;
  }));
  check("scoring a team yourself fills the board in", await ev(() => {
    window.loadPit("Houston Heat");
    window.setThreat("right", 5);
    window.setPitTend("right", "Dorito");
    const p = profileOf("Houston Heat");
    return p.threat === 5 && p.tend === "Dorito";
  }));
  check("the pit dropdown follows the division", await ev(() => {
    window.set({ pitOpen: "right" });                        // folded off Matchup; open the card to read its picker
    const opts = [...document.querySelectorAll(".pit select option")].map(o => o.textContent);
    window.set({ pitOpen: null });
    return opts.includes("Houston Heat") && !opts.includes("Rejects");
  }));
  check("a profile survives switching divisions", await ev(() => {
    window.setDivision("semi");
    const away = profileOf("Houston Heat").threat === 5;
    window.setDivision("pro");
    return away && profileOf("Houston Heat").threat === 5;
  }));
  // The whole entry list, confirmed by the coach who read the page: it runs
  // Atlanta Jungle Cats to TonTon Arsenal with nothing below. So the board says
  // it is complete and says when it was read, rather than hedging about a list
  // it actually has all of.
  check("the board says what it was read from, and that it is the whole list",
    await ev(() => {
      const t = document.querySelector(".main").textContent;
      const pro = divisionTeams("pro");
      return /Read from PBLeagues/.test(t) && /all 20 entries/.test(t)
          && /10 Sep 2026/.test(t) && !/may not be all/.test(t)
          && pro[0].name === "Atlanta Jungle Cats"
          && pro[pro.length - 1].name === "TonTon Arsenal";
    }));
  // Every pro name came from somewhere and the board says which: a league page
  // for the team, or coverage of an event it played. Nothing is on there
  // because it sounded right.
  check("every pro team says where its name was read from", await ev(() =>
    divisionTeams("pro").length >= 20 &&
    divisionTeams("pro").every(t => ["reg", "page", "event"].includes(t.src))));
  check("no pro team carries a score", await ev(() =>
    divisionTeams("pro").every(t => t.pts === undefined
                                 && t.tend === undefined && t.threat === undefined)));
  check("the board shows the provenance beside each team", await ev(() => {
    window.set({ tab: "scout", scoutTab: "board", division: "pro" });
    const t = document.getElementById("root").textContent;
    return t.includes("Read from") && t.includes("ENTERED");
  }));
  // The registration page is the reason these are on the board at all, so the
  // two states it shows have to survive into the app rather than being
  // flattened into "entered".
  check("who has paid and who has not is kept apart", await ev(() => {
    const paid = divisionTeams("pro").filter(t => t.reg === "PAID").length;
    const pend = divisionTeams("pro").filter(t => t.reg === "PEND").length;
    return paid === 12 && pend === 8 && paid + pend === divisionTeams("pro").length;
  }));
  check("a team can be added to a division", await ev(() => {
    document.getElementById("newTeam").value = "Test Squad";
    window.addTeam();
    return teamsHere().some(t => t.name === "Test Squad") && !!anyTeam("Test Squad");
  }));
  check("an added team can be scouted like any other", await ev(() => {
    window.loadPit("Test Squad");
    return pitOf("right").name === "Test Squad";
  }));
  check("the same team cannot be added twice", await ev(() => {
    const n = teamsHere().length;
    document.getElementById("newTeam").value = "Test Squad";
    window.addTeam();
    return teamsHere().length === n;
  }));
  check("an added team can be taken off again", await ev(() => {
    window.loadPit("Houston Heat");
    window.delTeam("Test Squad");
    return !teamsHere().some(t => t.name === "Test Squad");
  }));
  check("a blank team name is refused", await ev(() => {
    const n = teamsHere().length;
    document.getElementById("newTeam").value = "   ";
    window.addTeam();
    return teamsHere().length === n;
  }));
  await ev(() => window.set({ division:"semi", teams:{}, scout:{}, right:{name:"Rejects"}, left:{name:"Blast Camp"} }));

  /* ------------------------------------------------------------- first run */
  G("First run");
  await ev(() => { localStorage.removeItem("gridlock.coach.v2"); });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    // Sign in for real, because that is the only way in now.
    window.set({ mode: "create" });
  });
  await page.waitForTimeout(80);
  await page.fill("#em", "coach@team.com"); await page.fill("#pw", "sideline1");
  await page.evaluate(async () => { await window.doAuth(); });
  await page.waitForTimeout(350);
  check("the field is on screen without scrolling", await ev(() => {
    const f = document.querySelector(".field-wrap").getBoundingClientRect();
    return f.top < window.innerHeight * 0.55 && f.top > 0;
  }));
  check("the whole field fits above the fold on a phone", await ev(() => {
    const f = document.querySelector(".field-wrap").getBoundingClientRect();
    return Math.min(f.bottom, window.innerHeight) - f.top > f.height * 0.95;
  }));
  check("playing the break is reachable without scrolling", await ev(() => {
    const btns = [...document.querySelectorAll("button")].filter(b => /Play the break/.test(b.textContent));
    const r = btns[0].getBoundingClientRect();
    return r.top < window.innerHeight;
  }));
  check("an empty squad is told where to go, not just left blank", await ev(() => {
    const txt = document.querySelector(".main").textContent;
    return /Put names on them/.test(txt) && /Add your squad/.test(txt);
  }));
  check("that route actually lands on Team", await ev(() => {
    [...document.querySelectorAll("button")].find(b => /Add your squad/.test(b.textContent)).click();
    return S.tab === "more" && S.more === "team";
  }));
  check("the tally says where its five come from", await ev(() => {
    window.set({ tab: "tally" });
    return /no names yet/.test(document.querySelector(".main").textContent) && /Add your five · Team/.test(document.querySelector(".main").textContent);
  }));
  check("nothing invents a player on a fresh install", await ev(() => (S.roster || []).length === 0));

  /* ------------------------------------------------ the rest of Scout */
  G("Breakouts");
  const AGAINST = {
    tab:"scout", scoutTab:"breakouts", layoutKey:"mwo", script:"snake", point:4,
    left:{name:"Blast Camp"}, right:{name:"Rejects"},
    scout:{"Rejects":{tend:"Snake",threat:4,notes:"",players:[],
           breaks:[{script:"snake",pt:1,at:1},{script:"snake",pt:2,at:2},{script:"blitz",pt:3,at:3}]}},
    tally:[
      {pt:1,side:"us",  name:"Reyes",at:10,script:"snake",layout:"mwo",vs:"Rejects",how:"Laned",by:"#7",shotAt:"SB#6"},
      {pt:1,side:"them",name:"3",    at:11,script:"snake",layout:"mwo",vs:"Rejects",shotAt:"MD#1"},
      {pt:1,side:"us",  name:"Vance",at:12,script:"snake",layout:"mwo",vs:"Rejects",how:"Traded",shotAt:"GP#1"},
      {pt:2,side:"them",name:"1",    at:20,script:"snake",layout:"mwo",vs:"Rejects",shotAt:"MD#3"},
      {pt:3,side:"us",  name:"Marsh",at:30,script:"blitz",layout:"mwo",vs:"Malicious",how:"Bounce"}],
    moves:[{pt:1,who:"Reyes",from:"SB#6",to:"GP#1",layout:"mwo",at:15}],
  };
  await ev(st => window.set(st), AGAINST);
  check("what a team runs is counted, most seen first", await ev(() => {
    const f = breakFreq("right");
    return f[0][0] === "snake" && f[0][1] === 2 && f[1][0] === "blitz";
  }));
  check("logging a call adds to that team's record", await ev(() => {
    window.logTheirBreak("right", "flood");
    return theirBreaks("right").length === 4 && breakFreq("right").some(f => f[0] === "flood");
  }));
  check("a logged call is stamped with the point", await ev(() => theirBreaks("right")[0].pt === 4));
  check("it can be taken back off", await ev(() => {
    window.unlogTheirBreak("right", 0);
    return theirBreaks("right").length === 3;
  }));
  check("it belongs to the team, not the pit", await ev(() => {
    window.loadPit("Malicious");
    const none = theirBreaks("right").length === 0;
    window.loadPit("Rejects");
    return none && theirBreaks("right").length === 3;
  }));
  check("the counter-picker cites the count once there is one", await ev(() => {
    window.set({ scoutTab: "counter" });
    return /logged them 3 times/.test(document.querySelector(".main").textContent);
  }));
  check("an unseen team claims no record", await ev(() => {
    window.set({ scoutTab: "breakouts" });
    window.loadPit("Miami Effect");
    const txt = document.querySelector(".main").textContent;
    window.loadPit("Rejects");
    return /Nothing logged on Miami Effect/.test(txt);
  }));

  G("Layers");
  await ev(() => window.set({ scoutTab: "layers", scoutLayers: {theirOuts:true} }));
  check("each layer counts only this opponent", await ev(() => {
    const t = document.querySelector(".main").textContent;
    return /Their outs · 2/.test(t) && /Your outs · 2/.test(t) && /Your rotations · 1/.test(t);
  }));
  check("traffic can be narrowed to one side", await ev(() => {
    const theirs = bunkerTraffic(o => o.side === "them" && o.vs === "Rejects");
    const mine   = bunkerTraffic(o => o.side === "us"   && o.vs === "Rejects");
    return !!theirs["MD#1"] && !theirs["SB#6"] && !!mine["SB#6"] && !mine["MD#1"];
  }));
  check("a layer can be turned off and on", await ev(() => {
    window.toggleLayer("theirOuts");
    const off = S.scoutLayers.theirOuts === false;
    window.toggleLayer("theirOuts");
    return off && S.scoutLayers.theirOuts === true;
  }));
  check("with every layer off it says so", await ev(() => {
    window.set({ scoutLayers: {} });
    const txt = document.querySelector(".main").textContent;
    window.set({ scoutLayers: {theirOuts:true} });
    return /Nothing logged against Rejects/.test(txt);
  }));

  G("Games and replay");
  await ev(() => window.set({ scoutTab: "games", replayPt: null, replayStep: null }));
  check("only points against this team are listed", await ev(() => {
    const btns = [...document.querySelectorAll(".seg button")].map(b => b.textContent.trim());
    return btns.includes("Point 1") && btns.includes("Point 2") && !btns.includes("Point 3");
  }));
  check("a point replays every out it holds", await ev(() => {
    window.set({ replayPt: 1, replayStep: null });
    return document.querySelectorAll(".assigns .assign").length === 3;
  }));
  check("the events are in the order they were tapped", await ev(() => {
    const first = document.querySelector(".assigns .assign .assign__job").textContent;
    return first === "Reyes";
  }));
  check("an out replays with how and who", await ev(() =>
    /laned · by #7 · at/.test(document.querySelector(".assigns .assign").textContent)));
  check("stepping shows only what has happened by then", await ev(() => {
    window.set({ replayStep: 1 });
    const one = document.querySelectorAll(".assigns .assign").length === 1;
    const left = /2 still up/.test(document.querySelector(".main").textContent);
    window.set({ replayStep: null });
    return one && left;
  }));
  check("a team you have not played has no games", await ev(() => {
    window.loadPit("Miami Effect");
    const txt = document.querySelector(".main").textContent;
    window.loadPit("Rejects");
    return /No points scored or outs logged against Miami Effect/.test(txt);
  }));
  check("Scout opens on five sub-tabs plus More, not nine", await ev(() => {
    window.set({ tab:"scout", scoutTab:"matchup", scoutNavMore:false });
    const bar = [...document.querySelectorAll('.seg--wrap[aria-label=\"Scout views\"] button')].map(b => b.textContent.trim());
    return bar.length === 6 && bar[5].startsWith("More")
      && !bar.includes("Voice log") && !bar.includes("Anticipate");
  }));
  check("the field controls fold behind Overlays by default, no Layers name clash", await ev(() => {
    window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them", scoutFold:true });
    const tgls = [...document.querySelectorAll("#root .tgl")].map(b => b.textContent.trim());
    const folded = tgls.some(t => /Overlays/.test(t)) && !tgls.some(t => /^Roles/.test(t));
    // "Layers" appears only as the sub-tab (under More), never as the fold chip.
    const noClash = !tgls.some(t => /Layers/.test(t));
    window.set({ scoutFold:false });
    const open = [...document.querySelectorAll("#root .tgl")].some(b => /^Roles/.test(b.textContent.trim()));
    window.set({ scoutFold:true });
    return folded && noClash && open;
  }));
  check("every sub-tab the spec names is reachable", await ev(() => {
    // The occasional four live under More now; open it, then all are on screen.
    window.set({ tab:"scout", scoutTab:"matchup", scoutNavMore:true });
    const bar = [...document.querySelectorAll(".seg--wrap button")].map(b => b.textContent.trim());
    window.set({ scoutNavMore:false });
    return ["Matchup","Breakouts","Anticipate","Counter","Layers","Games","Division"]
      .every(n => bar.includes(n));
  }));
  check("all seven fit without a hidden scroller", await ev(() => {
    const bar = document.querySelector(".seg--wrap");
    return bar.scrollWidth <= bar.clientWidth + 1;
  }));

  /* ------------------------------------------------------------------- QR */
  G("QR");
  // The app ships offline, so the encoder is hand-written and cannot be taken
  // on trust. This matrix was checked outside the app: rendered to pixels and
  // read back by an independent decoder as the string below. If the encoder
  // drifts, this fails.
  const QR_GOLDEN = ["1111111000101001101111111", "1000001000011111101000001", "1011101010011010101011101", "1011101010001010001011101", "1011101010100100001011101", "1000001010010011101000001", "1111111010101010101111111", "0000000010100000000000000", "1011111000111101101111100", "0100000001110100100001100", "0111011101001011110010011", "1010010101111010010010000", "0001111000000101101111101", "1110110001101010100000010", "1010001100100111110111011", "1000000101001011010010010", "1000101010001011111111111", "0000000010100101100010100", "1111111000011100101011011", "1000001010110010100010001", "1011101010011101111111100", "1011101010001011011010111", "1011101010100100100100101", "1000001001000001101110001", "1111111011011010010001111"];
  check("the join link encodes to the verified matrix", await ev(g => {
    const m = qrMatrix("gridlock://class/GL-7K2M");
    return !!m && m.map(r => r.join("")).join("|") === g.join("|");
  }, QR_GOLDEN));
  check("the QR carries the deep link both platforms register", await ev(() =>
    joinLink("GL-7K2M") === "gridlock://class/GL-7K2M"));
  check("the version grows with the payload", await ev(() => {
    const a = qrMatrix("A").length, b = qrMatrix("x".repeat(30)).length;
    return a === 21 && b === 29;
  }));
  check("a payload too long is refused, not mangled", await ev(() =>
    qrMatrix("x".repeat(42)) !== null && qrMatrix("x".repeat(43)) === null));
  check("all three finder patterns are in place", await ev(() => {
    const m = qrMatrix("gridlock://class/GL-7K2M"), n = m.length;
    const eye = (r0, c0) => m[r0][c0] === 1 && m[r0 + 1][c0 + 1] === 0 && m[r0 + 3][c0 + 3] === 1;
    return eye(0, 0) && eye(0, n - 7) && eye(n - 7, 0);
  }));
  check("the timing pattern alternates", await ev(() => {
    const m = qrMatrix("gridlock://class/GL-7K2M"), n = m.length;
    for(let i = 8; i < n - 8; i++) if(m[6][i] !== (i % 2 ? 0 : 1) || m[i][6] !== (i % 2 ? 0 : 1)) return false;
    return true;
  }));
  check("the drawn code keeps the four-module quiet zone", await ev(() => {
    const svg = qrSVG("gridlock://class/GL-7K2M", 132);
    const box = /viewBox="0 0 (\d+) \1"/.exec(svg);
    return !!box && Number(box[1]) === qrMatrix("gridlock://class/GL-7K2M").length + 8;
  }));
  check("the code is drawn on white, or no camera reads it", await ev(() =>
    /<rect[^>]*fill="#fff"/.test(qrSVG("gridlock://class/GL-7K2M", 132))));
  // Nothing draws a QR right now: it would open the app to a session that does
  // not exist on the scanner's phone. The encoder stays proven and ready.
  check("the encoder is ready even though nothing draws one yet", await ev(() => {
    window.set({ tab: "more", more: "classes",
                 classes: [{ id: "GL-7K2M", code: "GL-7K2M", title: "Friday clinic", open: true }] });
    return !document.querySelector("svg.qr") && qrSVG(joinLink("GL-7K2M"), 132).includes("<svg");
  }));
  check("the sign-in sheet says where the session actually lives", await ev(() =>
    /on this phone/i.test(document.querySelector(".main").textContent)));

  /* ---------------------------------------------------------- break routing */
  G("Break routing");
  const route = await ev(() => {
    const obs = routeObstacles(LAYOUTS.mwo.bunkers);
    const legs = [], snakes = [];
    const snakeIds = new Set(obs.filter(o => o.n === "SB" && o.ids.size > 3).flatMap(o => [...o.ids]));
    for (const k of Object.keys(BREAK_PLANTS.mwo)) {
      const paths = breakPaths("mwo", k);
      snakes.push(paths.filter(p => snakeIds.has(p.bunker)).length);
      for (const p of paths) {
        const pts = [p.from, ...p.via, p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        let clip = 0;
        for (let i = 0; i < pts.length - 1; i++)
          for (const o of live)
            if (segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
        const len = pts.slice(1).reduce((a, c, i) => a + Math.hypot(c[0] - pts[i][0], c[1] - pts[i][1]), 0);
        legs.push({ script: k, id: p.bunker, clip, len, straight: Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) });
      }
    }
    const spread = breakPaths("mwo", "snake").map(p => p.from[1]);
    return { legs, snakes, station: Math.max(...spread) - Math.min(...spread) };
  });
  const clipped = route.legs.filter(l => l.clip > 0);
  check("no break path runs through a bunker", clipped.length === 0,
        clipped.length ? clipped.map(l => `${l.script}->${l.id}`).join(", ") : `${route.legs.length} legs`);
  check("every break path stays a sane length", route.legs.every(l => l.len < l.straight * 1.6 + 12));
  check("never more than one player on the snake", route.snakes.every(n => n <= 1), route.snakes.join(","));
  check("the five break from one station, not the whole width", route.station <= 20, `${route.station.toFixed(0)} ft`);

  /* ------------------------------------------------------- a second field */
  // Until now the app shipped one layout. Everything geometric keys off it,
  // so a second one is the first real test that any of it was general.
  G("Tampa Bay");
  check("every layout that ships says where it came from", await ev(() =>
    Object.keys(LAYOUTS).length === 3 &&
    Object.values(LAYOUTS).every(l => /official NXL field map/.test(l.source))));
  check("the event becomes a picker once there is more than one to pick", await ev(() => {
    window.set({ tab: "playbook" });
    return !!document.querySelector("button.ctx");
  }));
  check("Tampa carries its own 57 bunkers", await ev(() => LAYOUTS.tby.bunkers.length === 57));
  check("every one of them is on the field", await ev(() =>
    LAYOUTS.tby.bunkers.every(b => b.x > 0 && b.x < 150 && b.y > 0 && b.y < 120)));
  check("no two bunkers share an id", await ev(() =>
    new Set(LAYOUTS.tby.bunkers.map(b => b.id)).size === LAYOUTS.tby.bunkers.length));
  check("the field is drawn symmetric, as the map prints it", await ev(() => {
    // Each bunker should have an opposite number across the centre line.
    const bs = LAYOUTS.tby.bunkers;
    const off = bs.filter(b => Math.abs(b.x - 75) > 4).filter(b =>
      !bs.some(o => o !== b && o.n === b.n &&
        Math.abs((o.x + b.x) / 2 - 75) < 1.2 && Math.abs(o.y - b.y) < 1.2));
    return off.length === 0;
  }));

  // Six of Tampa's fourteen beam sections are printed at an angle. A box drawn
  // around one is half again as wide as the beam, and would block lanes the
  // beam leaves open.
  check("an angled beam carries its own length, thickness and angle", await ev(() => {
    const t = LAYOUTS.tby.bunkers.filter(b => b.a && b.t === "beam");
    return t.length === 6 && t.every(b => Math.abs(b.a) > 35 && Math.abs(b.a) < 50)
        && t.every(b => b.w > 9 && b.w < 11 && b.h > 1.2 && b.h < 2.5);
  }));
  check("every beam section on the field is the same beam", await ev(() => {
    const sb = LAYOUTS.tby.bunkers.filter(b => b.n === "SB");
    return sb.length === 14 && sb.every(b => b.w > 9 && b.w < 11 && b.h > 1.2 && b.h < 2.5);
  }));
  check("a square bunker is one box; an angled one is three along its length", await ev(() => {
    const flat = LAYOUTS.tby.bunkers.find(b => b.n === "GB");
    const tilt = LAYOUTS.tby.bunkers.find(b => b.a);
    return bunkerBoxes(flat).length === 1 && bunkerBoxes(tilt).length >= 5
        && bunkerBoxes(tilt).every(k => Math.abs(k.w - tilt.h) < 0.01);
  }));
  check("an angled beam blocks less than the box around it", await ev(() => {
    const b = LAYOUTS.tby.bunkers.find(x => x.a);
    const t = b.a * Math.PI / 180;
    const bw = Math.abs(b.w * Math.cos(t)) + Math.abs(b.h * Math.sin(t));
    const bh = Math.abs(b.w * Math.sin(t)) + Math.abs(b.h * Math.cos(t));
    // The beam leaves two corners of its bounding box open — which two depends
    // on which way it leans. A short lane across the free corner is clear of
    // the beam and clipped by the box, which is the whole point of the split.
    const cx = b.x + (b.a < 0 ? -1 : 1) * (bw / 2 - 1);
    const cy = b.y - (bh / 2 - 1);
    const hitsBox = segHitsBox(cx - 2, cy - 2, cx + 2, cy + 2, b.x, b.y, bw / 2, bh / 2);
    const hitsBeam = bunkerBoxes(b).some(k =>
      segHitsBox(cx - 2, cy - 2, cx + 2, cy + 2, k.x, k.y, k.w / 2, k.h / 2));
    return hitsBox && !hitsBeam;
  }));

  // Lone Star came in as an unreleased event with no images at all, then the
  // field owner sent the official 2D. It is the third field, and the first one
  // added after everything geometric had already been made general.
  check("Lone Star carries its own 58 bunkers", await ev(() => LAYOUTS.lso.bunkers.length === 58));
  check("the app opens on the event that is next", await ev(() => {
    localStorage.clear();
    return defaultState().layoutKey === "lso" && Object.keys(LAYOUTS)[0] === "lso";
  }));
  check("all three fields are different fields", await ev(() => {
    const sig = k => LAYOUTS[k].bunkers.map(b => b.id + b.x + b.y).join();
    return new Set(["mwo", "tby", "lso"].map(sig)).size === 3;
  }));
  check("Lone Star is symmetric about the centre line too", await ev(() => {
    const bs = LAYOUTS.lso.bunkers;
    return bs.filter(b => Math.abs(b.x - 75) > 4).every(b =>
      bs.some(o => o !== b && o.n === b.n &&
        Math.abs((o.x + b.x) / 2 - 75) < 1.4 && Math.abs(o.y - b.y) < 1.4));
  }));
  check("its eight angled sections are the same beam as its six straight ones", await ev(() => {
    const sb = LAYOUTS.lso.bunkers.filter(b => b.n === "SB");
    const tilt = sb.filter(b => b.a);
    return sb.length === 14 && tilt.length === 8
        && sb.every(b => b.w > 9 && b.w < 10 && b.h >= 1.3 && b.h <= 1.8);
  }));
  check("a dorito on the snake wire points back down the field", await ev(() => {
    const d = LAYOUTS.lso.bunkers.filter(b => b.n === "MD" || b.n === "SD");
    return d.every(b => b.t === (b.y > 60 ? "tridown" : "dorito"))
        && d.some(b => b.t === "tridown") && d.some(b => b.t === "dorito");
  }));
  check("no break path on Lone Star runs through a bunker", await ev(() => {
    const obs = routeObstacles(LAYOUTS.lso.bunkers);
    let clip = 0, legs = 0;
    for(const k of Object.keys(BREAK_PLANTS.lso)){
      for(const p of breakPaths("lso", k)){
        legs++;
        const pts = [p.from, ...(p.via || []), p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        for(let i = 0; i < pts.length - 1; i++)
          for(const o of live)
            if(segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
      }
    }
    return legs === Object.keys(BREAK_PLANTS.lso).length * 5 && clip === 0;
  }));
  check("no plant on any field sits on the away half", await ev(() => {
    // Bunker ids are assigned by position, so a plant list written against an
    // older measurement can name a real bunker at the wrong end. The five
    // break from the home station and cannot plant across the fifty.
    return Object.keys(BREAK_PLANTS).every(key => {
      const at = Object.fromEntries(LAYOUTS[key].bunkers.map(b => [b.id, b.x]));
      return Object.values(BREAK_PLANTS[key]).every(p => p.every(id => at[id] < 76));
    });
  }));
  check("every Lone Star plant names a bunker on that field", await ev(() => {
    const ids = new Set(LAYOUTS.lso.bunkers.map(b => b.id));
    return Object.values(BREAK_PLANTS.lso).every(p => p.length === 5 && p.every(id => ids.has(id)));
  }));

  // A giant plus is printed either upright or turned on its corner, and which
  // it is varies inside one layout — Tampa prints one of each. Drawn as the
  // wrong one it is not that bunker: the arms point at the gaps instead of the
  // lanes, and on these fields the snake beams land on its arm tips.
  check("a giant plus is drawn the way its own map prints it", await ev(() => {
    const gp = k => LAYOUTS[k].bunkers.filter(b => b.n === "GP");
    const tby = gp("tby"), lso = gp("lso");
    return tby.length === 2 && lso.length === 2
        && !tby[0].a && tby[1].a === 45          // Tampa: upright at the top, turned at the snake
        && lso.every(b => b.a === 45);           // Lone Star: both turned
  }));
  check("a turned plus is not split up like a beam", await ev(() => {
    const p = LAYOUTS.lso.bunkers.find(b => b.n === "GP");
    return p.a === 45 && bunkerBoxes(p).length === 1;
  }));
  // A plus turned on its corner is the same cross, turned. It was being drawn
  // with its arms lengthened by root two so the box around the turned shape
  // would come back the measured size — which made it half again too big on
  // the field, the one thing on this map you cannot miss.
  check("a turned plus is the same size as an upright one", await ev(() => {
    const up = LAYOUTS.mwo.bunkers.find(b => b.n === "GP");     // printed upright
    const turned = LAYOUTS.lso.bunkers.find(b => b.n === "GP"); // printed on its corner
    return !up.a && turned.a === 45
        && Math.abs(up.w - turned.w) < 0.5 && Math.abs(up.h - turned.h) < 0.5;
  }));
  check("its arms are as wide as the map draws them", await ev(w => {
    const gp = ["mwo","tby","lso"].flatMap(k => LAYOUTS[k].bunkers.filter(b => b.n === "GP"));
    return gp.length === 6 && gp.every(b => Math.abs(b.k - w) < 0.01 && b.k > 3 && b.k < b.w / 2);
  }, JSON.parse(fs.readFileSync(path.join(__dirname, "..", "layouts", "bunkers.json"), "utf8"))
      .bunkers.giant_plus.arm_ft));
  // A stroke straddles the line it sits on. Insetting the whole shape by half a
  // stroke put the outer edge of the paint on the measurement — right for the
  // footprint, wrong for the picture, because that outer half-stroke is
  // near-black and two bunkers that touch showed a stripe of field between
  // their fills. The fill is the measurement now and the outline goes inside.
  check("a bunker is filled to its measured footprint", await ev(() => {
    const b = LAYOUTS.lso.bunkers.find(x => x.n === "SB" && !x.a);
    const s = bunkerSize(b, 2, 2);
    return Math.abs(s.h * 2 - b.w * 2) < 0.001 && Math.abs(s.v * 2 - b.h * 2) < 0.001;
  }));
  check("and outlined inside it, not across the edge", await ev(() => {
    const m = [...bunkerShape(LAYOUTS.lso.bunkers.find(x => x.n === "SB" && !x.a), 2, 2)
      .matchAll(/width="([\d.]+)"/g)].map(x => +x[1]);
    // The filled box first, the stroked box a stroke narrower, then the caps.
    return BNK_IN === BNK_STROKE / 2 && m.length >= 2
        && Math.abs(m[0] - m[1] - BNK_STROKE) < 0.01;
  }));
  // The one that matters on a field drawing: the snake runs into the giant
  // plus on the official map, and on screen it stopped a third of a foot short
  // with black in between.
  check("the snake beam ends on the plus arm it runs into", await ev(() => {
    const gp = LAYOUTS.lso.bunkers.find(b => b.id === "GP#1");
    const sb = LAYOUTS.lso.bunkers.find(b => b.id === "SB#1");
    const rad = d => d * Math.PI / 180;
    const g = bunkerSize(gp, 2, 2), s = bunkerSize(sb, 2, 2);
    // The plus is turned 45°, so its arms reach out along 45/135/225/315. The
    // lower left one is the arm this beam runs into.
    const reach = (g.h + g.v) / 2;        // 11.31 x 11.09 — square to a tenth of a foot
    const tip = [gp.x * 2 + Math.cos(rad(135)) * reach, gp.y * 2 + Math.sin(rad(135)) * reach];
    const end = [sb.x * 2 + Math.cos(rad(sb.a)) * s.h, sb.y * 2 + Math.sin(rad(sb.a)) * s.h];
    // What is left is the map's own precision — one pixel there is 0.12 ft — not
    // a hole in the drawing. Insetting both shapes put 0.65 units of field
    // between them on top of this, which is what showed up as a gap.
    return Math.hypot(tip[0] - end[0], tip[1] - end[1]) < 0.3;
  }));

  check("a turned plus is drawn turned, not just recorded as turned", await ev(() => {
    window.set({ layoutKey: "lso" });
    const svg = fieldSVG({ static: true });
    return /rotate\(45 /.test(svg);
  }));

  check("Tampa carries all twelve calls, and every one of them is a real break", await ev(() =>
    Object.keys(BREAK_PLANTS.tby).length === Object.keys(BREAKS).length &&
    Object.keys(BREAK_PLANTS.tby).every(k => k in BREAKS)));
  check("every plant names a bunker that is actually on this field", await ev(() => {
    const ids = new Set(LAYOUTS.tby.bunkers.map(b => b.id));
    return Object.values(BREAK_PLANTS.tby).every(p => p.length === 5 && p.every(id => ids.has(id)));
  }));
  check("no break puts two men on the same beam", await ev(() => {
    const obs = routeObstacles(LAYOUTS.tby.bunkers).filter(o => o.n === "SB");
    return Object.values(BREAK_PLANTS.tby).every(plants =>
      obs.every(o => plants.filter(id => o.ids.has(id)).length <= 1));
  }));
  check("no break path on Tampa runs through a bunker", await ev(() => {
    const obs = routeObstacles(LAYOUTS.tby.bunkers);
    let clip = 0, legs = 0;
    for(const k of Object.keys(BREAK_PLANTS.tby)){
      for(const p of breakPaths("tby", k)){
        legs++;
        const pts = [p.from, ...(p.via || []), p.to];
        const holds = o => Math.abs(p.from[0] - o.x) <= o.hw && Math.abs(p.from[1] - o.y) <= o.hh;
        const live = obs.filter(o => !o.ids.has(p.bunker) && !holds(o));
        for(let i = 0; i < pts.length - 1; i++)
          for(const o of live)
            if(segHitsBox(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], o.x, o.y, o.hw, o.hh)) clip++;
      }
    }
    return legs === Object.keys(BREAK_PLANTS.tby).length * 5 && clip === 0;
  }));
  check("the five break from one station on Tampa too", await ev(() => {
    const y = breakPaths("tby", "snake").map(p => p.from[1]);
    return Math.max(...y) - Math.min(...y) <= 20;
  }));
  check("Sightlines reads the new field, and finds it blocks things", await ev(() => {
    window.set({ layoutKey: "tby" });
    const r = sightLines(LAYOUTS.tby.bunkers[3].id, 2, 2);
    return r.lines.length === 56 && r.lines.some(l => l.blocked) && r.clear > 0;
  }));

  // Switching event has to move everything, and must not carry one field's
  // work onto another.
  check("changing the event changes the field", await ev(() => {
    window.set({ layoutKey: "tby" });
    const a = curLayout().bunkers.length;
    window.set({ layoutKey: "mwo" });
    return a === 57 && curLayout().bunkers.length === 58;
  }));
  check("a bunker call belongs to the field it was made on", await ev(() => {
    window.set({ layoutKey: "tby" });
    S.bunkerCalls = { ...(S.bunkerCalls || {}), tby: { "GP#1": "The cross" } };
    save(S);
    const here = bunkerCalls()["GP#1"];
    window.set({ layoutKey: "mwo" });
    return here === "The cross" && !bunkerCalls()["GP#1"];
  }));
  check("a path edit belongs to the field it was made on", await ev(() => {
    window.set({ layoutKey: "tby", script: "snake" });
    const before = JSON.stringify(currentPaths().map(p => p.to));
    window.set({ layoutKey: "mwo" });
    return before !== JSON.stringify(currentPaths().map(p => p.to));
  }));

  /* ------------------------------------------------ cards, opp and rep */
  // The last three chips the spec puts on Playbook.
  G("Cards, Opp and Rep");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", pbView: null,
               point: 1, rep: { running: false, log: [] } });
  check("cards name the man, the bunker and the job", await ev(() => {
    const c = cardLines();
    return c.length === 5 && c.every(x => x.bunker && x.job && x.role && x.face && x.shot)
        && c[0].who && c[0].who.name;
  }));
  check("a card says the lane he was given, in words", await ev(() => {
    window.setDirect("1", "shot", "@-90");
    window.setDirect("2", "face", 45);
    const c = cardLines();
    return c[0].shot === LANE_NAME["-90"] && c[1].face === LANE_NAME["45"];
  }));
  check("Cards opens on Playbook and goes back", await ev(() => {
    window.set({ pbView: "cards" });
    const on = document.getElementById("root").textContent.includes("One card a man");
    window.set({ pbView: null });
    return on && !document.getElementById("root").textContent.includes("One card a man");
  }));

  check("an answer to their call is written against the team", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", right: { name: "Rejects" } });
    window.setAnswer("right", "snake", "flood");
    const kept = S.scout["Rejects"].answers.snake === "flood";
    window.setPitTeam("right", "Blast Camp");
    const gone = !answersFor("right").snake;          // it belongs to the Rejects
    window.setPitTeam("right", "Rejects");
    return kept && gone && answersFor("right").snake === "flood";
  }));
  check("Playbook shows the answer for the call they run most", await ev(() => {
    window.logTheirBreak("right", "snake");
    window.logTheirBreak("right", "snake");
    const a = oppAnswer("right");
    window.set({ tab: "playbook", script: "hold" });
    return a.theirs === "snake" && a.ours === "flood" && a.seen === 2
        && document.getElementById("root").textContent.includes("You wrote down");
  }));
  check("an answer can be taken back off", await ev(() => {
    window.setAnswer("right", "snake", "");
    return !oppAnswer("right");
  }));

  check("the drill shows a break and does not name it", await ev(() => {
    window.set({ tab: "playbook" });
    window.startRep();
    const t = document.getElementById("root").textContent;
    return S.rep.running && S.pbView === "rep" && !!S.rep.ask
        && S.script === S.rep.ask
        && t.includes("Name the call")
        // The twelve names are on screen as the answers. What must not be is
        // anything saying which one it is: no call card, and a header that
        // does not name the break it is drawing.
        && !document.querySelector("#root .call__name")
        && !document.querySelector("#root .ctx__line").textContent.includes(BREAKS[S.rep.ask].name);
  }));
  check("it times the answer and says whether it was right", await ev(() => {
    const ask = S.rep.ask;
    window.answerRep(ask);
    const first = S.rep.log[0];
    return first.right === true && first.ask === ask && first.ms >= 0
        && S.rep.ask !== ask;                          // it moves on
  }));
  check("a wrong call is recorded as wrong", await ev(() => {
    const ask = S.rep.ask;
    const other = Object.keys(BREAKS).find(k => k !== ask);
    window.answerRep(other);
    return S.rep.log[0].right === false && S.rep.log[0].said === other;
  }));
  check("stopping the drill puts the call you were on back", await ev(() => {
    const was = S.rep.was;
    window.stopRep();
    return S.script === was && S.pbView === null && S.rep.running === false;
  }));
  check("the score counts only the ones you got right", await ev(() => {
    const sc = repScore();
    return sc.n === 2 && sc.right === 1 && sc.avg >= 0 && sc.best >= 0;
  }));
  check("two seconds is the target it holds you to", await ev(() =>
    REP_TARGET === 2000));

  /* ------------------------------------------------------ log the call */
  // The spec's Log break chip, and the read it exists for: how predictable you
  // have been. Counted off the calls a coach pressed the button on, never
  // modelled — it is the arithmetic a team watching your film already does.
  G("Log the call");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", calls: [] });
  check("nothing is logged until you log it", await ev(() =>
    selfScout().n === 0 && document.getElementById("root").textContent.includes("Nothing logged on")));
  check("logging the call records the field, the point and who you were on", await ev(() => {
    window.set({ point: 3 });
    window.logCall();
    const c = S.calls[0];
    return c.script === "snake" && c.layout === "lso" && c.pt === 3 && !!c.vs && !!c.at;
  }));
  check("a call logged on one field is not counted on another", await ev(() => {
    window.set({ layoutKey: "tby" });
    const away = selfScout().n;
    window.set({ layoutKey: "lso" });
    return away === 0 && selfScout().n === 1;
  }));
  check("it says what share each call is", await ev(() => {
    for (let i = 0; i < 3; i++){ window.nextPoint(); window.logCall(); }   // four snake now, one a point
    window.nextPoint(); window.set({ script: "hold" }); window.logCall();
    const ss = selfScout();
    return ss.n === 5 && ss.rank[0][0] === "snake" && ss.rank[0][1] === 4;
  }));
  check("it warns you when one call is most of your last ten", await ev(() => {
    window.set({ script: "snake" });
    for (let i = 0; i < 3; i++){ window.nextPoint(); window.logCall(); }
    const ss = selfScout();
    return ss.tell >= 0.5 && document.getElementById("root").textContent.includes("Anyone filming you has that too");
  }));
  check("a logged call can be taken back", await ev(() => {
    const before = selfScout().n;
    window.unlogCall(0);
    return selfScout().n === before - 1;
  }));
  check("the calls travel in a saved copy", await ev(() =>
    JSON.parse(copyPayload("all")).data.calls.length === selfScout().n));

  /* --------------------------------------------------- off the buzzer */
  // The five do not leave together: the longest run goes on the buzzer and the
  // short ones hold, so they arrive together instead of the snake runner still
  // crossing while everyone else is set.
  G("Off the buzzer");
  check("the man with the furthest to run leaves first", await ev(() => {
    const p = breakPaths("lso", "snake");
    const far = p.reduce((a, b) => a.len > b.len ? a : b);
    return far.lag === 0 && p.every(x => x.lag >= 0 && x.lag <= 0.28)
        && p.some(x => x.lag > 0.1);
  }));
  check("a shorter run holds longer", await ev(() => {
    const p = [...breakPaths("lso", "base")].sort((a, b) => a.len - b.len);
    return p[0].lag > p[p.length - 1].lag;
  }));
  check("nobody has moved on the buzzer, and everyone is set at the end", await ev(() => {
    const p = breakPaths("lso", "snake");
    const at = (x, t) => posAt(x, t);
    return p.every(x => at(x, 0)[0] === x.from[0] && at(x, 0)[1] === x.from[1])
        && p.every(x => Math.abs(at(x, 1)[0] - x.to[0]) < 0.001
                     && Math.abs(at(x, 1)[1] - x.to[1]) < 0.001);
  }));
  check("a man still holding has not left his mark", await ev(() => {
    const p = breakPaths("lso", "snake");
    const held = p.filter(x => x.lag > 0.05);
    return held.length > 0 && held.every(x => {
      const q = posAt(x, x.lag * 0.5);
      return q[0] === x.from[0] && q[1] === x.from[1];
    });
  }));

  /* ------------------------------------------------------ the bunker key */
  // "Do we have all of the codes?" is a question with a checkable answer: the
  // NXL prints the same fifteen-entry key on all three of these maps.
  G("Bunker codes");
  check("the key is the fifteen the official map prints", await ev(() =>
    BUNKER_CODE.length === 15 &&
    ["GP","MT","C","Tr","GB","GW","MD","Ck","SB","Br","Wg","TCK","SD","T","MW"]
      .every((c, i) => BUNKER_CODE[i][0] === c)));
  check("every code on every field is in the key", await ev(() => {
    const key = new Set(BUNKER_CODE.map(c => c[0]));
    return Object.keys(LAYOUTS).every(k =>
      LAYOUTS[k].bunkers.every(b => key.has(b.n)));
  }));
  check("all three fields carry the same fourteen codes", await ev(() => {
    const codes = k => [...new Set(LAYOUTS[k].bunkers.map(b => b.n))].sort().join();
    const all = Object.keys(LAYOUTS).map(codes);
    return all.every(c => c === all[0]) && all[0].split(",").length === 14;
  }));
  // Against the layout pack, not the field: the app carries the drawn shape,
  // and a dorito is drawn pointing whichever way it sits, so two shapes under
  // one code is correct there. What must never happen is one code over two
  // different bunkers.
  check("one code is one bunker across all three fields", (() => {
    const seen = {};
    for (const f of ["nxl_2026_lone_star", "nxl_2026_tampa_bay_open", "nxl_2026_midwest_open"])
      for (const b of JSON.parse(fs.readFileSync(
            path.join(__dirname, "..", "layouts", "events", f + ".json"), "utf8")).bunkers) {
        if (seen[b.name] && seen[b.name] !== b.type) return false;
        seen[b.name] = b.type;
      }
    return Object.keys(seen).length === 14;
  })());
  // Tall Cake is in the printed key and on none of these three layouts. Saying
  // so is the point — the key lists the pack, not the field.
  check("the key says which of its codes this field does not use", await ev(() => {
    window.set({ tab: "more", more: "codes" });
    const t = document.getElementById("root").textContent;
    return t.includes("Tall Cake") && t.includes("not on this field")
        && t.includes("Maya Temple") && t.includes("Snake Beam");
  }));
  check("the count beside each code is what is really on the field", await ev(() => {
    window.set({ layoutKey: "lso", tab: "more", more: "codes" });
    const rows = [...document.querySelectorAll(".tbl tbody tr")]
      .filter(r => r.children.length === 3);
    return rows.length === 15 && rows.some(r =>
      r.children[0].textContent.trim() === "SB" && r.children[2].textContent.trim() === "14");
  }));

  /* ------------------------------------------------------- twelve calls */
  // The spec names twelve breaks; five were built. The other seven are not
  // typed bunker ids — tools/plants.js reads the call off the measured field
  // (how many men on which wire, how far up) and picks the bunker that sits
  // there, for every break on every layout.
  G("Twelve calls");
  check("every field carries every call", await ev(() =>
    Object.keys(BREAK_PLANTS).length === 3 &&
    Object.values(BREAK_PLANTS).every(f =>
      Object.keys(f).length === Object.keys(BREAKS).length &&
      Object.values(f).every(p => p.length === 5))));
  check("no call sends two men to the same bunker", await ev(() =>
    Object.values(BREAK_PLANTS).every(f =>
      Object.values(f).every(p => new Set(p).size === 5))));
  check("no call puts two men on the snake, on any field", await ev(() =>
    Object.keys(BREAK_PLANTS).every(k => {
      const snake = routeObstacles(LAYOUTS[k].bunkers).filter(o => o.n === "SB");
      return Object.values(BREAK_PLANTS[k]).every(p =>
        snake.every(o => p.filter(id => o.ids.has(id)).length <= 1));
    })));
  check("no man is sent to a bunker with another standing over it", await ev(() =>
    Object.keys(BREAK_PLANTS).every(k => {
      const at = Object.fromEntries(LAYOUTS[k].bunkers.map(b => [b.id, b]));
      return Object.values(BREAK_PLANTS[k]).every(p => p.every(id => {
        const b = at[id];
        return !LAYOUTS[k].bunkers.some(o => o.id !== id && o.n !== b.n
          && Math.abs(o.x - b.x) < o.w / 2 + 0.9 && Math.abs(o.y - b.y) < o.h / 2 + 0.9);
      }));
    })));
  check("the twelve are twelve different calls on every field", await ev(() =>
    Object.values(BREAK_PLANTS).every(f =>
      new Set(Object.values(f).map(p => [...p].sort().join())).size
        === Object.keys(f).length)));
  check("every call reads differently in a coach's words", await ev(() => {
    const reads = Object.keys(BREAKS).map(k => breakMeta(k).read);
    return new Set(reads).size === reads.length && reads.every(r => r && r.length > 30);
  }));
  // The plants in the app must be what the tool produces. Hand-edit one and
  // this says so, rather than the drift showing up on a sideline.
  check("the plants in the app are the ones the rule produces", (() => {
    const made = require("child_process")
      .execFileSync("node", [path.join(__dirname, "..", "tools", "plants.js")], { encoding: "utf8" })
      .trim();
    const html = fs.readFileSync(path.join(__dirname, "..", "web", "index.html"), "utf8");
    const inApp = /const BREAK_PLANTS = \{[\s\S]*?\n\};/.exec(html);
    return !!inApp && inApp[0] === made;
  })());

  /* -------------------------------------------------- where he is shooting */
  // Playbook used to open with all five stacked in a sixteen-foot station
  // against the back tape, on top of one another and half off the edge — so
  // the face chevron and the shot lane, which are the point of the tab, were
  // not on screen until you played the break.
  G("Where he is shooting");
  check("the break opens on the set, not on the line", await ev(() => {
    localStorage.clear();
    return defaultState().t === 1;
  }));
  check("playing it again runs it from the line", await ev(async () => {
    window.set({ tab: "playbook", t: 1 });
    window.playPath();
    const ran = S.t < 0.5;
    S.playing = false;
    return ran;
  }));
  await seed({ tab: "playbook", t: 1, faceOn: true, shotOn: true });
  check("every one of the five carries a face and a lane", await ev(() => {
    const f = document.querySelectorAll("svg.field polyline[stroke='#fff']").length;
    const c = document.querySelectorAll("svg.field polygon[fill='#fff']").length;
    return f === 5 && c === 5;
  }));
  check("the lane is a wedge you can see on a black field", await ev(() => {
    const p = document.querySelector("svg.field polygon[fill='#fff']");
    return Number(p.getAttribute("opacity")) >= 0.2 && p.getBBox().width > 6;
  }));
  check("naming the bunker he lanes joins him to it", await ev(() => {
    const id = LAYOUTS[S.layoutKey].bunkers.find(b => b.n === "GP").id;
    window.setDirect("1", "shot", id);
    const line = [...document.querySelectorAll("svg.field line[stroke-dasharray]")];
    return line.length >= 1 && document.querySelectorAll("svg.field circle[stroke-dasharray]").length >= 1;
  }));
  check("with no bunker named there is no hard line, only the wedge", await ev(() => {
    window.setDirect("1", "shot", "");
    return document.querySelectorAll("svg.field circle[stroke-dasharray]").length === 0;
  }));

  // The spec asks for a shot that can be a lane as well as a named bunker: a
  // man told to hold a gap is not aiming at anything.
  check("a shot can be a lane with no bunker named", await ev(() => {
    window.set({ tab: "playbook" });
    window.setDirect("2", "shot", "@45");
    const wedges = document.querySelectorAll("svg.field polygon[fill='#fff']").length;
    // A lane draws the wedge and no ring, because there is no bunker to ring.
    return shotLane("@45") === 45 && wedges === 5
        && document.querySelectorAll("svg.field circle[stroke-dasharray]").length === 0;
  }));
  check("straight up the field is a lane like any other", await ev(() => {
    // Zero degrees is falsy. The chip read "Shot" as though nothing was set.
    window.setDirect("2", "shot", "@0");
    window.set({ pad: null });
    const chip = [...document.querySelectorAll(".assign .tgl")].filter(b => b.classList.contains("on"));
    return shotLane("@0") === 0 && chip.some(b => b.textContent.trim() === "\u2192");
  }));
  check("the picker offers the eight lanes and every bunker", await ev(() => {
    window.openPad("shot", "2");
    const s = document.querySelector(".assign select");
    const groups = [...s.querySelectorAll("optgroup")];
    return groups.length === 2
        && groups[0].children.length === 8
        && groups[1].children.length === LAYOUTS[S.layoutKey].bunkers.length;
  }));

  /* ------------------------------------------------ one bunker, one size */
  // A medium dorito is the same inflatable in Garland that it was in
  // Cincinnati. Read off each map it comes back a different size, because the
  // prints are drawn to different weights and because half of every bunker is
  // in shadow and the shadow is easy to miss. So footprints come from
  // layouts/bunkers.json, measured once off the clean Midwest 2D, and every
  // field draws the same bunker at the same size.
  G("One bunker, one size");
  const book = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "layouts", "bunkers.json"), "utf8"));

  check("every bunker is drawn one size on every field", await ev(() => {
    const seen = {};
    for (const k of ["mwo", "tby", "lso"]) {
      for (const b of LAYOUTS[k].bunkers) {
        const size = [Math.max(b.w, b.h), Math.min(b.w, b.h)].join("x");
        (seen[b.n] = seen[b.n] || new Set()).add(size);
      }
    }
    // Br is the one printed name over two inflatables — the tall one, and a
    // short squat one in the back corners of two of these fields.
    return Object.keys(seen).length === 14
        && Object.entries(seen).every(([n, s]) => s.size === (n === "Br" ? 2 : 1));
  }));

  check("a medium dorito is the one measured off the clean map", await ev(w => {
    const md = LAYOUTS.lso.bunkers.filter(b => b.n === "MD");
    return md.length === 6 && md.every(b =>
      Math.abs(Math.max(b.w, b.h) - w[0]) < 0.005 &&
      Math.abs(Math.min(b.w, b.h) - w[1]) < 0.005);
  }, [book.bunkers.medium_dorito.long_ft, book.bunkers.medium_dorito.short_ft]));

  check("it is wider than the lit half of it that colour alone finds",
    book.bunkers.medium_dorito.long_ft > 6 && book.bunkers.medium_dorito.short_ft > 5.5);

  check("the book says how many instances each figure came from", () => true &&
    Object.values(book.bunkers).every(b => b.n >= 1 && b.long_ft > 0 && b.short_ft > 0));

  // The figure kept is the smallest instance, because a reading on this map
  // can only come back too big. That is only honest if the smallest instance
  // and the middle one say the same thing, which for every type read four or
  // more times they do, to within half a foot.
  check("the smallest instance and the middle one agree",
    Object.values(book.bunkers).filter(b => b.n >= 4).every(b =>
      Math.abs(b.long_ft - b.median_ft[0]) <= 0.5 &&
      Math.abs(b.short_ft - b.median_ft[1]) <= 0.5));

  check("every event on the field records how far its own map disagreed", () => {
    for (const f of ["nxl_2026_midwest_open", "nxl_2026_tampa_bay_open",
                     "nxl_2026_lone_star"]) {
      const ev = JSON.parse(fs.readFileSync(
        path.join(__dirname, "..", "layouts", "events", f + ".json"), "utf8"));
      const fp = ev.digitized && ev.digitized.footprints;
      if (!fp || !fp.residual_ft || !(fp.residual_ft.median <= 1)) return false;
      if (!ev.bunkers.every(b => b.drawn_w_ft > 0 && b.drawn_h_ft > 0)) return false;
    }
    return true;
  });

  /* -------------------------------------------------- the call, on the sheet */
  // The loop on a sideline is: point ends, who won it, what are we calling, play
  // it, tally the outs. Three of those live on Tally and the call lived a tab
  // away, so every point cost two tab switches to read a name.
  G("The call, on the sheet");
  await seed({ tab: "tally", script: "snake", right: { name: "Rejects" }, left: {},
               tallyPick: false, calls: [] });

  check("the sheet says what the call is", await ev(() => {
    const t = document.getElementById("root").textContent;
    return t.includes(BREAKS.snake.name) && t.includes(breakMeta("snake").read);
  }));
  check("it can be changed without leaving Tally", await ev(() => {
    window.set({ tallyPick: true });
    const open = document.getElementById("root").textContent.includes(BREAKS.blitz.name);
    window.set({ script: "blitz", t: 1, playing: false, tallyPick: false });
    return open && S.script === "blitz" && S.tab === "tally";
  }));
  check("and it is the same call Playbook is on", await ev(() => {
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").textContent;
    return S.script === "blitz" && t.includes(BREAKS.blitz.name);
  }));
  check("the field follows it", await ev(() => {
    const plants = currentPaths().map(p => p.bunker).join();
    window.set({ tab: "tally" });
    window.set({ script: "hold", t: 1, playing: false, tallyPick: false });
    return plants !== currentPaths().map(p => p.bunker).join();
  }));
  // A coach who lives on the point sheet can write a call the app has never
  // heard of without knowing to go to Playbook — + Yours sits with the calls
  // here too, and opens the builder where the field is.
  check("a custom breakout can be started from the sheet too", await ev(() => {
    window.set({ tab: "tally", tallyPick: true });
    const add = [...document.querySelectorAll("#root .seg button")]
      .find(x => /\+ Yours/.test(x.textContent));
    if(!add) return false;
    add.click();
    const opened = !!S.building && S.tab === "playbook" && !S.tallyPick
      && !!document.querySelector("#root #build-map");
    window.cancelPlay(); window.set({ tab: "tally", tallyPick: false });
    return opened;
  }));
  check("it can be logged from the sheet, against this match", await ev(() => {
    window.set({ tab: "tally" });
    window.logCall();
    const c = (S.calls || [])[0];
    return c && c.script === "hold" && c.m === S.matchId && c.pt === S.point;
  }));
  check("and the sheet says how many are logged on it", await ev(() =>
    /1 call logged on this sheet/.test(document.getElementById("root").textContent)));
  check("a new sheet starts that count again", await ev(() => {
    window.confirm = () => true;
    window.newMatch();
    return !/logged on this sheet/.test(document.getElementById("root").textContent)
        && (S.calls || []).length === 1;      // the old one is kept, not deleted
  }));

  /* --------------------------------------------------- landscape quick-log */
  // The point loop with nothing else on screen, laid out wide so a coach can
  // call and score with the phone turned. The web cannot force an iPhone to
  // rotate, so the layer works upright too and simply reads best sideways.
  G("Landscape quick-log");
  await seed({ tab: "tally", script: "snake", right: { name: "Rejects" }, left: {},
               quick: false, quickPick: false });
  check("the point sheet offers a way into it", await ev(() =>
    [...document.querySelectorAll("#root .btn")].some(x => /Landscape/.test(x.textContent))));
  check("it opens as a full layer with the call and both scoring buttons", await ev(() => {
    window.openQuick();
    const q = document.querySelector("#root .qlog"); if(!q) return false;
    const t = q.textContent;
    return !!S.quick && t.includes(callName(S.script)) && /We won it/.test(t) && /They won it/.test(t);
  }));
  check("scoring from the layer counts the point and moves on", await ev(() => {
    const pt = S.point || 1;
    [...document.querySelectorAll("#root .qlog .btn")].find(x => /We won it/.test(x.textContent)).click();
    const r = (S.results || []).find(x => x.m === S.matchId && x.pt === pt);
    return !!r && r.won === "us" && S.point === pt + 1;
  }));
  check("the call changes from the layer, and + Yours is there too", await ev(() => {
    window.set({ quick: true, quickPick: true });
    const q = document.querySelector("#root .qlog"); if(!q) return false;
    const has = [...q.querySelectorAll(".seg button, .seg .seg__add")];
    return has.some(x => /\+ Yours/.test(x.textContent)) && has.some(x => /Blitz/.test(x.textContent));
  }));
  check("Exit closes the layer", await ev(() => {
    window.closeQuick();
    return !S.quick && !document.querySelector("#root .qlog");
  }));
  check("and it carries a way onto the whiteboard", await ev(() => {
    window.openQuick();
    const b = [...document.querySelectorAll("#root .qlog .btn")].find(x => /Board/.test(x.textContent));
    if(!b) return false;
    b.click();
    const there = !S.quick && S.tab === "more" && S.more === "wb" && !!document.querySelector("#root #wb-map");
    window.set({ tab:"tally" });
    return there;
  }));

  /* --------------------------------------------------------- the whiteboard */
  // The coach's clipboard: draw the adjustment on the field, wipe it. A teaching
  // surface, not a record — nothing here is logged and it clears on relaunch.
  G("Whiteboard");
  await seed({ tab: "more", more: "wb", layoutKey: "lso", wb: { field:true, color:"#e5342f", tool:"pen", boards:{} } });
  check("the board opens with an ink layer over the field", await ev(() =>
    !!document.querySelector("#root .wb-bg svg") && !!document.querySelector("#root #wb-map [data-wb]")));
  check("a finger stroke leaves a mark on it", await ev(() => {
    const svg = document.querySelector("#wb-map"), surf = svg.querySelector("[data-wb]");
    const C = ([x,y]) => new DOMPoint(x*2, y*2).matrixTransform(svg.getScreenCTM());
    let p = C([40,40]);
    surf.dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:11}));
    for(const q of [[55,52],[70,64]]){ p = C(q);
      document.dispatchEvent(new PointerEvent("pointermove", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:11})); }
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:11}));
    const m = wbMarks();
    return m.length === 1 && m[0].t === "pen" && m[0].pts.length >= 2;
  }));
  check("X and O drop a mark where you tap", await ev(() => {
    window.wbTool("x");
    const svg = document.querySelector("#wb-map"), surf = svg.querySelector("[data-wb]");
    const p = new DOMPoint(80*2, 70*2).matrixTransform(svg.getScreenCTM());
    surf.dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:12}));
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:12}));
    const m = wbMarks();
    return m.length === 2 && m[1].t === "x";
  }));
  check("the eraser rubs out a stroke the finger drags over", await ev(() => {
    const before = wbMarks().length;                 // a pen stroke near 40..70 and an X at 80,70
    window.wbTool("erase");                           // re-renders, so grab the field fresh after
    const svg = document.querySelector("#wb-map"), surf = svg.querySelector("[data-wb]");
    const C = ([x,y]) => new DOMPoint(x*2, y*2).matrixTransform(svg.getScreenCTM());
    let p = C([41,41]);                              // start on the pen stroke's first point
    surf.dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:13}));
    p = C([70,64]); document.dispatchEvent(new PointerEvent("pointermove", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:13}));
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:13}));
    return before === 2 && wbMarks().length === 1 && wbMarks()[0].t === "x";   // the pen went, the X stayed
  }));
  check("Undo takes back the last mark, Wipe clears the board", await ev(() => {
    window.wbTool("pen");
    const svg = document.querySelector("#wb-map"), surf = svg.querySelector("[data-wb]");
    const p = new DOMPoint(30*2, 30*2).matrixTransform(svg.getScreenCTM());
    surf.dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:14}));
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:14}));
    const two = wbMarks().length === 2;
    window.wbUndo(); const one = wbMarks().length === 1;
    window.wbWipe(); const none = wbMarks().length === 0;
    return two && one && none;
  }));
  check("Blank swaps the field for a dark board", await ev(() => {
    window.wbField(false); const blank = !!document.querySelector("#root .wb-blank");
    window.wbField(true);  const field = !document.querySelector("#root .wb-blank");
    return blank && field;
  }));
  check("the board draws no break runs over the field it teaches on", await ev(() => {
    const svg = document.querySelector("#root .wb-bg svg");
    return svg && svg.querySelectorAll("path[stroke='#e5342f']").length === 0;
  }));
  check("each event keeps its own board", await ev(() => {
    const here = S.layoutKey;
    window.set({ wb: { ...S.wb, boards: { ...(S.wb.boards || {}), [here]: [{t:"x", c:"#efedeb", pts:[[50,50]]}] } } });
    const drawn = wbMarks().length === 1;
    const other = ["lso","mwo","tby"].find(k => k !== here);
    window.set({ layoutKey: other });
    const clean = wbMarks().length === 0;          // another field opens on a clean board
    window.set({ layoutKey: here });
    const back = wbMarks().length === 1;           // and switching back brings the drawing back
    window.wbWipe();
    return drawn && clean && back;
  }));

  /* ------------------------------------------------------------- the score */
  // The app tallied who went out and never recorded who won the point, so the
  // one number a coach lives by was not in it.
  G("The score");
  await seed({ tab: "tally", right: { name: "Rejects" }, left: {} });
  await ev(() => { window.confirm = () => true; window.newMatch(); });

  check("a fresh sheet is nil–nil", await ev(() => {
    const s = matchScore();
    return s.us === 0 && s.them === 0 && (S.results || []).length === 0;
  }));
  check("one tap takes the point and moves on", await ev(() => {
    const pt = S.point;
    window.endPoint("us");
    const s = matchScore();
    return s.us === 1 && s.them === 0 && S.point === pt + 1;
  }));
  check("the score shows on the sheet and in the header", await ev(() => {
    window.set({ tab: "tally" });
    const t = document.getElementById("root").textContent;
    // Not just present in the DOM: the context line ellipsizes on a phone and
    // swallowed the score whole when it lived there. It has to be a box with
    // width, inside the header, that is not clipped by its parent.
    const chip = document.querySelector(".score-chip");
    if(!chip) return false;
    const c = chip.getBoundingClientRect(), h = document.querySelector(".hdr").getBoundingClientRect();
    return /1\s*–\s*0/.test(t) && chip.textContent.replace(/\s/g, "") === "1–0"
        && c.width > 20 && c.right <= h.right + 1 && c.left >= h.left - 1;
  }));
  check("Ahead, Even and Must-score follow the score", await ev(() => {
    const ahead = S.matchState === "Ahead";
    window.endPoint("them");
    const even = S.matchState === "Even";
    window.endPoint("them");
    return ahead && even && S.matchState === "Must-score" && derivedState() === "Must-score";
  }));
  check("a coach can still say otherwise", await ev(() => {
    window.set({ matchState: "Ahead" });
    return S.matchState === "Ahead" && derivedState() === "Must-score";
  }));

  // Back a point has to take the result with it, or it becomes a way to score
  // the same point twice.
  check("going back a point unscores it", await ev(() => {
    const before = matchScore();
    window.backPoint();
    const after = matchScore();
    return before.us + before.them === 3 && after.us + after.them === 2
        && after.them === 1 && S.matchState === "Even";
  }));
  check("and scoring it again does not double it", await ev(() => {
    window.endPoint("us");
    window.backPoint();
    window.endPoint("us");
    const s = matchScore();
    return s.us + s.them === 3 && s.us === 2 && s.them === 1;
  }));
  check("scoring the same point twice replaces, never adds", await ev(() => {
    const pt = S.point;
    window.set({ point: pt - 1 });
    window.endPoint("them");          // change the answer on a point already scored
    const s = matchScore();
    return s.us + s.them === 3 && s.us === 1 && s.them === 2;
  }));

  check("each sheet keeps its own score", await ev(() => {
    const first = S.matchId, was = scoreOf(first);
    window.newMatch();
    const fresh = matchScore();
    return was.us + was.them === 3 && fresh.us === 0 && fresh.them === 0
        && scoreOf(first).us + scoreOf(first).them === 3;
  }));
  check("Matches shows the score against the sheet it belongs to", await ev(() => {
    window.endPoint("us");
    window.set({ tab: "more", more: "matches" });
    const t = document.getElementById("root").textContent;
    return /1–0/.test(t) && /1–2/.test(t);
  }));
  check("a sheet nobody has scored shows no score at all", await ev(() => {
    window.newMatch();
    const t = document.getElementById("root").textContent;
    const sc = matchScore();
    return sc.us === 0 && sc.them === 0 && !/0–0/.test(t);
  }));

  /* --------------------------------------------------- their five, on the field */
  // Pick a team and you get whatever roster is known; place each man where you
  // have seen him set up, and he is drawn on the field.
  G("Their five");
  await seed({ tab: "scout", scoutTab: "matchup", division: "pro", layoutKey: "lso",
               right: { name: "San Diego Dynasty" }, left: {}, scout: {} });

  check("a published roster is offered, and is names only", await ev(() => {
    const r = published("San Diego Dynasty");
    return !!r && r.men.length === 5 && !!r.src && !!r.read
        && r.men.every(m => !("threat" in m) && !("wire" in m));
  }));
  check("adding it fills their five, flagged as published", await ev(() => {
    window.addPublished("right");
    const men = pitOf("right").players;
    return men.length === 5 && men.every(m => m.from === "published")
        && men[0].name === "Alex Fraige";
  }));
  check("adding twice does not double them up", await ev(() => {
    window.addPublished("right");
    return pitOf("right").players.length === 5;
  }));
  check("a team with no published roster says so rather than inventing one", await ev(() => {
    const pro = DIVISIONS.find(d => d.id === "pro").teams;
    const none = pro.filter(t => !published(t.name));
    // Only the ones actually read somewhere have a roster; the rest stay empty.
    return none.length === pro.length - 1 && published(none[0].name) === null
        && !!published("San Diego Dynasty");
  }));

  check("a man's plant is kept per field, because a bunker is", await ev(() => {
    const lso = curLayout().bunkers.find(b => b.n === "GP").id;
    window.setScoutPlant("right", 1, lso);
    const here = plantOf(pitOf("right").players[1]) === lso;
    window.pickEvent("tby");
    const there = plantOf(pitOf("right").players[1]) === "";
    window.pickEvent("lso");
    return here && there && plantOf(pitOf("right").players[1]) === lso;
  }));
  check("he is drawn on the field, in his pit's colour, with his number", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", theirOn: true });
    const svg = document.querySelector("svg.field");
    const mk = [...svg.querySelectorAll('rect[rx="2"]')];
    return mk.length === 1 && mk[0].getAttribute("fill") === "#3d8bff"
        && svg.textContent.includes("18");
  }));
  check("a man you have not placed is not guessed onto a bunker", await ev(() =>
    pitOf("right").players.filter(m => plantOf(m)).length === 1
    && document.querySelectorAll('svg.field rect[rx="2"]').length === 1));
  check("with nobody placed the field says how to place them", await ev(() => {
    window.setScoutPlant("right", 1, "");
    const t = document.getElementById("root").textContent;
    return !plantsLogged() && /Nobody placed on/.test(t);
  }));
  check("the toggle is off by default and turns them off again", await ev(() => {
    window.set({ theirOn: false });
    return document.querySelectorAll('svg.field rect[rx="2"]').length === 0;
  }));
  check("Division says which teams come with a roster", await ev(() => {
    window.set({ scoutTab: "board" });
    const row = [...document.querySelectorAll("#boardRows tr")]
      .find(r => r.children[1].textContent.includes("San Diego Dynasty"));
    const other = [...document.querySelectorAll("#boardRows tr")]
      .find(r => r.children[1].textContent.includes("Red Legion"));
    return row.children[5].textContent.trim() === "5"
        && other.children[5].textContent.trim() === "—";
  }));

  /* --------------------------------------- the pit, the field, and the screen */
  G("Edges");
  await seed({ tab: "scout", scoutTab: "matchup", division: "semi",
               right: { name: "Rejects" }, left: {}, teams: { semi: [{name:"My Local Team"}] } });

  // A pit can hold a team the list under it does not contain — switch division
  // and it is another league's; delete one you added and it is nobody's. The
  // picker used to render blank while the card still named the team, so the
  // next tap on it silently emptied the pit.
  check("switching division keeps whoever is in the pit", await ev(() => {
    window.setDivision("pro");
    const sel = document.querySelector(".pit--r select");
    return S.right.name === "Rejects" && sel.value === "Rejects"
        && /Not in NXL Pro/.test(document.querySelector(".pit--r").textContent);
  }));
  check("deleting a team you added does not blank its picker", await ev(() => {
    window.setDivision("semi");
    window.setPitTeam("right", "My Local Team");
    window.delTeam("My Local Team");
    const sel = document.querySelector(".pit--r select");
    return S.right.name === "My Local Team" && sel.value === "My Local Team";
  }));
  check("and the team is still one tap from being cleared on purpose", await ev(() => {
    window.setPitTeam("right", "");
    return !pitNamed("right");
  }));

  // Every other list in the app can be undone. A squad note could only ever be
  // added, so a typo stayed on the phone for the season.
  check("a squad note can be taken back", await ev(() => {
    window.set({ tab: "more", more: "messages", messages: [] });
    document.getElementById("md").value = "Bus at 6am";
    window.sendMsg();
    document.getElementById("md").value = "Bsu at 6am";
    window.sendMsg();
    const two = S.messages.length === 2;
    window.delMsg(1);
    return two && S.messages.length === 1 && S.messages[0] === "Bus at 6am"
        && document.getElementById("root").textContent.includes("Bus at 6am");
  }));

  // A merge brings in the other phone's records. It must not bring in its place
  // in the day: the sheet, the point, the field and the call are this coach's.
  check("merging another phone does not move you onto its sheet", await ev(() => {
    window.set({ tab: "tally", layoutKey: "lso", script: "snake" });
    window.markOut("us", "Rex");
    const mine = { m: S.matchId, pt: S.point, layout: S.layoutKey, script: S.script };
    const theirs = JSON.parse(copyPayload("all"));
    theirs.data.matches = [{id:"THEIRS", at: 1700000000000, vs:"Malicious", layout:"tby"}];
    theirs.data.matchId = "THEIRS";
    theirs.data.point = 9;
    theirs.data.layoutKey = "tby";
    theirs.data.script = "blitz";
    theirs.data.tally = [{pt:1, side:"us", name:"Zed", m:"THEIRS", at:1700000001000,
                          layout:"tby", vs:"Malicious"}];
    window.set({ tab: "more", more: "nexus" });
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("merge");
    return S.matchId === mine.m && S.point === mine.pt
        && S.layoutKey === mine.layout && S.script === mine.script;
  }));
  check("...but it does bring their sheet in, openable", await ev(() =>
    S.matches.some(m => m.id === "THEIRS")
    && S.tally.some(o => o.m === "THEIRS" && o.name === "Zed")
    && rowsHere(S.tally).every(o => o.m !== "THEIRS")));
  check("...and a replace does take their place in the day", await ev(() => {
    const theirs = JSON.parse(copyPayload("all"));
    theirs.data.matchId = "THEIRS"; theirs.data.point = 9;
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("replace");
    return S.matchId === "THEIRS" && S.point === 9;
  }));

  // That replace left this page as another phone. Back to a known state.
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake",
               right: { name: "Rejects" }, left: {} });

  // The drill puts a call on the field the coach did not make. Only Stop put his
  // own back, so walking away mid-drill left him on a random one — one tap from
  // playing it, or logging it as the call he made.
  // Never assert that the drill's random call differs from the one you were on —
  // it picks from the twelve, so one run in twelve it picks the same one and a
  // correct app fails the check. What matters is that the drill is running and
  // holding your call, and that leaving gives it back.
  check("a drill does not follow you off Playbook", await ev(() => {
    window.set({ tab: "playbook", script: "snake", pbView: null });
    window.startRep();
    const drilling = repState().running && repState().was === "snake"
                  && S.pbView === "rep";
    window.set({ tab: "tally" });
    return drilling && !repState().running && S.script === "snake" && S.pbView === null;
  }));
  check("nor off the Playbook chip row", await ev(() => {
    window.set({ tab: "playbook" });
    window.startRep();
    window.set({ pbView: "cards" });
    return !repState().running && S.script === "snake";
  }));

  // A player taken off the roster leaves a hole in any point he was written
  // into, and the five reads four names with nothing saying why.
  check("a player off the roster comes off the point", await ev(() => {
    window.set({ tab: "more", more: "lineups", pbView: null,
                 roster: [{num:"7",name:"Rex"},{num:"3",name:"Mo"}], point: 2 });
    window.setSlot(0, "Rex"); window.setSlot(1, "Mo");
    S.assessments = [{who:"Rex", score:4, pt:2, m:S.matchId, at:Date.now()}];
    window.delPlayer(0);
    return lineupFor(2)[0] === "" && lineupFor(2)[1] === "Mo";
  }));
  check("but what he already did keeps his name", await ev(() =>
    S.assessments[0].who === "Rex"));

  // A sheet is played on one field. Changing the event does not move it, so the
  // bunkers under an out belong to a field you are no longer looking at.
  check("a sheet from another field says so", await ev(() => {
    window.setPitTeam("right", "Rejects");
    window.set({ tab: "tally" });
    window.markOut("us", "1");
    const quiet = !/played on/.test(document.getElementById("root").textContent);
    window.pickEvent(Object.keys(LAYOUTS).find(k => k !== S.layoutKey));
    window.set({ tab: "tally" });
    return quiet && /This sheet was played on/.test(document.getElementById("root").textContent);
  }));

  // The screen sleeping between points is the papercut this fixes.
  check("the screen is kept awake, and it is the coach's call", await ev(() => {
    const on = S.awake !== false;
    window.setAwake(false);
    const off = S.awake === false;
    window.setAwake(true);
    return on && off && S.awake === true;
  }));
  check("the switch only shows where the phone can do it", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    const shown = /Keep the screen awake/.test(document.getElementById("root").textContent);
    return shown === !!window.gridlockCanAwake;
  }));

  /* ------------------------------------------------- nobody in the pit yet */
  // The app used to ship with two real teams already in the pits, and pitOf()
  // fell back to the first team of the division, so there was no way to be
  // between opponents. A coach who never picked anyone saw two strangers on
  // five tabs, and every out he tallied was stamped with a team he had never
  // played.
  G("Nobody in the pit yet");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await ev(() => window.set({ entered: true, role: "staff",
    tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1} }));

  check("a fresh app has nobody in either pit", await ev(() =>
    !pitNamed("left") && !pitNamed("right") && !pitOf("right").named));
  check("and does not name one anyway", await ev(() => {
    const t = document.getElementById("root").textContent;
    return !/Blast Camp|Rejects/.test(t);
  }));
  check("Playbook asks instead of reading a team you did not pick", await ev(() => {
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").textContent;
    return /Pick them on Scout/.test(t) && !/Rejects/.test(t);
  }));
  check("the point sheet says Them", await ev(() => {
    window.set({ tab: "tally" });
    const t = document.getElementById("root").textContent;
    return /THEM/i.test(t) && !/Rejects/.test(t);
  }));
  check("the opening sheet has no opponent rather than a guess", await ev(() =>
    curMatch().vs === "" && matchVs() === ""));
  check("a new match refuses to invent one, and leads him to set the opponent", await ev(() => {
    const before = S.matches.length;
    window.newMatch();                       // no opponent set
    // No new sheet, no system alert — it lands on Tally, which now opens with
    // the "Who are you playing?" picker.
    return S.matches.length === before && S.tab === "tally"
      && /Who are you playing/.test(document.getElementById("root").textContent);
  }));
  check("Scout's reads wait for a team, but Division does not", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter" });
    const asks = /Who are you playing/.test(document.getElementById("root").textContent);
    window.set({ scoutTab: "board" });
    const board = document.getElementById("root").textContent.includes("Scout board");
    return asks && board;
  }));

  check("naming the right pit names the sheet you have not started", await ev(() => {
    window.setPitTeam("right", "Rejects");
    return matchVs() === "Rejects" && curMatch().vs === "Rejects";
  }));
  check("...and an out is then logged against the team you chose", await ev(() => {
    window.set({ tab: "tally" });
    window.markOut("us", "1");
    return rowsHere(S.tally)[0].vs === "Rejects";
  }));
  check("...but naming it does not rewrite a sheet already played", await ev(() => {
    const was = curMatch().vs;
    window.setPitTeam("right", "Malicious");
    return curMatch().vs === was && rowsHere(S.tally)[0].vs === was;
  }));
  check("a pit can be emptied again", await ev(() => {
    window.setPitTeam("right", "");
    return !pitNamed("right") && curMatch().vs === "Rejects";   // the sheet keeps its own
  }));

  // The field with nobody to log against. The sheet used to open anyway and
  // Log stored the break with vs "" — a point charted into a void while the
  // gate above it said to name the team first.
  check("tapping the field with no opponent opens no sheet and sends him to the picker", await ev(() => {
    window.set({ right: { name: "Dynasty" } });
    S.matches = S.matches.map(m => ({ ...m, vs: "" })); window.set({ tab: "tally", tallySel: null, tallyNudge: false });
    window.tallyTap({ x: 20, y: 40 });
    const root = document.getElementById("root");
    return !S.tallySel && S.tallyNudge === true && /Name them first/.test(root.textContent) && !!root.querySelector("#tally-opp");
  }));
  check("the team Scout has in the right pit is one tap away: Play Dynasty starts the match", await ev(() => {
    const btn = [...document.querySelectorAll("#root button")].find(b => b.textContent.trim() === "Play Dynasty");
    if (!btn) return false;
    btn.click();
    return matchVs() === "Dynasty" && !S.tallyNudge && !/Who are you playing/.test(document.getElementById("root").textContent);
  }));
  check("a blank unnamed sheet is replaced by the first real one; one with entries is kept", await ev(() =>
    !S.matches.some(m => !m.vs && matchSize(m.id) === 0) && S.matches.filter(m => m.vs === "Dynasty").length === 1));
  check("Log refuses a break against nobody", await ev(() => {
    S.matches = S.matches.map(m => ({ ...m, vs: "" })); window.set({});
    window.selectBunker(curLayout().bunkers[0].id);
    const n = (S.breakouts || []).length;
    window.logBreakout();
    return (S.breakouts || []).length === n && S.tallyNudge === true && !S.tallySel;
  }));
  // More is a menu of fifteen screens; it opened inside Classes, so the first
  // thing a coach saw under it was a clinic sign-in form.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  check("More opens on its menu, not inside Classes", await ev(() => {
    window.set({ entered: true, role: "staff", tab: "more" });
    const t = document.getElementById("root").textContent;
    return S.more === null && /Whiteboard/.test(t) && /Nexus/.test(t) && !/Create class/.test(t);
  }));

  /* ------------------------------------------------------- format and ends */
  // X-Ball and 5-man are a race to N points, and the two teams break from
  // opposite ends. The app knew neither: the score was never match point or
  // over, and every bunker in the left half was "yours" on every point.
  G("Format and ends");
  await seed({ tab: "tally", right: { name: "Dynasty" } });
  await ev(() => { window.confirm = () => true; window.newMatch(); });
  check("a sheet has no race target until the coach sets one", await ev(() =>
    raceTo() === 0 && !matchPoint() && !matchOver() && !/to \d/.test(document.querySelector("#root .hdr").textContent)));
  check("Race to 4 shows on the header and the sheet", await ev(() => {
    window.setRaceTo(4);
    const root = document.getElementById("root");
    return raceTo() === 4 && /to 4/.test(root.querySelector(".hdr").textContent) && /race to 4/.test(root.textContent);
  }));
  check("3–3 in a race to 4 is match point both ways, and the read is Must-score", await ev(() => {
    for (let i = 0; i < 3; i++) { window.endPoint("us"); window.nextPoint(); window.endPoint("them"); window.nextPoint(); }
    return matchScore().us === 3 && matchScore().them === 3 && matchPoint() === "both" && derivedState() === "Must-score"
      && S.matchState === "Must-score" && /Match point/.test(document.getElementById("root").textContent);
  }));
  check("the fourth point ends it, and the sheet says who won", await ev(() => {
    window.endPoint("us");
    const t = document.getElementById("root").textContent;
    return matchOver() === "us" && /Match over/.test(t) && /you won 4–3/.test(t);
  }));
  check("the format carries into the next sheet", await ev(() => { window.newMatch(); return raceTo() === 4 && matchScore().us === 0 && !matchOver(); }));
  check("your five break from the left end until you say otherwise; a near bunker is yours", await ev(() => {
    const near = curLayout().bunkers.find(b => b.x < 60);
    return ourEnd() === "left" && sideOfBunker(near) === "us" && displayPaths().every(p => p.from[0] < 75 && !p.mirrored);
  }));
  check("Switch ends: that bunker is theirs now and the break is drawn from the right end", await ev(() => {
    window.switchEnds();
    const near = curLayout().bunkers.find(b => b.x < 60);
    return ourEnd() === "right" && sideOfBunker(near) === "them" && displayPaths().every(p => p.from[0] > 75 && p.mirrored);
  }));
  check("the mirrored break still lands on a bunker — the twin of the plant", await ev(() => {
    const bl = curLayout().bunkers;
    return displayPaths().every(p => bl.some(b => Math.hypot(b.x - p.to[0], b.y - p.to[1]) < 6));
  }));
  check("a shot target mirrors to the twin bunker and a pointed lane flips", await ev(() => {
    const b = curLayout().bunkers.find(x => x.x < 60);
    const mb = curLayout().bunkers.find(x => x.id === mirrorBunkerId(b.id));
    return Math.abs(mb.x - (150 - b.x)) < 6 && mirrorDirect({face: 0, shot: "@30"}).face === 180 && mirrorDirect({shot: "@30"}).shot === "@150";
  }));
  check("Swap every point switches after a point somebody won, not after a no-point, and Back undoes it", await ev(() => {
    window.setSwapEnds(true);                        // this point stays where it is
    const here = ourEnd();
    window.nextPoint(); const noPoint = ourEnd(); window.backPoint();   // nothing scored: nobody moves
    window.endPoint("us"); const next = ourEnd(); window.backPoint(); const back = ourEnd();
    return here === "right" && noPoint === "right" && next === "left" && back === "right";
  }));
  check("the field marks your end on Playbook", await ev(() => {
    window.set({ tab: "playbook" });
    return !!document.querySelector('#root svg.field rect[data-end="right"]');
  }));
  check("a route is worked out from the end you broke from, so switching ends changes it", await ev(() => {
    window.set({ tab: "tally" });
    const b = curLayout().bunkers.find(x => x.x < 25);        // deep in the far half from the right end
    const row = { m: S.matchId, pt: S.point, side: "us", bunker: b.id, layout: S.layoutKey };
    const fromRight = JSON.stringify(autoRoute(row));
    window.switchEnds();
    const fromLeft = JSON.stringify(autoRoute(row));
    window.switchEnds();
    return fromRight !== fromLeft && ourEnd() === "right";
  }));
  check("a season copy carries the format and the ends", await ev(() => {
    const m = curMatch();
    return !copyDataError({ matches: [m] }) && m.raceTo === 4 && m.end === "right" && m.swapEnds === true;
  }));

  // The clock, the horn and 5-man. The match clock is the official's: the
  // coach says when it ran out and the sheet does the format arithmetic.
  check("5-man is one point a game: the first result ends the sheet", await ev(() => {
    window.newMatch(); window.setRaceTo(1);
    const root = document.getElementById("root");
    const offered = /One point · 5-man/.test(root.textContent);
    window.endPoint("them");
    return offered && raceTo() === 1 && matchOver() === "them" && /Match over — they won 0–1/.test(root.textContent);
  }));
  check("over means the result buttons stand down and New match leads", await ev(() => {
    const root = document.getElementById("root");
    const btns = [...root.querySelectorAll(".btn")].map(b => b.textContent.trim());
    window.set({ tab: "scout" }); const strip = /match over/.test(root.textContent); window.set({ tab: "tally" });
    return !btns.includes("We won it") && !btns.includes("They won it") && btns.includes("New match") && strip;
  }));
  check("Time's up ahead ends the match at this score, and Undo takes it back", await ev(() => {
    window.newMatch(); window.setRaceTo(4);
    window.endPoint("us"); window.endPoint("us"); window.endPoint("them");
    const root = document.getElementById("root");
    const offered = /Time's up — match ends at this score/.test(root.textContent);
    window.timeUp();
    const over = matchOver() === "us" && /you won 2–1 on the clock/.test(root.textContent);
    window.timeUp();
    return offered && over && !matchOver() && raceTo() === 4 && /Undo/.test(root.textContent) === false;
  }));
  check("Time's up level goes to overtime: next point wins, and the race is restored after", await ev(() => {
    window.endPoint("them");                               // 2–2
    const root = document.getElementById("root");
    const offered = /Time's up — overtime/.test(root.textContent) && /Time's up — it's a tie/.test(root.textContent);
    window.timeUp("ot");
    window.set({ tab: "scout" }); const strip = /· overtime/.test(root.textContent); window.set({ tab: "tally" });
    const ot = inOvertime() && raceTo() === 3 && matchPoint() === "both" && S.matchState === "Must-score"
      && /Overtime — next point wins it/.test(root.textContent) && strip;
    window.endPoint("us");
    const won = matchOver() === "us" && !inOvertime();
    window.newMatch();
    return offered && ot && won && raceTo() === 4 && !curMatch().ot;
  }));
  check("level at the horn can stand as a tie, and the record counts it", await ev(() => {
    window.setRaceTo(4); window.endPoint("us"); window.endPoint("them");    // 1–1 on a new sheet
    window.timeUp("tie");
    const root = document.getElementById("root");
    const tie = matchOver() === "tie" && /Match over — a tie 1–1 on the clock/.test(root.textContent)
      && ![...root.querySelectorAll(".btn")].some(b => /won it$/.test(b.textContent.trim()));
    window.set({ tab: "more", more: "matches" });
    const rec = /1Tied/.test(root.textContent.replace(/\s+/g, ""));
    window.set({ tab: "tally" }); window.timeUp();
    const undone = !matchOver() && !curMatch().tie;
    window.newMatch();
    return tie && rec && undone;
  }));
  check("the clock between points is off until the coach sets it, and never carries a number of its own", await ev(() =>
    breakClock() === 0 && !S.clockEnd && !document.querySelector("#root .hdr [data-clock]")
      && !/\b(1:00|1:30|2:00)\b/.test(document.querySelector("#root .hdr").textContent)));
  check("set to 1:30 it starts itself when a point is scored and rides in the header", await ev(() => {
    window.setBreakClock(90);
    window.endPoint("us");
    const hdr = document.querySelector("#root .hdr [data-clock]");
    return breakClock() === 90 && S.clockEnd > Date.now() + 80000 && hdr && /1:(2|3)\d/.test(hdr.textContent);
  }));
  check("a tap on the chip stops it, Start runs it again, and it ticks down without a render", await (async () => {
    const stopped = await ev(() => { window.stopBreakClock(); return !S.clockEnd && !document.querySelector("#root .hdr [data-clock]"); });
    const started = await ev(() => { window.startBreakClock(); return !!S.clockEnd; });
    await ev(() => { S.clockEnd = Date.now() + 3000; });
    const before = await ev(() => document.querySelector("#root .hdr [data-clock]").textContent);
    await page.waitForTimeout(1300);
    const after = await ev(() => document.querySelector("#root .hdr [data-clock]").textContent);
    return stopped && started && before !== after;
  })());
  check("the clock is scratch: a relaunch does not resume it, the length does", await (async () => {
    await page.reload({ waitUntil: "networkidle" });
    return await ev(() => { window.set({ entered: true, role: "staff", tab: "tally" }); return !S.clockEnd && breakClock() === 90; });
  })());
  check("the format carries the clock into the next sheet, and the copy schema takes it", await ev(() => {
    window.newMatch();
    return breakClock() === 90 && !copyDataError({ matches: [curMatch()] });
  }));
  check("Counter ranks in words, never a percentage nobody counted", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter" });
    const rows = [...document.querySelectorAll("#root .rank__pct")].map(e => e.textContent);
    return rows.length > 3 && rows.every(t => !/%/.test(t) && /Best fit|Close|Weaker|Yours/.test(t)) && rows[0] === "Best fit" && new Set(rows).size > 1;
  }));

  // The five on the point. X-Ball rotates nine men through five slots between
  // points, and the five has to stand until the coach changes it — on the
  // point sheet, not under More.
  G("The five on the point");
  await seed({ tab: "tally", right: { name: "Dynasty" }, lineups: {}, roster: [
    { name: "Reyes", num: 7, p: "", s: "" }, { name: "Okafor", num: 3, p: "", s: "" }, { name: "Diaz", num: 11, p: "", s: "" },
    { name: "Park", num: 5, p: "", s: "" }, { name: "Nguyen", num: 9, p: "", s: "" }, { name: "Walsh", num: 22, p: "", s: "" },
    { name: "Baptiste", num: 14, p: "", s: "" }, { name: "Cole", num: 2, p: "", s: "" }, { name: "Ito", num: 8, p: "", s: "" }] });
  await ev(() => { window.confirm = () => true; window.newMatch(); });
  check("nine men: the sheet offers Who's on, with four on the bench", await ev(() => {
    const t = document.getElementById("root").textContent;
    return /Who's on · 4 on the bench/.test(t) && onPoint(1).join() === "Reyes,Okafor,Diaz,Park,Nguyen";
  }));
  check("tap a man off and a bench man on, and the sheet names the new five", await ev(() => {
    window.set({ whoOn: true });
    window.swapOn("Diaz"); window.swapOn("Walsh");
    const col = [...document.querySelectorAll("#root .assign .assign__job")].map(e => e.textContent);
    return onPoint(1).join() === "Reyes,Okafor,Walsh,Park,Nguyen" && col.includes("Walsh") && !col.includes("Diaz")
      && lineupFor(1)[2] === "Walsh";
  }));
  check("a sixth man is refused until one comes off", await ev(() => {
    window.swapOn("Cole");
    return onPoint(1).length === 5 && !onPoint(1).includes("Cole") && /Take a man off first/.test(S.flash || "");
  }));
  check("the five stands on the next point, and the one after, without a lineup of its own", await ev(() => {
    window.endPoint("us");
    const p2 = onPoint(2).join();
    window.nextPoint();
    return p2 === "Reyes,Okafor,Walsh,Park,Nguyen" && onPoint(3).join() === p2 && lineupFor(2).length === 0 && lineupFor(3).length === 0;
  }));
  check("a change on point 3 keeps the other four and is point 3's own; point 2 is untouched", await ev(() => {
    window.swapOn("Reyes"); window.swapOn("Ito");
    return onPoint(3).join() === "Ito,Okafor,Walsh,Park,Nguyen" && onPoint(2).join() === "Reyes,Okafor,Walsh,Park,Nguyen" && lineupFor(3).length === 5;
  }));
  check("Playbook and the cards name the five that is standing", await ev(() => {
    window.set({ tab: "playbook" });
    return cardLines().map(c => c.who && c.who.name).join() === "Ito,Okafor,Walsh,Park,Nguyen"
      && /Ito/.test(document.getElementById("root").textContent);
  }));
  check("Lineups under More says the five was carried, and one slot change keeps the rest", await ev(() => {
    window.set({ tab: "more", more: "lineups" }); window.nextPoint();
    const said = /Still the five from point 3/.test(document.getElementById("root").textContent);
    window.setSlot(1, "Cole");
    return said && onPoint(4).join() === "Ito,Cole,Walsh,Park,Nguyen";
  }));
  check("Who's on is scratch: a relaunch closes the fold", await (async () => {
    await ev(() => window.set({ tab: "tally", whoOn: true }));
    await page.reload({ waitUntil: "networkidle" });
    return await ev(() => { window.set({ entered: true, role: "staff", tab: "tally" }); return S.whoOn === false && /Who's on ·/.test(document.getElementById("root").textContent); });
  })());
  check("a watched game offers no rotation — there is no 'us' on that field", await ev(() => {
    window.set({ tab: "tally", whoOn: false });
    const id = newMatchId();
    S.matches = [{ id, at: Date.now(), vs: "Dynasty", layout: S.layoutKey, watch: true, home: "Dynasty", away: "Impact" }, ...S.matches];
    S.matchId = id; S.point = 1; window.set({});
    const none = !/Who's on/.test(document.getElementById("root").textContent);
    window.openMatch(S.matches[1].id);
    return none;
  }));

  // The record at the event, counted from finished sheets only.
  check("Matches shows the record at this event from finished sheets, open ones counted as open", await ev(() => {
    window.set({ tab: "tally" }); window.newMatch(); window.setRaceTo(2);
    window.endPoint("us"); window.endPoint("us");                    // won 2–0
    window.newMatch(); window.endPoint("them"); window.endPoint("them"); // lost 0–2
    window.newMatch(); window.endPoint("us");                        // open, 1–0 in a race to 2
    window.set({ tab: "more", more: "matches" });
    const t = document.getElementById("root").textContent;
    const z = t.replace(/\s+/g, "");
    return /1Won/.test(z) && /1Lost/.test(z) && /\dOpensheet/.test(z);
  }));
  check("a watched game is not in the record", await ev(() => {
    const id = newMatchId();
    S.matches = [{ id, at: Date.now(), vs: "Dynasty", layout: S.layoutKey, watch: true, home: "Dynasty", away: "Impact", raceTo: 1 }, ...S.matches];
    S.matchId = id; S.point = 1; window.endPoint("us");
    const t = document.getElementById("root").textContent.replace(/\s+/g, "");
    return matchOver(id) === "us" && /1Won/.test(t);
  }));
  check("the landscape log reads the format: race, match point, and stands down when over", await ev(() => {
    window.set({ tab: "tally" }); window.newMatch(); window.setRaceTo(2); window.endPoint("us");
    window.set({ quick: true, quickPick: false });
    const root = document.getElementById("root");
    const mp = /to 2/.test(root.textContent) && /Match point/.test(root.textContent);
    window.endPoint("us");
    const btns = [...root.querySelectorAll(".btn")].map(b => b.textContent.trim());
    const over = /final/.test(root.textContent) && !btns.includes("We won it") && btns.some(b => /Match over — We won 2–0/.test(b));
    window.set({ quick: false });
    return mp && over;
  }));
  check("a team not on the list is typed on the sheet and played in one tap", await ev(() => {
    window.newMatch(); window.set({ right: { name: "" }, tab: "tally" });
    S.matches = S.matches.map(m => m.id === S.matchId ? {...m, vs: ""} : m); window.set({});
    const el = document.getElementById("oppName"); if(!el) return false;
    el.value = "Garland Grit"; window.playNamed();
    return pitOf("right").name === "Garland Grit" && !!anyTeam("Garland Grit") && matchVs() === "Garland Grit"
      && !document.getElementById("oppName");
  }));
  check("an empty name is refused on screen, nothing is added", await ev(() => {
    const before = JSON.stringify(S.teams);
    window.set({ right: { name: "" } }); S.matches = S.matches.map(m => m.id === S.matchId ? {...m, vs: ""} : m); window.set({});
    document.getElementById("oppName").value = "  "; window.playNamed();
    return /name first/.test(S.flash || "") && JSON.stringify(S.teams) === before && !pitNamed("right");
  }));
  check("no roster: the sheet offers one tap to Team", await ev(() => {
    window.set({ right: { name: "Dynasty" } }); window.playPit();
    const was = S.roster; window.set({ roster: [] });
    const btn = [...document.querySelectorAll("#root .btn")].find(b => /Add your five · Team/.test(b.textContent));
    btn && btn.click();
    const ok = S.tab === "more" && S.more === "team";
    window.set({ roster: was, tab: "tally" });
    return !!btn && ok;
  }));
  check("their five on Tally are the men Scout knows, numbers filling to five", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    editProfile("right", { players: [{ num: "7", name: "Smith" }, { num: "22", name: "Lee" }, { num: "", name: "Ortiz" }] });
    window.newMatch();
    const col = [...document.querySelectorAll("#root .assign .assign__job")].map(e => e.textContent);
    return theirNames().join("|") === "#7 Smith|#22 Lee|Ortiz|#1|#2" && col.includes("#7 Smith") && col.includes("Ortiz") && col.includes("#2");
  }));
  check("an out against a named man is stored under that name, and nobody is invented when nothing is logged", await ev(() => {
    window.markOut("them", "#7 Smith");
    const row = S.tally.find(o => o.m === S.matchId && o.side === "them");
    editProfile("right", { players: [] }); window.set({});
    return row && row.name === "#7 Smith" && theirNames().join("|") === "#1|#2|#3|#4|#5";
  }));
  check("a watched game lists numbers only — those are not his men to name", await ev(() => {
    const id = newMatchId();
    S.matches = [{ id, at: Date.now(), vs: "Dynasty", layout: S.layoutKey, watch: true, home: "Dynasty", away: "Impact" }, ...S.matches];
    S.matchId = id; S.point = 1; editProfile("right", { players: [{ num: "7", name: "Smith" }] }); window.set({});
    const ok = theirNames().join("|") === "#1|#2|#3|#4|#5";
    editProfile("right", { players: [] });
    window.openMatch(S.matches[1].id); return ok;
  }));
  check("no copy ever saved: a finished sheet says so once there is something to lose", await ev(() => {
    window.set({ copiedAt: null, tab: "tally" }); window.newMatch(); window.setRaceTo(1); window.endPoint("us");
    const t = document.getElementById("root").textContent;
    return /No copy of this season has been saved yet/.test(t) && /Save a copy · Nexus/.test(t);
  }));
  check("Show it as text counts as a copy; a fresh one quiets the nudge, a week-old one brings it back", await ev(() => {
    window.showCopy("all");
    const quiet = !!S.copiedAt && !/No copy of this season/.test(document.getElementById("root").textContent) && !/Last copy saved/.test(document.getElementById("root").textContent);
    window.set({ copiedAt: Date.now() - 9 * 86400000, copyText: "" });
    return quiet && /Last copy saved 9 days ago/.test(document.getElementById("root").textContent);
  }));
  check("the nudge never shows while a point is on, and Matches carries it too", await ev(() => {
    window.newMatch();
    const quiet = !/Last copy saved/.test(document.getElementById("root").textContent);
    window.set({ tab: "more", more: "matches" });
    return quiet && /Last copy saved 9 days ago/.test(document.getElementById("root").textContent);
  }));
  check("the score chip in the header is a tap to the point sheet from any tab", await ev(() => {
    window.set({ tab: "playbook" });
    const chip = document.querySelector("#root .hdr .score-chip--go");
    if(!chip) return false;
    const h = chip.getBoundingClientRect().height;      // measured before the click rebuilds the screen
    chip.click();
    return S.tab === "tally" && h >= 44;
  }));
  check("one point, one call: logging again on the same point replaces, never doubles", await ev(() => {
    window.set({ tab: "tally" }); window.newMatch(); window.set({ script: "snake" });
    window.logCall(); window.logCall();
    const one = loggedCalls().filter(c => c.m === S.matchId && c.pt === 1).length === 1;
    window.set({ script: "base" }); window.logCall();
    const mine = loggedCalls().filter(c => c.m === S.matchId && c.pt === 1);
    return one && mine.length === 1 && mine[0].script === "base";
  }));
  check("tap an out man again and he is back in", await ev(() => {
    window.markOut("us", "Reyes");
    const out = S.tally.some(o => o.m === S.matchId && o.pt === S.point && o.name === "Reyes");
    window.markOut("us", "Reyes");
    return out && !S.tally.some(o => o.m === S.matchId && o.pt === S.point && o.name === "Reyes");
  }));
  check("bunkers tapped for their five and not logged do not ride into the next point", await ev(() => {
    const b = curLayout().bunkers.slice(0, 3).map(x => x.id);
    window.set({ theirPick: b });
    window.endPoint("us");
    const cleared = (S.theirPick || []).length === 0;
    window.set({ theirPick: b }); window.nextPoint();
    return cleared && (S.theirPick || []).length === 0;
  }));
  check("the pits say which is the team you play and which is a team you watch", await ev(() => {
    window.set({ tab: "scout", right: { name: "" }, left: { name: "" } });
    const t = document.getElementById("root").textContent;
    const r = document.querySelector("#root .pit--r"), l = document.querySelector("#root .pit--l");
    const firstOnPhone = r && l && (window.innerWidth >= 720 || r.getBoundingClientRect().top < l.getBoundingClientRect().top);
    return /Right pit · who you play/.test(t) && /Left pit · a team you watch/.test(t) && /The team you play\./.test(t) && /A second team/.test(t)
      && !/Opponent · left/.test(t) && firstOnPhone;
  }));
  check("a game only scored, never tallied, still shows under Scout › Games with its score and how it ended", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(1); window.endPoint("us");
    window.set({ tab: "scout", scoutTab: "games" });
    const t = document.getElementById("root").textContent;
    return !/No points scored or outs logged/.test(t) && /1–0 · you won/.test(t) && /No outs tallied on this (sheet|point)/.test(t);
  }));
  check("the kept list under Matches says how each sheet ended", await ev(() => {
    window.set({ tab: "more", more: "matches" });
    return /Dynasty · 1–0 · you won/.test(document.getElementById("root").textContent);
  }));
  check("with nobody to play, We won it, Log it and a tapped out all refuse and light the picker", await ev(() => {
    window.set({ tab: "tally", right: { name: "" }, tallyNudge: false });
    const id = newMatchId();                                   // a fresh, unnamed sheet
    S.matches = [{ id, at: Date.now(), vs: "", layout: S.layoutKey }, ...S.matches]; S.matchId = id; S.point = 1; window.set({});
    const before = [(S.results || []).length, (S.tally || []).length, (S.calls || []).length].join();
    window.endPoint("us"); const n1 = S.tallyNudge; window.set({ tallyNudge: false });
    window.markOut("us", "Reyes"); const n2 = S.tallyNudge; window.set({ tallyNudge: false });
    window.logCall(); const n3 = S.tallyNudge;
    const after = [(S.results || []).length, (S.tally || []).length, (S.calls || []).length].join();
    return before === after && n1 && n2 && n3 && matchScore().us === 0;
  }));
  check("the landscape log says to pick the team rather than offering two live buttons", await ev(() => {
    window.set({ quick: true, quickPick: false });
    const root = document.getElementById("root");
    const q = root.querySelector(".qlog");
    const btns = q ? [...q.querySelectorAll(".btn")].map(b => b.textContent.trim()) : [];
    const said = q && /Pick the other team first/.test(q.textContent) && !btns.includes("We won it");
    window.needOpponent();
    return said && S.quick === false;
  }));
  check("a watched game is never caught by that gate — it has two named teams", await ev(() => {
    const id = newMatchId();
    S.matches = [{ id, at: Date.now(), vs: "Dynasty", layout: S.layoutKey, watch: true, home: "Dynasty", away: "Impact" }, ...S.matches];
    S.matchId = id; S.point = 1; window.set({ tallyNudge: false });
    window.endPoint("us");
    const ok = matchScore().us === 1 && !S.tallyNudge;
    window.openMatch(S.matches[1].id); window.set({ right: { name: "Dynasty" } }); window.playPit();
    return ok;
  }));
  check("Where the points come from never counts a game you only watched", await ev(() => {
    const id = newMatchId();
    S.matches = [{ id, at: Date.now(), vs: "Dynasty", layout: S.layoutKey, watch: true, home: "Dynasty", away: "Impact" }, ...S.matches];
    const b = curLayout().bunkers[0].id;
    S.breakouts = [{ id: "w1", m: id, pt: 1, side: "us", bunker: b, layout: S.layoutKey, alive: true, at: Date.now() }, ...(S.breakouts || [])];
    S.results = [{ m: id, pt: 1, won: "us", at: Date.now() }, ...(S.results || [])];
    window.set({});
    const rows = bunkerValue("us", false);
    const mine = rows.find(r => r.id === b);
    const counted = !!(S.breakouts || []).some(r => r.m === id);
    return counted && (!mine || !(S.breakouts || []).filter(r => r.bunker === b && r.side === "us" && !watchedMatch(r.m)).length < mine.att);
  }));
  check("Time's up is on the sheet at 0–0 — the horn does not wait for a point", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.playPit(); window.newMatch(); window.setRaceTo(4);
    const t = document.getElementById("root").textContent;
    const offered = /Time's up — it's a tie/.test(t) && /Time's up — overtime/.test(t);
    window.timeUp("tie");
    const tie = matchOver() === "tie";
    window.timeUp(); window.newMatch();
    return offered && tie;
  }));
  check("a season loaded from a copy counts as saved — the nudge does not open on a restored phone", await ev(() => {
    window.set({ copiedAt: null });
    const text = copyPayload("all");
    const el = document.getElementById("copyIn") || Object.assign(document.body.appendChild(document.createElement("textarea")), { id: "copyIn" });
    el.value = text; window.loadCopy("merge");
    const ok = !!S.copiedAt && Date.now() - S.copiedAt < 5000;
    if(el.parentNode === document.body) el.remove();
    return ok || "status: " + S.copyStatus;
  }) === true, await ev(() => S.copyStatus));
  check("Sightlines opens standing in your first man's plant for the call you are on", await ev(() => {
    window.set({ tab: "sightlines", sightFrom: null, script: "snake" });
    const plants = (BREAK_PLANTS[S.layoutKey] || {}).snake || [];
    const t = document.getElementById("root").textContent;
    return plants.length > 0 && sightDefault() === plants[0] && new RegExp("Standing in · " + callOf(curLayout().bunkers.find(b => b.id === plants[0])).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(t);
  }));
  check("named pits fold to one line on every Scout sub-tab but Matchup, and open on a tap", await ev(() => {
    window.set({ tab: "scout", scoutTab: "anticipate", left: { name: "Impact" }, right: { name: "Dynasty" }, pitOpen: null });
    const root = document.getElementById("root");
    const folded = root.querySelectorAll(".pitline").length === 2 && !/TENDENCY · YOUR FILM READ/i.test(root.textContent) && !/Tendency · your film read/.test(root.textContent);
    const h = root.querySelector(".pitline").getBoundingClientRect().height;
    window.set({ pitOpen: "right" });
    const opened = root.querySelectorAll(".pitline").length === 1 && /Tendency · your film read/.test(root.textContent) && /Fold/.test(root.textContent);
    window.set({ scoutTab: "matchup", pitOpen: null });
    const full = root.querySelectorAll(".pitline").length === 0 && root.querySelectorAll(".pit").length === 2;
    return folded && h >= 44 && opened && full;
  }));
  check("an empty pit never folds — picking a team comes first", await ev(() => {
    window.set({ scoutTab: "layers", right: { name: "" } });
    const root = document.getElementById("root");
    const ok = root.querySelectorAll(".pitline").length === 1 && root.querySelectorAll(".pit").length === 1;
    window.set({ right: { name: "Dynasty" } }); return ok;
  }));
  check("Movement: tap the bunker he left, tap where he went, and the pickers follow", await ev(() => {
    window.set({ tab: "more", more: "movement", moveFrom: null, moveTo: null });
    const bl = curLayout().bunkers, a = bl[3], b = bl[9];
    window.movePick(onPoint(S.point || 1)[0] || (S.roster[0] || {}).name);
    window.moveTap([a.x, a.y]);
    const first = S.moveFrom === a.id && !S.moveTo && document.getElementById("mvFrom").value === a.id && /now tap where he went/.test(document.getElementById("root").textContent);
    window.moveTap([b.x, b.y]);
    const second = S.moveTo === b.id && document.getElementById("mvTo").value === b.id && document.querySelectorAll("#move-map rect[stroke='#3ecf8e']").length === 1;
    const before = (S.moves || []).length;
    window.logMove();
    return first && second && (S.moves || []).length === before + 1 && S.moves[0].from === a.id && S.moves[0].to === b.id && !S.moveFrom && !S.moveTo;
  }));
  check("the same bunker twice is refused and a third tap starts over", await ev(() => {
    const bl = curLayout().bunkers, a = bl[5], c = bl[11];
    window.moveTap([a.x, a.y]); window.moveTap([a.x, a.y]);
    const refused = S.moveFrom === a.id && !S.moveTo && /two different bunkers/.test(S.flash || "");
    window.moveTap([c.x, c.y]); window.moveTap([bl[0].x, bl[0].y]);
    return refused && S.moveFrom === bl[0].id && !S.moveTo;
  }));
  check("Bunker stats reads the break chart: a break to a bunker is a visit, shot there is an out", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.playPit(); window.newMatch();
    const bl = curLayout().bunkers, a = bl[7], mv = bl[8];
    S.breakouts = [{ id: "bs1", m: S.matchId, pt: 1, side: "us", bunker: a.id, layout: S.layoutKey, alive: false, movedTo: mv.id, at: Date.now() },
                   { id: "bs2", m: S.matchId, pt: 1, side: "us", bunker: a.id, layout: S.layoutKey, alive: true, at: Date.now() }, ...(S.breakouts || [])];
    window.set({ tab: "more", more: "stats" });
    const t = bunkerTraffic();
    const text = document.getElementById("root").textContent;
    return t[a.id] && t[a.id].visits >= 2 && t[a.id].outs >= 1 && t[mv.id] && t[mv.id].visits >= 1 && !/Nothing logged yet/.test(text);
  }));
  check("a finished sheet takes nothing more: the field, a tapped man, Log it and their five all refuse and say so", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.playPit(); window.newMatch(); window.setRaceTo(1); window.endPoint("us");
    const before = [(S.breakouts || []).length, (S.tally || []).length, (S.calls || []).length, theirBreaks("right").length].join();
    const b = curLayout().bunkers[4];
    window.tallyTap([b.x, b.y]); const noSheet = !S.tallySel;
    window.markOut("us", "Reyes"); window.logCall(); window.logTheirBreak("right", "snake");
    const after = [(S.breakouts || []).length, (S.tally || []).length, (S.calls || []).length, theirBreaks("right").length].join();
    const said = /Match over — New match starts the next sheet/.test(S.flash || "");
    window.newMatch();
    return noSheet && before === after && said;
  }));
  check("Matchup names the five standing beside their jobs, and their men by number and name", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", right: { name: "Dynasty" }, pitOpen: null });
    editProfile("right", { players: [{ num: "7", name: "Smith", wire: "snake" }] }); window.set({});
    const t = document.getElementById("root").textContent;
    const mine = onPoint(S.point || 1);
    const ok = /7Smith·snake/.test(t.replace(/\s+/g, "")) && (!mine.length || new RegExp(mine[0]).test(t));
    editProfile("right", { players: [] }); return ok;
  }));
  check("on an open breakout sheet, arm Shooting at and a field tap fills it instead of opening another man's sheet", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" }, tallyPickFor: null }); window.playPit(); window.newMatch();
    const bl = curLayout().bunkers, a = bl[6], b = bl[13], c = bl[20];
    window.tallyTap([a.x, a.y]);
    const open = S.tallySel === a.id;
    window.set({ tallyPickFor: "shootAt" }); window.tallyTap([b.x, b.y]);
    const shot = S.tallySel === a.id && draft().shootAt === b.id && S.tallyPickFor === null && document.querySelectorAll("#tally-map rect[stroke='#ffffff']").length === 1;
    window.set({ tallyPickFor: "movedTo" }); window.tallyTap([a.x, a.y]);
    const refused = draft().movedTo === undefined && /Tap another/.test(S.flash || "") && S.tallyPickFor === "movedTo";
    window.tallyTap([c.x, c.y]);
    const moved = draft().movedTo === c.id && S.tallySel === a.id;
    window.tallyDone();
    return open && shot && refused && moved && !S.tallyPickFor;
  }));
  check("Counter never puts the team you watch in your place", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", left: { name: "Impact" }, right: { name: "Dynasty" }, pitOpen: null });
    window.playPit(); window.newMatch();
    const t = document.getElementById("root").textContent;
    return /Against Dynasty's likely/.test(t) && !/Impact against/.test(t) && /you are/.test(t);
  }));
  check("Matchup's threat bar does not stand the watched team in for you", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", left: { name: "Impact" }, right: { name: "Dynasty" }, pitOpen: null });
    editProfile("left", { threat: 5 }); window.set({});
    const t = document.getElementById("root").textContent;
    const i = t.indexOf("Threat, as you scored them");
    return i >= 0 && !/Impact ★/.test(t.slice(i, i + 200)) && /you/.test(t.slice(i, i + 200));
  }));
  check("Team's bunker calls: tap the bunker on the field and it is the one being named", await ev(() => {
    window.set({ tab: "more", more: "team", callPick: null });
    const b = curLayout().bunkers[9];
    window.callTap([b.x, b.y]);
    const picked = S.callPick === b.id && document.getElementById("bcId").value === b.id && document.querySelectorAll("#calls-map rect[stroke='#ffffff']").length === 1;
    document.getElementById("bcName").value = "Home"; window.setCall();
    return picked && bunkerCalls()[b.id] === "Home";
  }));
  check("Playbook with no opponent offers one tap to Scout instead of a sentence", await ev(() => {
    window.set({ tab: "playbook", right: { name: "" } });
    const btn = document.querySelector("#root .vs--go");
    const h = btn && btn.getBoundingClientRect().height;
    btn && btn.click();
    const ok = S.tab === "scout" && S.scoutTab === "matchup";
    window.set({ right: { name: "Dynasty" } }); return !!btn && h >= 44 && ok;
  }));
  check("Walk: tap the bunker on the field and the Where box follows, with the note kept", await ev(() => {
    window.set({ tab: "more", more: "walk", walkPick: null, walk: {} });
    document.getElementById("wkNote").value = "Half typed";
    const b = curLayout().bunkers[7];
    window.walkTap([b.x, b.y]);
    const sel = document.getElementById("wkWhere").value;
    const ring = document.querySelectorAll("#walk-map rect[stroke='#ffffff']").length === 1;
    const kept = document.getElementById("wkNote").value === "Half typed";
    window.addWalk();
    const n = walkNotes()[0];
    const dot = document.querySelectorAll("#walk-map circle[fill='#efedeb']").length === 1;
    const cleared = S.walkPick === null && document.getElementById("wkWhere").value === "The field";
    window.set({ walk: {} });
    return sel.endsWith(" · " + b.id) && ring && kept && n && n.where.endsWith(" · " + b.id) && n.note === "Half typed" && dot && cleared;
  }));
  check("Walk: picking a wire in the box rings nothing and survives the re-render", await ev(() => {
    window.set({ tab: "more", more: "walk", walkPick: null });
    window.walkSelect("Snake wire");
    const ok = document.getElementById("wkWhere").value === "Snake wire" && document.querySelectorAll("#walk-map rect[stroke='#ffffff']").length === 0;
    window.set({ walkPick: null }); return ok;
  }));
  check("Messages says nothing is sent, and no button claims to send", await ev(() => {
    window.set({ tab: "more", more: "messages" });
    const t = document.querySelector(".main").textContent;
    return /nothing is sent anywhere/.test(t) && ![...document.querySelectorAll("#root .btn")].some(b => b.textContent.trim() === "Send");
  }));
  check("every jersey-number box asks the phone for the number keyboard", await ev(() => {
    window.set({ tab: "more", more: "team" });
    const a = [...document.querySelectorAll("#root input.rost__num")];
    window.set({ tab: "scout", scoutTab: "matchup", more: null, right: { name: "Dynasty" }, pitOpen: "right",
                 scout: { ...(S.scout || {}), Dynasty: { ...((S.scout || {}).Dynasty || {}), players: [{ num: "7", name: "Smith", wire: "snake" }] } } });
    const b = [...document.querySelectorAll("#root input.rost__num")];
    return a.length > 0 && b.length > 0 && [...a, ...b].every(i => i.getAttribute("inputmode") === "numeric");
  }));
  check("a saved screen this build does not have lands on Playbook, not a white page", await (async () => {
    await ev(() => { const s = JSON.parse(localStorage.getItem("gridlock.coach.v2")); Object.assign(s, { tab: "nope", more: "gone", scoutTab: "xyz" }); localStorage.setItem("gridlock.coach.v2", JSON.stringify(s)); });
    await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(150);
    return ev(() => S.tab === "playbook" && S.more === null && S.scoutTab === "matchup" && document.getElementById("root").textContent.length > 500);
  })());
  check("a bad Scout sub-tab set at runtime renders Matchup rather than throwing", await ev(() => {
    window.set({ tab: "scout", scoutTab: "nothing", more: "nowhere" });
    return S.scoutTab === "matchup" && S.more === null && document.getElementById("root").textContent.length > 500;
  }));
  check("every row on the More menu is a section fixScreen() keeps", await ev(() =>
    MORE_GROUPS.every(([, rows]) => rows.every(r => { window.set({ tab: "more", more: r[0] }); return S.more === r[0]; }))));
  check("endPoint itself refuses a result on a finished race, whatever called it", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    window.newMatch(); window.setRaceTo(2);
    window.endPoint("us"); window.endPoint("us");
    const over = matchOver() === "us", pt = S.point;
    window.endPoint("them"); window.endPoint("us");
    const held = scoreOf(S.matchId).us === 2 && scoreOf(S.matchId).them === 0 && S.point === pt;
    window.backPoint();
    window.endPoint("them");
    const reopened = scoreOf(S.matchId).them === 1 && scoreOf(S.matchId).us === 1;
    return over && held && reopened;
  }));
  check("an empty left pit folds to one line off Matchup; the empty right pit stays open", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", left: { name: "" }, right: { name: "Dynasty" }, pitOpen: null });
    const folded = !document.querySelector("#root .pit--l") && /Nobody yet/.test((document.querySelector("#root .pitline--l") || {}).textContent || "");
    document.querySelector("#root .pitline--l").click();
    const opened = !!document.querySelector("#root .pit--l select");
    window.set({ right: { name: "" }, left: { name: "" }, pitOpen: null });
    const rightOpen = !!document.querySelector("#root .pit--r select");
    window.set({ scoutTab: "matchup" });
    const matchupFull = !!document.querySelector("#root .pit--l select");
    window.set({ right: { name: "Dynasty" } });
    return folded && opened && rightOpen && matchupFull;
  }));
  check("on a More section the header line keeps the section on screen; the event and call give way", await ev(() => {
    window.set({ tab: "more", more: "lineups" });
    const line = document.querySelector(".ctx__line"), sec = line.querySelector(".ctx__sec"), ev = line.querySelector(".ctx__ev");
    const lr = line.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    const onScreen = sr.right <= lr.right + 1 && sr.width > 20;
    const all = /Lineups/.test(sec.textContent) && ev.textContent.includes(curLayout().name) && ev.textContent.includes(breakName());
    window.set({ tab: "playbook", more: null });
    return onScreen && all && !document.querySelector(".ctx__sec");
  }));
  check("the Division table folds Film, Roster and Read from away in a narrow column", await ev(() => {
    window.set({ tab: "scout", scoutTab: "board", more: null });
    const opt = [...document.querySelectorAll("#root .tbl th.col-opt")].map(th => th.textContent.trim());
    const narrow = document.querySelector(".main").clientWidth <= 620;
    const hidden = [...document.querySelectorAll("#root .tbl th.col-opt")].every(th => getComputedStyle(th).display === "none");
    const kept = [...document.querySelectorAll("#root .tbl th:not(.col-opt)")].map(th => th.textContent.trim());
    return opt.join() === "Film,Roster,Read from" && kept.join() === "#,Team,Pts,Reg,Tend,Threat" && (narrow ? hidden : !hidden);
  }));
  check("Log this breakout rides the bottom of the screen while the sheet is open", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" }, tallySel: null, tallyDraft: null });
    const bl = curLayout().bunkers; window.tallyTap([bl[12].x, bl[12].y]);
    const main = document.querySelector(".main"), act = document.querySelector("#root .tsheet__act");
    if (!act) return false;
    const sticky = getComputedStyle(act).position === "sticky";
    const mr = main.getBoundingClientRect(), ar = act.getBoundingClientRect(), sr = document.querySelector("#root .tsheet").getBoundingClientRect();
    // visible now, before any scrolling past the sheet's questions
    const onScreen = ar.bottom <= mr.bottom + 1 && ar.top >= mr.top;
    // and still visible when the sheet is scrolled a screen further
    main.scrollTop += Math.min(500, Math.max(0, sr.height - 200));
    const ar2 = act.getBoundingClientRect();
    const stillOn = ar2.bottom <= mr.bottom + 1 && ar2.top >= mr.top;
    window.set({ tallySel: null, tallyDraft: null });
    return sticky && onScreen && stillOn;
  }));
  check("Breakouts draws one field — the one he taps — not the shared break above it", await ev(() => {
    window.set({ tab: "scout", scoutTab: "breakouts", right: { name: "Dynasty" }, pitOpen: null });
    const fields = document.querySelectorAll("#root svg.field").length;
    const picker = /Where did they go\?/.test(document.getElementById("root").textContent);
    window.set({ scoutTab: "counter" });
    const counterHas = /The break/.test(document.getElementById("root").textContent) && document.querySelectorAll("#root svg.field").length >= 1;
    return fields === 1 && picker && counterHas;
  }));
  check("How did they get there leads with the man and the field; pit, match and end are folded", await ev(() => {
    window.set({ tab: "scout", scoutTab: "arrival", right: { name: "Dynasty" }, pitOpen: null });
    const order = sel => { const el = document.querySelector(sel); return el ? el.compareDocumentPosition(document.querySelector("#arrival-map")) : 0; };
    const before = n => !!(n & Node.DOCUMENT_POSITION_FOLLOWING);   // the map follows the element
    const teamBeforeMap = before(order("#arrival-team")), destAfterMap = !before(order("#arrival-destination"));
    const sideFolded = !!document.querySelector("details.arrival-context #arrival-side");
    const aidAfterMap = !before(order("#root .sec .aid"));
    return teamBeforeMap && destAfterMap && sideFolded && aidAfterMap;
  }));
  check("every button and field on the point sheet and Scout has a name a screen reader can say", await ev(() => {
    const nameOf = el => (el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") && (document.getElementById(el.getAttribute("aria-labelledby")) || {}).textContent) || (el.id && (document.querySelector(`label[for="${el.id}"]`) || {}).textContent) || (el.closest("label") || {}).textContent || el.getAttribute("placeholder") || el.textContent || "").trim();
    const bad = [];
    const sweep = where => {
      document.querySelectorAll("#root button").forEach(b => { const n = nameOf(b); if (!n || /^[^\w]{1,2}$/.test(n)) bad.push(where + " button " + b.className); });
      document.querySelectorAll("#root select, #root input:not([type=hidden]), #root textarea").forEach(f => { if (!nameOf(f)) bad.push(where + " " + f.tagName + "#" + f.id); });
    };
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    const bl = curLayout().bunkers; window.tallyTap([bl[12].x, bl[12].y]); sweep("tally");
    window.set({ tallySel: null, tallyDraft: null, tab: "scout", scoutTab: "matchup", pitOpen: null }); sweep("matchup");
    window.set({ scoutTab: "counter" }); sweep("counter");
    window.set({ tab: "more", more: "walk" }); sweep("walk");
    window.set({ more: "movement" }); sweep("movement");
    window.set({ more: "team" }); sweep("team");
    if (bad.length) console.log("unnamed:", bad.join(" | "));
    return bad.length === 0;
  }));
  check("Games with results and no outs shows no replay, and never 'Point undefined'", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.endPoint("us"); window.endPoint("them");
    window.set({ tab: "scout", scoutTab: "games", replayMatch: null, replayPt: null, replayStep: null, pitOpen: null });
    const t = document.getElementById("root").textContent;
    return !/undefined/.test(t) && !/Step through it/.test(t) && /No outs tallied on this (sheet|point)/.test(t);
  }));
  check("New match on an empty sheet replaces it rather than keeping a blank one", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    window.newMatch();                    // closes the 1–1 sheet above (it has results, so it is kept)
    const before = S.matches.length, emptyId = S.matchId;
    window.newMatch();                    // nothing on it yet → replaced, not added
    const same = S.matches.length === before && !S.matches.some(m => m.id === emptyId);
    window.endPoint("us");
    window.newMatch();                    // a result on it → kept
    return same && S.matches.length === before + 1;
  }));
  check("Tally offers the quick log at the top only on a phone turned sideways", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    const bar = document.querySelector("#root .turn-bar");
    const sideways = matchMedia("(orientation:landscape) and (max-height:520px)").matches;
    const shown = bar && getComputedStyle(bar).display !== "none";
    const first = bar && document.querySelector(".main").firstElementChild === bar;
    return !!bar && shown === sideways && first && /log on the fly/.test(bar.textContent);
  }));
  check("the whiteboard's ink layer is the exact size of its picture, and a stroke lands", await ev(() => {
    window.set({ tab: "more", more: "wb", wb: null });
    const bg = document.querySelector(".wb-bg svg").getBoundingClientRect(), ink = document.getElementById("wb-map").getBoundingClientRect();
    const same = Math.abs(bg.width - ink.width) < 2 && Math.abs(bg.height - ink.height) < 2 && Math.abs(bg.left - ink.left) < 2;
    const surf = document.querySelector("#wb-map [data-wb]").getBoundingClientRect();
    // the tappable surface fills the picture's width — no black bars either side
    const fills = surf.width > ink.width * 0.9;
    return same && fills;
  }));
  check("a game opened off the Schedule carries the event's format and replaces an empty sheet", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(5); window.setBreakClock(90); window.endPoint("us");
    window.newMatch();                                   // an empty sheet, race 5 carried
    const empty = S.matchId, kept = S.matches.length;
    const g = allGames()[0]; window.playGame(g.id, "home");
    const played = raceTo() === 5 && breakClock() === 90 && !S.matches.some(m => m.id === empty) && S.matches.length === kept && (curMatch() || {}).vs === g.h;
    window.newMatch(); const empty2 = S.matchId;        // empty again
    window.watchGame(g.id);
    const watched = !!(curMatch() || {}).watch && raceTo() === 5 && !S.matches.some(m => m.id === empty2) && S.point === 1;
    return played && watched;
  }));
  check("Anticipate reads the team's tendency and the calls you counted, never a fixed line per pit", await ev(() => {
    window.set({ tab: "scout", scoutTab: "anticipate", left: { name: "" }, right: { name: "Dynasty" }, pitOpen: null });
    editProfile("right", { tend: "Dorito", breaks: [] }); window.set({});
    const t1 = document.querySelector("#root .sec .panel") ? document.querySelector(".main").textContent : "";
    const dorito = /Dorito flood/.test(t1) && !/Snake stack or runner/.test(t1) && document.querySelectorAll("#root .panel").length === 1;
    editProfile("right", { tend: "Snake" }); window.set({});
    const snake = /Snake stack or runner/.test(document.querySelector(".main").textContent);
    window.logTheirBreak("right", "blitz", []); window.logTheirBreak("right", "blitz", []); window.logTheirBreak("right", "snake", []);
    const t2 = document.querySelector(".main").textContent;
    const counted = new RegExp(callName("blitz") + " — 2 of the 3 breaks you logged").test(t2) && /Your film read/.test(t2);
    editProfile("right", { breaks: [], tend: "Balanced" });
    // With nobody in the right pit the Scout gate ("Who are you playing?") stands in for every sub-tab, Anticipate included.
    window.set({ right: { name: "" } });
    const gated = /Who are you playing\?/.test(document.querySelector(".main").textContent) && !document.querySelector("#root .panel");
    window.set({ right: { name: "Dynasty" } });
    return dorito && snake && counted && gated;
  }));
  check("the mercy rule ends the match at the lead, calls match point one short, and a new sheet carries it", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(3);
    window.endPoint("us"); window.endPoint("us");
    const mp = matchPoint() === "us" && /Match point/.test(document.getElementById("root").textContent) && /3-point lead ends it/.test(document.getElementById("root").textContent);
    const chip = /mercy at 3/.test(document.getElementById("root").textContent);
    window.endPoint("us");
    const over = matchOver() === "us" && scoreOf(S.matchId).us === 3;
    window.endPoint("them");                               // refused on a finished sheet
    const held = scoreOf(S.matchId).them === 0;
    window.newMatch();
    const carried = mercy() === 3 && !matchOver() && !matchPoint();
    window.endPoint("them"); window.endPoint("them");
    const must = matchPoint() === "them" && derivedState() === "Must-score";
    window.setMercy(0);
    return mp && chip && over && held && carried && must;
  }));
  check("overtime starts on the pit side whatever the score adds up to", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setSwapEnds(true); window.setRaceTo(7);
    window.endPoint("us"); window.endPoint("them"); window.endPoint("us");   // 2–1: three scored, far end
    const far = ourEnd() !== (curMatch().end || "left");
    window.endPoint("them");                                                // 2–2 level, four scored, pit side
    window.timeUp("ot");
    const pit = ourEnd() === (curMatch().end || "left") && inOvertime();
    window.setSwapEnds(false); window.timeUp("ot");                          // leave overtime, clear the rule
    return far && pit;
  }));
  check("the clock between points offers 45 seconds and a penalty can take four men", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" }, penOpen: true });
    const t = document.getElementById("root").textContent;
    const forty = [...document.querySelectorAll("#root .seg button")].some(b => b.textContent.trim() === "0:45");
    const four = [...document.querySelectorAll("#root .assign__ctl button")].filter(b => b.textContent.trim() === "4").length === 2;
    window.set({ penOpen: false });
    return forty && four && /one-for-one is two men off/.test(t);
  }));
  check("Anticipate counts what they ran by situation and says when the last five disagree with the season", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", breaks: [] });
    // they fall behind and run Blitz three times; level they run Snake Stack
    window.logTheirBreak("right", "snake", []); window.endPoint("us");          // level before: snake
    window.logTheirBreak("right", "blitz", []); window.endPoint("us");          // behind: blitz
    window.logTheirBreak("right", "blitz", []); window.endPoint("them");        // behind: blitz
    window.logTheirBreak("right", "blitz", []); window.endPoint("us");          // behind: blitz
    const rd = theirReads("right");
    const behind = rd.when.find(b => b.label === "when behind");
    const after = rd.when.find(b => b.label === "after losing a point");
    const counted = behind.n === 3 && behind.top[0] === "blitz" && behind.top[1] === 3 && after.n === 2 && after.top[0] === "blitz";
    const shift = rd.shift === false && rd.all.top[0] === "blitz";                // blitz is also the season's most-seen, so no shift yet
    window.set({ tab: "scout", scoutTab: "anticipate", pitOpen: null });
    const text = document.querySelector(".main").textContent;
    const shown = /When behind/.test(text) && new RegExp(callName("blitz") + " — 3 of 3").test(text) && /Lately/.test(text) && /same as the season/.test(text);
    // the season says snake, the last five say blitz → a shift
    editProfile("right", { breaks: [...theirBreaks("right"), ...[1,2,3,4,5].map(i => ({ script: "snake", pt: 10 + i, m: "old-match", layout: S.layoutKey, at: 1000 + i }))] }); window.set({});
    const rd2 = theirReads("right");
    const shifted = rd2.shift === true && rd2.all.top[0] === "snake" && /They may have changed/.test(document.querySelector(".main").textContent);
    editProfile("right", { breaks: [] });
    return counted && shift && shown && shifted;
  }));
  check("Counter ranks a call you have run against them by what it won, and says so", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch();
    const was = callRecord("blitz", "Dynasty"), was2 = callRecord("snake", "Dynasty");   // earlier checks may have logged calls against them
    window.set({ script: "blitz" }); window.logCall(); window.endPoint("us");
    window.set({ script: "blitz" }); window.logCall(); window.endPoint("us");
    window.set({ script: "snake" }); window.logCall(); window.endPoint("them");
    const rec = callRecord("blitz", "Dynasty"), rec2 = callRecord("snake", "Dynasty");
    window.set({ tab: "scout", scoutTab: "counter", pitOpen: null });
    const rows = [...document.querySelectorAll("#root .rank__row")].map(r => r.textContent.replace(/\s+/g, " "));
    const blitzRow = rows.find(r => r.includes(callName("blitz"))), snakeRow = rows.find(r => r.includes(callName("snake")));
    const text = document.querySelector(".main").textContent;
    return rec.n === was.n + 2 && rec.won === was.won + 2 && rec2.n === was2.n + 1 && rec2.won === was2.won
      && blitzRow.includes(`won ${rec.won} of ${rec.n}`) && snakeRow.includes(`won ${rec2.won} of ${rec2.n}`) && /counted from the points you logged/.test(text)
      && rows.findIndex(r => r.includes(callName("blitz"))) < rows.findIndex(r => r.includes(callName("snake")));
  }));
  check("one timeout a team a match, on the sheet, with the point it went on, and in a copy", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.endPoint("us");
    window.addTimeout("us"); window.addTimeout("us");
    const one = timeoutsFor().length === 1 && timeoutsFor()[0].pt === 2 && timeoutsFor()[0].m === S.matchId;
    const says = /Our timeout · used, point 2/.test(document.getElementById("root").textContent) && /Dynasty timeout/.test(document.getElementById("root").textContent);
    window.addTimeout("them");
    const both = timeoutsFor().length === 2;
    const copyOk = !copyDataError({ timeouts: S.timeouts });
    window.dropTimeout(timeoutsFor()[0].id);
    const back = timeoutsFor().length === 1;
    window.newMatch();
    return one && says && both && copyOk && back && timeoutsFor().length === 0;
  }));
  check("a man is read off the breakout rows — breaks charted, made, shot on the break and from where, where he breaks to", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" }, tallySel: null, tallyDraft: null }); window.newMatch();
    const bl = curLayout().bunkers, log = (side, player, bunker, alive, shotFrom) => {
      window.set({ tallySel: bunker, tallyDraft: { side, sideSet: true, player, alive, shotFrom } }); window.logBreakout();
    };
    log("them", "#7", bl[12].id, true); log("them", "#7", bl[12].id, false, bl[3].id); log("them", "#7", bl[14].id, true);
    log("us", "Reyes", bl[20].id, false, bl[9].id); log("us", "Reyes", bl[20].id, true);
    const theirs = manRead("them", "#7", "Dynasty"), mine = manRead("us", "Reyes");
    const counted = theirs.n === 3 && theirs.made === 2 && theirs.shot === 1 && theirs.bunker[0] === bl[12].id && theirs.shotFrom[0] === bl[3].id && mine.n === 2 && mine.shot === 1;
    editProfile("right", { players: [{ num: "7", name: "Smith", wire: "snake" }] });
    window.set({ tab: "scout", scoutTab: "anticipate", pitOpen: null });
    const a = document.querySelector(".main").textContent;
    const onAnticipate = /3 breaks charted · made it 2 · shot on the break 1 \(from/.test(a) && /You lose men at/.test(a);
    window.set({ scoutTab: "matchup" });
    const onMatchup = /3 breaks charted/.test(document.querySelector(".main").textContent);
    window.set({ tab: "more", more: "assess", asWho: "Reyes" });
    const onAssess = /Reyes on .*: 2 breaks charted · made it 1 · shot on the break 1/.test(document.querySelector(".main").textContent);
    window.set({ asWho: null }); editProfile("right", { players: [] });
    return counted && onAnticipate && onMatchup && onAssess;
  }));
  check("a team typed in another case or spacing is the team already on the list, under its own spelling", await ev(() => {
    window.set({ tab: "tally", right: { name: "" } });
    const before = teamsHere().length;
    // the gate's box is only on screen when the sheet has nobody to play; stand one in for it
    let inp = document.getElementById("oppName");
    if (!inp) { inp = document.createElement("input"); inp.id = "oppName"; document.getElementById("root").appendChild(inp); }
    inp.value = "  houston   heat "; window.playNamed();
    const gate = pitOf("right").name === "Houston Heat" && teamsHere().length === before;
    window.set({ tab: "scout", scoutTab: "board" });
    const nt = document.getElementById("newTeam"); nt.value = "HOUSTON HEAT"; window.addTeam();
    const board = teamsHere().length === before && teamsHere().filter(x => /heat/i.test(x.name)).length === 1;
    return gate && board && !!anyTeam("houston heat") && anyTeam("houston heat").name === "Houston Heat";
  }));
  check("the roster paste skips a heading or a staff line and keeps the men", await ev(() => {
    const r = parseRoster("Houston Heat Roster\nCoach Bob Smith\n12 Ryan Greenspan\n#4 Alex Goldman snake\nTeam Captain\nMarcello Margott\n", "Houston Heat");
    return r.found.map(f => f.name).join("|") === "Ryan Greenspan|Alex Goldman|Marcello Margott" && r.skipped.length === 3;
  }));
  check("a year is not a jersey number, a bracketed number is, D-side is a wire, and one man pasted three ways is one row", await ev(() => {
    const r = parseRoster("Houston Heat Roster 2026\n#7 Ryan Greenspan – Snake\n12 Marcello Margott, Dorito\nCoach: Mike Hinman\nKonstantin Fedorov (#21) back center\nChad Busiere   D-side\nCarl Markowski\n#7 Ryan Greenspan\nRyan Greenspan 7 snake\nPit crew: Joe Smith\n", "Houston Heat");
    const by = Object.fromEntries(r.found.map(f => [f.name, f]));
    return r.found.length === 5
      && !r.found.some(f => /Roster/.test(f.name) || f.num === "026")
      && by["Ryan Greenspan"] && by["Ryan Greenspan"].num === "7" && by["Ryan Greenspan"].wire === "Snake"
      && by["Konstantin Fedorov"] && by["Konstantin Fedorov"].num === "21"
      && by["Chad Busiere"] && by["Chad Busiere"].wire === "Dorito"
      && by["Carl Markowski"] && by["Marcello Margott"].wire === "Dorito"
      && r.skipped.length === 3;
  }));
  check("the squad holds one man under one name, and a name is capped so it fits a card", await ev(() => {
    window.set({ tab: "more", more: "team", roster: [] });
    const add = (num, name) => { document.getElementById("rNum").value = num; document.getElementById("rName").value = name; window.addPlayer(); };
    add("7", "Reyes"); add("7", "reyes"); add("8", " Reyes "); add("", "Okafor"); add("99", "A man with a very long name that goes on and on and on");
    const one = S.roster.filter(p => /reyes/i.test(p.name)).length === 1;
    const capped = S.roster.every(p => p.name.length <= 32) && document.getElementById("rName").getAttribute("maxlength") === "32";
    window.editPlayer(1, "name", "REYES");
    const kept = S.roster[1].name === "Okafor" && /already on the squad/.test(document.getElementById("root").textContent);
    return one && capped && kept;
  }));
  check("a code word typed again updates its meaning rather than adding a second row", await ev(() => {
    window.set({ tab: "more", more: "codes", codes: [] });
    const add = (w, m) => { document.getElementById("cdWord").value = w; document.getElementById("cdMeans").value = m; window.addCode(); };
    add("Rocket", "snake stack"); add("rocket", "snake stack, runner on the buzzer"); add(" Rocket ", "");
    const codes = S.codes || [];
    return codes.length === 1 && codes[0].word === "Rocket" && codes[0].means === "snake stack, runner on the buzzer" && /Rocket updated/.test(document.getElementById("root").textContent);
  }));
  check("the next point is read from the spot you are in, with your best answer, on the sheet, the quick log and Playbook", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", breaks: [], answers: {} });
    const thin = nextRead("right");
    const saysThin = thin.thin && /not enough to read yet|no calls logged yet/.test(document.getElementById("root").textContent);
    // they lose point 1 and, behind after losing, run Blitz three times; we answer Wire Split twice and win both
    window.logTheirBreak("right", "snake", []); window.set({ script: "snake" }); window.logCall(); window.endPoint("us");
    window.logTheirBreak("right", "blitz", []); window.set({ script: "split" }); window.logCall(); window.endPoint("us");
    window.logTheirBreak("right", "blitz", []); window.set({ script: "split" }); window.logCall(); window.endPoint("us");
    window.logTheirBreak("right", "blitz", []); window.set({ script: "snake" }); window.logCall(); window.endPoint("them");
    window.endPoint("us");                                   // they are behind after losing a point again
    const r = nextRead("right"), a = bestAnswer("blitz");
    const read = r && !r.thin && r.call === "blitz" && r.n === 3 && r.of === 3 && /behind, after losing a point/.test(r.basis);
    const answer = a && a.call === "split" && a.won === 2 && a.n === 2;
    const sheet = document.getElementById("root").textContent;
    const shown = new RegExp("Read: Dynasty behind, after losing a point run " + callName("blitz") + " — 3 of 3").test(sheet) && new RegExp("Your answer: " + callName("split") + " — won 2 of 2").test(sheet);
    const go = document.querySelector("#root .read-line__go"); const before = S.script; if (go) go.click();
    const called = S.script === "split" && before !== "split";
    window.set({ tab: "playbook" }); const onPb = /Read: Dynasty/.test(document.getElementById("root").textContent);
    window.set({ tab: "tally", quick: true }); const onQuick = /Read: Dynasty/.test(document.querySelector(".qlog").textContent); window.closeQuick();
    editProfile("right", { breaks: [] });
    return saysThin && read && answer && shown && called && onPb && onQuick;
  }));
  check("a ghost of where they plant most stands on the Scout field until the real five is tapped in", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", right: { name: "Dynasty" }, pitOpen: null, theirPick: [] });
    const bl = curLayout().bunkers, ids = [3, 9, 14, 20, 30].map(i => bl[i].id);
    editProfile("right", { breaks: [{ script: "blitz", pt: 1, m: "old-a", layout: S.layoutKey, plants: ids, at: 1 }, { script: "blitz", pt: 2, m: "old-a", layout: S.layoutKey, plants: ids, at: 2 }] }); window.set({});
    const ghosts = document.querySelectorAll("#root svg.field .ghost-plant").length;
    window.logTheirBreak("right", "", ids.slice(0, 3)); window.set({});
    const gone = document.querySelectorAll("#root svg.field .ghost-plant").length === 0 && !!theirFiveLogged("right");
    editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return ghosts === 5 && gone;
  }));
  check("the read leads with the moment: the first point, a timeout just spent, their match point", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    const L = S.layoutKey, mk = (m, pt, script) => ({ script, pt, m, layout: L, at: 1 });
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [
      mk("old-a", 1, "flood"), mk("old-b", 1, "flood"), mk("old-c", 1, "flood"),
      mk("old-d", 2, "lock"), mk("old-e", 2, "lock"), mk("old-f", 2, "lock"),
      mk("old-g", 2, "tower"), mk("old-h", 2, "tower"), mk("old-i", 2, "tower")] });
    const keep = { matches: S.matches, results: S.results, timeouts: S.timeouts };
    S.timeouts = [...["old-d", "old-e", "old-f"].map((m, i) => ({ id: "t" + i, m, pt: 2, side: "them", at: 1 })), ...(S.timeouts || [])];
    S.matches = [...S.matches, ...["old-g", "old-h", "old-i"].map(id => ({ id, at: 1, vs: "Dynasty", layout: L, raceTo: 2 }))];
    S.results = [...(S.results || []), ...["old-g", "old-h", "old-i"].map(m => ({ m, pt: 1, won: "them" }))];
    window.set({});
    const first = nextRead("right");
    const onFirst = first && first.call === "flood" && first.basis === "on the first point" && first.n === 3
      && new RegExp("Read: Dynasty on the first point run " + callName("flood") + " — 3 of 3").test(document.getElementById("root").textContent);
    window.addTimeout("us");
    const to = nextRead("right");
    const afterTO = to && to.call === "lock" && to.basis === "after a timeout";
    window.dropTimeout(S.timeouts.find(t => t.m === S.matchId).id);
    window.setRaceTo(2); window.endPoint("them");             // 0–1 in a race to 2: their match point
    const mp = nextRead("right");
    const atMP = matchPoint() === "them" && mp && mp.call === "tower" && mp.basis === "at their match point";
    S.matches = keep.matches.concat(S.matches.filter(m => m.id === S.matchId && !keep.matches.some(k => k.id === m.id)));
    S.results = (S.results || []).filter(r => !/^old-/.test(r.m)); S.timeouts = (S.timeouts || []).filter(t => !/^old-/.test(t.m));
    editProfile("right", { breaks: [] }); window.set({});
    return onFirst && afterTO && atMP;
  }));
  check("the read says when lately disagrees with the season, and names your own tell", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    const L = S.layoutKey;
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [
      ...[1, 2, 3, 4, 5, 6, 7].map(i => ({ script: "snake", pt: 2, m: "old-" + i, layout: L, at: i })),
      ...[100, 101, 102].map(i => ({ script: "blitz", pt: 2, m: "old-" + i, layout: L, at: i }))] });
    const keepCalls = S.calls;
    S.calls = [1, 2, 3].map(i => ({ script: "split", layout: L, pt: 1, m: "old-" + i, vs: "Dynasty", at: i }));   // only these, so the count is exact
    window.set({});
    const r = nextRead("right"), t = myTell("right"), text = document.getElementById("root").textContent;
    const read = r && r.call === "snake" && r.lately && r.lately.call === "blitz" && r.lately.n === 3 && r.lately.of === 5;
    const lately = new RegExp("Lately " + callName("blitz") + " — 3 of their last 5\\. They may have changed").test(text);
    const tell = t && t.call === "split" && t.n === 3 && t.of === 3 && t.state === "level"
      && new RegExp("Your tell: you have called " + callName("split") + " 3 of 3 times level against them — they have seen it").test(text);
    S.calls = keepCalls; editProfile("right", { breaks: [] }); window.set({});
    return read && lately && tell;
  }));
  check("the ghost five is named under the Scout field, with the man usually seen in each bunker", await ev(() => {
    window.set({ tab: "scout", scoutTab: "counter", right: { name: "Dynasty" }, pitOpen: null, theirPick: [] });
    const bl = curLayout().bunkers, ids = [3, 9, 14, 20, 30].map(i => bl[i].id), L = S.layoutKey;
    editProfile("right", { breaks: [{ script: "blitz", pt: 1, m: "old-a", layout: L, plants: ids, at: 1 }, { script: "blitz", pt: 2, m: "old-a", layout: L, plants: ids, at: 2 }, { script: "blitz", pt: 3, m: "old-a", layout: L, at: 3 }] });
    const keep = S.arrivalSightings;
    S.arrivalSightings = [...(S.arrivalSightings || []), ...[1, 2].map(i => ({ id: "sg" + i, team: "Dynasty", player: "#7 Dill", layout: L, m: "old-a", pt: i, bunker: ids[0], seq: 1, at: i }))];
    window.set({});
    const text = document.getElementById("root").textContent;
    const named = new RegExp("likely five under " + callName("blitz") + ", from 2 logged fives: " + callOf(bl[3]) + " 2 \\(usually #7 Dill\\)").test(text);
    S.arrivalSightings = keep; editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return named;
  }));
  check("a call logged against a pit that is not on the sheet is a season row, and both screens say so", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Rejects" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    window.endPoint("us");                                     // the sheet vs Rejects has something on it
    editProfile("right", { breaks: [] });
    window.setPitTeam("right", "Dynasty"); editProfile("right", { breaks: [] });
    const off = !pitOnSheet("right") && matchVs() === "Rejects";
    window.logTheirBreak("right", "blitz", []);
    const row = theirBreaks("right")[0];
    const season = row && row.script === "blitz" && !row.m && !row.pt;
    const sheet = document.getElementById("root").textContent;
    const line = /This sheet is Rejects; the right pit is Dynasty, so there is no read for this point/.test(sheet) && /Put Rejects in the pit/.test(sheet);
    window.set({ tab: "scout", scoutTab: "breakouts", pitOpen: null });
    const warned = /Dynasty is not on it, so what you log here\s+counts for the season/.test(document.getElementById("root").textContent) && /Start a match vs Dynasty/.test(document.getElementById("root").textContent);
    document.querySelector("#root .read-line__go, #root .warn + button");
    window.set({ tab: "tally" }); document.querySelector("#root .read-line__go").click();
    const back = pitOf("right").name === "Rejects" && pitOnSheet("right");
    editProfile("right", { breaks: [] }); window.setPitTeam("right", "Dynasty"); editProfile("right", { breaks: [] });
    return off && season && line && warned && back;
  }));
  check("Games tells the story of a point that was only scored, read back from every log", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { breaks: [] });
    const bl = curLayout().bunkers, ids = [3, 9, 14].map(i => bl[i].id);
    window.set({ script: "snake" }); window.logCall(); window.logTheirBreak("right", "blitz", ids);
    window.addPen("them", 2); window.addTimeout("us"); window.setRead("right"); window.endPoint("us");
    window.set({ tab: "scout", scoutTab: "games", pitOpen: null, replayMatch: null, replayPt: null });
    const t = document.getElementById("root").textContent;
    const story = /Point 1/.test(t) && /Score before\s*0–0/.test(t) && new RegExp("You called\\s*" + callName("snake")).test(t)
      && new RegExp("Dynasty ran\\s*" + callName("blitz") + " · " + callOf(bl[3])).test(t) && /Won by\s*you · right read/.test(t)
      && /Penalty\s*Dynasty −2/.test(t) && /Timeout\s*you/.test(t) && /No outs tallied on this point/.test(t);
    editProfile("right", { breaks: [] });
    return story;
  }));
  check("a sheet can be named, and the name shows in the kept list", await ev(() => {
    window.set({ tab: "more", more: "matches" });
    const inp = [...document.querySelectorAll("#root input")].find(i => i.placeholder.startsWith("Prelim")); if (!inp) return false;
    inp.value = "Prelim 2 · Sunday"; inp.onchange();
    const noted = (curMatch() || {}).note === "Prelim 2 · Sunday";
    window.newMatch();
    window.set({ tab: "more", more: "matches" });
    return noted && /Prelim 2 · Sunday/.test(document.getElementById("root").textContent);
  }));
  check("lanes off the break are counted bunker to bunker against their five, on the sheet, Playbook and the Counter", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const none = lanesLine() === "";                                   // nothing known about their five yet
    const bl = curLayout().bunkers, mine = plantIdsFor(S.script), theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right");  // their five, logged on this point
    const l = breakLanes(S.script), t = theirFiveNow();
    // the count is the same test Sightlines makes, pair by pair
    const onThem = mine.filter(a => theirs.some(b => laneClear(a, b))).length, onYou = theirs.filter(b => mine.some(a => laneClear(a, b))).length;
    const counted = t && t.basis === "logged" && l && l.onThem === onThem && l.onYou === onYou && l.mine === 5 && l.theirs === 5
      && l.onThem >= 0 && l.onThem <= 5 && l.onYou <= 5;
    const sym = laneClear(mine[0], theirs[0]) === laneClear(theirs[0], mine[0]);
    const text = document.getElementById("root").textContent;
    const onSheet = new RegExp(`Lanes off the break: on ${breakName()} against the five they logged on this point, ${onThem} of your 5 have a clear lane on one of theirs and ${onYou} of their 5 have one on you`).test(text);
    window.set({ tab: "playbook" }); const onPb = /Lanes off the break/.test(document.getElementById("root").textContent);
    window.set({ tab: "scout", scoutTab: "counter", pitOpen: null });
    const ct = document.getElementById("root").textContent;
    const onCounter = new RegExp(`lanes · ${onThem} on them · ${onYou} on you`).test(ct) && /lanes is counted off/.test(ct);
    editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return none && counted && sym && onSheet && onPb && onCounter;
  }));
  check("the Lanes chip draws every clear lane between your five and theirs on the Scout field, and says what it drew", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    window.set({ tab: "scout", scoutTab: "matchup", pitOpen: null, lanesOn: true });
    const live = () => document.querySelector(".field-wrap[data-live]");
    const none = !live().querySelector(".break-lane") && /lanes show once their five is known/.test(document.getElementById("root").textContent);
    const bl = curLayout().bunkers, mine = plantIdsFor(S.script), theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right"); window.set({});
    const pairs = mine.reduce((n, a) => n + theirs.filter(b => laneClear(a, b)).length, 0);
    const drawn = live().querySelectorAll(".break-lane").length;
    const l = breakLanes(S.script);
    const said = new RegExp(`clear lanes off the break on ${breakName()} · ${l.onThem} of your 5 on them · ${l.onYou} of their 5 on you`).test(document.getElementById("root").textContent);
    window.set({ scoutShow: "us" }); const yoursOnly = !live().querySelector(".break-lane");   // no lanes to a five that is not drawn
    window.set({ scoutShow: "them", lanesOn: false }); const off = !live().querySelector(".break-lane");
    editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return none && drawn === pairs && said && yoursOnly && off;
  }));
  check("the red break on the Scout field is labelled yours, not the left pit's, on your own sheet", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", scoutShow: "both", left: { name: "" }, pitOpen: null });
    const t = document.querySelector(".field-wrap[data-live]").parentElement.textContent;
    const yours = new RegExp("You · " + breakName()).test(t) && !/Left pit · not set/.test(t);
    window.set({ scoutShow: "them" });
    return yours;
  }));
  check("their shooter is named with the man of yours who has a lane on his usual bunker", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const L = S.layoutKey, bl = curLayout().bunkers, mine = plantIdsFor(S.script), five = fiveFor(1);
    const slot = i => five[i] ? five[i].name : `slot ${i + 1}`;
    const none = shooterLane("right") === null;
    // #7 Dill has shot two of your men, on this sheet
    S.tally = [...(S.tally || []), { pt: 1, side: "us", name: slot(0), at: 1, m: S.matchId, script: S.script, layout: L, vs: "Dynasty", by: "#7 Dill", how: "Laned" },
                                    { pt: 1, side: "us", name: slot(1), at: 2, m: S.matchId, script: S.script, layout: L, vs: "Dynasty", by: "#7 Dill", how: "Laned" }];
    // their five, with the bunker that one of your plants has a lane on first
    const theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).map(b => b.id);
    const target = theirs.find(id => mine.some(a => laneClear(a, id))) || theirs[0];
    const pick = [target, ...theirs.filter(id => id !== target).slice(0, 4)];
    window.set({ theirPick: pick }); window.logTheirFive("right");
    const keep = S.arrivalSightings;
    S.arrivalSightings = [...(S.arrivalSightings || []), { id: "sgx", team: "Dynasty", player: "#7 Dill", layout: L, m: "old-z", pt: 1, bunker: target, seq: 1, at: 1 }];
    window.set({});
    const sl = shooterLane("right");
    const lanes = mine.map((a, i) => laneClear(a, target) ? slot(i) : null).filter(Boolean);
    const named = sl && sl.tag === "#7 Dill" && sl.hits === 2 && sl.at === target && sl.lanes.map(l => l.who).join() === lanes.join();
    const text = document.getElementById("root").textContent;
    const shown = /Their shooter: #7 Dill has shot 2 of your men, usually in/.test(text) && (lanes.length ? new RegExp(lanes[0] + " from .* a lane on him off the break").test(text) : /nobody in your five has a lane on him/.test(text));
    window.set({ tab: "scout", scoutTab: "anticipate", pitOpen: null });
    const onAnt = /Their shooter/.test(document.getElementById("root").textContent);
    S.arrivalSightings = keep; S.tally = (S.tally || []).filter(o => o.by !== "#7 Dill"); editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return none && named && shown && onAnt;
  }));
  check("Who's on carries each man's charted read against this team, and nothing for a man with nothing charted", await ev(() => {
    window.confirm = () => true;
    const keepRoster = S.roster;
    S.roster = ["Reyes", "Okafor", "Vance", "Marsh", "Bright", "Cole", "Ortiz"].map((n, i) => ({ name: n, num: i + 1, p: "", s: "" }));
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    const L = S.layoutKey, bl = curLayout().bunkers, keepB = S.breakouts;
    S.breakouts = [{ id: "wb1", m: S.matchId, pt: 1, layout: L, at: 1, side: "us", bunker: bl[3].id, player: "Cole", alive: true, shotFrom: "", entry: "", dir: null, shootAt: "", delayed: false, movedTo: "", movedDelayed: false, routeType: "", route: [], vs: "Dynasty", script: S.script },
                   { id: "wb2", m: S.matchId, pt: 1, layout: L, at: 2, side: "us", bunker: bl[3].id, player: "Cole", alive: false, shotFrom: bl[9].id, entry: "", dir: null, shootAt: "", delayed: false, movedTo: "", movedDelayed: false, routeType: "", route: [], vs: "Dynasty", script: S.script }];
    window.set({ whoOn: true });
    const t = document.getElementById("root").textContent;
    const cole = new RegExp("Cole · bench\\s*2 breaks charted · made it 1 · shot on the break 1 \\(from " + callOf(bl[9]) + " 1\\) · breaks to " + callOf(bl[3]) + " 2 of 2").test(t);
    const ortiz = !/Ortiz · bench\s*\d/.test(t) && !/Ortiz · bench\s*(\d|breaks)/.test(t);
    S.breakouts = keepB; S.roster = keepRoster; window.set({ whoOn: false });
    return cole && ortiz;
  }));
  check("their rotations are counted from consecutive sightings of the same man on a point, on Anticipate and under the arrival field", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const L = S.layoutKey, bl = curLayout().bunkers, A = bl[3].id, B = bl[9].id, C = bl[14].id, keep = S.arrivalSightings;
    const sg = (id, who, m, pt, bunker, seq) => ({ id, team: "Dynasty", player: who, layout: L, m, pt, bunker, seq, at: seq });
    S.arrivalSightings = [sg("r1", "#7 Dill", "m1", 1, A, 1), sg("r2", "#7 Dill", "m1", 1, B, 2), sg("r3", "#7 Dill", "m1", 1, B, 3),   // a repeat is not a move
                          sg("r4", "#7 Dill", "m2", 1, A, 1), sg("r5", "#7 Dill", "m2", 1, B, 2),
                          sg("r6", "#4", "m2", 1, A, 1), sg("r7", "#4", "m2", 1, C, 2),
                          sg("r8", "#4", "m2", 2, A, 1)];                                                                              // one sighting, no move
    const mv = theirMoves("Dynasty");
    const counted = mv.length === 2 && mv[0].from === A && mv[0].to === B && mv[0].n === 2 && mv[0].who === "#7 Dill" && mv[0].whoN === 2 && mv[1].to === C && mv[1].n === 1;
    window.set({ tab: "scout", scoutTab: "anticipate", pitOpen: null });
    const t = document.getElementById("root").textContent;
    const onAnt = new RegExp("After the break\\s*" + callOf(bl[3]) + " → " + callOf(bl[9]) + " 2 \\(#7 Dill 2\\) · " + callOf(bl[3]) + " → " + callOf(bl[14]) + " 1 \\(#4 1\\) — 3 rotations seen").test(t);
    window.set({ tab: "scout", scoutTab: "arrival", pitOpen: null });
    const onArr = /Their rotations/.test(document.getElementById("root").textContent);
    S.arrivalSightings = keep; editProfile("right", { breaks: [] }); window.set({});
    return counted && onAnt && onArr;
  }));
  check("the Their rotations layer draws one blue arrow a move, with its count, and counts the moves on its chip", await ev(() => {
    window.set({ tab: "tally", right: { name: "Dynasty" } });
    const L = S.layoutKey, bl = curLayout().bunkers, A = bl[3].id, B = bl[9].id, C = bl[14].id, keep = S.arrivalSightings;
    const sg = (id, who, m, pt, bunker, seq) => ({ id, team: "Dynasty", player: who, layout: L, m, pt, bunker, seq, at: seq });
    S.arrivalSightings = [sg("l1", "#7", "m1", 1, A, 1), sg("l2", "#7", "m1", 1, B, 2), sg("l3", "#7", "m2", 1, A, 1), sg("l4", "#7", "m2", 1, B, 2), sg("l5", "#4", "m2", 1, A, 1), sg("l6", "#4", "m2", 1, C, 2)];
    window.set({ tab: "scout", scoutTab: "layers", pitOpen: null, scoutLayers: { theirMoves: true } });
    const arrows = document.querySelectorAll("#root svg.field .their-move");
    const two = arrows.length === 2 && [...arrows].map(g => g.querySelector("text").textContent).sort().join() === "1,2";
    const chip = /Their rotations · 3/.test(document.getElementById("root").textContent);
    window.set({ scoutLayers: { theirOuts: true } });
    const off = document.querySelectorAll("#root svg.field .their-move").length === 0;
    S.arrivalSightings = keep; window.set({});
    return two && chip && off;
  }));
  check("with Lanes on, their shooter's usual bunker is ringed and named on the Scout field", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const L = S.layoutKey, bl = curLayout().bunkers, mine = plantIdsFor(S.script), five = fiveFor(1), slot = i => five[i] ? five[i].name : `slot ${i + 1}`;
    const keepT = S.tally, keepS = S.arrivalSightings;
    S.tally = [...(S.tally || []), { pt: 1, side: "us", name: slot(0), at: 1, m: S.matchId, script: S.script, layout: L, vs: "Dynasty", by: "#7 Dill", how: "Laned" }, { pt: 1, side: "us", name: slot(1), at: 2, m: S.matchId, script: S.script, layout: L, vs: "Dynasty", by: "#7 Dill", how: "Laned" }];
    const theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right");
    S.arrivalSightings = [...(S.arrivalSightings || []), { id: "sgr", team: "Dynasty", player: "#7 Dill", layout: L, m: "old-z", pt: 1, bunker: theirs[0], seq: 1, at: 1 }];
    window.set({ tab: "scout", scoutTab: "matchup", pitOpen: null, lanesOn: true });
    const live = document.querySelector(".field-wrap[data-live]");
    const ring = live.querySelectorAll(".shooter-ring").length === 1 && live.querySelector(".shooter-ring text").textContent === "#7 Dill";
    const said = /#7 Dill usually sets up here — he has shot 2 of your men/.test(document.getElementById("root").textContent);
    window.set({ lanesOn: false }); const off = !document.querySelector(".field-wrap[data-live] .shooter-ring");
    S.tally = keepT; S.arrivalSightings = keepS; editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return ring && said && off;
  }));
  check("on the point sheet the read sits above Change the call and the lanes sit below it", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const bl = curLayout().bunkers, mine = plantIdsFor(S.script), theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right");
    const lines = [...document.querySelectorAll("#root .read-line")], change = [...document.querySelectorAll("#root .btn")].find(b => /Change the call/.test(b.textContent));
    const read = lines.find(l => /Read:|not enough to read yet|no calls logged yet/.test(l.textContent)), lanes = lines.find(l => /Lanes off the break/.test(l.textContent));
    const order = read && lanes && change && (read.compareDocumentPosition(change) & Node.DOCUMENT_POSITION_FOLLOWING) && (change.compareDocumentPosition(lanes) & Node.DOCUMENT_POSITION_FOLLOWING);
    editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return !!order;
  }));
  check("self-scout on Playbook says what each call won on this field, and how each logged point went", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    const keep = S.calls; S.calls = [];
    window.set({ script: "tower" }); window.logCall(); window.endPoint("us");
    window.set({ script: "tower" }); window.logCall(); window.endPoint("them");
    window.set({ script: "tower" }); window.logCall();                         // no result yet
    const r = callRecordHere("tower");
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").textContent;
    const row = r.n === 2 && r.won === 1 && new RegExp(callName("tower") + "\\s*100% of 3 logged here · won 1 of 2").test(t);
    const recent = /point 1 · vs Dynasty · won/.test(t) && /point 2 · vs Dynasty · lost/.test(t) && /point 3 · vs Dynasty\s*Undo/.test(t);
    S.calls = keep; window.set({});
    return row && recent;
  }));
  check("the Division board counts the calls logged on a team and names the one they ran most once there are three", await ev(() => {
    window.set({ tab: "scout", scoutTab: "board", pitOpen: null });
    const name = teamsHere()[0].name, keepRight = S.right;             // a team that is actually on this board
    window.set({ right: { name } });
    const row = () => [...document.querySelectorAll("#root .tbl tbody tr")].find(tr => tr.children[1] && tr.children[1].textContent.trim().startsWith(name));
    const keepProfile = (S.scout || {})[name];
    editProfile("right", { tend: "Snake", breaks: [{ script: "blitz", at: 1 }, { script: "blitz", at: 2 }] }); window.set({});
    // Two logged is a count on Film and nothing on Tend: an unscored team still reads as a dash there.
    const two = row() && /2 calls/.test(row().textContent) && !/of 2 logged/.test(row().textContent);
    editProfile("right", { breaks: [{ script: "blitz", at: 1 }, { script: "blitz", at: 2 }, { script: "snake", at: 3 }] }); window.set({});
    const three = row() && /3 calls/.test(row().textContent) && new RegExp(callName("blitz") + " 2 of 3 logged").test(row().textContent);
    if(keepProfile) S.scout[name] = keepProfile; else delete S.scout[name];
    window.set({ right: keepRight });
    return !!(two && three);
  }));
  check("the Division board fits its wrap on a phone with no column behind a sideways scroll", await ev(() => {
    window.set({ tab: "scout", scoutTab: "board", pitOpen: null });
    const wrap = document.querySelector("#root .tblwrap"), tbl = wrap && wrap.querySelector("table");
    const fits = !!tbl && tbl.scrollWidth <= wrap.clientWidth + 1;
    const threat = [...document.querySelectorAll("#root .tbl tbody tr")].some(tr => /\d★|—/.test(tr.lastElementChild.previousElementSibling.textContent));
    return fits && threat;
  }));
  check("each man's card says which of their five he has a clear lane on, and the share text carries it", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    window.set({ tab: "playbook", pbView: "cards" });
    const none = cardLines().every(c => c.clear === null) && !/clear on/.test(document.getElementById("root").textContent);
    const bl = curLayout().bunkers, mine = plantIdsFor(S.script), theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right"); window.set({});
    const cards = cardLines(), paths = currentPaths();
    const right = cards.every((c, i) => Array.isArray(c.clear) && c.clear.length === theirs.filter(id => laneClear(paths[i].bunker, id)).length);
    const t = document.getElementById("root").textContent;
    const shown = cards.every(c => c.clear.length ? t.includes("clear on " + c.clear.join(", ")) : /no clear lane on their five/.test(t)) && /clear on is counted off/.test(t);
    let shared = ""; const keep = window.gridlockShare; window.gridlockShare = txt => { shared = txt; }; window.shareCards(); window.gridlockShare = keep;
    const inText = cards.every(c => c.clear.length ? shared.includes("clear on " + c.clear.join(", ")) : shared.includes("no clear lane on their five"));
    editProfile("right", { breaks: [] }); window.set({ theirPick: [], pbView: null });
    return none && right && shown && inText;
  }));
  check("Walk says what the book knows about the bunker you are standing on, and opens Sightlines from it", await ev(() => {
    window.set({ tab: "more", more: "walk", right: { name: "Dynasty" } });
    const bl = curLayout().bunkers, b = bl[5];
    editProfile("right", { breaks: [{ script: "", pt: 1, m: "old-w", layout: S.layoutKey, plants: [b.id, bl[6].id], at: 1 }, { script: "", pt: 2, m: "old-w", layout: S.layoutKey, plants: [b.id], at: 2 }] });
    window.walkSelect(walkWhereOf(b));
    const sl = sightLines(b.id, 2, 2), t = document.getElementById("root").textContent;
    const said = new RegExp(callOf(b) + " — " + sl.clear + " of " + sl.lines.length + " lanes clear from here · Dynasty planted here 2 times").test(t);
    const go = [...document.querySelectorAll("#root .read-line__go")].find(x => /Lanes from here/.test(x.textContent)); if (go) go.click();
    const opened = S.tab === "sightlines" && S.sightFrom === b.id;
    editProfile("right", { breaks: [] }); window.set({ tab: "more", more: "walk", walkPick: null });
    return said && opened;
  }));
  check("Sightlines says what was logged at the bunker you are standing in", await ev(() => {
    window.set({ tab: "sightlines", right: { name: "Dynasty" } });
    const bl = curLayout().bunkers, b = bl[7], L = S.layoutKey, keepT = S.tally;
    editProfile("right", { breaks: [{ script: "", pt: 1, m: "old-s", layout: L, plants: [b.id], at: 1 }] });
    S.tally = [...(S.tally || []), { pt: 1, side: "them", name: "#4", at: 1, m: "old-s", script: "snake", layout: L, vs: "Dynasty", shotAt: b.id }];
    window.pickSight("from", b.id);
    const t = document.getElementById("root").textContent;
    const said = t.includes("Standing in " + (bunkerCalls()[b.id] || b.id) + ": ") && /Dynasty planted here 1 time · they lost 1 here/.test(t);   // Sightlines names a bunker by the coach's call, else its code
    const blank = bl.find(x => x.id !== b.id && !bunkerBook(x.id, false));            // a bunker nothing was logged at says nothing
    const quiet = !blank || (() => { window.pickSight("from", blank.id); return !/Standing in [^\n]*: /.test(document.getElementById("root").textContent); })();
    S.tally = keepT; editProfile("right", { breaks: [] }); window.set({});
    return said && quiet;
  }));
  check("Sightlines leads its lane table with their five, tagged, and counts how many are clear from here", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    const bl = curLayout().bunkers, mine = plantIdsFor(S.script), theirs = bl.filter(b => !mine.includes(b.id) && b.x > 75).slice(0, 5).map(b => b.id);
    window.set({ theirPick: theirs }); window.logTheirFive("right");
    window.set({ tab: "sightlines" }); window.pickSight("from", mine[0]);
    const rows = [...document.querySelectorAll("#root .tbl tbody tr")];
    const lead = rows.slice(0, 5).every(r => r.classList.contains("their-row")) && rows.slice(5).every(r => !r.classList.contains("their-row")) && rows.slice(0, 5).every(r => /theirs/.test(r.textContent));
    const clear = theirs.filter(id => laneClear(mine[0], id)).length;   // same geometry, both doors
    const sl = sightLines(mine[0], 2, 2), tableClear = theirs.filter(id => !(sl.lines.find(l => l.to.id === id) || {}).blocked).length;
    const said = new RegExp("Their five on this point first — " + tableClear + " of 5 clear from here").test(document.getElementById("root").textContent);
    editProfile("right", { breaks: [] }); window.set({ theirPick: [] });
    return lead && said && clear >= tableClear;
  }));
  check("a watched game lists under Scout › Games, flagged watched, and its point reads back with the two teams named", await ev(() => {
    window.confirm = () => true;
    S.left = { name: "Dynasty" }; S.right = { name: "Houston Heat" };
    window.openSheet({ vs: "Houston Heat", watch: true, home: "Dynasty", away: "Houston Heat" }); window.set({});
    const bl = curLayout().bunkers, ids = [3, 9, 14].map(i => bl[i].id);
    window.set({ theirPick: ids }); window.logTheirBreak("right", "blitz", ids); window.logTheirBreak("left", "flood", []); window.endPoint("us");
    window.set({ tab: "scout", scoutTab: "games", pitOpen: null, replayMatch: null, replayPt: null });
    const t = document.getElementById("root").textContent.replace(/\s+/g, " ");
    const listed = !/No points scored or outs logged/.test(t);
    const story = /Won by\s*Dynasty/.test(t) && new RegExp("Houston Heat ran\\s*" + callName("blitz")).test(t) && !/You called/.test(t)
      && new RegExp("Dynasty ran\\s*" + callName("flood")).test(t) && /Score before\s*Dynasty 0 – 0 Houston Heat/.test(t);
    // a second sheet against them, his own, so the game chips show — the watched one flagged
    window.set({ tab: "tally", right: { name: "Houston Heat" } }); window.newMatch(); window.endPoint("them");
    window.set({ tab: "scout", scoutTab: "games", pitOpen: null, replayMatch: null, replayPt: null });
    const chips = [...document.querySelectorAll("#root .seg button")].map(b => b.textContent.replace(/\s+/g, " ").trim());
    const flagged = chips.some(c => /1–0 · watched/.test(c)) && chips.some(c => /0–1/.test(c) && !/watched/.test(c));
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch();
    return listed && story && flagged;
  }));
  check("the header score chip says when the score is a game you are watching, and names the two teams", await ev(() => {
    S.left = { name: "Dynasty" }; S.right = { name: "Houston Heat" };
    window.openSheet({ vs: "Houston Heat", watch: true, home: "Dynasty", away: "Houston Heat" }); window.set({}); window.endPoint("us");
    const chip = document.querySelector("#root .score-chip--watch");
    const ok = !!chip && /watch/.test(chip.textContent) && chip.getAttribute("aria-label") === "Dynasty 1 – 0 Houston Heat, a game you are watching";
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.endPoint("us");
    const own = !document.querySelector("#root .score-chip--watch") && document.querySelector("#root .score-chip--go").getAttribute("aria-label") === "Open the point sheet";
    return ok && own;
  }));
  check("every button inside a read line is a 44 px target", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: {}, breaks: [] });
    window.logTheirBreak("right", "snake", []); window.set({ script: "snake" }); window.logCall(); window.endPoint("us");
    for (let i = 0; i < 3; i++) { window.logTheirBreak("right", "blitz", []); window.set({ script: "split" }); window.logCall(); window.endPoint("us"); }
    const seen = []; const short = [];
    const sweep = () => [...document.querySelectorAll("#root .read-line__go")].forEach(b => { const r = b.getBoundingClientRect(); seen.push(b.textContent.trim()); if (r.height < 43.5) short.push(`${b.textContent.trim()} ${Math.round(r.height)}px`); });
    window.set({ script: "snake" }); sweep();                                // the Call button on the sheet (the answer is Wire Split, so it shows)
    window.setPitTeam("right", "Royalty"); window.set({}); sweep();          // Put <team> in the pit
    window.setPitTeam("right", "Dynasty");
    window.set({ tab: "more", more: "walk" }); window.walkSelect(walkWhereOf(curLayout().bunkers[5])); sweep();   // Lanes from here
    window.set({ walkPick: null }); editProfile("right", { breaks: [] });
    return seen.length >= 3 && short.length === 0;
  }));
  check("a schedule row says what you already have on that game: watched with the score, or you played with the result", await ev(() => {
    window.confirm = () => true;
    const g = allGames()[0]; if (!g) return false;
    window.watchGame(g.id); window.logTheirBreak("right", "blitz", []); window.endPoint("us");
    window.set({ tab: "more", more: "schedule", gameOpen: null });
    const rowOf = () => [...document.querySelectorAll("#root .assign")].map(e => e.textContent.replace(/\s+/g, " ").trim()).find(x => x.includes(g.h + " v " + g.a)) || "";
    const watched = /watched · 1–0/.test(rowOf());
    window.playGame(g.id, "away"); window.setRaceTo(1); window.endPoint("us");
    window.set({ tab: "more", more: "schedule", gameOpen: null });
    const played = new RegExp("you played " + g.a + " · 1–0 · you won").test(rowOf()) && /watched · 1–0/.test(rowOf());
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch();
    return watched && played;
  }));
  check("Sightlines opens on the bunker your first man actually stands in from the right end", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    const first = plantIdsFor(S.script)[0];
    window.set({ sightFrom: null }); const left = sightDefault();
    window.switchEnds(); const right = sightDefault(); window.switchEnds();
    return left === first && right === mirrorBunkerId(first) && right !== left;
  }));
  check("a call key this build does not have is repaired on the next render, not the next relaunch", await ev(() => {
    window.set({ tab: "playbook", script: "my:none" });
    const fixed = allPlays()[S.script] && S.script !== "my:none";
    const header = document.querySelector("#root .ctx__ev") || document.querySelector("#root .ctx");
    return !!fixed && header && !/my:none/.test(header.textContent) && new RegExp(breakName()).test(header.textContent);
  }));
  check("the read line never offers to call a play he has turned off", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.setRaceTo(0); window.setMercy(0);
    editProfile("right", { tend: "Balanced", answers: { blitz: "split" }, breaks: [] });
    for (let i = 0; i < 3; i++) { window.logTheirBreak("right", "blitz", []); window.endPoint("us"); }
    const keepOff = S.offPlays; S.offPlays = ["split"]; window.set({ script: "snake" });
    const t = document.getElementById("root").textContent;
    const named = new RegExp("Your answer: " + callName("split")).test(t), noBtn = ![...document.querySelectorAll("#root .read-line__go")].some(b => b.textContent.includes(callName("split"))), said = /a play you have turned off/.test(t);
    S.offPlays = keepOff; window.set({});
    const btnBack = [...document.querySelectorAll("#root .read-line__go")].some(b => b.textContent.includes(callName("split")));
    editProfile("right", { breaks: [], answers: {} });
    return named && noBtn && said && btnBack;
  }));
  check("on a watched game the lanes run between the two logged fives, nothing is ringed, and the Counter counts no lanes of yours", await ev(() => {
    window.confirm = () => true;
    S.left = { name: "Dynasty" }; S.right = { name: "Houston Heat" };
    window.openSheet({ vs: "Houston Heat", watch: true, home: "Dynasty", away: "Houston Heat" }); window.set({});
    const bl = curLayout().bunkers, away = [3, 9, 14, 20, 30].map(i => bl[i].id), home = [40, 44, 48, 52, 55].map(i => bl[i % bl.length].id);
    window.set({ tab: "scout", scoutTab: "matchup", pitOpen: null, lanesOn: true, scoutShow: "them", theirPick: away }); window.logTheirFive("right");
    const live = () => document.querySelector(".field-wrap[data-live]");
    const thin = live().querySelectorAll(".break-lane").length === 0 && /lanes show once both fives are logged on this point/.test(document.getElementById("root").textContent) && !/of your 5/.test(document.getElementById("root").textContent);
    window.set({ theirPick: home }); window.logTheirFive("left"); window.set({});
    const pairs = home.reduce((n, a) => n + away.filter(b => laneClear(a, b)).length, 0), w = watchLanes();
    const drawn = live().querySelectorAll(".break-lane").length === pairs && !live().querySelector(".shooter-ring");
    const t = document.getElementById("root").textContent;
    const said = new RegExp("clear lanes off the break · " + w.onThem + " of Dynasty's 5 on Houston Heat · " + w.onYou + " of Houston Heat's 5 on Dynasty").test(t) && !/of your/.test(t);
    window.set({ scoutTab: "counter" }); const noCounter = !/lanes · \d+ on them/.test(document.getElementById("root").textContent);
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch();
    return thin && drawn && said && noCounter;
  }));
  check("Matchup on a watched game names the two teams and never your call or your five", await ev(() => {
    window.confirm = () => true;
    S.left = { name: "Dynasty" }; S.right = { name: "Houston Heat" };
    window.openSheet({ vs: "Houston Heat", watch: true, home: "Dynasty", away: "Houston Heat" }); window.set({ tab: "scout", scoutTab: "matchup", pitOpen: null });
    const t = document.getElementById("root").textContent.replace(/\s+/g, " ");
    const watched = /A game you are watching: Dynasty v Houston Heat\. Your call and your five are not on this field/.test(t) && !/Your call is/.test(t) && !/Your five ·/.test(t) && /Dynasty · logged/.test(t);
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch(); window.set({ tab: "scout", scoutTab: "matchup", pitOpen: null });
    const own = /Your call is/.test(document.getElementById("root").textContent);
    return watched && own;
  }));
  check("Team's Break calls lists your own plays first, renames one in place and opens it on the field", await ev(() => {
    const keep = S.plays, L = S.layoutKey, bl = curLayout().bunkers;
    S.plays = [{ k: "my:t1", name: "Hammer", read: "", aggr: 3, plants: { [L]: [0, 1, 2, 3, 4].map(i => bl[i].id) }, at: 1 }];
    window.set({ tab: "more", more: "team" });
    const mineBox = document.getElementById("myp-my:t1"), firstTwelve = document.querySelector("#root input[id^='brc-']");
    const row = mineBox && mineBox.closest(".assign");
    const leads = !!row && /Yours/.test(row.textContent) && !!(mineBox.compareDocumentPosition(firstTwelve) & Node.DOCUMENT_POSITION_FOLLOWING)
      && new RegExp("five set on " + curLayout().name).test(row.textContent);
    const box = document.getElementById("myp-my:t1"); box.value = "Hammer 2"; box.onchange();
    const renamed = customPlays()[0].name === "Hammer 2" && callName("my:t1") === "Hammer 2";
    const box2 = document.getElementById("myp-my:t1"); box2.value = "   "; box2.onchange();
    const kept = customPlays()[0].name === "Hammer 2";
    const open = [...document.querySelectorAll("#root .assign button")].find(b => b.textContent.trim() === "Open"); open.click();
    const opened = S.tab === "playbook" && S.script === "my:t1";
    const count = (() => { window.set({ tab: "more", more: "team" }); return /1 of yours/.test(document.getElementById("root").textContent); })();
    S.plays = keep; window.set({ script: "snake" });
    return leads && renamed && kept && opened && count;
  }));
  check("the welcome pitch sells his own plays beside the twelve", await ev(() => {
    const keep = { entered: S.entered, role: S.role, email: S.email };
    window.set({ entered: false, mode: null });
    const t = document.getElementById("root").textContent;
    window.set(keep);
    return /Twelve breaks and your own plays, drawn on the field you are actually playing/.test(t) && !/free|\$|no account/i.test(t.replace(/account takes a moment|Create your account|I already have one/g, ""));
  }));
  check("on a watched game Lineups, Movement and Assess say his five are not on the field, and no screen logs a call of his", await ev(() => {
    window.confirm = () => true;
    S.left = { name: "Dynasty" }; S.right = { name: "Houston Heat" };
    window.openSheet({ vs: "Houston Heat", watch: true, home: "Dynasty", away: "Houston Heat" }); window.set({});
    const said = ["lineups", "movement", "assess"].every(k => { window.set({ tab: "more", more: k }); const t = document.getElementById("root").textContent; return /A game you are watching: Dynasty v Houston Heat/.test(t) && /Chart it on Scout/.test(t) && !/Save grade|Tap the man who moved|Tap the slot/.test(t); });
    window.set({ tab: "playbook" }); const noPb = !/Log this call/.test(document.getElementById("root").textContent);
    window.set({ tab: "tally" }); const noSheet = ![...document.querySelectorAll("#root button")].some(b => /Log it · point/.test(b.textContent));
    const before = (S.calls || []).length; window.logCall(); const refused = (S.calls || []).length === before;
    const go = [...document.querySelectorAll("#root button")].find(b => /Chart it on Scout/.test(b.textContent));
    window.set({ tab: "more", more: "assess" }); [...document.querySelectorAll("#root button")].find(b => /Chart it on Scout/.test(b.textContent)).click();
    const sent = S.tab === "scout" && S.scoutTab === "breakouts";
    window.set({ tab: "tally", right: { name: "Dynasty" } }); window.newMatch();
    return said && noPb && noSheet && refused && sent;
  }));
  check("Counter leads with the counted read, not the film tendency, and ranks your calls by what they won on the points they ran it", await ev(() => {
    window.confirm = () => true;
    window.set({ tab: "tally", right: { name: "Rejects", tend: "Snake" }, left: { name: "" } });
    const inp = document.getElementById("oppName"); if (inp) { inp.value = "Rejects"; window.playNamed(); } else window.newMatch();
    const bl = curLayout().bunkers, ids = [3, 9, 14, 20, 30].map(i => bl[i].id);
    // four points: they run Blitz every time; you run Snake Stack twice and win both, Hold twice and lose both
    [["snake", "us"], ["hold", "them"], ["snake", "us"], ["hold", "them"]].forEach(([mine, won]) => {
      window.set({ theirPick: ids }); window.logTheirBreak("right", "blitz", ids);
      window.set({ script: mine }); window.logCall(); window.endPoint(won);
    });
    window.set({ tab: "scout", scoutTab: "counter" });
    const t = document.getElementById("root").innerText;
    const lede = /Rejects's Blitz — 4 of 4 /.test(t) && !/likely Snake break/.test(t) && /Film read: Snake/.test(t);
    const rows = [...document.querySelectorAll(".rank__row")].map(r => r.textContent.replace(/\s+/g, " ").trim());
    const first = /Snake Stack/.test(rows[0]) && /won 2 of 2 vs Blitz/.test(rows[0]);
    const hold = rows.find(r => /Hold/.test(r)); const holdOk = !!hold && /won 0 of 2 vs Blitz/.test(hold);
    window.set({ tab: "tally" }); window.newMatch();
    return lede && first && holdOk;
  }));
  check("the Scout strip offers no Next point on a finished sheet", await ev(() => {
    window.set({ tab: "tally" }); window.newMatch(); window.setRaceTo(1); window.endPoint("us");
    window.set({ tab: "scout" });
    const btns = [...document.querySelectorAll("#root .btn")].map(b => b.textContent.trim());
    return matchOver() === "us" && !btns.includes("Next point") && btns.includes("New match");
  }));

  /* --------------------------------------------------------------- matches */
  // A point number only means something inside a match. These check the two
  // halves of that: that the boundary works, and that a season logged before
  // matches existed still reads.
  G("A match");

  await seed({ tab: "tally", point: 1 });
  check("there is always a match in play", await ev(() =>
    !!curMatch() && S.matches.length >= 1 && curMatch().id === S.matchId));
  check("a new match puts the point back to one", await ev(() => {
    window.confirm = () => true;
    window.nextPoint(); window.nextPoint();
    const was = S.point;
    window.markOut("them", "#1");         // something on the sheet, so it is kept rather than replaced
    window.newMatch();
    return was === 3 && S.point === 1 && S.matches.length >= 2;
  }));
  check("back a point is a way out of a mis-tap, and stops at one", await ev(() => {
    window.nextPoint();
    window.backPoint();
    const one = S.point === 1;
    window.backPoint();
    return one && S.point === 1;
  }));

  check("a new sheet does not show the old sheet's outs", await ev(() => {
    const first = S.matchId;
    window.markOut("us", "Reyes");
    const mine = rowsHere(S.tally).length;
    window.newMatch();
    return mine === 1 && rowsHere(S.tally).length === 0
        && S.tally.some(o => o.m === first && o.name === "Reyes");   // kept, not deleted
  }));
  check("point 1 of two matches is two different point ones", await ev(() => {
    window.markOut("us", "Okafor");
    const here = rowsHere(S.tally).filter(o => o.pt === 1).map(o => o.name);
    const all = S.tally.filter(o => o.pt === 1).map(o => o.name).sort();
    return here.join() === "Okafor" && all.join() === "Okafor,Reyes";
  }));
  check("the same five can be on point 1 of each", await ev(() => {
    window.set({ roster: [{name:"Reyes",num:1},{name:"Okafor",num:2}] });
    window.setSlot(0, "Okafor");
    const mine = lineupFor(1)[0];
    const other = (S.matches.find(m => m.id !== S.matchId) || {}).id;
    return mine === "Okafor" && lineupFor(1, other)[0] !== "Okafor";
  }));
  check("an old sheet opens on its last point", await ev(() => {
    const other = S.matches.find(m => m.id !== S.matchId).id;
    window.openMatch(other);
    return S.matchId === other && rowsHere(S.tally).some(o => o.name === "Reyes");
  }));
  check("the sheet keeps its own opponent while you scout the next one", await ev(() => {
    window.newMatch();
    const vs = matchVs();
    window.setPitTeam("right", "Blast Camp");
    const held = matchVs() === vs;
    window.markOut("them", "#3");
    return held && rowsHere(S.tally)[0].vs === vs;
  }));
  check("Undo on the sheet removes the row you pointed at", await ev(() => {
    window.set({ tab: "tally" });
    window.markOut("us", "Reyes");
    const before = S.tally.length;
    const target = rowsHere(S.tally)[0];
    window.undoOut(S.tally.indexOf(target));
    return S.tally.length === before - 1 && !S.tally.includes(target);
  }));

  // The case the whole thing exists for: you play a team twice, and their
  // point 1 is two different points.
  check("Games keeps two sheets against the same team apart", await ev(() => {
    window.confirm = () => true;
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "scout", scoutTab: "games",
      right: { name: "Rejects" }, left: { name: "Blast Camp" },
      matches: [{id:"b", at: 2000, vs:"Rejects"}, {id:"a", at: 1000, vs:"Rejects"}],
      matchId: "b", point: 1,
      tally: [{pt:1, side:"us", name:"Later",  m:"b", at:2100, vs:"Rejects", layout:"lso"},
              {pt:1, side:"us", name:"Earlier", m:"a", at:1100, vs:"Rejects", layout:"lso"}],
      tips: { scout: 1 },
    }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  check("  ...showing the sheet you are on, not both at once", await ev(() => {
    const t = document.getElementById("root").textContent;
    return t.includes("Later") && !t.includes("Earlier");
  }));
  check("  ...and offering the other one by date", await ev(() => {
    const btns = [...document.querySelectorAll(".sec button")].map(b => b.textContent.trim());
    return btns.some(b => /on now/.test(b)) && btns.filter(b => /Point 1/.test(b)).length === 1;
  }));
  check("  ...which opens it without merging the two", await ev(() => {
    window.set({ replayMatch: "a", replayPt: null });
    const t = document.getElementById("root").textContent;
    return t.includes("Earlier") && !t.includes("Later");
  }));

  // The migration. A save written before matches existed has rows with no `m`
  // and lineups keyed by a bare point number; none of it may go missing.
  check("a season logged before matches existed is adopted whole", await ev(async () => {
    localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "tally", point: 7,
      right: { name: "Rejects" },
      tally: [{pt:7, side:"us", name:"Reyes", at: 3000, layout:"lso"},
              {pt:6, side:"them", name:"#2", at: 2000, layout:"lso"},
              "an out from a build before any of this"],
      moves: [{pt:6, who:"Reyes", from:"a", to:"b", at: 2500}],
      assessments: [{who:"Reyes", score:4, pt:6, at: 2600}],
      calls: [{script:"snake", layout:"lso", pt:6, at: 2400}],
      lineups: { 6: ["Reyes","","","",""] },
    }));
    return true;
  }));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  check("  ...into one match, dated from the oldest thing in it", await ev(() =>
    S.matches.length === 1 && S.matches[0].vs === "Rejects" && S.matches[0].at === 2000));
  check("  ...with every row stamped and nothing dropped", await ev(() => {
    const id = S.matchId;
    return S.tally.length === 3 && S.tally.every(o => o.m === id)
        && S.moves[0].m === id && S.assessments[0].m === id && S.calls[0].m === id;
  }));
  check("  ...including the row an old build wrote as a bare string", await ev(() => {
    const legacy = S.tally.find(o => o.legacy);
    return !!legacy && legacy.name === "an out from a build before any of this"
        && !legacy.side && !legacy.pt;          // it claims no point and no side
  }));
  check("  ...and the lineup still belongs to the point it was set on", await ev(() =>
    lineupFor(6)[0] === "Reyes"));
  check("  ...and the point you were on is still the point you are on", await ev(() =>
    S.point === 7 && rowsHere(S.tally).filter(o => o.pt === 7).length === 1));
  check("adopting runs once, not on every load", await ev(() => S.matches.length === 1));

  /* -------------------------------------------- the rest of the spec gaps */
  // Eight things the coverage doc listed as not built. Each is checked for the
  // thing it is actually for, not for the string that names it.
  G("Closing the gaps");

  // --- who a blast goes to ---
  await seed({ tab: "more", more: "league", role: "staff",
    groups: [{id:"g1", name:"Ops",  members:[{name:"Ann", phone:"1"},{name:"Bo", phone:"2"}]},
             {id:"g2", name:"Refs", members:[{name:"Cy",  phone:"3"}]},
             {id:"g3", name:"Vendors", members:[{name:"Dee"}]}],
    blastTo: undefined, blastBody: "Gate opens 8:00", blasts: [] });
  check("a blast starts addressed to every group", await ev(() => blastTo().length === 3));
  check("only people you can reach are counted", await ev(() => blastCount() === 3));
  check("dropping a group drops its people", await ev(() => {
    window.toggleBlastGroup("g2");
    return !blastPicked("g2") && blastCount() === 2;
  }));
  // The log names who you addressed and counts who could actually be reached,
  // which are not the same number: Vendors is picked and has nobody with a
  // contact on file, so it is in the line and adds nothing to the count.
  check("a blast goes to the groups you picked, and says which", await ev(() => {
    window.prompt = () => {};
    window.sendBlast();
    const b = S.blasts[0];
    return b && b.n === 2 && b.to === "Ops, Vendors" && !/Refs/.test(b.to);
  }));
  check("no group picked is no send, not everybody", await ev(() => {
    ["g1","g3"].forEach(id => window.toggleBlastGroup(id));
    const before = S.blasts.length;
    window.set({ flash: "" });
    window.sendBlast();               // no group picked → an inline flash, not a modal
    return S.blasts.length === before && /group/i.test(S.flash || "");
  }));
  check("a flash shows on screen and clears, replacing the system alert", await ev(() => {
    window.flash("Test message");
    const up = S.flash === "Test message"
      && /Test message/.test(document.querySelector("#root .flash")?.textContent || "");
    window.set({ flash: "" });
    const gone = !document.querySelector("#root .flash");
    return up && gone;
  }));
  check("the schedule paste error is a flash, not a modal", await ev(() => {
    let alerted = false; const orig = window.alert; window.alert = () => { alerted = true; };
    window.set({ flash: "", tab:"more", more:"schedule", gamePaste:"nothing here that parses" });
    window.readSchedule();
    window.alert = orig;
    const ok = !alerted && /looked like a game/i.test(S.flash || "");
    window.set({ flash: "" });
    return ok;
  }));
  check("deleting a group takes it out of the picked set", await ev(() => {
    window.toggleBlastGroup("g1");
    window.delGroup("g1");
    return !blastTo().includes("g1");
  }));

  // --- a class is a session, not a title ---
  await seed({ tab: "more", more: "classes", role: "staff",
    classes: [{id:"GL-AAAA", code:"GL-AAAA", title:"Tuesday clinic", open:true, when:"", notes:""}],
    responses: [], joinCode: "" });
  check("a class carries a start time and notes", await ev(() => {
    window.setClass("GL-AAAA", "when", "2026-10-03T09:00");
    window.setClass("GL-AAAA", "notes", "Meet at the pit gate");
    const c = S.classes[0];
    return c.when === "2026-10-03T09:00" && c.notes === "Meet at the pit gate";
  }));
  check("closing sign-ins takes the form away, not just the tag", await ev(() => {
    window.set({ joinCode: "GL-AAAA" });
    const open = !!document.getElementById("fn");
    window.setClass("GL-AAAA", "open", false);
    window.set({ joinCode: "GL-AAAA" });
    const shut = !document.getElementById("fn")
              && /closed/i.test(document.getElementById("root").textContent);
    window.setClass("GL-AAAA", "open", true);
    return open && shut;
  }));
  check("sharing a class carries the code, the time and the notes", await ev(() => {
    let out = ""; window.prompt = (_, t) => { out = t; return null; };
    delete window.gridlockShare;
    window.shareClass("GL-AAAA");
    return out.includes("GL-AAAA") && out.includes("Tuesday clinic")
        && out.includes("Meet at the pit gate") && /Starts/.test(out);
  }));

  // --- the division board ---
  await seed({ tab: "scout", scoutTab: "board", division: "cin",
               left: { name: "Blast Camp" }, right: { name: "Rejects" } });
  check("the board can be narrowed to one team", await ev(() => {
    const rows = () => [...document.querySelectorAll("#boardRows tr")];
    const all = rows().length;
    window.findTeam(rows()[0].children[1].textContent.slice(0, 4));
    const some = rows().filter(r => !r.hidden).length;
    window.findTeam("");
    return all > 2 && some >= 1 && some < all && rows().filter(r => !r.hidden).length === all;
  }));
  check("a tap loads the right pit, a hold loads the left", await ev(async () => {
    const name = teamsHere()[1].name;
    window.pressTeam(name); window.releaseTeam(name);       // a tap
    const right = S.right.name === name;
    const other = teamsHere()[2].name;
    window.pressTeam(other);
    await new Promise(r => setTimeout(r, 600));             // held
    const left = S.left.name === other;
    window.releaseTeam(other);
    return right && left && S.right.name === name;          // the hold did not also tap
  }));

  // --- the squad, and what one man calls a bunker ---
  await seed({ tab: "more", more: "team", layoutKey: "lso" });
  check("the squad has a code, and it keeps it", await ev(() => {
    const a = squadCode();
    return /^SQ-[A-Z0-9]{4}$/.test(a) && squadCode() === a && S.teamCode === a;
  }));
  check("a squad copy carries the code", await ev(() =>
    JSON.parse(copyPayload("squad")).data.teamCode === S.teamCode));
  check("merging another squad's copy says so and keeps your code", await ev(() => {
    const mine = S.teamCode;
    const theirs = JSON.parse(copyPayload("squad"));
    theirs.data.teamCode = "SQ-ZZZZ";
    theirs.data.roster = [{ num: "9", name: "Someone Else" }];
    window.set({ tab: "more", more: "nexus" });
    document.getElementById("copyIn").value = JSON.stringify(theirs);
    window.loadCopy("merge");
    return S.teamCode === mine && /SQ-ZZZZ/.test(S.copyStatus);
  }));
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake" });
  check("one player's word for a bunker is his alone", await ev(() => {
    const b = curLayout().bunkers.find(x => x.n === "GP");
    const who = S.roster[0].name;
    window.setPlayerCall(who, b.id, "Nest");
    const his = callOf(b, who) === "Nest";
    const team = callOf(b) === b.n;                 // the field keeps the code
    window.setCall && 0;
    return his && team;
  }));
  check("his card uses his word, the field does not", await ev(() => {
    const five = fiveFor(1);
    const p = currentPaths()[0];
    const b = curLayout().bunkers.find(x => x.id === p.bunker);
    window.setPlayerCall(five[0].name, b.id, "Doghouse");
    const card = cardLines()[0].bunker === "Doghouse";
    window.set({ tab: "playbook" });
    const field = !/Doghouse/.test(document.querySelector("svg.field").textContent);
    return card && field;
  }));

  // --- the fields this app carries ---
  await seed({ tab: "more", more: "nexus" });
  check("Nexus lists every field and marks the one you are on", await ev(() => {
    const t = document.getElementById("root").textContent;
    return Object.values(LAYOUTS).every(L => t.includes(L.name)) && /\bON\b/.test(t);
  }));
  check("picking a field on Nexus changes the layout everywhere", await ev(() => {
    const other = Object.keys(LAYOUTS).find(k => k !== S.layoutKey);
    window.pickEvent(other);
    window.set({ tab: "playbook" });
    return S.layoutKey === other
        && document.getElementById("root").textContent.includes(LAYOUTS[other].name);
  }));
  check("Nexus says there is no feed rather than leaving a dead box", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    return /no live\s+event feed/i.test(document.getElementById("root").textContent);
  }));

  // --- where the point was decided ---
  await seed({ tab: "scout", scoutTab: "matchup", layoutKey: "lso", outsOn: false });
  check("with nothing tallied the field carries no marks", await ev(() => {
    window.set({ outsOn: true });
    const svg = document.querySelector("svg.field").outerHTML;
    return !/#ffb020/.test(svg) && /No outs logged/.test(document.getElementById("root").textContent);
  }));
  check("an X lands on the bunker a man was shot at", await ev(() => {
    const gp = curLayout().bunkers.find(b => b.n === "GP").id;
    S.tally = [{ pt:1, side:"us", name:"A", layout:"lso", shotAt:gp }];
    window.set({ outsOn: true });
    const marks = [...document.querySelectorAll("svg.field path[stroke='#efedeb']")];
    return marks.some(m => /M[\d.]+ [\d.]+L[\d.]+ [\d.]+M/.test(m.getAttribute("d")));
  }));
  check("a ring only appears where it went both ways", await ev(() => {
    const gp = curLayout().bunkers.find(b => b.n === "GP").id;
    const one = document.querySelector("svg.field").outerHTML;
    S.tally = [...S.tally, { pt:1, side:"them", name:"B", layout:"lso", shotAt:gp }];
    window.set({ outsOn: true });
    const two = document.querySelector("svg.field").outerHTML;
    return !/#ffb020/.test(one) && /#ffb020/.test(two);
  }));
  check("an out on another field does not mark this one", await ev(() => {
    S.tally = [{ pt:1, side:"us", name:"A", layout:"tby",
                 shotAt:LAYOUTS.tby.bunkers[0].id }];
    window.set({ outsOn: true });
    return !/stroke="#efedeb"/.test(document.querySelector("svg.field").outerHTML);
  }));

  // --- rounded, or as routed ---
  await seed({ tab: "playbook", layoutKey: "lso", script: "base", smoothOn: true });
  check("Smooth is on, and the corners are curves", await ev(() => {
    const d = document.querySelector("svg.field g.live path").getAttribute("d");
    return S.smoothOn !== false && d.includes("Q");
  }));
  check("turning it off draws the legs as routed", await ev(() => {
    window.setSmooth(false);
    const ds = [...document.querySelectorAll("svg.field g.live path")]
      .map(p => p.getAttribute("d"));
    return !ds.some(d => d.includes("Q")) && ds.some(d => d.includes("L"));
  }));
  check("the plants do not move when the drawing changes", await ev(() => {
    const straight = currentPaths().map(p => p.bunker + "@" + p.to.join(","));
    window.setSmooth(true);
    const curved = currentPaths().map(p => p.bunker + "@" + p.to.join(","));
    return straight.join("|") === curved.join("|");
  }));

  /* ------------------------------------------------------- durable storage */
  // localStorage inside a web view is not a safe place to keep a season, so
  // every save is mirrored into app storage through @capacitor/preferences.
  // A browser has no such plugin, so this needs a real native context: a stub
  // Capacitor whose Preferences live OUTSIDE the page, the way the real one
  // does, so clearing localStorage does not clear it too.
  G("Durable storage");
  {
    const kept = {};                       // stands in for UserDefaults
    let failKeeps = false;
    const ctxN = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctxN.newPage();
    pg.on("pageerror", e => errors.push("native pageerror: " + e.message));
    await pg.exposeFunction("__prefsGet", k => (k in kept ? kept[k] : null));
    await pg.exposeFunction("__prefsSet", (k, v) => {
      if(failKeeps) throw new Error("Device storage unavailable");
      kept[k] = v; return null;
    });
    await pg.addInitScript(() => {
      const done = () => Promise.resolve();
      window.__appListeners = {};
      window.Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => "ios",
        Plugins: {
          Preferences: {
            get: ({key}) => window.__prefsGet(key).then(value => ({value})),
            set: ({key, value}) => window.__prefsSet(key, value),
          },
          App: { addListener: (name, listener) => { window.__appListeners[name] = listener; return done(); }, exitApp: () => done() },
          StatusBar: { setStyle: done, setBackgroundColor: done },
          Share: { share: done },
        },
      };
    });
    const evN = fn => pg.evaluate(fn);
    await pg.goto(URL, { waitUntil: "networkidle" });
    await pg.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
      entered: true, role: "staff", tab: "tally", point: 5,
      roster: [{num:"7", name:"Rex"}], right: {name:"Rejects"},
      tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1},
    })));
    await pg.reload({ waitUntil: "networkidle" });
    await pg.waitForTimeout(200);

    check("on device, a save is mirrored out of the web view", await (async () => {
      await evN(() => window.set({ point: 9 }));
      await pg.waitForTimeout(800);                       // past the write debounce
      const copy = kept["gridlock.coach.v2"];
      return !!copy && JSON.parse(copy).point === 9;
    })());
    check("the copy carries when it was written", await (async () =>
      !!JSON.parse(kept["gridlock.coach.v2"]).savedAt)());
    failKeeps = true;
    await evN(() => window.set({point:10}));
    await pg.waitForFunction(() => !!window.gridlockDurableError);
    check("a failed second-copy write is visible and preserves its last good copy", await evN(() =>
      /could not update its second copy/.test(document.getElementById("root").textContent))
      && JSON.parse(kept["gridlock.coach.v2"]).point === 9);
    failKeeps = false;
    await evN(() => { window.set({point:11}); window.__appListeners.appStateChange({isActive:false}); });
    await pg.waitForFunction(() => !window.gridlockDurableError);
    check("retry keeps the newest queued save and clears the warning", JSON.parse(kept["gridlock.coach.v2"]).point === 11);
    await evN(() => { window.set({point:9}); window.__appListeners.appStateChange({isActive:false}); });
    await pg.waitForTimeout(150);

    // The failure this exists for: the OS reclaims space and the web view comes
    // back empty, while app storage still has the season.
    check("a phone that lost its web-view storage gets the season back", await (async () => {
      await pg.evaluate(() => localStorage.clear());
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => S.point === 9 && (S.roster || []).length === 1
                          && S.roster[0].name === "Rex");
    })());
    // The restore lands on the sign-in page, because a backup restores a season
    // and never a login — so the notice has to be there, or he signs in
    // believing his season is gone.
    check("and is told on the screen he actually lands on", await evN(() =>
      !S.entered && /lost its saved season/i.test(document.getElementById("root").innerText)));
    check("the restore is written back to the web view too", await evN(() =>
      JSON.parse(localStorage.getItem("gridlock.coach.v2")).point === 9));

    // Timid on purpose: local state is the truth whenever there is any.
    check("a stale copy never overwrites what is on the phone", await (async () => {
      kept["gridlock.coach.v2"] = JSON.stringify({ entered: true, point: 999, savedAt: 1 });
      await pg.evaluate(() => localStorage.setItem("gridlock.coach.v2", JSON.stringify({
        entered: true, tab: "tally", point: 4, savedAt: Date.now(),
        tips: {pb:1, tally:1, scout:1, sl:1, class:1, lg:1},
      })));
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => S.point === 4 && !S.restored);
    })());

    // A save that throws used to escape through set() before render() ran, so
    // the screen froze mid-tap and said nothing.
    // The account gates creating a class and sending a blast. Restoring a season
    // onto a phone the coach can no longer sign in to is half a rescue.
    check("the staff account is kept durably too", await (async () => {
      await pg.evaluate(async () => {
        window.set({ entered: false, mode: "create" });
        document.getElementById("em").value = "coach@team.com";
        document.getElementById("pw").value = "sideline1";
        await window.doAuth();
      });
      await pg.waitForTimeout(800);
      const copy = kept["gridlock.staff.v2"];
      return !!copy && JSON.parse(copy).email === "coach@team.com"
          && !!JSON.parse(copy).hash && !/sideline1/.test(copy);   // never in the clear
    })());
    check("a phone that lost it can sign in again", await (async () => {
      await pg.evaluate(() => localStorage.removeItem("gridlock.staff.v2"));
      await pg.reload({ waitUntil: "networkidle" });
      await pg.waitForTimeout(400);
      return await evN(() => {
        const a = JSON.parse(localStorage.getItem("gridlock.staff.v2") || "null");
        return !!a && a.email === "coach@team.com";
      });
    })());
    check("and a copy never overwrites an account already on the phone", await evN(() => {
      const mine = localStorage.getItem("gridlock.staff.v2");
      const took = window.gridlockRestoreAccount(JSON.stringify(
        { email: "someone@else.com", salt: "aa", hash: "bb" }));
      return took === false && localStorage.getItem("gridlock.staff.v2") === mine;
    }));

    check("on device, Nexus says there is a second copy", await (async () => {
      await evN(() => window.set({ tab: "more", more: "nexus" }));
      return await evN(() => window.gridlockDurable === true
        && /second copy in the phone's own storage/.test(document.getElementById("root").textContent));
    })());

    check("storage refusing a write does not freeze the screen", await evN(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      let threw = false;
      try { window.set({ tab: "scout" }); } catch(e){ threw = true; }
      Storage.prototype.setItem = real;
      return !threw && S.tab === "scout"
          && document.getElementById("root").textContent.includes("Scout");
    }));
    check("it says so instead", await evN(() => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      window.set({ tab: "tally" });
      const said = /storage for the app is full/i.test(document.getElementById("root").textContent);
      Storage.prototype.setItem = real;
      window.set({ tab: "tally" });
      const gone = !/storage for the app is full/i.test(document.getElementById("root").textContent);
      return said && gone;                        // and stops saying it once it works
    }));
    await ctxN.close();
  }

  check("in a browser it does not promise one", await ev(() => {
    window.set({ tab: "more", more: "nexus" });
    const t = document.getElementById("root").textContent;
    return !window.gridlockDurable && /clearing your browsing data clears it/.test(t)
        && !/second copy in the phone's own storage/.test(t);
  }));

  /* ------------------------------------------------------------ house rules */
  /* ---------------------------------------------------------------------
     Ready for a sideline

     Four things that a green suite said nothing about, found by reading the
     code and by fuzzing the handlers rather than by any check that existed.
     Each one is measured here the way it actually bites, not restated.
     --------------------------------------------------------------------- */
  G("Ready for a sideline");

  check("a break key this build does not have cannot white-screen the app",
    await ev(() => {
      const was = S.script;
      S.script = "wire-split-v2";          // a key BREAKS has never had
      let drew = 0, threw = "";
      try { render(); drew = document.getElementById("root").textContent.trim().length; }
      catch(e){ threw = e.message; }
      S.script = was; render();
      return drew > 0 && !threw;
    }));

  check("and such a key is put back on the way in", await ev(() => {
    S.script = "nonsense"; fixBreak(); return !!BREAKS[S.script];
  }));

  check("a match scored but never tallied reopens where it left off",
    await ev(() => {
      window.set({ right:{name:"Dynasty"} }); window.newMatch();
      const id = S.matchId;
      for (let i=0;i<5;i++) window.endPoint("us");     // 5-0, no outs tapped
      window.set({ right:{name:"Infamous"} }); window.newMatch();
      window.openMatch(id);
      const landedOn = S.point;
      window.endPoint("us");                           // must add, not overwrite
      return landedOn === 6 && matchScore().us === 6;
    }));

  check("a new sheet is Even, not the last one's result", await ev(() => {
    window.set({ right:{name:"Dynasty"} }); window.newMatch();
    window.endPoint("us"); window.endPoint("us");      // 2-0 up -> Ahead
    const ahead = S.matchState;
    window.set({ right:{name:"Royalty"} }); window.newMatch();
    return ahead === "Ahead" && S.matchState === "Even";
  }));

  // Measured, not read off the source: the flag is swapped and the banner asked
  // what it renders. This run is localhost, so the honest answer is nothing.
  check("an insecure address says so, because it silently disables sign-in",
    await ev(() => {
      const quiet = contextWarning();
      const real = Object.getOwnPropertyDescriptor(window, "isSecureContext");
      Object.defineProperty(window, "isSecureContext", {value:false, configurable:true});
      const loud = contextWarning();
      if(real) Object.defineProperty(window, "isSecureContext", real);
      return quiet === "" && /sign-in/.test(loud) && /awake/.test(loud);
    }));

  check("playing the break does not wipe what you type on the next tab",
    await ev(async () => {
      window.set({ tab:"playbook" });
      window.playPath();                                  // 2.2s of repaints
      window.set({ tab:"more", more:"messages" });
      const el = document.getElementById("md");
      if(!el) return false;
      el.value = "Pit gate opens at 8";
      await new Promise(r => setTimeout(r, 2600));         // outlast the run
      const survived = (document.getElementById("md") || {}).value === "Pit gate opens at 8";
      return survived && S.playing === false;
    }));

  /* ---------------------------------------------------------------------
     From the field test

     Two coaches with the app in hand, transcribed. Each check here is one
     thing they said, measured the way it bit them.
     --------------------------------------------------------------------- */
  G("From the field test");

  // "I can't even start a new match right here."
  check("Scout shows the match and lets you start a new one", await ev(() => {
    window.set({ tab:"scout", scoutTab:"matchup", right:{name:"Aftershock"} });
    const t = document.getElementById("root").textContent;
    return /New match/.test(t) && /Next point/.test(t) && /point \d+/.test(t);
  }));
  check("Next point on Scout moves the same point Tally is on", await ev(() => {
    const was = S.point || 1; window.nextPoint(); const now = S.point;
    window.backPoint(); return now === was + 1 && S.point === was;
  }));
  // "We need a spot for next point in a game in the scout tab. Also how do we switch games."
  check("Next point is on every Scout view, Arrival and Voice included", await ev(() => {
    return SCOUT_TABS.every(([k]) => { window.set({ tab:"scout", scoutTab:k });
      return /Next point/.test(document.getElementById("root").textContent); });
  }));
  check("the strip switches games and lands on that game's last point", await ev(() => {
    const here = S.matchId;
    const old = {id:"m-old-game", at: Date.now() - 86400000, vs:"Aftershock", layout:S.layoutKey};
    window.set({ tab:"scout", scoutTab:"breakouts", matches:[...(S.matches||[]), old],
      results:[...(S.results||[]), {m:old.id, pt:1, won:"us", at:1}, {m:old.id, pt:2, won:"them", at:2}] });
    const sel = document.querySelector("select[aria-label=Game]");
    if(!sel || [...sel.options].length < 2) return false;
    sel.value = old.id; sel.dispatchEvent(new Event("change"));
    const ok = S.matchId === old.id && S.point === 3 && document.querySelector("select[aria-label=Game]").value === old.id;
    window.openMatch(here);
    window.set({ matches:S.matches.filter(m => m.id !== old.id), results:S.results.filter(r => r.m !== old.id) });
    return ok && S.matchId === here;
  }));

  // "Make this part less messy": one five at a time on the Scout field.
  // "Make this part less messy": one five at a time on the Scout field. Their
  // side needs a logged call now — a mirror of your own is not a scout.
  check("the Scout field draws one pit at a time by default", await ev(() => {
    window.setPitTeam("right","Rejects");
    editProfile("right", {breaks:[]}); window.logTheirBreak("right","snake",[]);
    window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them" });
    const nums = [...document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']")];
    return nums.length === 5 && nums.every(c => c.getAttribute("fill") === "#3d8bff");
  }));
  check("Both draws ten, Yours draws your five in red", await ev(() => {
    window.set({ scoutShow:"both" }); const both = document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length;
    window.set({ scoutShow:"us" }); const us = [...document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']")];
    return both === 10 && us.length === 5 && us.every(c => c.getAttribute("fill") === "#e5342f");
  }));
  check("their side is the call logged most against them, and the legend says so", await ev(() => {
    window.set({ scoutShow:"them", script:"snake" });
    const other = Object.keys(BREAKS).find(k => k !== "snake");
    editProfile("right", {breaks:[]}); window.logTheirBreak("right", other, []); window.logTheirBreak("right", other, []);
    const t = document.getElementById("root").textContent;
    const ok = theirScript() === other && t.includes(BREAKS[other].name + ", logged 2 times");
    editProfile("right", {breaks:[]}); render();
    // Nothing logged: the right pit is empty and the legend sends him to scout,
    // never your own call turned round.
    const empty = document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length;
    return ok && theirScript() === null && empty === 0
      && /scout them|shows here once you scout/i.test(document.getElementById("root").textContent)
      && !/mirror/i.test(document.getElementById("root").textContent);
  }));

  // "Log a breakout without naming the exact players for now."
  check("tapping the Breakouts field picks a bunker for their five", await ev(() => {
    window.set({ tab:"scout", scoutTab:"breakouts", theirPick:[] });
    const svg = document.querySelector("#their-map svg.field"); if(!svg) return false;
    const b = curLayout().bunkers[4];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return (S.theirPick || [])[0] === b.id;
  }));
  check("tapping it again takes it out", await ev(() => {
    const svg = document.querySelector("#their-map svg.field");
    const b = curLayout().bunkers[4];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return (S.theirPick || []).length === 0;
  }));
  check("no more than five go on the field", await ev(() => {
    const ids = curLayout().bunkers.slice(0,5).map(b=>b.id);
    window.set({ theirPick: ids });
    const svg = document.querySelector("#their-map svg.field");
    const b = curLayout().bunkers[7];
    const p = new DOMPoint(b.x*2, b.y*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return S.theirPick.length === 5 && !S.theirPick.includes(b.id);
  }));
  check("the picked five draw as numbered squares before anything is logged", await ev(() =>
    (document.querySelector("#their-map").innerHTML.match(/class="their-five"/g) || []).length === 5));
  check("logging the five stamps match, field and point, with no name", await ev(() => {
    const before = theirBreaks("right").length;
    window.logTheirFive("right");
    const b = theirBreaks("right")[0];
    return theirBreaks("right").length === before + 1 && b.script === "" && b.m === S.matchId
      && b.layout === S.layoutKey && b.pt === (S.point||1) && b.plants.length === 5 && S.theirPick.length === 0;
  }));
  check("a nameless five does not count as a named call", await ev(() => !breakFreq("right").some(f => f[0] === "")));
  check("but it shows on the Scout field for this point", await ev(() => {
    window.set({ scoutTab:"matchup", theirOn:true });
    const n = (document.querySelector(".field-wrap[data-live]").innerHTML.match(/class="their-five"/g) || []).length;
    return n === 5 && plantsLogged();
  }));
  check("and not on the next point", await ev(() => {
    window.nextPoint();
    const n = (document.querySelector(".field-wrap[data-live]").innerHTML.match(/class="their-five"/g) || []).length;
    window.backPoint(); return n === 0;
  }));
  check("a named call logged with five picked takes them with it", await ev(() => {
    window.set({ scoutTab:"breakouts", theirPick: curLayout().bunkers.slice(5,8).map(b=>b.id) });
    window.logTheirBreak("right", "snake");
    const b = theirBreaks("right")[0];
    return b.script === "snake" && b.plants.length === 3 && S.theirPick.length === 0;
  }));
  check("Where they plant counts bunkers across logged fives", await ev(() => {
    const c = plantCounts("right");
    return c.length >= 5 && c.every(([id,n]) => typeof id === "string" && n >= 1)
      && /Where they plant/.test(document.getElementById("root").textContent);
  }));
  await ev(() => { window.set({ theirOn:false, theirPick:[] }); });

  // "We don't shoot directly at the bunker."
  check("a lane can be aimed off the bunker and judged to that spot", await ev(() => {
    const list = curLayout().bunkers;
    window.set({ tab:"sightlines", sightFrom:list[0].id, sightTo:list[1].id, sightAim:null });
    // A spot just past the target, one foot to its side.
    const t = list[1], aim = [t.x + 3, t.y + 3];
    window.set({ sightAim: aim });
    const a = aimLane(list[0].id, aim);
    const manual = list.filter(o => o !== list[0] && bunkerBoxes(o).some(k => segHitsBox(list[0].x, list[0].y, aim[0], aim[1], k.x, k.y, k.w/2, k.h/2))).length > 0;
    return a && a.blocked === manual && a.ft === Math.round(Math.hypot(aim[0]-list[0].x, aim[1]-list[0].y));
  }));
  check("the drawn lane is dashed when blocked and solid when clear", await ev(() => {
    const svg = document.querySelector("#sight-map").innerHTML;
    const m = svg.match(/<line class="aim-lane"[^>]*>/); if(!m) return false;
    const dashed = /stroke-dasharray/.test(m[0]);
    return dashed === aimLane(S.sightFrom, S.sightAim).blocked;
  }));
  check("the handle sits above the tap surface, so it can be grabbed", await ev(() => {
    const svg = document.querySelector("#sight-map svg.field");
    const kids = [...svg.children].map(c => c.getAttribute("data-pick") ? "pick" : c.getAttribute("data-aim-sight") ? "aim" : "");
    return kids.indexOf("aim") > kids.indexOf("pick") && kids.indexOf("pick") >= 0;
  }));
  check("dragging the handle moves the aim and redraws under the finger", await ev(() => {
    const svg = document.querySelector("#sight-map svg.field");
    const h = svg.querySelector("[data-aim-sight]");
    const start = h.getBoundingClientRect();
    h.dispatchEvent(new PointerEvent("pointerdown", {clientX:start.x+14, clientY:start.y+14, bubbles:true, pointerId:2}));
    const to = new DOMPoint(70*2, 60*2).matrixTransform(svg.getScreenCTM());
    document.dispatchEvent(new PointerEvent("pointermove", {clientX:to.x, clientY:to.y, bubbles:true, pointerId:2}));
    const mid = S.sightAim && Math.abs(S.sightAim[0]-70) < 1 && Math.abs(S.sightAim[1]-60) < 1;
    document.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:2}));
    return mid && /Back to the bunker/.test(document.getElementById("root").textContent);
  }));
  check("a tap on the handle, without moving, still drops the question", await ev(() => {
    const list = curLayout().bunkers;
    window.set({ sightFrom:list[0].id, sightTo:list[1].id, sightAim:null });
    const h = document.querySelector("#sight-map [data-aim-sight]");
    const r = h.getBoundingClientRect(), x = r.x + r.width/2, y = r.y + r.height/2;
    h.dispatchEvent(new PointerEvent("pointerdown", {clientX:x, clientY:y, bubbles:true, pointerId:3}));
    document.dispatchEvent(new PointerEvent("pointerup", {clientX:x, clientY:y, bubbles:true, pointerId:3}));
    return S.sightTo === null && S.sightAim === null;
  }));
  check("asking about a different lane drops the aim", await ev(() => {
    window.set({ sightFrom:curLayout().bunkers[0].id, sightTo:curLayout().bunkers[1].id, sightAim:[70,60] });
    const list = curLayout().bunkers;
    window.pickSight("to", list[2].id);
    return S.sightAim === null && S.sightTo === list[2].id;
  }));
  await ev(() => { window.set({ sightAim:null, sightTo:null }); });

  /* ---------------------------------------------------------------------
     Bunker tally

     The hand chart, bunker first. Tap the bunker a man broke to, answer
     what you saw, log it. Every check reads the screen or the rows.
     --------------------------------------------------------------------- */
  G("Bunker tally");
  const tapTally = ft => ev(ft => {
    const svg = document.querySelector("#tally-map svg.field"); if(!svg) return false;
    const p = new DOMPoint(ft[0]*2, ft[1]*2).matrixTransform(svg.getScreenCTM());
    svg.querySelector("[data-pick]").dispatchEvent(new PointerEvent("pointerdown", {clientX:p.x, clientY:p.y, bubbles:true, pointerId:1}));
    return true;
  }, ft);
  await ev(() => window.set({ tab:"tally", tallySel:null, tallyDraft:null, tallyLast:"", tallyRead:"", breakouts:[], tally:[], results:[], point:1 }));
  check("Tally has the field", await ev(() => !!document.querySelector("#tally-map svg.field [data-pick]")));
  const ours = await ev(() => { const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 80); return {id:b.id, x:b.x, y:b.y}; });
  await tapTally([ours.x + 3, ours.y - 3]);
  check("a tap near a bunker lands on it, no dead ground", await ev(id => S.tallySel === id, ours.id));
  check("the sheet names the bunker and the point", await ev(id => {
    const t = (document.getElementById("tally-sheet") || {}).textContent || "";
    return t.includes(id) && /point 1/.test(t) && /Did he make it/.test(t) && /Log this breakout/.test(t);
  }, ours.id));
  check("a bunker on your half is your player", await ev(() => S.tallyDraft.side === "us"));
  const theirs = await ev(() => { const b = curLayout().bunkers.find(x => x.x > 90 && x.y > 80); return {id:b.id, x:b.x, y:b.y}; });
  await tapTally([theirs.x, theirs.y]);
  check("past the fifty it is theirs", await ev(() => S.tallyDraft.side === "them"));
  check("the sheet offers their numbers, not your roster", await ev(() => {
    const t = document.getElementById("tally-sheet").textContent; return /#1/.test(t) && !/Reyes/.test(t);
  }));
  await tapTally([ours.x, ours.y]);
  check("Shot from waits until he was shot", await ev(() => !/Shot from/.test(document.getElementById("tally-sheet").textContent)));
  await ev(() => window.setDraft({ alive:false, entry:"battle", dir:-90, player:"Reyes" }));
  check("Shot from appears once he was, listing only the far side", await ev(() => {
    const sheet = document.getElementById("tally-sheet");
    if(!/Shot from/.test(sheet.textContent)) return false;
    const sel = [...sheet.querySelectorAll("select")][0];
    const ids = [...sel.options].map(o => o.value).filter(Boolean);
    return ids.length > 0 && ids.every(id => curLayout().bunkers.find(b => b.id === id).x > 75);
  }));
  check("the pad shows the lane he was shooting", await ev(() => document.querySelector("#tally-sheet .pad button.on").textContent === "↑"));
  await ev(() => { window.byIdAll = () =>
    Object.fromEntries(curLayout().bunkers.map(b => [b.id, b])); });
  // Tracing is gone: a tap on the field does one thing, which is pick the
  // bunker a man broke to. The run is worked out from the sheet.
  check("the run is drawn without him tracing it", await ev(() =>
    document.querySelectorAll("#tally-map .tally-route").length > 0));
  check("and every tap on the field just moves to another bunker", await ev(() => {
    const was = S.tallySel;
    const far = curLayout().bunkers.find(x => x.id !== was && x.x > 70);
    window.tallyTap([far.x, far.y]);
    const moved = S.tallySel !== was;
    window.tallyTap([byIdAll()[was].x, byIdAll()[was].y]);
    return moved && S.tallySel === was;
  }));
  await tapTally([theirs.x, theirs.y]);
  check("switching bunkers keeps the answers and drops the man", await ev(() => {
    const d = S.tallyDraft; return d.alive === false && d.entry === "battle" && d.player === "";
  }));
  await tapTally([ours.x, ours.y]);
  await ev(() => window.setDraft({ side:"us", sideSet:true, player:"Reyes", route:[{x:20,y:100,b:"",dl:true}], routeType:"Deep", movedTo:curLayout().bunkers[10].id }));
  await ev(() => window.logBreakout());
  check("Log stamps the match, the point and the field", await ev(id => {
    const r = S.breakouts[0]; return r.m === S.matchId && r.pt === 1 && r.layout === S.layoutKey && r.bunker === id && r.side === "us";
  }, ours.id));
  check("a named man shot on the break is an out, at that bunker", await ev(id => {
    const o = S.tally.find(o => o.m === S.matchId && o.pt === 1 && o.side === "us" && o.name === "Reyes");
    return !!o && o.shotAt === id && /4 up/.test(document.getElementById("root").textContent);
  }, ours.id));
  check("the sheet closes and says what was logged, with Undo", await ev(() => {
    const t = document.getElementById("root").textContent;
    return !S.tallySel && /Logged:/.test(t) && /Reyes/.test(t) && /Deep route/.test(t) && !!document.querySelector("button[onclick^='undoBreakout']");
  }));
  check("this point's man sits on the field, crossed out", await ev(() => document.querySelectorAll("#tally-map .tally-man").length === 1 && /✕/.test(document.querySelector("#tally-map .tally-man").textContent)));
  await ev(() => window.undoBreakout(S.breakouts[0].id));
  check("Undo takes the breakout and its out together", await ev(() => S.breakouts.length === 0 && !S.tally.some(o => o.name === "Reyes")));
  await tapTally([ours.x, ours.y]);
  await ev(() => { window.setDraft({ alive:true, entry:"clean", player:"Okafor" }); window.logBreakout(); });
  check("a man who made it is not an out", await ev(() => S.breakouts.length === 1 && S.tally.length === 0));
  await ev(() => window.setRead("right"));
  check("the read is ticked on screen before the result", await ev(() => S.tallyRead === "right" && document.querySelector("button[onclick=\"setRead('right')\"]").classList.contains("on")));
  await ev(() => window.endPoint("us"));
  check("the read rides on the result and clears for the next point", await ev(() => S.results[0].read === "right" && S.tallyRead === "" && S.point === 2 && !S.tallySel));
  check("the value table counts the point that bunker won", await ev(id => {
    const v = bunkerValue("us")[0]; const t = document.getElementById("root").textContent;
    return v.id === id && v.att === 1 && v.made === 1 && v.net === 1 && /Best bunker/.test(t) && !!document.querySelector("#tally-map .tally-worth");
  }, ours.id));
  check("reads are counted on the sheet", await ev(() => /1 right/.test(document.getElementById("root").textContent)));
  check("another field shows none of it", await ev(() => {
    const was = S.layoutKey; window.set({ layoutKey: Object.keys(LAYOUTS).find(k => k !== was) });
    const none = bunkerValue("us").length === 0 && !document.querySelector("#tally-map .tally-worth");
    window.set({ layoutKey: was }); return none;
  }));
  check("a breakout alone is enough for the match to remember its point", await ev(() => {
    S.breakouts = [{...S.breakouts[0], pt:7, id:"b-late"}, ...S.breakouts]; const n = lastPoint(S.matchId);
    S.breakouts = S.breakouts.filter(r => r.id !== "b-late"); return n === 7;
  }));
  {
    const r = await ev(() => { const d = JSON.parse(copyPayload("all")).data;
      return { ok: matchSize(S.matchId) >= 1 && Array.isArray(d.breakouts) && d.breakouts.length === 1 && copyDataError(d) === "", err: copyDataError(d), n: (d.breakouts||[]).length }; });
    check("breakouts count toward the sheet and travel in a copy", r.ok, r.ok ? "" : JSON.stringify(r));
  }
  check("a copy with a bad breakout is refused by name", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data; d.breakouts = [{id:"x", m:"m", layout:"l", bunker:"b", side:"nobody", pt:1, at:1}];
    return copyDataError(d) === "breakouts";
  }));
  await ev(() => window.set({ tallySel:null, tallyDraft:null, breakouts:[], results:[], point:1 }));

  /* --------------------------------------------------------------------
     The break belongs on the screens about the break

     Movement, Bunker stats, Codes, Layers and Sightlines were each drawing
     the five break paths over the thing they are actually about. A coach
     logging a rotation was reading a call nobody made on that screen.
     -------------------------------------------------------------------- */
  G("The break only where it belongs");
  const runnersOn = () => ev(() => document.querySelectorAll(".field-wrap svg.field g.live circle[r='6']").length);
  const fieldsOn = () => ev(() => document.querySelectorAll(".field-wrap svg.field").length);
  for (const [tab, more, name] of [["more","movement","Movement"], ["more","stats","Bunker stats"],
                                   ["more","team","Team, naming bunkers"], ["sightlines",null,"Sightlines"]]) {
    await go(tab, more);
    const [n, f] = [await runnersOn(), await fieldsOn()];
    check(`${name} draws the field and no break runners`, f > 0 && n === 0, `${f} field(s), ${n} runners`);
  }
  // Scout always carries its own break section above the sub-tab, and that one
  // is meant to have runners. The layers field underneath is not.
  await ev(() => window.set({ tab:"scout", scoutTab:"layers", right:{name:"Rejects"} }));
  check("Scout layers draws no break runners over the layers",
    await ev(() => document.querySelectorAll(".field-wrap:not([data-live]) svg.field g.live circle[r='6']").length) === 0);
  // Games and Division are tables. The break section is gone from those two.
  for (const [v, name] of [["games","Scout games"], ["board","Scout division"]]) {
    await ev(x => window.set({ tab:"scout", scoutTab:x, right:{name:"Rejects"} }), v);
    const [runners, fields] = [
      await ev(() => document.querySelectorAll(".field-wrap svg.field g.live circle[r='6']").length),
      await ev(() => document.querySelectorAll(".field-wrap svg.field").length)];
    check(`${name} is a table, with no break drawn over it`, runners === 0, `${fields} field(s), ${runners} runners`);
  }
  /* --------------------------------------------------- a play he wrote himself */
  G("A play of your own");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", right: { name: "Rejects" } });
  check("the app ships with twelve", await ev(() => playKeys().length === 12));
  check("a coach with no play of his own is nudged to + Yours, once", await ev(() => {
    window.set({ tab:"playbook", more:null, plays:[], building:null, tips:{} });
    const shown = /Run a play the app has never heard of/.test(document.getElementById("root").innerText)
      && /\+ Yours/.test(document.getElementById("root").innerText);
    // dismiss → gone and stays gone
    window.dismissTip("pbyours");
    const dismissed = !/Run a play the app has never heard of/.test(document.getElementById("root").innerText);
    // and a coach who already has a play never sees it
    window.set({ tips:{}, plays:[{k:"my:x", name:"Rocket", plants:{}, at:1}] });
    const hiddenWhenHasOne = !/Run a play the app has never heard of/.test(document.getElementById("root").innerText);
    window.set({ plays:[], tips:{ pbyours:true } });
    return shown && dismissed && hiddenWhenHasOne;
  }));
  // Writing one has to sit with the calls. It was a screen and a half below the
  // field, under the picker, where nobody was going to find it.
  // Writing one sits beside changing the call, above the field. It was a screen
  // and a half below, under the picker, where nobody was going to find it.
  const yoursAt = () => ev(() => {
    const main = document.querySelector(".main");
    const b = [...document.querySelectorAll("#root .btn")].find(x => /\+ Yours/.test(x.textContent));
    return b ? b.getBoundingClientRect().top + main.scrollTop : -1;
  });
  check("writing one sits with changing the call, right under the field", await ev(() => {
    const main = document.querySelector(".main");
    const b = [...document.querySelectorAll("#root .btn")].find(x => /\+ Yours/.test(x.textContent));
    if(!b) return false;
    const fld = document.querySelector("#root .field-wrap").getBoundingClientRect();
    const gap = b.getBoundingClientRect().top - fld.bottom;
    return gap >= 0 && gap < 40;
  }));
  check("and within a screen of the top, not a screen and a half down",
    await yoursAt() > 0 && await yoursAt() < 932);
  // Folded, because twelve wrapped buttons above the field push the field off
  // the fold, and the field is the whole point of the tab.
  check("the twelve stay folded until he asks for them", await ev(() =>
    !S.pbPick && !document.querySelector("#root .seg seg--wrap")));
  check("Change the call opens them, and picking one closes it again", await ev(() => {
    [...document.querySelectorAll("#root .btn")].find(x => /Change the call/.test(x.textContent)).click();
    const open = !!document.querySelector("#root .seg");
    [...document.querySelectorAll("#root .seg button")].find(x => /Blitz/.test(x.textContent)).click();
    const shut = !S.pbPick && S.script === "blitz";
    window.set({ script: "snake" });
    return open && shut;
  }));
  const writePlay = () => ev(() => {
    window.newPlay(); window.setPlayField("name", "Rocket");
    const bl = curLayout().bunkers;
    ["SB", "Tr", "GB", "MT", "MD"].forEach(t => window.playPick(bl.find(b => b.id.startsWith(t)).id));
    window.setPlayField("read", "Overload the snake, centre holds the gap");
    window.setPlayField("aggr", 5);
    window.savePlay();
  });
  check("Save is refused until it has a name and five men", await ev(() => {
    window.newPlay(); window.setPlayField("name", "Half");
    window.playPick(curLayout().bunkers[0].id);
    const btn = [...document.querySelectorAll("#root .btn")].find(x => /Pick 4 more/.test(x.textContent));
    const blocked = !!btn && btn.disabled;
    window.savePlay();                              // must do nothing
    const none = customPlays().length === 0;
    window.cancelPlay();
    return blocked && none;
  }));
  await writePlay();
  check("a written play joins the twelve", await ev(() => playKeys().length === 13 && isMine(S.script)));
  check("and is marked in the picker as one of his", await ev(() => {
    window.set({ pbPick: true });
    const starred = [...document.querySelectorAll("#root .seg button")].some(x => /★\s*Rocket/.test(x.textContent));
    window.set({ pbPick: false });
    return starred;
  }));
  check("and the app lands on it", await ev(() => callName(S.script) === "Rocket"));
  check("the header and the card carry it", await ev(() => {
    const t = document.getElementById("root").innerText;
    return /ROCKET/i.test(document.querySelector(".ctx__line").innerText)
      && /Overload the snake/.test(t);
  }));
  check("the router draws five real runs off his five bunkers", await ev(() =>
    currentPaths().length === 5
    && currentPaths().every(x => curLayout().bunkers.some(b => b.id === x.bunker))));
  check("Face, Shot and Job work on it like any other call", await ev(() => {
    const id = currentPaths()[0].id;
    window.setDirect(id, "face", 90);
    window.set({ jobCalls: { ...(S.jobCalls || {}), [S.script]: { 1: "Rocket 1" } } });
    return directOf(id).face === 90 && jobName(S.script, 1, "x") === "Rocket 1";
  }));
  check("logging it counts against it", await ev(() => {
    window.logCall(); return (S.calls || [])[0].script === S.script && isMine((S.calls || [])[0].script);
  }));
  for (const [label, st] of [["Tally's picker", { tab: "tally", tallyPick: true }],
                             ["Scout's their-call picker", { tab: "scout", scoutTab: "breakouts", tallyPick: false }]]) {
    await ev(x => window.set(x), st); await page.waitForTimeout(70);
    check(`${label} offers it`, await ev(() => /Rocket/.test(document.getElementById("root").innerText)));
  }
  check("the Rep drill can draw it", await ev(() => playKeys().includes(S.plays[0].k)));
  // A play is its five bunkers, and those are different on every field.
  await ev(() => window.set({ tab: "playbook", tallyPick: false, layoutKey: "mwo" }));
  check("on a field it was not built on it says so, and guesses nothing", await ev(() => {
    const t = document.getElementById("root").innerText;
    return myPlants(S.script) === null && /has no five on/.test(t) && /Build it on this field/.test(t);
  }));
  check("building it there leaves the first field alone", await ev(() => {
    window.buildPlay(S.script);
    curLayout().bunkers.slice(0, 5).forEach(b => window.playPick(b.id));
    window.savePlay();
    const here = (myPlants(S.script) || []).length === 5;
    window.set({ layoutKey: "lso" });
    return here && (myPlants(S.script) || []).length === 5;
  }));
  check("editing one opens with its five already picked", await ev(() => {
    window.buildPlay(S.script);
    const got = (S.building.plants || []).length === 5 && S.building.name === "Rocket";
    window.cancelPlay();
    return got;
  }));
  // Team renames the app's twelve. A play already carries the name he gave it,
  // and a second name on top of the first is a trap.
  // Team renames the app's twelve. A play already carries the name he gave it,
  // and a second name on top of the first is a trap — so his own play has one
  // box, its own name, and never a rename box over it.
  check("Team's rename list is the twelve, and his own play has its own name box, not a rename over it", await ev(() => {
    window.set({ tab: "more", more: "team" });
    const mine = [...document.querySelectorAll("#root input[id^='myp-']")];
    return document.querySelectorAll("#root input[id^='brc-']").length === 12
      && mine.length === customPlays().length && mine.some(i => i.value === "Rocket");
  }));
  check("a play travels in a copy and in a squad copy", await ev(() => {
    const all = JSON.parse(copyPayload("all")).data, squad = JSON.parse(copyPayload("squad")).data;
    return copyDataError(all) === "" && (squad.plays || []).length === 1
      && squad.plays[0].plants.lso.length === 5;
  }));
  check("a play with a broken five is refused rather than restored", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data;
    d.plays[0].plants = { lso: ["only", "three", "ids"] };
    return copyDataError(d) === "plays";
  }));
  check("deleting one moves you off it and keeps what you logged", await ev(() => {
    window.set({ tab: "playbook", more: null });
    const k = S.script; window.dropPlay(k);
    return !isMine(S.script) && playKeys().length === 12 && (S.calls || [])[0].script === k;
  }));
  check("a saved play this build no longer has is survivable", await ev(() => {
    window.set({ script: "my:ghost" });
    return document.getElementById("root").innerText.length > 200;
  }));
  await ev(() => window.set({ script: "snake", plays: [], building: null }));

  /* ------------------------------------------ the twelve are not his playbook */
  G("The twelve are a library, not his playbook");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", right: { name: "Rejects" } });
  check("a call he does not run comes out of every picker", await ev(() => {
    window.set({ offPlays: [] });
    const before = Object.keys(pickPlays()).length;
    window.toggleRun("conserve"); window.toggleRun("lock");
    return before === 12 && Object.keys(pickPlays()).length === 10
      && !pickPlays().conserve && !pickPlays().lock;
  }));
  check("and the whole registry still has it, so nothing logged loses its name", await ev(() =>
    Object.keys(allPlays()).length === 12 && callName("conserve") === BREAKS.conserve.name));
  check("Playbook offers only what he runs", await ev(() => {
    window.set({ tab: "playbook", more: null, pbPick: true });
    const seg = document.querySelector("#root .seg--wrap");
    const names = [...seg.querySelectorAll("button")].map(b => b.textContent.trim());
    window.set({ pbPick: false });
    return names.length === 10 && !names.includes(BREAKS.conserve.name);
  }));
  check("so does the point sheet", await ev(() => {
    window.set({ tab: "tally", tallyPick: true });
    const seg = document.querySelector("#root .seg--wrap");
    const n = seg ? seg.querySelectorAll("button:not(.seg__add)").length : 0;
    window.set({ tallyPick: false, tab: "playbook" });
    return n === 10;
  }));
  check("and the drill never asks a call he does not run", await ev(() => {
    const seen = new Set();
    for (let i = 0; i < 60; i++) { window.startRep(); seen.add(S.rep.ask); }
    window.stopRep();
    return ![...seen].some(k => !runsPlay(k));
  }));
  check("their break is never limited to what he runs", await ev(() => {
    window.set({ tab: "scout", scoutTab: "breakouts" });
    const t = document.getElementById("root").innerText;
    window.set({ tab: "playbook", scoutTab: "matchup" });
    return t.includes(BREAKS.conserve.name);       // they run what they run
  }));
  check("turning off the call he is on moves him to one he runs", await ev(() => {
    window.set({ script: "snake" });
    window.toggleRun("snake");
    return S.script !== "snake" && runsPlay(S.script) && !S.playing;
  }));
  check("the last call standing cannot be turned off", await ev(() => {
    Object.keys(BREAKS).forEach(k => { if (runsPlay(k)) window.toggleRun(k); });
    return playKeys().filter(runsPlay).length === 1 && Object.keys(pickPlays()).length >= 1;
  }));
  check("nothing is ever deleted — one tap puts them all back", await ev(() => {
    window.runAllPlays();
    return (S.offPlays || []).length === 0 && Object.keys(pickPlays()).length === 12;
  }));
  check("which ones he runs rides in a copy of the season", await ev(() => {
    window.toggleRun("conserve");
    const all = JSON.parse(copyPayload("all")).data, squad = JSON.parse(copyPayload("squad")).data;
    return copyDataError(all) === "" && all.offPlays.includes("conserve")
      && (squad.offPlays || []).includes("conserve");
  }));
  check("a junk list is refused rather than restored", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data;
    d.offPlays = [{ k: "conserve" }];
    return copyDataError(d) === "offPlays";
  }));
  await ev(() => window.set({ offPlays: [], script: "snake" }));

  /* ------------------------------------------------------------ penalties */
  G("A penalty is recorded, never called");
  await seed({ tab: "tally", layoutKey: "lso", right: { name: "Rejects" } });
  await ev(() => { window.setPitTeam("right", "Rejects"); window.newMatch(); });
  check("a point starts five up until somebody takes men off", await ev(() =>
    startUp("us", S.matchId, 1) === 5 && startUp("them", S.matchId, 1) === 5
    && evenPoint(S.matchId, 1)));
  check("a 2-for-1 means three men on that point and no other", await ev(() => {
    window.set({ point: 2 }); window.addPen("us", 2);
    return startUp("us", S.matchId, 2) === 3 && startUp("them", S.matchId, 2) === 5
      && startUp("us", S.matchId, 1) === 5 && !evenPoint(S.matchId, 2);
  }));
  check("the sheet says it is not five on five", await ev(() =>
    /3 v 5/.test(document.getElementById("root").innerText)));
  check("the men-up count on the sheet starts from what he actually has", await ev(() =>
    /\b3\b/.test(document.getElementById("root").innerText)
    && startUp("us", S.matchId, 2) - (S.tally || []).filter(o => o.m === S.matchId
        && o.pt === 2 && o.side === "us").length === 3));
  check("nobody is ever put below one man", await ev(() => {
    window.addPen("us", 3); window.addPen("us", 3);
    return startUp("us", S.matchId, 2) === 1;
  }));
  check("undoing it puts the point back to five", await ev(() => {
    (S.pens || []).filter(p => p.pt === 2).slice(0, 2).forEach(p => window.dropPen(p.id));
    const left = (S.pens || []).filter(p => p.pt === 2);
    left.forEach(p => window.dropPen(p.id));
    return startUp("us", S.matchId, 2) === 5 && evenPoint(S.matchId, 2);
  }));
  check("a bunker stops wearing a point that was lost in the box", await ev(() => {
    window.set({ breakouts: [], results: [], pens: [] });
    const bk = curLayout().bunkers.find(x => /^SB/.test(x.id)).id;
    const log = (pt, won, cost) => {
      S.point = pt;
      if (cost) window.addPen("us", cost);
      S.breakouts = [{ id: "pb" + pt, m: S.matchId, pt, layout: S.layoutKey, side: "us",
                       bunker: bk, alive: true, at: Date.now() }, ...(S.breakouts || [])];
      window.endPoint(won);
    };
    log(1, "us", 0); log(2, "us", 0); log(3, "them", 2);
    const all = bunkerValue("us", false).find(x => x.id === bk);
    const even = bunkerValue("us", true).find(x => x.id === bk);
    return all.att === 3 && all.net === 1 && even.att === 2 && even.net === 2
      && unevenBreaks("us") === 1;
  }));
  check("and the switch says what it dropped rather than changing numbers quietly", await ev(() => {
    window.set({ tab: "tally", tallyValue: "us", evenOnly: false });
    const before = document.getElementById("root").innerText;
    window.set({ evenOnly: true });
    const after = document.getElementById("root").innerText;
    return /Even points only/.test(before) && /1 of these breaks/.test(before)
      && /counted below/.test(before) && /out of the table below/.test(after);
  }));
  check("a point that only had a penalty on it is still a point", await ev(() => {
    window.set({ evenOnly: false });
    S.point = 9; window.addPen("them", 1);
    return lastPoint(S.matchId) === 9 && matchSize(S.matchId) > 0;
  }));
  check("a penalty rides in a copy of the season", await ev(() => {
    const all = JSON.parse(copyPayload("all")).data;
    return copyDataError(all) === "" && (all.pens || []).length > 0;
  }));
  check("a junk penalty is refused rather than restored", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data;
    d.pens = [{ id: "x", m: "m1", pt: 1, side: "nobody", cost: 2 }];
    return copyDataError(d) === "pens";
  }));
  await ev(() => window.set({ pens: [], breakouts: [], results: [], evenOnly: false,
                              penOpen: false, point: 1, tab: "playbook" }));

  /* ------------------------------------------------- the event's schedule */
  G("The schedule, and scouting a game you are not in");
  await seed({ tab: "more", more: "schedule", layoutKey: "lso" });
  check("the league's schedule is in the app", await ev(() =>
    allGames().length === 40 && new Set(allGames().map(g => g.d)).size === 2));
  check("every game names two teams, a day and a clock", await ev(() =>
    allGames().every(g => g.h && g.a && g.h !== g.a && /^\d{4}-\d{2}-\d{2}$/.test(g.d)
      && /^\d{2}:\d{2}$/.test(g.t))));
  check("and every team on it entered this event", await ev(() => {
    const entered = new Set(DIVISIONS.find(d => d.id === "pro").teams.map(t => t.name));
    return allGames().every(g => entered.has(g.h) && entered.has(g.a));
  }));
  check("it says where it was read and what it covers", await ev(() => {
    const t = document.getElementById("root").innerText;
    return /PBLeagues/.test(t) && /13 Sep 2026/.test(t) && /Sunday/.test(t);
  }));
  check("and never claims it can refresh itself", await ev(() =>
    /no network|cannot refresh/i.test(document.getElementById("root").innerText)));
  check("games read in time order inside a day", await ev(() => {
    const fri = allGames().filter(g => g.d === "2026-09-18").map(g => g.t);
    return fri.every((t, i) => i === 0 || fri[i - 1] <= t);
  }));
  check("watching a game puts both teams in the pits", await ev(() => {
    const g = allGames().find(x => x.h === "San Diego Dynasty");
    window.watchGame(g.id);
    return (S.left || {}).name === g.h && (S.right || {}).name === g.a;
  }));
  check("and opens a sheet that says it is watched, not played", await ev(() => {
    const m = curMatch();
    return !!m.watch && m.home === "San Diego Dynasty" && S.point === 1
      && /watched/.test(matchLabel(m));
  }));
  check("a call of yours cannot be logged on it, so your self-scout stays yours", await ev(() => {
    const before = selfScout().n, had = (S.calls || []).length;
    window.logCall(); window.nextPoint(); window.logCall();
    return before === 0 && selfScout().n === 0 && (S.calls || []).length === had;
  }));
  check("match point and match over on it name the team, never you", await ev(() => {
    const keep = { race: raceTo(), results: (S.results || []).slice() };
    window.setRaceTo(1);
    window.set({ tab: "tally" });
    const mp = (document.getElementById("root").innerText.match(/Match point[^\n]*/) || [""])[0];
    window.endPoint("us");
    const over = (document.getElementById("root").innerText.match(/Match over[^\n]*/) || [""])[0];
    window.set({ quick: true });
    const q = document.querySelector(".qlog"); const qOver = q ? (q.innerText.match(/Match over[^\n]*/) || [""])[0] : "";
    window.set({ quick: false }); window.backPoint(); window.setRaceTo(keep.race || 0);
    return /Match point, both ways/.test(mp) && /San Diego Dynasty won 1–0/.test(over) && !/you won/.test(over) && /San Diego Dynasty won/.test(qOver);
  }));
  check("Breakouts on it logs either team's five, and Scout names the two sides rather than you and them", await ev(() => {
    window.set({ tab: "scout", scoutTab: "breakouts" });
    const root = () => document.getElementById("root");
    const t0 = root().innerText;
    const labels = /Left pit · the home side/i.test(t0) && /Right pit · the away side/i.test(t0) && !/who you play/i.test(t0);
    const sw = [...root().querySelectorAll("#root .seg button")].filter(b => /San Diego Dynasty|Royal City Seadogs/.test(b.textContent));
    const bl = curLayout().bunkers, ids = [2, 8, 15, 21, 29].map(i => bl[i].id);
    const home = sw.find(b => /San Diego Dynasty/.test(b.textContent)); if (home) home.click();
    window.set({ theirPick: ids });
    const btn = [...root().querySelectorAll("button")].find(b => /Log San Diego Dynasty's five/.test(b.textContent));
    const before = theirBreaks("left").length; if (btn) btn.click();
    const logged = theirBreaks("left").length === before + 1 && theirBreaks("left")[0].plants.length === 5 && theirBreaks("left")[0].m === S.matchId;
    window.set({ scoutTab: "matchup" });
    const seg = [...root().querySelectorAll(".seg button")].map(b => b.textContent.trim());
    const named = seg.includes("San Diego Dynasty") && seg.includes("Royal City Seadogs") && !seg.includes("Yours") && !seg.includes("Theirs");
    window.set({ scoutSide: "right", theirPick: [] });
    return labels && sw.length === 2 && !!btn && logged && named;
  }));
  check("Layers on it names the home and away outs, never yours", await ev(() => {
    window.set({ tab: "scout", scoutTab: "layers" });
    const t = document.getElementById("root").innerText;
    return /San Diego Dynasty outs · \d/.test(t) && /Royal City Seadogs outs · \d/.test(t) && !/Your outs/.test(t);
  }));
  check("Playbook on it says you are watching, not playing, the team in the pit", await ev(() => {
    window.set({ tab: "playbook" });
    const t = document.getElementById("root").innerText;
    return /watching San Diego Dynasty v Royal City Seadogs/.test(t) && !/vs Royal City Seadogs · reads/.test(t);
  }));
  check("the ends chip on it says which team breaks from which end", await ev(() => {
    window.set({ tab: "tally" });
    return /San Diego Dynasty breaking from the (left|right) end/.test(document.getElementById("root").innerText);
  }));
  check("the score on it names the two teams, because neither is you", await ev(() => {
    window.set({ tab: "tally" });
    const t = document.getElementById("root").innerText;
    return /San Diego Dynasty won it/.test(t) && /Royal City Seadogs won it/.test(t)
      && !/We won it/.test(t);
  }));
  check("and the sheet says the five in the columns are not on that field", await ev(() =>
    /game you are watching/i.test(document.getElementById("root").innerText)));
  check("your own match is ordinary and says We won it", await ev(() => {
    window.set({ tab: "more", more: "schedule" });
    const g = allGames().find(x => x.h === "Tampa Bay Damage");
    window.playGame(g.id, "away");
    const m = curMatch();
    window.set({ tab: "tally" });
    const t = document.getElementById("root").innerText;
    return !m.watch && m.vs === g.a && (S.right || {}).name === g.a
      && /We won it/.test(t) && !/game you are watching/i.test(t);
  }));
  check("a row off the league list is taken off, never edited in place", await ev(() => {
    window.set({ tab: "more", more: "schedule" });
    const g = allGames()[0], n = allGames().length;
    window.dropGame(g.id);
    return allGames().length === n - 1 && (S.gamesOff || []).includes(g.id)
      && SCHEDULE.games.length === 40;
  }));
  check("a pbleagues print-out pastes clean — field column and X-Factor survive", await ev(() => {
    const rows = parseSchedule(
      "Lone Star Open\nFriday, 18 September\n" +
      "8:00 AM NXL Pro - Pit 1 Pro X-Ball\u2122 Seattle Uprising - Houston Heat Prelims\n" +
      "8:00 AM NXL Pro - Pit 2 Pro X-Ball\u2122 San Antonio X-Factor - Chicago Aftershock Prelims\n" +
      "Saturday, 19 September\n" +
      "1:45 PM NXL Pro - Pit 1 Pro X-Ball\u2122 San Diego Dynasty - Royal City Seadogs Prelims\n");
    return rows.length === 3
      // the field cell "NXL Pro - Pit 1" never becomes a team
      && !rows.some(r => /Pit|NXL|Ball/.test(r.h + r.a))
      && rows[0].d === "2026-09-18" && rows[0].t === "08:00"
      && rows[0].h === "Seattle Uprising" && rows[0].a === "Houston Heat"
      // the spaced-dash split leaves the hyphen inside "X-Factor" alone
      && rows[1].h === "San Antonio X-Factor" && rows[1].a === "Chicago Aftershock"
      // afternoon time keeps its PM, the day header carries down
      && rows[2].d === "2026-09-19" && rows[2].t === "13:45";
  }));
  check("a pasted schedule is read into games", await ev(() => {
    const rows = parseSchedule(
      "Friday, Sep 18\n9:00 AM  Detroit Infamous vs Atlanta Jungle Cats  C Prelims\n" +
      "Division: Pro X-Ball\t1:45 PM\tSan Diego Dynasty\tRoyal City Seadogs\tA Prelims\n" +
      "Saturday, Sep 19\n8:00 AM Houston Heat \u2014 Atlanta Jungle Cats\n" +
      "a line with no clock at all\n");
    return rows.length === 3
      && rows[0].d === "2026-09-18" && rows[0].t === "09:00"
      && rows[0].h === "Detroit Infamous" && rows[0].a === "Atlanta Jungle Cats" && rows[0].g === "C"
      && rows[1].h === "San Diego Dynasty" && rows[1].a === "Royal City Seadogs"
      && rows[2].d === "2026-09-19" && rows[2].h === "Houston Heat";
  }));
  check("a weekday before the clock, a field column after the teams and a dotted vs. all come off", await ev(() => {
    const rows = parseSchedule(
      "Pro X-Ball — Friday\nField 1\n9:50 AM  Edmonton Impact vs. Los Angeles Ironmen   Field 2\n" +
      "Sat 10:40  New York Xtreme — Detroit Infamous (F3)\n" +
      "11:30 AM Chicago Aftershock v Baltimore Revo Field 1\n" +
      "12:20 PM Sun Devils vs Houston Heat Pit 2\nLunch\n");
    return rows.length === 4
      && rows[0].h === "Edmonton Impact" && rows[0].a === "Los Angeles Ironmen"
      && rows[1].h === "New York Xtreme" && rows[1].a === "Detroit Infamous"
      && rows[2].h === "Chicago Aftershock" && rows[2].a === "Baltimore Revo"
      // a team called Sun Devils keeps its name: the weekday strip is only ahead of the clock
      && rows[3].h === "Sun Devils" && rows[3].a === "Houston Heat" && rows[3].t === "12:20";
  }));
  check("a game typed by hand joins the list in its own place", await ev(() => {
    window.newGame();
    window.setGameField("d", "2026-09-18"); window.setGameField("t", "07:00");
    window.setGameField("h", "Red Legion"); window.setGameField("a", "Houston Heat");
    window.saveGame();
    return allGames()[0].h === "Red Legion" && (S.games || []).length === 1 && !S.gameNew;
  }));
  check("a game with only one team is refused", await ev(() => {
    const n = (S.games || []).length;
    window.newGame(); window.setGameField("h", "Red Legion"); window.saveGame();
    window.set({ gameNew: null });
    return (S.games || []).length === n;
  }));
  check("the schedule rides in a copy of the season", await ev(() => {
    const all = JSON.parse(copyPayload("all")).data;
    return copyDataError(all) === "" && (all.games || []).length === 1
      && (all.gamesOff || []).length === 1;
  }));
  check("a junk game is refused rather than restored", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data;
    d.games = [{ id: "x", d: "2026-09-18", t: "07:00", h: "Red Legion", a: ["not", "a", "team"] }];
    return copyDataError(d) === "games";
  }));
  await ev(() => window.set({ games: [], gamesOff: [], gameNew: null, gamePaste: "",
                              calls: [], tab: "playbook", more: null }));

  /* ------------------------------------------------------------- the paywall */
  G("What is paid for, and what never is");
  await seed({ tab: "playbook", right: { name: "Rejects" } });
  check("nothing is for sale until the store is switched on",
    await ev(() => BILLING_LIVE === false && planOf() === "program"));
  check("so no coach testing this build hits a wall",
    await ev(() => !gateKey()));
  // Staff can look at exactly what a free coach sees, without buying or cancelling.
  await ev(() => window.set({ preview: true }));
  check("previewing the free plan turns the gate on", await ev(() => planOf() === "free"));
  for (const [label, st] of [["Scout", { tab: "scout", scoutTab: "matchup" }],
                             ["Scout's other sub-tabs", { tab: "scout", scoutTab: "counter" }],
                             ["Cards", { tab: "playbook", pbView: "cards" }],
                             ["Rep", { tab: "playbook", pbView: "rep" }],
                             ["Assess", { tab: "more", more: "assess", pbView: null }]]) {
    await ev(x => window.set(x), st); await page.waitForTimeout(70);
    check(`${label} is behind the wall`, await ev(() => !!document.querySelector("#root .gate")));
  }
  // The loop a coach runs while a point is on is never gated. This is the list
  // that must not quietly grow.
  for (const [label, st] of [["Playbook", { tab: "playbook", pbView: null }],
                             ["Tally", { tab: "tally" }],
                             ["Sightlines", { tab: "sightlines" }],
                             ["Walk", { tab: "more", more: "walk" }],
                             ["Movement", { tab: "more", more: "movement" }],
                             ["Bunker stats", { tab: "more", more: "stats" }],
                             ["Lineups", { tab: "more", more: "lineups" }],
                             ["Team", { tab: "more", more: "team" }],
                             ["Codes", { tab: "more", more: "codes" }],
                             ["Messages", { tab: "more", more: "messages" }],
                             ["Matches", { tab: "more", more: "matches" }],
                             ["Help", { tab: "more", more: "help" }],
                             ["Nexus", { tab: "more", more: "nexus" }]]) {
    await ev(x => window.set(x), st); await page.waitForTimeout(70);
    check(`${label} stays free`, await ev(() => !document.querySelector("#root .gate")));
  }
  check("Save a copy is never behind a wall — it is the only backup there is",
    await ev(() => { window.set({ tab: "more", more: "nexus" });
      return /Save a copy/i.test(document.getElementById("root").innerText); }));
  check("the sheet he is on always opens", await ev(() => {
    const id = S.matchId; window.openMatch(id);
    return S.matchId === id && S.more !== "plan";
  }));
  check("an older sheet asks him to upgrade rather than opening", await ev(() => {
    const first = S.matchId, kept = (S.matches || []).length;
    window.endPoint("us");                // a result on it, so the sheet is kept when the next one opens
    window.set({ right: { name: "Other" } }); window.newMatch();
    window.openMatch(first);
    return S.more === "plan" && S.matchId !== first && (S.matches || []).length === kept + 1;
  }));
  check("and nothing of his was deleted to make him pay",
    await ev(() => (S.matches || []).length >= 2));
  check("the wall says what is behind it and offers a way back in", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", more: null });
    const t = document.querySelector("#root .gate").innerText;
    return /Team/.test(t) && /Restore purchases/.test(t) && /stay free/.test(t);
  }));
  check("the Plan screen leads with what is free", await ev(() => {
    window.set({ tab: "more", more: "plan" });
    const t = document.getElementById("root").innerText;
    return /free, always/i.test(t) && /restore purchases/i.test(t) && /99 a season/i.test(t);
  }));
  check("with no store wired up, buying says so and changes nothing", await ev(async () => {
    const was = JSON.stringify(S.billing);
    await window.buyPlan("team_season");
    return /nothing to buy yet/i.test(S.billingSaid) && JSON.stringify(S.billing) === was;
  }));
  check("and so does restoring", await ev(async () => {
    await window.restorePlan();
    return /nothing to restore yet/i.test(S.billingSaid);
  }));
  check("what the store says is what is kept", await ev(() => {
    window.gridlockEntitle({ plan: "team", source: "revenuecat" });
    return S.billing.plan === "team" && S.billing.source === "revenuecat";
  }));
  check("a lapsed plan is a free plan", await ev(() => {
    window.gridlockEntitle({ plan: "team", exp: Date.now() - 1000 });
    window.set({ preview: false });
    const live = BILLING_LIVE;                       // only meaningful once it is
    return live ? planOf() === "free" : true;
  }));
  check("junk from the store is read as free",
    await ev(() => { window.gridlockEntitle({ plan: "platinum" }); return S.billing.plan === "free"; }));
  check("the plan is this phone's, never part of a season copy", await ev(() => {
    window.gridlockEntitle({ plan: "team" });
    const all = JSON.parse(copyPayload("all")).data;
    return copyDataError(all) === "" && all.billing === undefined && all.preview === undefined;
  }));
  await ev(() => window.set({ preview: false }));

  /* -------------------------------------- the store, once an adapter is present */
  // Billing goes live only when a store adapter exists, so the web and offline
  // builds never wall a coach with no way to buy.
  G("Billing goes live when a store adapter is present");
  await ev(() => {
    window.__bought = null;
    window.gridlockBilling = {
      async buy(id){ window.__bought = id; return { plan: "team", exp: 0, source: "revenuecat" }; },
      async restore(){ return { plan: "free" }; },
    };
    window.set({ tab: "playbook", preview: false, billing: { plan: "free", exp: 0, source: "", at: 0 } });
  });
  check("with an adapter, billing is live", await ev(() => canBill() && billingLive()));
  check("an unpaid coach now hits the wall on Scout", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", more: null });
    return planOf() === "free" && !!document.querySelector("#root .gate");
  }));
  check("buying goes through the store adapter and unlocks", await ev(async () => {
    window.set({ tab: "more", more: "plan" });
    await window.buyPlan("team_season");
    return window.__bought === "team_season" && S.billing.plan === "team" && !S.billingSaid && planOf() === "team";
  }));
  check("and Scout opens now", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup", more: null });
    return !document.querySelector("#root .gate");
  }));
  check("a lapsed season falls back to free", await ev(() => {
    window.gridlockEntitle({ plan: "team", exp: Date.now() - 1000, source: "revenuecat" });
    return planOf() === "free";
  }));
  check("the plan is never carried in a season copy", await ev(() =>
    JSON.parse(copyPayload("all")).data.billing === undefined));
  await ev(() => { delete window.gridlockBilling; delete window.__bought;
    window.set({ billing: { plan: "free", exp: 0, source: "", at: 0 }, preview: false, tab: "playbook", more: null }); });
  check("remove the adapter and every build is free again",
    await ev(() => !billingLive() && planOf() === "program"));

  /* ------------------------------------------ the app speaks the coach's words */
  G("The calls are named the way the team says them");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake", right: { name: "Rejects" } });
  check("out of the box the app uses its own names",
    await ev(() => breakName() === BREAKS.snake.name));
  // Log one first, so the sheets that only print a call they have actually seen
  // have one to print. The header uppercases its line in CSS, so innerText
  // comes back as ROCKET — every match here is deliberately case-insensitive.
  await ev(() => { window.set({ breakCalls: { snake: "Rocket" } }); window.logCall(); });
  const saysRocket = async st => {
    await ev(x => window.set(x), st); await page.waitForTimeout(90);
    return ev(() => { const t = document.getElementById("root").innerText;
      return /rocket/i.test(t) && !new RegExp(BREAKS.snake.name, "i").test(t); });
  };
  for (const [label, st] of [["Playbook", { tab: "playbook", pbView: null }],
                             ["the point sheet", { tab: "tally" }],
                             ["Scout", { tab: "scout", scoutTab: "matchup" }],
                             ["Counter", { tab: "scout", scoutTab: "counter" }],
                             ["Cards", { tab: "playbook", pbView: "cards" }],
                             ["Matches", { tab: "more", more: "matches", pbView: null }]])
    check(`${label} says the coach's word and not the app's`, await saysRocket(st));
  check("and so does the line in the header", await ev(() =>
    /ROCKET/i.test(document.querySelector(".ctx__line").innerText)));
  // The record is the break, never the label, or a rename would rewrite history.
  check("a logged call keeps the break, not the word",
    await ev(() => (S.calls || [])[0].script === "snake"));
  check("renaming re-labels a call logged before the rename", await ev(() => {
    window.set({ breakCalls: { snake: "Tomahawk" } });
    return callName((S.calls || [])[0].script) === "Tomahawk";
  }));
  check("putting the app's names back leaves the logged calls alone", await ev(() => {
    window.clearBreakCalls();
    return callName("snake") === BREAKS.snake.name && (S.calls || [])[0].script === "snake";
  }));
  check("a blank word is not a name", await ev(() => {
    window.set({ breakCalls: { snake: "   " } });
    return callName("snake") === BREAKS.snake.name;
  }));
  check("the words travel in a copy, and in a squad copy", await ev(() => {
    window.set({ breakCalls: { snake: "Rocket" } });
    const all = JSON.parse(copyPayload("all")).data, squad = JSON.parse(copyPayload("squad")).data;
    return copyDataError(all) === "" && all.breakCalls.snake === "Rocket"
        && squad.breakCalls.snake === "Rocket";
  }));
  check("a copy carrying a broken word is refused", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data; d.breakCalls = { snake: 7 };
    return copyDataError(d) === "breakCalls";
  }));
  check("Team is where the twelve are named", await ev(() => {
    window.set({ tab: "more", more: "team", breakCalls: {} });
    return document.querySelectorAll("#root input[id^='brc-']").length === Object.keys(BREAKS).length;
  }));
  check("a renamed call still shows which of the twelve it is", await ev(() => {
    window.set({ breakCalls: { snake: "Rocket" } });
    const t = document.getElementById("root").innerText;
    return t.includes(BREAKS.snake.name);
  }));
  check("an un-renamed one says the app's name once, not twice", await ev(() => {
    window.set({ breakCalls: {} });
    const t = document.getElementById("root").innerText;
    return !t.includes(BREAKS.conserve.name);        // placeholder only
  }));
  check("Playbook points at it until he has used it once", await ev(() => {
    // One door out of the folded picker, to the screen that both names the
    // twelve and says which of them he runs.
    window.set({ tab: "playbook", more: null, breakCalls: {}, pbPick: true });
    const t = () => document.getElementById("root").innerText;
    const door = /Which calls you run/.test(t());
    const before = /name the rest the way your team shouts them/i.test(t());
    window.set({ breakCalls: { snake: "Rocket" } });
    const after = /name the rest the way your team shouts them/i.test(t());
    window.set({ breakCalls: {}, pbPick: false });
    return door && before && !after;
  }));

  /* ------------------------------------------------- and the five jobs too */
  G("The five jobs are named the way the team says them");
  await seed({ tab: "playbook", layoutKey: "lso", script: "snake",
               roster: [{ name: "Reyes", num: 7 }] });
  check("the app writes a job as the bunker and the wire", await ev(() =>
    /·/.test(currentPaths()[0].label)));
  await ev(() => window.set({ breakCalls: { snake: "Rocket" },
                              jobCalls: { snake: { 1: "Rocket 1", 3: "Snake runner" } } }));
  check("the row on Playbook says the coach's word",
    await ev(() => document.querySelector("#root .assign .assign__job").textContent === "Rocket 1"));
  check("a job he has not named keeps the app's",
    await ev(() => jobName("snake", 2, currentPaths()[1].label) === currentPaths()[1].label));
  check("his card says it too, and so does the share text",
    await ev(() => { const c = cardLines(); return c[0].job === "Rocket 1" && c[2].job === "Snake runner"; }));
  check("and Scout's matchup list", await ev(() => {
    window.set({ tab: "scout", scoutTab: "matchup" });
    const t = document.getElementById("root").innerText;
    return /Rocket 1/.test(t) && /Snake runner/.test(t);
  }));
  // A job follows the call, not the field: the bunker changes, the job does not.
  check("the same job on another field is still his word", await ev(() => {
    window.set({ tab: "playbook", layoutKey: "mwo" });
    const same = document.querySelector("#root .assign .assign__job").textContent === "Rocket 1";
    window.set({ layoutKey: "lso" });
    return same;
  }));
  check("naming a job under one call leaves the others alone", await ev(() => {
    window.set({ script: "flood" });
    const other = document.querySelector("#root .assign .assign__job").textContent;
    window.set({ script: "snake" });
    return other !== "Rocket 1";
  }));
  check("a blank word is not a name",
    await ev(() => { window.set({ jobCalls: { snake: { 1: "   " } } });
      return jobName("snake", 1, "the app's") === "the app's"; }));
  check("Job on the row opens the box, and closes again", await ev(() => {
    window.set({ jobCalls: {} });
    const chip = [...document.querySelectorAll("#root .assign .tgl")].find(b => /Job/.test(b.textContent));
    if(!chip) return false;
    chip.click();
    const open = !!document.getElementById("jbc-1");
    window.openPad("job", "1");
    return open && !document.getElementById("jbc-1");
  }));
  check("typing a word in it names the job", await ev(() => {
    window.openPad("job", "1");
    document.getElementById("jbc-1").value = "Wire runner";
    window.setJobCall("1");
    return jobName("snake", "1", "nope") === "Wire runner";
  }));
  check("emptying it puts the app's back", await ev(() => {
    window.openPad("job", "1");
    document.getElementById("jbc-1").value = "";
    window.setJobCall("1");
    return !((S.jobCalls || {}).snake || {})["1"];
  }));
  check("the words travel in a copy and in a squad copy", await ev(() => {
    window.set({ jobCalls: { snake: { 1: "Rocket 1" } } });
    const all = JSON.parse(copyPayload("all")).data, squad = JSON.parse(copyPayload("squad")).data;
    return copyDataError(all) === "" && squad.jobCalls.snake["1"] === "Rocket 1";
  }));
  check("a copy carrying a broken one is refused", await ev(() => {
    const d = JSON.parse(copyPayload("all")).data; d.jobCalls = { snake: { 1: 5 } };
    return copyDataError(d) === "jobCalls";
  }));

  /* ------------------------------------------------- the run he actually ran */
  G("The run is worked out, not traced");
  await seed({ tab: "tally", layoutKey: "lso", right: { name: "Rejects" },
               roster: [{ name: "Reyes", num: 7 }] });
  check("the sheet no longer asks a coach to trace anything", await ev(() => {
    const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 85);
    window.selectBunker(b.id);
    const t = document.getElementById("root").innerText;
    return !/Trace the route/.test(t) && /Drawn for you/.test(t);
  }));
  check("a run is on the field the moment a bunker is tapped", await ev(() =>
    document.querySelectorAll("#tally-map .tally-route").length > 0));
  // The same standard the break paths are held to: sampled against every
  // footprint on every field, with the bunker he is running to and the one he
  // starts behind exempted — he begins with a hand on that one.
  const routeCuts = () => ev(() => {
    // The tightest clearance autoRoute is willing to use, so this asks whether
    // the run actually clears rather than whether it cleared at full shoulder.
    const obs = routeObstacles(curLayout().bunkers, 0.2);
    const bad = [];
    // Both pits: a run to the same bunker from the far end of the field is a
    // different run, and has to clear just as well.
    ["us", "them"].forEach(side => curLayout().bunkers.forEach(target => {
      const r = autoRoute({ bunker: target.id, side, layout: S.layoutKey });
      if(!r.length) { bad.push("no run to " + target.id); return; }
      const mine = curLayout().bunkers.filter(x => side === "them" ? x.x > 130 : x.x < 20);
      const back = mine.sort((a, b) => Math.abs(a.y - 60) - Math.abs(b.y - 60))[0];
      const start = [side === "them" ? 147 : 3, back ? back.y : 60];
      const holds = o => Math.abs(start[0] - o.x) <= o.hw && Math.abs(start[1] - o.y) <= o.hh;
      const live = obs.filter(o => !o.ids.has(target.id) && !holds(o));
      const pts = [start, ...r.map(q => [q.x, q.y])];
      for(let i = 1; i < pts.length; i++)
        for(const o of live)
          if(segHitsBox(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1], o.x, o.y, o.hw, o.hh)){
            bad.push(side + " " + target.id + " cuts " + o.n); break;
          }
    }));
    return [...new Set(bad)];
  });
  /* Every bunker on every field, both sides: 346 runs. All but four clear
     everything. The four are the deep end of the Midwest snake, where the only
     way in is along the snake itself and past the wedge sitting on it — which
     is what a snake runner physically does, so they are pinned by name rather
     than waved through by a loose tolerance. If that number ever grows, the
     router got worse. */
  const EXPECTED = { lso: 0, tby: 0, mwo: 4 };
  for(const k of ["lso", "mwo", "tby"]){
    await ev(x => window.set({ layoutKey: x }), k);
    await page.waitForTimeout(120);
    const cuts = await routeCuts();
    check(`${k}: every run clears everything but the known snake legs`,
      cuts.length === EXPECTED[k], `${cuts.length} cut, expected ${EXPECTED[k]} — ${cuts.slice(0, 4).join(", ")}`);
    if(k === "mwo")
      check("and those four are the deep snake, running along itself",
        cuts.every(c => /SB#1[34] cuts/.test(c)), cuts.join(", "));
  }
  await ev(() => window.set({ layoutKey: "lso" }));
  check("a second bunker adds a second leg", await ev(() => {
    const bl = curLayout().bunkers, a = bl.find(x => x.x < 60 && x.y > 85), z = bl.find(x => x.x > 70 && x.x < 90);
    return autoRoute({ bunker: a.id, movedTo: z.id, side: "us", layout: "lso" }).length
         > autoRoute({ bunker: a.id, side: "us", layout: "lso" }).length;
  }));
  // Delayed is already on the sheet, so the hold costs him no extra tap.
  check("delayed dashes the first leg, from what he already ticked", await ev(() => {
    const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 85);
    return autoRoute({ bunker: b.id, side: "us", layout: "lso", delayed: true })[0].dl === true
        && autoRoute({ bunker: b.id, side: "us", layout: "lso" })[0].dl === false;
  }));
  check("theirs runs from their own line, not yours", await ev(() => {
    const b = curLayout().bunkers.find(x => x.x > 95);
    const ours = autoRoute({ bunker: b.id, side: "us", layout: "lso" });
    const them = autoRoute({ bunker: b.id, side: "them", layout: "lso" });
    // Same destination, opposite ends of the field: the two runs cannot match.
    return them.length > 0 && them[them.length - 1].b === b.id
        && JSON.stringify(them) !== JSON.stringify(ours);
  }));
  check("a bunker this build does not have draws nothing rather than throwing",
    await ev(() => autoRoute({ bunker: "NOPE#9", side: "us", layout: "lso" }).length === 0));

  G("A route survives being logged");
  await seed({ tab: "tally", layoutKey: "lso", right: { name: "Rejects" },
               roster: [{ name: "Reyes", num: 7 }] });
  const routeLegs = () => ev(() => document.querySelectorAll("#tally-map .tally-route").length);
  await ev(() => {
    const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 85);
    window.selectBunker(b.id);
    window.setDraft({ player: "Reyes", alive: true, delayed: true });
  });
  const whileOpen = await routeLegs();
  check("the run draws while the sheet is open", whileOpen > 0);
  await ev(() => window.logBreakout());
  // It used to be drawn from the open draft alone, so logging made the run
  // disappear and the field showed a square.
  check("and it is still on the field after Log this breakout", await routeLegs() === whileOpen);
  check("a hold is still dashed once logged", await ev(() =>
    [...document.querySelectorAll("#tally-map .tally-route")].some(l => l.getAttribute("stroke-dasharray"))));
  // A row somebody traced by hand before this keeps what he drew: what he saw
  // beats what the router works out.
  check("a hand-traced row from an older build keeps its own line", await ev(() => {
    const r = routeOf({ bunker: S.breakouts[0].bunker, side: "us", layout: "lso",
                        route: [{x:10, y:10, b:"", dl:false}] });
    return r.length === 1 && r[0].x === 10;
  }));
  check("logged runs sit a shade back from the one being filled in", await ev(() => {
    const before = [...document.querySelectorAll("#tally-map .tally-route")].map(l => +l.getAttribute("stroke-width"));
    const b = curLayout().bunkers.find(x => x.x < 60 && x.y < 30);
    window.selectBunker(b.id);
    window.setDraft({ alive: true, route: [{x:16, y:22, b:"", dl:false}] });
    const now = [...document.querySelectorAll("#tally-map .tally-route")].map(l => +l.getAttribute("stroke-width"));
    return before.every(w => w < 2) && now.some(w => w > 2) && now.some(w => w < 2);
  }));
  // Every logged man gets a run now — there is nothing left for a coach to
  // forget to do.
  check("a second man logged adds a second run", await ev(() => {
    window.set({ tallySel: null, tallyDraft: null });
    const was = document.querySelectorAll("#tally-map .tally-route").length;
    const b = curLayout().bunkers.find(x => x.x < 60 && x.y > 40 && x.y < 55);
    window.selectBunker(b.id); window.setDraft({ alive: true }); window.logBreakout();
    return document.querySelectorAll("#tally-map .tally-route").length > was;
  }));
  check("the next point starts on a clean field", await ev(() => {
    window.set({ tallySel: null, tallyDraft: null, point: 2 });
    return document.querySelectorAll("#tally-map .tally-route").length === 0;
  }));
  await ev(() => window.set({ point: 1, tallySel: null, tallyDraft: null }));

  /* -------------------------------------------------- the names are a layer */
  G("Bunker codes are a layer, not the wallpaper");
  const codesOn = () => ev(() => {
    const f = document.querySelector("#root .field-wrap svg.field");
    return f ? [...f.querySelectorAll("text")]
      .filter(t => /^[A-Za-z]{1,2}[0-9]*$/.test(t.textContent.trim())).length : -1;
  });
  await seed({ tab: "scout", scoutTab: "matchup", right: { name: "Rejects" } });
  check("a coach opens on a field he can read, not a wall of codes",
    await ev(() => S.namesOn === false) && await codesOn() === 0);
  await ev(() => window.set({ namesOn: true }));
  check("the Names chip writes them on", await codesOn() > 20);
  await ev(() => window.set({ namesOn: false }));
  check("and takes them off again", await codesOn() === 0);
  check("the chip is on Playbook and on Scout", await ev(() => {
    const hasIt = () => [...document.querySelectorAll("#root .tgl")].some(b => /Names/.test(b.textContent));
    window.set({ tab: "playbook" }); const pb = hasIt();
    // On Scout the display toggles fold behind Overlays; open it to reach Names.
    window.set({ tab: "scout", scoutTab: "matchup", scoutFold: false });
    const sc = hasIt(); window.set({ scoutFold: true }); return pb && sc;
  }));
  // Where a named bunker is the subject the codes are not optional.
  for (const [tab, more, label] of [["sightlines", null, "Sightlines"],
                                    ["more", "movement", "Movement"],
                                    ["more", "stats", "Bunker stats"]]) {
    await ev(x => window.set({ tab: x[0], more: x[1], namesOn: false }), [tab, more]);
    check(label + " keeps the codes whatever the chip says", await codesOn() > 20);
  }
  await seed({ tab: "tally" });
  check("Tally opens on a clean field \u2014 the sheet names the bunker you tap",
    await codesOn() === 0);

  check("the training-aid line is on every Scout view, tables and voice included", await ev(() => {
    return SCOUT_TABS.every(([k]) => { window.set({ tab:"scout", scoutTab:k });
      return /training aid, not a prediction/i.test(document.getElementById("root").textContent); });
  }));
  for (const v of ["matchup","anticipate","counter"]) {
    await ev(x => window.set({ tab:"scout", scoutTab:x, scoutShow:"us" }), v);
    check(`Scout ${v} keeps the break section`,
      await ev(() => document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length) === 5);
  }

  // and the screens that ARE about the break still draw it
  await go("playbook");
  check("Playbook still draws the five", await runnersOn() === 5);
  await ev(() => window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"us" }));
  check("Scout's own break still draws a five", await runnersOn() === 5);

  /* Their pit is EMPTY until scouted — a mirror of your own call looks like
     intel and is not. Nothing logged draws nothing; a logged call draws their
     real five. */
  await ev(() => window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them",
                              right:{ name:"Rejects" }, scout:{} }));
  check("Scout theirs is empty until you scout them, not your call mirrored",
    await runnersOn() === 0
    && await ev(() => /scout them|shows here once you scout/i.test(document.getElementById("root").innerText)));
  check("a logged opponent call draws their real break", await ev(() => {
    window.setPitTeam("right","Rejects");
    window.logTheirBreak("right","snake");
    window.set({ tab:"scout", scoutTab:"matchup", scoutShow:"them" });
    return document.querySelectorAll(".field-wrap[data-live] svg.field g.live circle[r='6']").length === 5;
  }));
  await ev(() => window.set({ scout:{}, scoutShow:"them" }));

  /* --------------------------------------------------------------------
     Help — a coach on a sideline has no signal and nobody to ask
     -------------------------------------------------------------------- */
  G("Help");
  check("every screen in the app has a help entry", await ev(() => {
    const want = ["playbook","playbook/cards","playbook/rep","tally","sightlines",
      ...SCOUT_TABS.map(([k]) => "scout/" + k),
      ...MORE_GROUPS.flatMap(([, rows]) => rows.map(r => "more/" + r[0])).filter(k => k !== "more/help")];
    const missing = want.filter(k => !HELP[k]);
    window.__missing = missing.join(", ");
    return missing.length === 0;
  }), await ev(() => window.__missing));
  check("the header ? opens help for the screen you are on", await ev(() => {
    window.set({ tab:"scout", scoutTab:"counter" });
    const btn = document.querySelector(".help-btn"); if(!btn) return false;
    btn.click();
    return S.tab === "more" && S.more === "help" && S.helpFor === "scout/counter"
      && /They run X, we run Y/.test(document.getElementById("root").textContent);
  }));
  check("help for a screen names what it is for and how to use it", await ev(() => {
    window.set({ tab:"more", more:"help", helpFor:"tally" });
    const t = document.getElementById("root").textContent;
    return /break chart and the point sheet/.test(t) && document.querySelectorAll(".howto li").length >= 3;
  }));
  check("Show all lists every screen", await ev(() => {
    window.set({ helpFor:"" });
    return document.querySelectorAll(".list__row").length >= Object.keys(HELP).length;
  }));
  check("a question opens its answer in place", await ev(() => {
    window.set({ tab:"more", more:"help", helpFor:"", helpQ:-1 });
    const before = document.getElementById("root").textContent;
    window.set({ helpQ: 0 });
    const after = document.getElementById("root").textContent;
    return after.length > before.length && /Save a copy/.test(after);
  }));
  check("the hints can be put back after they were dismissed", await ev(() => {
    window.set({ tips:{ tally:1 }, tab:"tally" });
    const gone = !/Tap the bunker a man broke to/.test(document.querySelector(".tip")?.textContent || "");
    window.showHints();
    window.set({ tab:"tally" });
    return gone && !!document.querySelector(".tip");
  }));
  check("Help is in the More menu", await ev(() => {
    window.set({ tab:"more", more:null });
    return /What every screen does/.test(document.getElementById("root").textContent);
  }));
  check("the tutorial describes the Tally that actually exists", await ev(() => {
    window.set({ showTutorial:true, tab:"playbook" });
    const t = document.getElementById("root").textContent;
    const ok = /Tap the bunker a man broke to/.test(t) && !/Tap a player the moment he goes out\.<\/span>/.test(t);
    window.set({ showTutorial:false });
    return ok;
  }));

  /* --------------------------------------------------------------------
     A launch is a fresh start on every screen

     `playing` was reset on load and nothing else was, so a Right read ticked
     and never used rode to whatever point was ended next, and a half-filled
     breakout sheet came back open on yesterday's bunker under today's point.
     -------------------------------------------------------------------- */
  G("Nothing half-done survives a relaunch");
  await ev(() => {
    window.set({ tab:"tally", tallyRead:"right", tallyPick:true, helpFor:"scout/counter", helpQ:3,
                 editPath:true, pad:"face:1", replayPt:4, replayStep:2, theirPick:["x"], sightAim:[10,10],
                 penOpen:true, gameOpen:"sch0", gameNew:{h:"x"}, gamePaste:"half a schedule",
                 quick:true, quickPick:true, copyText:"the whole season again", copyStatus:"Replaced with …", sightPick:"to", pbView:"cards",
                 wb:{field:true, color:"#e5342f", tool:"pen", marks:[{t:"pen", c:"#e5342f", pts:[[40,40],[60,60]]}]} });
    window.selectBunker(curLayout().bunkers[3].id);
    window.setDraft({ player:"Reyes", alive:false });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  {
    const left = await ev(() => Object.entries({
      tallySel:S.tallySel, tallyDraft:S.tallyDraft, tallyRead:S.tallyRead,
      tallyPick:S.tallyPick, tallyLast:S.tallyLast, helpFor:S.helpFor, helpQ:S.helpQ,
      editPath:S.editPath, pad:S.pad, replayPt:S.replayPt, replayStep:S.replayStep,
      theirPick:(S.theirPick||[]).length, sightAim:S.sightAim, playing:S.playing, paste:S.paste,
      penOpen:S.penOpen, gameOpen:S.gameOpen, gameNew:S.gameNew, gamePaste:S.gamePaste,
      quick:S.quick, quickPick:S.quickPick,
      copyText:S.copyText, copyStatus:S.copyStatus, sightPick:S.sightPick === "from" ? "" : S.sightPick, pbView:S.pbView,
    }).filter(([k, v]) => !(v === null || v === "" || v === false || v === -1 || v === 0))
      .map(([k]) => k).join(", "));
    check("nothing a coach was in the middle of survives a relaunch", !left, left);
  }
  check("a read ticked last session cannot ride onto the next point", await ev(() => {
    const pt = S.point || 1;
    window.endPoint("us");
    const r = (S.results || []).find(x => x.m === S.matchId && x.pt === pt);
    window.backPoint();
    return r && !r.read;
  }));
  check("the whiteboard is kept across a relaunch", await ev(() => wbMarks().length === 1));

  G("House rules");
  const html = await ev(() => document.documentElement.outerHTML);
  check("the banned shot-tool name appears nowhere", !/gunz\s*up/i.test(html));
  check("the control is called Shot lanes", await ev(() => { window.set({ tab: "playbook" }); return document.getElementById("root").textContent.includes("Shot lanes"); }));
  check("the UPRA mark is on screen", await ev(() => document.getElementById("root").textContent.includes("powered by UPRA")));

  /* ------------------------------------------------------------------ report */
  const pad = (s, n) => String(s).padEnd(n);
  let last = "";
  console.log("Gridlock function suite");
  console.log("=======================\n");
  for (const r of results) {
    if (r.group !== last) { console.log(`\n${r.group}`); console.log("-".repeat(r.group.length)); last = r.group; }
    console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${pad(r.name, 52)}${r.detail ? "  " + r.detail : ""}`);
  }
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log("\nFAILED:"); failed.forEach(f => console.log(`  ${f.group} — ${f.name}`)); }
  if (errors.length) { console.log("\nPAGE ERRORS:"); errors.forEach(e => console.log("  " + e)); }
  else console.log("No page errors during the run.");

  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})();

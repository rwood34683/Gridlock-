#!/usr/bin/env node
"use strict";
// Native-plugin contract tests without accessing a microphone or native SDK.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../web/speech.js"), "utf8");
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const restart = () => new Promise(resolve => setTimeout(resolve, 230));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
let passed = 0;
function check(value, label) { assert(value, label); passed++; console.log("PASS " + label); }
function harness() {
  const events = new Map(), documentEvents = new Map(), windowEvents = new Map(), calls = [], finals = [], states = [], errors = [], partials = [];
  const permission = { value: "granted", request: null, count: 0 };
  let nextId = 1, stopCount = 0;
  const emit = (name, data) => { for (const callback of [...(events.get(name) || [])]) callback(data); };
  const addListener = async (name, fn) => {
    if (!events.has(name)) events.set(name, new Set());
    events.get(name).add(fn);
    return { remove: async () => events.get(name).delete(fn) };
  };
  const plugin = {
    available: async () => ({ available: true }),
    checkPermissions: async () => ({ speechRecognition: permission.value }),
    requestPermissions: async () => { permission.count++; return permission.request ? permission.request.promise : { speechRecognition: "denied" }; },
    addListener,
    start(options) {
      const result = deferred(), call = { id: nextId++, options, result };
      calls.push(call);
      emit("listeningState", { sessionId: call.id, state: "startingListening", reason: "userStart" });
      emit("listeningState", { sessionId: call.id, state: "started", status: "started" });
      return result.promise;
    },
    forceStop: async () => {
      stopCount++;
      const call = calls[calls.length - 1];
      if (call) {
        call.result.reject(new Error("Recognition stopped before final results were produced."));
        emit("readyForNextSession", { sessionId: call.id });
      }
    }
  };
  const document = { visibilityState: "visible", addEventListener: (name, fn) => documentEvents.set(name, fn) };
  const context = { document, console, setTimeout, clearTimeout, Date, Promise, Capacitor: { isNativePlatform: () => true, Plugins: { SpeechRecognition: plugin, App: { addListener } } }, addEventListener: (name, fn) => windowEvents.set(name, fn) };
  context.window = context;
  vm.runInNewContext(source, context);
  return {
    api: context.gridlockSpeech, calls, finals, states, errors, partials, permission, events, emit, document, documentEvents,
    options: { language: "en-US", onFinal: (text, id) => finals.push({ text, id }), onPartial: text => partials.push(text), onState: state => states.push(state), onError: error => errors.push(error) },
    get stopCount() { return stopCount; }
  };
}
(async () => {
  const h = harness();
  check((await h.api.available()).available && h.permission.count === 0 && !h.calls.length, "availability never starts capture or asks permission");
  await Promise.all([h.api.start(h.options), h.api.start(h.options)]);
  check(h.calls.length === 1 && h.states.includes("listening"), "concurrent Start requests open one native session");
  check(h.calls[0].options.partialResults === false && h.calls[0].options.continuousPTT === false, "native mode uses confirmed finals instead of speculative partials");
  h.emit("partialResults", { matches: ["speculative move"], forced: true });
  check(!h.finals.length && !h.partials.includes("speculative move"), "forced/interim plugin payloads never become notes");
  h.emit("readyForNextSession", { sessionId: 1 });
  await restart();
  check(h.calls.length === 1, "native teardown alone does not restart before a finalized result");
  h.calls[0].result.resolve({ matches: ["two crossed snake", "alternative"] });
  await tick();
  check(h.finals.length === 1 && h.finals[0].text === "two crossed snake", "one confirmed result emits only the highest-ranked match");
  await restart();
  check(h.calls.length === 2, "confirmed completion plus teardown restarts while enabled");
  h.emit("readyForNextSession", { sessionId: 1 });
  h.calls[1].result.resolve({ matches: ["two crossed snake"] });
  await restart();
  check(h.calls.length === 2, "stale readiness from the previous session cannot restart the current session");
  h.emit("readyForNextSession", { sessionId: 2 });
  await restart();
  check(h.calls.length === 3 && h.finals.length === 2 && h.finals[0].id !== h.finals[1].id, "identical real utterances have separate stable identities");
  await h.api.stop();
  h.calls[2].result.resolve({ matches: ["late after stop"] });
  h.emit("error", { sessionId: 3, code: "NETWORK", message: "network unavailable" });
  await restart();
  check(h.calls.length === 3 && h.finals.length === 2 && !h.errors.length && h.states.at(-1) === "idle", "Stop rejects late results, late errors and restarts");
  check([...h.events.values()].every(handlers => !handlers.size), "Stop removes only the adapter's native listeners");

  const p = harness();
  p.permission.value = "prompt"; p.permission.request = deferred();
  const starting = p.api.start(p.options);
  await tick();
  check(p.permission.count === 1 && !p.calls.length, "explicit Start requests permission before capture");
  await p.api.stop();
  p.permission.request.resolve({ speechRecognition: "granted" });
  await starting;
  check(!p.calls.length && p.states.at(-1) === "idle", "Stop during the permission dialog prevents a delayed microphone start");

  const denied = harness();
  denied.permission.value = "prompt";
  await denied.api.start(denied.options);
  await denied.api.stop();
  check(!denied.calls.length && denied.errors.length === 1 && denied.states.at(-1) === "error", "denied permission reports an error without opening capture");

  const e = harness();
  await e.api.start(e.options);
  e.emit("error", { sessionId: 1, code: "NETWORK", message: "network unavailable" });
  await e.api.stop();
  check(e.errors.length === 1 && e.states.at(-1) === "error" && e.stopCount === 1, "network failure stops capture once and leaves an error state");

  const b = harness();
  await b.api.start(b.options);
  b.emit("appStateChange", { isActive: false });
  await b.api.stop();
  check(b.states.at(-1) === "idle" && b.stopCount === 1, "backgrounding the native app stops the microphone");

  const s = harness();
  await s.api.start(s.options);
  s.emit("error", { sessionId: 1, code: "SPEECH_ERROR_1110", message: "No speech detected" });
  s.calls[0].result.reject(new Error("No speech detected"));
  s.emit("readyForNextSession", { sessionId: 1 });
  await restart();
  check(s.calls.length === 2 && !s.finals.length && !s.errors.length, "normal silence restarts without creating an observation");
  for (const id of [2, 3]) {
    s.emit("error", { sessionId: id, code: "NO_MATCH", message: "No match" });
    s.calls[id - 1].result.reject(new Error("No match"));
    s.emit("readyForNextSession", { sessionId: id });
    await restart();
  }
  check(s.calls.length === 3 && s.errors.length === 1 && s.states.at(-1) === "error", "three rapid empty cycles stop instead of creating a restart loop");
  await s.api.stop();
  console.log(`Native speech adapter: ${passed}/${passed} checks passed (plugin stubs; no microphone or native binary).`);
})().catch(error => { console.error(error); process.exitCode = 1; });

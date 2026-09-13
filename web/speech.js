/* Explicitly started speech capture. Only recognizer-confirmed final results
   leave this adapter; audio and interim text are never stored here. */
(function () {
  "use strict";
  var Cap = window.Capacitor;
  var native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var plugins = (Cap && Cap.Plugins) || {};
  var plugin = native && plugins.SpeechRecognition;
  var BrowserSpeech = window.SpeechRecognition || window.webkitSpeechRecognition;
  var active = null, generation = 0, cleanup = Promise.resolve(), nativeBlocked = false;

  function live(session) { return active === session && session.enabled; }
  function notify(session, name) {
    var callback = session.options[name];
    if (typeof callback !== "function") return;
    try { callback.apply(null, Array.prototype.slice.call(arguments, 2)); }
    catch (error) { console.warn("GRIDLOCK speech callback failed."); }
  }
  function state(session, value) {
    if (session.state === value) return;
    session.state = value;
    notify(session, "onState", value);
  }
  function visible() { return document.visibilityState !== "hidden"; }
  function silence(error) {
    var detail = error && typeof error === "object" ? [error.code, error.error, error.message].join(" ") : String(error || "");
    return /no[ _-]?(speech|match)|speech[ _-]?timeout|no speech (input|detected)/i.test(detail);
  }
  function message(error) {
    var value = String((error && (error.message || error.error || error.code || error.name)) || error || "Speech recognition stopped.");
    if (/not.allowed|permission|denied/i.test(value)) return "Microphone or speech permission was denied. Enable it in settings, then tap Start.";
    if (/network|offline|connection/i.test(value)) return "The speech service could not connect. Check your connection, then tap Start.";
    if (/no.speech|no.match|speech.timeout|silence/i.test(value)) return "No speech was recognized. Tap Start to try again.";
    if (/audio.capture|audio.busy|microphone/i.test(value)) return "The microphone is unavailable. Close other recording apps, then tap Start.";
    return value;
  }
  function fail(session, error) {
    if (!live(session)) return;
    notify(session, "onError", message(error));
    finish(session, "error");
  }
  function removeListeners(session) {
    var handles = session.handles.splice(0);
    return Promise.all(handles.map(function (handle) {
      try { return Promise.resolve(handle.remove()).catch(function () {}); }
      catch (error) { return Promise.resolve(); }
    }));
  }
  function finish(session, finalState) {
    if (!session || !session.enabled) return cleanup;
    session.enabled = false;
    if (active === session) active = null;
    clearTimeout(session.restartTimer);
    notify(session, "onPartial", "");
    state(session, finalState || "idle");
    if (session.recognizer) {
      try { session.recognizer.abort(); } catch (error) {}
    }
    var release = async function () {
      if (session.nativeRequested) {
        // Android's stop promise resolves before teardown. Keep its readiness
        // listener until teardown completes, and prevent a competing start.
        var timedOut = false;
        var ready = new Promise(function (resolve) {
          if (session.cycle && session.cycle.ready) return resolve();
          session.stopReady = resolve;
          session.stopTimer = setTimeout(function () { timedOut = true; resolve(); }, 2500);
        });
        try {
          if (plugin.forceStop) await plugin.forceStop({ timeout: 0 });
          else await plugin.stop();
        } catch (error) { timedOut = true; }
        await ready;
        clearTimeout(session.stopTimer);
        if (timedOut) nativeBlocked = true;
      }
      await removeListeners(session);
    };
    cleanup = cleanup.then(release, release).catch(function () { nativeBlocked = true; });
    return cleanup;
  }
  async function available() {
    if (native) {
      if (!plugin || nativeBlocked) return { available: false, engine: "native" };
      try { return { available: !!(await plugin.available()).available, engine: "native" }; }
      catch (error) { return { available: false, engine: "native" }; }
    }
    return { available: !!BrowserSpeech, engine: BrowserSpeech ? "browser" : "none" };
  }
  function emitFinal(session, text, id) {
    text = typeof text === "string" ? text.trim() : "";
    if (!live(session) || !text) return;
    notify(session, "onPartial", "");
    notify(session, "onFinal", text, id);
  }
  function browserCycle(session) {
    if (!live(session)) return;
    if (!visible()) return finish(session, "idle");
    var recognizer = new BrowserSpeech();
    var cycle = { id: ++session.counter, seen: {}, startedAt: Date.now(), hadFinal: false };
    session.recognizer = recognizer;
    recognizer.lang = session.options.language || "en-US";
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    state(session, "starting");
    recognizer.onstart = function () { if (live(session) && session.recognizer === recognizer) state(session, "listening"); };
    recognizer.onresult = function (event) {
      if (!live(session) || session.recognizer !== recognizer) return;
      var results = event.results || [], partial = [];
      for (var i = 0; i < results.length; i++) {
        var result = results[i], text = result && result[0] && result[0].transcript;
        if (!result || typeof text !== "string") continue;
        if (result.isFinal) {
          if (!cycle.seen[i]) {
            cycle.seen[i] = true;
            cycle.hadFinal = true;
            emitFinal(session, text, "speech-" + session.id + "-" + cycle.id + "-" + i);
          }
        } else partial.push(text);
      }
      if (live(session)) notify(session, "onPartial", partial.join(" ").trim());
    };
    recognizer.onerror = function (event) {
      if (!live(session) || session.recognizer !== recognizer) return;
      if (silence(event)) { notify(session, "onPartial", ""); return; }
      fail(session, event);
    };
    recognizer.onend = function () {
      if (!live(session) || session.recognizer !== recognizer) return;
      notify(session, "onPartial", "");
      session.fastEnds = !cycle.hadFinal && Date.now() - cycle.startedAt < 1000 ? session.fastEnds + 1 : 0;
      if (session.fastEnds >= 3) return fail(session, "The speech service keeps stopping. Tap Start to try again.");
      state(session, "starting");
      session.restartTimer = setTimeout(function () { browserCycle(session); }, 200);
    };
    try { recognizer.start(); } catch (error) { fail(session, error); }
  }
  function sameNativeCycle(session, event) {
    var cycle = session.cycle;
    if (!cycle) return false;
    var id = event && event.sessionId;
    if (id === undefined || id === null) return true;
    if (cycle.nativeId === null) {
      if (typeof id === "number" && id <= session.lastNativeId) return false;
      cycle.nativeId = id;
    }
    return cycle.nativeId === id;
  }
  function nextNativeCycle(session) {
    var cycle = session.cycle;
    if (!live(session) || !cycle || !cycle.ready || !cycle.finalDone || cycle.queued) return;
    cycle.queued = true;
    session.fastEnds = !cycle.hadFinal && Date.now() - cycle.startedAt < 1000 ? session.fastEnds + 1 : 0;
    if (session.fastEnds >= 3) return fail(session, "The speech service keeps stopping. Tap Start to try again.");
    if (typeof cycle.nativeId === "number") session.lastNativeId = cycle.nativeId;
    state(session, "starting");
    session.restartTimer = setTimeout(function () { nativeCycle(session); }, 200);
  }
  function nativeCycle(session) {
    if (!live(session)) return;
    if (!visible()) return finish(session, "idle");
    var cycle = { id: ++session.counter, nativeId: null, ready: false, finalDone: false, queued: false, hadFinal: false, startedAt: Date.now(), silence: false };
    session.cycle = cycle;
    session.nativeRequested = true;
    state(session, "starting");
    // Capgo's partial event does not distinguish final from interim results.
    // Non-partial mode resolves only from SFSpeechRecognitionResult.isFinal
    // or Android onResults. Do not use continuousPTT/forced partial text.
    var result;
    try {
      result = plugin.start({ language: session.options.language || "en-US", maxResults: 1, popup: false, partialResults: false, continuousPTT: false, useOnDeviceRecognition: false, preferLegacyRecognizer: true });
    } catch (error) { return fail(session, error); }
    Promise.resolve(result).then(function (data) {
      if (!live(session) || session.cycle !== cycle) return;
      cycle.finalDone = true;
      cycle.hadFinal = !!(data && data.matches && typeof data.matches[0] === "string" && data.matches[0].trim());
      emitFinal(session, data && data.matches && data.matches[0], "speech-" + session.id + "-" + cycle.id + "-0");
      nextNativeCycle(session);
    }).catch(function (error) {
      if (!live(session) || session.cycle !== cycle) return;
      if (cycle.silence || silence(error)) {
        cycle.silence = true;
        cycle.finalDone = true;
        nextNativeCycle(session);
      } else fail(session, error);
    });
  }
  async function addListener(session, owner, event, handler) {
    var handle = await owner.addListener(event, handler);
    if (!live(session)) {
      if (handle && handle.remove) await handle.remove();
      return;
    }
    if (handle && handle.remove) session.handles.push(handle);
  }
  async function start(options) {
    if (active) return;
    var session = { id: ++generation, enabled: true, options: options || {}, handles: [], state: null, counter: 0, lastNativeId: -1, fastEnds: 0, nativeRequested: false };
    active = session;
    state(session, "starting");
    try {
      await cleanup;
      if (!live(session)) return;
      if (!visible()) return finish(session, "idle");
      var support = await available();
      if (!live(session)) return;
      if (!support.available) throw new Error(nativeBlocked ? "The speech service did not stop cleanly. Reopen the app before starting again." : "Speech recognition is unavailable here. Use manual entry or a supported browser/device.");
      if (!native) return browserCycle(session);
      var permission = await plugin.checkPermissions();
      if (!live(session)) return;
      if (!permission || permission.speechRecognition !== "granted") permission = await plugin.requestPermissions();
      if (!live(session)) return;
      if (!permission || permission.speechRecognition !== "granted") throw new Error("Speech permission denied");
      await addListener(session, plugin, "listeningState", function (event) {
        if (!sameNativeCycle(session, event) || !live(session)) return;
        var value = event.state || event.status;
        if (value === "started") state(session, "listening");
        else if ((event.reason === "error" || event.errorCode) && !session.cycle.silence && !silence(event.errorCode)) fail(session, event.errorCode || "Speech recognition stopped.");
      });
      if (!live(session)) return;
      await addListener(session, plugin, "error", function (error) {
        if (!sameNativeCycle(session, error) || !live(session)) return;
        if (silence(error)) { session.cycle.silence = true; notify(session, "onPartial", ""); }
        else fail(session, error);
      });
      if (!live(session)) return;
      await addListener(session, plugin, "readyForNextSession", function (event) {
        if (!sameNativeCycle(session, event)) return;
        session.cycle.ready = true;
        if (session.stopReady) session.stopReady();
        nextNativeCycle(session);
      });
      if (!live(session)) return;
      if (plugins.App && plugins.App.addListener) await addListener(session, plugins.App, "appStateChange", function (event) { if (event && event.isActive === false && live(session)) finish(session, "idle"); });
      if (!live(session)) return;
      if (!visible()) return finish(session, "idle");
      nativeCycle(session);
    } catch (error) { fail(session, error); }
  }
  function stop() { return active ? finish(active, "idle") : cleanup; }
  document.addEventListener("visibilitychange", function () { if (!visible()) stop(); });
  window.addEventListener("pagehide", stop);
  window.gridlockSpeech = { available: available, start: start, stop: stop };
})();

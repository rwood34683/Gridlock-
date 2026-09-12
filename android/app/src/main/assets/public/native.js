/* GRIDLOCK Coach — native bridge.
   Loaded on web and on device. Everything here degrades to a no-op in a
   plain browser, so web/index.html stays the single source of truth for UI. */
(function () {
  var Cap = window.Capacitor;
  var native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var P = (Cap && Cap.Plugins) || {};

  document.documentElement.classList.add(native ? "is-native" : "is-web");
  if (Cap && Cap.getPlatform) {
    document.documentElement.classList.add("platform-" + Cap.getPlatform());
  }

  /* Share: native sheet on device, Web Share API in the browser, clipboard last. */
  window.gridlockShare = function (text, title) {
    function canceled(error) { return error && (error.name === "AbortError" || /cancel/i.test(error.message || "")); }
    function showText() { window.prompt("Copy this text to share it:", text); return false; }
    function copy() {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return Promise.resolve(showText());
      return navigator.clipboard.writeText(text).then(function () {
        alert("Copied."); return true;
      }).catch(showText);
    }
    if (native && P.Share) {
      return P.Share.share({ title: title || "GRIDLOCK", text: text }).catch(function (error) {
        return canceled(error) ? false : copy();
      });
    }
    if (navigator.share) {
      return navigator.share({ title: title || "GRIDLOCK", text: text }).catch(function (error) {
        return canceled(error) ? false : copy();
      });
    }
    return copy();
  };

  /* Export a real JSON attachment. The calling UI keeps a text fallback and
     decides what to say; handing a file to another app is not a saved receipt. */
  if (native) {
    var exportPending = null;
    window.gridlockExportFile = function (text, filename) {
      if (exportPending) return exportPending;
      exportPending = Promise.resolve().then(function () {
        if (!P.Filesystem || !P.Share) throw new Error("File sharing is unavailable in this app build.");
        if (typeof text !== "string" || !text.length) throw new Error("The backup is empty.");
        JSON.parse(text);
        var name = String(filename || "GRIDLOCK-backup.json").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^\.+/, "").slice(0, 120);
        if (!name) name = "GRIDLOCK-backup.json";
        if (!/\.json$/i.test(name)) name += ".json";
        var file = "gridlock-exports/" + name;
        return P.Filesystem.writeFile({ path: file, data: text, directory: "CACHE", encoding: "utf8", recursive: true }).then(function (written) {
          if (written && written.uri) return written;
          return P.Filesystem.getUri({ path: file, directory: "CACHE" });
        }).then(function (written) {
          if (!written || !/^file:\/\//.test(written.uri || "")) throw new Error("The backup file could not be located.");
          return P.Share.share({ title: "GRIDLOCK backup", files: [written.uri], dialogTitle: "Save or share GRIDLOCK backup" });
        }).then(function () { return { status: "shared" }; });
      }).catch(function (error) {
        if (error && (error.name === "AbortError" || /cancel/i.test(error.message || ""))) return { status: "cancelled" };
        return { status: "failed", message: error && error.message ? error.message : "The backup could not be shared." };
      }).then(function (result) { exportPending = null; return result; });
      return exportPending;
    };
  }

  /* The durable copy of the season.
   *
   * web/index.html keeps working in localStorage — save() is synchronous and
   * called from every handler — and hands the same text here on every save.
   * This mirrors it into app storage (UserDefaults on iOS, SharedPreferences
   * on Android), which the OS does not clear to reclaim space and which rides
   * along in the device backup. On a launch where localStorage came back empty,
   * the copy goes back the other way.
   *
   * Writes are debounced: a coach dragging a path fires save() on every frame,
   * and a plugin round trip per frame would be felt. Half a second of lag on a
   * backup copy costs nothing; the working store is already written.
   */
  var KEY = "gridlock.coach.v2";
  var ACCOUNT = "gridlock.staff.v2";
  var pending = {}, timer = null, flushing = null;

  function storageStatus(failed) {
    var message = failed ? "The phone could not update its second copy. Keep a backup with Save a copy on Nexus." : "";
    if (window.gridlockDurableError === message) return;
    window.gridlockDurableError = message;
    if (typeof window.render === "function") window.render();
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!P.Preferences) return Promise.resolve();
    // Keep plugin writes ordered: a slow older write must never finish after a
    // newer one and roll the durable copy backwards.
    if (flushing) return flushing.then(flush);
    if (!Object.keys(pending).length) return Promise.resolve();
    var out = pending; pending = {};
    var failed = false;
    flushing = Promise.all(Object.keys(out).map(function (k) {
      return Promise.resolve().then(function () {
        return P.Preferences.set({ key: k, value: out[k] });
      }).catch(function () {
        failed = true;
        // Retry the failed text only if an even newer save is not queued.
        if (!(k in pending)) pending[k] = out[k];
      });
    })).then(function () {
      flushing = null;
      storageStatus(failed);
      if (Object.keys(pending).length && !timer) timer = setTimeout(flush, failed ? 5000 : 0);
    });
    return flushing;
  }

  // Whether there is anywhere durable to keep it. Nexus reads this rather than
  // promising a safety net a browser does not have.
  window.gridlockDurable = !!(native && P.Preferences);
  window.gridlockDurableError = "";

  window.gridlockKeep = function (text, key) {
    if (!window.gridlockDurable) return;         // a browser has nowhere durable
    pending[key || KEY] = text;
    if (!timer) timer = setTimeout(flush, 500);
  };

  /* Keep the screen awake on a sideline.
   *
   * The Screen Wake Lock API, not a plugin: it is in WKWebView from iOS 16.4
   * and in the Android WebView, so the phone app and the browser get the same
   * behaviour with no new native dependency. The lock is released by the system
   * whenever the page stops being visible, which is exactly right — it holds
   * while the coach is looking at the app and costs nothing once the phone is
   * in a pocket — but it means it has to be taken again on the way back.
   */
  window.gridlockCanAwake = !!(navigator.wakeLock && navigator.wakeLock.request);
  var lock = null, acquiring = false;
  var wanted = function () { return !(window.S && window.S.awake === false); };

  function acquire() {
    if (!window.gridlockCanAwake || lock || acquiring || !wanted()) return;
    if (document.visibilityState !== "visible") return;
    acquiring = true;
    navigator.wakeLock.request("screen").then(function (l) {
      acquiring = false;
      if (!wanted() || document.visibilityState !== "visible") {
        return l.release().catch(function () {});
      }
      lock = l;
      l.addEventListener("release", function () { if (lock === l) lock = null; });
    }).catch(function () { acquiring = false; }); // denied, low battery, no permission
  }
  function drop() {
    if (!lock) return;
    try { lock.release().catch(function () {}); } catch (e) {}
    lock = null;
  }
  window.gridlockAwake = function (on) { if (on) acquire(); else drop(); };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") acquire(); else drop();
  });
  acquire();

  if (!native) return;

  if (P.Preferences) {
    // The staff account first: it is what gates creating a class or sending a
    // blast, and restoring a season the coach can no longer sign in to is half
    // a rescue.
    P.Preferences.get({ key: ACCOUNT }).then(function (r) {
      if (r && r.value && window.gridlockRestoreAccount) window.gridlockRestoreAccount(r.value);
    }).catch(function () {});
    P.Preferences.get({ key: KEY }).then(function (r) {
      // gridlockRestore decides: it only takes this if the launch found no
      // usable local state, which is the whole point of keeping it.
      if (r && r.value && window.gridlockRestore) window.gridlockRestore(r.value);
    }).catch(function () {});
  }

  /* Dark stadium status bar. */
  if (P.SystemBars) {
    P.SystemBars.setStyle({ style: "DARK" }).catch(function () {});
  } else if (P.StatusBar) {
    P.StatusBar.setStyle({ style: "DARK" }).catch(function () {});
    if (Cap.getPlatform() === "android") {
      P.StatusBar.setBackgroundColor({ color: "#000000" }).catch(function () {});
    }
  }

  /* Deep links: gridlock://class/GL-7K2M and https://…/?c=GL-7K2M both open
     Classes with the code prefilled. */
  function openJoinCode(code) {
    if (!code || typeof window.set !== "function") return;
    window.set({ joinCode: code, entered: true, tab: "more", more: "classes" });
  }

  function codeFromUrl(url) {
    if (!url) return null;
    var m = /(?:class\/|[?&]c=)([A-Za-z0-9-]+)/.exec(url);
    return m ? m[1].toUpperCase() : null;
  }

  if (P.App) {
    // appUrlOpen covers a running app. A link that launches a stopped app is
    // delivered separately, and otherwise its class code never reaches the UI.
    if (P.App.getLaunchUrl) P.App.getLaunchUrl().then(function (event) {
      openJoinCode(codeFromUrl(event && event.url));
    }).catch(function () {});
    P.App.addListener("appUrlOpen", function (event) {
      openJoinCode(codeFromUrl(event && event.url));
    });

    /* Backgrounding is the last moment anything here is guaranteed to run, and
       the phone may not come back. Write the durable copy now rather than
       waiting out the debounce. */
    P.App.addListener("appStateChange", function (st) {
      if (st && st.isActive === false) flush();
    });

    /* Android hardware back walks the app instead of closing it. */
    P.App.addListener("backButton", function () {
      var S = window.S;
      if (!S || typeof window.set !== "function") {
        P.App.exitApp();
        return;
      }
      if (S.mode) return window.set({ mode: null });
      if (S.pbView) return window.set({ pbView: null });
      if (S.pad) return window.set({ pad: null });
      if (S.tab === "more" && S.more) return window.set({ more: null });
      if (S.tab && S.tab !== "playbook") return window.set({ tab: "playbook" });
      P.App.exitApp();
    });
  }
})();

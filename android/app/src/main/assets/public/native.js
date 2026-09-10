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
    if (native && P.Share) {
      return P.Share.share({ title: title || "GRIDLOCK", text: text }).catch(function () {});
    }
    if (navigator.share) {
      return navigator.share({ title: title || "GRIDLOCK", text: text }).catch(function () {});
    }
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(function () {
        alert("Copied.");
      }).catch(function () {});
    }
    return Promise.resolve();
  };

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
  var pending = null, timer = null;

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pending == null || !P.Preferences) return Promise.resolve();
    var text = pending; pending = null;
    return P.Preferences.set({ key: KEY, value: text }).catch(function () {});
  }

  // Whether there is anywhere durable to keep it. Nexus reads this rather than
  // promising a safety net a browser does not have.
  window.gridlockDurable = !!(native && P.Preferences);

  window.gridlockKeep = function (text) {
    if (!window.gridlockDurable) return;         // a browser has nowhere durable
    pending = text;
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
  var lock = null;
  var wanted = function () { return !(window.S && window.S.awake === false); };

  function acquire() {
    if (!window.gridlockCanAwake || lock || !wanted()) return;
    if (document.visibilityState !== "visible") return;
    navigator.wakeLock.request("screen").then(function (l) {
      lock = l;
      l.addEventListener("release", function () { lock = null; });
    }).catch(function () {});          // denied, low battery, no permission
  }
  function drop() {
    if (!lock) return;
    try { lock.release(); } catch (e) {}
    lock = null;
  }
  window.gridlockAwake = function (on) { if (on) acquire(); else drop(); };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") acquire(); else lock = null;
  });
  acquire();

  if (!native) return;

  if (P.Preferences) {
    P.Preferences.get({ key: KEY }).then(function (r) {
      // gridlockRestore decides: it only takes this if the launch found no
      // usable local state, which is the whole point of keeping it.
      if (r && r.value && window.gridlockRestore) window.gridlockRestore(r.value);
    }).catch(function () {});
  }

  /* Dark stadium status bar. */
  if (P.StatusBar) {
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
      if (S.tab === "more" && S.more) return window.set({ more: null });
      if (S.tab && S.tab !== "playbook") return window.set({ tab: "playbook" });
      P.App.exitApp();
    });
  }
})();

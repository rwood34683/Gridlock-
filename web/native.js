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

  if (!native) return;

  /* Dark stadium status bar. */
  if (P.StatusBar) {
    P.StatusBar.setStyle({ style: "DARK" }).catch(function () {});
    if (Cap.getPlatform() === "android") {
      P.StatusBar.setBackgroundColor({ color: "#0b1220" }).catch(function () {});
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

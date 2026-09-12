/* Installed mobile shells already bundle the app. Browsers cache it after opening. */
(function () {
  "use strict";
  var source = document.currentScript && document.currentScript.src;
  if (!source || !/^https?:$/.test(location.protocol) || !window.isSecureContext || !("serviceWorker" in navigator)) return;
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
  function register() {
    navigator.serviceWorker.register(new URL("sw.js", source), { updateViaCache: "none" }).catch(function (error) {
      // A browser that refuses caching can still use every coaching tool online.
      console.warn("GRIDLOCK offline cache unavailable:", error.message);
    });
  }
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
})();

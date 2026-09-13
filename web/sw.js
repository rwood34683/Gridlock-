/* Cache only the public app shell. Season data stays in the app's own storage. */
"use strict";
const VERSION = "gridlock-shell-v4";
const SCOPE = self.registration.scope;
const PREFIX = "gridlock:" + SCOPE + ":";
const CACHE = PREFIX + VERSION;
const FILES = ["index.html", "native.js", "offline.js", "voice-parser.js", "speech.js", "voice.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const URLS = FILES.map(file => new URL(file, SCOPE).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    URLS.map(url => new Request(url, { cache: "reload" }))
  )));
  // An updated worker waits until the previous app session has closed.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== new URL(SCOPE).origin) return;
  const page = new URL("index.html", SCOPE).href;
  const clean = url.origin + url.pathname;
  const navigation = request.mode === "navigate" && (clean === SCOPE || clean === page);
  if (!navigation && !URLS.includes(clean)) return;
  const key = navigation ? page : clean;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (!response.ok) throw new Error("App file unavailable");
      try {
        const cache = await caches.open(CACHE);
        await cache.put(key, response.clone());
      } catch (_) { /* A full cache must not prevent an online launch. */ }
      return response;
    } catch (error) {
      const cached = await caches.match(key, { cacheName: CACHE });
      if (cached) return cached;
      return new Response("Open GRIDLOCK while connected once to make it available offline.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});

#!/usr/bin/env node
/* Minimal static server for web/ — `npm run serve`, then open http://localhost:5173 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web");
const PORT = process.env.PORT || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  });
}).listen(PORT, () => console.log("GRIDLOCK web  →  http://localhost:" + PORT));

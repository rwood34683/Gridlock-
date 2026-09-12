#!/usr/bin/env node
"use strict";
/* Dependency-free local server. HOST=0.0.0.0 enables testing on your LAN. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const PROJECT = path.resolve(__dirname, "..");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf"
};
function within(root, file) {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}
function createServer({ root = path.join(PROJECT, "web") } = {}) {
  const base = fs.realpathSync.native(root);
  return http.createServer(async (req, res) => {
    const reply = (status, message) => {
      res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : message);
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("allow", "GET, HEAD");
      return reply(405, "Method not allowed");
    }
    let pathname;
    try { pathname = decodeURIComponent((req.url || "/").split("?")[0]); }
    catch { return reply(400, "Malformed URL"); }
    if (pathname.includes("\0") || pathname.includes("\\")) return reply(400, "Invalid path");
    let file = path.resolve(base, "." + (pathname.startsWith("/") ? pathname : "/" + pathname));
    if (!within(base, file)) return reply(403, "Forbidden");
    try {
      if ((await fs.promises.stat(file)).isDirectory()) {
        if (!pathname.endsWith("/")) {
          const queryAt = (req.url || "").indexOf("?");
          const query = queryAt >= 0 ? req.url.slice(queryAt) : "";
          const location = "/" + pathname.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/") + "/" + query;
          res.writeHead(301, { location, "cache-control": "no-store" });
          return res.end();
        }
        file = path.join(file, "index.html");
      }
      const actual = await fs.promises.realpath(file);
      if (!within(base, actual)) return reply(403, "Forbidden");
      const stat = await fs.promises.stat(actual);
      if (!stat.isFile()) return reply(404, "Not found");
      res.writeHead(200, {
        "content-type": TYPES[path.extname(actual).toLowerCase()] || "application/octet-stream",
        "content-length": stat.size, "cache-control": "no-store", "x-content-type-options": "nosniff"
      });
      if (req.method === "HEAD") return res.end();
      const stream = fs.createReadStream(actual);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      reply(error.code === "EACCES" ? 403 : 404, error.code === "EACCES" ? "Forbidden" : "Not found");
    }
  });
}
function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", `start "" "${url}"`] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true, windowsHide: true });
  child.on("error", () => console.log("Open the address above in your browser."));
  child.unref();
}
if (require.main === module) {
  const args = process.argv.slice(2);
  const rootAt = args.indexOf("--root");
  const root = path.resolve(PROJECT, rootAt < 0 ? "web" : args[rootAt + 1] || "web");
  const port = Number(process.env.PORT || 5173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error("PORT must be an integer from 0 to 65535."); process.exit(1); }
  try {
    const server = createServer({ root });
    server.on("error", error => { console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Set PORT to a free port.` : error.message); process.exitCode = 1; });
    server.listen(port, process.env.HOST || "127.0.0.1", () => {
      const url = `http://localhost:${server.address().port}/`;
      console.log(`GRIDLOCK → ${url}\nServing ${root}\nPress Ctrl+C to stop.`);
      if (args.includes("--open")) openBrowser(url);
    });
  } catch (error) { console.error(`Cannot serve ${root}: ${error.message}`); process.exitCode = 1; }
}
module.exports = { createServer, within };

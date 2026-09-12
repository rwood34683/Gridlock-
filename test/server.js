"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createServer } = require("../scripts/serve.js");

test("local server delivers the app and contains requests to its public root", async t => {
  const base = path.resolve(await fs.mkdtemp(path.join(os.tmpdir(), "gridlock-server-test-")));
  const root = path.join(base, "public");
  await fs.mkdir(path.join(root, "nested"), { recursive: true });
  await fs.mkdir(path.join(base, "public-secret"));
  await fs.writeFile(path.join(root, "index.html"), "<h1>GRIDLOCK test</h1>");
  await fs.writeFile(path.join(root, "style.css"), "body{color:red}");
  await fs.writeFile(path.join(root, "nested", "index.html"), "Nested page");
  await fs.writeFile(path.join(base, "public-secret", "secret.txt"), "NEVER-SERVE-THIS");
  const server = createServer({ root });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const request = (route, method = "GET") => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path: route, method }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject); req.end();
  });
  try {
    await t.test("HTML, assets and query parameters", async () => {
      const home = await request("/?c=GL-TEST");
      assert.equal(home.status, 200); assert.match(home.body, /GRIDLOCK test/);
      assert.match(home.headers["content-type"], /text\/html/);
      assert.match((await request("/style.css")).headers["content-type"], /text\/css/);
    });
    await t.test("HEAD returns headers without a body", async () => {
      const head = await request("/", "HEAD");
      assert.equal(head.status, 200); assert.equal(head.body, "");
    });
    await t.test("directory redirect preserves relative assets", async () => {
      const redirect = await request("/nested");
      assert([301, 302, 307, 308].includes(redirect.status));
      assert.equal(redirect.headers.location, "/nested/");
      assert.equal((await request("/nested/")).body, "Nested page");
    });
    await t.test("malformed encoding does not crash the server", async () => {
      assert.equal((await request("/%E0%A4%A")).status, 400);
      assert.equal((await request("/")).status, 200);
    });
    await t.test("plain, encoded and Windows traversal cannot expose a sibling", async () => {
      for (const route of ["/../public-secret/secret.txt", "/%2e%2e/public-secret/secret.txt", "/..%5cpublic-secret%5csecret.txt", "/%00"]) {
        const result = await request(route);
        assert([400, 403, 404].includes(result.status), route + " must fail");
        assert(!result.body.includes("NEVER-SERVE-THIS"));
      }
    });
    await t.test("missing files and write requests fail clearly", async () => {
      assert.equal((await request("/missing.png")).status, 404);
      assert.equal((await request("/", "POST")).status, 405);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    const temp = path.resolve(os.tmpdir()) + path.sep;
    if (!base.startsWith(temp) || !path.basename(base).startsWith("gridlock-server-test-")) throw new Error("Unsafe fixture cleanup path");
    await fs.rm(base, { recursive: true, force: true });
  }
});

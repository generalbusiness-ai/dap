// One person, one request: a comment sent through a real `dap mcp` process loses its reply, and the room's page on a second device
// settles it. The witness of notes/2026-10-31-signed-requests-across-devices.md, section 9.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/mcp-second-device.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler, because a real scope must verify each signature.
//
// The first device is `packages/cli/bin/dap.js mcp --generic`, spawned over stdio with its own ARTROOM_HOME, as a chat surface runs it.
// It joins through its `join` tool and sends through its `act` tool. The second device is the room's page in a browser context, enrolled
// through a `device-key` invitation that an admin's page functions make. A loopback proxy stands between every client and the Worker,
// and it is the one stand-in: it logs each `POST .../acts` and each request to the copy routes with the body's SHA-256, and for the
// marked request it forwards the bytes, reads the Worker's whole reply and destroys the socket. That is a lost reply on the real path.
//
// The first device dies by SIGKILL of its PID before the page presses. A new `dap mcp` over the same home then reads the outcome.
//
// Output: one JSON report on stdout. No link, session token or key leaves this process.
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR } = process.env;
if (!PLAYWRIGHT_CORE || !CHROMIUM || !WRANGLER || !WITNESS_DIR) throw new Error("Set PLAYWRIGHT_CORE, CHROMIUM, WRANGLER and WITNESS_DIR.");
const proxyPort = Number(process.env.WITNESS_PORT ?? 8798), workerPort = proxyPort + 1;
const base = `http://127.0.0.1:${proxyPort}`;
const CLI = join(root, "packages/cli/bin/dap.js");
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), anaHome = join(WITNESS_DIR, "ana"), persist = join(WITNESS_DIR, "state");
for (const path of [home, anaHome, persist]) mkdirSync(path, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(CLI);
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, lanes, bytes, client, data, platform] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("apps/room/lanes/src/index.ts"), load("packages/bytes/src/index.ts"),
  load("packages/client/src/index.ts"), load("apps/room/page/src/data.ts"), load("packages/platform/src/index.ts"),
]).catch(error => { throw new Error(`load: ${error.message}`); });

const failures = [];
const check = (name, actual, expected) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push({ name, actual, expected }); };
const sha = text => createHash("sha256").update(text).digest("hex");

// The proxy. Each row is in the order that the request reached it.
const wire = [];
let loseFor = null;
const proxy = createServer((req, res) => {
  const path = new URL(req.url, base).pathname;
  const acts = req.method === "POST" && path.endsWith("/acts"), copies = /\/originals(\/|$)/.test(path);
  const forward = (body, finish) => {
    const out = httpRequest({ host: "127.0.0.1", port: workerPort, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${workerPort}` } }, reply => finish(reply));
    out.on("error", () => res.destroy());
    if (body === null) req.pipe(out); else out.end(body);
  };
  const pass = reply => { res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); };
  if (!acts && !copies) return forward(null, pass);
  const parts = [];
  req.on("data", part => parts.push(part));
  req.on("end", () => {
    const body = Buffer.concat(parts), text = body.toString("utf8");
    const row = { what: `${req.method} ${acts ? "acts" : "originals"}`, sha256: sha(text), actor: null, reachedWorker: true, replyLost: false, body: acts ? text : null };
    if (acts || req.method === "POST") { try { row.actor = JSON.parse(text).signed.intent.actor; } catch { /* Not one act's body. */ } }
    wire.push(row);
    if (acts && row.actor === loseFor) {
      loseFor = null;
      row.replyLost = true;
      return forward(body, reply => { reply.resume(); reply.on("end", () => res.destroy()); });
    }
    forward(body, pass);
  });
});
await new Promise(done => proxy.listen(proxyPort, "127.0.0.1", done));

const FILES = { "issue-demo.json": bytes.utf8(bytes.canonicalize(lanes.issueDemo)) };
const owner = { store: fileStore(home), now: Date.now, fetch: globalThis.fetch.bind(globalThis), read: async path => FILES[path] ?? null };
owner.trustedCreationService = { service: base, fetch: owner.fetch };
const run = async (...argv) => {
  const outcome = await command(owner, argv);
  if (outcome.code !== 0) throw new Error(`dap ${argv[0]} ${argv[1] ?? ""}: exit ${outcome.code}`);
  return outcome;
};

// The Worker. Kill by PID only: other sessions run tests on this machine.
let worker = null;
async function startWorker(register, secret) {
  worker = spawn(process.execPath, [WRANGLER, "dev", "--config", "apps/room/celld/wrangler.json", "--port", String(workerPort), "--ip", "127.0.0.1", "--persist-to", persist,
    "--var", `REGISTER_SCOPE:${register}`, "--var", `SESSION_SECRET:${secret}`, "--var", `PUBLIC_ORIGIN:${base}`, "--log-level", "error"],
    { cwd: root, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  let log = "";
  worker.stderr.on("data", part => { log += part; });
  for (let attempt = 0; attempt < 120; attempt++) {
    try { const reply = await fetch(`${base}/page/`); if (reply.status === 200) return; } catch { /* Not listening yet. */ }
    await delay(500);
  }
  throw new Error(`the Worker did not start: ${log.slice(-800)}`);
}
async function stopWorker() {
  if (!worker || worker.exitCode !== null) return;
  const gone = new Promise(done => worker.once("exit", done));
  process.kill(worker.pid, "SIGINT");
  await Promise.race([gone, delay(10_000)]);
  if (worker.exitCode === null) process.kill(worker.pid, "SIGKILL");
}

// `dap mcp`, on the real path: the command, its file custody and its session in memory.
async function startMcp() {
  const mcp = new Client({ name: "mcp-second-device", version: "1" });
  mcp.onerror = () => {};
  const transport = new StdioClientTransport({ command: process.execPath, args: [CLI, "mcp", "--generic"], cwd: root, env: { ...process.env, ARTROOM_HOME: anaHome }, stderr: "ignore" });
  await mcp.connect(transport);
  return {
    mcp, transport,
    call: async (name, args) => (await mcp.callTool({ name, arguments: args })).structuredContent,
    /** bin/dap.js waits on one child, which holds the server and its custody. Kill exactly that PID. */
    kill: async () => {
      const server = execFileSync("pgrep", ["-P", String(transport.pid)], { encoding: "utf8" }).trim().split("\n").map(Number);
      if (server.length !== 1) throw new Error(`expected one server under the launcher, found ${server.length}`);
      process.kill(server[0], "SIGKILL");
      await transport.close().catch(() => {});
    },
  };
}

/** A domain tag, as packages/bytes/src/domains.ts writes it. The key store's local check signs 32 random bytes with no tag (browser-key-store.ts). */
const DOMAIN = /^artroom-[a-z0-9-]+-[0-9]+$/;
async function device(browser) {
  const context = await browser.newContext();
  const log = { acts: [], signatures: [] };
  await context.exposeBinding("__witnessSignature", (_source, tag, length) => { log.signatures.push({ tag, length, kind: DOMAIN.test(tag) ? "domain" : length === 32 ? "key-check" : "unknown" }); });
  await context.addInitScript(() => {
    const sign = crypto.subtle.sign.bind(crypto.subtle);
    crypto.subtle.sign = (algorithm, key, data) => {
      const view = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer, data instanceof ArrayBuffer ? 0 : data.byteOffset, data.byteLength);
      const end = view.indexOf(10);
      void window.__witnessSignature(new TextDecoder().decode(view.subarray(0, end < 0 ? 32 : end)), view.byteLength);
      return sign(algorithm, key, data);
    };
  });
  await context.route("**/v1/scopes/*/acts", route => { log.acts.push(sha(route.request().postData() ?? "")); return route.continue(); });
  const page = await context.newPage();
  page.on("pageerror", error => { failures.push({ name: "page error", actual: String(error), expected: null }); });
  return { context, page, log };
}
const shell = page => page.waitForSelector("summary.account", { timeout: 60_000, state: "attached" });

/** The open rows of one key's member, through the routes. */
async function openRows(membership, signer) {
  const asked = await client.signerSessionRequest(membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, membership.scope, asked);
  if (!session.ok) throw new Error(`no session for the list: ${session.reason}`);
  const listed = await client.originalsAt(base, membership.scope, session.session.reader()).list();
  if (!listed.ok) throw new Error(`no list: ${listed.reason}`);
  return listed.rows;
}
/** What the journal holds under one idempotency key, read with the owner's session. */
async function journal(lane, signed) {
  const config = await owner.store.config();
  const signer = client.secretSigner(await owner.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session for the journal read: ${session.reason}`);
  const history = await new client.ScopeHandle(client.httpTransport(base), lane, session.session.reader()).history();
  if (!history.ok) throw new Error(`no journal read: ${history.reason}`);
  const entries = history.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === signed.intent.idempotencyKey);
  return { entries: entries.length, seqs: entries.map(sealed => sealed.entry.seq), firstBytes: entries.every(sealed => bytes.canonicalize(sealed.entry.input.signed) === bytes.canonicalize(signed)) };
}

let browser = null, first = null, restarted = null;
try {
  // The room: the command line's install, create and invitation, on the local Worker.
  await run("install", "--plan", base, "--host", "none");
  const register = (await owner.store.config()).plan.register;
  await startWorker(register, bytes.b64url(randomBytes(32)));
  await run("install", "--planned");
  await run("create", "TEST mcp second device room", "--handle", "@owner");
  await run("act", "publish", "--on", "rules", "--target", "0", "--set", "approvals=0", "--set", "ownerMayReview=false", "--set", "checks=[]", "--set", "labels=[]", "--set", `extents=${JSON.stringify(platform.firstExtents({ approvals: 0, checks: [] }))}`);
  await run("act", "activate", "--on", "rules", "--set", `digest=${lanes.DEMO_DIGESTS.issue}`, "--set", "name=issue", "--value", "issue-demo.json");
  const invited = await run("invite", "@ana", "--role", "member");
  const link = invited.lines.flatMap(line => { const at = line.indexOf("artroom-invite:"); return at < 0 ? [] : [line.slice(at)]; })[0];
  if (!link) throw new Error("no invitation link");
  const config = await owner.store.config();
  const place = { directory: config.repository.directory.scope, membership: config.repository.membership };
  const ownerRoom = await data.openRoom({ service: base, secret: await owner.store.secret(config.key) }, place);
  const filed = await data.act(ownerRoom, place.directory, "open-issue", { fields: { definition: lanes.DEMO_DIGESTS.issue, title: "The handbook is empty", conditions: ["README.md says what the room is for"] } });
  if (filed.answer.answer !== "accepted") throw new Error(`open-issue: ${JSON.stringify(filed.answer)}`);
  let issue = null;
  for (let attempt = 0; attempt < 60 && !issue; attempt++) { issue = (await data.listLanes(ownerRoom)).issues[0] ?? null; if (!issue) await delay(500); }
  if (!issue) throw new Error("the issue did not open");

  // The first device: `dap mcp` joins as @ana with its own key.
  first = await startMcp();
  const joined = await first.call("join", { link, idempotencyKey: "witness-join" });
  if (joined.answer !== "accepted") throw new Error(`join: ${JSON.stringify(joined)}`);
  const mcpKey = joined.sentence.match(/on key (\S+?):/)?.[1];
  if (!mcpKey) throw new Error("the join did not state its key");
  const anaSigner = client.secretSigner(new Uint8Array(Buffer.from(readFileSync(join(anaHome, "keys", "device.key"), "utf8").trim(), "base64url")));
  check("the key on disk is the key that joined", anaSigner.key, mcpKey);

  // The second device: the page, with a `device-key` link for the same member.
  const issued = await data.issueDeviceKey(ownerRoom, "@ana");
  if (!("link" in issued)) throw new Error(`no device link: ${JSON.stringify(issued)}`);
  browser = await chromium.launch({ executablePath: CHROMIUM });
  const second = await device(browser);
  await second.page.goto(`${base}/page/#/invitation`);
  await second.page.waitForSelector('textarea[name="invitation"]');
  await second.page.fill('textarea[name="invitation"]', issued.link);
  await shell(second.page);
  check("the second device holds the same member", await second.page.locator("summary.account").first().getAttribute("aria-label"), "Account: @ana");

  // The request, with its reply lost on the way back.
  const key = "witness-comment";
  const commentArgs = { target: issue.scope, kind: "comment", digest: lanes.DEMO_DIGESTS.issue, fields: { body: "It is in README.md." }, idempotencyKey: key };
  const fromHere = wire.length;
  loseFor = mcpKey;
  const lost = await first.call("act", commentArgs);
  const firstWire = wire.slice(fromHere).filter(row => row.what !== "GET originals");
  const firstActs = firstWire.filter(row => row.what === "POST acts");
  const keptRows = firstWire.filter(row => row.what === "POST originals");
  const rowsBefore = await openRows(place.membership, anaSigner);

  // The laptop's battery runs out.
  await first.kill();
  first = null;

  // The page on the second device, reloaded, with no earlier request of its own.
  await second.page.goto(`${base}/page/#/issue/${issue.scope}`);
  await second.page.reload();
  await shell(second.page);
  await second.page.waitForSelector("[data-original-check]", { timeout: 60_000 });
  const line = await second.page.locator("[data-original-copy] p").allTextContents();
  const button = await second.page.locator("[data-original-check]").allTextContents();
  const secondActsBefore = second.log.acts.length;
  const intentsBefore = second.log.signatures.filter(signature => signature.tag === "artroom-intent-1").length;
  await delay(300);
  const mark = second.log.signatures.length;
  let atAnswer = null;
  const watch = response => { if (response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/settle")) atAnswer = second.log.signatures.length; };
  second.page.on("response", watch);
  await second.page.click("[data-original-check]");
  await second.page.waitForSelector("[data-original-answer]", { timeout: 60_000 });
  second.page.off("response", watch);
  await delay(300);
  const answer = await second.page.locator("[data-original-answer]").allTextContents();
  const toAnswer = atAnswer === null ? null : second.log.signatures.slice(mark, atAnswer).map(signature => signature.kind);
  const toLine = second.log.signatures.slice(mark);
  const secondActs = second.log.acts.length - secondActsBefore;
  const secondIntents = second.log.signatures.filter(signature => signature.tag === "artroom-intent-1").length - intentsBefore;
  const rowsAfter = await openRows(place.membership, anaSigner);
  const openOnPage = await second.page.locator("[data-original-copy]").count();
  const signed = JSON.parse(firstActs[0].body).signed;

  // A restart of `dap mcp` over the same home, with the record `unknown` and the row gone.
  const beforeRestart = wire.length;
  restarted = await startMcp();
  const settled = await restarted.call("settle", { target: issue.scope, idempotencyKey: key });
  const repeated = await restarted.call("act", commentArgs);
  await restarted.mcp.close();
  restarted = null;
  const afterRestart = wire.slice(beforeRestart).filter(row => row.what === "POST acts" || row.what === "POST originals").length;
  const rowsAfterRestart = await openRows(place.membership, anaSigner);
  const held = await journal(issue.scope, signed);

  const rows = {
    "First device's /acts that reached the Worker": firstActs.filter(row => row.reachedWorker).length,
    "Second device's /acts": secondActs,
    "Second device's artroom-intent-1 signatures": secondIntents,
    "Signatures of any kind, button to the scope's answer": toAnswer,
    "Entries under that idempotency key": held.entries,
    "Row after": rowsAfter.length,
  };
  check("the reply was lost", [lost.error, firstActs.map(row => row.replyLost)], ["transport", [true]]);
  check("the copy came before the act", firstWire.map(row => row.what), ["POST originals", "POST acts"]);
  check("the copy holds the bytes that went", keptRows.map(row => row.sha256), firstActs.map(row => row.sha256));
  check("the row is open before the press", rowsBefore.length, 1);
  check("the second device's line", line, [`You sent a comment on issue ${issue.number} from another device. It has no answer yet.`]);
  check("the second device's button", button, ["Check original request"]);
  check("the answer", answer, [`The request landed: entry ${held.seqs[0]}.`]);
  check("First device's /acts that reached the Worker", rows["First device's /acts that reached the Worker"], 1);
  check("Second device's /acts", rows["Second device's /acts"], 0);
  check("Second device's artroom-intent-1 signatures", rows["Second device's artroom-intent-1 signatures"], 0);
  check("Signatures of any kind, button to the scope's answer", rows["Signatures of any kind, button to the scope's answer"], []);
  check("No signature of a domain or of no known form, button to the line", toLine.filter(signature => signature.kind !== "key-check").length, 0);
  check("Entries under that idempotency key", held, { entries: 1, seqs: held.seqs, firstBytes: true });
  check("Row after", rows["Row after"], 0);
  check("the page shows no open copy", openOnPage, 0);
  check("settle after the restart", [settled.answer, settled.phase, settled.fact?.seq], ["accepted", "accepted", held.seqs[0]]);
  check("a repeat after the restart keeps the first entry", [repeated.answer, repeated.retained, repeated.fact?.seq], ["accepted", true, held.seqs[0]]);
  check("the restart sent nothing and kept nothing", afterRestart, 0);
  check("no row after the restart", rowsAfterRestart.length, 0);

  const report = {
    label: "Observed run: a real dap mcp process over stdio, the room's page in Chromium, a local wrangler dev Worker on loopback, and a loopback proxy that lost the reply.",
    rows, wire: wire.slice(fromHere).filter(row => row.what !== "GET originals").map(({ what, sha256, reachedWorker, replyLost }) => ({ what, sha256, reachedWorker, replyLost })),
    line, button, answer, signaturesToLine: toLine.map(signature => signature.kind),
    afterRestart: { settle: { answer: settled.answer, phase: settled.phase, seq: settled.fact?.seq }, repeat: { answer: repeated.answer, retained: repeated.retained, seq: repeated.fact?.seq }, requests: afterRestart, rows: rowsAfterRestart.length },
    journal: held, failures,
  };
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await restarted?.mcp.close().catch(() => {});
  await first?.kill().catch(() => {});
  await stopWorker();
  proxy.closeAllConnections();
  proxy.close();
}

// The browser witness of NF-5 (request c288c917): a join whose reply is lost settles the same envelope after a reload, and the
// browser signs no second join.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/custody-witness.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler, because a real scope must verify each signature. The command line installs a register,
// creates the room and makes an invitation. The page is custody-witness-page.ts, bundled with esbuild and served at /custody-witness/
// on the Worker's origin by `context.route`. It runs `browserJoining` with `browserCustodyStore`: real IndexedDB and Web Locks.
//
// "Reply lost": a `context.route` handler on POST /acts calls `route.fetch()`, so the Worker records the join, and then
// `route.abort()`, so the page sees no reply. The page reloads, and Check settles the join with a read. The journal of the
// membership, read with the owner's session, must hold one entry under the join's key, and its signed bytes must equal the
// envelope in the custody record that the page's IndexedDB holds.
//
// Output: one JSON report on stdout. No link, session token or key leaves this process.
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR } = process.env;
if (!PLAYWRIGHT_CORE || !CHROMIUM || !WRANGLER || !WITNESS_DIR) throw new Error("Set PLAYWRIGHT_CORE, CHROMIUM, WRANGLER and WITNESS_DIR.");
const port = Number(process.env.WITNESS_PORT ?? 8789);
const base = `http://127.0.0.1:${port}`;
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), persist = join(WITNESS_DIR, "state");
mkdirSync(home, { recursive: true, mode: 0o700 }); mkdirSync(persist, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(join(root, "packages/cli/bin/dap.js"));
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, bytes, client] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("packages/bytes/src/index.ts"), load("packages/client/src/index.ts"),
]).catch(error => { throw new Error(`load: ${error.message}`); });

const failures = [];
const check = (name, actual, expected) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) failures.push({ name, actual, expected });
  return same;
};
const owner = { store: fileStore(home), now: Date.now, fetch: globalThis.fetch.bind(globalThis), read: async () => null };
owner.trustedCreationService = { service: base, fetch: owner.fetch };
const run = async (...argv) => {
  const outcome = await command(owner, argv);
  if (outcome.code !== 0) throw new Error(`dap ${argv[0]} ${argv[1] ?? ""}: exit ${outcome.code}`);
  return outcome;
};

// The Worker. Kill by PID only: other sessions run tests on this machine.
let worker = null;
async function startWorker(register, secret) {
  worker = spawn(process.execPath, [WRANGLER, "dev", "--config", "apps/room/celld/wrangler.json", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist,
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

/** The page's module: custody-witness-page.ts and the workspace sources it imports, as one browser bundle. */
async function bundle() {
  const { build } = await import(pathToFileURL(join(root, "node_modules/esbuild/lib/main.js")).href);
  // Each runtime export of the three workspace packages, as test-browser.mjs maps them, so a subpath never resolves under index.ts.
  const alias = {};
  for (const name of ["client", "bytes", "contract"]) {
    const directory = join(root, `packages/${name}`);
    const { exports } = createRequire(import.meta.url)(join(directory, "package.json"));
    for (const [entry, target] of Object.entries(exports)) if (typeof target === "string") alias[`@generalbusiness/dap-${name}${entry === "." ? "" : entry.slice(1)}`] = resolve(directory, target);
  }
  const built = await build({ entryPoints: [join(here, "custody-witness-page.ts")], bundle: true, platform: "browser", format: "esm", write: false, alias, logLevel: "silent" });
  return built.outputFiles[0].text;
}

/** What the membership's journal holds under one idempotency key, read with the owner's session. */
async function journal(scope, key) {
  const config = await owner.store.config();
  const signer = client.secretSigner(await owner.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session for the journal read: ${session.reason}`);
  const history = await new client.ScopeHandle(client.httpTransport(base), scope, session.session.reader()).history();
  if (!history.ok) throw new Error(`no journal read: ${history.reason}`);
  return history.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === key).map(sealed => sealed.entry.input.signed);
}

const report = { join: {}, counter: {} };
let browser = null;
try {
  await run("install", "--plan", base, "--host", "none");
  const register = (await owner.store.config()).plan.register;
  await startWorker(register, bytes.b64url(randomBytes(32)));
  await run("install", "--planned");
  await run("create", "TEST custody witness room", "--handle", "@owner");
  const invited = await run("invite", "@ana", "--role", "member");
  const link = invited.lines.flatMap(line => { const at = line.indexOf("artroom-invite:"); return at < 0 ? [] : [line.slice(at)]; })[0];
  if (!link) throw new Error("no invitation link");
  const definition = client.invitationOf(link, base)?.definition;
  const membership = (await owner.store.config()).repository.membership;

  const script = await bundle();
  browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext();
  const posts = [];
  let mode = "reply-lost";
  await context.route(`${base}/custody-witness/**`, route => new URL(route.request().url()).pathname.endsWith("/page.js")
    ? route.fulfill({ status: 200, contentType: "text/javascript", body: script })
    : route.fulfill({ status: 200, contentType: "text/html", body: '<!doctype html><meta charset="utf-8"><title>custody witness</title><script type="module" src="/custody-witness/page.js"></script>' }));
  await context.route("**/v1/scopes/*/acts", async route => {
    const body = route.request().postData() ?? "";
    posts.push({ sha256: createHash("sha256").update(body).digest("hex"), mode });
    if (mode === "reply-lost") { await route.fetch(); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => { failures.push({ name: "page error", actual: String(error), expected: null }); });
  const ready = () => page.waitForFunction(() => "witness" in globalThis, null, { timeout: 30_000 });
  await page.goto(`${base}/custody-witness/`); await ready();

  const first = await page.evaluate(text => globalThis.witness.join(text), link);
  report.join.firstPress = first.status;
  const slot = await page.evaluate(() => globalThis.witness.slot());
  const kept = await page.evaluate(() => globalThis.witness.records());
  report.join.afterLoss = { records: kept.length, phase: kept[0]?.phase ?? null, posts: posts.length };

  mode = "pass";
  await page.reload(); await ready();
  const checked = await page.evaluate(value => globalThis.witness.check(value), definition);
  report.join.check = checked.status;
  const settled = await page.evaluate(() => globalThis.witness.records());
  const record = settled[0];
  const entries = record ? await journal(membership.scope, record.identity.key) : [];
  report.join.afterCheck = { records: settled.length, phase: record?.phase ?? null, signings: record?.signings.length ?? null, posts: posts.length,
    journalEntries: entries.length, sameEnvelope: entries.length === 1 && bytes.canonicalize(entries[0]) === bytes.canonicalize(record.envelope.signed),
    slotKeyIsRecordKey: slot?.key === record?.identity.key, slotAfterCheck: await page.evaluate(() => globalThis.witness.slot()) };

  check("the first press lost its reply", first.status, "unknown");
  check("custody kept one record, unknown, after the loss", [kept.length, kept[0]?.phase], [1, "unknown"]);
  check("Check after the reload joined", checked.status, "joined");
  check("one record, accepted, with one signing", [settled.length, record?.phase, record?.signings.length], [1, "accepted", 1]);
  check("one POST left the browser: Check only reads", posts.length, 1);
  check("the journal holds one join under the key", entries.length, 1);
  check("the journal's join is the envelope in custody", report.join.afterCheck.sameEnvelope, true);

  // The Counter act. A room that the current Worker creates cannot install the Counter package, so no Counter scope exists here.
  report.counter = { ran: false, reason: "The Counter is created only by a package install. The current Worker creates no room that installs an ordinary package (docs/cli.md, Install an application package), and the install's host fetches the package from a public HTTPS Git commit that the host operator lists." };
} catch (error) {
  failures.push({ name: "witness run", actual: error instanceof Error ? error.message : String(error), expected: null });
} finally {
  await browser?.close().catch(() => {});
  await stopWorker();
}
console.log(JSON.stringify({ base, report, failures }, null, 2));
process.exitCode = failures.length === 0 ? 0 : 1;

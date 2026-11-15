// NF-5's local join witness, and NF-7's hosted Counter witness (ruling 657e4217).
// With no argument, the local join witness below remains the originally run path.
// Hosted mode takes the installed screen address as its sole argument and starts no local host, install, pack or adapter:
//
// PLAYWRIGHT_CORE=<existing playwright-core directory> CHROMIUM=<Chrome executable> \
// WITNESS_DIR=<new private directory> WITNESS_EVIDENCE=<new evidence directory> \
// WITNESS_INVITATION_FILE=<private invitation text file> \
// node apps/room/page/test/custody-witness.mjs https://<sandbox>.inguz.space/applications/<directory>/<item>/<presentation>/
//
// The planner deploys NF-5 and installs the Counter release before this hosted run. A failure reopens NF-5.
// The browser enrolls through the real invitation UI. No key, invitation, session token or raw request body enters evidence.
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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const screen = process.argv[2];
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR } = process.env;
if (!PLAYWRIGHT_CORE || !CHROMIUM || !WITNESS_DIR || !screen && !WRANGLER) throw new Error("Set the tools and private WITNESS_DIR; local join mode also needs WRANGLER.");
const port = Number(process.env.WITNESS_PORT ?? 8789);
const base = `http://127.0.0.1:${port}`;
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), persist = join(WITNESS_DIR, "state");
if (!screen) { mkdirSync(home, { recursive: true, mode: 0o700 }); mkdirSync(persist, { recursive: true, mode: 0o700 }); }
else mkdirSync(WITNESS_DIR, { mode: 0o700 });
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

/** Hosted NF-7, ruling 657e4217. The planner installs/deploys first; this script changes no host configuration. */
async function hostedCounter(screen) {
  report.join = { ran: false, reason: "This invocation runs the hosted Counter half; the local Chromium join result remains separate." };
  const evidence = process.env.WITNESS_EVIDENCE, invitationFile = process.env.WITNESS_INVITATION_FILE;
  if (!evidence || !invitationFile) throw new Error("Hosted mode needs WITNESS_EVIDENCE and a private WITNESS_INVITATION_FILE.");
  mkdirSync(evidence, { mode: 0o700 });
  const invitation = readFileSync(invitationFile, "utf8").trim();
  const counter = await client.loadApplicationScreenContext(screen);
  if (!counter || new URL(screen).protocol !== "https:") throw new Error("Give the deployed Counter's HTTPS sandbox screen address.");
  const target = counter.scope.scope;
  const transport = client.applicationScreenTransport(counter);
  async function hostedJournal(record, reader) {
    if (!reader) throw new Error("The Counter browser made no authenticated target read.");
    // Use only this browser's volatile native reader, through the verified installed-screen gateway. Never retain its token.
    const history = await new client.ScopeHandle(client.httpTransport(counter.origin, { fetch: transport.fetch }), target, reader).history();
    if (!history.ok) throw new Error("The hosted Counter journal was unavailable.");
    return history.value.filter(sealed => sealed.entry.input.type === "act"
      && sealed.entry.input.signed.intent.idempotencyKey === record.identity.key
      && sealed.entry.input.signed.intent.actor === record.identity.signer).map(sealed => sealed.entry.input.signed);
  }
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: process.env.WITNESS_HEADLESS === "1" });
  const counterContext = await browser.newContext();
  let reader = null;
  counterContext.on("request", request => {
    if (new URL(request.url()).pathname.startsWith(`/v1/scopes/${target}`)) {
      const authorization = request.headers()["authorization"];
      if (authorization?.startsWith("Session ")) reader = authorization;
    }
  });
  const counterPage = await counterContext.newPage();
  counterPage.on("pageerror", () => failures.push({ name: "Counter page runtime error", actual: true, expected: false }));
  const counterConsole = [];
  counterPage.on("console", message => { if (message.type() === "error" || message.type() === "warning") counterConsole.push(message.type()); });
  await counterPage.goto(screen);
  await counterPage.getByRole("heading", { name: "Agents that count", exact: true }).waitFor();
  if (await counterPage.title() !== "dap - counting" || await counterPage.locator("#counting").innerText() === "") throw new Error("the installed Counter page did not render");
  const counterPosts = [];
  let lose = true;
  await counterContext.route("**/v1/scopes/*/acts", async route => {
    if (route.request().method() !== "POST" || new URL(route.request().url()).pathname !== `/v1/scopes/${target}/acts`) return route.continue();
    const body = route.request().postDataJSON();
    counterPosts.push(createHash("sha256").update(route.request().postData() ?? "").digest("hex"));
    if (lose && body.signed?.intent.kind === "participate") { lose = false; await route.fetch(); return route.abort(); }
    return route.continue();
  });
  const records = () => counterPage.evaluate(scope => new Promise((resolve, reject) => {
    const open = indexedDB.open("dap-counter-custody-1");
    open.onerror = () => reject(new Error("Counter custody unavailable"));
    open.onsuccess = () => {
      const db = open.result, transaction = db.transaction("records", "readonly"), read = transaction.objectStore("records").getAll();
      read.onsuccess = () => resolve(read.result.map(row => JSON.parse(row.text)).filter(record => record.identity.target.scope === scope));
      read.onerror = () => reject(new Error("Counter custody read failed"));
      transaction.oncomplete = transaction.onabort = () => db.close();
    };
  }), target);
  await counterPage.getByRole("button", { name: "Connect this device", exact: true }).click();
  await counterPage.locator("[data-invitation]").fill(invitation);
  await counterPage.getByRole("button", { name: "Enroll this browser", exact: true }).click();
  await counterPage.getByText("This browser's membership is confirmed. Choose a voice, then Join count.", { exact: true }).waitFor();
  const voices = counterPage.locator("[data-voice]");
  await counterPage.waitForFunction(() => [...document.querySelectorAll("[data-voice] option")].some(option => !option.disabled && option.value));
  const selected = await voices.locator("option:not([disabled])").first().getAttribute("value");
  if (!selected) throw new Error("the real Counter has no usable English (US) voice; ask planner before a workaround");
  await voices.selectOption(selected);
  await counterPage.getByRole("button", { name: "Join count", exact: true }).click();
  await counterPage.getByText(/participation was not confirmed/).first().waitFor();
  const lost = await records();
  const postsAfterLoss = counterPosts.length;
  const pageUnknown = /unresolved|unknown/i.test(await counterPage.locator("body").innerText());
  await counterPage.screenshot({ path: join(evidence, "counter-unknown.png") });
  check("Counter page shows the unknown request", pageUnknown, true);
  check("Counter kept one unknown record after losing its reply", [lost.length, lost[0]?.phase, counterPosts.length], [1, "unknown", 1]);
  await counterPage.reload();
  await counterPage.getByRole("button", { name: "Check command", exact: true }).click();
  await counterPage.waitForFunction(scope => new Promise(resolve => {
    const open = indexedDB.open("dap-counter-custody-1");
    open.onsuccess = () => { const db = open.result, tx = db.transaction("records", "readonly"), read = tx.objectStore("records").getAll();
      read.onsuccess = () => resolve(read.result.map(row => JSON.parse(row.text)).some(record => record.identity.target.scope === scope && record.phase === "accepted"));
      tx.oncomplete = tx.onabort = () => db.close(); };
    open.onerror = () => resolve(false);
  }), target);
  const final = await records(), keptCounter = final[0];
  const counterEntries = keptCounter ? await hostedJournal(keptCounter, reader) : [];
  report.counter = { ran: true, pageUnknown, afterLoss: { records: lost.length, phase: lost[0]?.phase, posts: postsAfterLoss },
    afterCheck: { records: final.length, phase: keptCounter?.phase, posts: counterPosts.length, journalEntries: counterEntries.length,
      sameEnvelope: counterEntries.length === 1 && bytes.canonicalize(counterEntries[0]) === bytes.canonicalize(keptCounter.envelope.signed) },
    consoleErrorsOrWarnings: counterConsole.length, title: await counterPage.title() };
  check("Counter Check settles one record after reload", [final.length, keptCounter?.phase], [1, "accepted"]);
  check("Counter reload and Check send no second POST", counterPosts.length, 1);
  check("Counter journal holds one act under the key", counterEntries.length, 1);
  check("Counter journal signed bytes equal custody", report.counter.afterCheck.sameEnvelope, true);
  await counterPage.screenshot({ path: join(evidence, "counter-checked.png") });
  await counterContext.close();
}

const report = { join: {}, counter: {}, storage: { ran: false } };
let browser = null;
try {
  if (screen) await hostedCounter(screen);
  else {
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
  check("the join slot names that record and clears only after proof", [report.join.afterCheck.slotKeyIsRecordKey, report.join.afterCheck.slotAfterCheck], [true, null]);

  // These cases add real IDB rollback, bounded requests and same-origin tabs. Their transport ports are scripted.
  // Keep the original native join proof above separate, including its one POST and exact journal-envelope equality.
  const storageDeadline = async work => {
    let timer;
    try {
      return await Promise.race([work, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("TEST storage witness did not reach its native event gate within 30 seconds")), 30_000);
      })]);
    } finally { clearTimeout(timer); }
  };
  const storageEvaluation = (page, run, argument) => storageDeadline(page.evaluate(run, argument));
  report.storage = { ran: true, ...(await storageEvaluation(page, () => globalThis.witness.storageCases())) };
  for (const result of report.storage.cases) check(result.name, result.passed, true);

  let enteredPost, releaseReply;
  const actualPost = new Promise(resolve => { enteredPost = resolve; });
  const heldReply = new Promise(resolve => { releaseReply = resolve; });
  await context.route(`${base}/custody-witness/held-post`, async route => {
    enteredPost();
    await heldReply;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"released":true}' });
  });
  await storageEvaluation(page, () => globalThis.witness.heldPost("start"));
  await storageDeadline(actualPost);
  const whileHeld = await storageEvaluation(page, () => globalThis.witness.heldPost("retire-and-upgrade"));
  check("a held actual POST cannot hold the retired IDB connection or block upgrade", whileHeld,
    { upgraded: true, admissionEntered: true, phase: "sent", exactSent: true, count: 0, outcomes: 0, lengths: 0 });
  releaseReply();
  const afterReply = await storageEvaluation(page, () => globalThis.witness.heldPost("finish"));
  check("a late POST result gives unkept and creates no outcome or segment", afterReply,
    { storageAnswer: { held: "unkept", answer: "accepted" }, exactSent: true, unchanged: true, phase: "sent", count: 0, outcomes: 0, lengths: 0 });
  report.storage.heldPost = { whileHeld, afterReply, transport: "actual same-origin POST with a held route and scripted accepted reply; no-slot-clear belongs to browser-joining.test.ts" };

  const second = await context.newPage();
  second.on("pageerror", error => failures.push({ name: "second storage tab error", actual: String(error), expected: null }));
  await second.goto(`${base}/custody-witness/`);
  await second.waitForFunction(() => "witness" in globalThis, null, { timeout: 30_000 });
  const tab = (page, command, options) => storageEvaluation(page, ({ command, options }) => globalThis.witness.storageTab(command, options), { command, options });
  const tabCases = [];
  const tabCheck = (name, actual, expected) => tabCases.push({ name, passed: check(name, actual, expected) });
  const openTabs = async suffix => {
    const database = `TEST-nf5-tabs-${randomBytes(8).toString("hex")}-${suffix}`;
    await Promise.all([tab(page, "open", { database }), tab(second, "open", { database })]);
    return database;
  };
  await openTabs("record");
  tabCheck("real tab A holds the record Web Lock", await tab(page, "hold-record"), true);
  tabCheck("real tab B cannot sign under A's record lock", await tab(second, "keep"), { kept: false, builds: 0 });
  await tab(page, "release-record");
  await tab(second, "observe");
  tabCheck("the real record lock releases for a later keep", await tab(page, "keep"), { kept: true, builds: 1 });
  tabCheck("real BroadcastChannel invalidates the other tab", await tab(second, "observed"), true);

  const admission = await openTabs("admission");
  await tab(page, "hold-admission");
  const waiting = tab(second, "keep", { key: "admitted-first" });
  await page.waitForFunction(name => navigator.locks.query().then(state => state.pending.some(lock => lock.name === `${name}:exclusive`)), admission);
  await tab(page, "release-admission");
  tabCheck("a held real admission lets the queued identity sign once after release", await waiting, { kept: true, builds: 1 });
  tabCheck("real multi-tab admission refuses the next identity before signing", await tab(page, "keep", { key: "capacity-full" }), { kept: false, builds: 0 });

  const closedQueue = await openTabs("closed-queue");
  await tab(page, "hold-admission");
  const obsolete = tab(second, "keep", { key: "closed-before-admission" });
  await page.waitForFunction(name => navigator.locks.query().then(state => state.pending.some(lock => lock.name === `${name}:exclusive`)), closedQueue);
  await tab(second, "close");
  await tab(page, "release-admission");
  tabCheck("closing a real tab store rejects queued admission without signing", await obsolete, { kept: false, builds: 0 });
  await tab(page, "close");
  await second.close();
  report.storage.multiTab = tabCases;

  report.counter = { ran: false, reason: "Hosted NF-7 runs after NF-5 lands and the planner deploys its Counter release, by ruling 657e4217." };
  }
} catch (error) {
  writeFileSync(join(WITNESS_DIR, "failure-private.txt"), String(error), { mode: 0o600, flag: "wx" });
  failures.push({ name: "witness run", actual: "stopped; details stay in the private failure file", expected: null });
} finally {
  await browser?.close().catch(() => {});
  await stopWorker();
}
console.log(JSON.stringify({ address: screen ?? base, mode: screen ? "hosted-counter" : "local-join", report, failures }, null, 2));
process.exitCode = failures.length === 0 ? 0 : 1;

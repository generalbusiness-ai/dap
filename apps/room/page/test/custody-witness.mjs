// The browser witness of NF-5 (request c288c917): a join whose reply is lost settles the same envelope after a reload, and the
// browser signs no second join. NF-7 also runs the real installed Counter: a lost participate reply settles after reload.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> WITNESS_EVIDENCE=<a new evidence directory> \
//   NF7_URI=<public immutable packet URI> NF7_RELEASE=<packed release> NF7_PUBLISHER=<packed publisher> \
//   node apps/room/page/test/custody-witness.mjs
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
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR, WITNESS_EVIDENCE, NF7_URI, NF7_RELEASE, NF7_PUBLISHER } = process.env;
if (![PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR, WITNESS_EVIDENCE, NF7_URI, NF7_RELEASE, NF7_PUBLISHER].every(Boolean)) throw new Error("Set the tool, private directory, evidence and NF-7 package variables in the header.");
if (!/^git\+https:\/\/github\.com\/generalbusiness-ai\/dap\.git\/@[a-f0-9]{40}\//.test(NF7_URI)) throw new Error("NF7_URI must name the pushed packet's full immutable Git commit.");
const trust = JSON.stringify([{ release: NF7_RELEASE, publisher: NF7_PUBLISHER, host: "github.com" }]);
const port = Number(process.env.WITNESS_PORT ?? 8789);
const base = `http://127.0.0.1:${port}`;
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), persist = join(WITNESS_DIR, "state");
mkdirSync(home, { recursive: true, mode: 0o700 }); mkdirSync(persist, { recursive: true, mode: 0o700 });
mkdirSync(WITNESS_EVIDENCE, { mode: 0o700 });
const cliRequire = createRequire(join(root, "packages/cli/bin/dap.js"));
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ fileStore }, bytes, client] = await Promise.all([
  load("packages/cli/src/files.ts"), load("packages/bytes/src/index.ts"), load("packages/client/src/index.ts"),
]).catch(error => { throw new Error(`load: ${error.message}`); });

const failures = [];
const check = (name, actual, expected) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) failures.push({ name, actual, expected });
  return same;
};
const owner = { store: fileStore(home), now: Date.now, fetch: globalThis.fetch.bind(globalThis), read: async () => null };
owner.trustedCreationService = { service: base, fetch: owner.fetch };
// Use the normal Node CLI, including its persistent application-command custody and independent HTTPS Git read.
const run = (...argv) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(root, "packages/cli/bin/dap.js"), ...argv],
    { cwd: root, env: { ...process.env, DAP_HOME: home, ARTROOM_HOME: home, APPLICATION_TRUST: trust }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  child.stdout.on("data", part => { stdout += part; });
  // CLI output may contain an invitation or private configuration; never retain stderr or command arguments as evidence.
  child.stderr.resume();
  child.once("error", () => reject(new Error(`dap ${argv[0]} could not start`)));
  child.once("exit", code => code === 0 ? resolve({ lines: stdout.trim().split("\n") }) : reject(new Error(`dap ${argv[0]} failed with exit ${code}; stop before changing the normal install path`)));
});

// The Worker. Kill by PID only: other sessions run tests on this machine.
let worker = null;
async function startWorker(register, secret) {
  const config = JSON.parse(readFileSync(join(root, "apps/room/celld/wrangler.json"), "utf8"));
  config.main = join(root, "apps/room/celld/worker.ts");
  config.r2_buckets = [{ binding: "APPLICATION_CONTENT", bucket_name: "nf7-local-content" }];
  config.vars.APPLICATION_TRUST = trust;
  const configPath = join(WITNESS_DIR, "wrangler.json");
  writeFileSync(configPath, JSON.stringify(config), { mode: 0o600, flag: "wx" });
  worker = spawn(process.execPath, [WRANGLER, "dev", "--config", configPath, "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist,
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
async function journal(scope, key, actor) {
  const config = await owner.store.config();
  const signer = client.secretSigner(await owner.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session for the journal read: ${session.reason}`);
  const history = await new client.ScopeHandle(client.httpTransport(base), scope, session.session.reader()).history();
  if (!history.ok) throw new Error(`no journal read: ${history.reason}`);
  return history.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === key
    && sealed.entry.input.signed.intent.actor === actor).map(sealed => sealed.entry.input.signed);
}

const report = { join: {}, counter: {} };
let browser = null;
try {
  await run("install", "--plan", base, "--host", "none", "--cohort", "base");
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
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: process.env.WITNESS_HEADLESS === "1" });
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
  page.on("pageerror", () => { failures.push({ name: "join page runtime error", actual: true, expected: false }); });
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
  const entries = record ? await journal(membership.scope, record.identity.key, record.identity.signer) : [];
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

  const installed = await run("install", NF7_URI, "--release", NF7_RELEASE, "--request", "TEST-nf7-counter-install", "--role", "admin", "--values", '{"target":7}');
  const item = /item (\d+)/.exec(installed.lines.join("\n"))?.[1];
  if (!item) throw new Error("the normal install returned no application item");
  let screen;
  for (let attempt = 0; attempt < 120 && !screen; attempt++) {
    const result = await run("application", item);
    screen = result.lines.find(line => line.startsWith("Screen: "))?.slice(8);
    if (!screen) await delay(500);
  }
  if (!screen) throw new Error("the normal application read returned no screen");
  const counterInvite = await run("invite", "@counter", "--role", "admin");
  const counterLink = counterInvite.lines.find(line => line.includes("artroom-invite:"))?.split("artroom-invite:")[1];
  if (!counterLink) throw new Error("no Counter invitation");
  const counterContext = await browser.newContext();
  const counterPage = await counterContext.newPage();
  counterPage.on("pageerror", () => failures.push({ name: "Counter page runtime error", actual: true, expected: false }));
  const counterConsole = [];
  counterPage.on("console", message => { if (message.type() === "error" || message.type() === "warning") counterConsole.push(message.type()); });
  await counterPage.goto(screen);
  if (await counterPage.title() !== "dap - counting" || await counterPage.locator("#counting").innerText() === "") throw new Error("the installed Counter page did not render");
  const address = new URL("_/context", screen).href;
  const counter = await (await fetch(address)).json();
  const target = counter.scope.scope;
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
  await counterPage.locator("[data-invitation]").fill(`artroom-invite:${counterLink}`);
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
  await counterPage.screenshot({ path: join(WITNESS_EVIDENCE, "counter-unknown.png") });
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
  const counterEntries = keptCounter ? await journal(target, keptCounter.identity.key, keptCounter.identity.signer) : [];
  report.counter = { ran: true, pageUnknown, afterLoss: { records: lost.length, phase: lost[0]?.phase, posts: postsAfterLoss },
    afterCheck: { records: final.length, phase: keptCounter?.phase, posts: counterPosts.length, journalEntries: counterEntries.length,
      sameEnvelope: counterEntries.length === 1 && bytes.canonicalize(counterEntries[0]) === bytes.canonicalize(keptCounter.envelope.signed) },
    consoleErrorsOrWarnings: counterConsole.length, title: await counterPage.title() };
  check("Counter Check settles one record after reload", [final.length, keptCounter?.phase], [1, "accepted"]);
  check("Counter reload and Check send no second POST", counterPosts.length, 1);
  check("Counter journal holds one act under the key", counterEntries.length, 1);
  check("Counter journal signed bytes equal custody", report.counter.afterCheck.sameEnvelope, true);
  await counterPage.screenshot({ path: join(WITNESS_EVIDENCE, "counter-checked.png") });
  await counterContext.close();
} catch (error) {
  // A browser error can echo the invitation passed to fill. Keep details private, outside the evidence directory.
  writeFileSync(join(WITNESS_DIR, "failure-private.txt"), String(error), { mode: 0o600, flag: "wx" });
  failures.push({ name: "witness run", actual: "stopped; inspect the private failure file before asking planner for a changed path", expected: null });
} finally {
  await browser?.close().catch(() => {});
  await stopWorker();
}
console.log(JSON.stringify({ base, report, failures }, null, 2));
process.exitCode = failures.length === 0 ? 0 : 1;

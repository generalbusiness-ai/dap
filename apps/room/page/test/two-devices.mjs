// Two browser contexts, one member, one request: the witness of notes/2026-10-31-signed-requests-across-devices.md, section 8.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/two-devices.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler, because a real scope must verify each signature. The command line installs a register
// and creates the room. Every act of the two devices goes through the page in a browser.
//
// The witness counts in three places. A `context.route` handler logs each POST to /acts with its body's SHA-256. "Reply lost" calls
// `route.fetch()` and then `route.abort()`, and "Never arrived" calls `route.abort()` alone. `context.addInitScript` wraps
// `crypto.subtle.sign` and logs the domain tag, the bytes up to the first newline. The journal compares each entry's `input.signed`
// with the first context's bytes. The "Never arrived" column waits about six minutes of real time.
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
const port = Number(process.env.WITNESS_PORT ?? 8788);
const base = `http://127.0.0.1:${port}`;
const MEASURED_ACTS = Number(process.env.WITNESS_MEASURED_ACTS ?? 10);
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), persist = join(WITNESS_DIR, "state");
mkdirSync(home, { recursive: true, mode: 0o700 }); mkdirSync(persist, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(join(root, "packages/cli/bin/dap.js"));
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, lanes, bytes, client, data, platform] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("apps/room/lanes/src/index.ts"), load("packages/bytes/src/index.ts"),
  load("packages/client/src/index.ts"), load("apps/room/page/src/data.ts"), load("packages/platform/src/index.ts"),
]).catch(error => { throw new Error(`load: ${error.message}`); });

const failures = [];
const check = (name, actual, expected) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) failures.push({ name, actual, expected });
  return same;
};
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

/** A domain tag, as packages/bytes/src/domains.ts writes it. The key store's local check signs 32 random bytes with no tag (browser-key-store.ts). */
const DOMAIN = /^artroom-[a-z0-9-]+-[0-9]+$/;
/** One device: a browser context with its own IndexedDB, and the three counters. */
async function device(browser, name, actsMode = () => "pass") {
  const context = await browser.newContext();
  const log = { name, acts: [], signatures: [] };
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
  await context.route("**/v1/scopes/*/acts", async route => {
    const body = route.request().postData() ?? "";
    const entry = { sha256: createHash("sha256").update(body).digest("hex"), body, reachedWorker: false, actor: JSON.parse(body).signed.intent.actor };
    log.acts.push(entry);
    const mode = actsMode();
    if (mode === "never-arrived") return route.abort();
    entry.reachedWorker = true;
    if (mode === "reply-lost") { await route.fetch(); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => { failures.push({ name: `${name} page error`, actual: String(error), expected: null }); });
  return { context, page, log };
}
const intentsOf = one => one.log.signatures.filter(signature => signature.tag === "artroom-intent-1").length;
const signatureMark = async one => { await delay(300); return one.log.signatures.length; };
const signaturesSince = async (one, mark) => { await delay(300); return one.log.signatures.slice(mark); };
const shell = page => page.waitForSelector("summary.account", { timeout: 60_000, state: "attached" });

async function enrolDevice(one, link) {
  await one.page.goto(`${base}/page/#/invitation`);
  await one.page.waitForSelector('textarea[name="invitation"]');
  await one.page.fill('textarea[name="invitation"]', link);
  await shell(one.page);
}
async function createDeviceLink(one) {
  await one.page.goto(`${base}/page/#/devices`);
  await one.page.waitForSelector('input[name="handle"]', { timeout: 60_000 });
  await one.page.click('button:has-text("Create device link")');
  const link = await one.page.waitForSelector("[data-device-link]", { timeout: 60_000 });
  return link.inputValue();
}
const openIssue = async (one, scope, reload = false) => {
  await one.page.goto(`${base}/page/#/issue/${scope}`);
  if (reload) await one.page.reload();
  await one.page.waitForSelector('[data-action-slot="comment"]', { timeout: 60_000 });
};
const commentForm = '[data-action-slot="comment"] form';
async function sendComment(one, body) {
  await one.page.fill(`${commentForm} textarea[name="field:body"]`, body);
  await one.page.click(`${commentForm} button[type="submit"]`);
}
/**
 * One press of the button, with two windows. The first closes at the scope's answer, the reply of `route`, and holds every signature
 * of any kind. The second closes when the page shows its answer, after the redraw, and sorts what it holds.
 */
async function press(one, route) {
  const mark = await signatureMark(one);
  let atAnswer = null;
  const watch = response => { if (response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(route)) atAnswer = one.log.signatures.length; };
  one.page.on("response", watch);
  await one.page.click("[data-original-check]");
  await one.page.waitForSelector("[data-original-answer]", { timeout: 60_000 });
  one.page.off("response", watch);
  const toLine = await signaturesSince(one, mark);
  return {
    scopeAnswered: atAnswer !== null,
    toAnswer: atAnswer === null ? null : one.log.signatures.slice(mark, atAnswer).map(signature => signature.kind),
    domainToLine: toLine.filter(signature => signature.kind === "domain").map(signature => signature.tag),
    unknownToLine: toLine.filter(signature => signature.kind === "unknown").length,
    keyChecksToLine: toLine.filter(signature => signature.kind === "key-check").length,
  };
}
const lineOf = async page => (await page.locator("[data-original-copy] p").allTextContents());

/** What the journal holds under one idempotency key, read with the owner's session. */
async function journal(lane, signed) {
  const key = await owner.store.secret((await owner.store.config()).key);
  const signer = client.secretSigner(key);
  const config = await owner.store.config();
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session for the journal read: ${session.reason}`);
  const history = await new client.ScopeHandle(client.httpTransport(base), lane, session.session.reader()).history();
  if (!history.ok) throw new Error(`no journal read: ${history.reason}`);
  const entries = history.value.filter(sealed => sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.idempotencyKey === signed.intent.idempotencyKey);
  return { entries: entries.length, firstBytes: entries.every(sealed => bytes.canonicalize(sealed.entry.input.signed) === bytes.canonicalize(signed)) };
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

let browser = null;
try {
  // The room: the command line's install, create and invitation, on the local Worker.
  await run("install", "--plan", base, "--host", "none");
  const register = (await owner.store.config()).plan.register;
  await startWorker(register, bytes.b64url(randomBytes(32)));
  await run("install", "--planned");
  await run("create", "TEST two devices room", "--handle", "@owner");
  await run("act", "publish", "--on", "rules", "--target", "0", "--set", "approvals=0", "--set", "ownerMayReview=false", "--set", "checks=[]", "--set", "labels=[]", "--set", `extents=${JSON.stringify(platform.firstExtents({ approvals: 0, checks: [] }))}`);
  await run("act", "activate", "--on", "rules", "--set", `digest=${lanes.DEMO_DIGESTS.issue}`, "--set", "name=issue", "--value", "issue-demo.json");
  const invited = await run("invite", "@ana", "--role", "admin");
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

  browser = await chromium.launch({ executablePath: CHROMIUM });
  let firstMode = "pass";
  const first = await device(browser, "first", () => firstMode);
  const second = await device(browser, "second");
  await enrolDevice(first, link);
  const deviceLink = await createDeviceLink(first);
  await enrolDevice(second, deviceLink);
  check("the second device holds the same member", await second.page.locator("summary.account").first().getAttribute("aria-label"), "Account: @ana");

  // Column "Reply lost".
  const lost = { };
  {
    await openIssue(first, issue.scope);
    const before = await signatureMark(first);
    const firstActsBefore = first.log.acts.length;
    firstMode = "reply-lost";
    await sendComment(first, "It is in README.md.");
    await first.page.waitForFunction(() => document.body.textContent.includes("Request outcome unknown"), null, { timeout: 60_000 });
    firstMode = "pass";
    lost.firstIntents = (await signaturesSince(first, before)).filter(signature => signature.tag === "artroom-intent-1").length;
    // A reloaded page of the first key offers only the button.
    await openIssue(first, issue.scope, true);
    await first.page.waitForSelector("[data-original-check]", { timeout: 60_000 });
    lost.firstReloadLine = await lineOf(first.page);
    lost.firstReloadButton = await first.page.locator("[data-original-check]").allTextContents();
    lost.firstReloadFormsEnabled = await first.page.locator(`${commentForm} button[type="submit"]:not([disabled])`).count();
    lost.firstReloadStatusRecovery = await first.page.locator("[data-status-recovery]").count();

    await first.context.close();
    await second.page.reload();
    await shell(second.page);
    await second.page.waitForSelector("[data-original-check]", { timeout: 60_000 });
    lost.secondLine = await lineOf(second.page);
    const secondActs = second.log.acts.length;
    const intentsBefore = intentsOf(second);
    lost.press = await press(second, "/settle");
    lost.answer = await second.page.locator("[data-original-answer]").allTextContents();
    lost.secondIntents = intentsOf(second) - intentsBefore;
    lost.secondIntentsEver = intentsOf(second); // Its one `enrol`, at setup.
    const firstComment = first.log.acts.slice(firstActsBefore);
    lost.firstActsLogged = firstComment.length;
    lost.firstActsReachedWorker = firstComment.filter(sent => sent.reachedWorker).length;
    lost.secondActs = second.log.acts.length - secondActs;
    const signed = JSON.parse(firstComment[0].body).signed;
    lost.journal = await journal(issue.scope, signed);
    lost.openAfter = await second.page.locator("[data-original-copy]").count();
  }

  // Measurement: the two added requests of an ordinary act, observed in a run through the page.
  const measured = [];
  {
    const timings = new Map();
    let order = [];
    const nameOf = request => {
      const url = new URL(request.url());
      return url.pathname.endsWith("/acts") ? "POST acts" : /\/originals$/.test(url.pathname) && request.method() === "POST" ? "POST originals" : /\/originals\//.test(url.pathname) && request.method() === "DELETE" ? "DELETE originals" : /\/entries\//.test(url.pathname) ? "GET entry" : /\/originals$/.test(url.pathname) ? "GET originals" : null;
    };
    // The order is the order in which the page starts each request. A finish event can arrive in another order.
    const started = request => { const name = nameOf(request); if (name) order.push(name); };
    const finished = request => {
      const name = nameOf(request);
      if (!name) return;
      const timing = request.timing();
      timings.set(name, [...(timings.get(name) ?? []), timing.responseEnd > 0 ? timing.responseEnd : null]);
    };
    second.page.on("request", started);
    second.page.on("requestfinished", finished);
    await openIssue(second, issue.scope);
    for (let i = 0; i < MEASURED_ACTS; i++) {
      timings.clear(); order = [];
      await second.page.waitForSelector(`${commentForm} button[type="submit"]:not([disabled])`, { timeout: 60_000 });
      await sendComment(second, `Measured comment ${i + 1}.`);
      await second.page.waitForFunction(text => document.body.textContent.includes(text), `Measured comment ${i + 1}.`, { timeout: 60_000 });
      await delay(1000);
      const [acted, ended] = [order.indexOf("POST acts"), order.indexOf("DELETE originals")];
      await second.page.waitForSelector(`${commentForm} button[type="submit"]:not([disabled])`, { timeout: 60_000 });
      await delay(500);
      measured.push({ ...Object.fromEntries([...timings.entries()].map(([name, values]) => [name, values])), order: [...order], followReads: order.slice(acted + 1, ended).filter(name => name === "GET entry").length, keptFirst: order.indexOf("POST originals") < acted });
    }
    second.page.off("request", started);
    second.page.off("requestfinished", finished);
  }
  const series = name => measured.flatMap(row => row[name] ?? []).filter(value => value !== null);
  const summary = name => ({ requestsPerAct: measured.map(row => row.order.filter(started => started === name).length), medianMs: median(series(name)), maxMs: Math.max(...series(name)) });
  const measurement = {
    label: `Observed run: ${MEASURED_ACTS} comments through the page in Chromium, against a local wrangler dev Worker on loopback, one room. Times are Chromium's responseEnd for each request, with no network distance, so they state the Worker's own work and no real round trip.`,
    "POST originals": summary("POST originals"), "DELETE originals": summary("DELETE originals"), "POST acts": summary("POST acts"), "GET originals": summary("GET originals"),
    followReadsPerAct: measured.map(row => row.followReads), keptBeforeTheActEachTime: measured.every(row => row.keptFirst),
    roundTripsAddedPerAct: "Two to the membership object: POST originals and DELETE originals. One at the target: the entry read that verifies the receipt. One GET originals per draw of a view.",
  };

  // Column "Never arrived". A third device takes the first device's place, and the second device stays.
  const never = {};
  {
    let mode = "pass";
    const third = await device(browser, "third", () => mode);
    await enrolDevice(third, await createDeviceLink(second));
    await openIssue(third, issue.scope);
    const thirdActsBefore = third.log.acts.length;
    mode = "never-arrived";
    await sendComment(third, "It never arrived.");
    await third.page.waitForFunction(() => document.body.textContent.includes("Request outcome unknown"), null, { timeout: 60_000 });
    const thirdComment = third.log.acts.slice(thirdActsBefore);
    const signed = JSON.parse(thirdComment[0].body).signed;
    await third.context.close();
    await second.page.reload();
    await shell(second.page);
    await second.page.waitForSelector("[data-original-check]", { timeout: 60_000 });
    never.secondLine = await lineOf(second.page);
    const secondActs = second.log.acts.length;
    const intentsBefore = intentsOf(second);
    const early = async () => {
      const answers = await second.page.locator("[data-original-answer]").allTextContents();
      await second.page.click("[data-original-check]");
      await second.page.waitForFunction(old => [...document.querySelectorAll("[data-original-answer]")].map(node => node.textContent).join("|") !== old || !document.querySelector("[data-original-check]"), answers.join("|"), { timeout: 60_000 }).catch(() => {});
      await delay(500);
      return second.page.locator("[data-original-answer]").allTextContents();
    };
    never.earlyAnswer = await early();
    never.actsBeforeMargin = second.log.acts.length - secondActs;
    const sendable = Date.parse(signed.intent.notAfter) + 60_000;
    await delay(Math.max(0, sendable - Date.now()) + 2_000);
    await second.page.reload();
    await shell(second.page);
    await second.page.waitForSelector("[data-original-check]", { timeout: 60_000 });
    never.press = await press(second, "/acts");
    await second.page.waitForFunction(() => document.body.textContent.includes("refused the request") || document.body.textContent.includes("The request landed"), null, { timeout: 60_000 });
    never.answer = await second.page.locator("[data-original-answer]").allTextContents();
    never.secondIntents = intentsOf(second) - intentsBefore;
    never.firstActsLogged = thirdComment.length;
    never.firstActsReachedWorker = thirdComment.filter(sent => sent.reachedWorker).length;
    never.secondActs = second.log.acts.length - secondActs;
    never.sameSha256 = second.log.acts.at(-1)?.sha256 === thirdComment[0].sha256;
    never.journal = await journal(issue.scope, signed);
    never.openAfter = await second.page.locator("[data-original-copy]").count();
    never.waitedSeconds = Math.round((Date.now() - Date.parse(signed.intent.notAfter) + 300_000) / 1000);
  }

  // The note's table.
  const issueLine = `You sent a comment on issue ${issue.number} from another device. It has no answer yet.`;
  check("Reply lost: the counter saw the first device's one intent", lost.firstIntents, 1);
  check("Reply lost: the reloaded first key's line", lost.firstReloadLine, [`You sent a comment on issue ${issue.number} from this device. It has no answer yet.`]);
  check("Reply lost: the reloaded first key sees the button", lost.firstReloadButton, ["Check original request"]);
  check("Reply lost: the reloaded first key has no enabled comment form", lost.firstReloadFormsEnabled, 0);
  check("Reply lost: the reloaded first key has no other status button", lost.firstReloadStatusRecovery, 0);
  check("Reply lost: the second device's line", lost.secondLine, [issueLine]);
  check("Reply lost: First device's comment made one request", lost.firstActsLogged, 1);
  check("Reply lost: First device's /acts that reached the Worker", lost.firstActsReachedWorker, 1);
  check("Reply lost: Second device's /acts", lost.secondActs, 0);
  check("Reply lost: Second device's artroom-intent-1 signatures", lost.secondIntents, 0);
  check("Reply lost: Signatures of any kind, button to the scope's answer", lost.press.toAnswer, []);
  check("Reply lost: Signatures of any domain, button to the line", lost.press.domainToLine, []);
  check("Reply lost: No signature outside a domain and the key check", lost.press.unknownToLine, 0);
  check("Reply lost: Entries under that idempotency key", lost.journal, { entries: 1, firstBytes: true });
  check("Reply lost: no copy stays open", lost.openAfter, 0);
  check("Never arrived: the second device's line", never.secondLine, [issueLine]);
  check("Never arrived: no /acts before the margin", never.actsBeforeMargin, 0);
  check("Never arrived: First device's comment made one request", never.firstActsLogged, 1);
  check("Never arrived: First device's /acts that reached the Worker", never.firstActsReachedWorker, 0);
  check("Never arrived: Second device's /acts", never.secondActs, 1);
  check("Never arrived: same SHA-256", never.sameSha256, true);
  check("Never arrived: Second device's artroom-intent-1 signatures", never.secondIntents, 0);
  check("Never arrived: Signatures of any kind, button to the scope's answer", never.press.toAnswer, []);
  check("Never arrived: Signatures of any domain, button to the line", never.press.domainToLine, []);
  check("Never arrived: No signature outside a domain and the key check", never.press.unknownToLine, 0);
  check("Never arrived: Entries under that idempotency key", never.journal, { entries: 0, firstBytes: true });
  check("Never arrived: the answer ends refused expired", never.answer.some(line => line.includes("refused the request: expired")), true);
  check("Never arrived: no copy stays open", never.openAfter, 0);
  check("Measurement: one POST originals per act", measurement["POST originals"].requestsPerAct.every(n => n === 1), true);
  check("Measurement: one DELETE originals per act", measurement["DELETE originals"].requestsPerAct.every(n => n === 1), true);
  check("Measurement: one entry read verifies each receipt", measurement.followReadsPerAct.every(n => n === 1), true);
  check("Measurement: each copy comes before its act", measurement.keptBeforeTheActEachTime, true);

  const report = { replyLost: lost, neverArrived: never, measurement, failures };
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stopWorker();
}

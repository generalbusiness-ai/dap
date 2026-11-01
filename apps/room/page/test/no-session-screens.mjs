// The page's words for an open refused with no session, in a browser, on the local Worker.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/no-session-screens.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler. The command line installs a register and creates the room, and a browser joins it by
// invitation link, so the page's key signed at membership and nothing at the directory.
//
// Real: the Worker's refusal of the signed read in every screen, and the session answers `unauthorized` and `sessions-unavailable`.
// The second comes from a restart of the Worker on the same state with no SESSION_SECRET.
// STAND-IN: `context.route` loses the session request, or answers it with a rate limit that this file writes.
//
// Output: one JSON report on stdout, and for each screen a PNG and a .txt of its visible text in WITNESS_DIR. No link, token or key
// leaves this process.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR } = process.env;
if (!PLAYWRIGHT_CORE || !CHROMIUM || !WRANGLER || !WITNESS_DIR) throw new Error("Set PLAYWRIGHT_CORE, CHROMIUM, WRANGLER and WITNESS_DIR.");
const port = Number(process.env.WITNESS_PORT ?? 8791);
const base = `http://127.0.0.1:${port}`;
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const home = join(WITNESS_DIR, "owner"), persist = join(WITNESS_DIR, "state"), shots = join(WITNESS_DIR, "screens");
for (const dir of [home, persist, shots]) mkdirSync(dir, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(join(root, "packages/cli/bin/dap.js"));
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, bytes] = await Promise.all([load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("packages/bytes/src/index.ts")]);

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
    "--var", `REGISTER_SCOPE:${register}`, ...(secret ? ["--var", `SESSION_SECRET:${secret}`] : []), "--var", `PUBLIC_ORIGIN:${base}`, "--log-level", "error"],
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

const SESSIONS = "**/v1/scopes/*/sessions";
const report = {};
const failures = [];
/** Keeps a screenshot and the visible text of the page, and the session answers it saw. */
async function keep(page, name, expected, answers) {
  const answer = page.locator("p.answer.bad, p.entry-answer.bad").first();
  await answer.waitFor({ timeout: 60_000 });
  await page.waitForFunction(text => document.body.innerText.includes(text), expected, { timeout: 60_000 });
  const text = await page.locator("body").innerText();
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
  writeFileSync(join(shots, `${name}.txt`), text);
  const sessionAnswers = answers.splice(0);
  report[name] = { answer: await answer.innerText(), heading: await page.locator("h1").first().innerText(), sessionAnswers };
  if (!text.includes(expected)) failures.push({ name, expected, text });
}
/** Records the Worker's status for each session request, or that none came back. */
function watch(page) {
  const answers = [];
  page.on("response", response => { if (new URL(response.url()).pathname.endsWith("/sessions")) answers.push(response.status()); });
  page.on("requestfailed", request => { if (new URL(request.url()).pathname.endsWith("/sessions")) answers.push("no reply"); });
  return answers;
}

let browser = null;
try {
  await run("install", "--plan", base, "--host", "none");
  const register = (await owner.store.config()).plan.register;
  const secret = bytes.b64url(randomBytes(32));
  await startWorker(register, secret);
  await run("install", "--planned");
  await run("create", "TEST no session words room", "--handle", "@owner");
  const linkOf = async handle => {
    const invited = await run("invite", handle, "--role", "member");
    const link = invited.lines.flatMap(line => { const at = line.indexOf("artroom-invite:"); return at < 0 ? [] : [line.slice(at)]; })[0];
    if (!link) throw new Error("no invitation link");
    return link;
  };
  const config = await owner.store.config();

  browser = await chromium.launch({ executablePath: CHROMIUM });
  // The page's member: a saved room and a key that signed only at membership.
  const context = await browser.newContext();
  const page = await context.newPage();
  const answers = watch(page);
  await page.goto(`${base}/page/#/invitation`);
  await page.waitForSelector('textarea[name="invitation"]');
  await page.fill('textarea[name="invitation"]', await linkOf("@ana"));
  await page.waitForSelector("summary.account", { timeout: 60_000, state: "attached" });
  answers.splice(0);

  // A form: a second person whose session request is lost after the join.
  const joining = await browser.newContext();
  const joiningPage = await joining.newPage();
  const joiningAnswers = watch(joiningPage);
  await joining.route(SESSIONS, route => route.abort());
  await joiningPage.goto(`${base}/page/#/invitation`);
  await joiningPage.waitForSelector('textarea[name="invitation"]');
  await joiningPage.fill('textarea[name="invitation"]', await linkOf("@bea"));
  await keep(joiningPage, "invitation-form-no-reply", "The service did not give a usable answer to this page's request for a read session.", joiningAnswers);
  // The next step those words name: a reload, with the service answering, keeps the join, and Check status opens the room.
  await joining.unroute(SESSIONS);
  await joiningPage.reload();
  await joiningPage.waitForSelector('button:has-text("Check status")', { timeout: 60_000 });
  await joiningPage.click('button:has-text("Check status")');
  await joiningPage.waitForSelector("summary.account", { timeout: 60_000, state: "attached" });
  report["invitation-opens-after-reload"] = { account: await joiningPage.locator("summary.account").first().getAttribute("aria-label"), sessionAnswers: joiningAnswers.splice(0) };

  // The saved room: STAND-IN lost session request.
  await context.route(SESSIONS, route => route.abort());
  await page.reload();
  await keep(page, "saved-room-no-reply", "The service did not give a usable answer to this page's request for a read session. Reload this page to try again.", answers);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: join(shots, "saved-room-no-reply-phone.png"), fullPage: true });
  report["saved-room-no-reply"].phoneScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  if (report["saved-room-no-reply"].phoneScrollWidth > 375) failures.push({ name: "the screen fits a phone", scrollWidth: report["saved-room-no-reply"].phoneScrollWidth });
  await page.setViewportSize({ width: 1280, height: 720 });
  await context.unroute(SESSIONS);

  // The saved room: STAND-IN rate limit.
  await context.route(SESSIONS, route => route.fulfill({ status: 429, headers: { "content-type": "application/json", "retry-after": "60" }, body: JSON.stringify({ ok: false, reason: "rate-limited" }) }));
  await page.reload();
  await keep(page, "saved-room-rate-limited", "This key has asked for too many read sessions. Wait 60 seconds, then reload this page.", answers);
  await context.unroute(SESSIONS);

  // A reload with the service answering opens the room.
  await page.reload();
  await page.waitForSelector("summary.account", { timeout: 60_000, state: "attached" });
  report["saved-room-opens-again"] = { sessionAnswers: answers.splice(0) };

  // A form: a key that no member holds, where the service gives sessions. Real `unauthorized`.
  const configText = JSON.stringify({ v: 1, service: base, key: "browser", register: config.register, repository: config.repository, handle: "@nobody" });
  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  const strangerAnswers = watch(strangerPage);
  const submitConfig = async () => {
    await strangerPage.goto(`${base}/page/#/config`);
    await strangerPage.reload();
    await strangerPage.waitForSelector('textarea[name="config"]');
    await strangerPage.fill('textarea[name="config"]', configText);
    await strangerPage.fill('input[name="key"]', bytes.b64url(randomBytes(32)));
    await strangerPage.click('form.entry-form button[type="submit"]');
  };
  await submitConfig();
  await keep(strangerPage, "config-form-unauthorized", "This key is not an active key of a member of this room", strangerAnswers);

  // The same Worker state with no session secret. Real `sessions-unavailable`, for the member and for a stranger.
  await stopWorker();
  await startWorker(register, null);
  await page.reload();
  await keep(page, "saved-room-sessions-unavailable", "This service is not giving read sessions to any key", answers);
  await submitConfig();
  await keep(strangerPage, "config-form-sessions-unavailable", "This service is not giving read sessions to any key", strangerAnswers);
  if (report["saved-room-sessions-unavailable"].answer !== report["config-form-sessions-unavailable"].answer) failures.push({ name: "member and stranger hear the same words", member: report["saved-room-sessions-unavailable"].answer, stranger: report["config-form-sessions-unavailable"].answer });

  process.stdout.write(JSON.stringify({ report, failures }, null, 2) + "\n");
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stopWorker();
}

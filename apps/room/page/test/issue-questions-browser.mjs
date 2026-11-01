// A person returns on a second device, reads each open question on the issue screen, and answers with no value typed.
// The witness of request dd70e463. The J5 scene on the deployed Worker repeats it later.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/issue-questions-browser.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler, because a real scope must judge each act. `WITNESS_ROOT` runs it against another checkout, which is how
// the old screen fails it.
//
// The command line in separate homes sets up the room. The real `apps/views` server, over stdio in Ana's first home, supplies the words the screen must show.
// The browser fills one text box, the device link. After that it only presses, and each press is counted.
//
// Output: one JSON report on stdout, and screenshots under WITNESS_DIR. No link, session token or key leaves this process.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.WITNESS_ROOT ?? resolve(here, "../../../..");
const { PLAYWRIGHT_CORE, CHROMIUM, WRANGLER, WITNESS_DIR } = process.env;
if (!PLAYWRIGHT_CORE || !CHROMIUM || !WRANGLER || !WITNESS_DIR) throw new Error("Set PLAYWRIGHT_CORE, CHROMIUM, WRANGLER and WITNESS_DIR.");
const port = Number(process.env.WITNESS_PORT ?? 8796), base = `http://127.0.0.1:${port}`;
const CLI = join(root, "packages/cli/bin/dap.js");
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const homes = Object.fromEntries(["rita", "ana", "vic"].map(name => [name, join(WITNESS_DIR, name)])), persist = join(WITNESS_DIR, "state"), shots = join(WITNESS_DIR, "screens");
for (const path of [...Object.values(homes), persist, shots]) mkdirSync(path, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(CLI);
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, lanes, bytes, client, platform] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("apps/room/lanes/src/index.ts"), load("packages/bytes/src/index.ts"), load("packages/client/src/index.ts"), load("packages/platform/src/index.ts"),
]);

const failures = [], steps = [];
const check = (name, actual, expected = true) => { const same = JSON.stringify(actual) === JSON.stringify(expected); steps.push({ name, pass: same }); if (!same) failures.push({ name, actual, expected }); };
const FILES = { "issue-questions.json": bytes.utf8(bytes.canonicalize(lanes.issueQuestionsBrief)) };
const person = name => { const context = { store: fileStore(homes[name]), now: Date.now, fetch: globalThis.fetch.bind(globalThis), read: async path => FILES[path] ?? null }; context.trustedCreationService = { service: base, fetch: context.fetch }; return context; };
const people = { rita: person("rita"), ana: person("ana"), vic: person("vic") };
const run = async (who, ...argv) => {
  const outcome = await command(people[who], argv);
  if (outcome.code !== 0) throw new Error(`dap ${argv[0]} ${argv[1] ?? ""}: exit ${outcome.code}: ${outcome.lines.join(" ").replace(/artroom-[a-z-]+:\S+/g, "<link>").slice(0, 600)}`);
  return outcome;
};
const seqOf = outcome => { const match = /entry \S+:(\d+)/.exec(outcome.lines.join("\n")); if (!match) throw new Error("no entry in the answer"); return Number(match[1]); };
const linkIn = (outcome, prefix) => outcome.lines.flatMap(line => { const at = line.indexOf(prefix); return at < 0 ? [] : [line.slice(at).trim()]; })[0];

// The Worker. Kill by PID only: other sessions run tests on this machine.
let worker = null;
async function startWorker(register, secret) {
  worker = spawn(process.execPath, [WRANGLER, "dev", "--config", "apps/room/celld/wrangler.json", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist,
    "--var", `REGISTER_SCOPE:${register}`, "--var", `SESSION_SECRET:${secret}`, "--var", `PUBLIC_ORIGIN:${base}`, "--log-level", "error"],
    { cwd: root, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  let log = "";
  worker.stderr.on("data", part => { log += part; });
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(`${base}/page/`)).status === 200) return; } catch { /* Not listening yet. */ }
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

/** The lane's head and its items, read with Rita's key. */
async function laneOf(scope) {
  const config = await people.rita.store.config();
  const signer = client.secretSigner(await people.rita.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session: ${session.reason}`);
  const summary = await new client.ScopeHandle(client.httpTransport(base), scope, session.session.reader()).summary();
  if (!summary.ok) throw new Error(`no summary: ${summary.reason}`);
  return { at: summary.at, items: summary.value.items };
}
const factAt = async (scope, seq) => {
  const config = await people.rita.store.config();
  const signer = client.secretSigner(await people.rita.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  const read = await new client.ScopeHandle(client.httpTransport(base), scope, session.session.reader()).entry(seq);
  if (!read.ok) throw new Error(`no entry: ${read.reason}`);
  return { at: read.value.entry.at, seq, hash: read.value.hash };
};

let browser = null, views = null, report = {};
try {
  await run("rita", "install", "--plan", base, "--host", "none", "--cohort", "commons");
  const register = (await people.rita.store.config()).plan.register;
  await startWorker(register, bytes.b64url(randomBytes(32)));
  await run("rita", "install", "--planned");
  await run("rita", "create", "TEST issue questions room", "--handle", "@rita");
  await run("rita", "act", "publish", "--on", "rules", "--target", "0", "--set", "approvals=0", "--set", "ownerMayReview=false", "--set", "checks=[]", "--set", "labels=[]", "--set", `extents=${JSON.stringify(platform.firstExtents({ approvals: 0, checks: [] }))}`);
  await run("rita", "act", "activate", "--on", "rules", "--set", `digest=${lanes.QUESTION_BRIEF_DIGESTS.issue}`, "--set", "name=issue", "--value", "issue-questions.json");
  // The room's rule that a person approves and decides, as `examples/repo-in-ai/hosted-loop/person.ts` sets it.
  const held = (await laneOf((await people.rita.store.config()).repository.membership.scope)).items.find(item => item.type === "roster").values[platform.ROLE_LISTS.admin];
  await run("rita", "act", "set-actions", "--on", "membership", "--target", "0", "--set", "role=admin", "--set", `actions=${JSON.stringify([...new Set([...held, "issue.approve", "issue.decide"])])}`);
  await run("ana", "join", linkIn(await run("rita", "invite", "@ana", "--role", "admin"), "artroom-invite:"));
  await run("vic", "join", linkIn(await run("rita", "invite", "@vic", "--role", "member"), "artroom-invite:"));
  await run("rita", "act", "open-issue", "--on", "directory", "--set", `definition=${lanes.QUESTION_BRIEF_DIGESTS.issue}`, "--set", "title=TEST The import fails on large files", "--set", 'conditions=["Large files import"]', "--value", "issue-questions.json");
  let scope = null, line = null;
  for (let attempt = 0; attempt < 60 && !scope; attempt++) { line = (await run("vic", "issues")).lines.find(row => /sc_/.test(row)); scope = line ? /sc_[a-z0-9]+/.exec(line)[0] : null; if (!scope) await delay(500); }
  if (!scope) throw new Error("the issue did not open");
  const brief = bytes.digestBytes(bytes.utf8("TEST Brief\n"));
  const QUESTION = "Which file format should the import keep?", BODY = "Keep CSV, or move to Parquet. A person decides, because old exports depend on this.";
  const offer = seqOf(await run("rita", "act", "offer", "--on", scope, "--set", "offeree=@vic"));
  await run("vic", "act", "accept", "--on", scope, "--target", String(offer), "--set", `terms=${JSON.stringify(await factAt(scope, 0))}`);
  const ask = seqOf(await run("vic", "act", "ask", "--on", scope, "--set", `brief=${brief}`, "--set", `question=${QUESTION}`, "--set", `body=${BODY}`));
  const askFact = await factAt(scope, ask);
  const request = seqOf(await run("vic", "act", "request-approval", "--on", scope, "--set", `ask=${ask}`, "--set", `bodyAt=${JSON.stringify(askFact)}`, "--set", "requested=@ana"));
  await run("vic", "act", "block", "--on", scope, "--set", `commitment=${offer}`, "--set", `on=${JSON.stringify(askFact)}`);
  const OTHER = "May the import drop rows older than 2019?";
  const other = seqOf(await run("rita", "act", "ask", "--on", scope, "--set", `brief=${brief}`, "--set", `question=${OTHER}`, "--set", "body=The old rows slow each import."));
  await run("rita", "act", "request-approval", "--on", scope, "--set", `ask=${other}`, "--set", `bodyAt=${JSON.stringify(await factAt(scope, other))}`, "--set", "requested=@vic");

  // The words a person's card shows: the real server, in Ana's first home.
  const briefFile = join(WITNESS_DIR, "brief.txt"); writeFileSync(briefFile, "TEST Brief\n");
  views = new Client({ name: "issue-questions-browser", version: "1" });
  views.onerror = () => {};
  const viewsTransport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "apps/views/src/node.ts", "--brief", briefFile], cwd: root, env: { ...process.env, DAP_HOME: homes.ana }, stderr: "ignore" });
  await views.connect(viewsTransport);
  const rows = async () => {
    const answer = await views.callTool({ name: "needs_you", arguments: {} });
    if (!answer.structuredContent?.rows) throw new Error(`needs_you: ${JSON.stringify(answer).slice(0, 400)}`);
    return answer.structuredContent.rows;
  };

  const link = linkIn(await run("ana", "invite", "@ana", "--device"), "artroom-device-key:");
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 1000 } }), page = await context.newPage(), errors = [], acts = [];
  page.on("pageerror", error => errors.push(String(error)));
  context.on("response", async reply => { if (reply.request().method() === "POST" && reply.url().endsWith("/acts") && reply.url().includes(scope)) acts.push(reply.status()); });
  await page.goto(`${base}/page/`);
  await page.getByRole("link", { name: /Join with an invitation link/ }).click();
  await page.fill('textarea[name="invitation"]', link); // The one value this script types.
  await page.waitForSelector("summary.account", { timeout: 90_000, state: "attached" });
  // The second device reads its way to the issue, as a person does.
  await page.locator("a.work-title", { hasText: "The import fails on large files" }).click({ timeout: 60_000 });
  await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 });
  await page.screenshot({ path: join(shots, "1-opened.png"), fullPage: true });

  const before = await laneOf(scope), first = await rows();
  const text = async () => page.locator("main").innerText();
  const screen = await text(), row = first.find(one => one.item === request) ?? { needs: "no such row", why: "", settles: "", rule: {} };
  check("the card lists one row for Ana", first.length, 1);
  for (const [name, words] of [["what needs you", row.needs], ["why it is yours", `Why it is yours: ${row.why}`], ["what settles it", `What settles it: ${row.settles}`], ["who waits", "Waiting on this: @vic."], ["the rule", "Rule: this lane's rule for "], ["the exact rule, behind its disclosure", "Exact rule"], ["the question", QUESTION], ["the text", BODY]]) check(`the screen shows ${name}, in the words of apps/views`, screen.includes(words));
  check("the screen lists the question that does not need Ana", screen.includes(OTHER));
  check("the screen says who was asked", screen.includes("@rita asked @vic to approve this question."));
  await delay(1500);
  const after = await laneOf(scope);
  check("reading leaves the lane where it was", after.at, before.at);
  check("reading signed nothing", acts, []);
  check("the question stays open", after.items.find(item => item.id === request)?.state, "open");

  const pressed = async label => {
    const count = acts.length;
    await page.locator(`[data-question-answers="${ask}"] [data-question-answer="${label}"] button`).click({ timeout: 30_000 });
    for (let attempt = 0; attempt < 120 && acts.length === count; attempt++) await delay(250);
    return acts.slice(count);
  };
  check("Approve sends one act, accepted", await pressed("Approve"), [200]);
  await page.locator(`[data-question-answers="${ask}"] [data-question-answer="Decide"]`).waitFor({ timeout: 60_000 });
  await page.screenshot({ path: join(shots, "2-approved.png"), fullPage: true });
  const dueRows = await rows(), due = dueRows.find(one => one.item === ask), dueScreen = await text();
  check("after Approve, the card says the question is due", due?.category, "decision-due");
  check("after Approve, the screen says the same", due ? dueScreen.includes(due.needs) : false);
  check("Decide sends one act, accepted", await pressed("Decide"), [200]);
  let final = null;
  for (let attempt = 0; attempt < 80; attempt++) { final = await laneOf(scope); if (!final.items.some(item => item.id === ask && item.state === "asked")) break; await delay(250); }
  check("the question has left the asked state", final.items.some(item => item.id === ask && item.state === "asked"), false);
  await page.locator(`[data-question="${ask}"]`).waitFor({ state: "detached", timeout: 60_000 });
  await page.screenshot({ path: join(shots, "3-decided.png"), fullPage: true });
  check("the other question is still listed", (await text()).includes(OTHER));

  await page.goto(`${base}/page/#/devices`);
  await page.locator("button", { hasText: "Create device link" }).click({ timeout: 60_000 });
  await page.locator("[data-device-link]").waitFor({ timeout: 60_000 });
  check("the Devices screen names dap join", (await text()).includes("dap join"));
  await page.evaluate(() => { for (const box of document.querySelectorAll("textarea")) { box.value = ""; box.textContent = ""; } });
  await page.screenshot({ path: join(shots, "4-devices.png"), fullPage: true });
  check("no page error", errors, []);
  report = { scope, ask, request, other, head: final.at, acts };
} catch (error) {
  failures.push({ name: "stopped", actual: String(error).replace(/artroom-[a-z-]+:\S+/g, "<link>").slice(0, 800), expected: null });
} finally {
  await browser?.close().catch(() => {});
  await views?.close().catch(() => {});
  await stopWorker();
}
console.log(JSON.stringify({ ...report, steps, failures }, null, 1));
process.exit(failures.length ? 1 : 0);

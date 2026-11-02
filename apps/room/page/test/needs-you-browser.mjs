// A person returns on a second device and reads, on the Page's first screen, every item in the room that needs them, and what was decided while they were away.
// The witness of request 7424c6b9. The deployed run comes after the planner deploys this head.
//
//   PLAYWRIGHT_CORE=<a directory holding playwright-core> CHROMIUM=<a chromium executable> WRANGLER=<wrangler's bin file> \
//   WITNESS_DIR=<a new private directory outside the checkout> node apps/room/page/test/needs-you-browser.mjs
//
// playwright-core and wrangler stay outside the checkout, and the gate does not run this file. It serves the local Worker of
// apps/room/celld from the pinned wrangler, because a real scope must judge each act.
//
// The command line in separate homes sets up the room. The real `apps/views` server, over stdio in Ana's first home, supplies the rows the list must show.
// The browser fills one text box, the device link. After that it only presses and reloads, and the script counts each act the page sends.
//
// ROW_PRESS_PROBE=1 runs the fixed 20-tab/100-press read-only probe instead of the answering scene.
// It requires WITNESS_PRIVATE_DIR for keys and Worker state, outside WITNESS_DIR. ROW_PRESS_STOP_CONTROL=1
// deliberately stops after one successful opening to verify failure capture; it is no product failure.
// Output: one JSON report on stdout, and screenshots under WITNESS_DIR. No link, session token or key leaves this process.
import { rowPressProbe } from "./row-press-probe.mjs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const port = Number(process.env.WITNESS_PORT ?? 8797), base = `http://127.0.0.1:${port}`;
const CLI = join(root, "packages/cli/bin/dap.js");
const { chromium } = createRequire(join(PLAYWRIGHT_CORE, "package.json"))("playwright-core");

const probing = process.env.ROW_PRESS_PROBE === "1";
if (probing && !process.env.WITNESS_PRIVATE_DIR) throw Error("A row-press probe keeps keys and Worker storage in WITNESS_PRIVATE_DIR, outside its evidence directory.");
const privateRoot = process.env.WITNESS_PRIVATE_DIR ?? WITNESS_DIR;
const homes = Object.fromEntries(["rita", "ana", "vic"].map(name => [name, join(privateRoot, name)])), persist = join(privateRoot, "state"), shots = join(WITNESS_DIR, "screens");
for (const path of [...Object.values(homes), persist, shots]) mkdirSync(path, { recursive: true, mode: 0o700 });
const cliRequire = createRequire(CLI);
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, lanes, bytes, client, platform] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("apps/room/lanes/src/index.ts"), load("packages/bytes/src/index.ts"), load("packages/client/src/index.ts"), load("packages/platform/src/index.ts"),
]);

const failures = [], steps = [];
const check = (name, actual, expected = true) => { const same = JSON.stringify(actual) === JSON.stringify(expected); steps.push({ name, pass: same }); if (!same) failures.push({ name, actual, expected }); return same; };
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

/** A read with Rita's key: one lane's summary, or one entry. */
async function ritaHandle(scope) {
  const config = await people.rita.store.config();
  const signer = client.secretSigner(await people.rita.store.secret(config.key));
  const asked = await client.signerSessionRequest(config.repository.membership, signer, bytes.timeOf(Date.now() + 60_000), bytes.b64url(randomBytes(16)));
  const session = await client.requestSession(base, config.repository.membership.scope, asked);
  if (!session.ok) throw new Error(`no session: ${session.reason}`);
  return new client.ScopeHandle(client.httpTransport(base), scope, session.session.reader());
}
async function laneOf(scope) {
  const summary = await (await ritaHandle(scope)).summary();
  if (!summary.ok) throw new Error(`no summary: ${summary.reason}`);
  return { at: summary.at, items: summary.value.items };
}
const factAt = async (scope, seq) => {
  const read = await (await ritaHandle(scope)).entry(seq);
  if (!read.ok) throw new Error(`no entry: ${read.reason}`);
  return { at: read.value.entry.at, seq, hash: read.value.hash };
};

const openIssue = async title => {
  await run("rita", "act", "open-issue", "--on", "directory", "--set", `definition=${lanes.QUESTION_BRIEF_DIGESTS.issue}`, "--set", `title=${title}`, "--set", 'conditions=["Large files import"]', "--value", "issue-questions.json");
  for (let attempt = 0; attempt < 60; attempt++) { const line = (await run("vic", "issues")).lines.find(row => row.includes(title) && /sc_/.test(row)); if (line) return /sc_[a-z0-9]+/.exec(line)[0]; await delay(500); }
  throw new Error(`the issue did not open: ${title}`);
};

let browser = null, views = null, report = {}, probe = null;
try {
  await run("rita", "install", "--plan", base, "--host", "none", "--cohort", "commons");
  const register = (await people.rita.store.config()).plan.register;
  await startWorker(register, bytes.b64url(randomBytes(32)));
  if (probing) {
    const source = readFileSync(join(root, "apps/room/page/assets.ts"), "utf8");
    const line = source.split("\n").find(line => line.startsWith("export const PAGE_JS: string = "));
    const expected = JSON.parse(line.slice("export const PAGE_JS: string = ".length, -1));
    const actual = await (await fetch(`${base}/page/page.js`)).text();
    const guard = { expected: bytes.digestBytes(bytes.utf8(expected)), actual: bytes.digestBytes(bytes.utf8(actual)), same: expected === actual };
    writeFileSync(join(WITNESS_DIR, "page-byte-guard.json"), JSON.stringify(guard, null, 2) + "\n");
    if (!guard.same) throw Error("The local Worker's Page bytes differ from the frozen source.");
  }
  await run("rita", "install", "--planned");
  await run("rita", "create", "TEST needs you room", "--handle", "@rita");
  await run("rita", "act", "publish", "--on", "rules", "--target", "0", "--set", "approvals=0", "--set", "ownerMayReview=false", "--set", "checks=[]", "--set", "labels=[]", "--set", `extents=${JSON.stringify(platform.firstExtents({ approvals: 0, checks: [] }))}`);
  await run("rita", "act", "activate", "--on", "rules", "--set", `digest=${lanes.QUESTION_BRIEF_DIGESTS.issue}`, "--set", "name=issue", "--value", "issue-questions.json");
  // The room's rule that a person approves and decides, as `examples/repo-in-ai/hosted-loop/person.ts` sets it.
  const held = (await laneOf((await people.rita.store.config()).repository.membership.scope)).items.find(item => item.type === "roster").values[platform.ROLE_LISTS.admin];
  await run("rita", "act", "set-actions", "--on", "membership", "--target", "0", "--set", "role=admin", "--set", `actions=${JSON.stringify([...new Set([...held, "issue.approve", "issue.decide"])])}`);
  await run("ana", "join", linkIn(await run("rita", "invite", "@ana", "--role", "admin"), "artroom-invite:"));
  await run("vic", "join", linkIn(await run("rita", "invite", "@vic", "--role", "member"), "artroom-invite:"));
  const brief = bytes.digestBytes(bytes.utf8("TEST Brief\n"));
  const asks = async (who, scope, question, body, requested) => {
    const ask = seqOf(await run(who, "act", "ask", "--on", scope, "--set", `brief=${brief}`, "--set", `question=${question}`, "--set", `body=${body}`));
    const fact = await factAt(scope, ask);
    return { ask, fact, request: seqOf(await run(who, "act", "request-approval", "--on", scope, "--set", `ask=${ask}`, "--set", `bodyAt=${JSON.stringify(fact)}`, "--set", `requested=${requested}`)) };
  };

  // Two issues, each with an item for Ana. In the first, @vic also waits on the question.
  const IMPORT = "TEST The import fails on large files", EXPORT = "TEST The export drops rows";
  const first = await openIssue(IMPORT), second = await openIssue(EXPORT);
  const offer = seqOf(await run("rita", "act", "offer", "--on", first, "--set", "offeree=@vic"));
  await run("vic", "act", "accept", "--on", first, "--target", String(offer), "--set", `terms=${JSON.stringify(await factAt(first, 0))}`);
  const importAsk = await asks("vic", first, "Which file format should the import keep?", "Keep CSV, or move to Parquet.", "@ana");
  await run("vic", "act", "block", "--on", first, "--set", `commitment=${offer}`, "--set", `on=${JSON.stringify(importAsk.fact)}`);
  const exportAsk = await asks("vic", second, "May the export drop rows older than 2019?", "The old rows slow each export.", "@ana");

  // A question @rita decides while Ana is away.
  const AWAY = "Which header should the export keep?", AWAY_BODY = "Keep the first header, or write both.", AWAY_COMMENT = "TEST keep the first header.";
  const away = await asks("vic", second, AWAY, AWAY_BODY, "@rita");
  await run("rita", "act", "approve", "--on", second, "--set", `request=${away.request}`, "--set", `bodyAt=${JSON.stringify(away.fact)}`, "--set", "verdict=approve");
  const awayDecision = seqOf(await run("rita", "act", "decide", "--on", second, "--target", String(away.ask), "--set", `bodyAt=${JSON.stringify(away.fact)}`, "--set", `comment=${AWAY_COMMENT}`));

  // The rows a person's card shows: the real server, in Ana's first home.
  const briefFile = join(WITNESS_DIR, "brief.txt"); writeFileSync(briefFile, "TEST Brief\n");
  views = new Client({ name: "needs-you-browser", version: "1" });
  views.onerror = () => {};
  const viewsTransport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "apps/views/src/node.ts", "--brief", briefFile], cwd: root, env: { ...process.env, DAP_HOME: homes.ana }, stderr: "ignore" });
  await views.connect(viewsTransport);
  const needsYou = async after => {
    const answer = await views.callTool({ name: "needs_you", arguments: after ? { after } : {} });
    if (!answer.structuredContent?.rows) throw new Error(`needs_you: ${JSON.stringify(answer).slice(0, 400)}`);
    return answer.structuredContent;
  };

  const link = linkIn(await run("ana", "invite", "@ana", "--device"), "artroom-device-key:");
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 1200 } }), page = await context.newPage(), errors = [], acts = [];
  probe = rowPressProbe(context, join(WITNESS_DIR, "row-press"));
  page.on("pageerror", error => errors.push(String(error)));
  context.on("response", async reply => { if (reply.request().method() === "POST" && reply.url().endsWith("/acts")) acts.push({ scope: /scopes\/([^/]+)\/acts/.exec(reply.url())?.[1], status: reply.status() }); });
  await page.goto(`${base}/page/`);
  await page.getByRole("link", { name: /Join with an invitation link/ }).click();
  await page.fill('textarea[name="invitation"]', link); // The one value this script types.
  await page.waitForSelector("summary.account", { timeout: 90_000, state: "attached" });
  probe.watch(page);
  await page.getByRole("link", { name: /The import fails on large files/ }).waitFor({ timeout: 60_000 });
  const actsAtStart = acts.length;
  const text = async () => page.locator("main").innerText();
  const listShown = () => page.locator("[data-needs-you]").waitFor({ timeout: 20_000 }).then(() => true, () => false);
  const shownRows = () => page.locator("[data-needs-row]").evaluateAll(nodes => nodes.map(node => ({ item: Number(node.getAttribute("data-needs-row")), scope: node.getAttribute("data-needs-lane"), text: node.innerText })));
  const { reasonLines } = await load("apps/views/src/attention.ts");
  const compare = async (label, rows) => {
    const shown = await shownRows();
    check(`${label}: the list holds the rows of needs_you, in their order`, shown.map(one => [one.scope, one.item]), rows.map(one => [one.scope.scope, one.item]));
    for (const row of rows) {
      const one = shown.find(candidate => candidate.scope === row.scope.scope && candidate.item === row.item);
      for (const [name, words] of [["what needs you", row.needs], ["why it is yours", `Why it is yours: ${row.why}`], ["what settles it", `What settles it: ${row.settles}`], ["the rule", "Rule: this lane's rule for "], ["the exact rule, behind its disclosure", "Exact rule"], ...row.waiting ? [["who waits", `Waiting on this: ${row.waiting.join(", ")}.`]] : []])
        check(`${label}: item ${row.item} says ${name}, in the words of apps/views`, !!one && one.text.includes(words));
    }
  };

  // The list on the first screen, with items in two issues.
  check("the first screen lists what needs Ana", await listShown());
  await page.screenshot({ path: join(shots, "1-first-screen.png"), fullPage: true });
  const whole = await needsYou();
  check("needs_you has one row in each issue", whole.rows.map(row => row.scope.scope).sort(), [first, second].sort());
  await compare("the first read", whole.rows);
  const before = await Promise.all([laneOf(first), laneOf(second)]);
  await page.reload();
  await listShown();
  await delay(1000);
  await compare("after a reload", whole.rows);
  check("the list names each issue", (await shownRows()).map(one => /TEST The (import|export)/.exec(one.text)?.[0]).sort(), ["TEST The export", "TEST The import"]);
  const decidedRow = page.locator(`[data-decided-row="${away.ask}"][data-needs-lane="${second}"]`);
  check("the question decided while Ana was away is in the list", await decidedRow.count(), 1);
  const decidedWords = await decidedRow.innerText().catch(() => "");
  for (const words of [`Decided question: ${AWAY} (entry ${awayDecision})`, "Decided by @rita on ", `Comment: ${AWAY_COMMENT}`]) check(`the list says: ${words}`, decidedWords.includes(words));
  await page.screenshot({ path: join(shots, "2-after-reload.png"), fullPage: true });

  if (probing) {
    const repeated = await probe.run(page, [
      { scope: second, item: exportAsk.request, ask: exportAsk.ask, title: EXPORT },
      { scope: first, item: importAsk.request, ask: importAsk.ask, title: IMPORT },
    ], process.env.ROW_PRESS_STOP_CONTROL === "1");
    const after = await Promise.all([laneOf(first), laneOf(second)]);
    check("the bounded probe passes all 100 ordinary row presses", repeated.passed, 100);
    check("the bounded probe moves no lane head", after.map(lane => lane.at), before.map(lane => lane.at));
    check("the bounded probe changes no item", after.map(lane => lane.items), before.map(lane => lane.items));
    check("the bounded probe signs nothing", acts.slice(actsAtStart), []);
    check("the bounded probe has no browser errors", repeated.console, []);
    report = { qualification: "A real local Worker and native room, with the command line and apps/views server. Twenty fresh tabs share the joined browser context. No provider or hosted Worker participates. Passing the fixed count does not explain the earlier stop or establish absence of an intermittent fault.", lanes: [first, second], probe: repeated, acts: acts.slice(actsAtStart) };
  } else {
  // Reading each item leaves it open.
  const openRow = async (scope, item) => { await page.locator(`[data-needs-row="${item}"][data-needs-lane="${scope}"] a`).click({ timeout: 15_000 }); await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 }); };
  const listAgain = async () => { await page.locator("a.back").click({ timeout: 30_000 }); await listShown(); await page.getByRole("link", { name: /The import fails on large files/ }).waitFor({ timeout: 60_000 }); };
  if (await page.locator(`[data-needs-row="${exportAsk.request}"]`).count()) {
    await openRow(second, exportAsk.request);
    check("an item opens on its issue's screen, with its words", (await text()).includes(whole.rows.find(row => row.item === exportAsk.request).needs));
    await page.screenshot({ path: join(shots, "3-item-opened.png"), fullPage: true });
  } else {
    // The old Page has no list. A person opens the issue from the list of issues.
    check("an item opens from the list", false);
    await page.getByRole("link", { name: /The export drops rows/ }).click({ timeout: 30_000 });
    await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 });
  }
  const decidedOnIssue = async label => {
    const node = page.locator(`[data-decided="${away.ask}"]`);
    check(`${label}: the issue's screen keeps the decided question`, await node.count(), 1);
    const words = await node.innerText().catch(() => "");
    for (const part of [`Decided question: ${AWAY} (entry ${awayDecision})`, AWAY_BODY, "Decided by @rita on ", `Comment: ${AWAY_COMMENT}`]) check(`${label}: the issue's screen says: ${part}`, words.includes(part));
  };
  await decidedOnIssue("before a reload");
  await page.reload();
  await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 });
  await decidedOnIssue("after a reload");
  await page.screenshot({ path: join(shots, "4-decided-on-issue.png"), fullPage: true });
  await delay(1000);
  const after = await Promise.all([laneOf(first), laneOf(second)]);
  check("reading moved no lane's head", after.map(lane => lane.at), before.map(lane => lane.at));
  check("reading changed no item", after.map(lane => lane.items), before.map(lane => lane.items));
  check("reading signed nothing", acts.slice(actsAtStart), []);
  await page.locator("a.back").click({ timeout: 30_000 });
  await page.getByRole("link", { name: /The import fails on large files/ }).waitFor({ timeout: 60_000 });
  if (!await listShown()) throw new Error("no list on the first screen, so the scene stops here");
  await compare("after reading", whole.rows);

  // Ana answers one item: it leaves the list, and the decided question does not vanish.
  await openRow(first, importAsk.request);
  const pressed = async label => {
    const count = acts.length;
    await page.locator(`[data-question-answers="${importAsk.ask}"] [data-question-answer="${label}"] button`).click({ timeout: 30_000 });
    for (let attempt = 0; attempt < 120 && acts.length === count; attempt++) await delay(250);
    return acts.slice(count).map(one => one.status);
  };
  check("Approve sends one act, accepted", await pressed("Approve"), [200]);
  await page.locator(`[data-question-answers="${importAsk.ask}"] [data-question-answer="Decide"]`).waitFor({ timeout: 60_000 });
  await listAgain();
  const due = await needsYou();
  check("after Approve, needs_you says the question is due", due.rows.find(row => row.scope.scope === first)?.category, "decision-due");
  await compare("after Approve", due.rows);
  await openRow(first, importAsk.ask);
  check("Decide sends one act, accepted", await pressed("Decide"), [200]);
  await page.locator(`[data-decided="${importAsk.ask}"]`).waitFor({ timeout: 60_000 });
  await page.reload();
  await page.waitForSelector('[data-action-slot="comment"] form', { timeout: 60_000 });
  check("Ana's decision is on the issue's screen after a reload", await page.locator(`[data-decided="${importAsk.ask}"]`).count(), 1);
  await listAgain();
  const settled = await needsYou();
  check("needs_you now has the one item left", settled.rows.map(row => row.item), [exportAsk.request]);
  await compare("after Decide", settled.rows);
  check("the list holds both decided questions, newest first", await page.locator("[data-decided-row]").evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("data-decided-row")))), [importAsk.ask, away.ask]);
  await page.reload();
  await listShown();
  await page.locator("[data-decided-row]").first().waitFor({ timeout: 30_000 });
  check("after a reload, the list still holds both decided questions", await page.locator("[data-decided-row]").count(), 2);
  await page.screenshot({ path: join(shots, "5-after-deciding.png"), fullPage: true });

  // A room with more lanes than one read takes: the list says how many it left out, and a press reaches them.
  const others = [];
  for (const number of [1, 2, 3, 4, 5]) others.push(await openIssue(`TEST Another issue ${number}`));
  let firstWindow = await needsYou();
  for (let attempt = 0; attempt < 40 && firstWindow.omittedScopes.length !== 1; attempt++) { await delay(250); firstWindow = await needsYou(); }
  check("needs_you leaves out one lane of seven", firstWindow.omittedScopes.length, 1);
  await page.reload();
  await listShown();
  await page.locator("[data-needs-left]").waitFor({ timeout: 30_000 });
  await compare("the first window", firstWindow.rows);
  check("the first window says how many lanes it left out", await page.locator("[data-needs-left]").innerText(), "This list leaves out 1 lane. Read the lanes that follow");
  await page.screenshot({ path: join(shots, "6-first-window.png"), fullPage: true });
  await page.locator("[data-needs-next]").click({ timeout: 15_000 });
  await page.locator('[data-needs-left="6"]').waitFor({ timeout: 60_000 });
  const lastWindow = await needsYou(firstWindow.next);
  await compare("the last window", lastWindow.rows);
  check("the last window says how many lanes it left out, and that no lane follows", await page.locator("[data-needs-left]").innerText(), "This list leaves out 6 lanes. No lane follows this one. Read the first lanes");
  check("the two windows reach the one item left", [...firstWindow.rows, ...lastWindow.rows].map(row => row.item), [exportAsk.request]);
  await page.screenshot({ path: join(shots, "7-last-window.png"), fullPage: true });
  await page.locator("[data-needs-first]").click({ timeout: 15_000 });
  await page.locator('[data-needs-left="1"]').waitFor({ timeout: 60_000 });
  check("a press returns to the first lanes", true);
  check("no page error", errors, []);
  report = { lanes: [first, second, ...others], asks: { import: importAsk.ask, export: exportAsk.ask, away: away.ask }, decision: awayDecision, acts: acts.slice(actsAtStart) };
  }
} catch (error) {
  if (probe) { report = { ...report, probe: probe.report() }; await probe.capture("final-stop").catch(() => {}); }
  failures.push({ name: "stopped", actual: String(error).replace(/artroom-[a-z-]+:\S+/g, "<link>").slice(0, 800), expected: null });
} finally {
  await browser?.close().catch(() => {});
  await views?.close().catch(() => {});
  await stopWorker();
}
console.log(JSON.stringify({ ...report, steps, failures }, null, 1));
process.exit(failures.length ? 1 : 0);

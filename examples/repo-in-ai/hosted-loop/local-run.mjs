#!/usr/bin/env node
// The hosted loop's real commands against a local Worker, before any live run. It serves apps/room/celld from a pinned wrangler
// outside this checkout, and every phase is its own process, with real homes and real signatures.
//
//   WRANGLER=<wrangler's bin file> WITNESS_DIR=<new private directory> node examples/repo-in-ai/hosted-loop/local-run.mjs
//
// STAND-INS: wrangler's local workerd stands in for the deployment. The Worker's Durable Objects and a person's and an agent's
// requests are real. The room has no Git host (`--host none`), so `standInBase` stands in for a published head, and no file reaches
// a Git provider. A local register has no public creation offer, so the person's key plans the register and `owner` adopts that key,
// where a live run makes a fresh key. The script is the agent: no model reads the work-on prompt. The gate does not run this file.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const { WRANGLER, WITNESS_DIR } = process.env;
if (!WRANGLER || !WITNESS_DIR) throw new Error("Set WRANGLER and WITNESS_DIR.");
if (existsSync(join(WITNESS_DIR, "private"))) throw new Error("WITNESS_DIR must be new.");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const port = Number(process.env.WITNESS_PORT ?? 8791), base = `http://127.0.0.1:${port}`;
const privateDir = join(WITNESS_DIR, "private"), logs = join(WITNESS_DIR, "public"), persist = join(privateDir, "state");
for (const dir of [privateDir, persist, join(logs, "diagnostics"), join(logs, "commands")]) mkdirSync(dir, { recursive: true, mode: 0o700 });

const cliRequire = createRequire(join(root, "packages/cli/bin/dap.js"));
const { tsImport } = await import(pathToFileURL(cliRequire.resolve("tsx/esm/api")).href);
const load = path => tsImport(pathToFileURL(join(root, path)).href, import.meta.url);
const [{ command }, { fileStore }, { scanPublic }, { TEXT }] = await Promise.all([
  load("packages/cli/src/line.ts"), load("packages/cli/src/files.ts"), load("examples/repo-in-ai/hosted-loop/public.ts"), load("examples/repo-in-ai/hosted-loop/words.ts"),
]);

// ------------------------------------------------------------ the Worker. Kill by PID only: other sessions run tests on this machine.
let worker = null;
async function startWorker(register, secret, open) {
  worker = spawn(process.execPath, [WRANGLER, "dev", "--config", "apps/room/celld/wrangler.json", "--port", String(port), "--ip", "127.0.0.1", "--persist-to", persist,
    "--var", `REGISTER_SCOPE:${register}`, "--var", `SESSION_SECRET:${secret}`, "--var", `PUBLIC_ORIGIN:${base}`, ...(open ? ["--var", "MCP_ENABLED:true"] : []), "--log-level", "error"],
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
  await gone;
}
/** The health probe caches readiness for five seconds, so a new register or a new Worker shows after a short wait. */
async function healthy() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { const health = await (await fetch(`${base}/health`)).json(); if (health.register === "ready" && health.sessions === "ok") return health; } catch { /* Not ready. */ }
    await delay(1000);
  }
  throw new Error("the local Worker never reported ready");
}

// ------------------------------------------------------------ one command, as the runbook writes it
const rows = [];
let sequence = 0;
const started = Date.now();
function launch(phase, mode = "new", inputFile = input) {
  const id = `${String(++sequence).padStart(3, "0")}-${phase}-${mode}`;
  const diagnostics = join(logs, "diagnostics", id);
  const child = spawn(process.execPath, ["examples/repo-in-ai/hosted-loop/loop.mjs", "--input", inputFile, "--phase", phase, "--mode", mode, "--diagnostics", diagnostics], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", part => { stdout += part; });
  child.stderr.on("data", part => { stderr += part; });
  const from = Date.now();
  const finished = new Promise(done => child.once("exit", (code, signal) => {
    writeFileSync(join(logs, "commands", `${id}.stdout`), stdout);
    writeFileSync(join(logs, "commands", `${id}.stderr`), stderr);
    const row = { id, phase, mode, exit: code, signal, ms: Date.now() - from, line: stdout === "" ? null : JSON.parse(stdout), stop: /: ([a-z-]+)\. Use check/.exec(stderr)?.[1] ?? null };
    rows.push(row);
    done(row);
  }));
  return { child, finished };
}
const phase = async (name, mode = "new", inputFile) => {
  const row = await launch(name, mode, inputFile).finished;
  if (row.exit !== 0) throw new Error(`${name} ${mode}: exit ${row.exit}, ${row.stop}`);
  return row;
};
const refused = async (name, word, inputFile, mode = "new") => {
  const row = await launch(name, mode, inputFile).finished;
  if (row.exit !== 1 || row.stop !== word) throw new Error(`${name} ${mode}: expected ${word}, exit ${row.exit}, ${row.stop}`);
  return row;
};

const input = join(privateDir, "input.json");
try {
  // The register, through the production CLI, in the person's home. A retained plan is how a key reads its own new register.
  const operatorHome = join(privateDir, "loop", "person");
  mkdirSync(operatorHome, { recursive: true, mode: 0o700 });
  const operator = { store: fileStore(operatorHome), now: Date.now, fetch: globalThis.fetch.bind(globalThis) };
  operator.trustedCreationService = { service: base, fetch: operator.fetch };
  const run = async (...argv) => { const outcome = await command(operator, argv); if (outcome.code !== 0) throw new Error(`dap ${argv[0]} ${argv[1] ?? ""}: exit ${outcome.code}`); };
  await run("install", "--plan", base, "--host", "none", "--register-policy", "open");
  const register = (await operator.store.config()).plan.register, secret = randomBytes(32).toString("base64url");

  // A Worker with no MCP_ENABLED: the state the deployed Workers' last record names. Preflight stops before any home exists.
  await startWorker(register, secret, false);
  await run("install", "--planned");
  const health = await healthy();
  const plan = {
    v: 1, service: base, deployment: health.deployment, deploymentVersion: health.version, register: (await operator.store.config()).register,
    name: "hosted-loop-local", home: join(privateDir, "loop"), handles: { person: "@owner", agent: "@agent" }, standInBase: "1".repeat(40),
  };
  writeFileSync(input, JSON.stringify(plan), { mode: 0o600 });
  const otherVersion = join(privateDir, "other-version.json");
  writeFileSync(otherVersion, JSON.stringify({ ...plan, deploymentVersion: "00000000-0000-4000-8000-000000000000" }), { mode: 0o600 });
  await refused("preflight", "endpoint-closed");
  await refused("owner", "endpoint-closed");
  if (existsSync(join(plan.home, "agent")) || (await operator.store.config()).handle !== undefined) throw new Error("A refused phase changed a home.");
  await stopWorker();
  await startWorker(register, secret, true);
  await healthy();

  // The target checks, before anything acts.
  await refused("preflight", "target-version", otherVersion);
  await refused("owner", "target-version", otherVersion);
  await refused("agent-accept", "no-bearer");
  await phase("preflight");

  // The room and its definitions, then the agent's bearer.
  for (const name of ["owner", "create", "roles", "rules", "activate-issue", "activate-change", "invite-agent", "create-agent", "open-issue", "offer"]) await phase(name);

  // The agent up to its block. A check of a phase with no original signs nothing and stops.
  await refused("agent-accept", "no-original", input, "check");
  for (const name of ["agent-tools", "agent-accept", "agent-ask", "agent-request", "agent-block", "agent-wait-open"]) await phase(name);

  // A session dies in its wait, and a new session waits on the same question. The person's two acts then end that wait.
  const lost = launch("agent-wait");
  await delay(3_000);
  process.kill(lost.child.pid, "SIGKILL");
  await lost.finished;
  const waiting = launch("agent-wait");
  await delay(3_000);
  if (waiting.child.exitCode !== null) throw new Error("agent-wait ended before the decision");
  await phase("approve");
  await phase("decide");
  const waited = await waiting.finished;
  if (waited.exit !== 0 || waited.line.values.state !== "decided") throw new Error("agent-wait did not see the decision");

  // New terms, then a fresh session that rebuilds the whole position and signs nothing, then the rest of the loop.
  await phase("revise");
  await phase("offer-new");
  for (const name of ["agent-resume", "agent-accept-new", "agent-release", "agent-open-change", "agent-link", "agent-propose"]) await phase(name);
  const first = await phase("agent-verify");

  // Check on every signed agent phase: the same fact from the record, and no new entry.
  const actedRows = rows.filter(row => row.exit === 0 && row.line?.status === "accepted" && row.line.actor === "agent" && row.mode === "new");
  for (const row of actedRows) {
    const again = await phase(row.phase, "check");
    if (JSON.stringify(again.line.facts) !== JSON.stringify(row.line.facts) || again.line.values.reused !== true) throw new Error(`${row.phase} check: another fact`);
  }
  const second = await phase("agent-verify");
  if (second.line.values.entries !== first.line.values.entries) throw new Error("A check added an entry.");
  if (second.line.values.standIn !== true) throw new Error("A stand-in base must say so.");

  // Every byte this run printed or kept in its public directory, against the private bytes this process can read.
  const bearer = readFileSync(join(plan.home, "agent", "bearer"), "utf8");
  const person = fileStore(join(plan.home, "person")), config = await person.config();
  const link = new TextDecoder().decode(await person.private("hosted-loop-link"));
  const exact = [bearer, bearer.slice(bearer.indexOf(".") + 1), link, Buffer.from(await person.secret(config.key)).toString("base64url"), secret, TEXT.body, TEXT.question, TEXT.comment, TEXT.content, TEXT.goal, TEXT.issueTitle, TEXT.changeTitle, ...TEXT.conditions, ...TEXT.newConditions];
  writeFileSync(join(logs, "transcript.jsonl"), rows.filter(row => row.line).map(row => JSON.stringify(row.line)).join("\n") + "\n");
  const files = [], walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else files.push(path); } };
  walk(logs);
  const problems = files.flatMap(path => scanPublic(readFileSync(path, "utf8"), exact).map(problem => ({ file: path.slice(logs.length + 1), problem })));

  const summary = {
    head: spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
    driver: "A script drove every session. No model chose a step or read the prompt, and no claim about a model can rest on this run.",
    label: "Observed run: each phase's own process against a local wrangler dev Worker on loopback, one room, with a real clock. Times are this driver's wall clock around each process.",
    worker: { deployment: health.deployment, version: health.version, wrangler: readFileSync(join(WRANGLER, "../../package.json"), "utf8").match(/"version": "([^"]+)"/)[1] },
    standIns: ["wrangler dev's local workerd for the deployment", "standInBase for a published head"],
    phases: rows.map(({ id, phase: name, mode, exit, signal, ms, stop }) => ({ id, phase: name, mode, exit, signal, ms, stop })),
    totalMs: Date.now() - started,
    setupMs: rows.filter(row => ["owner", "create", "roles", "rules", "activate-issue", "activate-change", "invite-agent", "create-agent"].includes(row.phase) && row.mode === "new" && row.exit === 0).reduce((sum, row) => sum + row.ms, 0),
    verify: second.line.values,
    scannedFiles: files.length, problems,
  };
  // The summary is the last file, so the run reads its bytes here.
  problems.push(...scanPublic(JSON.stringify(summary), exact).map(problem => ({ file: "summary.json", problem })));
  writeFileSync(join(logs, "summary.json"), JSON.stringify(summary, null, 1));
  process.stdout.write(`phases ${rows.length}, scanned ${files.length} files, problems ${problems.length}, total ${summary.totalMs} ms, setup ${summary.setupMs} ms\n`);
  process.exitCode = problems.length === 0 ? 0 : 1;
} catch (error) {
  writeFileSync(join(logs, "stopped.txt"), `${error.message}\n`);
  process.stdout.write(`stopped: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await stopWorker();
}

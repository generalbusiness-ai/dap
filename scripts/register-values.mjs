/** Change one hosted Worker's file-owned register settings. No deployment. */
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkout, readConfig, parseConfig, smokePolicy } from "./deploy-config.mjs";

const require = createRequire(new URL("../packages/cli/bin/dap.js", import.meta.url));
let validators;
async function production() {
  return validators ??= (async () => {
    const { tsImport } = await import(pathToFileURL(require.resolve("tsx/esm/api")).href);
    const load = path => tsImport(new URL(path, import.meta.url).href, import.meta.url);
    const [bytes, registers, artifacts, demo] = await Promise.all([
      load("../packages/bytes/src/index.ts"), load("../packages/scope/src/register-setting.ts"),
      load("../packages/scope/src/artifacts-wiring.ts"), load("../packages/scope/src/demo-creation.ts"),
    ]);
    return { ...bytes, ...registers, ...artifacts, ...demo };
  })();
}

function argumentsOf(argv) {
  const [name, ...args] = argv, values = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!["--register", "--genesis", "--only", "--start-origin", "--deployment", "--definition"].includes(flag)
      || Object.hasOwn(values, flag)) throw Error("Unknown or repeated argument.");
    if (flag === "--only") values[flag] = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw Error("Missing argument value.");
      values[flag] = args[++i];
    }
  }
  if (!["demo", "grow", "lending"].includes(name)) throw Error("Choose demo, grow or lending.");
  if (!values["--register"] || !values["--genesis"]) throw Error("Supply --register and --genesis.");
  const bootstrap = ["--start-origin", "--definition"].filter(key => Object.hasOwn(values, key));
  if (bootstrap.length !== 0 && (bootstrap.length !== 2 || !values["--deployment"] || name !== "demo")) throw Error("Demo Start needs all three explicit metadata arguments.");
  return { name, register: values["--register"], genesis: values["--genesis"], only: values["--only"] === true,
    deployment: values["--deployment"],
    ...(bootstrap.length ? { start: { origin: values["--start-origin"], deployment: values["--deployment"], definition: values["--definition"] } } : {}) };
}

/** Locate JSONC value spans, rejecting duplicate keys rather than editing an
 * ambiguous file. The existing parseConfig owns value and JSONC validation. */
function spans(source) {
  let at = 0;
  function space() {
    for (;;) {
      while (/\s/.test(source[at] ?? "") && at < source.length) at++;
      if (source.slice(at, at + 2) === "//") { while (at < source.length && source[at] !== "\n") at++; }
      else if (source.slice(at, at + 2) === "/*") {
        const end = source.indexOf("*/", at + 2); if (end < 0) throw Error("Unclosed comment."); at = end + 2;
      } else return;
    }
  }
  function string() {
    const start = at++;
    while (at < source.length) {
      if (source[at] === "\\") at += 2;
      else if (source[at++] === '"') return JSON.parse(source.slice(start, at));
    }
    throw Error("Unclosed string.");
  }
  function value() {
    space(); const start = at, entries = new Map();
    if (source[at] === "{") {
      at++; space();
      while (source[at] !== "}") {
        if (source[at] !== '"') throw Error("Invalid object key.");
        const key = string(); space();
        if (source[at++] !== ":" || entries.has(key)) throw Error("Duplicate or invalid configuration key.");
        entries.set(key, value()); space();
        if (source[at] !== ",") break;
        at++; space();
      }
      if (source[at++] !== "}") throw Error("Invalid object.");
    } else if (source[at] === "[") {
      at++; space();
      while (source[at] !== "]") { value(); space(); if (source[at] !== ",") break; at++; space(); }
      if (source[at++] !== "]") throw Error("Invalid array.");
    } else if (source[at] === '"') string();
    else { while (at < source.length && !/[\s,}\]\/]/.test(source[at])) at++; if (start === at) throw Error("Invalid value."); }
    return { start, end: at, entries };
  }
  const root = value(); space(); if (at !== source.length) throw Error("Trailing configuration bytes.");
  return root;
}

function replaceVars(source, updates) {
  const vars = spans(source).entries.get("vars");
  if (!vars || source[vars.start] !== "{") throw Error("Missing configuration vars.");
  const edits = [], additions = [];
  for (const [key, value] of Object.entries(updates)) {
    const span = vars.entries.get(key), text = JSON.stringify(value);
    if (span) edits.push({ start: span.start, end: span.end, text });
    else additions.push(`    ${JSON.stringify(key)}: ${text}`);
  }
  if (additions.length) edits.push({ start: vars.start + 1, end: vars.start + 1,
    text: "\n" + additions.join(",\n") + (vars.entries.size ? "," : "\n  ") });
  return edits.sort((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}

/** Validate the complete candidate before the caller can write any bytes. */
export async function registerValuesSource(source, options) {
  if (Buffer.byteLength(source) > 128 * 1024) throw Error("Configuration is too large.");
  const config = parseConfig(source), native = await production(), vars = config.vars;
  if (config.name !== `dap-${options.name}` || !["demo", "grow", "lending"].includes(options.name)) throw Error("Worker name differs.");
  if (!native.isScopeId(options.register) || !native.isDigest(options.genesis)) throw Error("Invalid register reference.");
  const installed = native.readInstalledRegisters(vars), artifacts = native.artifactsConfiguration(vars.ARTIFACTS_CONFIG);
  if (installed.kind !== "pinned" || !artifacts) throw Error("Existing register settings do not agree.");
  const bindings = config.artifacts?.filter(binding => binding.binding === "ARTIFACTS") ?? [];
  const namespace = vars.ARTIFACTS_NAMESPACE ?? native.ARTIFACTS_NAMESPACE;
  if (bindings.length !== 1 || bindings[0].namespace !== namespace || artifacts.namespace !== namespace) throw Error("Artifacts namespace differs from its binding.");
  const scopes = options.only ? [options.register] : [...new Set([...installed.scopes, options.register])];
  const updates = { REGISTER_SCOPE: options.register, ARTIFACTS_CONFIG: JSON.stringify({ ...artifacts, registerScope: options.register }),
    INSTALLED_REGISTER_SCOPES: JSON.stringify(scopes) };
  if (options.deployment !== undefined && vars.DEPLOYMENT !== undefined && vars.DEPLOYMENT !== options.deployment) throw Error("Start deployment differs.");
  if (vars.DEMO_START_CONFIG !== undefined && options.deployment === undefined) throw Error("Supply --deployment to validate the existing Start setting.");
  if (options.deployment !== undefined && !options.start && vars.DEMO_START_CONFIG === undefined) throw Error("Deployment needs an existing Start setting or complete bootstrap metadata.");
  const existingStart = vars.DEMO_START_CONFIG === undefined ? null : native.demoCreationConfig(vars.DEMO_START_CONFIG, options.deployment, vars);
  if (vars.DEMO_START_CONFIG !== undefined && !existingStart) throw Error("Existing Start metadata does not agree.");
  if (options.start) {
    let origin;
    try { origin = new URL(options.start.origin); } catch { throw Error("Invalid Start origin."); }
    if (origin.protocol !== "https:" || origin.origin !== options.start.origin || origin.username || origin.password
      || vars.PUBLIC_ORIGIN !== undefined && vars.PUBLIC_ORIGIN !== options.start.origin) throw Error("Start origin differs.");
    if (options.name !== "demo") throw Error("Start bootstrap requires demo.");
    updates.DEMO_START_CONFIG = JSON.stringify({ v: 3, ...options.start, register: { scope: options.register, genesis: options.genesis } });
  } else if (existingStart) {
    updates.DEMO_START_CONFIG = JSON.stringify({ ...JSON.parse(vars.DEMO_START_CONFIG), register: { scope: options.register, genesis: options.genesis } });
  }
  const candidate = replaceVars(source, updates), next = parseConfig(candidate), roots = native.readInstalledRegisters(next.vars);
  if (roots.kind !== "pinned" || roots.scope !== options.register) throw Error("Candidate register settings do not agree or exceed 32 roots.");
  if (next.vars.DEMO_START_CONFIG !== undefined) {
    const start = native.demoCreationConfig(next.vars.DEMO_START_CONFIG, options.deployment, next.vars);
    if (!start || start.current.register.genesis !== options.genesis || start.current.register.scope !== options.register) throw Error("Candidate Start metadata does not agree.");
  }
  smokePolicy(next);
  return candidate;
}

export async function registerValuesMain(argv, { root = checkout, write = text => process.stdout.write(text) } = {}) {
  try {
    const options = argumentsOf(argv), { path, bytes } = await readConfig(root, options.name);
    const source = bytes.toString("utf8"), candidate = await registerValuesSource(source, options);
    // Prepare the diff before writing, so invalid Git state cannot leave a
    // changed tracked file behind. Temporary files hold public config only.
    const previousDiff = execFileSync("git", ["diff", "--", path], { cwd: root, encoding: "utf8" });
    if (previousDiff) throw Error("The target configuration has uncommitted changes.");
    const baseline = execFileSync("git", ["show", `HEAD:${path}`], { cwd: root, encoding: "utf8" });
    if (baseline !== source) throw Error("The tracked configuration differs from HEAD.");
    const scratch = await mkdtemp(join(tmpdir(), "dap-register-diff-"));
    let diff;
    try {
      const before = join(scratch, "before"), after = join(scratch, "after");
      await writeFile(before, source); await writeFile(after, candidate);
      const result = spawnSync("git", ["diff", "--no-index", "--no-ext-diff", "--no-color", "--", before, after], { encoding: "utf8" });
      if (result.error || ![0, 1].includes(result.status)) throw Error("Could not prepare the configuration diff.");
      diff = result.stdout.replaceAll(`a${before}`, `a/${path}`).replaceAll(`b${after}`, `b/${path}`);
    } finally { await rm(scratch, { recursive: true }); }
    if (!bytes.equals(await readFile(resolve(root, path)))) throw Error("The tracked configuration changed during preparation.");
    write(diff);
    if (candidate !== source) {
      const pendingDirectory = await mkdtemp(resolve(root, path) + ".register-values-");
      try {
        const pending = join(pendingDirectory, "candidate");
        await writeFile(pending, candidate, { flag: "wx", mode: 0o600 });
        // The final rename changes exactly the selected tracked path.
        await rename(pending, resolve(root, path));
      } finally { await rm(pendingDirectory, { recursive: true }); }
    }
    return 0;
  } catch (error) {
    write(`Register settings refused: ${error instanceof Error ? error.message : "invalid input"}\n`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await registerValuesMain(process.argv.slice(2));

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, readFile, writeFile, mkdir, mkdtemp, realpath, readdir, rename, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkout, configPath, hasMigrations, hostedNames, readConfig, parseConfig, migrationTags, commitPattern, digestPattern, uuidPattern, WRANGLER } from "./deploy-config.mjs";
import { deploymentVersion } from "./deploy-check.mjs";

const execute = promisify(execFile);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const inside = (root, path) => path === root || path.startsWith(root + sep);

async function runProcess(command, args, options) {
  try {
    const result = await execute(command, args, { ...options, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { code: Number.isInteger(error.code) ? error.code : 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "", failed: true };
  }
}

function argumentsOf(argv) {
  const result = { names: [], deployed: new Map(), previous: new Map(), accepted: new Set(), dryRun: false, receiptDir: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      if (result.dryRun) throw new Error("Repeated dry-run flag.");
      result.dryRun = true;
    } else if (["--deployed", "--previous-receipt", "--accept-migration"].includes(arg)) {
      const value = argv[++i], split = value?.indexOf("=") ?? -1;
      if (split < 1 || split === value.length - 1) throw new Error("Expected name=value.");
      const name = value.slice(0, split), setting = value.slice(split + 1); configPath(name);
      if (arg === "--accept-migration") {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(setting) || result.accepted.has(value)) throw new Error("Invalid migration acceptance.");
        result.accepted.add(value);
      } else {
        const map = arg === "--deployed" ? result.deployed : result.previous;
        if (map.has(name)) throw new Error("Repeated deployment baseline.");
        map.set(name, setting);
      }
    } else if (arg === "--receipt-dir") {
      if (result.receiptDir || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("Expected one receipt directory.");
      result.receiptDir = resolve(argv[++i]);
    } else {
      configPath(arg);
      if (result.names.includes(arg)) throw new Error("Repeated hosted configuration.");
      result.names.push(arg);
    }
  }
  if (!result.names.length || !result.dryRun && !result.receiptDir) throw new Error("Name configurations and an external receipt directory.");
  for (const name of result.names) {
    if (result.deployed.has(name) === result.previous.has(name)) throw new Error("Supply exactly one known deployed commit or previous receipt per configuration.");
    if (result.deployed.has(name) && !commitPattern.test(result.deployed.get(name))) throw new Error("Supply a full deployed commit.");
  }
  if ([...result.deployed.keys(), ...result.previous.keys()].some(name => !result.names.includes(name))
      || [...result.accepted].some(value => !result.names.includes(value.split("=")[0]))) throw new Error("An option names an unselected configuration.");
  return result;
}

async function boundedFile(path, limit) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Invalid retained file.");
  if (info.size > limit) throw new Error("Retained file exceeds its bound.");
  const bytes = await readFile(path);
  if (bytes.length > limit) throw new Error("Retained file exceeds its bound.");
  return bytes;
}

async function externalPath(path, roots) {
  let parent = resolve(path), missing = [];
  for (;;) {
    try { parent = await realpath(parent); break; }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      missing.unshift(basename(parent)); const next = dirname(parent);
      if (next === parent) throw error;
      parent = next;
    }
  }
  const actual = resolve(parent, ...missing);
  if (roots.some(root => inside(root, actual))) throw new Error("Keep scratch output and receipts outside the checkout.");
  return actual;
}

/** Hash exact dry-run output bytes, not live bindings or an uploaded payload. */
export async function bundleManifest(directory, main) {
  const rootInfo = await lstat(directory);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Invalid bundle directory.");
  const files = []; let total = 0, bytesTotal = 0;
  async function walk(path, prefix = "") {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const name = prefix + entry.name, full = join(path, entry.name);
      const info = await lstat(full);
      if (info.isSymbolicLink()) throw new Error("Bundle contains a symlink.");
      if (info.isDirectory()) { await walk(full, name + "/"); continue; }
      if (!info.isFile()) throw new Error("Bundle contains a special file.");
      if (name === "README.md" || name.endsWith(".map")) continue;
      bytesTotal += info.size;
      if (++total > 1024 || info.size > 32 * 1024 * 1024 || bytesTotal > 128 * 1024 * 1024) throw new Error("Bundle exceeds its bound.");
      const bytes = await boundedFile(full, 32 * 1024 * 1024);
      files.push({ name, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
  await walk(directory);
  const entry = basename(main).replace(/\.[cm]?tsx?$/, ".js");
  if (!files.some(file => file.name === entry && file.bytes > 0)) throw new Error("Dry run produced no main module.");
  files.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  return { kind: "dry-run-output", qualification: "Sorted emitted file names and exact bytes; excludes root README.md and .map files. Does not prove uploaded bytes or kept live variables.",
    sha256: sha256(JSON.stringify(files)), files };
}

export function checkMigrations(previous, current, name, accepted) {
  if (!hasMigrations(name)) {
    if ([previous, current].some(config => Object.hasOwn(config, "migrations") || Object.hasOwn(config, "durable_objects"))) throw new Error("A Worker without Durable Objects declares migrations.");
    return [];
  }
  const before = migrationTags(previous), after = migrationTags(current);
  if (before.length > after.length || before.some((tag, i) => tag !== after[i]
      || JSON.stringify(previous.migrations[i]) !== JSON.stringify(current.migrations[i]))) throw new Error("Historical migrations changed.");
  const added = after.slice(before.length);
  if (added.some(tag => !accepted.has(`${name}=${tag}`))) throw new Error("New migration tag needs --accept-migration.");
  return added;
}

async function atomicRecord(directory, record) {
  const name = `${record.config}-${record.status}-${randomUUID()}.json`, path = join(directory, name), pending = path + ".pending";
  await writeFile(pending, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  await rename(pending, path); return path;
}

function reportedDeployments(bytes) {
  const rows = [];
  for (const line of bytes.toString("utf8").split(/\r?\n/)) {
    try { const row = JSON.parse(line); if (row.type === "deploy" && typeof row.worker_name === "string" && /^[a-z0-9-]{1,128}$/.test(row.worker_name)
      && uuidPattern.test(row.version_id)) rows.push({ worker: row.worker_name, version: row.version_id }); } catch { /* Retain a reported version despite another malformed row. */ }
  }
  return rows;
}

async function recoverDeploymentOutput(path, pending) {
  const limit = 256 * 1024;
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Invalid retained file.");
    const buffer = Buffer.alloc(Math.min(info.size, limit));
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const bytes = buffer.subarray(0, length), after = await file.stat();
    const truncated = Math.max(info.size, after.size) > length;
    // A partial final line cannot establish a reported deployment.
    const complete = truncated ? bytes.subarray(0, bytes.lastIndexOf(10) + 1) : bytes;
    pending.reportedDeployments = reportedDeployments(complete);
    pending.version = pending.reportedDeployments.length === 1 ? pending.reportedDeployments[0].version : null;
    pending.outputRecovery = { kind: "bounded-prefix", bytes: length, fileBytes: after.size, truncated,
      completeRecordBytes: complete.length, sha256: sha256(bytes) };
    if (!truncated) pending.outputSha256 = sha256(bytes);
  } finally { await file.close(); }
}

export async function deployMain(argv, { root = checkout, run = runProcess, env = process.env, now = () => new Date(), write = line => process.stdout.write(line), persist = atomicRecord } = {}) {
  if (argv.length === 1 && argv[0] === "--help") {
    write(`Usage: node scripts/deploy.mjs <${hostedNames.join("|")}>... --deployed <name=full-commit> | --previous-receipt <name=path> [--accept-migration <name=tag>] [--dry-run] --receipt-dir <external-directory>\n`); return 0;
  }
  let options, head, scratch, receiptDir, roots, pending = null;
  const emit = value => write(JSON.stringify(value) + "\n");
  async function git(args) {
    const result = await run("git", args, { cwd: root, env });
    if (result.code !== 0) throw new Error("Git read failed.");
    return result.stdout.trim();
  }
  async function unchanged() {
    if (await git(["status", "--porcelain", "--untracked-files=all"])) throw new Error("Dirty checkout.");
    if (head && await git(["rev-parse", "HEAD"]) !== head) throw new Error("Checkout HEAD changed.");
  }
  async function wrangler(args, name, phase) {
    const output = join(scratch, `${name}-${phase}.ndjson`);
    const commandEnv = { ...env, WRANGLER_SEND_METRICS: "false", WRANGLER_SEND_ERROR_REPORTS: "false",
      WRANGLER_OUTPUT_FILE_PATH: output, WRANGLER_LOG_PATH: join(scratch, `${name}-${phase}.log`) };
    // Ambient CI variables can otherwise replace the tracked Worker name.
    delete commandEnv.WRANGLER_CI_OVERRIDE_NAME;
    const result = await run("npx", ["-y", `wrangler@${WRANGLER}`, "deploy", "--keep-vars", ...args], { cwd: scratch, env: commandEnv });
    await writeFile(join(scratch, `${name}-${phase}.stdout`), result.stdout ?? "", { flag: "wx", mode: 0o600 });
    await writeFile(join(scratch, `${name}-${phase}.stderr`), result.stderr ?? "", { flag: "wx", mode: 0o600 });
    return { ...result, output };
  }
  try {
    options = argumentsOf(argv); root = await realpath(root);
    await unchanged(); head = await git(["rev-parse", "HEAD"]);
    if (!commitPattern.test(head)) throw new Error("Invalid HEAD.");
    emit({ head });
    const common = resolve(root, await git(["rev-parse", "--git-common-dir"]));
    roots = [root, await realpath(dirname(common))];
    if (options.receiptDir) receiptDir = await externalPath(options.receiptDir, roots);
    const plans = [], used = new Set();
    for (const name of options.names) {
      const input = await readConfig(root, name); let prior = options.deployed.get(name), receipt;
      if (options.previous.has(name)) {
        const path = await externalPath(resolve(options.previous.get(name)), roots);
        receipt = JSON.parse((await boundedFile(path, 256 * 1024)).toString("utf8"));
        if (receipt.format !== "dap-deployment-receipt-1" || receipt.status !== "deployed" || receipt.config !== name
            || receipt.configPath !== input.path || receipt.worker !== input.config.name || !commitPattern.test(receipt.commit)
            || !uuidPattern.test(receipt.version) || !digestPattern.test(receipt.configSha256)
            || !digestPattern.test(receipt.bundle?.sha256)) throw new Error("Invalid previous deployment receipt.");
        prior = receipt.commit;
      }
      if (await git(["rev-parse", "--verify", prior + "^{commit}"]) !== prior) throw new Error("Unknown deployed commit.");
      const priorResult = await run("git", ["show", `${prior}:${input.path}`], { cwd: root, env });
      if (priorResult.code !== 0 || receipt && sha256(priorResult.stdout) !== receipt.configSha256) throw new Error("Previous receipt does not match its source config.");
      const priorConfig = parseConfig(priorResult.stdout);
      if (priorConfig.name !== input.config.name) throw new Error("Deployed baseline names another Worker.");
      const added = checkMigrations(priorConfig, input.config, name, options.accepted);
      for (const tag of added) used.add(`${name}=${tag}`);
      plans.push({ name, ...input, prior, added, receipt });
    }
    if ([...options.accepted].some(tag => !used.has(tag))) throw new Error("Unused migration acceptance.");
    scratch = await mkdtemp(join(tmpdir(), "artroom-deploy-"));
    await externalPath(scratch, roots);
    if (receiptDir) { await mkdir(receiptDir, { recursive: true, mode: 0o700 }); receiptDir = await externalPath(receiptDir, roots); }
    emit({ scratch, receiptDir: receiptDir ?? null });
    for (const plan of plans) {
      await unchanged();
      const output = join(scratch, plan.name + "-bundle"); await mkdir(output);
      const built = await wrangler(["--config", resolve(root, plan.path), "--dry-run", "--outdir", output], plan.name, "dry-run");
      if (built.code !== 0) throw new Error("Wrangler dry run failed.");
      plan.bundle = await bundleManifest(output, plan.config.main);
      emit({ config: plan.name, bundle: plan.bundle });
    }
    if (options.dryRun) return 0;
    // A previous receipt with the same bundle and configuration bytes leaves
    // nothing to deploy. Refuse the whole batch before any upload.
    for (const plan of plans) {
      if (plan.receipt && plan.receipt.bundle.sha256 === plan.bundle.sha256 && plan.receipt.configSha256 === sha256(plan.bytes)) {
        throw new Error(`Bundle and configuration of ${plan.name} equal its previous receipt.`);
      }
    }
    for (const plan of plans) {
      await unchanged();
      const live = await readConfig(root, plan.name);
      if (!live.bytes.equals(plan.bytes)) throw new Error("Configuration changed after dry run.");
      pending = { format: "dap-deployment-receipt-1", status: "partial", commit: head, config: plan.name,
        configPath: plan.path, configSha256: sha256(plan.bytes), worker: plan.config.name,
        previousCommit: plan.prior, acceptedMigrations: plan.added, bundle: plan.bundle, wrangler: WRANGLER,
        version: null, time: now().toISOString(), scratch, qualification: "Deployment attempted; reconcile its version before another run. No automatic retry or rollback." };
      const deployed = await wrangler(["--config", resolve(root, plan.path)], plan.name, "deploy");
      let bytes;
      try { bytes = await boundedFile(deployed.output, 256 * 1024); }
      catch (error) {
        pending.outputReadFailure = error instanceof Error ? error.message : "Deployment output read failed.";
        throw error;
      }
      pending.reportedDeployments = reportedDeployments(bytes);
      pending.version = pending.reportedDeployments.length === 1 ? pending.reportedDeployments[0].version : null;
      pending.outputSha256 = sha256(bytes);
      if (deployed.code !== 0) throw new Error("Wrangler deployment failed or its outcome is incomplete.");
      const version = deploymentVersion(bytes.toString("utf8"));
      if (version !== pending.version || pending.reportedDeployments[0]?.worker !== plan.config.name) throw new Error("Wrangler reported another Worker.");
      await unchanged();
      const complete = { ...pending, status: "deployed", version,
        qualification: "Completed Wrangler deployment. Bundle identity describes the preceding dry run, not uploaded bytes or kept live variables. Smoke has not run." };
      const path = await persist(receiptDir, complete);
      emit({ config: plan.name, version, receipt: path }); pending = null;
    }
    return 0;
  } catch (error) {
    if (pending) {
      // A log write can fail after Wrangler has already reported its version.
      if (!pending.reportedDeployments) {
        try { await recoverDeploymentOutput(join(scratch, `${pending.config}-deploy.ndjson`), pending); }
        catch (recoveryError) { pending.outputRecoveryFailure = recoveryError instanceof Error ? recoveryError.message : "Deployment output recovery failed."; }
      }
      let path = null;
      try { path = await atomicRecord(scratch, pending); } catch { /* The JSON result remains available when storage fails. */ }
      emit({ pass: false, partial: pending, partialRecord: path, failure: "Deployment outcome needs reconciliation. Do not retry or roll back automatically." }); return 3;
    }
    emit({ pass: false, head: head ?? null, scratch: scratch ?? null, failure: error instanceof Error ? error.message : "Deployment failed." }); return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await deployMain(process.argv.slice(2));

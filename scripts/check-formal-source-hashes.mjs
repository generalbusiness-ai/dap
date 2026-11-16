/** Raw source drift only. Normal pins start no subprocess and import no source. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const coverageFile = resolve(root, "verification/state-machines/coverage.json");
const refreshCommand = model => `node scripts/check-formal-source-hashes.mjs --refresh ${model}`;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

// Locate one existing model object so refresh preserves all other JSON bytes.
function modelRange(source, model) {
  let depth = 0, pending = false, start = null;
  for (const token of source.matchAll(/"(?:[^"\\]|\\.)*"|[{}]/g)) {
    if (token[0] === "{") {
      depth++;
      if (pending && depth === 2) start = token.index;
    } else if (token[0] === "}") {
      depth--;
      if (start !== null && depth === 1) return [start, token.index + 1];
    } else if (depth === 1) pending = token[0] === JSON.stringify(model);
  }
  throw Error(`Cannot locate ${model} in verification/state-machines/coverage.json`);
}

function refreshedSource(source, model, hashes, commit) {
  const [start, end] = modelRange(source, model);
  const record = source.slice(start, end).replace(/("(?:[^"\\]|\\.)*")(\s*:\s*)("(?:[^"\\]|\\.)*")/g,
    (pair, key, separator) => {
      const name = JSON.parse(key);
      const value = name === "syncCommit" ? commit : Object.hasOwn(hashes, name) ? hashes[name] : undefined;
      return value === undefined ? pair : key + separator + JSON.stringify(value);
    });
  const updated = source.slice(0, start) + record + source.slice(end);
  const readback = JSON.parse(updated)[model];
  if (readback.syncCommit !== commit || JSON.stringify(readback.sha256) !== JSON.stringify(hashes)) {
    throw Error(`Cannot refresh ${model}: coverage record did not match the reviewed hashes`);
  }
  return updated;
}

function main(args) {
  const source = readFileSync(coverageFile, "utf8"), coverage = JSON.parse(source);
  const refresh = args.length === 2 && args[0] === "--refresh" ? args[1] : null;
  if (args.length && (!refresh || !Object.hasOwn(coverage, refresh))) {
    throw Error("Use node scripts/check-formal-source-hashes.mjs [--refresh Model]");
  }
  const files = [];
  for (const [model, record] of Object.entries(coverage)) {
    if (!record?.sha256 || typeof record.sha256 !== "object" || !Object.keys(record.sha256).length) {
      throw Error(`Missing mapped files for ${model} in verification/state-machines/coverage.json`);
    }
    for (const [file, expected] of Object.entries(record.sha256)) {
      if (!/^[a-f0-9]{64}$/.test(expected)) throw Error(`Invalid hash for ${file} (${model}); review before ${refreshCommand(model)}`);
      let bytes;
      try { bytes = readFileSync(resolve(root, file)); }
      catch { throw Error(`Cannot read ${file} (${model}); review before ${refreshCommand(model)}`); }
      files.push({ model, file, bytes, expected, actual: digest(bytes) });
    }
  }
  if (!files.length) throw Error("No mapped files in verification/state-machines/coverage.json");
  if (refresh) {
    // Only an explicit refresh reads Git. Every mapped byte must match this cut.
    const git = args => execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const commit = git(["rev-parse", "--verify", "HEAD"]).toString("utf8").trim();
    if (!/^[a-f0-9]{40}$/.test(commit)) throw Error("Cannot refresh: HEAD is not a full commit ID");
    for (const { model, file, bytes } of files) {
      let committed;
      try { committed = git(["show", `${commit}:${file}`]); }
      catch { throw Error(`Cannot refresh: ${file} (${model}) has no bytes at ${commit}; after source review run: ${refreshCommand(refresh)}`); }
      if (!bytes.equals(committed)) throw Error(`Cannot refresh: ${file} (${model}) differs from ${commit}; commit and review the mapped source, then run: ${refreshCommand(refresh)}`);
    }
    const hashes = Object.fromEntries(files.filter(row => row.model === refresh).map(row => [row.file, row.actual]));
    writeFileSync(coverageFile, refreshedSource(source, refresh, hashes, commit));
    console.log(`Refreshed ${refresh} hashes and syncCommit at ${commit}; model premises require the author's review statement`);
    return;
  }
  let failed = false;
  for (const { model, file, expected, actual } of files) {
    if (expected !== actual) {
      failed = true;
      console.error(`Formal source drift: ${file} (${model}). After reviewing the model premises, run: ${refreshCommand(model)}`);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log(`Formal source hashes match: ${files.length} mapped files in ${Object.keys(coverage).length} models`);
}

try { main(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }

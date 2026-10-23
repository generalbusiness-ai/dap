/** Node-only application sources. File allowances precede reads and parsing;
 * package identity, closure and signature remain the portable codec's work. */
import { constants } from "node:fs";
import { link, lstat, open, realpath, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isRecord, parseStrictBytes } from "@generalbusiness/dap-bytes";
import { APPLICATION_PACKAGE_LIMITS as LIMITS, packApplication, type ApplicationDefinition, type ApplicationPackageInput, type Signer } from "@generalbusiness/dap-client";
import { packApplication2, type ApplicationPackageInput2, type PackedApplication2 } from "@generalbusiness/dap-bytes/application-v2";
import type { PackedApplication } from "@generalbusiness/dap-bytes/application";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { bundleApplicationBrowser } from "./application-browser.ts";

export class ApplicationSourceError extends Error {}
const refuse = (message: string): never => { throw new ApplicationSourceError(message); };
const object = (value: unknown, keys: string, optional: readonly string[] = []): Record<string, unknown> => {
  const required = keys.split(","), allowed = new Set([...required, ...optional]);
  return isRecord(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => allowed.has(key)) ? value : refuse("Unexpected application source fields.");
};
function pathOf(value: unknown): string {
  if (typeof value !== "string" || value.length > 512 || !/^[A-Za-z0-9._/-]+$/.test(value) || value.split("/").some(part => part === "" || part === "." || part === "..")) return refuse("Source paths must be relative file paths without dot segments.");
  return value;
}

/** The explicitly chosen root is resolved once. Inside it, symlink components
 * and non-regular files are refused. A fixed-size descriptor read plus metadata
 * checks detects ordinary edits during capture; this is not a hostile-filesystem
 * isolation boundary or an atomic snapshot of the whole directory. */
async function readSource(root: string, path: string, most: number): Promise<Uint8Array> {
  const parts = pathOf(path).split("/");
  let directory = root;
  for (const part of parts.slice(0, -1)) {
    directory = join(directory, part);
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return refuse(`Source directory is not a regular directory: ${path}.`);
  }
  const leaf = await lstat(join(root, path));
  if (!leaf.isFile() || leaf.isSymbolicLink()) return refuse(`Source file is not regular: ${path}.`);
  const file = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || !Number.isSafeInteger(before.size) || before.size < 0 || before.size > most) return refuse(`Source file exceeds its allowance or is not regular: ${path}.`);
    const bytes = new Uint8Array(before.size + 1);
    let count = 0;
    while (count < bytes.length) {
      const read = await file.read(bytes, count, bytes.length - count, count);
      if (read.bytesRead === 0) break;
      count += read.bytesRead;
    }
    const after = await file.stat();
    if (count !== before.size || before.size !== after.size || before.ino !== after.ino || before.dev !== after.dev || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) return refuse(`Source file changed during capture: ${path}.`);
    return bytes.slice(0, count);
  } finally { await file.close(); }
}

async function source(directory: string, configPath: string): Promise<{ input: ApplicationPackageInput | ApplicationPackageInput2; root: string; scenarios: readonly string[] }> {
  const root = await realpath(directory);
  if (!(await lstat(root)).isDirectory()) return refuse("The application root must be a directory.");
  const captured = parseStrictBytes(await readSource(root, pathOf(configPath), LIMITS.metadataBytes));
  const compositionKeys = ["connections", "rights", "exercises", "groups", "order", "derivation", "parameters"] as const;
  const config = object(captured, "capabilities,definitions,entry,host,name,predecessor,presentation,projections,roles,v,version"
    + (isRecord(captured) && captured["v"] === 2 ? "," + compositionKeys.join(",") : ""), ["scenarios"]);
  const givenScenarios = Object.hasOwn(config, "scenarios") ? config["scenarios"] : [];
  if (!Array.isArray(givenScenarios) || givenScenarios.length > 32) return refuse("List at most 32 local scenario files.");
  const scenarios = givenScenarios.map(pathOf);
  if (new Set(scenarios).size !== scenarios.length) return refuse("List each local scenario once.");
  const version = config["v"];
  if ((version !== 1 && version !== 2) || typeof config["name"] !== "string" || typeof config["version"] !== "string") return refuse("Expected application source version 1 or 2, name and version.");
  const entry = pathOf(config["entry"]), files = config["definitions"];
  if (!Array.isArray(files) || files.length < 1 || files.length > LIMITS.definitions) return refuse("The application must list between 1 and 17 definition files.");
  const paths = files.map(pathOf);
  if (new Set(paths).size !== paths.length || !paths.includes(entry)) return refuse("List each definition file once, including the entry definition.");
  const definitions: ApplicationDefinition[] = [];
  for (const path of paths) {
    const value = parseStrictBytes(await readSource(root, path, LIMITS.definitionBytes));
    // These are the current native validator's proposed allowances, not new
    // adopted host quotas. The eventual host must validate under its own bounds.
    const checked = validateDefinition(value, PROPOSED_BOUNDS, RULE_PROFILES);
    if (!checked.ok) return refuse(`Invalid native definition ${path}: ${checked.problems.slice(0, 3).map(problem => `${problem.path}: ${problem.message}`.slice(0, 256)).join("; ")}.`);
    definitions.push({ id: checked.definition.digest, bytes: canonicalize(checked.definition.declared) });
  }
  const presentation = object(config["presentation"], version === 2 ? "assets,descriptions,entry,resources,views" : "assets,descriptions,entry", ["browser"]);
  if (!Array.isArray(presentation["assets"]) || presentation["assets"].length > LIMITS.assets) return refuse("The presentation must list at most 64 assets.");
  const assets = [];
  let total = 0;
  if (Object.hasOwn(presentation, "browser")) {
    const browser = object(presentation["browser"], "entry,html,script");
    const built = await bundleApplicationBrowser(root, pathOf(presentation["entry"]), {
      entry: pathOf(browser["entry"]), html: pathOf(browser["html"]), script: pathOf(browser["script"]),
    }, (path, most) => readSource(root, path, most));
    for (const asset of built) {
      total += asset.bytes.length;
      assets.push({ path: asset.path, mediaType: asset.mediaType, bytes: b64url(asset.bytes) });
    }
    if (built.length + presentation["assets"].length > LIMITS.assets) return refuse("The presentation has too many built and static assets.");
  }
  for (const given of presentation["assets"]) {
    const asset = object(given, "file,mediaType,path");
    if (typeof asset["path"] !== "string" || typeof asset["mediaType"] !== "string") return refuse("Each asset needs its presentation path and media type.");
    const bytes = await readSource(root, pathOf(asset["file"]), Math.min(LIMITS.assetBytes, LIMITS.totalAssetBytes - total));
    total += bytes.length;
    assets.push({ path: asset["path"], mediaType: asset["mediaType"], bytes: b64url(bytes) });
  }
  // Untrusted descriptive fields cross this single typed boundary only to the
  // codec, which validates the entire owned value before asking a key to sign.
  // A local projection may name a definition's listed source path. Resolve
  // only those already captured files; portable v2 still validates the exact
  // resulting digest, declaration schema and view bindings before signing.
  const given = config["projections"];
  const projections = version === 2 && isRecord(given) ? Object.fromEntries(Object.entries(given).map(([name, projection]) => {
    if (!isRecord(projection)) return [name, projection];
    const index = typeof projection["definition"] === "string" ? paths.indexOf(projection["definition"]) : -1;
    return [name, index < 0 ? projection : { ...projection, definition: definitions[index]!.id }];
  })) : given;
  // Resolve only files already captured and natively validated above. These
  // metadata references cause no additional file reads. The codec still owns
  // strict syntax, exact digest membership and all graph obligations.
  const definitionRef = (value: unknown): unknown => {
    const index = typeof value === "string" ? paths.indexOf(value) : -1;
    return index < 0 ? value : definitions[index]!.id;
  };
  const composition = version === 2 ? Object.fromEntries(compositionKeys.filter(key => Object.hasOwn(config, key)).map(key => {
    const value = config[key];
    if (key === "connections" && Array.isArray(value)) return [key, value.map(edge => isRecord(edge) ? { ...edge, from: definitionRef(edge["from"]), to: edge["to"] === "outside" ? "outside" : definitionRef(edge["to"]) } : edge)];
    if (key === "rights" && isRecord(value)) return [key, Object.fromEntries(Object.entries(value).map(([name, right]) => [name, isRecord(right) ? { ...right, owner: definitionRef(right["owner"]) } : right]))];
    if ((key === "exercises" || key === "order") && Array.isArray(value)) return [key, value.map(row => isRecord(row) ? { ...row, definition: definitionRef(row["definition"]) } : row)];
    return [key, value];
  })) : {};
  const input = {
    name: config["name"], version: config["version"],
    semantic: { v: version, entry: definitions[paths.indexOf(entry)]!.id, definitions, host: config["host"], projections, capabilities: config["capabilities"], roles: config["roles"], predecessor: config["predecessor"], ...composition },
    presentation: { v: version, entry: presentation["entry"], assets, descriptions: presentation["descriptions"], ...(version === 2 ? { views: presentation["views"], resources: presentation["resources"] } : {}) },
  } as ApplicationPackageInput | ApplicationPackageInput2;
  return { input, root, scenarios };
}

/** Local check/dev can prepare exactly the same package without publishing an
 * output. Scenario files are developer inputs and never change package ids. */
export async function prepareApplicationDirectory(directory: string, signer: Signer, options: { config?: string } = {}): Promise<{ packet: PackedApplication | PackedApplication2; root: string; scenarios: readonly string[] }> {
  const prepared = await source(directory, options.config ?? "dap.application.json");
  const packet = prepared.input.semantic.v === 2 ? await packApplication2(prepared.input as ApplicationPackageInput2, signer) : await packApplication(prepared.input as ApplicationPackageInput, signer);
  return { packet, root: prepared.root, scenarios: prepared.scenarios };
}
export async function readApplicationScenario(root: string, path: string): Promise<unknown> {
  return parseStrictBytes(await readSource(root, path, LIMITS.metadataBytes));
}

/** Publish complete bytes without replacing any existing output, including a
 * symlink. Temporary and output names share the explicitly chosen directory. */
async function publish(path: string, bytes: Uint8Array): Promise<void> {
  const parent = await realpath(dirname(path));
  const output = join(parent, basename(path));
  const temporary = join(parent, `.dap-pack-${randomUUID()}.tmp`);
  const file = await open(temporary, "wx", 0o600);
  try {
    try { await file.writeFile(bytes); }
    finally { await file.close(); }
    await link(temporary, output);
  } finally {
    await unlink(temporary);
  }
}

/** No output is published until every source, native definition and package
 * signature has passed. A package URI can be assigned after this file is committed. */
export async function packDirectory(directory: string, output: string, signer: Signer, options: { config?: string } = {}): Promise<PackedApplication | PackedApplication2> {
  const { packet: packed } = await prepareApplicationDirectory(directory, signer, options);
  await publish(resolve(output), packed.bytes);
  return packed;
}

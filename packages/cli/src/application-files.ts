/** Node-only application sources. File allowances precede reads and parsing;
 * package identity, closure and signature remain the portable codec's work. */
import { constants } from "node:fs";
import { link, lstat, open, realpath, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isRecord, parseStrictBytes } from "@generalbusiness/artroom-bytes";
import { APPLICATION_PACKAGE_LIMITS as LIMITS, packApplication, type ApplicationDefinition, type ApplicationPackageInput, type PackedApplication, type Signer } from "@generalbusiness/artroom-client";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";

export class ApplicationSourceError extends Error {}
const refuse = (message: string): never => { throw new ApplicationSourceError(message); };
const object = (value: unknown, keys: string): Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join() === keys ? value : refuse("Unexpected application source fields.");
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

async function source(directory: string): Promise<ApplicationPackageInput> {
  const root = await realpath(directory);
  if (!(await lstat(root)).isDirectory()) return refuse("The application root must be a directory.");
  const config = object(parseStrictBytes(await readSource(root, "dap.application.json", LIMITS.metadataBytes)), "capabilities,definitions,entry,host,name,predecessor,presentation,projections,roles,v,version");
  if (config["v"] !== 1 || typeof config["name"] !== "string" || typeof config["version"] !== "string") return refuse("Expected application source version 1, name and version.");
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
  const presentation = object(config["presentation"], "assets,descriptions,entry");
  if (!Array.isArray(presentation["assets"]) || presentation["assets"].length > LIMITS.assets) return refuse("The presentation must list at most 64 assets.");
  const assets = [];
  let total = 0;
  for (const given of presentation["assets"]) {
    const asset = object(given, "file,mediaType,path");
    if (typeof asset["path"] !== "string" || typeof asset["mediaType"] !== "string") return refuse("Each asset needs its presentation path and media type.");
    const bytes = await readSource(root, pathOf(asset["file"]), Math.min(LIMITS.assetBytes, LIMITS.totalAssetBytes - total));
    total += bytes.length;
    assets.push({ path: asset["path"], mediaType: asset["mediaType"], bytes: b64url(bytes) });
  }
  // Untrusted descriptive fields cross this single typed boundary only to the
  // codec, which validates the entire owned value before asking a key to sign.
  return {
    name: config["name"], version: config["version"],
    semantic: { v: 1, entry: definitions[paths.indexOf(entry)]!.id, definitions, host: config["host"], projections: config["projections"], capabilities: config["capabilities"], roles: config["roles"], predecessor: config["predecessor"] },
    presentation: { v: 1, entry: presentation["entry"], assets, descriptions: presentation["descriptions"] },
  } as ApplicationPackageInput;
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
export async function packDirectory(directory: string, output: string, signer: Signer): Promise<PackedApplication> {
  const input = await source(directory);
  const packed = await packApplication(input, signer);
  await publish(resolve(output), packed.bytes);
  return packed;
}

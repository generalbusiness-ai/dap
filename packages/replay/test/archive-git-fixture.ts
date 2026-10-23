/** Mechanical test archives of judged fixtures. This bypasses native export
 * admission deliberately: foreign-entry/custom-value cohorts are wire inputs,
 * not newly authorized production exports. Git independently reads the objects. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { canonicalize, isEntry, utf8 } from "@generalbusiness/dap-bytes";
import { JournalObjects, type JournalFormat, type JournalObject } from "../../git/src/journal-objects.ts";
import { JournalWork, type JournalBudget, type JournalCost } from "../../git/src/journal-work.ts";
import { archiveSegments } from "../../git/src/journal-segments.ts";
import { journalFileTree, journalPhysicalFiles } from "../../git/src/journal-files.ts";
import { journalRef, type ArchiveRetainedName } from "../../git/src/journal-path.ts";
import { journalKeyName } from "../../git/src/journal-selection.ts";
import { buildJournalArchive } from "../../git/src/journal-layout.ts";
import type { MemoryScope } from "../src/source.ts";

const roots: string[] = [];
export function scratch(): string { const root = mkdtempSync(join(tmpdir(), "artroom-replay-archive-")); roots.push(root); return root; }
export function cleanup(): void { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); }
const env = { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: "/nonexistent", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" };
export const git = (dir: string, args: readonly string[], input?: string | Uint8Array): string => execFileSync("git", ["-C", dir, ...args], { env, input, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 10_000 }).trim();

/** A finite mechanical fixture budget, not native inventory admission. */
function budget(): JournalBudget {
  const cost: JournalCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  return { check() {}, spend(added) { for (const [key, n] of Object.entries(added)) { assert.ok(Number.isSafeInteger(n) && n >= 0); cost[key as keyof JournalCost] += n; assert.ok(cost[key as keyof JournalCost] <= 1_000_000_000); } }, wait: action => action(), admitted: () => ({ ...cost }) };
}
function put(dir: string, format: JournalFormat, objects: readonly JournalObject[]): void {
  for (const object of objects) {
    const body = Buffer.concat([Buffer.from(`${object.type} ${object.data.length}\0`), object.data]);
    assert.equal(createHash(format).update(body).digest("hex"), object.id);
    const path = join(dir, "objects", object.id.slice(0, 2)); mkdirSync(path, { recursive: true });
    writeFileSync(join(path, object.id.slice(2)), deflateSync(body));
  }
}
const keyOf = (input: MemoryScope["retained"][number]): ArchiveRetainedName => {
  if (input.kind === "text") throw new Error("fixture archive must omit detached text");
  return input.kind === "value" ? { kind: input.kind, domain: input.domain!, digest: input.digest } : { kind: input.kind, digest: input.digest };
};

export function mechanicalCommit(dir: string, scope: MemoryScope, format: JournalFormat, sources: readonly MemoryScope[]): string {
  const work = new JournalWork(budget()), objects = new JournalObjects(format, work), held = new Map<string, { key: ArchiveRetainedName; data: Uint8Array }>();
  for (const input of scope.retained) { const key = keyOf(input); held.set(journalKeyName(key), { key, data: utf8(input.bytes) }); }
  const retained = [...held].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value), last = scope.entries.at(-1)!;
  const head = { v: 1, scope: scope.scope, through: last.seq, hash: last.hash };
  const used = new Set(scope.entries.flatMap(row => {
    const entry: unknown = JSON.parse(row.bytes); assert.ok(isEntry(entry));
    return entry.uses.map(use => canonicalize(use.fact.at));
  }));
  // These are fixture-authored descriptors, not native export admission.
  // Keep the consumer's direct copies and source birth pins in the wire input.
  const foreignSources = sources.filter(source => used.has(canonicalize(source.scope))).map(source => {
    const birth: unknown = JSON.parse(source.entries[0]!.bytes);
    assert.ok(isEntry(birth) && birth.input.type === "genesis");
    return { at: source.scope, pin: birth.input.seed.definition };
  }).sort((a, b) => canonicalize(a.at) < canonicalize(b.at) ? -1 : 1);
  assert.equal(foreignSources.length, used.size, "each fixture use has its source journal");
  const manifest = { v: 1, through: { seq: last.seq, hash: last.hash }, parent: null, format, entries: [0, last.seq], retained: retained.map(input => input.key), omitted: [], ...(foreignSources.length ? { foreignSources } : {}) };
  const segments = archiveSegments(scope.entries, 8 * 1024 * 1024);
  const files = journalPhysicalFiles(segments, retained, utf8(canonicalize(head)), utf8(canonicalize(manifest)), work);
  const tree = journalFileTree(files, objects, work), seconds = Math.floor(Date.parse(JSON.parse(last.bytes).time) / 1000), commit = objects.commit(tree, null, seconds);
  put(dir, format, objects.objects()); git(dir, ["update-ref", journalRef(scope.scope.scope), commit.id]); return commit.id;
}

export function clone(scopes: readonly MemoryScope[], format: JournalFormat): string {
  const root = scratch(), upstream = join(root, "upstream.git"), target = join(root, "clone.git");
  git(root, ["init", "-q", "--bare", `--object-format=${format}`, upstream]);
  for (const scope of scopes) mechanicalCommit(upstream, scope, format, scopes);
  git(root, ["-c", "protocol.file.allow=always", "clone", "--mirror", "--no-hardlinks", "--quiet", upstream, target]);
  git(target, ["remote", "remove", "origin"]); assert.equal(git(target, ["remote"]), ""); git(target, ["fsck", "--full", "--strict"]);
  return target;
}

/** Genuine judged genesis through A1's selected-prefix builder. The selection
 * is test-authored, not SQL inventory or privacy admission. */
export async function selectedGenesis(scope: MemoryScope, format: JournalFormat) {
  const entry = scope.entries[0]!, declaration = scope.retained.find(input => input.kind === "definition")!, key = keyOf(declaration);
  const fact = { at: scope.scope, seq: 0, hash: entry.hash }, cost = { entries: 1, attempts: 1, nodes: 0, calls: 0, metadata: 0, inputWork: 0 }, live = budget(); live.spend(cost);
  const selection = canonicalize({ format: "artroom-local-inventory-1", at: scope.scope, through: { seq: 0, hash: entry.hash }, entries: [{ seq: 0, hash: entry.hash, bytes: utf8(entry.bytes).length }], objects: [{ key, bytes: utf8(declaration.bytes).length, consumers: [{ mode: "required", origin: { at: fact, input: "genesis" }, consumer: "declaration", purpose: "replay-required", key }] }], omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost });
  return buildJournalArchive({ format, selection, parent: null, budget: live, input: { entry: async seq => seq === 0 ? entry.bytes : null, retained: async asked => journalKeyName(asked) === journalKeyName(key) ? declaration.bytes : null } });
}

/** Git rewrites a test-controlled leaf while preserving all other leaves. */
export function changedFile(dir: string, commit: string, path: string, bytes: string | null, mode = "100644"): string {
  const object = bytes === null ? null : mode === "160000" ? commit : git(dir, ["hash-object", "-w", "--stdin"], bytes);
  function change(tree: string, parts: readonly string[]): string {
    const rows = git(dir, ["ls-tree", tree]).split("\n"), name = parts[0]!, old = rows.find(row => row.split("\t")[1] === name);
    const rest = rows.filter(row => row.split("\t")[1] !== name);
    if (parts.length > 1) rest.push(`040000 tree ${change(old!.split(" ")[2]!.split("\t")[0]!, parts.slice(1))}\t${name}`);
    else if (object) rest.push(`${mode} ${mode === "160000" ? "commit" : "blob"} ${object}\t${name}`);
    return git(dir, ["mktree"], rest.join("\n") + "\n");
  }
  const tree = git(dir, ["rev-parse", `${commit}^{tree}`]), next = change(tree, path.split("/")), body = git(dir, ["cat-file", "commit", commit]) + "\n";
  return git(dir, ["hash-object", "-w", "-t", "commit", "--stdin"], body.replace(`tree ${tree}\n`, `tree ${next}\n`));
}

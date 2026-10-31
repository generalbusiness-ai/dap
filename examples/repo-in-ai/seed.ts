import { wellFormed } from "@generalbusiness/dap-bytes";
import { idOf, isObjectId, parseCommit, parseTree } from "@generalbusiness/dap-git";
import { editPath, editTree, type DestinationCommit, type DestinationObject } from "@generalbusiness/dap-platform";

export const SEED_LIMITS = { files: 64, fileBytes: 64 * 1024, pathBytes: 1024 } as const;

/** Source paths are relative to task-list/. Clone paths are repository-relative. */
export interface SeedFile { readonly path: string; readonly mode: string; readonly bytes: Uint8Array }
export interface SeedTree {
  readonly base: string;
  readonly tree: string;
  readonly objects: readonly DestinationObject[];
  readonly expected: readonly SeedFile[];
}
export interface SeedComparison {
  readonly matches: boolean;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly different: readonly string[];
}
type SeedReason = "no-files" | "too-many-files" | "file-too-large" | "non-text" | "non-regular" | "unsafe-path" | "duplicate-path" | "path-conflict" | "invalid-initial" | "invalid-expected";
export class SeedRefusal extends Error {
  constructor(readonly reason: SeedReason) { super(`Repo-in-ai seed refused: ${reason}`); }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const order = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

function checkedPath(path: string): void {
  if (typeof path !== "string" || !wellFormed(path) || path.includes("\\") || encoder.encode(path).length > SEED_LIMITS.pathBytes || editPath(path) === null) throw new SeedRefusal("unsafe-path");
}

function text(bytes: Uint8Array): void {
  if (!(bytes instanceof Uint8Array)) throw new SeedRefusal("non-text");
  if (bytes.length > SEED_LIMITS.fileBytes) throw new SeedRefusal("file-too-large");
  let value: string;
  try { value = decoder.decode(bytes); } catch { throw new SeedRefusal("non-text"); }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value)) throw new SeedRefusal("non-text");
}

function filesOf(files: readonly SeedFile[], limit: number, source: boolean): SeedFile[] {
  if (!Array.isArray(files) || files.length > limit) throw new SeedRefusal("too-many-files");
  const names = new Set<string>();
  const checked: SeedFile[] = [];
  for (const file of files) {
    checkedPath(file.path);
    if (names.has(file.path)) throw new SeedRefusal("duplicate-path");
    names.add(file.path);
    if (file.mode !== "100644" && (source || file.mode !== "100755")) throw new SeedRefusal("non-regular");
    text(file.bytes);
    checked.push({ path: file.path, mode: file.mode, bytes: file.bytes.slice() });
  }
  return checked.sort((a, b) => order(a.path, b.path));
}

/** Validate the supplied SHA-1 closure, not its provenance. The caller binds
 * this exact generator/observed founding commit to the room's initial head. */
function founding(initial: DestinationCommit): { read: (id: string) => DestinationObject | null; readme: SeedFile } {
  try {
    if (!isObjectId(initial.commit) || initial.objects.length !== 3) throw new SeedRefusal("invalid-initial");
    const objects = new Map<string, DestinationObject>();
    for (const object of initial.objects) {
      if (!["blob", "tree", "commit"].includes(object.kind) || !(object.body instanceof Uint8Array) || object.body.length > SEED_LIMITS.fileBytes
        || !isObjectId(object.id) || idOf(object.kind, object.body) !== object.id || objects.has(object.id)) throw new SeedRefusal("invalid-initial");
      objects.set(object.id, object);
    }
    const commit = objects.get(initial.commit);
    if (commit?.kind !== "commit") throw new SeedRefusal("invalid-initial");
    const parent = parseCommit(commit.body), tree = objects.get(parent.tree);
    if (parent.parents.length !== 0 || tree?.kind !== "tree") throw new SeedRefusal("invalid-initial");
    const entries = parseTree(tree.body), entry = entries[0];
    if (entries.length !== 1 || entry?.mode !== "100644" || entry.kind !== "blob" || decoder.decode(entry.name) !== "README.md") throw new SeedRefusal("invalid-initial");
    const readme = objects.get(entry.id);
    if (readme?.kind !== "blob") throw new SeedRefusal("invalid-initial");
    text(readme.body);
    return { read: id => objects.get(id) ?? null, readme: { path: "README.md", mode: "100644", bytes: readme.body.slice() } };
  } catch { throw new SeedRefusal("invalid-initial"); }
}

/** Validate and copy bounded task-list source paths, modes and text. */
export function taskListFiles(files: readonly SeedFile[]): readonly SeedFile[] {
  const source = filesOf(files, SEED_LIMITS.files, true);
  if (source.length === 0) throw new SeedRefusal("no-files");
  return source;
}

/** Add at most 64 task-list files without deleting the founding README.
 * Git object/tree builders remain the platform's; this chooses no commit,
 * parent identity, timestamp, credential or publication authority. */
export function seedTree(initial: DestinationCommit, files: readonly SeedFile[]): SeedTree {
  const source = taskListFiles(files);
  const writes = source.map(file => ({ path: `task-list/${file.path}`, bytes: file.bytes }));
  for (const file of writes) checkedPath(file.path);
  const base = founding(initial);
  const built = editTree("sha1", base.read, initial.commit, writes);
  if (built === null) throw new SeedRefusal("path-conflict");
  const expected = [base.readme, ...writes.map(file => ({ ...file, mode: "100644", bytes: file.bytes.slice() }))]
    .sort((a, b) => order(a.path, b.path));
  return { base: initial.commit, tree: built.tree, objects: built.objects, expected };
}

/** Compare the complete fresh-clone blob listing, including README.md.
 * The caller reads every actual Git blob; a tree digest cannot replace it. */
export function compareSeedFiles(expected: readonly SeedFile[], actual: readonly SeedFile[]): SeedComparison {
  const wanted = filesOf(expected, SEED_LIMITS.files + 1, true);
  if (!wanted.some(file => file.path === "README.md") || wanted.some(file => file.path !== "README.md" && !file.path.startsWith("task-list/"))) throw new SeedRefusal("invalid-expected");
  const observed = filesOf(actual, SEED_LIMITS.files + 1, false);
  const byExpected = new Map(wanted.map(file => [file.path, file]));
  const byActual = new Map(observed.map(file => [file.path, file]));
  const missing = wanted.filter(file => !byActual.has(file.path)).map(file => file.path);
  const extra = observed.filter(file => !byExpected.has(file.path)).map(file => file.path);
  const different = wanted.filter(file => {
    const other = byActual.get(file.path);
    return other !== undefined && (file.mode !== other.mode || file.bytes.length !== other.bytes.length || file.bytes.some((byte, n) => byte !== other.bytes[n]));
  }).map(file => file.path);
  return { matches: missing.length === 0 && extra.length === 0 && different.length === 0, missing, extra, different };
}

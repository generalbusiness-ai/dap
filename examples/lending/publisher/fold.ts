/** One deterministic shelf tree and commit from a complete recorded interval. No filesystem, clock, service or credential is read. */
import type { Digest, Entry, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isEntry, isFactRef, isScopeRef, scopeIdOf, timeMs, utf8, wellFormed } from "@generalbusiness/dap-bytes";
import { GitRefusal, SNAPSHOT_BOUNDS, idOf, objectId, snapshotCommit, type ObjectId, type SnapshotFile } from "@generalbusiness/dap-git";
import { isPublication, openingOf, publicationWrite } from "./map.ts";

export interface JournalRow { readonly entry: Entry; readonly hash: Digest }
export interface PublicationInput {
  readonly scope: ScopeRef;
  readonly base: ObjectId | null;
  readonly files: readonly SnapshotFile[];
  /** A complete ordered interval after the cursor. Rows beyond `through` do not change this commit. */
  readonly entries: readonly JournalRow[];
  /** Earlier donate entries that the interval names. No current item state participates in the fold. */
  readonly openings: readonly JournalRow[];
  readonly through: FactRef;
}
export interface PublicationObject { readonly id: ObjectId; readonly type: "blob" | "tree" | "commit"; readonly data: Uint8Array }
export interface SkippedWrite { readonly fact: FactRef; readonly reason: "bad-path" | "path-conflict" | "file-limit" | "tree-limit" }
export interface BuiltPublication {
  readonly commit: ObjectId;
  readonly tree: ObjectId;
  readonly objects: readonly PublicationObject[];
  readonly skipped: readonly SkippedWrite[];
  readonly message: string;
  readonly through: FactRef;
  readonly base: ObjectId | null;
}

export const PUBLISHER_IDENTITY = "dap Lending Publisher <publisher@dap.invalid>";
export class PublicationInputError extends Error {
  constructor(readonly reason: "scope" | "base" | "journal" | "through" | "opening" | "content" | "time") { super(`incomplete-publication-${reason}`); }
}
const sameScope = (a: ScopeRef, b: ScopeRef): boolean => a.scope === b.scope && a.genesis === b.genesis;

function checkedRow(scope: ScopeRef, row: JournalRow): void {
  if (!isEntry(row.entry) || !isDigest(row.hash) || entryHash(row.entry) !== row.hash) throw new PublicationInputError("journal");
  const entry = row.entry;
  if (entry.input.type === "genesis") {
    if (entry.seq !== 0 || row.hash !== scope.genesis || scopeIdOf(entry.input.seed) !== scope.scope) throw new PublicationInputError("scope");
  } else if (!("genesis" in entry) || entry.genesis !== scope.genesis) throw new PublicationInputError("scope");
}
function checkedRows(scope: ScopeRef, entries: readonly JournalRow[]): void {
  let previous: JournalRow | undefined;
  for (const row of entries) {
    checkedRow(scope, row);
    if (previous && (row.entry.seq !== previous.entry.seq + 1 || row.entry.prev !== previous.hash)) throw new PublicationInputError("journal");
    previous = row;
  }
}
const factOf = (scope: ScopeRef, row: JournalRow): FactRef => ({ at: scope, seq: row.entry.seq, hash: row.hash });

/** The trailer binds the actual scope incarnation and entry, not an unqualified position. */
export function publicationTrailer(scope: ScopeRef, through: FactRef, base: ObjectId | null): string {
  return `Dap-Scope: ${scope.scope}\nDap-Genesis: ${scope.genesis}\nDap-Through: ${through.seq} ${through.hash}\nDap-Base: ${base ?? "none"}\n`;
}

function pathAllowed(path: unknown): path is string {
  if (typeof path !== "string" || !path.startsWith("shelf/") || !path.endsWith(".md") || path.includes("..") || !wellFormed(path)) return false;
  try {
    // Reuse the reviewed Git path grammar, including .git, control characters and depth bounds.
    snapshotCommit([{ path, mode: "100644", id: "1111111111111111111111111111111111111111" }], "Check path\n");
    return true;
  } catch (error) {
    if (error instanceof GitRefusal) return false;
    throw error;
  }
}
function prefixes(path: string): string[] {
  const parts = path.split("/");
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function buildPublication(input: PublicationInput): BuiltPublication {
  const { scope, base, through } = input;
  if (!isScopeRef(scope)) throw new PublicationInputError("scope");
  if (base !== null) objectId(base, "base");
  if (base === null && input.files.length !== 0) throw new PublicationInputError("base");
  if (!isFactRef(through) || !sameScope(through.at, scope)) throw new PublicationInputError("through");
  checkedRows(scope, input.entries);
  const last = input.entries.find(row => row.entry.seq === through.seq);
  if (!last || last.hash !== through.hash || !isPublication(last)) throw new PublicationInputError("through");
  const millis = timeMs(last.entry.time);
  if (millis === null) throw new PublicationInputError("time");

  // A missing or malformed earlier tree is never an empty one. The caller supplies checked files from its complete read.
  snapshotCommit(input.files, "Check base tree\n");
  const files = new Map(input.files.map(file => [file.path, { ...file }]));
  const directories = new Set(input.files.flatMap(file => prefixes(file.path)));
  const openings = new Map<number, JournalRow>();
  for (const row of [...input.openings, ...input.entries.filter(row => row.entry.seq <= through.seq)]) {
    checkedRow(scope, row);
    const previous = openings.get(row.entry.seq);
    if (previous && canonicalize(previous) !== canonicalize(row)) throw new PublicationInputError("opening");
    openings.set(row.entry.seq, row);
  }
  const blobs = new Map<string, PublicationObject>();
  const skipped: SkippedWrite[] = [];
  for (const row of input.entries) {
    if (row.entry.seq > through.seq) break;
    if (!isPublication(row)) continue;
    const openingId = openingOf(row), direct = row.entry.input.type === "act" && row.entry.input.signed.intent.kind === "donate";
    const opening = openingId === null ? null : openings.get(openingId) ?? null;
    if (!direct && (!opening || opening.entry.seq >= row.entry.seq || opening.entry.input.type !== "act" || opening.entry.input.signed.intent.kind !== "donate")) throw new PublicationInputError("opening");
    const write = publicationWrite(row, opening)!;
    if (typeof write.content !== "string" || !wellFormed(write.content)) throw new PublicationInputError("content");
    const at = factOf(scope, row), path = write.path;
    if (!pathAllowed(path)) { skipped.push({ fact: at, reason: "bad-path" }); continue; }
    if (directories.has(path) || prefixes(path).some(prefix => files.has(prefix))) { skipped.push({ fact: at, reason: "path-conflict" }); continue; }
    if (!files.has(path) && files.size >= SNAPSHOT_BOUNDS.files) { skipped.push({ fact: at, reason: "file-limit" }); continue; }
    const introduced = prefixes(path).filter(prefix => !directories.has(prefix));
    // snapshotFiles counts every directory path it visits, even when many
    // paths share one Git tree object. Include its root in the same bound.
    if (1 + directories.size + introduced.length > SNAPSHOT_BOUNDS.trees) { skipped.push({ fact: at, reason: "tree-limit" }); continue; }
    const data = utf8(write.content), id = idOf("blob", data);
    files.set(path, { path, mode: "100644", id });
    for (const prefix of prefixes(path)) directories.add(prefix);
    blobs.set(path, { id, type: "blob", data });
  }
  const reasons = skipped.map(row => `Skipped entry ${row.fact.seq} ${row.fact.hash}: ${row.reason}\n`).join("");
  const message = `Publish lending shelf through entry ${through.seq}\n\n${reasons}${reasons ? "\n" : ""}${publicationTrailer(scope, through, base)}`;
  const tree = snapshotCommit([...files.values()], message);
  const identity = `${PUBLISHER_IDENTITY} ${Math.floor(millis / 1000)} +0000`;
  const data = utf8(`tree ${tree.tree}\n${base === null ? "" : `parent ${base}\n`}author ${identity}\ncommitter ${identity}\n\n${message}`);
  const commit = idOf("commit", data);
  const uniqueBlobs = new Map([...blobs.values()].map(object => [object.id, object]));
  const objects = [...uniqueBlobs.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  objects.push(...tree.objects.filter(object => object.type === "tree"), { id: commit, type: "commit", data });
  return { commit, tree: tree.tree, objects, skipped, message, through: { ...through, at: { ...through.at } }, base };
}

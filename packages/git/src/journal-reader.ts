/** Untrusted archive bytes over Git objects. No checkout, replay judgment,
 * export admission or service fallback. The caller owns one read budget. */
import { decodeGitText } from "./wire-text.ts";
import { DOMAINS, type Digest, type FactRef, type Head, type RetainedInput, type ScopeId, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, domainRetainedJSON, entryHash, isEntry, parseStrict, rawRetainedJSON, scopeIdOf, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal } from "./names.ts";
import { journalPhysicalFiles, journalTreeFiles, type JournalRetainedFile } from "./journal-files.ts";
import { journalHead, journalManifest } from "./journal-manifest.ts";
import { JournalObjectReader, journalId, type JournalFormat, type JournalObjectSource } from "./journal-objects.ts";
export { journalId };
import { archiveRetainedPath, firstOfArchiveSegment, journalRef } from "./journal-path.ts";
import { archiveSegments, archiveShards } from "./journal-segments.ts";
import { JOURNAL_SELECTION_BYTES, sameJournalScope, type JournalForeignSource } from "./journal-selection.ts";
import { JournalLayoutRefusal, JournalWork, type JournalBudget } from "./journal-work.ts";
import type { JournalTextOmission } from "./journal-v2-manifest.ts";
import type { JournalAnchorCoverage, JournalAnchorRange } from "./journal-anchors.ts";
export { readJournalRepositoryArchive } from "./journal-reader-any.ts";
export { readJournalArchiveV2, type JournalV2ReadOptions } from "./journal-v2-reader.ts";

export interface JournalReadBudget extends JournalBudget {
  /** Reserve physical object body bytes before asking the port to load them. */
  bytes(size: number): void;
  scope(): void;
  /** Node plumbing uses the original deadline for the actual child process. */
  remainingMilliseconds?(): number;
}
export interface JournalReadRepository {
  format(budget: JournalReadBudget): Promise<JournalFormat>;
  resolve(ref: string, budget: JournalReadBudget): Promise<string | null>;
  object(id: string, limit: number, budget: JournalReadBudget): ReturnType<JournalObjectSource["object"]>;
  /** Await already-started owned I/O; starts no new read. */
  settle?(): Promise<void>;
}
export interface JournalReadLocation { readonly scope: ScopeId; readonly ref?: string; readonly commit?: string; readonly object?: string; readonly path?: string }
export type JournalReadOutcome = "mismatch" | "refused" | "unavailable" | "timeout" | "limit" | "not-found";
export interface JournalReadFailure { readonly ok: false; readonly result: JournalReadOutcome; readonly reason: string; readonly location: JournalReadLocation }
export interface ReadJournal {
  readonly scope: ScopeRef;
  readonly head: Head;
  readonly format: JournalFormat;
  readonly commit: string;
  readonly name: string | null;
  readonly entries: readonly { readonly seq: number; readonly hash: Digest; readonly bytes: string }[];
  readonly retained: readonly RetainedInput[];
  /** Descriptive classifier basis, not independently proven source history. */
  readonly foreignSources?: readonly JournalForeignSource[];
  /** V2 canonical retained-text byte counts, taken on caller trust. */
  readonly omittedTexts?: readonly JournalTextOmission[];
  /** Validated published caller-word facts. No automatic trust is granted. */
  readonly publishedAnchors?: readonly FactRef[];
  readonly anchorRanges?: readonly JournalAnchorRange[];
  readonly anchorCoverage?: JournalAnchorCoverage;
}
export type JournalReadResult = { readonly ok: true; readonly archive: ReadJournal } | JournalReadFailure;
class InvalidArchive extends Error {
  readonly result: JournalReadOutcome;
  constructor(result: JournalReadOutcome, message: string) { super(message); this.result = result; }
}
function mismatch(why: string): never { throw new InvalidArchive("mismatch", why); }
function refused(why: string): never { throw new InvalidArchive("refused", why); }
const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((value, index) => value === b[index]);

/** This reads the current commit's complete native prefix. It does not
 * claim the ancestry of earlier archive commits, host custody or consent. */
export async function readJournalArchive(repository: JournalReadRepository, scope: ScopeId, budget: JournalReadBudget): Promise<JournalReadResult> {
  const location: { scope: ScopeId; ref?: string; commit?: string; object?: string; path?: string } = { scope };
  try {
    const ref = journalRef(scope); location.ref = ref;
    budget.scope(); budget.check();
    const format = await repository.format(budget);
    const id = await repository.resolve(ref, budget);
    if (id === null) return { ok: false, result: "not-found", reason: "archive ref is absent", location };
    location.commit = journalId(format, id);
    const work = new JournalWork(budget);
    const source: JournalObjectSource = { object: (object, limit) => { if (limit > 0) budget.bytes(limit); return repository.object(object, limit, budget); } };
    const reader = new JournalObjectReader(format, source, work);
    const read = async (object: string, type: "blob" | "commit", path?: string, maximum = work.limits.objectBytes): Promise<Uint8Array> => {
      location.object = object;
      if (path === undefined) delete location.path; else location.path = path;
      return reader.read(object, type, maximum);
    };
    const commit = reader.commit(await read(id, "commit", undefined, 1024));
    location.object = commit.tree;
    const actual = await journalTreeFiles(reader, commit.tree, work);
    const headId = actual.get("journal/v1/head.json"), manifestId = actual.get("journal/v1/manifest.json");
    if (!headId || !manifestId) mismatch("archive tree lacks head.json or manifest.json");
    const headBody = await read(headId, "blob", "journal/v1/head.json", 1024);
    const head = journalHead(headBody, work);
    const manifestBody = await read(manifestId, "blob", "journal/v1/manifest.json", JOURNAL_SELECTION_BYTES);
    const manifest = journalManifest(manifestBody, format, work);
    if (head.scope.scope !== scope || head.through !== manifest.through.seq || head.hash !== manifest.through.hash || manifest.parent !== commit.parent) mismatch("archive head, manifest and commit differ");

    const retainedPaths = new Map<string, (typeof manifest.retained)[number]>();
    const groups = new Map<string, Map<string, (typeof manifest.retained)[number]>>();
    for (const key of manifest.retained) {
      const logical = archiveRetainedPath(key), slash = logical.lastIndexOf("/"), prefix = logical.slice(0, slash + 1), leaf = logical.slice(slash + 1);
      const group = groups.get(prefix) ?? new Map(); group.set(leaf, key); groups.set(prefix, group);
    }
    for (const [prefix, group] of groups) for (const suffix of archiveShards([...group.keys()], "retained")) retainedPaths.set(prefix + suffix.path, group.get(suffix.name)!);
    const segments: { first: number; path: string; id: string }[] = [];
    for (const [path, object] of actual) {
      work.check();
      if (path === "journal/v1/head.json" || path === "journal/v1/manifest.json" || retainedPaths.has(path)) continue;
      if (!path.startsWith("journal/v1/segments/")) { location.path = path; location.object = object; refused("path is outside the archive grammar or manifest"); }
      const leaf = path.slice(path.lastIndexOf("/") + 1), first = firstOfArchiveSegment("journal/v1/segments/" + leaf);
      if (first === null) { location.path = path; location.object = object; refused("invalid segment path"); }
      segments.push({ first, path, id: object });
    }
    segments.sort((a, b) => a.first - b.first);
    const entries: { seq: number; hash: Digest; bytes: string }[] = [];
    const foreignUses = new Map<Digest, { fact: FactRef; found: boolean }>();
    const sources = new Map(manifest.foreignSources?.map(source => [canonicalize(source.at), source.pin]) ?? []), usedSources = new Set<string>();
    const bodies = new Map<string, Uint8Array>([["journal/v1/head.json", headBody], ["journal/v1/manifest.json", manifestBody]]);
    let lastTime: number | null = null;
    for (const segment of segments) {
      const body = await read(segment.id, "blob", segment.path); bodies.set(segment.path, body);
      work.input(body.length, 12);
      let lines: string[];
      try { lines = decodeGitText(body).split("\n"); } catch { mismatch("segment is not UTF-8"); }
      if (lines.length === 0 || lines.length > 1000 || segment.first !== entries.length) mismatch("segment interval is not contiguous");
      budget.spend({ entries: lines.length }); work.metadata(lines.length * 128);
      for (const bytes of lines) {
        work.check();
        let entry: unknown;
        try { entry = parseStrict(bytes); if (canonicalize(entry) !== bytes) mismatch("entry is not canonical JSON"); } catch { mismatch("entry is not canonical JSON"); }
        if (!isEntry(entry) || !sameJournalScope(entry.at, head.scope) || entry.seq !== entries.length || entry.prev !== (entries.at(-1)?.hash ?? null)) mismatch("entry identity, position or chain differs");
        if (entry.seq === 0) {
          if (entry.input.type !== "genesis" || scopeIdOf(entry.input.seed) !== scope || entry.input.inc !== head.scope.inc || entry.input.seed.kind !== head.scope.kind) mismatch("archive genesis identity differs");
        } else if (entry.input.type === "genesis") mismatch("archive contains a second genesis");
        lastTime = timeMs(entry.time);
        if (entry.uses.length && !manifest.foreignSources) mismatch("foreign uses lack a classified source basis");
        if (manifest.foreignSources) {
          work.metadata(entry.uses.length * 512);
          for (const use of entry.uses) {
            work.check();
            const previous = foreignUses.get(use.content);
            if (previous && canonicalize(previous.fact) !== canonicalize(use.fact)) mismatch("foreign content has conflicting consumer facts");
            foreignUses.set(use.content, { fact: use.fact, found: false });
          }
        }
        entries.push({ seq: entry.seq, hash: entryHash(entry), bytes });
      }
    }
    if (entries.length !== head.through + 1 || entries.at(-1)?.hash !== head.hash || lastTime === null || Math.floor(lastTime / 1000) !== commit.seconds) mismatch("archive prefix does not reach its stated head and time");

    const retained: RetainedInput[] = [], files: JournalRetainedFile[] = [];
    for (const [path, key] of retainedPaths) {
      const object = actual.get(path);
      if (!object) { location.path = path; delete location.object; mismatch("manifest input is absent from the tree"); }
      const body = await read(object, "blob", path); bodies.set(path, body); work.input(body.length, 12);
      let bytes: string;
      try { bytes = decodeGitText(body); } catch { mismatch("retained input is not UTF-8"); }
      const value = key.kind === "entry" || key.kind === "rule" ? rawRetainedJSON(key.digest, bytes)
        : domainRetainedJSON(key.kind === "value" ? key.domain : key.kind === "definition" ? DOMAINS.definition : DOMAINS.snapshot, key.digest, bytes, { canonical: true, max: body.length });
      if (value === undefined || canonicalize(value) !== bytes || key.kind === "entry" && !isEntry(value)) mismatch("retained input differs from its named bytes");
      if (key.kind === "entry" && manifest.foreignSources) {
        const use = foreignUses.get(key.digest);
        if (!isEntry(value) || !use || !sameJournalScope(value.at, use.fact.at) || value.seq !== use.fact.seq || entryHash(value) !== use.fact.hash) mismatch("foreign copy differs from its consumer fact");
        const source = canonicalize(value.at), pin = sources.get(source);
        if (!pin) mismatch("foreign copy lacks its classified source pin");
        if (value.seq === 0 ? value.input.type !== "genesis" || value.prev !== null || value.input.seed.definition !== pin || value.input.inc !== value.at.inc || value.input.seed.kind !== value.at.kind || scopeIdOf(value.input.seed) !== value.at.scope : value.input.type === "genesis") mismatch("foreign copy birth differs from its classified source pin");
        use.found = true; usedSources.add(source);
      }
      retained.push({ ...key, bytes }); files.push({ key, data: body });
    }
    if (manifest.foreignSources && (usedSources.size !== sources.size || [...foreignUses.values()].some(use => !use.found))) mismatch("foreign source basis or direct copies are incomplete");
    const canonicalSegments = archiveSegments(entries.map(entry => ({ seq: entry.seq, bytes: entry.bytes })), entries.reduce((sum, entry) => sum + utf8(entry.bytes).length + 1, 0));
    const expected = journalPhysicalFiles(canonicalSegments, files, headBody, manifestBody, work);
    const differing = expected.find(file => !bodies.has(file.path) || !equalBytes(bodies.get(file.path)!, file.data));
    if (actual.size !== expected.length || differing) { location.object = commit.tree; if (differing) location.path = differing.path; else delete location.path; mismatch("archive file layout is not canonical"); }
    const genesis = parseStrict(entries[0]!.bytes);
    let name: string | null = null;
    if (isEntry(genesis) && genesis.input.type === "genesis") {
      const pinned = genesis.input.seed.definition;
      if (pinned.startsWith("platform:")) name = pinned.slice(0, pinned.lastIndexOf("@"));
      else {
        const declaration = retained.find(input => input.kind === "definition" && input.digest === pinned);
        if (declaration) { const data = parseStrict(declaration.bytes); if (data && typeof data === "object" && "name" in data && typeof data.name === "string") name = data.name; }
      }
    }
    work.check();
    return { ok: true, archive: Object.freeze({ scope: Object.freeze({ ...head.scope }), head: Object.freeze({ seq: head.through, hash: head.hash }), format, commit: id, name, entries: Object.freeze(entries.map(entry => Object.freeze(entry))), retained: Object.freeze(retained.map(input => Object.freeze(input))), ...(manifest.foreignSources ? { foreignSources: Object.freeze(manifest.foreignSources.map(source => Object.freeze({ at: Object.freeze({ ...source.at }), pin: source.pin }))) } : {}) }) };
  } catch (error) {
    let result: JournalReadOutcome = "unavailable", why = "archive read is unavailable";
    if (error instanceof InvalidArchive) { result = error.result; why = error.message; }
    else if (error instanceof JournalLayoutRefusal) { result = error.reason === "limit" || error.reason === "timeout" || error.reason === "unavailable" ? error.reason : error.reason === "tree" ? "refused" : "mismatch"; why = error.message; }
    else if (error instanceof GitRefusal) { result = "refused"; why = error.reason; }
    else if (error && typeof error === "object" && "reason" in error && (error.reason === "limit" || error.reason === "timeout" || error.reason === "unavailable")) { result = error.reason; why = `archive-${result}`; }
    return { ok: false, result, reason: why, location: { ...location } };
  }
}

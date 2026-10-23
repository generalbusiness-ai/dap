/** Complete v2 clone validation. Every pass retains its own S2b basis.
 * No service fallback, native admission or replay judgment is supplied. */
import { DOMAINS, type Digest, type FactRef, type RetainedInput, type ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, domainRetainedJSON, entryHash, isEntry, parseStrict, rawRetainedJSON, scopeIdOf, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { decodeGitText } from "./wire-text.ts";
import { journalRef } from "./journal-path.ts";
import { archiveSegments } from "./journal-segments.ts";
import { JournalObjectReader, journalId, type JournalObjectSource } from "./journal-objects.ts";
import { JOURNAL_SELECTION_BYTES, journalKeyName, sameJournalScope, type JournalForeignSource } from "./journal-selection.ts";
import { journalV2Head, journalPassManifest, type JournalPassManifest, type JournalTextOmission } from "./journal-v2-manifest.ts";
import { journalV2Directory, journalV2PassPath, journalV2Position, journalV2RetainedPath, journalV2SegmentPath, readJournalV2Path } from "./journal-v2-path.ts";
import { JournalLayoutRefusal, JournalWork, refuseJournal } from "./journal-work.ts";
import type { JournalReadBudget, JournalReadRepository, JournalReadResult, ReadJournal } from "./journal-reader.ts";
import { readJournalAnchorPublication } from "./journal-anchors.ts";

export const JOURNAL_V2_READ_ENTRIES = 1_000_000;
export interface JournalV2ReadOptions { readonly entries?: number }
const mismatch = (where?: string): never => refuseJournal("input-mismatch", where);

export async function readJournalArchiveV2(repository: JournalReadRepository, scope: ScopeId, budget: JournalReadBudget, options: JournalV2ReadOptions = {}): Promise<JournalReadResult> {
  const location: { scope: ScopeId; ref?: string; commit?: string; path?: string; object?: string } = { scope };
  try {
    const maximum = options.entries ?? JOURNAL_V2_READ_ENTRIES;
    if (!Number.isSafeInteger(maximum) || maximum < 1) return refuseJournal("limit");
    journalV2Position(maximum - 1);
    budget.scope(); budget.check();
    const ref = journalRef(scope); location.ref = ref;
    const format = await repository.format(budget), id = await repository.resolve(ref, budget);
    if (id === null) return { ok: false, result: "not-found", reason: "archive ref is absent", location };
    location.commit = journalId(format, id);
    const work = new JournalWork(budget, {}, { entries: maximum });
    const source: JournalObjectSource = { object: (object, limit) => { if (limit > 0) budget.bytes(limit); return repository.object(object, limit, budget); } };
    const reader = new JournalObjectReader(format, source, work);
    const read = async (object: string, type: "blob" | "tree" | "commit", path?: string, limit = work.limits.objectBytes) => {
      location.object = object;
      if (path) location.path = path; else delete location.path;
      return reader.read(object, type, limit);
    };
    const commit = reader.commit(await read(id, "commit", undefined, 1024));
    const actual = new Map<string, string>();
    async function walk(tree: string, prefix: string, depth: number): Promise<void> {
      work.depth(depth); budget.spend({ nodes: 1 });
      const directory = journalV2Directory(prefix);
      if (!directory) return refuseJournal("tree", prefix);
      const rows = reader.tree(await read(tree, "tree", prefix, directory.bytes));
      if (rows.length === 0 || rows.length > directory.maximum) return refuseJournal("tree", prefix);
      for (const row of rows) {
        work.check(); const path = prefix + row.name;
        if (path.length > 1024) return work.stop();
        work.metadata(path.length + 64);
        if (row.mode === "40000") {
          if (!path.startsWith("journal/v2") && path !== "journal") return refuseJournal("tree", path);
          await walk(row.id, path + "/", depth + 1);
        } else {
          if (!readJournalV2Path(path)) return refuseJournal("tree", path);
          work.spend({ files: 1 }); actual.set(path, row.id);
        }
      }
    }
    await walk(commit.tree, "", 0);
    const headId = actual.get("journal/v2/head.json");
    if (!headId) return mismatch("journal/v2/head.json");
    const head = journalV2Head(await read(headId, "blob", "journal/v2/head.json", 1024), work);
    if (head.scope.scope !== scope) return mismatch("scope");
    if (head.through >= maximum) return work.stop();
    const passes: JournalPassManifest[] = [];
    for (const [path, object] of actual) if (readJournalV2Path(path)?.kind === "pass") {
      const manifest = journalPassManifest(await read(object, "blob", path, JOURNAL_SELECTION_BYTES), format, work);
      if (path !== journalV2PassPath(manifest.entries[0])) return mismatch(path);
      passes.push(manifest);
    }
    work.metadata(passes.length * 128); work.input(passes.length * 64 * (Math.ceil(Math.log2(passes.length + 1)) + 1));
    passes.sort((a, b) => a.entries[0] - b.entries[0]);
    let next = 0;
    for (const pass of passes) { if (pass.entries[0] !== next) return mismatch("pass interval"); next = pass.through.seq + 1; }
    if (next !== head.through + 1 || passes.at(-1)?.through.hash !== head.hash || passes.at(-1)?.parent !== commit.parent) return mismatch("head");
    const segmentRows = [...actual].flatMap(([path, id]) => {
      const parsed = readJournalV2Path(path);
      return parsed?.kind === "segment" ? [{ path, id, first: parsed.first, pass: parsed.pass }] : [];
    });
    work.metadata(segmentRows.length * 128); work.input(segmentRows.length * 64 * (Math.ceil(Math.log2(segmentRows.length + 1)) + 1));
    segmentRows.sort((a, b) => a.first - b.first);
    let segmentIndex = 0;
    const expected = new Set<string>(["journal/v2/head.json"]), entries: ReadJournal["entries"][number][] = [], retained = new Map<string, RetainedInput>();
    const origins = new Map<string, number>(), written = new Map<string, { pass: number; key: (typeof passes)[number]["retained"][number] }>();
    const omittedTexts: JournalTextOmission[] = [], omittedSizes = new Map<Digest, number>();
    const sources = new Map<string, JournalForeignSource>();
    for (const pass of passes) {
      const first = pass.entries[0]; expected.add(journalV2PassPath(first));
      for (const held of pass.retained) if (held.pass === first) {
        const { pass: _pass, ...key } = held, name = journalKeyName(key), path = journalV2RetainedPath(first, key);
        if (origins.has(name) || !actual.has(path)) return mismatch(path);
        origins.set(name, first); written.set(path, { pass: first, key: held }); expected.add(path);
      }
      for (const held of pass.retained) if (origins.get(journalKeyName(held)) !== held.pass) return mismatch("retained pass");
    }
    // Load each physical retained file once, then check every pass's uses
    // against that same content and that pass's own source-pin basis.
    for (const [path, { key: held }] of written) {
      const { pass: _pass, ...key } = held, body = await read(actual.get(path)!, "blob", path);
      work.input(body.length, 12);
      let bytes: string;
      try { bytes = decodeGitText(body); } catch { return mismatch(path); }
      const value = key.kind === "entry" || key.kind === "rule" ? rawRetainedJSON(key.digest, bytes)
        : domainRetainedJSON(key.kind === "value" ? key.domain : key.kind === "definition" ? DOMAINS.definition : DOMAINS.snapshot, key.digest, bytes, { canonical: true, max: body.length });
      if (value === undefined || canonicalize(value) !== bytes || key.kind === "entry" && !isEntry(value)) return mismatch(path);
      retained.set(journalKeyName(key), { ...key, bytes });
    }
    let lastTime: number | null = null;
    for (const pass of passes) {
      const first = pass.entries[0], local: ReadJournal["entries"][number][] = [], uses = new Map<Digest, FactRef>();
      const basis = new Map(pass.foreignSources?.map(source => [canonicalize(source.at), source.pin]) ?? []), usedSources = new Set<string>();
      const segments: typeof segmentRows = [];
      while (segmentIndex < segmentRows.length && segmentRows[segmentIndex]!.first <= pass.through.seq) {
        const segment = segmentRows[segmentIndex++]!;
        if (segment.first < first || segment.pass !== first) return mismatch(segment.path);
        segments.push(segment);
      }
      const claimed = new Map<number, Set<Digest>>(), named = new Map<number, Set<Digest>>();
      for (const row of pass.omitted) if (row.bytes !== undefined && row.first) {
        if (row.first.scope !== scope) return refuseJournal("tree", "omission scope");
        work.metadata(256);
        const at = claimed.get(row.first.seq) ?? new Set<Digest>(); at.add(row.digest); claimed.set(row.first.seq, at);
      }
      for (const segment of segments) {
        expected.add(segment.path);
        const body = await read(segment.id, "blob", segment.path); work.input(body.length, 12);
        let lines: string[];
        try { lines = decodeGitText(body).split("\n"); } catch { return mismatch(segment.path); }
        if (lines.length === 0 || lines.length > 1000 || segment.first !== entries.length) return mismatch(segment.path);
        budget.spend({ entries: lines.length }); work.metadata(lines.length * 128);
        for (const bytes of lines) {
          let entry: unknown;
          try { entry = parseStrict(bytes); } catch { return mismatch(segment.path); }
          if (!isEntry(entry) || canonicalize(entry) !== bytes || !sameJournalScope(entry.at, head.scope) || entry.seq !== entries.length || entry.seq > pass.through.seq || entry.prev !== (entries.at(-1)?.hash ?? null)) return mismatch(segment.path);
          if (entry.seq === 0 ? entry.input.type !== "genesis" || scopeIdOf(entry.input.seed) !== scope || entry.input.inc !== head.scope.inc || entry.input.seed.kind !== head.scope.kind : entry.input.type === "genesis") return mismatch(segment.path);
          const asked = claimed.get(entry.seq);
          if (asked) {
            // Check explicit claims, not discover dependencies or body reads.
            // The native text selector owns semantic consumption in Replay.
            const size = utf8(bytes).length; work.metadata(size * 8); work.input(size, 2);
            const pending: unknown[] = [entry.input], found = new Set<Digest>();
            while (pending.length) {
              work.check(); const value = pending.pop();
              if (typeof value === "string" && asked.has(value as Digest)) found.add(value as Digest);
              else if (value && typeof value === "object") for (const child of Object.values(value)) pending.push(child);
            }
            named.set(entry.seq, found);
          }
          work.metadata(entry.uses.length * 512);
          for (const use of entry.uses) {
            const prior = uses.get(use.content);
            if (prior && canonicalize(prior) !== canonicalize(use.fact)) return mismatch(segment.path);
            uses.set(use.content, use.fact);
          }
          const row = { seq: entry.seq, hash: entryHash(entry), bytes }; entries.push(row); local.push(row); lastTime = timeMs(entry.time);
        }
      }
      if (entries.length !== pass.through.seq + 1 || entries.at(-1)?.hash !== pass.through.hash) return mismatch("pass head");
      for (const row of pass.omitted) if (row.bytes !== undefined && row.first) {
        if (!named.get(row.first.seq)?.has(row.digest)) return refuseJournal("tree", "unreferenced text omission");
        const previous = omittedSizes.get(row.digest);
        if (previous !== undefined && previous !== row.bytes) return mismatch("omission byte count");
        omittedSizes.set(row.digest, row.bytes);
        omittedTexts.push(Object.freeze({ digest: row.digest, bytes: row.bytes, first: Object.freeze({ ...row.first }) }));
      }
      const size = local.reduce((sum, entry) => sum + utf8(entry.bytes).length, 0) + Math.max(0, local.length - 1);
      work.input(size, 8); work.metadata(local.length * 64);
      const canonical = archiveSegments(local, size);
      if (canonical.length !== segments.length || canonical.some((segment, i) => journalV2SegmentPath(first, segment.first) !== segments[i]!.path)) return mismatch("segment layout");
      const copyNames = new Set(pass.retained.filter(key => key.kind === "entry").map(key => key.digest));
      if (copyNames.size !== uses.size) return mismatch("foreign copy count");
      for (const held of pass.retained) if (held.kind === "entry") {
        const fact = uses.get(held.digest), bytes = retained.get(journalKeyName(held))?.bytes;
        if (!fact || !bytes) return mismatch("foreign copy");
        const entry = parseStrict(bytes), pin = basis.get(canonicalize(fact.at));
        if (!isEntry(entry) || !pin || !sameJournalScope(entry.at, fact.at) || entry.seq !== fact.seq || entryHash(entry) !== fact.hash) return mismatch("foreign copy");
        if (entry.seq === 0 ? entry.input.type !== "genesis" || entry.prev !== null || entry.input.seed.definition !== pin || entry.input.inc !== entry.at.inc || entry.input.seed.kind !== entry.at.kind || scopeIdOf(entry.input.seed) !== entry.at.scope : entry.input.type === "genesis") return mismatch("foreign birth");
        usedSources.add(canonicalize(fact.at));
      }
      if (basis.size !== usedSources.size) return mismatch("foreign source basis");
      for (const source of pass.foreignSources ?? []) {
        const key = canonicalize(source.at), prior = sources.get(key);
        if (prior && prior.pin !== source.pin) return mismatch("foreign source pin"); sources.set(key, source);
      }
    }
    if (segmentIndex !== segmentRows.length || actual.size !== expected.size || [...actual.keys()].some(path => !expected.has(path)) || lastTime === null || Math.floor(lastTime / 1000) !== commit.seconds) return mismatch("archive files or time");
    const genesis = parseStrict(entries[0]!.bytes);
    let name: string | null = null;
    if (isEntry(genesis) && genesis.input.type === "genesis") {
      const pin = genesis.input.seed.definition;
      if (pin.startsWith("platform:")) name = pin.slice(0, pin.lastIndexOf("@"));
      else {
        const definition = retained.get(journalKeyName({ kind: "definition", digest: pin as Digest }));
        const data = definition ? parseStrict(definition.bytes) : null;
        if (data && typeof data === "object" && "name" in data && typeof data.name === "string") name = data.name;
      }
    }
    const publication = readJournalAnchorPublication(passes, [head.scope, ...[...sources.values()]
      .filter(source => source.at.kind !== "register" && source.at.kind !== "membership").map(source => source.at)], id, work);
    work.check();
    return { ok: true, archive: Object.freeze({ scope: Object.freeze({ ...head.scope }), head: Object.freeze({ seq: head.through, hash: head.hash }), format, commit: id, name,
      entries: Object.freeze(entries.map(entry => Object.freeze(entry))), retained: Object.freeze([...retained.values()].map(input => Object.freeze(input))),
      ...(omittedTexts.length ? { omittedTexts: Object.freeze(omittedTexts) } : {}),
      ...publication,
      ...(sources.size ? { foreignSources: Object.freeze([...sources.values()].map(source => Object.freeze({ at: Object.freeze({ ...source.at }), pin: source.pin }))) } : {}) }) };
  } catch (error) {
    const reason = error && typeof error === "object" && "reason" in error ? error.reason : "unavailable";
    const result = reason === "limit" || reason === "timeout" || reason === "unavailable" ? reason : error instanceof JournalLayoutRefusal ? reason === "tree" ? "refused" : "mismatch" : "unavailable";
    return { ok: false, result, reason: error instanceof Error ? error.message : "archive read is unavailable", location };
  }
}

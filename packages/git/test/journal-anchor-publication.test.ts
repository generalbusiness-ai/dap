/** Real archive encoders/readers over synthetic signed input selections.
 * These caller-word lists confer no Native privacy or authority proof. */
import { expect, test } from "vitest";
import type { Entry, FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { readJournalArchiveV2 } from "../src/journal-v2-reader.ts";
import { JournalObjectReader, JournalObjects, type JournalObject } from "../src/journal-objects.ts";
import { journalKeyName } from "../src/journal-selection.ts";
import { journalV2PassPath } from "../src/journal-v2-path.ts";
import { JournalWork } from "../src/journal-work.ts";
import { journalAnchors, type JournalAnchorPublication } from "../src/journal-anchors.ts";
import { selectedInput, syntheticJournal } from "./support/journal.ts";

// Missing is different from an explicitly empty, validated publication;
// a later whole-prefix publication covers exactly the legacy range.
test("v2 clone metadata exposes missing publication and a later complete legacy publication", async () => {
  const fixture = syntheticJournal(3), objects = new Map<string, JournalObject>();
  let current: string | null = null;
  const source = { object: async (id: string, limit: number) => {
    const object = objects.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } };
  const make = async (seq: number, publication?: JournalAnchorPublication) => {
    const budget = new ArchiveBudget({}, () => 0), calls: string[] = [];
    const selected = fixture.description.objects.filter(row => row.consumers.some(raw => (raw as { origin: { at: { seq: number } } }).origin.at.seq === seq));
    budget.spend({ entries: 1, attempts: selected.length });
    let finalized = 0;
    const built = await buildJournalPass({ format: "sha1", selection: canonicalize({ ...fixture.description,
      format: "artroom-local-inventory-2", after: seq ? { seq: seq - 1, hash: fixture.description.entries[seq - 1]!.hash } : null,
      through: { seq, hash: fixture.description.entries[seq]!.hash }, entries: [fixture.description.entries[seq]],
      objects: selected.map(row => ({ ...row, pass: seq })), omittedTexts: seq === 0 ? fixture.description.omittedTexts : [], cost: budget.admitted(),
    }), input: selectedInput(fixture, calls), parent: current ? { id: current, source } : null, budget,
    ...(publication ? { publication: () => {
      finalized++; expect(calls).toContain(`entry:${seq}`); return publication;
    } } : {}) });
    expect(built.ok ? "accepted" : built).toBe("accepted");
    if (!built.ok) throw new Error(JSON.stringify(built));
    expect(finalized).toBe(publication ? 1 : 0);
    for (const object of built.archive.objects) objects.set(object.id, object);
    current = built.archive.commit; return built.archive;
  };
  const read = () => {
    const budget = Object.assign(new ArchiveBudget({}, () => 0), { scope() {}, bytes(_size: number) {} });
    return readJournalArchiveV2({ format: async () => "sha1", resolve: async () => current,
      object: (id, limit) => source.object(id, limit) }, fixture.at.scope, budget);
  };
  await make(0);
  expect(await read()).toMatchObject({ ok: true, archive: { publishedAnchors: [], anchorCoverage: {
    covered: false, unpublished: [{ commit: current, from: 0, through: 0 }], legacy: [],
  } } });
  const marked = await make(1, { anchors: [], legacyAnchors: { from: 0, through: 0, anchors: [] } });
  expect(marked.manifest).toHaveProperty("anchors", []);
  expect(marked.manifest).toHaveProperty("legacyAnchors", { from: 0, through: 0, anchors: [] });
  expect(await read()).toMatchObject({ ok: true, archive: { publishedAnchors: [], anchorCoverage: {
    covered: true, unpublished: [], legacy: [{ pass: 1, commit: current, from: 0, through: 0 }],
  } } });
  await make(2, { anchors: [] });
  expect(await read()).toMatchObject({ ok: true, archive: { anchorCoverage: { covered: true, unpublished: [] } } });
});

// The parser refuses bad list identity/order rather than silently repairing
// it. The clone reader invokes this same admission on every pass list.
test("published lists refuse archived journals, duplicate positions, order changes and unknown fields", () => {
  const own = syntheticJournal(), other = syntheticJournal(1, 2, 2);
  const first: FactRef = { at: other.at, seq: 0, hash: other.description.entries[0]!.hash };
  const later = { ...first, seq: 1 };
  const check = (list: unknown) => journalAnchors(list, 3, new JournalWork(new ArchiveBudget({}, () => 0)), [own.at]);
  expect(check([first, later])).toEqual([first, later]);
  for (const list of [[{ at: own.at, seq: 0, hash: own.description.entries[0]!.hash }], [first, first], [later, first],
    [{ ...first, extra: true }], [{ ...first, at: { ...first.at, kind: "lane" } }]]) expect(() => check(list)).toThrow();
  expect(journalAnchors([first], 0, new JournalWork(new ArchiveBudget({}, () => 0)))).toEqual([first]);
  expect(() => journalAnchors([first], 0, new JournalWork(new ArchiveBudget({ metadata: 511 }, () => 0)))).toThrow("limit");
});

test("a nonempty publication survives the actual reader, which refuses malformed integrity-bound lists", async () => {
  const fixture = syntheticJournal(), foreign = [syntheticJournal(1, 2, 2), syntheticJournal(1, 3, 3)];
  const facts = foreign.map(f => ({ at: f.at, seq: 0, hash: f.description.entries[0]!.hash }))
    .sort((a, b) => a.at.scope < b.at.scope ? -1 : 1);
  const entry = JSON.parse(fixture.bodies[0]!) as Entry;
  entry.uses = foreign.map(f => ({ fact: { at: f.at, seq: 0, hash: f.description.entries[0]!.hash }, content: digestBytes(utf8(f.bodies[0]!)) }));
  const bytes = canonicalize(entry), hash = entryHash(entry);
  fixture.bodies[0] = bytes; fixture.description.entries[0] = { seq: 0, hash, bytes: utf8(bytes).length };
  for (const row of fixture.description.objects) for (const raw of row.consumers) (raw as { origin: { at: { hash: string } } }).origin.at.hash = hash;
  for (const row of fixture.description.omittedTexts) row.origin.at.hash = hash;
  const copies = foreign.map(f => {
    const key = { kind: "entry" as const, digest: digestBytes(utf8(f.bodies[0]!)) };
    fixture.retained.set(journalKeyName(key), f.bodies[0]!);
    return { key, bytes: utf8(f.bodies[0]!).length, pass: 0,
      foreign: { fact: { at: f.at, seq: 0, hash: f.description.entries[0]!.hash }, pin: "platform:register@1" },
      consumers: [{ mode: "required", origin: { at: { at: fixture.at, seq: 0, hash }, input: "genesis" },
        consumer: "foreign-use", purpose: "replay-required", key }] };
  });
  const budget = new ArchiveBudget({}, () => 0); budget.spend({ entries: 1, attempts: copies.length + fixture.description.objects.length });
  const built = await buildJournalPass({ format: "sha1", selection: canonicalize({ ...fixture.description,
    format: "artroom-local-inventory-2", after: null, through: { seq: 0, hash },
    objects: [...fixture.description.objects.map(row => ({ ...row, pass: 0 })), ...copies],
    foreignSources: foreign.map(f => ({ at: f.at, pin: "platform:register@1" })).sort((a, b) => canonicalize(a.at) < canonicalize(b.at) ? -1 : 1),
    cost: budget.admitted(),
  }), input: selectedInput(fixture), parent: null, budget, publication: () => ({ anchors: facts }) });
  expect(built.ok ? "accepted" : built).toBe("accepted"); if (!built.ok) return;
  const objects = new Map(built.archive.objects.map(object => [object.id, object]));
  const source = { object: async (id: string, limit: number) => {
    const object = objects.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } };
  const read = (commit: string) => readJournalArchiveV2({ format: async () => "sha1", resolve: async () => commit,
    object: (id, limit) => source.object(id, limit) }, fixture.at.scope,
    Object.assign(new ArchiveBudget({}, () => 0), { scope() {}, bytes(_size: number) {} }));
  expect(await read(built.archive.commit)).toMatchObject({ ok: true, archive: { publishedAnchors: facts, anchorCoverage: { covered: true } } });
  const rewrite = async (anchors: unknown) => {
    const work = new JournalWork(new ArchiveBudget({}, () => 0)), reader = new JournalObjectReader("sha1", source, work), maker = new JournalObjects("sha1", work);
    const commit = reader.commit(await reader.read(built.archive.commit, "commit", 1024));
    const blob = maker.make("blob", utf8(canonicalize({ ...built.archive.manifest, anchors })));
    const replace = async (tree: string, parts: readonly string[]): Promise<string> => {
      const rows = reader.tree(await reader.read(tree, "tree"));
      const changed = [];
      for (const row of rows) changed.push(row.name !== parts[0] ? row : { ...row, id: parts.length === 1 ? blob.id : await replace(row.id, parts.slice(1)) });
      return maker.tree(changed).id;
    };
    const tree = await replace(commit.tree, journalV2PassPath(0).split("/"));
    const changed = maker.commit(tree, commit.parent, commit.seconds);
    for (const object of maker.objects()) objects.set(object.id, object);
    return changed.id;
  };
  for (const anchors of [[facts[0], facts[0]], [...facts].reverse(), [{ at: fixture.at, seq: 0, hash }]]) {
    expect(await read(await rewrite(anchors))).toMatchObject({ ok: false, result: "refused" });
  }
});

/** Mechanical Git-object witness, not native confirmation or replay. Each
 * update uses the native pass budget; file bodies are labelled stand-ins. */
import { expect, test } from "vitest";
import { textDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { ArchiveBudget, type ArchiveCost } from "../../scope/src/archive-budget.ts";
import { JournalObjectReader, JournalObjects, type JournalObject } from "../src/journal-objects.ts";
import { JournalWork } from "../src/journal-work.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath, readJournalV2Path } from "../src/journal-v2-path.ts";
import { JournalV2TreePatch, patchJournalV2Tree } from "../src/journal-v2-tree.ts";

const testPassFiles = (n: number) => [{ path: "journal/v2/head.json", data: utf8(`TEST head ${n}`) },
  { path: journalV2PassPath(n), data: utf8(`TEST pass ${n}`) }, { path: journalV2SegmentPath(n), data: utf8(`TEST entry ${n}`) },
  { path: journalV2RetainedPath(n, { kind: "rule", digest: textDigest(`TEST key ${n}`) }), data: utf8(`TEST retained ${n}`) }];

test("one tree patch prepares parent metadata before payload, keeps original debits, and emits only the selected prepared paths", async () => {
  const held = new Map<string, JournalObject>();
  const baseWork = new JournalWork(new ArchiveBudget({}, () => 0)), baseMaker = new JournalObjects("sha1", baseWork);
  const parent = await patchJournalV2Tree(null, null, testPassFiles(0), baseMaker, baseWork);
  for (const object of baseMaker.objects()) held.set(object.id, object);
  const read: string[] = [], budget = new ArchiveBudget({}, () => 0), work = new JournalWork(budget), maker = new JournalObjects("sha1", work);
  const reader = new JournalObjectReader("sha1", { object: async (id, limit) => {
    read.push(id); const object = held.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } }, work);
  const selected = testPassFiles(1), patch = new JournalV2TreePatch(reader, parent, work);
  const paths = selected.slice(0, 3).map(file => file.path), preparing = patch.prepare(paths);
  paths.push(journalV2RetainedPath(1, { kind: "rule", digest: textDigest("TEST caller mutation during await") }));
  await preparing;
  await patch.prepare([selected[3]!.path, journalV2RetainedPath(1, { kind: "rule", digest: textDigest("TEST discarded candidate") })]);
  expect(maker.objects()).toEqual([]); // Preparation has constructed no blob/tree payloads.
  const reads = read.length, prepared = budget.admitted();
  const tree = patch.finish(selected, maker), objects = maker.objects(), cost = budget.admitted();
  // Pinned against the pre-split encoder on these TEST Git bodies. This is
  // not a journal, native confirmation or replay witness.
  expect(tree).toBe("fa69a1712244eadddb530fb92076b5ec00037b3c");
  expect(objects).toHaveLength(21);
  expect(read.length).toBe(reads); expect(reads).toBe(30);
  expect(read.every(id => held.get(id)?.type === "tree")).toBe(true);
  expect(cost.nodes).toBe(prepared.nodes); expect(cost.nodes).toBe(17);
  expect(work.used.files).toBe(5); // The unselected path is not refunded.
  const original: ArchiveCost = { entries: 0, attempts: 15, nodes: 17, calls: 30, metadata: 32266, inputWork: 42485 };
  for (const key of Object.keys(original) as (keyof ArchiveCost)[]) expect(cost[key]).toBeGreaterThanOrEqual(original[key]);
  expect(() => patch.finish(selected, maker)).toThrow("unavailable");
});

test("the one-call tree encoder owns file paths and bytes before awaiting parent metadata", async () => {
  const held = new Map<string, JournalObject>(), baseWork = new JournalWork(new ArchiveBudget({}, () => 0)), baseMaker = new JournalObjects("sha1", baseWork);
  const parent = await patchJournalV2Tree(null, null, testPassFiles(0), baseMaker, baseWork);
  for (const object of baseMaker.objects()) held.set(object.id, object);
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  const work = new JournalWork(new ArchiveBudget({}, () => 0)), maker = new JournalObjects("sha1", work);
  const reader = new JournalObjectReader("sha1", { object: async (id, limit) => {
    entered(); await gate;
    const object = held.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } }, work);
  const files = testPassFiles(1), pending = patchJournalV2Tree(reader, parent, files, maker, work);
  await started;
  files[3]!.data.fill(0);
  files[3]!.path = journalV2RetainedPath(2, { kind: "rule", digest: textDigest("TEST replacement path") });
  release();
  expect(await pending).toBe("fa69a1712244eadddb530fb92076b5ec00037b3c");
  expect(maker.objects().some(object => object.type === "blob" && new TextDecoder().decode(object.data) === "TEST retained 1")).toBe(true);
});

test("a prepared tree patch refuses reader or maker counters from a different work session", async () => {
  const work = new JournalWork(new ArchiveBudget({}, () => 0)), other = new JournalWork(new ArchiveBudget({}, () => 0));
  const reader = new JournalObjectReader("sha1", { object: async () => null }, other);
  expect(() => new JournalV2TreePatch(reader, "0".repeat(40), work)).toThrow("parent");
  const patch = new JournalV2TreePatch(null, null, work);
  await patch.prepare(["journal/v2/head.json"]);
  expect(() => patch.finish([{ path: "journal/v2/head.json", data: utf8("TEST body") }], new JournalObjects("sha1", other))).toThrow("parent");
});

test("v2 edits only the new pass paths after ten thousand passes and never relocates earlier retained files", async () => {
  const held = new Map<string, JournalObject>(), read: string[] = [];
  let tree: string | null = null;
  const source = { object: async (id: string, limit: number) => {
    read.push(id); const object = held.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } };
  const key = { kind: "rule" as const, digest: textDigest("TEST retained at 3700") };
  const earlier = journalV2RetainedPath(3700, key);
  let firstRetained: string | undefined;
  const update = async (first: number, extra: readonly { path: string; data: Uint8Array }[] = []) => {
    const budget = new ArchiveBudget({}, () => 0), work = new JournalWork(budget), maker = new JournalObjects("sha1", work);
    read.length = 0;
    const files = [{ path: "journal/v2/head.json", data: utf8(`TEST head ${first}`) },
      { path: journalV2PassPath(first), data: utf8(`TEST pass ${first}`) },
      { path: journalV2SegmentPath(first), data: utf8(`TEST entry ${first}`) }, ...extra];
    tree = await patchJournalV2Tree(tree ? new JournalObjectReader("sha1", source, work) : null, tree, files, maker, work);
    for (const id of read) expect(held.get(id)?.type).toBe("tree");
    for (const object of maker.objects()) held.set(object.id, object);
    return { work: { ...work.used }, cost: budget.admitted(), files };
  };
  for (let n = 0; n < 10_000; n++) {
    await update(n, n === 3700 ? [{ path: earlier, data: utf8("TEST retained at 3700") }] : []);
    if (n === 3700) firstRetained = [...held.values()].find(object => object.type === "blob" && new TextDecoder().decode(object.data) === "TEST retained at 3700")!.id;
  }
  const after = await update(10_000);
  // At most root/journal/v2 plus four trees per added pass/segment path.
  // The read count and rewrite count include repeated names, not unique IDs.
  expect(after.cost.nodes).toBeLessThanOrEqual(13);
  expect(after.work.names).toBeLessThanOrEqual(4096);
  expect(read).not.toContain(firstRetained);
  for (let n = 0; n < 9; n++) {
    const first = 10_001 + n;
    await update(first, Array.from({ length: 512 }, (_, i) => ({
      path: journalV2RetainedPath(first, { kind: "rule", digest: textDigest(`TEST ${n}:${i}`) }), data: utf8(`TEST ${n}:${i}`),
    })));
  }
  const final = await update(10_010, [{ path: journalV2RetainedPath(10_010, { kind: "rule", digest: textDigest("TEST final") }), data: utf8("TEST final") }]);
  expect(final.cost.nodes).toBeLessThanOrEqual(19);
  expect(final.work.names).toBeLessThanOrEqual(6144);
  expect(read).not.toContain(firstRetained);
  expect(earlier).toBe(`journal/v2/retained/000/000/003/000000003700/rule/${key.digest.slice(7)}`);
  expect(readJournalV2Path(earlier)).toEqual({ kind: "retained", first: 3700, key });
  expect(readJournalV2Path(earlier.replace("/003/", "/004/"))).toBeNull();
  expect(() => journalV2PassPath(1_000_000_000_000)).toThrow("limit");
  const work = new JournalWork(new ArchiveBudget({}, () => 0)), maker = new JournalObjects("sha1", work);
  await expect(patchJournalV2Tree(new JournalObjectReader("sha1", source, work), tree,
    [{ path: earlier, data: utf8("TEST replacement") }], maker, work)).rejects.toThrow("parent");
}, 60_000);

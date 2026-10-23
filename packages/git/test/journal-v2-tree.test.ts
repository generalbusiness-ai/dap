/** Mechanical Git-object witness, not native confirmation or replay. Each
 * update uses the native pass budget; file bodies are labelled stand-ins. */
import { expect, test } from "vitest";
import { textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget, type ArchiveCost } from "../../scope/src/archive-budget.ts";
import { JournalObjectReader, JournalObjects, type JournalObject, type JournalTreeRow } from "../src/journal-objects.ts";
import { JournalWork } from "../src/journal-work.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath, readJournalV2Path } from "../src/journal-v2-path.ts";
import { JournalV2TreePatch, patchJournalV2Tree } from "../src/journal-v2-tree.ts";

const testPassFiles = (n: number) => [{ path: "journal/v2/head.json", data: utf8(`TEST head ${n}`) },
  { path: journalV2PassPath(n), data: utf8(`TEST pass ${n}`) }, { path: journalV2SegmentPath(n), data: utf8(`TEST entry ${n}`) },
  { path: journalV2RetainedPath(n, { kind: "rule", digest: textDigest(`TEST key ${n}`) }), data: utf8(`TEST retained ${n}`) }];

class ProbedObjects extends JournalObjects {
  maximumNumericRows = 0;
  override tree(rows: readonly JournalTreeRow[]) {
    if (rows.length > 0 && rows.every(row => row.mode === "40000" && /^[0-9]+$/.test(row.name))) {
      expect(rows.every(row => row.name.length === 2 || row.name.length === 12)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(100);
      this.maximumNumericRows = Math.max(this.maximumNumericRows, rows.length);
    }
    return super.tree(rows);
  }
}

test("one tree patch prepares parent metadata before payload, keeps original debits, and emits only the selected prepared paths", async context => {
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
  const forecast = patch.forecast("sha1", selected.map(file => ({ path: file.path, bytes: file.data.length })));
  expect(forecast.ok).toBe(true); if (!forecast.ok) return;
  expect(read.length).toBe(reads); expect(maker.objects()).toEqual([]);
  const beforeFinish = budget.admitted(), beforeLayout = { ...work.used };
  const tree = patch.finish(selected, maker), objects = maker.objects(), cost = budget.admitted();
  (context.task.meta as Record<string, unknown>)["sharedPassPatchGeometry"] = { tree, objects: objects.length, reads, nodes: cost.nodes,
    cost, delta: Object.fromEntries(Object.keys(cost).map(key => [key, cost[key as keyof ArchiveCost] - beforeFinish[key as keyof ArchiveCost]])),
    forecast: forecast.cost, qualification: "NEW f651 geometry, unchanged original fees. Mechanical TEST blobs; not native history/admission/export." };
  // New shared-pass geometry measured separately from the original fee
  // extraction. The old layout receipt remains in the closed evidence;
  // its larger tree count is not a fee floor for this different layout.
  const finishCost: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 14520, inputWork: 18294 };
  expect(forecast.cost).toEqual(finishCost);
  for (const key of Object.keys(finishCost) as (keyof ArchiveCost)[]) expect(cost[key] - beforeFinish[key]).toBe(finishCost[key]);
  for (const key of ["objects", "trees", "names", "outputWork"] as const) expect(work.used[key] - beforeLayout[key]).toBe(forecast.layoutWork[key]);
  // Pinned against the shared-pass encoder on these TEST Git bodies. This is
  // not a journal, native confirmation or replay witness.
  expect(tree).toBe("e1bf771d42830d1d2acfee7eff1935c8f81a41f6");
  expect(objects).toHaveLength(15);
  expect(read.length).toBe(reads); expect(reads).toBe(18);
  expect(read.every(id => held.get(id)?.type === "tree")).toBe(true);
  expect(cost.nodes).toBe(prepared.nodes); expect(cost.nodes).toBe(11);
  expect(work.used.files).toBe(5); // The unselected path is not refunded.
  expect(cost).toEqual({ entries: 0, attempts: 9, nodes: 11, calls: 18, metadata: 26617, inputWork: 34778 });
  expect(() => patch.finish(selected, maker)).toThrow("unavailable");
});

test.each(["sha1", "sha256"] as const)("a future patch ceiling leaves the same prepared session usable for a smaller whole file set in %s", async format => {
  // A lowered layout ceiling, not a native cutoff/privacy witness. All
  // candidate metadata work stays charged when the smaller set is chosen.
  const budget = new ArchiveBudget({}, () => 0), work = new JournalWork(budget, { objects: 14 });
  const patch = new JournalV2TreePatch(null, null, work), files = testPassFiles(0);
  await patch.prepare(files.map(file => file.path));
  const sizes = files.map(file => ({ path: file.path, bytes: file.data.length }));
  expect(patch.forecast(format, sizes)).toEqual({ ok: false, reason: "limit" });
  const spent = budget.admitted(), forecast = patch.forecast(format, sizes.slice(0, 3));
  expect(forecast.ok).toBe(true); if (!forecast.ok) return;
  expect(budget.admitted().metadata).toBeGreaterThan(spent.metadata);
  const start = budget.admitted(), maker = new JournalObjects(format, work);
  patch.finish(files.slice(0, 3), maker); const objects = maker.objects(), cost = budget.admitted();
  expect(objects).toHaveLength(13); expect(work.used.files).toBe(4);
  expect(objects.some(object => object.type === "blob" && new TextDecoder().decode(object.data) === "TEST retained 0")).toBe(false);
  for (const key of Object.keys(start) as (keyof ArchiveCost)[]) expect(cost[key] - start[key]).toBeLessThanOrEqual(forecast.cost[key]);
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
  expect(await pending).toBe("e1bf771d42830d1d2acfee7eff1935c8f81a41f6");
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

test("v2 edits only the new pass paths after ten thousand passes and never relocates earlier retained files", async context => {
  const held = new Map<string, JournalObject>(), read: string[] = [];
  const treePatchNodes: number[] = []; let maximumNumericRows = 0;
  let tree: string | null = null;
  const source = { object: async (id: string, limit: number) => {
    read.push(id); const object = held.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
  } };
  const key = { kind: "rule" as const, digest: textDigest("TEST retained at 3700") };
  const earlier = journalV2RetainedPath(3700, key);
  let firstRetained: string | undefined;
  const update = async (first: number, extra: readonly { path: string; data: Uint8Array }[] = []) => {
    const budget = new ArchiveBudget({}, () => 0), work = new JournalWork(budget), maker = new ProbedObjects("sha1", work);
    read.length = 0;
    const files = [{ path: "journal/v2/head.json", data: utf8(`TEST head ${first}`) },
      { path: journalV2PassPath(first), data: utf8(`TEST pass ${first}`) },
      { path: journalV2SegmentPath(first), data: utf8(`TEST entry ${first}`) }, ...extra];
    tree = await patchJournalV2Tree(tree ? new JournalObjectReader("sha1", source, work) : null, tree, files, maker, work);
    for (const id of read) expect(held.get(id)?.type).toBe("tree");
    for (const object of maker.objects()) held.set(object.id, object);
    treePatchNodes.push(budget.admitted().nodes); maximumNumericRows = Math.max(maximumNumericRows, maker.maximumNumericRows);
    return { work: { ...work.used }, cost: budget.admitted(), files };
  };
  for (let n = 0; n < 10_000; n++) {
    await update(n, n === 3700 ? [{ path: earlier, data: utf8("TEST retained at 3700") }] : []);
    if (n === 3700) firstRetained = [...held.values()].find(object => object.type === "blob" && new TextDecoder().decode(object.data) === "TEST retained at 3700")!.id;
  }
  const after = await update(10_000);
  // One shared numeric path, including the new p4 pair at10,000.
  // This remains a tree-patch fixture, not native confirmed passes.
  expect(after.cost.nodes).toBe(10);
  expect(journalV2PassPath(10_000)).toBe("journal/v2/passes/00/00/00/01/00/000000010000/pass.json");
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
  expect(earlier).toBe(`journal/v2/passes/00/00/00/00/37/000000003700/rule/${key.digest.slice(7)}`);
  expect(readJournalV2Path(earlier)).toEqual({ kind: "retained", first: 3700, key });
  expect(readJournalV2Path(earlier.replace("/37/", "/38/"))).toBeNull();
  expect(() => journalV2PassPath(1_000_000_000_000)).toThrow("limit");
  const work = new JournalWork(new ArchiveBudget({}, () => 0)), maker = new JournalObjects("sha1", work);
  await expect(patchJournalV2Tree(new JournalObjectReader("sha1", source, work), tree,
    [{ path: earlier, data: utf8("TEST replacement") }], maker, work)).rejects.toThrow("parent");
  expect(maximumNumericRows).toBe(100);
  (context.task.meta as Record<string, unknown>)["sharedPassNumericTrees"] = { treePatchNodes, maximumNumericRows,
    at10000: after.cost.nodes, at10010: final.cost.nodes,
    qualification: "Mechanical tree patches and explicitly TEST-labelled file bodies. Original work caps, frozen test clock as in this existing fixture. Omits commits, receipt checks, native inventory, at-send validation and host confirmation; not10,000nativeconfirmedpasses. Tree override observes real writer rows and forwards every actual construction." };
}, 60_000);

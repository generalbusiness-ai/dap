/** Mechanical Git witnesses only. No Native admission, host response or
 * confirmation is claimed by these fixtures. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { JournalObjectReader, JournalObjects, type JournalFormat, type JournalObject, type JournalObjectSource } from "../src/journal-objects.ts";
import { JournalWork } from "../src/journal-work.ts";
import { patchJournalV2Tree } from "../src/journal-v2-tree.ts";
import { journalV2PassPath, journalV2RetainedPath } from "../src/journal-v2-path.ts";
import { captureJournalParentFrontier, validateJournalParentFrontier, forecastJournalParentFrontier, JOURNAL_PARENT_FRONTIER_BYTES, JOURNAL_PARENT_FRONTIER_OBJECTS, JOURNAL_PARENT_FRONTIER_ROWS, type JournalParentBinding, type JournalParentFrontier } from "../src/journal-v2-frontier.ts";
import { syntheticJournal } from "./support/journal.ts";

const at = syntheticJournal().at;
const repository = digestBytes(utf8(canonicalize({ host: "TEST host", namespace: "TEST namespace", name: "TEST repository", id: "TEST repository" })));
const budget = () => new ArchiveBudget({}, () => 0);
function source(objects: readonly JournalObject[], reads: string[] = []): JournalObjectSource {
  const held = new Map(objects.map(object => [object.id, object]));
  return { object: async (id, maximum) => {
    reads.push(id); const object = held.get(id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
  } };
}
async function pass(format: JournalFormat, first = 0, through = first, parent: JournalParentFrontier | null = null, headText?: string) {
  const work = new JournalWork(budget()), maker = new JournalObjects(format, work);
  const head = { seq: through, hash: digestBytes(utf8(`TEST head ${through}`)) };
  const files = [{ path: "journal/v2/head.json", data: utf8(headText ?? canonicalize({ v: 2, scope: at, through, hash: head.hash })) },
    { path: journalV2PassPath(first), data: utf8(`TEST manifest ${first}`) },
    ...[0, 1].map(n => ({ path: journalV2RetainedPath(first, { kind: "rule", digest: digestBytes(utf8(`TEST retained ${first}:${n}`)) }),
      data: utf8(`TEST body ${first}:${n}`) }))];
  const reader = parent ? new JournalObjectReader(format, source(parent.objects), work) : null;
  const tree = await patchJournalV2Tree(reader, parent ? reader!.commit(parent.objects[0]!.data).tree : null, files, maker, work);
  const commit = maker.commit(tree, parent?.commit ?? null, 1_700_000_000 + first).id;
  const objects = maker.objects(), binding: JournalParentBinding = { format, repository, at, through: head, commit };
  return { binding, objects, files, tree };
}

test.each(["sha1", "sha256"] as const)("a %s native parent witness owns only eleven receipt-bound objects and no old payload", async format => {
  const made = await pass(format), reads: string[] = [];
  const frontier = await captureJournalParentFrontier(made.binding, source(made.objects, reads), budget());
  expect(frontier.first).toBe(0);
  expect(frontier.objects).toHaveLength(JOURNAL_PARENT_FRONTIER_OBJECTS);
  expect(frontier.objects.map(object => object.type)).toEqual(["commit", ...Array<string>(9).fill("tree"), "blob"]);
  expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(JOURNAL_PARENT_FRONTIER_BYTES);
  const bodies = made.objects.filter(object => object.type === "blob" && object.id !== frontier.objects.at(-1)!.id);
  expect(bodies.length).toBeGreaterThanOrEqual(3);
  expect(reads.some(id => bodies.some(object => object.id === id))).toBe(false);
  expect(await validateJournalParentFrontier(frontier, made.binding, budget())).toEqual(frontier);
  const original = frontier.objects[0]!.data[0];
  made.objects.find(object => object.id === frontier.commit)!.data.fill(0);
  expect(frontier.objects[0]!.data[0]).toBe(original);
});

test("a stored frontier refuses changed custody, head, schema, object bytes, count and order", async () => {
  const made = await pass("sha1"), frontier = await captureJournalParentFrontier(made.binding, source(made.objects), budget());
  const changed = new Uint8Array(frontier.objects[0]!.data); changed[0] = changed[0]! ^ 1;
  const mutants: { value: unknown; reason: string }[] = [
    { value: { ...frontier, repository: digestBytes(utf8("TEST other repository")) }, reason: "parent" },
    { value: { ...frontier, at: { ...frontier.at, inc: syntheticJournal(1, 2).at.inc } }, reason: "parent" },
    { value: { ...frontier, through: { ...frontier.through, hash: digestBytes(utf8("TEST different head")) } }, reason: "parent" },
    { value: { ...frontier, commit: "f".repeat(40) }, reason: "parent" },
    { value: { ...frontier, first: -0 }, reason: "parent" },
    { value: { ...frontier, extra: true }, reason: "input" },
    { value: { ...frontier, objects: frontier.objects.slice(1) }, reason: "parent" },
    { value: { ...frontier, objects: [...frontier.objects, frontier.objects[0]] }, reason: "parent" },
    { value: { ...frontier, objects: [...frontier.objects].reverse() }, reason: "parent" },
    { value: { ...frontier, objects: [{ ...frontier.objects[0]!, data: changed }, ...frontier.objects.slice(1)] }, reason: "object-mismatch" },
  ];
  // Zero is the valid first pass, but negative zero has no canonical position.
  for (const mutant of mutants) await expect(validateJournalParentFrontier(mutant.value, made.binding, budget())).rejects.toMatchObject({ reason: mutant.reason });
  await expect(validateJournalParentFrontier(frontier, made.binding, budget(), null)).resolves.toEqual(frontier);
  await expect(validateJournalParentFrontier(frontier, made.binding, budget(), "f".repeat(40))).rejects.toMatchObject({ reason: "parent" });
  const appended = await pass("sha1", 1, 1, frontier);
  const next = await captureJournalParentFrontier(appended.binding, source(appended.objects), budget());
  await expect(validateJournalParentFrontier(next, appended.binding, budget(), frontier.commit)).resolves.toEqual(next);
  await expect(validateJournalParentFrontier(next, appended.binding, budget(), null)).rejects.toMatchObject({ reason: "parent" });
  const checked = await validateJournalParentFrontier(frontier, made.binding, budget());
  frontier.objects[0]!.data.fill(0);
  expect(checked.objects[0]!.data).not.toEqual(frontier.objects[0]!.data);
});

test("the bounded frontier carries unchanged subtrees across numeric rollovers without reading old pass leaves", async () => {
  let frontier: JournalParentFrontier | null = null;
  const all = new Map<string, JournalObject>();
  const ranges = [[0, 98], [99, 99], [100, 4095], [4096, 8191], [8192, 9999], [10000, 10000]] as const;
  for (const [first, through] of ranges) {
    const made = await pass("sha1", first, through, frontier);
    for (const object of made.objects) all.set(object.id, object);
    const read: string[] = [];
    frontier = await captureJournalParentFrontier(made.binding, source(made.objects, read), budget());
    expect(frontier.first).toBe(first);
    expect(frontier.objects).toHaveLength(11);
    expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(28_828);
  }
  // Walk all old paths through the general reader, not the frontier extractor.
  const reader = new JournalObjectReader("sha1", source([...all.values()]), new JournalWork(budget()));
  const root = reader.commit(await reader.read(frontier!.commit, "commit", 1024)).tree;
  for (const [first] of ranges) {
    let id = root;
    for (const name of journalV2PassPath(first).split("/")) {
      const rows = reader.tree(await reader.read(id, "tree"));
      const row = rows.find(row => row.name === name); expect(row, `Preserve pass ${first}`).toBeDefined(); id = row!.id;
    }
    expect(new TextDecoder().decode(await reader.read(id, "blob"))).toBe(`TEST manifest ${first}`);
  }
});

test("a frontier refuses a future path or noncanonical head and reserves metadata before source I/O", async () => {
  const future = await pass("sha1", 100, 99);
  await expect(captureJournalParentFrontier(future.binding, source(future.objects), budget())).rejects.toThrow("parent");
  const noncanonical = await pass("sha1", 0, 0, null, JSON.stringify({ v: 2, scope: at, through: 0, hash: digestBytes(utf8("TEST head 0")) }));
  await expect(captureJournalParentFrontier(noncanonical.binding, source(noncanonical.objects), budget())).rejects.toThrow("manifest");
  const normal = await pass("sha1"), reads: string[] = [];
  await expect(captureJournalParentFrontier(normal.binding, source(normal.objects, reads), new ArchiveBudget({ metadata: 0 }, () => 0))).rejects.toThrow("limit");
  expect(reads).toEqual([]);
});


test("the SHA-256 frontier stays within its literal byte bound at all 604 permitted tree rows", async () => {
  const work = new JournalWork(budget()), maker = new JournalObjects("sha256", work);
  const through = { seq: 999_999_999_999, hash: digestBytes(utf8("TEST final head")) };
  const head = maker.make("blob", utf8(canonicalize({ v: 2, scope: at, through: through.seq, hash: through.hash })));
  const opaque = "1".repeat(64);
  let id = maker.tree(Array.from({ length: 100 }, (_, n) => ({ mode: "40000" as const, name: "9999999999" + String(n).padStart(2, "0"), id: opaque }))).id;
  for (let depth = 0; depth < 5; depth++) {
    const next = id;
    id = maker.tree(Array.from({ length: 100 }, (_, n) => ({ mode: "40000" as const, name: String(n).padStart(2, "0"), id: n === 99 ? next : opaque }))).id;
  }
  id = maker.tree([{ mode: "100644", name: "head.json", id: head.id }, { mode: "40000", name: "passes", id }]).id;
  id = maker.tree([{ mode: "40000", name: "v2", id }]).id;
  id = maker.tree([{ mode: "40000", name: "journal", id }]).id;
  const commit = maker.commit(id, null, 1_700_000_000).id;
  const binding: JournalParentBinding = { format: "sha256", repository, at, through, commit };
  const captureBudget = budget(), validationBudget = budget();
  const frontier = await captureJournalParentFrontier(binding, source(maker.objects()), captureBudget);
  await validateJournalParentFrontier(frontier, binding, validationBudget, null);
  for (const [used, forecast] of [[captureBudget.admitted(), forecastJournalParentFrontier()],
    [validationBudget.admitted(), forecastJournalParentFrontier(true)]] as const) {
    for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) expect(used[key]).toBeLessThanOrEqual(forecast[key]);
  }
  expect(frontier.first).toBe(999_999_999_999);
  expect(frontier.objects).toHaveLength(11);
  expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(28_828);
  const reader = new JournalObjectReader("sha256", source(frontier.objects), new JournalWork(budget()));
  expect(frontier.objects.filter(object => object.type === "tree").reduce((n, object) => n + reader.tree(object.data).length, 0)).toBe(JOURNAL_PARENT_FRONTIER_ROWS);
});

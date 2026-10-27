/** Mechanical Git witnesses only. No Native admission, host response or
 * confirmation is claimed by these fixtures. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "../../scope/src/archive-budget.ts";
import { JournalObjectReader, JournalObjects, type JournalFormat, type JournalObject, type JournalObjectSource } from "../src/journal-objects.ts";
import { JournalWork, type JournalCost } from "../src/journal-work.ts";
import { patchJournalV2Tree } from "../src/journal-v2-tree.ts";
import { journalV2PassPath, journalV2RetainedPath } from "../src/journal-v2-path.ts";
import { captureJournalParentFrontier, validateJournalParentFrontier, forecastJournalParentFrontier, journalParentFrontierProfile, JOURNAL_PARENT_FRONTIER_BYTES, JOURNAL_PARENT_FRONTIER_OBJECTS, JOURNAL_PARENT_FRONTIER_ROWS, type JournalParentBinding, type JournalParentFrontier } from "../src/journal-v2-frontier.ts";
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
  const captureBudget = budget(), validationBudget = budget();
  const frontier = await captureJournalParentFrontier(made.binding, source(made.objects, reads), captureBudget);
  expect(frontier.first).toBe(0);
  expect(frontier.objects).toHaveLength(JOURNAL_PARENT_FRONTIER_OBJECTS);
  expect(frontier.objects.map(object => object.type)).toEqual(["commit", ...Array<string>(9).fill("tree"), "blob"]);
  expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(JOURNAL_PARENT_FRONTIER_BYTES);
  const bodies = made.objects.filter(object => object.type === "blob" && object.id !== frontier.objects.at(-1)!.id);
  expect(bodies.length).toBeGreaterThanOrEqual(3);
  expect(reads.some(id => bodies.some(object => object.id === id))).toBe(false);
  expect(await validateJournalParentFrontier(frontier, made.binding, validationBudget)).toEqual(frontier);
  expect(journalParentFrontierProfile(0)).toEqual({ bytes: 3484, rows: 10, through: 0 });
  for (const [used, forecast] of [[captureBudget.admitted(), forecastJournalParentFrontier(false, 0)],
    [validationBudget.admitted(), forecastJournalParentFrontier(true, 0)]] as const)
    for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) expect(used[key]).toBeLessThanOrEqual(forecast[key]);
  expect(captureBudget.admitted().metadata).toBeLessThan(32 * 1024);
  expect(validationBudget.admitted().metadata).toBeLessThan(32 * 1024);
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
  // The source-owned store path binds the actual parsed commit edge during
  // capture, without relying on a later unknown-frontier validation pass.
  await expect(captureJournalParentFrontier(made.binding, source(made.objects), budget(), null)).resolves.toEqual(frontier);
  await expect(captureJournalParentFrontier(made.binding, source(made.objects), budget(), "f".repeat(40))).rejects.toMatchObject({ reason: "parent" });
  await expect(validateJournalParentFrontier(frontier, made.binding, budget(), null)).resolves.toEqual(frontier);
  await expect(validateJournalParentFrontier(frontier, made.binding, budget(), "f".repeat(40))).rejects.toMatchObject({ reason: "parent" });
  const appended = await pass("sha1", 1, 1, frontier);
  const next = await captureJournalParentFrontier(appended.binding, source(appended.objects), budget());
  await expect(captureJournalParentFrontier(appended.binding, source(appended.objects), budget(), frontier.commit)).resolves.toEqual(next);
  await expect(captureJournalParentFrontier(appended.binding, source(appended.objects), budget(), null)).rejects.toMatchObject({ reason: "parent" });
  await expect(validateJournalParentFrontier(next, appended.binding, budget(), frontier.commit)).resolves.toEqual(next);
  await expect(validateJournalParentFrontier(next, appended.binding, budget(), null)).rejects.toMatchObject({ reason: "parent" });
  const checked = await validateJournalParentFrontier(frontier, made.binding, budget());
  frontier.objects[0]!.data.fill(0);
  expect(checked.objects[0]!.data).not.toEqual(frontier.objects[0]!.data);
});

test("the bounded frontier carries unchanged subtrees across numeric rollovers without reading old pass leaves", async () => {
  let frontier: JournalParentFrontier | null = null;
  const all = new Map<string, JournalObject>();
  const ranges = [[0, 98], [99, 99], [100, 100], [101, 101], [102, 4095], [4096, 8191], [8192, 9999], [10000, 10000]] as const;
  for (const [first, through] of ranges) {
    const made = await pass("sha1", first, through, frontier);
    for (const object of made.objects) all.set(object.id, object);
    const read: string[] = [];
    const capturing = budget(), validating = budget();
    const limits: { id: string; maximum: number }[] = [], actual = source(made.objects, read);
    frontier = await captureJournalParentFrontier(made.binding, { object: actual.object,
      boundedObject: async (id, _type, maximum) => {
        limits.push({ id, maximum }); return actual.object(id, maximum);
      } }, capturing);
    expect(await validateJournalParentFrontier(frontier, made.binding, validating)).toEqual(frontier);
    for (let depth = 0; depth < 6; depth++) {
      const maximum = Math.min(100, Math.floor(through / 10 ** (10 - depth * 2)) + 1);
      expect(limits.find(row => row.id === frontier!.objects[depth + 4]!.id)?.maximum).toBe(maximum * (depth === 5 ? 51 : 41));
    }
    for (const [used, forecast] of [[capturing.admitted(), forecastJournalParentFrontier(false, through)],
      [validating.admitted(), forecastJournalParentFrontier(true, through)]] as const)
      for (const key of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) expect(used[key]).toBeLessThanOrEqual(forecast[key]);
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

test.each(["sha1", "sha256"] as const)("a %s frontier settles only its captured ownership ceiling after checked source bytes arrive", async format => {
  const made = await pass(format), allowance = budget(), actual = source(made.objects);
  const reservations: { handle: object; maximum: number; before: JournalCost; reserved: JournalCost }[] = [];
  const settlements: { handle: object; received: number; before: JournalCost; after: JournalCost }[] = [];
  const reserve = allowance.reserve.bind(allowance), settle = allowance.settle.bind(allowance);
  allowance.reserve = cost => {
    const before = allowance.admitted(), handle = reserve(cost);
    expect(cost.metadata).toBe(cost.inputWork);
    if (typeof cost.metadata !== "number") throw Error("TEST ownership ceiling required");
    reservations.push({ handle, maximum: cost.metadata, before, reserved: allowance.admitted() });
    return handle;
  };
  allowance.settle = (handle, received) => {
    const before = allowance.admitted(); settle(handle, received);
    settlements.push({ handle, received, before, after: allowance.admitted() });
  };
  const frontier = await captureJournalParentFrontier(made.binding, {
    object: actual.object,
    boundedObject: async (id, _type, maximum) => {
      // A reservation must still be outstanding when the source starts.
      expect(reservations.length).toBe(settlements.length + 1);
      const reservation = reservations.at(-1)!;
      expect(reservation.maximum).toBe(maximum);
      expect(reservation.reserved.metadata - reservation.before.metadata).toBe(maximum);
      expect(reservation.reserved.inputWork - reservation.before.inputWork).toBe(maximum);
      expect(allowance.admitted().metadata).toBeGreaterThanOrEqual(reservation.reserved.metadata);
      return actual.object(id, maximum);
    },
  }, allowance);
  expect(reservations).toHaveLength(JOURNAL_PARENT_FRONTIER_OBJECTS);
  expect(settlements).toHaveLength(reservations.length);
  let unused = 0;
  for (const [index, reservation] of reservations.entries()) {
    const settlement = settlements[index]!, bytes = frontier.objects[index]!.data.length;
    expect(settlement.handle).toBe(reservation.handle);
    expect(settlement.received).toBe(bytes);
    const refund = reservation.maximum - bytes; unused += refund;
    expect(settlement.before.metadata - settlement.after.metadata).toBe(refund);
    expect(settlement.before.inputWork - settlement.after.inputWork).toBe(refund);
    for (const key of ["entries", "attempts", "nodes", "calls"] as const) expect(settlement.after[key]).toBe(settlement.before[key]);
  }
  expect(unused).toBeGreaterThan(0);
  expect(await validateJournalParentFrontier(frontier, made.binding, budget())).toEqual(frontier);
});

test.each(["throw", "oversize"] as const)("a frontier keeps its complete ownership reservation when source reads %s", async failure => {
  const made = await pass("sha1"), allowance = budget();
  const reserve = allowance.reserve.bind(allowance), settle = allowance.settle.bind(allowance);
  let outstanding: { maximum: number; before: JournalCost; reserved: JournalCost } | undefined;
  let atIo: JournalCost | undefined, settlements = 0;
  allowance.reserve = cost => {
    const before = allowance.admitted(), handle = reserve(cost);
    if (typeof cost.metadata !== "number") throw Error("TEST ownership ceiling required");
    outstanding = { maximum: cost.metadata, before, reserved: allowance.admitted() };
    return handle;
  };
  allowance.settle = (handle, received) => { settlements++; settle(handle, received); };
  const capture = captureJournalParentFrontier(made.binding, {
    object: async () => { throw Error("TEST bounded source must be used"); },
    boundedObject: async (_id, type, maximum) => {
      expect(outstanding?.maximum).toBe(maximum);
      expect(outstanding!.reserved.metadata - outstanding!.before.metadata).toBe(maximum);
      expect(outstanding!.reserved.inputWork - outstanding!.before.inputWork).toBe(maximum);
      atIo = allowance.admitted();
      if (failure === "throw") throw Error("TEST frontier source failure");
      return { type, size: maximum + 1, data: null };
    },
  }, allowance);
  await expect(capture).rejects.toMatchObject({ reason: failure === "throw" ? "unavailable" : "limit" });
  expect(outstanding).toBeDefined();
  expect(atIo).toBeDefined();
  expect(settlements).toBe(0);
  expect(allowance.admitted()).toEqual(atIo);
});


test("the SHA-256 frontier stays within its literal byte bound at all 604 permitted tree rows", async () => {
  // Literal boundary expectations complement actual rollover captures above.
  expect(journalParentFrontierProfile(99)).toEqual({ through: 99, rows: 109, bytes: 8533 });
  expect(journalParentFrontierProfile(100)).toEqual({ through: 100, rows: 110, bytes: 8574 });
  expect(journalParentFrontierProfile()).toEqual({ bytes: JOURNAL_PARENT_FRONTIER_BYTES, rows: JOURNAL_PARENT_FRONTIER_ROWS, through: 999_999_999_999 });
  for (const invalid of [-0, -1, 0.5, 1_000_000_000_000, NaN]) expect(() => journalParentFrontierProfile(invalid)).toThrow("parent");
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
  const tiny = journalParentFrontierProfile(0), numericRoot = frontier.objects[4]!;
  const narrowReads: { id: string; maximum: number }[] = [];
  const held = source(frontier.objects);
  await expect(captureJournalParentFrontier({ ...binding, through: { ...binding.through, seq: 0 } }, {
    object: held.object,
    boundedObject: async (id, _type, maximum) => { narrowReads.push({ id, maximum }); return held.object(id, maximum); }
  }, budget())).rejects.toBeDefined();
  expect(narrowReads.find(row => row.id === numericRoot.id)?.maximum).toBe(41);
  expect(tiny.rows).toBe(10);
  expect(frontier.first).toBe(999_999_999_999);
  expect(frontier.objects).toHaveLength(11);
  expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(28_828);
  const reader = new JournalObjectReader("sha256", source(frontier.objects), new JournalWork(budget()));
  expect(frontier.objects.filter(object => object.type === "tree").reduce((n, object) => n + reader.tree(object.data).length, 0)).toBe(JOURNAL_PARENT_FRONTIER_ROWS);
  // A hash-valid root with a second edge fits the original byte ceiling,
  // but its grammar permits one row. It must refuse before charging or
  // allocating the second row, not after parsing an overlarge row list.
  const journal = reader.tree(frontier.objects[1]!.data)[0]!.id;
  const extraRoot = maker.tree([{ mode: "40000", name: "journal", id: journal }, { mode: "40000", name: "spare", id: opaque }]);
  const extraCommit = maker.commit(extraRoot.id, null, 1_700_000_000);
  const bounded = budget(), spend = bounded.spend.bind(bounded);
  let rowDebits = 0;
  bounded.spend = cost => {
    spend(cost);
    if (cost.metadata === 512 && cost.inputWork === 512) rowDebits++;
  };
  await expect(captureJournalParentFrontier({ ...binding, commit: extraCommit.id }, source(maker.objects()), bounded)).rejects.toMatchObject({ reason: "tree" });
  expect(rowDebits, "Refuse the second root row before its 512-byte metadata debit").toBe(1);
});

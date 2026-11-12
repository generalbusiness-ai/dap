import { expect, test } from "vitest";
import type { Digest, Entry, FactUse } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isEntryOf, utf8 } from "@generalbusiness/dap-bytes";
import { checkpointOf, isRetainedUse, readRetainedUses, type Fetched, type OwnRetainedRow, type RetainedOwn } from "../src/index.ts";
import { created, type Ledger } from "./fixtures.ts";

// Pure constructor boundary. The instrumented local row port is a stand-in,
// not a SQL/Native restart or post-append lifecycle witness.
function checkpoint(ledger: Ledger, uses: readonly FactUse[] = []): Entry {
  return ledger.seal({ input: { type: "checkpoint", ...checkpointOf(ledger.state) }, uses, prepared: [], effects: [], sends: [], judgesTime: false });
}

test("retained selection preserves reads and admits only byte-proved same-origin associations", () => {
  const local = created(undefined, { source: "receiver" }, "retained-local");
  const foreign = created(undefined, { source: "foreign" }, "retained-foreign");
  const unrelated = created(undefined, { source: "other" }, "retained-unrelated");
  const birth = foreign.entries[0]!, later = checkpoint(foreign);
  const sequence = foreign.own.sequence();
  if (!sequence) return expect.fail("the actual foreign genesis must admit");
  const birthBytes = canonicalize(birth.entry), laterBytes = JSON.stringify(later, null, 2) + "\n";
  expect(laterBytes).not.toBe(canonicalize(later));
  const birthUse: FactUse = { fact: foreign.fact(0), content: digestBytes(utf8(birthBytes)), kind: sequence.kind };
  const laterUse: FactUse = { fact: foreign.fact(later.seq), content: digestBytes(utf8(laterBytes)), kind: sequence.kind };
  // A later row before its birth proves read order does not become a birth scan.
  const origin = checkpoint(local, [laterUse, birthUse]);
  const rows: OwnRetainedRow[] = [
    { kind: "entry", digest: laterUse.content, bytes: laterBytes, under: "original:test" },
    { kind: "entry", digest: birthUse.content, bytes: birthBytes },
  ];
  let originReads = 0, allowBirth = false;
  const reads: Digest[] = [];
  const own: RetainedOwn = Object.assign((seq: number) => { originReads++; return local.own(seq); }, {
    sequence: () => local.own.sequence(),
    retainedRow: (content: Digest) => {
      reads.push(content);
      if (content === birthUse.content && !allowBirth) throw Error("an unselected birth row was read");
      return rows.find(row => row.digest === content) ?? null;
    },
  });
  const selected = readRetainedUses(own, origin.seq);
  if (selected.status !== "ready") return expect.fail("the actual receiving origin must be ready");
  expect(originReads).toBe(1); expect(reads).toEqual([]);
  expect(selected.uses.map(use => use.index)).toEqual([0, 1]); expect(reads).toEqual([]);
  const heldLater = selected.read(0);
  if (heldLater.status !== "ready") return expect.fail("the selected original later row must be ready");
  expect(reads).toEqual([laterUse.content]); expect(originReads).toBe(1);
  expect(heldLater.value.mode).toBe("retained-later");
  expect(heldLater.value.use.originalBytes).toBe(laterBytes);
  expect(heldLater.value.use.producer).toEqual({ name: "original:test", provenance: "unhashed-retained-row" });
  expect(selected.project([heldLater.value], [])).toMatchObject({ status: "ready", values: [{ mode: "local-retained-use" }] });
  expect(reads).toEqual([laterUse.content]);
  expect(selected.read(-1)).toEqual({ status: "invalid-index" }); expect(reads).toEqual([laterUse.content]);
  expect(selected.read(0).status).toBe("ready"); expect(reads).toEqual([laterUse.content, laterUse.content]);

  // Already fetched same-origin genesis permits association without a row read.
  const fetchedBirth: Fetched = { fact: birthUse.fact, entry: birth.entry, sequence, under: "unrelated-transient-label" };
  const fromFetched = selected.project([heldLater.value], [fetchedBirth]);
  if (fromFetched.status !== "ready" || fromFetched.values[0]?.mode !== "genuine") return expect.fail("held genuine origin birth must associate the later row");
  expect(isEntryOf(later, laterUse.fact, fromFetched.values[0].sequence)).toBe(true);
  expect(fromFetched.values[0].use.originalBytes).toBe(laterBytes);
  expect(reads).toEqual([laterUse.content, laterUse.content]);

  allowBirth = true;
  const heldBirth = selected.read(1);
  if (heldBirth.status !== "ready" || heldBirth.value.mode !== "retained-birth") return expect.fail("actual selected genesis bytes must admit");
  expect(reads).toEqual([laterUse.content, laterUse.content, birthUse.content]);
  expect(heldBirth.value.use.producer.name).toBeUndefined();
  expect(isEntryOf(birth.entry, birthUse.fact, heldBirth.value.sequence)).toBe(true);
  const classified = selected.project([heldLater.value, heldBirth.value], []);
  if (classified.status !== "ready") return expect.fail("both actual selected rows must project");
  expect(classified.values.map(value => value.mode)).toEqual(["genuine", "genuine"]);
  expect(classified.values.map(value => value.use.fact.seq)).toEqual([later.seq, 0]);
  expect(reads).toEqual([laterUse.content, laterUse.content, birthUse.content]);

  const otherSequence = unrelated.own.sequence();
  if (!otherSequence) return expect.fail("the separate actual genesis must admit");
  expect(selected.project([heldLater.value], [{ fact: unrelated.fact(0), entry: unrelated.entries[0]!.entry, sequence: otherSequence, under: "original:test" }])).toEqual({ status: "invalid-use" });
  const otherOrigin = checkpoint(unrelated, [laterUse, birthUse]);
  const otherOwn: RetainedOwn = Object.assign((seq: number) => unrelated.own(seq), { sequence: () => unrelated.own.sequence(), retainedRow: own.retainedRow });
  const otherSelection = readRetainedUses(otherOwn, otherOrigin.seq);
  if (otherSelection.status !== "ready") return expect.fail("the separate receiving origin must be ready");
  expect(otherSelection.project([heldLater.value], [])).toEqual({ status: "invalid-use" });

  const realUse = heldLater.value.use, forgedUse = Object.create(Object.getPrototypeOf(realUse));
  expect(isRetainedUse(realUse)).toBe(true);
  expect(isRetainedUse(forgedUse)).toBe(false);
  expect(isRetainedUse({ ...realUse })).toBe(false);
  expect(() => Reflect.construct(realUse.constructor, [])).toThrow(TypeError);
  expect(() => Reflect.construct(heldBirth.value.constructor, [])).toThrow(TypeError);
  expect(Reflect.set(heldBirth.value, "sequence", otherSequence)).toBe(false);
  expect(() => Reflect.construct(heldBirth.value.sequence.constructor, [])).toThrow(TypeError);
  // A genuine token pasted onto a plain selection cannot create provenance.
  expect(Reflect.apply(selected.project, undefined, [[{ mode: "retained-birth", use: realUse, sequence }], []])).toEqual({ status: "invalid-use" });
  expect(Reflect.apply(selected.project, undefined, [[Object.create(Object.getPrototypeOf(heldBirth.value))], []])).toEqual({ status: "invalid-use" });
  expect(Object.isFrozen(realUse)).toBe(true); expect(Object.isFrozen(realUse.entry)).toBe(true);
  expect(Reflect.set(realUse.fact, "seq", 99)).toBe(false);
  const badRow: RetainedOwn = Object.assign((seq: number) => local.own(seq), { sequence: () => local.own.sequence(), retainedRow: () => ({ kind: "entry" as const, digest: laterUse.content, bytes: laterBytes + " ", under: "original:test" }) });
  const bad = readRetainedUses(badRow, origin.seq);
  if (bad.status !== "ready") return expect.fail("the unchanged actual origin is valid");
  expect(bad.read(0)).toEqual({ status: "invalid-use" });
});

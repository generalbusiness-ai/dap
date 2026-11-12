import { expect, test } from "vitest";
import type { Digest, Entry, FactUse } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isEntryOf, utf8 } from "@generalbusiness/dap-bytes";
import { checkpointOf, inspectClassifiedRetainedUse, isRetainedUse, readRetainedUses, type Fetched, type OwnRetainedRow, type RetainedOwn } from "../src/index.ts";
import { created, forged, type Ledger } from "./fixtures.ts";
import { clockOf, judgeDelivery, prepareRules, retainedResultContext, type Delivered, type StateView } from "../src/index.ts";
import { admitRetainedResultContext, copyEntry, copyKind, copyUnder, judgmentFacts, readJudgmentFacts, replayAssumptions, replayContext, resultContextForRuleCollection, sourceCopy, verifiedContext, withJudgmentSource } from "../src/operand.ts";
import { entryHash } from "@generalbusiness/dap-bytes";
import type { Request, Result } from "@generalbusiness/dap-contract";

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

  // Inspection requires the original private classification, not its read view.
  const bodyProjection = selected.project([heldLater.value], []);
  if (bodyProjection.status !== "ready") return expect.fail("the actual later body must project without a birth");
  const actualBody = bodyProjection.values[0]!;
  const inspectedBody = inspectClassifiedRetainedUse(actualBody);
  expect(inspectedBody).toMatchObject({ mode: "local-retained-use", use: { originalBytes: laterBytes } });
  expect(inspectClassifiedRetainedUse(inspectedBody)).toBeNull();
  const actualGenuine = classified.values[0]!;
  const inspectedGenuine = inspectClassifiedRetainedUse(actualGenuine);
  if (inspectedGenuine?.mode !== "genuine") return expect.fail("the actual byte-proved classification must inspect as genuine");
  expect(isEntryOf(inspectedGenuine.use.entry, inspectedGenuine.use.fact, inspectedGenuine.sequence)).toBe(true);
  expect(inspectedGenuine.use).toBe(actualGenuine.use);
  expect(Object.isFrozen(inspectedGenuine)).toBe(true);
  expect(inspectClassifiedRetainedUse(inspectedGenuine)).toBeNull();
  for (const value of [actualBody, actualGenuine]) {
    expect(inspectClassifiedRetainedUse({ ...value })).toBeNull();
    expect(inspectClassifiedRetainedUse(Object.create(Object.getPrototypeOf(value)))).toBeNull();
    expect(inspectClassifiedRetainedUse(Object.create(value))).toBeNull();
    expect(inspectClassifiedRetainedUse(new Proxy(value, {}))).toBeNull();
    expect(() => Reflect.construct(value.constructor, [])).toThrow(TypeError);
  }
  expect(inspectClassifiedRetainedUse({ mode: "genuine", use: realUse, sequence })).toBeNull();
  expect(inspectClassifiedRetainedUse({ mode: "genuine", use: realUse, sequence: { ...sequence } })).toBeNull();

  // Operations can reuse its already-read duplicate row without losing indices.
  const duplicateOrigin = checkpoint(local, [laterUse, laterUse, birthUse, birthUse]);
  const beforeDuplicateReads = reads.slice(), beforeDuplicateOrigins = originReads;
  const duplicates = readRetainedUses(own, duplicateOrigin.seq);
  if (duplicates.status !== "ready") return expect.fail("the actual duplicate uses must remain in the origin");
  expect(originReads).toBe(beforeDuplicateOrigins + 1);
  expect(reads).toEqual(beforeDuplicateReads);
  expect(duplicates.uses.map(use => use.index)).toEqual([0, 1, 2, 3]);
  const firstLater = duplicates.read(0), firstBirth = duplicates.read(2);
  if (firstLater.status !== "ready" || firstBirth.status !== "ready") return expect.fail("only the two selected original rows must be read");
  const afterSelectedReads = [...beforeDuplicateReads, laterUse.content, birthUse.content];
  expect(reads).toEqual(afterSelectedReads);
  const secondLater = duplicates.reuseSelectedAt(1, firstLater.value), secondBirth = duplicates.reuseSelectedAt(3, firstBirth.value);
  if (secondLater.status !== "ready" || secondBirth.status !== "ready") return expect.fail("the exact duplicate indices must reuse their already-read rows");
  expect(secondLater.value).not.toBe(firstLater.value);
  expect(secondLater.value.use).not.toBe(firstLater.value.use);
  expect(secondBirth.value).not.toBe(firstBirth.value);
  expect(secondBirth.value.use).not.toBe(firstBirth.value.use);
  expect(secondLater.value.use.useIndex).toBe(1); expect(secondBirth.value.use.useIndex).toBe(3);
  expect(secondLater.value.use.originalBytes).toBe(laterBytes);
  expect(secondLater.value.use.producer).toEqual(firstLater.value.use.producer);
  expect(secondBirth.value.use.producer.name).toBeUndefined();
  const duplicateProjection = duplicates.project([secondLater.value, firstLater.value, secondLater.value, firstBirth.value, secondBirth.value], []);
  if (duplicateProjection.status !== "ready") return expect.fail("projection must preserve selected order and repeated positions");
  expect(duplicateProjection.values.map(value => value.use.useIndex)).toEqual([1, 0, 1, 2, 3]);
  expect(duplicateProjection.values.map(value => value.mode)).toEqual(["genuine", "genuine", "genuine", "genuine", "genuine"]);
  expect(duplicateProjection.values.every(value => inspectClassifiedRetainedUse(value)?.mode === "genuine")).toBe(true);
  expect(reads).toEqual(afterSelectedReads);
  expect(originReads).toBe(beforeDuplicateOrigins + 1);
  expect(duplicates.reuseSelectedAt(2, firstLater.value)).toEqual({ status: "invalid-use" });
  expect(duplicates.reuseSelectedAt(1, firstBirth.value)).toEqual({ status: "invalid-use" });
  expect(duplicates.reuseSelectedAt(-1, firstLater.value)).toEqual({ status: "invalid-index" });
  expect(duplicates.reuseSelectedAt(4, firstLater.value)).toEqual({ status: "invalid-index" });
  expect(duplicates.reuseSelectedAt(1, heldLater.value)).toEqual({ status: "invalid-use" });
  expect(selected.reuseSelectedAt(0, firstLater.value)).toEqual({ status: "invalid-use" });
  expect(Reflect.apply(duplicates.reuseSelectedAt, undefined, [1, { ...firstLater.value }])).toEqual({ status: "invalid-use" });
  expect(Reflect.apply(duplicates.reuseSelectedAt, undefined, [1, Object.create(Object.getPrototypeOf(firstLater.value))])).toEqual({ status: "invalid-use" });
  expect(reads).toEqual(afterSelectedReads);

  // The full origin rejects a contradictory kind before any selected row read.
  const contradictory = checkpoint(local, [laterUse, { ...laterUse, kind: sequence.kind === "directory" ? "register" : "directory" }]);
  expect(readRetainedUses(own, contradictory.seq)).toEqual({ status: "invalid-origin" });
  expect(reads).toEqual(afterSelectedReads);

  // A failed ordinary read is not memoized, and supplies no token to reuse.
  let missingReads = 0;
  const missingOwn: RetainedOwn = Object.assign((seq: number) => local.own(seq), {
    sequence: () => local.own.sequence(), retainedRow: () => { missingReads++; return null; },
  });
  const missing = readRetainedUses(missingOwn, duplicateOrigin.seq);
  if (missing.status !== "ready") return expect.fail("the actual duplicate origin remains valid when a row is missing");
  expect(missing.read(0)).toEqual({ status: "missing-use" });
  expect(missing.read(0)).toEqual({ status: "missing-use" });
  expect(missingReads).toBe(2);
  expect(Reflect.apply(missing.reuseSelectedAt, undefined, [1, { status: "missing-use" }])).toEqual({ status: "invalid-use" });
  expect(missingReads).toBe(2);

  // Each phase reads its actual origin, then explicitly re-owns held rows.
  let phaseOriginReads = 0;
  const phaseRows: Digest[] = [];
  const phaseOwn: RetainedOwn = Object.assign((seq: number) => { phaseOriginReads++; return local.own(seq); }, {
    sequence: () => local.own.sequence(),
    retainedRow: (content: Digest) => { phaseRows.push(content); return rows.find(row => row.digest === content) ?? null; },
  });
  const firstPhase = readRetainedUses(phaseOwn, duplicateOrigin.seq);
  if (firstPhase.status !== "ready") return expect.fail("the first phase must read the actual origin");
  const phaseLater = firstPhase.read(0);
  if (phaseLater.status !== "ready") return expect.fail("the first phase must read the actual later row");
  const secondPhase = readRetainedUses(phaseOwn, duplicateOrigin.seq);
  if (secondPhase.status !== "ready") return expect.fail("the second phase must read its actual origin again");
  expect(phaseOriginReads).toBe(2); expect(phaseRows).toEqual([laterUse.content]);
  expect(secondPhase.project([phaseLater.value], [])).toEqual({ status: "invalid-use" });
  expect(secondPhase.reuseSelectedAt(1, phaseLater.value)).toEqual({ status: "invalid-use" });
  const reownedLater = secondPhase.reuseHeldAt(1, phaseLater.value);
  if (reownedLater.status !== "ready") return expect.fail("the same full origin and duplicate index must permit explicit handoff");
  expect(reownedLater.value).not.toBe(phaseLater.value);
  expect(reownedLater.value.use).not.toBe(phaseLater.value.use);
  expect(reownedLater.value.mode).toBe("retained-later");
  expect(reownedLater.value.use.useIndex).toBe(1);
  expect(reownedLater.value.use.origin).toEqual(phaseLater.value.use.origin);
  expect(reownedLater.value.use.originalBytes).toBe(laterBytes);
  expect(reownedLater.value.use.entry).toBe(phaseLater.value.use.entry);
  expect(reownedLater.value.use.producer).toBe(phaseLater.value.use.producer);
  expect(reownedLater.value.use.producer).toEqual({ name: "original:test", provenance: "unhashed-retained-row" });
  const bodyOnlyHandoff = secondPhase.project([reownedLater.value], []);
  if (bodyOnlyHandoff.status !== "ready") return expect.fail("the handed-off later body must project without inventing birth evidence");
  expect(bodyOnlyHandoff.values.map(value => value.mode)).toEqual(["local-retained-use"]);
  expect(inspectClassifiedRetainedUse(bodyOnlyHandoff.values[0])).toMatchObject({ mode: "local-retained-use" });
  expect(firstPhase.project([reownedLater.value], [])).toEqual({ status: "invalid-use" });
  expect(secondPhase.reuseSelectedAt(0, reownedLater.value).status).toBe("ready");
  expect(phaseOriginReads).toBe(2); expect(phaseRows).toEqual([laterUse.content]);

  const phaseBirth = firstPhase.read(2);
  if (phaseBirth.status !== "ready" || phaseBirth.value.mode !== "retained-birth") return expect.fail("the first phase must admit the actual birth row");
  const reownedBirth = secondPhase.reuseHeldAt(3, phaseBirth.value);
  if (reownedBirth.status !== "ready" || reownedBirth.value.mode !== "retained-birth") return expect.fail("birth handoff must retain the genuine association");
  expect(reownedBirth.value.use.useIndex).toBe(3);
  expect(reownedBirth.value.sequence).toBe(phaseBirth.value.sequence);
  expect(reownedBirth.value.use.originalBytes).toBe(birthBytes);
  expect(reownedBirth.value.use.producer).toBe(phaseBirth.value.use.producer);
  expect(isEntryOf(reownedBirth.value.use.entry, birthUse.fact, reownedBirth.value.sequence)).toBe(true);
  const handoffProjection = secondPhase.project([reownedLater.value, reownedBirth.value], []);
  if (handoffProjection.status !== "ready") return expect.fail("the actual handed-off birth must associate the later body");
  expect(handoffProjection.values.map(value => value.mode)).toEqual(["genuine", "genuine"]);
  expect(handoffProjection.values.map(value => value.use.useIndex)).toEqual([1, 3]);
  expect(phaseOriginReads).toBe(2); expect(phaseRows).toEqual([laterUse.content, birthUse.content]);

  // Equal foreign bytes cannot transfer a row to a different real local origin.
  expect(otherSelection.uses[0]!.fact).toEqual(phaseLater.value.use.fact);
  expect(otherSelection.uses[0]!.content).toBe(phaseLater.value.use.content);
  expect(otherSelection.reuseHeldAt(0, phaseLater.value)).toEqual({ status: "invalid-use" });
  expect(secondPhase.reuseHeldAt(0, heldLater.value)).toEqual({ status: "invalid-use" });
  expect(secondPhase.reuseHeldAt(2, phaseLater.value)).toEqual({ status: "invalid-use" });
  expect(secondPhase.reuseHeldAt(1, phaseBirth.value)).toEqual({ status: "invalid-use" });
  for (const index of [-1, 4, 0.5, NaN, Infinity]) {
    expect(secondPhase.reuseHeldAt(index, phaseLater.value)).toEqual({ status: "invalid-index" });
  }
  for (const held of [phaseLater.value, phaseBirth.value]) {
    for (const forged of [{ ...held }, Object.create(Object.getPrototypeOf(held)), Object.create(held), new Proxy(held, {}),
      { mode: held.mode, use: held.use }, bodyOnlyHandoff.values[0], inspectClassifiedRetainedUse(bodyOnlyHandoff.values[0]),
      { status: "missing-use" }, null, undefined]) {
      expect(Reflect.apply(secondPhase.reuseHeldAt, undefined, [held.use.useIndex, forged])).toEqual({ status: "invalid-use" });
    }
    expect(() => Reflect.construct(held.constructor, [Symbol("wrong-token"), {}, held.use, sequence])).toThrow(TypeError);
  }
  expect(phaseOriginReads).toBe(2); expect(phaseRows).toEqual([laterUse.content, birthUse.content]);

  // The pure result-context boundary retains body statements only for this
  // actual request origin. These manually sealed sends are a stand-in for
  // the host's paid origin and genuine remote Source, not Native admission.
  const localSequence = local.own.sequence();
  if (!localSequence) return expect.fail("the real receiving genesis must remain admitted");
  const requestMessage: Request = { class: "request", type: "tell", body: { message: "retained-context", fields: {} } };
  const requestOrigin = local.seal({ input: { type: "checkpoint", ...checkpointOf(local.state) }, uses: [laterUse], prepared: [], effects: [],
    sends: [{ n: 0, to: foreign.at, message: requestMessage }], judgesTime: false });
  const requestFact = local.fact(requestOrigin.seq), requestRow = local.state.request(requestOrigin.seq, 0);
  if (!requestRow) return expect.fail("the actual folded send must appear in the receiving request index");
  const resultSelection = readRetainedUses(own, requestOrigin.seq);
  if (resultSelection.status !== "ready") return expect.fail("the actual request origin must select");
  const resultLater = resultSelection.read(0);
  if (resultLater.status !== "ready") return expect.fail("the actual requested later row must be present");
  const resultProjection = resultSelection.project([resultLater.value], []);
  if (resultProjection.status !== "ready") return expect.fail("the requested later body must remain body-only");
  const contextOperand = resultProjection.values[0]!;
  const makeResult = (of: Result["of"] = { from: requestFact, n: 0 }, decision: "applied" | "refused" = "applied") => {
    const message: Result = { class: "result", of, outcome: "applied" };
    const source = forged(foreign.at, 1000, { type: "delivery", from: of.from, sourceKind: localSequence.kind, n: of.n,
      message: requestMessage, decision }, [{ n: 0, to: local.at, message }], sequence);
    const delivered: Delivered = { to: local.at, from: { at: foreign.at, seq: source.entry.seq, hash: entryHash(source.entry) }, n: 0, message };
    return { delivered, source, message };
  };
  const answer = makeResult();
  const base = { clock: clockOf(local.state, local.now), bounds: local.bounds, prepared: [], own, source: answer.source };
  const material = { localSequence, origin: resultSelection.origin, operands: [{ classified: contextOperand, under: "receiver:label" }] };
  const beforeContextOrigins = originReads, beforeContextRows = reads.slice();
  const borrowedFrozen = [base.clock, base.bounds, answer.source, own].map(value => Object.isFrozen(value));
  const staged = retainedResultContext(base, answer.delivered, material);
  expect(judgmentFacts(staged)).toEqual([]); expect(staged.facts).toEqual([]);
  expect([base.clock, base.bounds, answer.source, own].map(value => Object.isFrozen(value))).toEqual(borrowedFrozen);
  const checkedSource = sourceCopy(staged, answer.delivered.from);
  if (!checkedSource) return expect.fail("the actual result Source must match its envelope");
  const sourced = withJudgmentSource(verifiedContext(staged, { delivery: answer.delivered }), { delivery: answer.delivered }, checkedSource);
  expect(judgmentFacts(sourced)).toEqual([]);
  const admitted = admitRetainedResultContext(sourced, answer.delivered, local.at);
  if (!admitted) return expect.fail("the exact original result material must admit at the clause boundary");
  expect(Object.hasOwn(answer.source, "pin")).toBe(false);
  // Deliberately malformed JavaScript boundary input: a Symbol is not a
  // Digest or PlatformDefinition. No cast or typed authority fallback.
  const malformedSource = Object.defineProperty({ ...answer.source }, "pin", {
    value: Symbol("TEST noncanonical pin"), enumerable: true,
  });
  const malformedPending = retainedResultContext({ ...base, source: malformedSource }, answer.delivered, material);
  const malformedCheckedSource = sourceCopy(malformedPending, answer.delivered.from);
  if (!malformedCheckedSource) return expect.fail("the malformed public pin must not erase the genuine entry/sequence Source");
  const malformedInstalled = withJudgmentSource(verifiedContext(malformedPending, { delivery: answer.delivered }),
    { delivery: answer.delivered }, malformedCheckedSource);
  expect(admitRetainedResultContext(malformedInstalled, answer.delivered, local.at)).toBeNull();
  expect(admitted.facts).toEqual([]);
  expect(judgmentFacts(admitted).map(copy => [copyEntry(copy), copyKind(copy), copyUnder(copy)]))
    .toEqual([[resultLater.value.use.entry, sequence.kind, "receiver:label"]]);
  const bodyRead = readJudgmentFacts(local.state, { picked: { type: "fact", kind: ["checkpoint"], under: "receiver:label" } },
    { picked: laterUse.fact }, judgmentFacts(admitted), { at: local.at });
  expect(bodyRead.result).toBe("read");
  expect(resultLater.value.use.originalBytes).toBe(laterBytes);
  expect(replayAssumptions(admitted)).toBeNull();
  // A fresh wrapper invocation re-stages even an already admitted context.
  const again = verifiedContext(admitted, { delivery: answer.delivered });
  expect(judgmentFacts(again)).toEqual([]);
  expect(admitRetainedResultContext(again, answer.delivered, local.at)).toBeNull(); // Source must pass its normal check again.
  expect(verifiedContext(admitted, { delivery: { ...answer.delivered, message: requestMessage } }).facts).toEqual([]);
  expect(judgmentFacts(verifiedContext(admitted, { delivery: { ...answer.delivered, message: requestMessage } }))).toEqual([]);
  expect(admitRetainedResultContext(sourced, answer.delivered, unrelated.at)).toBeNull();
  const receivingBirth = local.entries[0]!.entry.input;
  if (receivingBirth.type !== "genesis" || !receivingBirth.founding) return expect.fail("the actual receiver must have its signed founding");
  expect(judgmentFacts(verifiedContext(admitted, { act: receivingBirth.founding }))).toEqual([]);
  expect(judgmentFacts(verifiedContext(admitted, { genesis: { name: local.at.scope, nonce: receivingBirth.nonce,
    seed: receivingBirth.seed, creation: receivingBirth.founding } }))).toEqual([]);
  expect(Object.isFrozen(staged)).toBe(true);
  expect(Reflect.set(staged, "own", otherOwn)).toBe(false);
  const differentOrigin = retainedResultContext(base, answer.delivered, { ...material, origin: otherSelection.origin });
  const differentSource = sourceCopy(differentOrigin, answer.delivered.from);
  if (!differentSource) return expect.fail("another origin must not erase the genuine incoming Source");
  expect(admitRetainedResultContext(withJudgmentSource(verifiedContext(differentOrigin, { delivery: answer.delivered }),
    { delivery: answer.delivered }, differentSource), answer.delivered, local.at)).toBeNull();

  const historical = forged(local.at, 1001, { type: "delivery", from: answer.delivered.from, sourceKind: sequence.kind,
    n: 0, message: answer.message, clause: "applied" }, [], localSequence);
  const replay = replayContext({ ...base, facts: [], origin: requestOrigin }, {
    recorded: { ...historical.entry, uses: [laterUse] }, source: null,
    facts: [{ mode: "retained-name", fact: laterUse.fact, entry: resultLater.value.use.entry,
      originalBytes: canonicalize(resultLater.value.use.entry), under: "replay:label",
      anchor: { scope: laterUse.fact.at.scope, seq: laterUse.fact.seq, hash: laterUse.fact.hash } }],
  }, { delivery: answer.delivered });
  if (!replay) return expect.fail("the explicit historical replay assumption must admit separately");
  expect(judgmentFacts(replay).map(copyUnder)).toEqual(["replay:label"]);
  expect(replayAssumptions(replay)?.facts).toHaveLength(1);
  expect(judgmentFacts(verifiedContext(replay, { delivery: answer.delivered }))).toEqual([]);


  const symbols = Object.getOwnPropertySymbols(staged);
  expect(symbols.length).toBe(1);
  const evidence: unknown = Reflect.get(staged, symbols[0]!);
  if (!evidence || typeof evidence !== "object") return expect.fail("the owned holder must have its private evidence object");
  expect(() => Reflect.construct(evidence.constructor, [])).toThrow(TypeError);
  const copied = { ...staged };
  expect(admitRetainedResultContext(copied, answer.delivered, local.at)).toBeNull();
  expect(judgmentFacts(verifiedContext(copied, { delivery: answer.delivered }))).toEqual([]);
  const fakeEvidence = Object.create(Object.getPrototypeOf(evidence));
  const forgedHolder = { ...staged, [symbols[0]!]: fakeEvidence };
  expect(admitRetainedResultContext(forgedHolder, answer.delivered, local.at)).toBeNull();
  expect(admitRetainedResultContext(sourced, { ...answer.delivered, n: 1 }, local.at)).toBeNull();
  for (const classified of [inspectClassifiedRetainedUse(contextOperand), { ...contextOperand }, Object.create(Object.getPrototypeOf(contextOperand))]) {
    const badMaterial = { ...material, operands: [{ classified, under: "receiver:label" }] };
    const pending = retainedResultContext(base, answer.delivered, badMaterial);
    const pendingSource = sourceCopy(pending, answer.delivered.from);
    if (!pendingSource) return expect.fail("bad retained operands must not erase the separate genuine Source");
    const stillPending = withJudgmentSource(verifiedContext(pending, { delivery: answer.delivered }), { delivery: answer.delivered }, pendingSource);
    expect(admitRetainedResultContext(stillPending, answer.delivered, local.at)).toBeNull();
  }
  const collected: import("../src/guards.ts").RuleInput[] = [];
  const collecting = resultContextForRuleCollection(staged, answer.delivered, collected);
  expect(collecting.asked).toBe(collected); expect(collecting.prepared).toEqual([]);
  expect(collecting.own).toBe(staged.own); expect(collecting.clock).toBe(staged.clock); expect(collecting.source).toBe(staged.source);
  const collectionSource = sourceCopy(collecting, answer.delivered.from);
  if (!collectionSource) return expect.fail("the collector must retain the exact genuine source");
  expect(admitRetainedResultContext(withJudgmentSource(verifiedContext(collecting, { delivery: answer.delivered }),
    { delivery: answer.delivered }, collectionSource), answer.delivered, local.at)).not.toBeNull();

  // Actual judge guards precede the late failure, including the peer's wrong-hash route.
  const unavailable = retainedResultContext(base, answer.delivered, null);
  expect(judgeDelivery(local.state, local.definition, answer.delivered, unavailable))
    .toEqual({ result: "unavailable", reason: "dependency-unavailable" });
  expect(judgeDelivery(local.state, local.definition, { ...answer.delivered, to: unrelated.at }, unavailable))
    .toEqual({ result: "routing", reason: "not-found" });
  expect(laterUse.fact.hash).not.toBe(requestFact.hash);
  const wrongHash = makeResult({ from: { ...requestFact, hash: laterUse.fact.hash }, n: 0 });
  expect(judgeDelivery(local.state, local.definition, wrongHash.delivered,
    retainedResultContext({ ...base, source: wrongHash.source }, wrongHash.delivered, material)))
    .toEqual({ result: "source-unverified", detail: "the result names no request send of this scope" });
  const wrongDecision = makeResult(undefined, "refused");
  expect(judgeDelivery(local.state, local.definition, wrongDecision.delivered,
    retainedResultContext({ ...base, source: wrongDecision.source }, wrongDecision.delivered, null)))
    .toEqual({ result: "source-unverified", detail: "the source entry is not the entry that decided the request" });
  // A minimal read-only view stand-in exposes only the earlier repeat condition.
  const earlierView = (over: Partial<StateView>): StateView => new Proxy(local.state, { get(target, key) {
    if (Object.prototype.hasOwnProperty.call(over, key)) return Reflect.get(over, key);
    const value: unknown = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  expect(judgeDelivery(earlierView({ decided: () => ({ from: answer.delivered.from.at, seq: answer.delivered.from.seq,
    hash: answer.delivered.from.hash, n: 0, by: 77 }) }), local.definition, answer.delivered, unavailable))
    .toEqual({ result: "repeat", seq: 77 });
  expect(judgeDelivery(earlierView({ request: () => ({ ...requestRow, diagnosis: { seq: 78, finding: "undelivered" } }) }),
    local.definition, answer.delivered, unavailable)).toEqual({ result: "repeat", seq: 78 });
  expect(prepareRules(local.state, local.definition, { delivery: wrongHash.delivered,
    context: retainedResultContext({ ...base, source: wrongHash.source }, wrongHash.delivered, material) })).toEqual([]);
  expect(originReads).toBe(beforeContextOrigins); expect(reads).toEqual(beforeContextRows);
});

import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isPlatformDefinition, utf8 } from "@generalbusiness/dap-bytes";
import { scriptedPartitionOrigin } from "../../platform/test/support-partition-origin.ts";
import { partitionProof, PartitionProofOperation, PARTITION_PROOF_BOUNDS as B, type PartitionProofPorts } from "../src/partition-proof.ts";
import { used } from "../src/core.ts";
import type { ClassifiedRetainedUse } from "@generalbusiness/dap-derive";
import { LATE, fetchFacts } from "../src/turn.ts";
import { ReceiverReads } from "../src/receiver-reads.ts";
import type { NativeBirth } from "../src/native-birth.ts";

/** Coherent SCRIPTED frames and native RPC stand-ins. No native execution,
 * receiver eligibility, identity policy or authority is proved here. */
function protocol(concerns = 0, sealed = false) {
  const fixture = scriptedPartitionOrigin(concerns ? "issue" : "change", concerns, false, undefined, sealed);
  const frames = new Map(fixture.frames.map(f => [canonicalize(f.fact), { fact: f.fact, bytes: canonicalize(f.entry) }]));
  const births = new Map<string, NativeBirth>();
  for (const frame of fixture.frames) if (frame.entry.input.type === "genesis") {
    const named = frame.entry.input.seed.definition;
    births.set(canonicalize(frame.fact.at), { v: 1, proof: frames.get(canonicalize(frame.fact))!, named, declarationName: frame.under, native: isPlatformDefinition(named) });
  }
  const calls: { method: string; milliseconds: number; max?: number }[] = []; let now = 0;
  const ports: PartitionProofPorts = { now: () => now,
    births: { async read(at, milliseconds) { calls.push({ method: "birth", milliseconds }); return births.get(canonicalize(at)) ?? null; } },
    proofs: { async read(fact, max, milliseconds) { calls.push({ method: "exact", max, milliseconds: milliseconds! }); return frames.get(canonicalize(fact)) ?? null; } },
  };
  return { fixture, frames, births, calls, ports, advance: (ms: number) => { now += ms; } };
}

test("raw partition collection deduplicates direct births and bounds all concern ancestry together without deriving identities", async () => {
  const direct = protocol(), got = await partitionProof(direct.ports, direct.fixture.from);
  expect(got).toMatchObject({ calls: 9, reservedBytes: 9 * 1024 * 1024 });
  expect(got?.frames).toHaveLength(9); expect(direct.calls).toHaveLength(9);
  expect(got?.frames.every(frame => !("under" in frame))).toBe(true);
  expect(got?.frames.map(frame => canonicalize(frame.fact)).sort()).toEqual([...direct.frames.keys()].sort());
  expect(got?.frames.every(frame => canonicalize(frame.sequence.at) === canonicalize(frame.fact.at))).toBe(true);
  const later = got?.frames.find(frame => frame.fact.seq > 0)!;
  const born = got?.frames.find(frame => frame.fact.seq === 0 && canonicalize(frame.fact.at) === canonicalize(later.fact.at));
  expect(later.sequence).toBe(born?.sequence);
  const nested = protocol(3), child = await partitionProof(nested.ports, nested.fixture.from);
  expect(child?.frames).toHaveLength(15); expect(child?.calls).toBe(15);
  expect(nested.calls.every(call => call.milliseconds === B.milliseconds && (call.max === undefined || call.max === 1024 * 1024))).toBe(true);
  const tooDeep = protocol(4);
  expect(await partitionProof(tooDeep.ports, tooDeep.fixture.from)).toBeNull();
  expect(tooDeep.calls.length).toBeLessThanOrEqual(B.calls);
  const sealed = protocol(3, true), rollover = await partitionProof(sealed.ports, sealed.fixture.from);
  expect(rollover?.frames).toHaveLength(16); expect(rollover?.calls).toBe(16);
  expect(rollover?.frames.find(frame => canonicalize(frame.fact.at) === canonicalize(sealed.fixture.previous))?.sequence.kind).toBe("directory");
});

test("raw partition collection stops on total deadline, missing proof or oversized wire bytes with no truncated result", async () => {
  const expired = protocol(), read = expired.ports.proofs.read;
  expired.ports.proofs.read = async (...args) => { const got = await read(...args); expired.advance(10001); return got; };
  expect(await partitionProof(expired.ports, expired.fixture.from)).toBeNull();
  expect(expired.calls).toHaveLength(3);
  const missing = protocol(); missing.births.delete(canonicalize(missing.fixture.rules));
  expect(await partitionProof(missing.ports, missing.fixture.from)).toBeNull();
  expect(missing.calls.length).toBeLessThanOrEqual(9);
  const oversized = protocol(), first = oversized.births.get(canonicalize(oversized.fixture.from.at))!;
  oversized.births.set(canonicalize(oversized.fixture.from.at), { ...first, proof: { ...first.proof, bytes: " ".repeat(1024 * 1024 + 1) } });
  expect(await partitionProof(oversized.ports, oversized.fixture.from)).toBeNull(); expect(oversized.calls).toHaveLength(1);
  const invalid = protocol(); expect(await partitionProof(invalid.ports, {} as FactRef)).toBeNull(); expect(invalid.calls).toHaveLength(0);
  const missingRegister = protocol(); missingRegister.births.delete(canonicalize(missingRegister.fixture.register));
  expect(await partitionProof(missingRegister.ports, missingRegister.fixture.from)).toBeNull();
  const lateRegister = protocol(), birthRead = lateRegister.ports.births.read;
  lateRegister.ports.births.read = async (...args) => {
    const reply = await birthRead(...args);
    if (canonicalize(args[0]) === canonicalize(lateRegister.fixture.register)) lateRegister.advance(B.milliseconds + 1);
    return reply;
  };
  expect(await partitionProof(lateRegister.ports, lateRegister.fixture.from)).toBeNull();
  expect(lateRegister.calls).toHaveLength(5);
  const wrong = protocol(), own = wrong.births.get(canonicalize(wrong.fixture.from.at))!;
  wrong.births.set(canonicalize(wrong.fixture.from.at), { ...own, proof: { ...own.proof, fact: { ...own.proof.fact, at: wrong.fixture.root } } });
  expect(await partitionProof(wrong.ports, wrong.fixture.from)).toBeNull(); expect(wrong.calls).toHaveLength(1);
});


test("one operation shares concurrent receiver and source evidence without multiplying its total allowance", async () => {
  const sample = protocol(), operation = new PartitionProofOperation(sample.ports);
  const [receiver, source, repeated] = await Promise.all([
    operation.receiver(sample.fixture.partition), operation.lane(sample.fixture.from), operation.lane(sample.fixture.from),
  ]);
  expect(receiver?.policy.mode).toBe("partition-v1");
  expect(source?.frames).toHaveLength(9); expect(repeated?.frames).toHaveLength(9);
  expect(source?.calls).toBe(9); expect(repeated?.calls).toBe(9);
  expect(sample.calls).toHaveLength(9);
  sample.advance(B.milliseconds + 1);
  expect(await operation.lane(sample.fixture.from)).toBeNull();
  expect(sample.calls).toHaveLength(9);
});


test("receiver interpretation promotes a proved lane while retention and a later producer read keep its original alias", async () => {
  // RPC and storage maps are stand-ins. This protects the interpretation /
  // retention boundary, not native execution or handler authorization.
  const sample = protocol(); let producerCalls = 0;
  const resolver = { read: async () => { producerCalls++; return { entry: sample.fixture.genesis, under: "declared:change", sequence: sample.fixture.frames[0]!.sequence }; } };
  const reader = await ReceiverReads.open({ ...sample.ports, resolver }, sample.fixture.partition);
  expect(reader).not.toBeNull();
  const fetched = await fetchFacts(reader!, PROPOSED_BOUNDS, [sample.fixture.from]);
  if (!Array.isArray(fetched)) throw new Error("proved source did not return fetched entries");
  expect(fetched[0]?.under).toBe("change");
  expect(producerCalls).toBe(0);
  expect(sample.calls).toHaveLength(9);
  const uses = [{ fact: sample.fixture.from, kind: sample.fixture.frames[0]!.sequence.kind, content: digestBytes(utf8(canonicalize(sample.fixture.genesis))) }];
  const saved = used({ uses }, fetched!);
  expect(saved).toEqual([{ kind: "entry", digest: uses[0]!.content, bytes: canonicalize(sample.fixture.genesis), under: "declared:change" }]);
  // STAND-IN for one classified use that readRetainedUses would give for the saved row: its fact, original bytes and stored
  // producer. The receiver name derives from the fact and the producer only, so no receiver origin entry is built here.
  const retained: ClassifiedRetainedUse[] = [{ mode: "local-retained-use", use: { mode: "local-retained-use", origin: sample.fixture.from, useIndex: 0, fact: uses[0]!.fact, content: uses[0]!.content, kind: uses[0]!.kind, entry: sample.fixture.genesis, originalBytes: saved[0]!.bytes, producer: { name: saved[0]!.under, provenance: "unhashed-retained-row" } } }];
  expect(retained[0]?.use.producer.name).toBe("declared:change");
  expect((await reader!.retained(retained))?.[0]?.under).toBe("change");
  expect(retained[0]?.use.producer.name).toBe("declared:change");
  expect(producerCalls).toBe(0);
  const raw = await fetchFacts(resolver, PROPOSED_BOUNDS, [sample.fixture.from]);
  if (!Array.isArray(raw)) throw new Error("producer source did not return fetched entries");
  expect(raw[0]?.under).toBe("declared:change");
  expect(producerCalls).toBe(1);
  sample.advance(B.milliseconds + 1);
  expect(await reader!.retained(retained)).toBeNull();
  expect(sample.calls).toHaveLength(9);
});


// These transport counters and clock are scripted. The native journeys cover
// actual receiver eligibility; these tests isolate admission resource limits.
test("concurrent duplicate and distinct misses spend one total allowance and never start a thirty-third RPC", async () => {
  const sample = protocol(), read = sample.ports.births.read;
  const operation = new PartitionProofOperation(sample.ports);
  const facts = Array.from({ length: B.calls + 8 }, (_, n) => ({ ...sample.fixture.from, at: { ...sample.fixture.from.at, genesis: digestBytes(new Uint8Array([n + 50])) } }));
  sample.ports.births.read = async (...args) => { await Promise.resolve(); return read(...args); };
  const answers = await Promise.all(facts.flatMap(fact => [operation.raw(fact), operation.raw(fact)]));
  expect(answers.every(answer => answer === null)).toBe(true);
  expect(operation.stats()).toMatchObject({ calls: 32, reads: 32, totalFrames: 0, pending: 0, reservedBytes: 32 * 1024 * 1024 });
  expect(sample.calls).toHaveLength(32);
  expect(await operation.raw(facts[0]!)).toBeNull();
  expect(await operation.raw(facts.at(-1)!)).toBeNull();
  expect(sample.calls).toHaveLength(32);
});

test("a timed-out physical read keeps its slot until settlement and cannot admit a late frame", async () => {
  const sample = protocol(); let finish!: (value: NativeBirth | null) => void;
  let started = 0, peak = 0, running = 0;
  sample.ports.births.read = async () => { started++; running++; peak = Math.max(peak, running); const value = await new Promise<NativeBirth | null>(resolve => { finish = resolve; }); running--; return value; };
  sample.ports.wait = async <T>(work: () => Promise<T>): Promise<T | typeof LATE> => { const pending = work(); await Promise.resolve(); return started ? LATE : pending; };
  const operation = new PartitionProofOperation(sample.ports);
  expect(await operation.raw(sample.fixture.from)).toBeNull();
  expect(operation.stats()).toMatchObject({ calls: 1, reads: 1, pending: 1, totalFrames: 0 });
  expect(await operation.receiver(sample.fixture.partition)).toBeNull();
  expect(started).toBe(1); expect(peak).toBe(1);
  finish(sample.births.get(canonicalize(sample.fixture.from.at))!);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(operation.stats()).toMatchObject({ reads: 1, pending: 0, totalFrames: 0, actualBytes: 0 });
  expect(await operation.raw(sample.fixture.from)).toBeNull();
  expect(started).toBe(1);
});


test("raw UTF-8 admission charges bad replies before parse and refuses further physical reads at sixteen MiB", async () => {
  const sample = protocol(), first = sample.births.get(canonicalize(sample.fixture.from.at))!;
  // Three-byte UTF-8, but fewer JS characters: this is an admitted-byte
  // witness, not a peak-heap assertion. The invalid JSON is never a frame.
  const bytes = "\u0800".repeat(349525) + " ";
  expect(utf8(bytes).length).toBe(1024 * 1024);
  const caps: number[] = [];
  sample.ports.births.read = async (_at, _ms, max) => { caps.push(max!); return { ...first, proof: { ...first.proof, bytes } }; };
  const operation = new PartitionProofOperation(sample.ports);
  for (let n = 0; n < 17; n++) {
    const fact = { ...sample.fixture.from, at: { ...sample.fixture.from.at, genesis: digestBytes(new Uint8Array([n + 100])) } };
    expect(await operation.raw(fact)).toBeNull();
  }
  expect(operation.stats()).toMatchObject({ calls: 17, reads: 16, actualBytes: 16 * 1024 * 1024, totalFrames: 0, pending: 0 });
  expect(caps).toHaveLength(16); expect(caps.every(cap => cap === 1024 * 1024)).toBe(true);
  const validEnvelope = protocol(), validBirth = validEnvelope.births.get(canonicalize(validEnvelope.fixture.from.at))!;
  validEnvelope.ports.births.read = async () => ({ ...validBirth, proof: { ...validBirth.proof, bytes } });
  const admittedBytes = new PartitionProofOperation(validEnvelope.ports);
  expect(await admittedBytes.raw(validEnvelope.fixture.from)).toBeNull();
  expect(admittedBytes.stats()).toMatchObject({ actualBytes: 1024 * 1024, totalFrames: 0, pending: 0 });
  const malformed = protocol(), initial = malformed.births.get(canonicalize(malformed.fixture.from.at))!;
  malformed.ports.births.read = async () => ({ ...initial, declarationName: "x".repeat(257), proof: { ...initial.proof, bytes } });
  const rejected = new PartitionProofOperation(malformed.ports);
  expect(await rejected.raw(malformed.fixture.from)).toBeNull();
  expect(rejected.stats()).toMatchObject({ actualBytes: 1024 * 1024, totalFrames: 0, pending: 0 });
});


test("publication checks the original deadline again after synchronous proof validation", async () => {
  const sample = protocol(), reader = await ReceiverReads.open({ ...sample.ports, resolver: { read: async () => null } }, sample.fixture.partition);
  if (!reader?.proof) return expect.fail("scripted partition reader is unavailable");
  expect(await reader.publication(sample.fixture.from, sample.fixture.root, sample.fixture.destination, "change")).toBe(true);
  const proof = await reader.proof.lane(sample.fixture.from);
  const root = proof?.frames.find(frame => frame.fact.at.scope === sample.fixture.root.scope && frame.fact.seq === 0);
  if (!root) return expect.fail("scripted root frame is missing");
  // A getter on a copy of the parsed SCRIPTED frame simulates synchronous
  // validator cost. Its value and entry hash stay identical. No native code
  // execution, clock preemption or fabricated native frame is claimed.
  const original = root.entry, scripted = { ...original }, effects = original.effects; let advanced = false;
  Object.defineProperty(scripted, "effects", { enumerable: true, configurable: true, get: () => { if (!advanced) { advanced = true; sample.advance(B.milliseconds + 1); } return effects; } });
  root.entry = scripted;
  try {
    expect(await reader.publication(sample.fixture.from, sample.fixture.root, sample.fixture.destination, "change")).toBeNull();
    expect(advanced).toBe(true); expect(sample.calls).toHaveLength(9);
  } finally { root.entry = original; }
});

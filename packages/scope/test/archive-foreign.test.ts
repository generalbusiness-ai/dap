import { archiveReceiverChange, archiveMembershipProofChange } from "./definition-corpus-data.ts";
/** Actual native foreign uses/retention/SQLite. Grants, reviewed policy,
 * clock and setup reader are explicit TEST fixtures. This classifies
 * metadata and local inventory only: no installed export or replay verdict. */
import { expect, onTestFinished, test } from "vitest";
import { env } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, Input} from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, newIncarnation, parseStrict, textDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { outcomeValueDomains, validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { COUNTING_COHORT, platform } from "@generalbusiness/dap-platform";
import { forecastArchiveForeignLookup, forecastArchiveForeignSelection, forecastArchiveForeignBasis, forecastArchiveForeignScan, forecastArchiveForeignRepeat, forecastArchiveForeignCopyRequest, forecastArchiveForeignCopySize, forecastArchiveForeignGenesis, forecastArchiveForeignColdCopy } from "../src/archive-foreign-cost.ts";
import { ArchiveRetainedReader } from "../src/archive-retained.ts";
import { forecastArchiveSupportMetadata } from "../src/archive-support-cost.ts";
import { ArchiveScout } from "../src/archive-scout.ts";
import { archiveEntryAnchorCandidates } from "../src/archive-anchor-candidates.ts";
import { ArchiveForeignPlan } from "../src/archive-foreign-plan.ts";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { buildJournalArchive, journalRef, JournalWork } from "@generalbusiness/artroom-git/journal";
import { JournalObjectReader, JournalObjects } from "../../git/src/journal-objects.ts";
import { readJournalArchive } from "@generalbusiness/artroom-git/journal-reader";
import { planArchive, planPublishedArchivePass, rebuildArchive, rebuildArchivePass } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import type { FixtureArchiveProvider } from "../src/archive-driver.ts";
import { archiveRepository, archiveSql } from "./support/archive.ts";
import { fixtureArchiveWiring } from "./worker.ts";
import { nativeArchiveFixture, archiveAuthorityBasis, archiveAuthorityPolicies, archiveAuthorityAnchors } from "./support/archive-native-authority.ts";
import { sessionRoom } from "./support/session-room.ts";
import { namespace } from "../src/namespace.ts";
import { ArchiveForeignMetadata, type ArchiveForeignRecordedScan, type ArchiveForeignExpectedCopy } from "../src/archive-foreign.ts";
import { archiveInput } from "../src/archive-input.ts";
import { ArchivePrefixStopped, archivePrefixMetadata } from "../src/archive-prefix.ts";
import { archiveEntryHeader, archiveEntryPrivacy, archiveSupportMetadata } from "../src/archive-entry-metadata.ts";
import { archivePrivacyMetadata } from "../src/archive-privacy.ts";
import { FixtureArchiveSourcePins } from "../src/archive-source-pins.ts";
import { inventoryArchive, type ArchivePolicyRegistry, type ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { at, definition, create, reader, rita } from "./support.ts";
import { wired } from "./outside.ts";
const variants = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
const receiver = variant(definition.declared, archiveReceiverChange());
const policy = (def: typeof definition, entryTypes = variants): ReviewedArchivePolicy => ({ review: "TEST reviewed inline classes; no production certificate",
  entryTypes, support: { named: def.digest, definition: def, owners: new Map(), records: new Map(), preparations: new Map() } });
async function fixture(repeatUse = false, nativeAuthority = false) {
  // Only the published alarm opts in; legacy inventory/cost controls retain
  // their original TEST authority and exact literal work measurements.
  const native = nativeAuthority ? await nativeArchiveFixture() : null;
  const producer = native ? await native.create({}, {}, definition) : await create();
  const consumer = native ? await native.create({}, {}, receiver) : await create({}, {}, receiver);
  const commitment = await producer.commitment(), assigned = (await producer.sealed()).find(sealed => sealed.entry.seq > commitment && sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.kind === "assign")!;
  expect(assigned).toBeDefined();
  // The simple create fixture normally has a SCRIPTED foreign resolver.
  // Select the real namespace resolver for these actual peer source reads.
  wired.set(consumer.name, () => ({ resolver: namespace(env.SCOPES).resolver }));
  try {
    await consumer.restart();
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign assignment", proof: { at: producer.at, seq: assigned.entry.seq, hash: assigned.hash } } });
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign genesis", proof: producer.genesis.fact } });
    if (repeatUse) await consumer.did(rita, "remark", { on: 0, fields: { text: "actual repeated foreign assignment", proof: { at: producer.at, seq: assigned.entry.seq, hash: assigned.hash } } });
  } finally { wired.delete(consumer.name); }
  const birth = await producer.stub.entry(reader, 0); expect(birth.ok).toBe(true); if (!birth.ok) return expect.fail("native birth read required");
  const entries = await consumer.sealed(), uses = entries.flatMap(sealed => sealed.entry.uses);
  expect(uses).toHaveLength(repeatUse ? 3 : 2);
  const producerSource = { at: producer.at, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, declaration: canonicalize(definition.declared) };
  const authority = archiveAuthorityBasis(consumer);
  const sources = authority?.pins ?? new FixtureArchiveSourcePins([producerSource], PROPOSED_BOUNDS, new ArchiveBudget());
  // Additional genuine source preparation is fixture setup, separately paid.
  if (authority) sources.include([producerSource], PROPOSED_BOUNDS, new ArchiveBudget());
  const policies: ArchivePolicyRegistry = archiveAuthorityPolicies(consumer, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition)]]));
  const through = await consumer.head();
  const scan = (pins = sources, reviewed = policies) => consumer.inside(state => {
    const forbidden: string[] = [], queries: string[] = [], budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      queries.push(query);
      if (/^SELECT (?:\*|bytes)(?:\s|,)/.test(query)) { forbidden.push(query); throw Error("body tripwire"); }
      return state.storage.sql.exec(query, ...args);
    } };
    let reason = "admitted", positions: number[] = [], basis: ReturnType<ArchiveForeignMetadata["basis"]> = [], copies: unknown[] = [];
    let mapCosts: { basis: ArchiveCost; selection: ArchiveCost; lookups: ArchiveCost[] } | null = null;
    const difference = (before: ArchiveCost, after: ArchiveCost): ArchiveCost =>
      Object.fromEntries(Object.keys(before).map(key => [key, after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]])) as ArchiveCost;
    const nativeCosts: { query: string; cost: ArchiveCost }[] = [];
    const scanCosts: { seq: number; count: number; cost: ArchiveCost }[] = [];
    let repeatCost: { bytes: number; cost: ArchiveCost } | null = null;
    const native = budget.native.bind(budget);
    budget.native = (port, reservation) => {
      const guarded = native(port, reservation);
      return { exec: (query, ...args) => {
        const before = budget.admitted(), rows = guarded.exec(query, ...args);
        nativeCosts.push({ query, cost: difference(before, budget.admitted()) });
        return rows;
      } };
    };
    try {
      const foreign = new ArchiveForeignMetadata(sql, pins, reviewed, PROPOSED_BOUNDS, budget);
      const scan = foreign.scan.bind(foreign);
      foreign.scan = (position, count) => {
        const before = budget.admitted(); scan(position, count);
        scanCosts.push({ seq: position.seq, count, cost: difference(before, budget.admitted()) });
      };
      const prefix = archivePrefixMetadata(sql, consumer.at, through, PROPOSED_BOUNDS, budget, new Set([receiver.digest]));
      positions = archivePrivacyMetadata(sql, prefix, policy(receiver).support, budget, foreign).positions.map(position => position.seq);
      const beforeBasis = budget.admitted(); basis = foreign.basis();
      const basisCost = difference(beforeBasis, budget.admitted()), beforeSelection = budget.admitted();
      const selection = foreign.selection(), selectionCost = difference(beforeSelection, budget.admitted());
      const lookups: ArchiveCost[] = [];
      copies = uses.map(use => {
        let before = budget.admitted(); const copy = foreign.get(use.content);
        lookups.push(difference(before, budget.admitted()));
        before = budget.admitted(); const from = foreign.source(use.fact);
        lookups.push(difference(before, budget.admitted()));
        expect(from).toEqual(copy); return copy;
      });
      expect(selection).toEqual(copies);
      mapCosts = { basis: basisCost, selection: selectionCost, lookups };
      const alreadyRead = selection.find(copy => copy.fact.seq > 0)!;
      const beforeRepeat = budget.admitted();
      foreign.scan(prefix.positions[1]!, 1); // Same native direct use, same original ledger.
      repeatCost = { bytes: alreadyRead.bytes, cost: difference(beforeRepeat, budget.admitted()) };
    } catch (error) { reason = (error as { reason: string }).reason; }
    expect(forbidden).toEqual([]);
    return { reason, positions, basis, copies, queries, cost: budget.admitted(), mapCosts, nativeCosts, repeatCost, scanCosts };
  });
  const inventory = (pins: FixtureArchiveSourcePins | undefined = sources, reviewed = policies, damageBody = false, limits: Partial<ArchiveCost> = {}) => consumer.inside(state => {
    const calls: { query: string; key: unknown }[] = [];
    let damaged = false;
    const result = inventoryArchive({ exec(query, ...args) {
      calls.push({ query, key: args[0] });
      if (damageBody && !damaged && query.startsWith("SELECT bytes FROM retained_input") && args[0] === "entry") {
        damaged = true;
        // Change a genuine retained body after metadata admission. Neither
        // source nor consumer journal is changed; the content hash must fail.
        const seq = uses.find(use => use.content === args[1])!.fact.seq;
        state.storage.sql.exec("UPDATE retained_input SET bytes = replace(bytes, ?, ?) WHERE kind = 'entry' AND digest = ?", `"seq":${seq}`, `"seq":${seq + 1}`, args[1]!);
      }
      return state.storage.sql.exec(query, ...args);
    }, transaction: work => state.storage.transactionSync(work) }, consumer.at, through, PROPOSED_BOUNDS, reviewed, new ArchiveBudget(limits), pins);
    return { result, calls, damaged };
  });
  return { producer, consumer, birth: birth.value, assigned, uses, sources, policies, through, scan, inventory };
}

test("direct foreign copies classify their own full headers against fixture pins and separate reviewed policy before any payload body", async () => {
  const f = await fixture(), result = await f.scan();
  expect(result.reason).toBe("admitted"); expect(result.positions).toEqual([0, 1, 2]);
  expect(result.basis).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  expect(result.copies).toEqual(f.uses.map(use => expect.objectContaining({ content: use.content, fact: use.fact, pin: definition.digest, under: definition.declared.name })));
  expect(result.queries.some(query => query.includes("json_each(entry.bytes, '$.uses')"))).toBe(true);
  expect(result.cost.attempts).toBeGreaterThan(0);
  expect(result.mapCosts).not.toBeNull();
  const fixed = { entries: 0, attempts: 0, nodes: 0, calls: 0 };
  expect(result.mapCosts!.basis).toEqual({ ...fixed, metadata: 512, inputWork: 4096 });
  expect(result.mapCosts!.selection).toEqual({ ...fixed, metadata: 1024, inputWork: 2048 });
  for (const lookup of result.mapCosts!.lookups) {
    expect(lookup).toEqual({ ...fixed, attempts: 1, metadata: 256, inputWork: 512 });
    expect(forecastArchiveForeignLookup()).toEqual(lookup);
  }
  expect(forecastArchiveForeignBasis(result.basis.length)).toEqual(result.mapCosts!.basis);
  expect(forecastArchiveForeignSelection(result.copies.length)).toEqual(result.mapCosts!.selection);
  const useReads = result.nativeCosts.filter(row => row.query.includes("json_each(entry.bytes, '$.uses')"));
  const sizeReads = result.nativeCosts.filter(row => row.query.startsWith("SELECT octet_length(bytes) AS size"));
  const genesisReads = result.nativeCosts.filter(row => row.query.includes("$.input.seed.definition"));
  expect(useReads).toHaveLength(3); expect(sizeReads).toHaveLength(2); expect(genesisReads).toHaveLength(1);
  for (const row of useReads) {
    expect(row.cost).toEqual({ ...fixed, calls: 1, metadata: 1536, inputWork: 1536 });
    expect(forecastArchiveForeignScan(1)).toEqual(row.cost);
  }
  for (const row of sizeReads) {
    expect(row.cost).toEqual({ ...fixed, calls: 1, metadata: 128, inputWork: 128 });
    expect(forecastArchiveForeignCopySize()).toEqual(row.cost);
  }
  expect(genesisReads[0]!.cost).toEqual({ ...fixed, calls: 1, metadata: 512, inputWork: 512 });
  expect(forecastArchiveForeignGenesis()).toEqual(genesisReads[0]!.cost);
  expect(result.repeatCost).not.toBeNull();
  const repeat = result.repeatCost!;
  expect(repeat.cost).toEqual({ ...fixed, attempts: 1, calls: 1, metadata: 1536, inputWork: 2048 + repeat.bytes * 64 });
  const quote = forecastArchiveForeignRepeat(repeat.bytes), scan = forecastArchiveForeignScan(1);
  for (const key of Object.keys(quote) as (keyof ArchiveCost)[]) expect(quote[key] + scan[key]).toBe(repeat.cost[key]);
  expect(forecastArchiveForeignCopyRequest()).toEqual({ ...fixed, attempts: 1, metadata: 0, inputWork: 512 });
  expect(result.scanCosts).toHaveLength(3);
  for (let index = 0; index < 2; index++) {
    const use = f.uses[index]!, source = use.fact.seq === 0 ? f.birth.entry : f.assigned.entry;
    const copy = result.copies[index] as { bytes: number };
    const cold = forecastArchiveForeignColdCopy({ bytes: copy.bytes, input: source.input.type,
      effects: source.effects.length, declarationUnits: canonicalize(definition.declared).length,
      support: { declarationNodes: 0, ownerKinds: 0, ownerDomains: 0, capabilityKinds: 0 }, membership8: false });
    expect(cold.ok).toBe(true);
    if (cold.ok) {
      const uses = forecastArchiveForeignScan(1), actual = result.scanCosts[index]!.cost;
      for (const key of Object.keys(cold.work) as (keyof typeof cold.work)[]) expect(cold.work[key] + uses[key]).toBe(actual[key]);
    }
  }
  expect(result.scanCosts.slice(0, 2).reduce((sum, row) => sum + row.cost.nodes, 0)).toBe(1);



});

// Native metadata admission and SQLite are real. Policy/source/clock/read
// configuration stays the explicit TEST fixture above; no export is made.
test("native foreign recording pays scout work and fences fresh metadata after a native turn", async () => {
  const f = await fixture();
  const result = await f.consumer.inside(state => {
    const budget = new ArchiveBudget(), forbidden: string[] = [];
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      if (/^SELECT (?:\*|bytes)(?:\s|,)/.test(query)) { forbidden.push(query); throw Error("body tripwire"); }
      return state.storage.sql.exec(query, ...args);
    } };
    const recorder = new ArchiveForeignMetadata(sql, f.sources, f.policies, PROPOSED_BOUNDS, budget, new Set(), receiver.digest, { record: true });
    const scans: Readonly<ArchiveForeignRecordedScan>[] = [], scan = recorder.scan.bind(recorder);
    const measuring = new ArchiveRetainedReader(sql, budget);
    recorder.scan = (position, count) => {
      scan(position, count); const held = recorder.recorded(position); scans.push(held);
      for (const request of held.requests) if (request.kind === "cold") {
        const descriptor = { content: request.content, bytes: request.copy.bytes, fact: request.copy.fact, pin: request.copy.pin };
        // Both first and repeated registration pay full original table work.
        for (let repeat = 0; repeat < 2; repeat++) {
          const before = budget.admitted(); measuring.registerCopy(descriptor); const after = budget.admitted();
          expect(after.metadata - before.metadata).toBe(512); expect(after.inputWork - before.inputWork).toBe(1024);
          expect(after.attempts).toBe(before.attempts); expect(after.calls).toBe(before.calls);
        }
        expect(measuring.measure({ kind: "entry", digest: request.content }, request.copy.bytes)).toBe(request.copy.bytes);
        const tight = new ArchiveRetainedReader(sql, new ArchiveBudget(), [descriptor]);
        expect(() => tight.registerCopy({ ...descriptor, bytes: descriptor.bytes + 1 })).toThrow("archive-unavailable");
      }
    };
    const prefix = archivePrefixMetadata(sql, f.consumer.at, f.through,
      PROPOSED_BOUNDS, budget, new Set([receiver.digest]));
    archivePrivacyMetadata(sql, prefix, policy(receiver).support, budget, recorder);
    recorder.scan(prefix.positions[1]!, 1); // An actual repeated direct use on this same scout ledger.
    const scouted = budget.admitted(), cold = scans.flatMap(row => row.requests.filter(request => request.kind === "cold"));
    budget.spend({ metadata: cold.length * 256, inputWork: cold.length * 512 });
    const expected = new Map(cold.map(request => [request.content, request.copy]));
    const fresh = new ArchiveForeignMetadata(sql, f.sources, f.policies, PROPOSED_BOUNDS, budget, new Set(), receiver.digest, { expected });
    const receipts: ArchiveCost[] = [];
    for (const recorded of scans) {
      const quote = { attempts: 0, calls: 0, metadata: 0, inputWork: 0 }, uses = forecastArchiveForeignScan(recorded.uses);
      for (const key of Object.keys(quote) as (keyof typeof quote)[]) quote[key] += uses[key];
      for (const request of recorded.requests) {
        const work = request.kind === "repeat" ? forecastArchiveForeignRepeat(request.bytes) : forecastArchiveForeignColdCopy(request.footprint);
        if ("ok" in work && !work.ok) return expect.fail("The actual native cold copy must fit its scalar bounds.");
        const cost = "ok" in work ? work.work : work;
        for (const key of Object.keys(quote) as (keyof typeof quote)[]) quote[key] += cost[key];
      }
      const before = budget.admitted(); fresh.scan(recorded.position, recorded.uses); const after = budget.admitted();
      const actual = Object.fromEntries(Object.keys(before).map(key => [key, after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]])) as ArchiveCost;
      for (const key of Object.keys(quote) as (keyof typeof quote)[]) expect(quote[key]).toBe(actual[key]);
      receipts.push(actual);
    }
    const metadataOnly = (value: unknown): boolean => value === null || ["string", "number", "boolean"].includes(typeof value)
      || Array.isArray(value) && value.every(metadataOnly)
      || typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(metadataOnly);
    return { scans, scouted, final: budget.admitted(), receipts, forbidden,
      metadataOnly: metadataOnly(scans), frozen: scans.every(row => Object.isFrozen(row) && Object.isFrozen(row.requests)
        && row.requests.every(request => Object.isFrozen(request) && (request.kind === "repeat" || Object.isFrozen(request.footprint.support)))) };
  });
  expect(result.scans).toHaveLength(3);
  expect(result.scans[2]!.requests[0]!.kind).toBe("repeat");
  expect(result.scans[2]!.requests[0]!.content).toBe(result.scans[0]!.requests[0]!.content);
  expect(result.metadataOnly).toBe(true); expect(result.frozen).toBe(true);
  expect(result.forbidden).toEqual([]); expect(result.scouted.nodes).toBe(1); expect(result.final.nodes).toBe(2);
  expect(result.final.inputWork).toBeGreaterThan(result.scouted.inputWork);
  const first = result.scans[0]!, second = result.scans[1]!;
  for (const variant of ["size", "effects"] as const) {
    const changed = await f.consumer.inside(state => {
      const all = result.scans.flatMap(row => row.requests.filter(request => request.kind === "cold"));
      const expected = new Map<Digest, Readonly<ArchiveForeignExpectedCopy>>(all.map(request => [request.content, request.copy]));
      const selected = variant === "size" ? first : second, request = selected.requests[0]!;
      if (request.kind !== "cold") return expect.fail("The fixture must first see each retained copy cold.");
      const raw = state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM retained_input WHERE kind = 'entry' AND digest = ?", request.content).one().bytes;
      let bytes = raw + " ";
      if (variant === "effects") {
        const entry = parseStrict(raw); if (!isEntry(entry) || entry.effects.length === 0) return expect.fail("The real genesis copy needs effects.");
        bytes = canonicalize({ ...entry, effects: [] }); bytes += " ".repeat(utf8(raw).length - utf8(bytes).length);
      }
      const queries: string[] = [], budget = new ArchiveBudget();
      const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) { queries.push(query); return state.storage.sql.exec(query, ...args); } };
      let reason = "admitted";
      try {
        state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", bytes, request.content);
        new ArchiveForeignMetadata(sql, f.sources, f.policies, PROPOSED_BOUNDS, budget, new Set(), receiver.digest, { expected }).scan(selected.position, selected.uses);
      } catch (error) { if (!(error instanceof ArchivePrefixStopped)) throw error; reason = error.reason; }
      finally { state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", raw, request.content); }
      return { reason, queries, cost: budget.admitted() };
    });
    expect(changed.reason).toBe("foreign-source-mismatch");
    expect(changed.queries.filter(query => query.includes("AS effects"))).toHaveLength(variant === "size" ? 0 : 1);
    expect(changed.queries.some(query => query.startsWith("SELECT bytes"))).toBe(false);
    expect(changed.cost.nodes).toBe(0);
  }
});

// Each copied fact is a real native use. Rebuilding the scout between
// entries gives a cold recorder cache, not another budget or admission.
test("foreign plans quote native whole prefixes and retain an earlier boundary after failed lookahead", async () => {
  const f = await fixture(true);
  const result = await f.consumer.inside(state => {
    const budget = new ArchiveBudget(), queries: string[] = [];
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      queries.push(query);
      if (/^SELECT (?:\*|bytes)(?:\s|,)/.test(query)) throw Error("body tripwire");
      return state.storage.sql.exec(query, ...args);
    } };
    const prefix = archivePrefixMetadata(sql, f.consumer.at, f.through, PROPOSED_BOUNDS, budget, new Set([receiver.digest]));
    const plan = new ArchiveForeignPlan(prefix.positions[0]!.seq, budget), visited = new Set<Digest>();
    archiveSupportMetadata(policy(receiver).support, budget);
    const counts: number[] = [], recordedKinds: string[] = [];
    for (const position of prefix.positions) {
      const source = { kind: "local" as const, position }, header = archiveEntryHeader(sql, source, budget);
      archiveEntryPrivacy(sql, source, header, policy(receiver).support, budget);
      counts.push(header.uses);
      let recorded: Readonly<ArchiveForeignRecordedScan> | null = null;
      if (header.uses) {
        const scout = new ArchiveForeignMetadata(sql, f.sources, f.policies, PROPOSED_BOUNDS, budget, visited, receiver.digest, { record: true });
        scout.scan(position, header.uses); recorded = scout.recorded(position);
        recordedKinds.push(...recorded.requests.map(request => request.kind));
      }
      plan.append(position, header.uses, recorded);
    }
    const scouted = budget.admitted(), earlier = prefix.positions[1]!, head = { seq: earlier.seq, hash: earlier.hash };
    const handoff = plan.handoffCost(), beforeMap = budget.admitted(), oldMap = plan.expectedCopies(head), afterMap = budget.admitted();
    for (const key of Object.keys(handoff) as (keyof ArchiveCost)[]) expect(afterMap[key] - beforeMap[key]).toBe(handoff[key]);
    expect(oldMap.size).toBe(1);
    const expected = plan.expectedCopies(f.through);
    const fresh = new ArchiveForeignMetadata(sql, f.sources, f.policies, PROPOSED_BOUNDS, budget, new Set(), receiver.digest, { expected });
    const work = { attempts: 0, calls: 0, metadata: 0, inputWork: 0 };
    for (const [index, position] of prefix.positions.entries()) {
      const before = budget.admitted(); if (counts[index]) fresh.scan(position, counts[index]!); const after = budget.admitted();
      for (const key of Object.keys(work) as (keyof typeof work)[]) work[key] += after[key] - before[key];
      const quote = plan.quote({ seq: position.seq, hash: position.hash });
      expect(quote.work).toEqual(work);
      expect(quote.copies).toBe(Math.min(position.seq, 2));
      expect(quote.declarations).toEqual(position.seq === 0 ? [] : [definition.digest]);
    }
    const quoteBefore = plan.quote(head), beforeFailed = budget.admitted();
    // Synthetic extra position tests metadata-plan failure only. No native
    // entry, scoped admission, payload or later journal is invented.
    const extra = { seq: f.through.seq + 1, hash: textDigest("TEST uncommitted lookahead position"), bytes: 1 };
    const failed = budget.lookahead({ metadata: ARCHIVE_BOUNDS.metadata - beforeFailed.metadata }, () => plan.append(extra, 0, null));
    expect(failed.kind).toBe("limited");
    const quoteAfter = plan.quote(head); expect(quoteAfter).toEqual(quoteBefore);
    let uncommitted: string | null = null;
    try { plan.quote(extra); } catch (error) { if (!(error instanceof ArchivePrefixStopped)) throw error; uncommitted = error.reason; }
    expect(uncommitted).toBe("mismatch");
    return { recordedKinds, scouted, final: budget.admitted(), quoteBefore, quoteAfter, expected: [...expected.keys()], oldExpected: [...oldMap.keys()], queries };
  });
  expect(result.recordedKinds).toEqual(["cold", "cold", "cold"]);
  expect(result.expected).toHaveLength(2); expect(result.oldExpected).toEqual([f.uses[0]!.content]);
  expect(result.quoteBefore).toEqual(result.quoteAfter);
  expect(result.scouted.nodes).toBe(1); expect(result.final.nodes).toBe(2);
  expect(result.queries.some(query => /^SELECT (?:\*|bytes)(?:\s|,)/.test(query))).toBe(false);
});

// Invariant: real direct-copy scouting may cross Native turns, while
// fresh inventory still classifies every copy and byte-compares each plan.
test("Native scout carries direct-copy metadata across a closed frame and prices fresh cold/repeat admission", async () => {
  const f = await fixture(true), budget = new ArchiveBudget();
  const earlier = (await f.consumer.sealed())[1]!, earlierHead = { seq: earlier.entry.seq, hash: earlier.hash };
  let earlierCandidates = 0;
  let scout!: ArchiveScout;
  const first = await f.consumer.inside(state => {
    const frame = ArchiveScout.open(state.storage.sql, f.consumer.at, f.through, null, PROPOSED_BOUNDS, f.policies, budget, f.sources);
    expect(frame.next().kind).toBe("position"); expect(frame.next().kind).toBe("position");
    scout = frame.close(); earlierCandidates = scout.layout(earlierHead).anchorCandidates; return budget.admitted();
  });
  await f.consumer.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  const result = await f.consumer.inside(state => {
    const queries: string[] = []; let fresh = false;
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      if (!fresh && query.startsWith("SELECT bytes FROM retained_input") && args[0] !== "definition") return expect.fail("Scout cannot read retained copy/rule/snapshot bodies.");
      queries.push(query); return state.storage.sql.exec(query, ...args);
    }, transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
    const frame = scout.resume(sql);
    expect(frame.next().kind).toBe("position"); expect(frame.next().kind).toBe("position");
    expect(frame.next()).toEqual({ kind: "end" }); frame.close();
    expect(scout.layout(earlierHead).anchorCandidates).toBe(earlierCandidates);
    expect(scout.layout(f.through).anchorCandidates).toBeGreaterThanOrEqual(earlierCandidates);
    expect(queries.some(query => query.startsWith("SELECT bytes FROM entry") || query.startsWith("SELECT bytes FROM retained_value") || query.startsWith("SELECT bytes FROM retained_input") && !query.includes("kind = ?"))).toBe(false);
    const forecast = scout.inventoryCost(f.through), constraints = scout.select(f.through), before = budget.admitted();
    expect(constraints.expectedCopies.size).toBe(2); fresh = true;
    const selected = inventoryArchive(sql, f.consumer.at, f.through, PROPOSED_BOUNDS, f.policies, budget, f.sources, null,
      constraints.forecast, constraints.declarationSizes, constraints.expectedCopies, constraints.retainedSizes);
    expect(selected.ok).toBe(true); if (!selected.ok) return expect.fail(selected.reason);
    const after = budget.admitted();
    for (const key of Object.keys(forecast) as (keyof ArchiveCost)[]) expect(forecast[key]).toBeGreaterThanOrEqual(after[key] - before[key]);
    expect(selected.inventory.objects.filter(object => object.key.kind === "entry").map(object => object.key.digest)).toEqual([...new Set(f.uses.map(use => use.content))]);
    expect(selected.inventory.entries.map(entry => entry.seq)).toEqual([0, 1, 2, 3]);
    return after;
  });
  expect(result.entries).toBe(8); expect(result.nodes).toBe(4);
  expect(result.attempts).toBeGreaterThan(first.attempts);
});

// Synthetic JSON exercises only real SQLite scalar metadata, not native
// judgment, privacy admission or an authority fact. Production calls this
// counter only after admitting the exact row's prefix and privacy class.
test("anchor forecast counts nested necessary keys without charging irrelevant bytes as references and refuses before SQL", async () => {
  const lane = await create(), hash = textDigest("TEST scalar anchor metadata row"), seq = 1_000_000;
  const fact = { at: lane.at, seq: 7, hash: textDigest("TEST nested fact") }, head = { seq: 8, hash: textDigest("TEST observed head") };
  const fields = { nested: [{ deep: [fact] }, { deeper: { of: lane.at, head } }],
    // None of these objects is a real FactRef or observation. These necessary
    // keys deliberately increase the conservative bound by three. The
    // two real numbers also distinguish integer-only SQL counting.
    falsePositives: [{ at: {}, seq: 1.5, hash: "not a digest" }, { at: {}, seq: 2.5, hash: "also not a digest" }, { of: {}, head: {} }] };
  const small = JSON.stringify(fields), large = JSON.stringify({ ...fields,
    irrelevant: 'at seq hash of head {"at":{},"seq":1,"hash":"text"} '.repeat(512) });
  await lane.inside(state => {
    const raw = state.storage.sql;
    const read = (bytes: string) => {
      const size = utf8(bytes).length, work = size * 64 + 128;
      raw.exec("INSERT INTO entry (seq, hash, time, bytes, size) VALUES (?, ?, 'TEST metadata only', ?, ?)", seq, hash, bytes, size);
      try {
        const position = { seq, hash, bytes: size }, budget = new ArchiveBudget(); let calls = 0;
        const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
          calls++;
          expect(budget.admitted()).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 128, inputWork: work });
          expect(query).toContain("json_tree(entry.bytes)"); expect(query).not.toContain("tree.value");
          expect(query).not.toMatch(/^SELECT (?:bytes|\*)/);
          return raw.exec(query, ...args);
        } };
        expect(archiveEntryAnchorCandidates(sql, position, PROPOSED_BOUNDS.entryBytes, budget)).toBe(5);
        expect(calls).toBe(1);
        let forbiddenCalls = 0;
        const forbidden = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
          forbiddenCalls++; return raw.exec(query, ...args);
        } };
        expect(() => archiveEntryAnchorCandidates(forbidden, position, PROPOSED_BOUNDS.entryBytes,
          new ArchiveBudget({ inputWork: work - 1 }))).toThrow(expect.objectContaining({ reason: "limit" }));
        const protectedBudget = new ArchiveBudget();
        expect(protectedBudget.lookahead({ inputWork: ARCHIVE_BOUNDS.inputWork - work + 1 }, () =>
          archiveEntryAnchorCandidates(forbidden, position, PROPOSED_BOUNDS.entryBytes, protectedBudget))).toEqual({ kind: "limited" });
        expect(forbiddenCalls).toBe(0); expect(protectedBudget.admitted().inputWork).toBe(0);
        // A refused later read neither consumes its debit nor replaces any
        // earlier prefix count. The same original budget can still finish.
        expect(archiveEntryAnchorCandidates(forbidden, position, PROPOSED_BOUNDS.entryBytes, protectedBudget)).toBe(5);
        expect(forbiddenCalls).toBe(1); expect(protectedBudget.admitted().inputWork).toBe(work);
        expect(() => archiveEntryAnchorCandidates(forbidden, { ...position, hash: textDigest("TEST wrong exact row hash") },
          PROPOSED_BOUNDS.entryBytes, new ArchiveBudget())).toThrow(expect.objectContaining({ reason: "mismatch" }));
        expect(forbiddenCalls).toBe(2);
      } finally { raw.exec("DELETE FROM entry WHERE seq = ?", seq); }
    };
    read(small); read(large);
    expect(utf8(large).length).toBeGreaterThan(utf8(small).length * 16);
  });
});

test("missing source or inline policy and a conflicting retained genesis pin refuse the whole prefix before payloads", async () => {
  const f = await fixture();
  const missing = await f.scan(new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, new ArchiveBudget()));
  expect(missing.reason).toBe("foreign-source-unavailable"); expect(missing.positions).toEqual([]);
  const absentPolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)]]));
  expect(absentPolicy.reason).toBe("unsupported-archive-cohort"); expect(absentPolicy.positions).toEqual([]);
  const incompletePolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition, new Set(["act"]))]]));
  expect(incompletePolicy.reason).toBe("unsupported-archive-cohort"); expect(incompletePolicy.positions).toEqual([]);
  const genesisUse = f.uses.find(use => use.fact.seq === 0)!;
  const damaged = structuredClone(f.birth.entry); if (damaged.input.type !== "genesis") return expect.fail("native genesis required");
  // Corrupt only the locally retained copy, never the producer/consumer journal.
  damaged.input.seed.definition = receiver.digest;
  await f.consumer.inside(state => { state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", canonicalize(damaged), genesisUse.content); });
  const conflict = await f.scan();
  expect(conflict.reason).toBe("foreign-source-mismatch"); expect(conflict.positions).toEqual([]);
});

test("native inventory admits only classified direct copies and refuses a final uncovered class before any entry body", async () => {
  const f = await fixture();
  const incomplete = await f.inventory(f.sources, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition, new Set(["act"]))]]));
  expect(incomplete.result).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
  const bodies = (calls: typeof incomplete.calls) => calls.filter(call => call.query.startsWith("SELECT bytes FROM entry") || call.query.startsWith("SELECT bytes FROM retained_input") && call.key !== "definition" || call.query.startsWith("SELECT bytes FROM retained_value"));
  expect(bodies(incomplete.calls)).toEqual([]);
  const missing = await f.inventory(new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, new ArchiveBudget()));
  expect(missing.result).toEqual({ ok: false, reason: "foreign-source-unavailable" }); expect(bodies(missing.calls)).toEqual([]);
  const accepted = await f.inventory(f.sources, f.policies, false, { nodes: 2 });
  expect(accepted.result.ok).toBe(true);
  if (!accepted.result.ok) return;
  const short = await f.inventory(f.sources, f.policies, false, { nodes: 1 });
  expect(short.result).toEqual({ ok: false, reason: "limit" }); expect(bodies(short.calls)).toEqual([]);
  expect(accepted.result.inventory.cost.nodes).toBe(2); // root + one producer declaration, used twice
  expect(accepted.result.inventory.foreignSources).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  expect(accepted.result.inventory.objects.map(object => object.key)).toEqual([{ kind: "definition", digest: receiver.digest }, ...f.uses.map(use => ({ kind: "entry", digest: use.content }))]);
  expect(accepted.result.inventory.objects.filter(object => object.key.kind === "entry").map(object => object.foreign)).toEqual(f.uses.map(use => ({ fact: use.fact, pin: definition.digest })));
  expect(bodies(accepted.calls).filter(call => call.key === "entry")).toHaveLength(2);
  expect(accepted.result.inventory.replay).toBe("unchecked");
  // Rebuild reads the immutable result after another native turn/restart.
  // The fixture supplies the same separately prepared source-pin map.
  const selection = accepted.result.inventory;
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "later unselected native act" } });
  await f.consumer.restart();
  await f.consumer.inside(async state => {
    let calls = 0;
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      calls++; expect(query).not.toContain("json_each"); expect(query).not.toContain("FROM meta");
      return state.storage.sql.exec(query, ...args);
    }, transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
    expect(() => archiveInput(sql, selection, new ArchiveBudget())).toThrow(expect.objectContaining({ reason: "foreign-source-unavailable" }));
    const wrongPair = { ...selection, foreignSources: [{ at: f.producer.at, pin: receiver.digest }] };
    expect(() => archiveInput(sql, wrongPair, new ArchiveBudget(), f.sources)).toThrow(expect.objectContaining({ reason: "foreign-source-mismatch" }));
    expect(calls).toBe(0);
    const input = archiveInput(sql, selection, new ArchiveBudget(), f.sources);
    for (const object of selection.objects.filter(object => object.key.kind === "entry")) {
      const bytes = await input.retained(object.key, object.bytes);
      expect(bytes).not.toBeNull();
      expect(JSON.parse(bytes!).at).toEqual(f.producer.at);
    }
    expect(await input.entry(3, 1)).toBeNull();
  });
  const damaged = await f.inventory(f.sources, f.policies, true);
  expect(damaged.damaged).toBe(true);
  expect(damaged.result).toEqual({ ok: false, reason: "incomplete" });
});

// Native direct-use scopes, not an installed application. This covers the
// immutable Mark/layout/structural reader boundary; no host or replay claim.
test("published replay closure adds only admitted public-copy producers and rebuilds the exact Mark", async () => {
  const f = await fixture(true, true), through = await f.consumer.head();
  // The target knows the consumer but omits its real copied producer.
  // Only the completed inventory can contribute that additional full ref.
  const targetScopes = [f.consumer.at], expected = [f.consumer.at, f.producer.at];
  const plan = (replayScopes = targetScopes) => f.consumer.inside(state => planPublishedArchivePass(archiveSql(state), {
    at: f.consumer.at, through, after: null, bounds: PROPOSED_BOUNDS, policies: f.policies,
    format: "sha1", parent: null, markedAt: at(0), fixtureSources: f.sources, replayScopes,
  }, new ArchiveBudget()));
  const conflicting = { ...f.producer.at, inc: newIncarnation(new Uint8Array(16).fill(73)) };
  expect(conflicting.inc).not.toBe(f.producer.at.inc);
  expect(await plan([...targetScopes, conflicting])).toEqual({ ok: false, reason: "foreign-source-mismatch" });
  const privateAt = archiveAuthorityAnchors(f.consumer).find(fact => fact.at.kind === "membership")!.at;
  expect(await plan([...targetScopes, privateAt])).toEqual({ ok: false, reason: "unavailable" });
  const planned = await plan();
  expect(planned.ok, JSON.stringify(planned)).toBe(true); if (!planned.ok) return;
  expect(planned.archive.selection.objects.some(object => object.foreign?.fact.at.scope === f.producer.name)).toBe(true);
  expect(planned.mark.replayScopes).toEqual(expected);
  expect(planned.archive.manifest.anchors?.some(fact => fact.at.scope === f.producer.name)).toBe(false);
  expect(planned.mark.replayScopes?.some(where => ["membership", "register", "inbox"].includes(where.kind))).toBe(false);
  for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) expect(planned.archive.cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
  await f.consumer.inside(state => {
    const rows = new ArchiveRows(archiveSql(state), f.consumer.at);
    expect(rows.load()).toBeNull(); rows.target(archiveRepository, "sha1"); rows.mark(planned.mark);
  });
  await f.consumer.restart();
  const rebuilt = await f.consumer.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, f.consumer.at), row = rows.load()!;
    expect(row.pending).toEqual(planned.mark);
    expect(await rebuildArchivePass(sql, { ...row, pending: { ...row.pending!, replayScopes: targetScopes } },
      null, new ArchiveBudget(), f.sources)).toEqual({ ok: false, reason: "rebuild-mismatch" });
    const result = await rebuildArchivePass(sql, row, null, new ArchiveBudget(), f.sources);
    expect(rows.load()!.pending).toEqual(planned.mark);
    return result;
  });
  expect(rebuilt.ok, JSON.stringify(rebuilt)).toBe(true); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(planned.archive.commit);
  expect(rebuilt.archive.objects).toEqual(planned.archive.objects);
  expect(rebuilt.archive.manifestBytes).toBe(planned.archive.manifestBytes);
});

// Both immutable formats keep the original unpublished caller path below.
test.each(["sha1", "sha256"] as const)("foreign copies retain their source basis in %s files and rebuild after eviction", async format => {
  const f = await fixture(), through = await f.consumer.head();
  const planned = await f.consumer.inside(state => planArchive(archiveSql(state), { at: f.consumer.at, through, bounds: PROPOSED_BOUNDS, policies: f.policies, format, parent: null, markedAt: at(0), fixtureSources: f.sources }, new ArchiveBudget()));
  expect(planned.ok, JSON.stringify(planned)).toBe(true); if (!planned.ok) return;
  expect(planned.archive.manifest.foreignSources).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  await f.consumer.inside(state => { const rows = new ArchiveRows(archiveSql(state), f.consumer.at); rows.target(archiveRepository, format); rows.mark(planned.mark); });
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "after immutable Mark" } });
  await f.consumer.restart();
  const rebuilt = await f.consumer.inside(async state => {
    const sql = archiveSql(state), row = new ArchiveRows(sql, f.consumer.at).load()!;
    let reads = 0;
    const exact = { ...sql, exec: (...args: Parameters<typeof sql.exec>) => { reads++; return sql.exec(...args); } };
    expect(await rebuildArchive(exact, row, null, new ArchiveBudget())).toEqual({ ok: false, reason: "foreign-source-unavailable" });
    expect(reads).toBe(0);
    return rebuildArchive(exact, row, null, new ArchiveBudget(), f.sources);
  });
  expect(rebuilt.ok, JSON.stringify(rebuilt)).toBe(true); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(planned.archive.commit); expect(rebuilt.archive.objects).toEqual(planned.archive.objects);
  const objects = new Map(rebuilt.archive.objects.map(object => [object.id, object]));
  const object = async (id: string, limit: number) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; };
  const open = (commit: string) => {
    const native = new ArchiveBudget(); let bytes = 0;
    return readJournalArchive({ format: async () => format, resolve: async ref => ref === journalRef(f.consumer.at.scope) ? commit : null, object,
    }, f.consumer.at.scope, Object.assign(native, { bytes: (size: number) => { bytes += size; if (bytes > 8 * 1024 * 1024) native.stop("limit"); }, scope: () => native.spend({ nodes: 1 }) }));
  };
  const read = await open(rebuilt.archive.commit);
  expect(read.ok, JSON.stringify(read)).toBe(true); if (!read.ok) return;
  expect(read.archive.foreignSources).toEqual(planned.archive.manifest.foreignSources);
  expect(read.archive.head).toEqual(through);
  expect(read.archive.retained.filter(input => input.kind === "entry").map(input => input.digest).sort()).toEqual(f.uses.map(use => use.content).sort());
  // A later native act introduces another real producer. The cumulative
  // archive adds its basis while the checked parent keeps only its own.
  const laterProducer = await create();
  wired.set(f.consumer.name, () => ({ resolver: namespace(env.SCOPES).resolver }));
  try {
    await f.consumer.restart();
    await f.consumer.did(rita, "remark", { on: 0, fields: { text: "later producer", proof: laterProducer.genesis.fact } });
  } finally { wired.delete(f.consumer.name); }
  const laterBirth = await laterProducer.stub.entry(reader, 0);
  expect(laterBirth.ok).toBe(true); if (!laterBirth.ok) return;
  const nextSources = new FixtureArchiveSourcePins([
    { at: f.producer.at, birth: { bytes: canonicalize(f.birth.entry), hash: f.birth.hash }, declaration: canonicalize(definition.declared) },
    { at: laterProducer.at, birth: { bytes: canonicalize(laterBirth.value.entry), hash: laterBirth.value.hash }, declaration: canonicalize(definition.declared) },
  ], PROPOSED_BOUNDS, new ArchiveBudget());
  const nextHead = await f.consumer.head();
  const extended = await f.consumer.inside(state => {
    const sql = archiveSql(state);
    // Component confirmation stands in for host custody, as in the owning
    // local build witness. It writes no journal entry.
    new ArchiveRows(sql, f.consumer.at).confirm(planned.mark.commit);
    return planArchive(sql, { at: f.consumer.at, through: nextHead, bounds: PROPOSED_BOUNDS, policies: f.policies, format, parent: { id: planned.archive.commit, source: { object } }, markedAt: at(1), fixtureSources: nextSources }, new ArchiveBudget({ nodes: 2 }));
  });
  expect(extended.ok, JSON.stringify(extended)).toBe(true); if (!extended.ok) return;
  expect(extended.archive.newInterval).toEqual([through.seq + 1, nextHead.seq]);
  expect(extended.archive.manifest.foreignSources).toHaveLength(2);
  expect(planned.archive.manifest.foreignSources).toHaveLength(1);
  // A validly shaped selection still cannot invent a different consumer
  // fact. Layout must refuse it before asking for any retained copy body.
  const altered = JSON.parse(planned.mark.manifest);
  altered.objects.find((object: { foreign?: { fact: { seq: number } } }) => object.foreign?.fact.seq !== undefined && object.foreign.fact.seq > 0).foreign.fact.seq++;
  const budget = new ArchiveBudget(); budget.spend(altered.cost);
  const wrong = await buildJournalArchive({ format, selection: canonicalize(altered), budget, parent: null, input: {
    entry: async seq => read.archive.entries.find(entry => entry.seq === seq)?.bytes ?? null,
    retained: async () => expect.fail("altered foreign binding reached a retained body"),
  } });
  expect(wrong).toMatchObject({ ok: false, reason: "input-mismatch" });
  // Mechanically alter only the archive's descriptive pin. Re-encode valid
  // Git hashes/trees/commit so the independent reader must detect the
  // retained genesis disagreement, rather than an object hash corruption.
  const alterManifest = (manifest: typeof rebuilt.archive.manifest, omitCopies = false): string => {
    const work = new JournalWork(new ArchiveBudget()), maker = new JournalObjects(format, work), parser = new JournalObjectReader(format, { object }, work);
    const blob = maker.make("blob", utf8(canonicalize(manifest)));
    const change = (tree: string, prefix = ""): string => maker.tree(parser.tree(objects.get(tree)!.data).flatMap(row => {
      const path = prefix + row.name;
      if (omitCopies && path === "journal/v1/retained/entry") return [];
      return [{ ...row, id: row.mode === "40000" ? change(row.id, path + "/") : path === "journal/v1/manifest.json" ? blob.id : row.id }];
    })).id;
    const original = parser.commit(objects.get(rebuilt.archive.commit)!.data), corrupted = maker.commit(change(original.tree), original.parent, original.seconds);
    for (const made of maker.objects()) objects.set(made.id, made);
    return corrupted.id;
  };
  expect(await open(alterManifest({ ...rebuilt.archive.manifest, foreignSources: [{ at: f.producer.at, pin: receiver.digest }] }))).toMatchObject({ ok: false, result: "mismatch", reason: "foreign copy birth differs from its classified source pin" });
  // Erasing the optional field must not select the local-only v1 path for
  // genuine copies. Removing the copied files as well still leaves actual
  // direct uses, so they must require their source basis independently.
  const erased = { ...rebuilt.archive.manifest }; delete erased.foreignSources;
  expect((await open(alterManifest(erased))).ok).toBe(false);
  expect(await open(alterManifest({ ...erased, retained: erased.retained.filter(key => key.kind !== "entry") }, true))).toMatchObject({ ok: false, result: "mismatch", reason: "foreign uses lack a classified source basis" });
});

test("native alarm stops a marked foreign archive after source configuration disappears without another mint", async () => {
  const f = await fixture(false, true); let mints = 0, sends = 0;
  // Explicit TEST host/credential stand-in. The native alarm and persisted
  // archive row are real; no provider adapter or outside send runs.
  const provider: FixtureArchiveProvider = { fixture: "archive-provider", format: async () => "sha1", ref: async () => null, objects: async () => [],
    mintArchive: async () => { mints++; return null; }, sendArchive: async () => { sends++; return null; }, revokeArchive: async () => {},
  };
  const wiring = { policies: { fixture: "archive-policies" as const, registry: f.policies }, target: { fixture: "archive-target" as const, resolve: async () => archiveRepository }, provider };
  fixtureArchiveWiring.set(f.consumer.name, { ...wiring, fixtureSources: f.sources });
  onTestFinished(() => { fixtureArchiveWiring.delete(f.consumer.name); });
  await f.consumer.restart();
  await f.consumer.did(rita, "remark", { on: 0, fields: { text: "schedule configured foreign archive" } });
  const before = await f.consumer.head();
  expect(await f.consumer.alarm()).toBe(true);
  const marked = await f.consumer.inside(state => new ArchiveRows(archiveSql(state), f.consumer.at).load()!);
  expect(marked.pending).not.toBeNull(); expect(marked.next).not.toBeNull(); expect(mints).toBe(1);
  // Same separate reviewed policy, but no graph source metadata on restart.
  fixtureArchiveWiring.set(f.consumer.name, wiring);
  f.consumer.c.clock.now = marked.next!; await f.consumer.restart();
  expect(await f.consumer.alarm()).toBe(true);
  const stopped = await f.consumer.inside(state => new ArchiveRows(archiveSql(state), f.consumer.at).load()!);
  expect(stopped.stopped?.reason).toBe("foreign-source-unavailable");
  expect(stopped.pending).toEqual(marked.pending); expect(mints).toBe(1); expect(sends).toBe(0);
  expect(await f.consumer.inside(state => state.storage.getAlarm())).toBeNull();
  expect(await f.consumer.head()).toEqual(before);
});

test("a genuine legacy membership copy refuses before body selection despite fixture identity and caller policy", async () => {
  const { life, children } = await sessionRoom(COUNTING_COHORT.register), membership = children[0]!;
  try {
    const seq = await life.wait(() => membership.did(rita, "seat", { expected: { roster: 1 } }));
    const sourceAt = await life.wait(() => membership.at()), source = await life.wait(() => membership.stub.entry(reader, seq)), birth = await life.wait(() => membership.stub.entry(reader, 0));
    expect(source.ok && birth.ok).toBe(true); if (!source.ok || !birth.ok) return;
    const accepting = variant(receiver.declared, archiveMembershipProofChange());
    const consumer = await create({}, {}, accepting);
    wired.set(consumer.name, () => ({ resolver: namespace(env.PLATFORM).resolver }));
    try {
      await consumer.restart();
      await consumer.did(rita, "remark", { on: 0, fields: { text: "real legacy member source", proof: { at: sourceAt, seq, hash: source.value.hash } } });
    } finally { wired.delete(consumer.name); }
    const sources = new FixtureArchiveSourcePins([{ at: sourceAt, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash } }], PROPOSED_BOUNDS, new ArchiveBudget());
    const native = platform(COUNTING_COHORT.membership)!;
    const checked = validateDefinition(native.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) });
    expect(checked.ok).toBe(true); if (!checked.ok) return;
    const policies: ArchivePolicyRegistry = new Map([[accepting.digest, policy(accepting)], [COUNTING_COHORT.membership, { review: "TEST caller policy cannot override excluded credential cohort", entryTypes: variants,
      support: { named: COUNTING_COHORT.membership, definition: checked.definition, owners: new Map(), records: new Map(), preparations: new Map() } }]]);
    const through = await consumer.head();
    await consumer.inside(state => {
      const bodies: string[] = [];
      const result = inventoryArchive({ exec(query, ...args) {
        if (query.startsWith("SELECT bytes FROM entry") || query.startsWith("SELECT bytes FROM retained_input") && args[0] !== "definition") bodies.push(query);
        return state.storage.sql.exec(query, ...args);
      }, transaction: work => state.storage.transactionSync(work) }, consumer.at, through, PROPOSED_BOUNDS, policies, new ArchiveBudget(), sources);
      expect(result).toEqual({ ok: false, reason: "unsupported-credential-cohort" }); expect(bodies).toEqual([]);
    });
  } finally { life.release(); }
});

test("recorded cold foreign support uses one paid validation walk and keeps recording charges", async () => {
  const f = await fixture();
  const policies = new Map(f.policies), reviewed = policies.get(definition.digest)!;
  policies.set(definition.digest, { ...reviewed, support: { ...reviewed.support,
    records: new Map([["hold@1", new Set(["positive-support-control"])]]) } });
  await f.consumer.inside(state => {
    const sql = archiveSql(state), prefix = archivePrefixMetadata(sql, f.consumer.at, f.through,
      PROPOSED_BOUNDS, new ArchiveBudget(), new Set([receiver.digest]));
    const position = prefix.positions.find(position => archiveEntryHeader(sql, { kind: "local", position }, new ArchiveBudget()).uses === 1)!;
    expect(position).toBeDefined();
    const ordinaryBudget = new ArchiveBudget(), recordedBudget = new ArchiveBudget();
    const ordinary = new ArchiveForeignMetadata(sql, f.sources, policies, PROPOSED_BOUNDS, ordinaryBudget, new Set(), receiver.digest);
    const recorded = new ArchiveForeignMetadata(sql, f.sources, policies, PROPOSED_BOUNDS, recordedBudget, new Set(), receiver.digest, { record: true });
    ordinary.scan(position, 1); recorded.scan(position, 1);
    // Reading the immutable report has its own original charge, excluded here.
    const ordinaryCost = ordinaryBudget.admitted(), recordedCost = recordedBudget.admitted();
    const scan = recorded.recorded(position), cold = scan.requests.filter(request => request.kind === "cold");
    expect(cold).toHaveLength(1);
    expect(forecastArchiveSupportMetadata(cold[0]!.footprint.support).inputWork).toBeGreaterThan(0);
    for (const key of ["entries", "attempts", "nodes", "calls"] as const) expect(recordedCost[key]).toBe(ordinaryCost[key]);
    expect(recordedCost.metadata - ordinaryCost.metadata).toBe(512 + cold.length * 640);
    expect(recordedCost.inputWork - ordinaryCost.inputWork).toBe(1024 + cold.length * 1280);
    expect(Object.isFrozen(cold[0]!.footprint.support)).toBe(true);
  });
});

/** ARC-1 measurement fixture. Real receiver admission, SQLite,
 * archive driver and floor fence; source ledger, authority, privacy policy,
 * clock and Git host are explicit stand-ins. No deployed custody claim. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FieldValue, type Input } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, entryOf, judgeAct, judgeFloor, type ValidDefinition } from "@generalbusiness/dap-derive";
import { created, fixtureSequence, on, variant } from "@generalbusiness/dap-derive/testing";
import { ArchiveBudget, ARCHIVE_BOUNDS } from "../src/archive-budget.ts";
import { ArchiveDriver } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { FixtureArchiveSourcePins } from "../src/archive-source-pins.ts";
import { ownOf } from "../src/core.ts";
import { offerFloor } from "../src/floor-writer.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { ledgerSource } from "../src/testing.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { at, create, reader, rita } from "./fixtures-native.ts";
import { ScriptedHost } from "./support/archive-driver.ts";
import { archiveFactoryDefinition } from "./support/archive-native-authority.ts";
import { archiveRepository, archiveSql } from "./support/archive.ts";

const bound = PROPOSED_BOUNDS;
const text = { type: "text", max: bound.textBytes, required: true } as const;
const producer = variant(archiveFactoryDefinition.declared, data => {
  data.acts.remark = { ...data.acts.remark, step: "transition", guards: [], effects: [], sends: [], attention: [],
    fields: { a: text, b: text, c: text, d: text } };
});
const receiver = variant(archiveFactoryDefinition.declared, data => {
  const facts = { type: "list", max: 64, required: true, of: { type: "fact", kind: ["remark"], under: producer.declared.name } };
  data.acts.remark = { ...data.acts.remark, step: "transition", guards: [], effects: [], sends: [], attention: [],
    fields: { left: facts, right: facts, p0: text, p1: text, p2: text } };
});
const floorPolicy = { margin: 100, minimum: 1 };
const entryTypes = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint", "floor"]);
const policy = (definition: ValidDefinition) => ({ review: "TEST inline fixture policy; no production certificate", entryTypes,
  support: { named: definition.digest, definition, owners: new Map(), records: new Map(), preparations: new Map() }, floor: floorPolicy });

// The measurement is complete only if the geometry really reaches both
// admission ceilings. A source-preview mismatch is a fixture failure.
test("ARC-1 measures one maximum-width admitted entry against the original archive pass and floor fence", async () => {
  const source = created(producer, { title: "ARC-1 source", opener: rita.member }, "ARC-1-source");
  for (let n = 0; n < bound.usesPerEntry; n++) {
    const idempotencyKey = `arc-source-${String(n).padStart(3, "0")}`;
    const fields = { a: "x".repeat(bound.textBytes), b: "x".repeat(bound.textBytes), c: "x".repeat(bound.textBytes), d: "" };
    const preview = source.judge(source.intent(rita, "remark", { ...on(source, 0), fields, idempotencyKey }));
    if (preview.result !== "write") throw Error(`source preview refused: ${canonicalize(preview)}`);
    const room = bound.entryBytes - utf8(canonicalize(entryOf(source.state, preview.draft, clockOf(source.state, source.now)))).length;
    expect(room).toBeGreaterThanOrEqual(0); expect(room).toBeLessThanOrEqual(bound.textBytes);
    const wrote = source.submit(source.intent(rita, "remark", { ...on(source, 0), fields: { ...fields, d: "x".repeat(room) }, idempotencyKey }));
    expect(wrote.result).toBe("write");
    expect(utf8(canonicalize(source.last)).length).toBe(bound.entryBytes);
  }
  const lane = await create({}, {}, receiver), host = new ScriptedHost("sha1");
  const policies: ArchivePolicyRegistry = new Map([[producer.digest, policy(producer)], [receiver.digest, policy(receiver)]]);
  const birth = await lane.stub.entry(reader, 0);
  if (!birth.ok) throw Error("receiver genesis unavailable");
  const setup = new ArchiveBudget();
  const pins = new FixtureArchiveSourcePins([
    { at: source.at, birth: { hash: source.at.genesis, bytes: canonicalize(source.entries[0]!.entry) }, declaration: canonicalize(producer.declared) },
    { at: lane.at, birth: { hash: birth.value.hash, bytes: canonicalize(birth.value.entry) }, declaration: canonicalize(receiver.declared) },
  ], bound, setup);
  const pass = () => lane.inside(async state => {
    const sql = archiveSql(state), store = new SqliteStore(sql), rows = new ArchiveRows(sql, lane.at), before = rows.load();
    let budget!: ArchiveBudget;
    const archive = new ArchiveDriver({ sql, current: () => store.scope(), clock: () => lane.c.clock.now, bounds: bound,
      policies: { fixture: "archive-policies", registry: policies }, fixtureSources: pins,
      target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider: host,
      budget: () => { budget = new ArchiveBudget(); return budget; } });
    const result = await archive.run();
    const cost = budget.admitted();
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof typeof ARCHIVE_BOUNDS)[]) expect(cost[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    return { result, cost, reservationCosts: budget.reservationCosts(), before, after: rows.load(), wake: rows.wake() };
  });
  const baseline = await pass();
  console.info("ARC1_BASELINE", canonicalize({ setupCost: setup.admitted(), baseline }));
  expect(baseline.result.state).toBe("confirmed");
  expect(baseline.after?.confirmed).toMatchObject({ through: { seq: 0 }, layout: 2, anchorsPublished: true });
  const facts = source.entries.slice(1).map(({ entry }) => source.fact(entry.seq));
  const sequence = fixtureSequence(source);
  const fetched = facts.map(fact => ({ fact, entry: source.entries[fact.seq]!.entry, sequence, under: producer.declared.name }));
  for (const fact of facts) lane.c.foreign.set(fact.hash, ledgerSource(source, fact.seq, producer.declared.name));
  const fields: Record<string, FieldValue> = { left: facts.slice(0, 64), right: facts.slice(64), p0: "", p1: "", p2: "" };
  const idempotencyKey = "ARC-1-wide";
  const room = await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state)), born = store.stored(0)!;
    const ownSequence = admitSequenceGenesis(born.bytes, lane.at, bound.entryBytes);
    if (!ownSequence) throw Error("receiver birth must admit");
    const clock = clockOf(store, lane.c.clock.now);
    const preview = judgeAct(store, receiver, lane.intent(rita, "remark", { on: 0, expected: { on: 1 }, fields, idempotencyKey }), {
      clock, bounds: bound, own: ownOf(store, ownSequence), facts: fetched, prepared: [], grants: lane.grants().map(grant => ({ grant, current: true })),
    });
    if (preview.result !== "write") throw Error(`receiver preview refused: ${canonicalize(preview)}`);
    return bound.entryBytes - utf8(canonicalize(entryOf(store, preview.draft, clock))).length;
  });
  expect(room).toBeGreaterThanOrEqual(0); expect(room).toBeLessThanOrEqual(3 * bound.textBytes);
  let remaining = room;
  for (const name of ["p0", "p1", "p2"]) { const size = Math.min(remaining, bound.textBytes); fields[name] = "x".repeat(size); remaining -= size; }
  expect(remaining).toBe(0);
  const accepted = await lane.act(rita, "remark", { on: 0, expected: { on: 1 }, fields, idempotencyKey });
  expect(accepted).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 1 } } });
  const wide = await lane.stub.entry(reader, 1);
  if (!wide.ok) throw Error("accepted wide entry unavailable");
  expect(wide.value.entry.uses).toHaveLength(bound.usesPerEntry);
  expect(utf8(canonicalize(wide.value.entry)).length).toBe(bound.entryBytes);
  const retention = await lane.inside(state => ({
    entries: state.storage.sql.exec<{ n: number; bytes: number }>("SELECT COUNT(*) AS n, SUM(octet_length(bytes)) AS bytes FROM retained_input WHERE kind='entry'").one(),
    births: state.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM retained_birth").one().n,
  }));
  // One birth payload plus 128 distinct later entry payloads, one association.
  expect(retention.entries.n).toBe(bound.usesPerEntry + 1); expect(retention.births).toBe(1);
  console.info("ARC1_ADMISSION", canonicalize({ uses: wide.value.entry.uses.length, bytes: utf8(canonicalize(wide.value.entry)).length, sources: 1, retention }));
  const measured = await pass(); // Exactly one original pass for the wide entry.
  console.info("ARC1_PASS", canonicalize(measured));
  for (let n = 0; n < 100; n++) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  lane.c.clock.now = at(1000);
  const floor = await lane.inside(state => {
    const sql = archiveSql(state), store = new SqliteStore(sql), born = store.stored(0)!;
    const ownSequence = admitSequenceGenesis(born.bytes, lane.at, bound.entryBytes);
    if (!ownSequence) throw Error("receiver birth must admit");
    const own = ownOf(store, ownSequence), receipt = new ArchiveRows(sql, lane.at).load()?.confirmed;
    const offer = offerFloor({ sql, store, own, definition: receiver, bounds: bound, now: () => lane.c.clock.now, discoveries: () => [] }, floorPolicy);
    const crossing = receipt ? judgeFloor(store, receiver, { type: "floor", floor: 2, receipt: { commit: receipt.commit, through: receipt.through }, keep: [] }, {
      clock: clockOf(store, lane.c.clock.now), bounds: bound, own,
    }) : null;
    if (receipt && receipt.through.seq < 1) {
      expect(offer === null || offer.floor <= 1).toBe(true);
      expect(crossing).toMatchObject({ result: "refused", reason: "floor-ahead" });
    }
    return { head: store.scope()!.head, receipt, current: store.floor(), offer, crossing, wideStillHeld: store.stored(1) !== null };
  });
  expect(floor.wideStillHeld).toBe(true);
  console.info("ARC1_MEASUREMENT", canonicalize({
    geometry: { uses: bound.usesPerEntry, sources: 1, sourceCopyBytes: bound.entryBytes, receiverEntryBytes: bound.entryBytes, retention },
    qualification: "Real receiver Scope/SQLite/driver/floor fence; genuine derive fixture source entries; scripted grants, inline policy, clock and Git host. No deployed custody or production authority claim.",
    setupCost: setup.admitted(), baseline, measured, floor,
  }));
}, 120_000); // Fixture setup/floor allowance; each ArchiveBudget keeps its original 30 s.

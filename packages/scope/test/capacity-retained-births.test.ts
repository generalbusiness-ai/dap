import { floorReceiverChange, floorSenderChange } from "./definition-corpus-data.ts";
/** Actual Scope turns and SQLite on real Durable Objects. The foreign lanes
 * are derive's in-memory fixture ledgers, read through the test resolver.
 * Declarations, authority, readers, clock and floor receipts are test
 * fixtures; a floor receipt is no evidence of archive custody.
 *
 * Rulings 1064d0de, 0c196f9a and 9753818f: `scopeBytes` bounds every
 * retained row in every scope, not only under the whole-scope opt-in.
 * No floor frees the retained births and copies. */
import { env } from "cloudflare:workers";
import { expect, onTestFinished, test } from "vitest";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { Scope as Ledger, laneDefinition, variant } from "@generalbusiness/dap-derive/testing";
import { Scope } from "../src/core.ts";
import { namespace } from "../src/namespace.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { ledgerSource, testPorts } from "../src/testing.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
import { wired } from "./outside.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

/** A foreign lane with a later entry, `assign`, that an act can name as a proof. `ordinal` gives each lane its own genesis. */
function foreign(ordinal: number) {
  const ledger = new Ledger(laneDefinition, rita.member, true, ordinal);
  ledger.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  const entry = ledger.did(rita, "assign", { on: 2, expected: { on: 1 }, fields: { performer: una.member } });
  return { ledger, entry, proof: ledger.fact(entry.seq) };
}
/** A remark whose proof is a later entry of a foreign lane: the scope retains that entry and the lane's birth. */
function remark(lane: Lane, lent: ReturnType<typeof foreign>, text: string) {
  lane.c.foreign.set(lent.proof.hash, ledgerSource(lent.ledger, lent.entry.seq, "lane"));
  return lane.act(rita, "remark", { on: 0, fields: { text, proof: lent.proof } });
}
const retained = (lane: Lane) => lane.inside(state => {
  const store = new SqliteStore(archiveSql(state));
  const scan = state.storage.sql.exec("SELECT COALESCE(SUM(octet_length(bytes)), 0) AS n FROM (SELECT bytes FROM retained_input UNION ALL SELECT bytes FROM retained_value)").one();
  const rows = state.storage.sql.exec("SELECT COUNT(*) AS n FROM retained_input WHERE kind = 'entry'").one()["n"] as number;
  return { total: store.retainedBytes(), scan: scan["n"] as number, rows, births: state.storage.sql.exec("SELECT COUNT(*) AS n FROM retained_birth").one()["n"] as number };
});
const internalFloor = (lane: Lane, floor: number) => lane.inside(async state => {
  const store = new SqliteStore(archiveSql(state));
  return new Scope(lane.name, store, { ...production(), ...testPorts(lane.c) }, lane.c.bounds)
    .floor({ type: "floor", floor, receipt: { commit: "a".repeat(40), through: store.scope()!.head }, keep: [] });
});
const scopeBytes = async (lane: Lane, bound: number) => { lane.c.bounds = { ...lane.c.bounds, scopeBytes: bound }; await lane.restart(); };

// Invariant: without the opt-in, a floor frees no retained birth or copy, and
// a new birth that would leave their total above `scopeBytes` writes nothing
// and is refused `scope-full` with `scopeBytes`.
test("Native scope without the opt-in keeps its births across a floor and refuses the next new birth scope-full scopeBytes", async () => {
  const lane = await create({}, {}, archiveDefinition);
  expect(archiveDefinition.declared.capacity).toBeUndefined();
  expect(await remark(lane, foreign(1), "first")).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 1 } } });
  const first = await retained(lane);
  expect(first).toMatchObject({ total: first.scan, rows: 2, births: 1 });
  await scopeBytes(lane, first.total);
  for (let n = 0; n < 100; n++) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  lane.c.clock.now = at(1000);
  expect(await internalFloor(lane, 2)).toMatchObject({ answer: "written" });
  expect(await retained(lane)).toEqual(first);
  const head = await lane.head();
  expect(await remark(lane, foreign(2), "second")).toEqual({ answer: "refused", reason: "scope-full", judgedAt: head, name: "scopeBytes" });
  expect([await lane.head(), await retained(lane)]).toEqual([head, first]);
  // An act that adds no new entry bytes still passes: the same proof again.
  expect(await remark(lane, foreign(1), "again")).toMatchObject({ answer: "accepted" });
  expect(await retained(lane)).toEqual(first);
}, 60_000);

// Invariant (ruling 0c196f9a, item a): a scope past the cap still records the
// result of its pending request, which reserved its room, and adds its bytes;
// a new birth by an act is refused.
test("Native scope past the cap settles its pending request and refuses a new birth", async () => {
  const receiver = await create({}, {}, variant(archiveDefinition.declared, floorReceiverChange()));
  const sender = await create({}, {}, variant(archiveDefinition.declared, floorSenderChange())), net = namespace(env.SCOPES);
  // The remark reads its proof through the test resolver, before the namespace wiring replaces it.
  expect(await remark(sender, foreign(3), "before the cap")).toMatchObject({ answer: "accepted" });
  let permit = false;
  wired.set(sender.name, () => ({ resolver: net.resolver, transport: net.transport }));
  wired.set(receiver.name, () => ({ resolver: net.resolver, transport: { send: async envelope => permit ? net.transport.send(envelope) : null } }));
  onTestFinished(() => { wired.delete(sender.name); wired.delete(receiver.name); });
  await sender.restart(); await receiver.restart();
  const surface = (lane: Lane) => lane.object as unknown as { dispatch(): Promise<number> };
  const ask = await sender.act(rita, "ask", { on: 0, expected: { on: 1 }, fields: { peer: receiver.at } });
  if (ask.answer !== "accepted") throw Error(canonicalize(ask));
  await surface(sender).dispatch();
  expect((await receiver.head()).seq).toBeGreaterThan(0);
  const past = await retained(sender);
  await scopeBytes(sender, 1);
  expect(past.total).toBeGreaterThan(1);
  // The receiver's first attempt found no transport; its retry is due later.
  permit = true; receiver.c.clock.now = at(1000); sender.c.clock.now = at(1000);
  expect(await surface(receiver).dispatch()).toBeGreaterThan(0);
  const settled = await sender.inside(state => new SqliteStore(archiveSql(state)).all().requests.find(request => request.seq === ask.receipt.fact.seq));
  expect(settled).toMatchObject({ result: { clause: "applied" } });
  const after = await retained(sender);
  expect(after).toMatchObject({ total: after.scan, births: past.births + 1 });
  expect(after.total).toBeGreaterThan(past.total);
  // The test resolver again, for the next proof.
  wired.delete(sender.name); await sender.restart();
  const head = await sender.head();
  expect(await remark(sender, foreign(4), "past the cap")).toEqual({ answer: "refused", reason: "scope-full", judgedAt: head, name: "scopeBytes" });
  expect([await sender.head(), await retained(sender)]).toEqual([head, after]);
}, 60_000);

// Invariant: a scope whose storage holds no stored total, as a scope made
// before the head, gets the total of its rows when its store opens, so its
// first turn compares the true total.
test("Native scope made before the stored total counts its retained births at its first turn", async () => {
  const lane = await create({}, {}, archiveDefinition);
  expect(await remark(lane, foreign(5), "one")).toMatchObject({ answer: "accepted" });
  expect(await remark(lane, foreign(6), "two")).toMatchObject({ answer: "accepted" });
  const held = await retained(lane);
  expect(held).toMatchObject({ total: held.scan, rows: 4, births: 2 });
  await lane.inside(state => { state.storage.sql.exec("DELETE FROM meta WHERE k = 'retained-bytes'"); });
  await scopeBytes(lane, held.scan);
  const head = await lane.head();
  expect(await remark(lane, foreign(7), "three")).toEqual({ answer: "refused", reason: "scope-full", judgedAt: head, name: "scopeBytes" });
  expect(await retained(lane)).toEqual(held);
}, 60_000);

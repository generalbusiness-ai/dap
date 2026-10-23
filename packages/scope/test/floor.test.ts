import { floorPendingChange } from "./definition-corpus-data.ts";
/** Actual Scope turns and SQLite on real Durable Objects. Declaration,
 * authority, readers and clock are explicit test fixtures. The direct internal
 * floor call here is not evidence of the alarm writer or archive custody. */
import { expect, test } from "vitest";
import type { FloorInput } from "@generalbusiness/dap-contract";
import { signIntent } from "@generalbusiness/dap-bytes";
import { countedEntries, stateDigest } from "@generalbusiness/dap-derive";
import { Scope } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { testPorts } from "../src/testing.ts";
import { at, create, reader, rita, type Lane } from "./fixtures-native.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

const internalFloor = (lane: Lane, input: FloorInput) => lane.inside(state => {
  const store = new SqliteStore(archiveSql(state));
  return new Scope(lane.name, store, { ...production(), ...testPorts(lane.c) }, lane.c.bounds).floor(input);
});
const snapshot = (lane: Lane) => lane.inside(state => {
  const store = new SqliteStore(archiveSql(state)), all = store.all();
  return { all, digest: stateDigest(all), counted: countedEntries(store), bytes: store.logicalBytes(), head: store.scope()!.head, payloads: state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"], firstPayload: store.stored(1) };
});

// Invariant: every refused offer writes nothing, while a legal floor removes
// old payloads and preserves exact accepted keys, facts and current receipts.
test("Native floor refusals preserve the transaction and archived keys survive two floors and restart", async () => {
  const lane = await create({}, {}, archiveDefinition), first = lane.remark("accepted below the future floor");
  expect(await lane.submit(first)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 1 } } });
  for (let n = 0; n < 200; n++) expect((await lane.submit(lane.remark(`tail ${n}`))).answer).toBe("accepted");
  const through = await lane.head(), before = await snapshot(lane);
  const offer: FloorInput = { type: "floor", floor: 100, receipt: { commit: "a".repeat(40), through }, keep: [] };
  lane.c.clock.now = at(1000);
  const refused: readonly [string, FloorInput][] = [
    ["floor-back", { ...offer, floor: 0 }],
    ["floor-receipt", { ...offer, receipt: { ...offer.receipt, through: { ...through, hash: `sha256:${"0".repeat(64)}` } } }],
    ["floor-ahead", { ...offer, receipt: { ...offer.receipt, through: { seq: 98, hash: through.hash } } }],
    ["floor-step", { ...offer, floor: 4097, receipt: { ...offer.receipt, through: { seq: 5000, hash: through.hash } } }],
    ["floor-recent", { ...offer, floor: 150 }],
    ["floor-keep", { ...offer, keep: [2, 1] }],
  ];
  for (const [reason, input] of refused) {
    expect(await internalFloor(lane, input)).toEqual({ answer: "refused", reason });
    expect(await snapshot(lane)).toEqual(before);
  }
  const foreign = await create({}, {}, archiveDefinition);
  expect(await internalFloor(lane, { ...offer, floor: 1, receipt: { commit: "f".repeat(40), through: await foreign.head() } })).toEqual({ answer: "refused", reason: "floor-receipt" });
  expect(await snapshot(lane)).toEqual(before);
  expect(await internalFloor(lane, offer)).toMatchObject({ answer: "written", fact: { seq: through.seq + 1 } });
  const after = await snapshot(lane);
  expect(after.all.accepted).toEqual(before.all.accepted);
  expect(after.counted).toBe(through.seq + 2 - 100 + 1); // live tail plus kept genesis
  expect(after.payloads).toBe(before.counted - 99 + 1); // 1..99 deleted, the floor entry appended
  expect(after.firstPayload).toBeNull();
  expect(after.bytes).toBeLessThan(before.bytes);
  expect(await lane.stub.history(reader, "0")).toEqual({ ok: false, reason: "archived", archived: { floor: 100, ...offer.receipt }, next: "100" });
  const positions: number[] = [];
  let cursor: string | undefined = "100";
  do {
    const page = await lane.stub.history(reader, cursor);
    if (!page.ok) throw Error(page.reason);
    positions.push(...page.value.map(row => row.entry.seq)); cursor = page.next;
  } while (cursor !== undefined);
  expect(positions).toEqual(Array.from({ length: through.seq + 2 - 100 }, (_, n) => n + 100));
  expect(await lane.stub.entry(reader, 0)).toMatchObject({ ok: true, value: { entry: { seq: 0 } } });
  expect(await lane.stub.entry(reader, 1)).toMatchObject({ ok: false, reason: "archived", archived: { floor: 100 } });
  expect(await lane.submit(first)).toMatchObject({ answer: "archived", fact: { seq: 1 }, archived: { floor: 100 } });
  expect(await lane.stub.settle(first)).toMatchObject({ ok: false, reason: "archived", fact: { seq: 1 } });
  const changed = signIntent({ ...first.intent, fields: { text: "different meaning" }, notAfter: at(1060) }, rita.secret);
  expect(await lane.submit(changed)).toEqual({ answer: "mismatch", reason: "idempotency-mismatch" });
  expect(await lane.act(rita, "remark", { on: 0, fields: { text: "an old own fact", proof: { at: lane.at, seq: 1, hash: before.firstPayload!.hash } } })).toMatchObject({ answer: "refused", reason: "archived" });
  await lane.restart();
  expect(await snapshot(lane)).toEqual(after);
  const second = { ...offer, floor: 101, receipt: { commit: "b".repeat(40), through: await lane.head() } };
  expect(await internalFloor(lane, second)).toMatchObject({ answer: "written" });
  expect((await snapshot(lane)).all.accepted).toEqual(before.all.accepted);
  expect(await lane.submit(first)).toMatchObject({ answer: "archived", fact: { seq: 1 }, archived: { floor: 101, commit: second.receipt.commit } });
  await lane.restart();
  expect((await snapshot(lane)).all.accepted).toEqual(before.all.accepted);
}, 60_000);

// Invariant: migration charges each UTF-8 key once while deleting only own
// journal byte sources; retained text keeps its existing independent charge.
test("Native floors charge migrated Unicode keys once and preserve retained bytes and reservations", async () => {
  const { variant } = await import("@generalbusiness/dap-derive/testing");
  const { textDigest } = await import("@generalbusiness/dap-bytes");
  const { reserved } = await import("@generalbusiness/dap-derive");
  const definition = variant(archiveDefinition.declared, floorPendingChange());
  const lane = await create({}, {}, definition), text = "retained across both floors", digest = textDigest(text);
  const unicode = lane.intent(rita, "remark", { on: 0, fields: { text: digest }, idempotencyKey: "é🎵" });
  expect((await lane.stub.submit(unicode, lane.grants(), { texts: [text] })).answer).toBe("accepted");
  expect((await lane.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: (await lane.summary()).value.items.find(item => item.id === 0)!.revision } })).answer).toBe("accepted");
  for (let n = 0; n < 200; n++) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  const inspect = () => lane.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    const entry = JSON.parse(store.stored(store.scope()!.head.seq)!.bytes) as import("@generalbusiness/dap-contract").Entry;
    return { bytes: store.logicalBytes(), retained: store.retained("text", digest), pending: reserved(store, definition, entry.input),
      keys: state.storage.sql.exec("SELECT actor,idem FROM accepted_key ORDER BY actor,idem").toArray(),
      payloadBytes: state.storage.sql.exec("SELECT COALESCE(SUM(octet_length(bytes)),0) AS n FROM entry").one()["n"] as number };
  });
  const before = await inspect(); expect(before.keys).toEqual([]);
  expect(before.pending.bytes).toBeGreaterThan(0);
  lane.c.clock.now = at(1000);
  const first = await internalFloor(lane, { type: "floor", floor: 100, receipt: { commit: "a".repeat(40), through: await lane.head() }, keep: [] });
  expect(first).toMatchObject({ answer: "written" });
  const after = await inspect();
  expect(after.keys).toEqual([{ actor: rita.key, idem: "é🎵" }]);
  expect(after.bytes - after.payloadBytes).toBe(before.bytes - before.payloadBytes + 262);
  expect(after.retained).toEqual(before.retained); expect(after.pending).toEqual(before.pending);
  expect(await internalFloor(lane, { type: "floor", floor: 101, receipt: { commit: "b".repeat(40), through: await lane.head() }, keep: [] })).toMatchObject({ answer: "written" });
  const twice = await inspect();
  expect(twice.keys).toEqual(after.keys); expect(twice.bytes - twice.payloadBytes).toBe(after.bytes - after.payloadBytes);
  await lane.restart(); expect(await inspect()).toEqual(twice);
});

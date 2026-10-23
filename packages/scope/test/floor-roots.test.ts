import { floorRootsData } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
/** Native judgments, operations, turns, SQLite and eviction. Platform data,
 * the operation rules, reader/actor authority and provider are explicit
 * fixtures. Every journal row is admitted by the normal input path. */
import { expect, onTestFinished, test } from "vitest";
import { PROPOSED_BOUNDS, type Beside, type Created, type PlatformDefinition, type Seed, type SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf, signIntent, textDigest } from "@generalbusiness/artroom-bytes";
import { countedEntries, pendingOf, validateDefinition, type Rules } from "@generalbusiness/dap-derive";
import { valid } from "@generalbusiness/dap-derive/testing";
import { Scope } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { controls, testPorts } from "../src/testing.ts";
import { Lane, START, at, objectOf, rita } from "./fixtures-native.ts";
import { wired } from "./outside.ts";
import { archiveSql } from "./support/archive.ts";

const NAMED = "platform:task@2" as PlatformDefinition;
const supplied = floorRootsData();
const rules: Rules = {
  begin: { place: "effect", most: 2, run: () => [{ effect: "operation", k: 0, owner: NAMED, kind: "work", attempts: 1 }, { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }] },
  work: { place: "outcome", rules: { selects: false, read: false, retries: () => false } },
};

// Invariant: current operation/fact readers keep old payloads. Once both
// uses end, a later floor removes them without erasing numeric ledger rows.
test("Native floor keeps a pending operation and live fact, then reclaims closed origins", async () => {
  valid(validateDefinition(supplied, PROPOSED_BOUNDS, undefined, { platform: true }));
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: NAMED, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START);
  let release = false;
  const definitions = { read: async () => ({ ok: false as const, reason: "absent" as const }), platform: (named: string) => named === NAMED ? { data: supplied, rules } : null };
  wired.set(name, () => ({ definitions, outside: { accepts: () => release, send: async () => ({ result: "confirmed" as const, evidence: { basis: "own-answer" as const, body: {} } }) } }));
  onTestFinished(() => { wired.delete(name); });
  const api = objectOf(name) as unknown as { create(signed: SignedIntent, named: PlatformDefinition, definitions: never[], beside: Beside): Promise<Created>; effect(): Promise<number> };
  const created = await api.create(signed, NAMED, [], {});
  if (created.answer !== "accepted") throw Error(canonicalize(created));
  const lane = new Lane(name, c, created.receipt.fact.at, created.receipt, signed);
  const revision = async () => (await lane.summary()).value.items.find(item => item.id === 0)!.revision;
  expect((await lane.act(rita, "start", { on: 0, expected: { on: await revision() } })).answer).toBe("accepted");
  const note = await lane.act(rita, "note", { on: 0, expected: { on: await revision() } });
  if (note.answer !== "accepted") throw Error(canonicalize(note));
  const memo = "a carried native input", digest = textDigest(memo);
  expect((await lane.stub.submit(lane.intent(rita, "pin", { on: 0, expected: { on: await revision() }, fields: { proof: note.receipt.fact, memo: digest } }), lane.grants(), { texts: [memo] })).answer).toBe("accepted");
  for (let n = 0; n < 200; n++) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  c.clock.now = at(1000);
  const offer = (position: number, keep: number[]) => lane.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    return new Scope(name, store, { ...production(), ...testPorts(c), definitions }, c.bounds).floor({ type: "floor", floor: position, receipt: { commit: "a".repeat(40), through: store.scope()!.head }, keep });
  });
  expect(await offer(100, [3])).toMatchObject({ answer: "written" });
  await lane.restart();
  expect(await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    expect(store.floor()!.kept).toEqual([0, 1, 2, 3]);
    expect(store.stored(1)).not.toBeNull(); expect(store.stored(2)).not.toBeNull();
    expect(store.retained("text", digest)?.bytes).toBe(canonicalize(memo));
    return pendingOf(store.operation("1:0")!);
  })).toEqual({ opened: 1, unknown: 0, unopened: 0 });
  release = true;
  expect(await api.effect()).toBe(1);
  const summary = await lane.summary(), currentRevision = summary.value.items.find(item => item.id === 0)!.revision;
  expect((await lane.stub.submit(lane.intent(rita, "pin", { on: 0, expected: { on: currentRevision }, fields: { proof: note.receipt.fact, memo: digest } }), lane.grants(), { texts: [memo] })).answer).toBe("accepted");
  const current = await lane.summary();
  const finished = await lane.act(rita, "finish", { on: 0, expected: { on: current.value.items.find(item => item.id === 0)!.revision } });
  if (finished.answer !== "accepted") throw Error(canonicalize(finished));
  while ((await lane.head()).seq < 399) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  c.clock.now = at(2000);
  expect(await offer(250, [finished.receipt.fact.seq])).toMatchObject({ answer: "written" });
  await lane.restart();
  expect(await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    expect(store.stored(1)).toBeNull(); expect(store.stored(2)).toBeNull();
    expect(store.operation("1:0")).toMatchObject({ id: "1:0", attempts: [{ opened: 1, outcomes: [{ result: "confirmed" }] }] });
    expect(pendingOf(store.operation("1:0")!)).toEqual({ opened: 0, unknown: 0, unopened: 0 });
    expect(store.floor()!.kept).not.toContain(1);
    return { counted: countedEntries(store), rows: state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"] };
  })).toEqual({ counted: 153, rows: 153 });
}, 60_000);

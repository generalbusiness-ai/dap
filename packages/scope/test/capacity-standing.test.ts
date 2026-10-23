import { capacityStandingData } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type Seed } from "@generalbusiness/dap-contract";
import { intentDigest, scopeIdOf, signIntent } from "@generalbusiness/artroom-bytes";
import { PROFILES, reserved, standingReserved, validateDefinition, type PlatformRules } from "@generalbusiness/dap-derive";
import { grantOf, valid } from "@generalbusiness/dap-derive/testing";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { SqliteStore } from "../src/index.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

const data = capacityStandingData();
const definition = valid(validateDefinition(data, PROPOSED_BOUNDS, PROFILES, { platform: true }));
const platform: PlatformRules = { named: "platform:task@1", rules: { "settle-counter": { place: "effect", most: 1, run: () => [] } } };
const names: string[] = [];
function setup(bytes = PROPOSED_BOUNDS.scopeBytes, supplied = data) {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: { source: "standing fixture" }, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: platform.named, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START);
  c.bounds = { ...PROPOSED_BOUNDS, scopeEntries: 9, scopeBytes: bytes };
  wired.set(name, () => ({ definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === platform.named ? { data: supplied, rules: platform.rules } : null } }));
  names.push(name);
  return { name, c, signed, stub: stubOf(name) };
}
const inspect = (name: string, under = definition) => runInDurableObject(objectOf(name), (_instance, state) => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const last = store.scope() && store.stored(store.scope()!.head.seq);
  return { state: store.all(), bytes: store.logicalBytes(), standing: standingReserved(store, under), reserved: last ? reserved(store, under, (JSON.parse(last.bytes) as Entry).input) : null };
});

test("native standing entry slots include bytes at equality, roll back ordinary traffic one byte over, and retain their counter through finality, eviction and replay", async () => {
  // Made-up data, authority and an unused rule. Actual native validation,
  // journal/storage, counter projection, admission, eviction and HTTP replay.
  // This is the known entry-slot term, not a full handoff funding claim.
  try {
    const reference = setup(), born = await reference.stub.create(reference.signed, platform.named);
    expect(born).toMatchObject({ answer: "accepted" });
    const measured = await inspect(reference.name), E = PROPOSED_BOUNDS.entryBytes;
    expect(measured.standing).toEqual({ entries: 6, items: 0, records: 0, bytes: 6 * E, requests: 0 });
    expect(measured.reserved?.bytes).toBe(7 * E);
    const ceiling = measured.bytes + 7 * E;
    const exact = setup(ceiling), made = await exact.stub.create(exact.signed, platform.named);
    expect(made).toMatchObject({ answer: "accepted" });
    if (made.answer !== "accepted") return;
    const lane = new Lane(exact.name, exact.c, made.receipt.fact.at, made.receipt, exact.signed);
    const submit = (kind: string, next?: number) => lane.stub.submit(lane.intent(rita, kind, { on: 0, expected: { on: 1 }, fields: next === undefined ? {} : { next } }), [grantOf(rita, lane.at, ["set"])]);
    await lane.restart();
    const before = await inspect(exact.name);
    expect(before.bytes).toBe(measured.bytes);
    expect(await submit("chatter")).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
    expect(await inspect(exact.name)).toEqual(before);
    expect(await submit("set", 1)).toMatchObject({ answer: "accepted" });
    const reduced = await inspect(exact.name);
    expect(reduced.standing).toEqual({ entries: 3, items: 0, records: 0, bytes: 3 * E, requests: 0 });
    expect(await lane.stub.submit(lane.intent(rita, "finish", { on: 0, expected: { on: 2 }, fields: {} }), [grantOf(rita, lane.at, ["set"])])).toMatchObject({ answer: "accepted" });
    await lane.restart();
    expect((await inspect(exact.name)).standing).toEqual(reduced.standing);
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: exact.name, grants: "as-recorded", bounds: exact.c.bounds, platform: named => named === platform.named ? { data, rules: platform.rules } : null });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
    const below = setup(ceiling - 1);
    expect(await below.stub.create(below.signed, platform.named)).toEqual({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
    expect((await inspect(below.name)).state.scope).toBeNull();
    const oldData = capacityStandingData(false);
    const oldDefinition = valid(validateDefinition(oldData, PROPOSED_BOUNDS, PROFILES, { platform: true })), old = setup(1, oldData);
    expect(await old.stub.create(old.signed, platform.named)).toMatchObject({ answer: "accepted" });
    const legacy = await inspect(old.name, oldDefinition);
    expect(legacy.bytes).toBeGreaterThan(1);
    expect(legacy.standing).toEqual({ entries: 6, items: 0, records: 0, bytes: 0, requests: 0 });
    const older = await verify(source, { mode: "replay", scope: old.name, grants: "as-recorded", bounds: old.c.bounds, platform: named => named === platform.named ? { data: oldData, rules: platform.rules } : null });
    expect([older.report.result, older.why]).toEqual(["consistent", null]);
  } finally { for (const name of names.splice(0)) wired.delete(name); }
});

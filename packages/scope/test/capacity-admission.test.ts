import { capacityLaneChange, capacityRequestChange } from "./definition-corpus-data.ts";
import { env } from "cloudflare:workers";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { expect, test } from "vitest";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS, type Entry} from "@generalbusiness/dap-contract";
import { reserved } from "@generalbusiness/dap-derive";
import { controls } from "../src/testing.ts";
import { metricBindings } from "./worker.ts";
import type { MetricPoint } from "../src/metrics.ts";
import { variant } from "@generalbusiness/dap-derive/testing";
import { SqliteStore } from "../src/index.ts";
import { create, creation, definition, objectOf, START, stubOf, reader, rita, una, vic } from "./fixtures-native.ts";

const nativeHistory = () => httpSource("https://scope.test", { reader, fetch: async (url, init) => {
  const response = await route(new Request(url, init), env.SCOPES);
  return { status: response.status, body: response.body };
} });

// The shared lane's link form also names an unresolved dummy child. These
// byte/key witnesses do not exercise that form; use a closed declaration,
// rather than claiming a proved birth-time retained set for the placeholder.
const wholeLane = () => variant(definition.declared, capacityLaneChange());

// Native scope API, judgment, folding and SQLite. Declaration and authority
// are the shared lane fixture; no provider or production membership is claimed.
test("opt-in item admission accepts the final free key and rolls back the next item after eviction", async () => {
  const under = wholeLane();
  const scope = await create({ scopeItems: 2 }, {}, under);
  await scope.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  const snapshot = () => scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    return { keys: store.keyCounts(), bytes: store.logicalBytes(), snapshot: store.all(), head: store.scope()!.head };
  });
  const before = await snapshot();
  expect(before.keys.items).toBe(2);
  await scope.restart();
  expect(await scope.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeItems", judgedAt: before.head });
  expect(await snapshot()).toEqual(before);
});

test("opt-in request admission accepts the final pending request and rolls back the next send after eviction", async () => {
  const under = variant(definition.declared, capacityRequestChange());
  const scope = await create({ scopeRequests: 1 }, {}, under);
  expect(await scope.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).toMatchObject({ answer: "accepted" });
  const snapshot = () => scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    return { keys: store.keyCounts(), bytes: store.logicalBytes(), snapshot: store.all(), head: store.scope()!.head };
  });
  const before = await snapshot();
  expect(before.keys.requests).toBe(1);
  await scope.restart();
  const points: MetricPoint[] = [];
  const physical = scope.object.id.toString();
  metricBindings.set(physical, { DEPLOYMENT: "capacity-test", METRICS: { writeDataPoint: point => points.push(structuredClone(point)) } });
  try {
    expect(await scope.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeRequests", judgedAt: before.head });
    expect(await snapshot()).toEqual(before);
    expect(points.filter(point => point.blobs[0] === "turn").map(point => [point.blobs[4], point.blobs[5], point.blobs[8]])).toEqual([["answer", "scopeRequests", "refused"]]);
  } finally { metricBindings.delete(physical); }
});


test("opt-in byte admission creates exactly at Used plus Reserved and keeps no genesis or retained inputs one byte below", async () => {
  const under = wholeLane();
  const probe = await create({}, {}, under);
  const required = await probe.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const head = JSON.parse(store.stored(0)!.bytes) as Entry;
    return store.logicalBytes() + reserved(store, under, head.input).bytes;
  });
  // These creation intents differ only in fixed-width IDs, hashes and
  // signatures; their canonical lengths and pending work are identical.
  const exact = await create({ scopeBytes: required }, {}, under);
  expect((await exact.head()).seq).toBe(0);
  const replayed = await verify(nativeHistory(), { mode: "replay", scope: exact.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: exact.c.bounds });
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  const asked = creation(undefined, under), c = controls(asked.name, START);
  c.bounds = { ...PROPOSED_BOUNDS, scopeBytes: required - 1 };
  expect(await stubOf(asked.name).create(asked.signed, under.declared)).toEqual({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
  await runInDurableObject(objectOf(asked.name), (_instance, state) => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    expect([store.scope(), store.stored(0), store.logicalBytes(), store.keyCounts()]).toEqual([null, null, 0, { items: 0, records: 0, requests: 0 }]);
  });
  await evictDurableObject(objectOf(asked.name));
  c.bounds = { ...c.bounds, scopeBytes: required };
  expect(await stubOf(asked.name).create(asked.signed, under.declared)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 0 } } });
});

test("a filled byte budget keeps its report settlement and closing checkpoint funded after eviction", async () => {
  const under = wholeLane();
  const scope = await create({}, {}, under);
  const commitment = await scope.commitment();
  const report = (await scope.did(una, "report", { fields: { commitment }, expected: { commitment: 2 } })).fact.seq;
  const count = () => scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const head = JSON.parse(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
    return store.logicalBytes() + reserved(store, under, head.input).bytes;
  });
  const limit = await count();
  // A tighter per-object deployment ceiling on restart: no entry, duty or
  // retained byte is injected. The same actual state exactly fills it.
  scope.c.bounds = { ...scope.c.bounds, scopeBytes: limit };
  await scope.restart();
  expect(await scope.submit(scope.remark())).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
  expect(await count()).toBe(limit);
  expect(await scope.act(vic, "accept-report", { on: report, expected: { on: 1 } })).toMatchObject({ answer: "accepted" });
  expect(await count()).toBeLessThanOrEqual(limit);
  expect(await scope.stub.checkpoint()).toMatchObject({ answer: "written" });
  expect(await count()).toBeLessThanOrEqual(limit);
  const replayed = await verify(nativeHistory(), { mode: "replay", scope: scope.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: scope.c.bounds });
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
});

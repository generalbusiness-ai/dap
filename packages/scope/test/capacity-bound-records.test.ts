import { capacityBoundSenderData } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import type { Entry, FactRef, Seed } from "@generalbusiness/dap-contract";
import { intentDigest, parseStrict, scopeIdOf, signIntent } from "@generalbusiness/artroom-bytes";
import { reserved, validateDefinition, type Delivered, type ValidDefinition } from "@generalbusiness/dap-derive";
import { valid } from "../../derive/test/fixtures.ts";
import { boundRecordData, boundRecordDefinition } from "../../derive/test/fixtures-bound-records.ts";
import { PIN_BOUNDS } from "../../derive/test/fixtures-receiver-pins.ts";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

test.each([false, true])("a native bound decision reserves only its actual record producer and settles at the record ceiling (first key %s)", async firstKey => {
  // Real scopes, native holder binding/capability code, SQLite and HTTP
  // replay. Trusted platform data, authority, clock and resolver are
  // fixtures; there is no platform rule mark or outside provider.
  const data = boundRecordData(firstKey), under = boundRecordDefinition(firstKey);
  const sourceData = capacityBoundSenderData(data.name);
  const sourceUnder = valid(validateDefinition(sourceData, PIN_BOUNDS));
  const peers = new Map<string, ValidDefinition>();
  const birth = async (definition: ValidDefinition, platform = false) => {
    const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: { title: "A lane", opener: rita.member }, idempotencyKey: crypto.randomUUID(), notAfter: at(63) }, rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: platform ? "platform:task@1" : definition.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
    const name = scopeIdOf(seed), c = controls(name, START);
    c.bounds = { ...PIN_BOUNDS, ...(platform ? { scopeEntries: 8, scopeItems: 2, scopeRecords: 0, scopeRequests: 0 } : {}) };
    peers.set(name, definition);
    wired.set(name, () => ({ capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
      definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === "platform:task@1" ? { data, rules: {} } : null },
      resolver: { read: async (fact: FactRef) => {
        const read = await stubOf(fact.at.scope).entry(reader, fact.seq);
        return read.ok && read.value.hash === fact.hash ? { fact, entry: read.value.entry, under: peers.get(fact.at.scope)!.declared.name } : null;
      } },
    }));
    const created = await stubOf(name).create(signed, platform ? "platform:task@1" : definition.declared);
    expect(created.answer).toBe("accepted");
    if (created.answer !== "accepted") throw new Error("bound record fixture must create");
    return new Lane(name, c, created.receipt.fact.at, created.receipt, signed);
  };
  const arrive = (name: string, envelope: Delivered) => (objectOf(name) as unknown as { deliver(input: Delivered): Promise<Delivery> }).deliver(envelope);
  try {
    const receiver = await birth(under, true), sender = await birth(sourceUnder);
    await sender.did(rita, "connect", { on: 0, expected: { on: 1 }, fields: { peer: receiver.at } });
    for (let n = 0; n < 4; n++) await receiver.did(rita, "touch", { on: 0, expected: { on: 1 } });
    let job = 0;
    const inspect = () => receiver.inside(state => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      const head = parseStrict(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
      return { head: store.scope()!.head, keys: store.keyCounts(), reserved: reserved(store, under, head.input, CAPABILITY_CODE), holder: store.holder(job), snapshot: store.all() };
    });
    const fields = { owner: sender.at };
    if (firstKey) {
      const before = await inspect();
      expect(await receiver.act(rita, "open-job", { fields })).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeRecords" });
      expect(await inspect()).toEqual(before);
      receiver.c.bounds = { ...receiver.c.bounds, scopeRecords: 1 };
      await receiver.restart();
    }
    const opening = await receiver.act(rita, "open-job", { fields });
    expect(opening.answer).toBe("accepted");
    if (opening.answer !== "accepted") throw new Error("funded holder must open");
    const opened = opening.receipt;
    job = opened.fact.seq;
    const before = await inspect();
    expect(before.keys).toEqual({ items: 2, records: 0, requests: 0 });
    expect(before.reserved.records).toBe(firstKey ? 1 : 0);
    expect(before.head.seq + 1 + before.reserved.entries).toBe(8);
    expect(before.holder).toMatchObject({ decisions: { stop: 1 } });
    await receiver.restart();
    expect(await inspect()).toEqual(before);
    const sent = await sender.did(rita, "stop", { on: 0, expected: { on: 2 }, fields: { job: opened.fact } });
    const source = await sender.stub.entry(reader, sent.fact.seq);
    if (!source.ok) throw new Error("actual stop source must be readable");
    const request = source.value.entry.sends[0]!, envelope = { to: receiver.at, from: sent.fact, n: request.n, message: request.message };
    const received = await arrive(receiver.name, envelope);
    expect(received.answer).toBe("recorded");
    if (received.answer !== "recorded") throw new Error("funded bound stop must settle");
    const after = await inspect();
    expect(after.keys).toEqual({ items: 2, records: firstKey ? 1 : 0, requests: 0 });
    expect(after.reserved).toEqual({ entries: 1, items: 0, records: 0, bytes: PIN_BOUNDS.entryBytes, requests: 0 });
    expect(after.holder).toBeNull();
    await receiver.restart();
    expect(await inspect()).toEqual(after);
    expect(await arrive(receiver.name, envelope)).toEqual(received);
    expect(await inspect()).toEqual(after);
    const decided = await receiver.stub.entry(reader, received.fact.seq);
    expect(decided).toMatchObject({ ok: true, value: { entry: { input: { decision: "applied" } } } });
    if (!decided.ok) throw new Error("actual bound decision must be readable");
    const result = decided.value.entry.sends[0]!;
    expect(await arrive(sender.name, { to: sender.at, from: received.fact, n: result.n, message: result.message })).toMatchObject({ answer: "recorded" });
    const http = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    const replayed = await verify(http, { mode: "replay", scope: receiver.name, grants: "as-recorded", bounds: receiver.c.bounds, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, platform: named => named === "platform:task@1" ? { data, rules: {} } : null });
    expect([replayed.report.result, replayed.why], JSON.stringify(replayed.report)).toEqual(["consistent", null]);
  } finally { for (const name of peers.keys()) wired.delete(name); }
});

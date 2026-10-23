import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type PlatformData, type Seed } from "@generalbusiness/dap-contract";
import { intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { reserved, type Delivered, type PlatformRules, type ValidDefinition } from "@generalbusiness/dap-derive";
import { grantOf } from "@generalbusiness/dap-derive/testing";
import { platformRequests, futurePlatformRequests, settlingPlatformMarks, platformRequestRules } from "../../derive/test/fixtures-platform-requests.ts";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

const definition = platformRequests(true, true), data = definition.declared as PlatformData;
const names: string[] = [];
function wire(name: string, entries: number, items: number, under = definition, rules: PlatformRules["rules"] = platformRequestRules.rules) {
  const data = under.declared as PlatformData;
  const c = controls(name, START);
  c.bounds = { ...PROPOSED_BOUNDS, scopeEntries: entries, scopeItems: items };
  wired.set(name, () => ({ definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === platformRequestRules.named ? { data, rules } : null }, resolver: { read: async fact => {
    const read = await stubOf(fact.at.scope).entry(reader, fact.seq);
    return read.ok && read.value.hash === fact.hash ? { fact, entry: read.value.entry, under: "platform:task" } : null;
  } } }));
  names.push(name);
  return c;
}
async function birth(entries: number, items: number, under = definition) {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: platformRequestRules.named, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = wire(name, entries, items, under), answer = await stubOf(name).create(signed, platformRequestRules.named);
  if (answer.answer !== "accepted") throw new Error(`the platform request fixture must create: ${JSON.stringify(answer)}`);
  return new Lane(name, c, answer.receipt.fact.at, answer.receipt, signed);
}
const peer = (name: string) => objectOf(name) as unknown as { deliver(input: Delivered): Promise<Delivery> };
const grants = (scope: Lane) => [grantOf(rita, scope.at, ["write", "strike"])];
const submit = (scope: Lane, kind: string, on = 0, revision = 1) => scope.stub.submit(scope.intent(rita, kind, { on, expected: { on: revision }, fields: {} }), grants(scope));
const inspect = (scope: Lane, under: ValidDefinition = definition) => scope.inside(state => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const entry = JSON.parse(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
  return { head: store.scope()!.head, used: store.scope()!.head.seq + 1, bytes: store.logicalBytes(), keys: store.keyCounts(), reserved: reserved(store, under, entry.input), requests: store.pendingRequests().map(request => request.reservation), duties: store.itemDuties(), note: store.item(0) };
});

async function answer(sender: Lane, under: ValidDefinition, fact: FactRef) {
  const sent = await sender.stub.entry(reader, fact.seq);
  if (!sent.ok) throw new Error("the actual settling send must be readable");
  const request = sent.value.entry.sends[0]!, seed = request.to as Seed, child = scopeIdOf(seed);
  wire(child, sender.c.bounds.scopeEntries, sender.c.bounds.scopeItems, under);
  const received = await peer(child).deliver({ to: seed, from: fact, n: request.n, message: request.message });
  if (received.answer !== "recorded") throw new Error("the child must record its refusal");
  const genesis = await stubOf(child).entry(reader, 0);
  if (!genesis.ok) throw new Error("the actual child result must be readable");
  expect(genesis.value.entry.input).toMatchObject({ type: "genesis", decision: "refused" });
  const result = genesis.value.entry.sends[0]!;
  const delivered = await peer(sender.name).deliver({ to: sender.at, from: received.fact, n: result.n, message: result.message });
  if (delivered.answer !== "recorded") throw new Error(`the funded result must settle: ${JSON.stringify(delivered)}`);
  return delivered.fact.seq;
}

test("a filled native item funds its settling form's two future marked request edges across eviction and real child results", async () => {
  const under = futurePlatformRequests(true), sender = await birth(10, 3, under);
  // Fixture data/code/authority/resolver; real storage, fold, child result,
  // eviction and replay. Neither unused noop nor an outside provider runs.
  try {
    expect(await submit(sender, "wait")).toMatchObject({ answer: "accepted" });
    const waiting = await inspect(sender, under);
    expect([waiting.used, waiting.reserved.entries, waiting.reserved.items, waiting.reserved.requests]).toEqual([2, 8, 2, 2]);
    await sender.restart();
    expect(await submit(sender, "idle", 0, 2)).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeEntries" });
    const resolved = await submit(sender, "resolve-note", 0, 2);
    expect(resolved).toMatchObject({ answer: "accepted" });
    if (resolved.answer !== "accepted") return;
    const sent = await inspect(sender, under);
    expect([sent.used, sent.keys.requests, sent.reserved.entries, sent.reserved.requests]).toEqual([3, 1, 7, 1]);
    await sender.restart();
    const row = await answer(sender, under, resolved.receipt.fact), opened = await inspect(sender, under);
    expect([opened.used, opened.keys.items, opened.reserved.entries, opened.reserved.items, opened.reserved.requests]).toEqual([4, 2, 5, 1, 1]);
    await sender.restart();
    const finished = await submit(sender, "finish-row", row);
    expect(finished).toMatchObject({ answer: "accepted" });
    if (finished.answer !== "accepted") return;
    const tail = await answer(sender, under, finished.receipt.fact);
    await sender.restart();
    expect(await submit(sender, "finish-tail", tail)).toMatchObject({ answer: "accepted" });
    const closed = await inspect(sender, under);
    expect([closed.used, closed.keys, closed.reserved.entries, closed.duties]).toEqual([7, { items: 3, records: 0, requests: 0 }, 1, []]);
    expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: sender.name, grants: "as-recorded", bounds: sender.c.bounds, platform: name => name === platformRequestRules.named ? { data: under.declared as PlatformData, rules: platformRequestRules.rules } : null });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { for (const name of names.splice(0)) wired.delete(name); }
});

test.each([false, true])("a filled native settlement by marker=%s funds its direct opening mark and the row's future request after eviction", async marker => {
  // Real storage, settlement, direct mark, actual child result and replay.
  // Data/code/authority/resolver are fixtures; no outside owner runs.
  const under = settlingPlatformMarks(marker), sender = await birth(8, 3, under);
  try {
    expect(await submit(sender, "wait")).toMatchObject({ answer: "accepted" });
    const pending = await inspect(sender, under);
    expect([pending.used, pending.reserved.entries, pending.reserved.items, pending.reserved.requests]).toEqual([2, 6, 2, 1]);
    await sender.restart();
    expect(await submit(sender, "idle", 0, 2)).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeEntries" });
    if (!marker) {
      const before = await inspect(sender, under);
      let attempted = false;
      // Deliberately faulty fixture code. A settling rule's state effect
      // is rejected before it can consume or release any admitted duty.
      wire(sender.name, 8, 3, under, { ...platformRequestRules.rules, "open-row": { place: "effect", most: 1, run: given => {
        attempted = true;
        return [{ effect: "state", item: given.resolved.subjects.get("on")!.id, state: "waiting" }];
      } } });
      await sender.restart();
      expect(await submit(sender, "resolve-note", 0, 2)).toMatchObject({ answer: "unavailable", reason: "unavailable" });
      expect(attempted).toBe(true);
      expect(await inspect(sender, under)).toEqual(before);
      wire(sender.name, 8, 3, under);
      await sender.restart();
    }
    const resolved = await submit(sender, "resolve-note", 0, 2);
    expect(resolved).toMatchObject({ answer: "accepted" });
    if (resolved.answer !== "accepted") return;
    const row = resolved.receipt.fact.seq, opened = await inspect(sender, under);
    expect([opened.used, opened.keys.items, opened.reserved.entries, opened.reserved.items, opened.reserved.requests]).toEqual([3, 2, 5, 1, 1]);
    expect(opened.duties.map(duty => duty.item)).toEqual([row]);
    await sender.restart();
    const finished = await submit(sender, "finish-row", row);
    expect(finished).toMatchObject({ answer: "accepted" });
    if (finished.answer !== "accepted") return;
    await sender.restart();
    const tail = await answer(sender, under, finished.receipt.fact);
    await sender.restart();
    expect(await submit(sender, "finish-tail", tail)).toMatchObject({ answer: "accepted" });
    const closed = await inspect(sender, under);
    expect([closed.used, closed.keys, closed.reserved.entries, closed.duties]).toEqual([6, { items: 3, records: 0, requests: 0 }, 1, []]);
    expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: sender.name, grants: "as-recorded", bounds: sender.c.bounds, platform: name => name === platformRequestRules.named ? { data: under.declared as PlatformData, rules: platformRequestRules.rules } : null });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { for (const name of names.splice(0)) wired.delete(name); }
});

test("native platform sends use their own clause room at equality, and a filled sender funds its real marked result and row settlement after eviction", async () => {
  // Real scopes, SQLite, judgment/fold, child creation/result, eviction and
  // HTTP replay. Data, mark code, authority and the RPC resolver are fixtures.
  try {
    const quiet = await birth(5, 1);
    expect(await submit(quiet, "quiet")).toMatchObject({ answer: "accepted" });
    expect((await inspect(quiet)).requests).toEqual([{ entries: 2, items: 0, records: 0, bytes: 3 * PROPOSED_BOUNDS.entryBytes, requests: 0 }]);
    await quiet.restart();
    expect(await submit(quiet, "idle")).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeEntries" });

    const sender = await birth(6, 2), asked = await submit(sender, "ask");
    if (asked.answer !== "accepted") throw new Error(`the marked request must fit: ${JSON.stringify(asked)}`);
    const before = await inspect(sender);
    expect([before.used, before.reserved.entries, before.reserved.items]).toEqual([2, 4, 1]);
    await sender.restart();
    expect(await submit(sender, "idle")).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeEntries" });
    const sent = await sender.stub.entry(reader, asked.receipt.fact.seq);
    if (!sent.ok) throw new Error("the actual create send must be readable");
    const request = sent.value.entry.sends[0]!, seed = request.to as Seed, child = scopeIdOf(seed);
    wire(child, 6, 2);
    const received = await peer(child).deliver({ to: seed, from: asked.receipt.fact, n: request.n, message: request.message });
    if (received.answer !== "recorded") throw new Error(`the child must record its refusal: ${JSON.stringify(received)}`);
    const genesis = await stubOf(child).entry(reader, 0);
    if (!genesis.ok) throw new Error("the refused child genesis must be readable");
    expect(genesis.value.entry.input).toMatchObject({ type: "genesis", decision: "refused" });
    const result = genesis.value.entry.sends[0]!;
    const settled = await peer(sender.name).deliver({ to: sender.at, from: received.fact, n: result.n, message: result.message });
    if (settled.answer !== "recorded") throw new Error(`the funded result must settle: ${JSON.stringify(settled)}`);
    const row = settled.fact.seq, after = await inspect(sender);
    expect([after.used, after.keys, after.reserved.entries]).toEqual([3, { items: 2, records: 0, requests: 0 }, 2]);
    expect(after.duties.map(duty => duty.item)).toEqual([row]);
    await sender.restart();
    expect(await submit(sender, "finish-row", row)).toMatchObject({ answer: "accepted" });
    expect((await inspect(sender)).duties).toEqual([]);
    expect(await sender.stub.checkpoint()).toMatchObject({ answer: "written" });
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: sender.name, grants: "as-recorded", bounds: sender.c.bounds, platform: name => name === platformRequestRules.named ? { data, rules: platformRequestRules.rules } : null });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { for (const name of names.splice(0)) wired.delete(name); }
});

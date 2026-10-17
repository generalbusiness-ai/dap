import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type PlatformData, type Seed } from "@generalbusiness/dap-contract";
import { intentDigest, scopeIdOf, signIntent } from "@generalbusiness/artroom-bytes";
import { reserved, type Delivered } from "@generalbusiness/dap-derive";
import { grantOf } from "@generalbusiness/dap-derive/testing";
import { platformRequests, platformRequestRules } from "../../derive/test/fixtures-platform-requests.ts";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import { controls } from "../src/testing.ts";
import { route } from "../src/worker.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./support.ts";

const definition = platformRequests(true, true), data = definition.declared as PlatformData;
const names: string[] = [];
function wire(name: string, entries: number, items: number) {
  const c = controls(name, START);
  c.bounds = { ...PROPOSED_BOUNDS, scopeEntries: entries, scopeItems: items };
  wired.set(name, () => ({ definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === platformRequestRules.named ? { data, rules: platformRequestRules.rules } : null }, resolver: { read: async fact => {
    const read = await stubOf(fact.at.scope).entry(reader, fact.seq);
    return read.ok && read.value.hash === fact.hash ? { fact, entry: read.value.entry, under: "platform:task" } : null;
  } } }));
  names.push(name);
  return c;
}
async function birth(entries: number, items: number) {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: platformRequestRules.named, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = wire(name, entries, items), answer = await stubOf(name).create(signed, platformRequestRules.named);
  if (answer.answer !== "accepted") throw new Error(`the platform request fixture must create: ${JSON.stringify(answer)}`);
  return new Lane(name, c, answer.receipt.fact.at, answer.receipt, signed);
}
const peer = (name: string) => objectOf(name) as unknown as { deliver(input: Delivered): Promise<Delivery> };
const grants = (scope: Lane) => [grantOf(rita, scope.at, ["write", "strike"])];
const submit = (scope: Lane, kind: string, on = 0) => scope.stub.submit(scope.intent(rita, kind, { on, expected: { on: 1 }, fields: {} }), grants(scope));
const inspect = (scope: Lane) => scope.inside(state => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const entry = JSON.parse(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
  return { used: store.scope()!.head.seq + 1, keys: store.keyCounts(), reserved: reserved(store, definition, entry.input), requests: store.pendingRequests().map(request => request.reservation), duties: store.itemDuties() };
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

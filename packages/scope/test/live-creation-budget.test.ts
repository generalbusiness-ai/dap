import { capacityConfirmationParentData } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type ScopeId, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { reserved, validateDefinition, type Delivered, type ValidDefinition } from "@generalbusiness/dap-derive";
import { grantOf } from "@generalbusiness/dap-derive/testing";
import { valid } from "../../derive/test/fixtures.ts";
import { httpSource } from "@generalbusiness/dap-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import type { ProofBody } from "../src/proof-bytes.ts";
import { controls } from "../src/testing.ts";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { liveTurnsOf, type LiveTurns } from "../src/live.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, foreignOf, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

const bounds = { ...PROPOSED_BOUNDS, entryBytes: 4096 };
const source = () => httpSource("https://scope.test", { reader, fetch: async (url, init) => {
  const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
} });
type Peer = {
  deliver(input: Delivered): Promise<Delivery>;
  nativeBirth(at: ScopeRef, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null>;
  proofSource(fact: FactRef, maxBytes: number, milliseconds?: number): Promise<ProofBody | null>;
};
const peer = (name: ScopeId) => objectOf(name) as unknown as Peer;

function definitions() {
  const childData = liveBase();
  const child = valid(validateDefinition(childData, bounds));
  const parentData = capacityConfirmationParentData(child.digest);
  const send = parentData.acts["open-issue"]!.sends[0]!;
  if (!("create" in send)) throw new Error("the fixture must create its child");
  send.create.fields = {};
  return { child, parent: valid(validateDefinition(parentData, bounds)) };
}

const stored = (name: ScopeId, under: ValidDefinition) => runInDurableObject(objectOf(name), (_instance, state) => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const scope = store.scope(), last = scope ? store.stored(scope.head.seq) : null;
  const pending = last ? reserved(store, under, (JSON.parse(last.bytes) as Entry).input) : null;
  return { scope, bytes: store.logicalBytes(), retainedBytes: store.retainedBytes(), pending, retained: state.storage.sql.exec<{ kind: string; digest: string; bytes: string }>("SELECT kind, digest, bytes FROM retained_input ORDER BY kind, digest").toArray() };
});

const meter = { limit: 32 * 1024 * 1024, used: 0 };
async function history(ceiling?: number) {
  const under = definitions(), nodes = new Map<ScopeId, ValidDefinition>();
  // Native APIs read actual peer storage and authenticate birth/source
  // proofs. Only declarations, authority, clock and transport wiring are
  // fixtures. No entry, proof body, receipt or historical size is invented.
  const wire = (name: ScopeId, definition: ValidDefinition) => {
    nodes.set(name, definition);
    wired.set(name, () => ({
      births: { read: (at, milliseconds, maxBytes) => nodes.has(at.scope) ? peer(at.scope).nativeBirth(at, milliseconds, maxBytes) : Promise.resolve(null) },
      proofs: { read: (fact, maxBytes, milliseconds) => nodes.has(fact.at.scope) ? peer(fact.at.scope).proofSource(fact, maxBytes, milliseconds) : Promise.resolve(null) },
      definitions: { platform: () => null, read: async digest => {
        const read = await source().retained(parentName, "definition", digest, { bytes: bounds.definitionBytes });
        return read.ok ? { ok: true, bytes: read.input.bytes } : { ok: false, reason: read.reason === "not-found" ? "absent" : "unavailable" };
      } },
      resolver: { read: async fact => {
        const definition = nodes.get(fact.at.scope);
        if (!definition) return null;
        return foreignOf(fact, definition.declared.name);
      } },
    }));
  };
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: { source: "fixture" }, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: under.parent.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const parentName = scopeIdOf(seed), c = controls(parentName, START);
  c.bounds = bounds;
  wire(parentName, under.parent);
  const cleanup = () => { for (const name of nodes.keys()) wired.delete(name); };
  try {
    const born = await stubOf(parentName).create(signed, under.parent.declared, [under.child.declared]);
    expect(born).toMatchObject({ answer: "accepted" });
    if (born.answer !== "accepted") throw new Error("parent birth failed");
    const parent = new Lane(parentName, c, born.receipt.fact.at, born.receipt, signed);
    const opened = await parent.stub.submit(parent.intent(rita, "open-issue", { fields: { title: "child" } }), [grantOf(rita, parent.at, ["open-issue"])]);
    expect(opened).toMatchObject({ answer: "accepted" });
    if (opened.answer !== "accepted") throw new Error("parent did not send its create");
    const read = await parent.stub.entry(reader, opened.receipt.fact.seq);
    if (!read.ok) throw new Error("parent's create source is unreadable");
    const send = read.value.entry.sends.find(send => send.message.class === "request" && send.message.type === "create")!;
    const child = scopeIdOf(send.to as Seed);
    const childControl = controls(child, START);
    childControl.bounds = { ...bounds, ...(ceiling === undefined ? {} : { scopeBytes: ceiling }) };
    childControl.liveMeter = meter;
    wire(child, under.child);
    const delivered: Delivered = { to: send.to, from: opened.receipt.fact, n: send.n, message: send.message };
    return { child, parent, under, delivered, cleanup, birth: await peer(child).deliver(delivered) };
  } catch (error) { cleanup(); throw error; }
}

async function confirmationFrom(child: ScopeId, parent: Lane) {
  const genesis = await stubOf(child).entry(reader, 0);
  if (!genesis.ok) throw new Error("child genesis is unreadable");
  const sent = genesis.value.entry.sends.find(send => send.message.class === "result")!;
  const result = await peer(parent.name).deliver({ to: sent.to, from: { at: { scope: child, genesis: genesis.value.hash }, seq: 0, hash: genesis.value.hash }, n: sent.n, message: sent.message });
  expect(result).toMatchObject({ answer: "recorded" });
  if (result.answer !== "recorded") throw new Error("parent did not record the creation result");
  const read = await parent.stub.entry(reader, result.fact.seq);
  if (!read.ok) throw new Error("creator's confirmation source is unreadable");
  const confirm = read.value.entry.sends.find(send => send.message.class === "control")!;
  const envelope: Delivered = { to: confirm.to, from: result.fact, n: confirm.n, message: confirm.message };
  return { envelope, creatorResult: read.value.entry };
}

// Real parent and child journals, peer proofs and native confirmation. The
// authority, clock and network wiring use the capacity fixture's stand-ins.
test("live creation folds actual genesis and confirmation within the prototype budget", async () => {
  const run = await history();
  try {
    expect(run.birth).toMatchObject({ answer: "recorded" });
    const { envelope } = await confirmationFrom(run.child, run.parent);
    expect(await peer(run.child).deliver(envelope)).toMatchObject({ answer: "recorded" });
    const first = await stubOf(run.child).entry(reader, 0), second = await stubOf(run.child).entry(reader, 1);
    if (!first.ok || !second.ok) throw new Error("the two creation entries must be readable");
    expect(first.value.entry.input.type).toBe("genesis");
    expect(second.value.entry.input).toMatchObject({ type: "delivery", message: { class: "control", type: "confirm" } });
    const before = await stored(run.child, run.under.child);
    expect(before.scope).toMatchObject({ status: "active", head: { seq: 1 } });
    const live = await runInDurableObject(objectOf(run.child), instance => {
      const turns = (instance as unknown as { [liveTurnsOf](): LiveTurns | null })[liveTurnsOf]();
      const current = turns?.current();
      return current ? { tick: current.tick, scope: current.view.scope(), items: current.view.all().items } : null;
    });
    expect(live).toMatchObject({ tick: 1, scope: { status: "active", head: { seq: 1 } }, items: [expect.objectContaining({ type: "tally", values: { count: 0 } })] });
    expect(meter.used).toBeGreaterThan(0);
    expect(meter.used).toBeLessThan(meter.limit);
    expect(await stored(run.child, run.under.child)).toEqual(before);
    expect(await stubOf(run.child).entry(reader, 0)).toEqual(first);
    expect(await stubOf(run.child).entry(reader, 1)).toEqual(second);
  } finally { run.cleanup(); }
});

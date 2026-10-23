import { capacityConfirmationChildData, capacityConfirmationParentData } from "../../derive/test/definition-corpus/scope-capacity-floor.ts";
import { env } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type ScopeId, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { reserved, validateDefinition, type Delivered, type ValidDefinition } from "@generalbusiness/dap-derive";
import { grantOf } from "@generalbusiness/dap-derive/testing";
import { valid } from "../../derive/test/fixtures.ts";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import type { ProofBody } from "../src/proof-bytes.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

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

function definitions(whole: boolean) {
  const childData = capacityConfirmationChildData(whole);
  const child = valid(validateDefinition(childData, bounds));
  const parentData = capacityConfirmationParentData(child.digest);
  return { child, parent: valid(validateDefinition(parentData, bounds)) };
}

const stored = (name: ScopeId, under: ValidDefinition) => runInDurableObject(objectOf(name), (_instance, state) => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const scope = store.scope(), last = scope ? store.stored(scope.head.seq) : null;
  const pending = last ? reserved(store, under, (JSON.parse(last.bytes) as Entry).input) : null;
  return { scope, bytes: store.logicalBytes(), pending, retained: state.storage.sql.exec<{ kind: string; digest: string; bytes: string }>("SELECT kind, digest, bytes FROM retained_input ORDER BY kind, digest").toArray() };
});

async function history(whole: boolean, ceiling?: number) {
  const under = definitions(whole), nodes = new Map<ScopeId, ValidDefinition>();
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
        const read = await stubOf(fact.at.scope).entry(reader, fact.seq);
        return read.ok && read.value.hash === fact.hash ? { entry: read.value.entry, under: definition.declared.name } : null;
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
    controls(child, START).bounds = { ...bounds, ...(ceiling === undefined ? {} : { scopeBytes: ceiling }) };
    wire(child, under.child);
    const delivered: Delivered = { to: send.to, from: opened.receipt.fact, n: send.n, message: send.message };
    return { child, parent, under, delivered, cleanup, birth: await peer(child).deliver(delivered) };
  } catch (error) { cleanup(); throw error; }
}

async function confirmationFrom(child: ScopeId, parent: Lane) {
  const genesis = await stubOf(child).entry(reader, 0);
  if (!genesis.ok) throw new Error("child genesis is unreadable");
  const sent = genesis.value.entry.sends.find(send => send.message.class === "result")!;
  const result = await peer(parent.name).deliver({ to: sent.to, from: { at: genesis.value.entry.at, seq: 0, hash: genesis.value.hash }, n: sent.n, message: sent.message });
  expect(result).toMatchObject({ answer: "recorded" });
  if (result.answer !== "recorded") throw new Error("parent did not record the creation result");
  const read = await parent.stub.entry(reader, result.fact.seq);
  if (!read.ok) throw new Error("creator's confirmation source is unreadable");
  const confirm = read.value.entry.sends.find(send => send.message.class === "control")!;
  const envelope: Delivered = { to: confirm.to, from: result.fact, n: confirm.n, message: confirm.message };
  return { envelope, creatorResult: read.value.entry };
}

test("a provisional birth funds its retained confirmation source at equality, across eviction, through the closing checkpoint", async () => {
  const measured = await history(true);
  let ceiling: number, used: number;
  try {
    expect(measured.birth).toMatchObject({ answer: "recorded" });
    const before = await stored(measured.child, measured.under.child);
    expect(before.scope?.status).toBe("provisional");
    expect(before.pending?.entries).toBe(2);
    used = before.bytes;
    ceiling = before.bytes + before.pending!.bytes;
  } finally { measured.cleanup(); }

  const exact = await history(true, ceiling!);
  try {
    expect(exact.birth).toMatchObject({ answer: "recorded" });
    const before = await stored(exact.child, exact.under.child);
    expect(before.bytes).toBe(used!);
    expect(before.bytes + before.pending!.bytes).toBe(ceiling!);
    const { envelope, creatorResult } = await confirmationFrom(exact.child, exact.parent);
    await evictDurableObject(objectOf(exact.child));
    const confirmed = await peer(exact.child).deliver(envelope);
    expect(confirmed, JSON.stringify(confirmed)).toMatchObject({ answer: "recorded" });
    const after = await stored(exact.child, exact.under.child);
    expect(after.scope?.status).toBe("active");
    expect(after.pending?.entries).toBe(1);
    const recorded = await stubOf(exact.child).entry(reader, 1);
    if (!recorded.ok) throw new Error("confirmation is unreadable");
    const ownBytes = canonicalBytes(recorded.value.entry).length, sourceBytes = canonicalBytes(creatorResult).length;
    expect([ownBytes, sourceBytes].every(size => size <= bounds.entryBytes)).toBe(true);
    expect(ownBytes + sourceBytes).toBeGreaterThan(bounds.entryBytes);
    expect(after.bytes - before.bytes).toBe(ownBytes + sourceBytes);
    const sourceUse = recorded.value.entry.uses.find(use => use.fact.hash === envelope.from.hash)!;
    expect(after.retained.filter(row => row.kind === "entry" && row.digest === sourceUse.content).map(row => row.bytes)).toEqual([canonicalize(creatorResult)]);
    expect(after.bytes + after.pending!.bytes).toBeLessThanOrEqual(ceiling!);
    expect(await peer(exact.child).deliver(envelope)).toMatchObject({ answer: "recorded" });
    expect(await stored(exact.child, exact.under.child)).toEqual(after);
    expect(await stubOf(exact.child).checkpoint()).toMatchObject({ answer: "written" });
    const closed = await stored(exact.child, exact.under.child);
    expect(closed.pending).toEqual({ entries: 0, items: 0, records: 0, bytes: 0, requests: 0 });
    expect(closed.bytes).toBeLessThanOrEqual(ceiling!);
    const replayed = await verify(source(), { mode: "replay", scope: exact.child, grants: "as-recorded", bounds: { ...bounds, scopeBytes: ceiling! } });
    expect([replayed.report.result, replayed.why, replayed.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
  } finally { exact.cleanup(); }

  const small = await history(true, ceiling! - 1);
  try {
    expect(small.birth).toEqual({ answer: "retry", reason: "scope-full", name: "scopeBytes" });
    expect(await stored(small.child, small.under.child)).toMatchObject({ scope: null, bytes: 0, pending: null, retained: [] });
    await evictDurableObject(objectOf(small.child));
    expect(await stored(small.child, small.under.child)).toMatchObject({ scope: null, bytes: 0, pending: null, retained: [] });
  } finally { small.cleanup(); }
});

test("omitting capacity keeps provisional confirmation's legacy entry count and byte-ceiling behavior", async () => {
  const old = await history(false, 0);
  try {
    expect(old.birth).toMatchObject({ answer: "recorded" });
    const before = await stored(old.child, old.under.child);
    expect(before.scope?.status).toBe("provisional");
    expect(before.pending).toEqual({ entries: 2, items: 0, records: 0, bytes: 0, requests: 0 });
    const { envelope } = await confirmationFrom(old.child, old.parent);
    await evictDurableObject(objectOf(old.child));
    expect(await peer(old.child).deliver(envelope)).toMatchObject({ answer: "recorded" });
    expect((await stored(old.child, old.under.child)).pending).toEqual({ entries: 1, items: 0, records: 0, bytes: 0, requests: 0 });
    expect(await stubOf(old.child).checkpoint()).toMatchObject({ answer: "written" });
    expect((await stored(old.child, old.under.child)).pending).toEqual({ entries: 0, items: 0, records: 0, bytes: 0, requests: 0 });
    const replayed = await verify(source(), { mode: "replay", scope: old.child, grants: "as-recorded", bounds: { ...bounds, scopeBytes: 0 } });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { old.cleanup(); }
});

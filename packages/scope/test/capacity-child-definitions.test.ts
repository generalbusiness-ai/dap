import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Bounds, type FactRef, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import type { Delivered, ValidDefinition } from "@generalbusiness/dap-derive";
import { grantOf } from "@generalbusiness/dap-derive/testing";
import { childDefinitions } from "../../derive/test/fixtures-child-definitions.ts";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { SqliteStore, type Delivery } from "../src/index.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import type { NativeBirth } from "../src/native-birth.ts";
import type { ProofBody } from "../src/proof-bytes.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

function setup(under: ValidDefinition, bounds: Partial<Bounds> = {}) {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: under.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START), stub = stubOf(name);
  c.bounds = { ...PROPOSED_BOUNDS, namedDefinitions: 2, ...bounds };
  return { signed, name, c, stub };
}

test("native opt-in birth requires nested child declarations before genesis and charges each shared digest once at the exact byte ceiling after eviction", async () => {
  // Real creation, SQLite, eviction and HTTP replay; made-up declarations
  // and fixture authority. No child, outside operation or provider runs.
  const { root, branch, leaf, extra } = childDefinitions();
  const given = [branch.declared, leaf.declared, branch.declared, extra.declared];
  const first = setup(root);
  expect(await first.stub.create(first.signed, root.declared, [branch.declared])).toEqual({ answer: "refused", reason: "unsupported-definition" });
  expect(await first.stub.summary(reader)).toEqual({ ok: false, reason: "not-found" });
  const born = await first.stub.create(first.signed, root.declared, given);
  expect(born, JSON.stringify(born)).toMatchObject({ answer: "accepted" });
  if (born.answer !== "accepted") return;
  const lane = new Lane(first.name, first.c, born.receipt.fact.at, born.receipt, first.signed);
  const contents = (scope: Lane) => scope.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    return { bytes: store.logicalBytes(), declarations: [root, branch, leaf, extra].map(definition => store.retained("definition", definition.digest)?.bytes ?? null) };
  });
  const measured = await contents(lane);
  expect(measured.declarations).toEqual([...[root, branch, leaf].map(definition => canonicalize(definition.declared)), null]);
  const ceiling = measured.bytes + PROPOSED_BOUNDS.entryBytes;
  const exact = setup(root, { scopeBytes: ceiling }), made = await exact.stub.create(exact.signed, root.declared, given);
  expect(made).toMatchObject({ answer: "accepted" });
  if (made.answer !== "accepted") return;
  const filled = new Lane(exact.name, exact.c, made.receipt.fact.at, made.receipt, exact.signed);
  await filled.restart();
  expect(await contents(filled)).toEqual(measured);
  const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
    const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
  } });
  const replayed = await verify(source, { mode: "replay", scope: filled.name, grants: "as-recorded", bounds: exact.c.bounds });
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  const small = setup(root, { scopeBytes: ceiling - 1 });
  expect(await small.stub.create(small.signed, root.declared, given)).toEqual({ answer: "refused", reason: "scope-full", name: "scopeBytes" });
  expect(await small.stub.summary(reader)).toEqual({ ok: false, reason: "not-found" });
  const legacy = childDefinitions(false).root, old = setup(legacy);
  expect(await old.stub.create(old.signed, legacy.declared)).toMatchObject({ answer: "accepted" });
});

test("a legacy creator's optional absent declaration cannot become an opt-in child's incomplete birth", async () => {
  // Actual parent storage and send. The small read adapters use that
  // parent's native APIs. Authority/data are fixtures; no provider runs.
  const { root, branch, leaf } = childDefinitions(false), parent = setup(root);
  const born = await parent.stub.create(parent.signed, root.declared, [branch.declared]);
  expect(born).toMatchObject({ answer: "accepted" });
  if (born.answer !== "accepted") return;
  const lane = new Lane(parent.name, parent.c, born.receipt.fact.at, born.receipt, parent.signed);
  const sent = await parent.stub.submit(lane.intent(rita, "children", { on: 0, expected: { on: 1 }, fields: {} }), [grantOf(rita, lane.at, ["write"])]);
  expect(sent).toMatchObject({ answer: "accepted" });
  if (sent.answer !== "accepted") return;
  const source = await parent.stub.entry(reader, sent.receipt.fact.seq);
  if (!source.ok) throw new Error("the actual create send must be readable");
  const request = source.value.entry.sends[0]!, seed = request.to as Seed, child = scopeIdOf(seed);
  controls(child, START).bounds = { ...PROPOSED_BOUNDS, namedDefinitions: 2 };
  const retainedSource = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
    const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
  } });
  const trace: unknown[] = [];
  const raw = () => objectOf(parent.name) as unknown as {
    nativeBirth(at: ScopeRef, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null>;
    proofSource(fact: FactRef, maxBytes: number, milliseconds?: number): Promise<ProofBody | null>;
  };
  wired.set(child, () => ({
    births: { read: (at, milliseconds, maxBytes) => raw().nativeBirth(at, milliseconds, maxBytes) },
    proofs: { read: (fact, maxBytes, milliseconds) => raw().proofSource(fact, maxBytes, milliseconds) },
    definitions: { platform: () => null, read: async digest => {
      const read = await retainedSource.retained(parent.name, "definition", digest, { bytes: PROPOSED_BOUNDS.definitionBytes });
      trace.push({ definition: digest, ok: read.ok, ...(!read.ok ? { reason: read.reason } : {}) });
      return read.ok ? { ok: true, bytes: read.input.bytes } : { ok: false, reason: read.reason === "not-found" ? "absent" : "unavailable" };
    } },
    resolver: { read: async fact => {
      const read = await stubOf(parent.name).entry(reader, fact.seq);
      trace.push({ seq: fact.seq, ok: read.ok, hash: read.ok && read.value.hash === fact.hash });
      return read.ok && read.value.hash === fact.hash ? { fact, entry: read.value.entry, under: root.declared.name } : null;
    } },
  }));
  try {
    const peer = objectOf(child) as unknown as { deliver(input: Delivered): Promise<Delivery> };
    const delivered = await peer.deliver({ to: seed, from: sent.receipt.fact, n: request.n, message: request.message });
    expect(delivered, JSON.stringify(trace)).toEqual({ answer: "retry", reason: "unsupported-definition" });
    expect(trace).toContainEqual({ definition: branch.digest, ok: true });
    expect(trace).toContainEqual({ definition: leaf.digest, ok: false, reason: "not-found" });
    expect(await stubOf(child).summary(reader)).toEqual({ ok: false, reason: "not-found" });
  } finally { wired.delete(child); }
});

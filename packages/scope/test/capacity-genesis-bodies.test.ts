import { env } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest, type Entry, type Intent, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import type { ValidDefinition } from "@generalbusiness/dap-derive";
import { directory, grantOf } from "@generalbusiness/dap-derive/testing";
import { childDefinitions } from "../../derive/test/fixtures-child-definitions.ts";
import { genesisBodyDefinition } from "../../derive/test/fixtures-genesis-bodies.ts";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { SqliteStore } from "../src/index.ts";
import { controls } from "../src/testing.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, objectOf, reader, rita, stubOf } from "./fixtures-native.ts";

function setup(under: ValidDefinition, fields: Intent["fields"]) {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: under.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START);
  c.bounds = { ...PROPOSED_BOUNDS, namedDefinitions: 2 };
  return { signed, name, c, stub: stubOf(name) };
}
const inspect = (name: string, digests: readonly Digest[]) => runInDurableObject(objectOf(name), (_instance, state) => {
  const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
  const first = store.stored(0);
  return { scope: store.scope(), bytes: store.logicalBytes(), genesis: first ? JSON.parse(first.bytes) as Entry : null, texts: digests.map(digest => store.retained("text", digest)?.bytes ?? null) };
});
const source = () => httpSource("https://scope.test", { reader, fetch: async (url, init) => {
  const response = await route(new Request(url, init), env.SCOPES); return { status: response.status, body: response.body };
} });

test("opt-in signed birth requires every matching body before dependencies or a refused genesis, and repeats need neither bodies nor child declarations", async () => {
  // Real preflight, judgment/fold, retention, eviction and HTTP replay.
  // Declaration/authority and the deliberately absent fact are fixtures.
  const body = "é\n", other = "other", a = textDigest(body), b = textDigest(other);
  const under = genesisBodyDefinition(), missing = setup(under, { a, proof: { at: directory, seq: 0, hash: under.digest } });
  let reads = 0;
  wired.set(missing.name, () => ({ resolver: { read: async () => { reads++; return null; } } }));
  try {
    expect(await missing.stub.create(missing.signed, under.declared)).toEqual({ answer: "refused", reason: "bad-field" });
    expect(await missing.stub.create(missing.signed, under.declared, [], { texts: [other] })).toEqual({ answer: "refused", reason: "bad-field" });
    expect(reads).toBe(0);
    expect((await inspect(missing.name, [a])).scope).toBeNull();
    expect(await missing.stub.create(missing.signed, under.declared, [], { texts: [body] })).toEqual({ answer: "unavailable", reason: "dependency-unavailable" });
    expect(reads).toBe(1);
  } finally { wired.delete(missing.name); }

  const children = childDefinitions(), closed = genesisBodyDefinition(true, children.root);
  const refused = setup(closed, { a, b, count: 2 }), declarations = [children.branch.declared, children.leaf.declared];
  expect(await refused.stub.create(refused.signed, closed.declared, declarations, { texts: [body, body] })).toEqual({ answer: "refused", reason: "bad-field" });
  expect((await inspect(refused.name, [a, b])).scope).toBeNull();
  expect(await refused.stub.create(refused.signed, closed.declared, declarations, { texts: [other, body] })).toEqual({ answer: "refused", reason: "scope-refused" });
  const retained = await inspect(refused.name, [a, b]);
  expect([retained.genesis?.input, retained.texts]).toEqual([expect.objectContaining({ type: "genesis", decision: "refused" }), [canonicalize(body), canonicalize(other)]]);
  await evictDurableObject(objectOf(refused.name));
  expect(await refused.stub.create(refused.signed, closed.declared)).toEqual({ answer: "refused", reason: "scope-refused" });
  expect(await inspect(refused.name, [a, b])).toEqual(retained);
  const replayed = await verify(source(), { mode: "replay", scope: refused.name, grants: "as-recorded", bounds: refused.c.bounds });
  expect([replayed.report.result, replayed.why, replayed.report.incompleteBytes]).toEqual(["consistent", null, undefined]);

  const legacy = genesisBodyDefinition(false), old = setup(legacy, { a, count: 2 });
  expect(await old.stub.create(old.signed, legacy.declared)).toEqual({ answer: "refused", reason: "scope-refused" });
  expect((await inspect(old.name, [a])).texts).toEqual([null]);
});

test("an applied opt-in birth repeats its receipt after body redaction and eviction while replay keeps the exact historical byte gap", async () => {
  const body = "é\n", digest = textDigest(body), children = childDefinitions();
  const under = genesisBodyDefinition(true, children.root), asked = setup(under, { a: digest, b: digest });
  const born = await asked.stub.create(asked.signed, under.declared, [children.branch.declared, children.leaf.declared], { texts: [body] });
  expect(born).toMatchObject({ answer: "accepted" });
  if (born.answer !== "accepted") return;
  const lane = new Lane(asked.name, asked.c, born.receipt.fact.at, born.receipt, asked.signed);
  const grant = grantOf(rita, lane.at, ["write", "strike"]);
  expect(await lane.stub.submit(lane.intent(rita, "write", { on: 0, expected: { on: 1 }, fields: { body: digest } }), [grant], { texts: [body] })).toMatchObject({ answer: "accepted" });
  expect(await lane.stub.submit(lane.intent(rita, "strike", { on: 0, expected: { on: 2 }, fields: {} }), [grant])).toMatchObject({ answer: "accepted" });
  const redacted = await inspect(asked.name, [digest]);
  expect(redacted.texts).toEqual([null]);
  await lane.restart();
  expect(await lane.stub.create(asked.signed, under.declared)).toEqual(born);
  expect(await inspect(asked.name, [digest])).toEqual(redacted);
  const replayed = await verify(source(), { mode: "replay", scope: asked.name, grants: "as-recorded", bounds: asked.c.bounds });
  expect([replayed.report.result, replayed.why]).toEqual(["incomplete", "redacted size not retained"]);
  expect(replayed.report.incompleteBytes).toEqual([{ scope: lane.at, from: 0, through: 1, reason: "redacted size not retained" }]);
});

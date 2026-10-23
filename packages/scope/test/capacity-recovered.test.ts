import { capacityRecoveredTextChange, recoveredAliasData } from "./definition-corpus-data.ts";
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS, type Entry, type PlatformData, type PlatformDefinition, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { reserved, validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import { grantOf, notesDefinition, valid, variant } from "@generalbusiness/dap-derive/testing";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { controls } from "../src/testing.ts";
import { SqliteStore } from "../src/index.ts";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, reader, rita, stubOf } from "./fixtures-native.ts";

const NAMED = "platform:task@1" as PlatformDefinition;

async function birth(under: ValidDefinition, platform?: PlatformData): Promise<Lane> {
  const signed = signIntent({ v: 1, to: null, actor: rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: at(60) }, rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: platform ? NAMED : under.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), c = controls(name, START);
  if (platform) wired.set(name, () => ({
    definitions: { read: async () => ({ ok: false, reason: "absent" }), platform: named => named === NAMED ? { data: platform, rules: {} } : null },
    // This adapter reads the other real object's entry. Definition names and
    // authority are fixture choices; the journal and copied bytes are real.
    resolver: { read: async fact => {
      const got = await stubOf(fact.at.scope).entry(reader, fact.seq);
      return got.ok && got.value.hash === fact.hash ? { fact, entry: got.value.entry, under: "notes" } : null;
    } },
  }));
  const answer = await stubOf(name).create(signed, platform ? NAMED : under.declared);
  if (answer.answer !== "accepted") throw new Error(`the alias scope must create: ${JSON.stringify(answer)}`);
  return new Lane(name, c, answer.receipt.fact.at, answer.receipt, signed);
}

test("a later value alias recovers a genuinely retained then redacted native text after eviction, and replay rejects one byte below the earlier exact budget", async () => {
  // Real native scopes, judge/fold, SQLite, retained-value writer, eviction
  // and HTTP replay. Data, authority and the small RPC resolver are fixtures.
  const under = variant(notesDefinition.declared, capacityRecoveredTextChange());
  const original = await birth(under), body = "é".repeat(10000), digest = textDigest(body);
  const grants = (scope: Lane) => [grantOf(rita, scope.at, ["write", "strike"])];
  let last = original.genesis.fact;
  for (let n = 0; n < 20; n++) {
    const answer = await original.stub.submit(original.intent(rita, "write", { on: 0, expected: { on: n + 1 }, fields: { body: digest } }), grants(original), { texts: [body] });
    if (answer.answer !== "accepted") throw new Error(`the original text must be retained: ${JSON.stringify(answer)}`);
    last = answer.receipt.fact;
  }
  const limit = await original.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const head = JSON.parse(store.stored(last.seq)!.bytes) as Entry;
    return store.logicalBytes() + reserved(store, under, head.input).bytes;
  });
  original.c.bounds = { ...original.c.bounds, scopeBytes: limit };
  await original.restart();
  expect(await original.stub.submit(original.intent(rita, "strike", { on: 0, expected: { on: 21 }, fields: {} }), grants(original))).toMatchObject({ answer: "accepted" });

  const data = recoveredAliasData();
  const alias = await birth(valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true })), data);
  try {
    const vouched = await alias.stub.submit(alias.intent(rita, "vouch", { on: 0, expected: { on: 1 }, fields: {} }), grants(alias), { presented: { proof: last } });
    if (vouched.answer !== "accepted") throw new Error(`the native fact must be vouched: ${JSON.stringify(vouched)}`);
    expect(await alias.stub.submit(alias.intent(rita, "retain", { on: 0, expected: { on: 1 }, fields: { proof: digest } }), grants(alias), { values: [canonicalize(body)] })).toMatchObject({ answer: "accepted" });
    await original.restart(); await alias.restart();
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    expect(await source.retained(original.name, "text", digest, { bytes: 65536 })).toEqual({ ok: false, reason: "not-found" });
    expect(await source.retained(alias.name, "value", digest, { bytes: 65536 }, DOMAINS.text)).toMatchObject({ ok: true, input: { bytes: canonicalize(body), domain: DOMAINS.text } });
    const options = { mode: "replay", scope: alias.name, grants: "as-recorded", platform: (name: PlatformDefinition) => name === NAMED ? { data, rules: {} } : null, bounds: { ...PROPOSED_BOUNDS, scopeBytes: limit } } as const;
    const exact = await verify(source, options);
    expect([exact.report.result, exact.why, exact.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
    const over = await verify(source, { ...options, bounds: { ...options.bounds, scopeBytes: limit - 1 } });
    expect([over.report.result, over.report.at?.at.scope, over.report.at?.seq]).toEqual(["mismatch", original.name, last.seq]);
    expect(over.report.coverage).toEqual([{ scope: alias.at, from: 0, through: 0 }, { scope: original.at, from: 0, through: last.seq - 1 }]);
  } finally { wired.delete(alias.name); }
});

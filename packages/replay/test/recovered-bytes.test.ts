import { recoveredText, recoveredChild, recoveredTransitiveTarget, recoveredSmallChild, recoveredSender, recoveredRefusalTarget } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
import { replayRecoveredAlias } from "../../derive/test/definition-corpus/replay-literals-data.ts";
import { expect, test } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS, type PlatformDefinition, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, utf8 } from "@generalbusiness/artroom-bytes";
import { clockOf, judgeGenesis, validateDefinition, valueDigest } from "@generalbusiness/dap-derive";
import { Ledger, T0, creation as childCreation, created, keys, notesDefinition, on, t, valid, variant } from "@generalbusiness/dap-derive/testing";
import { MemorySource, TRUSTS, verify } from "../src/index.ts";
import { served } from "./world.ts";

const NAMED = "platform:task@1" as PlatformDefinition;

function aliasWorld(body: unknown, max: number) {
  const under = variant(notesDefinition.declared, recoveredText(max));
  const original = created(under, {}, "original-text"), bytes = canonicalize(body), digest = valueDigest(DOMAINS.text, body);
  // In-memory judgments and fixture grants. Null deliberately stands for a
  // historical missing size: the negative cases claim no native admission.
  for (let n = 0; n < 20; n++) expect(original.act(keys.rita, "write", { ...on(original, 0), fields: { body: digest } }, { texts: () => null }).result).toBe("write");
  const referred = original.last.seq;
  const ceiling = utf8(canonicalize(under.declared)).length + original.entries.reduce((n, { entry }) => n + utf8(canonicalize(entry)).length, 0) + utf8(bytes).length + PROPOSED_BOUNDS.entryBytes;
  original.did(keys.rita, "strike", on(original, 0));

  const data = replayRecoveredAlias();
  const definition = valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true }));
  const alias = new Ledger(definition), platform = { named: NAMED, rules: {} };
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: "alias", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: NAMED, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  const genesis = judgeGenesis(alias.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(2)), seed, creation }, { clock: clockOf(alias.state, T0), bounds: PROPOSED_BOUNDS, source: null, facts: [], prepared: [], platform });
  if (genesis.result !== "write") throw new Error(`the alias fixture must create: ${JSON.stringify(genesis)}`);
  alias.seal(genesis.draft);
  const fact = original.fact(referred);
  expect(alias.act(keys.rita, "vouch", { ...on(alias, 0), fields: {} }, { platform, presented: { proof: fact }, facts: [{ fact, entry: original.entries[referred]!.entry, under: "notes" }] }).result).toBe("write");
  expect(alias.act(keys.rita, "retain", { ...on(alias, 0), fields: { proof: digest } }, { platform, values: [bytes] }).result).toBe("write");
  const all = [original, alias], a = served(original, all), b = served(alias, all);
  // Platform declarations come from code, and no text-store source remains.
  b.retained = [...b.retained.filter(input => input.kind !== "definition"), { kind: "value", domain: DOMAINS.text, digest, bytes }];
  const source = new MemorySource([a, b]);
  const options = { mode: "replay", scope: alias.at.scope, grants: "as-recorded", platform: (name: PlatformDefinition) => name === NAMED ? { data, rules: {} } : null } as const;
  return { original, alias, source, scopes: [a, b], options, ceiling, referred };
}

test("a later checked text-domain alias recovers earlier byte totals at equality and retracts a disproved source prefix and its consumer", async () => {
  const w = aliasWorld("é".repeat(10000), 32768);
  const tally = { folds: 0, values: 0, states: 0, runs: 0, owed: 0 };
  const exact = await verify(w.source, { ...w.options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: w.ceiling } }, tally);
  expect([exact.report.result, exact.why, exact.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
  expect(exact.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 2 }, { scope: w.original.at, from: 0, through: w.referred }]);
  expect(exact.report.trusts).not.toContain(TRUSTS.redacted);
  expect(tally.folds).toBeLessThanOrEqual(exact.report.coverage.reduce((n, span) => n + span.through - span.from + 1, 0));
  const over = await verify(w.source, { ...w.options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: w.ceiling - 1 } });
  expect([over.report.result, over.report.at?.at.scope, over.report.at?.seq, over.why]).toEqual(["mismatch", w.original.at.scope, w.referred, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);
  expect(over.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 0 }, { scope: w.original.at, from: 0, through: w.referred - 1 }]);
  expect(over.report.dependencies.verified).toBe(0);
});

test.each([
  ["oversized text", "x".repeat(41), "a recovered text changes the recorded judgment"],
  ["non-text JSON", { not: "a string" }, "a recovered text changes the recorded judgment"],
] as const)("a later alias proves an earlier purported detached %s invalid", async (_kind, body, why) => {
  const w = aliasWorld(body, 40);
  const result = await verify(w.source, w.options);
  expect([result.report.result, result.report.at?.at.scope, result.report.at?.seq, result.why]).toEqual(["mismatch", w.original.at.scope, 1, why]);
  expect(result.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 0 }, { scope: w.original.at, from: 0, through: 0 }]);
  expect(result.report.dependencies.verified).toBe(0);
});


test("recovered overflow retracts transitive consumers and a foreign prefix admitted through a cached proof", async () => {
  const w = aliasWorld("é".repeat(10000), 32768);
  const childDefinition = variant(notesDefinition.declared, recoveredChild);
  const child = created(childDefinition, {}, "cached-consumer"), originalFact = w.original.fact(w.referred);
  expect(child.act(keys.rita, "vouch", { ...on(child, 0), fields: {} }, { presented: { proof: originalFact }, facts: [{ fact: originalFact, entry: w.original.entries[w.referred]!.entry, under: "notes" }] }).result).toBe("write");
  const targetDefinition = variant(notesDefinition.declared, recoveredTransitiveTarget);
  const target = created(targetDefinition, {}, "transitive-target");
  const use = (kind: string, from: Ledger, seq: number) => {
    const fact = from.fact(seq);
    expect(target.act(keys.rita, kind, { ...on(target, 0), fields: {} }, { presented: { proof: fact }, facts: [{ fact, entry: from.entries[seq]!.entry, under: from.definition.declared.name }] }).result).toBe("write");
  };
  // Reading alias.1 first proves original.20. Reading child.1 then reuses
  // that cached proof. Only the last read reaches alias.2's retained body.
  use("vouch-alias", w.alias, 1);
  use("vouch", child, 1);
  use("vouch-alias", w.alias, 2);
  const all = [w.original, w.alias, child, target];
  const source = new MemorySource([...w.scopes, served(child, all), served(target, all)]);
  const result = await verify(source, { ...w.options, scope: target.at.scope, bounds: { ...PROPOSED_BOUNDS, scopeBytes: w.ceiling - 1 } });
  expect([result.report.result, result.report.at?.at.scope, result.report.at?.seq]).toEqual(["mismatch", w.original.at.scope, w.referred]);
  expect(result.report.coverage).toEqual([
    { scope: target.at, from: 0, through: 0 },
    { scope: w.alias.at, from: 0, through: 0 },
    { scope: w.original.at, from: 0, through: w.referred - 1 },
    { scope: child.at, from: 0, through: 0 },
  ]);
  expect(result.report.dependencies.verified).toBe(0);
});


test("recovering an oversized body preserves a child's correctly recorded bad-field refusal", async () => {
  const body = "x".repeat(41), w = aliasWorld(body, 32768), digest = valueDigest(DOMAINS.text, body);
  const small = variant(notesDefinition.declared, recoveredSmallChild);
  const senderDefinition = variant(notesDefinition.declared, recoveredSender(small.digest));
  const sender = created(senderDefinition, {}, "refusal-sender");
  expect(sender.act(keys.rita, "copy", { ...on(sender, 0), fields: { body: digest } }, { texts: () => body.length }).result).toBe("write");
  const asked = childCreation(sender, sender.last.seq), child = new Ledger(small);
  const refusal = judgeGenesis(child.state, small, asked.asked, { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, source: asked.source, facts: [], prepared: [], texts: () => body.length });
  if (refusal.result !== "write") throw new Error("the child must record its refusal");
  child.seal(refusal.draft);
  expect(child.last.input).toMatchObject({ type: "genesis", decision: "refused" });
  const targetDefinition = variant(notesDefinition.declared, recoveredRefusalTarget);
  const target = created(targetDefinition, {}, "refusal-target");
  for (const [kind, from, seq] of [["vouch-alias", w.alias, 2], ["vouch", child, 0]] as const) {
    const fact = from.fact(seq);
    expect(target.act(keys.rita, kind, { ...on(target, 0), fields: {} }, { presented: { proof: fact }, facts: [{ fact, entry: from.entries[seq]!.entry, under: from.definition.declared.name }] }).result).toBe("write");
  }
  const all = [w.original, w.alias, sender, child, target];
  const source = new MemorySource([...w.scopes, served(child, all), served(target, all)]);
  const fact = sender.fact(sender.last.seq);
  const result = await verify(source, { ...w.options, scope: target.at.scope, anchors: [{ scope: sender.at.scope, seq: fact.seq, hash: fact.hash }] });
  expect([result.report.result, result.why, result.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
  expect(result.report.anchors).toEqual([fact]);
});


test("recovering one body leaves another body's historical byte span incomplete", async () => {
  const w = aliasWorld("known through alias", 32768), missing = "still redacted";
  const note = w.original.did(keys.rita, "add-note").seq;
  expect(w.original.act(keys.rita, "write", { ...on(w.original, note), fields: { body: valueDigest(DOMAINS.text, missing) } }, { texts: () => null }).result).toBe("write");
  const written = w.original.last.seq, fact = w.original.fact(written);
  w.original.did(keys.rita, "strike", on(w.original, note));
  const platform = { named: NAMED, rules: {} };
  expect(w.alias.act(keys.rita, "vouch", { ...on(w.alias, 0), fields: {} }, { platform, presented: { proof: fact }, facts: [{ fact, entry: w.original.entries[written]!.entry, under: "notes" }] }).result).toBe("write");
  const all = [w.original, w.alias], original = served(w.original, all), alias = served(w.alias, all);
  alias.retained = [...alias.retained.filter(input => input.kind !== "definition"), ...w.scopes[1]!.retained.filter(input => input.kind === "value")];
  const result = await verify(new MemorySource([original, alias]), w.options);
  expect([result.report.result, result.why]).toEqual(["incomplete", "redacted size not retained"]);
  expect(result.report.incompleteBytes).toEqual([{ scope: w.original.at, from: written, through: written, reason: "redacted size not retained" }]);
  expect(result.report.redacted).toEqual([{ tombstone: w.original.fact(w.original.last.seq), item: note, slot: "body" }]);
});

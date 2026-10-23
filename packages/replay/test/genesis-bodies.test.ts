import { genesisQuietActs } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
import { replayGenesisAlias } from "../../derive/test/definition-corpus/replay-literals-data.ts";
import { expect, test } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS, type PlatformDefinition, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, utf8 } from "@generalbusiness/artroom-bytes";
import { clockOf, judgeGenesis, validateDefinition, valueDigest } from "@generalbusiness/dap-derive";
import { keys, Ledger, notesDefinition, on, T0, t, valid, variant } from "@generalbusiness/dap-derive/testing";
import { genesisBodyDefinition } from "../../derive/test/fixtures-genesis-bodies.ts";
import { MemorySource, hashOfBytes, verify } from "../src/index.ts";
import { served } from "./world.ts";

const NAMED = "platform:task@1" as PlatformDefinition;
function histories(whole: boolean, body: unknown = "é\n".repeat(500), failure: "count" | "size" | "forged-size" = "count", otherBody?: string) {
  // Keep the original declaration larger than the alias journal, so the
  // shared byte ceiling tests the original birth rather than its consumer.
  const base = variant(notesDefinition.declared, genesisQuietActs);
  const definition = genesisBodyDefinition(whole, base), original = new Ledger(definition), digest = valueDigest(DOMAINS.text, body);
  const other = otherBody === undefined ? undefined : valueDigest(DOMAINS.text, otherBody);
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: { a: digest, ...(other ? { b: other } : {}), count: failure === "count" ? 2 : 0 }, idempotencyKey: "refused-birth", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  const made = judgeGenesis(original.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(5)), seed, creation }, { clock: clockOf(original.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, texts: named => named === other && otherBody !== undefined ? utf8(otherBody).length : failure === "forged-size" ? 65 : typeof body === "string" ? utf8(body).length : null });
  if (made.result !== "write") throw new Error("the fixture's unrelated bad field must record a refused genesis");
  original.seal(made.draft);

  const data = replayGenesisAlias();
  const aliasDefinition = valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true })), alias = new Ledger(aliasDefinition), platform = { named: NAMED, rules: {} };
  const signed = signIntent({ ...creation.intent, fields: {}, idempotencyKey: "alias" }, keys.rita.secret);
  const aliasSeed: Seed = { ...seed, definition: NAMED, cause: intentDigest(signed.intent) };
  const genesis = judgeGenesis(alias.state, aliasDefinition, { name: scopeIdOf(aliasSeed), inc: newIncarnation(new Uint8Array(16).fill(6)), seed: aliasSeed, creation: signed }, { clock: clockOf(alias.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, platform });
  if (genesis.result !== "write") throw new Error("the fixture alias genesis must write");
  alias.seal(genesis.draft);
  expect(alias.act(keys.rita, "retain", { ...on(alias, 0), fields: { birth: original.fact(0), body: digest } }, { platform, facts: [{ fact: original.fact(0), entry: original.last, under: "notes" }], values: [canonicalize(body)] }).result).toBe("write");
  const all = [original, alias], a = served(original, all), b = served(alias, all);
  // The source deliberately omits the original payload. No claim is made
  // that a native refused scope deleted it without a redaction entry.
  b.retained = [...b.retained!.filter(retained => retained.digest !== aliasDefinition.digest), { kind: "value", domain: DOMAINS.text, digest, bytes: canonicalize(body) }];
  const bytes = utf8(canonicalize(definition.declared)).length + utf8(canonicalize(original.last)).length + utf8(canonicalize(body)).length + (otherBody !== undefined && other !== digest ? utf8(canonicalize(otherBody)).length : 0) + PROPOSED_BOUNDS.entryBytes;
  return { original, alias, a, b, bytes, digest, other, platform, options: { mode: "replay", scope: alias.at.scope, grants: "as-recorded", platform: () => ({ data, rules: {} }) } as const };
}

test("a size-only refused birth stays incomplete without its body and becomes consistent when a later alias supplies it", async () => {
  const w = histories(true, "x".repeat(80), "size");
  const missing = await verify(new MemorySource([w.a]), { ...w.options, scope: w.original.at.scope });
  expect(missing.report.result).toBe("incomplete");
  expect(missing.report.coverage).toEqual([{ scope: w.original.at, from: 0, through: 0 }]);
  expect(missing.report.incompleteBytes).toEqual([{ scope: w.original.at, from: 0, through: 0, reason: "retained text unavailable" }]);
  const complete = await verify(new MemorySource([w.a, w.b]), w.options);
  expect([complete.report.result, complete.why, complete.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
});

test("a recovered valid-size body disproves a fabricated refusal and retracts its consumer", async () => {
  // The fixture deliberately supplies an untrue historical size to make
  // a forged refusal. This is no claim of native admission of that input.
  const w = histories(true, "fits", "forged-size");
  const missing = await verify(new MemorySource([w.a]), { ...w.options, scope: w.original.at.scope });
  expect(missing.report.result).toBe("incomplete");
  expect(missing.report.coverage).toEqual([{ scope: w.original.at, from: 0, through: 0 }]);
  const recovered = await verify(new MemorySource([w.a, w.b]), w.options);
  expect([recovered.report.result, recovered.report.at?.at.scope, recovered.report.at?.seq, recovered.why]).toEqual(["mismatch", w.original.at.scope, 0, "a recovered text changes the recorded judgment"]);
  expect(recovered.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 0 }]);
});

test("an unknown size cannot explain arbitrary effects in a refused birth", async () => {
  const w = histories(true, "x".repeat(80), "size");
  const original = JSON.parse(w.a.entries[0]!.bytes);
  const bytes = canonicalize({ ...original, effects: [{ effect: "open", item: 0, type: "note", state: "kept" }] });
  const forged = { ...w.a, entries: [{ seq: 0, hash: hashOfBytes(bytes), bytes }] };
  const result = await verify(new MemorySource([forged]), { ...w.options, scope: w.original.at.scope });
  expect([result.report.result, result.report.at?.seq]).toEqual(["mismatch", 0]);
  expect(result.report.coverage).toEqual([]);
});

test("partial recovery rechecks the remaining unknown comparison before accepting or disproving a refused birth", async () => {
  const other = "x".repeat(80), w = histories(true, "small", "size", other);
  const partial = await verify(new MemorySource([w.a, w.b]), w.options);
  expect(partial.report.result).toBe("incomplete");
  expect(partial.report.coverage).toContainEqual({ scope: w.original.at, from: 0, through: 0 });
  expect(partial.report.incompleteBytes).toEqual([{ scope: w.original.at, from: 0, through: 0, reason: "retained text unavailable" }]);
  expect(w.alias.act(keys.rita, "retain", { ...on(w.alias, 0), fields: { birth: w.original.fact(0), body: w.other! } }, { platform: w.platform, facts: [{ fact: w.original.fact(0), entry: w.original.last, under: "notes" }], values: [canonicalize(other)] }).result).toBe("write");
  const alias = served(w.alias, [w.original, w.alias]);
  alias.retained = [...alias.retained!.filter(input => input.digest !== w.alias.definition.digest), ...w.b.retained!.filter(input => input.kind === "value"), { kind: "value", domain: DOMAINS.text, digest: w.other!, bytes: canonicalize(other) }];
  const complete = await verify(new MemorySource([w.a, alias]), w.options);
  expect([complete.report.result, complete.why, complete.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
});

test("a later string alias can recover an opt-in refused birth's bytes because birth policy establishes presence, while legacy presence stays unknown", async () => {
  // Real in-memory judgments/fold, fixture authority as recorded. The
  // refused genesis's unrelated bad field does not read its body's size.
  const w = histories(true), source = () => new MemorySource([w.a, w.b]);
  const exact = await verify(source(), { ...w.options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: w.bytes } });
  expect([exact.report.result, exact.why, exact.report.incompleteBytes]).toEqual(["consistent", null, undefined]);
  const over = await verify(source(), { ...w.options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: w.bytes - 1 } });
  expect([over.report.result, over.report.at?.at.scope, over.report.at?.seq, over.why]).toEqual(["mismatch", w.original.at.scope, 0, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);
  expect(over.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 0 }]);
  const missing = await verify(new MemorySource([w.a]), { mode: "replay", scope: w.original.at.scope, grants: "as-recorded" });
  expect(missing.report.result).toBe("incomplete");
  const old = histories(false);
  expect((await verify(new MemorySource([old.a, old.b]), old.options)).report.result).toBe("incomplete");
});

test("a recovered non-string under a typed genesis text digest disproves the recorded opt-in birth and its consumer", async () => {
  // Negative fixture: null deliberately stands for an unknown historical
  // size. A native body-presence check cannot admit this non-string.
  const w = histories(true, 17);
  const checked = await verify(new MemorySource([w.a, w.b]), w.options);
  expect([checked.report.result, checked.report.at?.at.scope, checked.report.at?.seq]).toEqual(["mismatch", w.original.at.scope, 0]);
  expect(checked.report.coverage).toEqual([{ scope: w.alias.at, from: 0, through: 0 }]);
});

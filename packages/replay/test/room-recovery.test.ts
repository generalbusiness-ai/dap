import { expect, test } from "vitest";
import { DOMAINS, PROPOSED_BOUNDS, type Digest, type PlatformDefinition, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, judgeGenesis, validateDefinition, valueDigest } from "@generalbusiness/dap-derive";
import { Ledger, T0, created, keys, notesDefinition, on, t, valid, variant } from "@generalbusiness/dap-derive/testing";
import { capacityLargeTextAgain, recoveredChild, recoveredText } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
import { replayRecoveredAlias } from "../../derive/test/definition-corpus/replay-literals-data.ts";
import { MemorySource, roomVerification, TRUSTS, type HistorySource } from "../src/index.ts";
import { served } from "./world.ts";

// Scripted in-memory judges, folds and histories, with fixture grants taken
// as recorded. These cases claim no runtime admission or native authority.
const NAMED = "platform:task@1" as PlatformDefinition;

function vouch(receiver: Ledger, source: Ledger, seq: number) {
  const fact = source.fact(seq);
  expect(receiver.act(keys.rita, "vouch", { ...on(receiver, 0), fields: {} }, {
    presented: { proof: fact },
    facts: [{ fact, entry: source.entries[seq]!.entry, under: source.definition.declared.name }],
  }).result).toBe("write");
}

function contradiction(label: string, body: string) {
  const original = created(variant(notesDefinition.declared, recoveredText(40)), {}, `${label}-original`);
  const digest = valueDigest(DOMAINS.text, body), bytes = canonicalize(body);
  // Null deliberately scripts a historical judgment made without its body.
  expect(original.act(keys.rita, "write", { ...on(original, 0), fields: { body: digest } }, { texts: () => null }).result).toBe("write");
  const consumer = created(variant(notesDefinition.declared, recoveredChild), {}, `${label}-consumer`);
  vouch(consumer, original, 1);

  const data = replayRecoveredAlias(), definition = valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true }));
  const alias = new Ledger(definition), platform = { named: NAMED, rules: {} };
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: `${label}-alias`, notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: NAMED, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  const genesis = judgeGenesis(alias.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(2)), seed, creation }, {
    clock: clockOf(alias.state, T0), bounds: PROPOSED_BOUNDS, source: null, facts: [], prepared: [], platform,
  });
  if (genesis.result !== "write") throw new Error(`the alias fixture must create: ${JSON.stringify(genesis)}`);
  alias.seal(genesis.draft);
  const fact = original.fact(1);
  expect(alias.act(keys.rita, "vouch", { ...on(alias, 0), fields: {} }, {
    platform, presented: { proof: fact }, facts: [{ fact, entry: original.entries[1]!.entry, under: "notes" }],
  }).result).toBe("write");
  expect(alias.act(keys.rita, "retain", { ...on(alias, 0), fields: { proof: digest } }, { platform, values: [bytes] }).result).toBe("write");
  const all = [original, consumer, alias], retainedAlias = served(alias, all);
  retainedAlias.retained = [...retainedAlias.retained.filter(input => input.kind !== "definition"), { kind: "value", domain: DOMAINS.text, digest, bytes }];
  return { original, consumer, alias, data, scopes: [served(original, all), served(consumer, all), retainedAlias] };
}

test("room finalization retracts both independent roots contradicted by later recovered bodies", async () => {
  const a = contradiction("first", "x".repeat(41)), b = contradiction("second", "y".repeat(42));
  const room = roomVerification(new MemorySource([...a.scopes, ...b.scopes]), {
    mode: "replay", grants: "as-recorded", platform: name => name === NAMED ? { data: a.data, rules: {} } : null,
  });
  try {
    for (const scope of [a.consumer, b.consumer, a.alias, b.alias]) await room.checkTarget({ scope: scope.at.scope });
    const finished = await room.finish();
    expect(finished.roots.map(root => [root.requested, root.result])).toEqual([
      [a.consumer.at.scope, "mismatch"], [b.consumer.at.scope, "mismatch"],
      [a.alias.at.scope, "mismatch"], [b.alias.at.scope, "mismatch"],
    ]);
    for (const scope of [a.original, b.original, a.consumer, b.consumer, a.alias, b.alias]) {
      expect(finished.coverage.filter(span => span.scope.scope === scope.at.scope).map(span => [span.from, span.through])).toEqual([[0, 0]]);
    }
    expect(finished.dependencies.verified).toBe(0);
  } finally { room.close(); }
});

test("room settlement extends an already-open owing dependency before declaring another root's text missing", async () => {
  const body = "recovered through the other dependency", other = "its own later recovered body";
  const x = textDigest(body), y = textDigest(other);
  const definition = variant(notesDefinition.declared, data => {
    recoveredText(1000)(data);
    data.acts.retain = structuredClone(replayRecoveredAlias().acts["retain"]!);
  });
  const a = created(definition, {}, "owed-a"), b = created(definition, {}, "owing-supplier-b");
  expect(a.act(keys.rita, "write", { ...on(a, 0), fields: { body: x } }, { texts: () => null }).result).toBe("write");
  expect(b.act(keys.rita, "write", { ...on(b, 0), fields: { body: y } }, { texts: () => null }).result).toBe("write");
  for (const [digest, value] of [[x, body], [y, other]] as const) {
    expect(b.act(keys.rita, "retain", { ...on(b, 0), fields: { proof: digest } }, { values: [canonicalize(value)] }).result).toBe("write");
  }
  const consumer = created(variant(notesDefinition.declared, recoveredChild), {}, "owing-consumer");
  vouch(consumer, a, 1);
  vouch(consumer, b, 1);
  const independent = created(notesDefinition, {}, "unrelated-root"), all = [a, b, consumer, independent];
  const supplier = served(b, all);
  for (const [digest, value] of [[x, body], [y, other]] as const) {
    supplier.retained.push({ kind: "value", domain: DOMAINS.text, digest, bytes: canonicalize(value) });
  }
  const memory = new MemorySource([served(a, all), supplier, served(consumer, all), served(independent, all)], 1);
  const contentReads: Digest[] = [];
  const source: HistorySource = {
    page: (...args) => memory.page(...args),
    retained: (...args) => {
      if (args[0] === b.at.scope && args[1] === "value") contentReads.push(args[2]);
      return memory.retained(...args);
    },
  };
  const room = roomVerification(source, { mode: "replay", grants: "as-recorded" });
  try {
    await room.checkTarget({ scope: consumer.at.scope });
    await room.checkTarget({ scope: independent.at.scope });
    expect(contentReads).toEqual([]);
    const finished = await room.finish();
    expect(finished.roots.map(root => [root.requested, root.result])).toEqual([
      [consumer.at.scope, "consistent"], [independent.at.scope, "consistent"],
    ]);
    expect(contentReads).toEqual([x, y]);
    expect(Math.max(...finished.coverage.filter(span => span.scope.scope === b.at.scope).map(span => span.through))).toBe(3);
    expect(finished.incompleteBytes).toBeUndefined();
    expect(finished.trusts).not.toContain(TRUSTS.redacted);
  } finally { room.close(); }
});

test("a post-fold capacity failure cannot poison a repeated root or a later use of its checked prefix", async () => {
  const history = created(variant(notesDefinition.declared, capacityLargeTextAgain), {}, "post-fold-overflow");
  const body = "retained before overflow", digest = textDigest(body);
  expect(history.act(keys.rita, "write", { ...on(history, 0), fields: { body: digest } }, { texts: () => utf8(body).length }).result).toBe("write");
  history.did(keys.rita, "add-note");
  const consumer = created(variant(notesDefinition.declared, recoveredChild), {}, "safe-prefix-consumer");
  vouch(consumer, history, 1);
  const all = [history, consumer], overflowing = served(history, all);
  overflowing.retained.push({ kind: "text", digest, bytes: canonicalize(body) });
  const room = roomVerification(new MemorySource([overflowing, served(consumer, all)]), {
    mode: "replay", grants: "as-recorded", bounds: { ...PROPOSED_BOUNDS, scopeItems: 1 },
  });
  try {
    await room.checkTarget({ scope: history.at.scope });
    await room.checkTarget({ scope: history.at.scope });
    await room.checkTarget({ scope: consumer.at.scope });
    const finished = await room.finish();
    expect(finished.roots.map(root => root.result)).toEqual(["mismatch", "mismatch", "consistent"]);
    for (const root of finished.roots.slice(0, 2)) {
      expect(root.why).toBe("the entry exceeds scopeItems: Used plus Reserved is over its ceiling");
      expect("at" in root && root.at).toEqual(history.fact(2));
    }
    expect(finished.coverage.filter(span => span.scope.scope === history.at.scope).map(span => span.through)).toEqual([1]);
  } finally { room.close(); }
});

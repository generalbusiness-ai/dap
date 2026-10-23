import { replayChildAlias } from "../../derive/test/definition-corpus/replay-literals-data.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import { created, keys, Ledger, on, T0, t, valid } from "@generalbusiness/dap-derive/testing";
import { childDefinitions } from "../../derive/test/fixtures-child-definitions.ts";
import { MemorySource, verify } from "../src/index.ts";
import { served } from "./world.ts";

test("opt-in replay counts the complete shared child closure at genesis, while legacy replay does not infer optional birth retention", async () => {
  // Actual in-memory judged genesis; fixture authority is trusted as
  // recorded. The retained source is explicit, not native storage proof.
  const { root, branch, leaf } = childDefinitions(), history = created(root, {});
  const declarations = [root, branch, leaf].map(definition => ({ kind: "definition" as const, digest: definition.digest, bytes: canonicalize(definition.declared) }));
  const live = { ...served(history, [history]), retained: declarations };
  const bytes = declarations.reduce((sum, declaration) => sum + utf8(declaration.bytes).length, 0) + utf8(canonicalize(history.last)).length + PROPOSED_BOUNDS.entryBytes;
  const options = { mode: "replay", scope: history.at.scope, grants: "as-recorded", bounds: { ...PROPOSED_BOUNDS, scopeBytes: bytes, namedDefinitions: 2 } } as const;
  const exact = await verify(new MemorySource([live]), options);
  expect([exact.report.result, exact.why]).toEqual(["consistent", null]);
  const over = await verify(new MemorySource([live]), { ...options, bounds: { ...options.bounds, scopeBytes: bytes - 1 } });
  expect([over.report.result, over.report.at?.seq, over.why]).toEqual(["mismatch", 0, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);
  const absent = await verify(new MemorySource([{ ...live, retained: declarations.filter(declared => declared.digest !== leaf.digest) }]), options);
  expect([absent.report.result, absent.report.at?.seq]).toEqual(["incomplete", 0]);
  expect(absent.why).toContain(leaf.digest);
  const old = created(childDefinitions(false).root, {});
  expect((await verify(new MemorySource([served(old, [old])]), { ...options, scope: old.at.scope })).report.result).toBe("consistent");
});

test("a later definition-domain value is charged at its actual entry and an alias of a birth child is not charged twice", async () => {
  const { root, branch, leaf, extra } = childDefinitions();
  const data = replayChildAlias(root.declared);
  const definition = valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true }));
  const history = new Ledger(definition), platform = { named: "platform:task@1" as const, rules: {} };
  const signed = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: {}, idempotencyKey: "definition-values", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: platform.named, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const genesis = judgeGenesis(history.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(3)), seed, creation: signed }, { clock: clockOf(history.state, T0), bounds: PROPOSED_BOUNDS, source: null, facts: [], prepared: [], platform });
  if (genesis.result !== "write") throw new Error("the made-up platform genesis must write");
  history.seal(genesis.draft);
  for (const declaration of [extra, leaf]) expect(history.act(keys.rita, "retain", { ...on(history, 0), fields: { declaration: declaration.digest } }, { platform, values: [canonicalize(declaration.declared)] }).result).toBe("write");
  const retained = [branch, leaf, extra].map(declaration => ({ kind: "definition" as const, digest: declaration.digest, bytes: canonicalize(declaration.declared) }));
  const source = () => new MemorySource([{ ...served(history, [history]), retained }]);
  const journal = history.entries.map(({ entry }) => utf8(canonicalize(entry)).length);
  const birth = journal[0]! + retained.slice(0, 2).reduce((sum, declaration) => sum + utf8(declaration.bytes).length, 0) + PROPOSED_BOUNDS.entryBytes;
  const options = { mode: "replay", scope: history.at.scope, grants: "as-recorded", platform: () => ({ data, rules: {} }) } as const;
  const later = await verify(source(), { ...options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: birth } });
  expect([later.report.result, later.report.at?.seq, later.why]).toEqual(["mismatch", 1, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);
  const exact = birth + journal[1]! + journal[2]! + utf8(retained[2]!.bytes).length;
  const equal = await verify(source(), { ...options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: exact } });
  expect([equal.report.result, equal.why]).toEqual(["consistent", null]);
  const over = await verify(source(), { ...options, bounds: { ...PROPOSED_BOUNDS, scopeBytes: exact - 1 } });
  expect([over.report.result, over.report.at?.seq]).toEqual(["mismatch", 2]);
});

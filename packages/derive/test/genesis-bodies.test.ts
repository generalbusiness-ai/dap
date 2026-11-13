import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Intent, type Seed } from "@generalbusiness/dap-contract";
import { genesisInputDigest, intentDigest, newGenesisNonce, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, entryOf, judgeGenesis, judgeGenesisForReplay, validateDefinition } from "../src/index.ts";
import { Ledger, T0, created, creation, keys, t, valid, genesisBodyDefinition, genesisOnly } from "./fixtures-entry.ts";

test("opt-in signed genesis requires every named body before recording even a refused birth, while legacy and repeat judgments keep their paths", () => {
  const body = "é\n", other = "other", digest = textDigest(body), second = textDigest(other);
  const run = (whole: boolean, fields: Intent["fields"]) => {
    const definition = genesisBodyDefinition(whole), history = new Ledger(definition);
    const signed = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields, idempotencyKey: "genesis-bodies", notAfter: t(60) }, keys.rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
    const asked = { name: scopeIdOf(seed), nonce: newGenesisNonce(new Uint8Array(16).fill(4)), seed, creation: signed };
    const judge = (texts?: (digest: string) => number | null | undefined) => judgeGenesis(history.state, definition, asked, { clock: clockOf(history.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, ...(texts ? { texts } : {}) });
    return { history, judge };
  };
  const missing = run(true, { a: digest, b: second, count: 2 });
  expect(missing.judge()).toMatchObject({ result: "refused", reason: "bad-field" });
  expect(missing.judge(named => named === digest ? utf8(body).length : undefined)).toMatchObject({ result: "refused", reason: "bad-field" });
  const refused = missing.judge(named => named === digest ? utf8(body).length : utf8(other).length);
  expect(refused).toMatchObject({ result: "write", draft: { input: { decision: "refused", source: null, sourceKind: null } } });
  if (refused.result === "write") missing.history.seal(refused.draft);
  expect(missing.judge()).toEqual({ result: "repeat", seq: 0 });
  expect(run(false, { a: digest, count: 2 }).judge()).toMatchObject({ result: "write", draft: { input: { decision: "refused" } } });
  expect(run(true, { a: textDigest("") }).judge(() => 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(run(true, { a: "not-a-digest", count: 2 }).judge()).toMatchObject({ result: "write", draft: { input: { decision: "refused" } } });

  // Real pure judges and the fixture Ledger establish this causal birth.
  // Its declared rules are TEST data, not a Native identity or authority proof.
  const childDefinition = genesisBodyDefinition(false), parentData = structuredClone(childDefinition.declared);
  parentData.name = "recorded-kind-parent";
  parentData.acts[parentData.genesis]!.sends = [{ create: { kind: "lane", definition: childDefinition.digest, fields: {}, result: {} } }];
  const parent = created(valid(validateDefinition(parentData, PROPOSED_BOUNDS)), {}, "recorded-kind-parent");
  const { asked, source } = creation(parent, 0), child = new Ledger(childDefinition);
  if (parent.last.input.type !== "genesis") throw Error("the parent must hold its actual genesis");
  expect(asked.to.cause).toBe(genesisInputDigest(parent.last.input));
  expect(parent.last.input.sourceKind).toBeNull();
  const context = { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source };
  const born = judgeGenesis(child.state, child.definition, asked, context);
  expect(born).toMatchObject({ result: "write", draft: { input: { sourceKind: "directory", decision: "applied" }, uses: [{ fact: asked.from, kind: "directory" }] } });
  if (born.result !== "write") throw Error("the declared child must be judged from its genuine source");
  const recorded = entryOf(child.state, born.draft, context.clock);
  if (recorded.input.type !== "genesis" || recorded.input.source === null) throw Error("the child must record its source");
  expect(judgeGenesisForReplay(child.state, child.definition, asked, context, { recorded, facts: [], source: null })).toMatchObject({ result: "write" });
  const different = { ...genesisOnly(recorded), input: { ...recorded.input, sourceKind: "membership" as const }, uses: recorded.uses.map(use => ({ ...use, kind: "membership" as const })) };
  // F1: the source is genuine and is deliberately absent from context.facts.
  expect(() => judgeGenesisForReplay(child.state, child.definition, asked, context, { recorded: different, facts: [], source: null })).toThrow("separately verified source genesis");
});

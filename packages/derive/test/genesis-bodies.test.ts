import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Intent, type Seed } from "@generalbusiness/dap-contract";
import { intentDigest, newIncarnation, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, judgeGenesis } from "../src/index.ts";
import { Ledger, T0, keys, t, genesisBodyDefinition } from "./fixtures-entry.ts";

test("opt-in signed genesis requires every named body before recording even a refused birth, while legacy and repeat judgments keep their paths", () => {
  const body = "é\n", other = "other", digest = textDigest(body), second = textDigest(other);
  const run = (whole: boolean, fields: Intent["fields"]) => {
    const definition = genesisBodyDefinition(whole), history = new Ledger(definition);
    const signed = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields, idempotencyKey: "genesis-bodies", notAfter: t(60) }, keys.rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
    const asked = { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(4)), seed, creation: signed };
    const judge = (texts?: (digest: string) => number | null | undefined) => judgeGenesis(history.state, definition, asked, { clock: clockOf(history.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null, ...(texts ? { texts } : {}) });
    return { history, judge };
  };
  const missing = run(true, { a: digest, b: second, count: 2 });
  expect(missing.judge()).toMatchObject({ result: "refused", reason: "bad-field" });
  expect(missing.judge(named => named === digest ? utf8(body).length : undefined)).toMatchObject({ result: "refused", reason: "bad-field" });
  const refused = missing.judge(named => named === digest ? utf8(body).length : utf8(other).length);
  expect(refused).toMatchObject({ result: "write", draft: { input: { decision: "refused" } } });
  if (refused.result === "write") missing.history.seal(refused.draft);
  expect(missing.judge()).toEqual({ result: "repeat", seq: 0 });
  expect(run(false, { a: digest, count: 2 }).judge()).toMatchObject({ result: "write", draft: { input: { decision: "refused" } } });
  expect(run(true, { a: textDigest("") }).judge(() => 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(run(true, { a: "not-a-digest", count: 2 }).judge()).toMatchObject({ result: "write", draft: { input: { decision: "refused" } } });
});

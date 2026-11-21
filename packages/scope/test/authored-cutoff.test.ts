import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef } from "@generalbusiness/dap-contract";
import { definitionDigest, entryHash } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { created, keys, valid } from "@generalbusiness/dap-derive/testing";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { authoredCutoff } from "../src/authored-cutoff.ts";

// The derive ledger is a stand-in for native storage, but judges and seals
// the originating act before the recognizer inspects it.
function fixture() {
  const data = liveBase(false);
  data.items["request"] = { many: true, max: 4, initial: "waiting", states: { waiting: { final: false }, expired: { final: true } }, parties: {},
    refs: { target: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } },
    values: { deadline: { fixed: true, required: true, of: { type: "time" } } } };
  data.acts["ask"] = { step: "open", on: "request", grant: "ask", also: {},
    fields: { target: { type: "scope", kind: "lane", required: true }, deadline: { type: "time", required: true } },
    guards: [], effects: [{ ref: { slot: "target", from: { field: "target" } } }, { value: { slot: "deadline", from: { field: "deadline" } } }],
    sends: [{ tell: { to: { slot: "target" }, message: "count", fields: {}, result: {} } }], attention: [] };
  data.timed["expire"] = { on: "request", states: ["waiting"], deadline: "deadline", effects: [{ state: "expired" }], attention: [] };
  const definition = valid(validateDefinition(data, PROPOSED_BOUNDS)), ledger = created(definition, {}), target = created().at;
  const due = "2026-10-04T12:05:00Z", entry = ledger.did(keys.rita, "ask", { fields: { target, deadline: due } });
  return { definition, entry, fact: ledger.fact(entry.seq), target, due };
}

const factFor = (entry: Entry, fact: FactRef): FactRef => ({ ...fact, hash: entryHash(entry) });

test("one accepted opening binds its named timed rule and exact request", () => {
  const { definition, entry, fact, target, due } = fixture();
  expect(authoredCutoff(definition, entry, fact, 0)).toEqual({ of: fact, item: entry.seq, rule: "expire", due, target, n: 0 });
  expect(authoredCutoff(definition, entry, fact, 1)).toBeNull();
  expect(authoredCutoff(definition, entry, { ...fact, seq: fact.seq + 1 }, 0)).toBeNull();
  expect(authoredCutoff(definition, entry, { ...fact, hash: `sha256:${"a".repeat(64)}` }, 0)).toBeNull();
});

test("changed sends and accepted effects never acquire a cutoff", () => {
  const { definition, entry, fact } = fixture();
  for (const change of [
    (e: Entry) => { e.sends[0]!.n = 1; },
    (e: Entry) => { e.sends[0]!.message = { class: "request", type: "tell", body: { message: "other", fields: {} } }; },
    (e: Entry) => { e.effects = e.effects.filter(effect => effect.effect !== "ref"); },
    (e: Entry) => { e.effects = e.effects.filter(effect => effect.effect !== "value"); },
    (e: Entry) => { e.effects = [...e.effects, { effect: "state", item: e.seq, state: "expired" }]; },
  ]) {
    const altered = structuredClone(entry); change(altered);
    expect(authoredCutoff(definition, altered, factFor(altered, fact), 0)).toBeNull();
  }
});

test("ambiguous or conditional authored forms are refused", () => {
  const { definition, entry, fact } = fixture();
  for (const change of [
    (d: typeof definition.declared) => { const a = d.acts["ask"]!; a.sends = [...a.sends, a.sends[0]!]; },
    (d: typeof definition.declared) => { const a = d.acts["ask"]!; a.effects = [...a.effects, a.effects[0]!]; },
    (d: typeof definition.declared) => { d.timed["other"] = { ...d.timed["expire"]! }; },
    (d: typeof definition.declared) => { const a = d.acts["ask"]!; a.effects = a.effects.map((e, i) => i === 0 ? { ...e, if: [] } : e); },
    (d: typeof definition.declared) => { d.items["request"]!.values["deadline"]!.fixed = false; },
  ]) {
    const declared = structuredClone(definition.declared); change(declared);
    expect(authoredCutoff({ ...definition, declared, digest: definitionDigest(declared) }, entry, fact, 0)).toBeNull();
  }
});

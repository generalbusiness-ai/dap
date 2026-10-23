import { operandParts, operandProbeData, namedOperandData, elsewhereOperandData, deliveryOperandChange, deliveryOperandData } from "./definition-corpus/forms-operand-variants.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, FactRef, FieldValue, Guard, Operand } from "@generalbusiness/dap-contract";
import { intentDigest } from "@generalbusiness/artroom-bytes";
import { validateDefinition, type Fetched, type ProblemCode } from "../src/index.ts";
import { Scope, deliver, fields, keys, on, ticket, valid, variant } from "./fixtures-entry.ts";

const { rita, una } = keys;

/**
 * A lane of asks, made up for these tests. An ask keeps `termsAt`: the entry
 * that last stated its text, set from `self`. `accept` names that entry as a
 * fact. A block waits on an ask of another lane, and is released by an
 * answer to that same ask.
 */
import { asks } from "./definition-corpus/forms-operand-data.ts";

const asksDefinition = valid(validateDefinition(asks, PROPOSED_BOUNDS));

/** An entry of `s` as another scope fetches it: by fact, with its bytes and the name its scope's definition states. */
const fetched = (s: Scope, seq: number): Fetched => ({ fact: s.fact(seq), entry: s.entries[seq]!.entry, under: s.under });

/** M, another lane of asks: M.2 and M.3 open asks 2 and 3, and M.4 and M.5 answer them. */
function other(): Scope {
  const M = new Scope(asksDefinition, rita.member, true, 1);
  M.did(una, "ask", fields({ text: "why" }));
  M.did(una, "ask", fields({ text: "when" }));
  M.did(rita, "answer", on(M, 2));
  M.did(rita, "answer", on(M, 3));
  return M;
}
/** L opens a block on an ask of M, which it fetched. Returns the block's ID, which is the position of its entry. */
function blockOn(L: Scope, M: Scope, ask = 2): number {
  expect(L.act(rita, "block", fields({ on: M.fact(ask) }), { facts: [fetched(M, ask)] }).result).toBe("write");
  return L.last.seq;
}

describe("operands, parts and a local fact (sections 6.2 and 6.5; witness 18.1)", () => {
  test("a block is released only by an answer to the ask it waits on, read from the fetched entry; a refusal carries the name its guard declares", () => {
    const M = other();
    const L = new Scope(asksDefinition);
    const block = blockOn(L, M);
    const release = (answer: number, facts = [fetched(M, answer)]) => L.act(rita, "release-block", { ...on(L, block), ...fields({ answer: M.fact(answer) }) }, { facts });

    // M.5 answers ask 3. Its `on` is 3, and the block waits on the entry at position 2.
    expect(release(5)).toMatchObject({ result: "refused", reason: "guard-failed", name: "not-this-ask", detail: "guards.3" });
    // M.2 is an `ask`, which is not a kind the field states: the `fact` guard fails, and it declares no name.
    const asked = L.act(rita, "release-block", { ...on(L, block), ...fields({ answer: M.fact(2) }) }, { facts: [fetched(M, 2)] });
    expect([asked.result, "name" in asked]).toEqual(["refused", false]);
    // M.4 answers ask 2: its scope is M and its `on` is 2. Only the entry that was read is in `uses`. The slot's fact was compared and not read.
    expect(release(4).result).toBe("write");
    expect([L.last.uses.map((u) => u.fact), L.item(block).state]).toEqual([[M.fact(4)], "released"]);
    expect(L.replay().snapshot()).toBe(L.state.snapshot());
  });

  test("a fact that names this scope's own entry is checked against its history, is not fetched, and equals the slot that entry set from `self`; another hash is `fact-mismatch`", () => {
    const L = new Scope(asksDefinition);
    const first = L.did(una, "ask", fields({ text: "why" }));
    const ask = first.seq;
    // The slot holds a local entry reference: the position of the entry that set it.
    expect([first.effects.at(-1), L.item(ask).refs["termsAt"]]).toEqual([{ effect: "ref", item: ask, slot: "termsAt", to: ask }, ask]);
    const accept = (terms: FactRef) => L.act(rita, "accept", { ...on(L, ask), ...fields({ terms }) }, { facts: [] });

    // A fact with that position and another hash is not this scope's entry.
    expect(accept({ ...L.fact(ask), hash: L.fact(0).hash })).toMatchObject({ result: "refused", reason: "fact-mismatch" });
    expect(accept({ ...L.fact(ask), seq: L.head.seq + 1 })).toMatchObject({ result: "refused", reason: "fact-mismatch" });
    // Without its own history the scope cannot check the fact, so the act is not judged.
    expect(L.act(rita, "accept", { ...on(L, ask), ...fields({ terms: L.fact(ask) }) }, { own: undefined }).result).toBe("unavailable");

    // After a revision the slot names the revising entry. The earlier entry is still this scope's, and is no longer the terms.
    const revised = L.did(una, "revise", { ...on(L, ask), ...fields({ text: "why not" }) }).seq;
    expect(accept(L.fact(ask))).toMatchObject({ result: "refused", reason: "guard-failed", name: "terms-differ" });
    // The entry that states the terms is accepted. Nothing was fetched, and nothing is in `uses`.
    expect(accept(L.fact(revised)).result).toBe("write");
    expect([L.last.uses, L.item(ask).state]).toEqual([[], "accepted"]);
    expect(L.replay().snapshot()).toBe(L.state.snapshot());
  });

  test("each part reads what its entry holds: a fetched entry's bytes, this scope's own history, and none where the entry has no such part", () => {
    const M = other();
    const asked = M.entries[2]!.entry;
    const intent = asked.input.type === "act" ? intentDigest(asked.input.signed.intent) : null;
    const parts = operandParts(M, intent, una.member);
    const probing = valid(validateDefinition(operandProbeData(parts), PROPOSED_BOUNDS));
    const L = new Scope(probing);
    const ask = L.did(una, "ask", fields({ text: "why" })).seq;   // L.2
    expect(M.act(rita, "block", fields({ on: L.fact(ask) }), { facts: [fetched(L, ask)] }).result).toBe("write");   // M.6
    const block = blockOn(L, M, 3);
    const probe = L.act(rita, "probe", { ...on(L, block, { mine: ask }), ...fields({ proof: M.fact(2), second: M.fact(6), origin: M.fact(0), mine: ask }) }, { facts: [fetched(M, 2), fetched(M, 6), fetched(M, 0)] });
    // A guard that fails names the part it read.
    expect("name" in probe ? probe.name : probe.result).toBe("write");

    // Every guard but the last holds: the entry's intent is not the intent being judged.
    expect(L.act(una, "own", { ...on(L, ask), ...fields({ terms: L.fact(ask) }) })).toMatchObject({ result: "refused", reason: "guard-failed", name: "another intent", detail: "guards.5" });
  });

  test("witness 18.26: the kind of a genesis entry is read from the entry. A lane under another definition accepts a fact that names it when the type's kinds include that kind and its `under` is the name the source answered; it refuses when the kinds omit it, and when the name differs although the kind passes", () => {
    const M = other();
    const trace = (L: Scope, origin: Scope) => {
      const ask = L.did(una, "ask", fields({ text: "why" })).seq;
      return L.act(una, "trace", { ...on(L, ask), ...fields({ origin: origin.fact(0) }) }, { facts: origin === L ? [] : [fetched(origin, 0)] });
    };
    // This scope's own genesis, and the genesis of another lane under the same definition.
    const L = new Scope(asksDefinition);
    expect([trace(L, L).result, trace(L, M).result]).toEqual(["write", "write"]);
    // P pins another definition, with another name and another genesis act. It holds no bytes of M's definition: the kind `start` is in M.0.
    // A definition with another name: the slot that an ask sets from `self` holds a fact under its own definition.
    const named = (name: string, change: (d: any) => void = () => {}) => valid(validateDefinition(namedOperandData(name, change), PROPOSED_BOUNDS));
    const elsewhere = (change: (d: any) => void = () => {}) => valid(validateDefinition(elsewhereOperandData(change), PROPOSED_BOUNDS));
    const P = new Scope(elsewhere());
    expect([(M.entries[0]!.entry.input as { kind?: string }).kind, trace(P, M).result, P.last.uses]).toEqual(["start", "write", [{ fact: M.fact(0), content: expect.any(String) }]]);
    // Q differs from P in one thing: the kinds of the field omit that genesis act.
    const Q = new Scope(elsewhere((d) => { d.acts.trace.fields.origin.kind = ["ask"]; }));
    expect(trace(Q, M)).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.0" });
    // A lane whose definition has another name and the same genesis act: the kind passes, and the name does not. A kind does not excuse a name.
    const O = new Scope(named("other"));
    expect([(O.entries[0]!.entry.input as { kind?: string }).kind, trace(P, O)]).toEqual(["start", expect.objectContaining({ result: "refused", reason: "guard-failed", detail: "guards.0" })]);
  });

  test("a handler reads its sender, the source entry and the update; a refused delivery records the name its guard declares, and the result carries it; the delivery's kind is its message's name; a field of a foreign delivery is read as its bytes hold it, whatever handler its reader declares", () => {
    const change = deliveryOperandChange;
    const definition = variant(ticket, change);
    const P = new Scope(definition);
    const I = new Scope(definition, rita.member, true, 1);
    // P.2 opens link 2 and sends its update, `set`. The source entry is that `link` act, and the owner's item is the entry itself.
    expect(P.act(rita, "link", fields({ target: I.at, about: 0, because: P.fact(0) }), { presented: { shown: P.fact(0) } }).result).toBe("write");
    // Section 6.4: a local entry reference is not sent as a position. The entry being written is sent as the `self` mark, which the
    // receiver reads as the envelope's source, and an earlier entry as its fact reference: one that a field names, and one that is presented.
    expect(P.last.sends[0]!.message).toMatchObject({ body: { detail: { madeAt: { self: true }, because: P.fact(0), shown: P.fact(0) } } });
    expect(deliver(I, P, 2)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
    const applied = I.head.seq;
    // P.3 removes the link. The handler's first guard fails, so the deciding entry is `refused`, with the code and the guard's name, and so is its result.
    P.did(rita, "unlink", on(P, 2));
    deliver(I, P, 3);
    const reason = { code: "guard-failed", name: "not-set" };
    expect(I.last).toMatchObject({ input: { decision: "refused", reason }, effects: [], sends: [{ message: { class: "result", outcome: "refused", reason } }] });
    // The sender records that result as it came.
    deliver(P, I, I.head.seq);
    expect(P.last.input).toMatchObject({ clause: "refused", message: { reason } });

    // The entry that recorded the first update is a delivery of the request `closes`: that is its kind, for a fact of this scope's own.
    const cite = (seq: number) => I.act(rita, "cite", { ...on(I, 0), ...fields({ closed: I.fact(seq) }) }).result;
    expect([cite(applied), cite(0)]).toEqual(["write", "refused"]);

    // A field of this scope's own delivery is read by the types of the handler that received it: I's `madeAt` is a fact, so the mark is P.2.
    const cited = (closed: Fetched | FactRef, given: Record<string, FieldValue>, link = 2) => {
      const judgment = I.act(rita, "cite", { ...on(I, 0), ...fields({ closed: "fact" in closed ? closed.fact : closed, ...given }) }, { facts: ["fact" in closed ? [closed] : [], "by" in given ? [fetched(P, link)] : []].flat() });
      return "name" in judgment ? judgment.name : judgment.result;
    };
    expect([cited(I.fact(applied), { by: P.fact(2) }), cited(I.fact(applied), { flag: { self: true } })]).toEqual(["write", "flag"]);
    // J is a lane under a definition of the same name, whose `closes` takes `madeAt` as a record with a boolean member `self`. P.5 sends
    // it the same bytes, and J admits a record. I reads J's entry, and declares a handler of that name whose `madeAt` is a fact. That
    // handler says nothing of J's entry: the field is the record that the bytes hold, and it equals no reference to P.5.
    const J = new Scope(valid(validateDefinition(deliveryOperandData("record"), PROPOSED_BOUNDS)), rita.member, true, 2);
    const link = P.did(rita, "link", fields({ target: J.at, about: 0, because: P.fact(0) })).seq;
    expect([deliver(J, P, link).result, J.last.input]).toMatchObject(["write", { decision: "applied", message: { body: { detail: { madeAt: { self: true } } } } }]);
    expect([cited(fetched(J, J.head.seq), { by: P.fact(link) }, link), cited(fetched(J, J.head.seq), { flag: { self: true } })]).toEqual(["by", "write"]);
    // K's handler is for a sender under another definition, so K decides the same update `unknown-message`. No handler of K received
    // the field, and the handler of that name does not read it afterwards: in K's own entry it is the record too.
    const K = new Scope(valid(validateDefinition(deliveryOperandData("foreign"), PROPOSED_BOUNDS)), rita.member, true, 3);
    const unread = P.did(rita, "link", fields({ target: K.at, about: 0, because: P.fact(0) })).seq;
    deliver(K, P, unread);
    expect([K.last.input, K.act(rita, "peek", { ...on(K, 0), ...fields({ closed: K.fact(K.head.seq), by: P.fact(unread) }) }, { facts: [fetched(P, unread)] })]).toMatchObject([{ decision: "refused", reason: { code: "unknown-message" } }, { result: "refused", name: "peek" }]);
  });

  test("an operand names only what its place has, and a part only what an entry can hold", () => {
    const refusal = (base: DeclaredDefinition, change: (d: any) => void) => {   // eslint-disable-line @typescript-eslint/no-explicit-any
      const d = structuredClone(base);
      change(d);
      const result = validateDefinition(d, PROPOSED_BOUNDS);
      return result.ok ? null : [...new Set(result.problems.map((p) => p.code))];
    };
    const inAct = (guard: Guard) => refusal(asks, (d) => d.acts.accept.guards.push(guard));
    const inHandler = (guard: Guard) => refusal(ticket, (d) => d.receives.closes.guards.push(guard));
    const about = (a: Operand): Guard => ({ equals: { a, b: { const: 1 } } });
    const rows: [string, ProblemCode[] | null, ProblemCode][] = [
      ["a sender in an act", inAct(about({ sender: true })), "name"],
      ["a source entry in an act", inAct(about({ source: "kind" })), "name"],
      ["an update in an act", inAct(about({ update: "state" })), "name"],
      ["a result outside a result clause", inHandler(about({ result: "reason" })), "name"],
      ["a signer in a handler", inHandler(about({ signer: true })), "name"],
      ["an intent in a handler", inHandler(about({ intent: true })), "name"],
      ["an update in a handler of a tell", refusal(variant(ticket, () => {}).declared, (d) => { d.receives.closes.class = "tell"; delete d.receives.closes.copies; d.receives.closes.guards.push(about({ update: "state" })); }), "name"],
      ["a presented fact that the act does not present", inAct(about({ presented: "pin" })), "name"],
      ["an element with no form that binds it", inAct(about({ element: "e" })), "name"],
      ["a slot of each item with no fan-out", inAct(about({ slot: "text", of: "each" })), "name"],
      ["a subject on an operand that is not a slot", inAct(about({ field: "terms", of: "on" } as never)), "shape"],
      ["a part of an operand that names no entry", inAct(about({ signer: true, part: "seq" } as never)), "shape"],
      ["a part of a value that is no fact", inAct(about({ slot: "text", part: "seq" })), "name"],
      ["a part the contract does not define", inAct(about({ field: "terms", part: "hash" as never })), "shape"],
      ["a part of a part that is not a scope or a position", inAct(about({ field: "terms", part: { of: "ref", then: "kind" as never } })), "shape"],
      ["a part of a capability record, in a definition that lists no capability with such a record", inAct(about({ field: "terms", part: { carried: "check.commit" } })), "capability"],
      ["a guard that reads a slot of the item its act opens, named by `of`", refusal(asks, (d) => d.acts.ask.guards.push(about({ slot: "text", of: "on" }))), "nascent-guard"],
      ["a guard that reads the item its act opens", refusal(asks, (d) => d.acts.ask.guards.push(about({ item: "on" }))), "nascent-guard"],
      ["a reason that is not a text", refusal(asks, (d) => { d.acts.accept.guards[1].reason = 7; }), "shape"],
      ["`self` in a fact slot whose kinds do not include the act's kind", refusal(asks, (d) => { d.items.ask.refs.termsAt.to.kind = ["ask"]; }), "name"],
      ["`self` in a fact slot under another definition's name", refusal(asks, (d) => { d.items.ask.refs.termsAt.to.under = "others"; d.acts.accept.fields.terms.under = "others"; }), "name"],
    ];
    expect(rows.filter(([, matched, code]) => matched?.length !== 1 || matched[0] !== code).map(([name, matched]) => [name, matched])).toEqual([]);
  });
});

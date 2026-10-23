import { handlerFormCases } from "./definition-corpus/forms-handlers-cases.ts";
import { forms_handlers_change0, forms_handlers_change1, forms_handlers_change2 } from "./definition-corpus/forms-handlers-variants.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { FieldValue, Request, Result } from "@generalbusiness/dap-contract";
import { MemoryState, messageFacts, validateDefinition, type Fetched } from "../src/index.ts";
import { Scope, arrive, decided, deliver, fields, keys, on, ticket, ticketDefinition, valid, variant } from "./fixtures-entry.ts";

const { rita } = keys;

/**
 * A board of cards, made up for these tests. A card may name a parent card,
 * the board may pin one card, and a lane may post a card or count on the
 * board's one tally. `note` reads three items that may not be there: the
 * pinned card, through the board's slot; the tally, which only a handler
 * opens; and, in `add`, the parent that an optional field names.
 */
import { board } from "./definition-corpus/forms-handlers-data.ts";

const boardDefinition = valid(validateDefinition(board, PROPOSED_BOUNDS));

/** A board B, and a lane X whose entries are made by hand: each holds one send to B, and nothing judged it. */
function lanes() {
  const B = new Scope(boardDefinition);
  const X = new Scope(ticketDefinition, rita.member, true, 1);
  const tell = (message: string, given: Record<string, FieldValue>, facts: readonly Fetched[] = []) => arrive(B, X, { class: "request", type: "tell", body: { message, fields: given } }, undefined, facts);
  const told = (message: string, given: Record<string, FieldValue>) => { tell(message, given); return decided(B); };
  return { B, X, tell, told };
}

describe("subjects and handlers (sections 6.4 and 7.3)", () => {
  test("an `also` name with no item is unbound: its guards are not evaluated, its effects are not applied, and `expected` has no key for it; once bound, all three hold again", () => {
    const B = new Scope(boardDefinition);
    const note = (card: number, also: Record<string, number>) => B.act(rita, "note", { ...on(B, card, also), ...fields({ note: "seen" }) });
    // No parent is named, so `parent` is unbound and its guard is not evaluated. The board is the one item of its type.
    const a = B.did(rita, "add", { ...fields({ note: "a" }), expected: { board: 1 } }).seq;
    const b = B.did(rita, "add", { ...fields({ note: "b", parent: a }), expected: { board: 1, parent: 1 } }).seq;
    // A key for a name that is unbound is refused, as any unknown key is.
    expect(B.act(rita, "add", { ...fields({ note: "c" }), expected: { board: 1, parent: 1 } })).toMatchObject({ result: "refused", reason: "bad-intent" });

    // Nothing is pinned and the scope has no tally: both names are unbound. The entry changes its own card and nothing else. The guard
    // on the tally is not evaluated, though it is nested, and the effect whose `if` reads the tally is not applied.
    expect(note(a, { board: 0 }).result).toBe("write");
    expect(B.last.effects).toEqual([{ effect: "value", item: a, slot: "note", value: "seen" }]);
    // The board pins b. The slot now selects b: `expected` needs its key, and the effect on it is applied.
    B.did(rita, "pin", { ...on(B, 0), ...fields({ card: b }) });
    expect(note(a, { board: 0 })).toMatchObject({ result: "refused", reason: "bad-intent" });
    expect(note(a, { board: 0, pinned: b }).result).toBe("write");
    expect([B.last.effects.length, B.item(b).values["note"]]).toEqual([2, "seen"]);
    // The pinned card is itself: two names, one item.
    expect(note(b, { board: 0, pinned: b })).toMatchObject({ result: "refused", reason: "alias" });
    // Its guard is evaluated again: b is done.
    B.did(rita, "done", on(B, b));
    expect(note(a, { board: 0, pinned: b })).toMatchObject({ result: "refused", reason: "guard-failed", name: "pinned-done" });

    // A local fact selects the item that its entry opened: a is open and b is done.
    const reply = (to: number) => B.act(rita, "reply", { ...fields({ to: B.fact(to) }), expected: { to: B.item(to).revision } });
    expect([reply(a).result, reply(b)]).toMatchObject(["write", { result: "refused", name: "parent-done" }]);
    // An entry that opened no item selects none.
    expect(B.act(rita, "reply", { ...fields({ to: B.fact(1) }), expected: {} })).toMatchObject({ result: "refused", reason: "no-item" });
    expect(B.replay().snapshot()).toBe(B.state.snapshot());
  });

  test("a relationship update runs the handler of its name: a first update past `copies` is `type-full`, an update of a key that is held is not, and an update with no handler keeps no copy", () => {
    const once = variant(ticket, forms_handlers_change0);
    const P = new Scope(once);
    const I = new Scope(once, rita.member, true, 1);
    const link = (kind = "link") => P.did(rita, kind, fields({ target: I.at, about: 0 })).seq;
    const [first, second] = [link(), link()];
    deliver(I, P, first);
    expect([decided(I), I.state.copies("closes", "lane")]).toEqual([["applied"], 1]);
    // A second key is one more than the handler keeps. The deciding entry has no effect, and no copy is kept.
    deliver(I, P, second);
    expect([decided(I), I.last.effects, I.state.relation(P.at, "closes", second), I.item(0).values["linked"]]).toEqual([["refused", "type-full"], [], null, "set"]);
    // The first key is held, so its next update is applied.
    deliver(I, P, P.did(rita, "unlink", on(P, first)).seq);
    expect([decided(I), I.state.relation(P.at, "closes", first)?.state]).toEqual([["applied"], "removed"]);
    // I3 deltas, section 31, entry FD6: the copies of one name and kind of owner are read as one number, whatever the scope keeps.
    // 1,000 copies of two names, and an update of a key that is held: one step for each count, counted. The earlier code read
    // all 1,000 copies for each, by reading it, as a count by state still does.
    const counted = { steps: 0 };
    const many = new MemoryState(counted);
    for (let item = 0; item < 1000; item++) many.putRelation({ owner: P.at, name: item % 2 === 0 ? "follows" : "closes", item, state: "set", revision: 1 });
    many.putRelation({ owner: P.at, name: "closes", item: 1, state: "removed", revision: 2 });
    expect([many.copies("closes", "lane"), many.copies("closes", "directory"), counted.steps, many.copies("closes", "lane", ["set"]), counted.steps]).toEqual([500, 0, 2, 499, 1002]);

    // No handler is for the relationship `follows`. And one whose `from` names another definition is not for this sender.
    deliver(I, P, link("follow"));
    const other = new Scope(variant(ticket, forms_handlers_change1), rita.member, true, 2);
    deliver(other, P, P.did(rita, "link", fields({ target: other.at, about: 0 })).seq);
    for (const s of [I, other]) expect([decided(s), s.last.effects, s.state.all().relations.length]).toEqual([["refused", "unknown-message"], [], s === I ? 1 : 0]);
    expect(I.replay().snapshot()).toBe(I.state.snapshot());
  });

  test("a handler reads the fields it declares, and opens its item: one for each delivery of a type that is `many`, up to its `max`; the one item of a type that is not, once", () => {
    const { B, X, tell, told } = lanes();

    // An ill-typed field and an unknown one. Neither opens anything.
    expect([told("post", { text: 7 }), told("post", { text: "a", more: true }), B.state.count("card", "open")]).toEqual([["refused", "bad-field"], ["refused", "bad-field"], 0]);
    // The delivery opens a card, which is its `on`, and sets a slot from `self`: the kind of this entry is the message's name.
    expect(told("post", { text: "a" })).toEqual(["applied"]);
    const a = B.last.seq;
    expect(B.item(a)).toMatchObject({ type: "card", revision: 1, values: { note: "a" }, refs: { postedAt: a } });
    // A message names its receiver's item by the fact of the entry that opened it. A fact with another hash names none.
    expect([told("post", { text: "b", about: { ...B.fact(a), hash: B.fact(0).hash } }), told("post", { text: "b", about: B.fact(a) })]).toEqual([["refused", "bad-field"], ["applied"]]);
    // The same fact as a member of a record, and in a record of a list, names the same card: each is read by its declared type, with the same checks.
    // Another hash names none, and the entry that opened the board names no card.
    const within = (card: FieldValue) => [told("post", { text: "b", under: { card } }), told("post", { text: "b", beside: [{ card }] })];
    expect([within({ ...B.fact(a), hash: B.fact(0).hash }), within(B.fact(0))]).toEqual([[["refused", "bad-field"], ["refused", "bad-field"]], [["refused", "no-item"], ["refused", "no-item"]]]);
    expect([told("post", { text: "b", under: { card: B.fact(a) }, beside: [{ card: B.fact(a) }] }), B.state.count("card", "open")]).toEqual([["applied"], 3]);
    B.did(rita, "done", on(B, B.last.seq));
    B.did(rita, "done", on(B, a));
    tell("post", { text: "c", about: B.fact(a) });
    expect(B.last.input).toMatchObject({ decision: "refused", reason: { code: "guard-failed", name: "about-done" } });
    // A card is live until it is done, and the type takes three live cards.
    expect([told("post", { text: "c" }), told("post", { text: "d" }), told("post", { text: "e" }), B.state.count("card", "open")]).toEqual([["applied"], ["applied"], ["refused", "type-full"], 3]);

    // The tally is not `many`. The first delivery opens it. The second finds it, changes it, and opens nothing.
    expect(told("count", { text: "x" })).toEqual(["applied"]);
    const tally = B.last.seq;
    expect(told("count", { text: "y" })).toEqual(["applied"]);
    expect([B.last.effects, B.item(tally)]).toMatchObject([[{ effect: "value", item: tally, slot: "last", value: "y" }], { revision: 2, values: { last: "y" } }]);
    // The tally is now bound in `note`, and its guard is evaluated: the note is not the last count.
    const card = B.last.seq - 3;
    const note = () => B.act(rita, "note", { ...on(B, card, { board: 0, tally }), ...fields({ note: "z" }) });
    expect(note()).toMatchObject({ result: "refused", name: "not-the-last" });
    // The tally is shut. It is still the one item of its type, so no delivery opens another, and none changes it.
    B.did(rita, "shut", on(B, tally));
    expect(told("count", { text: "z" })).toEqual(["refused", "final"]);
    // An act opens a second tally. Now `one` selects no one item, for a handler and for an act.
    B.did(rita, "recount");
    expect([told("count", { text: "z" }), note()]).toMatchObject([["refused", "no-item"], { result: "refused", reason: "no-item" }]);
    expect(B.replay().snapshot()).toBe(B.state.snapshot());

    // A fact that a field names is fetched before the turn, like a fact that an act names. Until it is, the delivery is not decided.
    X.did(rita, "link", fields({ target: B.at, about: 0 }));
    const proof = { fact: X.fact(2), entry: X.entries[2]!.entry, under: X.under };
    B.did(rita, "done", on(B, card));
    expect(tell("post", { text: "f", proof: proof.fact })).toEqual({ result: "unavailable", reason: "dependency-unavailable" });
    // The entry records it beside the source entry. One entry uses only so many foreign entries, and the source entry is one of them.
    B.bounds = { ...PROPOSED_BOUNDS, usesPerEntry: 1 };
    tell("post", { text: "f", proof: proof.fact }, [proof]);
    expect([decided(B), B.last.uses.length]).toEqual([["refused", "bad-field"], 1]);
    B.bounds = PROPOSED_BOUNDS;
    tell("post", { text: "f", proof: proof.fact }, [proof]);
    expect([decided(B), B.last.uses.map((u) => u.fact).at(-1), B.last.uses.length]).toEqual([["applied"], proof.fact, 2]);

    // A handler for a sender under another definition does not receive the message, so its declared fields name nothing to fetch.
    const under = variant(board, forms_handlers_change2);
    const message = { class: "request", type: "tell", body: { message: "post", fields: { text: "f", proof: proof.fact } } } as const;
    expect(["ticket", "desk"].map((sender) => messageFacts(B.state, under, message, X.fact(1), B.bounds, sender))).toEqual([[proof.fact], []]);
  });

  test("a result clause changes the items that its entry selected, read as they are now, and not an item that the entry did not find", () => {
    const { B, X, tell, told } = lanes();
    // B.2 opens a card and tells X. The scope has no tally yet, so `tally` is unbound in that entry.
    tell("relay", { peer: X.at });
    const asked = B.last.seq;
    expect(told("count", { text: "x" })).toEqual(["applied"]);
    const tally = B.last.seq;
    // X decides the request, and its result returns. The clause runs on the card that B.2 opened. The tally came later: it is not changed.
    const request = { from: B.fact(asked), n: 0 };
    const result: Result = { class: "result", of: request, outcome: "applied" };
    expect(arrive(B, X, result, { type: "delivery", ...request, message: B.entries[asked]!.entry.sends[0]!.message as Request, decision: "applied" }).result).toBe("write");
    expect([B.last.effects, B.item(tally).values["last"]]).toEqual([[{ effect: "value", item: asked, slot: "note", value: "answered" }], "x"]);
    expect(B.replay().snapshot()).toBe(B.state.snapshot());
  });

  test("the validator refuses a name that selects nothing it can check, and a handler that is not the form of its class", () => {
    const rows = handlerFormCases().map(([name, make, code]) => {
      const result = validateDefinition(make(), PROPOSED_BOUNDS);
      return [name, result.ok ? null : [...new Set(result.problems.map(p => p.code))], code] as const;
    });
    expect(rows.filter(([, matched, code]) => (code === null ? matched !== null : matched?.length !== 1 || matched[0] !== code)).map(([name, matched]) => [name, matched])).toEqual([]);
  });
});

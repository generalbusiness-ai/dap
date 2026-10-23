import { auditedData, refusingTicketData } from "./definition-corpus/forms-effects-variants.ts";
import { effectFormCases } from "./definition-corpus/forms-effects-cases.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Bounds, EffectForm, FieldValue, Guard, MemberRef, Notify, Send } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/artroom-bytes";
import { clockOf, deriveEffects, judgeDelivery, judgeGuards, validateDefinition, type ActJudgment, type Judging } from "../src/index.ts";
import { Scope, arriving, deliver, fields, forged, created, keys, member, on, ticketDefinition, valid, type Actor, type Over } from "./fixtures-entry.ts";

const { rita, una, vic, paul, sam } = keys;

/**
 * Cards, made up for these tests. A card has an owner, a helper, a team, a
 * parent, a text and a size. A summary takes the attribution of a card,
 * with further sources.
 */
import { cards } from "./definition-corpus/forms-effects-data.ts";

const definition = valid(validateDefinition(cards, PROPOSED_BOUNDS));

const names = (list: unknown) => (list as readonly MemberRef[]).map((m) => m.member);
/** An act on a card, and an act that names its parent card. */
const at = (s: Scope, card: number, f: Record<string, FieldValue> = {}): Over => ({ ...on(s, card), ...fields(f) });
const under = (s: Scope, card: number, f: Record<string, FieldValue> = {}): Over => ({ fields: { parent: card, ...f }, expected: { parent: s.item(card).revision } });
const listed = (item: number, change: "add" | "remove", who: Actor) => ({ effect: "list", item, slot: "team", change, member: who.member });
/** The effects of the entry that a judgment wrote, or the judgment when nothing was written. */
const written = (s: Scope, j: ActJudgment) => (j.result === "write" ? s.last.effects : j);

describe("effects: sources, conditions and what is not applied (section 6.6)", () => {
  test("an effect is applied when its source is present and its condition lets it through: a slot of another subject is copied, an absent source changes nothing, and `null` empties a slot", () => {
    const s = new Scope(definition);
    const p = s.did(una, "add", fields({ text: "p" })).seq;
    // The parent's owner, its ID and its text are copied. The parent has no size, so that effect is not applied, and records nothing.
    // The last source reads the new card as the effects before it left it: its helper is set by then.
    const child = s.did(rita, "child", under(s, p));
    const c = child.seq;
    expect(child.effects).toEqual([
      { effect: "open", item: c, type: "card", state: "draft" }, { effect: "party", item: c, slot: "owner", member: rita.member },
      { effect: "party", item: c, slot: "helper", member: una.member }, { effect: "ref", item: c, slot: "parent", to: p }, { effect: "value", item: c, slot: "text", value: "p" },
      listed(c, "add", una),
    ]);

    const edit = (f: Record<string, FieldValue>) => written(s, s.act(rita, "edit", at(s, p, f)));
    expect(edit({ size: 3 })).toEqual([{ effect: "value", item: p, slot: "size", value: 3 }]);
    // No field is given: each source is absent. Before, such an effect emptied its slot.
    expect([edit({}), s.item(p).values]).toEqual([[], { text: "p", size: 3, tags: null, near: null }]);
    // `clear` is true: the `if` applies and the `unless` with the same guards does not, though its source is present.
    expect(edit({ clear: true, size: 5 })).toEqual([{ effect: "value", item: p, slot: "size", value: null }]);
    expect(edit({ clear: false, size: 5 })).toEqual([{ effect: "value", item: p, slot: "size", value: 5 }]);

    // A condition is judged on the state before the entry's effects: the card was a draft, so the text is set in the entry that finishes it.
    expect(s.did(rita, "finish", at(s, c)).effects).toEqual([{ effect: "state", item: c, state: "done" }, { effect: "value", item: c, slot: "text", value: "finished" }]);
    // The card is now final. An effect on it that is not applied is not judged, and one that is applied refuses the input.
    const touch = (f: Record<string, FieldValue>) => s.judge(s.intent(rita, "touch", { ...on(s, 0, { other: c }), ...fields({ other: c, ...f }) }));
    expect([touch({}).result, touch({ text: "late" })]).toMatchObject(["write", { result: "refused", reason: "final" }]);
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });

  test("a party list is set whole from a list field, from a list of operands and from a part: one record for each member that leaves and then for each that joins, in byte order of member identifier", () => {
    const s = new Scope(definition);
    const p = s.did(una, "add", fields({ text: "p" })).seq;
    const staff = (...team: Actor[]) => written(s, s.act(rita, "staff", at(s, p, { team: team.map((a) => a.member) })));
    expect(staff(vic, una)).toEqual([listed(p, "add", una), listed(p, "add", vic)]);
    const first = s.head.seq;
    expect(staff(sam, una)).toEqual([listed(p, "remove", vic), listed(p, "add", sam)]);
    // The same set, written with a member twice: nothing changes, and nothing is recorded.
    expect(staff(una, sam, una)).toEqual([]);
    expect(staff(paul)).toEqual([listed(p, "remove", sam), listed(p, "remove", una), listed(p, "add", paul)]);

    // The signer, the helper and the owner. The parent has no helper, which gives no member, and its signer is its owner: one member.
    expect(written(s, s.act(una, "pair", at(s, p)))).toEqual([listed(p, "remove", paul), listed(p, "add", una)]);
    // The child's team holds una already. The signer and the owner join it.
    const c = s.did(vic, "child", under(s, p)).seq;
    expect([written(s, s.act(rita, "pair", at(s, c))), names(s.item(c).parties["team"])]).toEqual([[listed(c, "add", rita), listed(c, "add", vic)], ["@una", "@rita", "@vic"]]);

    // Parts of an entry of this scope. The `add` entry has a text and opened an owner; it has no field `team`, so that effect is not applied.
    const b = s.did(rita, "add").seq;
    const borrow = (seq: number, bounds: Bounds = PROPOSED_BOUNDS) => s.act(rita, "borrow", at(s, b, { proof: s.fact(seq) }), { bounds });
    expect([borrow(p).result, s.last.effects]).toEqual(["write", [{ effect: "value", item: b, slot: "text", value: "p" }, { effect: "party", item: b, slot: "helper", member: una.member }]]);
    // The first `staff` entry has a list of two members in its field. A list that can hold one refuses it: nothing is cut short.
    expect(borrow(first, { ...PROPOSED_BOUNDS, partyMembers: 1 })).toMatchObject({ result: "refused", reason: "slot-full" });
    expect([borrow(first).result, s.last.effects]).toEqual(["write", [listed(b, "add", una), listed(b, "add", vic)]]);
    // A text is not a value of a slot that holds a size. The commit checks it, because the validator could not.
    expect(s.judge(s.intent(rita, "misread", at(s, b, { proof: s.fact(p) })))).toMatchObject({ result: "refused", reason: "bad-field" });
    // A position goes in an integer slot of any range. The commit checks the value: entry 2 is within the slot's range, and this one is not.
    const rank = (seq: number) => s.judge(s.intent(rita, "rank", at(s, b, { proof: s.fact(seq) })));
    expect([p, b > 9, rank(p).result, rank(b)]).toMatchObject([2, true, "write", { result: "refused", reason: "bad-field" }]);
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });
});

interface Given { given?: Record<string, FieldValue>; opens?: string; bounds?: Bounds; attention?: Notify[] }
/** What a judge gives the forms of that act on the scope as it stands, with those subjects bound and rita as the signer. */
const judging = (s: Scope, kind: string, bound: Record<string, number>, more: Given = {}): Judging => ({
  view: s.state, definition: s.definition, bounds: more.bounds ?? PROPOSED_BOUNDS, clock: clockOf(s.state, s.now), scope: s.state.scope()!, self: s.head.seq + 1, kind,
  fields: more.given ?? {}, fieldTypes: s.definition.declared.acts[kind]!.fields, subjects: new Map(Object.entries(bound).map(([name, id]) => [name, s.item(id)])),
  signer: { member: rita.member, principal: null }, facts: new Map(), prepared: [], used: [], own: s.own,
});
/** What those effects derive there. Nothing is written. */
const derived = (s: Scope, kind: string, forms: readonly EffectForm[], bound: Record<string, number>, more: Given = {}) => deriveEffects(judging(s, kind, bound, more), forms, more.attention ?? [], more.opens ?? null);

describe("attribution: its sources and its order (section 6.7)", () => {
  /**
   * Card p is una's, who acts for paul, and its team is sam and una. Card c
   * is a finished child of p, with wes in its team. Card q is vic's, who
   * acts for quinn. Entry `staffed` gave q's team zed.
   */
  function deck() {
    const s = new Scope(definition);
    const p = s.did(una, "add").seq;
    s.did(rita, "staff", at(s, p, { team: [sam.member, una.member] }));
    const c = s.did(rita, "child", under(s, p)).seq;
    s.did(rita, "staff", at(s, c, { team: [member("wes")] }));
    s.did(rita, "finish", at(s, c));
    const q = s.did(vic, "add").seq;
    const staffed = s.did(rita, "staff", at(s, q, { team: [member("zed")] })).seq;
    return { s, p, q, staffed };
  }

  test("the list is the union of the subject's attribution and every source, each member once, in byte order of member identifier; a longer list than the slot holds is refused", () => {
    const { s, p, q, staffed } = deck();
    // Of q. Base: its owner vic, vic's principal quinn, and the signer, who is vic. The subject's own team: zed. No field is given, so the last two sources read nothing.
    const earlier = s.did(vic, "sum", under(s, q));
    expect(names(s.item(earlier.seq).parties["authors"])).toEqual(["@quinn", "@vic", "@zed"]);

    // Of p. Base: una, paul, and the signer rita. The finished child's team: wes. The subject's own team: sam, and una again.
    // The authors that the earlier summary opened: quinn, vic and zed. The team in the `staffed` entry's field: zed again.
    const given = under(s, p, { earlier: [s.fact(earlier.seq)], staffed: s.fact(staffed) });
    expect(s.act(rita, "sum", given, { bounds: { ...PROPOSED_BOUNDS, partyMembers: 7 } })).toMatchObject({ result: "refused", reason: "slot-full" });
    const sum = s.did(rita, "sum", given);
    const all = ["@paul", "@quinn", "@rita", "@sam", "@una", "@vic", "@wes", "@zed"];
    expect([names(s.item(sum.seq).parties["authors"]), names(sum.effects.slice(3).map((e) => "member" in e && e.member))]).toEqual([all, all]);
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });

  test("an input is not judged on a condition or a range that is not completed; an effect on an unbound subject is not applied, so an opening whose attribution names one leaves its required list unset", () => {
    const { s, p, q } = deck();
    const sum = cards.acts["sum"]!.effects;
    const stopped = { ...PROPOSED_BOUNDS, guardScan: 0 };
    const some: Guard = { some: { type: "card", states: ["done"], where: [{ equals: { a: { slot: "parent" }, b: { item: "also.parent" } } }] } };
    const set: EffectForm = { value: { slot: "text", from: { const: "x" } } };
    const notice: Notify = { notify: { slot: "owner", of: "on", when: "after", reason: "told" } };
    expect([
      // The range of the first source is not read whole. It is an exact set, so the input is not judged.
      derived(s, "sum", sum, { "also.parent": p }, { opens: "summary", bounds: stopped }),
      // A condition that is not completed, on an effect and on a notice. With every page read, the guard holds, and both are made.
      derived(s, "sum", [{ ...set, of: "also.parent", if: [some] }], { "also.parent": p }, { bounds: stopped }),
      derived(s, "sum", [], { on: p, "also.parent": p }, { bounds: stopped, attention: [{ notify: { ...notice.notify, if: [some] } }] }),
      derived(s, "sum", [{ ...set, of: "also.parent", if: [some] }], { on: p, "also.parent": p }, { attention: [{ notify: { ...notice.notify, if: [some] } }] }),
      // A condition that fails makes no notice.
      derived(s, "sum", [], { on: p, "also.parent": p }, { attention: [{ notify: { ...notice.notify, if: [{ unset: "owner" }] } }] }),
      // No subject is bound to `also.parent`: an effect on it is not applied. Nor is an attribution of it, which has no base, and the list is required.
      derived(s, "sum", [{ ...set, of: "also.parent" }], {}),
      derived(s, "sum", sum, {}, { opens: "summary" }),
    ]).toMatchObject([
      { ok: false, unavailable: "guard-incomplete" }, { ok: false, unavailable: "guard-incomplete" }, { ok: false, unavailable: "guard-incomplete" },
      { ok: true, effects: [{ effect: "value", item: p, slot: "text", value: "x" }, { effect: "attention", item: p, members: [una.member], reason: "told" }] },
      { ok: true, effects: [] }, { ok: true, effects: [] }, { ok: false, reason: "required-unset", detail: "authors" },
    ]);
    // The judge answers that the act is not judged. It is no refusal, and nothing is written.
    expect(s.act(rita, "sum", under(s, p), { bounds: stopped })).toEqual({ result: "unavailable", reason: "guard-incomplete" });

    // A source that reads no member, or no list of members, refuses the input: a further source of an attribution, and the source of a
    // party slot. The validator cannot know what a constant, the scope's own reference or a field with no declared type holds.
    const sourced = (source: object) => derived(s, "sum", [{ attribute: { slot: "authors", of: "also.parent", with: [source as never] } }], { "also.parent": p }, { opens: "summary" });
    const party = (to: string, from: object, given: Record<string, FieldValue> = {}) => derived(s, "pair", [{ party: { slot: to, from: from as never } }], { on: p }, { given });
    expect([
      ...[{ list: { const: "sam" } }, { list: { const: [7] } }, { each: { const: "sam" }, as: "e", list: { element: "e" } }].map((w) => sourced(w)),
      party("team", { scope: true }), party("team", { field: "sent" }, { sent: [7] }), party("helper", { field: "sent" }, { sent: "sam" }),
    ]).toMatchObject(Array(6).fill({ ok: false, reason: "bad-field" }));

    // A value that the definition gives no type, as a field of a message has none, is checked against the slot when it is copied. A
    // card is named by its ID, or by the fact of the entry that opened it, with that entry's hash; the deck is no card, and 99 is no item. A list is within its bound.
    const copy = (to: "ref" | "value", name: string, sent: FieldValue) => {
      const r = derived(s, "pair", [{ [to]: { slot: name, from: { field: "sent" } } } as never], { on: p }, { given: { sent } });
      return r.ok ? r.effects.map((e) => ("to" in e ? e.to : "value" in e ? e.value : e)) : "reason" in r ? r.reason : r.unavailable;
    };
    const forged = { ...s.fact(q), hash: s.fact(0).hash };
    expect([copy("ref", "parent", q), copy("ref", "parent", s.fact(q)), copy("ref", "parent", forged), copy("ref", "parent", 0), copy("ref", "parent", 99)]).toEqual([[q], [q], "bad-field", "bad-field", "bad-field"]);
    expect([copy("value", "tags", ["a", "b"]), copy("value", "tags", ["a", "b", "c"]), copy("value", "tags", ["a", 7])]).toEqual([[["a", "b"]], "bad-field", "bad-field"]);
    // A member of a record is checked by its declared type, as the slot itself is: a card by its ID or by that fact, and no other item.
    expect([{ card: q }, { card: s.fact(q) }, { card: forged }, { card: 0 }, {}, { card: q, more: 1 }].map((sent) => copy("value", "near", sent))).toEqual([[{ card: q }], [{ card: q }], "bad-field", "bad-field", "bad-field", "bad-field"]);

    // The guards of one written list: the first is not completed and the second is false, so the list is false, by its second guard.
    expect(judgeGuards(judging(s, "sum", { on: p, "also.parent": p }, { bounds: stopped }), [some, { unset: "owner" }])).toEqual({ result: "fail", at: 1 });
  });
});

describe("effects in a handler and in a result clause (sections 6.6 and 7.4)", () => {
  test("a handler copies the source entry into a fact slot only when that entry is of a kind and a definition the slot states", () => {
    const audited = (kind: string, under: string) => valid(validateDefinition(auditedData(kind, under), PROPOSED_BOUNDS));
    const D = created();
    const X = new Scope(ticketDefinition);
    X.did(una, "ask", fields({ desk: D.at }));   // X.2: an `ask` act of a ticket
    const tell: Send = { n: 0, to: D.at, message: { class: "request", type: "tell", body: { message: "audit", fields: { repo: 0 } } } };
    const source = forged(X.at, 2, X.entries[2]!.entry.input, [tell]);
    const arrival = { ...tell, from: factRefOf(source.entry) };
    const decided = (kind: string, under = "ticket") => {
      const j = judgeDelivery(D.state, audited(kind, under), arrival, arriving(D, arrival, source));
      return j.result === "write" && j.draft.input.type === "delivery" && "decision" in j.draft.input ? [j.draft.input.decision, j.draft.input.reason?.code, j.draft.effects] : j.result;
    };
    const refused = ["refused", "bad-field", []];
    expect([decided("ask"), decided("file"), decided("ask", "desk")]).toEqual([["applied", undefined, [{ effect: "ref", item: 0, slot: "asked", to: arrival.from }]], refused, refused]);
  });

  test("a clause's condition is judged when the result is recorded, and reads the name of the result's reason", () => {
    const refusing = valid(validateDefinition(refusingTicketData(), PROPOSED_BOUNDS));
    const P = new Scope(refusing);
    const I = new Scope(refusing, rita.member, true, 1);
    const recorded = (why: number) => {
      const link = P.did(rita, "link", fields({ target: I.at, about: 0, why })).seq;
      deliver(I, P, link);            // the receiver refuses, with the name its guard declares
      deliver(P, I, I.head.seq);      // the sender records the result, and runs its `refused` clause
      return [(P.last.input as { message: { reason?: { name?: string } } }).message.reason?.name, P.last.effects, P.item(link).state];
    };
    expect([recorded(1), recorded(2)]).toEqual([["one", [{ effect: "state", item: 2, state: "removed" }], "removed"], ["two", [], "set"]]);

    // A condition that is not completed leaves the result not recorded. It is offered again, and is recorded when the range is read whole.
    deliver(I, P, P.did(rita, "link", fields({ target: I.at, about: 0, why: 1 })).seq);
    P.bounds = { ...PROPOSED_BOUNDS, guardScan: 0 };
    expect(deliver(P, I, I.head.seq)).toEqual({ result: "unavailable", reason: "guard-incomplete" });
    P.bounds = PROPOSED_BOUNDS;
    expect([deliver(P, I, I.head.seq).result, P.last.effects.length]).toEqual(["write", 1]);
  });
});

describe("the validator: effect forms (section 6.6)", () => {
  test("it takes a pair of effects on one slot only when their conditions exclude each other, or both change one list; and it refuses a source the slot cannot hold", () => {
    const rows = effectFormCases().map(([name, make, code]) => {
      const result = validateDefinition(make(), PROPOSED_BOUNDS);
      return [name, result.ok ? null : [...new Set(result.problems.map(p => p.code))], code] as const;
    });
    expect(rows.filter(([, matched, code]) => (code === null ? matched !== null : matched?.length !== 1 || matched[0] !== code)).map(([name, matched]) => [name, matched])).toEqual([]);
  });
});

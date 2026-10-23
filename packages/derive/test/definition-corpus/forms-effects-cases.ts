/** The original effects-form table retains every positive and negative callback.
 * Factories construct raw data; validation is performed only by their named callers. */
import type { DeclaredDefinition, Guard } from "@generalbusiness/dap-contract";
import type { ProblemCode } from "../../src/index.ts";
import { cards, cleared } from "./forms-effects-data.ts";
import { ticket, desk } from "./fixture-data.ts";
export function effectFormCases() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const refusal = (change: (d: any) => void, base: DeclaredDefinition = cards) => () => {
    const d = structuredClone(base);
    change(d);
    return d;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const edit = (...effects: unknown[]) => refusal((d) => { d.acts.edit.effects = effects; });
  const say = (said: string, condition: object = {}) => ({ value: { slot: "text", from: { const: said } }, ...condition });
  const sized = (n: number): Guard => ({ equals: { a: { field: "size" }, b: { const: n } } });
  const team = (from: unknown, list?: string) => ({ party: { slot: "team", from, ...(list ? { list } : {}) } });
  const who = { field: "who" };
  const staffing = (...effects: unknown[]) => refusal((d) => { d.acts.staff.fields.who = { type: "member", required: false }; d.acts.staff.effects = effects; });
  const timed = (...effects: unknown[]) => refusal((d) => {
    d.items.card.values.due = { fixed: false, required: false, of: { type: "time" } };
    d.timed.expire = { on: "card", states: ["draft"], deadline: "due", effects: [{ state: "done" }, ...effects], attention: [] };
  });
  const attributed = (source: unknown) => refusal((d) => { d.acts.sum.effects[2].attribute.with = [source]; });
  const rows: [string, () => DeclaredDefinition, ProblemCode | null][] = [
    // Conditions that exclude each other.
    ["two effects on one slot, one under a condition", edit(say("a"), say("b", { if: cleared })), "conflict"],
    ["an `if` and an `unless` with the same guards", edit(say("a", { if: cleared }), say("b", { unless: cleared })), null],
    ["an `if` and an `unless` with other guards", edit(say("a", { if: cleared }), say("b", { unless: [sized(1)] })), "conflict"],
    ["two `if` lists with an `equals` of one operand and two constants", edit(say("a", { if: [sized(1)] }), say("b", { if: [{ state: ["draft"] }, sized(2)] })), null],
    ["the same with one constant", edit(say("a", { if: [sized(1)] }), say("b", { if: [sized(1)] })), "conflict"],
    ["the same with `ifPresent`, which lets both hold", edit(say("a", { if: [{ ...sized(1), ifPresent: true }] }), say("b", { if: [{ ...sized(2), ifPresent: true }] })), "conflict"],
    ["two `if` lists with `state` guards that share no state", edit(say("a", { if: [{ state: ["draft"] }] }), say("b", { if: [{ state: ["done"] }] })), null],
    ["the same with a shared state", edit(say("a", { if: [{ state: ["draft"] }] }), say("b", { if: [{ state: ["draft", "done"] }] })), "conflict"],
    // Successive changes of one party list.
    ["an `add` and a `remove` on one party list", staffing(team(who, "add"), team({ signer: true }, "remove")), null],
    ["a list set whole beside an `add`", staffing(team({ field: "team" }), team(who, "add")), "conflict"],
    // A state effect needs a live subject.
    ["a state effect whose live-state guard is in its own `if`", edit({ state: "done", if: [{ state: ["draft"] }] }), null],
    ["a state effect whose live-state guard is in its `unless`", edit({ state: "done", unless: [{ state: ["draft"] }] }), "final"],
    // Conditions are guards of the entry.
    ["a condition that reads the item its act opens", refusal((d) => { d.acts.add.effects[1].if = [{ unset: "text" }]; }), "nascent-guard"],
    ["a clause's condition reads the item its act opened, and the result", refusal((d) => { d.acts.ask.sends[0].tell.result.applied = [{ state: "answered", if: [{ state: ["asked"] }, { differs: { a: { result: "reason" }, b: { const: "late" } } }] }]; }, ticket), null],
    ["a condition on an effect of a timed rule", timed(say("late", { if: [{ unset: "size" }] })), "timed-partial"],
    ["a party list set whole by a timed rule", timed(team([{ slot: "owner" }])), "timed-partial"],
    ["a source of a timed rule whose type only the commit knows", timed({ value: { slot: "text", from: { scope: true } } }), "timed-partial"],
    ["a timed rule that copies one slot of its item into another, and empties a third", timed({ party: { slot: "helper", from: { slot: "owner" } } }, { value: { slot: "text", from: null } }), null],
    // Sources.
    ["an opening whose only effect on a required slot empties it", refusal((d) => { d.acts["found"].effects[0].value.from = null; }, desk), "required-unset"],
    ["a source that is none", edit({ value: { slot: "text", from: { none: true } } }), "shape"],
    ["a constant that is not a value of the slot", edit({ value: { slot: "size", from: { const: "big" } } }), "shape"],
    ["a position into a slot that is no integer", refusal((d) => { d.acts.rank.effects[0].value.slot = "text"; }), "name"],
    ["a source of another type: the signer into a text", edit({ value: { slot: "text", from: { signer: true } } }), "name"],
    ["the first delivery's form of a member from a fetched fact", refusal((d) => { d.acts.borrow.effects[1].party.from = { fact: "proof", field: "owner" }; }), "shape"],
    ["a list of operands into a slot that holds one member", staffing({ party: { slot: "helper", from: [who] } }), "shape"],
    ["more operands than the list can hold", staffing(team([who, who, who, who])), "bound"],
    ["an `add` of a list of operands", staffing(team([who], "add")), "shape"],
    ["a list set whole from a list that can hold more", refusal((d) => { d.acts.staff.fields.team.max = 4; }), "bound"],
    ["one member into a list slot, with no `add`", staffing(team(who)), "name"],
    // Further sources of an attribution.
    ["a further source that is no form", attributed({ members: { field: "earlier" } }), "shape"],
    ["a further source from a slot that is no party slot", attributed({ subject: "also.parent", slot: "text" }), "name"],
    ["a further source over each element of a value that is no list", attributed({ each: { field: "staffed" }, as: "e", list: { element: "e" } }), "name"],
    ["a further source whose list holds no members", attributed({ list: { field: "earlier" } }), "name"],
  ];
  return rows;
}

/** Original mark grammar table: raw mutations and explicit expected problems only. */
import { gate } from "./marks-data.ts";
import { small } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
type Change = (d: any) => void;
export const MARK = { code: "fresh", row: "P14" };
export const PLACE = { domain: "gate-proof-1", max: 64 };
export const markFormCases: readonly (readonly [string, unknown, Change, boolean, readonly (readonly [string, string])[] | null])[] = [
  // Without the option a mark is a form that the contract does not define, at every place.
  ["a declared definition with a mark among its guards is refused", small, (d) => d.acts.edit.guards.push(MARK), false, [["shape", "acts.edit.guards.4"]]],
  ["the platform data without the option: the member `outcomes` is no member of a declared definition", gate, () => {}, false, [["shape", "outcomes"]]],
  ["the same rows under a declared name, without the option: each of the six forms is refused where it stands", gate, (d) => { delete d.outcomes; d.name = "gate"; }, false, [["shape", "items.ticket.values.note.of"]]],
  ["and with the slot's type written as data: the grant, the field's type, the name of `also`, the guard, the effect and the send", gate, (d) => { delete d.outcomes; d.name = "gate"; d.items.ticket.values.note.of = { type: "int", min: 0, max: 9 }; }, false, [
    ["shape", "acts.enter.grant"], ["shape", "acts.enter.fields.note"], ["shape", "acts.enter.also.ticket"], ["name", "acts.enter.guards.0.of"], ["shape", "acts.enter.guards.1"],
    ["name", "acts.enter.effects.0.of"], ["name", "acts.enter.effects.1.of"], ["shape", "acts.enter.effects.2"], ["shape", "acts.enter.sends.0"],
  ]],
  // With the option a mark stands at one of the seven places, and nowhere else.
  ["with the option, the data without `outcomes` is not platform data", gate, (d) => { delete d.outcomes; }, true, [["shape", "outcomes"]]],
  ["a mark among the effects of a timed rule", gate, (d) => {
    d.items.ticket.values.due = { fixed: false, required: false, of: { type: "time" } };
    d.timed.lapse = { on: "ticket", states: ["open"], deadline: "due", effects: [{ state: "used" }, MARK], attention: [] };
  }, true, [["timed-partial", "timed.lapse.effects.1"]]],
  ["a mark inside a list form", gate, (d) => d.acts.enter.guards.push({ anyOf: [[MARK]] }), true, [["shape", "acts.enter.guards.2.anyOf.0.0"]]],
  ["a mark in the condition of an effect", gate, (d) => { d.acts.enter.effects[1].if = [MARK]; }, true, [["shape", "acts.enter.effects.1.if.0"]]],
  ["a mark as the type of an element of a list", gate, (d) => { d.acts.enter.fields.notes = { type: "list", max: 2, of: { code: "even", row: "P22", type: "code" }, required: false }; }, true, [["shape", "acts.enter.fields.notes.of"]]],
  ["a mark with a condition of its own", gate, (d) => { d.acts.enter.effects[2].if = []; }, true, [["shape", "acts.enter.effects.2.if"]]],
  ["a mark that names no row", gate, (d) => { d.acts.enter.guards[1].row = ""; }, true, [["shape", "acts.enter.guards.1.row"]]],
  // The field is then no field, so the effect that copies it names nothing.
  ["a default on a field whose type is a mark", gate, (d) => { d.acts.enter.fields.note.default = 2; }, true, [["shape", "acts.enter.fields.note.default"], ["name", "acts.enter.effects.1.value.from"]]],
  ["a value of another type copied into a slot whose type is a mark", gate, (d) => { d.acts.enter.effects[1].value.from = { field: "secret" }; }, true, [["name", "acts.enter.effects.1.value.from"]]],
  // Revision 19, "More than one send mark" (witness 18.45, case 3): a list may hold several marks when at most one does not state `always`.
  ["a second send mark, where neither states `always`", gate, (d) => d.acts.enter.sends.push({ code: "again", row: "P21", result: {} }), true, [["shape", "acts.enter.sends.1"]]],
  ["a second send mark, where one states `always`, passes", gate, (d) => d.acts.enter.sends.push({ code: "again", row: "P21", result: {}, always: true }), true, null],
  ["three send marks, where two state `always`, pass, and each is listed", gate, (d) => { d.acts.enter.sends[0].always = true; d.acts.enter.sends.push({ code: "again", row: "P21", result: {} }, { code: "third", row: "P21", result: {}, always: true }); }, true, null],
  ["`always` is true, or is left out", gate, (d) => { d.acts.enter.sends[0].always = false; }, true, [["shape", "acts.enter.sends.0.always"]]],
  ["a written send that is not always made, beside two marks", gate, (d) => {
    d.acts.enter.sends[0].always = true;
    d.acts.enter.sends.push({ code: "again", row: "P21", result: {} }, { index: { fields: {} } });
  }, true, [["shape", "acts.enter.sends.0"]]],
  // Revision 19, section 6.2, "How a version states a place" (witness 18.45, case 7): a field of type `digest` of an act may state
  // `value: { domain, max }`, in platform data only. Two fields that state one domain state one `max`.
  ["a field of an act that names a value passes", gate, (d) => { d.acts.issue.fields.hash.value = PLACE; }, true, null],
  ["the same member without the option is unknown: no act of a declared definition has a place", small, (d) => { d.acts.edit.fields.proof = { type: "digest", required: false, value: PLACE }; }, false, [["shape", "acts.edit.fields.proof.value"]]],
  ["two fields that state one domain with two bounds", gate, (d) => { d.acts.issue.fields.hash.value = PLACE; d.acts.issue.fields.other = { type: "digest", required: false, value: { ...PLACE, max: 65 } }; }, true, [["shape", "acts.issue.fields.other.value.max"]]],
  ["two fields that state one domain with one bound pass", gate, (d) => { d.acts.issue.fields.hash.value = PLACE; d.acts.issue.fields.other = { type: "digest", required: false, value: PLACE }; }, true, null],
  ["a place with no bound, and one with no domain", gate, (d) => { d.acts.issue.fields.hash.value = { domain: "gate-proof-1", max: 0 }; d.acts.issue.fields.other = { type: "digest", required: false, value: { domain: "", max: 4 } }; }, true, [
    ["shape", "acts.issue.fields.hash.value.max"], ["shape", "acts.issue.fields.other.value.domain"], ["name", "acts.issue.effects.0.value.from"],
  ]],
  ["a place on a field of another type", gate, (d) => { d.acts.enter.fields.secret.value = PLACE; }, true, [["shape", "acts.enter.fields.secret.value"]]],
  ["a place on a slot", gate, (d) => { d.items.ticket.values.hash.of = { type: "digest", value: PLACE }; }, true, [["shape", "items.ticket.values.hash.of.value"]]],
  ["`always` on a written send is no member of it", small, (d) => { d.acts.edit.sends = [{ index: { fields: {} }, always: true }]; }, false, [["shape", "acts.edit.sends.0"]]],
  // A written effect on a name that a mark selects, a required slot that only an effect mark could set, and a clause of the mark's own request all pass.
  ["a required slot that no written effect sets, in a row with an effect mark, passes", gate, (d) => { d.acts.issue.effects = [{ code: "hash-of", row: "P18" }]; }, true, null],
  ["an effect mark in a clause of the send mark passes", gate, (d) => { d.acts.enter.sends[0].result.applied = [{ code: "noted", row: "P16" }]; }, true, null],
  // Revision 17, section 6.1, "A request of an outcome's rule, and its clauses" (witness 18.43, case 6; row I3-23): the mark of a
  // kind of `outcomes` may hold one `send`, which is a mark, and each effect of its clauses is an effect mark.
  ["an outcome's mark with a send mark, whose clause holds an effect mark, passes", gate, (d) => { d.outcomes.probe.send = { code: "create-child", row: "P16", result: { applied: [{ code: "noted", row: "P16" }], refused: [] } }; }, true, null],
  ["an outcome's mark with a written send", gate, (d) => { d.outcomes.probe.send = { tell: { to: { slot: "x" }, message: "hello", fields: {}, result: {} } }; }, true, [["shape", "outcomes.probe.send"]]],
  ["an outcome's mark with two sends", gate, (d) => { d.outcomes.probe.send = [{ code: "a", row: "P16", result: {} }, { code: "b", row: "P16", result: {} }]; }, true, [["shape", "outcomes.probe.send"]]],
  ["a written effect in a clause of an outcome's send", gate, (d) => { d.outcomes.probe.send = { code: "create-child", row: "P16", result: { applied: [{ state: "used" }] } }; }, true, [["shape", "outcomes.probe.send.result.applied.0"]]],
  ["an outcome's send that states `always`", gate, (d) => { d.outcomes.probe.send = { code: "create-child", row: "P16", result: {}, always: true }; }, true, [["shape", "outcomes.probe.send.always"]]],
];

/** Complete original handler grammar expectation table; factories do not validate. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { ProblemCode } from "../../src/index.ts";
import { board } from "./forms-handlers-data.ts";
import { ticket } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function handlerFormCases() {
  const refusal = (base: DeclaredDefinition, change: (d: any) => void) => () => {   // eslint-disable-line @typescript-eslint/no-explicit-any
    const d = structuredClone(base);
    change(d);
    return d;
  };
  const inBoard = (change: (d: any) => void) => refusal(board, change);   // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows: [string, () => DeclaredDefinition, ProblemCode | null][] = [
    ["a field of a fact whose entry opens another type", inBoard((d) => { d.acts.reply.fields.to.kind = ["start"]; }), "name"],
    ["a field of a fact under another definition", inBoard((d) => { d.acts.reply.fields.to.under = "ticket"; }), "name"],
    ["a slot that holds no item of that type", inBoard((d) => { d.acts.note.also.pinned.item = "board"; }), "name"],
    ["the slots of an item that the act opens", inBoard((d) => { d.acts.add.also.next = { item: "card", via: { slot: "parent", of: "on" } }; }), "name"],
    ["two names that each read the other's slot", inBoard((d) => { d.acts.note.also = { x: { item: "card", via: { slot: "parent", of: "also.y" } }, y: { item: "card", via: { slot: "parent", of: "also.x" } } }; d.acts.note.guards.length = 1; d.acts.note.effects.length = 1; }), "name"],
    ["a name that reads a slot of an earlier name, in any order of the names, passes", inBoard((d) => { d.acts.note.also = { a: { item: "card", via: { slot: "parent", of: "also.z" } }, z: { item: "card", via: { slot: "parent", of: "on" } } }; d.acts.note.guards.length = 1; d.acts.note.effects.length = 1; }), null],
    ["`one` of a type that is `many`", inBoard((d) => { d.acts.add.also.board.item = "card"; }), "name"],
    ["two ways to select one name", inBoard((d) => { d.acts.add.also.board.by = "parent"; }), "shape"],
    ["a result clause that names an item selected through a slot which may change", inBoard((d) => {
      d.items.board.refs.peer = { fixed: false, required: false, to: { type: "scope", kind: "lane" } };
      d.acts.note.sends = [{ tell: { to: { slot: "peer" }, message: "seen", fields: {}, result: { applied: [{ of: "also.pinned", value: { slot: "note", from: { const: "told" } } }] } } }];
      d.acts.note.on = "board"; d.acts.note.guards = []; d.acts.note.effects = []; d.acts.note.also = { pinned: { item: "card", via: { slot: "pinned", of: "on" } } };
    }), "name"],

    ["a handler with no class", inBoard((d) => { delete d.receives.post.class; }), "shape"],
    ["a class the contract does not define", inBoard((d) => { d.receives.post.class = "ask"; }), "shape"],
    ["a tell and a relate handler for one name pass", inBoard((d) => { d.receives.again = { ...structuredClone(d.receives.count), class: "relate", copies: 1 }; }), null],
    ["a relate handler that states no number of copies", refusal(ticket, (d) => { delete d.receives.closes.copies; }), "shape"],
    ["a number of copies on a tell handler", inBoard((d) => { d.receives.post.copies = 2; }), "shape"],
    ["an advisory handler for a message that is no advisory type", inBoard((d) => { d.receives.count.class = "advisory"; }), "name"],
    ["an advisory handler that tells a member", inBoard((d) => { Object.assign(d.receives.count, { class: "advisory", message: "index", attention: [{ notify: { slot: "owner", of: "also.board", when: "after", reason: "counted" } }], also: { board: { item: "board", one: true } } }); }), "advisory-sends"],
    ["an advisory handler that sets a fact slot from self: its entry has no kind", inBoard((d) => { Object.assign(d.receives.post, { class: "advisory", message: "index" }); d.items.card.refs.postedAt.to.kind = ["index"]; }), "name"],
    // Section 6.6: the source entry is under the definition that the handler's `from` names.
    ["the source entry into a fact slot under another name than the sender's definition", inBoard((d) => { d.receives.post.from.under = "ticket"; d.receives.post.effects[1].ref.from = { source: "ref" }; }), "name"],
    ["the source entry into a fact slot under the sender's definition passes", inBoard((d) => { d.receives.post.from.under = "ticket"; d.receives.post.effects[1].ref.from = { source: "ref" }; d.items.card.refs.postedAt.to.under = "ticket"; }), null],
    ["a field of a message with a default", inBoard((d) => { d.receives.post.fields.about.default = 1; }), "shape"],
    ["a handler that opens no item type", inBoard((d) => { d.receives.post.opens = "page"; }), "name"],
    ["a handler's guard on the item it opens", inBoard((d) => { d.receives.post.guards.push({ state: ["open"] }); }), "nascent-guard"],
    ["a handler whose opening leaves a required slot unset", inBoard((d) => { d.items.card.values.note.required = true; d.receives.post.effects.shift(); }), "required-unset"],
    ["a handler that sets a fixed slot of the one item of its type, which may exist already", inBoard((d) => { d.items.tally.values.last.fixed = true; }), "fixed"],
    ["a handler that sets the state of the one item of its type, which may be final already", inBoard((d) => { d.items.tally.states.shut = { final: true }; d.receives.count.effects.push({ state: "kept" }); }), "final"],
    ["`self` from a handler into a fact slot whose kinds do not include its message", inBoard((d) => { d.items.card.refs.postedAt.to.kind = ["count"]; }), "name"],
  ];
  return rows;
}

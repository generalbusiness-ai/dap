/** The original validation table, including its explicit positive/negative expectations.
 * Callbacks are raw changes only; importing the table does not validate them. */
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { ProblemCode } from "../../src/index.ts";
import { lane, small, ticket, desk } from "./fixture-data.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Change = (d: any) => void;
const overdue = { on: "note", states: ["draft"], deadline: "due", effects: [{ state: "kept" }], attention: [] };
export const clone = <T>(v: T): T => structuredClone(v);
/** The ticket, with a request that a timed rule pauses: `asked` to `paused` at its `until`. */
const pausing = (change: Change): Change => (d) => {
  d.items.request.states.paused = { final: false };
  d.items.request.values.until = { fixed: false, required: false, of: { type: "time" } };
  d.timed.pause = { on: "request", states: ["asked"], deadline: "until", effects: [{ state: "paused" }], attention: [] };
  change(d);
};

/**
 * Each row is one definition: a fixture with one change. `null` passes; a
 * code is the only kind of problem the validator reports for it.
 */
export const rows: readonly (readonly [string, DeclaredDefinition, Change, ProblemCode | null])[] = [
  ["the lane passes", lane, () => {}, null],
  ["the small definition passes", small, () => {}, null],
  // A0a invariant: only absent or exact recorded@1 levels can reach recorded execution.
  ["explicit recorded durability passes", small, (d) => { d.level = { name: "recorded", version: 1 }; }, null],
  ["live durability cannot use recorded execution", small, (d) => { d.level = { name: "live", version: 1 }; }, "unsupported-definition"],
  ["archived durability cannot use recorded execution", small, (d) => { d.level = { name: "archived", version: 1 }; }, "unsupported-definition"],
  ["an unknown durability version", small, (d) => { d.level = { name: "recorded", version: 2 }; }, "unsupported-definition"],
  ["an unknown durability name", small, (d) => { d.level = { name: "eventual", version: 1 }; }, "unsupported-definition"],
  ["extra durability settings are not ignored", small, (d) => { d.level = { name: "recorded", version: 1, archive: true }; }, "shape"],
  ["a durability level missing its version", small, (d) => { d.level = { name: "recorded" }; }, "shape"],
  ["the desk passes", desk, () => {}, null],
  ["the ticket passes, with a rule guard that names a rule it declares", ticket, () => {}, null],
  ["a rule guard that names no declared rule", ticket, (d) => { d.rules = {}; }, "rule"],
  ["two handlers for one class and message from one kind of scope", desk, (d) => { d.receives.again = clone(d.receives.spawn); }, "handler"],
  ["a time value set by a genesis, with no timed rule on its type, passes", small, (d) => d.acts.start.effects.push({ value: { slot: "due", from: { time: { plusSeconds: 60 } } } }), null],

  // Section 6.4, the table of X1 and X2.
  ["X1: the genesis act opens the hold type", lane, (d) => { d.genesis = "take-hold"; }, "genesis-timed"],
  ["X2: the genesis act opens a type with a deadline under a timed rule", small, (d) => { d.timed.overdue = overdue; }, "genesis-timed"],
  ["the genesis names no act", small, (d) => { d.genesis = "found"; }, "genesis"],
  ["the genesis act is a transition", small, (d) => { d.genesis = "keep"; }, "genesis"],

  // Sections 4.1 and 6.3.
  ["two opens: an open act that also opens a hold on another item", lane, (d) => d.acts.offer.effects.push({ of: "also.intent", hold: { do: "open" } }), "one-item"],
  ["two effects set one slot of one subject", small, (d) => d.acts.edit.effects.push({ value: { slot: "text", from: { const: "x" } } }), "conflict"],
  ["two effects set the state of one subject", small, (d) => d.acts.keep.effects.push({ state: "draft" }), "conflict"],
  ["an opening sets no value in a required slot", small, (d) => d.acts.write.effects.shift(), "required-unset"],
  ["a guard reads the state of the item its act opens", small, (d) => d.acts.write.guards.push({ state: ["draft"] }), "nascent-guard"],
  ["a guard reads a slot of the item its act opens", small, (d) => d.acts.write.guards.push({ equals: { a: { slot: "owner" }, b: { signer: true } } }), "nascent-guard"],
  ["an equality whose second operand is not an operand, after a first that is valid", small, (d) => d.acts.write.guards.push({ equals: { a: { field: "owner" }, b: null } }), "shape"],
  ["a later act sets a fixed slot", small, (d) => d.acts.edit.effects.push({ party: { slot: "owner", from: { signer: true } } }), "fixed"],
  ["a state effect with no guard that its subject is live", small, (d) => { d.acts.keep.guards = []; }, "final"],
  ["a state effect whose guard admits a final state", small, (d) => d.acts.keep.guards[0].state.push("kept"), "final"],
  ["two relate sends written with one to, item and name", lane, (d) => d.acts.link.sends.push(clone(d.acts.link.sends[0])), "duplicate-relation"],

  // Names and bounds.
  ["an effect names no state", small, (d) => { d.acts.keep.effects[0].state = "gone"; }, "name"],
  ["an also entry is named by a field that is not an item", small, (d) => { d.acts.edit.also.other.by = "text"; }, "name"],
  ["an also entry is named by an item field of another type", lane, (d) => { d.acts.offer.also.intent.item = "commitment"; }, "name"],
  ["more guards than one act may have", small, (d) => { d.acts.edit.guards = Array.from({ length: PROPOSED_BOUNDS.guards + 1 }, () => ({ state: ["draft"] })); }, "bound"],
  ["a text field larger than a text may be", small, (d) => { d.items.note.values.text.of.max = PROPOSED_BOUNDS.textBytes + 1; }, "bound"],
  ["a field copied into a slot that holds less: a text of 200 bytes into a slot of 4", small, (d) => { d.items.note.values.text.of.max = 4; }, "bound"],
  ["more states than a type may have", small, (d) => { for (let i = 0; i < PROPOSED_BOUNDS.states; i++) d.items.note.states[`s${i}`] = { final: false }; }, "bound"],

  // Timed rules and the hold capability, as the deltas note records them.
  ["a hold with no timed rule that ends it", lane, (d) => { d.timed = {}; }, "hold"],
  ["a hold effect in a definition that does not list hold@1", lane, (d) => { d.capabilities = []; }, "capability"],
  ["a timed rule that leaves its item due", ticket, pausing((d) => { d.timed.pause.effects = []; }), "timed"],
  ["a timed rule with an effect its commit could refuse: an add to a party list that may be full", lane, (d) => {
    d.items.hold.parties.past = { fixed: false, required: false, list: true, max: 1, author: false };
    d.timed["hold-end"].effects.push({ party: { slot: "past", from: { slot: "holder" }, list: "add" } });
  }, "timed-partial"],
  ["a timed rule that sets a time from the commit clock, which a commit could refuse", lane, (d) => d.timed["hold-end"].effects.push({ value: { slot: "until", from: { time: { plusSeconds: 60 } } } }), "timed-partial"],
  ["a timed rule whose entry, with its attention reason, could pass the entry size bound: its due item could never be written", lane, (d) => { d.timed["hold-end"].attention[0].notify.reason = "r".repeat(PROPOSED_BOUNDS.entryBytes); }, "bound"],
  // Section 17.2: a reservation covers what its task can start, so that must be finite.
  ["timed rules of one type that lead to one another in a cycle", ticket, pausing((d) => { d.timed.resume = { ...d.timed.pause, states: ["paused"], effects: [{ state: "asked" }] }; }), "reserve-unbounded"],
  ["forms that settle create one another's pending states in a cycle", ticket, pausing((d) => {
    const moves = (from: string, to: string) => ({ ...clone(d.acts.approve), on: "request", settles: { of: "on", in: [from] }, guards: [{ state: [from] }], effects: [{ state: to }] });
    Object.assign(d.acts, { wait: moves("asked", "paused"), resume: moves("paused", "asked") });
  }), "reserve-unbounded"],
  // Section 6.4, `settles`: an item in stated states, or the copy that a relate handler's update is for.
  ["an act that settles an item, and a relate handler that settles its copy, pass", ticket, (d) => { d.acts.unlink.settles = { of: "on", in: ["set"] }; d.receives.closes.settles = { copy: ["set"] }; }, null],
  ["an act that settles the item it opens", ticket, (d) => { d.acts.link.settles = { of: "on", in: ["set"] }; }, "name"],
  ["an act that settles an item in a state its type does not have", ticket, (d) => { d.acts.unlink.settles = { of: "on", in: ["gone"] }; }, "name"],
  ["an act that settles a copy", ticket, (d) => { d.acts.unlink.settles = { copy: ["set"] }; }, "shape"],
  ["a time offset longer than the span a timestamp can name", lane, (d) => { d.acts["take-hold"].effects[1].value.from.time.plusSeconds = Number.MAX_SAFE_INTEGER; }, "bound"],
  ["a timed rule over a final state", ticket, pausing((d) => d.timed.pause.states.push("answered")), "timed"],
  ["a profile this runtime does not implement", small, (d) => { d.profile.version = 2; }, "profile"],
  ["a capability version that the contract does not declare", small, (d) => d.capabilities.push({ name: "git-read", version: 2 }), "capability"],

  // Section 6.10: forms that are not part of the grammar. No implementer invents them.
  ["G1: an operand path into a fact", small, (d) => d.acts.edit.guards.push({ equals: { a: { field: "text", path: "on" }, b: { const: 1 } } }), "shape"],
  ["G3: a `when` on an effect", small, (d) => { d.acts.edit.effects[0].when = [{ state: ["draft"] }]; }, "shape"],
  ["G6: a `covers` guard", small, (d) => d.acts.edit.guards.push({ covers: { list: "notes", states: ["kept"] } }), "shape"],
  ["G7: `follow` on a fact guard", small, (d) => { d.acts.edit.fields.proof = { type: "fact", kind: ["report"], under: "lane", required: false }; d.acts.edit.guards.push({ fact: { field: "proof", follow: "report" } }); }, "shape"],
  ["G11: an operand `sender` in an act, which has no sender", small, (d) => d.acts.edit.guards.push({ equals: { a: { sender: true }, b: { const: 1 } } }), "name"],
  ["a member the contract does not define", small, (d) => { d.imports = []; }, "shape"],
  // Section 6.1: a definition states its name. The name of a platform definition is the platform's to give.
  ["a declared definition that takes the name of a platform definition", small, (d) => { d.name = "platform:task"; }, "shape"],
  ["a fact type that states no kind", small, (d) => { d.acts.edit.fields.proof = { type: "fact", kind: [], under: "lane", required: false }; }, "shape"],
];

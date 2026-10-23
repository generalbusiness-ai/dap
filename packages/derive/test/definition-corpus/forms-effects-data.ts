/** Raw declarations and constructors from forms-effects.test.ts; no validator runs on import. */
import type { ActType, DeclaredDefinition, EffectForm, Guard } from "@generalbusiness/dap-contract";

export const text = { type: "text", max: 40 } as const;
export const size = { type: "int", min: 0, max: 9 } as const;
export const slot = { fixed: false, required: false } as const;
export const one = { fixed: true, required: true, list: false, author: false } as const;
export const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
export const fact = (...kind: string[]) => ({ type: "fact", kind, under: "cards" }) as const;
export const parent = { also: { parent: { item: "card", by: "parent" } }, fields: { parent: { type: "item", of: "card", required: true } } } as const;
export const owner: EffectForm = { party: { slot: "owner", from: { signer: true } } };
export const cleared: Guard[] = [{ equals: { a: { field: "clear" }, b: { const: true } } }];
export const change = (a: Partial<ActType>) => act({ step: "transition", on: "card", grant: "write", ...a });
export const cards: DeclaredDefinition = {
  format: "artroom-definition-1", name: "cards", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    deck: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { owner: one }, refs: {}, values: {} },
    card: {
      many: true, max: 8, states: { draft: { final: false }, done: { final: true } }, initial: "draft",
      parties: { owner: { ...one, author: true }, helper: { ...slot, list: false, author: false }, team: { ...slot, list: true, max: 3, author: false } },
      refs: { parent: { ...slot, to: { type: "item", of: "card" } } }, values: { text: { ...slot, of: text }, size: { ...slot, of: size }, tags: { ...slot, of: { type: "list", of: text, max: 2 } }, near: { ...slot, of: { type: "record", of: { card: { type: "item", of: "card", required: true } } } } },
    },
    summary: {
      many: true, max: 8, states: { made: { final: false } }, initial: "made",
      parties: { owner: one, authors: { fixed: true, required: true, list: true, max: 8, author: false } }, refs: { of: { ...slot, to: { type: "item", of: "card" } } }, values: {},
    },
  },
  acts: {
    start: act({ step: "open", on: "deck", grant: "start", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "owner", from: { field: "opener" } } }] }),
    add: act({ step: "open", on: "card", grant: "write", fields: { text: { ...text, required: false } }, effects: [owner, { value: { slot: "text", from: { field: "text" } } }] }),
    // A card that copies from its parent: a slot of another subject, into a party, a reference and two values. Its team is its own helper,
    // which an earlier effect of the same entry set.
    child: act({
      step: "open", on: "card", grant: "write", ...parent,
      effects: [
        owner, { party: { slot: "helper", from: { slot: "owner", of: "also.parent" } } }, { ref: { slot: "parent", from: { item: "also.parent" } } },
        { value: { slot: "text", from: { slot: "text", of: "also.parent" } } }, { value: { slot: "size", from: { slot: "size", of: "also.parent" } } },
        { party: { slot: "team", from: [{ slot: "helper", of: "on" }] } },
      ],
    }),
    // The size is emptied when `clear` is true, and is otherwise set from the field: an `if` and an `unless` with the same guards.
    edit: change({
      fields: { text: { ...text, required: false }, size: { ...size, required: false }, clear: { type: "bool", required: false } },
      effects: [{ value: { slot: "text", from: { field: "text" } } }, { value: { slot: "size", from: null }, if: cleared }, { value: { slot: "size", from: { field: "size" } }, unless: cleared }],
    }),
    // The second effect's condition reads the state that the first effect changes.
    finish: change({ guards: [{ state: ["draft"] }], effects: [{ state: "done" }, { value: { slot: "text", from: { const: "finished" } }, if: [{ state: ["draft"] }] }] }),
    // On the deck, with an effect on another card, which may be final.
    touch: act({
      step: "transition", on: "deck", grant: "write", also: { other: { item: "card", by: "other" } }, fields: { other: { type: "item", of: "card", required: true }, text: { ...text, required: false } },
      effects: [{ of: "also.other", value: { slot: "text", from: { field: "text" } } }],
    }),
    staff: change({ fields: { team: { type: "list", of: { type: "member" }, max: 3, required: true } }, effects: [{ party: { slot: "team", from: { field: "team" } } }] }),
    pair: change({ effects: [{ party: { slot: "team", from: [{ signer: true }, { slot: "helper" }, { slot: "owner" }] } }] }),
    // Each source is a part of the entry that `proof` names. The definition states no type for it, so the commit checks each value.
    borrow: change({
      fields: { proof: { ...fact("add", "staff"), required: true } },
      effects: [
        { value: { slot: "text", from: { field: "proof", part: { field: "text" } } } }, { party: { slot: "helper", from: { field: "proof", part: { opened: "owner" } } } },
        { party: { slot: "team", from: { field: "proof", part: { field: "team" } } } },
      ],
    }),
    misread: change({ fields: { proof: { ...fact("add"), required: true } }, effects: [{ value: { slot: "size", from: { field: "proof", part: { field: "text" } } } }] }),
    // A position is an integer, and no text states its most. The slot holds 0 to 9.
    rank: change({ fields: { proof: { ...fact("add"), required: true } }, effects: [{ value: { slot: "size", from: { field: "proof", part: "seq" } } }] }),
    sum: act({
      step: "open", on: "summary", grant: "write", ...parent, fields: { ...parent.fields, earlier: { type: "list", of: fact("sum"), max: 4, required: false }, staffed: { ...fact("staff"), required: false } },
      effects: [owner, { ref: { slot: "of", from: { item: "also.parent" } } }, {
        attribute: {
          slot: "authors", of: "also.parent", with: [
            { items: { type: "card", states: ["done"], where: [{ equals: { a: { slot: "parent" }, b: { item: "also.parent" } } }] }, slot: "team" },
            { subject: "also.parent", slot: "team" },
            { each: { field: "earlier" }, as: "e", list: { element: "e", part: { opened: "authors" } } },
            { list: { field: "staffed", part: { field: "team" } } },
          ],
        },
      }],
    }),
  },
  receives: {}, timed: {}, rules: {},
};

/** Raw declarations and constructors from forms-handlers.test.ts; no validator runs on import. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";

export const text = { type: "text", max: 100 } as const;
export const slot = { fixed: false, required: false } as const;
export const live = { open: { final: false }, done: { final: true } };
export const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
export const board: DeclaredDefinition = {
  format: "artroom-definition-1", name: "board", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    board: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { owner: { fixed: true, required: true, list: false, author: false } }, refs: { pinned: { ...slot, to: { type: "item", of: "card" } } }, values: {} },
    card: {
      many: true, max: 3, states: live, initial: "open", parties: {},
      refs: { parent: { fixed: true, required: false, to: { type: "item", of: "card" } }, postedAt: { ...slot, to: { type: "fact", kind: ["post"], under: "board" } }, peer: { ...slot, to: { type: "scope", kind: "lane" } } },
      values: { note: { ...slot, of: text }, echo: { ...slot, of: text } },
    },
    tally: { many: false, max: 1, states: { kept: { final: false }, shut: { final: true } }, initial: "kept", parties: {}, refs: {}, values: { last: { ...slot, of: text } } },
  },
  acts: {
    start: act({ step: "open", on: "board", grant: "start", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "owner", from: { field: "opener" } } }] }),
    add: act({
      step: "open", on: "card", grant: "write", fields: { parent: { type: "item", of: "card", required: false }, note: { ...text, required: true } },
      also: { parent: { item: "card", by: "parent" }, board: { item: "board", one: true } },
      guards: [{ of: "also.parent", state: ["open"], reason: "parent-done" }], effects: [{ value: { slot: "note", from: { field: "note" } } }],
    }),
    // By a local fact: the card that the named `add` entry opened.
    reply: act({
      step: "open", on: "card", grant: "write", fields: { to: { type: "fact", kind: ["add"], under: "board", required: true } }, also: { to: { item: "card", by: "to" } },
      guards: [{ of: "also.to", state: ["open"], reason: "parent-done" }],
    }),
    pin: act({ step: "transition", on: "board", grant: "write", fields: { card: { type: "item", of: "card", required: true } }, guards: [{ state: ["open"] }], effects: [{ ref: { slot: "pinned", from: { field: "card" } } }] }),
    done: act({ step: "transition", on: "card", grant: "write", guards: [{ state: ["open"] }], effects: [{ state: "done" }] }),
    shut: act({ step: "transition", on: "tally", grant: "write", guards: [{ state: ["kept"] }], effects: [{ state: "shut" }] }),
    recount: act({ step: "open", on: "tally", grant: "write" }),
    note: act({
      step: "transition", on: "card", grant: "write", fields: { note: { ...text, required: true } },
      also: { pinned: { item: "card", via: { slot: "pinned", of: "also.board" } }, board: { item: "board", one: true }, tally: { item: "tally", one: true } },
      // The guard on the tally is nested in a form. The last effect's condition reads the tally, and would hold on none.
      guards: [{ state: ["open"] }, { of: "also.pinned", state: ["open"], reason: "pinned-done" }, { anyOf: [[{ of: "also.tally", equals: { a: { slot: "last" }, b: { field: "note" } } }]], reason: "not-the-last" }],
      effects: [
        { value: { slot: "note", from: { field: "note" } } }, { of: "also.pinned", value: { slot: "note", from: { field: "note" } } },
        { value: { slot: "echo", from: { field: "note" } }, if: [{ differs: { a: { slot: "last", of: "also.tally" }, b: { field: "note" } } }] },
      ],
    }),
  },
  receives: {
    post: {
      message: "post", class: "tell", from: { kind: "lane" }, opens: "card",
      fields: {
        text: { ...text, required: true }, about: { type: "item", of: "card", required: false }, proof: { type: "fact", kind: ["link"], under: "ticket", required: false },
        // A record that names a card, and a list of such records.
        under: { type: "record", of: { card: { type: "item", of: "card", required: true } }, required: false },
        beside: { type: "list", of: { type: "record", of: { card: { type: "item", of: "card", required: true } } }, max: 2, required: false },
      },
      also: { about: { item: "card", by: "about" } },
      guards: [{ of: "also.about", state: ["open"], reason: "about-done" }, { equals: { a: { field: "proof", part: "kind" }, b: { const: "link" } }, ifPresent: true, reason: "not-a-link" }],
      effects: [{ value: { slot: "note", from: { field: "text" } } }, { ref: { slot: "postedAt", from: "self" } }], sends: [], attention: [],
    },
    count: {
      message: "count", class: "tell", from: { kind: "lane" }, opens: "tally", fields: { text: { ...text, required: true } }, also: {}, guards: [],
      effects: [{ value: { slot: "last", from: { field: "text" } } }], sends: [], attention: [],
    },
    // Opens a card and tells the lane that asked. The clause of that request changes the card, and the tally if this entry found one.
    relay: {
      message: "relay", class: "tell", from: { kind: "lane" }, opens: "card", fields: { peer: { type: "scope", kind: "lane", required: true } }, also: { tally: { item: "tally", one: true } }, guards: [],
      effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], attention: [],
      sends: [{ tell: { to: { slot: "peer" }, message: "seen", fields: {}, result: { applied: [{ value: { slot: "note", from: { const: "answered" } } }, { of: "also.tally", value: { slot: "last", from: { const: "answered" } } }] } } }],
    },
  },
  timed: {}, rules: {},
};

/** Raw declarations and constructors from forms-operand.test.ts; no validator runs on import. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";

export const fact = (...kind: string[]) => ({ type: "fact", kind, under: "asks" }) as const;
export const text = { type: "text", max: 100 } as const;
export const slot = { fixed: false, required: false } as const;
export const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
export const asks: DeclaredDefinition = {
  format: "artroom-definition-1", name: "asks", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    desk: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { owner: { fixed: true, required: true, list: false, author: false } }, refs: {}, values: {} },
    ask: {
      many: true, max: 8, states: { asked: { final: false }, answered: { final: false }, accepted: { final: true } }, initial: "asked",
      parties: { asker: { fixed: true, required: true, list: false, author: false }, watchers: { ...slot, list: true, max: 4, author: false } },
      refs: { termsAt: { fixed: false, required: true, to: fact("ask", "revise") } }, values: { text: { ...slot, of: text } },
    },
    block: { many: true, max: 8, states: { blocked: { final: false }, released: { final: true } }, initial: "blocked", parties: {}, refs: { on: { fixed: true, required: true, to: fact("ask") } }, values: {} },
  },
  acts: {
    start: act({ step: "open", on: "desk", grant: "start", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "owner", from: { field: "opener" } } }] }),
    ask: act({
      step: "open", on: "ask", grant: "ask", fields: { text: { ...text, required: true } },
      effects: [{ party: { slot: "asker", from: { signer: true } } }, { party: { slot: "watchers", from: { signer: true }, list: "add" } }, { value: { slot: "text", from: { field: "text" } } }, { ref: { slot: "termsAt", from: "self" } }],
    }),
    revise: act({
      step: "transition", on: "ask", grant: "ask", fields: { text: { ...text, required: true } }, guards: [{ state: ["asked"] }],
      effects: [{ value: { slot: "text", from: { field: "text" } } }, { ref: { slot: "termsAt", from: "self" } }],
    }),
    answer: act({ step: "transition", on: "ask", grant: "answer", guards: [{ state: ["asked"] }], effects: [{ state: "answered" }] }),
    accept: act({
      step: "transition", on: "ask", grant: "accept", fields: { terms: { ...fact("ask", "revise"), required: true } },
      guards: [{ state: ["asked", "answered"] }, { equals: { a: { field: "terms" }, b: { slot: "termsAt" } }, reason: "terms-differ" }], effects: [{ state: "accepted" }],
    }),
    block: act({ step: "open", on: "block", grant: "block", fields: { on: { ...fact("ask"), required: true } }, effects: [{ ref: { slot: "on", from: { field: "on" } } }] }),
    // Names the entry that opened a lane of asks: a genesis, whose kind is the genesis act's.
    trace: act({ step: "transition", on: "ask", grant: "ask", fields: { origin: { ...fact("start"), required: true } }, guards: [{ fact: { field: "origin" } }] }),
    "release-block": act({
      step: "transition", on: "block", grant: "block", fields: { answer: { ...fact("answer"), required: true } },
      guards: [
        { state: ["blocked"] }, { fact: { field: "answer" } },
        { equals: { a: { field: "answer", part: "scope" }, b: { slot: "on", part: "scope" } }, reason: "not-this-lane" },
        { equals: { a: { field: "answer", part: "on" }, b: { slot: "on", part: "seq" } }, reason: "not-this-ask" },
      ],
      effects: [{ state: "released" }],
    }),
  },
  receives: {}, timed: {}, rules: {},
};

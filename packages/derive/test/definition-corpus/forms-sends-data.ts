/** Raw declarations and constructors from forms-sends.test.ts; no validator runs on import. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";

export const text = { type: "text", max: 100 } as const;
export const slot = { fixed: false, required: false } as const;
export const lane = { type: "scope", kind: "lane" } as const;
export const staged = [{ of: "also.proposal", set: "staging" }] as const;
export const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
export const pull: DeclaredDefinition = {
  format: "artroom-definition-1", name: "pull", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "open",
  items: {
    proposal: {
      many: false, max: 1, states: { open: { final: false } }, initial: "open",
      parties: { author: { fixed: true, required: true, list: false, author: false }, watchers: { ...slot, list: true, max: 2, author: false } },
      refs: { staging: { ...slot, to: lane }, closed: { ...slot, to: { type: "item", of: "link" } } }, values: {},
    },
    link: {
      many: true, max: 3, states: { set: { final: false }, removed: { final: true } }, initial: "set", parties: {},
      refs: { issue: { fixed: true, required: true, to: lane }, madeAt: { fixed: true, required: true, to: { type: "fact", kind: ["link"], under: "pull" } } }, values: { how: { ...slot, of: text } },
    },
    merge: { many: true, max: 4, states: { intended: { final: false }, done: { final: true }, refused: { final: true } }, initial: "intended", parties: {}, refs: { peer: { ...slot, to: lane } }, values: {} },
  },
  acts: {
    open: act({ step: "open", on: "proposal", grant: "open", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "author", from: { field: "opener" } } }] }),
    stage: act({
      step: "transition", on: "proposal", grant: "write", fields: { staging: { ...lane, required: true }, watcher: { type: "member", required: true } }, guards: [{ state: ["open"] }],
      effects: [{ ref: { slot: "staging", from: { field: "staging" } } }, { party: { slot: "watchers", from: { field: "watcher" }, list: "add" } }],
    }),
    link: act({
      step: "open", on: "link", grant: "write", fields: { issue: { ...lane, required: true }, how: { ...text, required: false } },
      effects: [{ ref: { slot: "issue", from: { field: "issue" } } }, { ref: { slot: "madeAt", from: "self" } }, { value: { slot: "how", from: { field: "how" } } }],
    }),
    merge: act({
      step: "open", on: "merge", grant: "merge", also: { proposal: { item: "proposal", one: true }, link: { item: "link", by: "link" } },
      fields: { peer: { ...lane, required: false }, link: { type: "item", of: "link", required: false } }, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
      sends: [
        {
          tell: {
            to: { slot: "staging", of: "also.proposal" }, message: "reserve", if: staged,
            fields: {
              operation: "self", by: { signer: true }, lane: { scope: true }, intent: { intent: true }, why: { const: "ready" }, proposal: { item: "also.proposal" }, author: { slot: "author", of: "also.proposal" },
              links: { collect: { items: { type: "link", states: ["set"], where: [{ differs: { a: { slot: "how" }, b: { const: "manual" } } }] }, fields: { link: "item", state: "state", issue: "issue", how: "how" } } },
            },
            result: { refused: [{ state: "refused" }] },
          },
        },
        // Addressed by a slot of the item this entry opens, which its own effect sets.
        { tell: { to: { slot: "peer" }, message: "note", fields: {}, result: { applied: [{ state: "done" }] } } },
        // The address of the first reads the link that the act may name, and so does the condition of the second.
        { relate: { to: { slot: "issue", of: "also.link" }, name: "blocks", item: { item: "also.link" }, state: "set", detail: {}, result: {} } },
        { tell: { to: { slot: "peer" }, message: "unexplained", if: [{ equals: { a: { slot: "how", of: "also.link" }, b: { none: true } } }], fields: {}, result: {} } },
      ],
      // The watchers are told only of a merge that names a link which states how it was made.
      attention: [{ notify: { slot: "watchers", of: "also.proposal", when: "after", reason: "merging", if: [{ differs: { a: { slot: "how", of: "also.link" }, b: { none: true } } }] } }],
    }),
  },
  receives: {
    published: {
      message: "published", class: "tell", from: { kind: "lane" }, opens: null, fields: { outcome: { type: "enum", of: ["published", "refused"], required: true }, commit: { ...text, required: false } },
      also: { proposal: { item: "proposal", one: true } }, guards: [], effects: [],
      attention: [{ notify: { slot: "watchers", of: "also.proposal", when: "after", reason: "published", if: [{ equals: { a: { field: "outcome" }, b: { const: "published" } } }] } }],
      sends: [
        {
          relate: {
            each: { type: "link", states: ["set"] }, to: { slot: "issue", of: "each" }, name: "closes", item: { item: "each" }, state: "merged", if: [{ equals: { a: { field: "outcome" }, b: { const: "published" } } }],
            detail: { commit: { field: "commit" }, how: { slot: "how", of: "each" }, from: { sender: true }, by: { source: "ref" }, made: { slot: "madeAt", of: "each" }, seq: { slot: "madeAt", of: "each", part: "seq" } },
            // The clause of one send of the fan-out reads the item of that send.
            result: { applied: [{ of: "also.proposal", ref: { slot: "closed", from: { item: "each" } } }] },
          },
        },
        { tell: { to: { slot: "staging", of: "also.proposal" }, message: "unpin", if: staged, fields: { because: { const: "published" } }, result: {} } },
        { index: { fields: { merge: { field: "outcome" } } } },
      ],
    },
  },
  timed: {}, rules: {},
};

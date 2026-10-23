/** Raw declarations and constructors from forms-binding.test.ts; no validator runs on import. */

export const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
export const TICKET = { type: "fact", kind: ["merge"], under: "ticket" } as const;
export const OWNER = { equals: { a: { sender: true }, b: { slot: "owner", of: "also.job" } } } as const;
export const JOB_OF = { code: "job-of", row: "P15", item: "job", index: "ticket", key: "ticket" } as const;

/** M, of witness 18.53. The board is the item that the scope's genesis opens. */
export const M = {
  format: "artroom-definition-1", name: "platform:jobs", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "file",
  items: {
    board: {
      many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { opener: { fixed: true, required: true, list: false, author: false } },
      refs: { slot: { fixed: false, required: false, to: { type: "item", of: "job" } }, judging: { fixed: false, required: false, to: { type: "item", of: "job" } } }, values: {},
    },
    job: {
      many: true, max: 64, initial: "queued", states: { queued: { final: false }, taken: { final: false }, gone: { final: true }, done: { final: true } }, parties: {},
      refs: { ticket: { fixed: true, required: true, to: TICKET }, owner: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } }, values: {},
      indexes: ["ticket"], holds: { decisions: { stop: 1 } },
    },
  },
  acts: {
    file: { ...form, step: "open", on: "board", grant: "file", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "opener", from: { field: "opener" } } }] },
    take: { ...form, step: "transition", on: "job", grant: "take", guards: [{ state: ["queued"] }], effects: [{ state: "taken" }] },
    point: {
      ...form, step: "transition", on: "board", grant: "point", fields: { slot: { type: "item", of: "job", required: false }, judging: { type: "item", of: "job", required: false } },
      effects: [{ ref: { slot: "slot", from: { field: "slot" } } }, { ref: { slot: "judging", from: { field: "judging" } } }],
    },
  },
  receives: {
    start: {
      ...form, message: "start", class: "tell", from: { kind: "lane" }, fields: { ticket: { ...TICKET, required: true } }, opens: "job",
      effects: [{ ref: { slot: "ticket", from: { field: "ticket" } } }, { ref: { slot: "owner", from: { sender: true } } }],
    },
    stop: {
      ...form, message: "stop", class: "tell", from: { kind: "lane" }, fields: { ticket: { ...TICKET, required: true } }, opens: null,
      also: { job: JOB_OF }, bound: { of: "also.job", where: [OWNER] },
      guards: [{ ...OWNER, of: "also.job", reason: "not-owner" }, { state: ["queued"], of: "also.job", reason: "too-late" }],
      effects: [{ state: "gone", of: "also.job" }, { code: "open-stopped", row: "P15" }],
    },
  },
  timed: {}, rules: {}, outcomes: {},
};

export const M51 = {
  ...M, name: "platform:flags",
  items: {
    board: M.items.board,
    job: {
      many: true, max: 8, initial: "open", states: { open: { final: false }, busy: { final: false }, done: { final: true } }, parties: {},
      refs: { owner: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } }, values: { flagged: { fixed: false, required: true, of: { type: "bool" }, default: false } },
      holds: { decisions: { stop: 1 } },
    },
  },
  acts: { file: M.acts.file, work: { ...form, step: "transition", on: "job", grant: "work", guards: [{ state: ["open"] }], effects: [{ state: "busy" }] }, finish: { ...form, step: "transition", on: "job", grant: "work", guards: [{ state: ["open", "busy"] }], effects: [{ state: "done" }] } },
  receives: {
    start: { ...form, message: "start", class: "tell", from: { kind: "lane" }, opens: "job", effects: [{ ref: { slot: "owner", from: { sender: true } } }] },
    flag: {
      ...form, message: "flag", class: "tell", from: { kind: "lane" }, fields: { job: { type: "item", of: "job", required: true } }, opens: null, also: { job: { item: "job", by: "job" } },
      settles: { of: "also.job", sets: "flagged", in: ["open", "busy"] }, guards: [{ ...OWNER, of: "also.job", reason: "not-owner" }], effects: [{ of: "also.job", value: { slot: "flagged", from: { const: true } } }],
    },
    stop: {
      ...form, message: "stop", class: "tell", from: { kind: "lane" }, fields: { job: { type: "item", of: "job", required: true } }, opens: null, also: { job: { item: "job", by: "job" } },
      bound: { of: "also.job", where: [OWNER] }, guards: [{ state: ["open"], of: "also.job", reason: "too-late" }], effects: [{ state: "done", of: "also.job" }],
    },
  },
};

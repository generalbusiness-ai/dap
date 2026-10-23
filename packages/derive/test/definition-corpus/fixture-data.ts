/** Raw shared declarations. Importing these data does not run validation or a history. */
import type { ActType, DeclaredDefinition, Digest, Guard } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";

const d = (c: string): Digest => `sha256:${c.repeat(64)}`;

// ---------------------------------------------------------------- the lane

const text = { type: "text", max: 200 } as const;
const slot = { fixed: false, required: false } as const;
const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
const commitment = { also: { commitment: { item: "commitment", by: "commitment" } }, fields: { commitment: { type: "item", of: "commitment", required: true } } } as const;

export const lane: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "lane",
  profile: { name: "restricted", version: 1 },
  capabilities: [{ name: "hold", version: 1 }],
  genesis: "file",
  items: {
    intent: {
      many: false, max: 1, states: { open: { final: false }, closed: { final: true } }, initial: "open",
      parties: { requester: { fixed: true, required: true, list: false, author: false } }, refs: {}, values: { title: { ...slot, of: text } },
    },
    commitment: {
      many: true, max: 4, states: { offered: { final: false }, accepted: { final: false }, done: { final: true } }, initial: "offered",
      parties: { requester: { fixed: true, required: true, list: false, author: false }, performer: { ...slot, list: false, author: true } },
      refs: { intent: { fixed: true, required: true, to: { type: "item", of: "intent" } } }, values: {},
    },
    hold: {
      many: true, max: 2, states: { held: { final: false }, ended: { final: true } }, initial: "held",
      parties: { holder: { fixed: false, required: true, list: false, author: false } },
      refs: { under: { fixed: true, required: true, to: { type: "item", of: "commitment" } } },
      values: { until: { fixed: false, required: true, of: { type: "time" } }, epoch: { fixed: false, required: true, of: { type: "int", min: 1, max: 1000000 } } },
    },
    report: {
      many: true, max: 8, states: { reported: { final: false }, accepted: { final: true } }, initial: "reported",
      parties: { reporter: { fixed: true, required: true, list: false, author: false }, authors: { fixed: true, required: true, list: true, max: 8, author: false } },
      refs: { commitment: { fixed: true, required: true, to: { type: "item", of: "commitment" } } }, values: {},
    },
    link: {
      many: true, max: 3, states: { set: { final: false }, removed: { final: true } }, initial: "set",
      parties: {}, refs: { target: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } }, values: {},
    },
  },
  acts: {
    file: act({
      step: "open", on: "intent", grant: "file", fields: { title: { ...text, required: true }, opener: { type: "member", required: true } },
      effects: [{ party: { slot: "requester", from: { field: "opener" } } }, { value: { slot: "title", from: { field: "title" } } }],
    }),
    offer: act({
      step: "open", on: "commitment", grant: "offer", also: { intent: { item: "intent", by: "intent" } }, fields: { intent: { type: "item", of: "intent", required: true } },
      guards: [{ of: "also.intent", state: ["open"] }, { of: "also.intent", signer: ["requester"] }],
      effects: [{ party: { slot: "requester", from: { signer: true } } }, { ref: { slot: "intent", from: { field: "intent" } } }],
    }),
    // A handover: the one who leaves the slot is told, and so is the one who takes it.
    assign: act({
      step: "transition", on: "commitment", grant: "assign", fields: { performer: { type: "member", required: true } },
      guards: [{ state: ["offered", "accepted"] }, { signer: ["requester"] }],
      effects: [{ party: { slot: "performer", from: { field: "performer" } } }, { state: "accepted" }],
      attention: [{ notify: { slot: "performer", of: "on", when: "before", reason: "replaced" } }, { notify: { slot: "performer", of: "on", when: "after", reason: "assigned" } }],
    }),
    "take-hold": act({
      step: "open", on: "hold", grant: "hold", ...commitment,
      guards: [
        { of: "also.commitment", state: ["accepted"] }, { of: "also.commitment", signer: ["performer"] },
        { none: { type: "hold", states: ["held"], where: [{ equals: { a: { slot: "under" }, b: { field: "commitment" } } }] } },
      ],
      effects: [{ ref: { slot: "under", from: { field: "commitment" } } }, { value: { slot: "until", from: { time: { plusSeconds: 600 } } } }, { hold: { do: "open" } }],
    }),
    // By its holder, a renewal moves the end. By another member, it is a takeover, and the epoch rises.
    renew: act({
      step: "transition", on: "hold", grant: "hold", guards: [{ state: ["held"] }],
      effects: [{ value: { slot: "until", from: { time: { plusSeconds: 600 } } } }, { hold: { do: "renew" } }],
    }),
    report: act({
      step: "open", on: "report", grant: "report", ...commitment,
      guards: [{ of: "also.commitment", state: ["accepted"] }, { of: "also.commitment", signer: ["performer"] }],
      effects: [{ party: { slot: "reporter", from: { signer: true } } }, { ref: { slot: "commitment", from: { field: "commitment" } } }, { attribute: { slot: "authors", of: "also.commitment" } }],
    }),
    "accept-report": act({ step: "transition", on: "report", grant: "review", guards: [{ state: ["reported"] }, { notIn: ["authors"] }], effects: [{ state: "accepted" }] }),
    close: act({
      step: "transition", on: "intent", grant: "close",
      guards: [{ state: ["open"] }, { signer: ["requester"] }, { none: { type: "commitment", states: ["offered", "accepted"] } }],
      effects: [{ state: "closed" }], sends: [{ index: { fields: { title: { slot: "title" }, intent: "self" } } }],
    }),
    link: act({
      step: "open", on: "link", grant: "link", fields: { target: { type: "scope", kind: "lane", required: true }, about: { type: "item", of: "intent", required: true } },
      effects: [{ ref: { slot: "target", from: { field: "target" } } }],
      sends: [
        { relate: { to: { field: "target" }, name: "closes", item: "self", state: "set", detail: { about: { field: "about" } }, result: { refused: [{ state: "removed" }] } } },
        { create: { kind: "lane", definition: d("e"), fields: { parent: "self", by: { signer: true } }, result: {} } },
      ],
    }),
    remark: act({ step: "comment", on: "intent", grant: "remark", fields: { text: { ...text, required: true } } }),
  },
  receives: {},
  timed: {
    "hold-end": { on: "hold", states: ["held"], deadline: "until", effects: [{ hold: { do: "end" } }], attention: [{ notify: { slot: "holder", of: "on", when: "after", reason: "hold ended" } }] },
  },
  rules: {},
};

// ---------------------------------------------------------------- the small definition

const noteRange = (states: string[]) => ({ type: "note", states, where: [{ equals: { a: { slot: "text" }, b: { field: "text" } } }] });
const probe = (guard: Guard) => act({ step: "transition", on: "note", grant: "probe", fields: { text: { ...text, required: true } }, guards: [guard] });

export const small: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "small",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "start",
  items: {
    note: {
      many: true, max: 2, states: { draft: { final: false }, kept: { final: true } }, initial: "draft",
      parties: { owner: { fixed: true, required: true, list: false, author: true }, readers: { ...slot, list: true, max: 2, author: false } },
      refs: { peer: { ...slot, to: { type: "scope", kind: "lane" } }, me: { ...slot, to: { type: "item", of: "note" } } },
      values: { text: { ...slot, of: text }, due: { ...slot, of: { type: "time" } } },
    },
  },
  acts: {
    start: act({ step: "open", on: "note", grant: "start", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "owner", from: { field: "opener" } } }] }),
    // `owner` is optional, so an opening can leave the required slot unset: refused when judged, not by the validator.
    write: act({
      step: "open", on: "note", grant: "write", fields: { owner: { type: "member", required: false }, text: { ...text, required: false }, due: { type: "time", required: false } },
      effects: [{ party: { slot: "owner", from: { field: "owner" } } }, { value: { slot: "text", from: { field: "text" } } }, { value: { slot: "due", from: { field: "due" } } }],
    }),
    edit: act({
      step: "transition", on: "note", grant: "edit", also: { other: { item: "note", by: "other" } },
      fields: { text: { ...text, required: true }, other: { type: "item", of: "note", required: true }, notes: { type: "list", of: { type: "item", of: "note" }, max: 4, required: false } },
      guards: [{ state: ["draft"] }, { equals: { a: { slot: "owner" }, b: { signer: true } } }, { before: { slot: "due" } }, { every: { list: "notes", states: ["kept"] }, ifPresent: true }],
      effects: [{ value: { slot: "text", from: { field: "text" } } }],
    }),
    late: act({ step: "transition", on: "note", grant: "edit", guards: [{ state: ["draft"] }, { after: { slot: "due" } }], effects: [{ value: { slot: "text", from: { const: "late" } } }] }),
    keep: act({ step: "transition", on: "note", grant: "keep", guards: [{ state: ["draft"] }], effects: [{ state: "kept" }] }),
    share: act({ step: "transition", on: "note", grant: "share", fields: { reader: { type: "member", required: true } }, guards: [{ state: ["draft"] }], effects: [{ party: { slot: "readers", from: { field: "reader" }, list: "add" } }] }),
    // Names a foreign fact: an `assign` entry of a lane, whose performer must be the signer.
    cite: act({
      step: "transition", on: "note", grant: "edit", fields: { proof: { type: "fact", kind: ["assign"], under: "lane", required: true } },
      guards: [{ state: ["draft"] }, { fact: { field: "proof", where: [{ equals: { a: { field: "performer" }, b: { signer: true } } }] } }],
      effects: [{ party: { slot: "readers", from: { field: "proof", part: { field: "performer" } }, list: "add" } }],
    }),
    // Two relate sends that are written differently and resolve to one key: `self`, and a slot that holds the opened item.
    echo: act({
      step: "open", on: "note", grant: "write", fields: { peer: { type: "scope", kind: "lane", required: true } },
      effects: [{ party: { slot: "owner", from: { signer: true } } }, { ref: { slot: "me", from: "self" } }, { ref: { slot: "peer", from: { field: "peer" } } }],
      sends: [
        { relate: { to: { field: "peer" }, name: "mirrors", item: "self", state: "set", detail: {}, result: {} } },
        { relate: { to: { slot: "peer" }, name: "mirrors", item: { slot: "me" }, state: "removed", detail: {}, result: {} } },
      ],
    }),
    // One act for each range guard, over kept notes, which are retained final items that `max` does not bound.
    has: probe({ some: noteRange(["kept"]) }),
    lacks: probe({ none: noteRange(["kept"]) }),
    few: probe({ count: { ...noteRange(["kept"]), max: 1 } }),
    enough: probe({ count: { ...noteRange(["kept"]), min: 2 } }),
  },
  receives: {},
  timed: {},
  rules: {},
};

const body = { type: "text", max: 40, detached: true } as const;
const noted = (a: Partial<ActType> & Pick<ActType, "step" | "grant">): ActType => act({ on: "note", ...a });
/** One note with a detached body, an act that writes it, one that redacts it, one that sends it to a lane, and one that is presented a `write` entry. */
export const notes: DeclaredDefinition = {
  format: "artroom-definition-1", name: "notes", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    note: {
      many: true, max: 8, states: { kept: { final: false }, struck: { final: true } }, initial: "kept", parties: {},
      refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } },
      values: { body: { fixed: false, required: false, of: body }, title: { fixed: false, required: false, of: { type: "text", max: 40 } } },
    },
  },
  acts: {
    start: noted({ step: "open", grant: "start" }),
    write: noted({ step: "transition", grant: "write", fields: { body: { ...body, required: true }, title: { type: "text", max: 40, required: false } }, guards: [{ state: ["kept"] }], effects: [{ value: { slot: "body", from: { field: "body" } } }] }),
    strike: noted({ step: "transition", grant: "strike", guards: [{ state: ["kept"] }], effects: [{ state: "struck" }, { redact: { slot: "body" } }] }),
    tell: noted({ step: "transition", grant: "write", guards: [{ state: ["kept"] }], sends: [{ tell: { to: { slot: "peer" }, message: "noted", fields: { body: { slot: "body" } }, result: {} } }] }),
    vouch: noted({ step: "transition", grant: "write", presents: { proof: { kind: ["write"], under: "notes", required: true } }, guards: [{ state: ["kept"] }, { fact: { presented: "proof" } }] }),
  },
  receives: {}, timed: {}, rules: {},
};

// ---------------------------------------------------------------- a parent and its child

/**
 * A ticket: the lane a desk creates. Its genesis refuses the title "refuse",
 * and sends its creator an index row.
 * `link` and `unlink` send the two updates of one relationship key; the
 * handler for the relationship `closes` writes the update's state on the
 * lane's one intent, and keeps a copy for two keys. A link may name the
 * entry that filed a ticket as its cause, which the receiver fetches. `ask`
 * tells the desk to make another ticket, and `split` creates one itself,
 * under its own definition. `approve` is under a rule: its signer is not the
 * requester.
 */
const filed = { type: "fact", kind: ["file"], under: "ticket" } as const;
export const ticket: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "ticket",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "file",
  items: {
    intent: {
      many: false, max: 1, states: { open: { final: false }, closed: { final: true } }, initial: "open",
      parties: { requester: { fixed: true, required: true, list: false, author: false } }, refs: {}, values: { title: { ...slot, of: text }, linked: { ...slot, of: text } },
    },
    link: {
      many: true, max: 3, states: { set: { final: false }, removed: { final: true } }, initial: "set", parties: {},
      refs: { target: { fixed: true, required: true, to: { type: "scope", kind: "lane" } }, me: { fixed: true, required: true, to: { type: "item", of: "link" } } }, values: {},
    },
    request: {
      many: true, max: 4, states: { asked: { final: false }, answered: { final: true }, failed: { final: true } }, initial: "asked", parties: {},
      refs: { desk: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } }, values: {},
    },
    part: { many: true, max: 4, states: { asked: { final: false }, created: { final: true }, refused: { final: true } }, initial: "asked", parties: {}, refs: {}, values: {} },
  },
  acts: {
    file: act({
      step: "open", on: "intent", grant: "file", fields: { title: { ...text, required: true }, opener: { type: "member", required: true } },
      guards: [{ differs: { a: { field: "title" }, b: { const: "refuse" } } }],
      effects: [{ party: { slot: "requester", from: { field: "opener" } } }, { value: { slot: "title", from: { field: "title" } } }],
      sends: [{ index: { fields: { title: { field: "title" } } } }],
    }),
    link: act({
      step: "open", on: "link", grant: "link", fields: { target: { type: "scope", kind: "lane", required: true }, about: { type: "int", min: 0, max: 1000, required: true }, because: { ...filed, required: false } },
      effects: [{ ref: { slot: "target", from: { field: "target" } } }, { ref: { slot: "me", from: "self" } }],
      sends: [{ relate: { to: { field: "target" }, name: "closes", item: "self", state: "set", detail: { about: { field: "about" }, because: { field: "because" } }, result: {} } }],
    }),
    unlink: act({
      step: "transition", on: "link", grant: "link", guards: [{ state: ["set"] }], effects: [{ state: "removed" }],
      sends: [{ relate: { to: { slot: "target" }, name: "closes", item: { slot: "me" }, state: "removed", detail: { about: { const: 0 } }, result: {} } }],
    }),
    ask: act({
      step: "open", on: "request", grant: "ask", fields: { desk: { type: "scope", kind: "directory", required: true } },
      effects: [{ ref: { slot: "desk", from: { field: "desk" } } }],
      sends: [{ tell: { to: { slot: "desk" }, message: "spawn", fields: { opener: { signer: true }, title: { const: "same" } }, result: { applied: [{ state: "answered" }], undelivered: [{ state: "failed" }] } } }],
    }),
    approve: act({ step: "transition", on: "intent", grant: "approve", guards: [{ state: ["open"] }, { rule: "two-eyes" }], effects: [{ state: "closed" }] }),
    // A part of this ticket is a ticket of its own, created under this scope's own definition.
    split: act({
      step: "open", on: "part", grant: "split", fields: { title: { ...text, required: true } },
      sends: [{ create: { kind: "lane", definition: "self", fields: { opener: { signer: true }, title: { field: "title" } }, result: { applied: [{ state: "created" }], refused: [{ state: "refused" }] } } }],
    }),
  },
  receives: {
    closes: {
      message: "closes", class: "relate", from: { kind: "lane" }, copies: 2, opens: null,
      fields: { about: { type: "int", min: 0, max: 1000, required: true }, because: { ...filed, required: false } },
      also: { intent: { item: "intent", one: true } }, guards: [],
      effects: [{ of: "also.intent", value: { slot: "linked", from: { update: "state" } } }], sends: [], attention: [],
    },
  },
  timed: {},
  rules: { "two-eyes": "signer.member != subjects.on.parties.requester.member" },
};

const makeTicket = { kind: "lane", definition: definitionDigest(ticket) } as const;

/**
 * A desk: a directory. `open-issue` creates a ticket, and each clause of the
 * creation moves the issue. The handler for `spawn` creates a ticket for a
 * lane that asks. The handler for `echo` sends two updates that resolve to
 * one relationship key when its two fields name one item.
 */
export const desk: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "desk",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "found",
  items: {
    repo: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {}, refs: {}, values: { source: { fixed: true, required: true, of: text } } },
    issue: {
      many: true, max: 8, states: { asked: { final: false }, created: { final: false }, refused: { final: true }, conflicted: { final: true } }, initial: "asked",
      parties: {}, refs: {}, values: { title: { ...slot, of: text } },
    },
  },
  acts: {
    "found": act({ step: "open", on: "repo", grant: "found", fields: { source: { ...text, required: true } }, effects: [{ value: { slot: "source", from: { field: "source" } } }] }),
    "open-issue": act({
      step: "open", on: "issue", grant: "open-issue", fields: { title: { ...text, required: true } }, effects: [{ value: { slot: "title", from: { field: "title" } } }],
      sends: [{ create: { ...makeTicket, fields: { opener: { signer: true }, title: { field: "title" } }, result: { applied: [{ state: "created" }], refused: [{ state: "refused" }], conflict: [{ state: "conflicted" }] } } }],
    }),
  },
  receives: {
    spawn: {
      message: "spawn", class: "tell", from: { kind: "lane" }, opens: null, also: {}, guards: [], effects: [], attention: [],
      fields: { opener: { type: "member", required: true }, title: { ...text, required: true } },
      sends: [{ create: { ...makeTicket, fields: { opener: { field: "opener" }, title: { field: "title" } }, result: {} } }],
    },
    echo: {
      message: "echo", class: "tell", from: { kind: "lane" }, opens: null, also: {}, guards: [], effects: [], attention: [],
      fields: { peer: { type: "scope", kind: "lane", required: true }, a: { type: "item", of: "repo", required: true }, b: { type: "item", of: "repo", required: true } },
      sends: (["a", "b"] as const).map((item) => ({ relate: { to: { field: "peer" }, name: "mirrors", item: { field: item }, state: "set", detail: {}, result: {} } })),
    },
  },
  timed: {},
  rules: {},
};

/**
 * Declarations of version 1 of the sequenced level (sequenced note, sections 5.2 and 5.11), shared by the form witnesses in
 * `forms-sequenced.test.ts` and the positive corpus. Each admitted form has one function, and each named misuse is that form
 * with one change.
 */
import type { ActType, DeclaredDefinition, Guard, ReceiveType } from "@generalbusiness/dap-contract";

const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType =>
  ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });

/** A member of a group: a tally that its acts count, and a peer it tells. Sequenced unless `sequenced` is false. */
export function sequencedBase(sequenced = true): DeclaredDefinition {
  return {
    format: "artroom-definition-1",
    ...(sequenced ? { level: { name: "sequenced", version: 1 } as const } : {}),
    name: "sequenced-member",
    profile: { name: "restricted", version: 1 },
    capabilities: [],
    genesis: "found",
    items: {
      tally: {
        many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {},
        refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } },
        values: { count: { fixed: false, required: true, of: { type: "int", min: 0, max: 1000 }, default: 0 } },
      },
    },
    acts: {
      found: act({ step: "open", on: "tally", grant: "found" }),
      count: act({ step: "transition", on: "tally", grant: "count", guards: [{ state: ["open"] }], effects: [{ value: { slot: "count", from: { const: 1 } } }] }),
    },
    receives: {},
    timed: {},
    rules: {},
  };
}

/** The read that each `read` row binds: the open tallies of the member `left`. */
const leftTallies = { member: "left", items: { type: "tally", states: ["open"] } };

/** One row for each admitted form. */
export const sequencedForms = {
  /** The level alone: a definition of the sequenced level whose acts are not marked. */
  level: () => sequencedBase(),
  /** The mark on an act, with no read. */
  mark: () => {
    const d = sequencedBase();
    d.acts["count"]!.sequenced = true;
    return d;
  },
  /** `reads` on a marked act, with the most entries, and no `read` operand. */
  reads: () => {
    const d = sequencedBase();
    d.acts["count"] = { ...d.acts["count"]!, sequenced: true, reads: Object.fromEntries(["a", "b", "c", "d"].map(name => [name, { member: name, items: { type: "tally", states: ["open"] } }])) };
    return d;
  },
  /** A `read` operand as the list of `each`, `has`, `distinct` and `sameSet`, with element members read inside them. */
  read: () => withRead([
    { each: { list: { read: "left" }, as: "t", guards: [{ differs: { a: { element: "t.state" }, b: { const: "closed" } } }] } },
    { has: { list: { read: "left" }, as: "t", where: [{ equals: { a: { element: "t.state" }, b: { const: "open" } } }] } },
    { distinct: { list: { read: "left" }, as: "t", key: { element: "t.id" } } },
    { sameSet: { list: { read: "left" }, as: "t", key: { element: "t.id" }, items: { type: "tally", states: ["open"] } } },
  ]),
  /** A `read` operand in the condition of an effect. */
  readInEffect: () => {
    const d = withRead([]);
    d.acts["count"]!.effects = [{ value: { slot: "count", from: { const: 2 } }, if: [{ has: { list: { read: "left" }, as: "t", where: [{ equals: { a: { element: "t.values.count" }, b: { const: 0 } } }] } }] }];
    return d;
  },
};

/** A marked `count` that reads the member `left`, with these guards beside its state guard. */
function withRead(guards: readonly Guard[]): DeclaredDefinition {
  const d = sequencedBase();
  d.acts["count"] = { ...d.acts["count"]!, sequenced: true, reads: { left: leftTallies }, guards: [{ state: ["open"] }, ...guards] };
  return d;
}

/** A handler that a member could hold: a `tell` from a lane that sets the peer. */
const handler = (): ReceiveType => ({
  message: "hello", class: "tell", from: { kind: "lane" }, fields: {}, opens: null, also: { tally: { item: "tally", one: true } },
  guards: [], effects: [{ of: "also.tally", ref: { slot: "peer", from: { sender: true } } }], sends: [], attention: [],
});

/** Each named misuse, as an admitted declaration and the same declaration with the misuse. */
export const sequencedMisuses = {
  /** Version 1 marks acts only. */
  markOnHandler: {
    admitted: () => ({ ...sequencedBase(), receives: { hello: handler() } }),
    refused: () => ({ ...sequencedBase(), receives: { hello: { ...handler(), sequenced: true } as ReceiveType } }),
  },
  /** Version 1 reads every member at P - 1. */
  staleness: {
    admitted: () => withRead([]),
    refused: () => {
      const d = withRead([]);
      d.acts["count"]!.reads = { left: { ...leftTallies, staleness: { seconds: 60 } } };
      return d;
    },
  },
  /** Creation lineage does not read through a commit entry yet. */
  createInSequencedAct: {
    admitted: () => withCreate(false),
    refused: () => withCreate(true),
  },
  /** A `read` names a cut, which only a sequenced act has. */
  readOutsideSequencedAct: {
    admitted: () => withRead([{ has: { list: { read: "left" }, as: "t", where: [{ equals: { a: { element: "t.id" }, b: { const: 0 } } }] } }]),
    refused: () => {
      const d = withRead([{ has: { list: { read: "left" }, as: "t", where: [{ equals: { a: { element: "t.id" }, b: { const: 0 } } }] } }]);
      const { sequenced: _sequenced, reads: _reads, ...plain } = d.acts["count"]!;
      d.acts["count"] = plain;
      return d;
    },
  },
  /** `reads` belongs to a sequenced input. */
  readsWithoutMark: {
    admitted: () => withRead([]),
    refused: () => {
      const d = withRead([]);
      delete d.acts["count"]!.sequenced;
      return d;
    },
  },
};

/** A `count` that creates a lane child, marked sequenced or not. */
function withCreate(sequenced: boolean): DeclaredDefinition {
  const d = sequencedBase();
  d.acts["count"] = {
    ...d.acts["count"]!, ...(sequenced ? { sequenced: true as const } : {}),
    sends: [{ create: { kind: "lane", definition: "self", fields: {}, result: {} } }],
  };
  return d;
}

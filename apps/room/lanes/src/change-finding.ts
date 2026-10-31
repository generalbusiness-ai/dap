/**
 * The finding successor of the workspace Change definition (plan 032, section
 * 2f, decision 2). Existing lanes keep their pins. It adds one item type,
 * four acts and one merge guard, and changes no other row.
 *
 * A source is a row of the rules' `checks`: its `name` is the source's name and
 * its `checker` is the one member who files for it. A row with `required: true`
 * is a required source. No platform definition changes.
 *
 * A finding is review input. It adds no `review` item, so no approval counts it
 * and `reserve` does not carry it. The guard stands in the lane alone. For that
 * reason, no act on a finding waits for a merge in progress: a late finding
 * holds the next merge if this one is refused.
 */
import { changeJ4 } from "./j4.ts";
import type { LaneDefinition } from "./shared.ts";

/** The version a finding describes. A one-file version states no tree, so it takes no finding. */
const version = { type: "fact", kind: ["propose-manifest"], under: "change" } as const;

/** The most findings of one change that wait for an answer. */
const OPEN_FINDINGS = 256;

const finding = {
  many: true, max: OPEN_FINDINGS, initial: "open",
  states: { open: { final: false }, resolved: { final: true }, irrelevant: { final: true } },
  parties: {
    reporter: { fixed: true, required: true, list: false, author: false },
    answeredBy: { fixed: false, required: false, list: false, author: false },
  },
  refs: { version: { fixed: true, required: true, to: version } },
  values: {
    file: { fixed: true, required: true, of: { type: "text", max: 1024 } },
    start: { fixed: true, required: true, of: { type: "int", min: 1, max: 1000000000 } },
    end: { fixed: true, required: true, of: { type: "int", min: 1, max: 1000000000 } },
    class: { fixed: true, required: true, of: { type: "text", max: 64 } },
    severity: { fixed: true, required: true, of: { type: "enum", of: ["low", "medium", "high", "critical"] } },
    confidence: { fixed: true, required: true, of: { type: "int", min: 0, max: 100 } },
    scenario: { fixed: true, required: true, of: { type: "text", max: 4096 } },
    source: { fixed: true, required: true, of: { type: "text", max: 128 } },
    sourceVersion: { fixed: true, required: true, of: { type: "text", max: 128 } },
    tree: { fixed: true, required: true, of: { type: "tree" } },
    answer: { fixed: false, required: false, of: { type: "text", max: 4096 } },
  },
} as const;

const fileFinding = {
  step: "open", on: "finding", grant: "change.check",
  also: { proposal: { item: "proposal", one: true }, rules: { item: "rules", one: true } },
  fields: {
    version: { ...version, required: true },
    file: { type: "text", max: 1024, required: true },
    start: { type: "int", min: 1, max: 1000000000, required: true },
    end: { type: "int", min: 1, max: 1000000000, required: true },
    class: { type: "text", max: 64, required: true },
    severity: { type: "enum", of: ["low", "medium", "high", "critical"], required: true },
    confidence: { type: "int", min: 0, max: 100, required: true },
    scenario: { type: "text", max: 4096, required: true },
    source: { type: "text", max: 128, required: true },
    sourceVersion: { type: "text", max: 128, required: true },
    tree: { type: "tree", required: true },
  },
  guards: [
    { state: ["draft", "open"], of: "also.proposal" },
    { fact: { field: "version" } },
    { equals: { a: { field: "version", part: "scope" }, b: { scope: true } }, reason: "not-this-change" },
    { equals: { a: { field: "version", part: { field: "tree" } }, b: { field: "tree" } }, reason: "not-this-version" },
    {
      has: {
        list: { slot: "checks", of: "also.rules" },
        as: "k",
        where: [{ equals: { a: { element: "k.name" }, b: { field: "source" } } }, { equals: { a: { element: "k.checker" }, b: { signer: true } } }],
      },
      reason: "not-the-source",
    },
    // The version is no part of a finding's identity, so a re-review of a later version does not raise it again. A resolved finding that
    // a source finds again is a new finding. An irrelevant one stays answered.
    {
      none: {
        type: "finding",
        states: ["open", "irrelevant"],
        where: [
          { equals: { a: { slot: "source" }, b: { field: "source" } } },
          { equals: { a: { slot: "file" }, b: { field: "file" } } },
          { equals: { a: { slot: "start" }, b: { field: "start" } } },
          { equals: { a: { slot: "end" }, b: { field: "end" } } },
          { equals: { a: { slot: "class" }, b: { field: "class" } } },
        ],
      },
      reason: "finding-exists",
    },
  ],
  effects: [
    { party: { slot: "reporter", from: { signer: true } } },
    { ref: { slot: "version", from: { field: "version" } } },
    ...(["file", "start", "end", "class", "severity", "confidence", "scenario", "source", "sourceVersion", "tree"] as const).map((slot) => ({ value: { slot, from: { field: slot } } })),
  ],
  sends: [],
  attention: [],
} as const;

const answer = { answer: { type: "text", max: 4096, required: true } } as const;
const answered = (state: "resolved" | "irrelevant") => [
  { state },
  { party: { slot: "answeredBy", from: { signer: true } } },
  { value: { slot: "answer", from: { field: "answer" } } },
] as const;

/** An answer by a holder of `change.dismiss`, who sets review input aside as `dismiss-review` does. The change's own author never clears a finding on it. */
const answerAny = (state: "resolved" | "irrelevant") => ({
  step: "transition", on: "finding", grant: "change.dismiss",
  also: { proposal: { item: "proposal", one: true }, manifest: { item: "manifest", via: { slot: "version", of: "on" } } },
  fields: answer,
  guards: [
    { state: ["open"] },
    { notIn: ["author"], of: "also.proposal", reason: "author-cannot-answer" },
    { notIn: ["authors"], of: "also.manifest", reason: "author-cannot-answer" },
  ],
  effects: answered(state),
  sends: [],
  attention: [],
} as const);

export const changeFinding = {
  ...changeJ4,
  items: { ...changeJ4.items, finding },
  acts: {
    ...changeJ4.acts,
    "file-finding": fileFinding,
    // The source's re-review no longer finds it. The source withdraws only its own input, and it could have filed nothing.
    "resolve-finding-own": {
      step: "transition", on: "finding", grant: "change.check",
      also: {},
      fields: answer,
      guards: [{ state: ["open"] }, { signer: ["reporter"] }],
      effects: answered("resolved"),
      sends: [],
      attention: [],
    },
    "resolve-finding-any": answerAny("resolved"),
    // That a source was wrong is a judgment about the source, so the source does not make it.
    "mark-finding-irrelevant": answerAny("irrelevant"),
    merge: {
      ...changeJ4.acts.merge,
      guards: [
        ...changeJ4.acts.merge.guards,
        // Across every version of this change: a finding carries until it is answered.
        {
          each: {
            list: { slot: "checks", of: "also.rules" },
            as: "k",
            where: [{ equals: { a: { element: "k.required" }, b: { const: true } } }],
            guards: [{ none: { type: "finding", states: ["open"], where: [{ equals: { a: { slot: "source" }, b: { element: "k.name" } } }] } }],
          },
          reason: "finding-open",
        },
      ],
    },
  },
} as const satisfies LaneDefinition;

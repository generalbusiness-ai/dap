/** Versioned questions under the existing declared forms. Historical issue
 * bytes and the other opt-in profiles remain unchanged. */
import type { FieldType, ItemType, Where } from "@generalbusiness/dap-contract";
import type { LaneDefinition } from "./shared.ts";
import { issue } from "./issue.ts";

export const issueQuestions = JSON.parse(JSON.stringify(issue)) as LaneDefinition;

const bodyAt = { type: "fact", kind: ["ask", "revise-ask"], under: "issue" } as const satisfies FieldType;
const commentAbout = { type: "fact", kind: ["ask", "revise-ask", "approve", "decide"], under: "issue" } as const satisfies FieldType;
const member = { fixed: true, required: true, list: false, author: false } as const;
const askRef = { fixed: true, required: true, to: { type: "item", of: "ask" } } as const;
const bodyRef = { fixed: true, required: true, to: bodyAt } as const;

issueQuestions.items["ask"] = {
  many: true, max: 64, initial: "asked",
  states: { asked: { final: false }, decided: { final: true }, withdrawn: { final: true } },
  parties: { asker: member },
  refs: {
    bodyAt: { fixed: false, required: true, to: bodyAt },
    decisionAt: { fixed: false, required: false, to: { type: "fact", kind: ["decide"], under: "issue" } },
  },
  values: {
    question: { fixed: true, required: true, of: { type: "text", max: 4096 } },
    body: { fixed: false, required: true, of: { type: "text", max: 65536, detached: true } },
    decisionComment: { fixed: false, required: false, of: { type: "text", max: 4096 } },
  },
};
issueQuestions.items["approval-request"] = {
  many: true, max: 64, initial: "open",
  states: { open: { final: false }, met: { final: true }, withdrawn: { final: true } },
  parties: { requested: member, requester: member },
  refs: { ask: askRef, bodyAt: bodyRef },
  values: {},
};
issueQuestions.items["approval"] = {
  many: true, max: 256, initial: "submitted",
  states: { submitted: { final: false } },
  parties: { approver: member },
  refs: {
    ask: askRef, bodyAt: bodyRef,
    request: { fixed: true, required: true, to: { type: "item", of: "approval-request" } },
  },
  values: {
    verdict: { fixed: true, required: true, of: { type: "enum", of: ["approve", "request-changes"] } },
    comment: { fixed: true, required: false, of: { type: "text", max: 65536, detached: true } },
  },
} satisfies ItemType;

issueQuestions.acts["ask"] = {
  step: "open", on: "ask", grant: "issue.comment", also: {},
  fields: {
    question: { type: "text", max: 4096, required: true },
    body: { type: "text", max: 65536, detached: true, required: true },
  },
  guards: [],
  effects: [
    { party: { slot: "asker", from: { signer: true } } },
    { value: { slot: "question", from: { field: "question" } } },
    { value: { slot: "body", from: { field: "body" } } },
    { ref: { slot: "bodyAt", from: "self" } },
  ],
  sends: [], attention: [],
};
delete issueQuestions.acts["answer"];
delete issueQuestions.acts["settle-ask"];
issueQuestions.acts["withdraw-ask"]!.guards = [
  { state: ["asked"] }, { signer: ["asker"] },
];

issueQuestions.acts["revise-ask"] = {
  step: "transition", on: "ask", grant: "issue.comment", also: {},
  fields: { bodyAt: { ...bodyAt, required: true }, body: { type: "text", max: 65536, detached: true, required: true } },
  guards: [
    { state: ["asked"] }, { signer: ["asker"] },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt" } }, reason: "stale-question" },
  ],
  effects: [
    { value: { slot: "body", from: { field: "body" } } },
    { ref: { slot: "bodyAt", from: "self" } },
  ],
  sends: [], attention: [],
};

issueQuestions.acts["request-approval"] = {
  step: "open", on: "approval-request", grant: "issue.comment",
  also: { ask: { item: "ask", by: "ask" } },
  fields: {
    ask: { type: "item", of: "ask", required: true },
    bodyAt: { ...bodyAt, required: true }, requested: { type: "member", required: true },
  },
  guards: [
    { state: ["asked"], of: "also.ask" }, { signer: ["asker"], of: "also.ask" },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt", of: "also.ask" } }, reason: "stale-question" },
    { none: { type: "approval-request", states: ["open"], where: [
      { equals: { a: { slot: "ask" }, b: { item: "also.ask" } } },
      { equals: { a: { slot: "bodyAt" }, b: { field: "bodyAt" } } },
      { equals: { a: { slot: "requested" }, b: { field: "requested" } } },
    ] }, reason: "request-exists" },
  ],
  effects: [
    { party: { slot: "requested", from: { field: "requested" } } },
    { party: { slot: "requester", from: { signer: true } } },
    { ref: { slot: "ask", from: { item: "also.ask" } } },
    { ref: { slot: "bodyAt", from: { field: "bodyAt" } } },
  ],
  sends: [],
  attention: [{ notify: { slot: "requested", of: "on", when: "after", reason: "approval-requested" } }],
};

issueQuestions.acts["withdraw-approval-request"] = {
  step: "transition", on: "approval-request", grant: "issue.comment",
  also: { ask: { item: "ask", via: { of: "on", slot: "ask" } } },
  fields: { bodyAt: { ...bodyAt, required: true } },
  guards: [
    { state: ["open"], reason: "request-closed" }, { signer: ["requester"] },
    { state: ["asked"], of: "also.ask" },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt" } }, reason: "stale-question" },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt", of: "also.ask" } }, reason: "stale-question" },
  ],
  effects: [{ state: "withdrawn" }], sends: [], attention: [],
};

issueQuestions.acts["approve"] = {
  step: "open", on: "approval", grant: "issue.approve",
  also: {
    request: { item: "approval-request", by: "request" },
    ask: { item: "ask", via: { of: "also.request", slot: "ask" } },
  },
  fields: {
    request: { type: "item", of: "approval-request", required: true },
    bodyAt: { ...bodyAt, required: true },
    verdict: { type: "enum", of: ["approve", "request-changes"], required: true },
    comment: { type: "text", max: 65536, detached: true, required: false },
  },
  guards: [
    { state: ["asked"], of: "also.ask" },
    { signer: ["requested"], of: "also.request", reason: "not-requested" },
    { state: ["open"], of: "also.request", reason: "request-closed" },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt", of: "also.request" } }, reason: "stale-question" },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt", of: "also.ask" } }, reason: "stale-question" },
    { notIn: ["asker"], of: "also.ask", reason: "asker-cannot-approve" },
  ],
  effects: [
    { party: { slot: "approver", from: { signer: true } } },
    { ref: { slot: "ask", from: { item: "also.ask" } } },
    { ref: { slot: "bodyAt", from: { field: "bodyAt" } } },
    { ref: { slot: "request", from: { item: "also.request" } } },
    { value: { slot: "verdict", from: { field: "verdict" } } },
    { value: { slot: "comment", from: { field: "comment" } } },
    { state: "met", of: "also.request" },
  ],
  sends: [],
  attention: [{ notify: { slot: "asker", of: "also.ask", when: "after", reason: "question-reviewed" } }],
};

// Old requests and verdicts remain recorded. Only the current text counts.
const currentQuestion: Where[] = [
  { equals: { a: { slot: "ask" }, b: { item: "on" } } },
  { equals: { a: { slot: "bodyAt" }, b: { slot: "bodyAt", of: "on" } } },
];
issueQuestions.acts["decide"] = {
  step: "transition", on: "ask", grant: "issue.decide", also: {},
  fields: { bodyAt: { ...bodyAt, required: true }, comment: { type: "text", max: 4096, required: false } },
  guards: [
    { state: ["asked"] },
    { equals: { a: { field: "bodyAt" }, b: { slot: "bodyAt" } }, reason: "stale-question" },
    { none: { type: "approval-request", states: ["open"], where: currentQuestion }, reason: "approval-pending" },
    { none: { type: "approval", states: ["submitted"], where: [
      ...currentQuestion, { equals: { a: { slot: "verdict" }, b: { const: "request-changes" } } },
    ] }, reason: "changes-requested" },
    { count: { type: "approval", states: ["submitted"], where: [
      ...currentQuestion, { equals: { a: { slot: "verdict" }, b: { const: "approve" } } },
    ], min: 1 }, reason: "approval-needed" },
  ],
  effects: [
    { state: "decided" }, { ref: { slot: "decisionAt", from: "self" } },
    { value: { slot: "decisionComment", from: { field: "comment" } } },
  ],
  sends: [],
  attention: [{ notify: { slot: "asker", of: "on", when: "after", reason: "decided" } }],
};

issueQuestions.items["comment"]!.refs["about"] = { fixed: true, required: false, to: commentAbout };
issueQuestions.acts["comment"]!.fields["about"] = { ...commentAbout, required: false };
issueQuestions.acts["comment"]!.guards = [{ anyOf: [
  [{ equals: { a: { field: "about" }, b: { none: true } } }],
  [{ fact: { field: "about" } }],
], reason: "not-a-question-entry" }];
issueQuestions.acts["comment"]!.effects = [
  ...issueQuestions.acts["comment"]!.effects,
  { ref: { slot: "about", from: { field: "about" } } },
];

issueQuestions.items["block"]!.refs["releasedBy"] = {
  fixed: false, required: false, to: { type: "fact", kind: ["decide"], under: "issue" },
};
issueQuestions.acts["release-block"]!.fields["answer"] = {
  type: "fact", kind: ["decide"], under: "issue", required: true,
};

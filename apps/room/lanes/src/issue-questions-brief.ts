/** Opt-in Question profile with one immutable Brief digest per ask.
 * This adds declaration data using existing forms, not kernel judge code. */
import type { LaneDefinition } from "./shared.ts";
import { issueQuestions } from "./issue-questions.ts";

export const issueQuestionsBrief = JSON.parse(JSON.stringify(issueQuestions)) as LaneDefinition;

issueQuestionsBrief.items["ask"]!.values["brief"] = {
  fixed: true, required: true, of: { type: "digest" },
};
issueQuestionsBrief.acts["ask"]!.fields["brief"] = { type: "digest", required: true };
issueQuestionsBrief.acts["ask"]!.effects = [
  ...issueQuestionsBrief.acts["ask"]!.effects,
  { value: { slot: "brief", from: { field: "brief" } } },
];

// The optional field compares provenance. It never supplies an update.
issueQuestionsBrief.acts["revise-ask"]!.fields["brief"] = { type: "digest", required: false };
issueQuestionsBrief.acts["revise-ask"]!.guards = [
  ...issueQuestionsBrief.acts["revise-ask"]!.guards,
  {
    anyOf: [
      [{ equals: { a: { field: "brief" }, b: { none: true } } }],
      [{ equals: { a: { field: "brief" }, b: { slot: "brief" } } }],
    ],
    reason: "brief-fixed",
  },
];

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { capabilitiesOf, counted, derivable, gitRead, holdCapability, validateDefinition } from "@generalbusiness/dap-derive";
import { issueQuestions } from "../src/issue-questions.ts";
import { QUESTION_DIGESTS } from "../src/digests-questions.ts";
import { issueQuestionsBrief } from "../src/issue-questions-brief.ts";
import { QUESTION_BRIEF_DIGESTS } from "../src/digests-questions-brief.ts";

// Whole-profile compatibility owns canonical identity and runnable bounds.
// The Native owner separately proves the comparison guard's behavior.
test("the Brief profile has a separate exact pin and preserves every S3 clause outside its fixed Brief binding", () => {
  expect(readFileSync(new URL("../definitions/issue-questions-brief.json", import.meta.url), "utf8"))
    .toBe(canonicalize(issueQuestionsBrief));
  expect(definitionDigest(issueQuestionsBrief)).toBe(QUESTION_BRIEF_DIGESTS.issue);
  expect(QUESTION_BRIEF_DIGESTS.issue).not.toBe(QUESTION_DIGESTS.issue);
  expect(canonicalize(issueQuestions)).toBe(readFileSync(new URL("../definitions/issue-questions.json", import.meta.url), "utf8"));
  expect(definitionDigest(issueQuestions)).toBe(QUESTION_DIGESTS.issue);

  const checked = validateDefinition(issueQuestionsBrief, PROPOSED_BOUNDS);
  if (!checked.ok) return expect.fail(JSON.stringify(checked.problems));
  const code = capabilitiesOf(holdCapability({ tokensPerHold: 2, rootRetentionSeconds: null }), gitRead());
  expect(derivable(checked.definition, code)).toBe(true);
  expect(counted(checked.definition, code, PROPOSED_BOUNDS)).toBeNull();

  expect(issueQuestionsBrief.items["ask"]!.values["brief"])
    .toEqual({ fixed: true, required: true, of: { type: "digest" } });
  expect(issueQuestionsBrief.acts["ask"]!.fields["brief"]).toEqual({ type: "digest", required: true });
  expect(issueQuestionsBrief.acts["revise-ask"]!.fields["brief"]).toEqual({ type: "digest", required: false });

  // Removing exactly the new binding must recover the whole historical
  // declaration, including bodyAt, person-role grants and every other act.
  const historical = JSON.parse(JSON.stringify(issueQuestionsBrief)) as typeof issueQuestionsBrief;
  delete historical.items["ask"]!.values["brief"];
  historical.acts["ask"]!.fields = issueQuestions.acts["ask"]!.fields;
  historical.acts["ask"]!.effects = issueQuestions.acts["ask"]!.effects;
  historical.acts["revise-ask"]!.fields = issueQuestions.acts["revise-ask"]!.fields;
  historical.acts["revise-ask"]!.guards = issueQuestions.acts["revise-ask"]!.guards;
  expect(historical).toEqual(issueQuestions);
  expect(issueQuestionsBrief.acts["revise-ask"]!.effects).toEqual(issueQuestions.acts["revise-ask"]!.effects);
});

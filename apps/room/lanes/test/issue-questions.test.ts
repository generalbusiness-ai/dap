import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { capabilitiesOf, counted, derivable, gitRead, holdCapability, validateDefinition } from "@generalbusiness/dap-derive";
import { issue } from "../src/issue.ts";
import { issueQuestions } from "../src/issue-questions.ts";
import { QUESTION_DIGESTS } from "../src/digests-questions.ts";

// Invariant: the successor is one runnable, bounded, exactly pinned issue
// definition; composing its question lifecycle changes no historical bytes
// or unrelated issue rows. Native scenario assertions own its behavior.
test("the question successor pins a whole bounded definition and preserves the historical issue outside its declared question changes", () => {
  const bytes = readFileSync(new URL("../definitions/issue-questions.json", import.meta.url), "utf8");
  expect(bytes).toBe(canonicalize(issueQuestions));
  expect(definitionDigest(issueQuestions)).toBe(QUESTION_DIGESTS.issue);
  expect(QUESTION_DIGESTS.issue).not.toBe(definitionDigest(issue));
  expect(canonicalize(issue)).toBe(readFileSync(new URL("../definitions/issue.json", import.meta.url), "utf8"));

  const checked = validateDefinition(issueQuestions, PROPOSED_BOUNDS);
  if (!checked.ok) throw new Error(JSON.stringify(checked.problems));
  const code = capabilitiesOf(holdCapability({ tokensPerHold: 2, rootRetentionSeconds: null }), gitRead());
  expect(derivable(checked.definition, code)).toBe(true);
  expect(counted(checked.definition, code, PROPOSED_BOUNDS)).toBeNull();
  expect([issueQuestions.items, issueQuestions.acts, issueQuestions.timed, issueQuestions.receives].map(part => Object.keys(part).length))
    .toEqual([14, 53, 1, 7]);
  // The same whole definition fails at one fewer item type. No production
  // bound is enlarged to fit this application.
  const less = validateDefinition(issueQuestions, { ...PROPOSED_BOUNDS, items: 13 });
  expect(less.ok ? [] : [...new Set(less.problems.map(problem => problem.code))]).toEqual(["bound"]);

  const changedItems = new Set(["ask", "block", "comment"]);
  const addedItems = new Set(["approval-request", "approval"]);
  const retainedItems = Object.fromEntries(Object.entries(issueQuestions.items).filter(([name]) => !changedItems.has(name) && !addedItems.has(name)));
  expect(retainedItems).toEqual(Object.fromEntries(Object.entries(issue.items).filter(([name]) => !changedItems.has(name))));
  expect({ ...issueQuestions.items["block"], refs: { ...issueQuestions.items["block"]!.refs, releasedBy: issue.items.block.refs.releasedBy } })
    .toEqual(issue.items.block);
  const { about: _about, ...commentRefs } = issueQuestions.items["comment"]!.refs;
  expect({ ...issueQuestions.items["comment"], refs: commentRefs }).toEqual(issue.items.comment);

  const changedActs = new Set(["ask", "withdraw-ask", "comment", "release-block"]);
  const addedActs = new Set(["revise-ask", "request-approval", "withdraw-approval-request", "approve", "decide"]);
  const removedActs = new Set(["answer", "settle-ask"]);
  expect(Object.fromEntries(Object.entries(issueQuestions.acts).filter(([name]) => !changedActs.has(name) && !addedActs.has(name))))
    .toEqual(Object.fromEntries(Object.entries(issue.acts).filter(([name]) => !changedActs.has(name) && !removedActs.has(name))));
  expect({ ...issueQuestions, items: issue.items, acts: issue.acts }).toEqual(issue);
});

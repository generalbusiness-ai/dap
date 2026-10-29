/** Cheapest whole-declaration proof; Native flow witnesses live separately. */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { issue } from "../src/issue.ts";
import { change3 } from "../src/change3.ts";
import { issueEvidence4 } from "../src/issue4.ts";
import { changeEvidence4 } from "../src/change4.ts";
import { EVIDENCE_DIGESTS } from "../src/digests4.ts";

test("evidence successors are whole bounded declarations with a real named child closure, while shipped Issue and manifest Change bytes remain exact", () => {
  expect(canonicalize(issue)).toBe(readFileSync(new URL("../definitions/issue.json", import.meta.url), "utf8"));
  expect(canonicalize(change3)).toBe(readFileSync(new URL("../definitions/change3.json", import.meta.url), "utf8"));
  const issueDigest = definitionDigest(issueEvidence4), next = changeEvidence4(issueDigest);
  for (const definition of [issueEvidence4, next]) {
    const result = validateDefinition(definition, PROPOSED_BOUNDS);
    expect(result.ok, result.ok ? definition.name : JSON.stringify(result.problems)).toBe(true);
  }
  for (const [name, definition, digest] of [["issue", issueEvidence4, EVIDENCE_DIGESTS.issue], ["change", next, EVIDENCE_DIGESTS.change]] as const) {
    expect(definitionDigest(definition)).toBe(digest);
    expect(canonicalize(definition)).toBe(readFileSync(new URL(`../definitions/${name}-evidence4.json`, import.meta.url), "utf8"));
  }
  const creates = next.receives["published-check-failure"]!.sends.filter(send => "create" in send);
  expect(creates).toHaveLength(1);
  expect(creates[0] && "create" in creates[0] && creates[0].create.definition).toBe(issueDigest);
  expect([definitionDigest(issue), definitionDigest(change3)]).not.toContain(issueDigest);
  // Neither factory edits its predecessor or the passed child identity.
  expect(canonicalize(changeEvidence4(issueDigest))).toBe(canonicalize(next));
  expect(canonicalize(change3)).toBe(readFileSync(new URL("../definitions/change3.json", import.meta.url), "utf8"));
});

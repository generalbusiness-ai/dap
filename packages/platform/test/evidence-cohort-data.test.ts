import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FieldValue, type RulesObservation } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { type RuleGiven } from "@generalbusiness/dap-derive";
import { d, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { applicationRoot, applicationChild, smallApplication as unrelated } from "./definition-corpus-data.ts";
import { hardenedCertifiedRulesDirectory } from "../src/archive-binding.ts";
import { evidenceRulesDirectory, evidenceRulesDirectoryRules } from "../src/evidence-cohort-data.ts";
import { definitionDependencies } from "../src/definition-input.ts";
import { checkedPlatformData } from "./fixtures.ts";

// Scripted Rules observation and declaration places exercise the actual D21
// guard. They prove no real activation, membership grant or child creation.
test("only D21 open-pr declares its one child place, and its closure stays bound to the exact active Rules observation", () => {
  checkedPlatformData(evidenceRulesDirectory);
  const old = hardenedCertifiedRulesDirectory.acts["open-pr"]!, next = evidenceRulesDirectory.acts["open-pr"]!;
  expect(next.fields).toEqual({ ...old.fields, dependency1: definitionDependencies["dependency1"] });
  expect(Object.keys(next.fields).filter(name => name.startsWith("dependency"))).toEqual(["dependency1"]);
  expect(Object.keys(old.fields).some(name => name.startsWith("dependency"))).toBe(false);
  expect(evidenceRulesDirectory.acts["open-issue"]).toBe(hardenedCertifiedRulesDirectory.acts["open-issue"]);
  const child = applicationChild(), childDigest = definitionDigest(child), root = applicationRoot(childDigest), rootDigest = definitionDigest(root);
  const rules = { ...otherLane, kind: "rules" as const };
  const observation: RulesObservation = { subject: "rules", of: rules, head: { seq: 4, hash: d("a") }, revision: 3,
    content: { asked: "definitions", active: [{ digest: rootDigest, name: root.name }] }, definition: "platform:rules@13", at: t(1) };
  const rule = evidenceRulesDirectoryRules["definition-active"];
  if (!rule || rule.place !== "guard") throw Error("The successor closure guard is required");
  const reads: string[] = [];
  const given = (fields: Record<string, FieldValue>, places: Record<string, unknown>, observed: RulesObservation | null = observation): RuleGiven => ({
    state: { page: () => ({ items: [{ refs: { rules } }] }) }, input: { type: "diagnosis", of: { seq: 0, n: 0 }, attempts: [] },
    resolved: { at: otherLane, self: 5, fields, subjects: new Map(), signer: null, bounds: PROPOSED_BOUNDS },
    time: t(1), uses: [], own: () => null,
    observed: () => observed ? { observation: observed, read: { run: "d21-closure", n: 0 }, use: "fresh", prior: null } : null,
    placed: (name: string) => { reads.push(name); return places[name]; },
    value: () => { throw Error("The D21 guard must never read an unnamed value"); },
  }) as unknown as RuleGiven;
  const fields = { definition: rootDigest, dependency1: childDigest }, places = { definition: root, dependency1: child };
  expect(rule.run(given(fields, places))).toEqual({ holds: true });
  expect(reads).toEqual(["definition", "dependency1"]);
  expect(rule.run(given({ definition: rootDigest }, places))).toEqual({ holds: null, reason: "dependency-unavailable" });
  expect(rule.run(given(fields, { definition: root }))).toEqual({ holds: null, reason: "dependency-unavailable" });
  expect(rule.run(given(fields, { ...places, dependency1: unrelated }))).toMatchObject({ holds: false, name: "unsupported-definition" });
  expect(rule.run(given({ definition: childDigest, dependency1: rootDigest }, { definition: child, dependency1: root },
    { ...observation, content: { asked: "definitions", active: [{ digest: childDigest, name: child.name }] } }))).toMatchObject({ holds: false, name: "unsupported-definition" });
  expect(rule.run(given(fields, places, null))).toEqual({ holds: null, reason: "dependency-unavailable" });
  expect(rule.run(given(fields, places, { ...observation, of: { ...rules, inc: `in_${"b".repeat(26)}` } }))).toEqual({ holds: null, reason: "dependency-unavailable" });
  expect(rule.run(given(fields, places, { ...observation, content: { asked: "definitions", active: [] } }))).toEqual({ holds: false, name: "not-activated" });
});

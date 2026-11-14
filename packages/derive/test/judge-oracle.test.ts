/** The oracle preserves answer distinctions and never realigns calls. */
import { expect, test } from "vitest";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AnswerOracle, answerBytes, compareAnswers, type OracleCase } from "./judge-oracle.ts";

const label: OracleCase = { kind: "test", path: ["TEST answer"], position: "_0" };
const harness = "0".repeat(40);
test("answer encoding preserves omitted fields, Map and Set order, holes and exceptional numbers", () => {
  expect(answerBytes({})).toBe('["object",[]]');
  expect(answerBytes({ optional: undefined })).toBe('["object",[["optional",["undefined"]]]]');
  expect(answerBytes(new Map([[2, "two"], [1, "one"]])))
    .toBe('["map",[[["number","2"],["string","two"]],[["number","1"],["string","one"]]]]');
  expect(answerBytes(new Set(["b", "a"]))).toBe('["set",[["string","b"],["string","a"]]]');
  expect(answerBytes([, undefined, -0, NaN, Infinity])).toBe('["array",[["hole"],["undefined"],["number","-0"],["number","NaN"],["number","Infinity"]]]');
  expect(() => answerBytes({ callback: () => 0 })).toThrow("Unsupported oracle answer value");
});

test("case count changes fail without realignment and raw capture is optional for comparison", () => {
  const baseline = new AnswerOracle("TEST owner"), current = new AnswerOracle("TEST owner");
  baseline.record("runtime", label, { result: "refused", reason: "unauthorized" });
  baseline.record("runtime", label, { result: "accepted-before", seq: 2 });
  current.record("runtime", label, { result: "accepted-before", seq: 2 });
  const errors = compareAnswers(baseline.rows(), current, { harness });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain("baseline calls: 2; current calls: 1");
  expect(errors[0]).toContain("current[0]:");
  expect(errors[0]).toContain("Baseline raw capture absent.");
  expect(errors[0]).toContain("270dc8c7a69a4506fc3d5525339f08a4adb2803f");
  expect(compareAnswers(current.rows(), baseline, { harness })[0]).toContain("baseline calls: 1; current calls: 2");
  expect(compareAnswers(current.rows(), current, { harness, raw: "/TEST/absent/raw.jsonl" })).toEqual([]);
  const moved = new AnswerOracle("TEST owner");
  moved.record("replay", label, { result: "accepted-before", seq: 2 });
  expect(compareAnswers(current.rows(), moved, { harness })).toHaveLength(2);
});

test("raw diagnostics print the first baseline difference only after its bytes match the committed rows", () => {
  const directory = mkdtempSync(join(tmpdir(), "e1-oracle-diagnostic-")), raw = join(directory, "answers.jsonl");
  try {
    const baseline = new AnswerOracle("TEST owner"), current = new AnswerOracle("TEST owner");
    baseline.record("runtime", label, { result: "refused", reason: "unauthorized" });
    current.record("runtime", label, { result: "write", draft: {} });
    writeFileSync(raw, baseline.answers.map(answer => JSON.stringify(answer) + "\n").join(""));
    const diagnostic = compareAnswers(baseline.rows(), current, { harness, raw }).join("\n");
    expect(diagnostic).toContain("first differing call: 0");
    expect(diagnostic).toContain(`baseline[0]: ${baseline.answers[0]!.bytes}`);
    writeFileSync(raw, JSON.stringify({ ...baseline.answers[0]!, bytes: "TEST untrusted baseline" }) + "\n");
    const invalid = compareAnswers(baseline.rows(), current, { harness, raw }).join("\n");
    expect(invalid).toContain("Baseline raw capture unusable:");
    expect(invalid).not.toContain("TEST untrusted baseline");
    expect(invalid).not.toContain("baseline[0]:");
  } finally { unlinkSync(raw); rmdirSync(directory); }
});

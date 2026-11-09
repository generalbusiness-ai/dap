import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { answersVersionQuestion, VERSION_QUESTIONS, type VersionQuestion } from "../src/version-questions.ts";
import { VERSIONS } from "../src/native-catalog.ts";

/** Copied unchanged from the pre-edit source inventory, before the new table. */
const frozen = JSON.parse(readFileSync(new URL("./fixtures/version-questions-86179b0c.json", import.meta.url), "utf8")) as {
  catalogPins: string[];
  questions: { name: string }[];
  rows: { pin: string; catalogued: boolean; answers: Record<string, boolean> }[];
};
const standing = JSON.parse(readFileSync(new URL("./fixtures/version-standing-86179b0c.json", import.meta.url), "utf8")) as {
  question: string;
  rows: { pin: string; answer: boolean }[];
};

test("the question owner covers every frozen predicate and catalog pin", () => {
  expect([...VERSION_QUESTIONS].sort()).toEqual([...frozen.questions.map(question => question.name), standing.question].sort());
  expect(Object.keys(VERSIONS).sort()).toEqual([...frozen.catalogPins].sort());
  expect(frozen.rows).toHaveLength(105);
  expect(frozen.questions).toHaveLength(104);
});

test.each(frozen.rows)("the independent old-list answers hold for $pin", row => {
  for (const question of frozen.questions.map(value => value.name as VersionQuestion)) {
    expect(answersVersionQuestion(row.pin, question), `${question}: ${row.pin}`).toBe(row.answers[question]);
  }
});

test.each(standing.rows)("the separately frozen standing answer holds for $pin", row => {
  expect(answersVersionQuestion(row.pin, "nativeStandingDestination")).toBe(row.answer);
});

test.each([undefined, null, false, 0, {}, []])("non-pin inputs answer false: %j", named => {
  for (const question of VERSION_QUESTIONS) expect(answersVersionQuestion(named, question)).toBe(false);
});

test("the frozen answers retain intentional disagreements", () => {
  const answers = (named: string, question: VersionQuestion) => answersVersionQuestion(named, question);
  expect(answers("platform:destination@7", "nativeStagedPublication")).toBe(true);
  expect(answers("platform:destination@7", "cliManifestListDestination")).toBe(false);
  expect(answers("platform:rules@13", "applicationOutsideWorkerRules")).toBe(true);
  expect(answers("platform:rules@13", "scopeApplicationOutsideRules")).toBe(false);
  expect(answers("platform:destination@18", "scopeDeliveryUnpublishedBranch")).toBe(true);
  expect(answers("platform:destination@18", "mcpVerifyEmptyDestination")).toBe(false);
});

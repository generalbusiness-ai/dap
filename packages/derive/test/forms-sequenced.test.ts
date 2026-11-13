/**
 * Version 1 of the sequenced level in the validator (sequenced note, sections 5.2 and 5.11): the forms it admits, and a
 * refusal pair for each misuse that the first version names. The admitted declarations are rows of the definition corpus.
 */
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { derivable, validateDefinition, type Problem } from "../src/index.ts";
import { sequencedBase, sequencedForms, sequencedMisuses } from "./definition-corpus/sequenced-data.ts";

const problems = (declaration: unknown): readonly Pick<Problem, "code" | "path">[] => {
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { canonical: true });
  return checked.ok ? [] : checked.problems.map(({ code, path }) => ({ code, path }));
};

test.for(Object.entries(sequencedForms))("the validator admits the sequenced form %s", ([, declaration]) => {
  expect(problems(declaration())).toEqual([]);
});

describe("each misuse that version 1 names is refused, and the same declaration without it is admitted", () => {
  const refusals: Record<keyof typeof sequencedMisuses, Pick<Problem, "code" | "path">> = {
    markOnHandler: { code: "shape", path: "receives.hello.sequenced" },
    staleness: { code: "shape", path: "acts.count.reads.left.staleness" },
    createInSequencedAct: { code: "shape", path: "acts.count.sends.0.create" },
    readOutsideSequencedAct: { code: "shape", path: "acts.count.guards.1.has.list" },
    readsWithoutMark: { code: "shape", path: "acts.count.reads" },
  };
  test.for(Object.entries(sequencedMisuses))("%s", ([name, pair]) => {
    expect(problems(pair.admitted())).toEqual([]);
    expect(problems(pair.refused())).toEqual([refusals[name as keyof typeof sequencedMisuses]]);
  });
});

test("the mark needs the sequenced level, and the level admits version 1 only", () => {
  const recorded = sequencedBase(false);
  recorded.acts["count"]!.sequenced = true;
  expect(problems(recorded)).toEqual([{ code: "shape", path: "acts.count.sequenced" }]);
  expect(problems({ ...sequencedBase(), level: { name: "sequenced", version: 2 } })).toEqual([{ code: "unsupported-definition", path: "level" }]);
});

test("a read is the list of a list form, and names a reads entry of its act", () => {
  const compared = sequencedForms.read();
  compared.acts["count"]!.guards = [{ equals: { a: { read: "left" }, b: { const: [] } } }];
  expect(problems(compared)).toEqual([{ code: "shape", path: "acts.count.guards.0.equals.a" }]);
  const unnamed = sequencedForms.read();
  unnamed.acts["count"]!.guards = [{ each: { list: { read: "right" }, as: "t", guards: [] } }];
  expect(problems(unnamed)).toEqual([{ code: "name", path: "acts.count.guards.0.each.list" }]);
});

test("no judge derives a sequenced definition yet, so a runtime cannot pin one", () => {
  const sequenced = validateDefinition(sequencedForms.mark(), PROPOSED_BOUNDS);
  const recorded = validateDefinition(sequencedBase(false), PROPOSED_BOUNDS);
  expect([sequenced.ok && derivable(sequenced.definition, null), recorded.ok && derivable(recorded.definition, null)]).toEqual([false, true]);
});

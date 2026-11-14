/** The builders of the sequenced level write the declaration that the validator admits (sequenced note, section 5.2). */
import { expect, test } from "vitest";
import {
  compile, constant, define, differs, distinct, each, el, grants, groupList, groupRead, has, int, item, live, ref, sameSet, scope,
  sequenced, sequencedLevel, transition, open, value,
} from "../src/index.ts";
import { sequencedForms } from "../../derive/test/definition-corpus/sequenced-data.ts";

const grant = grants({ found: "found", count: "count" });
const tally = item("tally", { states: { open: live }, refs: { peer: ref.optional(scope("lane")) }, values: { count: value.required(int(0, 1000), 0) } });

test("a sequenced act built with the builders has the bytes of the corpus row that reads a member", () => {
  const left = groupList("left");
  const count = sequenced(transition(tally, grant.count, {}, ({ on }) => ({
    guards: [
      on.in("open"),
      each(left, "t", () => ({ guards: [differs(el("t", "state"), "closed")] })),
      has(left, "t", () => ({ where: [{ equals: { a: el("t", "state"), b: constant("open") } }] })),
      distinct(left, "t", () => el("t", "id")),
      sameSet(left, "t", () => el("t", "id"), tally, ["open"]),
    ],
    effects: [on.value("count", constant(1))],
  })), { left: groupRead("left", tally, ["open"]) });
  const built = define({ name: "sequenced-member", level: sequencedLevel, genesis: "found", items: [tally], acts: { found: open(tally, grant.found), count } });
  expect(compile(built).digest).toBe(compile(sequencedForms.read()).digest);
});

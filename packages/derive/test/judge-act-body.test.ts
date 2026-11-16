// The C4 shared act body. It lives apart from judge.test.ts, an E1 answer
// oracle owner, so that file's task positions stay unchanged.
import { expect, test } from "vitest";
import { judgeActBody } from "../src/index.ts";
import { Scope, fields, keys, laneDefinition, on } from "./fixtures-entry.ts";

const { rita, una, vic } = keys;

function laneWithCommitment(definition = laneDefinition): Scope {
  const s = new Scope(definition);
  s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  s.did(rita, "assign", { ...on(s, 2), ...fields({ performer: una.member }) });
  return s;
}

// Invariant: the shared body checks observed basis before missing authority.
// The lane's native judges/fold create the rows; its scripted setup grants
// are not membership-authority evidence for the C4 session fixture.
test("the shared body reports moved basis before unavailable authority and writes neither judgment", () => {
  const scope = laneWithCommitment();
  const before = { head: { ...scope.head }, count: scope.entries.length, state: scope.state.snapshot() };
  const current = scope.item(2).revision;
  expect(current).toBeGreaterThan(1);
  const body = { kind: "assign", on: 2, fields: { performer: vic.member }, expected: { on: current - 1 } };
  const context = { ...scope.context(), grants: null, actor: rita.key };
  const moved = judgeActBody(scope.state, scope.definition, body, context);
  expect(moved).toMatchObject({ result: "refused", reason: "revision-moved", judgedAt: before.head });
  expect(judgeActBody(scope.state, scope.definition, { ...body, expected: { on: current } }, context))
    .toEqual({ result: "unavailable", reason: "authority-unavailable" });
  // Neither call signs an intent or invokes submit/seal/fold.
  expect(scope.entries).toHaveLength(before.count);
  expect(scope.head).toEqual(before.head);
  expect(scope.state.snapshot()).toBe(before.state);
});

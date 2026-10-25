import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { platform } from "../src/index.ts";
import { board } from "../../derive/test/fixtures-f.ts";
import { newIncarnation, scopeIdOf, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { clockOf, judgeTimed, MemoryState, validateDefinition } from "@generalbusiness/dap-derive";
const destination3 = platform("platform:destination@3")!.data;

// The platform opener is constant and bounded. An untrusted declared definition
// cannot authorize outside work by supplying a timed operation list.
test("timed cleanup is platform-only and refuses different kinds, oversized attempts or callback fields", () => {
  expect(validateDefinition(destination3, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  // Scripted folded rows exercise the real validated native declarations and
  // reservation accounting. Native creation/dispatch/replay is witnessed by
  // the separate complete manifest story, not by this pure judge fixture.
  const due = timeOf(1_900_000_000_000), hash = textDigest("PUBLIC timed cleanup fixture");
  const state = new MemoryState();
  const at = { kind: "destination" as const, scope: scopeIdOf({ v: 1, kind: "destination", definition: "platform:destination@3", creator: null, cause: hash, ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(7)) };
  state.setScope({ at, creator: null, status: "active", head: { seq: 4, hash }, time: due, genesis: { hash, source: null, n: null }, held: [] });
  state.putItem({ id: 1, type: "publication", state: "reserved", revision: 1, opened: hash, attributed: [], parties: {}, refs: {}, values: { checkDeadline: due } });
  state.addCount("publication", "reserved", 1);
  state.putHolder(1, { operations: { "reservation-delete": 3, mint: 1 } });
  const selected = { item: 1, rule: "publication-checks-deadline", due };
  const judge = (pin: PlatformDefinition) => {
    const native = platform(pin) ?? platform("platform:destination@3")!;
    const checked = validateDefinition(native.data, PROPOSED_BOUNDS, undefined, { platform: true });
    if (!checked.ok) return expect.fail(JSON.stringify(checked.problems));
    return judgeTimed(state, checked.definition, selected, { clock: clockOf(state, due), bounds: PROPOSED_BOUNDS, platform: { named: pin, rules: native.rules } });
  };
  for (const pin of ["platform:destination@3", "platform:destination@13"] as const) {
    const result = judge(pin);
    expect(result.result, pin).toBe("write");
    if (result.result !== "write") return expect.fail("The exact supported native timer must write.");
    expect(result.draft.input).toEqual({ type: "timed", ...selected });
    expect(result.draft.effects.filter(effect => effect.effect === "operation" || effect.effect === "attempt")).toEqual([
      { effect: "operation", k: 0, owner: pin, kind: "reservation-delete", attempts: 3, for: 1 },
      { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
      { effect: "operation", k: 1, owner: pin, kind: "mint", attempts: 1, for: 1 },
      { effect: "attempt", operation: { k: 1 }, attempt: 1, result: "opened", selected: null },
    ]);
  }
  for (const pin of ["platform:destination@4", "platform:destination@12", "platform:destination@19"] as const) {
    expect(judge(pin)).toEqual({ result: "unavailable", reason: "unavailable" });
  }
  const originalScope = state.scope()!;
  state.setScope({ ...originalScope, at: { ...originalScope.at, kind: "lane" } });
  expect(judge("platform:destination@13")).toEqual({ result: "unavailable", reason: "unavailable" });
  state.setScope(originalScope);
  const refused = validateDefinition({ ...board, timed: { "job-deadline": { ...board.timed["job-deadline"]!, opens: destination3.timed["publication-checks-deadline"]!.opens } } }, PROPOSED_BOUNDS);
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.problems.some((problem) => problem.path === "timed.job-deadline.opens"), JSON.stringify(refused.problems)).toBe(true);
  const missingKind = structuredClone(destination3);
  delete missingKind.outcomes["reservation-delete"];
  expect(validateDefinition(missingKind, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(false);
  for (const opens of [[{ kind: "push", attempts: 3 }, { kind: "mint", attempts: 1 }], [{ kind: "reservation-delete", attempts: 4 }, { kind: "mint", attempts: 1 }], [{ kind: "reservation-delete", attempts: 3, callback: "run" }, { kind: "mint", attempts: 1 }]]) {
    const wrong = structuredClone(destination3);
    wrong.timed["publication-checks-deadline"] = { ...wrong.timed["publication-checks-deadline"]!, opens } as never;
    expect(validateDefinition(wrong, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(false);
  }
});

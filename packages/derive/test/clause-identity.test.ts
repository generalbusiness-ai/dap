import { clauseSends, clauseMatrices, clauseIdentityChange } from "./definition-corpus/derive-reservation-variants.ts";
import { expect, test } from "vitest";
import type { ObservationUse, Send } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/dap-bytes";
import { judgeDelivery } from "../src/index.ts";
import { Scope, arriving, forged, keys, membership, otherLane, t, valid, memberSeen, weighed, weigherRules } from "./fixtures-entry.ts";

// Revision 24, binding amendment 335ef3ea: conditional same-name sends
// must have identical result effects and observation rows. Observations
// alone are clause work; empty effects do not make rows interchangeable.
// STAND-INS: made-up platform data, authority, observations and the peer's
// sealed answer. Derive's judges create the sending act and the result.


test("conditional same-name sends with differing observations or effects are refused as ambiguous-send", () => {
  // The original RED reproducer's observation-only clauses are refused at
  // validation. No invalid definition is passed to a sending scope.
  const observations = weighed(clauseSends());
  const effects = weighed((data) => {
    clauseSends(true, false, true, true)(data);
    data.acts.go.sends[1].tell.result.applied[0].value.from.const = "second";
  });
  for (const result of [observations, effects]) {
    expect(result.ok ? null : result.problems.map(({ code, path }) => [code, path]))
      .toEqual([["ambiguous-send", "acts.go.sends.1.tell"]]);
  }
});

for (const { name, identical, distinct, conditional, choices } of clauseMatrices) test.each(["legacy", "whole-scope"] as const)(`%s: ${name} retain their own result rows, effects and reservation`, cohort => {
  const checked = weighed(clauseIdentityChange(identical, distinct, conditional, cohort));
  expect(checked.ok).toBe(true);
  const definition = valid(checked);
  for (const choice of choices) {
    const s = new Scope(definition);
    s.did(keys.rita, "point", { on: 0, expected: { on: 1 }, fields: { peer: otherLane } });
    const origin = s.did(keys.rita, "go", { on: 0, expected: { on: 2 }, fields: { choice, first: keys.una.member, second: keys.vic.member } });
    expect(origin.sends.map(({ n, message }) => [n, (message as { body: { message: string } }).body.message]))
      .toEqual(conditional ? [[0, distinct && choice ? "ask-second" : "ask"]] : [[0, "ask"], [1, "ask"]]);
    for (const sent of origin.sends) {
      const second = !identical && (conditional ? choice : sent.n === 1);
      expect(s.state.request(origin.seq, sent.n)?.reservation).toEqual(cohort === "whole-scope" ? { entries: 2, items: 0, records: 0, bytes: 3 * PROPOSED_BOUNDS.entryBytes, requests: 0 } : undefined);
      const request = { from: s.fact(origin.seq), n: sent.n };
      const answer: Send = { n: 0, to: s.at, message: { class: "result", of: request, outcome: "applied" } };
      const source = forged(otherLane, 9, { type: "delivery", from: request.from, n: sent.n, message: sent.message as never, decision: "applied" }, [answer]);
      const arrival = { ...answer, from: factRefOf(source.entry) };
      s.now = t(8);
      const record = (observed: readonly ObservationUse[]) => judgeDelivery(s.state, s.definition, arrival, {
        ...arriving(s, arrival, source), platform: weigherRules(), observed, observing: { membership },
      });
      const right = memberSeen((second ? keys.vic : keys.una).member.member, 1, t(3));
      const wrong = memberSeen((second ? keys.una : keys.vic).member.member, 2, t(3));
      const got = record([right]);
      expect(got.result).toBe("write");
      expect(got.result === "write" && got.draft.input.type === "delivery" && "observed" in got.draft.input && got.draft.input.observed).toEqual([right]);
      expect(got.result === "write" && got.draft.effects).toEqual([{ effect: "value", item: 0, slot: "note", value: second ? "second" : "first" }]);
      // A missing observation obeys this result's row: the first waits,
      // while the second writes without retaining the other member.
      const absent = record([wrong]);
      expect(absent.result).toBe(second ? "write" : "unavailable");
      if (second) expect(absent.result === "write" && "observed" in absent.draft.input ? absent.draft.input.observed : null).toBeNull();
    }
  }
});

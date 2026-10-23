import { holdFormCases, shortEpochChange } from "./definition-corpus/forms-hold-variants.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { judgeTimed, nextDue, owed, validateDefinition, type ValidDefinition } from "../src/index.ts";
import { Scope, fields, keys, on, t, variant, formsWorks as works, formsWorksDefinition as worksDefinition } from "./fixtures-entry.ts";

const { rita, una, vic } = keys;
/* eslint-disable @typescript-eslint/no-explicit-any */
/** A copy in which no two places share one object, as a definition is when it is parsed. */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const under = (s: Scope, commitment: number) => ({ fields: { commitment }, expected: { commitment: s.item(commitment).revision } });

/** Commitments 2 and 4, accepted by una and by vic, and holds 6 and 7 under them, opened at T0. Both holds end at T0 + 600 s. */
function twoHolds(definition: ValidDefinition = worksDefinition): Scope {
  const s = new Scope(definition);
  for (const performer of [una, vic]) {
    const commitment = s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } }).seq;
    s.did(rita, "assign", { ...on(s, commitment), ...fields({ performer: performer.member }) });
  }
  s.did(una, "take-hold", under(s, 2));
  s.did(vic, "take-hold", under(s, 4));
  return s;
}
const end = (item: number, epoch: number) => ({ effect: "hold", item, change: "end", epoch });

describe("a hold ends with what it is under (section 6.8; witness 18.13)", () => {
  test("a withdrawn commitment ends the hold under it in the same entry, and no other; the hold's old deadline is then dropped", () => {
    const s = twoHolds();
    // `hold: open` gave the hold its holder, from the signer, and its epoch.
    expect(s.item(6)).toMatchObject({ state: "held", parties: { holder: una.member }, refs: { under: 2 }, values: { until: t(600), epoch: 1 } });
    const reserved = owed(s.state, s.definition, s.last.input);

    const withdrawn = s.did(rita, "withdraw", on(s, 2));
    expect(withdrawn.effects).toEqual([{ effect: "state", item: 2, state: "withdrawn" }, end(6, 2)]);
    expect(s.item(6)).toMatchObject({ state: "ended", revision: 2, parties: { holder: una.member }, values: { until: t(600), epoch: 2 } });
    // The hold under the other commitment is as it was, and the ended hold reserves no entry for its end any more.
    expect(s.item(7)).toMatchObject({ state: "held", revision: 1, values: { epoch: 1 } });
    expect(owed(s.state, s.definition, withdrawn.input)).toBe(reserved - 1);

    // At the old deadline a selection for hold 6 is dropped: the item no longer holds it. Hold 7 is the one that is due.
    s.now = t(600);
    expect(judgeTimed(s.state, s.definition, { item: 6, rule: "hold-end", due: t(600) }, s.context())).toEqual({ result: "dropped", failed: "held" });
    expect(nextDue(s.state, s.definition, t(600))).toEqual({ item: 7, rule: "hold-end", due: t(600) });
    expect(s.drain().map((j) => j.result)).toEqual(["write"]);
    expect(s.last.effects[0]).toEqual(end(7, 2));
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });

  test("a hold that the entry is on ends in its working copy too, and once; so does a hold that the entry itself opens", () => {
    // A hold that its own entry ends by a written effect is not ended again when the same entry withdraws its commitment.
    const quit = twoHolds();
    expect(quit.did(una, "quit", { ...on(quit, 6, { commitment: 2 }), ...fields({ commitment: 2 }) }).effects).toEqual([end(6, 2), { effect: "state", item: 2, state: "withdrawn" }]);

    const s = twoHolds();
    // An act on hold 6 that withdraws commitment 2: the send reads the hold's epoch as it is after the entry.
    const abandoned = s.did(una, "abandon", { ...on(s, 6, { commitment: 2 }), ...fields({ commitment: 2 }) });
    expect(abandoned.effects).toEqual([{ effect: "state", item: 2, state: "withdrawn" }, end(6, 2)]);
    expect(abandoned.sends.map((send) => send.message)).toEqual([{ class: "advisory", type: "index", body: { fields: { epoch: 2 } } }]);
    expect(s.item(6)).toMatchObject({ state: "ended", revision: 2 });

    // A hold opened under commitment 4, which the same entry withdraws: hold 7 and the new hold both end. Neither counts as live.
    const last = s.did(vic, "last-hold", under(s, 4));
    expect(last.effects.slice(-4)).toEqual([{ effect: "hold", item: last.seq, change: "open", epoch: 1 }, { effect: "state", item: 4, state: "withdrawn" }, end(7, 2), end(last.seq, 2)]);
    expect([s.item(7).state, s.item(last.seq).state, s.state.count("hold", "held")]).toEqual(["ended", "ended", 0]);
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });
});

describe("responsibility is not a hold (section 6.8; the lane forms, section 6)", () => {
  test("a release ends the hold by the hold effect alone and changes no commitment; the performer then takes a new hold under it", () => {
    const s = twoHolds();
    const commitment = s.item(2);
    // Only the holder releases, by the definition's guard.
    expect(s.act(vic, "release", on(s, 6))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.1" });
    expect(s.did(una, "release", on(s, 6)).effects).toEqual([end(6, 2)]);
    // The commitment kept its state, its performer, its history and its revision. The ended hold is kept, with its holder.
    expect(s.item(2)).toEqual(commitment);
    expect(s.item(6)).toMatchObject({ state: "ended", parties: { holder: una.member } });
    // While hold 6 was held a second hold under commitment 2 was refused. Now a new one is admitted: a new item, at epoch 1.
    const again = s.did(una, "take-hold", under(s, 2));
    expect(s.item(again.seq)).toMatchObject({ state: "held", refs: { under: 2 }, values: { epoch: 1 } });
    // The new hold ends by time. That is a timed entry on the hold only: the commitment is still as it was.
    s.now = t(600);
    expect(s.drain().map((j) => j.result)).toEqual(["write", "write"]);
    expect(s.last.effects[0]).toEqual(end(again.seq, 2));
    expect(s.item(2)).toEqual(commitment);
    expect(s.replay().snapshot()).toBe(s.state.snapshot());
  });

  test("a renewal by another member raises the epoch only while the end can still raise it: an end is never refused", () => {
    // An epoch that holds 3 at the most: opened at 1, taken over once at 2, ended at 3.
    const s = twoHolds(variant(works, shortEpochChange));
    expect(s.did(vic, "renew", on(s, 6)).effects.at(-1)).toEqual({ effect: "hold", item: 6, change: "renew", epoch: 2 });
    expect(s.item(6).parties["holder"]).toEqual(vic.member);
    expect(s.act(una, "renew", on(s, 6))).toMatchObject({ result: "refused", reason: "bad-field" });
    // Its holder still renews it, with no rise, and it ends at the most the slot holds.
    expect(s.did(vic, "renew", on(s, 6)).effects.at(-1)).toEqual({ effect: "hold", item: 6, change: "renew", epoch: 2 });
    expect(s.did(vic, "release", on(s, 6)).effects).toEqual([end(6, 3)]);
  });
});

describe("what the validator requires of a hold type (section 6.8)", () => {

  test("each row is the lane with one change, and the validator reports those kinds of problem and no other", () => {
    for (const [name, change, codes] of holdFormCases) {
      const definition = clone(works) as DeclaredDefinition;
      change(definition);
      const result = validateDefinition(definition, PROPOSED_BOUNDS);
      expect([name, result.ok ? null : [...new Set(result.problems.map((p) => p.code))].sort()]).toEqual([name, codes === null ? null : [codes].flat().sort()]);
    }
  });
});

import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FieldValue } from "@generalbusiness/dap-contract";
import { definitionDigest, entryHash, factRefOf, signIntent } from "@generalbusiness/dap-bytes";
import { clockOf, deriveEffects, judgeGuards, MemoryState, newItem, validateDefinition, type Item, type Judging } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { issueEvidence4 } from "../src/issue4.ts";
import { changeEvidence4 } from "../src/change4.ts";

// Real successor declarations/guard/effect derivation over SCRIPTED admission
// state and Native notices. Real Native source authority is tested separately.
test("signed successor results stay provisional; only the exact Native counted result settles a requested or timed-out job", () => {
  for (const declared of [issueEvidence4, changeEvidence4(definitionDigest(issueEvidence4))]) {
    const checked = validateDefinition(declared, PROPOSED_BOUNDS);
    if (!checked.ok) throw Error(JSON.stringify(checked.problems));
    const definition = checked.definition, destination = { ...otherLane, kind: "destination" as const };
    const birth: Entry = { v: 1, at: otherLane, seq: 10, prev: d("a"), time: t(0), clamped: false, epoch: 0,
      input: { type: "act", signed: signIntent({ v: 1, to: otherLane, actor: keys.una.key,
        kind: declared.name === "issue" ? "request-work-check" : "request-check", on: null, expected: {}, fields: {},
        idempotencyKey: "SCRIPTED-job-birth", notAfter: t(60) }, keys.una.secret), authority: [], presented: {} },
      uses: [], prepared: [], effects: [{ effect: "open", item: 10, type: "job", state: "queued" }], sends: [] };
    const job = factRefOf(birth), digest = d("b"), tree = "a".repeat(40), configuration = d("c");
    for (const initial of ["requested", "timed-out"] as const) for (const outcome of ["passed", "failed", "error"] as const) {
      const state = new MemoryState(), opened = newItem({ effect: "open", item: 10, type: "job", state: "queued" }, declared.items["job"]!, job.hash);
      const held: Item = { ...opened, state: initial, parties: { ...opened.parties, checker: keys.una.member },
        refs: { ...opened.refs, destination, ...(initial === "timed-out" ? { decidedBy: 19 } : {}) },
        values: { ...opened.values, tree, configuration, bindingDigest: digest } };
      state.putItem(held);
      const own = (seq: number) => seq === 10 ? { entry: birth, hash: job.hash } : seq === 20 ? { entry: result, hash: entryHash(result) } : null;
      const fields: Record<string, FieldValue> = { job: 10, jobFact: 10, tree, configuration, bindingDigest: digest,
        ...(outcome === "error" ? { reason: "SCRIPTED checker error" } : { outcome }) };
      const kind = outcome === "error" ? "check-error" : "check", act = declared.acts[kind]!;
      const judging: Judging = { view: state, definition, bounds: PROPOSED_BOUNDS, clock: clockOf(state, t(1)),
        scope: { at: otherLane, creator: null }, self: 20, kind, fields, fieldTypes: act.fields,
        subjects: new Map([["also.job", held]]), signer: { member: keys.una.member, principal: null }, facts: new Map(), prepared: [], used: [], own };
      expect(judgeGuards(judging, act.guards).result).toBe("pass");
      const provisional = deriveEffects(judging, act.effects, act.attention, "result");
      if (!provisional.ok) throw Error(JSON.stringify(provisional));
      expect(provisional.effects.some(effect => "item" in effect && effect.item === 10)).toBe(false);
      const result: Entry = { ...birth, seq: 20, prev: job.hash, time: t(1), input: { type: "act",
        signed: signIntent({ v: 1, to: otherLane, actor: keys.una.key, kind, on: null, expected: { job: 1 },
          fields: { ...fields, jobFact: job }, idempotencyKey: "SCRIPTED-provisional-result", notAfter: t(60) }, keys.una.secret), authority: [], presented: {} },
        effects: provisional.effects, sends: [] };
      const resultFact = factRefOf(result), notice = declared.receives["check-decision"]!;
      const native: Entry = { ...birth, at: destination, seq: 30, input: { type: "outcome", owner: "platform:destination@17", kind: "evidence-result",
        operation: "25:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { job } } }, effects: [], sends: [] };
      const source = { fact: factRefOf(native), entry: native, under: "platform:destination" };
      const noticeFields: Record<string, FieldValue> = { status: "decided", job: 10, result: 20, decision: source.fact,
        reason: "counted", frozenGeneration: "null", observedGeneration: "null" };
      const notified: Judging = { ...judging, self: 31, signer: null, sender: destination, source, fields: noticeFields, fieldTypes: notice.fields };
      expect(judgeGuards(notified, notice.guards).result).toBe("pass");
      const counted = deriveEffects(notified, notice.effects, [], null);
      if (!counted.ok) throw Error(JSON.stringify(counted));
      expect(counted.working.get("also.job")).toMatchObject({ state: outcome === "error" ? "errored" : outcome, refs: { decidedBy: 20 } });
      for (const reason of ["wrong-source", "not-this-check"]) {
        const rejected = deriveEffects({ ...notified, fields: { ...noticeFields, reason } }, notice.effects, [], null);
        if (!rejected.ok) throw Error(JSON.stringify(rejected));
        expect(rejected.working.get("also.job")).toMatchObject({ state: initial, refs: { decidedBy: initial === "timed-out" ? 19 : null } });
      }
      const settled = counted.working.get("also.job")!;
      const late = deriveEffects({ ...notified, subjects: new Map([["also.job", settled]]), fields: { ...noticeFields, reason: "wrong-source" } }, notice.effects, [], null);
      if (!late.ok) throw Error(JSON.stringify(late));
      expect(late.working.get("also.job")).toMatchObject({ state: settled.state, refs: { decidedBy: 20 } });
      const wrongSource = { ...native, input: { ...native.input, kind: "evidence-admit" } } as Entry;
      expect(judgeGuards({ ...notified, source: { ...source, entry: wrongSource, fact: factRefOf(wrongSource) }, fields: { ...noticeFields, decision: factRefOf(wrongSource) } }, notice.guards).result).toBe("fail");
    }
  }
});

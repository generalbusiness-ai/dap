import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { localRetainedPlan, outcomeSnapshotDependencies, timeMs } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS, RETAINED_INPUT_BYTES } from "@generalbusiness/dap-contract";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost } from "../../../../packages/scope/src/archive-budget.ts";
import { projectArchiveSnapshots } from "../../../../packages/scope/src/archive-snapshots.ts";
import { ArchiveLocalReferences } from "../../../../packages/scope/src/archive-local-references.ts";
import { ArchiveRetainedReader } from "../../../../packages/scope/src/archive-retained.ts";
import { measureArchiveReferences } from "../../../../packages/scope/src/archive-reference-measurements.ts";
import { CAPABILITY_CODE } from "../../../../packages/scope/src/ports.ts";
import type { SqlValue } from "../../../../packages/scope/src/sqlite.ts";
import { graph, net, onCode, rita, soon, una, vic } from "./support/graph.ts";

/** A commit and a tree, as a report names them. Nothing reads a repository here. */
const COMMIT = "c".repeat(40);
const TREE = "d".repeat(40);
/** The seconds a hold of the lane definitions lasts. */
const HOLD = 3600;

test("T1, responsibility is not a hold: a hold ends by time before the act that waits, its commitment keeps its performer and its terms, another commitment's hold is untouched, and a withdrawn commitment ends its hold in the same entry", async () => {
  // One real `issue` lane, on the turn and the store. No capability and no peer is used. Not proved: anything a real hold has
  // outside the lane, such as a fork, a token or the fence of its epoch. Those are the capability's records, which this scenario does not use.
  const g = await graph();
  const G = await g.goal();
  const terms = await G.fact(0);
  // Two commitments, each accepted by its own performer on the goal's terms fact, and a hold under each, ten seconds apart.
  const c1 = (await G.did(rita, "offer", { fields: { offeree: una.member } })).fact.seq;
  await G.did(una, "accept", { on: c1, fields: { terms } });
  const c2 = (await G.did(rita, "offer", {})).fact.seq;
  await G.did(vic, "accept", { on: c2, fields: { terms } });
  const first = soon(HOLD);
  const h1 = (await G.did(una, "take-hold", { fields: { commitment: c1 } })).fact.seq;
  net.clock.now = soon(10);
  const h2 = (await G.did(vic, "take-hold", { fields: { commitment: c2, extent: "the parser" } })).fact.seq;
  // A second hold under a commitment that has one is refused, and the alarm is stored for the earliest end.
  expect([await G.asks(una, "take-hold", { fields: { commitment: c1 } }), await G.alarmAt()]).toEqual(["guard-failed: hold-held", timeMs(first)]);
  const [before, other] = [await G.item(c1), await G.item(h2)];

  // At the first end una asks for a new hold. The turn writes the timed end first, so the act is judged after it and is accepted.
  net.clock.now = first;
  const h3 = (await G.did(una, "take-hold", { fields: { commitment: c1 } })).fact.seq;
  expect((await G.entries()).slice(-2).map((e) => [e.seq, e.time, e.input.type, e.effects[0]])).toEqual([
    [h3 - 1, first, "timed", { effect: "hold", item: h1, change: "end", epoch: 2 }],
    [h3, first, "act", { effect: "open", item: h3, type: "hold", state: "held" }],
  ]);
  // The ended hold keeps its holder and its epoch rose. The commitment is as it was: accepted, the same performer, the same terms
  // fact, the same revision. The hold under the other commitment is as it was.
  expect(await G.item(h1)).toMatchObject({ state: "ended", parties: { holder: una.member }, refs: { under: c1 }, values: { epoch: 2 } });
  expect([await G.item(c1), await G.item(h2)]).toEqual([before, other]);
  expect(before).toMatchObject({ state: "accepted", parties: { performer: una.member }, refs: { termsAt: 0 } });

  // A withdrawal is another act than the end of a hold. Its one entry ends the hold under the commitment, and no other hold.
  const withdrawn = await G.did(vic, "withdraw", { on: c2 });
  expect(withdrawn.effects).toEqual([
    { effect: "state", item: c2, state: "withdrawn" },
    { effect: "hold", item: h2, change: "end", epoch: 2 },
    { effect: "attention", item: c2, members: [rita.member], reason: "withdrawn" },
  ]);
  expect((await G.item(h3)).state).toBe("held");
});

test("T4, a handover: the same accepted commitment gets a new performer only when no hold is held and on the same terms fact; the former performer is then refused, and the successor's report carries both in its authors (on the capability's code; STAND-IN: the Git host)", async () => {
  // One real `issue` lane, on the code of `hold@1` and `git-read@1` as the production ports hold it: every record, step, guard
  // and outcome rule below is real. STAND-IN: `Host` answers each attempt that the code opened, in place of a Git host and a walk
  // of commits. So this shows who may hold, stage and report after a handover, on the lane's own records, and what the report
  // attributes. It shows nothing about a real host, a fork, a credential outside the lane, or a walk of real commits.
  const g = await graph();
  const host = onCode();
  const G = await g.goal();
  const terms = await G.fact(0);
  const c = (await G.did(rita, "offer", { fields: { offeree: una.member } })).fact.seq;
  await G.did(una, "accept", { on: c, fields: { terms } });
  const h = (await G.did(una, "take-hold", { fields: { commitment: c } })).fact.seq;
  await G.did(una, "offer-handover", { on: c, fields: { successor: vic.member } });
  // Another terms fact of this lane: the goal revised. The commitment's own terms stay the fact it was accepted on.
  const revised = (await G.did(rita, "revise", { on: 0, fields: { conditions: ["it works", "and it is fast"] } })).fact;

  // While una holds, the handover is refused. After the release it is refused on any other terms fact, and to anyone but the successor.
  expect(await G.asks(vic, "accept-handover", { on: c, fields: { terms } })).toBe("guard-failed: hold-held");
  await G.did(una, "release-hold", { on: h });
  expect([await G.asks(vic, "accept-handover", { on: c, fields: { terms: revised } }), await G.asks(rita, "accept-handover", { on: c, fields: { terms } })]).toEqual(["guard-failed: terms-differ", "guard-failed"]);
  const before = await G.item(c);
  const handed = await G.did(vic, "accept-handover", { on: c, fields: { terms } });
  expect(handed.effects).toEqual([
    { effect: "party", item: c, slot: "performer", member: vic.member },
    { effect: "party", item: c, slot: "successor", member: null },
    { effect: "attention", item: c, members: [una.member], reason: "handed-over" },
    { effect: "attention", item: c, members: [rita.member], reason: "handed-over" },
  ]);
  // The same commitment: still accepted, with the terms, the conditions and the requester it had. Only the performer changed.
  const after = await G.item(c);
  expect([after.state, after.refs, after.values, after.parties["requester"]]).toEqual(["accepted", before.refs, before.values, before.parties["requester"]]);
  expect([before.parties["performer"], after.parties["performer"], (await G.item(h)).parties["holder"]]).toEqual([una.member, vic.member, una.member]);

  // The former performer may neither hold nor report, and the lane stages nothing for una: a report's hold is the one held hold
  // under its commitment, and it is used only when the signer holds it. The successor has no hold yet, and stages nothing either.
  const report = { fields: { commitment: c, terms, commit: COMMIT, tree: TREE } };
  const stages = async (who: typeof una) => { const asked = await G.prepare((await G.signed(who, "report", report)).signed, "stage"); return asked.answer === "refused" ? `${asked.reason}: ${asked.name}` : asked.answer; };
  expect([await G.asks(una, "take-hold", { fields: { commitment: c } }), await G.asks(una, "report", report), await stages(una), await stages(vic), await G.asks(vic, "report", report)])
    .toEqual(["guard-failed", "guard-failed", "capability-refused: not-staged", "capability-refused: not-staged", "capability-refused: not-staged"]);
  // The successor takes a hold of its own, with an instance. una still stages nothing under it. vic's report is then prepared:
  // the root is sealed before the ref is created, the read that shows the ref makes it live, and the check entry holds the record.
  const h2 = (await G.did(vic, "take-hold", { fields: { commitment: c } })).fact.seq;
  expect([(await G.instance(una, h2)).answer, (await G.instance(vic, h2)).answer, await stages(una), host.asked]).toEqual(["refused", "accepted", "capability-refused: not-staged", []]);
  const reported = await G.stagedDid(vic, "report", report);
  // Its authors are everyone the commitment was ever performed by, each with the member it acts for, in byte order of handle.
  expect(reported.effects.flatMap((e) => (e.effect === "list" && e.slot === "authors" ? [e.member.member] : []))).toEqual(["@paul", "@quinn", "@una", "@vic"]);
  // The report was admitted on the lane's own records: its pin is `held`, on root 1, with the entry that admitted it. The stand-in
  // was asked for the two mints of the staging's first attempt, the ref, the read, and the revocation of each token.
  expect(reported.effects.at(-2)).toMatchObject({ effect: "record", capability: "hold@1", kind: "pin", state: "held", values: { root: 1, commit: COMMIT, admitted: reported.fact.seq } });
  expect([...host.asked].sort()).toEqual(["check", "mint", "mint", "revoke", "revoke", "stage"]);
  const state = await G.state();
  expect([state.record("hold@1", "root", [1])?.state, state.recordCount("hold@1", "token", "ended"), state.record("hold@1", "fork", [h2])?.state, state.outstanding().opened]).toEqual(["live", 2, "creating", 2]);

  // The real outcome names one snapshot twice: its owner's retained list
  // and its confirmed ancestry record. Forecast both native reads. The
  // host above supplies the record; this still proves no Git walk.
  const sealed = (await G.sealed()).find(s => s.entry.input.type === "outcome" && s.entry.input.owner === "hold@1" && s.entry.input.kind === "check");
  if (!sealed || sealed.entry.input.type !== "outcome") return expect.fail("The native check outcome is required.");
  const input = sealed.entry.input, rules = CAPABILITY_CODE.rules?.(input.owner, input.kind);
  if (!rules) return expect.fail("The native hold rules are required.");
  const origin = { at: { at: G.at, seq: sealed.entry.seq, hash: sealed.hash }, input: "outcome" as const };
  const expected = outcomeSnapshotDependencies(origin, input, () => rules);
  const native = localRetainedPlan(G.valid, sealed.entry, sealed.hash, rules, PROPOSED_BOUNDS);
  const projection = await runInDurableObject(G.object, (_instance, stored) => {
    const row = stored.storage.sql.exec<{ size: number; bytes: string }>("SELECT size, bytes FROM entry WHERE seq = ?", sealed.entry.seq).one();
    const cells: unknown[] = [], budget = new ArchiveBudget(), sql = { exec(query: string, ...args: SqlValue[]) {
      const rows = stored.storage.sql.exec(query, ...args).toArray();
      for (const r of rows) cells.push(...Object.values(r));
      return { toArray: () => rows };
    } };
    const position = { seq: sealed.entry.seq, hash: sealed.hash, bytes: row.size, input: "outcome" };
    const read = () => projectArchiveSnapshots(sql, G.at, position, input, rules, budget);
    const projected = read(), before = budget.admitted(), repeated = read(), after = budget.admitted();
    // Restored metadata-only probes cover nonempty structural selectors.
    // These altered rows are not accepted history or ancestry evidence.
    const record = expected.record;
    if (!record) return expect.fail("The host's ancestry record is required.");
    const opaque = "opaque ref that must not cross SQL";
    const probe = (changed: unknown) => {
      const evidence = { ...input.evidence, body: { record: changed } }, bytes = canonicalize({ ...sealed.entry, input: { ...input, evidence } });
      stored.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", bytes, utf8(bytes).length, position.seq);
      return projectArchiveSnapshots(sql, G.at, { ...position, bytes: utf8(bytes).length }, input, rules, budget);
    };
    let nonempty, invalid;
    try {
      nonempty = probe({ ...record, start: { foreign: opaque, basis: { kind: "input", input: terms } },
        stops: [{ kind: "own-root", commit: COMMIT, root: 1, state: "live", checked: terms }], F: [{ commit: COMMIT, ref: opaque, start: true }, { commit: COMMIT, via: COMMIT }] });
      invalid = probe({ ...record, F: [{ commit: COMMIT, via: COMMIT, ref: opaque }] });
    } finally { stored.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", row.bytes, row.size, position.seq); }
    const snapshotCells = [...cells];
    const references = new ArchiveLocalReferences({ named: G.valid.digest, definition: G.valid,
      owners: new Map([[input.owner, new Map([[input.kind, rules]])]]), records: new Map(), preparations: new Map() }, PROPOSED_BOUNDS, budget);
    // Read context and use digests from this exact native row. This supplies
    // no independent privacy/pin admission.
    const composed = references.read(sql, G.at, { ...position, input: "outcome" });
    const queries: string[] = [], sizes: unknown[] = [], retained = new ArchiveRetainedReader({ exec(query, ...args) {
      queries.push(query); const rows = stored.storage.sql.exec(query, ...args).toArray();
      for (const r of rows) sizes.push(...Object.values(r));
      return { toArray: () => rows };
    } }, budget);
    const measuredBefore = budget.admitted();
    const measured = measureArchiveReferences(retained, projected.dependencies.map(dependency => ({ dependency, max: RETAINED_INPUT_BYTES })), PROPOSED_BOUNDS);
    const measuredAfter = budget.admitted(), measurementQueries = [...queries], measurementCells = [...sizes];
    // Oracle reads now exercise a real cold read followed by cached native
    // validation. The measurement helper itself has read no body.
    for (const request of projected.dependencies) expect(retained.read(request.key, RETAINED_INPUT_BYTES)).not.toBeNull();
    const readAfter = budget.admitted();
    return { projected, repeated, before, after, cells: snapshotCells, nonempty, invalid, opaque, composed,
      measured, measuredBefore, measuredAfter, readAfter, measurementQueries, measurementCells };
  });
  expect(projection.projected.dependencies).toEqual(expected.dependencies);
  expect(projection.projected.dependencies).toEqual(native.dependencies.filter(p => p.dependency.consumer === "outcome-snapshot").map(p => p.dependency));
  expect(projection.projected.dependencies).toHaveLength(2);
  expect(projection.projected.dependencies.map(d => d.key)).toEqual([{ kind: "snapshot", digest: expected.record!.snapshot.digest }, { kind: "snapshot", digest: expected.record!.snapshot.digest }]);
  expect(projection.projected.ancestrySnapshot).toEqual(expected.record!.snapshot);
  expect(projection.composed).toEqual({ dependencies: native.dependencies, ancestrySnapshot: expected.record!.snapshot });
  expect(projection.measured.measurements).toHaveLength(2);
  expect(projection.measured.measurements.map(m => m.candidates[0]?.key)).toEqual(projection.projected.dependencies.map(d => d.key));
  expect(projection.measuredAfter.attempts - projection.measuredBefore.attempts).toBe(2);
  expect(projection.measurementQueries).toHaveLength(2);
  expect(projection.measurementQueries.every(q => q.startsWith("SELECT octet_length(bytes)") && !q.startsWith("SELECT bytes"))).toBe(true);
  expect(projection.measurementCells.every(c => typeof c === "number" || c === "text")).toBe(true);
  for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) {
    expect(projection.readAfter[key] - projection.measuredAfter[key]).toBeLessThanOrEqual(projection.measured.reads[key] ?? 0);
  }
  expect(projection.repeated).toEqual(projection.projected);
  expect(projection.after.calls).toBeGreaterThan(projection.before.calls);
  expect(projection.after.inputWork).toBeGreaterThan(projection.before.inputWork);
  expect(projection.nonempty).toEqual(projection.projected);
  expect(projection.invalid).toEqual({ dependencies: [], ancestrySnapshot: null });
  expect(projection.cells).not.toContain(projection.opaque);
  const scalarNames = new Set(["object", "text", "null", "array", "row", "own-check", "input", "own-root", "selected-report", "live", "retiring", "retired", "true", "absent", "invalid",
    COMMIT, "0".repeat(40), expected.record!.snapshot.digest, terms.at.scope, terms.at.inc, terms.at.kind, terms.hash]);
  expect(projection.cells.every(c => c === null || typeof c === "number" || typeof c === "string" && scalarNames.has(c))).toBe(true);
});

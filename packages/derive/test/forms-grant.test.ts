import { describe, expect, test } from "vitest";
import type { Grant, Input, Observation, ObservationUse } from "@generalbusiness/dap-contract";
import { canonicalize, isGrant } from "@generalbusiness/dap-bytes";
import { MISMATCHES, MemoryState, WINDOWS, actionsOf, agrees, covers, grantFrom, headsOf, highestHead, judgeActBody, judgeExploreGrant, judgeGrant, observationOf, prefer, windowOf, type GrantAsked, type GrantJudgment, type JudgeContext, type Presented, type RoleTable } from "../src/index.ts";
import { d, keys, laneDefinition, membership, otherLane, t } from "./fixtures-entry.ts";

const { rita, una } = keys;
// `judgeExploreGrant` is the one export of the Explore value check. Its types have no names outside this package, so the test takes them from it.
type ExploreAsked = Parameters<typeof judgeExploreGrant>[1];
type ExploreJudgment = ReturnType<typeof judgeExploreGrant>;
type ExploreGrant = Extract<ExploreJudgment, { result: "current" }>["grant"];
type BodyGrants = Parameters<typeof judgeActBody>[3]["grants"];

/** A made-up role table, as data: the membership scope's value at one head. */
const ROLES: RoleTable = { member: ["issue.comment", "issue.open"], checker: ["change.check"] };

/** One fixture: rita's key, active, read at membership's head 40 when the lane's clock read T0, as read 7 of run r1, and used by no entry yet. */
const standing: Observation = {
  of: membership, head: { seq: 40, hash: d("4") }, key: rita.key, keyState: "active", member: "@rita", memberState: "active", role: "member", actions: actionsOf(ROLES, "member"),
  within: { membership }, controller: null, controllerActive: null, notAfter: null, definition: "platform:membership@1", at: t(0),
};
/** The membership scope of another repository, and the same membership scope ID with another genesis. */
const elsewhere = { ...membership, scope: otherLane.scope };
const reborn = { ...membership, genesis: otherLane.genesis };
const fresh: ObservationUse = { observation: standing, read: { run: "r1", n: 7 }, use: "fresh", prior: null };
const at = (seconds: number) => ({ reading: t(seconds), behind: false, asOf: t(seconds) });
const asked: GrantAsked = { scope: otherLane, membership, key: rita.key, action: "issue.comment", window: WINDOWS.ordinary, clock: at(299), last: null, highest: null };

/** Entry 5 of the lane, written at T0 + 10 s, retains read 7. */
const prior = { seq: 5, hash: d("5") };
const reused: ObservationUse = { ...fresh, use: "reused", prior };
const last = { entry: prior, time: t(10), observation: standing };
const of = (change: Partial<Observation>, use: ObservationUse = fresh): ObservationUse & { observation: Observation } => ({ ...use, observation: { ...standing, ...change } });
const said = (judged: GrantJudgment) => (judged.result === "current" ? "current" : `${judged.result}: ${judged.failed}`);

describe("the grant guard and the commit guards of an observation (authority note, section 3.3; section 16.1; T45)", () => {
  test("a scope-granted device answer uses current identity without adding a target action to the member's role", () => {
    const identity = of({ actions: [] });
    const answer: GrantAsked = { ...asked, action: "device-command@1:answer", scopeGrant: true };
    const { scopeGrant: _scopeGrant, ...ordinary } = answer;
    expect(said(judgeGrant(identity, ordinary))).toBe("unauthorized: action");
    const current = judgeGrant(identity, answer);
    expect(current.result).toBe("current");
    if (current.result !== "current") throw new Error("current identity required");
    expect(current.grant.actions).toEqual([]);
    expect(agrees(current.grant)).toBe(true);
    const cases: readonly [ObservationUse, Partial<GrantAsked>, string][] = [
      [of({ actions: [], keyState: "retired" }), {}, "unauthorized: revoked"],
      [of({ actions: [], memberState: "removed" }), {}, "unauthorized: revoked"],
      [identity, { key: una.key }, "unauthorized: key"],
      [of({ actions: [], within: { membership: reborn } }), {}, "unauthorized: within"],
      [of({ actions: [], notAfter: t(299) }), {}, "unauthorized: not-after"],
      [of({ actions: [], controller: "@paul", controllerActive: false }), {}, "unauthorized: controller"],
      [identity, { clock: at(300) }, "authority-unavailable: age"],
      [identity, { highest: 41 }, "authority-unavailable: older"],
    ];
    expect(cases.map(([use, change]) => said(judgeGrant(use, { ...answer, ...change })))).toEqual(cases.map(([, , expected]) => expected));
  });

  test("one table: the window and its edge, whose answer it is, a revocation, the role's actions, a reuse, and the order of heads", () => {
    const cases: readonly (readonly [name: string, use: ObservationUse, asked: Partial<GrantAsked>, expected: string])[] = [
      ["inside the window, one second before its end", fresh, {}, "current"],
      ["at the edge: an age equal to the window is outside it", fresh, { clock: at(300) }, "authority-unavailable: age"],
      ["outside the window", fresh, { clock: at(301) }, "authority-unavailable: age"],
      ["a reading earlier than the read began proves nothing", fresh, { clock: at(-1) }, "authority-unavailable: age"],
      ["a ten-second kind, at its edge", fresh, { window: WINDOWS.once, clock: at(10) }, "authority-unavailable: age"],
      ["the wrong key: an observation of rita's key is no grant to una's", fresh, { key: una.key }, "unauthorized: key"],
      ["the wrong genesis of membership", of({ of: { ...membership, genesis: otherLane.genesis } }), {}, "authority-unavailable: of"],
      // Section 16.1, "How a scope is covered"; witness 18.40. A filter covers a scope exactly when its `membership` is the reference
      // that the scope itself records, with that incarnation. The lane records `membership`, and the answer above names it.
      ["`within` names the membership scope of another repository", of({ within: { membership: elsewhere } }), {}, "unauthorized: within"],
      ["`within` names this membership scope in another incarnation", of({ within: { membership: reborn } }), {}, "unauthorized: within"],
      ["the same answer, in a scope that records another membership scope: it is no observation of that scope's own", fresh, { membership: elsewhere }, "authority-unavailable: of"],
      ["`within` is this scope's own reference, which covers the one scope it names", of({ within: otherLane as never }), {}, "current"],
      ["`within` is the reference of another scope", of({ within: membership as never }), {}, "unauthorized: within"],
      ["`within` is a filter with a member added: no filter, so it covers nothing", of({ within: { membership, task: 4 } as never }), {}, "unauthorized: within"],
      // Authority note, revision 25, section 12.1, "Guard 1 of an observation, for these two scopes": a rules scope and a destination
      // record membership's scope ID and, before their first retained observation, no incarnation. Guard 1 then takes an observation
      // of that ID, of the kind `membership`, and the grant covers the scope by the reference that answered. Once an incarnation is
      // recorded it is the first case above again: another incarnation is discarded.
      ["a scope that records the ID and no incarnation: the answer of that ID passes guard 1, and its filter covers the scope", fresh, { membership: { scope: membership.scope, pending: true } }, "current"],
      ["the same scope: an answer of that ID in any incarnation, whose filter names the incarnation that answered", of({ of: reborn, within: { membership: reborn } }), { membership: { scope: membership.scope, pending: true } }, "current"],
      ["the same scope: an answer of another scope ID", fresh, { membership: { scope: elsewhere.scope, pending: true } }, "authority-unavailable: of"],
      ["the same scope: a filter that names another incarnation than the one that answered", of({ within: { membership: reborn } }), { membership: { scope: membership.scope, pending: true } }, "unauthorized: within"],
      ["revoked as retired: refused, also long past the window", of({ keyState: "retired" }), { clock: at(9000) }, "unauthorized: revoked"],
      ["the member removed", of({ memberState: "removed" }), {}, "unauthorized: revoked"],
      // The order of the three parts: whose answer it is, then the use guards, then the value's own conditions.
      ["the wrong key, revoked and old: the key answers first", of({ keyState: "retired" }), { key: una.key, clock: at(9000) }, "unauthorized: key"],
      ["old and missing the action: the age discards the answer before its role's actions are read", of({ role: "checker", actions: actionsOf(ROLES, "checker") }), { clock: at(9000) }, "authority-unavailable: age"],
      ["a key that membership does not hold", of({ keyState: "unknown" }), {}, "unauthorized: key-state"],
      ["a role without the grant", of({ role: "checker", actions: actionsOf(ROLES, "checker") }), {}, "unauthorized: action"],
      ["a grant's end time, at its bound", of({ notAfter: t(299) }), {}, "unauthorized: not-after"],
      ["an agent whose controller is not active signs a comment", of({ controller: "@paul", controllerActive: false }), {}, "current"],
      ["and is refused another action", of({ controller: "@paul", controllerActive: false }), { action: "issue.open" }, "unauthorized: controller"],
      ["reused at a later reading, with the entry that retains the read as `prior`", reused, { last }, "current"],
      ["reused at an equal reading: the clock has not moved", reused, { last, clock: at(10) }, "authority-unavailable: moved"],
      ["marked `fresh`, though an earlier entry retains the read", fresh, { last }, "authority-unavailable: use"],
      ["marked `reused`, though no earlier entry retains the read", reused, {}, "authority-unavailable: use"],
      ["a ten-second kind that is reused", reused, { last, window: WINDOWS.once, clock: at(11) }, "authority-unavailable: once"],
      ["an older head after a newer one is retained", fresh, { highest: 41 }, "authority-unavailable: older"],
      ["the same head as the one retained", fresh, { highest: 40 }, "current"],
      // Section 5.3: no act is written on a clock that is behind, so the reading judges no age. The judge answers `clock-behind`.
      ["the clock behind the history", fresh, { clock: { reading: t(-5), behind: true, asOf: t(20) } }, "current"],
    ];
    expect(cases.map(([name, use, change]) => [name, said(judgeGrant(use, { ...asked, ...change }))])).toEqual(cases.map(([name, , , expected]) => [name, expected]));

    // The grant is built from the observation, and retains it as its proof. A grant that says more than its observation does not agree.
    const judged = judgeGrant(fresh, asked);
    const grant = { issued: { at: membership, seq: 40, hash: d("4") }, subject: rita.member, key: rita.key, principal: null, actions: ["issue.comment", "issue.open"], within: { membership }, notAfter: null, fresh };
    expect(judged).toEqual({ result: "current", grant });
    expect([agrees(grant), agrees({ ...grant, actions: [...grant.actions, "change.merge"] })]).toEqual([true, false]);
    // What a replay calls a history that holds an entry with each failed guard.
    expect(MISMATCHES).toEqual({ once: "observation-reused", moved: "observation-not-moved", older: "observation-older" });
  });

  test("the Explore value check: the order of judgeGrant without its use guards, and a grant with no proof", () => {
    const { at: _began, ...value } = standing;
    const explored = (change: Partial<Observation>, over: Partial<ExploreAsked> = {}): ExploreJudgment =>
      judgeExploreGrant({ ...value, ...change }, { scope: asked.scope, membership: asked.membership, key: asked.key, action: asked.action, clock: { asOf: at(299).asOf }, ...over });
    const exploredSaid = (judged: ExploreJudgment) => (judged.result === "current" ? "current" : `${judged.result}: ${judged.failed}`);
    const cases: readonly (readonly [name: string, change: Partial<Observation>, key: typeof rita.key, expected: string])[] = [
      ["a standing inside its end", {}, rita.key, "current"],
      ["the wrong key", {}, una.key, "unauthorized: key"],
      ["another incarnation of membership", { of: reborn }, rita.key, "authority-unavailable: of"],
      ["revoked as retired", { keyState: "retired" }, rita.key, "unauthorized: revoked"],
      ["the member removed", { memberState: "removed" }, rita.key, "unauthorized: revoked"],
      ["the wrong key and revoked: the key answers first", { keyState: "retired" }, una.key, "unauthorized: key"],
      ["revoked and missing the action: the revocation answers first", { keyState: "retired", role: "checker", actions: actionsOf(ROLES, "checker") }, rita.key, "unauthorized: revoked"],
      ["an unknown key state and a missing action: the key state answers first", { keyState: "unknown", role: "checker", actions: actionsOf(ROLES, "checker") }, rita.key, "unauthorized: key-state"],
      ["a role without the action", { role: "checker", actions: actionsOf(ROLES, "checker") }, rita.key, "unauthorized: action"],
      ["`within` names another incarnation", { within: { membership: reborn } }, rita.key, "unauthorized: within"],
      ["an end time at its bound", { notAfter: t(299) }, rita.key, "unauthorized: not-after"],
      ["an agent whose controller is not active signs a comment", { controller: "@paul", controllerActive: false }, rita.key, "current"],
    ];
    const expected = cases.map(([, , , answer]) => answer);
    expect(cases.map(([, change, key]) => exploredSaid(explored(change, { key })))).toEqual(expected);
    // Inside the window and with no use to judge, the answers are judgeGrant's own.
    expect(cases.map(([, change, key]) => said(judgeGrant(of(change), { ...asked, key })))).toEqual(expected);

    // No use guard: an answer that judgeGrant discards for its age is judged on its value, and the value's refusals keep their order.
    const old = { clock: { asOf: at(9000).asOf } };
    expect([said(judgeGrant(fresh, { ...asked, clock: at(9000) })), exploredSaid(explored({}, old))]).toEqual(["authority-unavailable: age", "current"]);
    expect([exploredSaid(explored({ keyState: "retired" }, old)), exploredSaid(explored({ role: "checker", actions: actionsOf(ROLES, "checker") }, old))]).toEqual(["unauthorized: revoked", "unauthorized: action"]);

    // The grant has the seven members of grantFrom, in its order, and no own `fresh`: not null, not undefined.
    const judged = explored({}), proven = judgeGrant(fresh, asked);
    if (judged.result !== "current" || proven.result !== "current") return expect.fail("both answers must be current");
    expect(Object.hasOwn(judged.grant, "fresh")).toBe(false);
    expect(Object.keys(judged.grant)).toEqual(Object.keys(proven.grant).filter((name) => name !== "fresh"));
    expect(judged.grant).toEqual({ issued: { at: standing.of, seq: standing.head.seq, hash: standing.head.hash }, subject: rita.member, key: rita.key, principal: null, actions: standing.actions, within: standing.within, notAfter: null });
    expect([isGrant(judged.grant), isGrant(proven.grant)]).toEqual([false, true]);

    // Compile-only: the value is no Grant, no Presented, no authority of an entry and no grant of a judge's context. A body context takes it.
    const rejected = (grant: ExploreGrant): void => {
      // @ts-expect-error a grant with no proof is no contract Grant
      const asGrant: Grant = grant;
      // @ts-expect-error nor a presented grant
      const asPresented: Presented = { grant, current: true };
      // @ts-expect-error nor the authority that an entry records
      const asAuthority: Extract<Input, { type: "act" }>["authority"] = [grant];
      // @ts-expect-error nor a grant of the context that the runtime and a replay pass
      const asContext: JudgeContext["grants"] = [{ grant, current: true }];
      const asBody: BodyGrants = [{ grant, current: true }, { grant: proven.grant, current: false }];
      void [asGrant, asPresented, asAuthority, asContext, asBody];
    };
    void rejected;
  });

  // EK1 changed `grantFrom` to spread `valueGrant`. The recorded bytes of a grant must not change. The expected text is written from the body of
  // `grantFrom` before the change: eight members (`issued` with `at`, `seq` and `hash`; `subject` with `membership` and `member`; `key`;
  // `principal` null; `actions`; `within`; `notAfter`; `fresh` as given), read from this fixture's observation. `canonicalize` sorts the
  // members by name, so the text does not show their order; `Object.keys` does, and keeps the order that `grantFrom` returned before.
  test("the bytes of a recorded grant are the bytes that grantFrom gave before the Explore value split", () => {
    const M = canonicalize(membership);
    const expected = (proof: string) => `{"actions":["issue.comment","issue.open"],${proof}"issued":{"at":${M},"hash":${JSON.stringify(standing.head.hash)},"seq":40},"key":${JSON.stringify(rita.key)},`
      + `"notAfter":null,"principal":null,"subject":{"member":"@rita","membership":${M}},"within":{"membership":${M}}}`;
    const granted = grantFrom(fresh);
    expect(canonicalize(granted)).toBe(expected(`"fresh":${canonicalize(fresh)},`));
    expect(Object.keys(granted)).toEqual(["issued", "subject", "key", "principal", "actions", "within", "notAfter", "fresh"]);
    expect(granted.fresh).toBe(fresh);
    // The value check gives the same text without the proof.
    const { at: _began, ...value } = standing;
    const explored = judgeExploreGrant(value, { scope: asked.scope, membership: asked.membership, key: asked.key, action: asked.action, clock: { asOf: at(299).asOf } });
    if (explored.result !== "current") return expect.fail("the standing value must be current");
    expect(canonicalize(explored.grant)).toBe(expected(""));
  });

  test("the window is the definition's: an act that opens a hold is a ten-second kind; a revoked answer stays; and an answer that is not a whole standing is none", () => {
    const window = (kind: Parameters<typeof windowOf>[1], act: string) => windowOf(laneDefinition, kind, act);
    expect([window("lane", "take-hold"), window("lane", "remark"), window("directory", "remark"), window("destination", "remark"), window("rules", "remark"), window("lane", "no-such-act")])
      .toEqual([WINDOWS.once, WINDOWS.ordinary, WINDOWS.ordinary, WINDOWS.ordinary, WINDOWS.ordinary, null]);
    // Nothing is read for an act of membership, which judges on its own head, or of the register, which judges on no grant. The
    // windows of a task scope are not built.
    expect([window("membership", "remark"), window("register", "remark"), window("task", "remark")]).toEqual([null, null, null]);

    const held = { observation: standing };
    const retired = of({ keyState: "retired", head: { seq: 44, hash: d("6") } });
    const older = of({ head: { seq: 39, hash: d("3") } });
    const newer = of({ head: { seq: 41, hash: d("7") } });
    // A revoked answer discards what was held, and nothing that arrives later replaces it. Otherwise the higher head stays.
    expect([prefer(held, retired), prefer(retired, newer), prefer(held, older), prefer(held, newer), prefer(null, older)]).toEqual([retired, retired, held, newer, older]);

    const { at: began, ...answer } = standing;
    expect([observationOf(answer, began), observationOf({ ...answer, extra: 1 }, began), observationOf({ ...answer, keyState: "fine" }, began), observationOf({ ...answer, of: otherLane }, began)]).toEqual([standing, null, null, null]);
    // Section 16.1: in an answer `within` is a filter whose `membership` equals `of`. A scope reference, another membership scope
    // and a filter with a member added are each no answer. The answer names no asker: one answer serves every scope of the repository.
    expect([otherLane, { membership: elsewhere }, { membership, task: 4 }].map((within) => observationOf({ ...answer, within }, began))).toEqual([null, null, null]);
    // Section 16.1, "The fold holds the highest head": a retained observation of a key counts under its key and under its member,
    // of its observed scope. Another key of that member meets the same head, and a key of another member meets none. A grant with
    // no proof retains nothing, and a state that holds no head has no member for them.
    const state = new MemoryState();
    for (const head of headsOf(fresh)) state.putObserved(head);
    expect([highestHead(state, standing), highestHead(state, { ...standing, key: una.key }), highestHead(state, { ...standing, key: una.key, member: "@una" }), highestHead(state, { ...standing, of: reborn })]).toEqual([40, 40, null, null]);
    expect([Object.keys(state.all()).at(-1), "observed" in new MemoryState().all(), headsOf(null)]).toEqual(["observed", false, []]);
    // I3 deltas, section 31, entry FD5: the incarnations of an observed scope ID are read from one list, whatever the number of
    // subjects. 1,000 subjects of two incarnations of one ID, and an ID that none is of: three steps and one, counted. The earlier code read all
    // 1,000 heads for each, by reading it.
    const counted = { steps: 0 };
    const many = new MemoryState(counted);
    for (let i = 0; i < 1000; i++) many.putObserved({ of: i % 2 === 0 ? membership : reborn, subject: `@m${i}`, seq: i });
    expect([many.geneses(membership.scope), many.geneses(otherLane.scope), counted.steps]).toEqual([[membership.genesis, reborn.genesis].sort(), [], 4]);
    // A scope with no recorded membership reference is covered by no filter, and by its own reference.
    expect([covers({ membership }, otherLane, null), covers(otherLane, otherLane, null), covers({ membership }, otherLane, membership), covers({ membership }, membership, membership)]).toEqual([false, true, true, true]);
  });
});

/** The live Counter: counting commitments, Draft 4. Compiles to the bytes apps/counter/commitments.json pins. */
import type { Operand } from "@generalbusiness/dap-contract";
import { anyOf, by, constant, count, define, differs, el, enumOf, equals, fact, final, grants, int, item, itemOf, list, live, member, none, one, open, party, plusSeconds, range, record, ref, required, rule, sameSet, self, signer, time, timed, transition, value, when, type Of } from "./lib.ts";

const NAME = "counting-commitments";
export const countingGrants = grants({ establish: "counting.establish", control: "counting.control", participate: "counting.participate",
  activity: "counting.activity", commit: "counting.commit", fulfill: "counting.fulfill", fail: "counting.fail" });
const level = int(0, 1_000_000), number = int(1, 100);
const failureReasons = enumOf("media-error", "process-error", "cancelled", "interrupted", "speech-uncertain");

export const configuration = item("configuration", { initial: "ready", states: { ready: live }, parties: { controller: party.fixed }, values: { target: value.fixed(number) } });
export const board = item("board", {
  initial: "paused", states: { paused: live, open: live, finished: live },
  parties: { controller: party.fixed, lastSpeaker: party.optional },
  refs: { pledge: ref.optional(itemOf("promise")), lastFulfilledAt: ref.optional(fact(NAME, "fulfill")) },
  values: { target: value.fixed(number), generation: value.required(level, 0), serial: value.required(level, 0), lastNumber: value.required(int(0, 100), 0), until: value.optional(time) },
});
export const participant = item("participant", { many: 16, initial: "inactive", states: { inactive: live, active: live, removed: final }, parties: { agent: party.fixed } });
const basis = list(record({ id: required(itemOf(participant)), member: required(member) }), 16);
export const promise = item("promise", {
  many: 1,
  initial: "pledged", states: { pledged: live, fulfilled: final, failed: final, cancelled: final, expired: final },
  parties: { agent: party.fixed },
  refs: { participant: ref.fixed(itemOf(participant)), admittedAt: ref.fixed(fact(NAME, "commit")) },
  values: { n: value.fixed(number), generation: value.fixed(level), serial: value.fixed(int(1, 1_000_000)), basis: value.fixed(basis), until: value.fixed(time), reason: value.optional(failureReasons) },
});

// ---------------------------------------------------------------- combinators

/** No pledged promise belongs to `agent`. Other agents' pledges do not block this guard. */
const noPledgeBy = (pledges: typeof promise, agent: Operand) =>
  none(pledges, ["pledged"], (pledge) => [equals(pledge.slot("agent"), agent)]);
/** No promise is pledged and the board links none. */
const boardClear = (b: Of<typeof board>, pledges: typeof promise) => [b.unset("pledge"), none(pledges, ["pledged"])];
/** The resolution of a pledge: the board's open, its link is this promise, and the plan rule holds. */
const resolving = (on: Of<typeof promise>, b: Of<typeof board>) => [on.in("pledged"), b.in("open"), equals(b.slot("pledge"), on.id),
  rule("resolution-plan", "($b := $lookup(subjects,\"also.board\"); $v := subjects.on.values; $exists($b) and fields.generation = $v.generation and fields.generation = $b.values.generation and fields.serial = $v.serial and fields.serial = $b.values.serial and fields.n = $v.n and fields.n = $b.values.lastNumber + 1 and fields.n <= $b.values.target)")];
/** The board drops its link and deadline. */
const unlink = (b: Of<typeof board>) => [b.ref("pledge", null), b.value("until", null)];
const resolution = { generation: required(level), serial: required(int(1, 1_000_000)), n: required(number) };

type CounterItems = { configuration: typeof configuration; board: typeof board; participant: typeof participant; promise: typeof promise };

/** The definition passes every subject and permission this module uses. */
function countingActs({ configuration, board, participant, promise }: CounterItems, permits: typeof countingGrants) {
  return {
    establish: open(configuration, permits.establish, { fields: { opener: required(member), target: required(number) } }, ({ f, on }) => ({
      effects: [on.party("controller", f.opener), on.value("target", f.target)],
    })),
    initialize: open(board, permits.control, { also: { configuration: one(configuration) } }, ({ on, also }) => ({
      guards: [also.configuration.in("ready"), also.configuration.signer("controller")],
      effects: [on.party("controller", also.configuration.slot("controller")), on.value("target", also.configuration.slot("target"))],
    })),
    participate: open(participant, permits.participate, {}, ({ on }) => ({
      guards: [none(participant, ["inactive", "active"], (member) => [equals(member.slot("agent"), signer)])],
      effects: [on.party("agent", signer)],
    })),
    activate: transition(participant, permits.activity, {}, ({ on }) => ({
      guards: [on.in("inactive"), on.signer("agent")],
      effects: [on.to("active")],
    })),
    deactivate: transition(participant, permits.activity, {}, ({ on }) => ({
      guards: [on.in("active"), on.signer("agent"), noPledgeBy(promise, on.slot("agent"))],
      effects: [on.to("inactive")],
    })),
    "force-deactivate": transition(participant, permits.control, { also: { configuration: one(configuration) } }, ({ on, also }) => ({
      guards: [on.in("active"), also.configuration.signer("controller"), differs(signer, on.slot("agent")), noPledgeBy(promise, on.slot("agent"))],
      effects: [on.to("inactive")],
    })),
    "remove-participant": transition(participant, permits.control, { also: { configuration: one(configuration) } }, ({ on, also }) => ({
      guards: [on.in("inactive"), also.configuration.signer("controller"), noPledgeBy(promise, on.slot("agent"))],
      effects: [on.to("removed")],
    })),
    start: transition(board, permits.control, {}, ({ on }) => ({
      guards: [on.in("paused"), on.signer("controller"), ...boardClear(on, promise), rule("start-plan", "subjects.on.values.lastNumber < subjects.on.values.target")],
      effects: [on.to("open")],
    })),
    // by(participant) also declares the required participant input field.
    commit: open(promise, permits.commit, { also: { board: one(board), participant: by(participant) }, fields: { ...resolution, basis: required(basis) } }, ({ f, on, also }) => ({
      guards: [
        also.board.in("open"), ...boardClear(also.board, promise), also.participant.in("active"), also.participant.signer("agent"),
        sameSet(f.basis, "p", el("p", "id"), participant, ["active"], { match: (activeParticipant) => [equals(activeParticipant.slot("agent"), el("p", "member"))], ordered: true }),
        anyOf([count(range(participant, ["active"]), { max: 1 })], [differs(signer, also.board.slot("lastSpeaker"))]),
        rule("commit-plan", "($b := $lookup(subjects,\"also.board\"); $p := $lookup(subjects,\"also.participant\"); $exists($b) and $exists($p) and fields.generation = $b.values.generation and fields.serial = $b.values.serial + 1 and fields.n = $b.values.lastNumber + 1 and fields.n <= $b.values.target)"),
      ],
      effects: [
        on.party("agent", signer), on.ref("participant", also.participant.id), on.ref("admittedAt", self),
        ...on.take(f, "n", "generation", "serial", "basis"), on.value("until", plusSeconds(30)),
        also.board.value("serial", f.serial), also.board.ref("pledge", self), also.board.value("until", plusSeconds(30)),
      ],
    })),
    fulfill: transition(promise, permits.fulfill, { also: { board: one(board) }, fields: resolution }, ({ f, on, also }) => ({
      guards: [...resolving(on, also.board), on.signer("agent"), on.before("until")],
      effects: [
        on.to("fulfilled"), also.board.value("lastNumber", f.n), also.board.party("lastSpeaker", on.slot("agent")), also.board.ref("lastFulfilledAt", self), ...unlink(also.board),
        when(also.board.to("finished"), { if: [equals(f.n, also.board.slot("target"))] }),
        when(also.board.to("open"), { unless: [equals(f.n, also.board.slot("target"))] }),
      ],
      // Settlement eligibility is a declaration; the effects write state.
      settles: on.settles("pledged"),
    })),
    fail: transition(promise, permits.fail, { also: { board: one(board) }, fields: { ...resolution, reason: required(failureReasons) } }, ({ f, on, also }) => ({
      guards: [...resolving(on, also.board), on.signer("agent")],
      effects: [on.to("failed"), on.value("reason", f.reason), also.board.to("paused"), ...unlink(also.board)],
      settles: on.settles("pledged"),
    })),
    cancel: transition(promise, permits.control, { also: { board: one(board) }, fields: resolution }, ({ on, also }) => ({
      guards: [...resolving(on, also.board), also.board.signer("controller")],
      effects: [on.to("cancelled"), on.value("reason", constant("cancelled")), also.board.to("paused"), ...unlink(also.board)],
      settles: on.settles("pledged"),
    })),
    pause: transition(board, permits.control, {}, ({ on }) => ({
      guards: [on.in("open"), on.signer("controller"), ...boardClear(on, promise)],
      effects: [on.to("paused"), ...unlink(on)],
    })),
    reset: transition(board, permits.control, { fields: { generation: required(int(1, 1_000_000)) } }, ({ f, on }) => ({
      guards: [on.in("paused", "finished"), on.signer("controller"), ...boardClear(on, promise), rule("reset-plan", "fields.generation = subjects.on.values.generation + 1")],
      effects: [on.to("paused"), on.value("generation", f.generation), on.value("serial", constant(0)), on.value("lastNumber", constant(0)), on.party("lastSpeaker", null), on.ref("lastFulfilledAt", null), ...unlink(on)],
    })),
  };
}

export const countingCommitments = define({
  name: NAME, genesis: "establish", grants: countingGrants,
  items: [configuration, board, participant, promise],
  acts: countingActs({ configuration, board, participant, promise }, countingGrants),
  timed: {
    "commitment-expired": timed(board, { states: ["open"], deadline: "until", effects: (b) => [b.to("paused"), ...unlink(b)] }),
    "promise-expired": timed(promise, { states: ["pledged"], deadline: "until", effects: (p) => [p.to("expired")] }),
  },
});

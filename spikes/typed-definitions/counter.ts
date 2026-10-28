/** The Counter, written with the typed builders. Compiles to the bytes apps/counter/definition.json pins. */
import type { EffectForm, Guard, Subject } from "@generalbusiness/dap-contract";
import { bool, by, constant, count, define, element, enumOf, equals, int, item, itemOf, list, live, member, none, one, open, party, plusSeconds, range, record, ref, required, rule, sameSet, self, signer, some, timed, time, transition, value, when, type Of } from "./lib.ts";

const serial = int(0, 1000000), nextSerial = int(1, 1000000), n = int(1, 100);
const basis = list(record({ id: required(itemOf("participant")), member: required(member) }), 8);

export const configuration = item("configuration", {
  states: { ready: live },
  parties: { controller: party.fixed },
  values: { target: value.fixed(n) },
});
export const board = item("board", {
  states: { paused: live, running: live, finished: live },
  parties: { controller: party.fixed, speaker: party.optional, lastSpeaker: party.optional },
  refs: { lastSpokenAt: ref.optional({ type: "fact", under: "counting", kind: ["spoken"] }) },
  values: {
    target: value.fixed(n), generation: value.required(serial, 0), serial: value.required(serial, 0), lastNumber: value.required(int(0, 100), 0),
    number: value.optional(n), basis: value.optional(basis), until: value.optional(time),
  },
});
export const participant = item("participant", {
  many: 8,
  states: { joined: live, left: { final: true } },
  parties: { agent: party.fixed },
});

// ---------------------------------------------------------------- combinators: turn-taking

// The hand-written Counter wrote `except: []` on every range; the bytes keep it.
const joined = (except: readonly Subject[] = []) => range(participant, ["joined"], { except });
/** The signer's `basis` list is exactly the joined participants, in order, each naming its agent. */
const roster = (basisField: { field: "basis" }, except?: readonly Subject[]): Guard =>
  sameSet({ list: basisField, as: "p", key: element("p.id"), items: joined(except), match: [equals({ slot: "agent" }, element("p.member"))], ordered: true });

/** Empty the turn: no speaker, no number, no basis, no deadline. */
const clear = (b: Of<typeof board>, condition?: Guard[]): EffectForm[] =>
  [b.party("speaker", null), b.value("number", null), b.value("basis", null), b.value("until", null)].map((e) => (condition ? when(e, { if: condition }) : e));
/** Give the turn to `next` with the proposed number, the roster it was computed from, and fifteen seconds. */
const issue = (b: Of<typeof board>, next: Of<typeof participant>, numberField: { field: string }, basisField: { field: "basis" }, unless?: Guard[]): EffectForm[] =>
  [b.party("speaker", next.slot("agent")), b.value("basis", basisField), b.value("number", numberField), b.value("until", plusSeconds(15))]
    .map((e) => (unless ? when(e, { unless }) : e));

const leaveFields = { generation: required(serial), serial: required(serial), nextSerial: required(nextSerial), basis: required(basis), replace: required(bool), next: { ...itemOf("participant"), required: false } } as const;

/** A participant leaves; when it held the turn the board moves on or pauses, as the signer's plan says and the rule checks. */
const leave = <const F extends typeof leaveFields>(grant: string, fields: F, more: (c: { on: Of<typeof participant>; board: Of<typeof board> }) => Guard[]) =>
  transition(participant, grant, { also: { board: one(board), next: by(participant, "next") }, fields }, ({ f, on, also }) => {
    const current = equals(on.slot("agent"), also.board.slot("speaker"));
    const leftEmpty = equals(f.replace, constant(false)), remaining = equals(f.replace, constant(true));
    return {
      guards: [on.state(["joined"]), also.board.state(["paused", "running", "finished"]), ...more({ on, board: also.board }), roster(f.basis, ["on"]), rule("leave-plan")],
      effects: [
        on.to("left"),
        when(also.board.value("serial", f.nextSerial), { if: [current] }),
        when(also.board.party("speaker", also.next.slot("agent")), { if: [current, remaining] }),
        when(also.board.value("basis", f.basis), { if: [current, remaining] }),
        when(also.board.value("until", plusSeconds(15)), { if: [current, remaining] }),
        when(also.board.to("paused"), { if: [current, leftEmpty] }),
        ...clear(also.board, [current, leftEmpty]),
      ],
    };
  });

// ---------------------------------------------------------------- the definition

export const counting = define({
  name: "counting",
  genesis: "establish",
  items: [configuration, board, participant],
  acts: {
    establish: open(configuration, "counting.establish", { fields: { opener: required(member), target: required(n) } }, ({ f, on }) => ({
      effects: [on.party("controller", f.opener), on.value("target", f.target)],
    })),
    initialize: open(board, "counting.control", { also: { configuration: one(configuration) } }, ({ on, also }) => ({
      guards: [also.configuration.state(["ready"]), also.configuration.signer(["controller"])],
      effects: [on.party("controller", also.configuration.slot("controller")), on.value("target", also.configuration.slot("target"))],
    })),
    join: open(participant, "counting.join", {}, ({ on }) => ({
      guards: [count(joined(), { max: 7 }), none(range(participant, ["joined"], { where: (p) => [equals(p.slot("agent"), signer)], except: [] }))],
      effects: [on.party("agent", signer)],
    })),
    leave: leave("counting.leave", leaveFields, ({ on }) => [on.signer(["agent"])]),
    "cancel-turn": leave("counting.control", { ...leaveFields, reason: required(enumOf(["disconnect", "media-error"])) }, ({ on, board }) =>
      [board.signer(["controller"]), equals(on.slot("agent"), board.slot("speaker")), board.state(["running"])]),
    start: transition(board, "counting.control", { also: { next: by(participant, "next") }, fields: { n: required(n), nextSerial: required(nextSerial), basis: required(basis), next: required(itemOf("participant")) } }, ({ f, on, also }) => ({
      guards: [on.state(["paused"]), on.signer(["controller"]), also.next.state(["joined"]), roster(f.basis), rule("start-plan")],
      effects: [on.to("running"), on.value("serial", f.nextSerial), ...issue(on, also.next, f.n, f.basis)],
    })),
    pause: transition(board, "counting.control", { fields: { nextSerial: required(nextSerial) } }, ({ f, on }) => ({
      guards: [on.state(["running"]), on.signer(["controller"]), rule("serial-plan")],
      effects: [on.to("paused"), on.value("serial", f.nextSerial), ...clear(on)],
    })),
    reset: transition(board, "counting.control", { fields: { generation: required(nextSerial) } }, ({ f, on }) => ({
      guards: [on.state(["paused", "running", "finished"]), on.signer(["controller"]), rule("reset-plan")],
      effects: [on.to("paused"), on.value("generation", f.generation), on.value("serial", constant(0)), on.value("lastNumber", constant(0)), on.party("lastSpeaker", null), on.ref("lastSpokenAt", null), ...clear(on)],
    })),
    spoken: transition(board, "counting.spoken", { also: { next: by(participant, "next") }, fields: { generation: required(serial), serial: required(nextSerial), n: required(n), nextN: required(n), nextSerial: required(nextSerial), basis: required(basis), next: required(itemOf("participant")) } }, ({ f, on, also }) => {
      const done = equals(f.n, on.slot("target"));
      return {
        guards: [on.state(["running"]), on.signer(["speaker"]), some(range(participant, ["joined"], { where: (p) => [equals(p.slot("agent"), signer)], except: [] })), also.next.state(["joined"]), roster(f.basis), rule("spoken-plan")],
        effects: [on.value("lastNumber", f.n), on.party("lastSpeaker", on.slot("speaker")), on.ref("lastSpokenAt", self), on.value("serial", f.nextSerial), when(on.to("finished"), { if: [done] }), ...issue(on, also.next, f.nextN, f.basis, [done]), ...clear(on, [done])],
      };
    }),
  },
  timed: {
    "turn-expired": timed(board, { states: ["running"], deadline: "until", effects: (b) => [b.to("paused"), ...clear(b)] }),
  },
  rules: {
    "start-plan": "($v := subjects.on.values; $b := fields.basis; $c := $count($b); $i := (fields.n - 1) % $c; $c > 0 and fields.n = $v.lastNumber + 1 and fields.n <= $v.target and fields.nextSerial = $v.serial + 1 and fields.next = $b[$i].id)",
    "spoken-plan": "($v := subjects.on.values; $b := fields.basis; $c := $count($b); $i := (fields.nextN - 1) % $c; $c > 0 and fields.generation = $v.generation and fields.serial = $v.serial and fields.n = $v.number and fields.n = $v.lastNumber + 1 and fields.n <= $v.target and fields.nextSerial = $v.serial + 1 and fields.nextN = (fields.n = $v.target ? $v.target : fields.n + 1) and fields.next = $b[$i].id)",
    "leave-plan": '($v := $lookup(subjects,"also.board").values; $b := fields.basis; $c := $count($b); fields.generation = $v.generation and fields.serial = $v.serial and fields.nextSerial = $v.serial + 1 and fields.replace = ($c > 0) and ($c = 0 ? $not($exists(fields.next)) : fields.next = $b[$v.lastNumber % $c].id))',
    "serial-plan": "fields.nextSerial = subjects.on.values.serial + 1",
    "reset-plan": "fields.generation = subjects.on.values.generation + 1",
  },
});

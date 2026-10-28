/**
 * The cost of a change: a lending library whose loans fall due. The
 * borrower gets fourteen days; a timed rule returns the thing when the time
 * passes. Written as a variant of the lending rewrite, with the same
 * builders, and run on the real judges with the in-memory clock.
 */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, directory, grantOf, keys, t, valid, type Ledger } from "@generalbusiness/dap-derive/testing";
import { content, inLibrary, lending, library, publishes } from "./lending.ts";
import { compile, define, item, live, final, party, plusSeconds, signer, text, timed, transition, value, type Of } from "./lib.ts";
import { room } from "./room.ts";

const DAY = 86_400;
/** The lending library's thing, with a `due` slot. */
const dueThing = item("thing", {
  many: 64,
  states: { available: live, lent: live, gone: final },
  parties: { donor: party.fixed, borrower: party.optional },
  values: { name: value.fixed(text(80)), description: value.fixed(text(1000)), reason: value.optional(text(280)), page: value.fixed(text(1024)), due: value.optional({ type: "time" }) },
});
/** Lend for `days`: the same borrow, plus the due time; and a timed return when it passes. */
const dueIn = (days: number) => ({
  borrow: (on: Of<typeof dueThing>) => on.value("due", plusSeconds(days * DAY)),
  returned: timed(dueThing, { states: ["lent"], deadline: "due", effects: (it) => [it.to("available"), it.party("borrower", null), it.value("due", null)] }),
});
const loan = dueIn(14);

export const dueLending = define({
  ...lending,
  name: "lending-due",
  items: [library, dueThing],
  acts: {
    ...lending.acts,
    borrow: transition(dueThing, "lending.member", { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.state(["available"])],
      effects: [on.to("lent"), on.party("borrower", signer), loan.borrow(on)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    return: transition(dueThing, "lending.member", { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.state(["lent"])],
      effects: [on.to("available"), on.party("borrower", null), on.value("due", null)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
  },
  timed: { "loan-due": loan.returned },
});

const destination = { ...directory, kind: "destination" as const };
const grants = (s: Ledger) => ({ grants: [keys.rita, keys.una].map((who) => ({ grant: grantOf(who, s.at, ["lending.member", "lending.staff"]), current: true })) });

test("a loan that falls due: one slot, one effect and one timed rule added; the real judges fire the return", async () => {
  const { definition, findings } = compile(dueLending);
  expect(findings).toEqual([]);
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  // What changed against the lending library, counted on the compiled data.
  expect(Object.keys(definition.items.thing.values)).toEqual([...Object.keys(lending.items.thing.values), "due"]);
  expect(definition.acts.borrow.effects.length - lending.acts.borrow.effects.length).toBe(1);
  expect(Object.keys(definition.timed)).toEqual(["loan-due"]);

  const s = created(valid(checked), { opener: keys.rita.member, destination });
  const r = room(definition, s, grants);
  expect((await r.as(keys.rita).donate({ fields: { name: "Pot", description: "Copper", page: "shelf/0000000000000001.md", content: "page" } })).result).toBe("write");
  const pot = s.last.seq;
  expect((await r.as(keys.una).borrow({ on: pot, fields: { content: "page" } })).result).toBe("write");
  expect(r.item(pot)).toMatchObject({ state: "lent", values: { due: t(14 * DAY) } });
  s.now = t(13 * DAY);
  expect(s.drain()).toEqual([]);
  s.now = t(14 * DAY);
  const fired = s.drain();
  expect(fired.map((j) => j.result)).toEqual(["write"]);
  expect(r.item(pot)).toMatchObject({ state: "available", parties: { borrower: null }, values: { due: null } });
  expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

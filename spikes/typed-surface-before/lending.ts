/** The lending library in the v2 vocabulary. Compiles to the bytes examples/lending/definition.json pins. */
import type { Operand } from "@generalbusiness/dap-contract";
import { by, define, equals, final, item, live, member, none, one, open, party, range, ref, required, rule, scope, signer, tell, text, transition, value, itemOf, type ItemDef, type Of } from "./lib.ts";

export const library = item("library", {
  states: { open: live },
  parties: { founder: party.fixed },
  refs: { destination: ref.fixed(scope("destination")) },
});
export const thing = item("thing", {
  many: 64,
  states: { available: live, lent: live, gone: final },
  parties: { donor: party.fixed, borrower: party.optional },
  values: { name: value.fixed(text(80)), description: value.fixed(text(1000)), reason: value.optional(text(280)), page: value.fixed(text(1024)) },
});

// ---------------------------------------------------------------- combinators

/** No live or gone item of the type holds `given` in `slot`. */
export const unique = <I extends ItemDef>(of: I, slot: Parameters<Of<I>["slot"]>[0], given: Operand) =>
  none(range(of, undefined, { where: (it) => [equals(it.slot(slot), given)] }));
/** Publish `content` at `path` through a destination. The result clauses change nothing; the journal keeps the answer. */
export const publishes = (destination: Operand, path: Operand, content: Operand) =>
  tell({ to: destination, message: "publish-file", fields: { path, content }, result: { refused: [], undelivered: [] } });
export const content = { content: required(text(4096)) };
export const inLibrary = { library: one(library) };

// ---------------------------------------------------------------- the definition

export const lending = define({
  name: "lending",
  genesis: "establish",
  items: [library, thing],
  acts: {
    establish: open(library, "lending.establish", { fields: { opener: required(member), destination: required(scope("destination")) } }, ({ f, on }) => ({
      effects: [on.party("founder", f.opener), on.ref("destination", f.destination)],
    })),
    donate: open(thing, "lending.member", { also: inLibrary, fields: { name: required(text(80)), description: required(text(1000)), ...content, page: required(text(1024)) } }, ({ f, on, also }) => ({
      guards: [rule("shelf-page"), unique(thing, "page", f.page)],
      effects: [on.party("donor", signer), on.value("name", f.name), on.value("description", f.description), on.value("page", f.page)],
      sends: [publishes(also.library.slot("destination"), f.page, f.content)],
    })),
    borrow: transition(thing, "lending.member", { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.in("available")],
      effects: [on.to("lent"), on.party("borrower", signer)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    return: transition(thing, "lending.member", { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.in("lent")],
      effects: [on.to("available"), on.party("borrower", null)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    cancel: transition(thing, "lending.staff", { also: inLibrary, fields: { reason: required(text(280)), ...content } }, ({ f, on, also }) => ({
      guards: [on.in("available", "lent")],
      effects: [on.to("gone"), on.value("reason", f.reason), on.party("borrower", null)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    publish: transition(library, "lending.member", { also: { thing: by(thing, "thing") }, fields: { thing: required(itemOf("thing")), ...content } }, ({ f, on, also }) => ({
      sends: [publishes(on.slot("destination"), also.thing.slot("page"), f.content)],
    })),
  },
  rules: {
    "shelf-page": '$substring(fields.page, 0, 6) = "shelf/" and $substring(fields.page, -3) = ".md" and $not($contains(fields.page, ".."))',
  },
});

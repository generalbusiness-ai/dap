/** The lending library in the v2 vocabulary. Compiles to the bytes examples/lending/definition.json pins. */
import type { Operand } from "@generalbusiness/dap-contract";
import { by, define, equals, final, grants, item, live, member, none, one, open, party, ref, required, rule, scope, signer, tell, text, transition, value, type ItemDef, type Of } from "./lib.ts";

export const lendingGrants = grants({ establish: "lending.establish", member: "lending.member", staff: "lending.staff" });

export const library = item("library", {
  initial: "open", states: { open: live },
  parties: { founder: party.fixed },
  refs: { destination: ref.fixed(scope("destination")) },
});
export const thing = item("thing", {
  many: 64,
  initial: "available", states: { available: live, lent: live, gone: final },
  parties: { donor: party.fixed, borrower: party.optional },
  values: { name: value.fixed(text(80)), description: value.fixed(text(1000)), reason: value.optional(text(280)), page: value.fixed(text(1024)) },
});

// ---------------------------------------------------------------- combinators

/** No item, live or final, holds `given` in `slot`. */
export const unique = <I extends ItemDef>(of: I, slot: Parameters<Of<I>["slot"]>[0], given: Operand) =>
  none(of, undefined, (it) => [equals(it.slot(slot), given)]);
/** Publish `content` at `path` through a destination. The result clauses change nothing; the journal keeps the answer. */
export const publishes = (destination: Operand, path: Operand, content: Operand) =>
  tell({ to: destination, message: "publish-file", fields: { path, content }, result: { refused: [], undelivered: [] } });
export const content = { content: required(text(4096)) };

/** Circulation takes its subjects and permissions from the definition. */
function circulation(libraryItem: typeof library, thingItem: typeof thing, permits: typeof lendingGrants) {
  const inLibrary = { library: one(libraryItem) };
  return {
    establish: open(libraryItem, permits.establish, { fields: { opener: required(member), destination: required(scope("destination")) } }, ({ f, on }) => ({
      effects: [on.party("founder", f.opener), on.ref("destination", f.destination)],
    })),
    donate: open(thingItem, permits.member, { also: inLibrary, fields: { name: required(text(80)), description: required(text(1000)), ...content, page: required(text(1024)) } }, ({ f, on, also }) => ({
      guards: [rule("shelf-page", '$substring(fields.page, 0, 6) = "shelf/" and $substring(fields.page, -3) = ".md" and $not($contains(fields.page, ".."))'), unique(thingItem, "page", f.page)],
      effects: [on.party("donor", signer), ...on.take(f, "name", "description", "page")],
      sends: [publishes(also.library.slot("destination"), f.page, f.content)],
    })),
    borrow: transition(thingItem, permits.member, { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.in("available")],
      effects: [on.to("lent"), on.party("borrower", signer)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    return: transition(thingItem, permits.member, { also: inLibrary, fields: content }, ({ f, on, also }) => ({
      guards: [on.in("lent")],
      effects: [on.to("available"), on.party("borrower", null)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    cancel: transition(thingItem, permits.staff, { also: inLibrary, fields: { reason: required(text(280)), ...content } }, ({ f, on, also }) => ({
      guards: [on.in("available", "lent")],
      effects: [on.to("gone"), on.value("reason", f.reason), on.party("borrower", null)],
      sends: [publishes(also.library.slot("destination"), on.slot("page"), f.content)],
    })),
    // by(thingItem) also declares the required thing input field.
    publish: transition(libraryItem, permits.member, { also: { thing: by(thingItem) }, fields: content }, ({ f, on, also }) => ({
      sends: [publishes(on.slot("destination"), also.thing.slot("page"), f.content)],
    })),
  };
}

export const lending = define({
  name: "lending", genesis: "establish", grants: lendingGrants,
  items: [library, thing], acts: circulation(library, thing, lendingGrants),
});

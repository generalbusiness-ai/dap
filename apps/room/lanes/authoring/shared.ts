import { anyOf, by, constant, detached, digest, enumOf, equals, fact, final, grants, int, invoke, item, itemOf, live, member, open, party, permit, plusSeconds, reasons, receive, ref, require, required, sender, signer, source, text, time, timed, transition, value, via, when } from "@generalbusiness/dap-define";
import type { GrantRef, ItemDef, ReasonRef } from "@generalbusiness/dap-define";

/** JSON retains vocabulary names, not authoring brands, symbol metadata or tuple lengths. */
export type DefinitionData<T> = T extends GrantRef<infer N>
  ? N
  : T extends ReasonRef<infer N>
    ? N
    : T extends string | number | boolean | null | undefined
      ? T
      : T extends readonly (infer V)[]
        ? readonly DefinitionData<V>[]
        : T extends object
          ? { readonly [K in keyof T as K extends symbol ? never : K]: DefinitionData<T[K]> }
          : T;

export const exportItem = item(
  "export",
  {
    many: 16,
    initial: "authorized",
    states: {authorized: live, done: final, refused: final},
    parties: {authorizer: party.fixed, from: party.fixed, to: party.fixed},
    refs: {hold: ref.fixed(itemOf("hold"))},
  },
);

export const holdItem = item(
  "hold",
  {
    many: 16,
    initial: "held",
    states: {ended: final, held: live},
    parties: {holder: party.required},
    refs: {under: ref.fixed(itemOf("commitment"))},
    values: {
      ends: value.required(time),
      epoch: value.required(int(1, 1000000)),
      extent: value.optional(text(1024)),
    },
  },
);

export function sharedForms<
  const P extends "issue" | "change",
  const C extends ItemDef<"comment">,
  const K extends ItemDef<"commitment">,
>(prefix: P, items: { comment: C; commitment: K }) {
  const g = grants(
    {
      "issue.comment": `${prefix}.comment`,
      "issue.edit-any": `${prefix}.edit-any`,
      "issue.promise": `${prefix}.promise`,
      "issue.triage": `${prefix}.triage`,
      "issue.work": `${prefix}.work`,
      "work.export": "work.export",
    },
  );
  const r = reasons(
    {
      "export-not-authorized": "export-not-authorized",
      "not-offeree": "not-offeree",
      "target-not-held": "target-not-held",
    },
  );
  return {
  acts: {
    "authorize-export": open(
      exportItem,
      g["work.export"],
      {
        also: {hold: by(holdItem, "hold")},
        fields: {hold: required(itemOf("hold")), to: required(member)},
      },
      _ctx => ({
        guards: [_ctx.also["hold"].in("ended")],
        effects: [
          _ctx.on.party("from", _ctx.also["hold"].slot("holder")),
          _ctx.on.party("to", _ctx.f["to"]),
          _ctx.on.party("authorizer", signer),
          _ctx.on.ref("hold", _ctx.also["hold"].id),
        ],
      }),
    ),
    "collapse-comment": transition(
      items.comment,
      g["issue.triage"],
      {fields: {reason: required(text(1024))}},
      _ctx => ({
        guards: [_ctx.on.in("visible")],
        effects: [_ctx.on.to("collapsed"), _ctx.on.value("collapseReason", _ctx.f["reason"])],
      }),
    ),
    decline: transition(
      items.commitment,
      g["issue.promise"],
      {},
      _ctx => ({
        guards: [
          _ctx.on.in("offered"),
          require(
            anyOf([_ctx.on.unset("offeree")], [equals(signer, _ctx.on.slot("offeree"))]),
            r["not-offeree"],
          ),
        ],
        effects: [_ctx.on.to("declined")],
      }),
    ),
    "decline-handover": transition(
      items.commitment,
      g["issue.promise"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("accepted"), _ctx.on.signer("successor")],
        effects: [_ctx.on.party("successor", null)],
      }),
    ),
    "edit-comment-any": transition(
      items.comment,
      g["issue.edit-any"],
      {fields: {body: required(detached(65536))}},
      _ctx => ({
        guards: [_ctx.on.in("visible", "collapsed")],
        effects: [_ctx.on.value("body", _ctx.f["body"])],
      }),
    ),
    "edit-comment-own": transition(
      items.comment,
      g["issue.comment"],
      {fields: {body: required(detached(65536))}},
      _ctx => ({
        guards: [_ctx.on.in("visible", "collapsed"), _ctx.on.signer("author")],
        effects: [_ctx.on.value("body", _ctx.f["body"])],
      }),
    ),
    "expand-comment": transition(
      items.comment,
      g["issue.triage"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("collapsed")],
        effects: [_ctx.on.to("visible"), _ctx.on.value("collapseReason", null)],
      }),
    ),
    "offer-handover": transition(
      items.commitment,
      g["issue.promise"],
      {fields: {successor: required(member)}},
      _ctx => ({
        guards: [_ctx.on.in("accepted"), _ctx.on.signer("performer")],
        effects: [_ctx.on.party("successor", _ctx.f["successor"])],
        attention: [_ctx.on.notify("successor", "after", "handover-offered")],
      }),
    ),
    "redact-comment-any": transition(
      items.comment,
      g["issue.edit-any"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("visible", "collapsed")],
        effects: [_ctx.on.to("redacted"), _ctx.on.redact("body")],
      }),
    ),
    "redact-comment-own": transition(
      items.comment,
      g["issue.comment"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("visible", "collapsed"), _ctx.on.signer("author")],
        effects: [_ctx.on.to("redacted"), _ctx.on.redact("body")],
      }),
    ),
    "release-hold": transition(
      holdItem,
      g["issue.work"],
      {},
      _ctx => ({guards: [_ctx.on.in("held"), _ctx.on.signer("holder")], effects: [_ctx.on.hold("end")]}),
    ),
    "renew-hold": transition(
      holdItem,
      g["issue.work"],
      {also: {commitment: via(items.commitment, "on", "under")}},
      _ctx => ({
        guards: [
          _ctx.on.in("held"),
          _ctx.on.signer("holder"),
          _ctx.also["commitment"].in("accepted"),
          _ctx.also["commitment"].signer("performer"),
        ],
        effects: [_ctx.on.hold("renew"), _ctx.on.value("ends", plusSeconds(3600))],
      }),
    ),
    withdraw: transition(
      items.commitment,
      g["issue.promise"],
      {},
      _ctx => ({
        guards: [_ctx.on.in("accepted"), _ctx.on.signer("performer")],
        effects: [_ctx.on.to("withdrawn")],
        attention: [_ctx.on.notify("requester", "after", "withdrawn")],
      }),
    ),
  },
  receives: {
    "export-license": receive(
      {
        message: "export-license",
        class: "tell",
        from: {kind: "task", under: "platform:task"},
        fields: {
          checkpoint: required(digest),
          export: required(fact(prefix, "authorize-export")),
          hold: required(itemOf("hold")),
          instance: required(text(128)),
          k: required(int(1, 3)),
        },
        also: {export: by(exportItem, "export"), target: by(holdItem, "hold")},
      },
      _ctx => ({
        guards: [
          require(_ctx.also["export"].in("authorized"), r["export-not-authorized"]),
          require(_ctx.also["target"].in("held"), r["target-not-held"]),
          require(_ctx.also["target"].before("ends"), r["target-not-held"]),
          require(
            equals(_ctx.also["target"].slot("holder"), _ctx.also["export"].slot("to")),
            r["target-not-held"],
          ),
          permit(
            "hold",
            "license",
            {
              checkpoint: _ctx.f["checkpoint"],
              export: _ctx.also["export"].id,
              from: sender,
              hold: _ctx.also["target"].id,
              instance: _ctx.f["instance"],
            },
          ),
        ],
        effects: [
          invoke(
            "hold",
            "license",
            {
              checkpoint: _ctx.f["checkpoint"],
              export: _ctx.also["export"].id,
              from: sender,
              hold: _ctx.also["target"].id,
              instance: _ctx.f["instance"],
              k: _ctx.f["k"],
            },
          ),
        ],
      }),
    ),
    "export-settled": receive(
      {
        message: "export-settled",
        class: "tell",
        from: {kind: "task", under: "platform:task"},
        fields: {
          export: required(fact(prefix, "authorize-export")),
          final: required(enumOf("confirmed", "withheld")),
        },
        also: {export: by(exportItem, "export")},
      },
      _ctx => ({
        guards: [
          require(_ctx.also["export"].in("authorized"), r["export-not-authorized"]),
          permit(
            "hold",
            "settled",
            {by: source("ref"), export: _ctx.also["export"].id, final: _ctx.f["final"], from: sender},
          ),
        ],
        effects: [
          invoke("hold", "settle", {by: source("ref"), export: _ctx.also["export"].id}),
          when(_ctx.also["export"].to("done"), {if: [equals(_ctx.f["final"], constant("confirmed"))]}),
          when(_ctx.also["export"].to("refused"), {if: [equals(_ctx.f["final"], constant("withheld"))]}),
        ],
        settles: _ctx.also["export"].settles("authorized"),
      }),
    ),
  },
  timed: {
    "hold-end": timed(holdItem, {states: ["held"], deadline: "ends", effects: _on => [_on.hold("end")]}),
  },
};
}

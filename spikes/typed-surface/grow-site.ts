/**
 * Grow Site creates Room lanes from the supplied original Room pin.
 * It accepts summaries only from those lanes. The original is
 * examples/grow/site.ts.
 */
import type { Digest } from "@generalbusiness/dap-contract";
import {
  by, create, define, equals, fact, final, int, item, live, open, receive,
  ref, require, required, scope, sender, source, text, theScope, value,
} from "./lib.ts";
import {
  growVocabulary, presenceForms,
} from "./grow-forms.ts";
import { ROOM, SITE } from "./grow-room.ts";

export function growSite(roomPin: Digest) {
  const vocabulary = growVocabulary();
  const { g, r } = vocabulary;
  const siteItem = item("site", {
    initial: "open", states: { open: live },
    values: { label: value.fixed(text(80)) },
  });
  const roomItem = item("room", {
    many: 3,
    initial: "pending", states: { pending: live, active: live, conflicted: live, failed: final },
    refs: {
      scope: ref.optional(scope("lane")),
      summaryAt: ref.optional(fact(ROOM, "report-site")),
    },
    values: { label: value.fixed(text(80)), openAlerts: value.optional(int(0, 4)) },
  });
  const presence = presenceForms(SITE, roomItem, vocabulary);
  return define({
    name: SITE,
    grants: g,
    reasons: r,
    genesis: "establish",
    items: [presence.presence, siteItem, roomItem],
    acts: {
      establish: open(siteItem, g.configure, {
        fields: { label: required(text(80)) },
      }, ({ f, on }) => ({ effects: [on.value("label", f.label)] })),
      /** The platform creates the pinned Room lane and settles this Site item. */
      "create-room": open(roomItem, g.configure, {
        fields: { label: required(text(80)) },
      }, ({ f, on }) => ({
        effects: [on.value("label", f.label)],
        sends: [create({
          kind: "lane",
          definition: roomPin,
          fields: { label: f.label, site: theScope, siteRoom: on.id },
          result: {
            applied: [on.to("active"), on.ref("scope", sender)],
            refused: [on.to("failed")],
            conflict: [on.to("conflicted")],
            undelivered: [],
          },
        })],
      })),
      ...presence.acts,
    },
    receives: {
      "room-summary": receive({
        message: "room-summary",
        class: "relate",
        from: { kind: "lane", under: ROOM, pin: roomPin },
        copies: 3,
        fields: { openAlerts: required(int(0, 4)) },
        // by(roomItem) also declares the required room input field.
        also: { room: by(roomItem) },
      }, ({ f, also }) => ({
        guards: [
          also.room.in("active"),
          require(equals(sender, also.room.slot("scope")), r.wrongSummarySender),
        ],
        effects: [
          also.room.value("openAlerts", f.openAlerts),
          also.room.ref("summaryAt", source("ref")),
        ],
      })),
    },
  });
}

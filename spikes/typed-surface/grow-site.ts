/**
 * The grow site in the v2 vocabulary. examples/grow/site.ts is the original.
 * The room's pinned digest flows down: the site creates rooms from it and
 * accepts summaries only from lanes that pin it.
 */
import type { Digest } from "@generalbusiness/dap-contract";
import { by, create, define, equals, final, int, item, itemOf, live, open, receive, ref, refuse, required, scope, sender, source, text, value } from "./lib.ts";
import { presenceForms } from "./grow-forms.ts";
import { ROOM, SITE } from "./grow-room.ts";

export function growSite(roomPin: Digest) {
  const presence = presenceForms(SITE);
  const siteItem = item("site", { states: { open: live }, values: { label: value.fixed(text(80)) } });
  const roomItem = item("room", {
    many: 3,
    states: { pending: live, active: live, conflicted: live, failed: final },
    refs: { scope: ref.optional(scope("lane")), summaryAt: ref.optional({ type: "fact", under: ROOM, kind: ["report-site"] }) },
    values: { label: value.fixed(text(80)), openAlerts: value.optional(int(0, 4)) },
  });
  return define({
    name: SITE,
    genesis: "establish",
    items: [presence.presence, siteItem, roomItem],
    acts: {
      establish: open(siteItem, "grow.configure", { fields: { label: required(text(80)) } }, ({ f, on }) => ({ effects: [on.value("label", f.label)] })),
      /** Opens the room here, and asks the platform for a lane pinned to the room definition; the answer settles the state. */
      "create-room": open(roomItem, "grow.configure", { fields: { label: required(text(80)) } }, ({ f, on }) => ({
        effects: [on.value("label", f.label)],
        sends: [create({
          kind: "lane", definition: roomPin, fields: { label: f.label, site: { scope: true }, siteRoom: on.id },
          result: { applied: [on.to("active"), on.ref("scope", sender)], refused: [on.to("failed")], conflict: [on.to("conflicted")], undelivered: [] },
        })],
      })),
      ...presence.acts,
    },
    receives: {
      "room-summary": receive({
        message: "room-summary", class: "relate", from: { kind: "lane", under: ROOM, pin: roomPin }, copies: 3,
        fields: { room: required(itemOf("room")), openAlerts: required(int(0, 4)) }, also: { room: by(roomItem, "room") },
      }, ({ f, also }) => ({
        guards: [also.room.in("active"), refuse("wrong-summary-sender", equals(sender, also.room.slot("scope")))],
        effects: [also.room.value("openAlerts", f.openAlerts), also.room.ref("summaryAt", source("ref"))],
      })),
    },
  });
}

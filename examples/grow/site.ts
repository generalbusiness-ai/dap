/** Site data. Application names introduce no new native scope kind.
 * Recorded presence is a member-owned item; room summaries arrive by relation. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { room, ROOM } from "./room.ts";
import { SITE } from "./names.ts";
import { presenceForms } from "./presence.ts";
export { SITE } from "./names.ts";
const fixed = { fixed: true, required: true } as const, optional = { fixed: false, required: false } as const;
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const presence = presenceForms(SITE);
export const site: DeclaredDefinition = {
  format: "artroom-definition-1", name: SITE, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: {
    presence: presence.item,
    site: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: { label: { ...fixed, of: { type: "text", max: 80 } } } },
    room: { many: true, max: 3, initial: "pending", states: { pending: { final: false }, active: { final: false }, conflicted: { final: false }, failed: { final: true } }, parties: {},
      refs: { scope: { ...optional, to: { type: "scope", kind: "lane" } }, summaryAt: { ...optional, to: { type: "fact", under: ROOM, kind: ["report-site"] } } },
      values: { label: { ...fixed, of: { type: "text", max: 80 } }, openAlerts: { ...optional, of: { type: "int", min: 0, max: 4 } } },
    },
  },
  acts: {
    establish: act({ step: "open", on: "site", grant: "grow.configure", fields: { label: { type: "text", max: 80, required: true } }, effects: [{ value: { slot: "label", from: { field: "label" } } }] }),
    "create-room": act({ step: "open", on: "room", grant: "grow.configure", fields: { label: { type: "text", max: 80, required: true } },
      effects: [{ value: { slot: "label", from: { field: "label" } } }],
      sends: [{ create: { kind: "lane", definition: definitionDigest(room), fields: { label: { field: "label" }, site: { scope: true }, siteRoom: { item: "on" } },
        result: { applied: [{ state: "active" }, { ref: { slot: "scope", from: { sender: true } } }], refused: [{ state: "failed" }], conflict: [{ state: "conflicted" }], undelivered: [] },
      } }],
    }),
    ...presence.acts,
  },
  receives: {
    "room-summary": { message: "room-summary", class: "relate", from: { kind: "lane", under: ROOM, pin: definitionDigest(room) }, copies: 3, opens: null,
      fields: { room: { type: "item", of: "room", required: true }, openAlerts: { type: "int", min: 0, max: 4, required: true } }, also: { room: { item: "room", by: "room" } },
      guards: [{ of: "also.room", state: ["active"] }, { equals: { a: { sender: true }, b: { slot: "scope", of: "also.room" } }, reason: "wrong-summary-sender" }],
      effects: [{ of: "also.room", value: { slot: "openAlerts", from: { field: "openAlerts" } } }, { of: "also.room", ref: { slot: "summaryAt", from: { source: "ref" } } }], sends: [], attention: [],
    },
  },
  timed: {}, rules: {},
};

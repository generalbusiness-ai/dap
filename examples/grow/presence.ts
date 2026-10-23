/** Application-owned recorded presence. No journal scan or native extension. */
import type { ActType, FactRef, Item, ItemType, MemberRef } from "@generalbusiness/dap-contract";
import { isFactRef, isMemberRef } from "@generalbusiness/dap-bytes";

export const PRESENCE_LIMIT = 32;
const states = ["unknown", "present", "away"] as const;
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });

export function presenceForms(under: string): { item: ItemType; acts: Record<string, ActType> } {
  const owner = { equals: { a: { slot: "member" }, b: { signer: true } }, reason: "not-presence-member" } as const;
  const room = { room: { type: "item", of: "room", required: true } } as const;
  const report = { ref: { slot: "reportedAt", from: "self" } } as const;
  return {
    item: { many: true, max: PRESENCE_LIMIT, initial: "unknown", states: {
      unknown: { final: false }, present: { final: false }, away: { final: false },
    }, parties: { member: { fixed: true, required: true, list: false, author: false } }, values: {},
    refs: {
      room: { fixed: false, required: false, to: { type: "item", of: "room" } },
      reportedAt: { fixed: false, required: false, to: { type: "fact", under, kind: ["arrive", "leave"] } },
    } },
    acts: {
      "provision-presence": act({ step: "open", on: "presence", grant: "grow.configure",
        fields: { member: { type: "member", required: true } },
        guards: [{ none: { type: "presence", states, where: [{ equals: { a: { slot: "member" }, b: { field: "member" } } }] }, reason: "presence-exists" }],
        effects: [{ party: { slot: "member", from: { field: "member" } } }],
      }),
      arrive: act({ step: "transition", on: "presence", grant: "grow.tend", fields: room,
        guards: [owner, { state: states }], effects: [{ state: "present" }, { ref: { slot: "room", from: { field: "room" } } }, report],
      }),
      leave: act({ step: "transition", on: "presence", grant: "grow.tend", fields: room,
        guards: [owner, { state: ["present"], reason: "presence-not-present" },
          { equals: { a: { slot: "room" }, b: { field: "room" } }, reason: "wrong-presence-room" }],
        effects: [{ state: "away" }, report],
      }),
    },
  };
}

export interface Presence { member: MemberRef; room: number; since: FactRef }
/** Only known present reports. Missing/unknown items are not proof of absence. */
export function sitePresence(items: readonly Item[], localFact: (position: number) => FactRef): Presence[] {
  return items.flatMap(item => item.type === "presence" && item.state === "present"
    && isMemberRef(item.parties["member"]) && typeof item.refs["room"] === "number"
    && (typeof item.refs["reportedAt"] === "number" || isFactRef(item.refs["reportedAt"]))
    ? [{ member: item.parties["member"] as MemberRef, room: item.refs["room"],
      since: typeof item.refs["reportedAt"] === "number" ? localFact(item.refs["reportedAt"]) : item.refs["reportedAt"] as FactRef }] : []);
}

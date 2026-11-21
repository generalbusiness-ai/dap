import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { scopeOwnedGrant as grant, ownedScopeDefinition } from "../definition-corpus-data.ts";
import { fixedSigner } from "../fixtures-core.ts";

/** A native root creates a live child whose cards can enter, renew and leave. */
export async function applicationPresencePacket(version = "1", lease = false, refresh = 2000) {
  const base = ownedScopeDefinition("test-live-presence");
  const child: DeclaredDefinition = { ...base, level: { name: "live" as const, version: 1 as const },
    items: { ...base.items, card: { many: true, max: 4, initial: "here", states: { here: { final: false }, left: { final: true } },
      parties: {}, refs: {}, values: { renewals: { fixed: false, required: true, of: { type: "int" as const, min: 0, max: 100 } } } } },
    acts: { establish: base.acts["establish"]!,
      enter: { step: "open" as const, on: "card", grant, also: {}, fields: {}, guards: [], effects: [{ value: { slot: "renewals", from: { const: 0 } } }], sends: [], attention: [] },
      renew: { step: "transition" as const, on: "card", grant, also: {}, fields: {}, guards: [{ state: ["here"] }], effects: [{ value: { slot: "renewals", from: { const: 1 } } }], sends: [], attention: [] },
      leave: { step: "transition" as const, on: "card", grant, also: {}, fields: {}, guards: [{ state: ["here"] }], effects: [{ state: "left" }], sends: [], attention: [] },
    } };
  if (lease) {
    child.items["card"] = { many: true, max: 4, initial: "here", states: { here: { final: false }, left: { final: true } },
      parties: { member: { fixed: true, required: true, list: false, author: false } },
      refs: { focus: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } },
      values: { expires: { fixed: false, required: true, of: { type: "time" } } } };
    const guard = { equals: { a: { slot: "member" }, b: { signer: true } }, reason: "not-member" } as const;
    const due = { value: { slot: "expires", from: { time: { plusSeconds: 30 } } } } as const;
    child.acts["enter"] = { step: "open", on: "card", grant, also: {}, fields: { focus: { type: "scope", kind: "lane", required: true } }, guards: [{ none: { type: "card", states: ["here"], where: [
        { equals: { a: { slot: "member" }, b: { signer: true } } },
        { equals: { a: { slot: "focus" }, b: { field: "focus" } } },
      ] }, reason: "already-present" }],
      effects: [{ party: { slot: "member", from: { signer: true } } }, { ref: { slot: "focus", from: { field: "focus" } } }, due], sends: [], attention: [] };
    child.acts["renew"] = { step: "transition", on: "card", grant, also: {}, fields: {}, guards: [guard, { state: ["here"] }], effects: [due], sends: [], attention: [] };
    child.acts["leave"] = { step: "transition", on: "card", grant, also: {}, fields: {}, guards: [guard, { state: ["here"] }], effects: [{ state: "left" }], sends: [], attention: [] };
    child.timed = { expire: { on: "card", states: ["here"], deadline: "expires", effects: [{ state: "left" }], attention: [] } };
  }
  const childId = definitionDigest(child), root = ownedScopeDefinition("test-presence-root", childId), rootId = definitionDigest(root);
  const packet = await packApplication2({ name: "test.presence", version, semantic: {
    ...emptyPackageComposition(), v: 2, entry: rootId, definitions: [{ id: rootId, bytes: canonicalize(root) }, { id: childId, bytes: canonicalize(child) }],
    connections: [{ from: rootId, item: "root", slot: "child", to: childId }, ...(lease ? [{ from: childId, item: "card", slot: "focus", to: "outside" as const }] : [])],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: { admin: [grant] }, predecessor: null,
    projections: { root: readApplicationProjection({ v: 1, definition: rootId, revision: "revision", sources: {
      root: { read: "one", item: "root", states: ["open"], limit: 1, fields: {} },
    } }), cards: readApplicationProjection({ v: 1, definition: childId, revision: "revision", sources: {
      cards: { read: "many", item: "card", states: ["here"], limit: 4, fields: lease ? {
        member: { from: { kind: "party", name: "member" }, of: { type: "member" }, nullable: false },
        focus: { from: { kind: "ref", name: "focus" }, of: { type: "scope", kind: "lane" }, nullable: false },
        expires: { from: { kind: "value", name: "expires" }, of: { type: "time" }, nullable: false },
      } : {
        renewals: { from: { kind: "value", name: "renewals" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, resources: {}, views: {
    cards: { kind: "carousel", projection: "cards", item: "cards", title: "id", summary: "state", actor: lease ? "member" : null, facts: lease ? ["expires"] : ["renewals"], revision: "revision",
      ...(lease ? { presence: { member: "member", focus: "focus", expires: "expires", focusField: "focus", enter: "enter", renew: "renew", leave: "leave" } } : {}),
      acts: [...(lease ? [{ act: "enter", label: "Enter", needs: grant, when: "true" }] : []), { act: "renew", label: "Renew", needs: grant, when: "state = 'here'" }, { act: "leave", label: "Leave", needs: grant, when: "state = 'here'" }],
      context: "Presence {id} v{revision}", fallback: "Presence {id}: {state}", waiting: {}, refresh, display: "inline", back: null },
  } } }, fixedSigner(67));
  return { packet, child, childId, rootId };
}

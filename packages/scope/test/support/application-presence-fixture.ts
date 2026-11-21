import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { scopeOwnedGrant as grant, ownedScopeDefinition } from "../definition-corpus-data.ts";
import { fixedSigner } from "../fixtures-core.ts";

/** A native root creates a live child whose cards can enter, renew and leave. */
export async function applicationPresencePacket(version = "1") {
  const base = ownedScopeDefinition("test-live-presence");
  const child: DeclaredDefinition = { ...base, level: { name: "live" as const, version: 1 as const },
    items: { ...base.items, card: { many: true, max: 4, initial: "here", states: { here: { final: false }, left: { final: true } },
      parties: {}, refs: {}, values: { renewals: { fixed: false, required: true, of: { type: "int" as const, min: 0, max: 100 } } } } },
    acts: { establish: base.acts["establish"]!,
      enter: { step: "open" as const, on: "card", grant, also: {}, fields: {}, guards: [], effects: [{ value: { slot: "renewals", from: { const: 0 } } }], sends: [], attention: [] },
      renew: { step: "transition" as const, on: "card", grant, also: {}, fields: {}, guards: [{ state: ["here"] }], effects: [{ value: { slot: "renewals", from: { const: 1 } } }], sends: [], attention: [] },
      leave: { step: "transition" as const, on: "card", grant, also: {}, fields: {}, guards: [{ state: ["here"] }], effects: [{ state: "left" }], sends: [], attention: [] },
    } };
  const childId = definitionDigest(child), root = ownedScopeDefinition("test-presence-root", childId), rootId = definitionDigest(root);
  const packet = await packApplication2({ name: "test.presence", version, semantic: {
    ...emptyPackageComposition(), v: 2, entry: rootId, definitions: [{ id: rootId, bytes: canonicalize(root) }, { id: childId, bytes: canonicalize(child) }],
    connections: [{ from: rootId, item: "root", slot: "child", to: childId }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: { admin: [grant] }, predecessor: null,
    projections: { root: readApplicationProjection({ v: 1, definition: rootId, revision: "revision", sources: {
      root: { read: "one", item: "root", states: ["open"], limit: 1, fields: {} },
    } }), cards: readApplicationProjection({ v: 1, definition: childId, revision: "revision", sources: {
      cards: { read: "many", item: "card", states: ["here"], limit: 4, fields: {
        renewals: { from: { kind: "value", name: "renewals" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, resources: {}, views: {
    cards: { kind: "carousel", projection: "cards", item: "cards", title: "id", summary: "state", actor: null, facts: ["renewals"], revision: "revision",
      acts: [{ act: "renew", label: "Renew", needs: grant, when: "state = 'here'" }, { act: "leave", label: "Leave", needs: grant, when: "state = 'here'" }],
      context: "Presence {id} v{revision}", fallback: "Presence {id}: {state}", waiting: {}, refresh: 2000, display: "inline", back: null },
  } } }, fixedSigner(67));
  return { packet, child, childId, rootId };
}

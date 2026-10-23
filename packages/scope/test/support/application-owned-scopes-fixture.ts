import { scopeOwnedGrant as grant, ownedScopeDefinition as definition } from "../definition-corpus-data.ts";
import { emptyPackageComposition } from "@generalbusiness/artroom-package-graph";
/** Public TEST package. Root genesis creates its child through the existing
 * native create form; no handmade genesis, identity or grant stands behind it. */
import type { Digest } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/artroom-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { fixedSigner } from "../fixtures-core.ts";


export async function applicationOwnedScopesPacket(label = "test-owned-root", version = "1") {
  const child = definition("test-owned-child"), childId = definitionDigest(child), root = definition(label, childId), rootId = definitionDigest(root);
  const projection = (id: Digest, withChild: boolean) => readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
    row: { read: "one", item: "root", states: ["open"], limit: 1, fields: {
      count: { from: { kind: "value", name: "count" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      ...(withChild ? { child: { from: { kind: "ref", name: "child" }, of: { type: "scope", kind: "lane" }, nullable: true } } : {}),
    } },
  } });
  const view = { kind: "card" as const, item: "row", title: "count", summary: null, actor: null, facts: ["revision"], revision: "revision" as const,
    context: "Owned row {id} v{revision}: {count}", fallback: "Owned row {id}: {count}", waiting: {}, refresh: 2000, display: "inline" as const, back: null };
  const signer = fixedSigner(67);
  const packet = await packApplication2({ name: "test.owned-scopes", version, semantic: {
    ...emptyPackageComposition(), v: 2, entry: rootId, definitions: [{ id: rootId, bytes: canonicalize(root) }, { id: childId, bytes: canonicalize(child) }],
    connections: [{ from: rootId, item: "root", slot: "child", to: childId }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], roles: { admin: [grant] }, predecessor: null,
    projections: { root: projection(rootId, true), child: projection(childId, false) },
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, resources: {}, views: {
    root: { ...view, projection: "root", acts: [] },
    child: { ...view, projection: "child", acts: [{ act: "bump", label: "Bump", needs: grant, when: "count = 0" }] },
  } } }, signer);
  return { packet, root, child, rootId, childId };
}

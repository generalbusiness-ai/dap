/** One TEST application installed in both rooms. Native admission evaluates
 * these declarations; the fixture supplies no replacement sender check. */
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-client";
import { ownedScopeDefinition, scopeOwnedGrant } from "../definition-corpus-data.ts";
import { fixedSigner } from "../fixtures-core.ts";

export async function crossRoomApplication() {
  const definition = ownedScopeDefinition("test-cross-room");
  const root = definition.items["root"]!;
  root.refs = {
    admittedSender: { fixed: true, required: false, to: { type: "scope", kind: "lane" } },
    peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } },
  };
  const genesis = definition.acts[definition.genesis]!;
  genesis.fields = { ...genesis.fields, admittedSender: { type: "scope", kind: "lane", required: false } };
  genesis.effects = [...genesis.effects, { ref: { slot: "admittedSender", from: { field: "admittedSender" } },
    if: [{ differs: { a: { field: "admittedSender" }, b: { none: true } } }] }];
  definition.acts["send"] = {
    step: "transition", on: "root", grant: scopeOwnedGrant, also: {},
    fields: { peer: { type: "scope", kind: "lane", required: true }, count: { type: "int", min: 0, max: 100, required: true } },
    guards: [{ state: ["open"] }, { signer: ["controller"] }],
    effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
    sends: [{ tell: { to: { slot: "peer" }, message: "count", fields: { count: { field: "count" } }, result: {} } }], attention: [],
  };
  definition.receives["count"] = {
    message: "count", class: "tell", from: { kind: "lane", under: definition.name }, opens: null,
    also: { root: { item: "root", one: true } }, fields: { count: { type: "int", min: 0, max: 100, required: true } },
    guards: [{ equals: { a: { sender: true }, b: { slot: "admittedSender", of: "also.root" } }, reason: "not-the-sender" }],
    effects: [{ value: { slot: "count", from: { field: "count" } }, of: "also.root" }], sends: [], attention: [],
  };
  const id = definitionDigest(definition);
  // M0 uses the existing v1 installation contract. A v2 graph cannot yet
  // declare a receive port reached only from a different installation.
  const packet = await packApplication({ name: "test.cross-room", version: "1", semantic: {
    v: 1, entry: id, definitions: [{ id, bytes: canonicalize(definition) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [],
    roles: { admin: [scopeOwnedGrant] }, predecessor: null, projections: {},
  }, presentation: { v: 1, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} },
  }, fixedSigner(68));
  return { packet, definition, id };
}

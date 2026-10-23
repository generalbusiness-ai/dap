/** Raw declarations used by the native lane name/origin and CLI edit tests.
 * Importing this module validates nothing and constructs no native fixture. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { changeDemo } from "../src/index.ts";
import { declaredChangeAttack } from "../../../../packages/scope/test/support/declared-change-attack.ts";

/** Same arbitrary application, including the native genesis word. Its
 * actual factory is still establish-application, never Native open-pr. */
export function namedChangeApplication() {
    const { establish, ...applicationActs } = declaredChangeAttack.acts;
    return { ...declaredChangeAttack, genesis: "open", acts: { ...applicationActs, open: establish } } satisfies DeclaredDefinition;
}

/** A valid Native change extension whose send addresses a foreign target. */
export function foreignDestinationChange() {
  return {
    ...changeDemo,
    items: { ...changeDemo.items, merge: {
      ...changeDemo.items.merge,
      refs: { ...changeDemo.items.merge.refs, foreign: { fixed: true, required: true, to: { type: "scope", kind: "destination" } } },
    } },
    acts: { ...changeDemo.acts, merge: {
      ...changeDemo.acts.merge,
      fields: { ...changeDemo.acts.merge.fields, foreign: { type: "scope", kind: "destination", required: true } },
      effects: [...changeDemo.acts.merge.effects, { ref: { slot: "foreign", from: { field: "foreign" } } }],
      sends: changeDemo.acts.merge.sends.map(form => ({ tell: { ...form.tell, to: { slot: "foreign" } } })),
    } },
  } as const satisfies DeclaredDefinition;
}

/** Both unsupported edit protocols remain valid declarations. The metadata
 * extension keeps the supported signed-text protocol exactly. */
export function editChangeDefinitions() {
  const legacy = structuredClone(changeDemo) as DeclaredDefinition;
  delete legacy.acts["propose-file"];
  const detached = structuredClone(changeDemo) as DeclaredDefinition;
  detached.acts["propose-file"]!.fields["content"] = { type: "text", max: 65536, detached: true, required: true };
  // Harmless metadata and explicit default targets are compatible:
  // support is not an exact-row catalog.
  const extended = structuredClone(changeDemo) as DeclaredDefinition;
  extended.items["manifest"]!.values["commandNote"] = { fixed: true, required: false, of: { type: "text", max: 32 } };
  extended.acts["propose-file"]!.effects = [...extended.acts["propose-file"]!.effects.map((effect) => ({ ...effect, of: "on" as const })), { value: { slot: "commandNote", from: { const: "metadata" } } }];
  return { legacy, detached, extended };
}

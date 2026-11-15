/** Name the supplied judgment inputs without discovering or inventing any. */
import type { Digest, KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import type { JudgeContext, Owners, StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import type { Context, Source, UnavailableContext } from "./act-types.ts";

/** The caller inventories its evidence beside the actual checked payloads
 * and stable ports. Shaping adds any detached texts to that inventory. */
export interface ExplorationContext extends JudgeContext {
  readonly actor: KeyId;
  readonly scope: ScopeRef;
  readonly evidence: readonly Digest[];
  /** Actual pending-reservation producer code; null states checked absence. */
  readonly owners: Owners | null;
}

export function actContext(definition: ValidDefinition, view: StateView | null, context: ExplorationContext,
  assumes: readonly Source[], shapedTexts: readonly string[]): Context | UnavailableContext {
  const summary = {
    scope: context.scope,
    definition: definition.digest,
    assumes: [...assumes],
    actor: context.actor,
    standing: context.grants === null ? null : context.grants.filter(grant => grant.current).map(grant => grant.grant.issued),
    clock: context.clock.reading,
    evidence: [...new Set([...context.evidence, ...shapedTexts.map(textDigest)])].sort(),
  };
  const scope = view?.scope() ?? null;
  const head = scope?.at.scope === context.scope.scope && scope.at.genesis === context.scope.genesis ? scope.head : null;
  return head ? structuredClone({ ...summary, head }) : structuredClone({ ...summary, head: null });
}

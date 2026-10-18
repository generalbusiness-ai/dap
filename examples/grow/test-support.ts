/** Native in-memory fixture runner, with explicit scripted per-key authority.
 * It retains actual prepared inputs for replay. No enrollment/provider/DO
 * lifecycle is exercised here. Application data modules do not import it. */
import { expect } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type FieldValue, type RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes } from "@generalbusiness/artroom-bytes";
import { prepareRules, validateDefinition, type Fetched } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, grantOf, keys, valid, type Actor, type Ledger, type Over } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "@generalbusiness/artroom-replay";
export type { Actor, Ledger, Over };
export const operator = keys.paul, climate = keys.una, sensors: Actor = { ...keys.vic, principal: operator.member };
export const devicePermissions = [[operator, ["grow.configure", "grow.climate", "grow.heat"]], [climate, ["grow.climate"]], [sensors, ["grow.sense"]]] as const;
type Permission = readonly [Actor, readonly string[]];
const retained = new WeakMap<Ledger, Map<Digest, RetainedInput>>();

export function nativeScenario(definition: DeclaredDefinition, permissions: readonly Permission[], fields: Record<string, FieldValue> = {}, foundingKey = "found"): Ledger {
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const ledger = created(valid(checked), fields, foundingKey);
  retained.set(ledger, new Map());
  ledger.grants = () => permissions.map(([who, actions]) => ({ grant: grantOf(who, ledger.at, actions), current: true }));
  return ledger;
}
export async function submit(ledger: Ledger, who: Actor, kind: string, over: Over = {}, facts: readonly Fetched[] = []) {
  const signed = ledger.intent(who, kind, over), context = ledger.context({ facts });
  const inputs = prepareRules(ledger.state, ledger.definition, { act: signed, context }), prepared = await evaluateRules(inputs);
  const result = ledger.submit(signed, { prepared, facts });
  if (result.result === "write") for (const input of inputs) {
    const digest = digestBytes(canonicalBytes(input.input));
    if (result.draft.prepared.some(prepared => prepared.input === digest)) retained.get(ledger)!.set(digest, { kind: "rule", digest, bytes: canonicalize(input.input) });
  }
  return result;
}
export const on = (ledger: Ledger, id: number, fields: Record<string, FieldValue>): Over => ({ on: id, expected: { on: ledger.item(id).revision }, fields });
export function replay(ledger: Ledger) {
  const source = new MemorySource([{ scope: ledger.at, entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })),
    retained: [{ kind: "definition", digest: ledger.definition.digest, bytes: canonicalize(ledger.definition.declared) }, ...retained.get(ledger)!.values()] }]);
  return verify(source, { mode: "replay", scope: ledger.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
}

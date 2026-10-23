/** Native in-memory fixture runner, with explicit scripted per-key authority.
 * It retains actual prepared inputs for replay. No enrollment/provider/DO
 * lifecycle is exercised here. Application data modules do not import it. */
import { expect } from "vitest";
import { growSiteLauncherDefinition } from "./definition-corpus-data.ts";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type FieldValue, type RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes } from "@generalbusiness/artroom-bytes";
import { clockOf, deviceCommand, judgeGenesis, prepareRules, validateDefinition, type Fetched } from "@generalbusiness/dap-derive";
import { evaluateRules, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, creation, deliver, grantOf, keys, valid, Ledger, type Actor, type Over } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify } from "@generalbusiness/artroom-replay";
export type { Actor, Ledger, Over };
export const operator = keys.paul, climate = keys.una, sensors: Actor = { ...keys.vic, principal: operator.member };
export const devicePermissions = [[operator, ["grow.configure", "grow.climate", "grow.heat"]], [climate, ["grow.climate"]], [sensors, ["grow.sense"]]] as const;
type Permission = readonly [Actor, readonly string[]];
const retained = new WeakMap<Ledger, Map<Digest, RetainedInput>>();
const capabilities = deviceCommand();

export function nativeScenario(definition: DeclaredDefinition, permissions: readonly Permission[], fields: Record<string, FieldValue> = {}, foundingKey = "found"): Ledger {
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const ledger = created(valid(checked), fields, foundingKey);
  retained.set(ledger, new Map());
  ledger.grants = () => permissions.map(([who, actions]) => ({ grant: grantOf(who, ledger.at, actions), current: true }));
  return ledger;
}
/** Receive a real parent's create send, without inventing a child genesis,
 * confirmation or membership. Per-key grants remain explicit test authority. */
export async function nativeChild(parent: Ledger, seq: number, definition: DeclaredDefinition, permissions: readonly Permission[], mint = 20): Promise<Ledger> {
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  const child = new Ledger(valid(checked)), { asked, source } = creation(parent, seq, 0, mint);
  child.now = parent.now;
  const context = { clock: clockOf(child.state, parent.now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source, capabilities };
  const inputs = prepareRules(child.state, child.definition, { genesis: asked, context }), prepared = await evaluateRules(inputs);
  const result = judgeGenesis(child.state, child.definition, asked, { ...context, prepared });
  expect(result, JSON.stringify(result.result === "write" ? result.draft.sends.map(send => send.message.class === "result" ? send.message : send.message.class) : result)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  retained.set(child, new Map());
  if (result.result === "write") {
    child.seal(result.draft, parent.now);
    for (const input of inputs) {
      const digest = digestBytes(canonicalBytes(input.input));
      if (result.draft.prepared.some(prepared => prepared.input === digest)) retained.get(child)!.set(digest, { kind: "rule", digest, bytes: canonicalize(input.input) });
    }
  }
  child.grants = () => permissions.map(([who, actions]) => ({ grant: grantOf(who, child.at, actions), current: true }));
  return child;
}
/** A created Site Lane, with a labelled Directory launcher and complete
 * source journal for replay. This is in-memory judged creation, not a host. */
export async function nativeCreatedSite(definition: DeclaredDefinition, permissions: readonly Permission[], fields: Record<string, FieldValue>) {
  const launcherDefinition = growSiteLauncherDefinition(definition);
  const launcher = nativeScenario(launcherDefinition, permissions, fields);
  const site = await nativeChild(launcher, 0, definition, permissions, 19);
  expect(deliver(launcher, site, 0).result).toBe("write");
  expect(deliver(site, launcher, launcher.last.seq).result).toBe("write");
  expect(site.at.kind).toBe("lane");
  return { launcher, site };
}
export async function submit(ledger: Ledger, who: Actor, kind: string, over: Over = {}, facts: readonly Fetched[] = []) {
  const signed = ledger.intent(who, kind, over), context = ledger.context({ facts, capabilities });
  const inputs = prepareRules(ledger.state, ledger.definition, { act: signed, context }), prepared = await evaluateRules(inputs);
  const result = ledger.submit(signed, { prepared, facts, capabilities });
  if (result.result === "write") for (const input of inputs) {
    const digest = digestBytes(canonicalBytes(input.input));
    if (result.draft.prepared.some(prepared => prepared.input === digest)) retained.get(ledger)!.set(digest, { kind: "rule", digest, bytes: canonicalize(input.input) });
  }
  return result;
}
export const on = (ledger: Ledger, id: number, fields: Record<string, FieldValue>): Over => ({ on: id, expected: { on: ledger.item(id).revision }, fields });
export function replay(ledger: Ledger, others: readonly Ledger[] = []) {
  const all = [ledger, ...others];
  const source = new MemorySource(all.map(current => {
    const foreign = new Map<Digest, RetainedInput>();
    for (const { entry } of current.entries) for (const use of entry.uses) {
      const owner = all.find(other => other.at.scope === use.fact.at.scope && other.at.inc === use.fact.at.inc);
      const original = owner?.entries[use.fact.seq];
      expect(original?.hash, "replay needs the exact foreign entry recorded by the native judge").toBe(use.fact.hash);
      const bytes = canonicalize(original!.entry);
      expect(digestBytes(canonicalBytes(original!.entry))).toBe(use.content);
      foreign.set(use.content, { kind: "entry", digest: use.content, bytes, under: owner!.under });
    }
    return { scope: current.at, entries: current.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })),
      retained: [{ kind: "definition", digest: current.definition.digest, bytes: canonicalize(current.definition.declared) }, ...retained.get(current)!.values(), ...foreign.values()] };
  }));
  return verify(source, { mode: "replay", scope: ledger.at.scope, grants: "as-recorded", bounds: PROPOSED_BOUNDS, capabilities, owners: capabilities });
}

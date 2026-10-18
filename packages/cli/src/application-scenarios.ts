/** Declarative local scenarios. No scenario module or application server code
 * is imported. TEST keys and authority are local stand-ins, stated in reports. */
import type { Answer, Digest, FactRef, FieldValue, MemberId, MemberRef, ScopeKind, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, newIncarnation, parseStrict, scopeIdOf } from "@generalbusiness/artroom-bytes";
import { secretSigner, signedIntent, type Asked, type PackedApplication, type Signer } from "@generalbusiness/artroom-client";
import { timeMs } from "@generalbusiness/dap-derive";
import type { Verification } from "@generalbusiness/artroom-replay";
import type { LocalActor, LocalApplicationScope } from "./application-local.ts";

export class ApplicationScenarioError extends Error {}
const fail = (message: string): never => { throw new ApplicationScenarioError(message); };
const label = (value: unknown): string => typeof value === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(value) ? value : fail("Expected a short scenario name.");
function object(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  const allowed = new Set([...required, ...optional]);
  return isRecord(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => allowed.has(key)) ? value : fail("Unexpected scenario fields.");
}
function dictionary(value: unknown, most: number): Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length <= most ? value : fail("Scenario map exceeds its allowance or is not an object.");
}
function timestamp(value: unknown): string {
  return typeof value === "string" && timeMs(value) !== null ? value : fail("Expected a native timestamp.");
}
/** Old CLI commands still launch on 22.0.0. Only local SQLite commands need
 * its unflagged API. Keep this check before the dynamic runtime import. */
export function supportsLocalSqlite(version: string): boolean {
  const parts = /^(\d+)\.(\d+)\.\d+(?:[-+].*)?$/.exec(version);
  if (!parts) return false;
  const major = Number(parts[1]), minor = Number(parts[2]);
  return major >= 24 || major === 23 && minor >= 4 || major === 22 && minor >= 13;
}
function reference(kind: ScopeKind): ScopeRef {
  return { scope: scopeIdOf({ v: 1, kind, definition: `sha256:${"0".repeat(64)}`, creator: null, cause: `sha256:${"1".repeat(64)}`, ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(2)), kind };
}
interface Actor { signer: Signer; member: MemberRef; actions: string[]; principal: string | null }
export interface ScenarioOwnerRecord { readonly label: "non-native-scenario-owner"; readonly owner: string; readonly command: FactRef; readonly outcome: "confirmed" | "refused" | "unknown" }
export interface ApplicationScenarioResult { readonly name: string; readonly definition: Digest; readonly steps: number; readonly replay: Verification; readonly authority: "scripted-test-grants"; readonly ownerRecords: readonly ScenarioOwnerRecord[] }
export interface ApplicationDevelopmentActor extends LocalActor { readonly name: string; readonly seed: string }
export interface ApplicationDevelopmentSession { readonly result: ApplicationScenarioResult; readonly scope: LocalApplicationScope; readonly time: string; readonly actors: readonly ApplicationDevelopmentActor[] }

export async function runApplicationScenario(packet: PackedApplication, value: unknown): Promise<ApplicationScenarioResult> {
  return executeScenario(packet, value);
}
/** A caller that opens a development session owns closing its native scope.
 * Only explicit public TEST actors are exposed, never operator custody. */
export async function openApplicationScenario(packet: PackedApplication, value: unknown): Promise<ApplicationDevelopmentSession> {
  let session: Omit<ApplicationDevelopmentSession, "result"> | undefined;
  const result = await executeScenario(packet, value, (scope, time, actors) => { session = { scope, time, actors }; });
  if (!session) throw new ApplicationScenarioError("The local scenario did not open a session.");
  return { ...session, result };
}
async function executeScenario(packet: PackedApplication, value: unknown,
  retain?: (scope: LocalApplicationScope, time: string, actors: readonly ApplicationDevelopmentActor[]) => void): Promise<ApplicationScenarioResult> {
  if (!supportsLocalSqlite(process.versions.node)) return fail("Local scenarios require unflagged Node SQLite: Node 22.13+, 23.4+, or 24+. Other CLI commands retain Node 22.0 support.");
  // The caller supplies bounded, strict JSON from readApplicationScenario.
  // Own that parsed value before signing/import awaits or caller edits.
  const scenario = object(parseStrict(canonicalize(value)), ["v", "name", "time", "actors", "founding", "steps"], ["definition"]);
  if (scenario["v"] !== 1) return fail("Expected scenario version 1.");
  const name = label(scenario["name"]); let time = timestamp(scenario["time"]);
  const selected = Object.hasOwn(scenario, "definition") ? scenario["definition"] : packet.package.semantic.entry;
  if (typeof selected !== "string" || !packet.package.semantic.definitions.some(part => part.id === selected)) return fail("Select a local definition from the verified package closure.");
  const definition = selected as Digest;
  const given = dictionary(scenario["actors"], 16), steps = scenario["steps"];
  if (Object.keys(given).length === 0 || !Array.isArray(steps) || steps.length < 1 || steps.length > 256) return fail("Choose 1–16 TEST actors and 1–256 scenario steps.");
  const actors = new Map<string, Actor>(), seeds: Uint8Array[] = [], keys = new Set<string>();
  const accepted = new Map<string, FactRef>(), ownerRecords: ScenarioOwnerRecord[] = [], recorded = new Set<string>();
  let checkedBehavior = false;
  let scope: LocalApplicationScope | null = null;
  try {
    for (const [name, actor] of Object.entries(given)) {
      label(name); const body = object(actor, ["seed", "member", "actions"], ["principal"]);
      if (typeof body["seed"] !== "string" || !/^[0-9a-f]{64}$/.test(body["seed"])) return fail("Each scenario actor needs an explicit public TEST seed (64 lowercase hex digits).");
      if (typeof body["member"] !== "string" || !/^@[a-z][a-z0-9-]{0,31}$/.test(body["member"])) return fail("Each TEST actor needs an explicit member handle.");
      const actions = body["actions"];
      if (!Array.isArray(actions) || actions.length > 64 || actions.some(action => typeof action !== "string" || !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(action)) || new Set(actions).size !== actions.length) return fail("List each TEST actor action explicitly, at most 64, without duplicates.");
      const seed = Uint8Array.from(body["seed"].match(/../g)!, byte => Number.parseInt(byte, 16)); seeds.push(seed);
      const signer = secretSigner(seed);
      if (keys.has(signer.key)) return fail("TEST actor keys must be distinct."); keys.add(signer.key);
      actors.set(name, { signer, member: { membership: reference("membership"), member: body["member"] as MemberId }, actions: [...actions], principal: Object.hasOwn(body, "principal") ? label(body["principal"]) : null });
    }
    const actor = (name: unknown): Actor => actors.get(label(name)) ?? fail("The scenario names an unknown TEST actor.");
    for (const who of actors.values()) if (who.principal !== null) actor(who.principal);
    let nodes = 0;
    const resolve = (value: unknown, depth = 0): unknown => {
      if (++nodes > 10_000 || depth > 32) return fail("Scenario values exceed their node/depth allowance.");
      if (Array.isArray(value)) return value.map(part => resolve(part, depth + 1));
      if (!isRecord(value)) return value;
      if (Object.keys(value).length === 1) {
        if (Object.hasOwn(value, "$member")) return actor(value["$member"]).member;
        if (Object.hasOwn(value, "$fact")) return accepted.get(label(value["$fact"])) ?? fail("The saved request has no accepted native fact.");
        if (Object.hasOwn(value, "$scope")) return value["$scope"] === "self" && scope ? scope.at : fail("Only an existing local self scope can be named.");
        if (Object.hasOwn(value, "$reference")) {
          const kind = value["$reference"];
          return kind === "destination" || kind === "membership" ? reference(kind) : fail("Only labelled membership/destination reference stand-ins are supported.");
        }
        if (Object.hasOwn(value, "$revision")) {
          const id = value["$revision"];
          return typeof id === "number" && Number.isSafeInteger(id) && scope?.state.item(id) ? scope.state.item(id)!.revision : fail("Revision reference names no local item.");
        }
      }
      return Object.fromEntries(Object.entries(value).map(([key, part]) => [key, resolve(part, depth + 1)]));
    };
    const fields = (value: unknown): Record<string, FieldValue> => resolve(dictionary(value, 64)) as Record<string, FieldValue>;
    const founding = object(scenario["founding"], ["actor", "fields"]);
    const signed = await signedIntent(actor(founding["actor"]).signer, { to: null, kind: "found", fields: fields(founding["fields"]) }, { now: timeMs(time)! });
    const runtime = await import("./application-local.ts");
    const held: LocalActor[] = [...actors.values()].map(who => ({ key: who.signer.key, member: who.member, actions: who.actions, principal: who.principal === null ? null : actor(who.principal).member }));
    scope = await runtime.LocalApplicationScope.found(packet, signed, held, time, definition).catch(error => {
      if (error instanceof runtime.LocalApplicationError) return fail(`${name}: ${error.message}`);
      throw error;
    });
    const saved = new Map<string, SignedIntent>();
    const expected = (answer: Answer, wanted: unknown): void => {
      const body = object(wanted, ["answer"], ["reason"]);
      if (body["answer"] !== "accepted" && body["answer"] !== "refused" || body["answer"] === "accepted" && Object.hasOwn(body, "reason") || body["answer"] === "refused" && (typeof body["reason"] !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(body["reason"]))) return fail("Expect accepted, or refused with its exact native reason.");
      if (answer.answer !== body["answer"] || body["answer"] === "refused" && (answer.answer !== "refused" || answer.reason !== body["reason"])) return fail(`Expected ${body["answer"]}${body["reason"] ? ` (${body["reason"]})` : ""}; native answer was ${answer.answer}${"reason" in answer ? ` (${answer.reason})` : ""}.`);
      checkedBehavior = true;
    };
    for (let index = 0; index < steps.length; index++) {
      nodes = 0;
      try {
        const step = dictionary(steps[index], 3);
        if (Object.hasOwn(step, "act") || Object.hasOwn(step, "sign")) {
          const deferred = Object.hasOwn(step, "sign");
          if (deferred) object(step, ["sign", "save"]);
          else object(step, ["act", "expect"], ["save"]);
          const ask = object(step[deferred ? "sign" : "act"], ["actor", "kind"], ["on", "fields", "expected"]);
          if (typeof ask["kind"] !== "string" || !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(ask["kind"])) return fail("Expected an act name.");
          const expectedRevisions = resolve(dictionary(Object.hasOwn(ask, "expected") ? ask["expected"] : {}, 64)) as Record<string, number>;
          if (Object.values(expectedRevisions).some(value => !Number.isSafeInteger(value) || value < 0)) return fail("Expected revisions must be nonnegative native revisions.");
          const on = ask["on"] ?? null;
          if (on !== null && (typeof on !== "number" || !Number.isSafeInteger(on) || on < 0)) return fail("Expected a local item number.");
          const asked: Asked = { to: scope.at, kind: ask["kind"], on, expected: expectedRevisions, fields: fields(Object.hasOwn(ask, "fields") ? ask["fields"] : {}) };
          const signed = await signedIntent(actor(ask["actor"]).signer, asked, { now: timeMs(time)! });
          if (Object.hasOwn(step, "save")) {
            const name = label(step["save"]); if (saved.has(name)) return fail("A saved request name is already used."); saved.set(name, signed);
          }
          // Signing alone is no admission or receipt. A later retry submits
          // these exact bytes, with their original revisions and lifetime.
          if (deferred) continue;
          const answer = await scope.submit(signed); expected(answer, step["expect"]);
          if (Object.hasOwn(step, "save") && answer.answer === "accepted") accepted.set(label(step["save"]), parseStrict(canonicalize(answer.receipt.fact)) as FactRef);
        } else if (Object.hasOwn(step, "retry")) {
          object(step, ["retry", "expect"]); const signed = saved.get(label(step["retry"]));
          if (!signed) return fail("A retry names no saved signed request.");
          const answer = await scope.submit(signed); expected(answer, step["expect"]);
          if (answer.answer === "accepted") accepted.set(label(step["retry"]), parseStrict(canonicalize(answer.receipt.fact)) as FactRef);
        } else if (Object.hasOwn(step, "advance")) {
          object(step, ["advance"]); time = timestamp(step["advance"]); await scope.advance(time);
        } else if (Object.hasOwn(step, "assert")) {
          object(step, ["assert"]); const wanted = object(step["assert"], ["item"], ["state", "revision", "values", "parties", "refs"]);
          const id = wanted["item"];
          if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0 || Object.keys(wanted).length < 2) return fail("An assertion needs an item and a state, revision or slot expectation.");
          if (!["state", "revision"].some(key => Object.hasOwn(wanted, key)) && !["values", "parties", "refs"].some(key => Object.hasOwn(wanted, key) && Object.keys(dictionary(wanted[key], 64)).length > 0)) return fail("An assertion must test at least one state, revision or slot.");
          const item = scope.state.item(id); if (!item) return fail(`Asserted item ${id} is absent.`);
          for (const key of ["state", "revision"] as const) if (Object.hasOwn(wanted, key) && canonicalize(item[key]) !== canonicalize(wanted[key])) return fail(`Item ${id} has an unexpected ${key}.`);
          for (const key of ["values", "parties", "refs"] as const) if (Object.hasOwn(wanted, key)) for (const [slot, wantedValue] of Object.entries(dictionary(wanted[key], 64))) {
            if (!Object.hasOwn(item[key], slot) || canonicalize(item[key][slot]) !== canonicalize(resolve(wantedValue))) return fail(`Item ${id} has an unexpected ${key}.${slot}.`);
          }
          checkedBehavior = true;
        } else if (Object.hasOwn(step, "owner-record")) {
          object(step, ["owner-record"]);
          const record = object(step["owner-record"], ["owner", "command", "outcome"]), owner = label(record["owner"]);
          // Only a saved accepted receipt may be recorded. An arbitrary fact,
          // refused request or head statement cannot stand in for a command.
          const reference = object(record["command"], ["$fact"]), command = accepted.get(label(reference["$fact"]));
          if (!command) return fail("The owner record names no accepted native request.");
          const outcome = record["outcome"];
          if (outcome !== "confirmed" && outcome !== "refused" && outcome !== "unknown") return fail("Expected a labelled scenario-owner outcome.");
          const key = canonicalize(command);
          if (recorded.has(key)) return fail("The scenario owner already recorded this command."); recorded.add(key);
          ownerRecords.push({ label: "non-native-scenario-owner", owner, command: parseStrict(key) as FactRef, outcome });
        } else return fail("Expected act, sign, retry, advance, assert or owner-record.");
      } catch (error) {
        if (error instanceof ApplicationScenarioError || error instanceof runtime.LocalApplicationError) throw new ApplicationScenarioError(`${name}, step ${index + 1}: ${error.message}`);
        throw error;
      }
    }
    if (!checkedBehavior) return fail("Each scenario needs an expected act or retry answer, or a nonempty state assertion.");
    const replay = await scope.replay();
    if (replay.report.mode !== "replay" || replay.report.result !== "consistent") return fail(`${name}: native replay ${replay.report.result}.`);
    const result: ApplicationScenarioResult = { name, definition, steps: steps.length, replay, authority: "scripted-test-grants", ownerRecords };
    if (retain) {
      retain(scope, time, [...actors].map(([name, who]) => ({ name, seed: (given[name] as Record<string, unknown>)["seed"] as string, key: who.signer.key, member: who.member, actions: [...who.actions], principal: who.principal === null ? null : actor(who.principal).member })));
      scope = null;
    }
    return result;
  } finally { try { scope?.close(); } finally { for (const seed of seeds) seed.fill(0); } }
}

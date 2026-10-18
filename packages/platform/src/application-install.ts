/** M1 install journal preparation. The new rules pin records the one member
 * intent and host admission. Activation/grants/creation continuation is still
 * under construction; this pin is not selected by a room factory yet. */
import type { FieldValue, PlatformData } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, parseStrict } from "@generalbusiness/artroom-bytes";
import { readApplicationReleaseProof, readApplicationReleaseUri, type ApplicationReleaseProof } from "@generalbusiness/artroom-client/application";
import { validateDefinition, type GuardRule, type Item, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { DEFINITION_DOMAIN, rulesScope3, rulesScopeRules3 } from "./rules-scope.ts";
import { pinnedBy } from "./versions.ts";

export const APPLICATION_INSTALL_RULES = "platform:rules@5" as const;
export const APPLICATION_SEMANTIC_VALUE = { domain: "dap-application-semantics-1", max: PROPOSED_BOUNDS.definitionBytes } as const;
export const APPLICATION_RELEASE_VALUE = { domain: "dap-application-release-1", max: 4096 } as const;
export const APPLICATION_INSTALL_REFUSALS = ["unsupported-object-format", "untrusted-release", "unsupported-host", "unsupported-definition", "package-invalid", "package-too-large", "source-refused"] as const;
const roles = { type: "list", max: 5, of: { type: "enum", of: ["admin", "maintainer", "member", "agent", "checker"] } } as const;
const fixed = { fixed: true, required: true } as const;
const digest = { type: "digest" } as const;
const phase = { type: "enum", of: ["admission", "activation", "grants", "creation"] } as const;

export const applicationInstallRulesScope: PlatformData = {
  ...rulesScope3,
  items: { ...rulesScope3.items, installation: {
    many: true, max: 64, initial: "pending",
    states: { pending: { final: false }, active: { final: true }, refused: { final: false } },
    parties: { installer: { ...fixed, list: false, author: true } },
    refs: { scope: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } },
    values: { uri: { ...fixed, of: { type: "text", max: 4096 } }, release: { ...fixed, of: digest }, semantic: { ...fixed, of: digest },
      presentation: { ...fixed, of: digest }, definition: { ...fixed, of: digest }, publisher: { ...fixed, of: { type: "text", max: 64 } },
      roles: { ...fixed, of: roles }, genesis: { ...fixed, of: { type: "text", max: 16 * 1024 } },
      phase: { fixed: false, required: true, of: phase, default: "admission" },
      reason: { fixed: false, required: false, of: { type: "text", max: 64 } },
    },
  } },
  acts: { ...rulesScope3.acts, "install-application": {
    step: "open", on: "installation", grant: "application.install", also: {},
    fields: { uri: { type: "text", max: 4096, required: true },
      release: { type: "digest", required: true, value: APPLICATION_RELEASE_VALUE },
      semantic: { type: "digest", required: true, value: APPLICATION_SEMANTIC_VALUE },
      roles: { ...roles, required: true }, values: { type: "text", max: 16 * 1024, required: true },
    },
    guards: [{ code: "application-install-proof", row: "M1" }],
    effects: [
      { party: { slot: "installer", from: { signer: true } } },
      ...["uri", "release", "semantic", "roles"].map(slot => ({ value: { slot, from: { field: slot } } })),
      { value: { slot: "genesis", from: { field: "values" } } },
      { code: "application-install-identities", row: "M1" },
      { code: "open-application-admission", row: "M1" },
    ], sends: [], attention: [],
  } },
  outcomes: { ...rulesScope3.outcomes, "admit-application": { code: "application-admission", row: "M1" } },
};

/** The existing value domains give this pure rule only retained, hashed input.
 * Whole native validation is required as well as the portable signed proof. */
function proof(given: RuleGiven): ApplicationReleaseProof | null {
  const fields = given.resolved.fields;
  if (!isDigest(fields["semantic"]) || !isDigest(fields["release"])) throw Error("install proof digests required");
  const semantic = given.value(APPLICATION_SEMANTIC_VALUE.domain, fields["semantic"], APPLICATION_SEMANTIC_VALUE.max);
  const signed = given.value(APPLICATION_RELEASE_VALUE.domain, fields["release"], APPLICATION_RELEASE_VALUE.max);
  if (semantic === undefined || signed === undefined) return null;
  const result = readApplicationReleaseProof(semantic, signed, fields["release"], { bytes: APPLICATION_SEMANTIC_VALUE.max + APPLICATION_RELEASE_VALUE.max });
  if (result.ids.semantic !== fields["semantic"] || result.semantic.capabilities.length || result.semantic.host.profiles.some(profile => profile !== "restricted@1")) throw Error("unsupported install proof");
  for (const part of result.semantic.definitions) {
    const value = given.value(DEFINITION_DOMAIN, part.id, given.resolved.bounds.definitionBytes);
    if (value === undefined) return null;
    const checked = validateDefinition(value, given.resolved.bounds, RULE_PROFILES);
    if (!checked.ok || checked.definition.digest !== part.id || canonicalize(value) !== part.bytes) throw Error("unsupported native definition");
  }
  return result;
}
function installation(given: RuleGiven, id: string): Item | null {
  const seq = Number(id.split(":")[0]), item = given.state.item(seq);
  return Number.isSafeInteger(seq) && item?.type === "installation" ? item : null;
}
const invalid = { holds: false, name: "invalid-application-package", code: "bad-field" } as const;

export const applicationInstallRules: Rules = {
  ...rulesScopeRules3,
  "application-install-proof": { place: "guard", refusals: ["invalid-application-package"], run: (given): ReturnType<GuardRule> => {
    try {
      readApplicationReleaseUri(given.resolved.fields["uri"]);
      const result = proof(given); if (!result) return { holds: null, reason: "dependency-unavailable" };
      const selected = given.resolved.fields["roles"], raw = given.resolved.fields["values"];
      if (!Array.isArray(selected) || new Set(selected).size !== selected.length || selected.some(role => typeof role !== "string" || !Object.hasOwn(result.semantic.roles, role)) || typeof raw !== "string") return invalid;
      const values = parseStrict(raw);
      if (!isRecord(values) || canonicalize(values) !== raw || Object.hasOwn(values, "opener") || Object.hasOwn(values, "destination")) return invalid;
      return { holds: true };
    } catch { return invalid; }
  } },
  "application-install-identities": { place: "effect", most: 3, run: given => {
    const checked = proof(given); if (!checked) throw Error("validated install retains its proof");
    return [
      { effect: "value", item: given.resolved.self, slot: "definition", value: checked.semantic.entry },
      { effect: "value", item: given.resolved.self, slot: "presentation", value: checked.ids.presentation },
      { effect: "value", item: given.resolved.self, slot: "publisher", value: checked.release.manifest.publisher },
    ];
  } },
  "open-application-admission": { place: "effect", most: 2, run: given => [
    { effect: "operation", k: 0, owner: pinnedBy(given), kind: "admit-application", attempts: 1 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
  ] },
  "application-admission": { place: "outcome", rules: {
    selects: true, read: true, closure: 0, most: { effects: 2, requests: 0, operations: 0 }, retries: () => false,
    holds: (given, operation) => { const job = installation(given, operation.id); return job?.state === "pending" && job.values["phase"] === "admission"; },
    // The existing driver's safe-read recovery may complete a marked attempt.
    // No answer stays visibly pending; no fabricated unknown native fact.
    wellFormed: (result, evidence, given) => {
      if (result === "unknown" || evidence.basis !== "read" || given.input.type !== "outcome") return false;
      const job = installation(given, given.input.operation), body = evidence.body;
      if (!job || !isRecord(body) || body["uri"] !== job.values["uri"] || body["release"] !== job.values["release"]) return false;
      if (result === "refused") return Object.keys(body).sort().join() === "reason,release,uri" && (APPLICATION_INSTALL_REFUSALS as readonly unknown[]).includes(body["reason"]);
      return Object.keys(body).sort().join() === "policy,presentation,publisher,release,semantic,uri" && isDigest(body["policy"])
        && body["semantic"] === job.values["semantic"] && body["presentation"] === job.values["presentation"] && body["publisher"] === job.values["publisher"];
    },
    unknown: (state, operation) => { const job = state.item(Number(operation.id.split(":")[0])); return { uri: job?.values["uri"] ?? null, release: job?.values["release"] ?? null }; },
    derives: (given, operation, selected) => {
      const job = installation(given, operation.id); if (!job || given.input.type !== "outcome") throw Error("admission belongs to an install job");
      const body = given.input.evidence.body as Record<string, FieldValue>;
      return { effects: given.input.result === "refused" ? [{ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: body["reason"]! }]
        : selected === true ? [{ effect: "value", item: job.id, slot: "phase", value: "activation" }] : [], sends: [], opens: [] };
    },
  } },
};

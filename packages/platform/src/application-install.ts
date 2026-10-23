/** One signed install records fetch, admission, activation, grants and
 * Directory-owned creation. The opt-in cohort selects this native rules pin;
 * fresh-room CLI selection is still under construction. */
import type { DeclaredDefinition, Evidence, FieldValue, PlatformData } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isMemberRef, isRecord, isScopeRef, parseStrict, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { readApplicationReleaseProof, readApplicationReleaseUri, type ApplicationReleaseProof } from "@generalbusiness/dap-bytes/application";
import { validateDefinition, type GuardRule, type Item, type RuleGiven, type RuleEffect, type Rules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { rulesScope3, rulesScopeRules3 } from "./rules-scope.ts";
import { applicationResultFields } from "./application-install-creation.ts";
import { applicationValues } from "./application.ts";
import { pinnedBy } from "./versions.ts";
import { archiveInstallPin } from "./archive-binding-wire.ts";
const archiveInstall = (given: RuleGiven): boolean => archiveInstallPin(pinnedBy(given));

import { INSTALL_ADDITIONS_BYTES, INSTALL_DEFINITION_BYTES, INSTALL_DEFINITIONS, installDefinitionTextFields, installDeclarationsType, installGrantFields, readInstallAdditions } from "./application-install-wire.ts";
export { APPLICATION_INSTALL_RULES } from "./application-install-wire.ts";
export const APPLICATION_SEMANTIC_VALUE = { domain: "dap-application-semantics-1", max: PROPOSED_BOUNDS.definitionBytes } as const;
export const APPLICATION_RELEASE_VALUE = { domain: "dap-application-release-1", max: 4096 } as const;
export const APPLICATION_INSTALL_REFUSALS = ["unsupported-object-format", "untrusted-release", "unsupported-host", "unsupported-definition", "package-invalid", "package-too-large", "source-refused", "content-not-retained"] as const;
const roles = { type: "list", max: 5, of: { type: "enum", of: ["admin", "maintainer", "member", "agent", "checker"] } } as const;
const fixed = { fixed: true, required: true } as const;
const digest = { type: "digest" } as const;
const phase = { type: "enum", of: ["fetch", "admission", "activation", "grants", "creation"] } as const;

export const applicationInstallRulesScope: PlatformData = {
  ...rulesScope3,
  items: { ...rulesScope3.items, definition: { ...rulesScope3.items["definition"]!, values: { ...rulesScope3.items["definition"]!.values, declarations: { fixed: true, required: false, of: installDeclarationsType } } }, installation: {
    many: true, max: 64, initial: "pending",
    states: { pending: { final: false }, active: { final: false }, refused: { final: true } },
    parties: { installer: { ...fixed, list: false, author: true } },
    refs: { scope: { fixed: false, required: false, to: { type: "scope", kind: "lane" } },
      membership: { fixed: false, required: false, to: { type: "scope", kind: "membership" } },
      destination: { fixed: false, required: false, to: { type: "scope", kind: "destination" } } },
    values: { uri: { ...fixed, of: { type: "text", max: 4096 } }, release: { ...fixed, of: digest }, semantic: { ...fixed, of: digest },
      needsDestination: { ...fixed, of: { type: "bool" } },
      presentation: { ...fixed, of: digest }, definition: { ...fixed, of: digest }, publisher: { ...fixed, of: { type: "text", max: 64 } },
      additions: { ...fixed, of: { type: "text", max: INSTALL_ADDITIONS_BYTES } },
      declarations: { ...fixed, of: installDeclarationsType }, genesis: { ...fixed, of: { type: "text", max: 16 * 1024 } },
      phase: { fixed: false, required: true, of: phase, default: "fetch" },
      reason: { fixed: false, required: false, of: { type: "text", max: 64 } },
    },
  } },
  acts: { ...rulesScope3.acts, "install-application": {
    step: "open", on: "installation", grant: "application.install", also: {},
    fields: { ...installDefinitionTextFields, uri: { type: "text", max: 4096, required: true },
      release: { type: "digest", required: true, value: APPLICATION_RELEASE_VALUE },
      semantic: { type: "digest", required: true, value: APPLICATION_SEMANTIC_VALUE },
      roles: { ...roles, required: true }, values: { type: "text", max: 16 * 1024, required: true },
    },
    guards: [{ code: "application-install-proof", row: "M1" }],
    effects: [
      { party: { slot: "installer", from: { signer: true } } },
      ...["uri", "release", "semantic"].map(slot => ({ value: { slot, from: { field: slot } } })),
      { code: "application-install-identities", row: "M1" },
      { code: "open-application-fetch", row: "M1" },
    ], sends: [], attention: [],
  } },
  receives: { ...rulesScope3.receives,
    "application-context": {
      message: "application-context", class: "tell", from: { kind: "directory", under: "platform:directory" }, opens: null,
      also: { installation: { item: "installation", by: "job" }, rules: { item: "rules", one: true } },
      fields: { ...installGrantFields, job: { type: "item", of: "installation", required: true },
        membership: { type: "scope", kind: "membership", required: true }, destination: { type: "scope", kind: "destination", required: true } },
      guards: [{ equals: { a: { sender: true }, b: { slot: "directory", of: "also.rules" } }, reason: "not-the-directory" },
        { code: "application-context-matches", row: "M1" }],
      effects: [{ code: "application-keep-context", row: "M1" }], sends: [{ code: "application-request-grants", row: "M1", result: { refused: [{ code: "application-grants-route-refused", row: "M1" }] } }], attention: [],
    },
    "application-grant-result": {
      message: "application-grant-result", class: "tell", from: { kind: "membership", under: "platform:membership" }, opens: null,
      also: { installation: { item: "installation", by: "job" } },
      fields: { ...installGrantFields, job: { type: "item", of: "installation", required: true },
        result: { type: "enum", of: ["confirmed", "refused"], required: true }, reason: { type: "enum", of: ["granted", "role-actions-full"], required: true } },
      guards: [{ code: "application-grants-match", row: "M1" }],
      effects: [{ code: "application-keep-grants", row: "M1" }], sends: [{ code: "application-request-creation", row: "M1", result: { refused: [{ code: "application-grants-route-refused", row: "M1" }] } }], attention: [],
    },
    "application-install-result": {
      message: "application-install-result", class: "tell", from: { kind: "directory", under: "platform:directory" }, opens: null,
      also: { installation: { item: "installation", by: "job" }, rules: { item: "rules", one: true } },
      fields: { ...applicationResultFields, job: { type: "item", of: "installation", required: true } },
      guards: [{ equals: { a: { sender: true }, b: { slot: "directory", of: "also.rules" } }, reason: "not-the-directory" },
        { code: "application-creation-matches", row: "M1" }], effects: [{ code: "application-keep-creation", row: "M1" }], sends: [], attention: [],
    },
  },
  outcomes: { ...rulesScope3.outcomes, "fetch-application": { code: "application-fetch", row: "M1" }, "admit-application": { code: "application-admission", row: "M1", send: { code: "application-stage-definitions", row: "M1", result: { refused: [{ code: "application-grants-route-refused", row: "M1" }] } } } },
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
  if (result.ids.semantic !== fields["semantic"] || result.semantic.capabilities.length || (!archiveInstall(given) && result.semantic.host.requires !== undefined) || result.semantic.host.profiles.some(profile => profile !== "restricted@1")) throw Error("unsupported install proof");
  for (let index = 0; index < result.semantic.definitions.length; index++) {
    const part = result.semantic.definitions[index]!;
    if (utf8(part.bytes).length > INSTALL_DEFINITION_BYTES || fields[`definitionText${index}`] !== textDigest(part.bytes)) throw Error("exact native declaration text required");
    const value = parseStrict(part.bytes), checked = validateDefinition(value, given.resolved.bounds, RULE_PROFILES);
    if (!checked.ok || checked.definition.digest !== part.id || canonicalize(value) !== part.bytes) throw Error("unsupported native definition");
  }
  for (let index = result.semantic.definitions.length; index < INSTALL_DEFINITIONS; index++) if (fields[`definitionText${index}`] !== undefined) throw Error("unrelated declaration text");
  return result;
}
function initialFields(given: RuleGiven, checked: ApplicationReleaseProof): { fields: Record<string, FieldValue>; needsDestination: boolean } | null {
  const signer = given.resolved.signer;
  if (!signer) return null;
  const raw = checked.semantic.definitions.find(part => part.id === checked.semantic.entry)!;
  const root = parseStrict(raw.bytes) as DeclaredDefinition, genesis = root.acts[root.genesis]!;
  const { destination, ...fields } = genesis.fields;
  if (destination && (destination.type !== "scope" || destination.kind !== "destination")) return null;
  // Validate user genesis fields now. The actual destination is injected by
  // Directory later; omitting its schema slot here asserts no placeholder ref.
  const admitted = applicationValues(given.resolved.fields["values"], { ...root, acts: { ...root.acts, [root.genesis]: { ...genesis, fields } } }, signer.member, given.resolved.bounds);
  return admitted ? { fields: admitted, needsDestination: destination !== undefined } : null;
}
function installation(given: RuleGiven, id: string): Item | null {
  const seq = Number(id.split(":")[0]);
  if (!Number.isSafeInteger(seq)) return null;
  const item = given.state.item(seq); if (item?.type === "installation") return item;
  const origin = given.own(seq)?.entry.input;
  if (origin?.type !== "outcome" || origin.kind !== "fetch-application" || origin.result !== "confirmed") return null;
  const first = given.state.item(Number(origin.operation.split(":")[0]));
  return first?.type === "installation" ? first : null;
}
function activationAvailable(given: RuleGiven, job: Item): boolean {
  const definitions = given.state.page("definition", ["active"], null, 16).items;
  return definitions.some(item => item.values["digest"] === job.values["definition"]) || definitions.length < 16;
}
function rootName(job: Item): string {
  const roots = job.values["declarations"];
  const root = Array.isArray(roots) ? roots.find(part => isRecord(part) && part["digest"] === job.values["definition"]) : null;
  if (!isRecord(root) || typeof root["name"] !== "string") throw Error("retained root declaration name required");
  return root["name"];
}
function matchingGrantFields(given: RuleGiven, job: Item | undefined, phases: readonly string[] = ["grants"]): boolean {
  return job?.state === "pending" && phases.includes(String(job.values["phase"]))
    && ["definition", "release", "semantic", "additions"].every(key => given.resolved.fields[key] === job.values[key]);
}
function applicationHostAnswer(result: "confirmed" | "refused" | "unknown", evidence: Evidence, given: RuleGiven): boolean {
  if (result === "unknown" || evidence.basis !== "read" || given.input.type !== "outcome") return false;
  const job = installation(given, given.input.operation), body = evidence.body;
  if (!job || !isRecord(body) || body["uri"] !== job.values["uri"] || body["release"] !== job.values["release"]) return false;
  if (result === "refused") return Object.keys(body).sort().join() === "reason,release,uri" && (APPLICATION_INSTALL_REFUSALS as readonly unknown[]).includes(body["reason"]);
  return Object.keys(body).sort().join() === "policy,presentation,publisher,release,semantic,uri" && isDigest(body["policy"])
    && body["semantic"] === job.values["semantic"] && body["presentation"] === job.values["presentation"] && body["publisher"] === job.values["publisher"];
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
      if (!readInstallAdditions(canonicalize(Object.fromEntries(selected.map(role => [role, result.semantic.roles[role as string]])))) || !initialFields(given, result)) return invalid;
      return { holds: true };
    } catch { return invalid; }
  } },
  "application-install-identities": { place: "effect", most: 7, run: given => {
    const checked = proof(given); if (!checked) throw Error("validated install retains its proof");
    const genesis = initialFields(given, checked);
    if (!genesis) throw Error("validated genesis fields required");
    const selected = given.resolved.fields["roles"] as readonly string[];
    const additions = canonicalize(Object.fromEntries(selected.map(role => [role, checked.semantic.roles[role]])));
    if (!readInstallAdditions(additions)) throw Error("validated default-role additions required");
    return [
      { effect: "value", item: given.resolved.self, slot: "declarations", value: checked.semantic.definitions.map(part => ({ digest: part.id, text: textDigest(part.bytes), name: (parseStrict(part.bytes) as DeclaredDefinition).name })) },
      { effect: "value", item: given.resolved.self, slot: "additions", value: additions },
      { effect: "value", item: given.resolved.self, slot: archiveInstall(given) ? "requirements" : "needsDestination", value: archiveInstall(given) ? { destination: genesis.needsDestination, archive: checked.semantic.host.requires?.includes("archive") === true } : genesis.needsDestination },
      { effect: "value", item: given.resolved.self, slot: "genesis", value: canonicalize(genesis.fields) },
      { effect: "value", item: given.resolved.self, slot: "definition", value: checked.semantic.entry },
      { effect: "value", item: given.resolved.self, slot: "presentation", value: checked.ids.presentation },
      { effect: "value", item: given.resolved.self, slot: "publisher", value: checked.release.manifest.publisher },
    ];
  } },
  "open-application-fetch": { place: "effect", most: 2, run: given => [
    { effect: "operation", k: 0, owner: pinnedBy(given), kind: "fetch-application", attempts: 1 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
  ] },
  "application-context-matches": { place: "guard", refusals: ["invalid-install-context"], run: given => {
    const job = given.resolved.subjects.get("also.installation"), room = given.resolved.subjects.get("also.rules");
    const member = given.resolved.fields["membership"], destination = given.resolved.fields["destination"];
    const matches = matchingGrantFields(given, job, ["activation"]) && isScopeRef(member) && member.scope === room?.values["membership"] && isScopeRef(destination)
      && (!job?.refs["membership"] || canonicalize(job.refs["membership"]) === canonicalize(member))
      && (!job?.refs["destination"] || canonicalize(job.refs["destination"]) === canonicalize(destination));
    return matches ? { holds: true } : { holds: false, name: "invalid-install-context" };
  } },
  "application-keep-context": { place: "effect", most: 3, run: given => {
    const job = given.resolved.subjects.get("also.installation")!;
    const refs: RuleEffect[] = ["membership", "destination"].filter(slot => !job.refs[slot]).map(slot => ({ effect: "ref", item: job.id, slot, to: given.resolved.fields[slot]! }));
    return [...refs, { effect: "value", item: job.id, slot: "phase", value: "grants" }];
  } },
  "application-grants-match": { place: "guard", refusals: ["invalid-install-grants"], run: given => {
    const job = given.resolved.subjects.get("also.installation");
    if (!matchingGrantFields(given, job)) return { holds: false, name: "invalid-install-grants" };
    const member = job?.refs["membership"];
    // Context may arrive after Membership's reply. Leave that exact message
    // undecided so the existing outbox can retry it once context is present.
    if (!isScopeRef(member)) return { holds: null, reason: "dependency-unavailable" };
    const answered = given.input.type === "delivery" && canonicalize(given.input.from.at) === canonicalize(member);
    const good = given.resolved.fields["result"] === "confirmed" ? given.resolved.fields["reason"] === "granted" : given.resolved.fields["reason"] === "role-actions-full";
    return answered && good ? { holds: true } : { holds: false, name: "invalid-install-grants" };
  } },
  "application-keep-grants": { place: "effect", most: 2, run: given => {
    const job = given.resolved.subjects.get("also.installation")!;
    return given.resolved.fields["result"] === "confirmed" ? [{ effect: "value", item: job.id, slot: "phase", value: "creation" }]
      : [{ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: "role-actions-full" }];
  } },
  "application-request-creation": { place: "send", run: given => {
    if (given.resolved.fields["result"] !== "confirmed") return null;
    const job = given.resolved.subjects.get("also.installation");
    const directory = given.state.page("rules", ["current"], null, 1).items[0]?.refs["directory"], installer = job?.parties["installer"];
    if (!job || !isScopeRef(directory) || !isMemberRef(installer)) throw Error("original checked install authority required");
    return { to: directory, message: { class: "request", type: "tell", body: { message: "application-create", fields: {
      job: job.id, definition: job.values["definition"], release: job.values["release"], semantic: job.values["semantic"], presentation: job.values["presentation"],
      installer, genesis: job.values["genesis"], needsDestination: archiveInstall(given) ? isRecord(job.values["requirements"]) && job.values["requirements"]["destination"] === true : job.values["needsDestination"],
    } } } };
  } },
  "application-creation-matches": { place: "guard", refusals: ["invalid-application-result"], run: given => {
    const job = given.resolved.subjects.get("also.installation"), fields = given.resolved.fields;
    const matches = job?.state === "pending" && job.values["phase"] === "creation" && ["definition", "release", "semantic", "presentation"].every(key => fields[key] === job.values[key]);
    const created = fields["result"] === "created", scope = fields["scope"];
    return matches && (created ? isScopeRef(scope) && scope.kind === "lane" : scope === undefined) ? { holds: true } : { holds: false, name: "invalid-application-result" };
  } },
  "application-keep-creation": { place: "effect", most: 2, run: given => {
    const job = given.resolved.subjects.get("also.installation")!;
    return given.resolved.fields["result"] === "created" ? [{ effect: "ref", item: job.id, slot: "scope", to: given.resolved.fields["scope"]! }, { effect: "state", item: job.id, state: "active" }]
      : [{ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: `application-creation-${String(given.resolved.fields["result"])}` }];
  } },
  "application-stage-definitions": { place: "send", run: given => {
    if (given.input.type !== "outcome" || given.input.result !== "confirmed" || given.resolved.outcome?.selected !== true) return null;
    const job = installation(given, given.input.operation);
    const directory = given.state.page("rules", ["current"], null, 1).items[0]?.refs["directory"];
    if (!job || !isScopeRef(directory)) throw Error("install retains its room directory");
    if (!activationAvailable(given, job)) return null;
    return { to: directory, message: { class: "request", type: "tell", body: { message: "application-stage", fields: {
      name: rootName(job), declarations: job.values["declarations"], ...(archiveInstall(given) ? { needsArchive: isRecord(job.values["requirements"]) && job.values["requirements"]["archive"] === true } : {}),
      ...Object.fromEntries((job.values["declarations"] as unknown as { text: string }[]).map((part, index) => [`definitionText${index}`, part.text])),
      definition: job.values["definition"], job: job.id, release: job.values["release"], semantic: job.values["semantic"], additions: job.values["additions"],
    } } } };
  } },
  "application-request-grants": { place: "send", run: given => {
    const job = given.resolved.subjects.get("also.installation"), room = given.resolved.subjects.get("also.rules");
    const directory = room?.refs["directory"];
    if (!job || !isScopeRef(directory)) throw Error("checked room context required");
    return { to: directory, message: { class: "request", type: "tell", body: { message: "application-grants", fields: {
      job: job.id, definition: job.values["definition"], release: job.values["release"], semantic: job.values["semantic"], additions: job.values["additions"],
    } } } };
  } },
  "application-grants-route-refused": { place: "effect", most: 2, run: given => {
    if (given.input.type !== "delivery" || given.input.message.class !== "result") throw Error("grant route result required");
    const original = given.own(given.input.message.of.from.seq)?.entry.input;
    const delivered = original?.type === "delivery" && original.message.class === "request" && isRecord(original.message.body) && isRecord(original.message.body["fields"]) ? original.message.body["fields"]["job"] : null;
    const job = original?.type === "outcome" ? installation(given, original.operation) : typeof delivered === "number" ? given.state.item(delivered) : null;
    if (!job || job.state !== "pending") return [];
    const reason = original?.type === "outcome" && isRecord(job.values["requirements"]) && job.values["requirements"]["archive"] === true && given.input.message.reason?.name === "archive-unavailable" ? "archive-unavailable" : "install-route-refused";
    return [{ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: reason }];
  } },
  "application-fetch": { place: "outcome", rules: {
    selects: true, read: true,
    // One admission attempt reserves its first and possible late outcome.
    // Its closure is zero; this fetch outcome reserves those two entries.
    closure: 2, most: { effects: 3, requests: 0, operations: 1 }, retries: () => false,
    holds: (given, operation) => { const job = installation(given, operation.id); return job?.state === "pending" && job.values["phase"] === "fetch"; },
    wellFormed: applicationHostAnswer, unknown: () => null,
    derives: (given, operation, selected) => {
      const job = installation(given, operation.id);
      if (!job || given.input.type !== "outcome") throw Error("fetch belongs to one original install");
      if (given.input.result === "refused") return { effects: [{ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: (given.input.evidence.body as Record<string, FieldValue>)["reason"]! }], sends: [], opens: [] };
      return selected === true ? { effects: [{ effect: "value", item: job.id, slot: "phase", value: "admission" }], sends: [], opens: [{ owner: pinnedBy(given), kind: "admit-application", attempts: 1 }] } : { effects: [], sends: [], opens: [] };
    },
  } },
  "application-admission": { place: "outcome", rules: {
    selects: true, read: true, closure: 0, most: { effects: 6, requests: 1, operations: 0 }, retries: () => false,
    holds: (given, operation) => { const job = installation(given, operation.id); return job?.state === "pending" && job.values["phase"] === "admission"; },
    // The existing driver's safe-read recovery may complete a marked attempt.
    // No answer stays visibly pending; no fabricated unknown native fact.
    wellFormed: applicationHostAnswer,
    unknown: (state, operation) => { const job = state.item(Number(operation.id.split(":")[0])); return { uri: job?.values["uri"] ?? null, release: job?.values["release"] ?? null }; },
    derives: (given, operation, selected) => {
      const job = installation(given, operation.id); if (!job || given.input.type !== "outcome") throw Error("admission belongs to an install job");
      const body = given.input.evidence.body as Record<string, FieldValue>;
      const effects: RuleEffect[] = [];
      if (given.input.result === "refused") effects.push({ effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: body["reason"]! });
      else if (selected === true) {
        if (!activationAvailable(given, job)) return { effects: [{ effect: "value", item: job.id, slot: "phase", value: "activation" }, { effect: "state", item: job.id, state: "refused" }, { effect: "value", item: job.id, slot: "reason", value: "definitions-full" }], sends: [], opens: [] };
        // One active entry root retains the validated closure from the signed
        // install. Existing activation is reused; no second member act and no
        // redundant activation of every child definition are needed.
        const held = given.state.page("definition", ["active"], null, 16).items.some(item => item.values["digest"] === job.values["definition"]);
        if (!held) {
          const installer = job.parties["installer"];
          if (!isMemberRef(installer)) throw Error("installation retains its original member");
          effects.push({ effect: "open", item: given.resolved.self, type: "definition", state: "active" },
            { effect: "party", item: given.resolved.self, slot: "activator", member: installer },
            { effect: "value", item: given.resolved.self, slot: "digest", value: job.values["definition"]! },
            { effect: "value", item: given.resolved.self, slot: "name", value: rootName(job) },
            { effect: "value", item: given.resolved.self, slot: "declarations", value: job.values["declarations"]! });
        }
        effects.push({ effect: "value", item: job.id, slot: "phase", value: "activation" });
      }
      return { effects, sends: [], opens: [] };
    },
  } },
};

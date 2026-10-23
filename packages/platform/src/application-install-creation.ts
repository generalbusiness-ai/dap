/** Directory-owned native birth, followed by a bounded local-journal read
 * operation that delivers the recorded result back to the original Rules job.
 * The bridge opens no member act and grants no new authority. */
import type { FieldValue, PlatformData, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, isDigest, isMemberRef, isRecord, isScopeRef, messageDigest, parseStrict } from "@generalbusiness/dap-bytes";
import type { Item, Own, RuleGiven, Rules, StateView } from "@generalbusiness/dap-derive";
import { directory11 as grantDirectory, directoryRules11 as grantRules } from "./application-install-grants.ts";
import { directoryMembership, directoryRulesScope } from "./directory.ts";
import { TRUSTED_APPLICATION_COHORT } from "./application-install-wire.ts";
import { pinnedBy } from "./versions.ts";
const identityFields = {
  job: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER, required: true }, definition: { type: "digest", required: true },
  release: { type: "digest", required: true }, semantic: { type: "digest", required: true }, presentation: { type: "digest", required: true },
} as const;
export const applicationCreateFields = { ...identityFields, installer: { type: "member", required: true },
  genesis: { type: "text", max: 16 * 1024, required: true }, needsDestination: { type: "bool", required: true } } as const;
export const applicationResultFields = { ...identityFields, scope: { type: "scope", kind: "lane", required: false },
  result: { type: "enum", of: ["created", "refused", "conflict"], required: true } } as const;
export const directory11: PlatformData = {
  ...grantDirectory,
  items: { ...grantDirectory.items, application: { ...grantDirectory.items["application"]!,
    refs: { ...grantDirectory.items["application"]!.refs, rules: { fixed: true, required: false, to: { type: "scope", kind: "rules" } } },
    values: { ...grantDirectory.items["application"]!.values,
      installJob: { fixed: true, required: false, of: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } },
      release: { fixed: true, required: false, of: { type: "digest" } }, semantic: { fixed: true, required: false, of: { type: "digest" } }, presentation: { fixed: true, required: false, of: { type: "digest" } },
    },
  } },
  receives: { ...grantDirectory.receives, "application-create": {
    message: "application-create", class: "tell", from: { kind: "rules", under: "platform:rules" }, opens: "application",
    also: { repository: { item: "repository", one: true } }, fields: applicationCreateFields,
    guards: [{ equals: { a: { sender: true }, b: { slot: "rules", of: "also.repository" } }, reason: "not-the-rules" }, { code: "installed-application-ready", row: "M1" }],
    effects: [
      { party: { slot: "author", from: { field: "installer" } } }, { ref: { slot: "rules", from: { slot: "rules", of: "also.repository" } } },
      ...["definition", "release", "semantic", "presentation"].map(slot => ({ value: { slot, from: { field: slot } } })),
      { value: { slot: "installJob", from: { field: "job" } } },
    ],
    sends: [{ code: "create-installed-application", row: "M1", result: {
      applied: [{ ref: { slot: "scope", from: { sender: true } } }, { state: "created" }, { code: "open-install-announcement", row: "M1" }],
      refused: [{ state: "refused" }, { code: "open-install-announcement", row: "M1" }],
      conflict: [{ state: "conflict" }, { code: "open-install-announcement", row: "M1" }],
    } }], attention: [],
  } },
  outcomes: { ...grantDirectory.outcomes, "announce-application": { code: "application-announcement", row: "M1", attempts: 1,
    most: { effects: 0, operations: [] }, send: { code: "send-install-announcement", row: "M1", once: true, result: {} },
  } },
};
function destination(given: RuleGiven): ScopeRef | null {
  const ref = given.state.page("repository", ["open"], null, 1).items[0]?.refs["destination"];
  return isScopeRef(ref) && ref.kind === "destination" ? ref : null;
}
function genesis(given: RuleGiven): Record<string, FieldValue> | null {
  const raw = given.resolved.fields["genesis"], member = given.resolved.fields["installer"], membership = directoryMembership(given.state);
  if (typeof raw !== "string" || !isMemberRef(member) || !membership || canonicalize(member.membership) !== canonicalize(membership)) return null;
  try {
    const fields = parseStrict(raw);
    if (!isRecord(fields) || canonicalize(fields) !== raw || Object.hasOwn(fields, "destination") || Object.hasOwn(fields, "opener") && canonicalize(fields["opener"]) !== canonicalize(member)) return null;
    const target = destination(given);
    if (given.resolved.fields["needsDestination"] === true && !target) return null;
    return { ...fields, ...(given.resolved.fields["needsDestination"] === true ? { destination: target } : {}) } as Record<string, FieldValue>;
  } catch { return null; }
}
function announcedItem(state: StateView, own: Own, operation: string): Item | null {
  const origin = own(Number(operation.split(":")[0]))?.entry.input;
  if (origin?.type !== "delivery" || origin.message.class !== "result") return null;
  const request = own(origin.message.of.from.seq)?.entry.input;
  if (request?.type !== "delivery" || request.message.class !== "request" || !isRecord(request.message.body) || request.message.body["message"] !== "application-create") return null;
  const job = state.item(origin.message.of.from.seq);
  return job?.type === "application" && ["created", "refused", "conflict"].includes(job.state) ? job : null;
}
/** Pure read of this Directory's native result. The outside bridge and pinned
 * owner both derive this exact body; neither fetches or mutates another scope. */
export function applicationAnnouncement(state: StateView, own: Own, operation: string): Record<string, FieldValue> | null {
  const job = announcedItem(state, own, operation);
  if (!job || !isScopeRef(job.refs["rules"]) || typeof job.values["installJob"] !== "number" || !["definition", "release", "semantic", "presentation"].every(key => isDigest(job.values[key]))) return null;
  const scope = job.refs["scope"];
  if (job.state === "created" && (!isScopeRef(scope) || scope.kind !== "lane")) return null;
  return { job: job.values["installJob"], definition: job.values["definition"]!, release: job.values["release"]!, semantic: job.values["semantic"]!, presentation: job.values["presentation"]!, result: job.state,
    ...(job.state === "created" ? { scope: scope as unknown as FieldValue } : {}) };
}
export const directoryRules11: Rules = {
  ...grantRules,
  "installed-application-ready": { place: "guard", refusals: ["invalid-application-creation"], run: given => {
    const root = given.resolved.fields["definition"];
    const retained = given.state.page("application-catalog", ["retained"], null, 16).items.some(item => item.values["definition"] === root);
    return retained && genesis(given) ? { holds: true } : { holds: false, name: "invalid-application-creation" };
  } },
  "create-installed-application": { place: "send", run: given => {
    if (given.input.type !== "delivery" || !isDigest(given.resolved.fields["definition"])) throw Error("checked install delivery required");
    const fields = genesis(given), membership = directoryMembership(given.state);
    if (!fields || !membership) throw Error("checked native genesis and membership required");
    const seed: Seed = { v: 1, kind: "lane", definition: given.resolved.fields["definition"], creator: given.resolved.at,
      cause: deliveryCauseDigest({ v: 1, from: given.input.from, n: given.input.n, message: messageDigest(given.input.message) }), ordinal: 0 };
    return { to: seed, message: { class: "request", type: "create", body: { fields, directory: given.resolved.at, membership, creationContext: { v: 1 } } } };
  } },
  "open-install-announcement": { place: "effect", most: 2, run: given => [
    { effect: "operation", k: 0, owner: pinnedBy(given), kind: "announce-application", attempts: 1 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
  ] },
  "application-announcement": { place: "outcome", rules: {
    selects: true, read: true, closure: 0, most: { effects: 0, requests: 1, operations: 0 }, retries: () => false,
    holds: (given, operation) => announcedItem(given.state, given.own, operation.id) !== null,
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed" || evidence.basis !== "read" || given.input.type !== "outcome") return false;
      const expected = applicationAnnouncement(given.state, given.own, given.input.operation);
      return expected !== null && canonicalize(evidence.body) === canonicalize(expected);
    },
    unknown: () => null,
  } },
  "send-install-announcement": { place: "send", run: given => {
    if (given.input.type !== "outcome" || given.input.result !== "confirmed" || given.resolved.outcome?.selected !== true) return null;
    const job = announcedItem(given.state, given.own, given.input.operation), body = applicationAnnouncement(given.state, given.own, given.input.operation);
    const rules = job?.refs["rules"];
    if (!body || !isScopeRef(rules) || canonicalize(rules) !== canonicalize(directoryRulesScope(given.state))) throw Error("announcement belongs to this room's Rules");
    return { to: rules, message: { class: "request", type: "tell", body: { message: "application-install-result", fields: body } } };
  } },
};
export const APPLICATION_ANNOUNCEMENT_OWNER = TRUSTED_APPLICATION_COHORT.directory;

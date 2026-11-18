/**
 * Rules 16 of the `upgrade` family (U1; note 2026-11-17-application-upgrade,
 * rulings D1 to D4). It is Rules 15 with one act, `upgrade-application`, on
 * an active installation item N. The act names a new signed release and
 * chooses its form from the release's semantic identifier:
 *
 * - In place: the semantic identifier and the root definition equal N's.
 *   The act opens one `fetch-application` operation and changes nothing yet.
 *   The host's confirmed fetch answer sets N's `uri`, `release` and
 *   `presentation`, after the rule checks again that the answer's semantic
 *   identifier and publisher equal N's. A refused answer, such as
 *   `untrusted-release`, changes nothing. No other slot of N changes.
 * - Replace: any other change. The act opens a pending successor
 *   installation with a `replaces` reference to N, and the successor runs
 *   the install pipeline of Rules 15. N ends in the final state `replaced`
 *   in the entry that makes the successor active. Until then N stays
 *   active. A refused successor leaves N active.
 *
 * Both forms refuse a release whose publisher differs from N's
 * (`application-publisher-changed`), a release equal to N's
 * (`application-release-unchanged`), and an act on N while a successor of N
 * is pending or while the fetch of an in-place act on N has no decisive
 * outcome (`application-upgrade-pending`). The changeable reference
 * `upgradeAt` of N holds the position of N's latest in-place act; the act
 * opens its fetch there with ordinal 0, so the guard reads that one
 * operation from the ledger.
 *
 * To let the fetch answer write them, `uri`, `release` and `presentation`
 * are not fixed slots in Rules 16. No other rule writes them after the
 * opening entry.
 */
import type { Evidence, FieldValue, PlatformData } from "@generalbusiness/dap-contract";
import { isDigest, isMemberRef, isRecord } from "@generalbusiness/dap-bytes";
import { operationId, operationSettled, type GuardRule, type Item, type Operation, type RuleEffect, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { readApplicationReleaseUri } from "./application-codec/application.ts";
import { REFERENCE_INSTALL_REFUSAL } from "./application-install-reference.ts";
import { APPLICATION_INSTALL_REFUSALS } from "./application-install.ts";
import { baseInstallProof, baseRules, baseRulesScope } from "./base-rules.ts";

const row = "U1" as const;
const installation = baseRulesScope.items["installation"]!, install = baseRulesScope.acts["install-application"]!;
const changeable = (slot: string) => ({ ...installation.values[slot]!, fixed: false });

export const upgradeRulesScope: PlatformData = {
  ...baseRulesScope,
  items: { ...baseRulesScope.items, installation: { ...installation,
    states: { ...installation.states, replaced: { final: true } },
    refs: { ...installation.refs, replaces: { fixed: true, required: false, to: { type: "item", of: "installation" } },
      upgradeAt: { fixed: false, required: false, to: { type: "int", min: 1, max: Number.MAX_SAFE_INTEGER } } },
    values: { ...installation.values, uri: changeable("uri"), release: changeable("release"), presentation: changeable("presentation") },
  } },
  acts: { ...baseRulesScope.acts, "upgrade-application": {
    step: "transition", on: "installation", grant: "application.install", also: {},
    ...(install.observes ? { observes: install.observes } : {}),
    fields: { ...install.fields, roles: { ...install.fields["roles"]!, required: false }, values: { ...install.fields["values"]!, required: false } },
    guards: [{ state: ["active"] }, { code: "device-owner-standing", row: "G5a" }, { code: "application-upgrade-proof", row }],
    effects: [{ code: "application-upgrade-open", row }, { code: "application-upgrade-identities", row }, { code: "open-application-fetch", row: "M1" }],
    sends: [], attention: [],
  } },
};

/** The item that the act is on. */
function upgraded(given: RuleGiven): Item {
  const item = given.resolved.subjects.get("on");
  if (item?.type !== "installation") throw Error("an installation item required");
  return item;
}
/** The in-place form keeps N's semantic identifier, and so its root definition. */
const inPlace = (given: RuleGiven, item: Item): boolean => given.resolved.fields["semantic"] === item.values["semantic"];

/** A pending successor of the item, if one exists. */
function pendingSuccessor(given: RuleGiven, of: number): boolean {
  for (let after: number | null = null; ;) {
    const page = given.state.page("installation", ["pending"], after, 64);
    if (page.items.some(item => item.refs["replaces"] === of)) return true;
    const last = page.items.at(-1);
    if (!page.more || !last) return false;
    after = last.id;
  }
}

/** The fetch of N's latest in-place act has no decisive outcome yet. A confirmed or a refused outcome settles it; an `unknown` one leaves it open for its late answer. */
function inPlaceOpen(given: RuleGiven, item: Item): boolean {
  const at = item.refs["upgradeAt"];
  if (typeof at !== "number") return false;
  const operation = given.state.operation(operationId(at, 0));
  return operation !== null && !operationSettled(operation);
}

/** The installation that an in-place upgrade act names, when the operation belongs to one. A replace act opens its successor at the act's own position, so its operation reads that item instead. */
function upgradeOf(given: RuleGiven, id: string): { item: Item; fields: Record<string, FieldValue> } | null {
  const seq = Number(id.split(":")[0]);
  if (!Number.isSafeInteger(seq) || given.state.item(seq)) return null;
  const origin = given.own(seq)?.entry.input;
  if (origin?.type !== "act" || origin.signed.intent.kind !== "upgrade-application" || typeof origin.signed.intent.on !== "number") return null;
  const item = given.state.item(origin.signed.intent.on);
  return item?.type === "installation" ? { item, fields: origin.signed.intent.fields } : null;
}
/** The host's answer for an in-place upgrade: the act's source and release, with N's semantic identifier and publisher. */
function upgradeAnswer(result: "confirmed" | "refused" | "unknown", evidence: Evidence, given: RuleGiven): boolean {
  if (result === "unknown" || evidence.basis !== "read" || given.input.type !== "outcome") return false;
  const upgrade = upgradeOf(given, given.input.operation), body = evidence.body;
  if (!upgrade || !isRecord(body) || body["uri"] !== upgrade.fields["uri"] || body["release"] !== upgrade.fields["release"]) return false;
  if (result === "refused") return Object.keys(body).sort().join() === "reason,release,uri" && (APPLICATION_INSTALL_REFUSALS as readonly unknown[]).includes(body["reason"]);
  return Object.keys(body).sort().join() === "policy,presentation,publisher,release,semantic,uri" && isDigest(body["policy"]) && isDigest(body["presentation"])
    && body["semantic"] === upgrade.item.values["semantic"] && body["publisher"] === upgrade.item.values["publisher"];
}

const invalid = { holds: false, name: "invalid-application-package", code: "bad-field" } as const;
const installProof = baseRules["application-install-proof"], identities = baseRules["application-install-identities"];
const fetch = baseRules["application-fetch"], keepCreation = baseRules["application-keep-creation"];
if (installProof?.place !== "guard" || identities?.place !== "effect" || fetch?.place !== "outcome" || keepCreation?.place !== "effect") throw Error("Rules 15 install rules required");
const fetchRules = fetch.rules;

export const upgradeRules: Rules = {
  ...baseRules,
  "application-upgrade-proof": { place: "guard", refusals: ["invalid-application-package", REFERENCE_INSTALL_REFUSAL, "application-publisher-changed", "application-release-unchanged", "application-upgrade-pending"], run: (given): ReturnType<GuardRule> => {
    const item = upgraded(given), fields = given.resolved.fields;
    try {
      readApplicationReleaseUri(fields["uri"]);
      const checked = baseInstallProof(given); if (!checked) return { holds: null, reason: "dependency-unavailable" };
      if (checked.release.manifest.publisher !== item.values["publisher"]) return { holds: false, name: "application-publisher-changed" };
      if (fields["release"] === item.values["release"]) return { holds: false, name: "application-release-unchanged" };
      if (pendingSuccessor(given, item.id) || inPlaceOpen(given, item)) return { holds: false, name: "application-upgrade-pending" };
      if (inPlace(given, item)) {
        // The semantic identifier names the root definition, so an equal identifier keeps it. The in-place form takes no install fields.
        return checked.semantic.entry !== item.values["definition"] || ["roles", "values", "owner"].some(key => fields[key] !== undefined) ? invalid : { holds: true };
      }
      return fields["roles"] === undefined || fields["values"] === undefined ? invalid : installProof.run(given);
    } catch {
      return invalid;
    }
  } },
  /** The in-place form records its position on N, where its fetch opens. The replace form opens the successor at the act's position, pending, with the install's own first slots. */
  "application-upgrade-open": { place: "effect", most: 6, run: given => {
    const item = upgraded(given), member = given.resolved.signer?.member;
    if (inPlace(given, item)) return [{ effect: "ref", item: item.id, slot: "upgradeAt", to: given.resolved.self }];
    if (!isMemberRef(member)) throw Error("a signing member required");
    const self = given.resolved.self, fields = given.resolved.fields;
    return [
      { effect: "open", item: self, type: "installation", state: "pending" },
      { effect: "party", item: self, slot: "installer", member },
      ...(["uri", "release", "semantic"] as const).map((slot): RuleEffect => ({ effect: "value", item: self, slot, value: fields[slot]! })),
      { effect: "ref", item: self, slot: "replaces", to: item.id },
    ];
  } },
  "application-upgrade-identities": { place: "effect", most: identities.most, run: given => inPlace(given, upgraded(given)) ? [] : identities.run(given) },
  "application-fetch": { ...fetch, rules: { ...fetchRules,
    holds: (given: RuleGiven, operation: Operation) => {
      const upgrade = upgradeOf(given, operation.id);
      return upgrade ? upgrade.item.state === "active" : fetchRules.holds?.(given, operation) === true;
    },
    wellFormed: (result, evidence, given) => given.input.type === "outcome" && upgradeOf(given, given.input.operation)
      ? upgradeAnswer(result, evidence, given) : fetchRules.wellFormed?.(result, evidence, given) === true,
    derives: (given, operation, selected) => {
      const upgrade = upgradeOf(given, operation.id);
      if (!upgrade) return fetchRules.derives!(given, operation, selected);
      if (given.input.type !== "outcome") throw Error("an outcome required");
      // A refused fetch changes nothing. A confirmed one moves the item to the release, its source and its presentation.
      if (given.input.result !== "confirmed" || selected !== true || upgrade.item.state !== "active") return { effects: [], sends: [], opens: [] };
      const body = given.input.evidence.body as Record<string, FieldValue>, id = upgrade.item.id;
      return { effects: [
        { effect: "value", item: id, slot: "uri", value: body["uri"]! },
        { effect: "value", item: id, slot: "release", value: body["release"]! },
        { effect: "value", item: id, slot: "presentation", value: body["presentation"]! },
      ], sends: [], opens: [] };
    },
  } },
  /** The entry that makes a successor active ends the item that it replaces. */
  "application-keep-creation": { place: "effect", most: keepCreation.most + 1, run: given => {
    const kept = keepCreation.run(given), job = given.resolved.subjects.get("also.installation"), replaces = job?.refs["replaces"];
    const old = typeof replaces === "number" ? given.state.item(replaces) : null;
    return given.resolved.fields["result"] === "created" && old?.type === "installation" && old.state === "active"
      ? [...kept, { effect: "state", item: old.id, state: "replaced" }] : kept;
  } },
};

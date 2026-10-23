/**
 * A made-up value of platform data, for the tests of the rows of `observes`
 * (scope contract, revisions 20 and 21, sections 6.1 and 16.1; its
 * witnesses 18.46, 18.48, 18.50 and 18.52). It is no platform definition of
 * Artroom, and its names and numbers are made up. Every rule is a
 * STAND-IN: it shows where a subject comes from and what an entry retains,
 * and proves nothing about a rule of a destination or of a rules scope.
 *
 * `weigher` holds one desk.
 *
 * - `set-checks` has a list field `checks`, of records with a member
 *   `checker`, and one row: the checker of each element.
 * - `set` has a field `a`, a member, and one row: that member.
 * - `start` names two entries of a lane as facts, and its effect mark
 *   `opens` opens one operation of the kind `weigh`.
 * - `go` sends one `tell`, `ask`. Its clause `applied` states one row, of
 *   the rules, with `retains`, and one `value` effect on the desk.
 * - `weigh`, of `outcomes`, states `origin: "rule"` and three rows: the
 *   rules; keys that its rule names; and the holders of `x.do`.
 */

import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, Entry, KeyId, MemberId, ObservationUse, PlatformDefinition, RulesContent, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf } from "@generalbusiness/artroom-bytes";
import { PROFILES, validateDefinition, type ContentStates, type FirstStep, type OutcomeRule, type PlatformRules, type RuleEffect, type RuleGiven, type Rules, type ValidDefinition } from "../src/index.ts";
import { T0, changedDraft, d, membership, valid } from "./fixtures.ts";

import { weigher } from "./definition-corpus/observes-data.ts";
export { EXTENTS, EXTENTS_MAX, WEIGH_ROWS, STEP_ROWS, weigher } from "./definition-corpus/observes-data.ts";

/** The name and version that the made-up data is given in a test. No runtime holds it. */
export const WEIGHER = "platform:task@1" as PlatformDefinition;

/** What validating the made-up data with one change gives, with the platform option or as a declared definition. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const weighed = (change: (data: any) => void = () => {}, platform = true) => {
  const data = changedDraft(weigher, change);
  return validateDefinition(data, PROPOSED_BOUNDS, PROFILES, { platform });
};
/** The made-up data with one change, validated with the platform option. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const weigherWith = (change: (data: any) => void = () => {}): ValidDefinition => valid(weighed(change));

/** A rules scope that the made-up scope records, and the made-up name of the definition that it pins. Neither is a scope or a definition of Artroom. */
export const rulebook: ScopeRef = (() => {
  const seed: Seed = { v: 1, kind: "rules", definition: d("e"), creator: null, cause: d("c"), ordinal: 9 };
  return { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(9)), kind: "rules" };
})();
export const RULEBOOK = "platform:rules@2" as PlatformDefinition;

/** What the data of the made-up rules definition states of the two members: `content` below says which. */
export const stating = (states: Partial<ContentStates> = {}) => (named: PlatformDefinition): ContentStates | null => (named === RULEBOOK ? { singleControllerException: false, extents: false, ...states } : null);

// ---------------------------------------------------------------- observations, WRITTEN BY HAND

/** Each observation below is written by hand: no scope answered it, and no history stands behind the head that it names. */
const read = (n: number, at = T0): Pick<ObservationUse, "read" | "use" | "prior"> & { at: string } => ({ read: { run: "r1", n }, use: "fresh", prior: null, at });
const from = (at: string) => ({ of: membership, head: { seq: 40, hash: d("4") }, definition: "platform:membership@1" as PlatformDefinition, at });

export function memberSeen(member: MemberId, n: number, at = T0): ObservationUse {
  const { at: began, ...use } = read(n, at);
  return { observation: { subject: "member", ...from(began), member, memberState: "active", role: "member", activeKey: true, controller: null, controllerActive: null }, ...use };
}
export function keySeen(key: KeyId, member: MemberId, n: number, at = T0): ObservationUse {
  const { at: began, ...use } = read(n, at);
  return { observation: { ...from(began), key, keyState: "active", member, memberState: "active", role: "member", actions: ["x.do"], within: { membership }, controller: null, controllerActive: null, notAfter: null }, ...use };
}
export function holdersSeen(holders: readonly MemberId[], count: number, n: number, at = T0): ObservationUse {
  const { at: began, ...use } = read(n, at);
  return { observation: { subject: "holders", ...from(began), action: "x.do", count, holders }, ...use };
}
/** What the rules scope holds: which checks are required, and where given the digest of the extents. */
export function rulesSeen(required: readonly string[], n: number, at = T0, extents?: Digest): ObservationUse {
  const { at: began, ...use } = read(n, at);
  const content: RulesContent = { asked: "rules", approvals: 1, ownerMayReview: false, checks: required.map((name) => ({ name, configuration: d("c"), required: true, checker: "@check" as MemberId })), labels: [], ...(extents ? { extents } : {}) };
  return { observation: { subject: "rules", of: rulebook, head: { seq: 7, hash: d("7") }, revision: 3, content, definition: RULEBOOK, at: began }, ...use };
}

// ---------------------------------------------------------------- the rules, each a STAND-IN

/** The key that signed an entry at hand, and the check that its act names. */
const signedBy = (entry: Entry): { key: KeyId; check: string } | null =>
  (entry.input.type === "act" ? { key: entry.input.signed.intent.actor, check: String(entry.input.signed.intent.fields["check"] ?? "") } : null);

/** What the stand-in rules of one test saw: what `weigh` was told of its rows, the number of the read of each observation that it read, and each list that it named. */
export interface Seen { rows: unknown[]; read: unknown[]; named: unknown[] }

/** The key behind each entry at hand whose check the observed rules require: what the stand-in names for a row of the second step. */
export const counted = (given: RuleGiven, step: FirstStep): KeyId[] => {
  const rules = step.observed({ asked: "rules" })?.observation;
  const required = rules && "subject" in rules && rules.subject === "rules" && rules.content.asked === "rules" ? rules.content.checks.filter((check) => check.required).map((check) => check.name) : [];
  return given.uses.flatMap((used) => { const by = signedBy(used.entry); return by && required.includes(by.check) ? [by.key] : []; });
};
/** The key that signed each entry at hand, and then each text of the desk's value `more`: what the stand-in names for a row of the first step. */
export const signers = (given: RuleGiven): KeyId[] => [...given.uses.flatMap((used) => signedBy(used.entry)?.key ?? []), ...(((given.state.item(0)?.values["more"] as string[] | null | undefined) ?? []) as KeyId[])];

/**
 * STAND-INS, one for each mark of the made-up data.
 *
 * - `opens` opens one operation of the kind `weigh`, with one attempt.
 * - `weigh` selects nothing and allows no other attempt. Its origin is the
 *   entry that opened its operation, which it names by position. For a row
 *   of the first step it names what `first` gives. For a row of the second
 *   step it names the key behind each entry whose check the observed rules
 *   require. Its effects are none: it notes what it was told of each row,
 *   and reads the observation of the rules, of the holders and of every
 *   key that it named.
 * - `sees`, a guard, reads the standing of the member in the field `a`.
 */
export function weigherRules(seen: Seen = { rows: [], read: [], named: [] }, first: (given: RuleGiven) => KeyId[] = signers, over: Partial<OutcomeRule> = {}): PlatformRules {
  let named: KeyId[] = [];
  const weigh: OutcomeRule = {
    selects: false, read: false, retries: () => false,
    origin: (given) => { named = []; return given.input.type === "outcome" ? Number(given.input.operation.split(":")[0]) : null; },
    subjects: (given, _operation, row, step) => {
      const keys = step ? counted(given, step) : first(given);
      seen.named.push([row, keys]);
      named.push(...keys);
      return keys;
    },
    derives: (given) => {
      seen.rows.push([...(given.rows ?? [])]);
      seen.read.push([given.observed({ asked: "rules" })?.read.n ?? null, ...[...new Set(named)].map((key) => given.observed({ key })?.read.n ?? null)]);
      return { effects: [], sends: [], opens: [] };
    },
    ...over,
  };
  const opens: RuleEffect[] = [{ effect: "operation", k: 0, owner: WEIGHER, kind: "weigh", attempts: 1 }, { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }];
  const rules: Rules = {
    opens: { place: "effect", most: 2, run: () => opens },
    weigh: { place: "outcome", rules: weigh },
    sees: { place: "guard", refusals: ["unseen"], run: (given) => (given.observed({ member: (given.resolved.fields["a"] as { member: MemberId }).member }) ? { holds: true } : { holds: false, name: "unseen" }) },
  };
  return { named: WEIGHER, rules };
}

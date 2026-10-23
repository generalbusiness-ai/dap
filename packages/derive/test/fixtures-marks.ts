/**
 * A made-up value of platform data, for the tests of marks (scope contract,
 * revision 15, sections 4.2 and 6.1; its witnesses 18.38 and 18.39). It is
 * no platform definition of Artroom. Its names are made up.
 *
 * `gate` holds tickets. A ticket is issued with the hash of a secret. The
 * act `enter` uses one, and has a mark at each place of an act:
 *
 * - `grant` is the mark `by-ticket`: no grant judges the act.
 * - The name `ticket` of `also` is the mark `find`, over the tickets.
 * - The field `note`, and the slot `ticket.note`, have the type `even`.
 * - Its guards are one written guard, and then the mark `fresh`.
 * - Its effects are two written effects, and then the mark `key-id`.
 * - Its one send is the mark `refer`, with its clauses as data.
 *
 * `outcomes` names one kind of operation, `probe`, with its mark.
 */

import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/artroom-bytes";
import { PROFILES, validateDefinition, type PlatformRule, type PlatformRules, type RuleGiven, type Rules, type ValidDefinition } from "../src/index.ts";
import { changedDraft, valid } from "./fixtures.ts";

import { gate } from "./definition-corpus/marks-data.ts";
export { gate } from "./definition-corpus/marks-data.ts";

/** The name and version that the made-up data is given in a test. No runtime holds it. */
export const GATE = "platform:gate@1" as PlatformDefinition;

/** The made-up data with one change, validated with the platform option, as the platform package's data is. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gateWith(change: (data: any) => void = () => {}): ValidDefinition {
  const data = changedDraft(gate, change);
  return valid(validateDefinition(data, PROPOSED_BOUNDS, PROFILES, { platform: true }));
}

const signingKey = ({ input }: RuleGiven): string => (input.type === "act" ? input.signed.intent.actor : "");
const tickets = ({ state }: RuleGiven) => state.page("ticket", ["open", "used"], null, 100).items;

/**
 * STAND-INS: made-up rules for the made-up data, one for each mark. They
 * show where a rule is run and what joins the entry, and prove nothing
 * about a rule of a platform definition (witness 18.38).
 *
 * - `find` gives the ticket whose stored hash is the hash of the secret in
 *   the intent, or none.
 * - `by-ticket` passes, with no member, when `ticket` is bound.
 * - `even` says that a value is an even integer.
 * - `fresh` holds when no ticket holds the signing key. Its refusal is
 *   `seated`.
 * - `key-id` gives one `value` effect: `key` of the ticket is the signing
 *   key. With no ticket bound it gives none.
 * - `refer` gives no request.
 * - `probe` selects nothing and allows no other attempt.
 *
 * `ran` counts the calls of each rule, by name.
 */
export function gateRules(over: Partial<Record<string, PlatformRule>> = {}): PlatformRules & { ran: Record<string, number> } {
  const ran: Record<string, number> = {};
  const counted = <A extends unknown[], R>(name: string, rule: (...args: A) => R) => (...args: A): R => { ran[name] = (ran[name] ?? 0) + 1; return rule(...args); };
  const rules: Rules = {
    find: { place: "also", run: counted("find", (given) => tickets(given).find((ticket) => ticket.values["hash"] === textDigest(String(given.resolved.fields["secret"])))?.id ?? null) },
    "by-ticket": { place: "grant", refusals: ["no-ticket"], run: counted("by-ticket", ({ resolved }) => (resolved.subjects.has("also.ticket") ? { pass: true, member: null } : { pass: false, name: "no-ticket" })) },
    even: { place: "type", run: counted("even", (_given, value) => typeof value === "number" && value % 2 === 0) },
    fresh: { place: "guard", refusals: ["seated"], run: counted("fresh", (given) => (tickets(given).some((ticket) => ticket.values["key"] === signingKey(given)) ? { holds: false, name: "seated" } : { holds: true })) },
    "key-id": {
      place: "effect", most: 1,
      run: counted("key-id", (given) => { const ticket = given.resolved.subjects.get("also.ticket"); return ticket ? [{ effect: "value", item: ticket.id, slot: "key", value: signingKey(given) }] : []; }),
    },
    refer: { place: "send", run: counted("refer", () => null) },
    probe: { place: "outcome", rules: { selects: false, read: false, retries: () => false } },
    ...(over as Rules),
  };
  return { named: GATE, rules, ran };
}

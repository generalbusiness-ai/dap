import { registrar, asker, registrarDataFor } from "./definition-corpus-data.ts";
/**
 * For tests only. Nothing here is exported from the package's main entry,
 * and no production entry imports it.
 *
 * Four things here are STAND-INS, and each is labelled where it is used.
 *
 * - `registrar`: a made-up directory that creates one rules scope at its
 *   creation, with the fields that the directory's genesis sends (authority
 *   note, section 12.1, "Messages between scopes"). It stands for the real
 *   directory, below a register. It shows nothing of a creation.
 * - `asker`: a made-up lane that tells a rules scope `rules-wanted`. It
 *   stands for the change lane's side of that message, which is the lane
 *   design's.
 * - The grants of a `Rulebook`'s acts are the test authority of derive's
 *   fixture set: every key of that set holds every action, with no
 *   freshness proof. Nothing here shows who may publish or activate.
 * - `standing`: an observation of a member that the test writes by hand.
 *   No membership scope answered it, and no guard of an observation judged
 *   it. It shows what the rule `checkers` reads, and nothing about a read.
 *
 * The rules scope itself is not a stand-in: its data and its three rules
 * are the platform package's, and derive's real judges run them.
 */

import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { MemberId, MemberRef, ObservationUse, PlatformDefinition, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { PROFILES, clockOf, judgeDelivery, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import type { Judgment, PlatformRules } from "@generalbusiness/dap-derive";
import { Ledger, Scope, T0, arriving, creation, d, created, keys, membership, sent } from "@generalbusiness/dap-derive/testing";
import { RULES_SCOPE, platform } from "../src/index.ts";
import { checkedDefinition as checked, written } from "./fixtures.ts";


/** STAND-IN: a made-up directory, for the creator of a rules scope. Its creation creates one, and it has no other act and no handler. */
export { registrar } from "./definition-corpus-data.ts";

/** STAND-IN: a made-up lane. `point` records a rules scope, and `want` tells it `rules-wanted`, with no field and no clause. */
export { asker } from "./definition-corpus-data.ts";

export const registrarDefinition = checked(validateDefinition(registrar, PROPOSED_BOUNDS));
export const askerDefinition = checked(validateDefinition(asker, PROPOSED_BOUNDS));
/** The rules scope's data, validated as a runtime validates it. */
export const rulesScopeDefinition = checked(validateDefinition(JSON.parse(JSON.stringify(platform(RULES_SCOPE)!.data)), PROPOSED_BOUNDS, PROFILES, { platform: true }));
/** The rules scope's rules, as the platform package supplies them: what a judge of these tests is given. No stand-in rule is among them. */
export const rules: PlatformRules = { named: RULES_SCOPE, rules: platform(RULES_SCOPE)!.rules };

/** The branch that the stand-in registrar names. */
export const BRANCH = "refs/heads/main";

/**
 * A rules scope in memory, below a stand-in registrar that rita created:
 * its genesis, by the registrar's `create`, and the registrar's
 * confirmation. The membership scope that it records is the made-up
 * reference `membership` of derive's fixture set, by its ID, unless the
 * test names another (`of`). Each act is judged by derive's judge of an
 * act, with the rules scope's own rules, on the test authority of that
 * fixture set, unless the test presents other grants.
 */
export class Rulebook extends Ledger {
  readonly registrar: Ledger;

  readonly #platform: PlatformRules;

  constructor(confirmed = true, of: ScopeId = membership.scope, named: PlatformDefinition = RULES_SCOPE) {
    const supplied = platform(named);
    if (!supplied || supplied.data.name !== "platform:rules") throw new Error("The fixture needs an explicitly supported rules version.");
    const definition = named === RULES_SCOPE ? rulesScopeDefinition : checked(validateDefinition(JSON.parse(JSON.stringify(supplied.data)), PROPOSED_BOUNDS, PROFILES, { platform: true }));
    super(definition, "platform:rules");
    this.#platform = { named, rules: supplied.rules };
    const creator = named === RULES_SCOPE ? registrarDefinition : checked(validateDefinition(registrarDataFor(named), PROPOSED_BOUNDS));
    this.registrar = created(creator, { branch: BRANCH, membership: of });
    const { asked, source } = creation(this.registrar, 0);
    this.take(judgeGenesis(this.state, definition, asked, { clock: clockOf(this.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source, platform: this.#platform }));
    if (!confirmed) return;
    // The registrar records the applied result and confirms this exact pinned child.
    const result = sent(this, 0);
    this.registrar.seal(written(judgeDelivery(this.registrar.state, creator, result.delivered, { ...arriving(this.registrar, result.delivered, result.source) })));
    const confirm = sent(this.registrar, 1);
    this.take(judgeDelivery(this.state, definition, confirm.delivered, { ...arriving(this, confirm.delivered, confirm.source), platform: this.#platform }));
  }

  take(judgment: Judgment): void { this.seal(written(judgment)); }

  /** An act, judged with the rules scope's rules. `context`: what is at hand beside the intent, as `observed` and `values`. */
  override act(...[who, kind, over = {}, context = {}]: Parameters<Ledger["act"]>): ReturnType<Ledger["act"]> {
    return super.act(who, kind, over, { platform: this.#platform, membership, ...context });
  }

  /** The delivery of send `n` of entry `seq` of another scope, judged with the rules scope's rules, and written if it is to be. */
  receive(from: Ledger, seq: number, n = 0): Judgment {
    const { delivered, source } = sent(from, seq, n);
    const judgment = judgeDelivery(this.state, this.definition, delivered, { ...arriving(this, delivered, source), platform: this.#platform });
    if (judgment.result === "write") this.seal(judgment.draft);
    return judgment;
  }
}

/** STAND-IN: a lane that points at that rules scope. Its genesis and its confirmation are made by hand, as derive's fixture makes a lane. */
export function lanePointingAt(to: ScopeRef): Scope {
  const lane = new Scope(askerDefinition);
  lane.did(keys.rita, "point", { on: 0, expected: { on: lane.item(0).revision }, fields: { rules: to } });
  return lane;
}

/** A member of the made-up membership scope of derive's fixture set, or of another scope. */
export const memberOf = (handle: string, of: ScopeRef = membership): MemberRef => ({ membership: of, member: handle as MemberId });

/**
 * STAND-IN: an observation of one member, written by hand, with its read
 * and its use. `n` is the read's number in the run. `over`: what differs
 * from an active member with the role `checker` of the made-up membership
 * scope.
 */
export const standing = (member: string, n: number, over: Partial<Extract<ObservationUse["observation"], { subject: "member" }>> = {}): ObservationUse => ({
  observation: {
    subject: "member", of: membership, head: { seq: 40, hash: d("4") }, member: member as MemberId, memberState: "active", role: "checker", activeKey: true,
    controller: null, controllerActive: null, definition: "platform:membership@1", at: T0, ...over,
  },
  read: { run: "r1", n }, use: "fresh", prior: null,
});

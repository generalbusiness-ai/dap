/**
 * Register 28 of the `base` family (ruling 68356c6c, point 6). It composes
 * the stable default from three earlier lines:
 *
 * - Register 21's host choice, so `--host none` founds an unpublished room;
 * - Register 24's `founder-not-recovery`, so the founder and the recovery
 *   key differ;
 * - Register 26's failed claim, so a failed hosted creation releases its
 *   place.
 *
 * Its claims prove Directory 27, which creates Membership 14, Rules 15 and
 * Destination 21. Repository and archive binding come with Directory 27.
 */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { intentDigest, isFactRef, isSeed, same, scopeIdOf } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { BASE_COHORT as C } from "./base-cohort.ts";
import { failedClaimRegister, failedClaimRegisterRules } from "./failed-claim-cohort-data.ts";
import { separateRecoveryRegister, separateRecoveryRegisterRules } from "./separate-recovery-cohort-data.ts";
import { unpublishedRegister, unpublishedRegisterRules } from "./unpublished-register.ts";

const found = unpublishedRegister.acts["found"]!;
const recovery = separateRecoveryRegister.acts["found"]!.guards.find(guard => "code" in guard && guard.code === "founder-not-recovery")!;
const claim = unpublishedRegister.items["claim"]!;
export const baseRegister: PlatformData = { ...unpublishedRegister,
  items: { ...unpublishedRegister.items, claim: { ...claim, states: failedClaimRegister.items["claim"]!.states } },
  acts: { ...unpublishedRegister.acts, found: { ...found, guards: [...found.guards, recovery] } },
};

export const baseRegisterRules: Rules = { ...unpublishedRegisterRules,
  "founder-not-recovery": separateRecoveryRegisterRules["founder-not-recovery"]!,
  "create-repository": failedClaimRegisterRules["create-repository"]!,
  "directory-genesis-result": { place: "type", run: (given, value) => {
    const input = given.input;
    if (!isFactRef(value) || input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
      || !same(value, input.from) || value.seq !== 0 || input.sourceKind !== "directory") return false;
    const of = input.message.of, original = given.own(of.from.seq);
    if (!original || original.hash !== of.from.hash || !same(of.from.at, given.resolved.at)) return false;
    const sent = original.entry.sends.find(send => send.n === of.n);
    if (!sent || !isSeed(sent.to) || scopeIdOf(sent.to) !== value.at.scope) return false;
    const origin = original.entry.input;
    const act = origin.type === "act" ? origin : origin.type === "outcome" && origin.kind === "create-repository" && origin.owner === C.register
      ? given.own(Number(origin.operation.split(":")[0]))?.entry.input : null;
    return act?.type === "act" && act.signed.intent.kind === "found" && same(sent.to, {
      v: 1, kind: "directory", definition: C.directory, creator: given.resolved.at,
      cause: intentDigest(act.signed.intent), ordinal: 0,
    });
  } },
};

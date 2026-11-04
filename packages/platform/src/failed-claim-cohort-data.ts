/** Failed creation releases its place; later confirmations only clean up. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import type { Rules } from "@generalbusiness/dap-derive";
import { destination4, destinationRules4 } from "./destination.ts";
import { FAILED_CLAIM_COHORT as C } from "./failed-claim-cohort.ts";
import { separateRecoveryRegister, separateRecoveryRegisterRules, separateRecoveryDirectory, separateRecoveryDirectoryRules, separateRecoveryMembership, separateRecoveryMembershipRules } from "./separate-recovery-cohort-data.ts";

const claim = separateRecoveryRegister.items["claim"]!;
export const failedClaimRegister: PlatformData = { ...separateRecoveryRegister, items: { ...separateRecoveryRegister.items,
  claim: { ...claim, states: { ...claim.states, failed: { final: true } } },
} };

const creation = separateRecoveryRegisterRules["create-repository"];
if (!creation || creation.place !== "outcome") throw Error("Native create-repository outcome rule required");
const previous = creation.rules;
export const failedClaimRegisterRules: Rules = { ...separateRecoveryRegisterRules,
  "create-repository": { ...creation, rules: { ...previous,
    holds: (given, operation) => {
      const item = given.state.item(Number(operation.id.split(":")[0]));
      return item?.type === "claim" && item.state === "pending" && previous.holds?.(given, operation) === true;
    },
    derives: (given, operation, selected) => {
      const derived = previous.derives?.(given, operation, selected) ?? { effects: [], sends: [], opens: [] };
      const input = given.input;
      const item = given.state.item(Number(operation.id.split(":")[0]));
      if (input.type !== "outcome" || input.attempt !== operation.most || input.result === "confirmed"
        || selected !== null || operation.selected !== null || item?.type !== "claim" || item.state !== "pending") return derived;
      return { ...derived, effects: [...derived.effects, { effect: "state", item: item.id, state: "failed" }] };
    },
  } },
};

const establish = separateRecoveryDirectory.acts["establish"]!;
export const failedClaimDirectory: PlatformData = { ...separateRecoveryDirectory, acts: { ...separateRecoveryDirectory.acts,
  establish: { ...establish, sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
    ? { create: { ...send.create, definition: C.membership } } : send) },
} };
export const failedClaimDirectoryRules = separateRecoveryDirectoryRules;
export const failedClaimMembership = separateRecoveryMembership;
export const failedClaimMembershipRules = separateRecoveryMembershipRules;

const readToken = destination4.acts["read-token"]!;
/** The adapter fixes this pin's lifetime; callers supply no lifetime field. */
export const failedClaimDestination: PlatformData = { ...destination4, acts: { ...destination4.acts,
  "read-token": { ...readToken, fields: {} },
} };
export const failedClaimDestinationRules = destinationRules4;

/** Browser wording stays beside the declaration, outside its pinned data. */
import type { Kind } from "@generalbusiness/dap-client";
import type { countingCommitments } from "../commitments.ts";

const shared = {
  "device-mismatch": "This device does not match the counting scope.",
  "not-controller": "This member is not the controller.",
  "promise-pending": "Resolve the live promise first.",
  initialized: "The board is already initialized.",
  participating: "This member already participates.",
  "roster-full": "The participant roster is full.",
  "participant-unavailable": "The participant is unavailable.",
  "not-participant-owner": "This member does not own the participant.",
  "own-deactivation": "Use Deactivate for your own participant.",
  "participant-changed": "The participant state has changed.",
  "participant-promise": "Resolve this participant's live promise first.",
  "board-unavailable": "Initialize the counting board first.",
  "cannot-commit": "This member cannot commit the next number.",
  "promise-unavailable": "The linked promise is unavailable.",
  "not-promise-owner": "This member does not own the promise.",
  "completion-changed": "The retained completion is no longer current.",
  "completion-unavailable": "The retained completion is unavailable.",
  "failure-reason": "Choose a declared failure reason.",
  "cannot-start": "The board cannot start.",
  "not-open": "The board is not open.",
  "cannot-reset": "Pause the board before resetting.",
  "item-unavailable": "The selected item is unavailable.",
  "required-item-unavailable": "A required counting item is unavailable.",
} as const;

/** Reason keys stay local until DX-B1 supplies typed native refusal names. */
export const proposalAnnotations = {
  initialize: shared, participate: shared, activate: shared, deactivate: shared,
  "force-deactivate": shared, "remove-participant": shared, start: shared,
  commit: shared, fulfill: shared, fail: shared, cancel: shared, pause: shared,
  reset: shared,
} satisfies Record<Kind<typeof countingCommitments>, typeof shared>;

export function refuseProposal(kind: Kind<typeof countingCommitments>, reason: keyof typeof shared): never {
  throw new Error(proposalAnnotations[kind][reason]);
}

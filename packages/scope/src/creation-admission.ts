/** Serving policy before a parentless creation addresses a Durable Object.
 * This is not a genesis judgment or a substitute for verified child delivery. */
import type { Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { isSignedIntentShape, scopeIdOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { artifactsRegisterScope } from "./artifacts-wiring.ts";

export interface CreationAdmission {
  DEPLOYMENT?: string;
  ARTIFACTS_CONFIG?: string;
  /** Explicit local/test escape hatch. Unset or any value other than "true" is closed when DEPLOYMENT is set. */
  ALLOW_OPEN_CREATION?: string;
}

/** Only the exact pinned register install is public on a deployed Worker.
 * A child creation does not come through this parentless API: the indexed
 * namespace first verifies its whole creator lineage before child lookup,
 * and the receiver still makes its ordinary full genesis judgment. */
export function admitsParentlessCreation(settings: CreationAdmission, signed: SignedIntent, seed: Seed): boolean {
  if (settings.DEPLOYMENT === undefined || settings.ALLOW_OPEN_CREATION === "true") return true;
  try {
    const register = artifactsRegisterScope(settings.ARTIFACTS_CONFIG);
    return register !== null && seed.kind === "register" && seed.creator === null
      && isSignedIntentShape(signed) && signed.intent.kind === "install" && signed.intent.to === null
      && verifySignedIntent(signed) && scopeIdOf(seed) === register;
  } catch { return false; }
}

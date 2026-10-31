import { readDeployment } from "./deployment-setting.ts";
import type { PlatformCreationSettings } from "./creation-versions.ts";
/** Serving policy before a parentless creation addresses a Durable Object.
 * This is not a genesis judgment or a substitute for verified child delivery. */
import type { Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { isSignedIntentShape, scopeIdOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { COMMONS_COHORT, UNPUBLISHED_COHORT } from "@generalbusiness/dap-platform";
import { readRegisterScope } from "./register-setting.ts";

export interface CreationAdmission extends PlatformCreationSettings {
  DEPLOYMENT?: string;
  REGISTER_SCOPE?: string;
  ARTIFACTS_CONFIG?: string;
  ARTIFACTS?: unknown;
  /** Explicit local/test escape. A deployment still needs a valid Register pin. */
  ALLOW_OPEN_CREATION?: string;
}

/** Only the exact pinned register install is public on a deployed Worker.
 * A child creation does not come through this parentless API: the indexed
 * namespace first verifies its whole creator lineage before child lookup,
 * and the receiver still makes its ordinary full genesis judgment. */
export type ParentlessCreationAdmission = { readonly ok: true }
  | { readonly ok: false; readonly reason: "unauthorized" | "misconfigured" | "host-unavailable" | "unsupported-definition" };

export function parentlessCreationAdmission(settings: CreationAdmission, signed: SignedIntent, seed: Seed): ParentlessCreationAdmission {
  if (settings.DEPLOYMENT !== undefined && readDeployment(settings.DEPLOYMENT) === null) return { ok: false, reason: "unauthorized" };
  try {
    const register = readRegisterScope(settings), deployed = settings.DEPLOYMENT !== undefined;
    if (register.kind === "misconfigured") return { ok: false, reason: "misconfigured" };
    // An explicit local/test escape never opens an unconfigured deployment.
    if (deployed && register.kind === "absent") return { ok: false, reason: "unauthorized" };
    const allowed = !deployed || settings.ALLOW_OPEN_CREATION === "true" || register.kind === "pinned" && seed.kind === "register" && seed.creator === null
      && isSignedIntentShape(signed) && signed.intent.kind === "install" && signed.intent.to === null
      && verifySignedIntent(signed) && scopeIdOf(seed) === register.scope;
    if (!allowed) return { ok: false, reason: "unauthorized" };
    if (deployed && seed.kind === "register" && signed.intent.kind === "install") {
      if (signed.intent.fields["host"] === "none" && seed.definition !== UNPUBLISHED_COHORT.register && seed.definition !== COMMONS_COHORT.register) return { ok: false, reason: "unsupported-definition" };
      if (signed.intent.fields["host"] === "artifacts" && !settings.ARTIFACTS) return { ok: false, reason: "host-unavailable" };
    }
    return { ok: true };
  } catch { return { ok: false, reason: "unauthorized" }; }
}

/** Compatibility projection for callers that need no named ingress reason. */
export function admitsParentlessCreation(settings: CreationAdmission, signed: SignedIntent, seed: Seed): boolean {
  return parentlessCreationAdmission(settings, signed, seed).ok;
}

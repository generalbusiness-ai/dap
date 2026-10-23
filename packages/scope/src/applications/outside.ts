/** Native fetch prepares the private immutable cache, with explicit host-only
 * resumption. The separate admission phase and its recovery are safe reads.
 * Neither phase repeats an application or provider mutation. */
import type { AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isDigest, isRecord, utf8 } from "@generalbusiness/dap-bytes";
import { ApplicationPackageError } from "@generalbusiness/dap-client/application";
import { ApplicationGitError } from "@generalbusiness/dap-git";
import { APPLICATION_INSTALL_RULES } from "@generalbusiness/dap-platform/application-install";
import { DECLARED_APPLICATION_RULES, ARCHIVE_APPLICATION_COHORT as AC, ARCHIVE_DECLARED_APPLICATION_COHORT as AC2, DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import type { EffectAnswer, EffectRequest, Outside } from "../operations.ts";
import { ApplicationAdmissionError, type ApplicationTrust } from "./admission.ts";
import { ApplicationContentError, type ApplicationContentStore } from "./content.ts";
import { ApplicationReleaseError, resolveAndStoreApplication, type OpenApplicationSource } from "./resolve.ts";

type Refusal = "unsupported-object-format" | "untrusted-release" | "unsupported-host" | "unsupported-definition" | "package-invalid" | "package-too-large" | "source-refused" | "content-not-retained";
function reason(error: unknown): Refusal | null {
  if (error instanceof ApplicationReleaseError) return error.reason === "unsupported-object-format" ? error.reason : null;
  if (error instanceof ApplicationAdmissionError) return error.reason === "invalid-trust" ? "unsupported-host" : error.reason;
  if (error instanceof ApplicationPackageError) return error.reason === "limit" ? "package-too-large" : "package-invalid";
  if (error instanceof ApplicationGitError) return error.reason === "unreadable" ? null : error.reason === "too-large" ? "package-too-large" : "source-refused";
  if (error instanceof ApplicationContentError) return error.reason === "unavailable" ? null : error.reason === "too-large" ? "package-too-large" : "package-invalid";
  return null;
}
export const acceptsApplicationOperation: Outside["accepts"] = (owner, kind) => (owner === APPLICATION_INSTALL_RULES || owner === DECLARED_APPLICATION_RULES || owner === DEVICE_APPLICATION_COHORT.rules || owner === AC.rules || owner === AC2.rules || owner === ARCHIVE_DEVICE_APPLICATION_COHORT.rules) && ["fetch-application", "admit-application"].includes(kind);
const prepares: Outside["accepts"] = (owner, kind) => acceptsApplicationOperation(owner, kind) && kind === "fetch-application";
const admits: Outside["accepts"] = (owner, kind) => acceptsApplicationOperation(owner, kind) && kind === "admit-application";
export function applicationOperationRequest(request: EffectRequest): { uri: string; release: Digest } | null {
  const input = request.origin.entry.input;
  if (!acceptsApplicationOperation(request.owner, request.kind) || request.attempt !== 1 || request.operation !== `${request.origin.entry.seq}:0`
    || canonicalize(request.scope) !== canonicalize(request.origin.entry.at)) return null;
  const fields = prepares(request.owner, request.kind) && input.type === "act" && input.signed.intent.kind === "install-application" ? input.signed.intent.fields
    : admits(request.owner, request.kind) && input.type === "outcome" && input.kind === "fetch-application" && input.result === "confirmed" && input.evidence.basis === "read" ? input.evidence.body : null;
  return isRecord(fields) && typeof fields["uri"] === "string" && isDigest(fields["release"]) ? { uri: fields["uri"], release: fields["release"] } : null;
}
export function applicationOutside(options: { trust: readonly ApplicationTrust[]; bounds: Bounds; store: ApplicationContentStore; open: OpenApplicationSource }): Outside {
  const trust = options.trust.map(row => ({ ...row })), bounds = { ...options.bounds };
  const policy = digestBytes(utf8("dap-application-trust-1\n" + canonicalize(trust)));
  const confirmed = (uri: string, packet: AnyPackedApplication): EffectAnswer => ({ result: "confirmed", evidence: { basis: "read", body: {
    uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy,
  } } });
  const refused = (fields: { uri: string; release: Digest }, code: Refusal): EffectAnswer => ({ result: "refused", evidence: { basis: "read", body: { ...fields, reason: code } } });
  const run = async (request: EffectRequest): Promise<EffectAnswer | null> => {
    const fields = applicationOperationRequest(request); if (!fields) return null;
    try {
      if (prepares(request.owner, request.kind)) return confirmed(fields.uri, await resolveAndStoreApplication(fields.uri, fields.release, trust, bounds, options.open, options.store));
      // A confirmed native fetch result opened this admission operation.
      // This phase and its recovery only read the retained immutable content.
      const stored = await options.store.get(fields.release);
      return stored ? confirmed(fields.uri, stored) : refused(fields, "content-not-retained");
    } catch (error) { const code = reason(error); return code ? refused(fields, code) : null; }
  };
  return { accepts: acceptsApplicationOperation, send: run,
    hostPreparation: { accepts: prepares, resume: request => prepares(request.owner, request.kind) ? run(request) : Promise.resolve(null) },
    recovery: { accepts: admits, read: request => admits(request.owner, request.kind) ? run(request) : Promise.resolve(null) },
  };
}

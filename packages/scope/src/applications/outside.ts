/** Trusted host admission for one native install attempt. The normal send may
 * fill the private immutable cache. Recovery only reads Git and existing
 * cache bytes; it never repeats a cache write or application mutation. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { ApplicationPackageError, type PackedApplication } from "@generalbusiness/artroom-client/application";
import { ApplicationGitError } from "@generalbusiness/artroom-git";
import { APPLICATION_INSTALL_RULES } from "@generalbusiness/dap-platform/application-install";
import type { EffectAnswer, EffectRequest, Outside } from "../operations.ts";
import { ApplicationAdmissionError, type ApplicationTrust } from "./admission.ts";
import { ApplicationContentError, type ApplicationContentStore } from "./content.ts";
import { ApplicationReleaseError, resolveAndStoreApplication, resolveTrustedApplication, type OpenApplicationSource } from "./resolve.ts";

type Refusal = "unsupported-object-format" | "untrusted-release" | "unsupported-host" | "unsupported-definition" | "package-invalid" | "package-too-large" | "source-refused";
function reason(error: unknown): Refusal | null {
  if (error instanceof ApplicationReleaseError) return error.reason === "unsupported-object-format" ? error.reason : null;
  if (error instanceof ApplicationAdmissionError) return error.reason === "invalid-trust" ? "unsupported-host" : error.reason;
  if (error instanceof ApplicationPackageError) return error.reason === "limit" ? "package-too-large" : "package-invalid";
  if (error instanceof ApplicationGitError) return error.reason === "unreadable" ? null : error.reason === "too-large" ? "package-too-large" : "source-refused";
  if (error instanceof ApplicationContentError) return error.reason === "unavailable" ? null : error.reason === "too-large" ? "package-too-large" : "package-invalid";
  return null;
}
export function applicationOutside(options: { trust: readonly ApplicationTrust[]; bounds: Bounds; store: ApplicationContentStore; open: OpenApplicationSource }): Outside {
  const trust = options.trust.map(row => ({ ...row })), bounds = { ...options.bounds };
  const policy = digestBytes(utf8("dap-application-trust-1\n" + canonicalize(trust)));
  const accepts: Outside["accepts"] = (owner, kind) => owner === APPLICATION_INSTALL_RULES && kind === "admit-application";
  const requestFields = (request: EffectRequest): { uri: string; release: Digest } | null => {
    const input = request.origin.entry.input;
    if (!accepts(request.owner, request.kind) || request.attempt !== 1 || request.operation !== `${request.origin.entry.seq}:0`
      || canonicalize(request.scope) !== canonicalize(request.origin.entry.at) || input.type !== "act" || input.signed.intent.kind !== "install-application") return null;
    const fields = input.signed.intent.fields;
    return typeof fields["uri"] === "string" && isDigest(fields["release"]) ? { uri: fields["uri"], release: fields["release"] } : null;
  };
  const confirmed = (uri: string, packet: PackedApplication): EffectAnswer => ({ result: "confirmed", evidence: { basis: "read", body: {
    uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy,
  } } });
  const run = async (request: EffectRequest, recover: boolean): Promise<EffectAnswer | null> => {
    const fields = requestFields(request); if (!fields) return null;
    try {
      if (!recover) return confirmed(fields.uri, await resolveAndStoreApplication(fields.uri, fields.release, trust, bounds, options.open, options.store));
      // Cache presence alone is not URI provenance. Recheck the immutable Git
      // path, then read back admitted cache bytes without any put on recovery.
      await resolveTrustedApplication(fields.uri, fields.release, trust, bounds, options.open);
      const stored = await options.store.get(fields.release);
      return stored ? confirmed(fields.uri, stored) : null;
    } catch (error) {
      const refused = reason(error);
      return refused ? { result: "refused", evidence: { basis: "read", body: { ...fields, reason: refused } } } : null;
    }
  };
  return { accepts, send: request => run(request, false), recovery: { accepts, read: request => run(request, true) } };
}

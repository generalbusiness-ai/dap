/** Operator-listed trusted packages on the current runtime. This checks bytes,
 * exact release/publisher trust and native host support; it creates no scope,
 * grant, installation or content-store entry. It is no screen isolation. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict, parseStrictBytes, utf8 } from "@generalbusiness/dap-bytes";
import { ApplicationPackageError, readApplicationPackage } from "@generalbusiness/dap-platform/application";
import { readPublishedApplicationPackage2, type AnyPackedApplication } from "@generalbusiness/dap-platform/application-v2";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { deviceApplicationRequirement, INSTALL_DEFINITION_BYTES, INSTALL_SEMANTIC_BYTES } from "@generalbusiness/dap-platform";
import { admit, RuleEvalError, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";

/** This host's finite packet allowance, below the portable 16 MiB codec
 * ceiling. Current maintained packets fit; it is not an adopted scope quota. */
export const APPLICATION_HOST_PACKAGE_BYTES = 4 * 1024 * 1024;
export { ApplicationAdmissionError, readApplicationTrust, type ApplicationTrust } from "@generalbusiness/dap-client/application";
import { ApplicationAdmissionError, type ApplicationTrust } from "@generalbusiness/dap-client/application";
const admissionFailure = (reason: ApplicationAdmissionError["reason"]): never => { throw new ApplicationAdmissionError(reason); };

export function readTrustedApplication(bytes: Uint8Array, release: Digest, trust: readonly ApplicationTrust[], bounds: Bounds): AnyPackedApplication {
  const allowed = trust.find(row => row.release === release);
  if (!allowed) return admissionFailure("untrusted-release");
  if (!(bytes instanceof Uint8Array) || bytes.length > APPLICATION_HOST_PACKAGE_BYTES) throw new ApplicationPackageError("limit");
  const owned = new Uint8Array(bytes);
  // Packet v selects one strict codec. This is bounded dispatch, never a
  // retry with another release, URI or signature domain after refusal.
  let version: unknown;
  try { const header = parseStrictBytes(owned); version = isRecord(header) ? header["v"] : undefined; }
  catch { throw new ApplicationPackageError("invalid"); }
  let packet: AnyPackedApplication;
  if (version === 1) packet = readApplicationPackage(owned, release, { bytes: APPLICATION_HOST_PACKAGE_BYTES });
  else if (version === 2) packet = readPublishedApplicationPackage2(owned, release, { bytes: APPLICATION_HOST_PACKAGE_BYTES });
  else throw new ApplicationPackageError("invalid");
  if (packet.package.release.manifest.publisher !== allowed.publisher) return admissionFailure("untrusted-release");
  // Only the finite native device-command version is supported beside ordinary
  // packages. Native installation separately binds an existing owner.
  if (packet.package.semantic.host.execution !== "recorded-do" || packet.package.semantic.host.profiles.some(profile => profile !== "restricted@1")
    || packet.package.semantic.capabilities.length > 0 && (packet.package.v !== 2 || !deviceApplicationRequirement(packet.package.semantic))) return admissionFailure("unsupported-host");
  if (utf8(canonicalize(packet.package.semantic)).length > INSTALL_SEMANTIC_BYTES) return admissionFailure("unsupported-definition");
  for (const part of packet.package.semantic.definitions) {
    if (utf8(part.bytes).length > INSTALL_DEFINITION_BYTES) return admissionFailure("unsupported-definition");
    const checked = validateDefinition(parseStrict(part.bytes), bounds, RULE_PROFILES);
    if (!checked.ok || checked.definition.digest !== part.id) return admissionFailure("unsupported-definition");
  }
  if (packet.package.v === 2) for (const view of Object.values(packet.package.presentation.views)) for (const act of view.acts) {
    try { admit(act.when); }
    catch (error) { if (error instanceof RuleEvalError) return admissionFailure("unsupported-host"); throw error; }
  }
  return packet;
}

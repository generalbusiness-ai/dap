/** Operator-listed trusted packages on the current runtime. This checks bytes,
 * exact release/publisher trust and native host support; it creates no scope,
 * grant, installation or content-store entry. It is no screen isolation. */
import type { Bounds, Digest, KeyId } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isKeyId, isRecord, parseStrict, parseStrictBytes, utf8 } from "@generalbusiness/artroom-bytes";
import { ApplicationPackageError, readApplicationPackage } from "@generalbusiness/artroom-bytes/application";
import { readApplicationPackage2, type AnyPackedApplication } from "@generalbusiness/artroom-bytes/application-v2";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { INSTALL_DEFINITION_BYTES, INSTALL_SEMANTIC_BYTES } from "@generalbusiness/dap-platform";
import { admit, RuleEvalError, RULE_PROFILES } from "@generalbusiness/dap-derive/rule";

/** This host's finite packet allowance, below the portable 16 MiB codec
 * ceiling. Current maintained packets fit; it is not an adopted scope quota. */
export const APPLICATION_HOST_PACKAGE_BYTES = 4 * 1024 * 1024;
export interface ApplicationTrust { readonly release: Digest; readonly publisher: KeyId }
export class ApplicationAdmissionError extends Error {
  constructor(readonly reason: "invalid-trust" | "untrusted-release" | "unsupported-host" | "unsupported-definition") { super("application-" + reason); }
}
const fail = (reason: ApplicationAdmissionError["reason"]): never => { throw new ApplicationAdmissionError(reason); };
/** The absent setting admits nothing. An invalid or ambiguous setting refuses
 * as a whole; it never becomes a partial trust list. */
export function readApplicationTrust(setting: string | undefined): readonly ApplicationTrust[] {
  if (setting === undefined) return Object.freeze([]);
  if (setting.length > 64 * 1024 || utf8(setting).length > 64 * 1024) return fail("invalid-trust");
  let value: unknown;
  try { value = parseStrict(setting); } catch { return fail("invalid-trust"); }
  if (!Array.isArray(value) || value.length > 128) return fail("invalid-trust");
  const releases = new Set<string>();
  const rows = value.map(row => {
    if (!isRecord(row) || Object.keys(row).sort().join() !== "publisher,release" || !isDigest(row["release"]) || !isKeyId(row["publisher"]) || releases.has(row["release"])) return fail("invalid-trust");
    releases.add(row["release"]); return Object.freeze({ release: row["release"], publisher: row["publisher"] });
  });
  return Object.freeze(rows);
}

export function readTrustedApplication(bytes: Uint8Array, release: Digest, trust: readonly ApplicationTrust[], bounds: Bounds): AnyPackedApplication {
  const allowed = trust.find(row => row.release === release);
  if (!allowed) return fail("untrusted-release");
  if (!(bytes instanceof Uint8Array) || bytes.length > APPLICATION_HOST_PACKAGE_BYTES) throw new ApplicationPackageError("limit");
  const owned = new Uint8Array(bytes);
  // Packet v selects one strict codec. This is bounded dispatch, never a
  // retry with another release, URI or signature domain after refusal.
  let version: unknown;
  try { const header = parseStrictBytes(owned); version = isRecord(header) ? header["v"] : undefined; }
  catch { throw new ApplicationPackageError("invalid"); }
  let packet: AnyPackedApplication;
  if (version === 1) packet = readApplicationPackage(owned, release, { bytes: APPLICATION_HOST_PACKAGE_BYTES });
  else if (version === 2) packet = readApplicationPackage2(owned, release, { bytes: APPLICATION_HOST_PACKAGE_BYTES });
  else throw new ApplicationPackageError("invalid");
  if (packet.package.release.manifest.publisher !== allowed.publisher) return fail("untrusted-release");
  // M1 adds trusted ordinary definitions, not arbitrary capability code or M2's
  // capability-bound enforcement. Native sends to the room destination remain
  // the existing runtime's factory/delivery work, not a new declared capability.
  if (packet.package.semantic.host.execution !== "recorded-do" || packet.package.semantic.host.profiles.some(profile => profile !== "restricted@1") || packet.package.semantic.capabilities.length > 0) return fail("unsupported-host");
  if (utf8(canonicalize(packet.package.semantic)).length > INSTALL_SEMANTIC_BYTES) return fail("unsupported-definition");
  for (const part of packet.package.semantic.definitions) {
    if (utf8(part.bytes).length > INSTALL_DEFINITION_BYTES) return fail("unsupported-definition");
    const checked = validateDefinition(parseStrict(part.bytes), bounds, RULE_PROFILES);
    if (!checked.ok || checked.definition.digest !== part.id) return fail("unsupported-definition");
  }
  if (packet.package.v === 2) for (const view of Object.values(packet.package.presentation.views)) for (const act of view.acts) {
    try { admit(act.when); }
    catch (error) { if (error instanceof RuleEvalError) return fail("unsupported-host"); throw error; }
  }
  return packet;
}

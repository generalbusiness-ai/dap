/** Operator-listed trusted packages on the current runtime. This checks bytes,
 * exact release/publisher trust and native host support; it creates no scope,
 * grant, installation or content-store entry. It is no screen isolation. */
import type { Bounds, Digest, KeyId } from "@generalbusiness/dap-contract";
import { isDigest, isKeyId, isRecord, parseStrict, utf8 } from "@generalbusiness/artroom-bytes";
import { readApplicationPackage, type PackedApplication } from "@generalbusiness/artroom-client";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";

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

export function readTrustedApplication(bytes: Uint8Array, release: Digest, trust: readonly ApplicationTrust[], bounds: Bounds): PackedApplication {
  const allowed = trust.find(row => row.release === release);
  if (!allowed) return fail("untrusted-release");
  const packet = readApplicationPackage(bytes, release, { bytes: APPLICATION_HOST_PACKAGE_BYTES });
  if (packet.package.release.manifest.publisher !== allowed.publisher) return fail("untrusted-release");
  // M1 adds trusted ordinary definitions, not arbitrary capability code or M2's
  // capability-bound enforcement. Native sends to the room destination remain
  // the existing runtime's factory/delivery work, not a new declared capability.
  if (packet.package.semantic.host.execution !== "recorded-do" || packet.package.semantic.host.profiles.some(profile => profile !== "restricted@1") || packet.package.semantic.capabilities.length > 0) return fail("unsupported-host");
  for (const part of packet.package.semantic.definitions) {
    const checked = validateDefinition(parseStrict(part.bytes), bounds, RULE_PROFILES);
    if (!checked.ok || checked.definition.digest !== part.id) return fail("unsupported-definition");
  }
  return packet;
}

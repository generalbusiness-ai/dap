/** One operator trust schema for native application hosting and MCP installs.
 * Host uses the immutable release URI's canonical HTTPS hostname grammar. */
import type { Digest, KeyId } from "@generalbusiness/dap-contract";
import { isDigest, isKeyId, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { readApplicationReleaseUri, type ApplicationReleaseUri } from "./application-uri.ts";

function canonicalHost(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 253 || /[/?#]/.test(value)) return false;
  try { readApplicationReleaseUri(`git+https://${value}/trust.git/@${"0".repeat(40)}/application.dap.json`); return true; }
  catch { return false; }
}
export interface ApplicationTrust { readonly release: Digest; readonly publisher: KeyId; readonly host: string }
export class ApplicationAdmissionError extends Error {
  constructor(readonly reason: "invalid-trust" | "untrusted-release" | "unsupported-host" | "unsupported-definition") { super("application-" + reason); }
}
const admissionFailure = (reason: ApplicationAdmissionError["reason"]): never => { throw new ApplicationAdmissionError(reason); };
/** The absent setting admits nothing. An invalid or ambiguous setting refuses
 * as a whole; it never becomes a partial trust list. */
export function readApplicationTrust(setting: string | undefined): readonly ApplicationTrust[] {
  if (setting === undefined) return Object.freeze([]);
  if (setting.length > 64 * 1024 || utf8(setting).length > 64 * 1024) return admissionFailure("invalid-trust");
  let value: unknown;
  try { value = parseStrict(setting); } catch { return admissionFailure("invalid-trust"); }
  if (!Array.isArray(value) || value.length > 128) return admissionFailure("invalid-trust");
  const releases = new Set<string>();
  const rows = value.map(row => {
    if (!isRecord(row) || Object.keys(row).sort().join() !== "host,publisher,release" || !isDigest(row["release"]) || !isKeyId(row["publisher"]) || !canonicalHost(row["host"]) || releases.has(row["release"])) return admissionFailure("invalid-trust");
    releases.add(row["release"]); return Object.freeze({ release: row["release"], publisher: row["publisher"], host: row["host"] as string });
  });
  return Object.freeze(rows);
}

/** A release row cannot authorize another host, URI scheme or alias. The
 * address has already passed the shared immutable URI parser. */
export function applicationTrustForSource(address: ApplicationReleaseUri, release: Digest, trust: readonly ApplicationTrust[]): ApplicationTrust | undefined {
  return trust.find(row => row.release === release && address.remote.startsWith(`https://${row.host}/`));
}

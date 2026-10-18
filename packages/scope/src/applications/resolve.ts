/** Host orchestration only: exact Git address and blob, signed release and
 * native admission, then immutable private storage. No native installation
 * or HTTP route is created here. A cached release never proves another URI. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { readApplicationReleaseUri, type ApplicationReleaseUri, type PackedApplication } from "@generalbusiness/artroom-client";
import { readApplicationGitBlob, type ApplicationGitSource } from "@generalbusiness/artroom-git";
import { ApplicationAdmissionError, readTrustedApplication, type ApplicationTrust } from "./admission.ts";
import type { ApplicationContentStore } from "./content.ts";

export interface OpenedApplicationSource { source: ApplicationGitSource; close(): Promise<void> }
export type OpenApplicationSource = (address: ApplicationReleaseUri) => Promise<OpenedApplicationSource>;
export class ApplicationReleaseError extends Error {
  constructor() { super("application-release-unavailable"); }
}
export async function resolveTrustedApplication(uri: unknown, release: Digest, trust: readonly ApplicationTrust[], bounds: Bounds,
  open: OpenApplicationSource): Promise<PackedApplication> {
  const address = readApplicationReleaseUri(uri);
  // No unlisted release can initiate even the remote transport. Publisher and
  // signature still need to match after the exact file has been obtained.
  const ownedTrust = trust.map(row => ({ ...row })), ownedBounds = { ...bounds };
  if (!ownedTrust.some(row => row.release === release)) throw new ApplicationAdmissionError("untrusted-release");
  let opened: OpenedApplicationSource;
  try { opened = await open(address); } catch { throw new ApplicationReleaseError(); }
  try {
    const bytes = await readApplicationGitBlob(address, opened.source);
    return readTrustedApplication(bytes, release, ownedTrust, ownedBounds);
  } finally {
    try { await opened.close(); } catch { throw new ApplicationReleaseError(); }
  }
}
export async function resolveAndStoreApplication(uri: unknown, release: Digest, trust: readonly ApplicationTrust[], bounds: Bounds,
  open: OpenApplicationSource, store: ApplicationContentStore): Promise<PackedApplication> {
  const packet = await resolveTrustedApplication(uri, release, trust, bounds, open);
  return store.put(packet.bytes, release);
}

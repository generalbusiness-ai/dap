/** Exact immutable application-file read. This does not fetch ancestry, resolve
 * refs, parse a package or admit a publisher. The supplied transport owns its
 * wire/decompression limits and must honor each object byte allowance. */
import { ascii } from "./ascii.ts";
import { hex } from "@generalbusiness/dap-bytes";
import { sha1 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";

export interface ApplicationGitAddress {
  readonly remote: string;
  readonly commit: string;
  readonly objectFormat: "sha1" | "sha256";
  readonly segments: readonly string[];
}
export interface ApplicationGitObject { readonly type: string; readonly size: number; readonly data: Uint8Array | null }
export interface ApplicationGitSource {
  /** Null means known absence; unavailable reads reject. Oversized objects must
   * report their size with null data, without reading their payload. */
  object(id: string, most: number): Promise<ApplicationGitObject | null>;
}
export const APPLICATION_GIT_LIMITS = Object.freeze({ commitBytes: 64 * 1024, treeBytes: 1024 * 1024,
  totalTreeBytes: 8 * 1024 * 1024, pathDepth: 64, blobBytes: 16 * 1024 * 1024 });
export class ApplicationGitError extends Error {
  constructor(readonly reason: "invalid-address" | "absent" | "unreadable" | "too-large" | "wrong-type" | "hash-mismatch" | "not-regular") { super("application-git-" + reason); }
}
const blobFailure = (reason: ApplicationGitError["reason"]): never => { throw new ApplicationGitError(reason); };
const utf8 = new TextEncoder();
const sameObjectBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, index) => byte === b[index]);

/** Read only the commit, path trees and final regular blob, verifying every Git
 * object hash with the format selected by the immutable commit id. */
export async function readApplicationGitBlob(address: ApplicationGitAddress, source: ApplicationGitSource,
  blobBytes = APPLICATION_GIT_LIMITS.blobBytes): Promise<Uint8Array> {
  const width = address.objectFormat === "sha1" ? 20 : address.objectFormat === "sha256" ? 32 : blobFailure("invalid-address");
  const idPattern = new RegExp(`^[0-9a-f]{${width * 2}}$`);
  const parts = [...address.segments];
  if (!idPattern.test(address.commit) || !parts.length || parts.length > APPLICATION_GIT_LIMITS.pathDepth || parts.some(part => !part || part === "." || part === ".." || /[\u0000-\u001f\u007f/\\]/.test(part))) return blobFailure("invalid-address");
  if (!Number.isSafeInteger(blobBytes) || blobBytes < 1 || blobBytes > APPLICATION_GIT_LIMITS.blobBytes) return blobFailure("too-large");
  async function object(id: string, type: "commit" | "tree" | "blob", most: number): Promise<Uint8Array> {
    let got: ApplicationGitObject | null;
    try { got = await source.object(id, most); } catch { return blobFailure("unreadable"); }
    if (got === null) return blobFailure("absent");
    if (got.type !== type) return blobFailure("wrong-type");
    if (!Number.isSafeInteger(got.size) || got.size < 0 || got.size > most) return blobFailure("too-large");
    if (!(got.data instanceof Uint8Array) || got.data.length !== got.size) return blobFailure("unreadable");
    const data = new Uint8Array(got.data), header = utf8.encode(`${type} ${data.length}\0`), framed = new Uint8Array(header.length + data.length);
    framed.set(header); framed.set(data, header.length);
    if (hex((width === 20 ? sha1 : sha256)(framed)) !== id) return blobFailure("hash-mismatch");
    return data;
  }
  const commit = await object(address.commit, "commit", APPLICATION_GIT_LIMITS.commitBytes);
  const firstLine = commit.indexOf(10), boundary = commit.findIndex((byte, index) => byte === 10 && commit[index + 1] === 10);
  if (firstLine !== 5 + width * 2 || boundary < firstLine) return blobFailure("unreadable");
  const line = ascii(commit.subarray(0, firstLine));
  if (!line.startsWith("tree ") || !idPattern.test(line.slice(5))) return blobFailure("unreadable");
  let tree = line.slice(5), used = 0;
  for (let depth = 0; depth < parts.length; depth++) {
    const bytes = await object(tree, "tree", Math.min(APPLICATION_GIT_LIMITS.treeBytes, APPLICATION_GIT_LIMITS.totalTreeBytes - used));
    used += bytes.length;
    const wanted = utf8.encode(parts[depth]!);
    let selected: { mode: string; id: string } | undefined, at = 0;
    while (at < bytes.length) {
      const space = bytes.indexOf(32, at), nul = bytes.indexOf(0, space + 1);
      if (space <= at || space - at > 6 || nul <= space + 1 || nul + 1 + width > bytes.length) return blobFailure("unreadable");
      const mode = ascii(bytes.subarray(at, space)), name = bytes.subarray(space + 1, nul);
      if (!["40000", "100644", "100755", "120000", "160000"].includes(mode) || name.includes(47)) return blobFailure("unreadable");
      if (sameObjectBytes(name, wanted)) {
        if (selected) return blobFailure("unreadable");
        selected = { mode, id: hex(bytes.subarray(nul + 1, nul + 1 + width)) };
      }
      at = nul + 1 + width;
    }
    if (!selected) return blobFailure("absent");
    const leaf = depth === parts.length - 1;
    if (!leaf && selected.mode !== "40000" || leaf && selected.mode !== "100644" && selected.mode !== "100755") return blobFailure("not-regular");
    if (leaf) return object(selected.id, "blob", blobBytes);
    tree = selected.id;
  }
  return blobFailure("absent");
}

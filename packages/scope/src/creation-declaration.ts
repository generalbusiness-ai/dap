/** Bounded immutable declaration custody for serving lineage, not authority.
 * The caller separately authenticates the Directory's birth and exact send. */
import { canonicalize, definitionDigest, isDigest, isScopeRef, parseStrict, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { same } from "@generalbusiness/dap-derive";
import { APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, platform } from "@generalbusiness/dap-platform";
import type { Pinned } from "./core.ts";
import type { Store } from "./store.ts";
import { PROOF_BYTE_BOUNDS } from "./proof-bytes.ts";

export function creationDeclaration(store: Store, pinned: Pinned | null, at: unknown, digest: unknown, maxBytes: number, active: () => boolean): string | null {
  if (!active() || !isScopeRef(at) || at.kind !== "directory" || !isDigest(digest) || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > PROOF_BYTE_BOUNDS.body) return null;
  const scope = store.scope();
  if (!active() || !scope || scope.status !== "active" || !same(scope.at, at) || !pinned?.platform
    || ![APPLICATION_COHORT.directory, ARCHIVE_DEVICE_APPLICATION_COHORT.directory].some(named => named === pinned.named)) return null;
  const directSize = store.retainedSize("definition", digest);
  let raw: string;
  if (directSize !== null) {
    if (!active() || directSize > maxBytes) return null;
    const kept = store.retained("definition", digest);
    if (!active() || !kept || utf8(kept.bytes).length !== directSize) return null;
    raw = kept.bytes;
  } else {
    // This existing bounded native locator examines at most16catalog rows
    // of at most17 declaration descriptors each. It grants no new identity.
    const text = platform(pinned.named)?.declaredText?.(store, digest);
    if (!active() || !text) return null;
    const size = store.retainedSize("text", text);
    // JSON's string representation can expand each original code unit six
    // times. Bound the stored representation BEFORE materializing it too.
    if (!active() || size === null || size > maxBytes * 6 + 2) return null;
    const kept = store.retained("text", text);
    if (!active() || !kept || utf8(kept.bytes).length !== size) return null;
    const decoded: unknown = parseStrict(kept.bytes);
    if (typeof decoded !== "string" || decoded.length > maxBytes || utf8(decoded).length > maxBytes || textDigest(decoded) !== text) return null;
    raw = decoded;
  }
  if (!active() || raw.length > maxBytes || utf8(raw).length > maxBytes) return null;
  const value = parseStrict(raw);
  return active() && canonicalize(value) === raw && definitionDigest(value as never) === digest ? raw : null;
}

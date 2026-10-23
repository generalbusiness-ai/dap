/** Private immutable release bytes. This has no HTTP route, listing, delete or
 * arbitrary object key. It creates no native installation or authority. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { isDigest } from "@generalbusiness/dap-bytes";
import type { AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import { APPLICATION_HOST_PACKAGE_BYTES, ApplicationAdmissionError, readTrustedApplication, type ApplicationTrust } from "./admission.ts";

export class ApplicationContentError extends Error {
  constructor(readonly reason: "invalid-id" | "too-large" | "corrupt" | "unavailable") { super("application-content-" + reason); }
}
const contentFailure = (reason: ApplicationContentError["reason"]): never => { throw new ApplicationContentError(reason); };
export function applicationReleaseKey(release: Digest): string {
  return isDigest(release) ? "applications/releases/" + release.slice("sha256:".length) : contentFailure("invalid-id");
}

export class ApplicationContentStore {
  readonly #bucket: Pick<R2Bucket, "get" | "put">;
  readonly #trust: readonly ApplicationTrust[];
  readonly #bounds: Bounds;
  constructor(bucket: Pick<R2Bucket, "get" | "put">, trust: readonly ApplicationTrust[], bounds: Bounds) {
    this.#bucket = bucket; this.#trust = trust.map(row => ({ ...row })); this.#bounds = { ...bounds };
  }
  async get(release: Digest): Promise<AnyPackedApplication | null> {
    const key = applicationReleaseKey(release);
    if (!this.#trust.some(row => row.release === release)) throw new ApplicationAdmissionError("untrusted-release");
    let object: R2ObjectBody | null;
    try { object = await this.#bucket.get(key); } catch { return contentFailure("unavailable"); }
    if (object === null) return null;
    const most = APPLICATION_HOST_PACKAGE_BYTES;
    if (!Number.isSafeInteger(object.size) || object.size < 0 || object.size > most) { await object.body.cancel().catch(() => undefined); return contentFailure("too-large"); }
    const reader = object.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > most || size > object.size) { await reader.cancel(); return contentFailure("too-large"); }
        chunks.push(new Uint8Array(next.value));
      }
    } catch (error) { if (error instanceof ApplicationContentError) throw error; await reader.cancel().catch(() => undefined); return contentFailure("unavailable"); }
    finally { reader.releaseLock(); }
    if (size !== object.size) return contentFailure("corrupt");
    const bytes = new Uint8Array(size); let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    return readTrustedApplication(bytes, release, this.#trust, this.#bounds);
  }
  async put(bytes: Uint8Array, release: Digest): Promise<AnyPackedApplication> {
    // The codec owns bytes before any await. Trust, signatures and native
    // support precede a write, including the first conditional write.
    const packet = readTrustedApplication(bytes, release, this.#trust, this.#bounds), key = applicationReleaseKey(release);
    const current = await this.get(release); if (current) return current;
    try {
      await this.#bucket.put(key, packet.bytes, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" } });
    } catch { return contentFailure("unavailable"); }
    // Conditional conflict and a successful first write both need exact
    // checked readback. A lost reply remains unknown to the operation caller;
    // its later retry can use get without replacing this immutable object.
    const stored = await this.get(release);
    return stored ?? contentFailure("unavailable");
  }
}

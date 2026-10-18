/** Bounded public HTTPS transport for an immutable application tree walk.
 * No credentials, object-format fallback, subprocess or ancestry fetch. */
import { APPLICATION_GIT_LIMITS, ApplicationGitError, type ApplicationGitAddress } from "./application-blob.ts";
import { objectId } from "./names.ts";
import { READ_BOUNDS } from "./reader.ts";
import { SmartHttpSource } from "./http-read.ts";

export const APPLICATION_HTTP_PAYLOAD_BYTES = 80 * 1024 * 1024;
export const APPLICATION_HTTP_DEADLINE_MS = 10_000;
export class ApplicationHttpError extends Error {
  constructor(readonly reason: "unsupported-object-format" | "unavailable") { super("application-http-" + reason); }
}
/** A fresh transport cache per exact object. The conservative payload bound
 * excludes engine metadata and is not a measured heap allowance. */
export function applicationGitHttpSource(address: ApplicationGitAddress, options: {
  blobBytes: number;
  send?: (request: Request) => Promise<Response>;
}) {
  const { blobBytes, send } = options, remote = address.remote;
  if (address.objectFormat !== "sha1") throw new ApplicationHttpError("unsupported-object-format");
  if (!Number.isSafeInteger(blobBytes) || blobBytes < 1 || blobBytes > 4 * 1024 * 1024) throw new ApplicationGitError("too-large");
  const deadline = Date.now() + APPLICATION_HTTP_DEADLINE_MS; let closed = false;
  return {
    source: { object: async (id: string, most: number) => {
      const remaining = deadline - Date.now();
      if (closed || remaining <= 0 || !Number.isSafeInteger(most) || most < 0 || most > Math.max(blobBytes, APPLICATION_GIT_LIMITS.treeBytes)) throw new ApplicationHttpError("unavailable");
      const source = new SmartHttpSource({ remote, maxBytes: Math.max(32, most + 64 * 1024), timeoutMs: remaining,
        bounds: { ...READ_BOUNDS, commitBytes: APPLICATION_GIT_LIMITS.commitBytes, treeBytes: APPLICATION_GIT_LIMITS.treeBytes,
          blobBytes: blobBytes, closureObjects: 1, refs: 1024 },
        isolateObjects: { ownedBytes: APPLICATION_HTTP_PAYLOAD_BYTES }, ...(send ? { fetch: send } : {}) });
      const result = await source.object(objectId(id, "application object"), most);
      if (closed || Date.now() >= deadline) throw new ApplicationHttpError("unavailable");
      return result;
    } },
    close: async () => { closed = true; },
  };
}

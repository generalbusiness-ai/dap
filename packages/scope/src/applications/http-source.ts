/** The M1 host's public HTTPS Git transport. No credentials, subprocess, full
 * closure fetch or object-format fallback. Each exact object uses a fresh
 * isolated source so earlier objects do not build a second transport cache. */
import { APPLICATION_GIT_LIMITS, objectId, READ_BOUNDS } from "@generalbusiness/artroom-git";
import { SmartHttpSource } from "@generalbusiness/artroom-git/http-read";
import { APPLICATION_HOST_PACKAGE_BYTES } from "./admission.ts";
import { ApplicationReleaseError, type OpenApplicationSource } from "./resolve.ts";

const WIRE_OVERHEAD = 64 * 1024;
/** Existing transport's conservative payload accounting, not measured heap. */
export const APPLICATION_HTTP_PAYLOAD_BYTES = 80 * 1024 * 1024;
export const APPLICATION_HTTP_DEADLINE_MS = 10_000;

export function applicationHttpSource(send: (request: Request) => Promise<Response> = request => fetch(request)): OpenApplicationSource {
  return async address => {
    if (address.objectFormat !== "sha1") throw new ApplicationReleaseError("unsupported-object-format");
    const deadline = Date.now() + APPLICATION_HTTP_DEADLINE_MS; let closed = false;
    return {
      source: { object: async (id, most) => {
        const remaining = deadline - Date.now();
        if (closed || remaining <= 0 || !Number.isSafeInteger(most) || most < 0 || most > APPLICATION_HOST_PACKAGE_BYTES) throw new ApplicationReleaseError();
        const source = new SmartHttpSource({ remote: address.remote, maxBytes: Math.max(32, most + WIRE_OVERHEAD), timeoutMs: remaining,
          bounds: { ...READ_BOUNDS, commitBytes: APPLICATION_GIT_LIMITS.commitBytes, treeBytes: APPLICATION_GIT_LIMITS.treeBytes,
            blobBytes: APPLICATION_HOST_PACKAGE_BYTES, closureObjects: 1, refs: 1024 },
          isolateObjects: { ownedBytes: APPLICATION_HTTP_PAYLOAD_BYTES }, fetch: send });
        const result = await source.object(objectId(id, "application object"), most);
        if (closed || Date.now() >= deadline) throw new ApplicationReleaseError();
        return result;
      } },
      close: async () => { closed = true; },
    };
  };
}

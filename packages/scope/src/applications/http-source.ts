/** M1's host uses the shared bounded public HTTPS Git transport. */
import { applicationGitHttpSource } from "@generalbusiness/dap-git";
import { APPLICATION_HOST_PACKAGE_BYTES } from "./admission.ts";
import { ApplicationReleaseError, type OpenApplicationSource } from "./resolve.ts";
export { APPLICATION_HTTP_PAYLOAD_BYTES, APPLICATION_HTTP_DEADLINE_MS } from "@generalbusiness/dap-git";

export function applicationHttpSource(send: (request: Request) => Promise<Response> = request => fetch(request)): OpenApplicationSource {
  return async address => {
    if (address.objectFormat !== "sha1") throw new ApplicationReleaseError("unsupported-object-format");
    return applicationGitHttpSource(address, { blobBytes: APPLICATION_HOST_PACKAGE_BYTES, send });
  };
}

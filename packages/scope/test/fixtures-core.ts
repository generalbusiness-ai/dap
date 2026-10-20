/** Portable builders for explicit application-test inputs. No Worker globals,
 * implicit trust, shared ownership or default cohort is introduced here. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { secretSigner } from "@generalbusiness/artroom-client";

/** Each call retains the caller's exact public TEST seed. */
export const fixedSigner = (fill: number) => secretSigner(new Uint8Array(32).fill(fill));

/** One explicitly trusted release/publisher pair, in the original wire order. */
export const applicationTrust = (packet: { ids: { release: string } }, publisher: KeyId): string =>
  JSON.stringify([{ release: packet.ids.release, publisher }]);

/** Content-host ports also admit deliberately empty or invalid trust strings. */
export const applicationContentBindings = <Content>(content: Content, trust: string) =>
  ({ APPLICATION_CONTENT: content, APPLICATION_TRUST: trust });

/** A fresh environment per call; callers retain namespace/bucket identities. */
export const applicationWorkerBindings = <Scopes, Content>(scopes: Scopes, content: Content, trust: string) =>
  ({ SCOPES: scopes, ...applicationContentBindings(content, trust) });

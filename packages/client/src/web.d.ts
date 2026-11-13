/**
 * The WebCrypto this package uses. It exists in workerd, Node and browsers.
 * It is declared here, not through a DOM or Workers lib, so the package
 * states exactly what it relies on. `intent.ts` names the three calls it
 * makes on `subtle`. `reads.ts` names each session request with `randomUUID`.
 */

declare const crypto: {
  getRandomValues<T extends Uint8Array>(array: T): T;
  randomUUID(): string;
  subtle: unknown;
};
/** Only the native metadata accessors are used; no key is constructed here. */
declare const CryptoKey: { readonly prototype: object };

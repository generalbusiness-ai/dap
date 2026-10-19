/** Strict UTF-8 wire text, retaining a leading byte order mark. */
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export const decodeGitText = (bytes: Uint8Array): string => decoder.decode(bytes);

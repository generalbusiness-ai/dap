/** Host-specific names stay here. The resource and app protocols use standard MCP Apps fields. */
import { base32, isDigest } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";

export function sandboxDomain(declared: string | undefined, presentation: Digest): string {
  if (!isDigest(presentation)) throw new Error("Presentation digest is malformed.");
  const label = declared ?? base32(Uint8Array.from(presentation.slice(7).match(/../g)!, (pair) => Number.parseInt(pair, 16)));
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) throw new Error("Presentation domain must be one lowercase DNS label.");
  return `${label}.inguz.space`;
}

/** Host-specific names stay here. The resource and app protocols use standard MCP Apps fields. */

/**
 * The origin a deployment declares for a host that accepts it. Each host sets the format of `_meta.ui.domain` and may refuse
 * a value it does not recognize, so a resource declares none by default and takes the host's default sandbox origin.
 */
export function sandboxDomain(declared: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(declared)) throw new Error("Presentation domain must be one lowercase DNS label.");
  return `${declared}.inguz.space`;
}

/** Deployment policy for hosted MCP only. Local services omit this policy. */
export interface HostedMcpSettings { MCP_ENABLED?: string; MCP_TOOL_ADDITIONS?: string }
export const GENERIC_TOOL_NAMES = ["room", "commons", "inspect", "create", "join", "install_application", "application_installation", "prepare", "items", "steps", "step", "record", "sends", "text", "wait", "settle", "credential", "actions", "act"] as const;
export const HOSTED_TOOL_OMISSIONS: readonly string[] = ["create", "install_application", "credential", "prepare", "join", "record", "step", "text"];

/** Malformed settings close the endpoint; there is no runtime fallback. */
export function hostedMcpTools(settings: HostedMcpSettings): readonly string[] | null {
  if (settings.MCP_ENABLED !== "true") return null;
  let additions: unknown = [];
  if (settings.MCP_TOOL_ADDITIONS !== undefined) {
    if (typeof settings.MCP_TOOL_ADDITIONS !== "string" || settings.MCP_TOOL_ADDITIONS.length > 1024) return null;
    try { additions = JSON.parse(settings.MCP_TOOL_ADDITIONS); } catch { return null; }
  }
  if (!Array.isArray(additions) || additions.length > GENERIC_TOOL_NAMES.length || additions.some(name => typeof name !== "string" || !GENERIC_TOOL_NAMES.some(known => known === name)) || new Set(additions).size !== additions.length) return null;
  return Object.freeze(GENERIC_TOOL_NAMES.filter(name => !HOSTED_TOOL_OMISSIONS.includes(name) || additions.includes(name)));
}

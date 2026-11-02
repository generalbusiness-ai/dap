/** Exact connector identities for OAuth discovery and token audiences. */
import { parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { remoteCardOrigins } from "./views/remote-origins.ts";

export interface ResourceSettings { MCP_RESOURCE_URLS?: string; MCP_CARD_ORIGINS?: string }
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

/** Accept only the operator's complete, canonical HTTPS connector URL. */
export function isMcpResource(value: unknown): value is string {
  if (typeof value !== "string" || utf8(value).length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/mcp" && !url.username && !url.password
      && !value.includes("#") && url.href === value;
  } catch { return false; }
}

/** Undefined selects the service default. Null refuses the whole setting. */
export function configuredMcpResources(setting: string | undefined): readonly string[] | undefined | null {
  if (setting === undefined) return undefined;
  if (typeof setting !== "string" || utf8(setting).length > 32_800) return null;
  try {
    const rows: unknown = parseStrict(setting);
    if (!Array.isArray(rows) || rows.length > 8 || rows.some(row => !isMcpResource(row)) || new Set(rows).size !== rows.length) return null;
    return Object.freeze([...rows] as string[]);
  } catch { return null; }
}

/** Card presentation and OAuth must select the same complete connector URL. */
export function hostedMcpResources(settings: ResourceSettings, service: string): readonly string[] | null {
  const configured = configuredMcpResources(settings.MCP_RESOURCE_URLS);
  const origins = remoteCardOrigins(settings.MCP_CARD_ORIGINS);
  if (configured === null || origins === null) return null;
  const resources = configured ?? [service + "/mcp"];
  if (resources.some(resource => !isMcpResource(resource)) || origins.some(origin => !resources.includes(origin.url))) return null;
  return Object.freeze([...resources]);
}

/** Inserting the well-known path retains even an explicit empty query. */
export function resourceMetadataUrl(resource: string): string {
  if (!isMcpResource(resource)) throw new Error("Invalid MCP resource URL.");
  const url = new URL(resource);
  return url.origin + "/.well-known/oauth-protected-resource" + resource.slice(url.origin.length);
}

export function resourceChallenge(resource: string, invalidToken = false): string {
  const metadata = resourceMetadataUrl(resource).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `Bearer resource_metadata="${metadata}", scope="mcp"${invalidToken ? ', error="invalid_token"' : ""}`;
}

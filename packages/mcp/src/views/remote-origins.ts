/** Remote presentation policy, selected by an exact operator-configured
 * connector URL. Neither a client name nor a request field selects authority. */
import { digestBytes, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";

export interface RemoteCardOrigin { readonly host: "claude" | "chatgpt"; readonly url: string; readonly domain: string }

/** Claude hashes the complete configured URL, including its query and any
 * trailing slash. Its wire value is a hostname, without a scheme. */
export function claudeCardDomain(url: string): string {
  return digestBytes(utf8(url)).slice("sha256:".length, "sha256:".length + 32) + ".claudemcpcontent.com";
}

/** Closed, bounded deployment setting. An absent setting declares no origin;
 * an invalid setting admits no partial mapping. */
export function remoteCardOrigins(setting: string | undefined): readonly RemoteCardOrigin[] | null {
  if (setting === undefined) return [];
  if (typeof setting !== "string" || utf8(setting).length > 8192) return null;
  try {
    const rows: unknown = parseStrict(setting);
    if (!Array.isArray(rows) || rows.length > 2) return null;
    const urls = new Set<string>(), hosts = new Set<string>();
    const result: RemoteCardOrigin[] = [];
    for (const row of rows) {
      if (!isRecord(row) || Object.keys(row).sort().join() !== "domain,host,url"
        || (row["host"] !== "claude" && row["host"] !== "chatgpt")
        || typeof row["url"] !== "string" || utf8(row["url"]).length > 2048
        || typeof row["domain"] !== "string" || row["domain"].length > 253) return null;
      const url = new URL(row["url"]);
      if (url.protocol !== "https:" || url.username || url.password || url.hash
        || url.href !== row["url"] || url.pathname !== "/mcp"
        || urls.has(row["url"]) || hosts.has(row["host"])) return null;
      if (row["host"] === "claude") {
        if (row["domain"] !== claudeCardDomain(row["url"])) return null;
      } else {
        const origin = new URL(row["domain"]);
        if (origin.protocol !== "https:" || origin.origin !== row["domain"]
          || origin.username || origin.password) return null;
      }
      urls.add(row["url"]); hosts.add(row["host"]);
      result.push({ host: row["host"], url: row["url"], domain: row["domain"] });
    }
    return Object.freeze(result.map(row => Object.freeze(row)));
  } catch { return null; }
}

export function remoteCardDomain(origins: readonly RemoteCardOrigin[], url: string): string | undefined {
  return origins.find(row => row.url === url)?.domain;
}

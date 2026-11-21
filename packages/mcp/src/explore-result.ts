import { replyBytes } from "./paging.ts";

/**
 * Project only the rows the client says changed. A missing list or row cannot
 * establish a complete delta. The caller also measures the complete MCP
 * envelope before returning success.
 */
export function exploreData(result: Record<string, unknown>, limit: number): Record<string, unknown> | null {
  if (result["is"] !== "admitted") return replyBytes(result) <= limit ? result : null;
  const changed = result["changed"], after = result["after"];
  if (!Array.isArray(changed) || !after || typeof after !== "object" || !("row" in after) || typeof after.row !== "function") return null;
  const { after: _after, changed: _changed, ...data } = result;
  const rows: unknown[] = [];
  let remaining = limit - replyBytes(data) - 16;
  if (remaining < 0 || changed.length > limit) return null;
  for (const name of changed) {
    const row: unknown = after.row(name);
    if (row === null || row === undefined) return null;
    remaining -= replyBytes(row) + 1;
    if (remaining < 0) return null;
    rows.push(row);
  }
  return { ...data, rows };
}

/** Limit accepted log input before a replica folds a page. */
export class ExplorationLogBudget {
  #pages = 0;
  #bytes = 0;

  accept(entries: readonly { bytes: string }[]): boolean {
    this.#pages++;
    for (const entry of entries) this.#bytes += new TextEncoder().encode(entry.bytes).byteLength;
    return this.#pages <= 16 && this.#bytes <= 4 * 1024 * 1024;
  }
}

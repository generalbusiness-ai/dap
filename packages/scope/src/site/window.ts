/** One fixed serving object's public-site address window. Memory only;
 * no native authority, target identity, provider work or SQLite state. */
import { addressKey } from "@generalbusiness/dap-bytes";
export const SITE_READS_PER_WINDOW = 240;
export const SITE_READ_WINDOW_MS = 60_000;
export const SITE_READ_WINDOW_KEYS = 4096;
export const SITE_READ_ADDRESS_BYTES = 64;
interface Window { readonly since: number; reads: number }
/** Bound before RPC serialization and again inside its fixed owner. */
export function siteReadAddressKey(address: unknown): string | null {
  if (address === null) return "missing";
  if (typeof address !== "string" || address.length === 0 || address.length > SITE_READ_ADDRESS_BYTES
    || new TextEncoder().encode(address).length > SITE_READ_ADDRESS_BYTES) return null;
  const key = addressKey(address);
  // Retain bounded synthetic transport labels used by local callers. They
  // cannot alias a canonical IP key and share the same finite table cap.
  return key === null ? `opaque:${address}` : `address:${key}`;
}

export class SiteReadWindow {
  readonly #windows = new Map<string, Window>();
  #overflow: Window | undefined;
  #now = 0;
  get size(): number { return this.#windows.size + Number(this.#overflow !== undefined); }

  admit(address: string | null, now: number): boolean {
    const key = siteReadAddressKey(address);
    if (key === null || !Number.isFinite(now) || now < 0) return false;
    // Fixed start times and monotonic local time preserve insertion order.
    // Reclaim only the expired leading prefix, at most 4096 entries; never
    // evict a live address to admit another one.
    this.#now = Math.max(this.#now, now);
    for (const [key, window] of this.#windows) {
      if (this.#now - window.since < SITE_READ_WINDOW_MS) break;
      this.#windows.delete(key);
    }
    if (this.#overflow && this.#now - this.#overflow.since >= SITE_READ_WINDOW_MS) this.#overflow = undefined;
    let window = this.#windows.get(key);
    if (!window) {
      if (this.#windows.size >= SITE_READ_WINDOW_KEYS) {
        window = this.#overflow ??= { since: this.#now, reads: 0 };
      } else {
        window = { since: this.#now, reads: 0 }; this.#windows.set(key, window);
      }
    }
    if (window.reads >= SITE_READS_PER_WINDOW) return false;
    window.reads++;
    return true;
  }
}

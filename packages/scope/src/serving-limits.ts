/** Bounded serving counters, not native authority. The fixed deployment
 * object owns one instance. Restart or actual object eviction loses it.
 * No active window is removed to admit a new identity. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { isKeyId } from "@generalbusiness/dap-bytes";
import { addressKey } from "./limits.ts";

export const SERVING_WINDOW_CAPACITY = 8192;
const MAX_LIMIT = 1_000_000;
export type ServingOperation = "creation" | "signed-read" | "found";
export interface ServingLimitConfig {
  readonly creationKey: number;
  readonly creationAddress: number;
  readonly readKey: number;
  readonly readAddress: number;
  /** A smaller explicit fixture bound may exercise capacity. */
  readonly windows: number;
}
export const DEFAULT_SERVING_LIMITS: ServingLimitConfig = Object.freeze({
  creationKey: 10, creationAddress: 30, readKey: 240, readAddress: 600,
  windows: SERVING_WINDOW_CAPACITY,
});
export interface ServingLimitSettings {
  SERVING_CREATION_KEY_PER_HOUR?: string;
  SERVING_CREATION_ADDRESS_PER_HOUR?: string;
  SERVING_READ_KEY_PER_MINUTE?: string;
  SERVING_READ_ADDRESS_PER_MINUTE?: string;
}

/** Missing overrides use the reviewed defaults. Invalid overrides close
 * serving; they do not silently select an unlimited or default policy. */
export function servingLimitConfig(settings: ServingLimitSettings): ServingLimitConfig | null {
  const value = (text: string | undefined, fallback: number): number | null => {
    if (text === undefined) return fallback;
    if (typeof text !== "string" || !/^[1-9][0-9]{0,6}$/.test(text)) return null;
    const number = Number(text);
    return number <= MAX_LIMIT ? number : null;
  };
  const creationKey = value(settings.SERVING_CREATION_KEY_PER_HOUR, DEFAULT_SERVING_LIMITS.creationKey);
  const creationAddress = value(settings.SERVING_CREATION_ADDRESS_PER_HOUR, DEFAULT_SERVING_LIMITS.creationAddress);
  const readKey = value(settings.SERVING_READ_KEY_PER_MINUTE, DEFAULT_SERVING_LIMITS.readKey);
  const readAddress = value(settings.SERVING_READ_ADDRESS_PER_MINUTE, DEFAULT_SERVING_LIMITS.readAddress);
  return creationKey !== null && creationAddress !== null && readKey !== null && readAddress !== null
    ? Object.freeze({ creationKey, creationAddress, readKey, readAddress, windows: SERVING_WINDOW_CAPACITY }) : null;
}

interface Window { readonly since: number; readonly incarnation?: string; attempts: number }
/** Identifies only one memory counter; it conveys no native authority. */
export interface ServingOverflowReservation { readonly owner: string; readonly window: string }
const positive = (value: number, maximum: number) => Number.isSafeInteger(value) && value > 0 && value <= maximum;

/** Internal accounting only. Its owner verifies each original bounded
 * signature before supplying an actor. A null actor can account an invalid
 * signature against a trusted edge address, but never against its claimed
 * victim key. A true result is not signature or native authorization.
 *
 * The three fixed-duration maps retain insertion order. A monotonic local
 * reading keeps that order valid when the host clock moves backward. Each
 * operation removes only its expired leading windows. This bounds memory
 * and avoids a full table scan on every request.
 */
export class ServingLimits {
  readonly #ownerIncarnation = crypto.randomUUID();
  readonly #config: ServingLimitConfig;
  readonly #creation = new Map<string, Window>();
  readonly #reads = new Map<string, Window>();
  readonly #found = new Map<string, Window>();
  readonly #overflow = new Map<ServingOperation, Window>();
  #now = 0;

  constructor(config: ServingLimitConfig = DEFAULT_SERVING_LIMITS) {
    if (![config.creationKey, config.creationAddress, config.readKey, config.readAddress].every(value => positive(value, MAX_LIMIT))
      || !positive(config.windows, SERVING_WINDOW_CAPACITY)) throw new Error("Invalid serving limits");
    this.#config = Object.freeze({ ...config });
  }

  counts(): { creation: number; reads: number; found: number; total: number } {
    const creation = this.#creation.size + Number(this.#overflow.has("creation"));
    const reads = this.#reads.size + Number(this.#overflow.has("signed-read"));
    const found = this.#found.size + Number(this.#overflow.has("found"));
    return { creation, reads, found, total: creation + reads + found };
  }

  #expire(windows: Map<string, Window>, duration: number, now: number): void {
    for (const [identity, window] of windows) {
      if (now - window.since < duration) break;
      windows.delete(identity);
    }
  }

  creationAddress(address: string, now: number): { admitted: boolean; overflow: ServingOverflowReservation | null } {
    const admitted = this.account("creation", null, address, now);
    const key = addressKey(address);
    const window = this.#overflow.get("creation");
    return { admitted, overflow: admitted && key !== null && !this.#creation.has(`address:${key}`) && window?.incarnation
      ? { owner: this.#ownerIncarnation, window: window.incarnation } : null };
  }

  /** Charge the address first. A denied address allocates no key window.
   * Each operation owns its cap and one shared overflow window. A request
   * charges that shared window at most once, even if both identities use it.
   * No live identity is evicted. This result is not native authority.
   */
  account(operation: ServingOperation, verifiedActor: KeyId | null, trustedAddress: string | null, now: number, reservation: ServingOverflowReservation | null = null): boolean {
    if (!["creation", "signed-read", "found"].includes(operation) || !Number.isFinite(now) || now < 0
      || (verifiedActor !== null && !isKeyId(verifiedActor))) return false;
    const address = addressKey(trustedAddress);
    if (verifiedActor === null && address === null) return false;
    this.#now = Math.max(this.#now, now);
    this.#expire(this.#creation, 60 * 60 * 1000, this.#now);
    this.#expire(this.#reads, 60 * 1000, this.#now);
    this.#expire(this.#found, 60 * 60 * 1000, this.#now);
    for (const [kind, window] of this.#overflow) {
      if (this.#now - window.since >= (kind === "signed-read" ? 60_000 : 3_600_000)) this.#overflow.delete(kind);
    }
    const windows = operation === "creation" ? this.#creation : operation === "found" ? this.#found : this.#reads;
    const keyLimit = operation === "signed-read" ? this.#config.readKey : this.#config.creationKey;
    const addressLimit = operation === "signed-read" ? this.#config.readAddress : this.#config.creationAddress;
    const identities = [
      ...(address === null ? [] : [{ identity: `address:${address}`, limit: addressLimit }]),
      ...(verifiedActor === null ? [] : [{ identity: `key:${verifiedActor}`, limit: keyLimit }]),
    ];
    const charged = new Set<Window>();
    for (const { identity, limit } of identities) {
      let window = windows.get(identity);
      if (!window) {
        if (windows.size < this.#config.windows) {
          window = { since: this.#now, attempts: 0 }; windows.set(identity, window);
        } else {
          window = this.#overflow.get(operation);
          if (!window) { window = { since: this.#now, incarnation: crypto.randomUUID(), attempts: 0 }; this.#overflow.set(operation, window); }
        }
      }
      // Overflow serves both key and address identities. Its stricter cap
      // keeps a key's bound even when that key has no dedicated row.
      const maximum = window === this.#overflow.get(operation) ? Math.min(keyLimit, addressLimit) : limit;
      if (!charged.has(window)) {
        const alreadyCharged = operation === "creation" && window === this.#overflow.get(operation)
          && reservation?.owner === this.#ownerIncarnation && reservation.window === window.incarnation;
        if (!alreadyCharged) window.attempts = Math.min(window.attempts + 1, maximum + 1);
        charged.add(window);
      }
      if (window.attempts > maximum) return false;
    }
    return true;
  }
}

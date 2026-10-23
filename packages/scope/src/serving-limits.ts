/** Bounded serving counters, not native authority. The fixed deployment
 * object owns one instance. Restart or actual object eviction loses it.
 * No active window is removed to admit a new identity. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { isKeyId } from "@generalbusiness/dap-bytes";
import { addressKey } from "./limits.ts";

export const SERVING_WINDOW_CAPACITY = 8192;
const MAX_LIMIT = 1_000_000;
export type ServingOperation = "creation" | "signed-read";
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

interface Window { readonly since: number; attempts: number }
const positive = (value: number, maximum: number) => Number.isSafeInteger(value) && value > 0 && value <= maximum;

/** Internal accounting only. Its owner verifies each original bounded
 * signature before supplying an actor. A null actor can account an invalid
 * signature against a trusted edge address, but never against its claimed
 * victim key. A true result is not signature or native authorization.
 *
 * The two fixed-duration maps retain insertion order. A monotonic local
 * reading keeps that order valid when the host clock moves backward. Each
 * operation removes only its expired leading windows. This bounds memory
 * and avoids a full table scan on every request.
 */
export class ServingLimits {
  readonly #config: ServingLimitConfig;
  readonly #creation = new Map<string, Window>();
  readonly #reads = new Map<string, Window>();
  #now = 0;

  constructor(config: ServingLimitConfig = DEFAULT_SERVING_LIMITS) {
    if (![config.creationKey, config.creationAddress, config.readKey, config.readAddress].every(value => positive(value, MAX_LIMIT))
      || !positive(config.windows, SERVING_WINDOW_CAPACITY)) throw new Error("Invalid serving limits");
    this.#config = Object.freeze({ ...config });
  }

  counts(): { creation: number; reads: number; total: number } {
    return { creation: this.#creation.size, reads: this.#reads.size, total: this.#creation.size + this.#reads.size };
  }

  #expire(windows: Map<string, Window>, duration: number, now: number): void {
    for (const [identity, window] of windows) {
      if (now - window.since < duration) break;
      windows.delete(identity);
    }
  }

  /** Account both identities in one synchronous action, before any target
   * or proof await. Every represented attempt increments both counters,
   * including one denied by their limit. Counts saturate at limit + 1.
   * If all new identities cannot fit, refuse without partial allocation;
   * existing windows remain intact. Capacity refusal is not native judgment.
   * The caller supplies null, never an invented shared address, for service
   * bindings and hosted in-process calls.
   */
  account(operation: ServingOperation, verifiedActor: KeyId | null, trustedAddress: string | null, now: number): boolean {
    if ((operation !== "creation" && operation !== "signed-read") || !Number.isFinite(now) || now < 0
      || (verifiedActor !== null && !isKeyId(verifiedActor))) return false;
    const address = addressKey(trustedAddress);
    if (verifiedActor === null && address === null) return false;
    this.#now = Math.max(this.#now, now);
    this.#expire(this.#creation, 60 * 60 * 1000, this.#now);
    this.#expire(this.#reads, 60 * 1000, this.#now);
    const windows = operation === "creation" ? this.#creation : this.#reads;
    const keyLimit = operation === "creation" ? this.#config.creationKey : this.#config.readKey;
    const addressLimit = operation === "creation" ? this.#config.creationAddress : this.#config.readAddress;
    const identities = [
      ...(verifiedActor === null ? [] : [{ identity: `key:${verifiedActor}`, limit: keyLimit }]),
      ...(address === null ? [] : [{ identity: `address:${address}`, limit: addressLimit }]),
    ];
    const missing = identities.filter(({ identity }) => !windows.has(identity)).length;
    if (this.#creation.size + this.#reads.size + missing > this.#config.windows) return false;
    let admitted = true;
    for (const { identity, limit } of identities) {
      let window = windows.get(identity);
      if (!window) { window = { since: this.#now, attempts: 0 }; windows.set(identity, window); }
      window.attempts = Math.min(window.attempts + 1, limit + 1);
      if (window.attempts > limit) admitted = false;
    }
    return admitted;
  }
}

/**
 * This origin's private storage for the lending interface: the device key, the
 * seat it joined, and the one kept request of each kind. IndexedDB holds the
 * key pair as WebCrypto made it; its private half cannot be read out, here or
 * anywhere. A Web Lock keeps other tabs out of a slot while one tab uses it.
 * No session token is stored.
 */
import { browserPrivateSlots } from "@generalbusiness/dap-client";
import type { CustodyLock, Kept, KeptStore, LendingIdentity } from "./custody.ts";
import type { DeviceKey, JoinStore, KeptJoin, Seat } from "./join.ts";

const DATABASE = "dap-lending-private-1", STORE = "slots", LOCK = "dap-lending-custody";
/** What this browser remembers of its place in a room. `identity` is set once the lending scope is found. */
export interface Remembered { v: 1; device: DeviceKey; seat?: Seat; identity?: LendingIdentity }

/** Each installed native incarnation keeps its device and join separately. */
export function lendingStorage(binding?: string) {
  const prefix = binding === undefined ? "" : `installed:${binding}:`;
const slots = browserPrivateSlots({ database: DATABASE, store: STORE, lock: LOCK });
const get = <T>(key: string): Promise<T | null> => slots.load(prefix + key) as Promise<T | null>;
const put = (key: string, value: unknown): Promise<void> => slots.save(prefix + key, value);
const remove = (key: string): Promise<void> => slots.remove(prefix + key);
/** Every use of a kept request, in every tab of this origin, takes this lock. */
const browserLock: CustodyLock = { run: work => slots.run(work) };

const remembered = {
  load: () => get<Remembered>("remembered"),
  save: (value: Remembered) => put("remembered", value),
  /** Forget the device key and the seat. Kept requests are left as they are. */
  forget: () => remove("remembered"),
};
const joinStore: JoinStore = { load: () => get<KeptJoin>("join"), save: (value) => put("join", value), clear: async () => {
  const held = await get<KeptJoin>("join");
  if (binding !== undefined && held?.kept.phase === "recorded") {
    const current = await remembered.load();
    if (!current) throw Error("The enrolled browser key is unavailable.");
    await remembered.save({ ...current, seat: held.seat });
  }
  await remove("join");
} };
/** The kept lending request of one device key in one lending scope. */
const actStore = (identity: LendingIdentity): KeptStore => {
  const key = `act:${identity.scope.scope}:${identity.publicKey}`;
  return { load: () => get<Kept>(key), save: (value) => put(key, value), clear: () => remove(key) };
};
  return { browserLock, remembered, joinStore, actStore };
}
export const { browserLock, remembered, joinStore, actStore } = lendingStorage();

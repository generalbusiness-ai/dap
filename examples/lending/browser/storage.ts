/**
 * This origin's private storage for the lending interface: the device key, the
 * seat it joined, and the custody of its requests. IndexedDB holds the
 * key pair as WebCrypto made it; its private half cannot be read out, here or
 * anywhere. A Web Lock keeps other tabs out of a slot while one tab uses it.
 * No session token is stored.
 */
import { browserCustodyStore, browserPrivateSlots } from "@generalbusiness/dap-client";
import type { CustodyLock, LendingIdentity } from "./custody.ts";
import type { DeviceKey, JoinStore, KeptJoin, Seat } from "./join.ts";

const DATABASE = "dap-lending-private-2", STORE = "slots", LOCK = "dap-lending-custody";
/** What this browser remembers of its place in a room. `identity` is set once the lending scope is found. */
export interface Remembered { v: 1; device: DeviceKey; seat?: Seat; identity?: LendingIdentity }

/** Each native installation keeps its device and join separately. */
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
const joinStore: JoinStore = { load: () => get<KeptJoin>("join"), save: (value) => put("join", value), clear: async (outcome, current = () => true) => {
  const usable = () => { if (!current()) throw Error("This join context is no longer current."); };
  usable();
  const held = await get<KeptJoin>("join");
  usable();
  if (binding !== undefined && outcome === "joined" && held?.v === 2) {
    const saved = await remembered.load();
    usable();
    if (!saved) throw Error("The enrolled browser key is unavailable.");
    await remembered.save({ ...saved, seat: held.seat });
    usable();
  }
  await remove("join");
} };
/** The custody records of this origin's lending requests. `byTarget` separates each identity's requests. */
const custody = browserCustodyStore({ database: "dap-lending-custody-1", lock: "dap-lending-custody" });
/** The page's own state of one identity's requests: the keys the person gave up, and the slot of the retired format. */
const requests = (identity: LendingIdentity) => {
  const givenUp = `given-up:${identity.scope.scope}:${identity.publicKey}`, retired = `act:${identity.scope.scope}:${identity.publicKey}`;
  return {
    givenUp: async (): Promise<string[]> => (await get<string[]>(givenUp)) ?? [],
    giveUp: async (key: string): Promise<void> => { const kept = (await get<string[]>(givenUp)) ?? []; await put(givenUp, [...kept.filter((k) => k !== key), key].slice(-256)); },
    /** True when a request slot from before the identifier cutover was here. The page removes it; its room retired. */
    dropRetired: async (): Promise<boolean> => { if (await get(retired) === null) return false; await remove(retired); return true; },
  };
};
  return { browserLock, remembered, joinStore, custody, requests };
}
export const { browserLock, remembered, joinStore, custody, requests } = lendingStorage();

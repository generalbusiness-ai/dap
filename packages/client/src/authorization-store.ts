/** Authorization storage uses custody's coordinating fence, in a separate namespace. */
import type { KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Authorization } from "./authorization.ts";

/** Raw operations take no lock. A write owns and atomically replaces one owner/scope batch.
 * A rejection does not prove whether the old or new whole batch persisted. */
export interface AuthorizationPort {
  read(owner: KeyId, scope: ScopeRef): Promise<readonly Authorization[]>;
  write(owner: KeyId, scope: ScopeRef, records: readonly Authorization[]): Promise<void>;
}

/** Only the builder that custody awaits may use this capability. */
export interface CustodyBuildFence {
  authorizations<T>(work: (port: AuthorizationPort) => Promise<T>): Promise<T>;
}

/** Internal custody helper; not exported by the package entry. */
export function authorizationBuildFence(port: AuthorizationPort | undefined): {
  fence: CustodyBuildFence; close(): Promise<void>;
} {
  let active = true;
  const portOperations = new Set<Promise<unknown>>();
  const callbacks = new Set<Promise<unknown>>();
  const current = (): void => { if (!active) throw new Error("the custody build fence is closed"); };
  const track = <T>(pending: Set<Promise<unknown>>, work: Promise<T>): Promise<T> => {
    const done = work.finally(() => { pending.delete(done); });
    pending.add(done); void done.catch(() => {}); return done;
  };
  const guarded: AuthorizationPort = {
    read(owner, scope) {
      current(); const ownedScope = structuredClone(scope);
      return track(portOperations, (async () => { const rows = await port!.read(owner, ownedScope); current(); return rows; })());
    },
    write(owner, scope, records) {
      current(); const ownedScope = structuredClone(scope), ownedRows = structuredClone(records);
      return track(portOperations, (async () => { await port!.write(owner, ownedScope, ownedRows); current(); })());
    },
  };
  return {
    fence: { authorizations(work) {
      current();
      if (!port) throw new Error("this custody store has no authorization namespace");
      return track(callbacks, (async () => { const answer = await work(guarded); current(); return answer; })());
    } },
    async close() {
      const escaped = callbacks.size > 0;
      active = false;
      // Join already launched port work under the original custody fence.
      // Later escaped callbacks fail current() before starting another write.
      await Promise.allSettled([...portOperations]);
      if (escaped) throw new Error("authorization work escaped its custody builder");
    },
  };
}

/** One replacement owns one serialized batch; failed serialization changes nothing. */
export function memoryAuthorizations(changed: () => void): AuthorizationPort {
  const batches = new Map<string, string>();
  const key = (owner: KeyId, scope: ScopeRef): string => canonicalize({ owner, scope });
  return {
    async read(owner, scope) { return JSON.parse(batches.get(key(owner, scope)) ?? "[]") as Authorization[]; },
    async write(owner, scope, records) {
      const text = canonicalize(records), at = key(owner, scope);
      batches.set(at, text);
      if (batches.get(at) !== text) throw new Error("authorization read back differs");
      changed();
    },
  };
}

/** Private finite custody observations. No classification, storage write or fence acquisition. */
import { isKeyId, isScopeRef, same } from "@generalbusiness/dap-bytes";
import { Custody, CustodyError, identityId, type CustodyRecord, type DeliveryOccurrence, type Identity, type Outcome } from "./custody.ts";
import { validKey } from "./custody-identity.ts";
import { deliveryOccurrenceOf } from "./custody-occurrence.ts";

export type DraftCustodyObservation =
  | { readonly is: "absent"; readonly identity: Identity }
  | { readonly is: "standalone"; readonly identity: Identity; readonly record: CustodyRecord; readonly occurrence: DeliveryOccurrence }
  | { readonly is: "ordinary"; readonly identity: Identity; readonly record: CustodyRecord; readonly occurrence: DeliveryOccurrence; readonly outcomes: readonly Outcome[] };

/** A collision is evidence only; the owning member caller selects its existing stop. */
export type AllocatedDraftKey =
  | { readonly is: "unused"; readonly observation: Extract<DraftCustodyObservation, { is: "absent" }> }
  | { readonly is: "collision"; readonly observation: DraftCustodyObservation };

export interface DraftCustodyCut {
  /** Initial finite keys only. The one allocated extension does not change this iteration. */
  readonly keys: readonly string[];
  acquire(key: string): Promise<DraftCustodyObservation>;
  /** Call once, after initial classification, for the member's one actual generated key. */
  admitAllocatedKey(key: string): Promise<AllocatedDraftKey>;
}

/** The caller owns the existing member fence, or a separate read-only publication candidate. */
export function openDraftCustodyCut(
  custody: Custody,
  suppliedWho: Readonly<Omit<Identity, "key">>,
  suppliedKeys: readonly string[],
  assertOwned: () => void = () => {},
): DraftCustodyCut {
  if (!(custody instanceof Custody) || typeof assertOwned !== "function") throw new TypeError("invalid draft custody owner");
  const who = structuredClone(suppliedWho);
  if (typeof who.service !== "string" || !isKeyId(who.signer)
    || who.membership !== null && !isScopeRef(who.membership) || !isScopeRef(who.target)) {
    throw new TypeError("invalid fixed scope custody identity");
  }
  if (!Array.isArray(suppliedKeys)) throw new TypeError("invalid finite custody keys");
  const ownedKeys = structuredClone([...suppliedKeys]);
  if (ownedKeys.some(key => !validKey(key))) throw new TypeError("invalid finite custody key");
  const keys = Object.freeze([...new Set(ownedKeys)]), admitted = new Set(keys);
  const memo = new Map<string, Promise<DraftCustodyObservation>>();
  let allocated = false;

  async function observe(identity: Identity): Promise<DraftCustodyObservation> {
    assertOwned();
    const found = await custody.find(identity);
    assertOwned();
    if (found === null) return { is: "absent", identity };
    const record = structuredClone(found);
    if (!same(record.identity, identity)) throw new CustodyError({ held: "unreadable" });
    const occurrence = deliveryOccurrenceOf(record);
    if (record.standalone === true) return { is: "standalone", identity, record, occurrence };
    const outcomes = await custody.outcomes(identityId(identity), record, 0, record.count);
    assertOwned();
    if (!Array.isArray(outcomes) || outcomes.length !== record.count) throw new CustodyError({ held: "unreadable" });
    return { is: "ordinary", identity, record, occurrence, outcomes: structuredClone(outcomes) };
  }

  function acquire(key: string): Promise<DraftCustodyObservation> {
    if (!validKey(key) || !admitted.has(key)) throw new TypeError("custody key is outside this finite cut");
    const identity: Identity = structuredClone({ ...who, key }), id = identityId(identity);
    const existing = memo.get(id);
    if (existing) return existing;
    // Install the promise before observe can call any owner hook or start I/O.
    const pending = Promise.resolve().then(() => observe(identity));
    memo.set(id, pending);
    return pending;
  }

  function admitAllocatedKey(key: string): Promise<AllocatedDraftKey> {
    if (allocated) throw new TypeError("the allocated custody key was already checked");
    allocated = true;
    if (!validKey(key)) throw new TypeError("invalid allocated custody key");
    const collision = admitted.has(key);
    admitted.add(key);
    return acquire(key).then((observation): AllocatedDraftKey => {
      if (!collision && observation.is === "absent") return { is: "unused", observation };
      return { is: "collision", observation };
    });
  }

  return { keys, acquire, admitAllocatedKey };
}

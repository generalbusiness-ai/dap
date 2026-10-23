/** Portable custody for one signed application request. The caller owns
 * identity storage, its lock and trusted transport/receipt checks. Recovery
 * is read-only; explicit Continue reuses the exact retained envelope.
 * This format currently admits no grants, detached texts or presented facts.
 * It neither signs nor clears a kept request. */
import type { Answer, Beside, Digest, Grant, KeyId, Receipt, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, textDigest, verifySignedIntent } from "@generalbusiness/dap-bytes";

/** The exact scope, key and permitted act kinds for this custody slot. */
export interface Binding { readonly scope: ScopeRef; readonly publicKey: KeyId; readonly kinds: readonly string[] }
export type Phase = "prepared" | "inflight" | "unknown" | "recorded" | "refused";
export interface Envelope { readonly signed: SignedIntent; readonly grants: readonly Grant[]; readonly beside: Beside }
/** One kept request. `refusal` is the scope's reason, kept with a refused phase. */
export interface Kept { readonly v: 1; readonly kind: string; readonly envelope: Envelope; readonly phase: Phase; readonly refusal?: string }
/** Private storage that survives a reload, bound to one identity. `save` must finish before anything is sent. */
export interface KeptStore { load(): Promise<unknown>; save(value: Kept): Promise<void>; clear(): Promise<void> }
/** Excludes every other user of this identity's slot, other tabs included. */
export interface CustodyLock { run<T>(work: () => Promise<T>): Promise<T> }

export const KEPT_BYTES = 64 * 1024;
const PHASES: readonly string[] = ["prepared", "inflight", "unknown", "recorded", "refused"];
export const envelopeKey = (envelope: Envelope): Digest => textDigest(canonicalize(envelope));

/** A kept request that is whole, is signed by this key, and is an allowed act to this scope. Anything else stays in custody untouched. */
export function validKept(value: unknown, identity: Binding): value is Kept {
  try {
    if (!isRecord(value) || value["v"] !== 1 || typeof value["kind"] !== "string" || !identity.kinds.includes(value["kind"])) return false;
    if (typeof value["phase"] !== "string" || !PHASES.includes(value["phase"])) return false;
    if (Object.keys(value).some((key) => !["v", "kind", "envelope", "phase", "refusal"].includes(key))) return false;
    if ((value["phase"] === "refused") !== (typeof value["refusal"] === "string")) return false;
    const envelope = value["envelope"];
    if (!isRecord(envelope) || Object.keys(envelope).sort().join() !== "beside,grants,signed") return false;
    const signed = envelope["signed"] as SignedIntent;
    // This custody format admits no detached text, presented fact or grant.
    if (!Array.isArray(envelope["grants"]) || envelope["grants"].length !== 0 || !isRecord(envelope["beside"]) || Object.keys(envelope["beside"]).length !== 0) return false;
    if (!isRecord(signed) || !isRecord(signed.intent) || !verifySignedIntent(signed)) return false;
    return signed.intent.kind === value["kind"] && signed.intent.actor === identity.publicKey && canonicalize(signed.intent.to) === canonicalize(identity.scope)
      && new TextEncoder().encode(canonicalize(value)).length <= KEPT_BYTES;
  } catch { return false; }
}

export type Settled = { status: "recorded" } | { status: "refused"; reason: string } | { status: "unknown" };
export interface Ports {
  current(): boolean;
  /** The one send of this exact envelope. It may throw or answer anything; a reply alone is not a known result. */
  post(envelope: Envelope): Promise<Answer>;
  /** True only when the scope's own record holds this exact signed request at the receipt's place. */
  recorded(receipt: Receipt, envelope: Envelope): Promise<boolean>;
  /** A read: the receipt of this exact signed request, if the scope has one. It admits nothing. */
  settle(envelope: Envelope): Promise<Receipt | null>;
}

/**
 * Take the kept request one step. Ordinary recovery after `prepared` is a
 * read. `continueOriginal` is an explicit authorization to resend the exact
 * retained envelope, never to sign or replace one. The caller holds the lock.
 */
export async function advance(store: KeptStore, identity: Binding, ports: Ports, expected: Envelope, readOnly = false, continueOriginal = false): Promise<Settled> {
  const current = () => { if (!ports.current()) throw new Error("This device context is no longer current."); };
  const load = async (): Promise<Kept> => {
    current(); const held = await store.load(); current();
    if (!validKept(held, identity) || envelopeKey(held.envelope) !== envelopeKey(expected)) throw new Error("The kept request is not this one.");
    return held;
  };
  const mark = async (from: Kept, phase: Phase, refusal?: string): Promise<Kept> => {
    const latest = await load();
    if (canonicalize(latest) !== canonicalize(from)) throw new Error("The kept request changed before it could be marked.");
    const next: Kept = { v: 1, kind: from.kind, envelope: from.envelope, phase, ...(refusal === undefined ? {} : { refusal }) };
    await store.save(next); current();
    return next;
  };
  const accept = async (held: Kept, receipt: Receipt): Promise<Settled> => {
    const sound = await ports.recorded(receipt, held.envelope); current();
    if (!sound) return { status: "unknown" };
    if (held.phase !== "recorded") await mark(held, "recorded");
    return { status: "recorded" };
  };
  let held: Kept;
  try { held = await load(); } catch { return { status: "unknown" }; }
  try {
    if (held.phase === "recorded") return { status: "recorded" };
    if (held.phase === "refused") return { status: "refused", reason: held.refusal ?? "refused" };
    if (readOnly || (held.phase !== "prepared" && !continueOriginal)) {
      const receipt = await ports.settle(held.envelope); current();
      return receipt ? await accept(held, receipt) : { status: "unknown" };
    }
    // Mark before each authorized send. Every send uses the original retained envelope.
    held = await mark(held, "inflight");
    const answer = await ports.post(held.envelope); current();
    if (answer.answer === "accepted") return await accept(held, answer.receipt);
    if (answer.answer === "refused") { await mark(held, "refused", answer.reason); return { status: "refused", reason: answer.reason }; }
    await mark(held, "unknown");
    return { status: "unknown" };
  } catch {
    // Never overwrite a final or newer mark. An inflight mark becomes unknown; the exact bytes stay.
    try { const latest = await load(); if (latest.phase === "inflight") await mark(latest, "unknown"); } catch { /* The request stays in custody as it is. */ }
    return { status: "unknown" };
  }
}

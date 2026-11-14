/**
 * The requests of a browser page, kept in `Custody` (NF-5). A page signs a
 * request under its own key, `Custody` keeps the exact envelope before it is
 * sent, and after a lost reply or a reload the page settles that envelope with
 * a read. Nothing here signs a second envelope unless the caller passes
 * `resign`.
 *
 * The page supplies the trusted ports: the one send, the read of a
 * settlement, and the check that the scope's own record holds the exact signed
 * request. An acceptance that the page cannot check is kept as a lost reply,
 * so the record stays unresolved and a later read settles it.
 */
import type { Answer, Digest, KeyId, Receipt, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, CustodyError, Lost, identityId, type BindingRecord, type CustodyRecord, type ClientCustodyStore, type Envelope, type Identity, type Phase, type Sent } from "./custody.ts";

/** What a page tells a person when it finds a request in a format from before the identifier cutover. */
export const RETIRED_REQUEST = "This browser kept a request for a room that has retired. The browser removed it. Nothing was sent.";

/** The signer and the target of a page's requests. Each request adds its own key. */
export interface BrowserRequestTarget { service: string; membership: ScopeRef | null; signer: KeyId; target: ScopeRef }

export interface BrowserRequestPorts {
  current(): boolean;
  /** The send of one exact envelope. It may throw or answer anything. */
  post(envelope: Envelope): Promise<Answer>;
  /** True only when the scope's own record holds this exact signed request at the receipt's place. */
  recorded(receipt: Receipt, envelope: Envelope): Promise<boolean>;
  /** A read: the receipt of this exact signed request, if the scope has one. It admits nothing. */
  settle(envelope: Envelope): Promise<Receipt | null>;
}

export type RequestSettled = { status: "recorded" } | { status: "refused"; reason: string } | { status: "unknown" };
/** One kept request at the target: its key, its record and what it settled. */
export interface KeptRequest { key: string; record: CustodyRecord; settled: RequestSettled }

const UNRESOLVED: ReadonlySet<Phase> = new Set(["prepared", "sent", "unknown"]);
/** True when the record is unresolved: a send or a read can still settle it. */
export const unresolvedRequest = (record: CustodyRecord): boolean => UNRESOLVED.has(record.phase);
/** True when no envelope of this record has left the browser: it is `prepared`. */
export const unsentRequest = (record: CustodyRecord): boolean => record.phase === "prepared";

/** A new request key: 16 random bytes, base64url. The intent carries it as its `idempotencyKey`. */
export const requestKey = (): string => b64url(crypto.getRandomValues(new Uint8Array(16)));

export interface BrowserRequests {
  readonly custody: Custody;
  identity(key: string): Identity;
  /** The record under `key`, or null when nothing was kept. */
  find(key: string): Promise<CustodyRecord | null>;
  /** The unresolved records at the target, oldest first. */
  unresolved(): Promise<KeptRequest[]>;
  /**
   * Keep and send. A new key signs with `build`, keeps the envelope and sends it. A `prepared` record is sent. An unresolved
   * record is sent again with the same bytes. A terminal record gives its outcome and sends nothing, unless `resign` permits a
   * new signing of a `refused` record (ruling 0767a3f9).
   */
  send(key: string, meaning: Digest, build: () => Promise<{ binding: BindingRecord; envelope: Envelope }>, options: { notAfter: string; resign?: boolean }): Promise<RequestSettled>;
  /** Read the scope for each kept envelope of the record. It signs and sends nothing. */
  settle(key: string): Promise<RequestSettled | null>;
}

/** What a kept record settled, from its newest decisive outcome. */
async function settledOf(custody: Custody, identity: Identity, record: CustodyRecord): Promise<RequestSettled> {
  if (record.phase === "accepted") return { status: "recorded" };
  if (record.phase !== "refused") return { status: "unknown" };
  const decided = await custody.decided(identityId(identity), record);
  return { status: "refused", reason: decided?.answer?.answer === "refused" ? decided.answer.reason : "refused" };
}

const settledOfSent = (sent: Sent): RequestSettled => {
  if ("lost" in sent || "archivedSettlement" in sent || "folded" in sent) return { status: "unknown" };
  if (sent.answer.answer === "accepted") return { status: "recorded" };
  if (sent.answer.answer === "refused") return { status: "refused", reason: sent.answer.reason };
  return { status: "unknown" };
};

export function browserRequests(store: ClientCustodyStore, who: BrowserRequestTarget, ports: BrowserRequestPorts, now: () => number = () => Date.now()): BrowserRequests {
  const custody = new Custody(store, () => timeOf(now()));
  const identity = (key: string): Identity => ({ service: who.service, membership: who.membership, signer: who.signer, target: who.target, key });
  const current = () => { if (!ports.current()) throw new Error("This device context is no longer current."); };
  /** An answer that custody keeps. An acceptance the page cannot check, and any failure to read a reply, is a lost reply. */
  const deliver = async (envelope: Envelope): Promise<Answer> => {
    current();
    let answer: Answer;
    try { answer = await ports.post(envelope); current(); } catch { throw new Lost(); }
    if (answer.answer === "accepted") {
      let sound = false;
      try { sound = await ports.recorded(answer.receipt, envelope); current(); } catch { sound = false; }
      if (!sound) throw new Lost();
    }
    return answer;
  };
  const read = async (envelope: Envelope): Promise<Receipt | null> => {
    current();
    let receipt: Receipt | null;
    try { receipt = await ports.settle(envelope); current(); } catch { throw new Lost(); }
    if (!receipt) return null;
    let sound = false;
    try { sound = await ports.recorded(receipt, envelope); current(); } catch { throw new Lost(); }
    // A receipt the page cannot check settles nothing: the read is lost, and the signing stays open.
    if (!sound) throw new Lost();
    return receipt;
  };
  return {
    custody,
    identity,
    find: (key) => custody.find(identity(key)),
    async unresolved() {
      current();
      const listed = await store.byTarget({ service: who.service, membership: who.membership, signer: who.signer, target: who.target });
      current();
      const out: KeptRequest[] = [];
      for (const row of listed) {
        if (!UNRESOLVED.has(row.phase)) continue;
        const record = await custody.find(identity(row.key));
        current();
        if (record && UNRESOLVED.has(record.phase)) out.push({ key: row.key, record, settled: { status: "unknown" } });
      }
      return out;
    },
    async send(key, meaning, build, options) {
      current();
      // Admission may wait for another tab. Recheck authority at the actual builder call.
      const buildCurrent = async () => { current(); const built = await build(); current(); return built; };
      const sent = await custody.send(identity(key), meaning, buildCurrent, deliver, { notAfter: options.notAfter, read, ...(options.resign ? { resign: true } : {}) });
      current();
      return settledOfSent(sent);
    },
    async settle(key) {
      current();
      const settled = await custody.settle(identity(key), read);
      current();
      if (!settled) return null;
      const outcome = await settledOf(custody, identity(key), settled.record);
      current();
      return outcome;
    },
  };
}

/** True when a custody error left the request unsent: anything but `unkept`, which says that an envelope left. */
export const unsentError = (error: unknown): boolean => !(error instanceof CustodyError && error.why.held === "unkept");

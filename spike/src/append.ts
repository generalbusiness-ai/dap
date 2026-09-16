// The shared append operation (spike plan §2; ordering note §3 steps 2 to 6).
//
// One function for every backend: verify stable facts, exact-retry lookup
// with changed-content refusal, then admission, then entry construction
// and the writes, all inside the backend's serialization boundary.
// Backends supply storage and that boundary. V1 ships the in-memory
// backend; O1 adds SQLite under the same function.

import { ZERO_HASH, contentId, type Json } from './canon.ts';
import type { Entry, EventBody, Header, Principal, Receipt, Refusal } from './types.ts';

export interface RetryRecord {
  actionId: string;
  contentId: string;
  receipt: Receipt;
}

export interface Backend {
  /** Run `fn` with exclusive access to the journal. */
  serialized<T>(fn: () => T): T;
  head(): Entry | undefined;
  get(position: number): Entry | undefined;
  entries(): readonly Entry[];
  retry(actionId: string): RetryRecord | undefined;
  isConsumed(tokenId: string): boolean;
  /** One durable write: the entry, the head, the retry record, any consumption. */
  commit(entry: Entry, retry: RetryRecord | undefined, consume: string | undefined): void;
}

/** Issued by the serving party to a current participant (design note §2, transport admission). */
export interface TransportCredential {
  principal: Principal;
}

export interface Submission {
  event: EventBody;
  credential?: TransportCredential;
}

/** What admission needs from the serving party, which runs the fold. */
export interface AdmissionContext {
  genesis: string;
  maxPayloadBytes: number;
  isParticipant(p: Principal): boolean;
  /** an effective invitation's record, if the token was issued */
  issuedInvite(tokenId: string): { invitee: Principal } | undefined;
  /** the token id an accept_invite redeems, or undefined if malformed */
  tokenOf(event: EventBody): string | undefined;
  acceptKind: string;
}

export function makeHeader(genesis: string, position: number, prev: string, commitment: string): { header: Header; headerHash: string } {
  const header: Header = { genesis, position, prev, commitment };
  return { header, headerHash: contentId(header as unknown as Json) };
}

/** Append a submission. Never folds. */
export function append(backend: Backend, sub: Submission, ctx: AdmissionContext): Receipt | Refusal {
  const ev = sub.event;
  // 1. Stable facts. Nothing here depends on current membership.
  if (ev.genesis !== ctx.genesis) return { refused: true, reason: 'wrong_genesis' };
  if (!ev.action_id) return { refused: true, reason: 'no_action_id' };
  if (Buffer.byteLength(JSON.stringify(ev.payload)) > ctx.maxPayloadBytes) return { refused: true, reason: 'envelope_bounds' };
  const id = contentId(ev as unknown as Json);

  return backend.serialized((): Receipt | Refusal => {
    // 2. Exact retry, before admission.
    const prior = backend.retry(ev.action_id!);
    if (prior) {
      if (prior.contentId === id) return { ...prior.receipt, replay: true };
      return { refused: true, reason: 'changed_content' };
    }
    // 3. Admission, only for a new action.
    let consume: string | undefined;
    if (ev.kind === ctx.acceptKind) {
      const tokenId = ctx.tokenOf(ev);
      if (!tokenId) return { refused: true, reason: 'invitation_malformed' };
      const issued = ctx.issuedInvite(tokenId);
      if (!issued) return { refused: true, reason: 'invitation_not_issued' };
      if (issued.invitee !== ev.actor) return { refused: true, reason: 'invitation_wrong_invitee' };
      if (backend.isConsumed(tokenId)) return { refused: true, reason: 'invitation_consumed' };
      consume = tokenId;
    } else {
      if (!sub.credential || sub.credential.principal !== ev.actor) return { refused: true, reason: 'no_credential' };
      if (!ctx.isParticipant(ev.actor)) return { refused: true, reason: 'not_a_participant' };
    }
    // 4. Position and header.
    const head = backend.head();
    const position = head ? head.position + 1 : 0;
    const prev = head ? head.headerHash : ZERO_HASH;
    const { header, headerHash } = makeHeader(ctx.genesis, position, prev, id);
    const entry: Entry = { position, event: ev, id, header, headerHash };
    const receipt: Receipt = { header, headerHash, replay: false };
    // 5. One write.
    backend.commit(entry, { actionId: ev.action_id!, contentId: id, receipt }, consume);
    return receipt;
  });
}

/** Append without admission: genesis and adopted origins at context creation. */
export function appendUnadmitted(backend: Backend, genesis: string, ev: EventBody): Entry {
  return backend.serialized(() => {
    const id = contentId(ev as unknown as Json);
    const head = backend.head();
    const position = head ? head.position + 1 : 0;
    const prev = head ? head.headerHash : ZERO_HASH;
    const { header, headerHash } = makeHeader(genesis, position, prev, id);
    const entry: Entry = { position, event: ev, id, header, headerHash };
    backend.commit(entry, undefined, undefined);
    return entry;
  });
}

export class MemoryBackend implements Backend {
  private readonly log: Entry[] = [];
  private readonly retries = new Map<string, RetryRecord>();
  private readonly consumed = new Set<string>();
  private busy = false;

  serialized<T>(fn: () => T): T {
    if (this.busy) throw new Error('MemoryBackend: re-entrant append');
    this.busy = true;
    try {
      return fn();
    } finally {
      this.busy = false;
    }
  }
  head(): Entry | undefined {
    return this.log[this.log.length - 1];
  }
  get(position: number): Entry | undefined {
    return this.log[position];
  }
  entries(): readonly Entry[] {
    return this.log;
  }
  retry(actionId: string): RetryRecord | undefined {
    return this.retries.get(actionId);
  }
  isConsumed(tokenId: string): boolean {
    return this.consumed.has(tokenId);
  }
  commit(entry: Entry, retry: RetryRecord | undefined, consume: string | undefined): void {
    if (entry.position !== this.log.length) throw new Error('MemoryBackend: position is not head+1');
    this.log.push(entry);
    if (retry) this.retries.set(retry.actionId, retry);
    if (consume) this.consumed.add(consume);
  }
}

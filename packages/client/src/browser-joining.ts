/** Browser joining over a join kept in `Custody`. Host-owned origin and
 * membership version are explicit; this does not establish native admission
 * or isolate an untrusted screen. Read-session credentials stay in memory.
 *
 * The join slot holds the seat and the custody key, and the page writes it
 * before it signs. After a reload the slot names the record, and Check
 * settles the same envelope with a read. A slot from before the identifier
 * cutover names a retired room: the page removes it and says so. */
import type { MemberId, Receipt, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isMemberId, isRecord, isScopeRef, parseStrict, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { ScopeHandle } from "./handle.ts";
import { httpTransport, type Fetch } from "./http.ts";
import { signedIntent, type Signer } from "./intent.ts";
import { invitationOf, wellFormedInvitation, type InvitationLink } from "./invitation.ts";
import { invitationServiceUrl } from "./invitation-service.ts";
import { invitationRedemptionFields, isInvitationRedemptionFields, usesInvitationKey } from "./invitation-fields.ts";
import { requestSession, signerSessionRequest } from "./session.ts";
import { meaningOf, validKey, type ClientCustodyStore, type CustodyRecord, type Envelope } from "./custody.ts";
import { browserRequests, requestKey, RETIRED_REQUEST, unsentError, type BrowserRequests, type RequestSettled } from "./browser-request.ts";
import type { BrowserCustodyLock } from "./browser-storage.ts";

export interface Seat { origin: string; directory: ScopeRef; membership: ScopeRef; handle: MemberId }
export interface InvitationContext { origin: string; membershipDefinition: string }
export type Invited = { ok: true; link: InvitationLink; seat: Seat } | { ok: false; reason: string };
/** The join slot: the seat, and the key of the join's custody record. */
export interface KeptJoin { v: 2; seat: Seat; key: string }
/** `clear` keeps a verified seat before removing the pointer. An asynchronous host rechecks `current` after its awaits. */
export interface JoinStore { load(): Promise<unknown>; save(value: KeptJoin): Promise<void>; clear(outcome: "joined" | "refused" | "unsigned" | "retired", current?: () => boolean): Promise<void> }
export type JoinOutcome = { status: "joined"; seat: Seat } | { status: "refused"; reason: string }
  | { status: "unknown"; reason: string; seat?: Seat } | { status: "nothing-sent"; reason: string } | { status: "retired"; reason: string };
export interface Joining {
  join(link: InvitationLink, seat: Seat): Promise<JoinOutcome>;
  pending(): Promise<Seat | null>;
  /** May authenticate reads; submits no new join. */
  check(): Promise<JoinOutcome | null>;
  /** Uses only the original retained signature and lifetime. */
  continueOriginal(): Promise<JoinOutcome | null>;
  /** Removes a join slot of the retired format and gives the words that say so; null when there was none. */
  retired(): Promise<string | null>;
}
export interface JoiningOptions extends InvitationContext { lock: BrowserCustodyLock; store: JoinStore; custody: ClientCustodyStore; current?: () => boolean; now?: () => number; fetch?: Fetch; actFetch?: Fetch }
const closed = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function configured(context: InvitationContext): boolean {
  const service = invitationServiceUrl(context.origin);
  return !!service && service.origin === context.origin && service.pathname === "/"
    && (usesInvitationKey(context.membershipDefinition) || isInvitationRedemptionFields(context.membershipDefinition, { invitation: 1, secret: "" }));
}
function validSeat(value: unknown, origin: string): value is Seat {
  return closed(value, ["origin", "directory", "membership", "handle"]) && value["origin"] === origin
    && isScopeRef(value["directory"])
    && isScopeRef(value["membership"]) && isMemberId(value["handle"]);
}
function offered(link: InvitationLink, context: InvitationContext): Invited {
  if (!configured(context) || !wellFormedInvitation(link)) return { ok: false, reason: "That is not an invitation for this browser." };
  const service = invitationServiceUrl(link.service);
  if (!service || service.origin !== context.origin || service.pathname !== "/") return { ok: false, reason: "This invitation is for another service." };
  if (link.definition !== context.membershipDefinition) return { ok: false, reason: "This invitation is for a different room." };
  const seat = { origin: context.origin, directory: link.repository.directory, membership: link.repository.membership, handle: link.handle as MemberId };
  return validSeat(seat, context.origin) ? { ok: true, link, seat } : { ok: false, reason: "The invitation's handle or room is invalid." };
}
export function readBrowserInvitation(text: string, context: InvitationContext): Invited {
  const typed = text.trim();
  if (typed.length > 16384) return { ok: false, reason: "That is too long to be an invitation." };
  const link = invitationOf(typed, context.origin);
  return link ? offered(link, context) : { ok: false, reason: "That is not an invitation link." };
}
const refusalWords = (reason: string): string =>
  `${reason === "guard-failed" ? "The room did not accept this invitation. It may be used, ended or mistyped." : reason === "unauthorized" ? "The room does not allow this join." : "The room refused the join."} (${reason})`;
/** A join slot from before the identifier cutover: version 1 held the signed envelope itself. */
const retiredJoin = (value: unknown): boolean => isRecord(value) && value["v"] === 1 && Object.hasOwn(value, "kept");

export function browserJoining(signer: Signer, options: JoiningOptions): Joining {
  const policy = { origin: options.origin, membershipDefinition: options.membershipDefinition }, membershipDefinition = policy.membershipDefinition;
  if (!configured(policy)) throw new Error("The configured browser join context is unsupported.");
  const now = options.now ?? (() => Date.now()), usable = options.current ?? (() => true);
  const validJoin = (value: unknown): value is KeptJoin => closed(value, ["v", "seat", "key"]) && value["v"] === 2 && validSeat(value["seat"], policy.origin) && validKey(value["key"]);
  /** The join record must be a join of this device to the seat's membership, with the fields of this membership version. */
  const validRecord = (record: CustodyRecord, seat: Seat): boolean => {
    const intent = record.envelope.signed.intent;
    return intent.kind === "join" && intent.actor === signer.key && canonicalize(intent.to) === canonicalize(seat.membership) && isInvitationRedemptionFields(membershipDefinition, intent.fields);
  };
  const current = () => { if (!usable()) throw new Error("This join context is no longer current."); };
  // ScopeHandle may make a diagnostic fallback read. Each actual request still needs this context's authority.
  const contextFetch = (provided?: Fetch): Fetch => (url, init) => {
    current();
    const send = provided ?? (globalThis as { fetch?: Fetch }).fetch;
    if (!send) throw new Error("This browser has no request transport.");
    return send(url, init);
  };
  const readFetch = contextFetch(options.fetch), actFetch = contextFetch(options.actFetch ?? options.fetch);
  const transport = (origin: string, fetch: Fetch) => httpTransport(origin, { fetch });
  const requests = (seat: Seat): BrowserRequests => {
    // A person who has not joined has no read session. Settlement by the exact signed request needs none.
    const reads = new ScopeHandle(transport(seat.origin, readFetch), seat.membership.scope, null);
    return browserRequests(options.custody, { service: seat.origin, membership: null, signer: signer.key, target: seat.membership }, {
      current: usable,
      post: (envelope) => new ScopeHandle(transport(seat.origin, actFetch), seat.membership.scope, null).submit(envelope.signed, [], envelope.beside),
      recorded: async (receipt: Receipt, envelope: Envelope) => {
        current();
        if (receipt.definition !== membershipDefinition || receipt.intent !== intentDigest(envelope.signed.intent) || canonicalize(receipt.fact.at) !== canonicalize(seat.membership)) return false;
        // Reading the recorded entry needs a session. If the join took effect, this device is a member
        // and the room gives its key one; if the room gives none, the join is not verified.
        const asked = await signerSessionRequest(seat.membership, signer, timeOf(now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16))));
        current();
        const session = await requestSession(seat.origin, seat.membership.scope, asked, { fetch: readFetch });
        current();
        if (!session.ok || session.session.claims.member !== seat.handle) return false;
        const followed = await new ScopeHandle(transport(seat.origin, readFetch), seat.membership.scope, session.session.reader()).followReceipt(receipt);
        current();
        return followed.ok && followed.entry.input.type === "act" && canonicalize(followed.entry.input.signed) === canonicalize(envelope.signed);
      },
      settle: async (envelope) => { const answer = await reads.settle(envelope.signed); return answer.ok ? answer.value : null; },
    }, now);
  };
  const unknown = (seat: Seat): JoinOutcome => ({ status: "unknown", seat, reason: "No answer came back that could be trusted. The original join is kept. Check it; do not use the invitation again." });
  /** Tell the person what the join settled. The slot goes only after a final outcome of this exact join. */
  const conclude = async (held: KeptJoin, settled: RequestSettled): Promise<JoinOutcome> => {
    current();
    if (settled.status === "unknown") return unknown(held.seat);
    const latest = await options.store.load(); current();
    if (!validJoin(latest) || latest.key !== held.key) return { status: "unknown", seat: held.seat, reason: "The original join is kept. Check it." };
    await options.store.clear(settled.status === "recorded" ? "joined" : "refused", usable); current();
    return settled.status === "recorded" ? { status: "joined", seat: held.seat } : { status: "refused", reason: refusalWords(settled.reason) };
  };
  /** The slot as it is: null when empty, a retired slot removed, or the slot with its record. */
  const held = async (): Promise<null | JoinOutcome | { join: KeptJoin; record: CustodyRecord | null; requests: BrowserRequests }> => {
    current(); const value = await options.store.load(); current();
    if ((value ?? null) === null) return null;
    if (retiredJoin(value)) { await options.store.clear("retired", usable); current(); return { status: "retired", reason: RETIRED_REQUEST }; }
    if (!validJoin(value)) return { status: "unknown", reason: "The kept join cannot be read. It stays in this browser." };
    const requests_ = requests(value.seat);
    let record: CustodyRecord | null;
    try { record = await requests_.find(value.key); }
    catch { current(); return { status: "unknown", seat: value.seat, reason: "The kept join cannot be read. It stays in this browser." }; }
    current();
    if (record && !validRecord(record, value.seat)) return { status: "unknown", seat: value.seat, reason: "The kept join cannot be read. It stays in this browser." };
    return { join: value, record, requests: requests_ };
  };
  /** A slot with no record: the page wrote the slot and stopped before it signed. Nothing was signed or sent. */
  const unsigned = async (): Promise<JoinOutcome> => {
    current();
    await options.store.clear("unsigned", usable); current();
    return { status: "nothing-sent", reason: "The join was not signed. Nothing was sent. Use the invitation again." };
  };
  return {
    join(link, seat) {
      let owned: { link: InvitationLink; seat: Seat };
      try {
        const bytes = canonicalize({ link, seat });
        if (utf8(bytes).length > 16384) throw new Error("oversize join context");
        owned = parseStrict(bytes) as typeof owned;
        const invitation = offered(owned.link, policy);
        if (!invitation.ok || canonicalize(invitation.seat) !== canonicalize(owned.seat)) throw new Error("different join context");
      } catch { return Promise.resolve({ status: "nothing-sent", reason: "The invitation and room do not match this browser. Nothing was sent." }); }
      const { link: originalLink, seat: originalSeat } = owned;
      return options.lock.run(async (): Promise<JoinOutcome> => {
        current();
        const earlier = await options.store.load(); current();
        if (retiredJoin(earlier)) { await options.store.clear("retired", usable); current(); return { status: "retired", reason: RETIRED_REQUEST }; }
        if ((earlier ?? null) !== null) return { status: "nothing-sent", reason: "An earlier join is kept. Check it first." };
        const join: KeptJoin = { v: 2, seat: originalSeat, key: requestKey() };
        try { await options.store.save(join); current(); }
        catch { current(); return { status: "nothing-sent", reason: "The join could not be kept. Nothing was sent." }; }
        const meaning = meaningOf({ kind: "join", membership: originalSeat.membership, invitation: originalLink.invitation, handle: originalSeat.handle });
        const build = async () => {
          const signed = await signedIntent(signer, { to: originalSeat.membership, kind: "join", fields: invitationRedemptionFields(membershipDefinition, originalSeat.membership, originalLink.invitation, signer.key, originalLink.secret), expected: {} }, { now: now(), idempotencyKey: join.key });
          current();
          return { binding: { definition: membershipDefinition, kind: "join", declaration: null, pinned: membershipDefinition as never }, envelope: { signed, beside: {} } };
        };
        let settled: RequestSettled;
        try { settled = await requests(originalSeat).send(join.key, meaning, build, { notAfter: timeOf(now() + 60_000) }); }
        catch (error) {
          current();
          if (!unsentError(error)) return unknown(originalSeat);
          // Only a successful empty read proves that the slot has no custody record.
          let record: CustodyRecord | null;
          try { record = await requests(originalSeat).find(join.key); }
          catch { current(); return unknown(originalSeat); }
          current();
          if (record) return unknown(originalSeat);
          await options.store.clear("unsigned", usable); current();
          return { status: "nothing-sent", reason: "The join could not be signed and kept. Nothing was sent." };
        }
        return conclude(join, settled);
      });
    },
    continueOriginal() {
      return options.lock.run(async () => {
        const found = await held();
        current();
        if (found === null || "status" in found) return found;
        if (!found.record) return unsigned();
        const deadline = timeMs(found.record.envelope.signed.intent.notAfter);
        if (deadline === null || now() >= deadline) return { status: "unknown" as const, seat: found.join.seat, reason: "The original join's deadline has passed. This press sent nothing, and an earlier send of this join has no known outcome. Check it; do not use the invitation again." };
        const record = found.record;
        let settled: RequestSettled;
        try { settled = await found.requests.send(found.join.key, record.meaning, async () => { throw new Error("A kept join is never signed again."); }, { notAfter: timeOf(now() + 60_000) }); }
        catch { current(); return unknown(found.join.seat); }
        return conclude(found.join, settled);
      });
    },
    retired() {
      return options.lock.run(async () => {
        current(); const value = await options.store.load(); current();
        if (!retiredJoin(value)) return null;
        await options.store.clear("retired", usable); current();
        return RETIRED_REQUEST;
      });
    },
    async pending() { current(); const value = await options.store.load(); current(); return validJoin(value) ? value.seat : null; },
    check() {
      return options.lock.run(async () => {
        const found = await held();
        current();
        if (found === null || "status" in found) return found;
        if (!found.record) return unsigned();
        let settled: RequestSettled | null;
        try { settled = await found.requests.settle(found.join.key); } catch { current(); return unknown(found.join.seat); }
        return conclude(found.join, settled ?? { status: "unknown" });
      });
    },
  };
}

/** Browser joining over exact kept signed requests. Host-owned origin and
 * membership version are explicit; this does not establish native admission
 * or isolate an untrusted screen. Read-session credentials stay in memory. */
import type { KeyId, MemberId, Receipt, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isMemberId, isRecord, isScopeRef, parseStrict, timeMs, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { ScopeHandle } from "./handle.ts";
import { httpTransport, type Fetch } from "./http.ts";
import { signedIntent, type Signer } from "./intent.ts";
import { invitationOf, wellFormedInvitation, type InvitationLink } from "./invitation.ts";
import { invitationServiceUrl } from "./invitation-service.ts";
import { invitationRedemptionFields, isInvitationRedemptionFields, usesInvitationKey } from "./invitation-fields.ts";
import { requestSession, signerSessionRequest } from "./session.ts";
import { advance, envelopeKey, validKept, type Binding, type CustodyLock, type Envelope, type Kept, type KeptStore, type Ports } from "./request-custody.ts";

export interface Seat { origin: string; directory: ScopeRef; membership: ScopeRef; handle: MemberId }
export interface InvitationContext { origin: string; membershipDefinition: string }
export type Invited = { ok: true; link: InvitationLink; seat: Seat } | { ok: false; reason: string };
export interface KeptJoin { v: 1; seat: Seat; kept: Kept }
export interface JoinStore { load(): Promise<unknown>; save(value: KeptJoin): Promise<void>; clear(): Promise<void> }
export type JoinOutcome = { status: "joined"; seat: Seat } | { status: "refused"; reason: string }
  | { status: "unknown"; reason: string; seat?: Seat } | { status: "nothing-sent"; reason: string };
export interface Joining {
  join(link: InvitationLink, seat: Seat): Promise<JoinOutcome>;
  pending(): Promise<Seat | null>;
  /** May authenticate reads; submits no new join. */
  check(): Promise<JoinOutcome | null>;
  /** Uses only the original retained signature and lifetime. */
  continueOriginal(): Promise<JoinOutcome | null>;
}
export interface JoiningOptions extends InvitationContext { lock: CustodyLock; store: JoinStore; current?: () => boolean; now?: () => number; fetch?: Fetch; actFetch?: Fetch }
const closed = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function configured(context: InvitationContext): boolean {
  const service = invitationServiceUrl(context.origin);
  return !!service && service.origin === context.origin && service.pathname === "/"
    && (usesInvitationKey(context.membershipDefinition) || isInvitationRedemptionFields(context.membershipDefinition, { invitation: 1, secret: "" }));
}
function validSeat(value: unknown, origin: string): value is Seat {
  return closed(value, ["origin", "directory", "membership", "handle"]) && value["origin"] === origin
    && isScopeRef(value["directory"]) && value["directory"].kind === "directory"
    && isScopeRef(value["membership"]) && value["membership"].kind === "membership" && isMemberId(value["handle"]);
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
  const link = invitationOf(typed);
  return link ? offered(link, context) : { ok: false, reason: "That is not an invitation link." };
}
const joinBinding = (seat: Seat, key: KeyId): Binding => ({ scope: seat.membership, publicKey: key, kinds: ["join"] });
const refusalWords = (reason: string): string =>
  `${reason === "guard-failed" ? "The room did not accept this invitation. It may be used, ended or mistyped." : reason === "unauthorized" ? "The room does not allow this join." : "The room refused the join."} (${reason})`;

export function browserJoining(signer: Signer, options: JoiningOptions): Joining {
  const policy = { origin: options.origin, membershipDefinition: options.membershipDefinition }, membershipDefinition = policy.membershipDefinition;
  if (!configured(policy)) throw new Error("The configured browser join context is unsupported.");
  const now = options.now ?? (() => Date.now()), usable = options.current ?? (() => true);
  const validJoin = (value: unknown, key: KeyId): value is KeptJoin => {
    try {
      return closed(value, ["v", "seat", "kept"]) && value["v"] === 1 && validSeat(value["seat"], policy.origin)
        && validKept(value["kept"], joinBinding(value["seat"], key))
        && isInvitationRedemptionFields(membershipDefinition, value["kept"].envelope.signed.intent.fields);
    } catch { return false; }
  };
  const current = () => { if (!usable()) throw new Error("This join context is no longer current."); };
  const transport = (origin: string, fetch?: Fetch) => httpTransport(origin, fetch ? { fetch } : {});
  const ports = (seat: Seat): Ports => {
    // A person who has not joined has no read session. Settlement by the exact signed request needs none.
    const reads = new ScopeHandle(transport(seat.origin, options.fetch), seat.membership.scope, null);
    return {
      current: usable,
      post: (envelope) => new ScopeHandle(transport(seat.origin, options.actFetch ?? options.fetch), seat.membership.scope, null).submit(envelope.signed, envelope.grants, envelope.beside),
      recorded: async (receipt: Receipt, envelope: Envelope) => {
        if (receipt.definition !== membershipDefinition || receipt.intent !== intentDigest(envelope.signed.intent) || canonicalize(receipt.fact.at) !== canonicalize(seat.membership)) return false;
        // Reading the recorded entry needs a session. If the join took effect, this device is a member
        // and the room gives its key one; if the room gives none, the join is not verified.
        const asked = await signerSessionRequest(seat.membership, signer, timeOf(now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16))));
        const session = await requestSession(seat.origin, seat.membership.scope, asked, options.fetch ? { fetch: options.fetch } : {});
        if (!session.ok || session.session.claims.member !== seat.handle) return false;
        const followed = await new ScopeHandle(transport(seat.origin, options.fetch), seat.membership.scope, session.session.reader()).followReceipt(receipt);
        return followed.ok && followed.entry.input.type === "act" && canonicalize(followed.entry.input.signed) === canonicalize(envelope.signed);
      },
      settle: async (envelope) => { const answer = await reads.settle(envelope.signed); return answer.ok ? answer.value : null; },
    };
  };
  const inner = (held: KeptJoin): KeptStore => ({ load: async () => { const now = await options.store.load(); return validJoin(now, signer.key) ? now.kept : null; },
    save: (kept) => options.store.save({ v: 1, seat: held.seat, kept }), clear: () => options.store.clear() });
  const conclude = async (held: KeptJoin, readOnly: boolean, continueOriginal = false): Promise<JoinOutcome> => {
    current();
    const settled = await advance(inner(held), joinBinding(held.seat, signer.key), ports(held.seat), held.kept.envelope, readOnly, continueOriginal);
    current();
    if (settled.status === "unknown") return { status: "unknown", seat: held.seat, reason: "No answer came back that could be trusted. The original join is kept. Check it; do not use the invitation again." };
    const latest = await options.store.load(); current();
    if (!validJoin(latest, signer.key) || envelopeKey(latest.kept.envelope) !== envelopeKey(held.kept.envelope) || latest.kept.phase !== settled.status)
      return { status: "unknown", seat: held.seat, reason: "The original join is kept. Check it." };
    // Clear only after the exact terminal custody mark was committed.
    await options.store.clear(); current();
    return settled.status === "recorded" ? { status: "joined", seat: held.seat } : { status: "refused", reason: refusalWords(settled.reason) };
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
        if ((await options.store.load() ?? null) !== null) return { status: "nothing-sent", reason: "An earlier join is kept. Check it first." };
        current();
        let held: KeptJoin;
        try {
          const signed = await signedIntent(signer, { to: originalSeat.membership, kind: "join", fields: invitationRedemptionFields(membershipDefinition, originalSeat.membership, originalLink.invitation, signer.key, originalLink.secret), expected: {} }, { now: now() }); current();
          held = { v: 1, seat: originalSeat, kept: { v: 1, kind: "join", envelope: { signed, grants: [], beside: {} }, phase: "prepared" } };
          if (!validJoin(held, signer.key)) throw new Error("not a join of this device");
          await options.store.save(held); current();
        } catch { return { status: "nothing-sent", reason: "The join could not be signed and kept. Nothing was sent." }; }
        return conclude(held, false);
      });
    },
    continueOriginal() {
      return options.lock.run(async () => {
        current(); const held = await options.store.load(); current();
        if ((held ?? null) === null) return null;
        if (!validJoin(held, signer.key)) return { status: "unknown" as const, reason: "The kept join cannot be read. It stays in this browser." };
        const deadline = timeMs(held.kept.envelope.signed.intent.notAfter);
        if (deadline === null || now() >= deadline) return { status: "unknown" as const, seat: held.seat, reason: "The original join's deadline has passed. Check it; nothing was sent." };
        return conclude(held, false, true);
      });
    },
    async pending() { current(); const held = await options.store.load(); current(); return validJoin(held, signer.key) ? held.seat : null; },
    check() {
      return options.lock.run(async () => {
        current(); const held = await options.store.load(); current();
        if ((held ?? null) === null) return null;
        if (!validJoin(held, signer.key)) return { status: "unknown" as const, reason: "The kept join cannot be read. It stays in this browser." };
        return conclude(held, true);
      });
    },
  };
}

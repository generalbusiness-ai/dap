// The fixed foundation F0 (design note §2; spike plan §2).
//
// System kinds, their audiences and required capabilities, the foundation
// fold (participation, grants, revocations, attach, invite issuance and
// redemption, disclosure, observe, close), the bootstrap entitlement and
// the namespace check. Scope transfer, admission of external assertions
// and sequencing-control kinds are named here but not folded in V1; they
// are O3, O4 and later.
//
// Every system payload is validated before use. A malformed payload is a
// deterministic ineffective verdict with the narrowest audience, the
// actor alone, so bad data is never served to anyone else.

import { createHash } from 'node:crypto';
import { canonicalize as canonicalWire, envelopeId } from './codec.ts';
import { contentId, type Json } from './canon.ts';
import { snapshot } from './append.ts';
import {
  attach as attachPackage,
  bindingId,
  emptyEnvironment,
  findModel,
  type AttachResolution,
  type Environment,
  type PackageDescriptor,
  packageIn,
} from './descriptor.ts';
import {
  MEMBERS,
  SPINE,
  SYSTEM_PREFIX,
  named,
  type Audience,
  type Entry,
  type EventBody,
  type Header,
  type Kind,
  type Principal,
  type Verdict,
} from './types.ts';

export const RUNTIME = 'dap.fixture.ts/1';

export const K = {
  genesis: SYSTEM_PREFIX + 'genesis',
  attach: SYSTEM_PREFIX + 'attach',
  invite: SYSTEM_PREFIX + 'invite',
  accept_invite: SYSTEM_PREFIX + 'accept_invite',
  grant: SYSTEM_PREFIX + 'grant',
  revoke: SYSTEM_PREFIX + 'revoke',
  disclose: SYSTEM_PREFIX + 'disclose',
  admit: SYSTEM_PREFIX + 'admit',
  observe: SYSTEM_PREFIX + 'observe',
  close: SYSTEM_PREFIX + 'close',
  scope_release: SYSTEM_PREFIX + 'scope.release',
  scope_activate: SYSTEM_PREFIX + 'scope.activate',
  seq_request: SYSTEM_PREFIX + 'seq.request',
  seq_assign: SYSTEM_PREFIX + 'seq.assign',
  seq_seal: SYSTEM_PREFIX + 'seq.seal',
} as const;

/** Capabilities the foundation defines; each is the name of the kind it permits. */
export const CAP = {
  attach: K.attach,
  invite: K.invite,
  grant: K.grant,
  disclose: K.disclose,
  admit: K.admit,
  observe: K.observe,
  close: K.close,
  foundation: SYSTEM_PREFIX + 'foundation',
} as const;

/** The system kinds table of design note §2: audience rule and required capability. */
export const SYSTEM_KINDS: Record<string, { audience: 'spine' | 'members' | 'inviter_invitee' | 'recipients_actor' | 'declared'; requires: string | null }> = {
  [K.genesis]: { audience: 'spine', requires: null },
  [K.attach]: { audience: 'spine', requires: CAP.attach },
  [K.invite]: { audience: 'inviter_invitee', requires: CAP.invite },
  [K.accept_invite]: { audience: 'spine', requires: null },
  [K.grant]: { audience: 'spine', requires: CAP.grant },
  [K.revoke]: { audience: 'spine', requires: CAP.grant },
  [K.disclose]: { audience: 'members', requires: CAP.disclose },
  [K.admit]: { audience: 'declared', requires: CAP.admit },
  [K.observe]: { audience: 'members', requires: CAP.observe },
  [K.close]: { audience: 'spine', requires: CAP.close },
  [K.scope_release]: { audience: 'spine', requires: K.scope_release },
  [K.scope_activate]: { audience: 'spine', requires: null },
  [K.seq_request]: { audience: 'spine', requires: K.seq_request },
  [K.seq_assign]: { audience: 'spine', requires: null },
  [K.seq_seal]: { audience: 'spine', requires: null },
};

/** Kinds V1 does not fold. They are sequenced, known, and ineffective with `not_in_v1`. */
export const NOT_IN_V1: ReadonlySet<string> = new Set([K.admit, K.scope_release, K.scope_activate, K.seq_request, K.seq_assign, K.seq_seal]);

/** F0's content id: the system kinds table, the capability names and the runtime. */
export const F0_ID = contentId({
  name: SYSTEM_PREFIX + 'foundation',
  runtime: RUNTIME,
  kinds: SYSTEM_KINDS as unknown as Json,
  capabilities: Object.values(CAP).sort(),
});

// ----- payload shapes -----

export interface GrantSpec {
  principal: Principal;
  capabilities?: string[];
  roles?: string[];
}

export interface GenesisPayload {
  foundation: string;
  runtime: string;
  sequencing: { profile: 'single-writer' | 'dap.fixture.single-writer/1' | 'dap.fixture.single-writer/2'; writer: Principal; control?: Principal };
  grants: GrantSpec[];
  /** descriptor ids of packages attached at genesis, with resolutions */
  bindings: { package: string; resolution?: AttachResolution }[];
  /** adopted origins, bytes retained */
  origins: EventBody[];
  referents: string[];
  route: string;
}

export interface InvitePayload {
  invitee: Principal;
  grants: GrantSpec;
  token_id: string;
}

export interface AcceptInvitePayload {
  /** the invite event's own committed body and its header (spike plan §2) */
  invite: { event: EventBody; header: Header; actorSig?: string };
}

export interface AttachPayload {
  package: string;
  resolution?: AttachResolution;
  /** narrower audience, at the author's risk (design note §2); every kind the package declares is capped to it */
  audience?: Principal[];
}

export interface DisclosePayload {
  positions: number[];
  to: Principal[];
}

export interface ObservePayload {
  fact: Json;
  audience?: Principal[];
}

// ----- foundation state -----

export interface GrantRecord {
  position: number;
  op: 'grant' | 'revoke';
  principal: Principal;
  capability: string;
}

export interface InviteRecord {
  /** the token identity: the content id of the effective invite entry */
  tokenId: string;
  position: number;
  issuer: Principal;
  invitee: Principal;
  grants: GrantSpec;
}

export interface FoundationState {
  genesisId: string;
  participants: Principal[];
  /** every grant and revocation with its position; authority at a position is derived from it */
  grantHistory: GrantRecord[];
  /** effective issuances, keyed by the invite entry's content id */
  invites: Record<string, InviteRecord>;
  /** tokens redeemed by an effective accept, as the fold sees them */
  redeemed: string[];
  env: Environment;
  closed: boolean;
  disclosures: { position: number; to: Principal[]; positions: number[] }[];
  /** audience assigned at each position */
  audiences: Audience[];
  /** participants after each position */
  membersAt: Principal[][];
  /** the kind recorded at each position the folder has seen */
  kindsAt: (string | undefined)[];
  verdicts: Verdict[];
  /** model states by model id */
  models: Record<string, Json>;
}

export function initialFoundationState(genesisId: string): FoundationState {
  return {
    genesisId,
    participants: [],
    grantHistory: [],
    invites: {},
    redeemed: [],
    env: emptyEnvironment(RUNTIME),
    closed: false,
    disclosures: [],
    audiences: [],
    membersAt: [],
    kindsAt: [],
    verdicts: [],
    models: {},
  };
}

// ----- validation -----

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);
const isIntArr = (x: unknown): x is number[] => Array.isArray(x) && x.every((n) => Number.isSafeInteger(n) && n >= 0);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function validGrantSpec(x: unknown): x is GrantSpec {
  return isObj(x) && isStr(x.principal) && (x.capabilities === undefined || isStrArr(x.capabilities)) && (x.roles === undefined || isStrArr(x.roles));
}

/** Validate a system payload. Returns the typed payload or undefined. */
function validPayload(kind: Kind, payload: unknown): unknown | undefined {
  switch (kind) {
    case K.attach:
      return isObj(payload) && isStr(payload.package) && (payload.audience === undefined || isStrArr(payload.audience)) && (payload.resolution === undefined || isObj(payload.resolution)) ? payload : undefined;
    case K.invite:
      return isObj(payload) && isStr(payload.invitee) && isStr(payload.token_id) && validGrantSpec(payload.grants) ? payload : undefined;
    case K.accept_invite: {
      if (!isObj(payload) || !isObj(payload.invite)) return undefined;
      const inv = payload.invite;
      return isObj(inv.event) && isObj(inv.header) && Number.isSafeInteger(inv.header.position) && isStr(inv.header.commitment) ? payload : undefined;
    }
    case K.grant:
    case K.revoke:
      return validGrantSpec(payload) ? payload : undefined;
    case K.disclose:
      return isObj(payload) && isIntArr(payload.positions) && isStrArr(payload.to) ? payload : undefined;
    case K.observe:
      return isObj(payload) && 'fact' in payload && (payload.audience === undefined || isStrArr(payload.audience)) ? payload : undefined;
    case K.close:
      return payload === null || isObj(payload) ? payload ?? {} : undefined;
    default:
      return payload;
  }
}

// ----- authority -----

function roleCapabilities(env: Environment, role: string): string[] {
  for (const pkg of env.packages) {
    for (const m of Object.values(pkg.models)) {
      const caps = m.roles?.[role];
      if (caps) return caps;
    }
  }
  return [];
}

/** Whether `principal` holds `capability` judging by grants strictly before `position`. */
export function heldAt(state: { grantHistory: readonly GrantRecord[] }, principal: Principal, capability: string, position: number): boolean {
  let held = false;
  for (const g of state.grantHistory) {
    if (g.position >= position) break;
    if (g.principal !== principal || g.capability !== capability) continue;
    held = g.op === 'grant';
  }
  return held;
}

export function holdsNow(state: FoundationState, principal: Principal, capability: string): boolean {
  return heldAt(state, principal, capability, Number.MAX_SAFE_INTEGER);
}

function applyGrant(state: FoundationState, position: number, spec: GrantSpec, op: 'grant' | 'revoke'): void {
  const caps = new Set<string>(spec.capabilities ?? []);
  for (const r of spec.roles ?? []) for (const c of roleCapabilities(state.env, r)) caps.add(c);
  for (const c of [...caps].sort()) state.grantHistory.push({ position, op, principal: spec.principal, capability: c });
}

// ----- audiences -----

function systemAudience(kind: Kind, event: EventBody): Audience {
  const row = SYSTEM_KINDS[kind];
  if (!row) return MEMBERS;
  switch (row.audience) {
    case 'spine':
      return SPINE;
    case 'members':
      return MEMBERS;
    case 'inviter_invitee': {
      const p = event.payload as unknown as InvitePayload;
      return named(event.actor, p.invitee);
    }
    case 'recipients_actor': {
      const p = event.payload as unknown as DisclosePayload;
      return named(event.actor, ...p.to);
    }
    case 'declared':
      return MEMBERS;
  }
}

/** Apply an attachment ceiling: nothing a capped package declares is visible beyond the cap. */
function capped(aud: Audience, ceiling: Principal[] | undefined, members: Principal[]): Audience {
  if (!ceiling) return aud;
  if (aud.kind === 'spine') return named(...ceiling);
  if (aud.kind === 'members') return named(...members.filter((p) => ceiling.includes(p)));
  return named(...aud.principals.filter((p) => ceiling.includes(p)));
}

// ----- the fold -----

export interface FoldInput {
  entry: Entry;
  origin: boolean;
  /** descriptor lookup for attach and genesis bindings */
  packages: Record<string, PackageDescriptor>;
  /** the chain so far, for verifying embedded headers */
  entries: readonly Entry[];
}

export type GenesisErrorCode = 'duplicate_origin' | 'no_writer' | 'foundation_mismatch' | 'origin_bound' | 'system_origin';

export interface GenesisError extends Error {
  code: GenesisErrorCode;
}

export function genesisError(code: GenesisErrorCode, message: string): GenesisError {
  const e = new Error(message) as GenesisError;
  e.code = code;
  return e;
}

/**
 * Fold one sequenced entry into the foundation state. Mutates and returns
 * the verdict. Application kinds are dispatched to their handlers through
 * the environment; system kinds are handled here.
 */
export function foldEntry(state: FoundationState, input: FoldInput): Verdict {
  const { entry, origin, packages, entries } = input;
  const ev = entry.event;
  const pos = entry.position;
  const membersBefore = [...state.participants];
  let verdict: Verdict;
  let audience: Audience | undefined;
  let modelsBefore: FoundationState['models'] | undefined;

  if (pos === 0) {
    verdict = foldGenesis(state, ev, packages);
  } else if (origin) {
    verdict = foldOrigin(state, entry, entries);
  } else if (ev.kind.startsWith(SYSTEM_PREFIX)) {
    const v = validPayload(ev.kind, ev.payload);
    if (v === undefined) {
      verdict = { known: true, authorized: false, effective: false, reason: 'malformed' };
      audience = named(ev.actor);
    } else {
      try {
        verdict = foldSystem(state, entry, packages, entries);
      } catch (e) {
        verdict = { known: true, authorized: false, effective: false, reason: 'fold_error:' + (e instanceof Error ? e.message : String(e)) };
        audience = named(ev.actor);
      }
      // An effective ambient fact is folded by every model that opted in; the system verdict
      // stands, and each model's own outcome is recorded beside it.
      if ((ev.kind === K.observe || ev.kind === K.disclose) && verdict.effective) {
        const ambient = state.env.packages.flatMap((p) => Object.values(p.models).filter((m) => m.ambient).map((m) => m.id));
        if (ambient.length) verdict = { ...verdict, perModel: dispatch(state, entry, ambient, false, entries).perModel };
      }
    }
  } else {
    // Handlers receive cloned inputs. Keep the original values until the
    // audience succeeds, so a refused event cannot leave a model effect.
    modelsBefore = { ...state.models };
    verdict = foldApplication(state, entry, entries);
  }

  // Possessing a credential permits recording an attempt, not publishing
  // a private payload under a capability the actor lacks. Application
  // kinds and ambient observations keep such attempts actor-only. Check
  // the actual grant separately: stale/closed can precede authorization
  // in the verdict, and authorized semantic refusals remain public.
  const publicationCapability = !origin && pos !== 0
    ? ev.kind === K.observe ? CAP.observe : !ev.kind.startsWith(SYSTEM_PREFIX) ? state.env.kinds[ev.kind]?.capability : undefined
    : undefined;
  if (publicationCapability && !heldAt(state, ev.actor, publicationCapability, pos)) audience = named(ev.actor);

  // Audience is set at the position under the rule active before it.
  if (!audience) {
    if (origin || pos === 0) audience = SPINE;
    else if (ev.kind.startsWith(SYSTEM_PREFIX)) {
      audience = systemAudience(ev.kind, ev);
      if (ev.kind === K.attach) {
        const p = ev.payload as unknown as AttachPayload;
        if (p.audience) audience = named(ev.actor, ...p.audience);
      }
      if (ev.kind === K.observe) {
        const p = ev.payload as unknown as ObservePayload;
        if (p.audience) audience = verdict.effective ? named(ev.actor, ...p.audience) : named(ev.actor);
      }
    } else {
      const binding = state.env.kinds[ev.kind];
      // A kind no binding resolves cannot be judged, and refusing an act must not disclose its
      // payload (design note §8): the actor alone reads it.
      if (!binding) audience = named(ev.actor);
      else {
        // A model's audience rule runs on runtime JSON; if it throws, the event is recorded as
        // ineffective and readable by its actor alone, so the series stays replayable.
        try {
          const declaring = state.env.packages.find((p) => p.id === binding.packageId);
          const allowed = declaring?.kinds[ev.kind]?.handlers ?? [];
          audience = capped(binding.audience({
            position: pos,
            members: membersBefore,
            holders: (cap) => membersBefore.filter((m) => heldAt(state, m, cap, pos)),
            modelState: (id) => {
              if (!allowed.includes(id)) throw new Error('undeclared audience model read: ' + id);
              const before = modelsBefore?.[id];
              return before === undefined ? undefined : snapshot(before);
            },
          }, ev), binding.ceiling, membersBefore);
        } catch (e) {
          if (modelsBefore) state.models = modelsBefore;
          verdict = { known: true, authorized: verdict.authorized, effective: false, reason: 'audience_error:' + (e instanceof Error ? e.message : String(e)) };
          audience = named(ev.actor);
        }
      }
    }
  }
  state.audiences[pos] = audience;
  state.membersAt[pos] = [...state.participants];
  state.kindsAt[pos] = ev.kind;
  state.verdicts[pos] = verdict;
  return verdict;
}

function foldGenesis(state: FoundationState, ev: EventBody, packages: Record<string, PackageDescriptor>): Verdict {
  const p = ev.payload as unknown as GenesisPayload;
  if (p.foundation !== F0_ID) throw genesisError('foundation_mismatch', 'genesis pins a different foundation');
  if (!p.sequencing?.writer) throw genesisError('no_writer', 'genesis names no writer');
  const seen = new Set<string>();
  for (const o of p.origins) {
    // An origin is a standalone assertion: it binds no genesis and no action, and it is never a system command.
    if (o.genesis !== undefined || o.action_id !== undefined) throw genesisError('origin_bound', 'an origin may not carry a genesis or an action id');
    if (o.kind.startsWith(SYSTEM_PREFIX)) throw genesisError('system_origin', 'a system kind cannot be adopted as an origin');
    const id = 'sha256:' + createHash('sha256').update(canonicalWire(o)).digest('hex');
    if (seen.has(id)) throw genesisError('duplicate_origin', `origin ${id} adopted twice`);
    seen.add(id);
  }
  state.participants = [ev.actor];
  for (const b of p.bindings) {
    const pkg = packageIn(packages, b.package);
    if (!pkg) throw genesisError('foundation_mismatch', `genesis binds unknown package ${b.package}`);
    const out = attachPackage(state.env, pkg, { resolution: b.resolution, position: 0 });
    if (!out.ok) throw genesisError('foundation_mismatch', `genesis binding refused: ${out.reason}`);
    state.env = out.env;
    for (const m of Object.values(pkg.models)) state.models[m.id] = m.init(m.config);
  }
  for (const g of p.grants) applyGrant(state, 0, g, 'grant');
  return { known: true, authorized: true, effective: true };
}

/** An adopted origin: an assertion by its original actor under the initial bindings' origin rules. */
function foldOrigin(state: FoundationState, entry: Entry, entries: readonly Entry[]): Verdict {
  const ev = entry.event;
  const binding = state.env.kinds[ev.kind];
  if (!binding) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  return dispatch(state, entry, binding.handlers, true, entries);
}

function foldSystem(state: FoundationState, entry: Entry, packages: Record<string, PackageDescriptor>, entries: readonly Entry[]): Verdict {
  const ev = entry.event;
  const pos = entry.position;
  const row = SYSTEM_KINDS[ev.kind];
  if (!row) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  if (NOT_IN_V1.has(ev.kind)) return { known: true, authorized: false, effective: false, reason: 'not_in_v1' };
  if (row.requires && !heldAt(state, ev.actor, row.requires, pos)) {
    return { known: true, authorized: false, effective: false, reason: 'unauthorized' };
  }
  switch (ev.kind) {
    case K.attach: {
      const p = ev.payload as unknown as AttachPayload;
      // The header records whether the sequencer resolved the package: an attach it could not
      // resolve is an ineffective attempt for every judge, whatever their own client can fetch
      // now or later, so the same event never changes its verdict.
      if (entry.header.requires === undefined) return { known: true, authorized: true, effective: false, reason: 'package_unavailable' };
      const pkg = packageIn(packages, p.package);
      if (!pkg) return { known: true, authorized: true, effective: false, reason: 'package_unavailable' };
      const out = attachPackage(state.env, pkg, { resolution: p.resolution, position: pos, ...(p.audience ? { ceiling: [ev.actor, ...p.audience] } : {}) });
      if (!out.ok) return { known: true, authorized: true, effective: false, reason: out.reason };
      state.env = out.env;
      for (const m of Object.values(pkg.models)) if (!(m.id in state.models)) state.models[m.id] = m.init(m.config);
      return { known: true, authorized: true, effective: true };
    }
    case K.invite: {
      const p = ev.payload as unknown as InvitePayload;
      // token_id is the inviter's label; the token's identity is this entry's content id.
      state.invites[entry.id] = { tokenId: entry.id, position: pos, issuer: ev.actor, invitee: p.invitee, grants: p.grants };
      return { known: true, authorized: true, effective: true };
    }
    case K.accept_invite:
      return foldAccept(state, entry, entries);
    case K.grant:
    case K.revoke: {
      const p = ev.payload as unknown as GrantSpec;
      applyGrant(state, pos, p, ev.kind === K.grant ? 'grant' : 'revoke');
      return { known: true, authorized: true, effective: true };
    }
    case K.disclose: {
      const p = ev.payload as unknown as DisclosePayload;
      if (p.positions.some((i) => i >= pos)) return { known: true, authorized: true, effective: false, reason: 'future_position' };
      state.disclosures.push({ position: pos, to: [...p.to], positions: [...p.positions] });
      return { known: true, authorized: true, effective: true };
    }
    case K.observe: {
      const p = ev.payload as unknown as ObservePayload;
      // A narrower audience may name only current members: members is not retroactive.
      if (p.audience && p.audience.some((r) => !state.participants.includes(r))) {
        return { known: true, authorized: true, effective: false, reason: 'audience_outside_members' };
      }
      return { known: true, authorized: true, effective: true };
    }
    case K.close:
      state.closed = true;
      return { known: true, authorized: true, effective: true };
  }
  return { known: true, authorized: true, effective: false, reason: 'unhandled' };
}

export type Issuance = { ok: true; tokenId: string; invite: InvitePayload; issuer: Principal; position: number } | { ok: false; reason: string };

/** The evidence a member needs to verify an issuance: headers of the chain and the spine's grant history. Nothing private. */
export interface IssuanceEvidence {
  headers: readonly { id: string; headerHash: string }[];
  grantHistory: readonly GrantRecord[];
}

/**
 * Verification of the issuance object an acceptance embeds, from public
 * evidence alone (spike plan §2, invitation authority): the embedded
 * committed payload, the chain's headers, and issuance-time authority
 * from the spine grant history. A member who could not read the private
 * invitation verifies exactly the same way. The token's identity is the
 * content id of the invite entry, so a tampered envelope or a different
 * issuance can never supply evidence. This checks the issuance only; who
 * may redeem it, and whether it was already redeemed, are the
 * redemption's questions.
 */
export function verifyIssuance(evidence: IssuanceEvidence, acceptPayload: unknown): Issuance {
  const v = validPayload(K.accept_invite, acceptPayload);
  if (v === undefined) return { ok: false, reason: 'malformed' };
  const emb = (v as AcceptInvitePayload).invite;
  const at = evidence.headers[emb.header.position];
  if (!at) return { ok: false, reason: 'not_in_chain' };
  let commitment: string;
  try { commitment = emb.actorSig ? envelopeId({ body: emb.event, sig: emb.actorSig }) : contentId(emb.event as unknown as Json); }
  catch { return { ok: false, reason: 'malformed' }; }
  if (at.id !== commitment || emb.header.commitment !== commitment) return { ok: false, reason: 'not_in_chain' };
  const { seq_sig: _signature, ...preimage } = emb.header;
  if (contentId(preimage as unknown as Json) !== at.headerHash) return { ok: false, reason: 'not_in_chain' };
  if (emb.event.kind !== K.invite) return { ok: false, reason: 'not_an_invite' };
  if (emb.event.genesis !== emb.header.genesis) return { ok: false, reason: 'wrong_genesis' };
  // The issuance must have been effective. Effectiveness of an invite is decided by public facts
  // alone: a well-formed payload and issuance-time authority, so the verifier recomputes it.
  if (validPayload(K.invite, emb.event.payload) === undefined) return { ok: false, reason: 'issuance_ineffective' };
  if (!heldAt({ grantHistory: evidence.grantHistory }, emb.event.actor, CAP.invite, emb.header.position)) return { ok: false, reason: 'issuer_unauthorized' };
  return { ok: true, tokenId: at.id, invite: emb.event.payload as unknown as InvitePayload, issuer: emb.event.actor, position: emb.header.position };
}

/** The evidence a member holds, drawn from a state: headers and the spine grant history. */
export function issuanceEvidence(state: Pick<FoundationState, 'grantHistory'>, entries: readonly Entry[]): IssuanceEvidence {
  return { headers: entries.map((e) => ({ id: e.id, headerHash: e.headerHash })), grantHistory: state.grantHistory };
}

/** A member's verification of an acceptance: the issuance, then the redemption. */
export function verifyEmbeddedInvite(state: FoundationState, entries: readonly Entry[], accept: EventBody): Issuance {
  const v = verifyIssuance(issuanceEvidence(state, entries), accept.payload);
  if (!v.ok) return v;
  if (v.invite.invitee !== accept.actor) return { ok: false, reason: 'wrong_invitee' };
  if (state.redeemed.includes(v.tokenId)) return { ok: false, reason: 'already_redeemed' };
  return v;
}

function foldAccept(state: FoundationState, entry: Entry, entries: readonly Entry[]): Verdict {
  const v = verifyEmbeddedInvite(state, entries, entry.event);
  if (!v.ok) return { known: true, authorized: false, effective: false, reason: v.reason };
  if (state.participants.includes(entry.event.actor)) {
    return { known: true, authorized: true, effective: false, reason: 'already_participant' };
  }
  state.redeemed.push(v.tokenId);
  state.participants.push(entry.event.actor);
  applyGrant(state, entry.position, { ...v.invite.grants, principal: entry.event.actor }, 'grant');
  return { known: true, authorized: true, effective: true };
}

function foldApplication(state: FoundationState, entry: Entry, entries: readonly Entry[]): Verdict {
  const ev = entry.event;
  const pos = entry.position;
  const binding = state.env.kinds[ev.kind];
  if (!binding) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  if (state.closed) return { known: true, authorized: false, effective: false, reason: 'closed' };
  // A sequenced application intent binds the semantics it expects (design note §3; spike plan §2).
  if (ev.expected_binding === undefined) return { known: true, authorized: false, effective: false, reason: 'no_expected_binding' };
  if (ev.expected_binding !== bindingId(state.env, ev.kind)) return { known: true, authorized: false, effective: false, reason: 'stale_binding' };
  if (binding.capability && !heldAt(state, ev.actor, binding.capability, pos)) {
    return { known: true, authorized: false, effective: false, reason: 'unauthorized' };
  }
  return dispatch(state, entry, binding.handlers, false, entries);
}

function dispatch(state: FoundationState, entry: Entry, handlers: string[], origin: boolean, entries: readonly Entry[]): Verdict {
  const ev = entry.event;
  const perModel: Verdict['perModel'] = {};
  let anyEffective = false;
  const members = [...state.participants];
  const ctx = {
    position: entry.position,
    id: entry.id,
    members,
    origin,
    holders: (cap: string) => members.filter((m) => heldAt(state, m, cap, entry.position)),
    // Public facts of the chain a model may consult: the commitment at any earlier position, hidden or
    // not (the interpreter's chain carries headers for hidden positions), and who held a capability there.
    commitmentAt: (i: number) => (i >= 0 && i <= entry.position ? entries[i]?.id : undefined),
    holdersAt: (cap: string, i: number) => (i >= 0 && i <= entry.position ? (i === entry.position ? members : (state.membersAt[i] ?? [])).filter((m) => heldAt(state, m, cap, i)) : []),
  };
  for (const modelId of handlers) {
    const model = findModel(state.env, modelId);
    if (!model) {
      perModel[modelId] = { effective: false, reason: 'model_unavailable' };
      continue;
    }
    const before = state.models[modelId] ?? model.init(model.config);
    let r;
    try {
      r = model.fold(structuredClone(before), ev, ctx, model.config);
    } catch (e) {
      perModel[modelId] = { effective: false, reason: 'fold_error:' + (e instanceof Error ? e.message : String(e)) };
      continue;
    }
    if (r.effective) {
      state.models[modelId] = r.state;
      anyEffective = true;
    }
    perModel[modelId] = { effective: r.effective, reason: r.reason };
  }
  return { known: true, authorized: true, effective: anyEffective, reason: anyEffective ? undefined : 'ineffective', perModel };
}

export type Visibility = 'audience' | 'disclosure' | 'hidden';

/** How position `i` is visible to `p` under basis `n`: by its audience, by a later disclosure, or not at all. */
export function visibilityOf(state: Pick<FoundationState, 'audiences' | 'membersAt' | 'disclosures'>, p: Principal, i: number, n: number): Visibility {
  const aud = state.audiences[i];
  if (!aud) return 'hidden';
  if (aud.kind === 'spine') return 'audience';
  if (aud.kind === 'named' && aud.principals.includes(p)) return 'audience';
  if (aud.kind === 'members' && (state.membersAt[i] ?? []).includes(p)) return 'audience';
  return state.disclosures.some((d) => d.position <= n && d.to.includes(p) && d.positions.includes(i)) ? 'disclosure' : 'hidden';
}

/** Visibility of position `i` to `p` under basis `n` (design note §1, §2 bootstrap entitlement). */
export function visibleTo(state: Pick<FoundationState, 'audiences' | 'membersAt' | 'disclosures'>, p: Principal, i: number, n: number): boolean {
  return visibilityOf(state, p, i, n) !== 'hidden';
}

/** How many adopted origins a genesis event declares. */
export function originsCount(genesis: EventBody): number {
  const p = genesis.payload as unknown as GenesisPayload;
  return Array.isArray(p?.origins) ? p.origins.length : 0;
}

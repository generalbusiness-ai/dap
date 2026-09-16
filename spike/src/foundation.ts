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

import { contentId, type Json } from './canon.ts';
import {
  attach as attachPackage,
  bindingId,
  emptyEnvironment,
  findModel,
  type AttachResolution,
  type Environment,
  type PackageDescriptor,
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
  [K.disclose]: { audience: 'recipients_actor', requires: CAP.disclose },
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
  sequencing: { profile: 'single-writer'; writer: Principal };
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
  invite: { event: EventBody; header: Header };
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
export function heldAt(state: FoundationState, principal: Principal, capability: string, position: number): boolean {
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

  if (pos === 0) {
    verdict = foldGenesis(state, ev, packages);
  } else if (origin) {
    verdict = foldOrigin(state, entry);
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
    }
  } else {
    verdict = foldApplication(state, entry);
  }

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
        if (p.audience) audience = named(ev.actor, ...p.audience);
      }
    } else {
      const binding = state.env.kinds[ev.kind];
      audience = binding ? capped(binding.audience({ position: pos, members: membersBefore }, ev), binding.ceiling, membersBefore) : MEMBERS;
    }
  }
  state.audiences[pos] = audience;
  state.membersAt[pos] = [...state.participants];
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
    const id = contentId(o as unknown as Json);
    if (seen.has(id)) throw genesisError('duplicate_origin', `origin ${id} adopted twice`);
    seen.add(id);
  }
  state.participants = [ev.actor];
  for (const b of p.bindings) {
    const pkg = packages[b.package];
    if (!pkg) throw genesisError('foundation_mismatch', `genesis binds unknown package ${b.package}`);
    const out = attachPackage(state.env, pkg, { resolution: b.resolution });
    if (!out.ok) throw genesisError('foundation_mismatch', `genesis binding refused: ${out.reason}`);
    state.env = out.env;
    for (const m of Object.values(pkg.models)) state.models[m.id] = m.init();
  }
  for (const g of p.grants) applyGrant(state, 0, g, 'grant');
  return { known: true, authorized: true, effective: true };
}

/** An adopted origin: an assertion by its original actor under the initial bindings' origin rules. */
function foldOrigin(state: FoundationState, entry: Entry): Verdict {
  const ev = entry.event;
  const binding = state.env.kinds[ev.kind];
  if (!binding) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  return dispatch(state, entry, binding.handlers, true);
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
      const pkg = packages[p.package];
      if (!pkg) return { known: true, authorized: true, effective: false, reason: 'package_unavailable' };
      const out = attachPackage(state.env, pkg, { resolution: p.resolution, ...(p.audience ? { ceiling: [ev.actor, ...p.audience] } : {}) });
      if (!out.ok) return { known: true, authorized: true, effective: false, reason: out.reason };
      state.env = out.env;
      for (const m of Object.values(pkg.models)) if (!(m.id in state.models)) state.models[m.id] = m.init();
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
    case K.observe:
      return { known: true, authorized: true, effective: true };
    case K.close:
      state.closed = true;
      return { known: true, authorized: true, effective: true };
  }
  return { known: true, authorized: true, effective: false, reason: 'unhandled' };
}

export type Issuance = { ok: true; tokenId: string; invite: InvitePayload; issuer: Principal; position: number } | { ok: false; reason: string };

/**
 * Verification of the issuance object an acceptance embeds, from the
 * chain and the spine alone (spike plan §2, invitation authority). The
 * token's identity is the content id of the effective invite entry, so
 * an ineffective duplicate or a tampered envelope can never supply
 * evidence. This checks the issuance only; who may redeem it, and
 * whether it was already redeemed, are the redemption's questions.
 */
export function verifyIssuance(state: FoundationState, entries: readonly Entry[], acceptPayload: unknown): Issuance {
  const v = validPayload(K.accept_invite, acceptPayload);
  if (v === undefined) return { ok: false, reason: 'malformed' };
  const emb = (v as AcceptInvitePayload).invite;
  const at = entries[emb.header.position];
  if (!at) return { ok: false, reason: 'not_in_chain' };
  const commitment = contentId(emb.event as unknown as Json);
  if (at.id !== commitment || emb.header.commitment !== commitment) return { ok: false, reason: 'not_in_chain' };
  if (contentId(emb.header as unknown as Json) !== at.headerHash) return { ok: false, reason: 'not_in_chain' };
  if (emb.event.kind !== K.invite) return { ok: false, reason: 'not_an_invite' };
  // The issuance must have been effective: an unauthorized or malformed invite issues nothing.
  if (!state.verdicts[emb.header.position]?.effective) return { ok: false, reason: 'issuance_ineffective' };
  // Authority is judged at issuance.
  if (!heldAt(state, emb.event.actor, CAP.invite, emb.header.position)) return { ok: false, reason: 'issuer_unauthorized' };
  return { ok: true, tokenId: at.id, invite: emb.event.payload as unknown as InvitePayload, issuer: emb.event.actor, position: emb.header.position };
}

/** A member's verification of an acceptance: the issuance, then the redemption. */
export function verifyEmbeddedInvite(state: FoundationState, entries: readonly Entry[], accept: EventBody): Issuance {
  const v = verifyIssuance(state, entries, accept.payload);
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

function foldApplication(state: FoundationState, entry: Entry): Verdict {
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
  return dispatch(state, entry, binding.handlers, false);
}

function dispatch(state: FoundationState, entry: Entry, handlers: string[], origin: boolean): Verdict {
  const ev = entry.event;
  const perModel: Verdict['perModel'] = {};
  let anyEffective = false;
  const ctx = { position: entry.position, members: [...state.participants], origin };
  for (const modelId of handlers) {
    const model = findModel(state.env, modelId);
    if (!model) {
      perModel[modelId] = { effective: false, reason: 'model_unavailable' };
      continue;
    }
    const before = state.models[modelId] ?? model.init();
    let r;
    try {
      r = model.fold(structuredClone(before), ev, ctx);
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

/** Visibility of position `i` to `p` under basis `n` (design note §1, §2 bootstrap entitlement). */
export function visibleTo(state: FoundationState, p: Principal, i: number, n: number): boolean {
  const aud = state.audiences[i];
  if (!aud) return false;
  if (aud.kind === 'spine') return true;
  if (aud.kind === 'named' && aud.principals.includes(p)) return true;
  if (aud.kind === 'members' && (state.membersAt[i] ?? []).includes(p)) return true;
  return state.disclosures.some((d) => d.position <= n && d.to.includes(p) && d.positions.includes(i));
}

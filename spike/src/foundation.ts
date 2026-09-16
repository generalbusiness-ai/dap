// The fixed foundation F0 (design note §2; spike plan §2).
//
// System kinds, their audiences and required capabilities, the foundation
// fold (participation, grants, revocations, attach, invite issuance and
// redemption, disclosure, close), the bootstrap entitlement and the
// namespace check. Scope transfer and sequencing-control kinds are named
// here but not folded in V1; they are O3 and O4.

import { contentId, type Json } from './canon.ts';
import {
  attach as attachPackage,
  bindingId,
  descriptorId,
  emptyEnvironment,
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
  /** narrower audience, at the author's risk (design note §2) */
  audience?: Principal[];
}

export interface DisclosePayload {
  positions: number[];
  to: Principal[];
}

// ----- foundation state -----

export interface GrantRecord {
  position: number;
  op: 'grant' | 'revoke';
  principal: Principal;
  capability: string;
}

export interface InviteRecord {
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

// ----- the fold -----

export interface FoldInput {
  entry: Entry;
  origin: boolean;
  /** descriptor lookup for attach and genesis bindings */
  packages: Record<string, PackageDescriptor>;
  /** the chain so far, for verifying embedded headers */
  entries: readonly Entry[];
}

export interface GenesisError extends Error {
  code: 'duplicate_origin' | 'no_writer' | 'foundation_mismatch';
}

export function genesisError(code: GenesisError['code'], message: string): GenesisError {
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

  if (pos === 0) {
    verdict = foldGenesis(state, ev, packages);
  } else if (ev.kind.startsWith(SYSTEM_PREFIX)) {
    verdict = foldSystem(state, entry, packages, entries);
  } else {
    verdict = foldApplication(state, entry, origin);
  }

  // Audience is set at the position under the rule active before it.
  let audience: Audience;
  if (origin || pos === 0) audience = SPINE;
  else if (ev.kind.startsWith(SYSTEM_PREFIX)) {
    audience = systemAudience(ev.kind, ev);
    if (ev.kind === K.attach) {
      const p = ev.payload as unknown as AttachPayload;
      if (p.audience) audience = named(ev.actor, ...p.audience);
    }
  } else {
    const binding = state.env.kinds[ev.kind];
    audience = binding ? binding.audience({ position: pos, members: membersBefore }, ev) : MEMBERS;
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
    const id = contentId(o as unknown as Json);
    if (seen.has(id)) throw genesisError('duplicate_origin', `origin ${id} adopted twice`);
    seen.add(id);
  }
  state.participants = [ev.actor];
  for (const b of p.bindings) {
    const pkg = packages[b.package];
    if (!pkg) throw genesisError('foundation_mismatch', `genesis binds unknown package ${b.package}`);
    const out = attachPackage(state.env, pkg, b.resolution);
    if (!out.ok) throw genesisError('foundation_mismatch', `genesis binding refused: ${out.reason}`);
    state.env = out.env;
    for (const m of Object.values(pkg.models)) state.models[m.id] = m.init();
  }
  for (const g of p.grants) applyGrant(state, 0, g, 'grant');
  return { known: true, authorized: true, effective: true };
}

function foldSystem(state: FoundationState, entry: Entry, packages: Record<string, PackageDescriptor>, entries: readonly Entry[]): Verdict {
  const ev = entry.event;
  const pos = entry.position;
  const row = SYSTEM_KINDS[ev.kind];
  if (!row) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  if (NOT_IN_V1.has(ev.kind)) return { known: true, authorized: false, effective: false, reason: 'not_in_v1' };
  if (state.closed && ev.kind !== K.disclose) {
    return { known: true, authorized: false, effective: false, reason: 'closed' };
  }
  if (row.requires && !heldAt(state, ev.actor, row.requires, pos)) {
    return { known: true, authorized: false, effective: false, reason: 'unauthorized' };
  }
  switch (ev.kind) {
    case K.attach: {
      const p = ev.payload as unknown as AttachPayload;
      const pkg = packages[p.package];
      if (!pkg) return { known: true, authorized: true, effective: false, reason: 'package_unavailable' };
      const out = attachPackage(state.env, pkg, p.resolution);
      if (!out.ok) return { known: true, authorized: true, effective: false, reason: out.reason };
      state.env = out.env;
      for (const m of Object.values(pkg.models)) if (!(m.id in state.models)) state.models[m.id] = m.init();
      return { known: true, authorized: true, effective: true };
    }
    case K.invite: {
      const p = ev.payload as unknown as InvitePayload;
      if (!p.invitee || !p.token_id) return { known: true, authorized: true, effective: false, reason: 'malformed' };
      if (state.invites[p.token_id]) return { known: true, authorized: true, effective: false, reason: 'duplicate_token' };
      state.invites[p.token_id] = { tokenId: p.token_id, position: pos, issuer: ev.actor, invitee: p.invitee, grants: p.grants };
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

/** Verification a member performs from the acceptance alone (spike plan §2, invitation authority). */
export function verifyEmbeddedInvite(
  state: FoundationState,
  entries: readonly Entry[],
  accept: EventBody,
): { ok: true; invite: InvitePayload; issuer: Principal; position: number } | { ok: false; reason: string } {
  const p = accept.payload as unknown as AcceptInvitePayload;
  const emb = p?.invite;
  if (!emb?.event || !emb?.header) return { ok: false, reason: 'malformed' };
  const at = entries[emb.header.position];
  if (!at) return { ok: false, reason: 'not_in_chain' };
  const commitment = contentId(emb.event as unknown as Json);
  if (at.id !== commitment || emb.header.commitment !== commitment) return { ok: false, reason: 'not_in_chain' };
  if (contentId(emb.header as unknown as Json) !== at.headerHash) return { ok: false, reason: 'not_in_chain' };
  if (emb.event.kind !== K.invite) return { ok: false, reason: 'not_an_invite' };
  const inv = emb.event.payload as unknown as InvitePayload;
  if (inv.invitee !== accept.actor) return { ok: false, reason: 'wrong_invitee' };
  // Authority is judged at issuance.
  if (!heldAt(state, emb.event.actor, CAP.invite, emb.header.position)) return { ok: false, reason: 'issuer_unauthorized' };
  if (state.redeemed.includes(inv.token_id)) return { ok: false, reason: 'already_redeemed' };
  return { ok: true, invite: inv, issuer: emb.event.actor, position: emb.header.position };
}

function foldAccept(state: FoundationState, entry: Entry, entries: readonly Entry[]): Verdict {
  const v = verifyEmbeddedInvite(state, entries, entry.event);
  if (!v.ok) return { known: true, authorized: false, effective: false, reason: v.reason };
  if (state.participants.includes(entry.event.actor)) {
    return { known: true, authorized: true, effective: false, reason: 'already_participant' };
  }
  state.redeemed.push(v.invite.token_id);
  state.participants.push(entry.event.actor);
  applyGrant(state, entry.position, { ...v.invite.grants, principal: entry.event.actor }, 'grant');
  return { known: true, authorized: true, effective: true };
}

function foldApplication(state: FoundationState, entry: Entry, origin: boolean): Verdict {
  const ev = entry.event;
  const pos = entry.position;
  const binding = state.env.kinds[ev.kind];
  if (!binding) return { known: false, authorized: false, effective: false, reason: 'unhandled' };
  if (state.closed) return { known: true, authorized: false, effective: false, reason: 'closed' };
  if (!origin) {
    if (ev.expected_binding !== undefined && ev.expected_binding !== bindingId(state.env, ev.kind)) {
      return { known: true, authorized: false, effective: false, reason: 'stale_binding' };
    }
    if (binding.capability && !heldAt(state, ev.actor, binding.capability, pos)) {
      return { known: true, authorized: false, effective: false, reason: 'unauthorized' };
    }
  }
  const perModel: Verdict['perModel'] = {};
  let anyEffective = false;
  const ctx = { position: pos, members: [...state.participants], origin };
  for (const modelId of binding.handlers) {
    const model = findModel(state.env, modelId);
    if (!model) {
      perModel[modelId] = { effective: false, reason: 'model_unavailable' };
      continue;
    }
    const before = state.models[modelId] ?? model.init();
    const r = model.fold(before, ev, ctx);
    if (r.effective) {
      state.models[modelId] = r.state;
      anyEffective = true;
    }
    perModel[modelId] = { effective: r.effective, reason: r.reason };
  }
  return { known: true, authorized: true, effective: anyEffective, reason: anyEffective ? undefined : 'ineffective', perModel };
}

function findModel(env: Environment, id: string) {
  for (const pkg of env.packages) if (pkg.models[id]) return pkg.models[id];
  return undefined;
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

export const foundationDescriptorId = descriptorId;

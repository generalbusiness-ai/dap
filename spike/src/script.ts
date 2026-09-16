// Scripts: a series as a replayable list of steps, so that a generated or
// hand-written series can be rebuilt into a fresh context, checked, and
// shrunk to a minimal failing one.

import type { Json } from './canon.ts';
import { Context, type ContextOptions } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { CAP, K, holdsNow, type FoundationState, type GrantSpec } from './foundation.ts';
import type { Entry, Principal } from './types.ts';

export type Step =
  | { type: 'act'; actor: Principal; kind: string; payload: Json; nonce?: string }
  | { type: 'invite'; inviter: Principal; invitee: Principal; grants: Omit<GrantSpec, 'principal'> }
  | { type: 'accept'; invitee: Principal }
  | { type: 'attach'; actor: Principal; pkg: PackageDescriptor; audience?: Principal[] }
  | { type: 'disclose'; actor: Principal; positions: number[]; to: Principal[] };

export interface Script {
  base: Omit<ContextOptions, 'backend'>;
  steps: Step[];
  /** honour the models' declared join disclosures (default true); false replays the literal steps only */
  joinDisclosure?: boolean;
}

/**
 * A model's declared dependency for newcomers (views note cliff 3): in its
 * `config.joinDisclosure`, the kinds whose recorded positions a newcomer
 * needs. The harness honours it as the serving policy would: after each
 * effective join, a participant holding the disclose capability (the
 * creator when they hold it) discloses those positions to the newcomer,
 * as one ordinary `dap.disclose`. The model cannot emit it itself, and
 * `by` is the model's statement of who should; the fixture has one such
 * client, the creator's.
 */
export interface JoinDisclosure {
  by?: string;
  kinds: string[];
  effectiveOnly?: boolean;
}

/**
 * A model's declared disclosure policy: in its `config.disclosurePolicy`,
 * the kinds a client may disclose beyond their audience (the public
 * ones). The fixture's disclosing client honours it; the checker's budget
 * judges what is readable regardless. Undefined when no model declares
 * one: then anything may be disclosed.
 */
export function disclosableKinds(state: FoundationState): Set<string> | undefined {
  let out: Set<string> | undefined;
  for (const pkg of state.env.packages) {
    for (const m of Object.values(pkg.models)) {
      const dp = (m.config as { disclosurePolicy?: { kinds?: unknown } } | null)?.disclosurePolicy;
      if (dp && Array.isArray(dp.kinds)) {
        out ??= new Set();
        for (const k of dp.kinds) if (typeof k === 'string') out.add(k);
      }
    }
  }
  return out;
}

/** An event-level client policy: kinds alone cannot make an unauthorized
 * attempt public. Authorized semantic refusals may still be disclosed. */
export function disclosablePosition(state: FoundationState, entry: Entry): boolean {
  let declared = false;
  let allowed = false;
  for (const pkg of state.env.packages) for (const model of Object.values(pkg.models)) {
    const policy = (model.config as { disclosurePolicy?: { kinds?: unknown; authorizedOnly?: boolean } } | null)?.disclosurePolicy;
    if (!Array.isArray(policy?.kinds)) continue;
    declared = true;
    if (policy.kinds.includes(entry.event.kind) && (!policy.authorizedOnly || state.verdicts[entry.position]?.authorized === true)) allowed = true;
  }
  return !declared || allowed;
}

function joinDisclosuresDeclared(state: FoundationState): JoinDisclosure[] {
  const out: JoinDisclosure[] = [];
  for (const pkg of state.env.packages) {
    for (const m of Object.values(pkg.models)) {
      const jd = (m.config as { joinDisclosure?: unknown } | null)?.joinDisclosure as JoinDisclosure | undefined;
      if (jd && Array.isArray(jd.kinds)) out.push(jd);
    }
  }
  return out;
}

/** The positions before `before` that the declared join disclosures name, and who discloses them. */
export function joinBacklog(state: FoundationState, entries: readonly Entry[], before: number): { discloser?: Principal; positions: number[] } {
  const declared = joinDisclosuresDeclared(state);
  const positions: number[] = [];
  for (let i = 1; i < before && i < entries.length; i++) {
    const kind = entries[i]!.event.kind;
    for (const jd of declared) {
      if (!jd.kinds.includes(kind)) continue;
      if (jd.effectiveOnly !== false && !state.verdicts[i]?.effective) continue;
      positions.push(i);
      break;
    }
  }
  const discloser = state.participants.find((p) => holdsNow(state, p, CAP.disclose));
  return { discloser, positions };
}

export interface Replay {
  ctx: Context;
  /** the position each step landed at, or -1 if refused or skipped */
  positions: number[];
}

/** The replay's bookkeeping between steps: invitations issued and not yet redeemed. */
export type Pending = Map<Principal, number>;

/** Rebuild a context from a script. Refused submissions are recorded as -1 and do not stop the replay. */
export function replay(script: Script): Replay {
  const ctx = Context.create({ ...script.base, packages: { ...script.base.packages } });
  const positions: number[] = [];
  const pendingInvites: Pending = new Map();
  for (const step of script.steps) positions.push(applyStep(ctx, step, pendingInvites, script.joinDisclosure !== false));
  return { ctx, positions };
}

/** A nonce unique within the context for the next position: system steps use it so a script replays to identical ids. */
function stepNonce(ctx: Context): string {
  return 's:' + (ctx.head + 1);
}

/** Apply one step to a live context; returns the position it landed at, or -1. A join may be followed by the declared join disclosure. */
export function applyStep(ctx: Context, step: Step, pendingInvites: Pending, joinDisclosure = true): number {
  let pos = -1;
  {
    switch (step.type) {
      case 'act': {
        // A generated step carries its nonce, so the series replays to the same content ids and
        // a later step may name an earlier event by id.
        const r = ctx.act(step.actor, step.kind, step.payload, step.nonce ? { nonce: step.nonce } : {});
        if (!('refused' in r)) pos = r.header.position;
        break;
      }
      case 'invite': {
        const r = ctx.act(step.inviter, K.invite, { invitee: step.invitee, grants: { principal: step.invitee, ...step.grants }, token_id: 'token:' + (ctx.head + 1) }, { nonce: stepNonce(ctx) });
        if (!('refused' in r)) {
          pos = r.header.position;
          if (r.verdict?.effective) pendingInvites.set(step.invitee, pos);
        }
        break;
      }
      case 'accept': {
        const at = pendingInvites.get(step.invitee);
        if (at === undefined) break;
        const r = ctx.submit(ctx.intent(step.invitee, K.accept_invite, ctx.inviteEnvelope(at) as never, { nonce: stepNonce(ctx) }));
        if (!('refused' in r)) pos = r.header.position;
        pendingInvites.delete(step.invitee);
        if (joinDisclosure && !('refused' in r) && r.verdict?.effective) {
          const { discloser, positions } = joinBacklog(ctx.state, ctx.entries, pos);
          if (discloser && positions.length) ctx.act(discloser, K.disclose, { positions, to: [step.invitee] }, { nonce: stepNonce(ctx) });
        }
        break;
      }
      case 'attach': {
        ctx.packages[step.pkg.id] = step.pkg;
        const r = ctx.act(step.actor, K.attach, { package: step.pkg.id, ...(step.audience ? { audience: step.audience } : {}) }, { nonce: stepNonce(ctx) });
        if (!('refused' in r)) pos = r.header.position;
        break;
      }
      case 'disclose': {
        const r = ctx.act(step.actor, K.disclose, { positions: step.positions.filter((i) => i <= ctx.head), to: step.to }, { nonce: stepNonce(ctx) });
        if (!('refused' in r)) pos = r.header.position;
        break;
      }
    }
  }
  return pos;
}

/**
 * Shrink a failing script by greedy deletion: drop any single step while
 * the failure persists, until no single deletion keeps it failing. The
 * result is deletion-minimal, not necessarily the globally shortest
 * failing trace. Small and deterministic; enough for a corpus of at most
 * sixty positions.
 */
export function shrink(script: Script, fails: (s: Script) => boolean): Script {
  let current = script;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = current.steps.length - 1; i >= 0; i--) {
      const candidate: Script = { ...current, steps: current.steps.filter((_, j) => j !== i) };
      if (fails(candidate)) {
        current = candidate;
        changed = true;
      }
    }
  }
  return current;
}

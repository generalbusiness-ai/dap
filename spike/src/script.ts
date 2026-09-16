// Scripts: a series as a replayable list of steps, so that a generated or
// hand-written series can be rebuilt into a fresh context, checked, and
// shrunk to a minimal failing one.

import type { Json } from './canon.ts';
import { Context, type ContextOptions } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { K, type GrantSpec } from './foundation.ts';
import { nonce } from './canon.ts';
import type { Principal } from './types.ts';

export type Step =
  | { type: 'act'; actor: Principal; kind: string; payload: Json }
  | { type: 'invite'; inviter: Principal; invitee: Principal; grants: Omit<GrantSpec, 'principal'> }
  | { type: 'accept'; invitee: Principal }
  | { type: 'attach'; actor: Principal; pkg: PackageDescriptor; audience?: Principal[] }
  | { type: 'disclose'; actor: Principal; positions: number[]; to: Principal[] };

export interface Script {
  base: Omit<ContextOptions, 'backend'>;
  steps: Step[];
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
  for (const step of script.steps) positions.push(applyStep(ctx, step, pendingInvites));
  return { ctx, positions };
}

/** Apply one step to a live context; returns the position it landed at, or -1. */
export function applyStep(ctx: Context, step: Step, pendingInvites: Pending): number {
  let pos = -1;
  {
    switch (step.type) {
      case 'act': {
        const r = ctx.act(step.actor, step.kind, step.payload);
        if (!('refused' in r)) pos = r.header.position;
        break;
      }
      case 'invite': {
        const r = ctx.act(step.inviter, K.invite, { invitee: step.invitee, grants: { principal: step.invitee, ...step.grants }, token_id: 'token:' + nonce() });
        if (!('refused' in r)) {
          pos = r.header.position;
          if (r.verdict?.effective) pendingInvites.set(step.invitee, pos);
        }
        break;
      }
      case 'accept': {
        const at = pendingInvites.get(step.invitee);
        if (at === undefined) break;
        const r = ctx.submit(ctx.intent(step.invitee, K.accept_invite, ctx.inviteEnvelope(at) as never));
        if (!('refused' in r)) pos = r.header.position;
        pendingInvites.delete(step.invitee);
        break;
      }
      case 'attach': {
        ctx.packages[step.pkg.id] = step.pkg;
        const r = ctx.act(step.actor, K.attach, { package: step.pkg.id, ...(step.audience ? { audience: step.audience } : {}) });
        if (!('refused' in r)) pos = r.header.position;
        break;
      }
      case 'disclose': {
        const r = ctx.act(step.actor, K.disclose, { positions: step.positions.filter((i) => i <= ctx.head), to: step.to });
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
      const candidate: Script = { base: current.base, steps: current.steps.filter((_, j) => j !== i) };
      if (fails(candidate)) {
        current = candidate;
        changed = true;
      }
    }
  }
  return current;
}

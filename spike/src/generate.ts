// The affordance-driven generator (views note, What the spike tests).
//
// Seeded and bounded by a manifest. Each step picks a participant, asks
// the oracle's state what they may do, and emits one of those actions
// with a payload the manifest knows how to build. It also injects the
// cases the views note requires: a late joiner, a narrow attach, a
// disclosure, and an ineffective attempt by someone without the
// capability.

import type { Json } from './canon.ts';
import { Context } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { K, type FoundationState } from './foundation.ts';
import { observe } from './observe.ts';
import { applyStep, type Pending, type Script, type Step } from './script.ts';
import type { Entry, Principal } from './types.ts';

/** mulberry32: a small seeded generator, enough for a bounded corpus. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GeneratorSpec {
  base: Script['base'];
  /** principals who may be invited, in the order they may join */
  newcomers: Principal[];
  /** roles a newcomer receives */
  newcomerRoles: string[];
  /** payload builders per application kind; they see the oracle's state so they can name existing things */
  payloads: Record<string, (r: () => number, ctx: { members: Principal[]; step: number; actor: Principal; state: FoundationState; entries: readonly Entry[] }) => Json>;
  /** how likely a step is an ineffective attempt by a random member, default 0.06 */
  ineffectiveRate?: number;
  /** relative weight of each application kind when choosing among a participant's affordances, default 1 */
  weights?: Record<string, number>;
  /** an unrelated package that a narrow attach may install mid-stream */
  sidePackage?: PackageDescriptor;
  /**
   * maxPositions is the number of entries the series may hold, genesis and
   * origins included; maxParticipants counts every participant.
   */
  bounds: { maxPositions: number; maxParticipants: number };
}

function weighted(r: () => number, kinds: string[], weights: Record<string, number>): string {
  const total = kinds.reduce((sum, k) => sum + (weights[k] ?? 1), 0);
  let x = r() * total;
  for (const k of kinds) {
    x -= weights[k] ?? 1;
    if (x < 0) return k;
  }
  return kinds[kinds.length - 1]!;
}

export function generate(spec: GeneratorSpec, seed: number): Script {
  const r = rng(seed);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
  const steps: Step[] = [];
  const script: Script = { base: spec.base, steps };
  let joinedCount = 0;
  let attachedSide = false;
  // One live context stepped by the same applyStep that replay uses, so the
  // generated script replays to exactly this series.
  const ctx = Context.create({ ...spec.base, packages: { ...spec.base.packages } });
  const pending: Pending = new Map();
  const push = (s: Step) => {
    steps.push(s);
    applyStep(ctx, s, pending);
  };
  const ineffectiveRate = spec.ineffectiveRate ?? 0.06;
  for (let step = 0; step < spec.bounds.maxPositions; step++) {
    const entries = ctx.head + 1;
    const room = spec.bounds.maxPositions - entries;
    if (room <= 0) break;
    const members = [...ctx.state.participants];
    const roll = r();
    // late joiner: an invite and an accept, two entries, only when both fit
    if (roll < 0.12 && room >= 2 && joinedCount < spec.newcomers.length && members.length < spec.bounds.maxParticipants) {
      const invitee = spec.newcomers[joinedCount++]!;
      const inviter = members.find((m) => observe(ctx.state, m, ctx.head, () => true).affordances.includes(K.invite));
      if (inviter) {
        push({ type: 'invite', inviter, invitee, grants: { roles: spec.newcomerRoles } });
        push({ type: 'accept', invitee });
        continue;
      }
    }
    // narrow attach of an unrelated package
    if (roll < 0.18 && spec.sidePackage && !attachedSide) {
      const attacher = members.find((m) => observe(ctx.state, m, ctx.head, () => true).affordances.includes(K.attach));
      if (attacher) {
        attachedSide = true;
        push({ type: 'attach', actor: attacher, pkg: spec.sidePackage, audience: [] });
        continue;
      }
    }
    // disclosure of an earlier position to a member
    if (roll < 0.26 && ctx.head > 2 && members.length > 1) {
      const discloser = members.find((m) => observe(ctx.state, m, ctx.head, () => true).affordances.includes(K.disclose));
      if (discloser) {
        const to = pick(members.filter((m) => m !== discloser));
        const position = 1 + Math.floor(r() * ctx.head);
        push({ type: 'disclose', actor: discloser, positions: [position], to: [to] });
        continue;
      }
    }
    // an ineffective attempt: a participant emits a kind they lack the capability for
    if (roll < 0.26 + ineffectiveRate) {
      const actor = pick(members);
      const kinds = Object.keys(spec.payloads);
      const kind = pick(kinds);
      push({ type: 'act', actor, kind, payload: spec.payloads[kind]!(r, { members, step, actor, state: ctx.state, entries: ctx.entries }) });
      continue;
    }
    // an ordinary affordance
    const actor = pick(members);
    const aff = observe(ctx.state, actor, ctx.head, () => true).affordances.filter((k) => k in spec.payloads);
    if (aff.length === 0) continue;
    const kind = weighted(r, aff, spec.weights ?? {});
    push({ type: 'act', actor, kind, payload: spec.payloads[kind]!(r, { members, step, actor, state: ctx.state, entries: ctx.entries }) });
  }
  return script;
}

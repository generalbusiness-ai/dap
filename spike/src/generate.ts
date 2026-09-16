// The affordance-driven generator (views note, What the spike tests).
//
// Seeded and bounded by a manifest. Each step picks a participant, asks
// the oracle's state what they may do, and emits one of those actions
// with a payload the manifest knows how to build. It also injects the
// cases the views note requires: a late joiner, a narrow attach, a
// disclosure, and an ineffective attempt by someone without the
// capability.

import type { Json } from './canon.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { K } from './foundation.ts';
import { observe } from './observe.ts';
import { replay, type Script, type Step } from './script.ts';
import type { Principal } from './types.ts';

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
  /** payload builders per application kind */
  payloads: Record<string, (r: () => number, ctx: { members: Principal[]; step: number }) => Json>;
  /** an unrelated package that a narrow attach may install mid-stream */
  sidePackage?: PackageDescriptor;
  /**
   * maxPositions is the number of entries the series may hold, genesis and
   * origins included; maxParticipants counts every participant.
   */
  bounds: { maxPositions: number; maxParticipants: number };
}

export function generate(spec: GeneratorSpec, seed: number): Script {
  const r = rng(seed);
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
  const steps: Step[] = [];
  const script: Script = { base: spec.base, steps };
  let joinedCount = 0;
  let attachedSide = false;
  // Rebuild after each step: cold replay is the rule and the corpus is small.
  for (let step = 0; step < spec.bounds.maxPositions; step++) {
    const { ctx } = replay(script);
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
        steps.push({ type: 'invite', inviter, invitee, grants: { roles: spec.newcomerRoles } });
        steps.push({ type: 'accept', invitee });
        continue;
      }
    }
    // narrow attach of an unrelated package
    if (roll < 0.18 && spec.sidePackage && !attachedSide) {
      const attacher = members.find((m) => observe(ctx.state, m, ctx.head, () => true).affordances.includes(K.attach));
      if (attacher) {
        attachedSide = true;
        steps.push({ type: 'attach', actor: attacher, pkg: spec.sidePackage, audience: [] });
        continue;
      }
    }
    // disclosure of an earlier position to a member
    if (roll < 0.26 && ctx.head > 2 && members.length > 1) {
      const discloser = members.find((m) => observe(ctx.state, m, ctx.head, () => true).affordances.includes(K.disclose));
      if (discloser) {
        const to = pick(members.filter((m) => m !== discloser));
        const position = 1 + Math.floor(r() * ctx.head);
        steps.push({ type: 'disclose', actor: discloser, positions: [position], to: [to] });
        continue;
      }
    }
    // an ineffective attempt: a participant emits a kind they lack the capability for
    if (roll < 0.32) {
      const actor = pick(members);
      const kinds = Object.keys(spec.payloads);
      const kind = pick(kinds);
      steps.push({ type: 'act', actor, kind, payload: spec.payloads[kind]!(r, { members, step }) });
      continue;
    }
    // an ordinary affordance
    const actor = pick(members);
    const aff = observe(ctx.state, actor, ctx.head, () => true).affordances.filter((k) => k in spec.payloads);
    if (aff.length === 0) continue;
    const kind = pick(aff);
    steps.push({ type: 'act', actor, kind, payload: spec.payloads[kind]!(r, { members, step }) });
  }
  return script;
}

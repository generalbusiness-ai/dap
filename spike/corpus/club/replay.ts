// Club's event ids name earlier applications, and disclosures name positions.
// Keep those links when deleting steps or replaying under a repaired package.
// The source ids are labels only; every replay computes fresh authenticated ids.
import type { PackageDescriptor } from '../../src/descriptor.ts';
import { Context } from '../../src/context.ts';
import { deserializeSteps, serializeSteps } from '../../src/corpus.ts';
import { applyStep, type Pending, type Script, type Step } from '../../src/script.ts';

export interface LinkedStep {
  step: unknown;
  entries: { id: string; kind: string }[];
  application?: string;
  disclosures?: string[];
}

export interface ClubCorpus {
  seed: number;
  manifest: string;
  package: string;
  snapshot: string;
  expected: string;
  nonce: string;
  originalSteps: number;
  steps: LinkedStep[];
}

/** Capture the generated trace's links before shrinking it. */
export function linkSteps(script: Script): LinkedStep[] {
  const ctx = Context.create({ ...script.base, packages: { ...script.base.packages } });
  const pending: Pending = new Map();
  return script.steps.map((step) => {
    const before = ctx.head;
    const payload = step.type === 'act' ? step.payload as { application_id?: unknown } : undefined;
    const application = typeof payload?.application_id === 'string' && payload.application_id.startsWith('sha256:') ? payload.application_id : undefined;
    const disclosures = step.type === 'disclose' ? step.positions.map((i) => ctx.entries[i]!.id) : undefined;
    applyStep(ctx, step, pending);
    return {
      step: serializeSteps([step])[0],
      entries: ctx.entries.slice(before + 1).map((e) => ({ id: e.id, kind: e.event.kind })),
      ...(application ? { application } : {}),
      ...(disclosures ? { disclosures } : {}),
    };
  });
}

/** Deleting a producer also omits uses of its missing application or disclosure. */
export function replayLinked(steps: LinkedStep[], base: Script['base'], byName: Record<string, PackageDescriptor>): Context {
  const ctx = Context.create({ ...base, packages: { ...base.packages } });
  const pending: Pending = new Map();
  const links = new Map<string, { id: string; position: number }>();
  for (const linked of steps) {
    let step: Step = deserializeSteps([linked.step], byName)[0]!;
    if (linked.application && step.type === 'act') {
      const target = links.get(linked.application);
      if (!target) continue;
      step = { ...step, payload: { ...step.payload as Record<string, never>, application_id: target.id } };
    }
    if (linked.disclosures && step.type === 'disclose') {
      const positions = linked.disclosures.flatMap((id) => links.has(id) ? [links.get(id)!.position] : []);
      if (!positions.length) continue;
      step = { ...step, positions };
    }
    const before = ctx.head;
    applyStep(ctx, step, pending);
    const added = ctx.entries.slice(before + 1);
    for (let i = 0; i < linked.entries.length; i++) {
      const source = linked.entries[i]!;
      const entry = added[i];
      if (entry?.event.kind === source.kind) links.set(source.id, { id: entry.id, position: entry.header.position });
    }
  }
  return ctx;
}

export function shrinkLinked(steps: LinkedStep[], fails: (steps: LinkedStep[]) => boolean): LinkedStep[] {
  let current = steps;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const candidate = current.filter((_, j) => i !== j);
      if (fails(candidate)) {
        current = candidate;
        changed = true;
      }
    }
  }
  return current;
}

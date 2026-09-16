// A corpus of replayable series: a generated or hand-written script,
// shrunk to a deletion-minimal failing one, saved as JSON with packages
// named rather than embedded, so a failure found by one checker run can
// be replayed under the snapshot that produced it and under later ones.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageIn, type PackageDescriptor } from './descriptor.ts';
import type { Script, Step } from './script.ts';

export interface CorpusEntry {
  /** the seed that produced the series, or a name for a hand-written one */
  seed: number | string;
  /** the manifest and package identities the failure was recorded under */
  manifest: string;
  package: string;
  /** the snapshot commit's subject, so the record survives a rebase */
  snapshot: string;
  /** the first violation as the checker described it */
  expected: string;
  /** the shrunk steps, with attach steps naming a package by name */
  steps: unknown[];
  joinDisclosure?: boolean;
}

/** Steps with package descriptors replaced by their names. */
export function serializeSteps(steps: Step[]): unknown[] {
  return steps.map((s) => (s.type === 'attach' ? { ...s, pkg: s.pkg.name } : s));
}

/** Steps with package names resolved from a registry by name. */
export function deserializeSteps(steps: unknown[], byName: Record<string, PackageDescriptor>): Step[] {
  return steps.map((s) => {
    const step = s as Step & { pkg?: unknown };
    if (step.type === 'attach') {
      const pkg = packageIn(byName, String(step.pkg));
      if (!pkg) throw new Error('corpus names an unknown package: ' + String(step.pkg));
      return { ...step, pkg };
    }
    return step;
  });
}

export function toScript(entry: CorpusEntry, base: Script['base'], byName: Record<string, PackageDescriptor>): Script {
  return { base, steps: deserializeSteps(entry.steps, byName), ...(entry.joinDisclosure === false ? { joinDisclosure: false } : {}) };
}

export function writeCorpus(dir: string, name: string, entry: CorpusEntry): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name + '.json'), JSON.stringify(entry, null, 2) + '\n');
}

export function readCorpus(dir: string): { name: string; entry: CorpusEntry }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ name: f.replace(/\.json$/, ''), entry: JSON.parse(readFileSync(join(dir, f), 'utf8')) as CorpusEntry }));
}

// A pinned module whose model calls a module-local helper. The function
// text and config are identical to its sibling; only the helper differs.
import { descriptorId, type ModelSpec, type PackageDescriptor } from '../../src/descriptor.ts';
import { MEMBERS } from '../../src/types.ts';

function add(n: number): number {
  return n + 1;
}

const counter: ModelSpec<{ count: number }, { label: string }> = {
  id: 'counter',
  config: { label: 'shared' },
  init: () => ({ count: 0 }),
  fold: (s) => ({ effective: true, state: { count: add(s.count) } }),
};

export function counterPackage(kind: string): PackageDescriptor {
  const base: Omit<PackageDescriptor, 'id'> = {
    name: 'com.example.counter.' + kind,
    module: import.meta.url,
    models: { counter: counter as unknown as ModelSpec },
    capabilities: [],
    kinds: { [kind]: { kind, schema: { v: 1 }, handlers: ['counter'], audienceId: 'members', audience: () => MEMBERS } },
  };
  return { id: descriptorId(base), ...base };
}

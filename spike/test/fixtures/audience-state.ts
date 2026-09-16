import { descriptorId, type AudienceCtx, type ModelSpec, type PackageDescriptor } from '../../src/descriptor.ts';
import { MEMBERS, SPINE, type EventBody } from '../../src/types.ts';

export const STATE_KIND = 'com.example.audience_state.add';

const counter: ModelSpec<{ count: number }> = {
  id: 'counter', config: {}, init: () => ({ count: 0 }),
  fold: (state) => { state.count++; return { state, effective: true }; },
};

function audience(ctx: AudienceCtx, event: EventBody) {
  const p = event.payload as { read?: string; mutate?: boolean };
  const before = ctx.modelState(p.read ?? 'counter') as { count: number };
  if (p.mutate) before.count++;
  return before.count === 0 ? SPINE : MEMBERS;
}

export function stateAudiencePackage(includeExtra = false): PackageDescriptor {
  const base: Omit<PackageDescriptor, 'id'> = {
    name: 'com.example.audience_state', module: import.meta.url,
    models: { counter: counter as unknown as ModelSpec, extra: { ...counter, id: 'extra' } as unknown as ModelSpec },
    capabilities: [],
    kinds: {
      [STATE_KIND]: { kind: STATE_KIND, schema: {}, handlers: includeExtra ? ['counter', 'extra'] : ['counter'], audienceId: 'preceding-count', audience },
    },
  };
  return { id: descriptorId(base), ...base };
}

const extension: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.audience_state.extension', module: import.meta.url,
  models: {}, capabilities: [],
  kinds: {
    [STATE_KIND]: { kind: STATE_KIND, schema: {}, handlers: ['extra'], audienceId: 'members', audience: () => MEMBERS },
  },
};
export const extraHandlerPackage: PackageDescriptor = { id: descriptorId(extension), ...extension };

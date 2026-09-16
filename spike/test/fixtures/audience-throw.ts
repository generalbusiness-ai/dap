import { descriptorId, type ModelSpec, type PackageDescriptor } from '../../src/descriptor.ts';
import { MEMBERS } from '../../src/types.ts';

export const THROW_KIND = 'com.example.audience_throw.add';

const counter: ModelSpec<{ count: number; positions: number[] }> = {
  id: 'first',
  config: {},
  init: () => ({ count: 0, positions: [] }),
  fold: (state, _event, ctx) => {
    state.count++;
    state.positions.push(ctx.position);
    return { state, effective: true };
  },
};

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.audience_throw',
  module: import.meta.url,
  models: {
    first: counter as unknown as ModelSpec,
    second: { ...counter, id: 'second' } as unknown as ModelSpec,
  },
  capabilities: [],
  kinds: {
    [THROW_KIND]: {
      kind: THROW_KIND,
      schema: { failAudience: 'boolean' },
      handlers: ['first', 'second'],
      audienceId: 'members-or-error',
      audience: (_ctx, event) => {
        if ((event.payload as { failAudience?: boolean }).failAudience) throw new Error('test audience failure');
        return MEMBERS;
      },
    },
  },
};

export const audienceThrowPackage: PackageDescriptor = { id: descriptorId(base), ...base };

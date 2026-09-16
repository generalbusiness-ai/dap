// The declared application surface for the fixed scope runtime. Its complete
// semantics are pinned in configuration and executed by ScopeJournal. Legacy
// foundation interpreters retain an explicit scope_runtime_required outcome.
import { descriptorId, type ModelSpec, type PackageDescriptor } from './descriptor.ts';
import { SPINE } from './types.ts';
import { SCOPE_KINDS, scopeImplementationId } from './scope-profile.ts';
const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.scope', module: import.meta.url,
  models: { scope: {
    id: 'scope', config: { implementation: scopeImplementationId() }, init: () => ({}),
    fold: state => ({ effective: false, state, reason: 'scope_runtime_required' }),
    observe: () => ({}), affordances: () => [],
  } as ModelSpec },
  capabilities: Object.values(SCOPE_KINDS),
  kinds: Object.fromEntries(Object.values(SCOPE_KINDS).map(kind => [kind, {
    kind, schema: { profile: 'dap.fixture.scope/1', kind }, handlers: ['scope'],
    audienceId: 'scope-public', audience: () => SPINE, capability: kind,
  }])),
};
export const scopePackage: PackageDescriptor = { ...base, id: descriptorId(base) };

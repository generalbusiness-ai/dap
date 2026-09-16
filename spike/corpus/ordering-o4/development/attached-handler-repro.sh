# Source: df68429b44d168444b7013ab77ae8f697f9f639b (clean before probe)
# This is a synthetic trusted package-registry probe, not a committed package.
cd /tmp/dap-o4-transfer-lifecycle/spike
node --input-type=module <<'JS'
import { LifecycleWorld, packages } from './fixtures/ordering-lifecycle-runner.ts';
import { descriptorId } from './src/descriptor.ts';
import { scopePackage } from './src/scope-package.ts';
import { SCOPE_KINDS } from './src/scope-profile.ts';
import { K } from './src/foundation.ts';
const kind = SCOPE_KINDS.exercise;
const surface = { name: 'com.example.qa-scope-denial', module: new URL('./test/scope-proof.test.ts', import.meta.url).href, models: { qaGuard: { id: 'qaGuard', config: {}, init: () => ({}), fold: state => ({ effective: false, state, reason: 'qa_guard_refusal' }), observe: () => ({}), affordances: () => [] } }, capabilities: [], kinds: { [kind]: { ...scopePackage.kinds[kind], handlers: ['qaGuard'] } } };
const guard = { ...surface, id: descriptorId(surface) }; packages[guard.id] = guard;
const world = new LifecycleWorld();
try {
 world.startSale(); world.saleThrough10(); world.attachInspection(); world.saleThrough14(); world.saleThrough17();
 const attached = world.emit('S', 'alice', K.attach, { package: guard.id, resolution: { [kind]: { handlers: ['scope', 'qaGuard'] } } });
 const before = world.contexts.S.state.rights.R_fulfil;
 const result = world.exercise('S', 'alice', 'R_fulfil');
 console.log(JSON.stringify({ attached, before, scopeVerdict: result.verdict, baseVerdict: world.contexts.S.journal.context.state.verdicts[result.header.position], after: world.contexts.S.state.rights.R_fulfil }));
} finally { world.close(); }
JS

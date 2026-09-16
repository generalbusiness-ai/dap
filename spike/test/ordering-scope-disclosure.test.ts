import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, normalize, packages, principals, type Person } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { INSPECTION } from '../fixtures/inspection.ts';
import { inspectionDisclosure } from '../manifests/ordering-lifecycle.ts';
import { verifyEnvelope } from '../src/codec.ts';
import { K } from '../src/foundation.ts';
import { verifyJournalView } from '../src/journal.ts';
import { verifyPublicProof, type PublicProof } from '../src/scope-proof.ts';
import { SCOPE_KINDS, type ScopeSetup } from '../src/scope-profile.ts';
import type { ReleaseProof } from '../src/scope.ts';

for (const storage of ['memory', 'sqlite'] as const) test('O4 K4 actual Inspection mandate and result reach Bob and F readers: ' + storage, () => {
  const world = buildThrough('destination-activated', {}, storage);
  try {
    const sourceId = world.contexts.S!.journal.context.genesisId;
    const inspectionId = world.contexts.I!.journal.context.genesisId;
    const expected = inspectionDisclosure;
    const observations: unknown[] = [];

    function inspectAdmit(committed: string) {
      const admit = verifyEnvelope(committed);
      assert.equal(admit.body.kind, K.admit);
      const payload = admit.body.payload as unknown as { proof: PublicProof; position: number; identity: string };
      assert.equal(payload.position, 1);
      assert.equal(payload.identity, inspectionId + ':1');
      const verified = verifyPublicProof(payload.proof, { genesis: inspectionId, initialWriter: principals.WI, frontier: 1 }, packages);
      const genesis = verifyEnvelope(verified.view[0]!.committed!).body;
      const result = verifyEnvelope(verified.view[1]!.committed!).body;
      const setup = (genesis.payload as unknown as { scope: ScopeSetup }).scope;
      assert.equal(setup.mandate!.source, sourceId);
      assert.deepEqual({ ...normalize(setup.mandate), source: 'S' }, expected.mandate);
      assert.deepEqual(normalize(setup.founders), expected.inspectionFounders);
      assert.equal(Object.hasOwn(setup.mandate!, 'requester'), expected.requesterFieldInMandate);
      assert.equal(result.kind, SCOPE_KINDS.result);
      assert.deepEqual(normalize(result.payload), expected.result);
      return { inspectionGenesis: inspectionId, mandate: setup.mandate, founders: setup.founders, result: result.payload };
    }

    for (const phase of ['live', 'cold'] as const) {
      if (phase === 'cold') for (const name of ['S', 'I', 'F'] as const) world.restart(name);
      const source = world.contexts.S!.journal.context;
      const destination = world.contexts.F!.journal.context;
      const request = source.entries[expected.request.position]!;
      assert.equal(request.event.kind, INSPECTION + 'request');
      assert.equal(request.event.actor, principals.carol);
      assert.deepEqual(normalize(request.event.payload), { offer_id: 'o2', seller: 'alice', inspector: 'ivan' });
      const requestAudience = source.state.audiences[expected.request.position];
      assert.ok(requestAudience?.kind === 'named');
      assert.deepEqual(normalize(requestAudience.principals).sort(), expected.request.readers);
      assert.deepEqual(normalize(source.state.participants).sort(), expected.admit.readers);
      assert.deepEqual(normalize(destination.state.participants).sort(), expected.activation.currentParticipants);
      assert.deepEqual(source.state.audiences[expected.admit.position], { kind: expected.admit.audience });
      assert.deepEqual(destination.state.audiences[expected.activation.position], { kind: expected.activation.audience });

      const sourceViews = expected.admit.readers.map(reader => {
        const view = source.view(principals[reader as Person]);
        verifyJournalView(view, { genesis: sourceId, writer: principals.W0 });
        const requestReadable = view[expected.request.position]!.committed !== undefined;
        assert.equal(requestReadable, expected.request.readers.includes(reader));
        if (requestReadable) assert.equal(view[expected.request.position]!.committed, request.committed);
        const admit = view[expected.admit.position]!;
        assert.equal(admit.committed, source.entries[expected.admit.position]!.committed);
        const disclosed = inspectAdmit(admit.committed!);
        return { reader, requestReadable, admitReadable: true, disclosed };
      });
      assert.equal(sourceViews.find(v => v.reader === 'bob')!.requestReadable, false);
      assert.equal(source.view(principals.kim)[expected.admit.position]!.committed, undefined);

      const activation = destination.entries[expected.activation.position]!;
      const destinationViews = expected.activation.currentParticipants.map(reader => {
        const view = destination.view(principals[reader as Person]);
        verifyJournalView(view, { genesis: destination.genesisId, writer: principals.WF });
        assert.equal(view[expected.activation.position]!.committed, activation.committed);
        const envelope = verifyEnvelope(view[expected.activation.position]!.committed!);
        assert.equal(envelope.body.kind, K.scope_activate);
        const proofs = (envelope.body.payload as unknown as { proofs: ReleaseProof[] }).proofs;
        const packet = proofs.find(proof => proof.source.genesis === sourceId)!.source;
        verifyPublicProof(packet, { genesis: sourceId, initialWriter: principals.W0, frontier: 24 }, packages);
        assert.equal(packet.positions[expected.request.position]!.committed !== undefined, expected.request.bodyInPublicProof);
        assert.equal(packet.positions[expected.admit.position]!.committed, source.entries[expected.admit.position]!.committed);
        assert.equal(world.contexts.F!.interpret(principals[reader as Person]).active, true);
        return { reader, activationReadable: true, disclosed: inspectAdmit(packet.positions[expected.admit.position]!.committed!) };
      });
      observations.push({ phase, sourceGenesis: sourceId, destinationGenesis: destination.genesisId,
        request: { committed: request.committed, audience: source.state.audiences[expected.request.position] },
        admitAudience: source.state.audiences[expected.admit.position], sourceViews,
        activation: { committed: activation.committed, audience: destination.state.audiences[expected.activation.position] },
        destinationViews });
    }
    recordScope('k4-inspection-disclosure-' + storage, { expected, observations });
  } finally { world.close(); }
});

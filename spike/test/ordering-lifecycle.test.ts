// Specification checks for O1, not execution of the O4 transfer protocol.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { contentId, type Json } from '../src/canon.ts';
import {
  ORDERING_LIFECYCLE_MANIFEST_ID, ORDERING_LIFECYCLE_PROSE, PUBLIC_OPENING_RULE_ID, publicOpeningRule,
  activeOwners, amountPrivacy, boundary, changedGenesisCases, compareLifecycleObservation,
  contexts, deliveryExport, destinationGenesisTemplate, exportReferences, genesisPaths,
  healthyLifecycle, lifecycleCases, lifecycleInvariantViolations, replayObligations, rights, saleExport,
  type LifecycleSnapshot,
} from '../manifests/ordering-lifecycle.ts';

const expectedOwners = [
  ['sale-started', 'S:alice', '-', '-'],
  ['before-attach', 'S:alice', '-', '-'],
  ['inspection-attached', 'S:alice', '-', '-'],
  ['inspection-requested', 'S:alice', '-', '-'],
  ['inspection-spawned', 'S:alice', '-', '-'],
  ['inspection-result-recorded', 'S:alice', '-', '-'],
  ['sale-accepted', '-', 'S:alice', '-'],
  ['sale-closed', '-', 'S:alice', '-'],
  ['inspection-imported', '-', 'S:alice', '-'],
  ['writer-sealed', '-', 'S:alice', '-'],
  ['writer-assigned', '-', 'S:alice', '-'],
  ['writer-continued', '-', 'S:alice', '-'],
  ['delivery-started', '-', 'S:alice', 'D:kim'],
  ['destination-described', '-', 'S:alice', 'D:kim'],
  ['sale-released', '-', '-', 'D:kim'],
  ['delivery-released', '-', '-', '-'],
  ['destination-started', '-', '-', '-'],
  ['destination-activated', '-', 'F:alice', 'F:kim'],
  ['delivery-confirmed', '-', 'F:alice', '-'],
  ['sale-fulfilled', '-', '-', '-'],
];

function assertSnapshotShape(snapshot: LifecycleSnapshot): void {
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'heads', 'writers', 'sale', 'inspection', 'rights', 'owners', 'destination', 'releases',
    'verifiedProofs', 'activations', 'exports', 'imports', 'deliveryConfirmed', 'fulfilled',
  ].sort());
  for (const key of ['heads', 'writers'] as const) assert.deepEqual(Object.keys(snapshot[key]).sort(), [...contexts].sort());
  assert.deepEqual(Object.keys(snapshot.rights).sort(), [...rights].sort());
  assert.deepEqual(Object.keys(snapshot.owners).sort(), [...rights].sort());
  for (const right of rights) {
    assert.deepEqual(Object.keys(snapshot.rights[right]).sort(), [...contexts].sort());
    for (const status of Object.values(snapshot.rights[right])) assert.ok(['absent', 'live', 'spent', 'released', 'dormant'].includes(status));
  }
  for (const context of contexts) {
    const head = snapshot.heads[context];
    assert.ok(head === null || (Number.isSafeInteger(head) && head >= 0));
    assert.ok(snapshot.writers[context] === null || typeof snapshot.writers[context] === 'string');
  }
  assert.ok(['open', 'accepted', 'closed'].includes(snapshot.sale.status));
  assert.ok(['undescribed', 'described', 'started', 'active'].includes(snapshot.destination));
  assert.equal(typeof snapshot.inspection.attached, 'boolean');
  assert.equal(typeof snapshot.inspection.requested, 'boolean');
  assert.ok([0, 1].includes(snapshot.inspection.imports));
  for (const list of [snapshot.releases, snapshot.verifiedProofs]) {
    assert.equal(new Set(list).size, list.length);
    assert.ok(list.every((item) => ['S', 'D'].includes(item)));
  }
  assert.ok(snapshot.verifiedProofs.every((source) => snapshot.releases.includes(source)));
  assert.deepEqual(Object.keys(snapshot.exports).sort(), ['D', 'S']);
  for (const [source, exported] of Object.entries(snapshot.exports)) {
    if (exported !== null) assert.deepEqual(Object.keys(exported).sort(), (source === 'S' ? ['accepted_offer', 'winner'] : ['buyer', 'delivery_slot']).sort());
  }
  assert.deepEqual(lifecycleInvariantViolations(snapshot), []);
}

test('manifest identity binds the prose and executable source, independently recomputed', (t) => {
  const prose = readFileSync(new URL('../manifests/ordering-lifecycle.md', import.meta.url), 'utf8');
  const executable = readFileSync(new URL('../manifests/ordering-lifecycle.ts', import.meta.url), 'utf8');
  assert.equal(ORDERING_LIFECYCLE_PROSE, prose);
  for (const historicalId of [
    'sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d',
    'sha256:d7419b5d85d9acd4767b8733b47729c29f49088a0495ee246c60c2da658a7613',
    'sha256:75de2a860b049b5d9dcad3dab234be14d7a965d53df2e0d0eae8de6f05a1b327',
    'sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378',
  ]) {
    assert.notEqual(ORDERING_LIFECYCLE_MANIFEST_ID, historicalId, 'historical manifest is not relabelled');
    assert.ok(prose.includes(historicalId), 'retain historical manifest identity');
  }
  assert.equal(ORDERING_LIFECYCLE_MANIFEST_ID, 'sha256:bdb831b32915c0b209afcbcdfc8c24e671dcd60eb4dd1ffca17a2b6300ae5746');
  assert.equal(ORDERING_LIFECYCLE_MANIFEST_ID, contentId({ prose: contentId(prose), executable: contentId(executable) }));
  assert.notEqual(ORDERING_LIFECYCLE_MANIFEST_ID, contentId({ prose: contentId(prose + '\nchanged'), executable: contentId(executable) }));
  assert.notEqual(ORDERING_LIFECYCLE_MANIFEST_ID, contentId({ prose: contentId(prose), executable: contentId(executable + '\n// changed') }));
  t.diagnostic(`ORDERING_LIFECYCLE_MANIFEST_ID ${ORDERING_LIFECYCLE_MANIFEST_ID}`);
});

test('every healthy boundary states all heads, writers, right statuses and exact active owners', () => {
  assert.deepEqual(healthyLifecycle.map((item) => item.id), expectedOwners.map((row) => row[0]));
  assert.equal(new Set(healthyLifecycle.map((item) => item.id)).size, healthyLifecycle.length);
  for (const [index, item] of healthyLifecycle.entries()) {
    assertSnapshotShape(item.expected);
    assert.deepEqual([item.id, ...rights.map((right) => activeOwners(item.expected, right).map((owner) => `${owner.context}:${owner.principal}`).join(',') || '-')], expectedOwners[index]);
    assert.ok(ORDERING_LIFECYCLE_PROSE.includes(`| ${item.id} |`), `missing prose row ${item.id}`);
    const previous = healthyLifecycle[index - 1]?.expected;
    if (previous) for (const context of contexts) {
      if (previous.heads[context] !== null) assert.ok(item.expected.heads[context]! >= previous.heads[context]!);
    }
  }
  // The prose must agree with actual head values, not merely name each case.
  const proseRows = ORDERING_LIFECYCLE_PROSE.split('\n').filter((line) => /^\| [a-z]+-/.test(line));
  assert.equal(proseRows.length, healthyLifecycle.length);
  for (const row of proseRows) {
    const cells = row.split('|').map((cell) => cell.trim());
    const state = boundary(cells[1]!);
    assert.equal(cells[2], contexts.map((context) => state.heads[context] ?? '—').join(' / '));
  }
});

test('join boundaries have two releases, dormant initialization and one activation followed by progress', () => {
  const partial = lifecycleCases.find((item) => item.id === 'one-source-release-missing')!;
  const afterPartial = partial.steps.at(-1)!.expected;
  assert.equal(partial.steps.at(-1)!.reason, 'missing_release');
  assert.deepEqual(afterPartial.releases, ['S']);
  assert.deepEqual(activeOwners(afterPartial, 'R_fulfil'), []);
  assert.deepEqual(activeOwners(afterPartial, 'R_deliver'), [{ context: 'D', principal: 'kim' }]);
  assert.equal(afterPartial.rights.R_fulfil.F, 'dormant');
  assert.equal(afterPartial.rights.R_deliver.F, 'dormant');
  for (const id of ['delivery-released', 'destination-started']) {
    assert.deepEqual(rights.flatMap((right) => activeOwners(boundary(id), right)), []);
  }
  const activated = boundary('destination-activated');
  assert.equal(activated.heads.F, 1);
  assert.deepEqual(activated.releases, ['S', 'D']);
  assert.deepEqual(activated.verifiedProofs, ['S', 'D']);
  assert.equal(activated.activations, 1);
  assert.deepEqual(boundary('sale-fulfilled').sale, { status: 'closed', accepted_offer: 'o3', winner: 'bob' });
  assert.equal(boundary('sale-fulfilled').deliveryConfirmed, true);
  assert.equal(boundary('sale-fulfilled').fulfilled, true);
  assert.equal(boundary('sale-fulfilled').rights.R_fulfil.F, 'spent');
  assert.equal(boundary('sale-fulfilled').rights.R_deliver.F, 'spent');
});

test('all adverse cases have resolvable branches, full safe observations and exact reason coverage', () => {
  const expectedReasons: Record<string, string | null> = {
    'one-source-release-missing': 'missing_release',
    'withheld-release-evidence': null,
    'intervening-dormant-exercise': 'original_receipt',
    'intervening-participant-event': null,
    'restart-before-activation': null,
    'repeated-activation-after-restart': 'already_active',
    'exact-retry-activation': 'original_receipt',
    'timeout-after-hidden-activation': 'no_safe_recovery_evidence',
    'duplicate-inspection-import': 'duplicate_import',
    'duplicate-state-import': 'duplicate_import',
    'stale-source-proposal-at-source': 'not_open',
    'stale-source-proposal-at-destination': 'wrong_genesis',
    'unauthorized-release': 'unauthorized',
    'release-unowned-right': 'unowned_right',
    'release-already-released-right': 'already_released',
    'receipt-for-ineffective-release': 'ineffective_release',
    'receipt-for-unauthorized-release': 'unauthorized_release',
    'wrong-destination-release': 'destination_mismatch',
    'two-sources-export-same-right': 'duplicate_right',
    'mismatched-buyer': 'mismatch',
    'stale-export-prefix': 'stale_export',
    'spend-before-activation-S': 'released_right',
    'spend-before-activation-D': 'released_right',
    'spend-before-activation-F': 'dormant_right',
    'spend-before-activation-F-deliver': 'dormant_right',
    'origin-spends-transferred-right': 'dormant_right',
    'move-preserves-retry': 'original_receipt',
    'unassigned-writer-candidates': 'no_assignment',
    'retired-writer-continuation': 'retired_assignment',
  };
  assert.deepEqual(lifecycleCases.map((item) => item.id).sort(), Object.keys(expectedReasons).sort());
  for (const scenario of lifecycleCases) {
    let previous = scenario.initial ?? boundary(scenario.from);
    assertSnapshotShape(previous);
    assert.ok(scenario.steps.length > 0);
    assert.equal(scenario.steps.at(-1)!.reason, expectedReasons[scenario.id]);
    for (const step of scenario.steps) {
      assertSnapshotShape(step.expected);
      assert.ok(step.action.operation.length > 0);
      assert.ok(step.action.context === null || contexts.includes(step.action.context));
      if (step.verdict === 'ineffective') assert.ok(step.reason);
      if (step.verdict === 'refused' || step.verdict === 'unchanged') assert.deepEqual(step.expected, previous);
      if (step.verdict === 'ineffective') {
        assert.deepEqual(step.expected.rights, previous.rights, `${scenario.id}: ineffective action changed rights`);
        assert.deepEqual(step.expected.owners, previous.owners, `${scenario.id}: ineffective action changed owners`);
        assert.equal(step.expected.activations, previous.activations);
        assert.equal(step.expected.heads[step.action.context!], previous.heads[step.action.context!]! + 1);
      }
      previous = step.expected;
    }
  }
});

test('restarts, alternative valid proof material and timeouts cannot duplicate or revive authority', () => {
  const repeat = lifecycleCases.find((item) => item.id === 'repeated-activation-after-restart')!;
  assert.notDeepEqual(repeat.steps[1]!.action.input, repeat.steps[2]!.action.input);
  for (const step of repeat.steps) {
    assert.equal(step.expected.activations, 1);
    assert.deepEqual(step.expected.rights, boundary('destination-activated').rights);
  }
  const withheld = lifecycleCases.find((item) => item.id === 'withheld-release-evidence')!;
  assert.equal(withheld.steps[0]!.expected.activations, 0);
  assert.equal(withheld.steps[1]!.expected.activations, 0);
  assert.equal(withheld.steps[2]!.expected.activations, 1);
  assert.equal(withheld.steps[0]!.verdict, 'ineffective');
  assert.equal(withheld.steps[0]!.expected.heads.F, 1);
  assert.equal(withheld.steps[0]!.expected.rights.R_fulfil.F, 'dormant');
  assert.equal(withheld.steps[2]!.verdict, 'effective');
  assert.equal(withheld.steps[2]!.expected.heads.F, 2, 'a later attempt may first activate');
  assert.equal(withheld.steps[1]!.expected.rights.R_fulfil.S, 'released');
  const hidden = lifecycleCases.find((item) => item.id === 'timeout-after-hidden-activation')!;
  assert.equal(hidden.steps[0]!.expected.rights.R_fulfil.S, 'released');
  assert.equal(hidden.steps[0]!.expected.rights.R_fulfil.F, 'live');
});

test('failed activation and an intervening dormant exercise permit fresh activation, preserving both retry receipts', () => {
  const scenario = lifecycleCases.find((item) => item.id === 'intervening-dormant-exercise')!;
  assert.equal(scenario.from, 'destination-started');
  assert.equal(scenario.variant, undefined, 'same pinned destination genesis throughout');
  assert.deepEqual(scenario.steps.map((step) => [step.action.operation, step.verdict, step.reason, step.expected.heads.F]), [
    ['scope.activate', 'ineffective', 'missing_release', 1],
    ['exact-retry', 'unchanged', 'original_receipt', 1],
    ['exercise-right', 'ineffective', 'dormant_right', 2],
    ['exact-retry', 'unchanged', 'original_receipt', 2],
    ['scope.activate', 'effective', null, 3],
    ['exact-retry', 'unchanged', 'original_receipt', 3],
    ['exact-retry', 'unchanged', 'original_receipt', 3],
  ]);
  assert.deepEqual(scenario.steps.filter((step) => step.action.operation === 'exact-retry').map((step) => step.action.input), [
    { original: 'F@1' }, { original: 'F@1' }, { original: 'F@3' }, { original: 'F@1' },
  ]);
  for (const [index, step] of scenario.steps.entries()) {
    const active = index >= 4;
    assert.equal(step.expected.activations, active ? 1 : 0);
    assert.equal(step.expected.destination, active ? 'active' : 'started');
    for (const right of ['R_fulfil', 'R_deliver'] as const) assert.equal(step.expected.rights[right].F, active ? 'live' : 'dormant');
    assert.deepEqual(step.expected.exports, boundary('destination-started').exports);
    assert.deepEqual(step.expected.releases, ['S', 'D']);
    assert.deepEqual([step.expected.heads.S, step.expected.heads.D], [24, 1]);
    if (step.action.operation === 'exact-retry') assert.deepEqual(step.expected, scenario.steps[index - 1]!.expected);
  }
  assert.deepEqual(scenario.steps[4]!.action.input, { proofs: ['S-valid-A', 'D-valid-A'], freshAction: true });
  assert.deepEqual(scenario.steps[4]!.expected.owners, boundary('destination-activated').owners);
  const permanentlyBlocked = structuredClone(scenario.steps[4]!.expected);
  permanentlyBlocked.destination = 'started';
  permanentlyBlocked.activations = 0;
  permanentlyBlocked.rights = structuredClone(scenario.steps[3]!.expected.rights);
  permanentlyBlocked.owners = structuredClone(scenario.steps[3]!.expected.owners);
  assert.ok(compareLifecycleObservation(scenario.steps[4]!.expected, permanentlyBlocked).length > 0, 'permanent activation barrier violates the declared outcome');
});

test('another admitted participant event cannot occupy a permanent activation slot', () => {
  const scenario = lifecycleCases.find((item) => item.id === 'intervening-participant-event')!;
  assert.equal(scenario.from, 'destination-started');
  assert.equal(scenario.variant, undefined);
  assert.deepEqual(scenario.steps[0]!.action, {
    operation: 'participant-observation', context: 'F', actor: 'bob', input: { fact: { note: 'waiting' } },
  });
  assert.deepEqual(scenario.steps.map((step) => [step.verdict, step.reason, step.expected.heads.F, step.expected.activations]), [
    ['ineffective', 'unauthorized', 1, 0], ['effective', null, 2, 1],
  ]);
  const before = boundary('destination-started');
  assert.deepEqual(scenario.steps[0]!.expected.rights, before.rights);
  assert.deepEqual(scenario.steps[0]!.expected.owners, before.owners);
  assert.equal(scenario.steps[1]!.action.actor, 'alice');
  assert.deepEqual(scenario.steps[1]!.action.input, { proofs: ['S-valid-A', 'D-valid-A'], freshAction: true });
  assert.deepEqual(scenario.steps[1]!.expected.owners, boundary('destination-activated').owners);
  assert.deepEqual(scenario.steps[1]!.expected.exports, before.exports);
  assert.deepEqual(scenario.steps[1]!.expected.verifiedProofs, ['S', 'D']);
});

test('public proof disclosure has a finite named rule and keeps private source kinds excluded', () => {
  assert.equal(PUBLIC_OPENING_RULE_ID, contentId(publicOpeningRule));
  assert.equal(publicOpeningRule.type, 'dap.fixture.scope-public-openings/2');
  assert.equal(publicOpeningRule.ineffectiveActorOnly.body, 'hidden');
  assert.equal(publicOpeningRule.ineffectiveActorOnly.known, true);
  assert.equal(publicOpeningRule.ineffectiveActorOnly.effective, false);
  assert.deepEqual(publicOpeningRule.ineffectiveActorOnly.indeterminateReasons, ['not_in_v1', 'package_unavailable', 'scope_runtime_required', 'unhandled']);
  assert.deepEqual(publicOpeningRule.ineffectiveActorOnly.indeterminateReasonPrefixes, ['audience_error:', 'fold_error:']);
  assert.equal(PUBLIC_OPENING_RULE_ID, 'sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c');
  assert.equal(publicOpeningRule.kinds.length, 21);
  assert.equal(new Set(publicOpeningRule.kinds).size, 21);
  assert.deepEqual(publicOpeningRule.requiredAudience, ['members', 'spine']);
  assert.equal(publicOpeningRule.otherPositions, 'hidden');
  for (const kind of ['com.example.sale.offer', 'ai.generalbusiness.dap.accept_invite', 'ai.generalbusiness.dap.revoke', 'ai.generalbusiness.dap.scope.release']) assert.ok(publicOpeningRule.kinds.includes(kind));
  for (const kind of ['com.example.sale.offer_terms', 'com.example.sale.counter', 'com.example.inspection.request', 'ai.generalbusiness.dap.disclose', 'ai.generalbusiness.dap.observe', 'com.example.scope.undeclared']) assert.ok(!publicOpeningRule.kinds.includes(kind));
  assert.deepEqual(publicOpeningRule.bannedFields, ['acceptedAmount', 'amount', 'counter', 'offer_terms', 'terms']);
  assert.ok(ORDERING_LIFECYCLE_PROSE.includes('Kim is not a member of S'));
  assert.ok(ORDERING_LIFECYCLE_PROSE.includes('not for any release'));
});

test('public exports are exact, source-linked and exclude the private accepted amount', () => {
  assert.deepEqual(saleExport, { accepted_offer: 'o3', winner: 'bob' });
  assert.deepEqual(deliveryExport, { buyer: 'bob', delivery_slot: 25 });
  assert.deepEqual(exportReferences.S.facts, [15, 17]);
  assert.deepEqual(amountPrivacy.readers, ['alice', 'bob']);
  assert.equal(amountPrivacy.amount, 780);
  for (const item of healthyLifecycle) assert.ok(!JSON.stringify(item.expected.exports).includes('780'));
  const leaked = boundary('destination-activated');
  leaked.exports.S = { accepted_offer: 'o3', winner: 'bob', nested: { amount: 780 } };
  assert.ok(lifecycleInvariantViolations(leaked).includes('private export field: S/amount'));
  assert.ok(lifecycleInvariantViolations(leaked).includes('unexpected export field: S'));
  const disguised = boundary('destination-activated');
  disguised.exports.S = { accepted_offer: 'o3', winner: 'bob', price: 780 };
  assert.ok(lifecycleInvariantViolations(disguised).includes('unexpected export field: S'));
});

test('changed-genesis enumeration covers every field, container, removal and added field', () => {
  const paths = genesisPaths();
  assert.equal(new Set(changedGenesisCases.map((item) => item.id)).size, changedGenesisCases.length);
  assert.equal(changedGenesisCases.length, paths.length * 2 + 1);
  for (const path of [
    '/body/actor', '/body/nonce', '/sig', '/body/payload/foundation', '/body/payload/runtime',
    '/body/payload/sequencing/profile', '/body/payload/sequencing/writer',
    '/body/payload/grants/0/principal', '/body/payload/bindings/0/package',
    '/body/payload/origins', '/body/payload/referents/0', '/body/payload/route',
    '/body/payload/transition/sources/0/genesis', '/body/payload/transition/sources/1/rights/0',
    '/body/payload/transition/manifest', '/body/payload/transition/transformation',
    '/body/payload/transition/retainedDependencies/0',
  ]) assert.ok(paths.includes(path), path);
  const original = contentId(destinationGenesisTemplate);
  for (const item of changedGenesisCases) {
    let changed: Json = structuredClone(destinationGenesisTemplate);
    const parts = item.mutation.path.split('/').slice(1);
    if (parts.length === 0) changed = item.mutation.operation === 'remove' ? null : { changed: true };
    else {
      let target = changed as Record<string, Json>;
      for (const key of parts.slice(0, -1)) target = target[key] as Record<string, Json>;
      const key = parts.at(-1)!;
      if (item.mutation.operation === 'remove') {
        if (Array.isArray(target)) target.splice(Number(key), 1);
        else delete target[key];
      } else target[key] = { changed: true };
    }
    assert.notEqual(contentId(changed), original, item.id);
    assert.deepEqual(item.expected.validDifferentGenesis, {
      authorizedAttempt: { verdict: 'ineffective', reason: 'destination_mismatch', authorized: true },
      unauthorizedAttempt: { verdict: 'ineffective', reason: 'unauthorized', authorized: false },
    });
    assert.equal(item.expected.invalidGenesis.verdict, 'rejected_before_activation');
    assert.deepEqual(item.expected.invalidGenesis.recognizedRejections, [
      { boundary: 'codec', reason: 'malformed_envelope' },
      { boundary: 'codec', reason: 'invalid_actor_signature' },
      { boundary: 'profile', reason: 'invalid_genesis' },
      { boundary: 'profile', reason: 'unsupported_profile' },
    ]);
    assert.equal(item.expected.unrecognizedError, 'test_failure');
    assert.equal(item.expected.activations, 0);
    assert.deepEqual(item.expected.activeDestinationRights, []);
  }
  assert.ok(!JSON.stringify(destinationGenesisTemplate).includes('proof'));
  assert.ok(!JSON.stringify(destinationGenesisTemplate).includes('receipt'));
});

test('independent safety checks detect double ownership, premature activation and import duplication', () => {
  const mutations: Array<[string, (snapshot: LifecycleSnapshot) => void]> = [
    ['double authority: R_fulfil', (s) => { s.rights.R_fulfil.S = 'live'; }],
    ['released source revived: S', (s) => { s.rights.R_fulfil.S = 'live'; }],
    ['activation count must be zero or one', (s) => { s.activations = 2; }],
    ['activation lacks both effective releases and verified proofs', (s) => { s.verifiedProofs = ['S']; }],
    ['duplicate import', (s) => { s.imports.push('S-export'); }],
    ['inspection import before local boundary', (s) => { s.heads.S = 19; }],
    ['inspection owns exclusive right: R_sell', (s) => { s.rights.R_sell.I = 'live'; }],
    ['wrong principal: R_fulfil', (s) => { s.owners.R_fulfil[0]!.principal = 'bob'; }],
    ['owner/status mismatch: R_fulfil', (s) => { s.owners.R_fulfil = []; }],
  ];
  for (const [message, mutate] of mutations) {
    const snapshot = boundary('destination-activated');
    mutate(snapshot);
    assert.ok(lifecycleInvariantViolations(snapshot).includes(message), message);
  }
  const premature = boundary('destination-started');
  premature.rights.R_fulfil.F = 'live';
  assert.ok(lifecycleInvariantViolations(premature).includes('destination exercised dormant right'));
});

test('future observation comparison rejects changed, missing and additional state, including unsafe mutations', () => {
  const expected = boundary('destination-activated');
  assert.deepEqual(compareLifecycleObservation(expected, structuredClone(expected)), []);
  const changed = structuredClone(expected);
  changed.rights.R_fulfil.S = 'live';
  assert.ok(compareLifecycleObservation(expected, changed).some((message) => message.startsWith('snapshot/rights/R_fulfil/S:')));
  const missing = structuredClone(expected) as Partial<LifecycleSnapshot>;
  delete missing.inspection;
  assert.ok(compareLifecycleObservation(expected, missing).includes('snapshot/inspection: missing field'));
  assert.ok(compareLifecycleObservation(expected, { ...expected, amount: 780 }).includes('snapshot/amount: unexpected field'));
  assert.ok(compareLifecycleObservation(expected, { ...expected, releases: {} }).includes('snapshot/releases: wrong shape'));
});

test('replay obligations preserve pre-attach outcomes, local import timing and writer retry identity', () => {
  assert.deepEqual(replayObligations.unchangedPrefix, { from: 0, through: 10, compare: ['event-id', 'verdict', 'audience', 'projection-at-original-frontier'] });
  assert.equal(replayObligations.unchangedAfterReplay.through, 19);
  assert.deepEqual(replayObligations.preAttach.offers.map((offer) => [offer.id, offer.position]), [['o1', 6], ['o2', 8]]);
  assert.deepEqual(replayObligations.preAttach.privateTerms.map((terms) => [terms.position, terms.amount, terms.readers]), [
    [7, 700, ['alice', 'bob']], [9, 750, ['alice', 'carol']], [10, 780, ['alice', 'bob']],
  ]);
  assert.equal(boundary('inspection-result-recorded').inspection.resultInS, null);
  assert.equal(boundary('sale-closed').inspection.resultInS, null);
  assert.equal(boundary('inspection-imported').heads.S, 20);
  assert.equal(boundary('inspection-imported').inspection.resultInS, 'pass:o2');
  assert.equal(boundary('writer-sealed').writers.S, null);
  assert.equal(boundary('writer-assigned').writers.S, 'W1');
  assert.deepEqual(replayObligations.retries, { original: 'S@17', identicalReceiptAfterMove: true, newPosition: false });
  assert.equal(replayObligations.sourceOrders.inventCrossSourceOrder, false);
});

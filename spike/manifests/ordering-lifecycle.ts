// O1 predeclarations for O4. This is test data and an observation checker,
// not a transfer fold, proof verifier, or evidence that O4 already works.
import { readFileSync } from 'node:fs';
import { contentId, type Json } from '../src/canon.ts';

export const contexts = ['S', 'I', 'D', 'F'] as const;
export const rights = ['R_sell', 'R_fulfil', 'R_deliver'] as const;
export type Context = typeof contexts[number];
export type Right = typeof rights[number];
export type Source = 'S' | 'D';
export type RightStatus = 'absent' | 'live' | 'spent' | 'released' | 'dormant';
export const rightOwners = { R_sell: 'alice', R_fulfil: 'alice', R_deliver: 'kim' } as const;
type Locations = Record<Context, RightStatus>;
type Owner = { context: Context; principal: string };

export interface LifecycleSnapshot {
  heads: Record<Context, number | null>;
  writers: Record<Context, string | null>;
  sale: { status: 'open' | 'accepted' | 'closed'; accepted_offer: string | null; winner: string | null };
  inspection: { attached: boolean; requested: boolean; resultInI: string | null; resultInS: string | null; imports: number };
  rights: Record<Right, Locations>;
  owners: Record<Right, Owner[]>;
  destination: 'undescribed' | 'described' | 'started' | 'active';
  releases: Source[];
  verifiedProofs: Source[];
  activations: number;
  exports: Record<Source, Json | null>;
  imports: string[];
  deliveryConfirmed: boolean;
  fulfilled: boolean;
}

export interface LifecycleAction {
  operation: string;
  context: Context | null;
  actor: string | null;
  input: Json;
}
export interface ExpectedBoundary {
  id: string;
  action: LifecycleAction;
  expected: LifecycleSnapshot;
}
export interface LifecycleCase {
  id: string;
  from: string;
  /** Rebuild the named prefix with these inputs before signing this branch. */
  variant?: Json;
  initial?: LifecycleSnapshot;
  steps: Array<{
    action: LifecycleAction;
    verdict: 'effective' | 'ineffective' | 'refused' | 'unchanged';
    reason: string | null;
    expected: LifecycleSnapshot;
  }>;
}

const absent: Locations = { S: 'absent', I: 'absent', D: 'absent', F: 'absent' };
const soldRights: LifecycleSnapshot['rights'] = {
  R_sell: { ...absent, S: 'spent' },
  R_fulfil: { ...absent, S: 'live' },
  R_deliver: { ...absent },
};
export const saleExport = { accepted_offer: 'o3', winner: 'bob' };
export const deliveryExport = { buyer: 'bob', delivery_slot: 25 };
export const transferExports = { S: saleExport, D: deliveryExport };
export const exportReferences = {
  S: { genesis: 'S', prefix: 23, facts: [15, 17], identity: 'S-export' },
  D: { genesis: 'D', prefix: 0, facts: [0], identity: 'D-export' },
};
export const amountPrivacy = {
  acceptedOffer: 'o3', amount: 780, readers: ['alice', 'bob'],
  forbiddenExportFields: ['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms'],
};

// Ratified pre-formal-O4-baseline disclosure/completeness rule. O4 must pin
// this identity in its implemented certificate and destination profile.
export const publicOpeningRule = {
  type: 'dap.fixture.scope-public-openings/1',
  kinds: [
    'ai.generalbusiness.dap.genesis', 'ai.generalbusiness.dap.accept_invite',
    'ai.generalbusiness.dap.grant', 'ai.generalbusiness.dap.revoke',
    'ai.generalbusiness.dap.attach', 'ai.generalbusiness.dap.close',
    'ai.generalbusiness.dap.scope.release', 'ai.generalbusiness.dap.scope.activate',
    'ai.generalbusiness.dap.admit', 'ai.generalbusiness.dap.seq.request',
    'ai.generalbusiness.dap.seq.seal', 'ai.generalbusiness.dap.seq.assign',
    'com.example.sale.listing', 'com.example.sale.offer', 'com.example.sale.withdraw',
    'com.example.sale.accept', 'com.example.sale.close',
    'com.example.scope.result', 'com.example.scope.exercise',
    'com.example.scope.import-export', 'com.example.scope.recover',
  ].sort(),
  requiredAudience: ['members', 'spine'],
  otherPositions: 'hidden',
  bannedFields: ['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms'].sort(),
  excludedKinds: ['ai.generalbusiness.dap.disclose', 'ai.generalbusiness.dap.observe'].sort(),
};
export const PUBLIC_OPENING_RULE_ID = contentId(publicOpeningRule);

// The labels below are handles for O4 to bind to actual content ids, keys,
// packages and signatures. This is a semantic template, not a codec vector.
// Neither the template nor its eventual signed genesis contains releases.
export const destinationGenesisTemplate = {
  body: {
    kind: 'ai.generalbusiness.dap.genesis', actor: 'alice', nonce: 'F-genesis-nonce',
    payload: {
      foundation: 'F0', runtime: 'dap.fixture.ts/1',
      sequencing: { profile: 'single-writer', writer: 'WF' },
      grants: [
        { principal: 'alice', rights: ['R_fulfil'], capabilities: ['scope.activate'] },
        { principal: 'bob', rights: [], capabilities: [] },
        { principal: 'kim', rights: ['R_deliver'], capabilities: [] },
      ],
      bindings: [{ package: 'fulfilment-package', version: 1 }],
      origins: [], referents: ['guitar-1'], route: 'route:F',
      transition: {
        identity: 'join-S-D', manifest: 'join-manifest',
        sources: [
          { genesis: 'S', prefix: 23, rights: ['R_fulfil'], export: 'S-export' },
          { genesis: 'D', prefix: 0, rights: ['R_deliver'], export: 'D-export' },
        ],
        transformation: 'copy-union-reject-duplicates-and-buyer-mismatch',
        retainedDependencies: ['sale-package', 'delivery-package', 'source-grant-bases'],
      },
    },
  },
  sig: 'F-genesis-actor-signature',
};

function action(operation: string, context: Context | null, actor: string | null, input: Json = {}): LifecycleAction {
  return { operation, context, actor, input };
}

// Expansion of literal expected observations only: no input event is folded.
function changed(base: LifecycleSnapshot, fields: Partial<LifecycleSnapshot>): LifecycleSnapshot {
  const result = structuredClone({ ...base, ...fields });
  if (fields.rights) for (const right of rights) {
    result.owners[right] = contexts.filter((context) => fields.rights![right][context] === 'live')
      .map((context) => ({ context, principal: rightOwners[right] }));
  }
  return result;
}

const started: LifecycleSnapshot = {
  heads: { S: 1, I: null, D: null, F: null },
  writers: { S: 'W0', I: null, D: null, F: null },
  sale: { status: 'open', accepted_offer: null, winner: null },
  inspection: { attached: false, requested: false, resultInI: null, resultInS: null, imports: 0 },
  rights: { R_sell: { ...absent, S: 'live' }, R_fulfil: { ...absent }, R_deliver: { ...absent } },
  owners: { R_sell: [{ context: 'S', principal: 'alice' }], R_fulfil: [], R_deliver: [] },
  destination: 'undescribed', releases: [], verifiedProofs: [], activations: 0,
  exports: { S: null, D: null }, imports: [], deliveryConfirmed: false, fulfilled: false,
};
const beforeAttach = changed(started, { heads: { ...started.heads, S: 10 } });
const attached = changed(beforeAttach, {
  heads: { ...started.heads, S: 11 }, inspection: { ...started.inspection, attached: true },
});
const requested = changed(attached, {
  heads: { ...attached.heads, S: 14 }, inspection: { ...attached.inspection, requested: true },
});
const spawned = changed(requested, {
  heads: { ...requested.heads, I: 0 }, writers: { ...requested.writers, I: 'WI' },
});
const inspected = changed(spawned, {
  heads: { ...spawned.heads, I: 1 }, inspection: { ...spawned.inspection, resultInI: 'pass:o2' },
});
const accepted = changed(inspected, {
  heads: { ...inspected.heads, S: 17 }, sale: { status: 'accepted', accepted_offer: 'o3', winner: 'bob' },
  rights: soldRights,
});
const closed = changed(accepted, { heads: { ...accepted.heads, S: 19 }, sale: { ...accepted.sale, status: 'closed' } });
const imported = changed(closed, {
  heads: { ...closed.heads, S: 20 }, inspection: { ...closed.inspection, resultInS: 'pass:o2', imports: 1 },
});
const sealed = changed(imported, { heads: { ...imported.heads, S: 21 }, writers: { ...imported.writers, S: null } });
const assigned = changed(sealed, { heads: { ...sealed.heads, S: 22 }, writers: { ...sealed.writers, S: 'W1' } });
const continued = changed(assigned, { heads: { ...assigned.heads, S: 23 } });
const delivery = changed(continued, {
  heads: { ...continued.heads, D: 0 }, writers: { ...continued.writers, D: 'WD' },
  rights: { ...continued.rights, R_deliver: { ...absent, D: 'live' } },
});
const described = changed(delivery, { destination: 'described' });
const releasedS = changed(described, {
  heads: { ...described.heads, S: 24 }, releases: ['S'], exports: { S: saleExport, D: null },
  rights: { ...described.rights, R_fulfil: { ...absent, S: 'released' } },
});
const releasedBoth = changed(releasedS, {
  heads: { ...releasedS.heads, D: 1 }, releases: ['S', 'D'], exports: transferExports,
  rights: { ...releasedS.rights, R_deliver: { ...absent, D: 'released' } },
});
const destinationStarted = changed(releasedBoth, {
  heads: { ...releasedBoth.heads, F: 0 }, writers: { ...releasedBoth.writers, F: 'WF' },
  destination: 'started', imports: ['S-export', 'D-export'],
  rights: {
    ...releasedBoth.rights,
    R_fulfil: { ...absent, S: 'released', F: 'dormant' },
    R_deliver: { ...absent, D: 'released', F: 'dormant' },
  },
});
const activated = changed(destinationStarted, {
  heads: { ...destinationStarted.heads, F: 1 }, destination: 'active', verifiedProofs: ['S', 'D'], activations: 1,
  rights: {
    ...destinationStarted.rights,
    R_fulfil: { ...absent, S: 'released', F: 'live' },
    R_deliver: { ...absent, D: 'released', F: 'live' },
  },
});
const delivered = changed(activated, {
  heads: { ...activated.heads, F: 2 }, deliveryConfirmed: true,
  rights: { ...activated.rights, R_deliver: { ...absent, D: 'released', F: 'spent' } },
});
const fulfilled = changed(delivered, {
  heads: { ...delivered.heads, F: 3 }, fulfilled: true,
  rights: { ...delivered.rights, R_fulfil: { ...absent, S: 'released', F: 'spent' } },
});

export const healthyLifecycle: ExpectedBoundary[] = [
  { id: 'sale-started', action: action('start-and-adopt-listing', 'S', 'alice'), expected: started },
  { id: 'before-attach', action: action('sale-trace-through-10', 'S', null), expected: beforeAttach },
  { id: 'inspection-attached', action: action('attach-inspection', 'S', 'alice'), expected: attached },
  { id: 'inspection-requested', action: action('sale-trace-through-14', 'S', 'carol'), expected: requested },
  { id: 'inspection-spawned', action: action('spawn-inspection', 'I', 'ivan', { mandate: 'inspect:o2', source: 'S@14' }), expected: spawned },
  { id: 'inspection-result-recorded', action: action('sign-inspection-result', 'I', 'ivan', { result: 'pass:o2' }), expected: inspected },
  { id: 'sale-accepted', action: action('sale-trace-through-17', 'S', 'alice'), expected: accepted },
  { id: 'sale-closed', action: action('sale-trace-through-19', 'S', 'alice'), expected: closed },
  { id: 'inspection-imported', action: action('import-result', 'S', 'alice', { result: 'I@1', identity: 'inspection-result' }), expected: imported },
  { id: 'writer-sealed', action: action('seq.seal', 'S', 'control', { predecessor: 'S@20' }), expected: sealed },
  { id: 'writer-assigned', action: action('seq.assign', 'S', 'control', { predecessor: 'S@21', successor: 'W1' }), expected: assigned },
  { id: 'writer-continued', action: action('successor-first-entry', 'S', 'alice', { predecessor: 'S@22', writer: 'W1' }), expected: continued },
  { id: 'delivery-started', action: action('start-delivery', 'D', 'kim', deliveryExport), expected: delivery },
  { id: 'destination-described', action: action('prepare-exact-genesis', 'F', 'alice', { transition: 'join-S-D', sources: ['S@23', 'D@0'] }), expected: described },
  { id: 'sale-released', action: action('scope.release', 'S', 'alice', { right: 'R_fulfil', destination: 'F', export: 'S-export' }), expected: releasedS },
  { id: 'delivery-released', action: action('scope.release', 'D', 'kim', { right: 'R_deliver', destination: 'F', export: 'D-export' }), expected: releasedBoth },
  { id: 'destination-started', action: action('start-exact-genesis', 'F', 'alice'), expected: destinationStarted },
  { id: 'destination-activated', action: action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'] }), expected: activated },
  { id: 'delivery-confirmed', action: action('exercise-right', 'F', 'kim', { right: 'R_deliver' }), expected: delivered },
  { id: 'sale-fulfilled', action: action('exercise-right', 'F', 'alice', { right: 'R_fulfil' }), expected: fulfilled },
];

export function boundary(id: string): LifecycleSnapshot {
  const found = healthyLifecycle.find((item) => item.id === id);
  if (!found) throw new Error(`unknown lifecycle boundary: ${id}`);
  return structuredClone(found.expected);
}

function caseStep(operation: LifecycleAction, verdict: LifecycleCase['steps'][number]['verdict'], reason: string | null, expected: LifecycleSnapshot): LifecycleCase['steps'][number] {
  return { action: operation, verdict, reason, expected: structuredClone(expected) };
}
function appended(base: LifecycleSnapshot, context: Context): LifecycleSnapshot {
  const head = base.heads[context];
  if (head === null) throw new Error(`fixture cannot append to absent ${context}`);
  return changed(base, { heads: { ...base.heads, [context]: head + 1 } });
}
function ineffective(id: string, from: string, operation: LifecycleAction, reason: string): LifecycleCase {
  const base = boundary(from);
  return { id, from, steps: [caseStep(operation, 'ineffective', reason, appended(base, operation.context!))] };
}

const partialDestination = changed(destinationStarted, {
  heads: { ...destinationStarted.heads, D: 0 }, releases: ['S'], exports: { S: saleExport, D: null },
  rights: { ...destinationStarted.rights, R_deliver: { ...absent, D: 'live', F: 'dormant' } },
});
const oneProof = changed(appended(destinationStarted, 'F'), { verifiedProofs: ['S'] });
const dormantExercise = appended(oneProof, 'F');
const activatedAfterExercise = changed(activated, { heads: { ...activated.heads, F: 3 } });
const retryAfterRestart = appended(activated, 'F');

export const lifecycleCases: LifecycleCase[] = [
  {
    id: 'one-source-release-missing', from: 'sale-released', steps: [
      caseStep(action('start-exact-genesis', 'F', 'alice'), 'effective', null, partialDestination),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A'] }), 'ineffective', 'missing_release', changed(appended(partialDestination, 'F'), { verifiedProofs: ['S'] })),
    ],
  },
  {
    id: 'withheld-release-evidence', from: 'destination-started', steps: [
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A'], withheld: 'D-valid-A' }), 'ineffective', 'missing_release', oneProof),
      caseStep(action('timeout-recovery-at-source', 'S', 'alice', { elapsed: 100 }), 'ineffective', 'no_safe_recovery_evidence', appended(oneProof, 'S')),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'] }), 'effective', null, changed(activated, { heads: { ...activated.heads, S: 25, F: 2 } })),
    ],
  },
  {
    id: 'intervening-dormant-exercise', from: 'destination-started', steps: [
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A'], withheld: 'D-valid-A' }), 'ineffective', 'missing_release', oneProof),
      caseStep(action('exact-retry', 'F', 'alice', { original: 'F@1' }), 'unchanged', 'original_receipt', oneProof),
      caseStep(action('exercise-right', 'F', 'alice', { right: 'R_fulfil' }), 'ineffective', 'dormant_right', dormantExercise),
      caseStep(action('exact-retry', 'F', 'alice', { original: 'F@1' }), 'unchanged', 'original_receipt', dormantExercise),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'], freshAction: true }), 'effective', null, activatedAfterExercise),
      caseStep(action('exact-retry', 'F', 'alice', { original: 'F@3' }), 'unchanged', 'original_receipt', activatedAfterExercise),
      caseStep(action('exact-retry', 'F', 'alice', { original: 'F@1' }), 'unchanged', 'original_receipt', activatedAfterExercise),
    ],
  },
  {
    id: 'intervening-participant-event', from: 'destination-started', steps: [
      caseStep(action('participant-observation', 'F', 'bob', { fact: { note: 'waiting' } }), 'ineffective', 'unauthorized', appended(destinationStarted, 'F')),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'], freshAction: true }), 'effective', null, changed(activated, { heads: { ...activated.heads, F: 2 } })),
    ],
  },
  {
    id: 'restart-before-activation', from: 'destination-started', steps: [
      caseStep(action('restart', 'F', null), 'unchanged', null, destinationStarted),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'] }), 'effective', null, activated),
    ],
  },
  {
    id: 'repeated-activation-after-restart', from: 'destination-activated', steps: [
      caseStep(action('restart', 'F', null), 'unchanged', null, activated),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'], freshAction: true }), 'ineffective', 'already_active', retryAfterRestart),
      caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-B', 'D-valid-B'], freshAction: true }), 'ineffective', 'already_active', appended(retryAfterRestart, 'F')),
    ],
  },
  {
    id: 'exact-retry-activation', from: 'destination-activated', steps: [
      caseStep(action('exact-retry', 'F', 'alice', { original: 'F@1' }), 'unchanged', 'original_receipt', activated),
    ],
  },
  {
    id: 'timeout-after-hidden-activation', from: 'destination-activated', steps: [
      caseStep(action('timeout-recovery-at-source', 'S', 'alice', { elapsed: 100, destinationReply: 'withheld' }), 'ineffective', 'no_safe_recovery_evidence', appended(activated, 'S')),
    ],
  },
  ineffective('duplicate-inspection-import', 'inspection-imported', action('import-result', 'S', 'alice', { result: 'I@1', identity: 'inspection-result' }), 'duplicate_import'),
  ineffective('duplicate-state-import', 'destination-activated', action('import-export', 'F', 'alice', { export: 'S-export' }), 'duplicate_import'),
  ineffective('stale-source-proposal-at-source', 'sale-released', action('submit-signed-source-proposal', 'S', 'bob', { signedAt: 'S@14', genesis: 'S', offer: 'o4' }), 'not_open'),
  {
    id: 'stale-source-proposal-at-destination', from: 'destination-activated', steps: [
      caseStep(action('submit-signed-source-proposal', 'F', 'bob', { signedAt: 'S@14', genesis: 'S', offer: 'o4' }), 'refused', 'wrong_genesis', activated),
    ],
  },
  ineffective('unauthorized-release', 'destination-described', action('scope.release', 'S', 'bob', { right: 'R_fulfil', destination: 'F' }), 'unauthorized'),
  ineffective('release-unowned-right', 'destination-described', action('scope.release', 'D', 'kim', { right: 'R_fulfil', destination: 'F' }), 'unowned_right'),
  ineffective('release-already-released-right', 'sale-released', action('scope.release', 'S', 'alice', { right: 'R_fulfil', destination: 'F' }), 'already_released'),
  ineffective('receipt-for-ineffective-release', 'destination-started', action('scope.activate', 'F', 'alice', { proofs: ['S-ordered-but-ineffective', 'D-valid-A'] }), 'ineffective_release'),
  ineffective('receipt-for-unauthorized-release', 'destination-started', action('scope.activate', 'F', 'alice', { proofs: ['S-ordered-but-unauthorized', 'D-valid-A'] }), 'unauthorized_release'),
  ineffective('wrong-destination-release', 'destination-started', action('scope.activate', 'F', 'alice', { proofs: ['S-valid-for-F-other', 'D-valid-A'] }), 'destination_mismatch'),
  ineffective('two-sources-export-same-right', 'destination-started', action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-claims-R_fulfil'], duplicateRight: 'R_fulfil' }), 'duplicate_right'),
  {
    id: 'mismatched-buyer', from: 'destination-started', variant: { deliveryBuyer: 'carol' },
    initial: changed(destinationStarted, { exports: { S: saleExport, D: { buyer: 'carol', delivery_slot: 25 } } }),
    steps: [caseStep(action('scope.activate', 'F', 'alice', { proofs: ['S-valid-A', 'D-valid-A'] }), 'ineffective', 'mismatch',
      changed(appended(destinationStarted, 'F'), { exports: { S: saleExport, D: { buyer: 'carol', delivery_slot: 25 } } }))],
  },
  ineffective('stale-export-prefix', 'destination-described', action('scope.release', 'S', 'alice', { proposedPrefix: 'S@22', currentPrefix: 'S@23' }), 'stale_export'),
  ...(['S', 'D', 'F'] as const).map((context) => ineffective(
    `spend-before-activation-${context}`, 'destination-started',
    action('exercise-right', context, context === 'D' ? 'kim' : 'alice', { right: context === 'D' ? 'R_deliver' : 'R_fulfil' }),
    context === 'F' ? 'dormant_right' : 'released_right',
  )),
  ineffective('spend-before-activation-F-deliver', 'destination-started', action('exercise-right', 'F', 'kim', { right: 'R_deliver' }), 'dormant_right'),
  {
    ...ineffective('origin-spends-transferred-right', 'destination-started', action('adopt-origin-at-start', 'F', 'alice', { right: 'R_fulfil' }), 'dormant_right'),
    variant: { destinationOrigins: [{ actor: 'alice', exercise: 'R_fulfil' }], recomputeCommitmentBeforeReleases: true },
  },
  {
    id: 'move-preserves-retry', from: 'writer-continued', steps: [
      caseStep(action('exact-retry', 'S', 'alice', { original: 'S@17', oldWriter: 'W0', writer: 'W1' }), 'unchanged', 'original_receipt', continued),
    ],
  },
  {
    id: 'unassigned-writer-candidates', from: 'writer-sealed', steps: [
      caseStep(action('continue-from-nomination', 'S', 'candidate-X', { predecessor: 'S@21' }), 'refused', 'no_assignment', sealed),
      caseStep(action('continue-from-nomination', 'S', 'candidate-Y', { predecessor: 'S@21' }), 'refused', 'no_assignment', sealed),
    ],
  },
  {
    id: 'retired-writer-continuation', from: 'writer-continued', steps: [
      caseStep(action('continue-retired-writer', 'S', 'W0'), 'refused', 'retired_assignment', continued),
    ],
  },
];

/** Every existing field/container can change; the root can gain a new field. */
export function genesisPaths(value: Json = destinationGenesisTemplate, path = ''): string[] {
  if (value === null || typeof value !== 'object') return [path];
  return [path, ...Object.entries(value).flatMap(([key, child]) => genesisPaths(child, `${path}/${key}`))];
}
// These are conditional validation outcomes, not permission to treat any
// thrown exception as an ineffective activation. O4 records the exact known
// diagnostic at its codec/profile boundary; unrecognized errors fail the run.
const changedGenesisExpectation = {
  activations: 0, activeDestinationRights: [] as string[],
  validDifferentGenesis: {
    authorizedAttempt: { verdict: 'ineffective', reason: 'destination_mismatch', authorized: true },
    unauthorizedAttempt: { verdict: 'ineffective', reason: 'unauthorized', authorized: false },
  },
  invalidGenesis: {
    verdict: 'rejected_before_activation',
    recognizedRejections: [
      { boundary: 'codec', reason: 'malformed_envelope' },
      { boundary: 'codec', reason: 'invalid_actor_signature' },
      { boundary: 'profile', reason: 'invalid_genesis' },
      { boundary: 'profile', reason: 'unsupported_profile' },
    ],
  },
  unrecognizedError: 'test_failure',
};
export const changedGenesisCases: Array<{
  id: string; from: string; mutation: { path: string; operation: 'replace' | 'remove' | 'add' };
  expected: typeof changedGenesisExpectation;
}> = genesisPaths().flatMap((path) => (['replace', 'remove'] as const).map((mutation) => ({
  id: `changed-genesis:${mutation}:${path || '/'}`,
  from: 'destination-started',
  mutation: { path, operation: mutation },
  expected: structuredClone(changedGenesisExpectation),
})));
changedGenesisCases.push({
  id: 'changed-genesis:add:/extra', from: 'destination-started',
  mutation: { path: '/extra', operation: 'add' },
  expected: structuredClone(changedGenesisExpectation),
});

export const replayObligations = {
  saleGenesis: 'same-before-and-after-move',
  unchangedPrefix: { from: 0, through: 10, compare: ['event-id', 'verdict', 'audience', 'projection-at-original-frontier'] },
  unchangedAfterReplay: { from: 0, through: 19, compare: ['event-id', 'verdict', 'projection-at-original-frontier'] },
  preAttach: {
    status: 'open', accepted: null,
    offers: [{ id: 'o1', author: 'bob', position: 6, status: 'open' }, { id: 'o2', author: 'carol', position: 8, status: 'open' }],
    privateTerms: [
      { position: 7, amount: 700, readers: ['alice', 'bob'] },
      { position: 9, amount: 750, readers: ['alice', 'carol'] },
      { position: 10, amount: 780, readers: ['alice', 'bob'] },
    ],
  },
  inspectionImport: { source: 'I@1', sourceIdentityPreserved: true, effectiveInSFrom: 20, earlierEffect: false },
  sourceOrders: { S: [20, 21, 22, 23, 24], D: [0, 1], inventCrossSourceOrder: false },
  retries: { original: 'S@17', identicalReceiptAfterMove: true, newPosition: false },
};

export function activeOwners(snapshot: LifecycleSnapshot, right: Right): Owner[] {
  return structuredClone(snapshot.owners[right]);
}

/** Independent safety checks for declared or subsequently observed snapshots. */
export function lifecycleInvariantViolations(snapshot: LifecycleSnapshot): string[] {
  const errors: string[] = [];
  for (const right of rights) {
    const liveContexts = contexts.filter((context) => snapshot.rights[right][context] === 'live');
    const owners = activeOwners(snapshot, right);
    if (owners.length > 1 || liveContexts.length > 1) errors.push(`double authority: ${right}`);
    if (owners.length !== liveContexts.length || owners.some((owner) => !liveContexts.includes(owner.context))) errors.push(`owner/status mismatch: ${right}`);
    if (owners.some((owner) => owner.principal !== rightOwners[right])) errors.push(`wrong principal: ${right}`);
    for (const context of contexts) {
      if (snapshot.heads[context] === null && snapshot.rights[right][context] !== 'absent') errors.push(`right in absent context: ${context}/${right}`);
    }
    if (snapshot.rights[right].I !== 'absent') errors.push(`inspection owns exclusive right: ${right}`);
  }
  for (const source of snapshot.releases) {
    const right = source === 'S' ? 'R_fulfil' : 'R_deliver';
    if (snapshot.rights[right][source] !== 'released') errors.push(`released source revived: ${source}`);
  }
  if (snapshot.activations !== 0 && snapshot.activations !== 1) errors.push('activation count must be zero or one');
  if (snapshot.activations === 1 && (!['S', 'D'].every((source) => snapshot.releases.includes(source as Source) && snapshot.verifiedProofs.includes(source as Source)) || snapshot.destination !== 'active')) errors.push('activation lacks both effective releases and verified proofs');
  if (snapshot.activations === 0 && rights.some((right) => ['live', 'spent'].includes(snapshot.rights[right].F))) errors.push('destination exercised dormant right');
  if (snapshot.inspection.imports > 1 || new Set(snapshot.imports).size !== snapshot.imports.length) errors.push('duplicate import');
  if (snapshot.inspection.resultInS !== null && (snapshot.heads.S! < 20 || snapshot.inspection.imports !== 1)) errors.push('inspection import before local boundary');
  for (const source of ['S', 'D'] as const) {
    const exported = snapshot.exports[source];
    const keys = source === 'S' ? ['accepted_offer', 'winner'] : ['buyer', 'delivery_slot'];
    if (exported !== null && (Array.isArray(exported) || typeof exported !== 'object' || Object.keys(exported).some((key) => !keys.includes(key)))) errors.push(`unexpected export field: ${source}`);
    const visit = (value: Json): void => {
      if (value === null || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (amountPrivacy.forbiddenExportFields.includes(key)) errors.push(`private export field: ${source}/${key}`);
        visit(child);
      }
    };
    visit(exported);
  }
  return errors;
}

/** Compare a future runner's whole observation, including missing/extra fields. */
export function compareLifecycleObservation(expected: LifecycleSnapshot, observed: unknown): string[] {
  const errors: string[] = [];
  const visit = (wanted: unknown, got: unknown, path: string): void => {
    if (wanted === null || typeof wanted !== 'object') {
      if (wanted !== got) errors.push(`${path}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(got)}`);
      return;
    }
    if (got === null || typeof got !== 'object' || Array.isArray(wanted) !== Array.isArray(got)) {
      errors.push(`${path}: wrong shape`); return;
    }
    const a = wanted as Record<string, unknown>;
    const b = got as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(key in a)) errors.push(`${path}/${key}: unexpected field`);
      else if (!(key in b)) errors.push(`${path}/${key}: missing field`);
      else visit(a[key], b[key], `${path}/${key}`);
    }
  };
  visit(expected, observed, 'snapshot');
  return errors;
}

export const ORDERING_LIFECYCLE_PROSE = readFileSync(new URL('./ordering-lifecycle.md', import.meta.url), 'utf8');
export const ORDERING_LIFECYCLE_MANIFEST_ID = contentId({
  prose: contentId(ORDERING_LIFECYCLE_PROSE),
  executable: contentId(readFileSync(new URL('./ordering-lifecycle.ts', import.meta.url), 'utf8')),
});

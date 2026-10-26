import { expect, test } from 'vitest';
import type { Entry, FactRef, RulesObservation, ScopeRef } from '@generalbusiness/dap-contract';
import { PROPOSED_BOUNDS } from '@generalbusiness/dap-contract';
import { canonicalize, utf8 } from '@generalbusiness/dap-bytes';
import { valueDigest } from '@generalbusiness/dap-derive';
import { d, keys, otherLane, t } from '@generalbusiness/dap-derive/testing';
import { RULES_PATTERNS } from '../src/extents.ts';
import { rulesPolicyProposalV11, type RulesPolicyV11 } from '../src/rules-policy-v11.ts';
import { certifiedCaptureBudgetV15, certifiedPublicationBudgetV15, certifiedPublicationStateV15, type CertifiedPublicationStateV15 } from '../src/destination-budget-v15.ts';

// All facts, the rules observation and proof rows below are written by hand.
// These witness byte admission and codec correspondence, not native authority.
const destination: ScopeRef = { ...otherLane, kind: 'destination' };
const membership: ScopeRef = { ...otherLane, kind: 'membership' };
const rules: ScopeRef = { ...otherLane, kind: 'rules' };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d('a') });
function record(policy: RulesPolicyV11): CertifiedPublicationStateV15 {
  const proposed = rulesPolicyProposalV11(policy);
  if (!proposed.ok) throw Error('A strict fixture policy is required');
  const certificate = { request: fact(1, destination), certificate: fact(2, destination), proof: d('b'), commit: 'a'.repeat(40) };
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate };
  const observation: RulesObservation = { subject: 'rules', of: rules, head: { seq: 3, hash: d('c') }, revision: 3, definition: 'platform:rules@12', at: t(0),
    content: { asked: 'rules', approvals: policy.approvals, ownerMayReview: policy.ownerMayReview, checks: policy.checks.map(check => ({ ...check, checker: check.checker.member })),
      labels: policy.labels, singleControllerException: false, extents: valueDigest('artroom-rules-extents-2', envelope) } };
  return { policy: { observation, input: { rules, destination, extents: envelope }, touched: [], required: policy.checks.filter(check => check.required).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0), tree: 'a'.repeat(40), manifest: fact(4) }, generations: [] };
}
const policy: RulesPolicyV11 = { approvals: 0, allowZeroApprovals: true, ownerMayReview: false,
  checks: Array.from({ length: 32 }, (_, n) => ({ name: `check-${n}`, configuration: d('b'), required: true, checker: { membership, member: '@checker' as const } })),
  labels: ['quote"', 'slash\\', 'control\u0000', '文字'], extents: [
    { name: 'rules', patterns: [...RULES_PATTERNS], approvals: 1, approver: 'change.review', checks: [], class: 'authority' },
    { name: 'other', patterns: [], approvals: 0, allowZeroApprovals: true, approver: 'change.review', checks: [], class: 'content' },
  ] };
function capture(value: CertifiedPublicationStateV15): Entry {
  return { v: 1, at: destination, seq: 5, prev: d('a'), time: t(0), clamped: false, epoch: 0,
    input: { type: 'outcome', owner: 'platform:destination@15', kind: 'judge', operation: '4:0', attempt: 1, result: 'confirmed', evidence: { basis: 'own-answer', body: {} } },
    uses: [], prepared: [], sends: [], effects: [{ effect: 'value', item: 4, slot: 'passes', value: JSON.parse(canonicalize(value)) }] };
}

test('G15 budgets the whole capture and all 32 future proofs, with canonical escaping and a refusal before an oversized capture', () => {
  const empty = record(policy), budget = certifiedPublicationBudgetV15(empty, PROPOSED_BOUNDS);
  expect(certifiedPublicationStateV15(empty, PROPOSED_BOUNDS)).toEqual(empty);
  const full: CertifiedPublicationStateV15 = { ...empty, generations: policy.checks.map((check, n) => ({ name: check.name, job: fact(10 + n), passed: true,
    proof: { result: fact(50 + n), key: keys.una.key, decided: 100 + n, configuration: check.configuration, checker: check.checker, tree: empty.policy.tree,
      proposal: (empty.policy.input.extents as { proposal: string }).proposal } })) };
  expect(certifiedPublicationStateV15(full, PROPOSED_BOUNDS)).toEqual(full);
  expect(utf8(canonicalize(full)).length).toBeLessThanOrEqual(budget.maximumRecordBytes);
  expect(budget.generationsReserveBytes).toBeGreaterThan(utf8(canonicalize(full.generations)).length);
  // A record below entryBytes is still refused when its surrounding capture
  // cannot fit. Changing only the configured entry bound crosses that boundary.
  const measured = certifiedCaptureBudgetV15(empty, PROPOSED_BOUNDS, capture(empty));
  expect(measured.admitted).toBe(true);
  const exact = { ...PROPOSED_BOUNDS, entryBytes: measured.captureEntryBytes };
  expect(certifiedCaptureBudgetV15(empty, exact, capture(empty)).admitted).toBe(true);
  expect(certifiedCaptureBudgetV15(empty, { ...exact, entryBytes: exact.entryBytes - 1 }, capture(empty)).admitted).toBe(false);
  // Escaping is counted on canonical bytes, not the UTF-8 input alone.
  const ascii = record({ ...policy, labels: ['a'.repeat(64)] });
  const escaped = record({ ...policy, labels: ['\u0000'.repeat(64)] });
  expect(utf8(canonicalize(escaped)).length).toBeGreaterThan(utf8(canonicalize(ascii)).length + 64 * 5);
  const corrupt = { ...full, generations: full.generations.map((row, n) => n ? row : { ...row, proof: { ...row.proof!, key: 'not-a-key' } }) };
  expect(certifiedPublicationStateV15(corrupt, PROPOSED_BOUNDS)).toBeNull();
});

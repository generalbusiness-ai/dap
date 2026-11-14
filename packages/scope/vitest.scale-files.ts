// Complete scale owners and their expected case counts. The original four
// owners retain their cases; GS1 moves sixteen cases into nine more owners.
export const scopeScaleCaseCounts = {
  "test/floor-archive.test.ts": 3,
  "test/archive-one-entry-scale.test.ts": 1,
  "test/archive-cadence.test.ts": 1,
  "../../apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts": 1,
  "../cli/test/fixed-slot-membership.scope.test.ts": 1,
  "test/floor-kept.test.ts": 1,
  "../../apps/room/lanes/test/directory-partition-capacity.scope.test.ts": 1,
  "../../apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts": 1,
  "test/archive-installed-scale.test.ts": 2,
  "test/evidence-rules-real-scale.test.ts": 4,
  "../../apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts": 2,
  "../../apps/room/lanes/test/manifest-tree-scale.scope.test.ts": 2,
  "../../apps/room/lanes/test/demo-scale.scope.test.ts": 2,
};
export const scopeScaleFiles = Object.keys(scopeScaleCaseCounts);

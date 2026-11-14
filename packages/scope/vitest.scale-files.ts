// GS3 keeps the original six and moved sixteen in two complete owner groups.
export const scopeScaleOriginalCaseCounts = Object.freeze({
  "test/floor-archive.test.ts": 3,
  "test/archive-one-entry-scale.test.ts": 1,
  "test/archive-cadence.test.ts": 1,
  "../../apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts": 1,
});
export const scopeScaleMovedCaseCounts = Object.freeze({
  "../cli/test/fixed-slot-membership.scope.test.ts": 1,
  "test/floor-kept.test.ts": 1,
  "../../apps/room/lanes/test/directory-partition-capacity.scope.test.ts": 1,
  "../../apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts": 1,
  "test/archive-installed-scale.test.ts": 2,
  "test/evidence-rules-real-scale.test.ts": 4,
  "../../apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts": 2,
  "../../apps/room/lanes/test/manifest-tree-scale.scope.test.ts": 2,
  "../../apps/room/lanes/test/demo-scale.scope.test.ts": 2,
});

// Validate the two inventories once, before any selector, config or runner uses them.
const seen = new Set<string>();
for (const group of [scopeScaleOriginalCaseCounts, scopeScaleMovedCaseCounts]) {
  for (const [file, count] of Object.entries(group)) {
    if (!file || seen.has(file) || !Number.isSafeInteger(count) || count < 1) {
      throw new Error("Scale owners must be distinct paths with positive case counts.");
    }
    seen.add(file);
  }
}
export const scopeScaleCaseCounts = Object.freeze({ ...scopeScaleOriginalCaseCounts, ...scopeScaleMovedCaseCounts });
export const scopeScaleFiles = Object.freeze(Object.keys(scopeScaleCaseCounts));
export type ScaleMode = "omit" | "moved" | "all";
const group = (mode: ScaleMode, caseCounts: Readonly<Record<string, number>>) => Object.freeze({
  mode, caseCounts, files: Object.freeze(Object.keys(caseCounts)),
  expectedCases: Object.values(caseCounts).reduce((sum, count) => sum + count, 0),
});
const groups = Object.freeze({
  omit: group("omit", Object.freeze({})),
  moved: group("moved", scopeScaleMovedCaseCounts),
  all: group("all", scopeScaleCaseCounts),
});

export function scopeScaleGroup(mode: string) {
  if (!Object.hasOwn(groups, mode)) throw new Error("Scale selection must be omit, moved or all.");
  return groups[mode as ScaleMode];
}

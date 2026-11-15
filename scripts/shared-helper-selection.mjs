/** Shared-helper source selection; importing it needs no parser or package. */
export const sharedHelperPathspecs = Object.freeze([
  "packages/*/src/*.ts", "packages/*/src/*.tsx",
  ":(glob)apps/**/*.ts", ":(glob)apps/**/*.tsx",
  ":(glob)examples/**/*.ts", ":(glob)examples/**/*.tsx",
]);

export function selectedHelperFiles(names) {
  return [...new Set(names)].filter(file => file && !file.includes("/test/") && !file.includes("/tests/") && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) && !/\/(?:testing|test-support)\.ts$/.test(file));
}

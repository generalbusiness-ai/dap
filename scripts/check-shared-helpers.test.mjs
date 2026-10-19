import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolve } from "node:path";
import { bytesExports, helperRedefinitions } from "./check-shared-helpers.mjs";

test("a new source file cannot redefine a bytes helper through a function, exported arrow or typed expression", () => {
  const owner = resolve("fixture/bytes/values.ts"), file = resolve("fixture/new-source.ts");
  const sources = new Map([
    [resolve("fixture/bytes/index.ts"), 'export * from "./values.ts"; export { aliasedSame as equalValue } from "./aliases.ts"; export type { Context } from "./types.ts";'],
    [resolve("fixture/bytes/aliases.ts"), 'export { same as aliasedSame } from "./values.ts";'],
    [owner, 'export function same(a: unknown, b: unknown) { return a === b; } export const natural = (v: unknown) => typeof v === "number"; export const freeze = (v: unknown) => v;'],
  ]);
  const owners = bytesExports(resolve("fixture/bytes/index.ts"), file => sources.get(file));
  const findings = helperRedefinitions(owners, [[file, `
    function same(a: unknown, b: unknown) { return a === b; }
    export const natural =
      (v: unknown): v is number => typeof v === "number";
    const freeze = ((v: unknown) => v) satisfies (value: unknown) => unknown;
    const equalValue = (a: unknown, b: unknown) => a === b;
  `]]);
  assert.deepEqual(findings.map(({ name, owner: home }) => [name, home]), [["same", owner], ["natural", owner], ["freeze", owner], ["equalValue", owner]]);
});

test("the owner, imports and public aliases pass; source strings, comments and different meanings are not declarations", () => {
  const owner = resolve("fixture/bytes/values.ts"), other = resolve("fixture/source.ts");
  const owners = new Map([["same", owner]]);
  assert.deepEqual(helperRedefinitions(owners, [
    [owner, 'export const same = (a: unknown, b: unknown) => a === b;'],
    [other, `import { same } from "bytes"; export { same as equalValue };
      const example = "function same(a,b) { return true; }";
      /* const same = (a,b) => true; */
      const result = { same: true };
      const sameKey = (a: { key: string }, b: { key: string }) => a.key === b.key;
    `],
  ]), []);
});

// Two initializers of one new store, forced into the two orders that the store-format check met only by chance.
// Each test acts at the next directory listing: that is where a second process can run between two steps of the first.
import fs, { linkSync, mkdtempSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { STORE_FORMAT_FILE, requireStoreFormat } from "../src/store-format.ts";

const original = fs.opendirSync;
/** Run `step` before the `call`th listing of the store directory, counting from 1. */
function atListing(dir: string, call: number, step: () => void): void {
  let seen = 0;
  fs.opendirSync = ((path: fs.PathLike, ...rest: unknown[]) => {
    if (String(path) === dir && ++seen === call) step();
    return (original as (...args: unknown[]) => fs.Dir)(path, ...rest);
  }) as typeof fs.opendirSync;
  syncBuiltinESMExports();
}
afterEach(() => { fs.opendirSync = original; syncBuiltinESMExports(); });

test("a word another initializer links in after the first look and before the emptiness listing admits the store", () => {
  const dir = mkdtempSync(join(tmpdir(), "dap-store-format-race-"));
  // B finds no word, then A publishes its whole word before B lists the directory.
  atListing(dir, 1, () => writeFileSync(join(dir, STORE_FORMAT_FILE), "2\n", { mode: 0o600 }));
  expect(() => requireStoreFormat(dir)).not.toThrow();
  expect(readdirSync(dir)).toEqual([STORE_FORMAT_FILE]);
});

test("a word whose temporary name goes between two looks for it admits the store", () => {
  const dir = mkdtempSync(join(tmpdir(), "dap-store-format-race-")), word = join(dir, STORE_FORMAT_FILE);
  const temporary = join(dir, `${STORE_FORMAT_FILE}.publishing-a.tmp`);
  // A has linked its word into place and still holds the temporary name: the word has two links.
  writeFileSync(temporary, "2\n", { mode: 0o600 });
  linkSync(temporary, word);
  // B finds the temporary name in its first look. A removes it before any second look.
  atListing(dir, 2, () => unlinkSync(temporary));
  expect(() => requireStoreFormat(dir)).not.toThrow();
  // One look answers, so A's name may still be there. A then removes it, and the next check reads one link.
  if (readdirSync(dir).includes(`${STORE_FORMAT_FILE}.publishing-a.tmp`)) unlinkSync(temporary);
  expect(() => requireStoreFormat(dir)).not.toThrow();
  expect(readdirSync(dir)).toEqual([STORE_FORMAT_FILE]);
});

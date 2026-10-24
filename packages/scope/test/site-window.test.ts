/** Pure serving counter only; no provider, native authority or eviction claim. */
import { expect, test } from "vitest";
import { SiteReadWindow } from "../src/site/window.ts";

test("site attempts have an exact fixed minute, bounded address bytes and a shared missing-address bucket", () => {
  const window = new SiteReadWindow();
  for (let n = 0; n < 240; n++) expect(window.admit(null, 100)).toBe(true);
  expect(window.admit(null, 60_099)).toBe(false);
  expect(window.admit(null, 60_100)).toBe(true);
  // Backward time cannot reset the active window.
  for (let n = 1; n < 240; n++) expect(window.admit(null, 0)).toBe(true);
  expect(window.admit(null, 0)).toBe(false);
  expect(window.admit("a".repeat(64), 60_100)).toBe(true);
  expect(window.admit("界".repeat(21) + "a", 60_100)).toBe(true);
  expect(window.admit("界".repeat(21) + "ab", 60_100)).toBe(false);
  expect(window.admit("a".repeat(65), 60_100)).toBe(false);
  expect(window.admit("", 60_100)).toBe(false);
  expect(window.admit(null, NaN)).toBe(false);
  expect(window.size).toBe(3);
});

test("site key churn cannot evict an active window or bypass capacity; only expired slots are reclaimed", () => {
  const window = new SiteReadWindow();
  expect(window.admit("old", 0)).toBe(true);
  for (let n = 1; n < 240; n++) expect(window.admit("old", 0)).toBe(true);
  for (let n = 0; n < 4095; n++) expect(window.admit(`address-${n}`, 1)).toBe(true);
  expect(window.size).toBe(4096);
  for (let n = 0; n < 20; n++) expect(window.admit(`overflow-${n}`, 59_999)).toBe(false);
  expect(window.admit("old", 59_999)).toBe(false);
  expect(window.admit("address-0", 59_999)).toBe(true);
  expect(window.admit("replacement", 60_000)).toBe(true);
  expect(window.size).toBe(4096);
  expect(window.admit("another", 60_000)).toBe(false);
  expect(window.admit("address-0", 60_000)).toBe(true);
  expect(window.admit("another", 60_001)).toBe(true);
  expect(window.size).toBe(2); // replacement and another; no live eviction
});

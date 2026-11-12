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

test("4096 addresses of one IPv6 /64 leave another Site visitor admitted; full tables share bounded overflow", () => {
  const window = new SiteReadWindow();
  let admitted = 0;
  for (let n = 1; n <= 4096; n++) if (window.admit(`2001:db8:1:2::${n.toString(16)}`, 0)) admitted++;
  expect(admitted).toBe(240);
  expect(window.size).toBe(1);
  expect(window.admit("198.51.100.20", 1000)).toBe(true);
  expect(window.admit("2001:db8:1:2::ffff", 1000)).toBe(false);

  const full = new SiteReadWindow();
  for (let n = 0; n < 4096; n++) expect(full.admit(`10.${n >> 8}.${n & 255}.1`, 0)).toBe(true);
  for (let n = 0; n < 240; n++) expect(full.admit(`198.51.100.${n + 1}`, 0)).toBe(true);
  expect(full.admit("203.0.113.1", 0)).toBe(false);
  expect(full.size).toBe(4097); // dedicated table plus one overflow window
  expect(full.admit("10.0.0.1", 0)).toBe(true);
  expect(full.admit("203.0.113.1", 60_000)).toBe(true);
  expect(full.size).toBe(1);
});

import { expect, test } from "vitest";
import { digestBytes, keyIdOfSecret, newIncarnation, scopeIdOf, timeOf } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { sendableAt, type OriginalRow } from "@generalbusiness/dap-client";
import { pressStop } from "../src/open-requests.ts";

// Invariant: a read that succeeded stops a press only for a row of this key at this scope. The room of `original-copy.scope.test.ts` has one partition,
// so this case states the rule for a second partition over written rows. That file runs the rest on real scopes.
const digest = digestBytes(new Uint8Array([1, 2, 3]));
const scopeRef = (kind: ScopeRef["kind"], ordinal: number): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: digest, creator: null, cause: digest, ordinal }), kind, inc: newIncarnation(new Uint8Array(16).fill(ordinal + 1)) });
const key = keyIdOfSecret(new Uint8Array(32).fill(1)), other = keyIdOfSecret(new Uint8Array(32).fill(2));
const now = 1_800_000_000_000;
const row = (to: ScopeRef, actor = key, from = now + 300_000): OriginalRow => ({ digest: digestBytes(new Uint8Array([to.scope.length, from % 251])) as Digest, to, kind: "comment", on: null, actor, notAfter: timeOf(from) });
const partition = scopeRef("directory", 1), next = scopeRef("directory", 2), lane = scopeRef("lane", 3), elsewhere = scopeRef("lane", 4);

test("an opening act can go to another partition, so a row at one partition stops a press at the next", () => {
  expect(pressStop(key, [row(partition)], [], next, now)).toBe("locked");
  expect(pressStop(key, [row(partition)], [], lane, now)).toBeNull();
  expect(pressStop(key, [row(lane)], [], partition, now)).toBeNull();
});

test("only this key's row at this scope stops a press, and the margin and a draw decide how", () => {
  expect(pressStop(key, [], [], lane, now)).toBeNull();
  expect(pressStop(key, [row(lane, other)], [], lane, now)).toBeNull();
  expect(pressStop(key, [row(elsewhere)], [], lane, now)).toBeNull();
  const past = row(lane, key, now - 300_000);
  expect(now).toBeGreaterThanOrEqual(sendableAt(past.notAfter));
  expect(pressStop(key, [row(lane)], [row(lane)], lane, now)).toBe("locked");
  expect(pressStop(key, [past], [], lane, now)).toBe("unshown");
  expect(pressStop(key, [past], [past], lane, now)).toBeNull();
  expect(pressStop(key, [past, row(lane)], [past], lane, now)).toBe("locked");
});

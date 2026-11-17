import assert from "node:assert/strict";
import { test } from "node:test";
import { pollUntil } from "./witness-poll.mjs";

test("a read that resolves false does not satisfy the wait, and the wait names what it waited for", async () => {
  let reads = 0;
  await assert.rejects(pollUntil(async () => { reads++; return false; }, Boolean, { what: "an accepted record", timeout: 60, interval: 10 }),
    /waited 60 ms for an accepted record/);
  assert.ok(reads >= 2, `the wait read ${reads} times`);
});

test("the wait returns the first value that holds", async () => {
  let reads = 0;
  const value = await pollUntil(async () => ++reads, n => n >= 3, { what: "the third read", timeout: 1_000, interval: 1 });
  assert.equal(value, 3);
  assert.equal(reads, 3);
});

test("a read that throws ends the wait with its error", async () => {
  await assert.rejects(pollUntil(async () => { throw new Error("custody unavailable"); }, Boolean, { what: "a record", timeout: 1_000 }),
    /custody unavailable/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { ObservationCache, observationPayloadBytes } from "../src/observation-cache.ts";

const payload = (text = "") => ({ observation: { member: "@reader", text }, n: 1, last: null, values: [] });
const measure = (name, record) => observationPayloadBytes(name, "run", record);

test("the reusable store enforces count and actual payload bytes, keeps replacement order, and removes an oversized namesake", () => {
  const first = payload(), second = payload(), third = payload();
  const counted = new ObservationCache(2, 4_096, measure);
  counted.set("a", first); counted.set("b", second); counted.set("c", third);
  assert.deepEqual([...counted.entries()], [["b", second], ["c", third]]);
  assert.equal(counted.counts().records, 2);

  // Fixed UTF-8 counts include the two-byte value and every duplicate copy.
  const retained = { observation: {}, n: 1, last: null, values: [{ domain: "d", digest: "h", bytes: "é" }] };
  assert.equal(observationPayloadBytes("a", "r", retained), 118);
  const duplicated = { ...retained, values: [...retained.values, ...retained.values] };
  assert.equal(observationPayloadBytes("a", "r", duplicated), 159);
  const byBytes = new ObservationCache(3, 236, (name, record) => observationPayloadBytes(name, "r", record));
  byBytes.set("a", retained); byBytes.set("b", retained);
  assert.deepEqual(byBytes.counts(), { records: 2, bytes: 236 });
  byBytes.set("c", duplicated);
  assert.deepEqual([...byBytes.entries()], [["c", duplicated]]);
  assert.deepEqual(byBytes.counts(), { records: 1, bytes: 159 });

  const replacement = payload("replacement");
  const ordered = new ObservationCache(2, 4_096, measure);
  ordered.set("a", first); ordered.set("b", second); ordered.set("a", replacement); ordered.set("c", third);
  assert.deepEqual([...ordered.entries()], [["b", second], ["c", third]]);

  const oversized = payload("x".repeat(1_024));
  const limited = new ObservationCache(2, 512, measure);
  limited.set("a", first); limited.set("b", second);
  assert.equal(limited.get("a"), first);
  limited.set("a", oversized);
  assert.deepEqual([...limited.entries()], [["b", second]]);
  assert.equal(limited.counts().records, 1);
});

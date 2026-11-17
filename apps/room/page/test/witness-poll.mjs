// NF-11: the witness waits for a page state by polling from Node. Playwright's `waitForFunction` treats a predicate that
// returns a Promise as satisfied at once, even when the Promise yields false, so an asynchronous page read (IndexedDB,
// `navigator.locks.query()`) never waited. Each read here is awaited before its value is judged.

import { setTimeout as delay } from "node:timers/promises";

/**
 * Read until `holds(value)` is true and return that value. A read that throws ends the wait with its error. After
 * `timeout` milliseconds the wait throws an error that names `what`.
 */
export async function pollUntil(read, holds, { what, timeout = 30_000, interval = 100 }) {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await read();
    if (holds(value)) return value;
    if (Date.now() >= end) throw new Error(`the witness waited ${timeout} ms for ${what}`);
    await delay(interval);
  }
}

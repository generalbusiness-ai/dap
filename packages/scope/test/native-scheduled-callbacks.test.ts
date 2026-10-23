/** Actual PlatformScope callback-frontier accounting; no native history or driver. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { PlatformScope } from "./worker.ts";

test("the native fixture retires fulfilled callbacks but still joins and bounds outstanding work", async () => {
  const object = env.PLATFORM.get(env.PLATFORM.idFromName(`callback-frontier-${crypto.randomUUID()}`));
  const result = await runInDurableObject(object, async (value, state) => {
    const instance = value as PlatformScope;
    for (let n = 0; n < 4097; n++) {
      const completed = Promise.resolve(); state.waitUntil(completed); await completed;
    }
    const retired = await instance.awaitScheduledCallbacks();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    state.waitUntil(held);
    let finished = false;
    const joining = instance.awaitScheduledCallbacks().then(report => { finished = true; return report; });
    await Promise.resolve(); const waitedForPending = !finished;
    release(); const joined = await joining;
    let unblock!: () => void;
    const overflow = new Promise<void>(resolve => { unblock = resolve; });
    for (let n = 0; n < 4097; n++) state.waitUntil(overflow);
    let refused = false;
    try { await instance.awaitScheduledCallbacks(); }
    catch (error) { refused = error instanceof Error && error.message === "Native fixture scheduled callback batch exceeded 4096 promises"; }
    finally { unblock(); await overflow; }
    const drained = await instance.awaitScheduledCallbacks();
    return { retired, waitedForPending, joined, refused, drained };
  });
  expect(result.retired.callbacks).toBe(0);
  expect(result.waitedForPending).toBe(true);
  expect(result.joined.callbacks).toBe(1);
  expect(result.refused).toBe(true);
  expect(result.drained.callbacks).toBe(0);
});

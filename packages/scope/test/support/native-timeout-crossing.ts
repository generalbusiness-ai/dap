// XD-1: the wrapper that names a lost Native timeout. Pure, so a Node test pins it.
// In the Native pool, vitest's timeout calls AbortController.abort from a timer. When that timer
// fires in the I/O context of another Durable Object, workerd refuses the call, vitest never
// rejects the test, and the test outlives its limit. Read notes/implementation/2026-11-16-xd1-native-timeout-crossings.md.

export const CROSSING_PREFIX = "[native-timeout-crossing]";

export interface Crossing { readonly kind: string; readonly limit: string }

/** Vitest's reason: "Test timed out in 30000ms." or "Hook timed out in 10000ms." */
export function timeoutOf(reason: unknown): Crossing | undefined {
  const message = reason instanceof Error ? reason.message : "";
  const found = /^(Test|Hook) timed out in (\d+)ms\./.exec(message);
  return found ? { kind: found[1]!, limit: found[2]! } : undefined;
}

export function crossingLine(crossing: Crossing, file: string, name: string): string {
  return `${CROSSING_PREFIX} file=${file} name=${name.replace(/\s+/g, " ").trim() || "(no test)"} limit=${crossing.limit}ms kind=${crossing.kind}`;
}

/** Wrap `abort` on the prototype. A refused abort with a timeout reason reports once, then rethrows,
 * or with `swallow` returns so that vitest rejects the test (step 3). Other refusals rethrow unchanged. */
export function guardAbort(prototype: { abort(reason?: unknown): void }, report: (crossing: Crossing) => void, swallow: boolean): void {
  const original = prototype.abort;
  prototype.abort = function abort(this: unknown, reason?: unknown): void {
    try {
      original.call(this, reason);
    } catch (error) {
      const crossing = timeoutOf(reason);
      if (!crossing) throw error;
      report(crossing);
      if (!swallow) throw error;
    }
  };
}

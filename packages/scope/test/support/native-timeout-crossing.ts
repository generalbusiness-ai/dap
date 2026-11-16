// XD-1: the wrapper that names a refused Native timeout abort. Pure, so a Node test pins it.
// In the Native pool, vitest's timeout calls AbortController.abort from a timer. When workerd refuses
// that call, vitest never rejects the test. Read notes/implementation/2026-11-16-xd1-native-timeout-crossings.md.

export const CROSSING_PREFIX = "[native-timeout-crossing]";

export interface Crossing { readonly kind: string; readonly limit: string }

/** The test whose context holds the aborted controller. `finished` is true after its `afterEach`. */
export interface Owner { readonly file: string; readonly name: string; readonly finished: boolean }

/** `stale`: the owner finished, so the timer outlived its test. `lost`: the owner still runs, so its timeout is lost.
 * `no-owner`: no test context holds the controller, for example a `beforeAll` or `afterAll` hook. */
export type CrossingClass = "stale" | "lost" | "no-owner";

export function classOf(owner: Owner | undefined): CrossingClass {
  return owner === undefined ? "no-owner" : owner.finished ? "stale" : "lost";
}

/** Vitest's reason: "Test timed out in 30000ms." or "Hook timed out in 10000ms." */
export function timeoutOf(reason: unknown): Crossing | undefined {
  const message = reason instanceof Error ? reason.message : "";
  const found = /^(Test|Hook) timed out in (\d+)ms\./.exec(message);
  return found ? { kind: found[1]!, limit: found[2]! } : undefined;
}

export function crossingLine(crossing: Crossing, owner: Owner | undefined): string {
  const name = owner === undefined ? "(no owner)" : owner.name.replace(/\s+/g, " ").trim() || "(no test)";
  return `${CROSSING_PREFIX} class=${classOf(owner)} file=${owner?.file ?? "(unknown)"} name=${name} limit=${crossing.limit}ms kind=${crossing.kind}`;
}

/** Wrap `abort` on the prototype. A refused abort with a timeout reason reports one line. A `lost` refusal then returns,
 * so vitest rejects the running test with its own timeout error. A `stale` or `no-owner` refusal is thrown again: its
 * test has settled, or it has none. Other refusals are thrown again unchanged. */
export function guardAbort<C extends { abort(reason?: unknown): void }>(prototype: C, ownerOf: (controller: C) => Owner | undefined, report: (line: string) => void): void {
  const original = prototype.abort;
  prototype.abort = function abort(this: C, reason?: unknown): void {
    try {
      original.call(this, reason);
    } catch (error) {
      const crossing = timeoutOf(reason);
      if (!crossing) throw error;
      const owner = ownerOf(this);
      report(crossingLine(crossing, owner));
      if (classOf(owner) !== "lost") throw error;
    }
  };
}

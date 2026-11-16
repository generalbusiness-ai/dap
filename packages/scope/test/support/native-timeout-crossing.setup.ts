import { afterEach, beforeEach } from "vitest";
import { guardAbort, type Owner } from "./native-timeout-crossing.ts";

// XD-1: print one line for each Native timeout abort that workerd refuses, with its class (rulings 925778a5 and 6ba49430).
// Vitest aborts the controller of the test's own context, so each test's signal maps to that test. `afterEach` marks the
// test finished: a timer that fires after it is `stale`, and one that fires while the test runs is `lost`.

const installed = Symbol.for("dap.nativeTimeoutCrossingGuard");
const holder = globalThis as unknown as Record<symbol, unknown>;
const owners = ((holder[Symbol.for("dap.nativeTimeoutCrossingOwners")] ??= new WeakMap()) as WeakMap<AbortSignal, { file: string; name: string; finished: boolean }>);

beforeEach(context => {
  owners.set(context.signal, { file: context.task.file?.filepath ?? "(unknown)", name: fullName(context.task), finished: false });
});
afterEach(context => {
  const owner = owners.get(context.signal);
  if (owner) owner.finished = true;
});

function fullName(task: { name: string; suite?: { name: string; suite?: unknown } | undefined }): string {
  const names: string[] = [];
  for (let at: { name: string; suite?: unknown } | undefined = task; at; at = at.suite as typeof at) if (at.name) names.unshift(at.name);
  return names.join(" > ");
}

// Setup files run again for each file, and isolate: false keeps one global.
if (!holder[installed]) {
  holder[installed] = true;
  guardAbort(AbortController.prototype, (controller): Owner | undefined => owners.get(controller.signal), line => console.error(line));
}

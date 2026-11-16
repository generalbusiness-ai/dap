import { beforeEach } from "vitest";
import { crossingLine, guardAbort } from "./native-timeout-crossing.ts";

// Step 1 of XD-1: print one line for each Native timeout that workerd refused to abort.
// Step 3 sets this to true: the guard then returns, and vitest fails the test with its own timeout.
const SWALLOW_CROSSING = false;

const installed = Symbol.for("dap.nativeTimeoutCrossingGuard");
const holder = globalThis as unknown as Record<symbol, unknown>;

// Step 1b (ruling 925778a5): the line names the test that owns the timer. Vitest aborts the controller of the test's own
// context, so each test's signal maps to that test. A timer that fires while a later test runs still names its owner.
const owners = ((holder[Symbol.for("dap.nativeTimeoutCrossingOwners")] ??= new WeakMap()) as WeakMap<AbortSignal, { file: string; name: string }>);
beforeEach(context => {
  owners.set(context.signal, { file: context.task.file?.filepath ?? "(unknown)", name: fullName(context.task) });
});

function fullName(task: { name: string; suite?: { name: string; suite?: unknown } | undefined }): string {
  const names: string[] = [];
  for (let at: { name: string; suite?: unknown } | undefined = task; at; at = at.suite as typeof at) if (at.name) names.unshift(at.name);
  return names.join(" > ");
}

// Setup files run again for each file, and isolate: false keeps one global.
if (!holder[installed]) {
  holder[installed] = true;
  guardAbort(AbortController.prototype, (crossing, controller) => {
    const owner = owners.get(controller.signal);
    console.error(crossingLine(crossing, owner?.file ?? "(unknown)", owner?.name ?? "(no owner)"));
  }, SWALLOW_CROSSING);
}

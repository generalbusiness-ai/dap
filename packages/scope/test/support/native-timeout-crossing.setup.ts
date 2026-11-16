import { expect } from "vitest";
import { crossingLine, guardAbort } from "./native-timeout-crossing.ts";

// Step 1 of XD-1: print one line for each Native timeout that workerd refused to abort.
// Step 3 sets this to true: the guard then returns, and vitest fails the test with its own timeout.
const SWALLOW_CROSSING = false;

const installed = Symbol.for("dap.nativeTimeoutCrossingGuard");
const holder = globalThis as unknown as Record<symbol, unknown>;

// Setup files run again for each file, and isolate: false keeps one global.
if (!holder[installed]) {
  holder[installed] = true;
  guardAbort(AbortController.prototype, crossing => {
    const state = expect.getState();
    console.error(crossingLine(crossing, state.testPath ?? "(unknown)", state.currentTestName ?? ""));
  }, SWALLOW_CROSSING);
}

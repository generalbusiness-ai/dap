import assert from "node:assert/strict";
import { test } from "node:test";
import { crossingLine, guardAbort } from "../packages/scope/test/support/native-timeout-crossing.ts";

// XD-1 unit control (ruling e48cd709). It proves the wrapper only: an abort that throws the
// workerd refusal prints one line, and step 1 rethrows. It does not prove that workerd throws
// in a real Native run; only a gate's crossing count shows that.
const refusal = () => new Error("Cannot perform I/O on behalf of a different Durable Object.");
const timeout = new Error("Test timed out in 30000ms.");

function refusingController() {
  class Refusing { abort() { throw refusal(); } }
  return Refusing;
}

test("the wrapper prints one line for a refused timeout abort and rethrows in step 1 (not proof that workerd refuses)", () => {
  const Refusing = refusingController(), lines = [];
  guardAbort(Refusing.prototype, crossing => lines.push(crossingLine(crossing, "test/a.test.ts", "a case")), false);
  assert.throws(() => new Refusing().abort(timeout), /different Durable Object/);
  assert.deepEqual(lines, ["[native-timeout-crossing] file=test/a.test.ts name=a case limit=30000ms kind=Test"]);
});

test("without the wrapper the refusal escapes abort, which is the lost timeout", () => {
  const Refusing = refusingController();
  assert.throws(() => new Refusing().abort(timeout), /different Durable Object/);
});

test("step 3: the wrapper swallows the refusal, so vitest's rejection runs", () => {
  const Refusing = refusingController(), lines = [];
  guardAbort(Refusing.prototype, crossing => lines.push(crossing), true);
  assert.doesNotThrow(() => new Refusing().abort(new Error("Hook timed out in 10000ms.")));
  assert.deepEqual(lines, [{ kind: "Hook", limit: "10000" }]);
});

test("a refusal with another reason, and an abort that does not throw, print nothing", () => {
  const Refusing = refusingController(), lines = [];
  guardAbort(Refusing.prototype, crossing => lines.push(crossing), false);
  assert.throws(() => new Refusing().abort(new Error("other")), /different Durable Object/);
  class Quiet { abort() {} }
  guardAbort(Quiet.prototype, crossing => lines.push(crossing), false);
  new Quiet().abort(timeout);
  assert.deepEqual(lines, []);
});

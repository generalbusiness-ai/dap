import assert from "node:assert/strict";
import { test } from "node:test";
import { crossingLine, guardAbort } from "../packages/scope/test/support/native-timeout-crossing.ts";

// XD-1 unit control (rulings e48cd709 and 6ba49430). It proves the wrapper only: a refused timeout abort prints one
// line with its class, and only a `lost` one returns. It does not prove that workerd refuses in a real Native run;
// only a gate's crossing counts show that.
const refusal = () => new Error("Cannot perform I/O on behalf of a different Durable Object.");
const timeout = new Error("Test timed out in 30000ms.");

/** A controller class whose abort throws the workerd refusal, and the owners that a setup file would register. */
function guarded() {
  class Refusing { constructor() { this.signal = {}; } abort() { throw refusal(); } }
  const owners = new WeakMap(), lines = [];
  guardAbort(Refusing.prototype, controller => owners.get(controller.signal), line => lines.push(line));
  const own = (file, name, finished) => { const c = new Refusing(); owners.set(c.signal, { file, name, finished }); return c; };
  return { Refusing, own, lines };
}

test("a timer whose owner finished is stale: one line, and the refusal is thrown again", () => {
  const { own, lines } = guarded();
  assert.throws(() => own("test/a.test.ts", "test A", true).abort(timeout), /different Durable Object/);
  assert.deepEqual(lines, ["[native-timeout-crossing] class=stale file=test/a.test.ts name=test A limit=30000ms kind=Test"]);
});

test("a timer whose owner still runs is lost: one line, and the wrapper returns so that vitest rejects the test", () => {
  const { own, lines } = guarded();
  assert.doesNotThrow(() => own("test/a.test.ts", "test A", false).abort(timeout));
  assert.deepEqual(lines, ["[native-timeout-crossing] class=lost file=test/a.test.ts name=test A limit=30000ms kind=Test"]);
});

test("a controller that no test context registered, such as a beforeAll hook's, has no owner", () => {
  const { Refusing, lines } = guarded();
  assert.throws(() => new Refusing().abort(new Error("Hook timed out in 10000ms.")), /different Durable Object/);
  assert.deepEqual(lines, ["[native-timeout-crossing] class=no-owner file=(unknown) name=(no owner) limit=10000ms kind=Hook"]);
});

test("a timer that test A starts and that fires during test B names A", () => {
  const { own, lines } = guarded();
  const a = own("test/a.test.ts", "test A", true);
  own("test/b.test.ts", "test B", false);
  assert.throws(() => a.abort(timeout), /different Durable Object/);
  assert.deepEqual(lines, ["[native-timeout-crossing] class=stale file=test/a.test.ts name=test A limit=30000ms kind=Test"]);
});

test("without the wrapper the refusal escapes abort, which is the lost timeout", () => {
  class Refusing { abort() { throw refusal(); } }
  assert.throws(() => new Refusing().abort(timeout), /different Durable Object/);
});

test("a refusal with another reason, and an abort that does not throw, print nothing", () => {
  const { own, lines } = guarded();
  assert.throws(() => own("test/a.test.ts", "test A", false).abort(new Error("other")), /different Durable Object/);
  class Quiet { constructor() { this.signal = {}; } abort() {} }
  guardAbort(Quiet.prototype, () => undefined, line => lines.push(line));
  new Quiet().abort(timeout);
  assert.deepEqual(lines, []);
});

test("the line keeps the class first, so the gate counts each class with one fixed prefix", () => {
  assert.equal(crossingLine({ kind: "Test", limit: "20000" }, { file: "f", name: " a\n b ", finished: false }),
    "[native-timeout-crossing] class=lost file=f name=a b limit=20000ms kind=Test");
});

/** Malicious validation inputs are made up. No timer, Native scope, rule code,
 * host operation or runner executes in these declaration-boundary controls. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { board } from "../../derive/test/definition-corpus/forms-data.ts";
import { platform, VERSIONS } from "../src/native-catalog.ts";

const marker = { code: "TEST-forbidden-timed-code", row: "c201-7c" };

/** Mutate unknown input bytes, without pretending a code mark is a TimedRule. */
function appendCode(input: unknown, name: string): { input: unknown; path: string } {
  const malicious: unknown = structuredClone(input);
  if (!isRecord(malicious) || !isRecord(malicious["timed"])) throw Error("A real timer table is required");
  const timer = malicious["timed"][name];
  if (!isRecord(timer) || !Array.isArray(timer["effects"]) || !Array.isArray(timer["states"])) throw Error("A real literal timer is required");
  const effects: readonly unknown[] = timer["effects"], states: readonly unknown[] = timer["states"];
  if (!effects.some(effect => isRecord(effect) && typeof effect["state"] === "string" && !states.includes(effect["state"]))) throw Error("The original required state transition must remain present");
  const path = `timed.${name}.effects.${effects.length}`;
  Reflect.set(timer, "effects", [...effects, { ...marker }]);
  expect(timer["effects"]).toEqual([...effects, marker]);
  return { input: malicious, path };
}

function assertTimedPartial(input: unknown, path: string): void {
  const refused = validateDefinition(input, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(refused.ok).toBe(false);
  if (refused.ok) throw Error("The malicious timed code input must be refused");
  expect(refused.problems).toContainEqual(expect.objectContaining({ code: "timed-partial", path }));
}

/** Versions with no timer get a TEST-only literal row in copied input. Existing
 * items, timers, guards, code and outcome tables remain intact. */
function nativeTimer(data: PlatformData): { input: PlatformData; name: string } {
  const input = structuredClone(data), existing = Object.keys(input.timed)[0];
  if (existing) return { input, name: existing };
  const name = "test-deadline", type = "test-timed-row";
  input.items[type] = { many: true, max: 1, initial: "waiting", states: { waiting: { final: false }, ended: { final: true } },
    parties: {}, refs: {}, values: { deadline: { fixed: false, required: false, of: { type: "time" } } } };
  input.timed[name] = { on: type, states: ["waiting"], deadline: "deadline", effects: [{ state: "ended" }], attention: [] };
  return { input, name };
}

test("declared input refuses timed code at its untrusted boundary, and the platform-enabled timer boundary reports timed-partial", () => {
  const original = canonicalize(board), name = "job-deadline";
  expect(validateDefinition(board, PROPOSED_BOUNDS).ok).toBe(true);
  const changed = appendCode(board, name), refused = validateDefinition(changed.input, PROPOSED_BOUNDS);
  expect(refused.ok).toBe(false);
  if (refused.ok) throw Error("A declared input cannot supply any code mark");
  // The ordinary declared grammar rejects code as an unknown written form.
  // Only the trusted platform mode recognizes a mark and names timed-partial.
  expect(refused.problems).toContainEqual(expect.objectContaining({ code: "shape", path: changed.path }));
  const trustedShape = { ...board, outcomes: {} };
  expect(validateDefinition(trustedShape, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  const platformChanged = appendCode(trustedShape, name);
  assertTimedPartial(platformChanged.input, platformChanged.path);
  expect(canonicalize(board)).toBe(original);
});

test("the timed controls cover every actual historical Destination version from 1 through 16", () => {
  const expected = Array.from({ length: 16 }, (_, n) => `platform:destination@${n + 1}`);
  const actual = Object.keys(VERSIONS).filter(pin => /^platform:destination@(?:[1-9]|1[0-6])$/.test(pin));
  expect([...actual].sort()).toEqual([...expected].sort());
});

for (let version = 1; version <= 16; version++) {
  const pin = `platform:destination@${version}`;
  test(`${pin} retains its real declarations and refuses one appended timed code effect`, () => {
    const native = platform(pin);
    expect(native, "Every historical Destination version must actually exist; no fallback is allowed").not.toBeNull();
    if (!native) throw Error(`The historical catalog is missing ${pin}`);
    const original = canonicalize(native.data);
    expect(validateDefinition(native.data, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
    const timer = nativeTimer(native.data);
    expect(validateDefinition(timer.input, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
    const changed = appendCode(timer.input, timer.name);
    assertTimedPartial(changed.input, changed.path);
    expect(canonicalize(native.data)).toBe(original);
  });
}

test("the three new G17 evidence timers are literal while inherited Main cleanup timers stay exact", () => {
  const native = platform("platform:destination@17"), historical = platform("platform:destination@15");
  if (!native || !historical) throw Error("The actual G17 and historical G15 declarations must exist");
  expect(validateDefinition(native.data, PROPOSED_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  const added = ["evidence-job-deadline", "evidence-reuse-deadline", "evidence-hold-deadline"];
  const inherited = Object.entries(historical.data.timed);
  expect(inherited.length).toBeGreaterThan(0);
  expect(Object.keys(native.data.timed).sort()).toEqual([...inherited.map(([name]) => name), ...added].sort());
  // c201 point 6 keeps Main's fixed cleanup opener. The new evidence timers
  // cannot borrow that exception or change any inherited declaration.
  for (const [name, timer] of inherited) expect(native.data.timed[name], name).toEqual(timer);
  const literal = (value: unknown): void => {
    if (Array.isArray(value)) { for (const child of value) literal(child); return; }
    if (!isRecord(value)) return;
    for (const [key, child] of Object.entries(value)) {
      expect(["code", "opens", "send", "sends"], `No callback or operation opener inside a G17 timer: ${key}`).not.toContain(key);
      literal(child);
    }
  };
  for (const name of added) {
    const timer = native.data.timed[name];
    if (!timer) throw Error(`The new evidence timer ${name} must exist`);
    expect(timer.on).toBe("evidence-job");
    literal(timer);
    expect(timer.effects.some(effect => "state" in effect && !timer.states.includes(effect.state)), `${name} must leave its due states through a literal state transition`).toBe(true);
  }
});

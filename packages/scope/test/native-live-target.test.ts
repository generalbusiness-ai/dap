/** Native target pin read: real stored scope and read preparation. Authority,
 * clock and transport are the test stand-ins; no dispatch is performed. */
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { definitionDigest, intentDigest, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf } from "@generalbusiness/dap-derive";
import { liveForms } from "../../derive/test/definition-corpus/live-data.ts";
import { namespace } from "../src/namespace.ts";
import { readNativeLiveTarget, type NativeLiveTarget } from "../src/native-live-target.ts";
import { PreparationFlights } from "../src/preparation-flight.ts";
import { PROOF_BYTE_BOUNDS } from "../src/proof-bytes.ts";
import { indexedScopes } from "../src/scope-index.ts";
import { controls } from "../src/testing.ts";
import { START, objectOf, rita, stubOf } from "./fixtures-native.ts";

async function created(live: boolean) {
  const declared = liveForms.level(); if (!live) delete declared.level;
  const intent = { v: 1, to: null, actor: rita.key, kind: declared.genesis, on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(START)! + 60_000) } as const;
  const seed = { v: 1, kind: "directory", definition: definitionDigest(declared), creator: null, cause: intentDigest(intent), ordinal: 0 } as const;
  const name = scopeIdOf(seed); controls(name, START);
  const result = await stubOf(name).create(signIntent(intent, rita.secret), declared);
  if (result.answer !== "accepted") throw new Error("fixture was not created");
  return { at: result.receipt.fact.at, object: objectOf(name) };
}

test("an exact active native pin is classified without changing its stored rows or alarm", async () => {
  for (const live of [true, false]) {
    const target = await created(live);
    const snapshot = () => runInDurableObject(target.object, async (_object, state) => {
      const tables = state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").toArray();
      return { rows: tables.map(({ name }) => [name, state.storage.sql.exec(`SELECT * FROM "${name.replaceAll('"', '""')}"`).toArray()]), alarm: await state.storage.getAlarm() };
    });
    const before = await snapshot();
    const peer = target.object as unknown as { nativeLiveTarget(at: unknown, milliseconds: number, maxBytes: number): Promise<NativeLiveTarget | null> };
    const proof = await peer.nativeLiveTarget(target.at, 10_000, PROOF_BYTE_BOUNDS.body);
    expect(readNativeLiveTarget(proof, target.at, PROOF_BYTE_BOUNDS.body)).toBe(live);
    expect(await namespace(env.SCOPES).liveTarget.read(target.at, 10_000)).toBe(live);
    const wrong = { ...target.at, genesis: textDigest("wrong genesis") };
    expect(await peer.nativeLiveTarget(wrong, 10_000, PROOF_BYTE_BOUNDS.body)).toBeNull();
    expect(readNativeLiveTarget({ ...proof, extra: true }, target.at, PROOF_BYTE_BOUNDS.body)).toBeNull();
    expect(readNativeLiveTarget({ ...proof, level: "unknown" }, target.at, PROOF_BYTE_BOUNDS.body)).toBeNull();
    expect(await peer.nativeLiveTarget(target.at, 0, PROOF_BYTE_BOUNDS.body)).toBeNull();
    expect(await snapshot()).toEqual(before);
  }
});

test("a live-target probe never activates or registers an unindexed target", async () => {
  let addressed = 0, registered = 0;
  const raw = { idFromName(name: string) { addressed++; return name; }, get() { addressed++; throw new Error("unknown target was reached"); } };
  const index = { has: async () => false, register: async () => { registered++; return true; } };
  const ref = { scope: `sc_${"a".repeat(52)}`, genesis: textDigest("unknown target") } as const;
  for (const mode of ["enforce", "register"]) {
    const indexed = indexedScopes(raw, { SCOPE_INDEX_MODE: mode, SCOPE_INDEX: { idFromName: () => "index", get: () => index } });
    expect(await namespace(indexed).liveTarget.read(ref, 1000)).toBeNull();
  }
  expect({ addressed, registered }).toEqual({ addressed: 0, registered: 0 });
});

test("a timed-out target read holds its one physical slot until the late reply settles", async () => {
  let now = 0, fired: (() => void) | null = null, calls = 0, release!: (value: null) => void;
  const timer = { now: () => now, after(_ms: number, work: () => void) { fired = work; return () => { fired = null; }; } };
  const flights = new PreparationFlights(timer);
  const gate = new Promise<null>(resolve => { release = resolve; });
  const ref = { scope: `sc_${"a".repeat(52)}`, genesis: textDigest("unverified target") } as const;
  const source = namespace({ idFromName: (name: string) => name, get: () => ({ nativeLiveTarget: () => { calls++; return gate; } }) }, flights).liveTarget;
  const first = source.read(ref, 1000);
  await Promise.resolve(); await Promise.resolve();
  expect(calls).toBe(1);
  now = 1000; (fired as (() => void) | null)?.();
  expect(await first).toBeNull();
  expect(await source.read(ref, 1000)).toBeNull(); expect(calls).toBe(1);
  release(null);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  expect(await source.read(ref, 1000)).toBeNull(); expect(calls).toBe(2);
});

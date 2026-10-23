/** Pure birth-protocol and preparation-clock fixtures. Canonical entries below
 * are constructed bytes, not a native creation or authority witness. The real
 * ownership/creation/replay witness is application-owned-scopes.test.ts. */
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { created, directory } from "@generalbusiness/dap-derive/testing";
import { APPLICATION_OWNERSHIP_BOUNDS as B, projectionScopeOwned } from "../src/applications/projection-ownership.ts";
import { readNativeBirth, type NativeBirth } from "../src/native-birth.ts";
import type { PreparedRead } from "../src/read-preparation.ts";
import { PreparationFlights, PREPARATION_MILLISECONDS } from "../src/preparation-flight.ts";
const fixture = created(), original = fixture.entries[0]!.entry, digest = fixture.definition.digest;
const run = { ends: 10_000, active: () => true, remaining: () => 10_000 };
function node(parent: ScopeRef, tag: number, oversized = false) {
  const entry = structuredClone(original);
  if (entry.input.type !== "genesis") throw Error("The protocol fixture needs genesis bytes.");
  entry.input.seed = { ...entry.input.seed, kind: "lane", creator: parent, cause: textDigest(`TEST ancestry ${tag}`) };
  entry.input.inc = newIncarnation(new Uint8Array(16).fill(tag));
  entry.at = { kind: "lane", scope: scopeIdOf(entry.input.seed), inc: entry.input.inc };
  entry.input.founding = null; entry.input.source = { at: parent, seq: 0, hash: textDigest("TEST parent fact") }; entry.input.n = 0;
  if (oversized) entry.effects = [...entry.effects, { effect: "value", item: 0, slot: "text", value: "x".repeat(B.birthBytes) }];
  const birth: NativeBirth = { v: 1, native: false, named: digest, declarationName: fixture.definition.declared.name,
    proof: { fact: { at: entry.at, seq: 0, hash: entryHash(entry) }, bytes: canonicalize(entry) } };
  const frame = { scope: { at: entry.at }, pinned: { named: digest }, genesis: entry.input } as unknown as PreparedRead;
  return { at: entry.at, birth, frame };
}

// Invariant: ownership stops at the admitted ancestor count/body cap; matching
// declared definitions cannot turn an incomplete chain into an owned scope.
test("projection ancestry accepts the complete 16-parent chain and refuses before a seventeenth or oversized birth", async () => {
  const root = node(directory, 1), nodes = [root], calls: { at: ScopeRef; ms: number; most: number | undefined }[] = [];
  expect(readNativeBirth(root.birth, root.at)).toEqual(root.birth);
  for (let n = 1; n <= B.ancestors + 1; n++) nodes.push(node(nodes.at(-1)!.at, n + 1));
  const source = { read: async (at: ScopeRef, ms: number, most?: number) => {
    calls.push({ at, ms, most }); return nodes.find(node => canonicalize(node.at) === canonicalize(at))?.birth ?? null;
  } };
  expect(await projectionScopeOwned(nodes[B.ancestors]!.frame, root.at, digest, directory, source, run)).toBe("owned");
  expect(calls).toHaveLength(B.ancestors);
  expect(calls.every(call => call.ms === 10_000 && call.most === B.birthBytes)).toBe(true);
  calls.length = 0;
  expect(await projectionScopeOwned(nodes[B.ancestors + 1]!.frame, root.at, digest, directory, source, run)).toBe("too-large");
  expect(calls).toHaveLength(B.ancestors); expect(calls.some(call => canonicalize(call.at) === canonicalize(root.at))).toBe(false);
  const hugeRoot = node(directory, 90, true), child = node(hugeRoot.at, 91);
  expect(readNativeBirth(hugeRoot.birth, hugeRoot.at)).toEqual(hugeRoot.birth); // valid at the general protocol's larger cap
  expect(await projectionScopeOwned(child.frame, hugeRoot.at, digest, directory, { read: async () => hugeRoot.birth }, run)).toBe("unowned");
  expect(B.totalBirthBytes).toBe(B.ancestors * B.birthBytes); // derived bound, not a second unreachable admission guard
});

// Invariant: a timed-out ancestor RPC keeps the one preparation slot until
// its underlying promise settles; its late bytes cannot produce ownership.
test("a late ancestry response retains its preparation flight and refuses before accepting the bytes", async () => {
  const root = node(directory, 100), child = node(root.at, 101);
  let now = 0, expire = () => {}, arrive!: (birth: NativeBirth) => void, reached!: () => void, reads = 0, owned = 0;
  const started = new Promise<void>(resolve => { reached = resolve; });
  const delayed = new Promise<NativeBirth>(resolve => { arrive = resolve; });
  const flights = new PreparationFlights({ now: () => now, after(ms, work) { expect(ms).toBe(PREPARATION_MILLISECONDS); expire = work; return () => {}; } });
  const first = flights.run(async current => {
    const result = await projectionScopeOwned(child.frame, root.at, digest, directory, { read: async () => { reads++; reached(); return delayed; } }, current);
    if (result === "owned") owned++; return result;
  });
  await started; now = PREPARATION_MILLISECONDS; expire(); expect(await first).toBeNull();
  expect(await flights.run(async () => { reads++; return "must not start"; })).toBeNull(); expect(reads).toBe(1);
  arrive(root.birth);
  for (let n = 0; n < 12; n++) await Promise.resolve();
  expect(owned).toBe(0);
  expect(await flights.run(current => projectionScopeOwned(child.frame, root.at, digest, directory, { read: async () => { reads++; return root.birth; } }, current))).toBe("owned");
  expect(reads).toBe(2);
});

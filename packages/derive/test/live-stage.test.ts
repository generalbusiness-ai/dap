import { expect, test } from "vitest";
import { StageMap } from "../src/live-stage.ts";

test("staged deletion and reinsertion preserves base order on refusal and ordinary map order on commit", () => {
  const map = new StageMap<string, number>();
  map.set("a", 1).set("b", 2);
  map.begin(); map.delete("a"); map.set("c", 3); map.set("a", 4);
  expect([...map]).toEqual([["b", 2], ["c", 3], ["a", 4]]);
  map.discard();
  expect([...map]).toEqual([["a", 1], ["b", 2]]);
  map.begin(); map.delete("a"); map.set("c", 3); map.set("a", 4); map.commit();
  expect([...map]).toEqual([["b", 2], ["c", 3], ["a", 4]]);
});

test("compact live indexes keep overlapping names distinct through rekey, refusal and commit", async () => {
  const { MemoryState } = await import("../src/state.ts");
  const { LiveBindings } = await import("../src/live-binding.ts");
  const { fixedValueOf, rekeyFixed } = await import("../src/fixed-index.ts");
  const { Scope, smallDefinition } = await import("./fixtures.ts");
  const { canonicalize } = await import("@generalbusiness/dap-bytes");
  const fixture = new Scope(smallDefinition), at = fixture.at, hash = fixture.head.hash;
  const shape = { states: new Map([["open", false], ["done", true]]), slots: new Map([["proof", {}]]) };
  const bindings = new LiveBindings(new Map([["alpha", shape], ["beta", shape]]));
  const live = MemoryState.stagedLive(bindings), oracle = new MemoryState();
  const seed = (state: InstanceType<typeof MemoryState>) => {
    for (const [i, type] of ["alpha", "beta"].entries()) {
      const item = { ...fixture.item(0), id: i, type, state: "open" };
      state.putItem(item); state.addCount(type, "open", 1);
      const raw = { entry: { at, seq: 5, hash } }, value = fixedValueOf(raw, at, n => state.fixedHash(n));
      state.putFixed({ type, slot: "proof", item: i, state: "open", raw, key: value.key }, value.dependencies);
    }
  };
  seed(live); seed(oracle);
  expect(live.all()).toEqual(oracle.all());
  expect([live.count("alpha", "open"), live.count("beta", "open"), live.count("other", "open")]).toEqual([1, 1, 0]);
  expect(live.fixedCount("alpha", "proof", "no", ["open"], "raw")).toBe(0);
  const write = (state: InstanceType<typeof MemoryState>) => {
    state.putFixedHash(5, hash);
    rekeyFixed(state, at, [{ seq: 5, hash }], n => state.fixedHash(n));
  };
  const before = live.fixedAffected(5, hash);
  expect(live.liveTransaction(() => write(live), () => false)).toBe(false);
  expect(live.fixedAffected(5, hash)).toEqual(before);
  expect(live.fixedHash(5)).toBeNull();
  expect(live.liveTransaction(() => write(live), () => true)).toBe(true);
  write(oracle);
  expect(live.fixedAffected(5, hash)).toEqual(oracle.fixedAffected(5, hash));
  expect(live.fixedAffected(5, hash).map(row => row.type)).toEqual(["alpha", "beta"]);
  expect(live.fixedCount("alpha", "proof", canonicalize({ entry: 5 }), ["open"], "normalized")).toBe(1);
  expect(live.fixedCount("beta", "proof", canonicalize({ entry: 5 }), ["open"], "normalized")).toBe(1);
  expect(live.all()).toEqual(oracle.all());
});

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

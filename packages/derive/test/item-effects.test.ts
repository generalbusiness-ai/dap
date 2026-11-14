import { expect, test } from "vitest";
import type { Effect } from "@generalbusiness/dap-contract";
import { isItemEffect, type ItemEffect } from "../src/index.ts";
import { d, directory } from "./fixtures.ts";

// Compile probe (ruling 8f63f164): tsc of tsconfig.test.json fails if the guard stops narrowing to `ItemEffect`.
export const narrowed = (effect: Effect): ItemEffect | null => isItemEffect(effect) ? effect : null;
// @ts-expect-error An `Effect` is no `ItemEffect` without the guard, so this probe tests the guard and not the types.
export const unguarded = (effect: Effect): ItemEffect => effect;

const member = { membership: directory, member: "@rita" } as const;

test("isItemEffect accepts each of the six item effects and refuses each other effect", () => {
  const items: readonly Effect[] = [
    { effect: "state", item: 1, state: "done" },
    { effect: "party", item: 1, slot: "owner", member },
    { effect: "ref", item: 1, slot: "of", to: null },
    { effect: "value", item: 1, slot: "name", value: "a" },
    { effect: "list", item: 1, slot: "watchers", change: "add", member },
    { effect: "hold", item: 1, change: "open", epoch: 0 },
  ];
  const others: readonly Effect[] = [
    { effect: "open", item: 1, type: "job", state: "live" },
    { effect: "redact", item: 1, slot: "note", texts: [d("1")] },
    { effect: "relation", owner: directory, item: 1, name: "child", state: "live", revision: 1 },
    { effect: "record", capability: "git-read@1", kind: "ref", key: [], state: "set", values: {} },
    { effect: "activate" },
    { effect: "operation", k: 0, owner: "git-read@1", kind: "push", attempts: 1 },
    { effect: "attempt", operation: { k: 0 }, attempt: 0, result: "opened", selected: null },
    { effect: "index", from: { at: directory, seq: 1, hash: d("2") }, fields: {} },
    { effect: "attention", item: 1, members: [member], reason: "due" },
  ];
  // The current witness inventory includes all 15 kinds of Effect.
  expect(new Set([...items, ...others].map((effect) => effect.effect)).size).toBe(15);
  expect(items.map(isItemEffect)).toEqual(items.map(() => true));
  expect(others.map(isItemEffect)).toEqual(others.map(() => false));
});

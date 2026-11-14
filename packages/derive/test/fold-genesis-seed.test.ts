import { expect, test } from "vitest";
import type { Digest, Entry, PlatformDefinition } from "@generalbusiness/dap-contract";
import { entryHash } from "@generalbusiness/dap-bytes";
import { FoldError, MemoryState, applyEntry } from "../src/index.ts";
import { Scope, genesisOnly, laneDefinition, smallDefinition } from "./fixtures.ts";

// The lane fixture's genesis, with its seed naming `definition`, folded under the lane definition.
const genesisNaming = (definition: Digest | PlatformDefinition): Entry => {
  const entry = genesisOnly(new Scope(laneDefinition, undefined, false).entries[0]!.entry);
  return { ...entry, input: { ...entry.input, seed: { ...entry.input.seed, definition } } };
};
const folded = (entry: Entry) => {
  const state = new MemoryState();
  applyEntry(state, laneDefinition, entry, entryHash(entry));
  return state;
};

test("the fold refuses a genesis whose seed names another declared definition", () => {
  expect(smallDefinition.digest).not.toBe(laneDefinition.digest);
  expect(() => folded(genesisNaming(smallDefinition.digest))).toThrow(new FoldError("the genesis seed names another definition"));
  expect(folded(genesisNaming(laneDefinition.digest)).scope()?.head.seq).toBe(0);
});

test("a genesis whose seed names a platform definition folds as before", () => {
  const [platform, declared] = [folded(genesisNaming("platform:directory@1")), folded(genesisNaming(laneDefinition.digest))];
  // The seed changes the scope ID and the genesis hash, which each item states as the entry that opened it. All else stays the same.
  const items = (state: MemoryState) => state.all().items.map((item) => ({ ...item, opened: item.opened === state.scope()?.at.genesis ? "genesis" : item.opened }));
  expect([platform.scope()?.head.seq, platform.scope()?.status, items(platform)]).toEqual([0, "provisional", items(declared)]);
  expect(platform.scope()?.at.scope).not.toBe(declared.scope()?.at.scope);
});

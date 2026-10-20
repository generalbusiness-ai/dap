/** Actual native creation, SQLite and genesis0 reads under the fixture's
 * TEST authority/clock/reader. This only witnesses fixture metadata binding,
 * not foreign privacy admission, production provenance or installed export. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import { create, definition, reader } from "./support.ts";

test("fixture source pins bind an actual native birth and declaration to its full identity, stay immutable and charge repeated lookups", async () => {
  const lane = await create(), other = await create(), birth = await lane.stub.entry(reader, 0);
  expect(birth.ok).toBe(true); if (!birth.ok) return;
  const input: FixtureArchiveSourceBirth = { at: { ...lane.at }, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, declaration: canonicalize(definition.declared) };
  const inputs = [input], map = new FixtureArchiveSourcePins(inputs, PROPOSED_BOUNDS, new ArchiveBudget()), budget = new ArchiveBudget();
  const before = budget.admitted(), first = map.get(lane.at, budget), one = budget.admitted();
  expect(first).toEqual({ at: lane.at, pin: definition.digest, genesis: lane.genesis.fact.hash, declaration: input.declaration });
  expect(Object.keys(first!).sort()).toEqual(["at", "declaration", "genesis", "pin"]);
  expect(map.get(other.at, budget)).toBeNull();
  expect(map.get(lane.at, budget)).toBe(first);
  expect(budget.admitted().attempts - before.attempts).toBe(3);
  expect(budget.admitted().inputWork - one.inputWork).toBeGreaterThan(one.inputWork - before.inputWork);
  inputs.length = 0;
  expect(map.get(lane.at, new ArchiveBudget())).toEqual(first);
  expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first!.at)).toBe(true);
  expect(() => map.get(lane.at, new ArchiveBudget({ attempts: 0 }))).toThrow("archive-limit");
  expect(() => new FixtureArchiveSourcePins(Array(65).fill(input), PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-limit");
  expect(() => new FixtureArchiveSourcePins([null as never], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-unavailable");
  expect(() => new FixtureArchiveSourcePins([{ ...input, birth: { ...input.birth, bytes: "{bad" } }], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");

  const wrongDeclaration = variant(definition.declared, data => { data.name = "test.wrong-foreign-producer"; });
  expect(() => new FixtureArchiveSourcePins([{ ...input, declaration: canonicalize(wrongDeclaration.declared) }], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");
  expect(() => new FixtureArchiveSourcePins([{ ...input, at: other.at }], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");
  // Tampered fixture configuration only: no native stored entry is changed.
  // A recomputed hash cannot make a different seed name this existing scope.
  const forged = structuredClone(birth.value.entry);
  if (forged.input.type !== "genesis") return expect.fail("Native genesis0 required");
  forged.input.seed.cause = definition.digest;
  let refusedSeed = false;
  try { new FixtureArchiveSourcePins([{ ...input, birth: { bytes: canonicalize(forged), hash: entryHash(forged) } }], PROPOSED_BOUNDS, new ArchiveBudget()); }
  catch (error) { refusedSeed = error instanceof Error && error.message === "archive-mismatch"; }
  expect(refusedSeed).toBe(true);
});

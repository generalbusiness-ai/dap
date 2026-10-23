import { archiveWrongProducerChange } from "./definition-corpus-data.ts";
/** Actual native creation, SQLite and genesis0 reads under the fixture's
 * TEST authority/clock/reader. This only witnesses fixture metadata binding,
 * not foreign privacy admission, production provenance or installed export. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, utf8 } from "@generalbusiness/dap-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { forecastArchiveSourceLookup } from "../src/archive-source-cost.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
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
  const missing = budget.admitted();
  expect(map.get(lane.at, budget)).toBe(first);
  const repeated = budget.admitted();
  const quote = forecastArchiveSourceLookup(utf8(first!.declaration).length);
  for (const [start, end] of [[before, one], [missing, repeated]] as const) {
    for (const key of Object.keys(quote) as (keyof ArchiveCost)[]) expect(quote[key]).toBeGreaterThanOrEqual(end[key] - start[key]);
  }
  const miss = Object.fromEntries(Object.keys(one).map(key => [key, missing[key as keyof ArchiveCost] - one[key as keyof ArchiveCost]]));
  expect(miss).toEqual({ entries: 0, attempts: 1, nodes: 0, calls: 0, metadata: 512, inputWork: 1024 });
  expect(forecastArchiveSourceLookup(null)).toEqual(miss);
  expect(budget.admitted().attempts - before.attempts).toBe(3);
  expect(budget.admitted().inputWork - one.inputWork).toBeGreaterThan(one.inputWork - before.inputWork);
  inputs.length = 0;
  expect(map.get(lane.at, new ArchiveBudget())).toEqual(first);
  expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first!.at)).toBe(true);
  expect(() => map.get(lane.at, new ArchiveBudget({ attempts: 0 }))).toThrow("archive-limit");
  expect(() => new FixtureArchiveSourcePins(Array(65).fill(input), PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-limit");
  expect(() => new FixtureArchiveSourcePins([null as never], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-unavailable");
  expect(() => new FixtureArchiveSourcePins([{ ...input, birth: { ...input.birth, bytes: "{bad" } }], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");

  const wrongDeclaration = variant(definition.declared, archiveWrongProducerChange());
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

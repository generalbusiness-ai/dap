import { archiveWrongProducerChange } from "./definition-corpus-data.ts";
/** Actual native creation, SQLite and genesis0 reads under the fixture's
 * TEST authority/clock/reader. This only witnesses fixture metadata binding,
 * not foreign privacy admission, production provenance or installed export. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Guard } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, definitionDigest, entryHash, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { normalizeDefinition } from "../../derive/src/validate/spelling.ts";
import { variant } from "@generalbusiness/dap-derive/testing";
import { forecastArchiveSourceLookup } from "../src/archive-source-cost.ts";
import { archiveReplayScopeRefs, archiveReplayScopes } from "../src/archive-publication.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import { create, definition, reader } from "./support.ts";

test("fixture source pins bind an actual native birth and declaration to its full identity, stay immutable and charge repeated lookups", async () => {
  const lane = await create(), other = await create(), birth = await lane.stub.entry(reader, 0);
  expect(birth.ok).toBe(true); if (!birth.ok) return;
  const input: FixtureArchiveSourceBirth = { at: { ...lane.at }, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, declaration: canonicalize(definition.declared) };
  const inputs = [input], map = new FixtureArchiveSourcePins(inputs, PROPOSED_BOUNDS, new ArchiveBudget()), budget = new ArchiveBudget();
  const before = budget.admitted(), first = map.get(lane.at, budget), one = budget.admitted();
  expect(first).toEqual({ at: lane.at, kind: "directory", pin: definition.digest, genesis: lane.genesis.fact.hash, checked: first!.checked, declaration: input.declaration });
  expect(Object.keys(first!).sort()).toEqual(["at", "checked", "declaration", "genesis", "kind", "pin"]);
  expect(first!.checked.at).toEqual(lane.at); expect(first!.checked.kind).toBe("directory");
  expect(Object.isFrozen(first!.checked)).toBe(true);
  // Loading stored refs proves only shape. Publication requires this pass's
  // actual association; neither a bare extra ref nor missing context suffices.
  expect(archiveReplayScopeRefs([lane.at], lane.at, new ArchiveBudget())).toEqual([lane.at]);
  expect(() => archiveReplayScopes([lane.at], lane.at, new ArchiveBudget())).toThrow("archive-unavailable");
  expect(archiveReplayScopes([lane.at], lane.at, new ArchiveBudget(), { checked: [first!.checked] })).toEqual([lane.at]);
  expect(() => archiveReplayScopes([lane.at, other.at], lane.at, new ArchiveBudget(), { checked: [first!.checked] })).toThrow("archive-unavailable");
  expect(() => archiveReplayScopeRefs([lane.at, { ...lane.at, genesis: other.at.genesis }], lane.at, new ArchiveBudget())).toThrow("archive-unavailable");
  // This canonical TEST header exercises identity/kind admission only. It
  // does not claim Native creation, judgment, privacy or a Rules-slot role.
  const privateBirth = structuredClone(birth.value.entry);
  if (privateBirth.input.type !== "genesis") return expect.fail("Native genesis0 required");
  privateBirth.input.seed.kind = "membership";
  const privateAt = { scope: scopeIdOf(privateBirth.input.seed), genesis: entryHash(privateBirth) };
  const privateChecked = admitSequenceGenesis(canonicalize(privateBirth), privateAt, PROPOSED_BOUNDS.entryBytes);
  expect(privateChecked).not.toBeNull(); if (!privateChecked) return;
  expect(archiveReplayScopeRefs([privateAt], privateAt, new ArchiveBudget())).toEqual([privateAt]);
  expect(() => archiveReplayScopes([privateAt], privateAt, new ArchiveBudget(), { checked: [privateChecked] })).toThrow("archive-unavailable");
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
  expect(() => new FixtureArchiveSourcePins([{ ...input, at: { ...input.at, genesis: definition.digest } }], PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");
  // A syntactically valid redundant spelling has matching content identity
  // but cannot become a new-format source declaration. It is fixture data,
  // not a replacement for the real Native birth used above.
  const redundant = structuredClone(normalizeDefinition(definition.declared));
  (redundant.acts["remark"]!.guards as Guard[]).push({ of: "on", equals: { a: { field: "text" }, b: { field: "text" } } });
  expect(validateDefinition(redundant, PROPOSED_BOUNDS, RULE_PROFILES).ok).toBe(true);
  const redundantBirth = structuredClone(birth.value.entry);
  if (redundantBirth.input.type !== "genesis") return expect.fail("Native genesis0 required");
  const redundantSeed = redundantBirth.input.seed;
  redundantSeed.definition = definitionDigest(redundant);
  const redundantHash = entryHash(redundantBirth);
  expect(() => new FixtureArchiveSourcePins([{ at: { scope: scopeIdOf(redundantSeed), genesis: redundantHash },
    birth: { bytes: canonicalize(redundantBirth), hash: redundantHash }, declaration: canonicalize(redundant) }],
  PROPOSED_BOUNDS, new ArchiveBudget())).toThrow("archive-mismatch");

});

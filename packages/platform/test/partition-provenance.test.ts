import { expect, test } from "vitest";
import type { GenesisEntry } from "@generalbusiness/dap-contract";
import { definitionDigest, digestBytes, isEntryOf, isPlatformDefinition, admitSequenceGenesis, canonicalize, entryHash, factRefOf, utf8 } from "@generalbusiness/dap-bytes";
import { sourceName } from "../src/publishing-provenance.ts";
import { partitionApplicationPublicationOrigin, partitionPublishingLaneOrigin, partitionPublicationOrigin, partitionSourceName, partitionCreationPolicy, partitionDeclaredCreationPolicy, partitionReceiverPolicy, type PartitionNativeFrame } from "../src/partition-provenance.ts";
import { genesisOnly, small } from "@generalbusiness/dap-derive/testing";
import { scriptedPartitionOrigin } from "./fixtures-entry.ts";

const raw = (sample: ReturnType<typeof scriptedPartitionOrigin>): PartitionNativeFrame[] => sample.frames.map(copy => {
  const born = sample.frames.find(row => row.fact.seq === 0 && row.fact.at.scope === copy.fact.at.scope)!.entry.input;
  if (born.type !== "genesis") throw new Error("scripted fixture has no genesis");
  return { fact: copy.fact, entry: copy.entry, sequence: copy.sequence, named: born.seed.definition, native: isPlatformDefinition(born.seed.definition), declarationName: copy.under };
});

// Pure SCRIPTED immutable proof shape. The receiver must separately prove
// eligibility, and actual native execution/Authority remains a Scope witness.
test("new direct factory proof binds all eight births while the legacy producer policy keeps partition lanes declared", () => {
  const change = scriptedPartitionOrigin(), application = scriptedPartitionOrigin("application");
  expect(partitionPublishingLaneOrigin(change.from, change.root, change.destination, change.frames)).toBeNull();
  expect(partitionPublicationOrigin(change.from, change.root, change.destination, "change", raw(change))).toBe(true);
  expect(partitionApplicationPublicationOrigin(application.from, application.root, application.destination, application.frames)).toBeNull();
  expect(partitionPublicationOrigin(application.from, application.root, application.destination, "application", raw(application))).toBe(true);
  expect(partitionSourceName(change.definition, "change", change.from.at, raw(change))).toBe("change");
  expect(sourceName(change.definition, "change", change.frames.map(copy => ({ ...copy, bytes: canonicalize(copy.entry) })))).toBe("declared:change");
  const wrong = change.definition;
  expect(partitionPublicationOrigin(change.from, { ...change.root, genesis: wrong }, change.destination, "change", raw(change))).toBeNull();
  expect(partitionPublicationOrigin(change.from, change.root, { ...change.destination, genesis: wrong }, "change", raw(change))).toBe(false);
  expect(partitionPublicationOrigin(change.from, change.root, change.destination, "change", raw(change).slice(0, -1))).toBeNull();
  expect(partitionSourceName(change.definition, "change", change.from.at, raw(change).map(row => row.fact.at.scope === change.partition.scope ? { ...row, native: false } : row))).toBeNull();
  expect(partitionSourceName(change.definition, "change", change.from.at, [raw(change)[0]!, ...raw(change)])).toBeNull();
  const borrowed = raw(change).map((row, n) => n === 0 ? { ...row, sequence: raw(change).at(-1)!.sequence } : row);
  expect(partitionSourceName(change.definition, "change", change.from.at, borrowed)).toBeNull();
  const sealed = scriptedPartitionOrigin("change", 0, false, undefined, true);
  expect(partitionPublicationOrigin(sealed.from, sealed.root, sealed.destination, "change", raw(sealed))).toBe(true);
  expect(partitionPublicationOrigin(sealed.from, sealed.root, sealed.destination, "change", raw(sealed).filter(row => row.fact.at.scope !== sealed.previous.scope))).toBeNull();

  // Keep only the existing Partition receiver and its exact Root opening,
  // Root/Register and M/R/D births. No descendant needs a rewritten ref.
  const receiverFrames = raw(change).filter(row => row.fact.at.scope !== change.from.at.scope
    && (row.fact.at.scope !== change.partition.scope || row.fact.seq === 0));
  expect(receiverFrames).toHaveLength(7);
  expect(partitionReceiverPolicy(change.partition, receiverFrames)?.mode).toBe("partition-v1");
  const part = receiverFrames.find(row => row.fact.at.scope === change.partition.scope)!;
  const register = receiverFrames.find(row => row.fact.at.scope === change.register.scope)!;
  const partEntry = genesisOnly(part.entry), partInput = partEntry.input;
  if (partInput.source === null) return expect.fail("scripted Partition receiver has no creation source");
  const registerContent = digestBytes(utf8(canonicalize(register.entry)));
  const matchingUse = { fact: register.fact, content: registerContent, kind: "register" as const };
  const unheld = { ...register.fact.at, genesis: change.definition };
  // The no-held-birth aliases below are recorded claims only, not tokens.
  const examples = [
    { sourceKind: "directory", uses: [matchingUse], admitted: true },
    { sourceKind: "lane", uses: [], admitted: false },
    { sourceKind: "directory", uses: [{ ...matchingUse, kind: "directory" }], admitted: false },
  ] as const;
  for (const example of examples) {
    const receiving: GenesisEntry = { ...partEntry, uses: example.uses,
      input: { ...partInput, sourceKind: example.sourceKind } };
    const at = { scope: part.fact.at.scope, genesis: entryHash(receiving) }, bytes = canonicalize(receiving);
    const sequence = admitSequenceGenesis(bytes, at, utf8(bytes).length);
    if (!sequence) return expect.fail("recorded-kind example failed self birth admission");
    const fact = factRefOf(receiving, at);
    expect(sequence.kind).toBe("directory");
    expect(isEntryOf(receiving, fact, sequence)).toBe(true);
    const proof = receiverFrames.map(row => row === part ? { ...row, fact, entry: receiving, sequence } : row);
    expect(proof.every(row => isEntryOf(row.entry, row.fact, row.sequence))).toBe(true);
    const selected = partitionReceiverPolicy(at, proof);
    if (example.admitted) expect(selected?.mode).toBe("partition-v1");
    else expect(selected).toBeNull();
  }
  // Each entry below has one well-shaped recorded alias. Only their shared
  // operation reveals disagreement about the same unheld sequence.
  const opening = receiverFrames.find(row => canonicalize(row.fact) === canonicalize(partInput.source))!;
  const unheldUse = { ...matchingUse, fact: { ...register.fact, at: unheld } };
  for (const kind of ["register", "directory"] as const) {
    const changedOpening = { ...opening.entry, uses: [{ ...unheldUse, kind }] };
    const openingFact = factRefOf(changedOpening, opening.fact.at);
    const receiving: GenesisEntry = { ...partEntry, uses: [unheldUse],
      input: { ...partInput, source: openingFact } };
    const at = { scope: part.fact.at.scope, genesis: entryHash(receiving) }, bytes = canonicalize(receiving);
    const sequence = admitSequenceGenesis(bytes, at, utf8(bytes).length);
    if (!sequence) return expect.fail("cross-entry alias example failed self birth admission");
    const proof = receiverFrames.map(row => row === part ? { ...row, fact: factRefOf(receiving, at), entry: receiving, sequence }
      : row === opening ? { ...row, fact: openingFact, entry: changedOpening } : row);
    expect(proof.every(row => isEntryOf(row.entry, row.fact, row.sequence))).toBe(true);
    const selected = partitionReceiverPolicy(at, proof);
    if (kind === "register") expect(selected?.mode).toBe("partition-v1");
    else expect(selected).toBeNull();
  }
  // A missing actual Register remains missing; its recorded name creates no
  // association and the policy does not fetch one through this pure API.
  expect(partitionReceiverPolicy(change.partition, receiverFrames.filter(row => row !== register))).toBeNull();
});

test("concern identity proves each exact parent's pin and inherited room under one total depth budget", () => {
  const nested = scriptedPartitionOrigin("issue", 3), frames = raw(nested);
  expect(partitionSourceName(nested.definition, "issue", nested.from.at, frames)).toBe("issue");
  // Removing a parent's exact birth cannot be replaced by the parent's raw
  // declared name. No current producer or global identity is upgraded.
  expect(partitionSourceName(nested.definition, "issue", nested.from.at, frames.filter((_, n) => n !== 2))).toBeNull();
  const tooDeep = scriptedPartitionOrigin("issue", 4);
  expect(partitionSourceName(tooDeep.definition, "issue", tooDeep.from.at, raw(tooDeep))).toBeNull();
  const foreign = scriptedPartitionOrigin("issue", 3, true);
  expect(partitionSourceName(foreign.definition, "issue", foreign.from.at, raw(foreign))).toBe("declared:issue");
  expect(partitionSourceName(nested.definition, "change", nested.from.at, frames)).toBe("declared:change");
  // Either recorded-kind direction must agree with the genuine creator
  // birth. In particular, recorded lane over an actual Directory cannot
  // choose Native lane ancestry.
  const direct = scriptedPartitionOrigin();
  for (const [sample, sourceKind, name] of [[nested, "directory", "issue"], [direct, "lane", "change"]] as const) {
    const originals = raw(sample), leaf = originals[0]!;
    const leafGenesis = sample.genesis, leafInput = leafGenesis.input;
    if (leaf.entry.input.type !== "genesis" || leafInput.source === null) return expect.fail("scripted leaf is not a sourced genesis");
    const contradicted: GenesisEntry = { ...leafGenesis, input: { ...leafInput, sourceKind } };
    const at = { scope: leaf.fact.at.scope, genesis: entryHash(contradicted) }, bytes = canonicalize(contradicted);
    const sequence = admitSequenceGenesis(bytes, at, utf8(bytes).length);
    if (!sequence) return expect.fail("contradictory recorded kind did not retain canonical birth shape");
    const altered = [{ ...leaf, entry: contradicted, fact: factRefOf(contradicted, at), sequence }, ...originals.slice(1)];
    expect(isEntryOf(contradicted, factRefOf(contradicted, at), sequence)).toBe(true);
    expect(partitionSourceName(sample.definition, name, at, altered)).toBeNull();
  }
});


test("empty partition bootstrap binds the actual native parent send without inventing an accepted child", () => {
  const sample = scriptedPartitionOrigin(), frames = raw(sample).filter(row => row.fact.at.scope !== sample.from.at.scope && row.fact.at.scope !== sample.partition.scope);
  // Keep Root opening + Root genesis + M/R/D births + actual Register birth.
  const part = sample.frames.find(row => row.fact.seq === 0 && row.fact.at.scope === sample.partition.scope)!.entry.input;
  if (part.type !== "genesis" || !part.source || part.n === null || !part.message) return expect.fail("scripted partition has no create");
  const creation = { seed: part.seed, source: part.source, n: part.n, message: part.message };
  expect(frames).toHaveLength(6);
  expect(partitionCreationPolicy(creation, frames)).toEqual({ mode: "partition-v1", root: sample.root, creation });
  expect(partitionCreationPolicy({ ...creation, n: creation.n + 1 }, frames)).toBeNull();
  expect(partitionCreationPolicy(creation, frames.slice(0, -1))).toBeNull();
});


test("declared bootstrap proves the exact factory or all concern parents with the unborn child counted in the depth limit", () => {
  // SCRIPTED immutable proof shape; normal declaration validation and native
  // genesis judgment remain separate obligations. No lane code runs here.
  const definition = { ...small, name: "issue", genesis: "file" };
  const sample = scriptedPartitionOrigin("issue", 3, false, definitionDigest(definition));
  const born = sample.genesis.input;
  if (born.type !== "genesis" || !born.source || born.n === null || !born.message) return expect.fail("scripted lane has no create");
  const creation = { seed: born.seed, source: born.source, n: born.n, message: born.message };
  const frames = raw(sample).filter(row => row.fact.at.scope !== sample.from.at.scope);
  expect(frames).toHaveLength(14);
  expect(partitionDeclaredCreationPolicy(creation, definition, frames)).toEqual({ mode: "partition-v1", root: sample.root, creation });
  expect(partitionDeclaredCreationPolicy(creation, { ...definition, name: "change" }, frames)).toBeNull();
  expect(partitionDeclaredCreationPolicy(creation, { ...definition, profile: { ...definition.profile, version: 99 } }, frames)).toBeNull();
  expect(partitionDeclaredCreationPolicy({ ...creation, n: 1 }, definition, frames)).toBeNull();
  const tooDeep = scriptedPartitionOrigin("issue", 4, false, definitionDigest(definition)), birth = tooDeep.genesis.input;
  if (birth.type !== "genesis" || !birth.source || birth.n === null || !birth.message) return expect.fail("scripted concern has no create");
  expect(partitionDeclaredCreationPolicy({ seed: birth.seed, source: birth.source, n: birth.n, message: birth.message }, definition, raw(tooDeep).filter(row => row.fact.at.scope !== tooDeep.from.at.scope))).toBeNull();
});

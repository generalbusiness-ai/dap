/** Pure platform floor readers. The directory case uses judged in-memory
 * entries and scripted child authority. The G15 case supplies a scripted
 * snapshot and genesis only. Neither case proves native custody. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Entry, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { entryHash, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { MemoryState } from "@generalbusiness/dap-derive";
import type { Own, RuleGiven } from "@generalbusiness/dap-derive";
import { d, directory as scriptedDirectory, T0 } from "@generalbusiness/dap-derive/testing";
import { directoryRules, HARDENED_CERTIFIED_RULES_COHORT, platform } from "../src/index.ts";
import { platformFloorReferences } from "../src/floor.ts";
import { checkedPlatformData, Directory, creationRita as rita } from "./fixtures-entry.ts";

test("directory import-spent walks sparse held entries and retains unresolved import openings", () => {
  const directory = new Directory({ import: "https://git.example/old/repository.git" });
  const opening = directory.entries.find(({ entry }) => entry.effects.some(effect => effect.effect === "operation" && effect.kind === "import"))!.entry.seq;
  const operation = `${opening}:0` as const;
  for (const attempt of [1, 2, 3]) expect(directory.outcome(operation, attempt, "refused", {}).result).toBe("write");
  const removed = directory.entries.find(({ entry }) => entry.seq > 0 && entry.seq !== opening && entry.effects.every(effect => effect.effect !== "operation"))!.entry.seq;
  const held = directory.entries.map(({ entry }) => entry.seq).filter(seq => seq !== removed);
  const sparse: Own = Object.assign((seq: number) => seq === removed ? null : directory.own(seq), { positions: (before: number) => held.filter(seq => seq < before) });
  const given: RuleGiven = {
    state: directory.state, input: { type: "act", signed: directory.intent(rita, "retry-import"), grant: null, presented: {} },
    time: directory.now, uses: [], own: sparse, placed: () => undefined, observed: () => null, value: () => null,
    resolved: { at: directory.at, self: directory.head.seq + 1, fields: {}, subjects: new Map(), signer: { member: rita.member, principal: null }, bounds: PROPOSED_BOUNDS },
  };
  const rule = directoryRules["import-spent"];
  if (rule?.place !== "guard") throw Error("the real import-spent guard is required");
  expect(rule.run(given)).toEqual({ holds: true });
  // The identical missing payload without a sparse position port fails:
  // this distinguishes the historical dense scan from the repaired reader.
  expect(rule.run({ ...given, own: seq => sparse(seq) })).toEqual({ holds: false, name: "import-not-spent" });
  expect([...platformFloorReferences(directory.state.all(), directory.definition, sparse)]).toContain(opening);
  const repository = directory.item(0);
  directory.state.putItem({ ...repository, values: { ...repository.values, imported: "a".repeat(40) } });
  expect([...platformFloorReferences(directory.state.all(), directory.definition, sparse)]).toEqual([]);
});

test("G15 keeps both local facts read by the latest declined certificate record", () => {
  const definition = checkedPlatformData(platform(HARDENED_CERTIFIED_RULES_COHORT.destination)!.data);
  // SCRIPTED snapshot/genesis metadata for the real validated G15 reader.
  // No factory, signer, outcome judgment, archive writer or authority ran.
  const seed: Seed = { v: 1, kind: "destination", definition: HARDENED_CERTIFIED_RULES_COHORT.destination,
    creator: scriptedDirectory, cause: d("c"), ordinal: 2 };
  const at: ScopeRef = { kind: "destination", scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(15)) };
  const genesis: Entry = { v: 1, at, seq: 0, prev: null, time: T0, clamped: false, epoch: 0,
    input: { type: "genesis", seed, inc: at.inc, kind: "establish", "founding": null,
      source: { at: scriptedDirectory, seq: 0, hash: d("d") }, n: 2,
      message: { class: "request", type: "create", body: { fields: {} } }, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const genesisOwn: Own = seq => seq === 0 ? { entry: genesis, hash: entryHash(genesis) } : null;
  const state = new MemoryState();
  state.setScope({ at, creator: scriptedDirectory, status: "active", head: { seq: 50, hash: d("5") }, time: T0,
    genesis: { hash: entryHash(genesis), source: genesis.input.type === "genesis" ? genesis.input.source : null, n: 2 }, held: [] });
  state.putItem({ id: 0, type: "branch", state: "ready", revision: 49, opened: entryHash(genesis), attributed: [], parties: {}, refs: {},
    values: { rulesCertificateDeclined: { answer: "certificate-declined",
      request: { at: { ...at }, seq: 17, hash: d("7") },
      interveningFact: { at: { ...at }, seq: 18, hash: d("8") } } } });
  state.putOperation({ id: "17:0", owner: HARDENED_CERTIFIED_RULES_COHORT.destination,
    kind: "certify-rules-tree", most: 1, for: 0, selected: null,
    attempts: [{ attempt: 1, opened: 17, outcomes: [{ seq: 49, result: "refused", evidence: d("e"), selected: false }] }] });
  // The closed operation already keeps its request and outcome. The latest
  // decline must also keep the intervening fact that no operation points at.
  expect([...new Set(platformFloorReferences(state.all(), definition, genesisOwn))].sort((a, b) => a - b)).toEqual([17, 18, 49]);
});

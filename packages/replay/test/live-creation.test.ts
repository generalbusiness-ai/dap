import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { checkpointOf, clockOf, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import { created, creation, deliver, keys, Ledger, T0, valid } from "@generalbusiness/dap-derive/testing";
import { contextParentData } from "../../derive/test/definition-corpus/general-creation-data.ts";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { hashOfBytes, MemorySource, verify } from "../src/index.ts";
import { contentOf, served } from "./world.ts";

// Derive's in-memory ledgers stand in for the runtime. Replay accepts the
// fixture authority as recorded, as in the other replay history tests.
test("replay verifies a live child's creation and confirmation and finds a mismatch at a forged third entry", async () => {
  const definition = valid(validateDefinition(liveBase(), PROPOSED_BOUNDS));
  const parentData = contextParentData(definition.digest, "lane");
  parentData.acts["spawn"]!.sends = [{ create: { kind: "lane", definition: definition.digest, fields: {}, result: {} } }];
  const parent = created(valid(validateDefinition(parentData, PROPOSED_BOUNDS)), {});
  const sent = parent.did(keys.rita, "spawn", { on: 0, expected: { on: parent.item(0).revision } });
  const child = new Ledger(definition);
  const { asked, source } = creation(parent, sent.seq);
  const born = judgeGenesis(child.state, definition, asked, { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source });
  if (born.result !== "write") throw new Error("the fixture must write the child's genesis");
  child.seal(born.draft);
  expect(deliver(parent, child, 0).result).toBe("write");
  expect(deliver(child, parent, parent.head.seq).result).toBe("write");

  const all = [parent, child];
  const journal = served(child, all);
  const replayChild = () => verify(new MemorySource([journal, served(parent, all)]), { mode: "replay", scope: child.at.scope, grants: "as-recorded" });
  expect(await replayChild()).toMatchObject({ report: {
    result: "consistent", target: { at: child.at, seq: 1, hash: child.head.hash },
    coverage: [{ scope: child.at, from: 0, through: 1 }, { scope: parent.at, from: 0, through: parent.head.seq }],
  } });

  // The third entry names a foreign body the child does not retain. Replay
  // can already decide that the entry cannot belong to the live journal.
  const forged: Entry = { v: 1, genesis: child.at.genesis, seq: 2, prev: child.head.hash, time: T0, clamped: false, epoch: 0,
    input: { type: "checkpoint", ...checkpointOf(child.state) },
    uses: [{ fact: parent.fact(0), kind: "directory", content: contentOf(canonicalize(parent.entries[0]!.entry)) }],
    prepared: [], effects: [], sends: [] };
  const bytes = canonicalize(forged), hash = hashOfBytes(bytes);
  journal.entries.push({ seq: forged.seq, hash, bytes });
  expect(await replayChild()).toMatchObject({ report: { result: "mismatch", at: { at: child.at, seq: 2, hash } } });
});

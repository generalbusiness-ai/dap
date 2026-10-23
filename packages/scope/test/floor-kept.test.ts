import { floorKeptChange } from "./definition-corpus-data.ts";
/** Real native inputs/turns/SQLite; made-up lane declaration and fixture
 * authority/clock. No archive writer, provider or custody claim. */
import { expect, test } from "vitest";
import { variant } from "@generalbusiness/dap-derive/testing";
import { countedEntries } from "@generalbusiness/dap-derive";
import { Scope } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { testPorts } from "../src/testing.ts";
import { at, create, rita } from "./fixtures-native.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

// Invariant: the maximum kept set is admitted, and one more live opening
// makes a later offer refuse without deleting any payload or changing state.
test("Native floor-kept refuses the 4097th live opening after an exact4096 kept set", async () => {
  const definition = variant(archiveDefinition.declared, floorKeptChange());
  const lane = await create({}, {}, definition);
  for (let n = 0; n < 4196; n++) {
    expect((await lane.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } })).answer).toBe("accepted");
  }
  lane.c.clock.now = at(1000);
  const result = await lane.inside(async state => {
    const store = new SqliteStore(archiveSql(state)), scope = new Scope(lane.name, store, { ...production(), ...testPorts(lane.c) }, lane.c.bounds);
    const receipt = { commit: "a".repeat(40), through: store.scope()!.head };
    expect(await scope.floor({ type: "floor", floor: 4096, receipt, keep: [] })).toMatchObject({ answer: "written" });
    expect(store.floor()!.kept).toEqual(Array.from({ length: 4096 }, (_, n) => n));
    const before = { all: store.all(), counted: countedEntries(store), payloads: state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"] };
    expect(await scope.floor({ type: "floor", floor: 4097, receipt, keep: [] })).toEqual({ answer: "refused", reason: "floor-kept" });
    expect({ all: store.all(), counted: countedEntries(store), payloads: state.storage.sql.exec("SELECT COUNT(*) AS n FROM entry").one()["n"] }).toEqual(before);
    return before;
  });
  await lane.restart();
  expect(await lane.inside(state => new SqliteStore(archiveSql(state)).all())).toEqual(result.all);
}, 120_000);

/** Native metadata classification on genuine entries and SQLite. Certificates
 * and owner support tables are stand-ins; deliberately corrupted last rows
 * test fail-closed classification, not history integrity or authority. */
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { DEVICE_COMMAND, DOMAINS, PROPOSED_BOUNDS, RETAINED_INPUT_BYTES } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { OperationRules } from "@generalbusiness/dap-derive";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { forecastArchiveDeclarationValidation } from "../src/archive-inventory-cost.ts";
import { forecastArchiveRetainedPass } from "../src/archive-row-cost.ts";
import { forecastArchiveEntryPrivacy } from "../src/archive-entry-privacy-cost.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { DEVICE_COMMAND_ARCHIVE_PREPARATIONS, DEVICE_COMMAND_ARCHIVE_RECORDS, archivePrivacyMetadata, type ArchiveSupport } from "../src/archive-privacy.ts";
import { definition, create, rita, type Lane } from "./fixtures-native.ts";

const support: ArchiveSupport = { named: definition.digest, definition, owners: new Map(), records: new Map(), preparations: new Map() };
async function scan(lane: Lane, supplied: ArchiveSupport = support, calls = 16384) {
  const through = await lane.head();
  return lane.inside(state => {
    const queries: { query: string; seq: unknown }[] = [], forbidden: string[] = [], budget = new ArchiveBudget({ calls });
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      queries.push({ query, seq: args[0] });
      if (/SELECT (?:\*|bytes)|FROM retained_/.test(query)) { forbidden.push(query); throw new Error("body read blocked by witness"); }
      return state.storage.sql.exec(query, ...args);
    } };
    let reason = "admitted", positions: number[] = [];
    try { const prefix = archivePrefixMetadata(sql, lane.at, through, PROPOSED_BOUNDS, budget, new Set([definition.digest])); positions = archivePrivacyMetadata(sql, prefix, supplied, budget).positions.map(position => position.seq); }
    catch (error) { reason = (error as { reason: string }).reason; }
    // Kept outside fail-closed catch, so a swallowed body-read assertion
    // cannot make the refusal look like a valid privacy witness.
    expect(forbidden).toEqual([]);
    return { reason, positions, queries, cost: budget.admitted() };
  });
}
async function damageLast(lane: Lane, change: (entry: Entry) => void) {
  const through = await lane.head();
  await lane.inside(state => {
    const row = state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM entry WHERE seq = ?", through.seq).one();
    const entry = JSON.parse(row.bytes); change(entry); const bytes = canonicalize(entry);
    state.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", bytes, new TextEncoder().encode(bytes).length, through.seq);
  });
}

test("whole native prefix classification reaches every selected position without fetching entry or retained bodies", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "metadata classification" } });
  const result = await scan(lane);
  expect(result.reason).toBe("admitted"); expect(result.positions).toEqual([0, 1]);
  expect(result.queries.filter(row => row.query.includes("AS usesType")).map(row => row.seq)).toEqual([0, 1]);
  expect(result.cost.inputWork).toBeLessThan(64 * 1024 * 1024);
});

test("a copied foreign use in the last selected position refuses the whole prefix with no copied-value/text body read", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "last position" } });
  await damageLast(lane, entry => { entry.uses = [{ fact: lane.genesis.fact, content: lane.genesis.fact.hash }]; });
  const result = await scan(lane);
  expect(result.reason).toBe("unsupported-foreign-copy"); expect(result.positions).toEqual([]);
  expect(result.queries.filter(row => row.query.includes("AS usesType")).map(row => row.seq)).toEqual([0, 1]);
});

test("unknown operation owners and declared custom owner domains in a last position cannot be classified as absent", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "last owner" } });
  await damageLast(lane, entry => { entry.effects = [...entry.effects, { effect: "operation", k: 0, owner: "hold@1", kind: "check", attempts: 1 }]; });
  expect((await scan(lane)).reason).toBe("unsupported-archive-cohort");
  const rules: OperationRules = { selects: false, read: true, retries: () => false, valueDomains: [{ domain: "private-custom-value", max: 32 }] };
  const owners = new Map([["hold@1", new Map([["check", rules]])]]);
  expect((await scan(lane, { ...support, owners })).reason).toBe("unsupported-custom-domain");
  const known: OperationRules = { ...rules, valueDomains: [{ domain: DOMAINS.definition, max: 32 }] };
  expect((await scan(lane, { ...support, owners: new Map([["hold@1", new Map([["check", known]])]]) })).reason).toBe("admitted");
});

test("the native device-command metadata admits only its command record and answer step, and grants no outside-operation support", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "finite device metadata classification" } });
  // Synthetic record in a damaged row: classification only, no command,
  // installation, authority, replay or export success is claimed here.
  await damageLast(lane, entry => { entry.effects = [...entry.effects, { effect: "record", capability: DEVICE_COMMAND, kind: "command", key: [entry.seq], state: "open", values: {} }]; });
  const native = { ...support, records: new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]), preparations: new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) };
  expect((await scan(lane)).reason).toBe("unsupported-archive-cohort");
  expect((await scan(lane, native)).reason).toBe("admitted");
  expect((await scan(lane, { ...native, preparations: new Map([[DEVICE_COMMAND, new Set(["execute"]) ]]) })).reason).toBe("unsupported-archive-cohort");
  await damageLast(lane, entry => { entry.effects = [...entry.effects, { effect: "operation", k: 0, owner: DEVICE_COMMAND, kind: "execute", attempts: 1 }]; });
  expect((await scan(lane, native)).reason).toBe("unsupported-archive-cohort");
});

test("changed incarnation, an unknown consumer variant and a stopped scan never publish partial privacy admission", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "last variant" } });
  await damageLast(lane, entry => { entry.input.type = "new-consumer" as never; });
  expect((await scan(lane)).reason).toBe("unavailable");
  await damageLast(lane, entry => { entry.input.type = "act"; entry.at.inc = "wrong-incarnation" as never; });
  const changed = await scan(lane); expect(changed.reason).toBe("unavailable"); expect(changed.positions).toEqual([]);
  const stopped = await scan(await create(), support, 7);
  expect(stopped.reason).toBe("limit"); expect(stopped.positions).toEqual([]);
  expect(stopped.queries.filter(row => row.query.includes("AS usesType"))).toEqual([]);
});

// Scalar price boundary, not a native foreign copy or admission witness.
test("entry privacy quotes keep the original copy JSON charge and finite owner bound", () => {
  expect(forecastArchiveEntryPrivacy({ input: "outcome", effects: 64, copyBytes: 1557 })).toEqual({ ok: true,
    cost: { entries: 0, attempts: 0, nodes: 0, calls: 3, metadata: 34112, inputWork: 133760 } });
  expect(forecastArchiveEntryPrivacy({ input: "outcome", effects: 65 })).toEqual({ ok: false, reason: "limit" });
  expect(forecastArchiveEntryPrivacy({ input: "act", effects: 0, copyBytes: RETAINED_INPUT_BYTES + 1 })).toEqual({ ok: false, reason: "limit" });
  expect(() => forecastArchiveEntryPrivacy({ input: "act", effects: -1 })).toThrow("archive-unavailable");
});

// Scalar prices, not declaration validity, closure completeness or a receipt.
test("declaration validation and retained pass quotes keep the original work", () => {
  expect(forecastArchiveDeclarationValidation(1024)).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0,
    metadata: 0, inputWork: 49152 });
  expect(forecastArchiveRetainedPass()).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 1,
    metadata: 96, inputWork: 224 });
  expect(() => forecastArchiveDeclarationValidation(0)).toThrow("archive-unavailable");
  expect(() => forecastArchiveDeclarationValidation(Number.MAX_SAFE_INTEGER)).toThrow("archive-unavailable");
});

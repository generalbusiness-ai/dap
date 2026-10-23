import { platformOperationRequestData } from "./definition-corpus/derive-reservation-variants.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type PlatformData, type PlatformSend } from "@generalbusiness/dap-contract";
import { clockOf, fits, judgeDelivery, judgeGenesis, reserved, validateDefinition } from "../src/index.ts";
import { Ledger, T0, creation, sent, arriving, created, keys, on, platformRequests as fixture, futurePlatformRequests, settlingPlatformMarks, platformRequestRules } from "./fixtures-entry.ts";


const E = PROPOSED_BOUNDS.entryBytes;


// Pure validation and real in-memory judgment/fold. Platform marks and
// authority are explicitly fixtures; this is no native runtime/provider proof.
test("each platform request takes the maximum of its joint written and marked clauses, without charging conflict or unrelated sends", () => {
  const definition = fixture(), requests = definition.reserving!.requests!;
  expect(requests["acts.ask.sends.0"]).toEqual({ entries: 3, items: 1, records: 0, bytes: 4 * E, requests: 1 });
  expect(requests["acts.quiet.sends.0"]).toEqual({ entries: 2, items: 0, records: 0, bytes: 3 * E, requests: 1 });
  expect(definition.reserving!.req).toEqual(requests["acts.ask.sends.0"]);
  const scope = created(definition, {});
  scope.did(keys.rita, "both", on(scope, 0));
  expect(scope.state.pendingRequests().map(request => request.reservation)).toEqual([
    { entries: 3, items: 1, records: 0, bytes: 4 * E, requests: 0 },
    { entries: 2, items: 0, records: 0, bytes: 3 * E, requests: 0 },
  ]);
});

test("state and marker duties fund a settling mark's item and its future request, without inventing forbidden state-change edges", () => {
  for (const marker of [false, true]) {
    const definition = settlingPlatformMarks(marker), scope = created(definition, {});
    scope.did(keys.rita, "wait", on(scope, 0));
    expect(reserved(scope.state, definition, scope.last.input)).toEqual({ entries: 6, items: 2, records: 0, bytes: 7 * E, requests: 1 });
    expect(fits(scope.state, definition, { scopeEntries: 8 }, scope.last.input)).toBe(true);
    expect(fits(scope.state, definition, { scopeEntries: 7 }, scope.last.input)).toBe(false);
    const old = structuredClone(definition.declared) as PlatformData;
    delete old.capacity;
    const legacy = validateDefinition(old, PROPOSED_BOUNDS, undefined, { platform: true });
    expect(legacy.ok).toBe(false);
    if (!legacy.ok) expect(legacy.problems).toContainEqual(expect.objectContaining({ code: "reserve-unbounded", path: "acts.resolve-note.effects.1" }));
  }
  const cycle = structuredClone(settlingPlatformMarks().declared) as PlatformData;
  cycle.acts["finish-row"]!.effects = [...cycle.acts["finish-row"]!.effects, { code: "open-row", row: "P1", most: { effects: 0, operations: [], opens: "row" } }];
  const refused = validateDefinition(cycle, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.problems).toContainEqual(expect.objectContaining({ code: "reserve-unbounded", path: "acts.finish-row" }));

  const operations = platformOperationRequestData();
  const counted = validateDefinition(operations, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(counted.ok).toBe(true);
  if (counted.ok) expect(counted.definition.pendingWorkAmounts.pending["note"]!["waiting"]).toEqual({ entries: 7, items: 2, records: 0, bytes: 8 * E, requests: 1 });

  const holder = structuredClone(settlingPlatformMarks().declared) as PlatformData;
  delete holder.acts["ask"];
  delete holder.acts["both"];
  holder.items["row"]!.holds = { operations: { noop: 1 } };
  const held = validateDefinition(holder, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(held.ok).toBe(false);
  if (!held.ok) expect(held.problems).toContainEqual(expect.objectContaining({ code: "holds", path: "acts.resolve-note.effects.1" }));
});

test("a bare platform request fits its own exact entry budget and retains legacy's existing reservation projection", () => {
  const definition = fixture(), scope = created(definition, {});
  scope.did(keys.rita, "quiet", on(scope, 0));
  expect([scope.last.seq + 1, reserved(scope.state, definition, scope.last.input).entries]).toEqual([2, 3]);
  expect(fits(scope.state, definition, { scopeEntries: 5 }, scope.last.input)).toBe(true);
  expect(fits(scope.state, definition, { scopeEntries: 4 }, scope.last.input)).toBe(false);
  const old = fixture(false), legacy = created(old, {});
  legacy.did(keys.rita, "quiet", on(legacy, 0));
  expect(legacy.state.pendingRequests()[0]!.reservation).toBeUndefined();
  expect(old.reserving).toBeUndefined();
  expect(reserved(legacy.state, old, legacy.last.input).entries).toBe(4);
});


test("an owed platform result transfers its request room to the row it actually opens, then the real row settlement releases that duty", () => {
  const definition = fixture();
  const platform = platformRequestRules;
  const scope = created(definition, {}), context = scope.context.bind(scope);
  scope.context = (over = {}) => context({ platform, ...over });
  const asked = scope.did(keys.rita, "ask", on(scope, 0));
  expect([scope.last.seq + 1, reserved(scope.state, definition, scope.last.input).entries]).toEqual([2, 4]);
  expect(fits(scope.state, definition, { scopeEntries: 6 }, scope.last.input)).toBe(true);
  const child = new Ledger(definition), incoming = creation(scope, asked.seq);
  const genesis = judgeGenesis(child.state, definition, incoming.asked, { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, source: incoming.source, facts: [], prepared: [], platform });
  if (genesis.result !== "write") throw new Error("the fixture child must record its refused creation");
  child.seal(genesis.draft);
  expect(child.last.input).toMatchObject({ type: "genesis", decision: "refused" });
  const reply = sent(child, 0);
  const answered = judgeDelivery(scope.state, definition, reply.delivered, { ...arriving(scope, reply.delivered, reply.source), platform });
  if (answered.result !== "write") throw new Error(`the platform result must settle: ${JSON.stringify(answered)}`);
  scope.seal(answered.draft);
  const row = scope.last.seq;
  expect([scope.state.item(row)?.type, scope.state.keyCounts(), reserved(scope.state, definition, scope.last.input).entries]).toEqual(["row", { items: 2, records: 0, requests: 0 }, 2]);
  expect(fits(scope.state, definition, { scopeEntries: 6 }, scope.last.input, true)).toBe(true);
  scope.did(keys.rita, "finish-row", on(scope, row));
  expect(reserved(scope.state, definition, scope.last.input).entries).toBe(1);
  expect(scope.state.itemDuties()).toEqual([]);
});

test("a pending item funds two future marked request edges before its settling form runs, while real request-item cycles are refused", () => {
  const definition = futurePlatformRequests();
  expect(definition.pendingWorkAmounts.pending["note"]!["waiting"]).toEqual({ entries: 7, items: 2, records: 0, bytes: 9 * E, requests: 2 });
  expect(definition.pendingWorkAmounts.pending["row"]!["pending"]).toEqual({ entries: 4, items: 1, records: 0, bytes: 5 * E, requests: 1 });
  expect(definition.pendingWorkAmounts.pending["tail"]!["pending"]).toEqual({ entries: 1, items: 0, records: 0, bytes: E, requests: 0 });
  const scope = created(definition, {});
  scope.did(keys.rita, "wait", on(scope, 0));
  expect(reserved(scope.state, definition, scope.last.input)).toEqual({ entries: 8, items: 2, records: 0, bytes: 10 * E, requests: 2 });
  expect(fits(scope.state, definition, { scopeEntries: 10 }, scope.last.input)).toBe(true);
  expect(fits(scope.state, definition, { scopeEntries: 9 }, scope.last.input)).toBe(false);

  const cyclic = structuredClone(definition.declared) as PlatformData;
  const send = cyclic.acts["finish-row"]!.sends![0]! as Extract<PlatformSend, { create: unknown }>;
  send.create.result = { refused: [{ code: "open-row", row: "P1", most: { effects: 0, operations: [], opens: "row" } }] };
  const refused = validateDefinition(cyclic, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.problems).toContainEqual(expect.objectContaining({ code: "reserve-unbounded", path: "acts.finish-row" }));

  // A mark that may change any state can recreate a waiting ancestor.
  // Unlike the zero-change opening marks above, that is a real cycle.
  send.create.result = { refused: [{ code: "two-changes", row: "P2", most: { effects: 1, operations: [] } }] };
  const changing = validateDefinition(cyclic, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(changing.ok).toBe(false);
  if (!changing.ok) expect(changing.problems.some(problem => problem.code === "reserve-unbounded")).toBe(true);
});

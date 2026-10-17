import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { clockOf, fits, judgeDelivery, judgeGenesis, reserved } from "../src/index.ts";
import { Ledger, T0, creation, sent, arriving, created, keys, on } from "./fixtures.ts";

import { platformRequests as fixture, platformRequestRules } from "./fixtures-platform-requests.ts";

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

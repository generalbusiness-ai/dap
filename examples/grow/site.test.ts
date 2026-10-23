/** Actual judged create/result/confirm/relation exchanges in memory.
 * Grants are fixture authority, with no membership, host or provider proof. */
import { expect, test } from "vitest";
import { keys, deliver } from "@generalbusiness/dap-derive/testing";
import { creates } from "@generalbusiness/dap-derive";
import { siteForRoomDefinition, misaddressedRoomDefinition } from "./definition-corpus-data.ts";
import { sitePresence } from "./presence.ts";
import { room } from "./room.ts";
import { nativeCreatedSite, nativeChild, devicePermissions, operator, climate, sensors, on, replay, submit, type Ledger } from "./test-support.ts";
const night = { ...keys.sam, principal: operator.member };
const permissions = [...devicePermissions, [keys.rita, ["grow.tend"]], [night, ["grow.tend"]]] as const;
const wrote = (result: { result: string }) => expect(result).toMatchObject({ result: "write" });
async function setup(childDefinition = room) {
  const parentDefinition = siteForRoomDefinition(childDefinition);
  const { launcher, site: parent } = await nativeCreatedSite(parentDefinition, permissions, { label: "Test grow site" });
  const rooms: Ledger[] = [], rows: number[] = [];
  for (const label of ["Room A", "Room B", "Room C"]) {
    wrote(await submit(parent, operator, "create-room", { fields: { label } })); const row = parent.last.seq;
    expect(parent.item(row)).toMatchObject({ state: "pending", refs: { scope: null }, values: { openAlerts: null } });
    const child = await nativeChild(parent, row, childDefinition, permissions, 20 + rooms.length);
    wrote(deliver(parent, child, 0));
    expect(parent.item(row)).toMatchObject({ state: "active", refs: { scope: child.at } });
    wrote(deliver(child, parent, parent.last.seq));
    expect(child.item(0)).toMatchObject({ refs: { site: parent.at, siteRoom: parent.fact(row) }, values: { label } });
    rooms.push(child); rows.push(row);
  }
  expect(creates(parentDefinition)).toEqual([rooms[0]!.definition.digest]);
  return { launcher, parent, rooms, rows };
}

// Invariant: only a member's accepted report changes that member's durable
// presence; unrelated reports and wrong-room/other-member attempts cannot.
test("native Site presence keeps explicit report facts beyond the activity window", async () => {
  const { launcher, parent, rooms, rows } = await setup(), a = rows[0]!, b = rows[1]!;
  expect(await submit(parent, operator, "create-room", { fields: { label: "Room D" } })).toMatchObject({ result: "refused" });
  expect(await submit(parent, keys.rita, "provision-presence", { fields: { member: keys.rita.member } })).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(parent, operator, "provision-presence", { fields: { member: keys.rita.member } })); const dayId = parent.last.seq;
  wrote(await submit(parent, operator, "provision-presence", { fields: { member: night.member } })); const nightId = parent.last.seq;
  const initial = structuredClone(parent.item(dayId));
  expect(initial).toMatchObject({ state: "unknown", revision: 1, parties: { member: keys.rita.member }, refs: { room: null, reportedAt: null } });
  expect(await submit(parent, operator, "provision-presence", { fields: { member: keys.rita.member } })).toMatchObject({ result: "refused", reason: "guard-failed", name: "presence-exists" });
  expect(parent.item(dayId)).toEqual(initial);
  expect(await submit(parent, climate, "arrive", on(parent, dayId, { room: a }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(parent, night, "arrive", on(parent, dayId, { room: a }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "not-presence-member" });
  for (let i = 0; i < 101; i++) wrote(await submit(parent, night, "arrive", on(parent, nightId, { room: a })));
  expect(parent.item(dayId)).toEqual(initial);
  wrote(await submit(parent, keys.rita, "arrive", on(parent, dayId, { room: a }))); const arrival = parent.fact(parent.last.seq);
  expect(arrival.seq).toBeGreaterThan(100); expect(parent.item(dayId).revision).toBe(2);
  expect(parent.item(dayId).refs["reportedAt"]).toBe(arrival.seq);
  expect(sitePresence(parent.state.all().items, position => parent.fact(position))).toContainEqual({ member: keys.rita.member, room: a, since: arrival });
  wrote(await submit(parent, keys.rita, "arrive", on(parent, dayId, { room: b }))); const moved = parent.fact(parent.last.seq);
  const before = structuredClone(parent.item(dayId)), head = parent.head;
  expect(await submit(parent, keys.rita, "leave", on(parent, dayId, { room: a }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-presence-room" });
  expect(parent.head).toEqual(head); expect(parent.item(dayId)).toEqual(before);
  for (let i = 0; i < 101; i++) wrote(await submit(parent, night, "arrive", on(parent, nightId, { room: a })));
  expect(parent.item(dayId)).toEqual(before);
  expect(sitePresence(parent.state.all().items, position => parent.fact(position))).toContainEqual({ member: keys.rita.member, room: b, since: moved });
  wrote(await submit(parent, keys.rita, "leave", on(parent, dayId, { room: b }))); const left = parent.fact(parent.last.seq);
  expect(parent.item(dayId)).toMatchObject({ state: "away", refs: { room: b, reportedAt: left.seq } });
  expect(sitePresence(parent.state.all().items, position => parent.fact(position)).map(row => row.member)).not.toContainEqual(keys.rita.member);
  for (const current of [parent, ...rooms]) { const result = await replay(current, [launcher, parent, ...rooms].filter(other => other !== current)); expect([result.report.result, result.why]).toEqual(["consistent", null]); }
});

test("a different registered room cannot replace a room's summary even under the same definition name", async () => {
  // This alternate declared sender deliberately addresses row 2. Its create,
  // proof, source entry and relation are all judged; no send is forged.
  const misaddressed = misaddressedRoomDefinition();
  const { launcher, parent, rooms, rows } = await setup(misaddressed), child = rooms[0]!, other = rooms[1]!, row = rows[0]!;
  expect(row).toBe(2);
  wrote(await submit(child, sensors, "report-site", on(child, 0, { openAlerts: 0 }))); wrote(deliver(parent, child, child.last.seq));
  const before = structuredClone(parent.item(row));
  wrote(await submit(other, sensors, "report-site", on(other, 0, { openAlerts: 0 }))); wrote(deliver(parent, other, other.last.seq));
  expect(parent.last.input).toMatchObject({ type: "delivery", decision: "refused", reason: { code: "guard-failed", name: "wrong-summary-sender" } });
  expect(parent.item(row)).toEqual(before); expect(parent.item(rows[1]!).values["openAlerts"]).toBeNull();
  for (const current of [parent, ...rooms]) { const result = await replay(current, [launcher, parent, ...rooms].filter(candidate => candidate !== current)); expect([result.report.result, result.why]).toEqual(["consistent", null]); }
});

test("site summaries require an exact native alert count and keep newer room relations across out-of-order delivery", async () => {
  const { launcher, parent, rooms, rows } = await setup(), child = rooms[0]!, other = rooms[1]!, row = rows[0]!;
  expect(await submit(child, climate, "report-site", on(child, 0, { openAlerts: 0 }))).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(await submit(child, sensors, "report-site", on(child, 0, { openAlerts: 1 }))).toMatchObject({ result: "refused", reason: "guard-failed", name: "wrong-alert-count" });
  wrote(await submit(child, sensors, "report-site", on(child, 0, { openAlerts: 0 }))); const first = child.last.seq;
  wrote(await submit(child, sensors, "report-site", on(child, 0, { openAlerts: 0 }))); const second = child.last.seq;
  wrote(deliver(parent, child, second));
  expect(parent.item(row)).toMatchObject({ values: { openAlerts: 0 }, refs: { summaryAt: child.fact(second) } });
  const latest = structuredClone(parent.item(row));
  wrote(deliver(parent, child, first)); expect(parent.last.input).toMatchObject({ type: "delivery", decision: "superseded" });
  expect(parent.item(row)).toEqual(latest);
  wrote(await submit(other, sensors, "report-site", on(other, 0, { openAlerts: 0 }))); wrote(deliver(parent, other, other.last.seq));
  expect(parent.item(rows[1]!).refs["summaryAt"]).toEqual(other.fact(other.last.seq)); expect(parent.item(row)).toEqual(latest);
  for (const current of [parent, ...rooms]) { const result = await replay(current, [launcher, parent, ...rooms].filter(other => other !== current)); expect([result.report.result, result.why]).toEqual(["consistent", null]); }
});

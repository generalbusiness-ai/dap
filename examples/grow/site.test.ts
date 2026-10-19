/** Actual judged create/result/confirm/relation exchanges in memory.
 * Grants are fixture authority, with no membership, host or provider proof. */
import { expect, test } from "vitest";
import { keys, deliver } from "@generalbusiness/dap-derive/testing";
import { creates } from "@generalbusiness/dap-derive";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { site } from "./site.ts";
import { sitePresence } from "./presence.ts";
import { room } from "./room.ts";
import { nativeScenario, nativeChild, devicePermissions, operator, climate, sensors, on, replay, submit, type Ledger } from "./test-support.ts";
const night = { ...keys.sam, principal: operator.member };
const permissions = [...devicePermissions, [keys.rita, ["grow.tend"]], [night, ["grow.tend"]]] as const;
const wrote = (result: { result: string }) => expect(result).toMatchObject({ result: "write" });
async function setup(childDefinition = room) {
  const parentDefinition = structuredClone(site), send = parentDefinition.acts["create-room"]!.sends[0]!;
  if (!("create" in send)) throw new Error("site fixture requires a declared create send");
  send.create.definition = definitionDigest(childDefinition);
  // A declared application Site is a native Lane, born through a real create.
  // The tiny Directory launcher and per-key authority remain explicit fixtures.
  const launcherDefinition = structuredClone(site);
  launcherDefinition.name = "test.grow-site-launcher";
  launcherDefinition.acts["establish"]!.sends = [{ create: { kind: "lane", definition: definitionDigest(parentDefinition), fields: { label: { field: "label" } }, result: {} } }];
  const launcher = nativeScenario(launcherDefinition, permissions, { label: "Test grow site" });
  const parent = await nativeChild(launcher, 0, parentDefinition, permissions, 19), rooms: Ledger[] = [], rows: number[] = [];
  wrote(deliver(launcher, parent, 0));
  wrote(deliver(parent, launcher, launcher.last.seq));
  expect(parent.at.kind).toBe("lane");
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

test("the site creates three native rooms and derives independent tender presence from signed comments", async () => {
  const { launcher, parent, rooms, rows } = await setup(), a = rows[0]!, b = rows[1]!;
  expect(await submit(parent, operator, "create-room", { fields: { label: "Room D" } })).toMatchObject({ result: "refused" });
  const before = structuredClone(parent.state.all().items);
  expect(await submit(parent, climate, "arrive", { fields: { room: a } })).toMatchObject({ result: "refused", reason: "unauthorized" });
  wrote(await submit(parent, keys.rita, "arrive", { fields: { room: a } })); const arrival = parent.fact(parent.last.seq);
  expect(sitePresence(parent.entries)).toEqual([{ member: keys.rita.member, room: a, since: arrival }]);
  wrote(await submit(parent, keys.rita, "arrive", { fields: { room: b } })); const moved = parent.fact(parent.last.seq);
  wrote(await submit(parent, keys.rita, "leave", { fields: { room: a } }));
  expect(sitePresence(parent.entries)).toEqual([{ member: keys.rita.member, room: b, since: moved }]);
  expect(parent.state.all().items).toEqual(before);
  wrote(await submit(parent, night, "arrive", { fields: { room: a } })); const nightArrival = parent.fact(parent.last.seq);
  wrote(await submit(parent, keys.rita, "leave", { fields: { room: b } }));
  expect(sitePresence(parent.entries)).toEqual([{ member: night.member, room: a, since: nightArrival }]);
  wrote(await submit(parent, night, "leave", { fields: { room: a } })); expect(sitePresence(parent.entries)).toEqual([]);
  for (const current of [parent, ...rooms]) { const result = await replay(current, [launcher, parent, ...rooms].filter(other => other !== current)); expect([result.report.result, result.why]).toEqual(["consistent", null]); }
});

test("a different registered room cannot replace a room's summary even under the same definition name", async () => {
  // This alternate declared sender deliberately addresses row 2. Its create,
  // proof, source entry and relation are all judged; no send is forged.
  const misaddressed = structuredClone(room), send = misaddressed.acts["report-site"]!.sends[0]!;
  if (!("relate" in send)) throw new Error("room fixture requires a declared relation send");
  send.relate.detail["room"] = { const: 2 };
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

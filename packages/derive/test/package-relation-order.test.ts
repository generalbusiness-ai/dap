/** Native in-memory judgments, with scripted per-key grants and manual
 * delivery. This deliberately bypasses package admission for the negative
 * declaration; it proves ordering, not SQLite, installation or a provider. */
import { expect, test } from "vitest";
import { checkPackageGraph } from "@generalbusiness/dap-package-graph";
import { deliver } from "./fixtures.ts";
import { preFailureRelation } from "./fixtures-package-graph.ts";
import { nativeCreatedSite, nativeChild, devicePermissions, operator, replay, submit } from "../../../examples/grow/test-support.ts";

test("an item can add a native relation key while its independent creation result is still pending", async () => {
  const kept = preFailureRelation(false), recyclable = preFailureRelation(true);
  expect(checkPackageGraph(kept).findings).toEqual([]);
  const rejected = checkPackageGraph(recyclable);
  expect(rejected.findings.map(finding => finding.reason)).toEqual(["fan-in-unproved"]);
  // Three Rooms, each with two successful probe slots, bound Leaf births
  // at six in either form. A failure-final state does not bound probe keys.
  expect(rejected.instances.find(part => part.definition === recyclable.definitions[2]!.id)?.maximum).toBe(6);
  const parentDefinition = recyclable.definitions[0]!.definition, roomDefinition = recyclable.definitions[1]!.definition;
  const { launcher, site } = await nativeCreatedSite(parentDefinition, devicePermissions, { label: "TEST pre-result site" });
  expect(await submit(site, operator, "create-room", { fields: { label: "Room A" } })).toMatchObject({ result: "write" });
  const roomItem = site.last.seq, room = await nativeChild(site, roomItem, roomDefinition, devicePermissions);
  expect(deliver(site, room, 0)).toMatchObject({ result: "write" });
  expect(deliver(room, site, site.last.seq)).toMatchObject({ result: "write" });
  expect(await submit(room, operator, "open-probe", { expected: { room: room.item(0).revision } })).toMatchObject({ result: "write" });
  const probe = room.last.seq;
  expect(room.last.sends.map(send => "type" in send.message ? send.message.type : send.message.class)).toEqual(["create", "relate"]);
  expect(room.state.request(probe, 0)?.result).toBeNull();
  expect(site.state.copies("room-summary", "lane")).toBe(0);
  expect(deliver(site, room, probe, 1)).toMatchObject({ result: "write" });
  expect(site.last.input).toMatchObject({ type: "delivery", decision: "applied" });
  expect(site.state.copies("room-summary", "lane")).toBe(1);
  expect(site.item(roomItem).refs["summaryAt"]).toEqual(room.fact(probe));
  expect(room.item(probe).state).toBe("pending");
  expect(room.state.request(probe, 0)?.result).toBeNull();
  for (const current of [site, room]) {
    const result = await replay(current, [launcher, site, room].filter(other => other !== current));
    expect([result.report.result, result.why]).toEqual(["consistent", null]);
  }
});

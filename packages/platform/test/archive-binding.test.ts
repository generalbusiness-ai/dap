import { expect, test } from "vitest";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_APPLICATION_COHORT as C, ARCHIVE_DEVICE_APPLICATION_COHORT as DC } from "../src/index.ts";
import { installGraph } from "./support-application-install.ts";

// Actual register/directory rules, native judges and MemoryState. Child
// genesis entries and per-key grants are scripted; no object/provider claim.
test.each([["archive", C], ["device/archive", DC]] as const)("a room binds its archive at the claim or later, and cannot unbind it (%s)", (_label, C) => {
  const initial = installGraph(C, "journal").D;
  expect(initial.item(0).values["archive"]).toBe("journal");
  const graph = installGraph(C), late = graph.D;
  const rita = { ...keys.rita, member: { membership: graph.M.at, member: "@rita" as const } };
  expect(late.item(0).values["archive"]).toBeNull();
  const fields = { archive: "journal" }, on = 0, expected = { on: late.item(0).revision };
  expect(late.act(rita, "bind-archive", { on, expected, fields }, { grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(late.item(0).values["archive"]).toBeNull();
  expect(late.act(rita, "bind-archive", { on, expected, fields }, { membership: graph.M.at })).toMatchObject({ result: "write" });
  expect(late.item(0).values["archive"]).toBe("journal");
  for (const archive of [null, "off"]) {
    expect(late.act(rita, "bind-archive", { on, expected: { on: late.item(0).revision }, fields: { archive: archive as never } })).toMatchObject({ result: "refused", reason: "bad-field" });
    expect(late.item(0).values["archive"]).toBe("journal");
  }
});

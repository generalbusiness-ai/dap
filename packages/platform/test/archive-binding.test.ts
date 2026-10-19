import { expect, test } from "vitest";
import { Directory, rita } from "./support-creation.ts";

// Actual register/directory rules, native judges and MemoryState. Child
// genesis entries and per-key grants are scripted; no object/provider claim.
test("a room binds its archive at the claim or later, and cannot unbind it", () => {
  const initial = new Directory({ archive: "journal" });
  expect(initial.item(0).values["archive"]).toBe("journal");
  const late = new Directory();
  expect(late.item(0).values["archive"]).toBeNull();
  const fields = { archive: "journal" }, on = 0, expected = { on: late.item(0).revision };
  expect(late.act(rita, "bind-archive", { on, expected, fields }, { grants: [] })).toMatchObject({ result: "refused", reason: "unauthorized" });
  expect(late.item(0).values["archive"]).toBeNull();
  late.did(rita, "bind-archive", { on, expected, fields });
  expect(late.item(0).values["archive"]).toBe("journal");
  for (const archive of [null, "off"]) {
    expect(late.act(rita, "bind-archive", { on, expected: { on: late.item(0).revision }, fields: { archive: archive as never } })).toMatchObject({ result: "refused", reason: "bad-field" });
    expect(late.item(0).values["archive"]).toBe("journal");
  }
});

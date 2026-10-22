/** Real table instances at all maintained consumers, not a copied fixture. */
import { expect, test } from "vitest";
import { CAPABILITY_CODE, HOLD_VERSION } from "@generalbusiness/dap-derive";
import { ARCHIVE_REPLAY_CODE } from "@generalbusiness/dap-platform";
import { CAPABILITY_CODE as runtime, HOLD_VERSION as runtimeHold } from "../../scope/src/ports.ts";
import { REPLAY_CAPABILITY_CODE as cli } from "../src/commands.ts";

test("runtime, dap verify and archive replay use one table and the unchanged hold version", () => {
  for (const code of [runtime, cli, ARCHIVE_REPLAY_CODE.capabilities, ARCHIVE_REPLAY_CODE.owners]) expect(code).toBe(CAPABILITY_CODE);
  expect(runtimeHold).toBe(HOLD_VERSION);
  expect(HOLD_VERSION).toEqual({ tokensPerHold: 2, rootRetentionSeconds: null });
  for (const [capability, step] of [["hold@1", "instance"], ["git-read@1", "job-read"], ["device-command@1", "answer"]] as const)
    expect(CAPABILITY_CODE.implements(capability, step)).toBe(true);
});

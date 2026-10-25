/** Real table instances at all maintained consumers, not a copied fixture. */
import { expect, test } from "vitest";
import { CAPABILITY_CODE, HOLD_VERSION } from "@generalbusiness/dap-derive";
import { ARCHIVE_REPLAY_CODE, ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, platform } from "@generalbusiness/dap-platform";
import { CAPABILITY_CODE as runtime, HOLD_VERSION as runtimeHold } from "../../scope/src/ports.ts";
import { REPLAY_CAPABILITY_CODE as cli } from "../src/commands.ts";

test("runtime, dap verify and archive replay use one table and the unchanged hold version", () => {
  for (const code of [runtime, cli, ARCHIVE_REPLAY_CODE.capabilities, ARCHIVE_REPLAY_CODE.owners]) expect(code).toBe(CAPABILITY_CODE);
  // The replay binding returns the installed version object only for the
  // explicit old/new cohort union, with one checked native identity contract.
  for (const pin of new Set([...Object.values(ARCHIVE_DEVICE_APPLICATION_COHORT), ...Object.values(ARCHIVE_DEVICE_PUBLICATION_COHORT)])) {
    const bound = ARCHIVE_REPLAY_CODE.platform(pin);
    expect(bound).toBe(platform(pin));
    expect(bound?.sourceName).toBe(ARCHIVE_REPLAY_CODE.sourceName);
    expect(bound?.receiverIdentity).toBe(ARCHIVE_REPLAY_CODE.receiverIdentity);
  }
  expect(ARCHIVE_REPLAY_CODE.platform("platform:destination@4")).toBeNull();
  expect(ARCHIVE_REPLAY_CODE.platform("platform:destination@9999")).toBeNull();
  expect(runtimeHold).toBe(HOLD_VERSION);
  expect(HOLD_VERSION).toEqual({ tokensPerHold: 2, rootRetentionSeconds: null });
  for (const [capability, step] of [["hold@1", "instance"], ["git-read@1", "job-read"], ["device-command@1", "answer"]] as const)
    expect(CAPABILITY_CODE.implements(capability, step)).toBe(true);
});

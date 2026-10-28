import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";
import { containerRunner } from "../src/node.ts";
import { originOf, RunIdentityRefusal } from "../src/index.ts";
import { digest, world } from "./support.ts";

// This refusal precedes a run fence and any process/container launch.
test("an oversized trusted command prefix cannot create an unreadable execution claim", async () => {
  const parent = mkdtempSync(join(tmpdir(), "checker-claim-")), root = join(parent, "absent");
  try {
    const w = world(), origin = originOf(w.notice, { entry: w.job, pinned: digest("a"), activated: { name: "change", state: "active" }, manifest: w.manifest });
    if ("not" in origin) return expect.fail("The explicit stand-in origin must be a job");
    const runner = containerRunner({ root, command: ["/usr/bin/false", ...Array.from({ length: 31 }, () => "x".repeat(4096))] });
    await expect(runner.run({ run: "oversized-claim", job: origin.job, configuration: w.config })).rejects.toBeInstanceOf(RunIdentityRefusal);
    expect(existsSync(root)).toBe(false);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

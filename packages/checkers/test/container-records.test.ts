import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";
import { containerRunner } from "../src/node.ts";
import { ClaimTooLargeRefusal, CheckerService, Outcomes, type ServiceOptions } from "../src/index.ts";
import { Lane, MemoryDurable, T0, newKey, world } from "./support.ts";

// This refusal precedes a run fence and any process/container launch.
test("an oversized claim has its own refusal name and signed claim-too-large outcome before any execution fence", async () => {
  const parent = mkdtempSync(join(tmpdir(), "checker-claim-")), root = join(parent, "absent");
  try {
    const w = world();
    const runner = containerRunner({ root, execCommand: ["/usr/bin/false"], command: ["/usr/bin/false", ...Array.from({ length: 31 }, () => "x".repeat(4096))] });
    let refusal: unknown, finds = 0;
    const run = runner.run.bind(runner), find = runner.find.bind(runner);
    runner.run = async ask => { try { return await run(ask); } catch (error) { refusal = error; throw error; } };
    runner.find = (...args) => { finds++; return find(...args); };
    const logs: Parameters<NonNullable<ServiceOptions["log"]>>[0][] = [];
    const scopes = new Lane(w), outcomes = new Outcomes(new MemoryDurable());
    const service = new CheckerService({ signer: newKey().signer, scopes, runner, outcomes,
      clock: () => T0, random: length => new Uint8Array(length).fill(7), log: event => logs.push(event) });
    const delivered = await service.deliver(w.notice);
    expect(refusal).toBeInstanceOf(ClaimTooLargeRefusal);
    expect((refusal as Error).message).toContain("claim-too-large");
    expect(delivered).toMatchObject({ did: "submitted", outcome: { act: "check-error", reason: "claim-too-large" } });
    expect(scopes.submitted.at(-1)?.intent.fields["reason"]).toBe("claim-too-large");
    expect(logs).toEqual([{ step: "run", event: "claim-too-large" }]);
    expect(finds).toBe(0);
    expect(existsSync(root)).toBe(false);
    expect((await outcomes.get(w.fact))?.state).toBe("admitted");
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

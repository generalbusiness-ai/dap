// AS-2 (ruling ff12d4f2): a pass that stops as unavailable names its cause in
// archive-pass-diagnostic-v1. Three sites name one: the clock check, a failed
// wait and the send verifier. The first stop keeps its cause.
import { expect, test } from "vitest";
import { idOf } from "@generalbusiness/dap-git";
import { ArchiveBudget, ArchiveStopped, archiveStopName } from "../src/archive-budget.ts";
import { sendArchiveAppend } from "../src/archive-send.ts";
import type { ArchiveSend } from "../src/archive-driver.ts";

const stopped = (run: () => unknown) => {
  try { run(); } catch (error) { expect(error).toBeInstanceOf(ArchiveStopped); return (error as ArchiveStopped).reason; }
  return expect.fail("The pass must stop.");
};

test("a clock that runs backwards or stops being finite names the clock", () => {
  let time = 10;
  const regressed = new ArchiveBudget({}, () => time);
  time = 9;
  expect(stopped(() => regressed.check())).toBe("unavailable");
  expect(regressed.stopCause()).toEqual({ site: "clock", clock: "regressed" });

  let reading = 10;
  const lost = new ArchiveBudget({}, () => reading);
  reading = Number.NaN;
  expect(stopped(() => lost.check())).toBe("unavailable");
  expect(lost.stopCause()).toEqual({ site: "clock", clock: "not-finite" });
});

test("work that throws inside a wait names the error, never its message", async () => {
  const typed = new ArchiveBudget({}, () => 0);
  await expect(typed.wait(async () => { throw new TypeError("secret text"); })).rejects.toBeInstanceOf(ArchiveStopped);
  expect(typed.stopCause()).toEqual({ site: "wait", error: "TypeError" });

  const odd = new ArchiveBudget({}, () => 0);
  const error = new Error("x"); error.name = "Name with spaces";
  await expect(odd.wait(async () => { throw error; })).rejects.toBeInstanceOf(ArchiveStopped);
  expect(odd.stopCause()).toEqual({ site: "wait", error: "other" });

  const thrown = new ArchiveBudget({}, () => 0);
  await expect(thrown.wait(async () => { throw "not an error"; })).rejects.toBeInstanceOf(ArchiveStopped);
  expect(thrown.stopCause()).toEqual({ site: "wait", error: "non-error" });
});

test("a send whose append verifier stops names the verifier and its reason", async () => {
  const budget = new ArchiveBudget({}, () => 0);
  const encoder = new TextEncoder();
  // An old commit larger than the verifier reads stops the verifier at its own limit.
  const data = encoder.encode(`tree ${"0".repeat(40)}\n${"x".repeat(2048)}\n`);
  const old = idOf("commit", data);
  const request = {
    at: { scope: "sc_5hagamavauu5lcejxqxqkd6xl3ol26bke2ipkhaiwxtxono2gujq", genesis: `sha256:${"0".repeat(64)}` }, ref: "refs/heads/journal", old, commit: old, allowed: () => true,
    objects: [{ id: old, type: "commit", data }], incremental: { budget },
  } as unknown as ArchiveSend;
  let fetched = 0;
  await expect(sendArchiveAppend(request, { remote: "https://archive.invalid/test.git", maxBytes: 1024 * 1024,
    fetch: async () => { fetched++; return new Response(null, { status: 500 }); } }, async () => null)).rejects.toBeInstanceOf(ArchiveStopped);
  expect(fetched).toBe(0);
  expect(budget.stopCause()).toEqual({ site: "verifier", verifier: "limit" });
});

test("the first stop keeps its cause, and a stop with no named cause records none", () => {
  let time = 10;
  const budget = new ArchiveBudget({ attempts: 1 }, () => time);
  expect(stopped(() => budget.spend({ attempts: 2 }))).toBe("limit");
  time = 9;
  expect(stopped(() => budget.check())).toBe("limit");
  expect(budget.stopCause()).toBeNull();
  expect(new ArchiveBudget({}, () => 0).stopCause()).toBeNull();
});

test("a logged name is a bounded identifier", () => {
  expect(archiveStopName("TypeError")).toBe("TypeError");
  expect(archiveStopName("a".repeat(64))).toBe("a".repeat(64));
  expect(archiveStopName("a".repeat(65))).toBe("other");
  expect(archiveStopName("bad name")).toBe("other");
  expect(archiveStopName(7)).toBe("other");
});

import { expect, test } from "vitest";
import { ContainerEngineError, containerCommand, requireContainerExit } from "../src/container-engine.ts";
import { judge } from "../src/outcome.ts";
import type { Configuration } from "../src/configuration.ts";

// Real local Node children exercise the host capture/exit boundary. The Go
// process test owns stream combination; the physical witness owns containers.
test("combined job output keeps exact status and last line while separate setup stderr cannot become a check", async () => {
  const options = { milliseconds: 5000, bytes: 4096, capture: false };
  const complete = await containerCommand([process.execPath], ["-e", 'process.stdout.write("first\\nbad\\n"); process.exitCode = 17;'], options);
  expect(complete).toMatchObject({ code: 17, line: "bad", stderrBytes: 0, timedOut: false, limited: false });
  expect(() => requireContainerExit(complete)).not.toThrow();
  const configuration: Configuration = { name: "streams", image: `sha256:${"1".repeat(64)}`, environment: [],
    steps: [["TEST-combined-job"]], judged: { passed: { status: 0, line: "ok" }, failed: { status: 17, line: "bad" } }, limits: { seconds: 5, outputBytes: 4096 } };
  expect(judge(configuration, { started: true, image: configuration.image, environment: [], checkout: true,
    steps: [{ status: complete.code, line: complete.line }], end: "complete" })).toEqual({ act: "check", outcome: "failed" });
  const setup = await containerCommand([process.execPath], ["-e", 'process.stdout.write("bad\\n"); process.stderr.write("TEST setup diagnostic\\n"); process.exitCode = 17;'], options);
  expect(setup).toMatchObject({ code: 17, line: "bad", timedOut: false, limited: false });
  expect(setup.stderrBytes).toBeGreaterThan(0);
  expect(setup.stderr.byteLength).toBe(0); // Counting survives capture:false.
  expect(() => requireContainerExit(setup)).toThrow(ContainerEngineError);
  for (const script of ['process.exitCode = 255;', 'process.kill(process.pid, "SIGKILL");']) {
    const ambiguous = await containerCommand([process.execPath], ["-e", script], options);
    expect([255, -1]).toContain(ambiguous.code);
    expect(() => requireContainerExit(ambiguous)).toThrow(ContainerEngineError);
  }
});

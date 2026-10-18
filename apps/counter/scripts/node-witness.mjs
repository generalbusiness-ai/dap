// Bound the generated Node test process, including startup and teardown.
// Node's per-test timer alone cannot bound a blocked application thread.
import { spawn } from "node:child_process";
import { basename } from "node:path";

export function runNodeWitness(files, {
  cwd,
  testTimeoutMs = 30_000,
  runTimeoutMs = 120_000,
  capture = false,
  report = console.error,
} = {}) {
  for (const ms of [testTimeoutMs, runTimeoutMs]) if (!Number.isSafeInteger(ms) || ms <= 0 || ms > 2_147_483_647) throw new Error("Counting witness timeout must be a finite positive timer.");
  const names = files.map(file => basename(file)).join(", ");
  const grouped = process.platform !== "win32";
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !["NODE_PATH", "NODE_OPTIONS", "NODE_TEST_CONTEXT"].includes(name)));
  return new Promise(resolve => {
    const child = spawn(process.execPath, ["--test", `--test-timeout=${testTimeoutMs}`, ...files], {
      cwd, env, detached: grouped, stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let reason = "exit", interruption = 0, stdout = "", stderr = "";
    const diagnostics = [];
    const diagnose = message => {
      diagnostics.push(message);
      try { report(message); }
      catch (error) { stderr = (stderr + `\nCounting diagnostic callback failed: ${error.message}\n`).slice(-1_048_576); }
    };
    // Captured diagnostics are for the focused subprocess witnesses. The
    // actual Counting run keeps its existing streaming output.
    child.stdout?.on("data", chunk => { stdout = (stdout + chunk).slice(-1_048_576); });
    child.stderr?.on("data", chunk => { stderr = (stderr + chunk).slice(-1_048_576); });
    const stop = (why, code) => {
      if (reason !== "exit") return;
      reason = why; interruption = code;
      if (child.pid) {
        try {
          if (grouped) process.kill(-child.pid, "SIGKILL");
          else child.kill("SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") {
            diagnose(`Counting Node witness group cleanup failed: ${error.code}`);
            child.kill("SIGKILL");
          }
        }
      }
      child.stdout?.destroy(); child.stderr?.destroy();
      diagnose(why === "timeout"
        ? `Counting Node witness exceeded ${runTimeoutMs}ms, including startup/teardown: ${names}`
        : "Counting Node witness interrupted; stopping its test process group.");
    };
    const timer = setTimeout(() => stop("timeout", 124), runTimeoutMs);
    const interrupt = () => stop("interrupted", 130);
    const terminate = () => stop("interrupted", 143);
    process.once("SIGINT", interrupt); process.once("SIGTERM", terminate);
    child.once("error", error => {
      reason = "spawn-error";
      diagnose(`Counting Node witness could not start: ${error.code}`);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      process.removeListener("SIGINT", interrupt); process.removeListener("SIGTERM", terminate);
      resolve({ code: reason === "exit" ? code ?? 1 : reason === "spawn-error" ? 1 : interruption, reason, signal, stdout, stderr, diagnostics });
    });
  });
}

/** Trusted detached host owner. It is not copied or mounted into the job. */
import { join } from "node:path";
import { createContainerEngine, containerName, type ContainerRun } from "./container-engine.ts";
import { claimOf, decodeAsk, digest, INPUT_BYTES, originClosedOf, privateRoot, readPrivate, writePrivate, writeTerminal, type RunLaunch, type RunStarted } from "./container-records.ts";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { originClient } from "./container-origin.ts";
import { readReport, type RunReport } from "./outcome.ts";

async function supervise(dir: string): Promise<void> {
  await privateRoot(dir, false);
  const bytes = await readPrivate(join(dir, "ask.json"), INPUT_BYTES);
  if (bytes === null) throw Error("Checker supervisor input missing");
  const ask = decodeAsk(bytes), claim = await claimOf(dir, ask.run);
  if (!claim || claim.askDigest !== digest(bytes) || claim.image !== ask.configuration.image || claim.needsOrigin !== !ask.job.snapshot || claim.container !== containerName(ask.run)) throw Error("Checker supervisor input differs");
  // A supervisor entry is one-shot too. A duplicate child, or an operator
  // restarting this entry, never creates another execution for the record.
  await writePrivate(join(dir, "supervisor.json"), canonicalize({ v: 1, run: claim.run, askDigest: claim.askDigest, pid: process.pid }));
  const launchBytes = await readPrivate(join(dir, "launch.json"), 16 * 1024);
  if (launchBytes === null) throw Error("Checker supervisor origin missing");
  const launch = JSON.parse(launchBytes) as RunLaunch;
  if (launch.v !== 1 || (!ask.job.snapshot && (!launch.origin || typeof launch.origin.socket !== "string" || typeof launch.origin.repository !== "string"))) throw Error("Checker supervisor origin differs");
  const engine = createContainerEngine({ argvPrefix: claim.command, image: claim.image });
  const abort = new AbortController();
  const stop = () => abort.abort();
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  const timer = setTimeout(stop, Math.max(1, claim.finishBy - Date.now()));
  let report: RunReport | null = null;
  let container: ContainerRun | null = null;
  const gateway = launch.origin && !ask.job.snapshot ? originClient(launch.origin.socket, abort.signal) : null;
  try {
    const origin = launch.origin && gateway ? { repository: launch.origin.repository, forward: gateway.forward } : undefined;
    container = await engine.create(ask, origin, abort.signal);
    await writePrivate(join(dir, "started.json"), canonicalize({ v: 1, run: claim.run, askDigest: claim.askDigest,
      id: container.id, image: container.image, environment: container.environment } satisfies RunStarted));
    report = readReport(await container.run());
  } catch { /* No complete trusted report: never infer a pass from output or engine exit alone. */ }
  finally {
    clearTimeout(timer); abort.abort();
    process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop);
  }
  // Cleanup must finish before the report is eligible for external signing.
  if (container) await container.destroy();
  else await engine.destroy(ask.run);
  if (claim.needsOrigin) {
    try { await gateway?.close(); }
    catch { /* A lost acknowledgement is checked against its durable host record below. */ }
    if (!await originClosedOf(dir, claim) && report) report = { ...report, end: "lost" };
  }
  await writeTerminal(dir, claim, report);
}

const directory = process.argv[2];
if (directory) await supervise(directory).catch(() => { process.exitCode = 1; });
else process.exitCode = 1;

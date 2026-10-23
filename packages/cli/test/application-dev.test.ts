import { shortenNotesText } from "./definition-corpus-data.ts";
/** Real loopback HTTP, native SQLite/reads/acts/replay and existing esbuild.
 * Explicit public TEST grants and open local reads are not native enrollment. */
import { mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import type { Answer, ScopeRef } from "@generalbusiness/dap-contract";
import { ScopeHandle, httpTransport, secretSigner, signedIntent } from "@generalbusiness/dap-client";
import type { Verification } from "@generalbusiness/dap-replay";
import { newApplicationDirectory } from "../src/application-new.ts";
import { startApplicationDevelopment, type ApplicationDevelopmentServer } from "../src/application-dev.ts";
import type { ApplicationDevelopmentActor } from "../src/application-scenarios.ts";

interface Metadata { scope: ScopeRef; time: string; actors: ApplicationDevelopmentActor[]; authority: string; error: string | null; ids: { semantic: string; presentation: string }; revision: number }
const meta = async (server: ApplicationDevelopmentServer): Promise<Metadata> => (await fetch(server.origin + "/__dap/meta")).json() as Promise<Metadata>;
const actor = (data: Metadata, name = "alice") => secretSigner(new Uint8Array(Buffer.from(data.actors.find(actor => actor.name === name)!.seed, "hex")));
async function fixture(entry = "index.html") {
  const parent = await realpath(await mkdtemp(join(tmpdir(), "dap-dev-"))), directory = await newApplicationDirectory(join(parent, "notes"));
  if (entry !== "index.html") {
    const path = join(directory, "dap.application.json"), config = JSON.parse(await readFile(path, "utf8"));
    config.presentation.entry = entry; await writeFile(path, JSON.stringify(config));
  }
  try { return { parent, directory, server: await startApplicationDevelopment(directory, { port: 0, watch: false }) }; }
  catch (cause) { await rm(parent, { recursive: true, force: true }); throw cause; }
}

test("loopback native SDK requests use only explicit TEST authority and preserve original retries", async () => {
  const f = await fixture();
  try {
    const data = await meta(f.server), handle = new ScopeHandle(httpTransport(f.server.origin), data.scope.scope, null);
    expect(data.authority).toBe("scripted-test-grants");
    const preview = await fetch(f.server.origin + "/");
    expect(preview.headers.get("content-type")).toContain("text/html");
    expect(await preview.text()).toContain('/__dap/live.js');
    expect((await fetch(f.server.origin + "/package-lock.json")).status).toBe(404);
    const signed = await signedIntent(actor(data), { to: data.scope, kind: "add", fields: { text: "Live native note." } }, { now: Date.parse(data.time) });
    const accepted = await handle.submit(signed);
    expect(accepted.answer).toBe("accepted"); if (accepted.answer !== "accepted") throw Error("The native fixture refused add");
    expect(await handle.submit(signed)).toEqual(accepted);
    expect(await handle.settle(signed)).toMatchObject({ ok: true, value: { fact: accepted.receipt.fact } });
    expect(await handle.entry(accepted.receipt.fact.seq)).toMatchObject({ ok: true, value: { entry: { input: { signed } } } });
    const unknown = await signedIntent(secretSigner(new Uint8Array(32).fill(99)), { to: data.scope, kind: "add", fields: { text: "No TEST grant." } }, { now: Date.parse(data.time) });
    expect(await handle.submit(unknown)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    const path = f.server.origin + "/v1/scopes/" + encodeURIComponent(data.scope.scope) + "/acts";
    expect((await fetch(path, { method: "POST", headers: { "content-type": "application/json", origin: "https://elsewhere.test" }, body: JSON.stringify({ signed, grants: [] }) })).status).toBe(403);
    expect((await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed, grants: [{}] }) })).status).toBe(400);
    const replay = await (await fetch(f.server.origin + "/__dap/replay")).json() as Verification;
    expect(replay.report).toMatchObject({ result: "consistent", target: { seq: accepted.receipt.fact.seq } });
    expect(replay.report.trusts.join(" ")).toContain("authority");
  } finally { await f.server.close(); await rm(f.parent, { recursive: true, force: true }); }
});

test("presentation rebuilds keep native history while changed scenario or semantics restart the fixture", async () => {
  const f = await fixture("screens/index.html");
  try {
    // The default preview and the inspection iframe must follow the canonical
    // entry URL, so relative packaged script/CSS resolve at every directory.
    const navigation = async (expected: string) => {
      const root = await fetch(f.server.origin + "/", { redirect: "manual" });
      expect(root.status).toBe(302); expect(root.headers.get("location")).toBe(expected);
      const panel = await (await fetch(f.server.origin + "/__dap/")).text();
      const frame = /<iframe[^>]*src="([^"]+)"/.exec(panel)![1]!;
      const preview = await fetch(new URL(frame, f.server.origin));
      expect(preview.url).toBe(f.server.origin + expected); expect(preview.status).toBe(200);
      const html = await preview.text(), resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => new URL(match[1]!, preview.url));
      expect(resources.some(url => url.pathname.endsWith("/application.js"))).toBe(true);
      expect(resources.some(url => url.pathname.endsWith("/application.css"))).toBe(true);
      for (const resource of resources) expect((await fetch(resource)).status, resource.href).toBe(200);
    };
    await navigation("/screens/index.html");
    const initial = await meta(f.server), handle = new ScopeHandle(httpTransport(f.server.origin), initial.scope.scope, null);
    const signed = await signedIntent(actor(initial), { to: initial.scope, kind: "add", fields: { text: "Keep through a screen edit." } }, { now: Date.parse(initial.time) });
    const accepted = await handle.submit(signed); expect(accepted.answer).toBe("accepted");
    await writeFile(join(f.directory, "browser/main.css"), "body { color: navy; }");
    await f.server.rebuild(); const screen = await meta(f.server);
    expect(screen.scope).toEqual(initial.scope); expect(screen.ids.semantic).toBe(initial.ids.semantic);
    expect(screen.ids.presentation).not.toBe(initial.ids.presentation);
    const pathOfConfig = join(f.directory, "dap.application.json"), moved = JSON.parse(await readFile(pathOfConfig, "utf8"));
    moved.presentation.entry = "moved/view.html"; await writeFile(pathOfConfig, JSON.stringify(moved));
    await f.server.rebuild(); await navigation("/moved/view.html");
    expect((await meta(f.server)).scope).toEqual(initial.scope);
    expect(await handle.settle(signed)).toMatchObject({ ok: true });
    const config = await readFile(join(f.directory, "dap.application.json"));
    await writeFile(join(f.directory, "dap.application.json"), "invalid JSON");
    await f.server.rebuild(); expect((await meta(f.server)).error).not.toBeNull();
    await expect(handle.submit(signed)).rejects.toThrow(/unknown/);
    expect(await handle.settle(signed)).toMatchObject({ ok: true });
    await writeFile(join(f.directory, "dap.application.json"), config); await f.server.rebuild();
    expect((await meta(f.server)).scope).toEqual(initial.scope);
    const path = join(f.directory, "scenarios/basic.json"), scenario = JSON.parse(await readFile(path, "utf8"));
    scenario.founding.fields.title = "Changed fixture"; await writeFile(path, JSON.stringify(scenario)); await f.server.rebuild();
    const changedFixture = await meta(f.server);
    expect(changedFixture.ids.semantic).toBe(initial.ids.semantic); expect(changedFixture.scope).not.toEqual(initial.scope);
    expect(await handle.summary()).toMatchObject({ ok: false, reason: "not-found" });
    const definitionPath = join(f.directory, "definition.json"), definition = JSON.parse(await readFile(definitionPath, "utf8"));
    shortenNotesText(definition);
    await writeFile(definitionPath, JSON.stringify(definition)); await f.server.rebuild(); const semantic = await meta(f.server);
    expect(semantic.ids.semantic).not.toBe(initial.ids.semantic); expect(semantic.scope).not.toEqual(changedFixture.scope);
    const stale = await fetch(f.server.origin + "/v1/scopes/" + encodeURIComponent(semantic.scope.scope) + "/acts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed, grants: [] }) });
    expect((await stale.json() as Answer).answer).toBe("refused");
    expect((await (await fetch(f.server.origin + "/__dap/replay")).json() as Verification).report.result).toBe("consistent");
  } finally { await f.server.close(); await rm(f.parent, { recursive: true, force: true }); }
});

test.skipIf(process.platform === "win32")("the actual dev bin bypasses custody and closes its owned process group", async () => {
  const parent = await realpath(await mkdtemp(join(tmpdir(), "dap-dev-bin-"))), directory = await newApplicationDirectory(join(parent, "notes"));
  await rename(join(directory, "dap.application.json"), join(directory, "preview.json"));
  const child = spawn(process.execPath, [fileURLToPath(new URL("../bin/dap.js", import.meta.url)), "dev", directory, "--config", "preview.json", "--port", "0"], {
    cwd: parent, env: { ...process.env, DAP_HOME: "", ARTROOM_HOME: "" }, detached: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", bytes => { stdout += String(bytes); }); child.stderr.on("data", bytes => { stderr += String(bytes); });
  const terminal = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
  try {
    const origin = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("The actual dev bin did not start: " + stderr)), 10_000);
      const ready = () => { const match = /Development host: (http:\/\/127\.0\.0\.1:\d+)\/__dap\//.exec(stdout); if (match) { clearTimeout(timer); resolve(match[1]!); } };
      child.stdout.on("data", ready); child.once("error", cause => { clearTimeout(timer); reject(cause); });
      child.once("exit", () => { clearTimeout(timer); reject(Error("The actual dev bin exited before readiness: " + stderr)); }); ready();
    });
    expect((await fetch(origin + "/__dap/meta")).status).toBe(200);
    expect(stdout).toContain("explicit public TEST actors"); expect(stderr).toBe("");
  } finally {
    if (child.pid && child.exitCode === null && child.signalCode === null) process.kill(-child.pid, "SIGTERM");
    const timeout = setTimeout(() => { if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch { /* Already terminal. */ } } }, 10_000);
    try { expect((await terminal).signal).toBe("SIGTERM"); expect(stdout).toContain("Development host closed."); }
    finally { clearTimeout(timeout); await rm(parent, { recursive: true, force: true }); }
  }
});

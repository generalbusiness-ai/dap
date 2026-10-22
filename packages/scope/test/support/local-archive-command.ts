import { Buffer } from "node:buffer";
/** Genuine smart-HTTP/Git and public executable witness. Identity/token
 * authority and loopback transport are TEST stand-ins, not hosted proof. */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { nodeGit } from "../../../cli/src/git.ts";
import { Host } from "../../../git/test/support/host.ts";
import { git, put } from "../../../git/test/support/repo.ts";
import type { ArchiveCommandWitness, ArchiveFinishDiagnostic, LocalArchiveClone } from "./local-clone.ts";

export interface ArchiveCommandSession {
  readonly remote: string; readonly directory: string; readonly token: string;
  run(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  finish(lines: readonly string[]): Promise<ArchiveCommandWitness>;
  finishDiagnostic(): ArchiveFinishDiagnostic;
  close(): Promise<void>;
}
export async function archiveCommandSession(objects: LocalArchiveClone["objects"], refs: LocalArchiveClone["refs"], remote: string): Promise<ArchiveCommandSession> {
  if (!/^https:\/\/archive-command\.invalid\/git\/artroom-demo\/[A-Za-z0-9_.-]+\.git$/.test(remote)) throw Error("TEST command remote");
  const root = mkdtempSync(join(tmpdir(), "artroom-archive-command-"));
  const source = join(root, "source.git"), target = join(root, "member-clone");
  const token = `public-test-${randomBytes(24).toString("hex")}`;
  let requests = 0, tokenInArgv = false, tokenInOutput = false;
  const host = new Host(source, token);
  const server = createServer((request, response) => { void (async () => {
    const chunks: Buffer[] = []; let bytes = 0;
    for await (const chunk of request) { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) throw Error("TEST upload bound"); chunks.push(Buffer.from(chunk)); }
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) if (typeof value === "string") headers.set(name, value);
    if (headers.get("authorization") !== `Bearer ${token}`) { response.writeHead(401); response.end(); return; }
    requests++;
    const result = await host.upstream(new Request(`http://127.0.0.1${request.url}`, { method: request.method ?? "GET", headers, ...(request.method === "POST" ? { body: new Uint8Array(Buffer.concat(chunks)) } : {}) }));
    const body = new Uint8Array(await result.arrayBuffer());
    if (body.length > 8 * 1024 * 1024) throw Error("TEST download bound");
    response.writeHead(result.status, Object.fromEntries(result.headers)); response.end(body);
  })().catch(() => { response.writeHead(500); response.end(); }); });
  try {
    git(root, ["init", "-q", "--bare", source]);
    for (const object of objects) if (put(source, object.type, Buffer.from(object.data, "base64url")) !== object.id) throw Error("TEST native object identity");
    for (const ref of refs) git(source, ["update-ref", ref.ref, ref.id]);
    git(source, ["update-ref", "--no-deref", "HEAD", refs[0]!.id]);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const local = `http://127.0.0.1:${(server.address() as AddressInfo).port}/source.git`;
    const runner = nodeGit("git", root, { testRewrite: { from: remote, to: local } });
    let cloneCode: number | null = null, fetchCode: number | null = null;
    const diagnostic: ArchiveFinishDiagnostic = { stage: "not-started", runs: [] };
    const close = async () => {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      rmSync(root, { recursive: true, force: true });
    };
    return { remote, directory: target, token,
      run: async (args, env) => {
        tokenInArgv ||= args.some(arg => arg.includes(token));
        if (args.length === 1 && args[0] === "--version" && Object.keys(env).length === 0) return runner.run(args, env);
        const code = await runner.archiveRun!(args, env);
        if (args[0] === "clone") cloneCode = code; else if (args[2] === "fetch") fetchCode = code;
        return code;
      },
      close,
      finishDiagnostic: () => diagnostic,
      finish: async lines => {
        diagnostic.stage = "clone-fetch-check";
        tokenInOutput ||= lines.some(line => line.includes(token));
        if (cloneCode !== 0 || fetchCode !== 0) throw Error("TEST actual dap archive clone/fetch did not pass");
        diagnostic.stage = "refs";
        const clonedRefs = git(target, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/artroom/journal/"]).split("\n").map(line => { const [ref, id] = line.split(" "); if (!ref || !id) throw Error("TEST cloned ref"); return { ref, id }; });
        diagnostic.stage = "config";
        const config = readFileSync(join(target, ".git", "config"), "utf8");
        const run = (trusted: boolean) => new Promise<ArchiveCommandWitness["withTrust"]>((resolve, reject) => {
          diagnostic.stage = trusted ? "with-trust" : "without-trust";
          const observed: ArchiveFinishDiagnostic["runs"][number] = { trusted, code: null, signal: null, stdoutBytes: 0, stderrBytes: 0, spawnError: false, timedOut: false, outputBoundExceeded: false, hints: [] };
          diagnostic.runs.push(observed);
          const args = ["--import", createRequire(import.meta.url).resolve("tsx"), fileURLToPath(new URL("../../../replay/src/bin.ts", import.meta.url)), "--git", target, "--all", "--expect-journals", "5", "--json", ...(trusted ? ["--trust-published-anchors"] : [])];
          tokenInArgv ||= args.some(arg => arg.includes(token));
          const child = spawn(process.execPath, args, { cwd: root, env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: "/nonexistent" }, stdio: ["ignore", "pipe", "pipe"] });
          const chunks: Buffer[] = []; let size = 0; let over = false;
          const capture = (stream: "stdoutBytes" | "stderrBytes", chunk: Buffer) => { observed[stream] = Math.min(8 * 1024 * 1024 + 1, observed[stream] + chunk.length); size += chunk.length; if (size > 8 * 1024 * 1024) { over = true; child.kill("SIGKILL"); } else chunks.push(Buffer.from(chunk)); };
          child.stdout.on("data", (chunk: Buffer) => capture("stdoutBytes", chunk)); child.stderr.on("data", (chunk: Buffer) => capture("stderrBytes", chunk));
          const timer = setTimeout(() => { observed.timedOut = true; child.kill("SIGKILL"); }, 30_000);
          child.on("error", error => { observed.spawnError = true; clearTimeout(timer); reject(error); });
          child.on("close", (code, signal) => {
            clearTimeout(timer);
            observed.code = code; observed.signal = signal; observed.outputBoundExceeded = over;
            const output = Buffer.concat(chunks).toString("utf8"); tokenInOutput ||= output.includes(token);
            const hints = [["module", /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/], ["syntax", /SyntaxError:|ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|ERR_UNKNOWN_FILE_EXTENSION/], ["read", /read error:|offline archive command could not complete|expected [0-9]+ journal refs/]] as const;
            observed.hints = hints.filter(([, pattern]) => pattern.test(output)).map(([hint]) => hint);
            if (over) { reject(Error("TEST command output bound")); return; }
            try { resolve({ code, signal, report: JSON.parse(output) }); } catch { observed.hints.push("json"); reject(Error("TEST public executable did not return JSON")); }
          });
        });
        const withoutTrust = await run(false), withTrust = await run(true);
        diagnostic.stage = "complete";
        return { cloneCode, fetchCode, refs: clonedRefs, tokenInConfig: config.includes(token), tokenInArgv, tokenInOutput, readRequests: requests, withoutTrust, withTrust };
      },
    };
  } catch (error) {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

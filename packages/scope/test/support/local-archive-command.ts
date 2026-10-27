import { Buffer } from "node:buffer";
/** Genuine smart-HTTP/Git and public executable witness. Identity/token
 * authority and loopback transport are TEST stand-ins, not hosted proof. */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { nodeGit } from "../../../cli/src/git.ts";
import { Host } from "../../../git/test/support/host.ts";
import { git, put } from "../../../git/test/support/repo.ts";
import type { ArchiveCommandWitness, LocalArchiveClone } from "./local-clone.ts";

export interface ArchiveCommandSession {
  readonly remote: string; readonly directory: string; readonly token: string;
  run(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  finish(lines: readonly string[]): Promise<ArchiveCommandWitness>;
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
      finish: async lines => {
        tokenInOutput ||= lines.some(line => line.includes(token));
        if (cloneCode !== 0 || fetchCode !== 0) throw Error("TEST actual dap archive clone/fetch did not pass");
        const clonedRefs = git(target, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/artroom/journal/"]).split("\n").map(line => { const [ref, id] = line.split(" "); if (!ref || !id) throw Error("TEST cloned ref"); return { ref, id }; });
        const config = readFileSync(join(target, ".git", "config"), "utf8");
        const run = (trusted: boolean) => new Promise<ArchiveCommandWitness["withTrust"]>((resolve, reject) => {
          const args = [fileURLToPath(new URL("../../../replay/src/bin.ts", import.meta.url)), "--git", target, "--all", "--expect-journals", "5", "--json", ...(trusted ? ["--trust-published-anchors"] : [])];
          tokenInArgv ||= args.some(arg => arg.includes(token));
          const child = spawn(process.execPath, args, { cwd: root, env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: "/nonexistent" }, stdio: ["ignore", "pipe", "pipe"] });
          const chunks: Buffer[] = [], stdoutChunks: Buffer[] = [], stderrChunks: Buffer[] = []; let size = 0; let over = false; let failure: Error | undefined;
          const capture = (stream: Buffer[], chunk: Buffer) => { size += chunk.length; if (size > 8 * 1024 * 1024) { over = true; child.kill("SIGKILL"); } else { const owned = Buffer.from(chunk); chunks.push(owned); stream.push(owned); } };
          child.stdout.on("data", (chunk: Buffer) => capture(stdoutChunks, chunk)); child.stderr.on("data", (chunk: Buffer) => capture(stderrChunks, chunk));
          // BR-4: each concurrent child fits within the whole follower's
          // measured duration. Three times its prior median is 82.6875 s.
          const timer = setTimeout(() => child.kill("SIGKILL"), 90_000);
          child.on("error", error => { failure = error; });
          child.on("close", (code, signal) => {
            clearTimeout(timer);
            const output = Buffer.concat(chunks).toString("utf8");
            const stdout = Buffer.concat(stdoutChunks).toString("utf8"), stderr = Buffer.concat(stderrChunks).toString("utf8");
            tokenInOutput ||= output.includes(token) || stdout.includes(token) || stderr.includes(token);
            if (failure) { reject(failure); return; }
            if (over) { reject(Error("TEST command output bound")); return; }
            // The public executable writes its JSON report to stdout. Stderr
            // is checked for secrets, but is not part of that JSON document.
            try { resolve({ code, signal, report: JSON.parse(stdout) }); } catch { reject(Error("TEST public executable did not return JSON")); }
          });
        });
        // Both commands only read the completed clone. Wait for both owned
        // children before propagating failure or allowing session cleanup.
        const [untrusted, trusted] = await Promise.allSettled([run(false), run(true)]);
        if (untrusted.status === "rejected") throw untrusted.reason;
        if (trusted.status === "rejected") throw trusted.reason;
        const withoutTrust = untrusted.value, withTrust = trusted.value;
        return { cloneCode, fetchCode, refs: clonedRefs, tokenInConfig: config.includes(token), tokenInArgv, tokenInOutput, readRequests: requests, withoutTrust, withTrust };
      },
    };
  } catch (error) {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

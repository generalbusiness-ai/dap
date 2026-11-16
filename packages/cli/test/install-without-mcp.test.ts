/**
 * Witness (NF-4): the real `dap` command installs an application in a room and reads the installation, and no MCP module loads.
 *
 * Real: the `dap` launcher and its Node process, `main.ts`, the files under ARTROOM_HOME (key, configuration and request custody),
 * the client's install request and installation read, the public HTTPS Git reader, and every module the command loads.
 * STAND-IN: the room and the Git host of `../../mcp/test/support/install-room.ts`. A preload in the child process rewrites the package host's HTTPS URL to the test's loopback listener and records each
 * loaded module URL. The stand-in judges nothing, so this proves which modules the
 * command loads and what it sends and reads. The native judgment of an install is the scope stories' witness.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { DOMAINS, type Receipt, type Settlement, type SignedIntent, type SignedSessionRequest } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner, type CustodyRecord, type Fetch } from "@generalbusiness/dap-client";
import { fileStore as diskCustody } from "@generalbusiness/dap-client/node";
import { checkpointOf, clockOf, judgeCheckpoint, resolvedEntryEffects } from "@generalbusiness/dap-derive";
import { keys } from "@generalbusiness/dap-derive/testing";
import { installGraph } from "../../platform/test/support-application-install.ts";
import { receiptOf } from "../../scope/src/core.ts";
import { GIT_HOST, installRoom, type InstallRoom } from "../../mcp/test/support/install-room.ts";
import { command, type Context } from "../src/index.ts";
import { applicationCommands } from "../src/application-install-runtime.ts";
import { fileStore } from "../src/files.ts";

const CLI = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
const secret = new Uint8Array(32).fill(71);
let server: Server, service: string, home: string, scratch: string, room: InstallRoom;

async function body(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks);
}

beforeAll(async () => {
  room = await installRoom(secretSigner(secret).key);
  server = createServer(async (req, res) => {
    const bytes = await body(req), path = req.url ?? "/";
    if (path.startsWith("/__git/")) {
      expect(req.headers["authorization"]).toBeUndefined(); expect(req.headers["cookie"]).toBeUndefined();
      const answer = room.git(req.method ?? "GET", path.slice("/__git/".length), bytes);
      res.writeHead(answer.status, answer.headers); res.end(answer.body); return;
    }
    const reply = await room.fetch(`http://scopes${path}`, { method: req.method ?? "GET", ...(bytes.length ? { body: new TextDecoder().decode(bytes) } : {}) });
    res.writeHead(reply.status, { "content-type": "application/json" });
    const stream = reply.body as unknown as ReadableStream<Uint8Array> | null;
    if (stream) { const reader = stream.getReader(); for (let read = await reader.read(); !read.done; read = await reader.read()) res.write(read.value); }
    res.end();
  });
  service = await new Promise<string>(resolve => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}`)));

  scratch = mkdtempSync(join(tmpdir(), "cli-install-without-mcp-"));
  home = join(scratch, "home");
  mkdirSync(join(home, "keys"), { recursive: true });
  writeFileSync(join(home, "keys", "device.key"), `${b64url(secret)}\n`, { mode: 0o600 });
  writeFileSync(join(home, "config.json"), JSON.stringify({ v: 2, key: "device", service, repository: room.repository }));
  // The child's preload: record every module URL it loads, and send the package host's HTTPS requests to the loopback peer.
  writeFileSync(join(scratch, "preload.mjs"), `import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";
registerHooks({ load(url, context, next) { appendFileSync(process.env.TEST_MODULES, url + "\\n"); return next(url, context); } });
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const request = new Request(input, init);
  if (!request.url.startsWith(${JSON.stringify(GIT_HOST)})) return original(input, init);
  // The reader checks that a reply comes from the URL it asked, so the reply leaves the loopback URL behind, as a proxy's would.
  return original(new Request(process.env.TEST_GIT + request.url.slice(${GIT_HOST.length}), request)).then(reply => new Response(reply.body, { status: reply.status, headers: reply.headers }));
};
`);
});

// The scratch directory stays in the system temporary directory, which the host clears.
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

/** One real `dap` process. It runs asynchronously, so this process's listener answers it. */
async function dap(argv: readonly string[], modules: string, trust = room.trust) {
  writeFileSync(modules, "");
  const child = spawn(process.execPath, [CLI, ...argv], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env,
    ARTROOM_HOME: home, APPLICATION_TRUST: trust, TEST_MODULES: modules, TEST_GIT: `${service}/__git/`,
    NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import ${join(scratch, "preload.mjs")}`.trim() } });
  let out = "", err = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => { out += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => { err += chunk; });
  const code = await new Promise<number | null>(resolve => child.on("close", resolve));
  return { code, out: out.trim().split("\n"), err, modules: readFileSync(modules, "utf8").trim().split("\n") };
}

const mcpModule = (url: string) => /\/packages\/mcp\/|\/@generalbusiness\/dap-mcp\/|\/node_modules\/@modelcontextprotocol\//.test(url);

test("dap installs an application in a room and reads the installation, and loads no MCP module", { timeout: 120_000 }, async () => {
  const installed = await dap(["install", room.uri, "--release", room.release, "--request", "TEST-nf4-install"], join(scratch, "install-modules.txt"));
  expect(installed.code, installed.err).toBe(0);
  const item = room.stand.scopes.get(room.rules.scope)!.items.find(found => found.type === "installation")?.id;
  expect(item).toBeTypeOf("number");
  expect(installed.out).toEqual([`Install request recorded: item ${item}.`, `Read its result with: dap application ${item}`,
    "Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused."]);
  expect(room.wants.length).toBeGreaterThan(0);
  expect(room.stand.requests.filter(request => request === `POST /v1/scopes/${room.rules.scope}/acts`)).toHaveLength(1);
  // The request rests in the custody directory that `dap mcp` shares, accepted.
  const records = readdirSync(join(home, "private", "mcp-custody", "records"));
  expect(records).toHaveLength(1);
  expect(JSON.parse(readFileSync(join(home, "private", "mcp-custody", "records", records[0]!), "utf8"))).toMatchObject({ phase: "accepted" });

  const read = await dap(["application", String(item)], join(scratch, "read-modules.txt"));
  expect(read.code, read.err).toBe(0);
  expect(read.out).toEqual([`Application install ${item}: pending (fetch).`]);

  for (const run of [installed, read]) {
    // The recorder saw the command's own modules, including the client's install entry.
    expect(run.modules.some(url => url.endsWith("/packages/cli/src/main.ts"))).toBe(true);
    expect(run.modules.some(url => url.endsWith("/packages/client/src/install-request.ts"))).toBe(true);
    expect(run.modules.filter(mcpModule)).toEqual([]);
  }
});

// The command line writes its own short lines now. Each changed line is in notes/implementation/2026-11-12-nf4-cli-install.md.
test("dap refuses an untrusted release in its own words, and fetches, signs and sends nothing", { timeout: 60_000 }, async () => {
  const posts = room.stand.requests.filter(request => request.endsWith("/acts")).length, wanted = room.wants.length;
  const refused = await dap(["install", room.uri, "--release", room.release, "--request", "TEST-nf4-untrusted"], join(scratch, "untrusted-modules.txt"), "[]");
  expect([refused.code, refused.err.trimEnd()]).toEqual([1, "APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing."]);
  expect([room.stand.requests.filter(request => request.endsWith("/acts")).length, room.wants.length]).toEqual([posts, wanted]);
  expect(refused.modules.filter(mcpModule)).toEqual([]);
});

// This scenario reopens real files and command runtimes, but starts no new process.
// Read-session authorization is scripted here; no Native Worker session authority runs.
test.each(["absent", "landed"] as const)("a repeated install reopens file custody: %s original needs a judged absence proof or its actual Native settlement", async mode => {
  const { D, M, A, G } = installGraph();
  const localHome = mkdtempSync(join(tmpdir(), "cli-install-absence-")), service = "https://cli-absence.test";
  const initial = fileStore(localHome);
  await initial.keep("operator", keys.rita.secret);
  await initial.save({ v: 2, key: "operator", service,
    repository: { directory: D.at, membership: M.at, rules: A.at.scope, destination: G.at.scope } });
  const custodyHome = join(localHome, "private", "mcp-custody");
  const requestKey = `TEST-cli-${mode}`, argv = ["install", room.uri, "--release", room.release, "--request", requestKey, "--values", '{"target":7}'];
  let now = Date.parse(A.last.time), actSignatures = 0, submissions = 0, original: CustodyRecord | undefined;
  let receipt: Receipt | null = null;
  let nativeJudgment: ReturnType<typeof A.submit> | undefined, nativeThrown: unknown;
  let originalText = "", recordPath = "", packageWants = 0, terminalText = "";
  const initialHead = { ...A.head }, initialHistory = canonicalize(A.entries);
  const unknownLine = `The reply from ${A.at.scope} was lost, so the outcome is unknown. The request is under custody. Repeat the same command to settle it.`;
  const unsent = "Custody keeps an absence proof for this expired install request. It retains the original envelope. This command signed and submitted no ACT. Do not resend the expired envelope. Use a new request key only for a new request.";

  const steps = mode === "absent" ? ["lost", "earlier-head", "proved", "terminal-repeat"] as const
    : ["lost", "native-settle", "terminal-repeat"] as const;
  for (const step of steps) {
    if (step === "proved") {
      A.now = original!.envelope.signed.intent.notAfter;
      A.take(judgeCheckpoint(A.state, A.definition, checkpointOf(A.state), {
        clock: clockOf(A.state, A.now), bounds: A.bounds,
      }));
      expect(A.last.input.type).toBe("checkpoint");
      expect(A.last.time).toBe(original!.envelope.signed.intent.notAfter);
    }
    const routes: string[] = [], sessionToken = b64url(new Uint8Array(32).fill(83));
    const fetch: Fetch = async (url, init) => {
      const path = new URL(url).pathname, method = init?.method ?? "GET";
      routes.push(`${method} ${path}`);
      if (path === `/v1/scopes/${M.at.scope}/sessions`) {
        expect(method).toBe("POST");
        const asked = JSON.parse(init!.body!) as SignedSessionRequest;
        expect(asked.request).toMatchObject({ action: "read-session", to: M.at, actor: keys.rita.key });
        return Response.json({ ok: true, token: sessionToken, session: { v: 1, deployment: "TEST CLI session route", membership: M.at,
          member: "@rita", key: asked.request.actor, reads: ["summary", "entry", "log"], ends: asked.request.notAfter } });
      }
      if (path === `/v1/scopes/${A.at.scope}/acts`) {
        submissions++;
        expect(step).toBe("lost");
        const sent = JSON.parse(init!.body!) as { signed: SignedIntent; values?: readonly string[]; texts?: readonly string[] };
        expect(sent.signed.intent).toMatchObject({ to: A.at, kind: "install-application", idempotencyKey: requestKey });
        if (mode === "landed") {
          const texts = new Map<string, number>((sent.texts ?? []).map(text => [textDigest(text), utf8(text).length] as const));
          try {
            nativeJudgment = A.submit(sent.signed, { platform: A.authority, membership: M.at, values: sent.values, texts: digest => texts.get(digest) });
          } catch (error) { nativeThrown = error; throw error; }
          if (nativeJudgment.result !== "write") throw Error("TEST install did not produce a native write");
          const sealed = A.entries.at(-1)!;
          expect(sealed.entry.input).toMatchObject({ type: "act", signed: sent.signed });
          receipt = receiptOf(sealed, A.named, A.at, resolvedEntryEffects(A.state, A.definition, sealed.entry, A.at));
        }
        // The absent original never reaches Rules; the landed original loses its reply after the real judgment and seal.
        throw Error("TEST install reply lost");
      }
      if (path === `/v1/scopes/${A.at.scope}/settle`) {
        expect(method).toBe("POST");
        expect(JSON.parse(init!.body!)).toEqual({ signed: original!.envelope.signed });
        const settlement: Settlement = mode === "landed" ? { ok: true, at: A.head, complete: true, value: receipt! }
          : { ok: false, reason: "not-found" };
        return Response.json(settlement);
      }
      expect(init?.headers?.["authorization"]).toBe(`Session ${sessionToken}`);
      if (mode === "landed" && receipt !== null && path === `/v1/scopes/${A.at.scope}/entries/${receipt.fact.seq}`) {
        expect(["native-settle", "terminal-repeat"]).toContain(step);
        return Response.json({ ok: true, at: A.head, complete: true, value: A.entries[receipt!.fact.seq] });
      }
      const node = [D, A].find(node => path === `/v1/scopes/${node.at.scope}`);
      if (node) {
        const snapshot = node.state.all();
        return Response.json({ ok: true, at: node.head, complete: true, value: { scope: node.at, status: node.state.scope()!.status,
          definition: node.named, time: node.last.time, items: snapshot.items, counts: snapshot.counts } });
      }
      if (path === `/v1/scopes/${A.at.scope}/log`) {
        expect(new URL(url).searchParams.has("cursor")).toBe(false);
        return Response.json({ ok: true, at: A.head, complete: true, value: { scope: A.at, definition: A.named,
          entries: A.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })) } });
      }
      throw Error(`Unexpected CLI recovery route: ${method} ${path}`);
    };
    const files = fileStore(localHome), custody = diskCustody(custodyHome, undefined, () => now);
    const ctx: Context = { store: { ...files, signer: async name => {
      const secret = await files.secret(name);
      if (!secret) return null;
      const signer = secretSigner(secret);
      return { key: signer.key, sign: async (bytes: Uint8Array) => {
        if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) actSignatures++;
        return signer.sign(bytes);
      } };
    } }, fetch, now: () => now };
    ctx.applicationCommand = applicationCommands(ctx, custody, room.applicationFetch, room.trust);
    const outcome = await command(ctx, argv);
    if (mode === "landed" && step === "lost") {
      const thrown = nativeThrown instanceof Error ? { name: nativeThrown.name, message: nativeThrown.message } : nativeThrown;
      expect({ judgment: nativeJudgment, thrown }, JSON.stringify({ judgment: nativeJudgment, thrown }))
        .toMatchObject({ judgment: { result: "write" }, thrown: undefined });
    }
    expect(outcome.code).toBe(mode === "landed" && step !== "lost" ? 0 : 1);
    expect(routes.slice(0, 3)).toEqual([`POST /v1/scopes/${M.at.scope}/sessions`, `GET /v1/scopes/${D.at.scope}`, `GET /v1/scopes/${A.at.scope}`]);
    expect([actSignatures, submissions]).toEqual([1, 1]);
    expect(A.entries.filter(({ entry }) => entry.input.type === "act" && entry.input.signed.intent.idempotencyKey === requestKey)).toHaveLength(mode === "landed" ? 1 : 0);
    if (step === "lost") {
      expect(outcome.lines).toEqual([unknownLine]);
      expect(routes.slice(3)).toEqual([`GET /v1/scopes/${D.at.scope}`, `POST /v1/scopes/${A.at.scope}/acts`]);
      const records = readdirSync(join(custodyHome, "records"));
      expect(records).toHaveLength(1);
      recordPath = join(custodyHome, "records", records[0]!);
      originalText = readFileSync(recordPath, "utf8"); original = JSON.parse(originalText) as CustodyRecord;
      expect(original.phase).toBe("unknown"); expect(original.signings).toHaveLength(1);
      expect(original.signings[0]!.closed).toBeUndefined();
      expect(original.outcomes).toMatchObject([{ lost: true }]);
      if (mode === "absent") expect(canonicalize(A.entries)).toBe(initialHistory);
      packageWants = room.wants.length;
      now = Date.parse(original.envelope.signed.intent.notAfter) + 60_000;
    } else {
      expect(room.wants).toHaveLength(packageWants);
      if (mode === "landed") {
        const ended = JSON.parse(readFileSync(recordPath, "utf8")) as CustodyRecord;
        expect(ended).toMatchObject({ phase: "accepted", envelope: original!.envelope, attempt: original!.attempt });
        expect(ended.signings).toHaveLength(1);
        expect(ended.outcomes.at(-1)).toMatchObject({ settled: receipt, signing: 0 });
        expect(ended.outcomes.some(held => "unsent" in held)).toBe(false);
        expect(outcome.lines).toEqual([`Install request recorded: item ${receipt!.fact.seq}.`, `Read its result with: dap application ${receipt!.fact.seq}`,
          "Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused."]);
        if (step === "native-settle") {
          expect(routes.slice(3)).toEqual([`POST /v1/scopes/${A.at.scope}/settle`, `GET /v1/scopes/${A.at.scope}/entries/${receipt!.fact.seq}`]);
          terminalText = readFileSync(recordPath, "utf8");
        } else {
          expect(routes.slice(3)).toEqual([`GET /v1/scopes/${A.at.scope}/entries/${receipt!.fact.seq}`]);
          expect(readFileSync(recordPath, "utf8")).toBe(terminalText);
        }
      } else if (step === "earlier-head") {
        expect(outcome.lines).toEqual([unknownLine, "The verified scope journal has no entry at or past this install request's expiry. Custody keeps the original record and its capacity charge. This command signed and submitted no ACT. Keep the original request key and arguments. Repeat the command after the scope records a later entry at or past the request's expiry."]);
        expect(readFileSync(recordPath, "utf8")).toBe(originalText);
        expect(A.head).toEqual(initialHead);
      } else {
        expect(outcome.lines).toEqual([unsent]);
        const ended = JSON.parse(readFileSync(recordPath, "utf8")) as CustodyRecord;
        expect(ended).toMatchObject({ phase: "refused", envelope: original!.envelope, attempt: original!.attempt });
        expect(ended.signings).toHaveLength(1); expect(ended.signings[0]!.closed).toBe(true);
        expect(ended.outcomes.at(-1)).toMatchObject({ unsent: A.head, signing: 0 });
        expect(ended.outcomes.some(held => "answer" in held)).toBe(false);
        if (step === "proved") terminalText = readFileSync(recordPath, "utf8");
        else expect(readFileSync(recordPath, "utf8")).toBe(terminalText);
      }
      if (mode === "absent") expect(routes.slice(3)).toEqual(step === "terminal-repeat" ? [] : [`POST /v1/scopes/${A.at.scope}/settle`, `GET /v1/scopes/${A.at.scope}`, `GET /v1/scopes/${A.at.scope}/log`]);
    }
  }
});

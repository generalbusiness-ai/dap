import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SourceError } from "@generalbusiness/dap-replay";
import { platform } from "@generalbusiness/dap-platform";
import { command, commandWords, COMMANDS, execute, JSON_COMMANDS, JSON_LONG_LIVED, JSON_OPERATOR, NO_JSON_OUTPUT, scanJson, USAGE } from "../src/line.ts";
import { envelope, type ActsResult, type Typed } from "../src/json-output.ts";
import { run } from "../src/command-support.ts";
import { fileStore } from "../src/files.ts";
import { main } from "../src/main.ts";
import { memoryStore } from "../src/store.ts";
import { DEFINITION, DESTINATION, ENTRY, ENTRY_HASH, HEAD, KEY, MEMBERSHIP, MEMBERSHIP_HEAD, readRoom, REMOTE, scriptedFetch } from "./support/read-commands.ts";

// The command scenarios read the STAND-IN service of support/read-commands.ts.
// The process cases call `main` with a synthetic config directory under the
// system temporary directory and a spied global fetch; no request leaves the test.

const typedOf = async (...args: Parameters<typeof execute>): Promise<Typed> => {
  const outcome = await execute(...args);
  expect(outcome.typed, outcome.lines.join("\n")).toBeDefined();
  return outcome.typed!;
};

// ---------------------------------------------------------------- the scan owns each token once

// Invariant: `--json` selects JSON only at an option position. A value-taking option consumes its next token, even `--json`.
test("the JSON scan takes the switch at option positions and leaves a consumed --json as the option's value", () => {
  const cases: [argv: string[], json: boolean, kept: string[]][] = [
    [["issue", "open", "--title", "--json"], false, ["issue", "open", "--title", "--json"]],
    [["--json", "issue", "open", "--title", "--json"], true, ["issue", "open", "--title", "--json"]],
    [["--json"], true, []],
    [["frob", "--json"], true, ["frob"]],
    [["act", "--json"], true, ["act"]],
    [["remote", "--json", "--json"], true, ["remote"]],
    [["show", "--json", "destination:5"], true, ["show", "destination:5"]],
    [["issue", "close", "3", "--json"], true, ["issue", "close", "3"]],
    [["invite", "@m", "--keep", "--json"], true, ["invite", "@m", "--keep"]],
    // `--` and an unknown option consume their next token today; that token stays data.
    [["remote", "--", "--json"], false, ["remote", "--", "--json"]],
    [["remote", "--frob", "--json"], false, ["remote", "--frob", "--json"]],
    [["dev", "--port", "--json"], false, ["dev", "--port", "--json"]],
    [["scope-index", "inventory", "--out", "--json"], false, ["scope-index", "inventory", "--out", "--json"]],
    // MCP reads its own options: two switches and four value-taking options.
    [["mcp", "--generic", "--json"], true, ["mcp", "--generic"]],
    [["mcp", "--generic=add", "--json"], true, ["mcp", "--generic=add"]],
    [["mcp", "--frob", "--json"], true, ["mcp", "--frob"]],
    [["mcp", "--tools", "--json"], false, ["mcp", "--tools", "--json"]],
    [["mcp", "--scope", "--json", "--membership", "--json"], false, ["mcp", "--scope", "--json", "--membership", "--json"]],
    [["--json", "mcp", "--http", "--json"], true, ["mcp", "--http", "--json"]],
  ];
  for (const [argv, json, kept] of cases) expect(scanJson(argv), argv.join(" ")).toEqual({ json, argv: kept });
  // A line without the switch is passed on token for token.
  for (const [argv, json] of cases) if (!json) expect(scanJson(argv).argv).toEqual(argv);
});

test("a removed switch leaves no flag behind: issue close --json is not refused as a flag of issue close", async () => {
  const { argv } = scanJson(["issue", "close", "3", "--json"]);
  const outcome = await command({ store: memoryStore() }, argv);
  expect(outcome.lines.join("\n")).not.toContain("Only issue open and issue wait take flags.");
});

// Invariant: the envelope's command holds only allowlisted command words; a supplied word never becomes a label.
test("the resolved command holds allowlisted words only, and an unknown command is the empty array", () => {
  expect(commandWords(["frob"])).toEqual([]);
  expect(commandWords(["constructor"])).toEqual([]);
  expect(commandWords(["toString"])).toEqual([]);
  expect(commandWords([])).toEqual([]);
  expect(commandWords(["claim", "demo"])).toEqual(["create"]);
  expect(commandWords(["issue", "--title", "x", "open"])).toEqual(["issue", "open"]);
  expect(commandWords(["issue", "TEST-secret-word"])).toEqual(["issue"]);
  expect(commandWords(["application", "upgrade", "1", "git+https://x"])).toEqual(["application", "upgrade"]);
  expect(commandWords(["join", "https://TEST-invitation-link#secret"])).toEqual(["join"]);
  expect(commandWords(["mcp", "--tools", "x"])).toEqual(["mcp"]);
  expect(commandWords(["--title", "mcp"])).toEqual([]);
});

// Invariant: every command of the dispatch tables is in exactly one JSON class. A new command, or a converted one still
// in NO_JSON_OUTPUT, fails here. "Has a renderer" is the table that execute dispatches through, and each of its commands
// must return a typed Outcome; "every command" comes from KNOWN and the early commands of main.ts.
test("NO_JSON_OUTPUT is every command without a JSON renderer, apart from mcp, dev and scope-index", async () => {
  for (const word of COMMANDS) expect(commandWords([word]), word).toEqual([word]);
  const classes = [...NO_JSON_OUTPUT, ...Object.keys(JSON_COMMANDS), ...JSON_LONG_LIVED, ...JSON_OPERATOR];
  expect(new Set(classes).size, "a command in two classes").toBe(classes.length);
  expect([...classes].sort()).toEqual([...COMMANDS].sort());
  // A converted command builds its typed result or error on its own path: here, the missing room's typed stop.
  const sample: Record<string, string[]> = { show: ["destination:1"] };
  for (const word of Object.keys(JSON_COMMANDS)) {
    const outcome = await execute({ store: memoryStore() }, [word, ...(sample[word] ?? [])]);
    expect(outcome.typed?.error?.code, word).toBe("no-room");
  }
  process.env["DAP_HOME"] = join(scratch, "TEST-a"); process.env["ARTROOM_HOME"] = join(scratch, "TEST-b");
  for (const word of NO_JSON_OUTPUT) {
    expect(documentOf(await main([word, "--json"])), word).toMatchObject({ command: commandWords([word]), status: "usage", exit: 2, error: { code: "no-json-output" } });
  }
});

// ---------------------------------------------------------------- one execution, two renderers

// Invariant: text and JSON render one execution; the JSON document is the typed result with native values and full identifiers.
test("remote renders its typed result as one compact envelope, and an unrecorded host part stays an explicit null URL", async () => {
  const room = await readRoom({ remote: REMOTE });
  const outcome = await execute(room.ctx, ["remote"]);
  expect((await command(room.ctx, ["remote"])).lines).toEqual(outcome.lines);
  const doc = envelope(["remote"], outcome.typed!);
  expect(doc).toBe(JSON.stringify(JSON.parse(doc)));
  expect(Object.keys(JSON.parse(doc))).toEqual(["v", "command", "phase", "status", "exit", "result"]);
  expect(JSON.parse(doc)).toEqual({ v: 1, command: ["remote"], phase: "complete", status: "done", exit: 0,
    result: { destination: DESTINATION, head: HEAD, mode: "published", repository: { host: "artifacts", namespace: "demo", name: "r" }, remoteUrl: REMOTE } });
  const placeholder = await readRoom();
  expect((await typedOf(placeholder.ctx, ["remote"])).result).toEqual({ destination: DESTINATION, head: HEAD, mode: "published",
    repository: { host: "artifacts", namespace: "demo", name: "r" }, remoteUrl: null });
});

test("remote keeps raw JSON values while escaping member text output", async () => {
  const room = await readRoom();
  room.script.repository = { host: "artifacts", namespace: "demo\nnext", name: "r", id: "r" };
  const outcome = await execute(room.ctx, ["remote"]);
  expect(outcome.lines).toContain("Namespace: demo\\x0anext");
  expect(outcome.typed?.result).toMatchObject({ repository: { namespace: "demo\nnext" } });
});

test("show renders the whole native Entry with its scope reference, full computed hash and read head", async () => {
  const room = await readRoom();
  const outcome = await execute(room.ctx, ["show", "destination:5"]);
  expect((await command(room.ctx, ["show", "destination:5"])).lines).toEqual(outcome.lines);
  expect(JSON.parse(envelope(["show"], outcome.typed!))).toEqual({ v: 1, command: ["show"], phase: "complete", status: "done", exit: 0,
    result: { scope: DESTINATION, seq: 5, hash: ENTRY_HASH, head: HEAD, entry: ENTRY } });
});

test("acts renders native forms by act kind, its hidden count and the separately read membership head, and no programs", async () => {
  const room = await readRoom();
  const typed = await typedOf(room.ctx, ["acts", "destination"]);
  expect([typed.phase, typed.status]).toEqual(["complete", "done"]);
  const result = typed.result as ActsResult;
  expect({ ...result, acts: null, hidden: null }).toEqual({ scope: DESTINATION, head: HEAD, definition: DEFINITION,
    caller: { key: KEY, standing: { handle: "@operator", role: "admin" } }, membership: { scope: MEMBERSHIP, head: MEMBERSHIP_HEAD }, acts: null, hidden: null });
  const shape = platform(DEFINITION)!.data as unknown as { genesis: string; acts: Record<string, Record<string, unknown>> }, native = shape.acts;
  const kinds = Object.keys(result.acts);
  expect(kinds.length).toBeGreaterThan(0);
  expect(kinds.length + result.hidden).toBe(Object.keys(native).filter(kind => kind !== shape.genesis).length);
  for (const kind of kinds) {
    const form = result.acts[kind]! as unknown as Record<string, unknown>, act = native[kind]!;
    for (const key of ["step", "on", "grant", "fields"]) expect(form[key], `${kind}.${key}`).toEqual(act[key]);
    for (const key of Object.keys(form)) expect(["step", "on", "grant", "fields", "also", "presents"], `${kind}.${key}`).toContain(key);
    for (const key of ["also", "presents"]) {
      const declared = act[key] as Record<string, unknown> | undefined;
      if (declared !== undefined && Object.keys(declared).length > 0) expect(form[key]).toEqual(declared);
      else expect(form).not.toHaveProperty(key);
    }
  }
});

// ---------------------------------------------------------------- closed error codes

// Invariant: no raw exception text, path or key name enters a typed error; each known producer category has a closed code.
test("a lost reply keeps its raw words in the text and only the closed transport code in the typed error", async () => {
  const room = await readRoom();
  room.script.fail = new Error("TEST-SENTINEL-transport private detail");
  for (const argv of [["remote"], ["show", "destination:5"], ["acts", "destination"]]) {
    const outcome = await execute(room.ctx, argv);
    expect(outcome.code).toBe(1);
    expect(outcome.lines.join("\n")).toContain("TEST-SENTINEL-transport");
    expect(outcome.typed).toEqual({ phase: "read", status: "unreadable", error: { kind: "transport", code: "no-answer", message: "No answer was received.", dispatch: "none" } });
    expect(envelope(commandWords(argv), outcome.typed!)).not.toContain("TEST-SENTINEL");
  }
});

test("a read-session cache failure and an unreadable history carry closed codes, not the thrown messages", async () => {
  const room = await readRoom();
  const store = { ...room.store, sessionCache: { ...room.store.sessionCache!, read: async () => { throw new Error("TEST-SENTINEL-cache"); } } };
  const cache = await execute({ ...room.ctx, store }, ["remote"]);
  expect(cache.code).toBe(1);
  expect(cache.typed).toEqual({ phase: "read", status: "error",
    error: { kind: "local", code: "read-session-cache", message: "The private read-session cache could not be read or saved; no credential was printed." } });
  expect(JSON.stringify([cache.lines, cache.typed])).not.toContain("TEST-SENTINEL");
  const source = await run(async () => { throw new SourceError("the history of TEST-SENTINEL-source cannot be read: forbidden", "forbidden"); }, "read");
  expect(source).toEqual({ code: 1, lines: ["the history of TEST-SENTINEL-source cannot be read: forbidden"],
    typed: { phase: "verify", status: "unreadable", error: { kind: "read", code: "history-unreadable", message: "A history could not be read: forbidden.", reason: "forbidden" } } });
});

test("refused reads, a missing room, a missing key and an unknown scope name each give their status and closed code", async () => {
  const room = await readRoom();
  room.script.entry = "not-found";
  expect(await typedOf(room.ctx, ["show", "destination:5"])).toEqual({ phase: "read", status: "not-found",
    error: { kind: "read", code: "refused", message: "The scope refused the read: not-found.", read: { ok: false, reason: "not-found" } } });
  room.script.repository = null;
  expect(await typedOf(room.ctx, ["remote"])).toEqual({ phase: "read", status: "not-found",
    error: { kind: "read", code: "no-recorded-repository", message: "The destination records no repository." } });
  expect(await typedOf({ store: memoryStore() }, ["acts"])).toEqual({ phase: "preflight", status: "usage", error: { kind: "usage", code: "no-room", message: "No room is set up here." } });
  const keyless = await execute({ ...room.ctx, store: { ...room.store, secret: async () => null } }, ["acts", "destination"]);
  expect([keyless.code, keyless.typed]).toEqual([1, { phase: "preflight", status: "refused",
    error: { kind: "local", code: "key-missing", message: "The configured key is missing from the config directory; nothing was signed." } }]);
  expect(JSON.stringify(keyless.typed)).not.toContain("operator");
  const unknown = await execute(room.ctx, ["show", "TEST-SENTINEL-name:1"]);
  expect(unknown.typed).toEqual({ phase: "parse", status: "usage", error: { kind: "usage", code: "unknown-scope", message: "No scope of that name is known here." } });
  expect(envelope(["show"], unknown.typed!)).not.toContain("TEST-SENTINEL");
});

// ---------------------------------------------------------------- the process boundary

let scratch: string, out: string[], err: string[], saved: Record<string, string | undefined>;
beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "dap-json-"));
  out = []; err = [];
  saved = { DAP_HOME: process.env["DAP_HOME"], ARTROOM_HOME: process.env["ARTROOM_HOME"] };
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => { out.push(String(chunk)); return true; });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => { err.push(String(chunk)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  rmSync(scratch, { recursive: true, force: true });
});
/** The one document of one invocation; its exit equals the process exit. */
const documentOf = (exit: number): Record<string, unknown> => {
  expect(err).toEqual([]);
  expect(out.length).toBe(1);
  expect(out[0]!.endsWith("\n")).toBe(true);
  expect(out[0]!.slice(0, -1)).not.toContain("\n");
  const doc = JSON.parse(out[0]!) as Record<string, unknown>;
  expect(doc["exit"]).toBe(exit);
  out = [];
  return doc;
};

// Invariant: with --json, mcp, dev and scope-index end with usage/2 before configuration, files, keys or listeners.
test("JSON mcp, dev and scope-index are usage/2 before the config directory is selected, and no request is sent", async () => {
  // Conflicting homes make any configDir() call fail: a document with another code would show that selection ran.
  process.env["DAP_HOME"] = join(scratch, "TEST-SENTINEL-a"); process.env["ARTROOM_HOME"] = join(scratch, "TEST-SENTINEL-b");
  const sent = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("no request is sent"); });
  const expected = (name: string, code: string, message: string) => ({ v: 1, command: [name], phase: "parse", status: "usage", exit: 2, error: { kind: "usage", code, message } });
  const longLived = "This command runs until it is stopped. It has no finite JSON result.";
  for (const argv of [["--json", "mcp"], ["mcp", "--generic", "--json"], ["mcp", "--scope", "sc_x", "--json"]]) expect(documentOf(await main(argv))).toEqual(expected("mcp", "long-lived", longLived));
  for (const argv of [["dev", "--json"], ["--json", "dev", "--port", "8080"]]) expect(documentOf(await main(argv))).toEqual(expected("dev", "long-lived", longLived));
  expect(documentOf(await main(["scope-index", "inventory", "--out", "TEST-out", "--json"]))).toEqual(expected("scope-index", "operator-command", "This operator command has no JSON result in version 1."));
  expect(sent).not.toHaveBeenCalled();
  expect([existsSync(join(scratch, "TEST-SENTINEL-a")), existsSync(join(scratch, "TEST-out"))]).toEqual([false, false]);
});

test("JSON usage and a command without JSON output yet are usage/2 documents with allowlisted command words", async () => {
  process.env["DAP_HOME"] = join(scratch, "TEST-SENTINEL-a"); process.env["ARTROOM_HOME"] = join(scratch, "TEST-SENTINEL-b");
  for (const argv of [["--json"], ["frob", "--json"], ["TEST-SENTINEL-word", "--json"]]) {
    expect(documentOf(await main(argv))).toEqual({ v: 1, command: [], phase: "parse", status: "usage", exit: 2,
      error: { kind: "usage", code: "usage", message: "The command line does not match a command's usage.", usage: USAGE } });
  }
  expect(documentOf(await main(["act", "--json"]))).toEqual({ v: 1, command: ["act"], phase: "parse", status: "usage", exit: 2,
    error: { kind: "usage", code: "no-json-output", message: "This command has no JSON output yet." } });
});

test("early configuration failures are JSON documents without the config path", async () => {
  process.env["DAP_HOME"] = join(scratch, "TEST-SENTINEL-a"); process.env["ARTROOM_HOME"] = join(scratch, "TEST-SENTINEL-b");
  const conflict = documentOf(await main(["remote", "--json"]));
  expect(conflict).toEqual({ v: 1, command: ["remote"], phase: "preflight", status: "usage", exit: 2, error: { kind: "local", code: "config-home-conflict",
    message: "DAP_HOME and ARTROOM_HOME name different directories. Set only one, or set both to the same directory; no configuration was read or changed." } });
  // STAND-IN: a config of format 1, as an older command wrote it.
  const home = join(scratch, "TEST-SENTINEL-home");
  mkdirSync(home);
  writeFileSync(join(home, "config.json"), `${JSON.stringify({ v: 1, service: "https://retired.test", key: "device" })}\n`, { mode: 0o600 });
  process.env["DAP_HOME"] = home; delete process.env["ARTROOM_HOME"];
  const retired = documentOf(await main(["--json", "acts"]));
  expect(retired).toEqual({ v: 1, command: ["acts"], phase: "preflight", status: "usage", exit: 2, error: { kind: "local", code: "retired-home",
    message: "The config directory names rooms of the old format, which retired at the identifier cutover. Set a new DAP_HOME. Nothing in that directory was changed." } });
  expect(JSON.stringify([conflict, retired])).not.toContain("TEST-SENTINEL");
});

test("a finite JSON command writes one document whose exit is the process exit, for done and for a refused read", async () => {
  const home = join(scratch, "home");
  const room = await readRoom({ remote: REMOTE, store: fileStore(home) });
  process.env["DAP_HOME"] = home; delete process.env["ARTROOM_HOME"];
  const scripted = scriptedFetch(room.script);
  vi.spyOn(globalThis, "fetch").mockImplementation((async (url: unknown, init?: unknown) => scripted(String(url), init as never)) as typeof fetch);
  expect(documentOf(await main(["--json", "remote"]))).toMatchObject({ command: ["remote"], status: "done", exit: 0, result: { remoteUrl: REMOTE } });
  room.script.entry = "not-found";
  expect(documentOf(await main(["show", "destination:5", "--json"]))).toMatchObject({ command: ["show"], status: "not-found", exit: 1, error: { code: "refused" } });
  expect(documentOf(await main(["show", "--json"]))).toMatchObject({ command: ["show"], status: "usage", exit: 2, error: { code: "usage", usage: USAGE } });
  room.script.fail = new Error("TEST-SENTINEL-process");
  const lost = documentOf(await main(["acts", "--json"]));
  expect(lost).toMatchObject({ command: ["acts"], status: "unreadable", exit: 1, error: { kind: "transport", code: "no-answer" } });
  expect(JSON.stringify(lost)).not.toContain("TEST-SENTINEL");
});

/** Scripted HTTP summaries exercise the real Node command boundary, not a
 * native installation, deployment, service registration or provider. */
import { expect, test, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Item, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, keyIdOfSecret, newIncarnation, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { platform } from "@generalbusiness/dap-platform";
import { saveIndexFile, scopeIndexCommand, type IndexFiles } from "../src/scope-index-command.ts";
import { INDEX_INVENTORY_BOUNDS, type IndexManifest } from "../src/scope-index-manifest.ts";
import type { Context } from "../src/commands.ts";
import { memoryStore } from "../src/store.ts";

const service = "https://TEST-service.example";
const manifestPath = "/TEST-operator/manifest.json", outputPath = "/TEST-operator/releases.json";
const argv = ["applications", "--manifest", manifestPath, "--out", outputPath];
const sentinel = "PRIVATE-TEST-REMOTE-LOCAL-KEY-DETAIL";
const secret = new Uint8Array(32).fill(9), publisher = keyIdOfSecret(secret), release = textDigest("TEST release");
function ref(kind: ScopeRef["kind"], ordinal: number): ScopeRef {
  return { kind, inc: newIncarnation(new Uint8Array(16).fill(ordinal % 250 + 1)),
    scope: scopeIdOf({ v: 1, kind, definition: textDigest("TEST definition"), creator: null, cause: textDigest("TEST listing"), ordinal }) };
}
function installation(id: number, host = "git.example.test"): Item {
  return { id, type: "installation", state: "active", revision: 1, opened: textDigest(`TEST item ${id}`), parties: {}, attributed: [],
    refs: { scope: ref("lane", id + 1000), membership: ref("membership", 1), destination: ref("destination", 2) },
    values: { release, publisher, definition: textDigest("TEST definition"), semantic: textDigest("TEST semantic"), presentation: textDigest("TEST presentation"),
      uri: `git+https://${host}/private-repository.git/@${"a".repeat(40)}/private-package.json`, additions: sentinel, declarations: sentinel, genesis: sentinel } };
}
function summary(scope: ScopeRef, items: readonly Item[] = []): unknown {
  const definition = scope.kind === "rules" ? "platform:rules@12" : "platform:directory@19";
  const data = platform(definition)!.data;
  const value: Summary = { scope, status: "active", definition, time: "2026-10-27T12:00:00Z", items,
    counts: Object.entries(data.items).flatMap(([name, type]) => Object.keys(type.states).map(state =>
      [name, state, items.filter(item => item.type === name && item.state === state).length] as [string, string, number])) };
  return { ok: true, at: { seq: 100, hash: textDigest("TEST summary head") }, complete: true, value };
}
function fixture(ruleCount = 1) {
  const root = ref("directory", 0), rules = Array.from({ length: ruleCount }, (_, i) => ref("rules", i + 1));
  const manifest: IndexManifest = { v: 1, service: service.toLowerCase(), root,
    scopes: [root, ...rules].map(at => ({ at, genesis: textDigest(`TEST manifest ${at.scope}`) })).sort((a, b) => a.at.scope.localeCompare(b.at.scope)) };
  let saved = utf8(canonicalize(manifest)), published: Uint8Array | undefined;
  const calls: { url: string; method: string }[] = [], local: string[] = [];
  let respond: (at: ScopeRef) => Promise<Awaited<ReturnType<Fetch>>> = async at => Response.json(summary(at, at.kind === "rules" ? [installation(2)] : []));
  const files: IndexFiles = { read: async path => { expect(path).toBe(manifestPath); local.push("manifest"); return saved; },
    save: async (path, bytes) => { expect(path).toBe(outputPath); local.push("output"); published = bytes; } };
  const denied = async (): Promise<never> => { throw Error(sentinel); };
  const ctx: Context = { now: () => Date.parse("2026-10-27T12:00:00Z"), store: { ...memoryStore(),
    config: async () => { local.push("config"); return { v: 1, service, key: "TEST-device", repository: { directory: root, membership: ref("membership", 1), rules: rules[0]?.scope ?? root.scope, destination: ref("destination", 2).scope } }; },
    signer: async () => { local.push("signer"); return secretSigner(secret); },
    secret: denied, save: denied, keep: denied, private: denied, keepPrivate: denied, newSigner: denied },
    fetch: async (url, init) => {
      calls.push({ url, method: init?.method ?? "GET" });
      expect(init?.method === "GET" && init.body === undefined).toBe(true);
      expect(init?.headers?.["authorization"]?.startsWith("Signed ")).toBe(true);
      const options = init as typeof init & { redirect?: string; credentials?: string };
      expect(options?.redirect).toBe("error"); expect(options?.credentials).toBe("omit");
      const at = manifest.scopes.find(row => url === `${manifest.service}/v1/scopes/${row.at.scope}`)?.at;
      if (!at) throw Error(sentinel);
      return respond(at);
    } };
  return { ctx, files, manifest, root, rules, calls, local, saved: () => saved, replaceManifest: (bytes: Uint8Array) => { saved = bytes; },
    published: () => published, respond: (next: typeof respond) => { respond = next; } };
}

// Invariant: the command validates its exact manifest before key custody or
// network and never authenticates malformed/foreign/oversized input.
test("application listing validates locally before reading key custody or requesting a summary", async () => {
  const f = fixture();
  for (const bytes of [utf8(sentinel), utf8(canonicalize({ ...f.manifest, service: "https://foreign.test" })), new Uint8Array(INDEX_INVENTORY_BOUNDS.bytes + 1)]) {
    f.replaceManifest(bytes);
    expect(await scopeIndexCommand(f.ctx, argv, f.files)).toEqual({ code: 1, lines: ['{"error":"manifest-invalid"}'] });
  }
  expect(f.calls).toEqual([]); expect(f.local).not.toContain("signer"); expect(f.local).not.toContain("output");
  for (const args of [["applications"], [...argv, "extra"], ["applications", "--out", outputPath, "--manifest", manifestPath]]) expect((await scopeIndexCommand(f.ctx, args, f.files)).code).toBe(2);
});

// Invariant: listed scope observations cause exactly one GET each, with no
// session/fallback/mutation/store write; errors remain distinct from empty.
test("application listing reads each scope once and saves metadata with explicit unreadable and malformed errors", async () => {
  const f = fixture(4);
  f.respond(async at => {
    if (at.scope === f.rules[1]!.scope) return Response.json(summary(at));
    if (at.scope === f.rules[2]!.scope) return Response.json({ ok: false, reason: "forbidden" });
    if (at.scope === f.rules[3]!.scope) return Response.json(summary(at, [{ ...installation(2), values: { ...installation(2).values, publisher: sentinel } }]));
    return Response.json(summary(at, at.kind === "rules" ? [installation(2)] : []));
  });
  const outcome = await scopeIndexCommand(f.ctx, argv, f.files);
  expect(outcome.code).toBe(1);
  const report = JSON.parse(new TextDecoder().decode(f.published()!));
  expect(Object.keys(report)).toEqual(["manifestPath", "manifestDigest", "applications", "errors"]);
  expect(report.manifestPath).toBe(manifestPath); expect(report.manifestDigest).toBe(digestBytes(f.saved()));
  expect(report.applications).toEqual([{ scope: ref("lane", 1002), installItem: { scope: f.rules[0], item: 2 }, release, publisher, host: "git.example.test" }]);
  expect(report.errors).toEqual(expect.arrayContaining([{ scope: f.rules[2], why: "forbidden" }, { scope: f.rules[3], why: "malformed-installation" }]));
  expect(report.errors).toHaveLength(2);
  expect(f.calls).toEqual(f.manifest.scopes.map(({ at }) => ({ url: `${f.manifest.service}/v1/scopes/${at.scope}`, method: "GET" })));
  expect(f.local.filter(value => value === "signer")).toHaveLength(1);
  expect(f.local.indexOf("manifest")).toBeLessThan(f.local.indexOf("signer"));
  const allOutput = JSON.stringify({ report, outcome });
  for (const privateValue of [sentinel, service.toLowerCase(), "private-repository", "Signed ", "TEST-device"]) expect(allOutput.includes(privateValue)).toBe(false);
  expect(JSON.parse(outcome.lines[0]!)).toMatchObject({ manifestPath, manifestDigest: report.manifestDigest, status: "incomplete" });
});

// Invariant: provider/local exceptions and redirect responses never escape
// as output or trigger fallback reads; a bounded-out observation is an error.
test("application listing withholds private failures and refuses redirects and oversized responses", async () => {
  for (const respond of [
    async () => { throw Error(sentinel); },
    async () => new Response(JSON.stringify(summary(ref("directory", 0))), { status: 302, headers: { location: `https://${sentinel}.test` } }),
    async () => new Response(" ".repeat(4 * 1024 * 1024 + 1)),
  ]) {
    const f = fixture(0); f.respond(respond);
    const outcome = await scopeIndexCommand(f.ctx, argv, f.files);
    const report = JSON.parse(new TextDecoder().decode(f.published()!));
    expect(outcome.code).toBe(1); expect(report.applications).toEqual([]);
    expect(report.errors).toEqual([{ scope: f.root, why: "unavailable" }]); expect(f.calls).toHaveLength(1);
    expect(JSON.stringify({ outcome, report }).includes(sentinel)).toBe(false);
  }
  const f = fixture();
  f.ctx.store.signer = async () => { throw Error(sentinel); };
  const outcome = await scopeIndexCommand(f.ctx, argv, f.files);
  expect(outcome.code).toBe(1); expect(outcome.lines.join(" ").includes(sentinel)).toBe(false);
  expect(f.calls).toEqual([]); expect(f.published()).toBeUndefined();
});

// Invariant: one request plus its response has a finite 30-second caller
// deadline, including a supplied fetch that never answers.
test("application listing stops an unanswered summary at the existing transport deadline", async () => {
  vi.useFakeTimers();
  try {
    const f = fixture(0); f.respond(() => new Promise(() => undefined));
    const running = scopeIndexCommand(f.ctx, argv, f.files);
    await vi.advanceTimersByTimeAsync(30_001);
    expect((await running).code).toBe(1);
    expect(f.calls).toHaveLength(1);
    expect(JSON.parse(new TextDecoder().decode(f.published()!)).errors).toEqual([{ scope: f.root, why: "unavailable" }]);
  } finally { vi.useRealTimers(); }
});

// Invariant: complete-empty is explicit success, while publication is
// exclusive and exceeding the real output cap publishes no partial file.
test("application listing keeps empty success distinct from exclusive publication and output bounds", async () => {
  const empty = fixture(0);
  expect((await scopeIndexCommand(empty.ctx, argv, empty.files)).code).toBe(0);
  expect(JSON.parse(new TextDecoder().decode(empty.published()!))).toMatchObject({ applications: [], errors: [] });
  const directory = await mkdtemp(join(tmpdir(), "dap-application-listing-")), output = join(directory, "existing.json");
  try {
    await writeFile(output, sentinel);
    const f = fixture(0);
    const outcome = await scopeIndexCommand(f.ctx, ["applications", "--manifest", manifestPath, "--out", output], { read: f.files.read, save: saveIndexFile });
    expect(outcome.code).toBe(1); expect(JSON.parse(outcome.lines[0]!).error).toBe("output-unavailable");
    expect(await readFile(output, "utf8")).toBe(sentinel); expect(outcome.lines.join(" ").includes(sentinel)).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
  const full = fixture(100), items = Array.from({ length: 64 }, (_, i) => installation(i, "a".repeat(3000) + ".test"));
  full.respond(async at => Response.json(summary(at, at.kind === "rules" ? items : [])));
  const outcome = await scopeIndexCommand(full.ctx, argv, full.files);
  expect(outcome.code).toBe(1); expect(JSON.parse(outcome.lines[0]!).error).toBe("output-too-large");
  expect(full.published()).toBeUndefined(); expect(full.local).not.toContain("output");
});

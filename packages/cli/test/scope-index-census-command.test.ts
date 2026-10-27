/** Scripted index/HTTP observations exercise the Node command and unchanged
 * manifest/version guards. They prove no Native index or operator authority. */
import { expect, test, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entry, ScopeRef, Seed, Sealed, SignedRead } from "@generalbusiness/dap-contract";
import { factRefOf, newIncarnation, parseStrictBytes, scopeIdOf, textDigest, unb64url, utf8, verifySignedRead, type ByteStream } from "@generalbusiness/dap-bytes";
import { secretSigner, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_PUBLICATION_COHORT } from "@generalbusiness/dap-platform";
import { scopeIndexCommand, saveIndexFile, type IndexFiles } from "../src/scope-index-command.ts";
import { INDEX_INVENTORY_BOUNDS, indexManifestVersions, readIndexManifest, type IndexScope } from "../src/scope-index-manifest.ts";
import { SCOPE_INDEX_CENSUS_BOUNDS, SCOPE_INDEX_CENSUS_QUALIFICATION } from "../src/scope-index-census-command.ts";
import type { Context, Outcome } from "../src/commands.ts";
import { memoryStore, type Config } from "../src/store.ts";

const service = "https://TEST-census.example", outPath = "/TEST-operator/census.json";
const sentinel = "PRIVATE-TEST-CENSUS-ERROR-SETTINGS-CREDENTIAL";
const actor = secretSigner(new Uint8Array(32).fill(17));
const cause = textDigest("TEST registered scope fleet"), now = Date.parse("2026-10-27T12:00:00Z");
type Registered = { row: IndexScope; birth: Sealed };
function fleet(count: number): Registered[] {
  return Array.from({ length: count }, (_, ordinal) => {
    const kind = ordinal === 0 ? "directory" : ordinal === 1 ? "register" : "rules";
    const seed: Seed = { v: 1, kind, definition: ARCHIVE_DEVICE_PUBLICATION_COHORT[kind], creator: null, cause, ordinal };
    const at: ScopeRef = { kind, scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(ordinal % 250 + 1)) };
    const entry: Entry = { v: 1, at, seq: 0, prev: null, time: "2026-10-27T12:00:00Z", clamped: false, epoch: 0,
      input: { type: "genesis", seed, inc: at.inc, kind: "create", founding: null, source: null, n: null, message: null, decision: "applied" },
      uses: [], prepared: [], effects: [], sends: [] };
    const birth = { entry, hash: factRefOf(entry).hash };
    return { row: { at, genesis: birth.hash }, birth };
  }).sort((a, b) => a.row.at.scope < b.row.at.scope ? -1 : 1);
}
function fixture(count: number | Registered[] = 3) {
  const registered = typeof count === "number" ? fleet(count) : count, root = registered.find(value => value.row.at.kind === "directory")!.row.at;
  const register = registered.find(value => value.row.at.kind === "register")!.row.at;
  let config: Config | null = { v: 1, service, key: "PRIVATE-TEST-DEVICE-NAME", register,
    repository: { directory: root, membership: { ...root, kind: "membership" }, rules: root.scope, destination: root.scope } };
  let published: Uint8Array | undefined;
  let signer: () => Promise<Signer | null> = async () => actor;
  const calls: { cursor: string; method: string; authorization: string }[] = [], local: string[] = [];
  const page = (cursor: string, size = SCOPE_INDEX_CENSUS_BOUNDS.pageSize) => {
    const first = registered.findIndex(value => value.row.at.scope > cursor), remaining = first < 0 ? [] : registered.slice(first);
    const rows = remaining.slice(0, size).map(value => value.row);
    return { rows, next: remaining.length > size ? rows.at(-1)!.at.scope : null };
  };
  let respond: (cursor: string, number: number) => Promise<Awaited<ReturnType<Fetch>>> = async cursor => Response.json(page(cursor));
  const denied = async (): Promise<never> => { local.push("forbidden-local-write-or-secret"); throw Error(sentinel); };
  const files: IndexFiles = { read: async () => { throw Error("census must not read a manifest"); }, save: async (path, bytes) => {
    expect(path).toBe(outPath); local.push("save-manifest"); published = bytes;
  } };
  const ctx: Context = { now: () => now, store: { ...memoryStore(), config: async () => { local.push("config"); return config; },
    signer: async () => { local.push("signer"); return signer(); }, secret: denied, save: denied, keep: denied, private: denied, keepPrivate: denied, newSigner: denied },
    fetch: async (url, init) => {
      const request = new URL(url), options = init as typeof init & { redirect?: string; credentials?: string };
      expect(request.origin).toBe(service.toLowerCase()); expect(request.pathname).toBe("/v1/scope-index/census");
      expect([...request.searchParams.keys()]).toEqual(["cursor", "limit"]); expect(request.searchParams.get("limit")).toBe("100");
      expect(init?.method).toBe("GET"); expect(init?.body).toBeUndefined(); expect(options?.redirect).toBe("error"); expect(options?.credentials).toBe("omit");
      const cursor = request.searchParams.get("cursor")!, authorization = init?.headers?.["authorization"] ?? "";
      expect(authorization.startsWith("Signed ")).toBe(true);
      const signed = parseStrictBytes(unb64url(authorization.slice(7))!) as SignedRead;
      expect(verifySignedRead(signed)).toBe(true);
      expect(signed.request).toEqual({ v: 1, to: register.scope, actor: actor.key, read: "census", arg: cursor, notAfter: "2026-10-27T12:01:00Z" });
      calls.push({ cursor, method: init!.method!, authorization });
      return respond(cursor, calls.length);
    } };
  return { ctx, files, registered, root, register, calls, local, page, published: () => published,
    config: (next: Config | null) => { config = next; }, currentConfig: () => config!, signer: (next: typeof signer) => { signer = next; },
    respond: (next: typeof respond) => { respond = next; }, run: () => scopeIndexCommand(ctx, ["census", "--out", outPath], files) };
}
function report(outcome: Outcome) {
  expect(outcome.lines).toHaveLength(1);
  const value = JSON.parse(outcome.lines[0]!) as { v: number; outcome: string; rows: number; pages: number; startedAt: string; endedAt: string; written: boolean; cursor?: string; reason?: string };
  expect(Object.keys(value).every(key => ["v", "outcome", "rows", "pages", "startedAt", "endedAt", "written", "cursor", "reason"].includes(key))).toBe(true);
  expect(value.v).toBe(1); expect(Date.parse(value.endedAt)).toBeGreaterThanOrEqual(Date.parse(value.startedAt));
  expect(value.written).toBe(value.outcome === "complete"); expect(outcome.code === 0).toBe(value.outcome === "complete");
  expect(outcome.lines[0]).not.toContain(sentinel); expect(outcome.lines[0]).not.toContain("Signed ");
  expect(outcome.lines[0]).not.toContain("PRIVATE-TEST-DEVICE-NAME"); expect(outcome.lines[0]).not.toContain(outPath);
  return value;
}

// Invariant: every registered row across pages becomes the existing manifest,
// which the unchanged entry-0/hash/pin algorithm consumes without a new schema.
test("census saves a complete multi-page registered fleet for the unchanged manifest and versions reader", async () => {
  const f = fixture(101), result = report(await f.run());
  expect(result).toMatchObject({ outcome: "complete", rows: 101, pages: 2, written: true });
  expect(Object.keys(result)).toEqual(["v", "outcome", "rows", "pages", "startedAt", "endedAt", "written"]);
  const manifest = readIndexManifest(f.published()!, service, f.root);
  expect(Object.keys(manifest)).toEqual(["v", "service", "root", "scopes"]);
  expect(manifest.scopes).toEqual(f.registered.map(value => value.row));
  expect(f.calls.map(call => call.cursor)).toEqual(["", f.registered[99]!.row.at.scope]);
  expect(f.local).toEqual(["config", "signer", "save-manifest"]);
  const read: string[] = [], births = new Map(f.registered.map(value => [value.row.at.scope, value.birth]));
  const versions = await indexManifestVersions(manifest, { entry: async (scope, seq) => {
    expect(seq).toBe(0); read.push(scope); const value = births.get(scope)!;
    return { ok: true, value, at: { seq: 0, hash: value.hash }, complete: true };
  }, history: async () => { expect.fail("versions must not discover history"); } });
  expect(versions.ready).toBe(true); expect(versions.listed).toBe(101);
  expect(versions.rows).toEqual(f.registered.map(({ row, birth }) => ({ at: row.at, result: "verified", definition: (birth.entry.input as Extract<Entry["input"], { type: "genesis" }>).seed.definition })));
  expect(read).toEqual(manifest.scopes.map(row => row.at.scope));
  expect(SCOPE_INDEX_CENSUS_QUALIFICATION).toContain("below an already passed cursor");
  expect(SCOPE_INDEX_CENSUS_QUALIFICATION).toContain("Unregistered legacy objects");
});

// Invariant: explicit end, including a full final page, stops pagination;
// empty/absent/unsupported/refused never masquerade as a saved manifest.
test("census respects a full explicit final page and separates empty, fixed refusals and an unregistered root", async () => {
  const full = fixture(100);
  expect(report(await full.run())).toMatchObject({ outcome: "complete", rows: 100, pages: 1 });
  expect(full.calls).toHaveLength(1);
  for (const [status, error] of [[403, "forbidden"], [404, "absent"], [501, "unsupported"]] as const) {
    const f = fixture(); f.respond(async () => Response.json({ error }, { status }));
    expect(report(await f.run())).toMatchObject({ outcome: error, reason: error, rows: 0, pages: 1, cursor: "", written: false });
    expect(f.published()).toBeUndefined(); expect(f.calls).toHaveLength(1);
  }
  const empty = fixture(); empty.respond(async () => Response.json({ rows: [], next: null }));
  expect(report(await empty.run())).toMatchObject({ outcome: "empty", rows: 0, pages: 1 }); expect(empty.published()).toBeUndefined();
  const omitted = fixture(); omitted.respond(async () => Response.json({ rows: omitted.registered.filter(value => value.row.at.scope !== omitted.root.scope).map(value => value.row), next: null }));
  expect(report(await omitted.run())).toMatchObject({ outcome: "root-unregistered", written: false }); expect(omitted.published()).toBeUndefined();
  const incarnation = fixture(); incarnation.respond(async () => Response.json({ rows: incarnation.registered.map(({ row }) => row.at.scope === incarnation.root.scope
    ? { ...row, at: { ...row.at, inc: newIncarnation(new Uint8Array(16).fill(251)) } } : row), next: null }));
  expect(report(await incarnation.run())).toMatchObject({ outcome: "root-unregistered", written: false }); expect(incarnation.published()).toBeUndefined();
  const missing = fixture(), withoutRoot = { ...missing.currentConfig() }; delete withoutRoot.repository; missing.config(withoutRoot);
  expect(report(await missing.run())).toMatchObject({ outcome: "root-unregistered", pages: 0 });
  expect(missing.calls).toEqual([]); expect(missing.local).toEqual(["config"]);
});

// Invariant: a failed page reports its input cursor without a subset file,
// retry, session, or disclosure of a raw remote error, header or local error.
test("census preserves the failed page cursor and withholds arbitrary remote and local failures", async () => {
  for (const failure of [
    async () => Response.json({ error: "unavailable" }, { status: 503 }),
    async () => Response.json({ error: "rate-limited" }, { status: 429 }),
    async () => { throw Error(sentinel); },
    async () => new Response(sentinel, { status: 404 }),
    async () => Response.json({ error: "absent", private: sentinel }, { status: 404 }),
  ]) {
    const f = fixture(101); f.respond(async (cursor, number) => number === 1 ? Response.json(f.page(cursor)) : failure());
    const value = report(await f.run());
    expect(value).toMatchObject({ outcome: "page-failed", rows: 100, pages: 2, cursor: f.registered[99]!.row.at.scope, written: false });
    expect(["unavailable", "rate-limited", "request-failed", "invalid-reply"]).toContain(value.reason);
    expect(f.published()).toBeUndefined(); expect(f.local).not.toContain("save-manifest"); expect(f.calls).toHaveLength(2);
    expect(f.calls.every(call => call.method === "GET")).toBe(true);
  }
  const signer = fixture(); signer.signer(async () => { throw Error(sentinel); });
  expect(report(await signer.run())).toMatchObject({ outcome: "page-failed", reason: "signer-unavailable", pages: 0 });
  expect(signer.calls).toEqual([]); expect(signer.published()).toBeUndefined();
});

// Invariant: only a closed, increasing page of full references/digests and
// its exact last-row cursor can progress; no response text becomes a label.
test("census refuses malformed identities, ordering, page envelopes and cursors before publication", async () => {
  const f = fixture(), rows = f.registered.map(value => value.row);
  const bad: unknown[] = [
    { rows, next: null, private: sentinel }, { rows },
    { rows: [{ ...rows[0], private: sentinel }], next: null },
    { rows: [{ ...rows[0], at: { ...rows[0]!.at, inc: sentinel } }], next: null },
    { rows: [{ ...rows[0], genesis: sentinel }], next: null },
    { rows: [rows[0], rows[0]], next: null }, { rows: [...rows].reverse(), next: null },
    { rows, next: rows[0]!.at.scope }, { rows, next: sentinel }, { rows: [], next: rows[0]!.at.scope },
  ];
  for (const reply of bad) {
    const next = fixture(); next.respond(async () => Response.json(reply));
    expect(report(await next.run())).toMatchObject({ outcome: "page-failed", pages: 1, cursor: "", written: false });
    expect(next.calls).toHaveLength(1); expect(next.published()).toBeUndefined();
  }
  const repeated = fixture(101); repeated.respond(async (cursor, number) => number === 1 ? Response.json(repeated.page(cursor)) : Response.json({ rows: [repeated.registered[99]!.row], next: null }));
  expect(report(await repeated.run())).toMatchObject({ outcome: "page-failed", reason: "invalid-row", pages: 2, rows: 100, cursor: repeated.registered[99]!.row.at.scope });
  const duplicateKey = fixture(); duplicateKey.respond(async () => new Response('{"rows":[],"rows":[],"next":null}'));
  expect(report(await duplicateKey.run())).toMatchObject({ outcome: "page-failed", reason: "invalid-reply" });
});

// Invariant: the existing 4096-row allowance and derived attempt ceiling
// cannot be refilled by pagination, and crossing either publishes nothing.
test("census fits exactly the existing row bound and refuses a next row or excessive partial pages", async () => {
  const all = fleet(INDEX_INVENTORY_BOUNDS.scopes + 1), exactRows = [...all];
  exactRows.splice(exactRows.findIndex(value => value.row.at.kind === "rules"), 1);
  const exact = fixture(exactRows);
  expect(report(await exact.run())).toMatchObject({ outcome: "complete", rows: INDEX_INVENTORY_BOUNDS.scopes,
    pages: Math.ceil(INDEX_INVENTORY_BOUNDS.scopes / SCOPE_INDEX_CENSUS_BOUNDS.pageSize) });
  expect(readIndexManifest(exact.published()!, service, exact.root).scopes).toHaveLength(INDEX_INVENTORY_BOUNDS.scopes);
  const extra = fixture(all);
  expect(report(await extra.run())).toMatchObject({ outcome: "over-bound", reason: "row-limit", pages: 41, written: false });
  expect(extra.published()).toBeUndefined(); expect(extra.calls).toHaveLength(41);
  const pages = fixture(SCOPE_INDEX_CENSUS_BOUNDS.pages + 1); pages.respond(async cursor => Response.json(pages.page(cursor, 1)));
  expect(SCOPE_INDEX_CENSUS_BOUNDS.pages).toBe(Math.ceil(INDEX_INVENTORY_BOUNDS.scopes / 100) + 1);
  expect(report(await pages.run())).toMatchObject({ outcome: "over-bound", reason: "page-limit", rows: SCOPE_INDEX_CENSUS_BOUNDS.pages, pages: SCOPE_INDEX_CENSUS_BOUNDS.pages });
  expect(pages.calls).toHaveLength(SCOPE_INDEX_CENSUS_BOUNDS.pages); expect(pages.published()).toBeUndefined();
});

// Invariant: raw reply bytes share one allowance across pages; an excess
// byte is cancelled before parsing and cannot produce a partial manifest.
test("census shares one byte allowance across bodies and refuses redirects without another request", async () => {
  for (const extra of [0, 1]) {
    const f = fixture(101), half = SCOPE_INDEX_CENSUS_BOUNDS.bytes / 2; let cancelled = 0;
    f.respond(async (cursor, number) => {
      const text = JSON.stringify(f.page(cursor)), length = half + (number === 2 ? extra : 0), bytes = utf8(text + " ".repeat(length - text.length));
      let sent = false;
      const body: ByteStream = { getReader: () => ({ read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
        cancel: async () => { cancelled++; } }) };
      return { status: 200, body };
    });
    expect(report(await f.run())).toMatchObject(extra === 0 ? { outcome: "complete", pages: 2, rows: 101 } : { outcome: "over-bound", reason: "byte-limit", pages: 2, rows: 100 });
    expect(cancelled).toBe(extra); expect(f.published() === undefined).toBe(extra === 1);
  }
  const redirect = fixture(); redirect.respond(async () => new Response(sentinel, { status: 302, headers: { location: `https://${sentinel}.test` } }));
  expect(report(await redirect.run())).toMatchObject({ outcome: "page-failed", reason: "redirect-refused", pages: 1 });
  expect(redirect.calls).toHaveLength(1); expect(redirect.published()).toBeUndefined();
});

// Invariant: custody, fetch and bodies share the original deadline; even a
// provider ignoring cancellation cannot trigger later reads or publication.
test("census expires late custody, fetch and body results without publishing or resetting its deadline", async () => {
  vi.useFakeTimers();
  try {
    const custody = fixture(); let releaseSigner!: (value: Signer) => void;
    custody.signer(() => new Promise<Signer | null>(resolve => { releaseSigner = resolve; }));
    const waitingSigner = custody.run(); await vi.advanceTimersByTimeAsync(30_001);
    expect(report(await waitingSigner)).toMatchObject({ outcome: "page-failed", reason: "timeout", pages: 0 });
    releaseSigner(actor); await vi.advanceTimersByTimeAsync(0);
    expect(custody.calls).toEqual([]); expect(custody.published()).toBeUndefined();

    const signing = fixture(); let releaseSignature!: () => void;
    const signatureGate = new Promise<void>(resolve => { releaseSignature = resolve; });
    signing.signer(async () => ({ key: actor.key, sign: async bytes => { await signatureGate; return actor.sign(bytes); } }));
    const waitingSignature = signing.run(); await vi.advanceTimersByTimeAsync(30_001);
    expect(report(await waitingSignature)).toMatchObject({ outcome: "page-failed", reason: "timeout", pages: 0 });
    releaseSignature(); await vi.advanceTimersByTimeAsync(0);
    expect(signing.calls).toEqual([]); expect(signing.published()).toBeUndefined();

    const fetch = fixture(); let releaseFetch!: (response: Awaited<ReturnType<Fetch>>) => void, lateReads = 0, lateCancel = 0;
    fetch.respond(() => new Promise<Awaited<ReturnType<Fetch>>>(resolve => { releaseFetch = resolve; }));
    const waitingFetch = fetch.run(); await vi.advanceTimersByTimeAsync(30_001);
    expect(report(await waitingFetch)).toMatchObject({ outcome: "page-failed", reason: "timeout", pages: 1, cursor: "" });
    releaseFetch({ status: 200, body: { getReader: () => ({ read: async () => { lateReads++; return { done: true }; }, cancel: async () => { lateCancel++; } }) } });
    await vi.advanceTimersByTimeAsync(0);
    expect(lateReads).toBe(0); expect(lateCancel).toBe(1); expect(fetch.published()).toBeUndefined();

    const body = fixture(101); let releaseBody!: (part: { done: boolean; value?: Uint8Array }) => void, bodyCancel = 0;
    body.respond(async (cursor, number) => {
      if (number === 1) { await new Promise(resolve => setTimeout(resolve, 20_000)); return Response.json(body.page(cursor)); }
      return { status: 200, body: { getReader: () => ({ read: () => new Promise<{ done: boolean; value?: Uint8Array }>(resolve => { releaseBody = resolve; }), cancel: async () => { bodyCancel++; } }) } };
    });
    const waitingBody = body.run(); await vi.advanceTimersByTimeAsync(30_001);
    expect(report(await waitingBody)).toMatchObject({ outcome: "page-failed", reason: "timeout", pages: 2, rows: 100, cursor: body.registered[99]!.row.at.scope });
    expect(bodyCancel).toBe(1); releaseBody({ done: false, value: utf8(sentinel) }); await vi.advanceTimersByTimeAsync(0);
    expect(body.calls).toHaveLength(2); expect(body.published()).toBeUndefined();
  } finally { vi.useRealTimers(); }
});

// Invariant: invalid local input touches no key/network, and complete output
// uses the original exclusive saver without replacing an existing file.
test("census validates before custody and preserves exclusive file publication with fixed private failures", async () => {
  const invalid = fixture();
  for (const argv of [["census"], ["census", "--out", "x", "extra"], ["census", "--out", "bad\0path"], ["census", "--out", "x".repeat(4097)]]) {
    expect(report(await scopeIndexCommand(invalid.ctx, argv, invalid.files))).toMatchObject({ outcome: "page-failed", reason: "invalid-arguments", pages: 0 });
  }
  expect(invalid.local).toEqual([]); expect(invalid.calls).toEqual([]);
  const config = fixture(); config.config({ ...config.currentConfig(), service: `https://user:${sentinel}@invalid.test` });
  expect(report(await config.run())).toMatchObject({ outcome: "page-failed", reason: "configuration-unavailable", pages: 0 });
  expect(config.local).toEqual(["config"]); expect(config.calls).toEqual([]);
  const directory = await mkdtemp(join(tmpdir(), "artroom-census-"));
  try {
    const path = join(directory, "census.json"), f = fixture(); await writeFile(path, sentinel);
    const files: IndexFiles = { read: f.files.read, save: saveIndexFile };
    const refused = report(await scopeIndexCommand(f.ctx, ["census", "--out", path], files));
    expect(refused).toMatchObject({ outcome: "page-failed", reason: "output-unavailable", written: false });
    expect(await readFile(path, "utf8")).toBe(sentinel);
    await rm(path);
    expect(report(await scopeIndexCommand(f.ctx, ["census", "--out", path], files))).toMatchObject({ outcome: "complete", written: true });
    expect(readIndexManifest(new Uint8Array(await readFile(path)), service, f.root).scopes).toEqual(f.registered.map(value => value.row));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

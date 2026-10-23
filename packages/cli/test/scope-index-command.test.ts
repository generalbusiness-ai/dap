import { expect, test } from "vitest";
import { mkdtemp, readFile, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entry, ScopeRef, Seed, Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, newIncarnation, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { captureIndexManifest, INDEX_INVENTORY_BOUNDS, readIndexManifest, verifyIndexManifest, type IndexReads } from "../src/scope-index-manifest.ts";
import { readIndexFile, saveIndexFile, scopeIndexCommand, type IndexFiles } from "../src/scope-index-command.ts";
import { memoryStore } from "../src/store.ts";

// Typed HTTP/history STAND-INs. These hashes bind observed bytes and sends;
// no native judgment, registration or deployment mode is proved here.
function fixture(ordinals: { root?: number; child?: number } = {}) {
  const ref = (seed: Seed, n: number): ScopeRef => ({ scope: scopeIdOf(seed), kind: seed.kind, inc: newIncarnation(new Uint8Array(16).fill(n)) });
  const registerSeed: Seed = { v: 1, kind: "register", definition: "platform:register@17", creator: null, cause: textDigest("operator inventory register"), ordinal: 0 };
  const R = ref(registerSeed, 1);
  const rootSeed: Seed = { ...registerSeed, kind: "directory", definition: "platform:directory@16", creator: R, cause: textDigest("operator inventory root"), ordinal: ordinals.root ?? 0 };
  const D = ref(rootSeed, 2);
  const otherSeed: Seed = { ...rootSeed, cause: textDigest("another room is not traversed") };
  const childSeed: Seed = { ...rootSeed, kind: "rules", definition: "platform:rules@10", creator: D, cause: textDigest("operator inventory child"), ordinal: ordinals.child ?? 0 };
  const A = ref(childSeed, 3);
  const base = (at: ScopeRef, seed: Seed): Entry => ({ v: 1, at, seq: 0, prev: null, time: "2099-01-01T00:00:00Z", clamped: false, epoch: 0,
    input: { type: "genesis", seed, inc: at.inc, kind: "create", founding: null, source: null, n: null, message: null, decision: "applied" }, uses: [], prepared: [], effects: [], sends: [] });
  const r = base(R, registerSeed);
  r.sends = [rootSeed, otherSeed].map((to, n) => ({ n, to, message: { class: "request", type: "create", body: {} } }));
  const d = base(D, rootSeed);
  if (d.input.type !== "genesis") throw Error("fixture genesis");
  d.input = { ...d.input, source: factRefOf(r), n: 0, message: { class: "request", type: "create", body: {} } };
  d.sends = [
    { n: 0, to: R, message: { class: "result", of: { from: factRefOf(r), n: 0 }, outcome: "applied" } },
    { n: 1, to: childSeed, message: { class: "request", type: "create", body: {} } },
  ];
  const a = base(A, childSeed);
  if (a.input.type !== "genesis") throw Error("fixture genesis");
  a.input = { ...a.input, source: factRefOf(d), n: 1, message: { class: "request", type: "create", body: {} } };
  const sealed = (entry: Entry): Sealed => ({ entry, hash: factRefOf(entry).hash });
  const entries = new Map([r, d, a].map(entry => [entry.at.scope, sealed(entry)]));
  const calls: string[] = [];
  const reads: IndexReads = {
    entry: async (scope, seq) => { calls.push(`entry:${scope}:${seq}`); const value = entries.get(scope)!; return { ok: true, value, at: { seq: 0, hash: value.hash }, complete: true }; },
    history: async scope => { calls.push(`history:${scope}`); const value = entries.get(scope)!; return { ok: true, value: [value], at: { seq: 0, hash: value.hash }, complete: true }; },
  };
  return { R, D, A, r, d, a, entries, calls, reads, sealed };
}

// Invariant: capture binds actual full genesis/send facts for only this room;
// incomplete or inconsistent history cannot become a complete saved manifest.
test("scope inventory observes the configured creation tree and refuses incomplete or substituted genesis", async () => {
  const f = fixture(), service = "https://service.test";
  const manifest = await captureIndexManifest(service, f.D, f.reads);
  expect(manifest.scopes.map(row => row.at.scope).sort()).toEqual([f.R.scope, f.D.scope, f.A.scope].sort());
  expect(f.calls.filter(call => call.startsWith("history:"))).toEqual([`history:${f.D.scope}`, `history:${f.A.scope}`]);
  expect(manifest.scopes.find(row => row.at.scope === f.A.scope)).toEqual({ at: f.A, genesis: factRefOf(f.a).hash });
  expect(readIndexManifest(utf8(canonicalize(manifest)), service, f.D)).toEqual(manifest);
  // Genuine native ordinal semantics: a child's result occupies n=0, so
  // its first creation has seed.ordinal=0 but send/input.n=1.
  expect(f.d.sends[1]!.n).toBe(1);
  expect(f.a.input.type === "genesis" && f.a.input.seed.ordinal).toBe(0);
  const broken = fixture();
  if (broken.a.input.type !== "genesis") throw Error("fixture genesis");
  broken.a.input = { ...broken.a.input, seed: { ...broken.a.input.seed, cause: textDigest("wrong child seed") } };
  broken.entries.set(broken.A.scope, broken.sealed(broken.a));
  await expect(captureIndexManifest(service, broken.D, broken.reads)).rejects.toThrow("applied genesis");
  let pages = 0;
  await expect(captureIndexManifest(service, f.D, { ...f.reads, history: async () => {
    pages++; return { ok: true, at: { seq: 0, hash: factRefOf(f.d).hash }, complete: false, value: [], next: "still-pending" };
  } })).rejects.toThrow("nonadvancing or oversized history cursor");
  expect(pages).toBe(1);
  await expect(captureIndexManifest(service, f.D, { ...f.reads, history: async () => ({ ok: false, reason: "archived", archived: { floor: 1, commit: "a".repeat(40), through: { seq: 1, hash: textDigest("archive") } } }) })).rejects.toThrow("archived");
  const badRegister = fixture();
  badRegister.r.sends = []; badRegister.entries.set(badRegister.R.scope, badRegister.sealed(badRegister.r));
  await expect(captureIndexManifest(service, badRegister.D, badRegister.reads)).rejects.toThrow("actual Register send");
});

// Invariant: a recorded applied label and recomputed hash cannot hide a
// different create message or an invalid creation rank on either edge.
test("scope inventory checks exact creation envelopes on root, descendant and repeated-seed paths", async () => {
  for (const where of ["root", "child"] as const) {
    for (const message of [{ class: "request", type: "create", body: { changed: true } }, { class: "request", type: "tell", body: {} }] as const) {
      const f = fixture(), entry = where === "root" ? f.d : f.a;
      if (entry.input.type !== "genesis") throw Error("fixture genesis");
      entry.input = { ...entry.input, message };
      f.entries.set(entry.at.scope, f.sealed(entry));
      await expect(captureIndexManifest("https://service.test", f.D, f.reads)).rejects.toThrow("actual creation envelope");
    }
    const f = fixture({ [where]: 1 });
    await expect(captureIndexManifest("https://service.test", f.D, f.reads)).rejects.toThrow("creation rank");
  }
  // A repeated seed must not bypass the shared envelope checker. This
  // structurally valid but inconsistent observation is not native evidence.
  const repeated = fixture(), duplicate = repeated.d.sends[1]!;
  repeated.d.sends = [...repeated.d.sends, { ...duplicate, n: 2, message: { class: "request", type: "create", body: { changed: true } } }];
  if (repeated.a.input.type !== "genesis") throw Error("fixture genesis");
  repeated.a.input = { ...repeated.a.input, source: factRefOf(repeated.d) };
  repeated.entries.set(repeated.D.scope, repeated.sealed(repeated.d));
  repeated.entries.set(repeated.A.scope, repeated.sealed(repeated.a));
  await expect(captureIndexManifest("https://service.test", repeated.D, repeated.reads)).rejects.toThrow("actual creation envelope");
});

// Invariant: a saved manifest is validated before authentication/network, and
// sweep consumes exactly its rows, retains failures and makes no authority claim.
test("operator sweep validates locally and reports exact listed genesis outcomes without inferring mode", async () => {
  const f = fixture(), manifest = await captureIndexManifest("https://service.test", f.D, f.reads);
  const store = memoryStore(); await store.keep("device", new Uint8Array(32).fill(7));
  await store.save({ v: 1, service: "https://service.test", key: "device", repository: { directory: f.D, membership: { ...f.A, kind: "membership" }, rules: f.A.scope, destination: f.A.scope } });
  let held = utf8(canonicalize({ ...manifest, service: "https://foreign.test" }));
  const calls: string[] = [], files: IndexFiles = { read: async () => held, save: async () => { throw Error("sweep must not save"); } };
  const ctx = { store, now: () => Date.parse("2099-01-01T00:00:00Z"), fetch: async (url: string, init?: { method?: string }) => {
    const parsed = new URL(url); calls.push(`${init?.method ?? "GET"}:${parsed.pathname}`);
    if (parsed.pathname.endsWith("/sessions")) return Response.json({ ok: false, reason: "sessions-unavailable" }) as never;
    const match = /\/v1\/scopes\/([^/]+)\/entries\/0$/.exec(parsed.pathname);
    if (!match) throw Error("Unexpected operator route");
    const value = f.entries.get(match[1] as ScopeRef["scope"])!;
    return Response.json({ ok: true, at: { seq: 0, hash: value.hash }, complete: true, value }) as never;
  } };
  expect((await scopeIndexCommand(ctx, ["sweep", "--manifest", "saved.json"], files)).code).toBe(1);
  expect(calls).toEqual([]);
  for (const invalid of [{ ...manifest, root: { ...f.D, inc: f.A.inc } }, { ...manifest, scopes: [...manifest.scopes, manifest.scopes[0]] }]) {
    held = utf8(canonicalize(invalid)); expect((await scopeIndexCommand(ctx, ["verify", "--manifest", "saved.json"], files)).code).toBe(1); expect(calls).toEqual([]);
  }
  held = utf8(canonicalize(manifest));
  const result = await scopeIndexCommand(ctx, ["sweep", "--manifest", "saved.json"], files);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.lines[0]!)).toMatchObject({ listed: 3, verified: 3, unavailable: 0, mismatch: 0 });
  expect(calls.filter(call => !call.endsWith("/sessions"))).toEqual(manifest.scopes.map(row => `GET:/v1/scopes/${row.at.scope}/entries/0`));
  expect(result.lines.join("\n")).toContain("no deployment mode");
  const report = await verifyIndexManifest(manifest, { ...f.reads, entry: async (scope, seq) => {
    if (scope === f.R.scope) return { ok: false, reason: "not-found" };
    const got = await f.reads.entry(scope, seq);
    if (scope !== f.A.scope || !got.ok) return got;
    return { ...got, value: { ...got.value, entry: { ...got.value.entry, at: { ...f.A, inc: f.D.inc } } } };
  } });
  expect(report).toMatchObject({ listed: 3, verified: 1, unavailable: 1, mismatch: 1 });
});

// Invariant: Node custody never replaces an existing manifest and bounds the
// actual opened input, including symlinks and oversized files, before parsing.
test("operator manifest files publish exclusively and bound opened regular inputs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "artroom-index-manifest-"));
  try {
    const path = join(directory, "inventory.json"), bytes = utf8("{}\n");
    await saveIndexFile(path, bytes); expect(await readIndexFile(path)).toEqual(bytes);
    await expect(saveIndexFile(path, utf8("replacement"))).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("{}\n");
    const alias = join(directory, "alias.json"); await symlink(path, alias);
    await expect(readIndexFile(alias)).rejects.toThrow();
    const large = join(directory, "large.json"); await writeFile(large, ""); await truncate(large, INDEX_INVENTORY_BOUNDS.bytes + 1);
    await expect(readIndexFile(large)).rejects.toThrow("16 MiB");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

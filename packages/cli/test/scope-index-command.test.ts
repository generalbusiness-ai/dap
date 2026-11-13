import { expect, test } from "vitest";
import { mkdtemp, readFile, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entry, FactRef, GenesisEntry, GenesisSelfRef, ScopeKind, ScopeRef, Seed, Sealed, SequenceEntry } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, factRefOf, newGenesisNonce, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { captureIndexManifest, INDEX_INVENTORY_BOUNDS, indexManifestVersions, readIndexManifest, verifyIndexManifest, type IndexReads } from "../src/scope-index-manifest.ts";
import { readIndexFile, saveIndexFile, scopeIndexCommand, type IndexFiles } from "../src/scope-index-command.ts";
import { memoryStore } from "../src/store.ts";
import { COMMONS_COHORT } from "@generalbusiness/dap-platform";
import { Stop } from "../src/command-support.ts";

// Typed HTTP/history STAND-INs. These hashes bind observed bytes and sends;
// no native judgment, registration or deployment mode is proved here.
function fixture(ordinals: { root?: number; child?: number; commons?: true; definitions?: { register?: Seed["definition"]; directory?: Seed["definition"]; rules?: Seed["definition"] } } = {}) {
  const time = "2099-01-01T00:00:00Z", create = { class: "request", type: "create", body: {} } as const;
  const sealed = (entry: Entry): Sealed => ({ entry, hash: entryHash(entry) });
  /** A genesis written here, one nonce byte for each. Its reference is its seed's scope ID and its own hash. */
  const birth = (seed: Seed, fill: number, from: { source: FactRef; sourceKind: ScopeKind; n: number } | null): GenesisEntry => ({ v: 1, seq: 0, prev: null, time, clamped: false, epoch: 0,
    input: { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(fill)), kind: "create", founding: null,
      ...(from ? { ...from, message: create } : { source: null, sourceKind: null, n: null, message: null }), decision: "applied" }, uses: [], prepared: [], effects: [], sends: [] });
  const refOf = (entry: Entry): ScopeRef => {
    if (entry.input.type !== "genesis") throw Error("fixture genesis");
    return { scope: scopeIdOf(entry.input.seed), genesis: entryHash(entry) };
  };
  const registerSeed: Seed = { v: 1, kind: "register", definition: ordinals.definitions?.register ?? (ordinals.commons ? COMMONS_COHORT.register : "platform:register@18"), creator: null, cause: textDigest("operator inventory register"), ordinal: 0 };
  const registerBirth = birth(registerSeed, 1, null), R = refOf(registerBirth);
  const rootSeed: Seed = { ...registerSeed, kind: "directory", definition: ordinals.definitions?.directory ?? (ordinals.commons ? COMMONS_COHORT.directory : "platform:directory@17"), creator: R, cause: textDigest("operator inventory root"), ordinal: ordinals.root ?? 0 };
  const otherSeed: Seed = { ...rootSeed, cause: textDigest("another room is not traversed") };
  // The Register's later entry creates the Directory: a creator named from a later entry is a full reference.
  const r: SequenceEntry = { v: 1, genesis: R.genesis, seq: 1, prev: R.genesis, time, clamped: false, epoch: 0, input: { type: "checkpoint", through: 0, state: textDigest("TEST register state") },
    uses: [], prepared: [], effects: [], sends: [rootSeed, otherSeed].map((to, n) => ({ n, to, message: create })) };
  const dSelf: GenesisSelfRef = { scope: scopeIdOf(rootSeed), genesis: null };
  const childSeed: Seed = { ...rootSeed, kind: "rules", definition: ordinals.definitions?.rules ?? (ordinals.commons ? COMMONS_COHORT.rules : "platform:rules@10"), creator: dSelf, cause: textDigest("operator inventory child"), ordinal: ordinals.child ?? (ordinals.commons ? 1 : 0) };
  // Commons Directory birth creates Membership, Rules, Destination, Commons in
  // this order. These remain scripted observations; no native judge runs here.
  const siblings: Seed[] = ordinals.commons ? [
    { ...childSeed, kind: "membership", definition: COMMONS_COHORT.membership, ordinal: 0 },
    childSeed,
    { ...childSeed, kind: "destination", definition: COMMONS_COHORT.destination, ordinal: 2 },
    { ...childSeed, kind: "commons", definition: COMMONS_COHORT.commons, ordinal: 3 },
  ] : [childSeed];
  const d = birth(rootSeed, 2, { source: factRefOf(r, R), sourceKind: "register", n: 0 });
  d.sends = [
    { n: 0, to: R, message: { class: "result", of: { from: factRefOf(r, R), n: 0 }, outcome: "applied" } },
    ...siblings.map((to, index) => ({ n: index + 1, to, message: create })),
  ];
  const D = refOf(d);
  const a = birth(childSeed, 3, { source: factRefOf(d, D), sourceKind: "directory", n: ordinals.commons ? 2 : 1 });
  const A = refOf(a);
  const extras = siblings.flatMap((seed, index) => seed === childSeed ? [] : [birth(seed, index + 4, { source: factRefOf(d, D), sourceKind: "directory", n: index + 1 })]);
  const entries = new Map([registerBirth, d, a, ...extras].map(entry => [refOf(entry).scope, sealed(entry)]));
  /** The Register's entry at position 1, the one that creates the Directory. */
  const registerLater = { value: sealed(r) };
  /** Seal a changed genesis again under its scope ID. */
  const put = (entry: Entry) => { entries.set(refOf(entry).scope, sealed(entry)); };
  const calls: string[] = [];
  const reads: IndexReads = {
    entry: async (scope, seq) => { calls.push(`entry:${scope}:${seq}`); const value = scope === R.scope && seq === 1 ? registerLater.value : entries.get(scope)!; return { ok: true, value, at: { seq: value.entry.seq, hash: value.hash }, complete: true }; },
    history: async scope => { calls.push(`history:${scope}`); const value = entries.get(scope)!; return { ok: true, value: [value], at: { seq: 0, hash: value.hash }, complete: true }; },
  };
  return { R, D, A, r, d, a, extras, entries, registerLater, put, refOf, calls, reads, sealed };
}

// Invariant: capture binds actual full genesis/send facts for only this room;
// incomplete or inconsistent history cannot become a complete saved manifest.
test("scope inventory observes the configured creation tree and refuses incomplete or substituted genesis", async () => {
  const f = fixture(), service = "https://service.test";
  const manifest = await captureIndexManifest(service, f.D, f.reads);
  expect(manifest.scopes.map(row => row.at.scope).sort()).toEqual([f.R.scope, f.D.scope, f.A.scope].sort());
  expect(f.calls.filter(call => call.startsWith("history:"))).toEqual([`history:${f.D.scope}`, `history:${f.A.scope}`]);
  expect(manifest.scopes.find(row => row.at.scope === f.A.scope)).toEqual({ at: f.A, kind: "rules" });
  expect(readIndexManifest(utf8(canonicalize(manifest)), service, f.D)).toEqual(manifest);
  // Genuine native ordinal semantics: a child's result occupies n=0, so
  // its first creation has seed.ordinal=0 but send/input.n=1.
  expect(f.d.sends[1]!.n).toBe(1);
  expect(f.a.input.type === "genesis" && f.a.input.seed.ordinal).toBe(0);
  const broken = fixture();
  if (broken.a.input.type !== "genesis") throw Error("fixture genesis");
  broken.a.input = { ...broken.a.input, seed: { ...broken.a.input.seed, cause: textDigest("wrong child seed") } };
  broken.put(broken.a);
  await expect(captureIndexManifest(service, broken.D, broken.reads)).rejects.toThrow("wrong entry identity");
  let pages = 0;
  await expect(captureIndexManifest(service, f.D, { ...f.reads, history: async () => {
    pages++; return { ok: true, at: { seq: 0, hash: entryHash(f.d) }, complete: false, value: [], next: "still-pending" };
  } })).rejects.toThrow("nonadvancing or oversized history cursor");
  expect(pages).toBe(1);
  await expect(captureIndexManifest(service, f.D, { ...f.reads, history: async () => ({ ok: false, reason: "archived", archived: { floor: 1, commit: "a".repeat(40), through: { seq: 1, hash: textDigest("archive") } } }) })).rejects.toThrow("archived");
  const badRegister = fixture();
  badRegister.r.sends = []; badRegister.registerLater.value = badRegister.sealed(badRegister.r);
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
      f.put(entry);
      // A changed Directory genesis has another hash, so the configured reference is that genesis's own.
      await expect(captureIndexManifest("https://service.test", where === "root" ? f.refOf(entry) : f.D, f.reads)).rejects.toThrow("actual creation envelope");
    }
    const f = fixture({ [where]: 1 });
    await expect(captureIndexManifest("https://service.test", f.D, f.reads)).rejects.toThrow("creation rank");
  }
  // A repeated seed must not bypass the shared envelope checker. This
  // structurally valid but inconsistent observation is not native evidence.
  const repeated = fixture(), duplicate = repeated.d.sends[1]!;
  repeated.d.sends = [...repeated.d.sends, { ...duplicate, n: 2, message: { class: "request", type: "create", body: { changed: true } } }];
  if (repeated.a.input.type !== "genesis" || repeated.a.input.source === null) throw Error("fixture genesis with a source");
  const repeatedD = repeated.refOf(repeated.d);
  repeated.a.input = { ...repeated.a.input, source: factRefOf(repeated.d, repeatedD) };
  repeated.put(repeated.d);
  repeated.put(repeated.a);
  await expect(captureIndexManifest("https://service.test", repeatedD, repeated.reads)).rejects.toThrow("actual creation envelope");
});

// Invariant: a saved manifest is validated before authentication/network, and
// sweep consumes exactly its rows, retains failures and makes no authority claim.
test("operator sweep validates locally and reports exact listed genesis outcomes without inferring mode", async () => {
  const f = fixture(), manifest = await captureIndexManifest("https://service.test", f.D, f.reads);
  const store = memoryStore(); await store.keep("device", new Uint8Array(32).fill(7));
  await store.save({ v: 2, service: "https://service.test", key: "device", repository: { directory: f.D, membership: { ...f.A, genesis: textDigest("TEST membership genesis") }, rules: f.A.scope, destination: f.A.scope } });
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
  for (const invalid of [{ ...manifest, root: { ...f.D, genesis: f.A.genesis } }, { ...manifest, scopes: [...manifest.scopes, manifest.scopes[0]] }]) {
    held = utf8(canonicalize(invalid)); expect((await scopeIndexCommand(ctx, ["verify", "--manifest", "saved.json"], files)).code).toBe(1); expect(calls).toEqual([]);
  }
  held = utf8(canonicalize(manifest));
  const result = await scopeIndexCommand(ctx, ["sweep", "--manifest", "saved.json"], files);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.lines[0]!)).toMatchObject({ listed: 3, verified: 3, unavailable: 0, mismatch: 0 });
  expect(calls.filter(call => !call.endsWith("/sessions"))).toEqual(manifest.scopes.map(row => `GET:/v1/scopes/${row.at.scope}/entries/0`));
  expect(result.lines.join("\n")).toContain("no deployment mode");
  calls.length = 0;
  held = utf8(`${canonicalize(manifest)}\n`);
  const versions = await scopeIndexCommand(ctx, ["versions", "--manifest", "saved.json"], files);
  expect(versions.code).toBe(0);
  expect(JSON.parse(versions.lines[0]!)).toMatchObject({ manifestDigest: digestBytes(held), ready: true, listed: 3, usableCreationCohorts: ["failed-claim"] });
  expect(calls.filter(call => !call.endsWith("/sessions"))).toEqual(manifest.scopes.map(row => `GET:/v1/scopes/${row.at.scope}/entries/0`));
  expect(versions.lines.join("\n")).toContain("No setting is changed or emitted");
  const report = await verifyIndexManifest(manifest, { ...f.reads, entry: async (scope, seq) => {
    if (scope === f.R.scope) return { ok: false, reason: "not-found" };
    const got = await f.reads.entry(scope, seq);
    if (scope !== f.A.scope || !got.ok) return got;
    const entry = got.value.entry; if (entry.input.type !== "genesis") return got;
    const changed: GenesisEntry = { ...(entry as GenesisEntry), input: { ...entry.input, nonce: newGenesisNonce(new Uint8Array(16).fill(99)) } };
    return { ...got, value: { ...got.value, entry: changed } };
  } });
  expect(report).toMatchObject({ listed: 3, verified: 1, unavailable: 1, mismatch: 1 });
});

// Managed refusals retain their request-window outcome; arbitrary reader
// exceptions disclose only the fixed read-failed classification.
test("operator manifest readers preserve managed refusals and sanitize private errors", async () => {
  const f = fixture(), manifest = await captureIndexManifest("https://service.test", f.D, f.reads);
  const refusal = new Stop({ code: 1, lines: ["Read session refused: rate-limited. The service reports a request-window retry delay of 23 seconds; this is not a retry grant."] });
  const refused: IndexReads = { ...f.reads, entry: async () => { throw refusal; } };
  const verificationStop = await verifyIndexManifest(manifest, refused).then(() => null, error => error);
  expect(verificationStop).toBe(refusal);
  const versionsStop = await indexManifestVersions(manifest, refused).then(() => null, error => error);
  expect(versionsStop).toBe(refusal);
  const broken: IndexReads = { ...f.reads, entry: async () => { throw Error("TEST private transport credentials"); } };
  const expected = manifest.scopes.map(row => ({ at: row.at, result: "unavailable", reason: "read-failed" }));
  expect((await verifyIndexManifest(manifest, broken)).rows).toEqual(expected);
  expect((await indexManifestVersions(manifest, broken)).rows).toEqual(expected);
});

// Scripted authenticated replies prove the listed-byte/identity boundary only,
// not a native lineage grant, complete deployment inventory or usable host.
test("operator versions binds saved genesis and separates observed catalog pins from creation families", async () => {
  const f = fixture(), manifest = await captureIndexManifest("https://service.test", f.D, f.reads);
  f.calls.length = 0;
  expect(await indexManifestVersions(manifest, f.reads)).toMatchObject({ ready: true,
    observedPins: ["platform:directory@17", "platform:register@18", "platform:rules@10"], usableCreationCohorts: ["failed-claim"] });
  expect(f.calls).toEqual(manifest.scopes.map(row => `entry:${row.at.scope}:0`));
  // Old ADC pins remain recognized observations. This partial inventory lacks
  // its Destination12, so it does not claim that complete old creation cohort.
  const historical = fixture({ definitions: { register: "platform:register@17", directory: "platform:directory@16", rules: "platform:rules@10" } });
  const held = await captureIndexManifest("https://service.test", historical.D, historical.reads);
  expect(await indexManifestVersions(held, historical.reads)).toMatchObject({ ready: true,
    observedPins: ["platform:directory@16", "platform:register@17", "platform:rules@10"], usableCreationCohorts: ["failed-claim"] });
  const legacy = fixture({ definitions: { register: "platform:register@3", directory: "platform:directory@3", rules: "platform:rules@2" } });
  const old = await captureIndexManifest("https://service.test", legacy.D, legacy.reads);
  const report = await indexManifestVersions(old, legacy.reads);
  expect(report).toMatchObject({ ready: false, usableCreationCohorts: [], observedPins: ["platform:directory@3", "platform:register@3", "platform:rules@2"] });
  expect(report.rows.every(row => row.result === "unsupported" && row.reason === "unsupported-creation-family")).toBe(true);
  const unknown = fixture({ definitions: { rules: "platform:rules@9999" } });
  const unknownManifest = await captureIndexManifest("https://service.test", unknown.D, unknown.reads);
  expect(await indexManifestVersions(unknownManifest, unknown.reads)).toMatchObject({ ready: false, usableCreationCohorts: [], rows: expect.arrayContaining([
    expect.objectContaining({ at: unknown.A, result: "unsupported", reason: "unknown-platform-pin" }),
  ]) });
  const refused = fixture(), refusedManifest = await captureIndexManifest("https://service.test", refused.D, refused.reads);
  if (refused.a.input.type !== "genesis") throw Error("fixture genesis");
  refused.a.input = { ...refused.a.input, decision: "refused" };
  refused.put(refused.a);
  expect(await indexManifestVersions(refusedManifest, refused.reads)).toMatchObject({ ready: false, rows: expect.arrayContaining([
    expect.objectContaining({ at: refused.A, result: "mismatch", reason: "genesis-identity" }),
  ]) });
  const altered = { ...manifest, scopes: manifest.scopes.map(row => row.at.scope === f.A.scope ? { ...row, at: { ...row.at, genesis: textDigest("different saved bytes") } } : row) };
  expect(await indexManifestVersions(altered, f.reads)).toMatchObject({ ready: false, usableCreationCohorts: [], rows: expect.arrayContaining([expect.objectContaining({ at: { ...f.A, genesis: textDigest("different saved bytes") }, result: "mismatch", reason: "genesis-hash" })]) });
  const substituted: IndexReads = { ...f.reads, entry: async (scope, seq) => {
    if (scope === f.R.scope) return { ok: false, reason: "not-found" };
    const got = await f.reads.entry(scope, seq);
    if (!got.ok || scope !== f.A.scope) return got;
    const entry = got.value.entry; if (entry.input.type !== "genesis") return got;
    const changed: GenesisEntry = { ...(entry as GenesisEntry), input: { ...entry.input, nonce: newGenesisNonce(new Uint8Array(16).fill(99)) } };
    return { ...got, value: { ...got.value, entry: changed } };
  } };
  expect(await indexManifestVersions(manifest, substituted)).toMatchObject({ ready: false, usableCreationCohorts: [], rows: expect.arrayContaining([
    expect.objectContaining({ at: f.R, result: "unavailable" }), expect.objectContaining({ at: f.A, result: "mismatch" }),
  ]) });
});

// Invariant: a Commons room's actual-shaped creation observations retain the
// Commons full reference and genesis through the unchanged v1 export format.
// Missing observations cannot imply Commons cohort coverage. No native lineage
// admission or global inventory is proved by this scripted source fixture.
test("Commons inventory discovers and exports closed sibling references before reporting its cohort", async () => {
  const f = fixture({ commons: true }), service = "https://service.test";
  const manifest = await captureIndexManifest(service, f.D, f.reads);
  const q = f.extras.find(entry => entry.input.type === "genesis" && entry.input.seed.kind === "commons");
  if (!q) throw Error("The scripted Commons birth must be observed.");
  expect(manifest.scopes).toHaveLength(6);
  expect(new Set(manifest.scopes.map(row => row.kind))).toEqual(new Set(["register", "directory", "membership", "rules", "destination", "commons"]));
  expect(manifest.scopes.find(row => row.at.scope === f.refOf(q).scope)).toEqual({ at: f.refOf(q), kind: "commons" });
  const exported = utf8(`${canonicalize(manifest)}\n`);
  expect(readIndexManifest(exported, service, f.D)).toEqual(manifest);
  const wire = JSON.parse(new TextDecoder().decode(exported)) as { scopes: { at: object; kind: string }[] };
  expect(Object.keys(wire).sort()).toEqual(["root", "scopes", "service", "v"]);
  expect(wire.scopes.every(row => Object.keys(row).sort().join(",") === "at,kind"
    && Object.keys(row.at).sort().join(",") === "genesis,scope")).toBe(true);
  const versions = await indexManifestVersions(manifest, f.reads);
  expect(versions).toMatchObject({ ready: true, usableCreationCohorts: ["failed-claim", "commons"],
    observedPins: ["platform:commons@1", "platform:destination@16", "platform:directory@22", "platform:membership@9", "platform:register@23", "platform:rules@14"] });
  expect(versions.rows.every(row => row.result === "verified")).toBe(true);
  const partial = { ...manifest, scopes: manifest.scopes.filter(row => row.at.scope !== f.refOf(q).scope) };
  expect(await indexManifestVersions(partial, f.reads)).toMatchObject({ ready: true,
    usableCreationCohorts: ["failed-claim"] });
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

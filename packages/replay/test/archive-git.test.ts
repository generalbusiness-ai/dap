// Judged fixture histories; authority, owner rules and host replies are
// explicitly the stand-ins in archive-fixtures.ts. These are real local
// clones and real native verifications, not production export admission.
import { afterAll, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Digest, FactRef, ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest } from "@generalbusiness/dap-bytes";
import { created, keys, notesDefinition, on } from "@generalbusiness/dap-derive/testing";
import { journalRef } from "../../git/src/journal-path.ts";
import { ARCHIVE_HEAD_TRUST, ARCHIVE_SOURCE_TRUST, verifyArchive, type ArchiveReadWork } from "../src/archive.ts";
import { archiveTexts, gitSource, readArchiveReceipt } from "../src/git.ts";
import { main } from "../src/cli.ts";
import { MemorySource, PAGE_ENTRIES, PAGE_REPLY_BYTES, RETAINED_REPLY_BYTES, httpSource } from "../src/source.ts";
import { TRUSTS, verify } from "../src/verify.ts";
import { declaredGenesisFixture, observingDeliveryFixture, outcomeSnapshotFixture, outcomeValueFixture } from "./archive-fixtures.ts";
import { changedFile, cleanup, clone, git, scratch, selectedGenesis } from "./archive-git-fixture.ts";
import { served } from "./world.ts";

afterAll(cleanup);
const makers = [declaredGenesisFixture, outcomeValueFixture, outcomeSnapshotFixture, observingDeliveryFixture];
const bin = fileURLToPath(new URL("../src/bin.ts", import.meta.url));

// Invariant: both real clone object formats preserve the full HTTP-native
// result and diagnoses without caller anchors or an online-service fallback.
test.each(["sha1", "sha256"] as const)("verifies all four judged cutoffs from a disconnected %s clone", async format => {
  const fixtures = makers.map(make => make()), dir = clone(fixtures.flatMap(fixture => fixture.scopes), format);
  for (const fixture of fixtures) {
    const memory = new MemorySource(fixture.scopes, 2);
    const fetch = async (address: string) => {
      const url = new URL(address); expect(url.origin).toBe("https://archive-fixture.invalid");
      const [, , id, route, kind, encoded] = url.pathname.split("/").filter(Boolean);
      let answer;
      if (route === "log") {
        const got = await memory.page(id as ScopeId, Number(url.searchParams.get("cursor")), { entries: PAGE_ENTRIES, bytes: PAGE_REPLY_BYTES });
        answer = got.ok ? { ok: true, at: got.page.head, value: { scope: got.page.scope, entries: got.page.entries }, complete: got.page.next === null, next: got.page.next === null ? null : String(got.page.next) } : got;
      } else {
        const got = await memory.retained(id as ScopeId, kind as "entry", decodeURIComponent(encoded!) as Digest, { bytes: RETAINED_REPLY_BYTES }, url.searchParams.get("domain") ?? undefined);
        answer = got.ok ? { ok: true, value: got.input } : got;
      }
      return new Response(JSON.stringify(answer), { headers: { "Content-Type": "application/json" } });
    };
    const expected = await verify(httpSource("https://archive-fixture.invalid", { fetch }), fixture.options);
    const got = await verifyArchive(gitSource(dir), fixture.options);
    expect(got.kind).toBe("verification"); if (got.kind !== "verification") continue;
    expect({ ...got.verification, report: { ...got.verification.report, trusts: got.verification.report.trusts.map(trust => trust === ARCHIVE_SOURCE_TRUST ? TRUSTS.sources : trust) } }).toEqual(expected);
    expect(got.verification.report.anchors).toEqual([]);
    expect(got.archive.format).toBe(format);
    expect(got.read.scopes).toBe(fixture.scopes.length);
  }
  const fixture = fixtures[0]!, scope = fixture.scopes[0]!, genesis = JSON.parse(scope.entries[0]!.bytes);
  expect(genesis.input.kind).toBe("start"); expect(genesis.at.kind).toBe("directory");
  const built = await selectedGenesis(scope, format);
  expect(built.ok).toBe(true); if (built.ok) expect(built.archive.selection.through).toEqual(fixture.options.head);
  // Run the actual Node entry without a loader; new source imports must be erasable.
  const printed = JSON.parse(execFileSync(process.execPath, [bin, "--git", dir, fixture.options.scope, "--mode", "integrity", "--json"], { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 }));
  expect(printed).toMatchObject({ kind: "verification", verification: { report: { result: "consistent" } } });
  expect(printed.verification.report.trusts).toContain(ARCHIVE_HEAD_TRUST);
}, 20_000);

// Invariant: omitted required bytes retain the verifier's precise diagnosis,
// including the first use at the cutoff itself.
test("reports each missing cutoff input through actual clone reads", async () => {
  for (const make of makers) {
    const fixture = make(), scopes = fixture.scopes.map(scope => ({ ...scope, retained: scope.retained.filter(input => input.digest !== fixture.required.digest) }));
    const got = await verifyArchive(gitSource(clone(scopes, "sha1")), fixture.options);
    expect(got.kind).toBe("verification"); if (got.kind !== "verification") continue;
    expect(got.verification.report.result).toBe("incomplete");
    expect(JSON.stringify(got.verification.why)).toContain(fixture.required.digest);
  }
}, 20_000);

// Invariant: a matching early receipt cannot hide later structural corruption;
// unsafe tree forms produce a typed refusal, without any fabricated report.
test.each(["sha1", "sha256"] as const)("keeps %s corruption, unsafe modes and receipt status separate", async format => {
  const fixture = outcomeValueFixture(), scope = fixture.scopes[0]!, dir = clone(fixture.scopes, format), ref = journalRef(scope.scope.scope), original = git(dir, ["rev-parse", ref]);
  const fact: FactRef = { at: scope.scope, seq: 0, hash: scope.entries[0]!.hash }, options = { ...fixture.options, mode: "integrity" as const, receipt: { fact } };
  expect(await verifyArchive(gitSource(dir), options)).toMatchObject({ kind: "verification", receipt: { result: "archived" } });
  const segment = "journal/v1/segments/000000000000.jsonl", lines = scope.entries.map(entry => entry.bytes);
  const changed = JSON.parse(lines[1]!); changed.epoch++;
  const corruptions = [
    changedFile(dir, original, segment, [lines[0], canonicalize(changed), ...lines.slice(2)].join("\n")),
    changedFile(dir, original, segment, lines.slice(0, -1).join("\n")),
    changedFile(dir, original, "journal/v1/head.json", canonicalize({ v: 1, scope: scope.scope, through: 2, hash: `sha256:${"0".repeat(64)}` })),
    changedFile(dir, original, "journal/v1/head.json", null),
    git(dir, ["hash-object", "-w", "--stdin"], "not a commit"),
  ];
  for (const commit of corruptions) {
    git(dir, ["update-ref", ref, commit]);
    const got = await verifyArchive(gitSource(dir), options);
    expect(got).toMatchObject({ kind: "archive-failure", result: "mismatch", location: { scope: scope.scope.scope, commit } });
    expect(got).not.toHaveProperty("verification"); expect(got).not.toHaveProperty("native"); expect(got).not.toHaveProperty("receipt");
  }
  for (const mode of ["120000", "160000", "100755", "100644"]) {
    git(dir, ["update-ref", ref, changedFile(dir, original, "journal/v1/unplanned", "/never/open/this/archive/path", mode)]);
    expect(await verifyArchive(gitSource(dir), options)).toMatchObject({ kind: "archive-failure", result: "refused" });
  }
  git(dir, ["update-ref", ref, original]);
  expect(await verifyArchive(gitSource(dir), { ...options, receipt: { fact: { ...fact, seq: scope.entries.length } } })).toMatchObject({ kind: "verification", receipt: { result: "behind" } });
  for (const head of [{ seq: 0, hash: `sha256:${"0".repeat(64)}` as Digest }, { seq: scope.entries.length, hash: fact.hash }]) {
    expect(await verifyArchive(gitSource(dir), { ...fixture.options, mode: "integrity", head })).toMatchObject({ kind: "verification", verification: { report: { result: "mismatch" } } });
  }
  // Missing foreign refs are native dependency failures, not invented files.
  const foreignFixture = outcomeSnapshotFixture(), foreignDir = clone(foreignFixture.scopes, format), foreign = foreignFixture.scopes[1]!;
  git(foreignDir, ["update-ref", "-d", journalRef(foreign.scope.scope)]);
  const missing = await verifyArchive(gitSource(foreignDir), foreignFixture.options);
  expect(missing.kind).toBe("verification"); if (missing.kind === "verification") expect(missing.verification.report.result).toBe("missing-dependency");
}, 20_000);

const fileWork = (): ArchiveReadWork => ({ check() {}, spend() {}, wait: action => action(), admitted: () => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 }), bytes() {}, scope() {}, remainingMilliseconds: () => 10_000 });

// Invariant: clone replay reads an owed detached text only through the
// caller-selected port; integrity needs no text and archive bytes stay fixed.
test("replays an owed detached text from the caller directory", async () => {
  const ledger = created(notesDefinition, {}, "archive-detached-text"), text = "a detached fixture body", digest = textDigest(text);
  expect(ledger.act(keys.rita, "write", { ...on(ledger, 0), fields: { body: digest } }, { texts: () => text.length }).result).toBe("write");
  const dir = clone([served(ledger, [ledger])], "sha1"), options = { mode: "replay" as const, scope: ledger.at.scope, head: ledger.head, grants: "as-recorded" as const };
  const absent = await verifyArchive(gitSource(dir), options);
  expect(absent.kind).toBe("verification"); if (absent.kind !== "verification") return;
  expect(absent.verification.report.result).toBe("incomplete"); expect(absent.verification.why).toContain(digest);
  expect(await verifyArchive(gitSource(dir), { ...options, mode: "integrity" })).toMatchObject({ kind: "verification", verification: { report: { result: "consistent" } } });
  const root = scratch(); writeFileSync(join(root, `${digest.slice(7)}.txt`), text);
  const supplied = await verifyArchive(gitSource(dir, { texts: archiveTexts(root) }), options);
  expect(supplied, JSON.stringify(supplied)).toMatchObject({ kind: "verification", archive: absent.archive, verification: { report: { result: "consistent", anchors: [] } } });
}, 20_000);
// Invariant: caller-selected files are bounded regular files, and a digest
// names a detached text without granting an archive path filesystem access.
test("bounds caller text and receipt ports and connects CLI receipt inference", async () => {
  const root = scratch(), text = "caller-selected detached text", digest = textDigest(text), path = join(root, `${digest.slice(7)}.txt`), port = archiveTexts(root);
  expect(await port.read("../../outside" as Digest, 1024, fileWork())).toEqual({ ok: false, reason: "refused" });
  writeFileSync(path, text);
  expect(await port.read(digest, 1024, fileWork())).toEqual({ ok: true, text });
  expect(await port.read(digest, 1, fileWork())).toEqual({ ok: false, reason: "too-large" });
  writeFileSync(path, "wrong digest"); expect(await port.read(digest, 1024, fileWork())).toEqual({ ok: false, reason: "digest-mismatch" });
  const absent = textDigest("absent"); expect(await port.read(absent, 1024, fileWork())).toEqual({ ok: false, reason: "not-found" });
  const linked = textDigest("link"); symlinkSync(path, join(root, `${linked.slice(7)}.txt`));
  expect(await port.read(linked, 1024, fileWork())).toEqual({ ok: false, reason: "refused" });
  const directory = textDigest("directory"); mkdirSync(join(root, `${directory.slice(7)}.txt`));
  expect(await port.read(directory, 1024, fileWork())).toEqual({ ok: false, reason: "refused" });
  const fixture = declaredGenesisFixture(), scope = fixture.scopes[0]!, dir = clone(fixture.scopes, "sha1"), fact = { at: scope.scope, seq: 0, hash: scope.entries[0]!.hash }, receiptPath = join(root, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify({ fact })); expect(await readArchiveReceipt(receiptPath)).toEqual({ fact });
  const out: string[] = [], err: string[] = [], io = { out: (value: string) => out.push(value), err: (value: string) => err.push(value), archive: (directory: string, texts?: string) => gitSource(directory, texts ? { texts: archiveTexts(texts) } : {}), receipt: readArchiveReceipt };
  expect(await main(["--git", dir, "--receipt", receiptPath, "--mode", "integrity", "--json"], io)).toBe(0);
  expect(JSON.parse(out.pop()!)).toMatchObject({ kind: "verification", receipt: { result: "archived", fact } }); expect(err).toEqual([]);
  writeFileSync(receiptPath, " ".repeat(64 * 1024 + 1)); await expect(readArchiveReceipt(receiptPath)).rejects.toMatchObject({ reason: "too-large" });
  writeFileSync(receiptPath, '{"fact":null,"fact":null}'); await expect(readArchiveReceipt(receiptPath)).rejects.toMatchObject({ reason: "refused" });
  const receiptLink = join(root, "receipt-link.json"); symlinkSync(receiptPath, receiptLink); await expect(readArchiveReceipt(receiptLink)).rejects.toMatchObject({ reason: "refused" });
  expect(await main(["https://archive-fixture.invalid", fixture.options.scope, "--receipt", receiptPath], io)).toBe(2);
}, 20_000);

// The floor receipt's exact commit is checked independently of the current
// archive ref, for both local object formats. No network fetch is allowed.
test.each(["sha1", "sha256"] as const)("reads an exact %s floor commit and reports an absent local commit", async format => {
  const fixture = declaredGenesisFixture(), scope = fixture.scopes[0]!;
  const dir = clone(fixture.scopes, format), commit = git(dir, ["rev-parse", journalRef(scope.scope.scope)]);
  const source = gitSource(dir);
  expect(await source.floorReceipt(scope.scope.scope, commit, { bytes: 4096 })).toMatchObject({ ok: true, scope: scope.scope, through: fixture.options.head });
  expect(await source.floorReceipt(scope.scope.scope, "f".repeat(format === "sha1" ? 40 : 64), { bytes: 4096 })).toEqual({ ok: false, reason: "floor-commit-missing" });
});

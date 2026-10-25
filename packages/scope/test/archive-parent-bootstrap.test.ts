/** Migration witnesses use actual Native entries, SQLite, restart and driver.
 * Repository/token service and HTTP acceptance are explicit TEST stand-ins.
 * The large refusal fixture is a mechanical selected inventory, not a claim
 * of Native validation or replay of its contents. */
import { expect, onTestFinished, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type Head } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, scopeIdOf, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, Reader, idOf, objectId, parseCommit } from "@generalbusiness/dap-git";
import { captureJournalParentFrontier, journalRef, JOURNAL_SELECTION_BYTES, buildJournalPass, type JournalObject } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCapacityRefusal, type ArchiveCost } from "../src/archive-budget.ts";
import { ARCHIVE_MIGRATION_TREE_BYTES, ARCHIVE_MIGRATION_COMMIT_BYTES } from "../src/archive-bootstrap-cost.ts";
import { ArchiveDriver, type FixtureArchiveProvider } from "../src/archive-driver.ts";
import { ArchiveFrontiers } from "../src/archive-frontier-store.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { writeArchivePublication } from "../src/archive-publication.ts";
import { planRootArchivePass, type ArchiveFixedFinish } from "../src/archive-build.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { archiveAuthorityAnchors, archiveAuthorityBasis, archiveAuthorityPolicies, nativeArchiveFixture } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveSql } from "./support/archive.ts";
import type { TestScope } from "./worker.ts";
import { rita, type Lane } from "./fixtures-native.ts";

// The real Artifacts adapter requires the repository id to equal its name.
const repository = { host: "artifacts", namespace: "bootstrap-fixture", name: "bootstrap", id: "bootstrap" };
const CONFIRMED = "archive-frontier-confirmed-1", PENDING = "archive-frontier-pending-1";
const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
const keys = (lane: Lane) => lane.inside(state => state.storage.sql.exec<{ k: string; v: string }>(
  "SELECT k, v FROM meta WHERE k IN (?, ?) ORDER BY k", CONFIRMED, PENDING).toArray());
async function removeState(lane: Lane) {
  // Deliberate old-binary migration fixture: remove only the newly introduced
  // state keys, retaining the genuine accepted receipt/Mark and all entries.
  await lane.inside(state => state.storage.sql.exec("DELETE FROM meta WHERE k IN (?, ?)", CONFIRMED, PENDING).toArray());
  expect(await keys(lane)).toEqual([]);
}
async function due(lane: Lane) {
  const next = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  // Manual driver fixtures need no invented wake when a new turn is due.
  if (next) lane.c.clock.now = next;
}

function transport(lane: Lane) {
  const peer = new ArchiveArtifactsPeer(repository, () => Date.parse(lane.c.clock.now));
  const reads: { id: string; type: JournalObject["type"]; maximum: number }[] = [];
  const refusals: { reason: string; what: string }[] = [];
  const migrations: { commit: string; budget: ArchiveBudget }[] = [];
  const controls = { missingMint: false, loseReadback: false, failRefOnce: false, mintCalls: 0, sendCalls: 0, uploadPosts: 0, migrationReads: 0, tokenReads: 0, identities: 0, infoCalls: 0, httpCalls: 0 };
  const actual = new ArtifactsProvider({ host: repository.host, namespace: repository.namespace,
    service: "service.invalid", maxBytes: 8 * 1024 * 1024, binding: { ...peer.binding,
      get: async name => {
        controls.identities++;
        const artifact = await peer.binding.get(name);
        return { ...artifact, info: async () => { controls.infoCalls++; return artifact.info(); } };
      },
    },
    fetch: async request => {
      controls.httpCalls++;
      if (request.method === "POST" && request.url.endsWith("/git-upload-pack")) controls.uploadPosts++;
      return peer.fetch(request);
    }, credentialHandle: async () => { throw new Error("TEST fixture never enters production credential custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => lane.c.clock.now, tokens: {
    fixture: "archive-tokens", read: async () => { controls.tokenReads++; return "TEST-bootstrap-read"; },
    mint: async () => ({ id: "TEST bootstrap handle", plaintext: "TEST-bootstrap-write", ends: timeOf(Date.parse(lane.c.clock.now) + 60_000) }),
    revoke: async () => {},
  } });
  const provider: FixtureArchiveProvider = { ...actual,
    readParent: async (repository, commit, allowed, budget) => {
      controls.migrationReads++; migrations.push({ commit, budget });
      try { return await actual.readParent!(repository, commit, allowed, budget); }
      catch (error) {
        if (error instanceof GitRefusal) refusals.push({ reason: error.reason, what: error.what });
        throw error;
      }
    },
    readObject: async (repository, object, allowed, budget) => {
      reads.push({ ...object });
      try { return await actual.readObject!(repository, object, allowed, budget); }
      catch (error) {
        if (error instanceof GitRefusal) refusals.push({ reason: error.reason, what: error.what });
        throw error;
      }
    },
    ref: async (repository, ref, allowed) => {
      if (controls.failRefOnce) { controls.failRefOnce = false; throw new Error("TEST lost immediate readback"); }
      return actual.ref(repository, ref, allowed);
    },
    mintArchive: async (repository, at, allowed) => {
      controls.mintCalls++;
      if (controls.missingMint) { controls.missingMint = false; return null; }
      return actual.mintArchive(repository, at, allowed);
    },
    sendArchive: async request => {
      controls.sendCalls++;
      const answer = await actual.sendArchive(request);
      if (controls.loseReadback) { controls.loseReadback = false; controls.failRefOnce = true; return null; }
      return answer;
    },
  };
  return { peer, provider, controls, reads, refusals, migrations };
}
function expectMigration(host: ReturnType<typeof transport>, commit: string) {
  expect(host.controls.migrationReads).toBe(1); expect(host.migrations).toHaveLength(1);
  expect(host.migrations[0]!.commit).toBe(commit);
  expect(host.migrations[0]!.budget).toBeInstanceOf(ArchiveBudget);
}

function run(lane: Lane, provider: FixtureArchiveProvider) {
  return lane.inside(state => new ArchiveDriver({ sql: archiveSql(state),
    current: () => {
      const value = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one();
      const scope = JSON.parse(value.v); return { at: scope.at, head: scope.head };
    }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS,
    policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) },
    fixtureSources: archiveAuthorityBasis(lane)!.pins,
    target: { fixture: "archive-target", resolve: async () => repository }, provider,
  }).run());
}

// Only the newly added metadata is removed. The immutable accepted journal,
// genuine Native receipt and source-birth authority remain available.
test("missing v2 parent state seeds once, publishes legacy anchors and then appends without old host reads", async () => {
  const fixture = await nativeArchiveFixture(), lane = await fixture.create({}, {}, archiveDefinition), host = transport(lane);
  await lane.did(rita, "remark", { on: 0, fields: { text: "signed authority inside the old v2 receipt" } });
  expect(archiveAuthorityAnchors(lane).length).toBeGreaterThan(0);
  const seedHead = await lane.head();
  // Genuine old root-only v2 output has no anchor publication or native key.
  // Do not simulate that old receipt by editing an accepted publication flag.
  const seed = await lane.inside(async state => {
    const sql = archiveSql(state), made = await planRootArchivePass(sql, { at: lane.at, through: seedHead, after: null,
      bounds: PROPOSED_BOUNDS, policies: archiveAuthorityPolicies(lane, archivePolicies), format: "sha1",
      parent: null, markedAt: lane.c.clock.now, fixtureSources: archiveAuthorityBasis(lane)!.pins }, new ArchiveBudget());
    expect(made.ok ? "accepted" : made).toBe("accepted"); if (!made.ok) throw Error(canonicalize(made));
    const rows = new ArchiveRows(sql, lane.at);
    rows.target(repository, "sha1"); rows.mark(made.mark);
    expect(rows.confirm(made.mark.commit).confirmed).toEqual({ commit: made.archive.commit, through: seedHead, layout: 2 });
    return made.archive;
  });
  for (const object of seed.objects) host.peer.data.set(object.id, object);
  host.peer.refs.set(journalRef(lane.at.scope), seed.commit);
  const original = (await row(lane))!;
  expect(original.confirmed?.layout).toBe(2); expect(original.pending).toBeNull();
  const receipt = original.confirmed!, accepted = [...host.peer.sends];
  await removeState(lane);
  await lane.did(rita, "remark", { on: 0, fields: { text: "input after the old v2 receipt" } });
  const later = await lane.head(); expect(later.seq).toBeGreaterThan(receipt.through.seq);
  const mints = host.controls.mintCalls, sends = host.controls.sendCalls;
  // Wrong receipt/identity/head cannot turn checked current-parent bytes
  // into a store token. Each refusal leaves the genuine row and keys intact.
  const expected = { at: lane.at, format: "sha1" as const, repository: digestBytes(utf8(canonicalize(repository))), commit: receipt.commit, through: receipt.through };
  const local = { object: async (id: string, maximum: number) => {
    const object = seed.objects.find(value => value.id === id);
    return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
  } };
  for (const wrong of [
    { ...expected, commit: "0".repeat(40) },
    { ...expected, at: { ...lane.at, inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" as const } },
    { ...expected, through: { ...receipt.through, hash: digestBytes(utf8("TEST wrong head")) } },
  ]) {
    await expect(captureJournalParentFrontier(wrong, local, new ArchiveBudget())).rejects.toBeDefined();
    expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(original);
  }
  await due(lane);
  const seeded = await run(lane, host.provider);
  expect(seeded).toMatchObject({ state: "retry" }); expect(seeded.reason).toBeUndefined();
  expect(seeded.next).not.toBeNull();
  expect(await row(lane)).toEqual(original);
  expect(host.controls.mintCalls).toBe(mints); expect(host.controls.sendCalls).toBe(sends);
  expect(host.peer.sends).toEqual(accepted); expect(host.refusals).toEqual([]);
  expect(host.reads).toEqual([]);
  expectMigration(host, receipt.commit);
  expect((await keys(lane)).map(value => value.k)).toEqual([CONFIRMED]);
  const seededKeys = await keys(lane), oldReads = [...host.reads], uploads = host.controls.uploadPosts;
  // Observe the same validated public base that the driver will dispatch.
  // This independent assertion supplies no budget or bytes to the next pass.
  expect(await lane.inside(async state => {
    const frontiers = new ArchiveFrontiers(archiveSql(state), { at: lane.at, format: "sha1",
      repository: digestBytes(utf8(canonicalize(repository))) });
    const base = await frontiers.readConfirmed({ at: lane.at, format: "sha1",
      repository: digestBytes(utf8(canonicalize(repository))), commit: receipt.commit, through: receipt.through }, new ArchiveBudget());
    return base?.frontier.objects.length;
  })).toBe(11);
  await lane.restart(); await due(lane);
  expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
  const appended = (await row(lane))!;
  expect(appended.confirmed).toMatchObject({ layout: 2, through: later });
  expect(appended.confirmed?.commit).not.toBe(receipt.commit); expect(appended.pending).toBeNull();
  const legacyReads = host.reads.slice(oldReads.length);
  // Paid native preparation reuses the eleven-object baseline witness.
  // Only the old pass directory and manifest need this remote transition.
  expect(legacyReads).toHaveLength(2);
  expect(new Set(legacyReads.map(read => read.id)).size).toBe(legacyReads.length);
  expect(legacyReads.some(read => read.type === "blob" && read.maximum === JOURNAL_SELECTION_BYTES)).toBe(true);
  expect(legacyReads.every(read => seed.objects.some(object => object.id === read.id))).toBe(true);
  expect(host.controls.uploadPosts - uploads).toBe(legacyReads.length);
  expect(host.controls.mintCalls).toBe(mints + 1); expect(host.controls.sendCalls).toBe(sends + 1);
  expect(host.peer.sends).toHaveLength(accepted.length + 1); expect(host.controls.migrationReads).toBe(1);
  expect(parseCommit(host.peer.data.get(appended.confirmed!.commit)!.data).parents).toEqual([receipt.commit]);
  expect(await lane.head()).toEqual(later); expect(await keys(lane)).not.toEqual(seededKeys);
  expect(appended.confirmed?.anchorsPublished).toBe(true);
  const publications = [...host.peer.data.values()].filter(object => object.type === "blob")
    .map(object => new TextDecoder().decode(object.data)).filter(text => text.includes('"legacyAnchors"'));
  expect(publications).toHaveLength(1); const publication = JSON.parse(publications[0]!);
  const expectedAnchors = archiveAuthorityAnchors(lane);
  expect(expectedAnchors.length).toBeGreaterThan(0);
  expect(publication).toMatchObject({ legacyAnchors: { from: 0, through: seedHead.seq, anchors: expect.arrayContaining([...expectedAnchors]) } });
  expect(publication.legacyAnchors.anchors).toHaveLength(expectedAnchors.length);

  // Once published, an additional real Native turn uses only the fixed parent.
  const publishedReads = [...host.reads], publishedUploads = host.controls.uploadPosts;
  await lane.did(rita, "remark", { on: 0, fields: { text: "input after legacy anchor publication" } });
  const finalHead = await lane.head(); await due(lane);
  expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
  const final = (await row(lane))!;
  expect(final.confirmed).toMatchObject({ layout: 2, through: finalHead, anchorsPublished: true });
  expect(parseCommit(host.peer.data.get(final.confirmed!.commit)!.data).parents).toEqual([appended.confirmed!.commit]);
  expect(host.reads).toEqual(publishedReads); expect(host.controls.uploadPosts).toBe(publishedUploads);
  expect(host.controls.migrationReads).toBe(1); expect(host.controls.mintCalls).toBe(mints + 2);
  expect(host.controls.sendCalls).toBe(sends + 2); expect(host.peer.sends).toHaveLength(accepted.length + 2);
  expect(final.pending).toBeNull(); expect(await lane.head()).toEqual(finalHead);
}, 20_000);

// Both branches begin with real accepted Native v2 output and remove only
// frontier metadata. No pending Mark is synthesized or edited.
test("old pending v2 readback confirms first or seeds only its exact confirmed parent", async () => {
  const fixture = await nativeArchiveFixture();
  const acceptedLane = await fixture.create({}, {}, archiveDefinition), acceptedHost = transport(acceptedLane);
  expect(await run(acceptedLane, acceptedHost.provider)).toMatchObject({ state: "confirmed" });
  await acceptedLane.did(rita, "remark", { on: 0, fields: { text: "accepted before lost readback" } });
  acceptedHost.controls.loseReadback = true; await due(acceptedLane);
  expect(await run(acceptedLane, acceptedHost.provider)).toMatchObject({ state: "retry", reason: "unavailable" });
  const accepted = (await row(acceptedLane))!, acceptedMark = accepted.pending!;
  expect(acceptedMark.layout).toBe(2);
  expect(acceptedHost.peer.refs.get(journalRef(acceptedLane.at.scope))).toBe(acceptedMark.commit);
  await removeState(acceptedLane);
  const reads = [...acceptedHost.reads], mints = acceptedHost.controls.mintCalls, sends = [...acceptedHost.peer.sends];
  await acceptedLane.restart(); await due(acceptedLane);
  expect(await run(acceptedLane, acceptedHost.provider)).toMatchObject({ state: "confirmed" });
  expect((await row(acceptedLane))?.confirmed).toMatchObject({ commit: acceptedMark.commit, through: acceptedMark.through, layout: 2 });
  expect((await row(acceptedLane))?.pending).toBeNull(); expect(await keys(acceptedLane)).toEqual([]);
  expect(acceptedHost.reads).toEqual(reads); expect(acceptedHost.controls.mintCalls).toBe(mints);
  expect(acceptedHost.peer.sends).toEqual(sends); expect(acceptedHost.controls.migrationReads).toBe(0);

  const parentLane = await fixture.create({}, {}, archiveDefinition), parentHost = transport(parentLane);
  expect(await run(parentLane, parentHost.provider)).toMatchObject({ state: "confirmed" });
  await parentLane.did(rita, "remark", { on: 0, fields: { text: "durable Mark before missing credential" } });
  parentHost.controls.missingMint = true; await due(parentLane);
  expect(await run(parentLane, parentHost.provider)).toMatchObject({ state: "retry", reason: "unavailable" });
  const before = (await row(parentLane))!, mark = before.pending!, confirmed = before.confirmed!;
  expect(mark).toMatchObject({ parent: confirmed.commit, layout: 2 });
  expect(parentHost.peer.refs.get(journalRef(parentLane.at.scope))).toBe(mark.parent);
  await removeState(parentLane);
  const parentMints = parentHost.controls.mintCalls, parentSends = [...parentHost.peer.sends];
  await parentLane.restart(); await due(parentLane);
  const seeded = await run(parentLane, parentHost.provider);
  expect(seeded).toMatchObject({ state: "retry" }); expect(seeded.reason).toBeUndefined();
  const afterSeed = (await row(parentLane))!;
  expect(afterSeed.confirmed).toEqual(confirmed); expect(afterSeed.pending).toEqual(mark);
  expect(parentHost.controls.mintCalls).toBe(parentMints); expect(parentHost.peer.sends).toEqual(parentSends);
  expect(parentHost.reads).toEqual([]);
  expectMigration(parentHost, confirmed.commit);
  expect((await keys(parentLane)).map(value => value.k)).toEqual([CONFIRMED]);
  const oldReads = [...parentHost.reads];
  await parentLane.restart(); await due(parentLane);
  expect(await run(parentLane, parentHost.provider)).toMatchObject({ state: "confirmed" });
  expect((await row(parentLane))?.confirmed).toMatchObject({ commit: mark.commit, through: mark.through, layout: 2 });
  expect((await row(parentLane))?.pending).toBeNull(); expect(parentHost.reads).toEqual(oldReads);
  expect(parentHost.peer.sends).toEqual([...parentSends, mark.commit]);
  expect(parentHost.refusals).toEqual([]); expect(parentHost.controls.migrationReads).toBe(1);
}, 20_000);

// Mechanical Git trees establish the exact transport byte boundary; these
// files are not Native journal entries or a claim of replay/export authority.
test("over-bound current-parent migration refuses without installing either native key", async () => {
  const fixture = await nativeArchiveFixture(), lane = await fixture.create({}, {}, archiveDefinition), host = transport(lane);
  const body = utf8("TEST mechanical blob, filtered from migration");
  const blob: JournalObject = { id: idOf("blob", body), type: "blob", data: body };
  const make = (bytes: number) => {
    const hash = Uint8Array.from(blob.id.match(/../g)!, value => Number.parseInt(value, 16));
    const parts: Uint8Array[] = [];
    // Full ordinary filenames plus a bounded first-name extension hit the exact byte limit.
    const count = Math.floor(bytes / 36), padding = bytes - count * 36;
    for (let n = 0; n < count; n++) {
      const name = `file${String(n).padStart(4, "0")}${n === 0 ? "x".repeat(padding) : ""}`;
      const prefix = utf8(`100644 ${name}\0`), row = new Uint8Array(prefix.length + hash.length);
      row.set(prefix); row.set(hash, prefix.length); parts.push(row);
    }
    const treeBody = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0; for (const part of parts) { treeBody.set(part, offset); offset += part.length; }
    expect(treeBody.length).toBe(bytes);
    const tree: JournalObject = { id: idOf("tree", treeBody), type: "tree", data: treeBody };
    const commitBody = utf8(`tree ${tree.id}\nauthor TEST <fixture@invalid> 0 +0000\ncommitter TEST <fixture@invalid> 0 +0000\n\nTEST bounded current parent\n`);
    const commit: JournalObject = { id: idOf("commit", commitBody), type: "commit", data: commitBody };
    for (const object of [blob, tree, commit]) host.peer.data.set(object.id, object);
    host.peer.refs.set(journalRef(lane.at.scope), commit.id); return { tree, commit };
  };
  const exact = make(ARCHIVE_MIGRATION_TREE_BYTES), original = await row(lane);
  const budget = new ArchiveBudget();
  const source = await host.provider.readParent!(repository, exact.commit.id, () => true, budget);
  expect(await source.object(exact.commit.id, ARCHIVE_MIGRATION_COMMIT_BYTES)).toMatchObject({ type: "commit", size: exact.commit.data.length });
  expect(await source.object(exact.tree.id, ARCHIVE_MIGRATION_TREE_BYTES)).toMatchObject({ type: "tree", size: ARCHIVE_MIGRATION_TREE_BYTES });
  const beforeProbe = { tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls };
  expect(await source.object(blob.id, 0)).toBeNull();
  await expect(source.boundedObject!(blob.id, "tree", 1024)).rejects.toBeDefined();
  expect({ tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls }).toEqual(beforeProbe);
  expect(await source.boundedObject!(blob.id, "blob", 1024)).toMatchObject({ type: "blob", size: body.length });
  const afterBody = { tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls };
  expect(await source.object(blob.id, 0)).toEqual({ type: "blob", size: body.length, data: null });
  expect({ tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls }).toEqual(afterBody);
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(original);
  const over = make(ARCHIVE_MIGRATION_TREE_BYTES + 1);
  // Deliberately mechanical old Git graph/receipt: Native owns the row and
  // entry, but these selected files are not claimed as an exported journal.
  const head = await lane.head();
  const entry = await lane.inside(state => state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM entry WHERE seq = ?", head.seq).one().bytes);
  const selection = canonicalize({ format: "artroom-local-inventory-2", at: lane.at, through: head, after: null,
    entries: [{ seq: head.seq, hash: head.hash, bytes: utf8(entry).length }], objects: [], omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost: new ArchiveBudget().admitted() });
  await lane.inside(state => {
    const rows = new ArchiveRows(archiveSql(state), lane.at); rows.target(repository, "sha1");
    rows.markAttempt({ commit: over.commit.id, parent: null, through: head, manifest: selection, markedAt: lane.c.clock.now, layout: 2 }, lane.c.clock.now);
    rows.confirm(over.commit.id);
  });
  const beforeOver = await row(lane), posts = host.controls.uploadPosts;

  await expect(host.provider.readParent!(repository, over.commit.id, () => true, new ArchiveBudget())).rejects.toMatchObject({ reason: "too-large" });
  expect(host.controls.uploadPosts).toBe(posts + 1);
  await lane.inside(async (_state, instance) => { expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" }); });
  await due(lane); expect(await run(lane, host.provider)).toMatchObject({ state: "retry" });
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(beforeOver);
  const blocked = new ArchiveBudget({ metadata: 0, inputWork: 0 }), uploads = host.controls.uploadPosts;
  const beforeBlocked = { tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls };
  await expect(host.provider.readParent!(repository, exact.commit.id, () => true, blocked)).rejects.toMatchObject({ reason: "limit" });
  expect({ tokens: host.controls.tokenReads, identities: host.controls.identities, info: host.controls.infoCalls, http: host.controls.httpCalls }).toEqual(beforeBlocked);
  expect(host.controls.uploadPosts).toBe(uploads); expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(beforeOver);
}, 20_000);

// Real Native entry bodies and receipts; retained file selection is mechanical
// test data, not an authority or replay claim. Every pass has one old commit.
test("current-parent migration handles six and thirty-seven old passes without walking history", async context => {
  const measured: { passes: number; extraRetainedFiles: number; treeBytes: number; trees: number; seedCost: ReturnType<ArchiveBudget["admitted"]> }[] = [];
  const fixture = await nativeArchiveFixture();
  for (const shape of [{ count: 6, padded: false }, { count: 37, padded: false }, { count: 37, padded: true }]) {
    const count = shape.count;
    const baseline = shape.padded ? measured.find(value => value.passes === 37 && value.extraRetainedFiles === 0) : undefined;
    // Existing rule directories need no new branch: each added SHA1 file
    // edge is7(mode+space)+64(hexname)+1(NUL)+20(ID)=92 bytes.
    const extraFiles = shape.padded ? Math.ceil((16 * 1024 - baseline!.treeBytes) / 92) : 0;
    expect(extraFiles).toBeGreaterThanOrEqual(0); expect(extraFiles).toBeLessThanOrEqual((count - 1) * 3);

    const lane = await fixture.create({}, {}, archiveDefinition), host = transport(lane);
    await lane.did(rita, "remark", { on: 0, fields: { text: "real authority before mechanical retained selection" } });
    const initialHead = await lane.head();
    // Genuine production publication/Mark path, before creating later
    // checkpoint-only historical passes. No publication flag is edited.
    expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
    const published = (await row(lane))!.confirmed!;
    expect(published.anchorsPublished).toBe(true); expect(published.through).toEqual(initialHead);
    await removeState(lane);
    await lane.inside(async (_state, instance) => {
      for (let n = 1; n < count; n++) expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" });
    });
    const native = await lane.inside(state => state.storage.sql.exec<{ seq: number; hash: string; bytes: string }>("SELECT seq, hash, bytes FROM entry ORDER BY seq").toArray());
    const bodies = new Map(native.map(value => [value.seq, value.bytes]));
    let prior: Head = published.through, parent: string = published.commit;
    const commits: string[] = [parent];
    for (let pass = 1; pass < count; pass++) {
      const through = native.find(value => value.seq === published.through.seq + pass)!, first = prior.seq + 1;
      expect(through).toBeDefined(); expect(first).toBe(through.seq);
      expect((JSON.parse(through.bytes) as { input: { type: string }; effects: unknown[]; sends: unknown[] }).input.type).toBe("checkpoint");
      expect((JSON.parse(through.bytes) as { effects: unknown[] }).effects).toEqual([]);
      expect((JSON.parse(through.bytes) as { sends: unknown[] }).sends).toEqual([]);
      expect((JSON.parse(through.bytes) as { uses: unknown[] }).uses).toEqual([]);
      expect((JSON.parse(through.bytes) as { prepared: unknown[] }).prepared).toEqual([]);
      const head = { seq: through.seq, hash: through.hash } as Head;
      const filesThisPass = 1 + Math.floor(extraFiles / (count - 1)) + (pass <= extraFiles % (count - 1) ? 1 : 0);
      expect(filesThisPass).toBeLessThanOrEqual(4);
      const files = Array.from({ length: filesThisPass }, (_, file) => {
        const body = canonicalize({ fixture: "mechanical migration retained selection", pass, file });
        return { body, key: { kind: "rule" as const, digest: digestBytes(utf8(body)) } };
      });
      const retained = new Map(files.map(file => [canonicalize(file.key), file.body]));
      const budget = new ArchiveBudget(); budget.spend({ entries: through.seq - first + 1, attempts: files.length });
      const selection = canonicalize({ format: "artroom-local-inventory-2", at: lane.at, through: head, after: prior,
        entries: native.filter(value => value.seq >= first && value.seq <= through.seq).map(value => ({ seq: value.seq, hash: value.hash, bytes: utf8(value.bytes).length })),
        objects: files.map(({ key, body }) => ({ key, bytes: utf8(body).length, pass: first, consumers: [{ mode: "required", origin: { at: { at: lane.at, seq: through.seq, hash: through.hash }, input: (JSON.parse(through.bytes) as { input: { type: string } }).input.type }, consumer: "rule-input", purpose: "replay-required", key }] })),
        omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost: budget.admitted() });
      const publication = { anchors: [] };
      const made = await buildJournalPass({ format: "sha1", selection, budget,
        input: { entry: async (seq, maximum) => { const body = bodies.get(seq); return body !== undefined && utf8(body).length <= maximum ? body : null; },
          retained: async (wanted, maximum) => { const body = retained.get(canonicalize(wanted)); return body !== undefined && utf8(body).length <= maximum ? body : null; } },
        parent: { id: parent, source: host.peer.source }, publication: () => publication });
      expect(made.ok ? "accepted" : made).toBe("accepted"); if (!made.ok) throw Error(canonicalize(made));
      expect(made.archive.manifest.anchors).toEqual(publication.anchors);
      const manifestId = idOf("blob", utf8(made.archive.manifestBytes));
      const manifestObject = made.archive.objects.find(object => object.id === manifestId);
      expect(manifestObject?.type).toBe("blob");
      const actualManifest = new TextDecoder().decode(manifestObject!.data);
      expect(actualManifest).toBe(made.archive.manifestBytes);
      expect(JSON.parse(actualManifest).anchors).toEqual(publication.anchors);
      for (const object of made.archive.objects) host.peer.data.set(object.id, object);
      await lane.inside(state => {
        const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at); rows.target(repository, "sha1");
        for (const file of files) sql.exec("INSERT INTO retained_input (kind, digest, bytes, under) VALUES ('rule', ?, ?, NULL)", file.key.digest, file.body).toArray();
        const publicationBudget = new ArchiveBudget();
        const anchorPublication = writeArchivePublication(publication, publicationBudget);
        rows.markAttempt({ commit: made.archive.commit, parent, through: head, manifest: selection, markedAt: lane.c.clock.now, layout: 2, anchorPublication, replayScopes: [lane.at] }, lane.c.clock.now);
        expect(rows.load()?.pending?.anchorPublication).toBe(canonicalize(publication));
        expect(rows.confirm(made.archive.commit).confirmed?.anchorsPublished).toBe(true);
      });
      host.peer.refs.set(journalRef(lane.at.scope), made.archive.commit); commits.push(made.archive.commit);
      parent = made.archive.commit; prior = head;
    }
    // Walk only the final current tree, independently of production seeding.
    const reader = new Reader(host.peer.source), tip = await reader.commit(objectId(parent!, "TEST migration tip"));
    const queue = [tip.tree], seen = new Set<string>(); let treeBytes = 0;
    for (const id of queue) {
      if (seen.has(id)) continue; seen.add(id);
      treeBytes += (await reader.object(id, "tree")).length;
      for (const edge of await reader.tree(id)) if (edge.kind === "tree") queue.push(edge.id);
    }
    expect(commits).toHaveLength(count); expect(treeBytes).toBeLessThanOrEqual(ARCHIVE_MIGRATION_TREE_BYTES);
    if (count === 37 && !shape.padded) { expect(treeBytes).toBeGreaterThan(8487); expect(treeBytes).toBeLessThan(12 * 1024); }
    if (shape.padded) {
      expect(treeBytes).toBe(baseline!.treeBytes + extraFiles * 92);
      expect(treeBytes).toBeGreaterThanOrEqual(16 * 1024);
    }
    await removeState(lane);
    const old = await row(lane); expect(old?.confirmed?.anchorsPublished).toBe(true); expect(await keys(lane)).toEqual([]);
    const seedMints = host.controls.mintCalls, seedSends = host.controls.sendCalls;
    await lane.inside(async (_state, instance) => { expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" }); });
    let used: ArchiveBudget | undefined;
    const provider = { ...host.provider, readParent: async (...args: Parameters<NonNullable<FixtureArchiveProvider["readParent"]>>) => {
      used = args[3]; return host.provider.readParent!(...args);
    } };
    await due(lane); const migrated = await run(lane, provider);
    expect(migrated).toMatchObject({ state: "retry" }); expect(migrated.reason).toBeUndefined();
    expect(await row(lane)).toEqual(old); expect(host.controls.mintCalls).toBe(seedMints); expect(host.controls.sendCalls).toBe(seedSends);
    expect((await keys(lane)).map(value => value.k)).toEqual([CONFIRMED]);
    expect(used).toBeInstanceOf(ArchiveBudget); expect(used!.admitted().entries).toBe(0);
    const uploadCount = host.controls.uploadPosts;
    await lane.restart(); await due(lane); expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
    expect((await row(lane))?.confirmed?.through).toEqual(await lane.head());
    const publishedReads = host.controls.uploadPosts;
    await lane.inside(async (_state, instance) => { expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" }); });
    await due(lane); expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
    expect(host.controls.uploadPosts).toBe(publishedReads); expect(publishedReads).toBeGreaterThanOrEqual(uploadCount);
    measured.push({ passes: count, extraRetainedFiles: extraFiles, treeBytes, trees: seen.size, seedCost: used!.admitted() });
  }
  (context.task.meta as Record<string, unknown>)["currentParentMigration"] = { measured,
    qualification: "Real Native entries, row receipts and SQLite; distributed mechanical retained selections and scripted HTTP/token host. Current-tree bytes measured independently; no hosted measurement or arbitrary-history capacity claim." };
}, 20_000);


// Only these new cases exercise the production strategy selector. Admission
// checks the actual applied birth; target, source metadata, HTTP and tokens
// remain explicit TEST ports, not a deployed Grow configuration.
test.for([0, 1] as const)("unpublished v2 cutoff %i migrates exactly next after a real capacity wake and rebuilds its pending Mark", { timeout: 20_000 }, async (cutoff, context) => {
  const fixture = await nativeArchiveFixture(), lane = await fixture.create({}, {}, archiveDefinition), host = transport(lane);
  if (cutoff === 1) await lane.did(rita, "remark", { on: 0, fields: { text: "signed old unpublished input" } });
  const oldHead = await lane.head(); expect(oldHead.seq).toBe(cutoff);
  const oldAnchors = archiveAuthorityAnchors(lane);
  const seed = await lane.inside(async state => {
    const sql = archiveSql(state), made = await planRootArchivePass(sql, { at: lane.at, through: oldHead, after: null,
      bounds: PROPOSED_BOUNDS, policies: archiveAuthorityPolicies(lane, archivePolicies), format: "sha1", parent: null,
      markedAt: lane.c.clock.now, fixtureSources: archiveAuthorityBasis(lane)!.pins }, new ArchiveBudget());
    expect(made.ok ? "accepted" : made).toBe("accepted"); if (!made.ok) throw Error(canonicalize(made));
    const rows = new ArchiveRows(sql, lane.at); rows.target(repository, "sha1"); rows.mark(made.mark);
    expect(rows.confirm(made.mark.commit).confirmed).toEqual({ commit: made.archive.commit, through: oldHead, layout: 2 });
    return made.archive;
  });
  for (const object of seed.objects) host.peer.data.set(object.id, object);
  host.peer.refs.set(journalRef(lane.at.scope), seed.commit);
  const original = (await row(lane))!;
  expect(original.confirmed).not.toHaveProperty("anchorsPublished"); expect(await keys(lane)).toEqual([]);
  await lane.inside(async (_state, instance) => {
    for (let n = 0; n < 3; n++) expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" });
  });
  const head = await lane.head(), first = oldHead.seq + 1;
  const birth = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM entry WHERE seq = 0").one().bytes) as Entry);
  expect(birth.input.type).toBe("genesis");
  if (birth.input.type !== "genesis") throw Error("Actual native birth required");
  expect(birth.input.decision).toBe("applied"); expect(scopeIdOf(birth.input.seed)).toBe(lane.at.scope);
  expect(birth.at).toEqual(lane.at); expect(birth.input.inc).toBe(lane.at.inc); expect(birth.input.seed.kind).toBe(lane.at.kind);
  const birthSeed = canonicalize(birth.input.seed);
  const diagnostics: { state: string; cost: ArchiveCost; fixedFinish: ArchiveFixedFinish | null; capacityRefusal: ArchiveCapacityRefusal | null }[] = [];
  const info = console.info, log = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    if (args[0] === "archive-pass-diagnostic-v1") diagnostics.push(args[1] as (typeof diagnostics)[number]);
    info(...args);
  });
  onTestFinished(() => log.mockRestore());
  const order: string[] = [], budgets: ArchiveBudget[] = [];
  const production = (limits: Partial<ArchiveCost> = {}) => lane.inside(state => {
    const budget = new ArchiveBudget(limits); budgets.push(budget);
    return new ArchiveDriver({ production: "room-binding", sql: archiveSql(state),
      current: () => {
        const scope = JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one().v);
        return { at: scope.at, head: scope.head };
      }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS,
      policies: { registry: archiveAuthorityPolicies(lane, archivePolicies) },
      admit: (at, admittedSeed) => canonicalize(at) === canonicalize(lane.at)
        && admittedSeed.kind === lane.at.kind && scopeIdOf(admittedSeed) === lane.at.scope && canonicalize(admittedSeed) === birthSeed,
      provider: host.provider, budget: () => budget,
      target: { resolve: async () => { order.push("target"); return repository; } },
      sources: async (_after, _through, sameBudget, exact) => {
        expect(sameBudget).toBe(budget); order.push(exact ? "sources:pending" : "sources:plan");
        return { pins: archiveAuthorityBasis(lane)!.pins, prepare: async (seq, actualBudget) => {
          expect(actualBudget).toBe(budget); order.push(`prepare:${seq}`);
        } };
      },
    }).run();
  });
  // Native frontier bootstrap is a separate turn, not publication or a
  // capacity wake. No old receipt/publication bit or wake counter is edited.
  expect(await production()).toMatchObject({ state: "retry" });
  expect(await row(lane)).toEqual(original); expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  expect((await keys(lane)).map(value => value.k)).toEqual([CONFIRMED]);
  expectMigration(host, seed.commit);
  const bootstrapMigrations = [...host.migrations];
  const expectNoParentFallback = () => {
    expect(host.controls.migrationReads).toBe(1); expect(host.migrations).toEqual(bootstrapMigrations);
  };
  await lane.restart(); await due(lane); order.length = 0;
  // Trusted lower ENTRY ceiling only: old inventory pays cutoff+1, Scout
  // pays one more; fresh inventory cannot fit. Publication validation reads
  // bodies but selectedEntries adds no entry tariff. This is NOT an
  // all-default adaptive 65/64 reproduction. Its actual refusal must agree.
  const initialEntries = cutoff + 2;
  expect(await production({ entries: initialEntries })).toMatchObject({ state: "retry", reason: "limit" });
  const refusedAdaptive = diagnostics.at(-1)!;
  expect(refusedAdaptive.fixedFinish).toBeNull(); expect(refusedAdaptive.capacityRefusal).not.toBeNull();
  expect(refusedAdaptive.capacityRefusal!.shortfall.entries).toBeGreaterThan(0);
  expect(refusedAdaptive.capacityRefusal!.limit.entries).toBe(initialEntries);
  expect(await row(lane)).toEqual(original);
  const wake = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'archive-wake-1'").one().v));
  expect(wake.capacityDeferrals).toBe(1);
  expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  await due(lane); order.length = 0;
  // A genuine lower metadata ceiling exercises the complete quote; if this
  // fixture cannot reach it, the test fails instead of claiming coverage.
  const constrainedMetadata = 512 * 1024;
  expect(await production({ metadata: constrainedMetadata })).toMatchObject({ state: "retry", reason: "limit" });
  const refusedQuote = diagnostics.at(-1)!;
  expect(refusedQuote.fixedFinish, JSON.stringify(refusedQuote)).not.toBeNull();
  expect(refusedQuote.capacityRefusal).toMatchObject({ site: "finish-affordability", kind: "finish-quote", reserved: { metadata: 65_536 }, limit: { metadata: constrainedMetadata } });
  expect(refusedQuote.capacityRefusal!.used).toEqual(refusedQuote.fixedFinish!.used);
  expect(refusedQuote.capacityRefusal!.requested).toEqual(refusedQuote.fixedFinish!.remaining);
  expect(refusedQuote.capacityRefusal!.shortfall.metadata).toBeGreaterThan(0);
  expect(await row(lane)).toEqual(original); expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  expect(order).toEqual(["target", "sources:plan", ...Array.from({ length: cutoff + 1 }, (_, seq) => `prepare:${seq}`), `prepare:${first}`]);
  await due(lane); order.length = 0; host.controls.missingMint = true;
  expect(await production()).toMatchObject({ state: "retry", reason: "unavailable" });
  const pending = (await row(lane))!, mark = pending.pending!;
  expect(mark).toMatchObject({ parent: seed.commit, layout: 2, through: { seq: first } });
  expect(mark.through.seq).toBeLessThan(head.seq); expect(pending.confirmed).toEqual(original.confirmed);
  expect(pending.confirmed).not.toHaveProperty("anchorsPublished"); expect(host.controls.sendCalls).toBe(0);
  const publication = JSON.parse(mark.anchorPublication!);
  expect(publication).toMatchObject({ legacyAnchors: { from: 0, through: cutoff, anchors: expect.arrayContaining([...oldAnchors]) } });
  expect(publication.legacyAnchors.anchors).toHaveLength(oldAnchors.length);
  const fixed = diagnostics.at(-1)!; expect(fixed.fixedFinish, JSON.stringify(fixed)).not.toBeNull();
  const quote = fixed.fixedFinish!; expect(quote.metadataMargin).toBe(65_536);
  // Full old inventory plus exactly one next inventory, with no Scout visit.
  expect(quote.used.entries).toBe(cutoff + 2);
  for (const axis of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) {
    expect(fixed.cost[axis], JSON.stringify({ axis, fixed })).toBeLessThanOrEqual(quote.used[axis] + quote.remaining[axis]);
    expect(quote.used[axis] + quote.remaining[axis] + (axis === "metadata" ? quote.metadataMargin : 0)).toBeLessThanOrEqual(ARCHIVE_BOUNDS[axis]);
  }
  expect(ARCHIVE_BOUNDS.metadata - fixed.cost.metadata).toBeGreaterThanOrEqual(65_536);
  expect(order).toEqual(["target", "sources:plan", ...Array.from({ length: cutoff + 1 }, (_, seq) => `prepare:${seq}`), `prepare:${first}`]);
  const oldReads = [...host.reads], oldCommit = seed.commit;
  expectNoParentFallback();
  await lane.inside(async (_state, instance) => { expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" }); });
  const advanced = await lane.head(); expect(advanced.seq).toBeGreaterThan(head.seq);
  await lane.restart(); await due(lane); order.length = 0; host.controls.loseReadback = true;
  expect(await production()).toMatchObject({ state: "retry", reason: "unavailable" });
  expect((await row(lane))!.pending).toEqual(mark); expect((await row(lane))!.confirmed?.commit).toBe(oldCommit);
  expect((await row(lane))!.confirmed).not.toHaveProperty("anchorsPublished");
  expect(host.peer.sends).toEqual([mark.commit]); expect(host.peer.refs.get(journalRef(lane.at.scope))).toBe(mark.commit);
  expect(host.reads).toEqual(oldReads); expectNoParentFallback(); expect(order).toEqual(["target", "sources:pending"]);
  const sentObjects = [...host.peer.data].map(([id, object]) => [id, object.type, [...object.data]]);
  await lane.restart(); await due(lane);
  expect(await production()).toMatchObject({ state: "confirmed" });
  const confirmed = (await row(lane))!;
  expect(confirmed.pending).toBeNull(); expect(confirmed.confirmed).toEqual({ commit: mark.commit, through: mark.through, layout: 2, anchorsPublished: true });
  expect(host.peer.sends).toEqual([mark.commit]); expect([...host.peer.data].map(([id, object]) => [id, object.type, [...object.data]])).toEqual(sentObjects);
  expect(host.reads).toEqual(oldReads); expectNoParentFallback(); expect(await lane.head()).toEqual(advanced);
  expect(parseCommit(host.peer.data.get(mark.commit)!.data).parents).toEqual([oldCommit]);
  const publishedReads = [...host.reads]; await due(lane);
  expect(await production()).toMatchObject({ state: "confirmed" });
  expect((await row(lane))!.confirmed).toMatchObject({ through: advanced, anchorsPublished: true });
  expect(host.reads).toEqual(publishedReads); expectNoParentFallback(); expect(await lane.head()).toEqual(advanced);
  for (const budget of budgets) for (const axis of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const)
    expect(budget.admitted()[axis]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[axis]);
  (context.task.meta as Record<string, unknown>)["unpublishedExactNext"] = { cutoff, initialEntries, refusedAdaptive, refusedQuote, fixed, mark,
    qualification: "Actual Native entries, birth, row, frontier bootstrap and six-axis driver budget. TEST policy/source/target/HTTP/token ports. Initial lower ENTRY ceiling is a genuine capacity precondition, not a default64 hosted reproduction; fixed migration uses all ordinary limits. Pending rebuild keeps the exact original Mark across native advance and eviction." };
});

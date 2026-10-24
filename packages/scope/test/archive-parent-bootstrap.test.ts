/** Migration witnesses use actual Native entries, SQLite, restart and driver.
 * Repository/token service and HTTP acceptance are explicit TEST stand-ins.
 * The large refusal fixture is a mechanical selected inventory, not a claim
 * of Native validation or replay of its contents. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, Reader, idOf, objectId, parseCommit } from "@generalbusiness/dap-git";
import { captureJournalParentFrontier, journalRef, JOURNAL_SELECTION_BYTES, type JournalObject } from "@generalbusiness/dap-git/journal";
import { buildPack } from "@generalbusiness/dap-git/http";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { selectArchiveBootstrapBounds } from "../src/archive-bootstrap-cost.ts";
import { copyArchiveObjects } from "../src/archive-parent.ts";
import { ArchiveDriver, type FixtureArchiveProvider } from "../src/archive-driver.ts";
import { ArchiveFrontiers } from "../src/archive-frontier-store.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planRootArchivePass } from "../src/archive-build.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { archiveAuthorityAnchors, archiveAuthorityBasis, archiveAuthorityPolicies, nativeArchiveFixture } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveSql } from "./support/archive.ts";
import { create, rita, type Lane } from "./fixtures-native.ts";

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
  const closures: { commit: string; most: { bytes: number; objects: number }; budget: ArchiveBudget | undefined }[] = [];
  const controls = { missingMint: false, loseReadback: false, failRefOnce: false, mintCalls: 0, sendCalls: 0, uploadPosts: 0, closureReads: 0 };
  const actual = new ArtifactsProvider({ host: repository.host, namespace: repository.namespace,
    service: "service.invalid", maxBytes: 8 * 1024 * 1024, binding: peer.binding,
    fetch: async request => {
      if (request.method === "POST" && request.url.endsWith("/git-upload-pack")) {
        controls.uploadPosts++;
        if (request.headers.get("git-protocol") !== "version=2") {
          // Complete-closure TEST peer: return every reachable object in one
          // real hash-checked pack, not the isolated peer's one-object reply.
          const body = new TextDecoder().decode(await request.clone().arrayBuffer());
          const wanted = /want ([0-9a-f]{40})/.exec(body)?.[1];
          expect(wanted).toBeDefined(); if (!wanted) throw new Error("TEST missing closure want");
          expect(body).not.toContain("filter "); expect(body).not.toContain("deepen ");
          const objects = new Map<string, JournalObject>();
          const source = { ...peer.source, object: async (id: ReturnType<typeof objectId>, maximum: number) => {
            const value = await peer.source.object(id, maximum);
            if (value?.data) objects.set(id, peer.data.get(id)!);
            return value;
          } };
          expect(await new Reader(source).closure(objectId(wanted, "TEST closure want"))).toMatchObject({ complete: true });
          // Encoding a deliberately oversized reply does not grant the
          // production reader this fixture's server-side allowance.
          const pack = await buildPack([...objects.values()], { maxBytes: 16 * 1024 * 1024 });
          const prefix = utf8("0008NAK\n"), answer = new Uint8Array(prefix.length + pack.length);
          answer.set(prefix); answer.set(pack, prefix.length);
          return new Response(answer, { headers: { "content-type": "application/x-git-upload-pack-result" } });
        }
      }
      return peer.fetch(request);
    }, credentialHandle: async () => { throw new Error("TEST fixture never enters production credential custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => lane.c.clock.now, tokens: {
    fixture: "archive-tokens", read: async () => "TEST-bootstrap-read",
    mint: async () => ({ id: "TEST bootstrap handle", plaintext: "TEST-bootstrap-write", ends: timeOf(Date.parse(lane.c.clock.now) + 60_000) }),
    revoke: async () => {},
  } });
  const provider: FixtureArchiveProvider = { ...actual,
    objects: async (repository, commit, most, allowed, budget) => {
      controls.closureReads++; closures.push({ commit, most: { ...most }, budget });
      try { return await actual.objects(repository, commit, most, allowed, budget); }
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
  return { peer, provider, controls, reads, refusals, closures };
}
function expectClosure(host: ReturnType<typeof transport>, commit: string) {
  expect(host.controls.closureReads).toBe(1); expect(host.closures).toHaveLength(1);
  const read = host.closures[0]!;
  expect(read.commit).toBe(commit); expect(read.budget).toBeInstanceOf(ArchiveBudget);
  expect(read.most.bytes).toBeGreaterThan(0); expect(read.most.bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  expect(read.most.objects).toBeGreaterThan(0); expect(read.most.objects).toBeLessThanOrEqual(8192);
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
  await due(lane);
  const seeded = await run(lane, host.provider);
  expect(seeded).toMatchObject({ state: "retry" }); expect(seeded.reason).toBeUndefined();
  expect(seeded.next).not.toBeNull();
  expect(await row(lane)).toEqual(original);
  expect(host.controls.mintCalls).toBe(mints); expect(host.controls.sendCalls).toBe(sends);
  expect(host.peer.sends).toEqual(accepted); expect(host.refusals).toEqual([]);
  expect(host.reads).toEqual([]);
  expectClosure(host, receipt.commit);
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
  // The one-pass old shape needs its eleven-object parent witness plus the
  // final pass directory and manifest. Native append must not reread it too.
  expect(legacyReads).toHaveLength(13);
  expect(new Set(legacyReads.map(read => read.id)).size).toBe(legacyReads.length);
  expect(legacyReads.some(read => read.type === "blob" && read.maximum === JOURNAL_SELECTION_BYTES)).toBe(true);
  expect(legacyReads.every(read => seed.objects.some(object => object.id === read.id))).toBe(true);
  expect(host.controls.uploadPosts - uploads).toBe(legacyReads.length);
  expect(host.controls.mintCalls).toBe(mints + 1); expect(host.controls.sendCalls).toBe(sends + 1);
  expect(host.peer.sends).toHaveLength(accepted.length + 1); expect(host.controls.closureReads).toBe(1);
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
  expect(host.controls.closureReads).toBe(1); expect(host.controls.mintCalls).toBe(mints + 2);
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
  expect(acceptedHost.peer.sends).toEqual(sends); expect(acceptedHost.controls.closureReads).toBe(0);

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
  expectClosure(parentHost, confirmed.commit);
  expect((await keys(parentLane)).map(value => value.k)).toEqual([CONFIRMED]);
  const oldReads = [...parentHost.reads];
  await parentLane.restart(); await due(parentLane);
  expect(await run(parentLane, parentHost.provider)).toMatchObject({ state: "confirmed" });
  expect((await row(parentLane))?.confirmed).toMatchObject({ commit: mark.commit, through: mark.through, layout: 2 });
  expect((await row(parentLane))?.pending).toBeNull(); expect(parentHost.reads).toEqual(oldReads);
  expect(parentHost.peer.sends).toEqual([...parentSends, mark.commit]);
  expect(parentHost.refusals).toEqual([]); expect(parentHost.controls.closureReads).toBe(1);
}, 20_000);

// This mechanical old receipt names a valid reachable Git graph containing
// one compressible blob just beyond the original 8 MiB ceiling. It is not a
// Native journal/replay claim. The true Native object supplies only SQLite
// state and an entry for the deliberately seeded old receipt below.
test("over-cap recursive bootstrap root refuses without installing either native key", async () => {
  const lane = await create({}, {}, archiveDefinition), host = transport(lane);
  const entry = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM entry WHERE seq = 0").one().bytes) as Entry);
  const body = canonicalize(entry), head = { seq: 0, hash: entryHash(entry) };
  const blobBytes = new Uint8Array(8 * 1024 * 1024 + 1).fill(120);
  const blob: JournalObject = { id: idOf("blob", blobBytes), type: "blob", data: blobBytes };
  const name = utf8("100644 mechanical.bin\0"), hash = Uint8Array.from(blob.id.match(/../g)!, value => Number.parseInt(value, 16));
  const treeBytes = new Uint8Array(name.length + hash.length); treeBytes.set(name); treeBytes.set(hash, name.length);
  const tree: JournalObject = { id: idOf("tree", treeBytes), type: "tree", data: treeBytes };
  const commitBytes = utf8(`tree ${tree.id}\nauthor TEST <fixture@invalid> 0 +0000\ncommitter TEST <fixture@invalid> 0 +0000\n\nTEST oversized bootstrap closure\n`);
  const commit: JournalObject = { id: idOf("commit", commitBytes), type: "commit", data: commitBytes };
  expect(blob.data.length).toBeGreaterThan(8 * 1024 * 1024);
  for (const object of [commit, tree, blob]) host.peer.data.set(object.id, object);
  host.peer.refs.set(journalRef(lane.at.scope), commit.id);
  const selection = canonicalize({ format: "artroom-local-inventory-2", at: lane.at,
    through: head, after: null, entries: [{ seq: 0, hash: head.hash, bytes: utf8(body).length }],
    objects: [], omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost: new ArchiveBudget().admitted() });
  await lane.inside(state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at); rows.target(repository, "sha1");
    const mark = { commit: commit.id, parent: null, through: head, manifest: selection, markedAt: lane.c.clock.now, layout: 2 as const };
    const bookkeeping = new ArchiveBudget(); rows.markAttempt(mark, lane.c.clock.now, bookkeeping); rows.confirm(mark.commit, bookkeeping);
  });
  const original = await row(lane); expect(await keys(lane)).toEqual([]);
  // Remaining-budget admission is checked by the actual adapter before any
  // read-token or HTTP operation. This grants no fresh allowance or retry.
  const blocked = new ArchiveBudget({ metadata: 0, inputWork: 0 });
  const tokens = host.peer.minted.length, uploads = host.controls.uploadPosts;
  await expect(host.provider.objects(repository, commit.id, { bytes: 8 * 1024 * 1024, objects: 8192 }, () => true, blocked)).rejects.toMatchObject({ reason: "limit" });
  expect(host.peer.minted).toHaveLength(tokens); expect(host.controls.uploadPosts).toBe(uploads);
  expect(host.closures[0]!.budget).toBe(blocked);
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(original);
  // The actual bootstrap path is exercised below with a real remaining
  // budget and its original local-finish reserve; no state is installed if
  // the complete remote closure cannot fit the admitted adapter profile.
  await lane.inside(async state => {
    const sql = archiveSql(state), budget = new ArchiveBudget();
    const identity = { at: lane.at, format: "sha1" as const, repository: digestBytes(utf8(canonicalize(repository))) };
    const frontiers = new ArchiveFrontiers(sql, identity), context = frontiers.beginConfirmedBootstrap(budget);
    expect(context).not.toBeNull(); if (!context) return;
    const finish = frontiers.bootstrapFinish(context); expect(finish.ok).toBe(true); if (!finish.ok) return;
    const most = selectArchiveBootstrapBounds(8 * 1024 * 1024, budget, finish.cost);
    expect(most).not.toBeNull(); if (!most) return;
    const allowed = () => { budget.check(); return true; };
    await expect((async () => {
      const captured = await budget.lookaheadAsync(finish.cost, async () => {
        const objects = await budget.wait(() => host.provider.objects(repository, commit.id, most, allowed, budget));
        const held = copyArchiveObjects(objects, "sha1", budget, 8 * 1024 * 1024);
        return captureJournalParentFrontier(context.binding, { object: async (id, maximum) => {
          const object = held.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
        } }, budget);
      });
      expect(captured.kind).toBe("read"); if (captured.kind !== "read") return;
      const prepared = await frontiers.prepareConfirmedBootstrap(context, captured.value, budget);
      frontiers.installConfirmedBootstrap(prepared, budget);
    })()).rejects.toMatchObject({ reason: "unavailable" });
  });
  expect(host.reads).toEqual([]); expect(host.controls.closureReads).toBe(2);
  expect(host.closures[1]!.most.bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  expect(host.closures[1]!.most.objects).toBeLessThanOrEqual(8192);
  expect(host.controls.uploadPosts).toBe(uploads + 1);
  expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(original);
}, 20_000);

/** Migration witnesses use actual Native entries, SQLite, restart and driver.
 * Repository/token service and HTTP acceptance are explicit TEST stand-ins.
 * The large refusal fixture is a mechanical selected inventory, not a claim
 * of Native validation or replay of its ninety retained rule consumers. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, parseCommit } from "@generalbusiness/dap-git";
import { buildJournalPass, captureJournalParentFrontier, journalRef, type JournalObject } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveDriver, type FixtureArchiveProvider } from "../src/archive-driver.ts";
import { ArchiveFrontiers } from "../src/archive-frontier-store.ts";
import { archiveParent } from "../src/archive-parent.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { archiveAuthorityBasis, archiveAuthorityPolicies, createNativeArchiveLane } from "./support/archive-native-authority.ts";
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
  const controls = { missingMint: false, loseReadback: false, failRefOnce: false, mintCalls: 0, sendCalls: 0, uploadPosts: 0, closureReads: 0 };
  const actual = new ArtifactsProvider({ host: repository.host, namespace: repository.namespace,
    service: "service.invalid", maxBytes: 8 * 1024 * 1024, binding: peer.binding,
    fetch: async request => {
      if (request.method === "POST" && request.url.endsWith("/git-upload-pack")) controls.uploadPosts++;
      return peer.fetch(request);
    }, credentialHandle: async () => { throw new Error("TEST fixture never enters production credential custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => lane.c.clock.now, tokens: {
    fixture: "archive-tokens", read: async () => "TEST bootstrap read",
    mint: async () => ({ id: "TEST bootstrap handle", plaintext: "TEST bootstrap write", ends: timeOf(Date.parse(lane.c.clock.now) + 60_000) }),
    revoke: async () => {},
  } });
  const provider: FixtureArchiveProvider = { ...actual,
    objects: async (repository, commit, most, allowed) => {
      controls.closureReads++; return actual.objects(repository, commit, most, allowed);
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
  return { peer, provider, controls, reads, refusals };
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
test("missing v2 parent state seeds once and restarts before appending without old host reads", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = transport(lane);
  expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
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
  expect(host.reads).toHaveLength(11); expect(new Set(host.reads.map(value => value.id)).size).toBe(11);
  expect(host.reads[0]).toEqual({ id: receipt.commit, type: "commit", maximum: 1024 });
  expect((await keys(lane)).map(value => value.k)).toEqual([CONFIRMED]);
  const seededKeys = await keys(lane), oldReads = [...host.reads], uploads = host.controls.uploadPosts;
  await lane.restart(); await due(lane);
  expect(await run(lane, host.provider)).toMatchObject({ state: "confirmed" });
  const appended = (await row(lane))!;
  expect(appended.confirmed).toMatchObject({ layout: 2, through: later });
  expect(appended.confirmed?.commit).not.toBe(receipt.commit); expect(appended.pending).toBeNull();
  expect(host.reads).toEqual(oldReads); expect(host.controls.uploadPosts).toBe(uploads);
  expect(host.controls.mintCalls).toBe(mints + 1); expect(host.controls.sendCalls).toBe(sends + 1);
  expect(host.peer.sends).toHaveLength(accepted.length + 1); expect(host.controls.closureReads).toBe(0);
  expect(parseCommit(host.peer.data.get(appended.confirmed!.commit)!.data).parents).toEqual([receipt.commit]);
  expect(await lane.head()).toEqual(later); expect(await keys(lane)).not.toEqual(seededKeys);
}, 20_000);

// Both branches begin with real accepted Native v2 output and remove only
// frontier metadata. No pending Mark is synthesized or edited.
test("old pending v2 readback confirms first or seeds only its exact confirmed parent", async () => {
  const acceptedLane = await createNativeArchiveLane({}, {}, archiveDefinition), acceptedHost = transport(acceptedLane);
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

  const parentLane = await createNativeArchiveLane({}, {}, archiveDefinition), parentHost = transport(parentLane);
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
  expect(parentHost.reads).toHaveLength(11); expect(parentHost.reads[0]?.id).toBe(confirmed.commit);
  expect((await keys(parentLane)).map(value => value.k)).toEqual([CONFIRMED]);
  const oldReads = [...parentHost.reads];
  await parentLane.restart(); await due(parentLane);
  expect(await run(parentLane, parentHost.provider)).toMatchObject({ state: "confirmed" });
  expect((await row(parentLane))?.confirmed).toMatchObject({ commit: mark.commit, through: mark.through, layout: 2 });
  expect((await row(parentLane))?.pending).toBeNull(); expect(parentHost.reads).toEqual(oldReads);
  expect(parentHost.peer.sends).toEqual([...parentSends, mark.commit]);
  expect(parentHost.refusals).toEqual([]); expect(parentHost.controls.closureReads).toBe(0);
}, 20_000);

// A mechanical old receipt with ninety distinct retained rule files. The
// actual Native genesis is used only as canonical selected bytes; the rule
// consumer declarations below are not a Native judgment/replay witness.
test("over-cap recursive bootstrap root refuses without installing either native key", async () => {
  const lane = await create({}, {}, archiveDefinition), host = transport(lane);
  const entry = await lane.inside(state => JSON.parse(state.storage.sql.exec<{ bytes: string }>("SELECT bytes FROM entry WHERE seq = 0").one().bytes) as Entry);
  const body = canonicalize(entry), head = { seq: 0, hash: entryHash(entry) };
  const retained = Array.from({ length: 90 }, (_, index) => {
    const body = canonicalize({ fixture: "bootstrap-bound", index });
    return { key: { kind: "rule" as const, digest: digestBytes(utf8(body)) }, body };
  });
  const budget = new ArchiveBudget();
  budget.spend({ entries: 1, attempts: retained.length });
  const selection = canonicalize({ format: "artroom-local-inventory-2", at: lane.at,
    through: head, after: null, entries: [{ seq: 0, hash: head.hash, bytes: utf8(body).length }],
    objects: retained.map(({ key, body }) => ({ key, bytes: utf8(body).length, pass: 0,
      consumers: [{ mode: "required", origin: { at: { at: lane.at, seq: 0, hash: head.hash }, input: entry.input.type },
        consumer: "rule-input", purpose: "replay-required", key }] })),
    omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local", cost: budget.admitted() });
  const built = await buildJournalPass({ format: "sha1", selection, parent: null, budget, input: {
    entry: async (seq, limit) => seq === 0 && utf8(body).length <= limit ? body : null,
    retained: async (key, limit) => {
      const found = retained.find(value => canonicalize(value.key) === canonicalize(key));
      return found && utf8(found.body).length <= limit ? found.body : null;
    },
  } });
  expect(built.ok ? "accepted" : built).toBe("accepted"); if (!built.ok) return;
  const archive = built.archive, commit = archive.objects.find(value => value.id === archive.commit)!;
  const treeBytes = archive.objects.filter(value => value.type === "tree").reduce((sum, value) => sum + value.data.length, 0);
  // The commit reply fits its own original allowance, but the next root
  // tree's recursive reply exceeds 295 + 8192. Nothing is resized to fit.
  expect(treeBytes + commit.data.length).toBeLessThanOrEqual(1024 + 8192);
  expect(treeBytes).toBeGreaterThan(295 + 8192);
  for (const object of archive.objects) host.peer.data.set(object.id, object);
  host.peer.refs.set(journalRef(lane.at.scope), archive.commit);
  await lane.inside(state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at);
    rows.target(repository, "sha1");
    for (const file of retained) sql.exec("INSERT INTO retained_input (kind, digest, bytes, under) VALUES ('rule', ?, ?, NULL)", file.key.digest, file.body).toArray();
    const mark = { commit: archive.commit, parent: null, through: head, manifest: selection, markedAt: lane.c.clock.now, layout: 2 as const };
    const bookkeeping = new ArchiveBudget(); rows.markAttempt(mark, lane.c.clock.now, bookkeeping); rows.confirm(mark.commit, bookkeeping);
  });
  const original = await row(lane); expect(await keys(lane)).toEqual([]);
  await lane.inside(async state => {
    const sql = archiveSql(state), row = new ArchiveRows(sql, lane.at).load()!, budget = new ArchiveBudget();
    const identity = { at: lane.at, format: "sha1" as const, repository: digestBytes(utf8(canonicalize(repository))) };
    const frontiers = new ArchiveFrontiers(sql, identity), context = frontiers.beginConfirmedBootstrap(budget);
    expect(context).not.toBeNull(); if (!context) return;
    const finish = frontiers.bootstrapFinish(context); expect(finish.ok).toBe(true); if (!finish.ok) return;
    const allowed = () => { budget.check(); return true; };
    await expect((async () => {
      const captured = await budget.lookaheadAsync(finish.cost, async () => {
        const remote = await archiveParent(row, host.provider, 8 * 1024 * 1024, budget, allowed, null);
        expect(remote.parent).not.toBeNull();
        return captureJournalParentFrontier(context.binding, remote.parent!.source, budget);
      });
      expect(captured.kind).toBe("read"); if (captured.kind !== "read") return;
      const prepared = await frontiers.prepareConfirmedBootstrap(context, captured.value, budget);
      frontiers.installConfirmedBootstrap(prepared, budget);
    })()).rejects.toMatchObject({ reason: "unavailable" });
  });
  expect(host.refusals).toEqual([{ reason: "too-large", what: "inflated bytes" }]);
  expect(host.reads).toEqual([{ id: archive.commit, type: "commit", maximum: 1024 },
    { id: parseCommit(commit.data).tree, type: "tree", maximum: 295 }]);
  expect(host.controls.uploadPosts).toBe(2); expect(host.controls.mintCalls).toBe(0); expect(host.controls.sendCalls).toBe(0);
  expect(await keys(lane)).toEqual([]); expect(await row(lane)).toEqual(original); expect(host.controls.closureReads).toBe(0);
}, 20_000);

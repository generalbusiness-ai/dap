/** Mechanical selected-inventory fixture only. These bytes are canonical,
 * signed and hash checked; no Native judgment or export authority is claimed. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type Head, type Intent, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, intentDigest, keyIdOfSecret, newIncarnation, scopeIdOf, signIntent, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { GitRefusal, objectId, parseCommit, parseTree, Reader } from "@generalbusiness/dap-git";
import { buildJournalPass, captureJournalParentFrontier, JOURNAL_PARENT_FRONTIER_BYTES, JOURNAL_PARENT_FRONTIER_OBJECTS,
  journalRef, journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath, type JournalInputSource,
  type JournalObject, type JournalParentBinding } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { planArchive } from "../src/archive-build.ts";
import type { ArchiveSend, FixtureArchiveProvider } from "../src/archive-driver.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";
import { createNativeArchiveLane } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { at, create, rita, type Lane } from "./fixtures-native.ts";
import { archiveParent, copyArchiveObjects } from "../src/archive-parent.ts";
import { ArchiveFrontiers } from "../src/archive-frontier-store.ts";
import { ARCHIVE_FRONTIER_BYTES } from "../src/archive-frontier-cost.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import type { DestinationRepository } from "../src/destination-host.ts";
import type { ArchiveMark } from "../src/archive-row.ts";
import { finishArchiveParentRead } from "../src/archive-parent-read-diagnostic.ts";

function selectedPasses(count: number) {
  const secret = new Uint8Array(32).fill(29), actor = keyIdOfSecret(secret);
  const intent: Intent = { v: 1, to: null, actor, kind: "install", on: null, expected: {}, fields: {},
    idempotencyKey: "TEST fixed parent frontier", notAfter: "2030-01-01T00:00:00Z" };
  const seed: Seed = { v: 1, kind: "register", definition: "platform:register@1", creator: null,
    cause: intentDigest(intent), ordinal: 0 };
  const at = { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(29)), kind: "register" as const };
  const entries: { body: string; head: Head }[] = [];
  const retained = new Map<string, string>();
  const passes = [];
  for (let seq = 0; seq < count; seq++) {
    const input: Entry["input"] = seq === 0
      ? { type: "genesis", seed, inc: at.inc, kind: intent.kind, founding: signIntent(intent, secret), source: null, n: null, message: null, decision: "applied" }
      : { type: "checkpoint", through: seq - 1, state: digestBytes(utf8(`TEST state ${seq}`)) };
    const entry: Entry = { v: 1, at, seq, prev: entries.at(-1)?.head.hash ?? null,
      time: timeOf(1_700_000_000_900 + seq * 1000), clamped: false, epoch: 0, input,
      uses: [], prepared: [], effects: [], sends: [] };
    const body = canonicalize(entry), head = { seq, hash: entryHash(entry) };
    const files = [0, 1].map(file => {
      const body = canonicalize({ fixture: "fixed-parent", pass: seq, file });
      const key = { kind: "rule" as const, digest: digestBytes(utf8(body)) };
      retained.set(canonicalize([key.kind, key.digest]), body);
      return { key, body };
    });
    const after = entries.at(-1)?.head ?? null;
    entries.push({ body, head });
    passes.push({ head, after, body, files, description: {
      format: "artroom-local-inventory-2", at, through: head, after,
      entries: [{ seq, hash: head.hash, bytes: utf8(body).length }],
      objects: files.map(({ key, body }) => ({ key, bytes: utf8(body).length, pass: seq,
        consumers: [{ mode: "required", origin: { at: { at, seq, hash: head.hash }, input: input.type },
          consumer: "rule-input", purpose: "replay-required", key }] })),
      omittedTexts: [], ancestryUnwalked: [], replay: "unchecked", retention: "observed-local",
    } });
  }
  const input: JournalInputSource = {
    entry: async (seq, limit) => {
      const body = entries[seq]?.body;
      return body !== undefined && utf8(body).length <= limit ? body : null;
    },
    retained: async (key, limit) => {
      const body = retained.get(canonicalize([key.kind, key.digest]));
      return body !== undefined && utf8(body).length <= limit ? body : null;
    },
  };
  return { at, entries, passes, input, selection: (seq: number, budget: ArchiveBudget) => {
    budget.spend({ entries: 1, attempts: 2 });
    return canonicalize({ ...passes[seq]!.description, cost: budget.admitted() });
  } };
}

/** Independent full final graph traversal, outside the charged writer. It
 * checks all old pass files and bodies, not the writer's frontier cache. */
async function finalFiles(peer: ArchiveArtifactsPeer, commit: string) {
  const reader = new Reader(peer.source), root = await reader.commit(objectId(commit, "fixed-parent final"));
  const files = new Map<string, string>(), decoder = new TextDecoder();
  async function tree(id: typeof root.tree, prefix: string): Promise<void> {
    for (const row of await reader.tree(id)) {
      const path = prefix + decoder.decode(row.name);
      if (row.kind === "tree") await tree(row.id, path + "/");
      else {
        if (row.kind !== "blob" || row.mode !== "100644") throw new Error("Unexpected final archive mode");
        // The independent Reader validates the Git blob identity too.
        const blob = await reader.object(row.id, "blob");
        files.set(path, decoder.decode(blob));
      }
    }
  }
  await tree(root.tree, "");
  return { reader, root, files };
}

/** Observe the current parent's actual blob:none tree payload only after a
 * refused read. This independent fixture walk grants no production budget. */
async function parentTreeBytes(peer: ArchiveArtifactsPeer, commit: string) {
  const reader = new Reader(peer.source), id = objectId(commit, "fixed-parent refused parent");
  const commitBody = await reader.object(id, "commit"), root = parseCommit(commitBody), commitBytes = commitBody.length;
  const pending = [root.tree], seen = new Set<string>(); let treeBytes = 0;
  while (pending.length) {
    const tree = pending.pop()!;
    if (seen.has(tree)) continue;
    seen.add(tree); const body = await reader.object(tree, "tree"); treeBytes += body.length;
    for (const edge of parseTree(body)) if (edge.kind === "tree") pending.push(edge.id);
  }
  return { commit, commitBytes, treeBytes, trees: seen.size };
}

// Invariant: the charged parent path and native witness stay bounded while
// 200 real Git appends preserve 400 distinct retained files. Input selection,
// repository, credentials and host replies are mechanical TEST stand-ins;
// SQLite, parent dispatch, layout, append admission and transport are real.
test("native parent state appends 200 host-shaped passes with two retained files each", async context => {
  const fixture = selectedPasses(200), lane = await create({}, {}, archiveDefinition);
  const repository: DestinationRepository = { host: "artifacts", namespace: "fixed-parent", name: "two-files", id: "two-files" };
  const now = Date.parse("2026-10-23T00:00:00Z"), peer = new ArchiveArtifactsPeer(repository, () => now, { verifyReceivedClosure: false });
  let parentRequests = 0;
  let parentError: { reason: string; what: string; id: string; type: JournalObject["type"]; maximum: number } | null = null;
  const actualProvider = new ArtifactsProvider({ host: repository.host, namespace: repository.namespace,
    service: "service.invalid", maxBytes: 8 * 1024 * 1024, binding: peer.binding,
    fetch: async request => {
      if (request.method === "POST" && request.url.endsWith("/git-upload-pack")) parentRequests++;
      return peer.fetch(request);
    }, credentialHandle: async () => { throw new Error("TEST fixture never enters production credential custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => timeOf(now), tokens: {
    fixture: "archive-tokens", read: async () => "TEST read",
    mint: async () => ({ id: "TEST handle", plaintext: "TEST write", ends: timeOf(now + 60_000) }), revoke: async () => {},
  } });
  const provider: FixtureArchiveProvider = { ...actualProvider,
    readObject: async (repository, object, allowed, budget) => {
      try { return await actualProvider.readObject!(repository, object, allowed, budget); }
      catch (error) {
        // Preserve this exact provider rejection before budget.wait maps it.
        if (error instanceof GitRefusal) parentError = { reason: error.reason, what: error.what,
          id: object.id, type: object.type, maximum: object.maximum };
        throw error;
      }
    },
  };
  const ref = journalRef(fixture.at.scope), repositoryDigest = digestBytes(utf8(canonicalize(repository)));
  const commits: string[] = [], observations: { pass: number; cost: ReturnType<ArchiveBudget["admitted"]>; stateBytes: number; parentRequests: number }[] = [];
  await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, fixture.at);
    const identity = { at: fixture.at, repository: repositoryDigest, format: "sha1" as const };
    const frontiers = new ArchiveFrontiers(sql, identity);
    rows.target(repository, "sha1");
    for (const [pass, selected] of fixture.passes.entries()) {
      parentError = null;
      const budget = new ArchiveBudget({}, () => 0), allowed = () => { budget.check(); return true; };
      const row = rows.load(budget)!;
      const base = row.confirmed ? await frontiers.readConfirmed({ ...identity, commit: row.confirmed.commit, through: row.confirmed.through }, budget) : null;
      expect(row.confirmed === null || base !== null, `pass ${pass}: confirmed receipt has native state`).toBe(true);
      const parent = await archiveParent(row, provider, 8 * 1024 * 1024, budget, allowed,
        base ? { frontier: base.frontier, source: frontiers.source(base, budget) } : null);
      const selection = fixture.selection(pass, budget);
      const built = await buildJournalPass({ format: "sha1", selection, input: fixture.input, parent: parent.parent, budget });
      const parentRead = finishArchiveParentRead(budget);
      if (!built.ok) {
        let treeObservation: Awaited<ReturnType<typeof parentTreeBytes>> | { unavailable: true } = { unavailable: true };
        try { if (row.confirmed) treeObservation = await parentTreeBytes(peer, row.confirmed.commit); }
        catch { /* A fixture observation must not replace the actual refusal. */ }
        (context.task.meta as Record<string, unknown>)["fixedParentFailure"] = {
          pass, completedPasses: commits.length, built, parentRead, parentError, treeObservation,
          cost: budget.admitted(), parentRequests,
        };
      }
      expect(built.ok ? "accepted" : built, JSON.stringify({ pass, parentRead, parentError, cost: budget.admitted() })).toBe("accepted");
      if (!built.ok) return;
      const archive = built.archive, all = new Map<string, JournalObject>();
      for (const id of parent.used) all.set(id, parent.held.get(id)!);
      for (const object of archive.objects) all.set(object.id, object);
      const source = { object: async (id: string, maximum: number) => {
        const object = all.get(id);
        return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
      } };
      const binding: JournalParentBinding = { ...identity, commit: archive.commit, through: selected.head };
      const frontier = await captureJournalParentFrontier(binding, source, budget);
      expect(frontier.objects).toHaveLength(JOURNAL_PARENT_FRONTIER_OBJECTS);
      expect(frontier.objects.reduce((n, object) => n + object.data.length, 0)).toBeLessThanOrEqual(JOURNAL_PARENT_FRONTIER_BYTES);
      const mark: ArchiveMark = { commit: archive.commit, parent: row.confirmed?.commit ?? null,
        through: selected.head, manifest: selection, markedAt: timeOf(now), layout: 2 };
      const prepared = await frontiers.prepare(frontier, mark, base, budget);
      for (const file of selected.files) sql.exec("INSERT INTO retained_input (kind, digest, bytes, under) VALUES ('rule', ?, ?, NULL)", file.key.digest, file.body).toArray();
      sql.transaction(() => { rows.markAttempt(mark, timeOf(now), budget); frontiers.stage(prepared, budget); });
      const objects = [...copyArchiveObjects([...all.values()], "sha1", budget, 8 * 1024 * 1024).values()];
      const credential = await provider.mintArchive(repository, fixture.at, allowed);
      expect(credential).not.toBeNull(); if (!credential) return;
      try {
        expect(await provider.sendArchive({ repository, at: fixture.at, ref, old: mark.parent,
          commit: mark.commit, objects, credential, allowed, ...(mark.parent ? { incremental: { budget } } : {}) })).toEqual({ send: "accepted" });
        expect(await provider.ref(repository, ref, allowed)).toBe(mark.commit);
      } finally { await provider.revokeArchive(credential); }
      sql.transaction(() => { frontiers.promote(prepared, budget); rows.confirm(mark.commit, budget); });
      const sizes = sql.exec<{ k: string; size: number }>("SELECT k, octet_length(v) AS size FROM meta WHERE k IN ('archive-frontier-confirmed-1', 'archive-frontier-pending-1') ORDER BY k").toArray();
      expect(sizes).toHaveLength(1); expect(sizes[0]!.k).toBe("archive-frontier-confirmed-1");
      expect(sizes[0]!.size).toBeLessThanOrEqual(ARCHIVE_FRONTIER_BYTES);
      const cost = budget.admitted();
      for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof typeof cost)[]) expect(cost[key], `pass ${pass}: ${key}`).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
      observations.push({ pass, cost, stateBytes: sizes[0]!.size, parentRequests }); commits.push(mark.commit);
    }
  });
  expect(commits).toHaveLength(200); expect(peer.sends).toEqual(commits); expect(parentRequests).toBe(0);
  const last = commits.at(-1)!;
  const { reader, files } = await finalFiles(peer, last);
  expect(files.size).toBe(801);
  expect(JSON.parse(files.get("journal/v2/head.json")!)).toEqual({ v: 2, scope: fixture.at, through: 199, hash: fixture.entries[199]!.head.hash });
  for (const [pass, selected] of fixture.passes.entries()) {
    const commit = await reader.commit(objectId(commits[pass]!, "fixed-parent chain"));
    expect(commit.parents).toEqual(pass === 0 ? [] : [commits[pass - 1]]);
    expect(JSON.parse(files.get(journalV2PassPath(pass))!)).toMatchObject({ v: 2, entries: [pass, pass],
      parent: pass === 0 ? null : commits[pass - 1], through: selected.head,
      retained: expect.arrayContaining(selected.files.map(file => ({ ...file.key, pass }))) });
    expect(files.get(journalV2SegmentPath(pass))).toBe(selected.body);
    for (const file of selected.files) expect(files.get(journalV2RetainedPath(pass, file.key))).toBe(file.body);
  }
  (context.task.meta as Record<string, unknown>)["fixedParent"] = { passes: 200, retainedFiles: 400, observations,
    qualification: "Mechanical selected entries and retained rules; actual native SQLite state, production parent resolver, Git builder, append admission and smart HTTP. Scripted Artifacts/token service only. Final complete graph read once outside the charged writer. No replay, hosted performance or legacy bootstrap claim." };
}, 20_000);

const row = (lane: Lane) => lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
async function due(lane: Lane) {
  const next = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
  if (next) lane.c.clock.now = next;
}
class LostReadbackHost extends ScriptedHost {
  loseReadback = false;
  #refUnavailable = false;
  override async ref() {
    if (this.#refUnavailable) { this.#refUnavailable = false; throw new Error("TEST unavailable immediate readback"); }
    return super.ref();
  }
  override async sendArchive(request: ArchiveSend) {
    const result = await super.sendArchive(request);
    if (this.loseReadback) { this.loseReadback = false; this.#refUnavailable = true; return null; }
    return result;
  }
}

// Real Native entries, SQLite transactions and eviction. Repository, token,
// authority fixture setup and HTTP acceptance remain explicit stand-ins.
test("native parent state resumes the exact Mark and confirms lost readback after eviction", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new LostReadbackHost("sha1");
  host.missingMint = true;
  const initialHead = await lane.head();
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "retry", reason: "unavailable" });
  const initial = (await row(lane))!, marked = initial.pending!;
  expect(marked).not.toBeNull(); expect(host.data.size).toBe(0); expect(host.sends).toEqual([]);
  await lane.restart();
  await lane.did(rita, "remark", { on: 0, fields: { text: "new input after the durable Mark" } });
  const later = await lane.head(); expect(later.seq).toBeGreaterThan(marked.through.seq);
  await due(lane);
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  expect(host.sends).toEqual([marked.commit]);
  expect((await row(lane))?.confirmed).toMatchObject({ commit: marked.commit, through: initialHead, layout: 2 });
  expect(await lane.head()).toEqual(later);

  host.loseReadback = true; await due(lane);
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "retry", reason: "unavailable" });
  const pending = (await row(lane))!.pending!;
  expect(pending).toMatchObject({ parent: marked.commit, through: later, layout: 2 });
  expect(host.pointer).toBe(pending.commit); expect(host.sends).toHaveLength(2);
  const mintCalls = host.mintCalls, sends = [...host.sends], objectReads = [...host.objectReads], closureReads = host.closureReads;
  await lane.restart(); await due(lane);
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  expect((await row(lane))?.confirmed).toMatchObject({ commit: pending.commit, through: later, layout: 2 });
  expect(host.sends).toEqual(sends); expect(host.mintCalls).toBe(mintCalls);
  expect(host.objectReads).toEqual(objectReads); expect(host.closureReads).toBe(closureReads); expect(await lane.head()).toEqual(later);
}, 20_000);

// An existing legacy Mark is accepted by its exact ref before any new
// parent-state lookup. This does not install or promise a legacy bootstrap.
test("a legacy pending Mark confirms by exact readback without a frontier or a second send", async () => {
  const lane = await createNativeArchiveLane({}, {}, archiveDefinition), host = new ScriptedHost("sha1"), head = await lane.head();
  const old = await lane.inside(state => planArchive(archiveSql(state), { at: lane.at, through: head,
    bounds: PROPOSED_BOUNDS, policies: archivePolicies, format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(old.ok ? "accepted" : old).toBe("accepted"); if (!old.ok) return;
  await lane.inside(state => {
    const rows = new ArchiveRows(archiveSql(state), lane.at);
    rows.target(archiveRepository, "sha1"); rows.mark(old.mark);
  });
  // Host acceptance is scripted, as if the old binary sent before eviction.
  for (const object of old.archive.objects) host.data.set(object.id, object);
  host.pointer = old.mark.commit;
  await lane.restart();
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  expect((await row(lane))?.confirmed).toEqual({ commit: old.mark.commit, through: head });
  expect((await row(lane))?.pending).toBeNull();
  expect(host.sends).toEqual([]); expect(host.mintCalls).toBe(0); expect(host.objectReads).toEqual([]); expect(host.closureReads).toBe(0);
  expect(await lane.head()).toEqual(head);
});

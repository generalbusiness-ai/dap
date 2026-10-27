/** Genuine Native v2 receipts and checkpoint backlog through the actual
 * archive driver/Artifacts adapter. Host, credentials and clock are TEST
 * stand-ins; no hosted service or throughput claim. */
import { expect, test } from "vitest";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { parseCommit } from "@generalbusiness/dap-git";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { journalRef, JOURNAL_SELECTION_BYTES } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { planRootArchivePass } from "../src/archive-build.ts";
import { ArchiveDriver, type FixtureArchiveProvider } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { nativeArchiveFixture, archiveAuthorityBasis, archiveAuthorityPolicies, archiveAuthorityAnchors } from "./support/archive-native-authority.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { archiveDefinition, archivePolicies, archiveRepository as scriptedRepository, archiveSql } from "./support/archive.ts";
import type { TestScope } from "./worker.ts";
import { rita } from "./fixtures-native.ts";

const CHECKPOINT_BACKLOG = 300;
// Parent metadata/legacy manifest reads must leave at least three quarters
// of the original work allowance available for Native selection and finish.
// The old maximum-based host tariff alone spends >32MiB on a 1MiB manifest.
const LEGACY_PARENT_PREPLANNING_WORK = ARCHIVE_BOUNDS.inputWork / 4;

type CostShare = { calls: number; cost: ArchiveCost };
type DebitOwner = { share: CostShare; site: CostShare | null };

/** Test-only attribution. Admission and owned settlement use the real budget.
 * Net shares retain each reservation's original stage and site on settlement. */
class ObservedArchiveBudget extends ArchiveBudget {
  stage = "before-parent";
  readonly checkpoints: { name: string; cost: ArchiveCost }[] = [];
  readonly shares = new Map<string, { calls: number; cost: ArchiveCost }>();
  readonly preEntrySites = new Map<string, { calls: number; cost: ArchiveCost }>();
  private beforeFirstScoutedEntry = true;
  private lastDebit: DebitOwner | null = null;
  private readonly reservationOwners = new WeakMap<object, DebitOwner>();
  checkpoint(name: string) { if (!this.checkpoints.some(row => row.name === name)) this.checkpoints.push({ name, cost: this.admitted() }); }
  override spend(cost: Partial<ArchiveCost>): void {
    const before = this.admitted(); super.spend(cost); const after = this.admitted();
    const row = this.shares.get(this.stage) ?? { calls: 0, cost: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 } };
    row.calls++;
    for (const key of Object.keys(row.cost) as (keyof ArchiveCost)[]) row.cost[key] += after[key] - before[key];
    this.shares.set(this.stage, row);
    const owner: DebitOwner = { share: row, site: null }; this.lastDebit = owner;
    if (this.beforeFirstScoutedEntry) {
      let site = "<stack unavailable>";
      try { site = (new Error("TEST debit site").stack ?? "").split("\n").slice(1, 17)
        .find(line => !line.includes("archive-input-work.test") && !line.includes("archive-budget") && line.trim())?.trim().slice(0, 512) ?? site; }
      catch { /* Site attribution is descriptive, never an admission rule. */ }
      if (!this.preEntrySites.has(site) && this.preEntrySites.size >= 255) site = "<additional sites>";
      const bucket = this.preEntrySites.get(site) ?? { calls: 0, cost: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 } };
      bucket.calls++;
      for (const key of Object.keys(bucket.cost) as (keyof ArchiveCost)[]) bucket.cost[key] += after[key] - before[key];
      this.preEntrySites.set(site, bucket);
      owner.site = bucket;
    }
  }
  override reserve(cost: Partial<ArchiveCost>): object {
    const handle = super.reserve(cost), owner = this.lastDebit;
    if (!owner) throw Error("TEST reservation must have its admitted debit owner");
    this.reservationOwners.set(handle, owner);
    return handle;
  }
  override settle(handle: object, received: number): void {
    const before = this.admitted(); super.settle(handle, received); const after = this.admitted();
    const owner = this.reservationOwners.get(handle);
    if (!owner) throw Error("TEST settlement must retain its reservation owner");
    for (const key of Object.keys(owner.share.cost) as (keyof ArchiveCost)[]) {
      owner.share.cost[key] += after[key] - before[key];
      if (owner.site) owner.site.cost[key] += after[key] - before[key];
    }
    this.reservationOwners.delete(handle);
  }
  override lookahead<T>(reserve: Partial<ArchiveCost>, read: () => T) {
    this.checkpoint("before-scouting"); this.stage = "scouting-and-finish";
    const result = super.lookahead(reserve, read);
    if (result.kind === "read" && result.value !== null && typeof result.value === "object" && "kind" in result.value && result.value.kind === "position") { this.checkpoint("first-scouted-entry"); this.beforeFirstScoutedEntry = false; }
    return result;
  }
}

test("legacy v2 parent work preserves partial Native checkpoint progress and drains the exact remainder", async context => {
  const fixture = await nativeArchiveFixture(), lane = await fixture.create({}, {}, archiveDefinition);
  // Artifacts binds ID to name; the shared scripted-host tuple need not.
  const archiveRepository = { ...scriptedRepository, id: scriptedRepository.name };
  const peer = new ArchiveArtifactsPeer(archiveRepository, () => Date.parse(lane.c.clock.now));
  await lane.did(rita, "remark", { on: 0, fields: { text: "require genuine legacy authority" } });
  expect(archiveAuthorityAnchors(lane).length).toBeGreaterThan(0);
  const originalHead = await lane.head();
  const seeded = await lane.inside(async state => {
    const sql = archiveSql(state), budget = new ArchiveBudget();
    const made = await planRootArchivePass(sql, { at: lane.at, through: originalHead, after: null,
      bounds: PROPOSED_BOUNDS, policies: archiveAuthorityPolicies(lane, archivePolicies), format: "sha1",
      parent: null, markedAt: lane.c.clock.now, fixtureSources: archiveAuthorityBasis(lane)!.pins }, budget);
    expect(made.ok ? "accepted" : made).toBe("accepted");
    if (!made.ok) throw Error(canonicalize(made));
    const rows = new ArchiveRows(sql, lane.at);
    rows.target(archiveRepository, "sha1"); rows.mark(made.mark);
    expect(rows.confirm(made.mark.commit).confirmed).toEqual({ commit: made.archive.commit, through: originalHead, layout: 2 });
    return made.archive;
  });
  const seedTreeBytes = seeded.objects.filter(object => object.type === "tree").reduce((sum, object) => sum + object.data.length, 0);
  const seedBlobs = seeded.objects.filter(object => object.type === "blob").length;
  expect(seeded.objects.filter(object => object.type === "commit")).toHaveLength(1);
  expect(seedTreeBytes).toBeLessThanOrEqual(745); expect(seedBlobs).toBeLessThanOrEqual(6);
  for (const object of seeded.objects) peer.data.set(object.id, object);
  peer.refs.set(journalRef(lane.at.scope), seeded.commit);
  await lane.inside(async (_state, instance) => {
    for (let n = 0; n < CHECKPOINT_BACKLOG; n++) expect(await (instance as TestScope).checkpoint()).toMatchObject({ answer: "written" });
  });
  const head = await lane.head(); expect(head.seq - originalHead.seq).toBe(CHECKPOINT_BACKLOG);
  const checkpointBytes = await lane.inside(state => state.storage.sql.exec<{ minimum: number; maximum: number; total: number }>(
    "SELECT MIN(octet_length(bytes)) AS minimum, MAX(octet_length(bytes)) AS maximum, SUM(octet_length(bytes)) AS total FROM entry WHERE seq > ?", originalHead.seq).one());
  expect(checkpointBytes.minimum).toBeGreaterThan(0);
  const budgets: ObservedArchiveBudget[] = [];
  let beforePlanning: ArchiveCost[] = [];
  const observations: { pass: number; from: number; through: number; selectedEntries: number; remainingEntries: number;
    commit: string; attemptedEntries: number; completedEntries: number; parentReads: number; parentPath: "unpublished-legacy-proof" | "native-published"; beforePlanning: ArchiveCost[]; final: ArchiveCost; checkpoints: ObservedArchiveBudget["checkpoints"];
    shares: [string, { calls: number; cost: ArchiveCost }][]; preEntrySites: [string, { calls: number; cost: ArchiveCost }][] }[] = [];
  // Install the metadata container before the named control assertion so a
  // failed control retains the actual original pass and reconstructed costs.
  (context.task.meta as Record<string, unknown>)["legacyParentInputWork"] = { seedTreeBytes, seedBlobs,
    checkpointBytes, backlog: CHECKPOINT_BACKLOG, preplanningCeiling: LEGACY_PARENT_PREPLANNING_WORK, observations,
    qualification: "Actual Native300 backlog, original per-pass caps, truthful TEST HTTP/token/repository; local net debit shares after owned settlement. No4096 completion, hosted or throughput claim." };
  const actual = new ArtifactsProvider({ host: archiveRepository.host, namespace: archiveRepository.namespace,
    service: "service.invalid", maxBytes: 8 * 1024 * 1024, binding: peer.binding, fetch: request => peer.fetch(request),
    credentialHandle: async () => { throw Error("TEST fixture never uses production credential custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => lane.c.clock.now, tokens: {
    fixture: "archive-tokens", read: async () => "TEST-parent-read",
    mint: async () => ({ id: "TEST append handle", plaintext: "TEST-append-write", ends: timeOf(Date.parse(lane.c.clock.now) + 60_000) }), revoke: async () => {},
  } });
  let mintCalls = 0, parentReads = 0;
  const provider: FixtureArchiveProvider = { ...actual,
    mintArchive: async (...args) => { mintCalls++; return actual.mintArchive(...args); },
    readObject: async (repository, object, allowed, budget) => {
      parentReads++;
      expect(budget).toBe(budgets.at(-1)); const observed = budgets.at(-1)!; observed.checkpoint("before-parent");
      if (object.type === "blob" && object.maximum === JOURNAL_SELECTION_BYTES) observed.checkpoint("before-legacy-manifest");
      const prior = observed.stage; observed.stage = "parent-adapter";
      let answer: Awaited<ReturnType<NonNullable<FixtureArchiveProvider["readObject"]>>>;
      try { answer = await actual.readObject!(repository, object, allowed, budget); }
      finally { observed.stage = prior; }
      if (object.type === "blob" && object.maximum === JOURNAL_SELECTION_BYTES && !observed.checkpoints.some(row => row.name === "before-scouting")) {
        beforePlanning.push(budget.admitted()); observed.stage = "legacy-reconstruction";
      }
      return answer;
    },
    sendArchive: async request => {
      expect(request.incremental?.budget).toBe(budgets.at(-1)); budgets.at(-1)!.checkpoint("before-send"); budgets.at(-1)!.stage = "send-and-confirm";
      return actual.sendArchive(request);
    },
  };
  // Explicit missing-frontier migration alarm: it pays its own original
  // pass budget, archives no backlog entries, and cannot mint or send.
  const beforeSeed = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
  const migration = await lane.inside(state => new ArchiveDriver({ sql: archiveSql(state), current: () => ({ at: lane.at, head }),
    clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS,
    policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) }, fixtureSources: archiveAuthorityBasis(lane)!.pins,
    target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider,
    budget: () => { const budget = new ObservedArchiveBudget(); budgets.push(budget); return budget; },
  }).run());
  expect(migration).toMatchObject({ state: "retry" }); expect(migration.reason).toBeUndefined();
  expect(peer.sends).toEqual([]); expect(mintCalls).toBe(0);
  expect(await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load())).toEqual(beforeSeed);
  expect(await lane.inside(state => state.storage.sql.exec("SELECT k FROM meta WHERE k IN ('archive-frontier-confirmed-1', 'archive-frontier-pending-1') ORDER BY k").toArray()))
    .toEqual([{ k: "archive-frontier-confirmed-1" }]);
  (context.task.meta as Record<string, unknown>)["legacyParentMigration"] = { result: migration, cost: budgets[0]!.admitted(),
    qualification: "Separate seed-only alarm under its original budget with owned read settlement; excluded from append prefix totals, never credited to another pass." };
  const migrationBudget = budgets.shift()!;
  expect(migrationBudget.admitted().entries).toBe(0);
  beforePlanning = [];
  let through = originalHead, priorCommit = seeded.commit;
  for (let pass = 0; through.seq < head.seq && pass < CHECKPOINT_BACKLOG; pass++) {
    beforePlanning = [];
    const readsBeforePass = parentReads;
    const next = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).wake());
    if (next) lane.c.clock.now = next;
    const result = await lane.inside(state => new ArchiveDriver({ sql: archiveSql(state), current: () => ({ at: lane.at, head }),
      clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS,
      policies: { fixture: "archive-policies", registry: archiveAuthorityPolicies(lane, archivePolicies) }, fixtureSources: archiveAuthorityBasis(lane)!.pins,
      target: { fixture: "archive-target", resolve: async () => archiveRepository }, provider,
      budget: () => { const budget = new ObservedArchiveBudget(); budgets.push(budget); return budget; },
    }).run());
    const budget = budgets.at(-1)!; budget.checkpoint("finished"); const final = budget.admitted();
    const sum: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
    for (const share of budget.shares.values()) for (const key of Object.keys(sum) as (keyof ArchiveCost)[]) sum[key] += share.cost[key];
    (context.task.meta as Record<string, unknown>)["currentLegacyPass"] = { pass, result, beforePlanning, final,
      checkpoints: budget.checkpoints, shares: [...budget.shares], preEntrySites: [...budget.preEntrySites] };
    expect(budget.preEntrySites.has("<additional sites>")).toBe(false);
    // Sole host control reintroduces the former maximum debit, while new
    // staged debits remain. Match this cost AssertionError, not a setup error.
    if (pass === 0) {
      expect(beforePlanning.length).toBeGreaterThan(0);
      for (const cost of beforePlanning) expect(cost.inputWork, "Legacy parent preplanning work must leave the Native finish allowance").toBeLessThan(LEGACY_PARENT_PREPLANNING_WORK);
    }
    expect(result, canonicalize({ pass, result, final, beforePlanning })).toMatchObject({ state: "confirmed" });
    const row = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load());
    expect(row?.pending).toBeNull(); expect(row?.stopped).toBeNull();
    const receipt = row!.confirmed!; expect(receipt).toMatchObject({ layout: 2, anchorsPublished: true });
    expect(receipt.through.seq).toBeGreaterThan(through.seq); expect(receipt.through.seq).toBeLessThanOrEqual(head.seq);
    if (pass === 0) expect(receipt.through.seq).toBeLessThan(head.seq);
    const selectedEntries = receipt.through.seq - through.seq, remainingEntries = head.seq - receipt.through.seq;
    expect(selectedEntries).toBeGreaterThan(0); expect(selectedEntries).toBeLessThanOrEqual(ARCHIVE_BOUNDS.entries);
    const nativeHash = await lane.inside(state => state.storage.sql.exec<{ hash: string }>("SELECT hash FROM entry WHERE seq = ?", receipt.through.seq).one().hash);
    expect(receipt.through.hash).toBe(nativeHash);
    expect(peer.sends).toHaveLength(pass + 1); expect(peer.sends[pass]).toBe(receipt.commit);
    expect(peer.refs.get(journalRef(lane.at.scope))).toBe(receipt.commit);
    expect(parseCommit(peer.data.get(receipt.commit)!.data).parents).toEqual([priorCommit]);
    // The immutable Native journal is still complete and the unarchived
    // suffix is exactly the range after this receipt, with no skipped entries.
    const remainder = await lane.inside(state => state.storage.sql.exec<{ n: number; first: number | null; last: number | null }>(
      "SELECT COUNT(*) AS n, MIN(seq) AS first, MAX(seq) AS last FROM entry WHERE seq > ?", receipt.through.seq).one());
    expect(remainder.n).toBe(remainingEntries);
    expect(remainder.first).toBe(remainingEntries === 0 ? null : receipt.through.seq + 1);
    expect(remainder.last).toBe(remainingEntries === 0 ? null : head.seq);
    expect(sum).toEqual(final);
    const firstScouted = budget.checkpoints.find(value => value.name === "first-scouted-entry");
    expect(firstScouted).toBeDefined();
    const beforeEntry: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
    for (const site of budget.preEntrySites.values()) for (const key of Object.keys(beforeEntry) as (keyof ArchiveCost)[]) beforeEntry[key] += site.cost[key];
    expect(beforeEntry).toEqual(firstScouted!.cost);
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) expect(final[key]).toBeLessThanOrEqual(ARCHIVE_BOUNDS[key]);
    const readsThisPass = parentReads - readsBeforePass;
    if (pass === 0) expect(readsThisPass).toBeGreaterThan(0); else expect(readsThisPass).toBe(0);
    observations.push({ attemptedEntries: final.entries, completedEntries: selectedEntries, parentReads: readsThisPass,
      parentPath: pass === 0 ? "unpublished-legacy-proof" : "native-published", pass, from: through.seq + 1, through: receipt.through.seq, selectedEntries, remainingEntries,
      commit: receipt.commit, beforePlanning, final, checkpoints: budget.checkpoints, shares: [...budget.shares], preEntrySites: [...budget.preEntrySites] });
    through = receipt.through; priorCommit = receipt.commit;
  }
  expect(observations.length).toBeGreaterThan(1); expect(through).toEqual(head);
  expect(observations.reduce((sum, pass) => sum + pass.selectedEntries, 0)).toBe(CHECKPOINT_BACKLOG);
  expect(observations.at(-1)!.remainingEntries).toBe(0); expect(budgets).toHaveLength(observations.length);
  (context.task.meta as Record<string, unknown>)["nativeDrain"] = { backlog: CHECKPOINT_BACKLOG,
    target: head, completedThrough: through, passes: observations.length,
    entriesPerPass: observations.map(value => ({ pass: value.pass, from: value.from, through: value.through,
      attemptedEntries: value.attemptedEntries, completedEntries: value.completedEntries, remainingEntries: value.remainingEntries,
      parentPath: value.parentPath, parentReads: value.parentReads, cost: value.final })),
    originalBounds: ARCHIVE_BOUNDS, previousMeasuredPrefixRange: [41, 44],
    qualification: "Actual current Native300 drain; compare measured prefixes to prior41-44, do not infer performance or backlog13031 recovery. Seed alarm is separately reported with zero archived entries." };
  expect(await lane.head()).toEqual(head);
  const expectedAnchors = archiveAuthorityAnchors(lane); expect(expectedAnchors.length).toBeGreaterThan(0);
  const publications = [...peer.data.values()].filter(object => object.type === "blob")
    .map(object => new TextDecoder().decode(object.data)).filter(text => text.includes('"legacyAnchors"'));
  expect(publications).toHaveLength(1); const publication = JSON.parse(publications[0]!);
  expect(publication).toMatchObject({ legacyAnchors: { from: 0, through: originalHead.seq, anchors: expect.arrayContaining([...expectedAnchors]) } });
  expect(publication.legacyAnchors.anchors).toHaveLength(expectedAnchors.length);
}, 30_000);

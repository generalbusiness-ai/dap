/** U2: the archive after an application upgrade. Real native SQLite, turns, archive rows and driver. The scripted
 * host, the repository and the policy disposition are TEST stand-ins: the installed proof path of both forms runs
 * in the shared Base case of archive-installed.fixture.ts. The Rules store in the sender case is the same labelled
 * stand-in as in archive-application-proof.test.ts. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Head } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import type { Item, StateView } from "@generalbusiness/dap-derive";
import { created } from "@generalbusiness/dap-derive/testing";
import { UPGRADE_COHORT } from "@generalbusiness/dap-platform";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2 } from "../../platform/src/application-install-v2.ts";
import { isApplicationArchiveProofReplaced, readApplicationArchiveProof, storedApplicationArchiveProof } from "../src/applications/archive-proof.ts";
import { ArchiveDriver, type RoomArchiveDriverOptions } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { SqliteStore } from "../src/sqlite.ts";
import type { Store } from "../src/store.ts";
import { create, rita } from "./fixtures-native.ts";
import { applicationCounterPacket2 } from "./fixtures.ts";
import { driver, ScriptedHost } from "./support/archive-driver.ts";
import { createNativeArchiveLane, archiveAuthorityBasis, archiveAuthorityPolicies } from "./support/archive-native-authority.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";
import { ownReplayContext } from "./support/own-replay-context.ts";

const REPLACED = "application-replaced";
type Lane = Awaited<ReturnType<typeof createNativeArchiveLane>>;

/** A production-shaped driver whose policy owner answers `final`, as roomArchivePackages does for a replaced item. */
function replacedDriver(lane: Lane, state: DurableObjectState, host: ScriptedHost, head: Head, prepared: { count: number }) {
  const sql = archiveSql(state);
  const options: RoomArchiveDriverOptions = { production: "room-binding", sql, current: () => ({ at: lane.at, head }), clock: () => lane.c.clock.now,
    bounds: PROPOSED_BOUNDS, policies: { registry: archiveAuthorityPolicies(lane, archivePolicies) }, admit: () => true, provider: host,
    target: { resolve: async () => { host.targets++; return archiveRepository; } },
    preparePolicies: async () => { prepared.count++; return { final: REPLACED }; },
    sources: async (_after, _through, budget) => ({ pins: archiveAuthorityBasis(lane)!.pins, replayContext: ownReplayContext(sql, lane.at, PROPOSED_BOUNDS.entryBytes, budget) }) };
  return new ArchiveDriver(options);
}
const inspect = (lane: Lane) => lane.inside(state => {
  const rows = new ArchiveRows(archiveSql(state), lane.at);
  return { confirmed: rows.load()?.confirmed?.through ?? null, terminal: rows.terminal(), wake: rows.storedWake() };
});

test("U2 red (2): a replaced scope publishes through its head, then stops with application-replaced and leaves no wake", async () => {
  const host = new ScriptedHost("sha1"), lane = await createNativeArchiveLane({}, {}, archiveDefinition);
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  // The last entry before the archive reads the replacement is not yet published.
  await lane.did(rita, "remark", { on: 0, fields: { text: "TEST entry before the upgrade" } });
  const head = await lane.head(), sends = host.sends.length, prepared = { count: 0 };
  expect((await inspect(lane)).confirmed!.seq).toBeLessThan(head.seq);

  const ended = await lane.inside(state => replacedDriver(lane, state, host, head, prepared).run());
  expect(ended).toEqual({ state: "stopped", next: null, reason: REPLACED });
  expect(host.sends).toHaveLength(sends + 1);
  expect(await inspect(lane)).toEqual({ confirmed: head, terminal: { reason: REPLACED }, wake: { pending: false, stopped: true, next: null } });

  // Members can still act in the old scope. The archive publishes nothing more and asks its policy owner nothing.
  await lane.did(rita, "remark", { on: 0, fields: { text: "TEST entry after the stop" } });
  const later = await lane.head();
  expect(await lane.inside(state => replacedDriver(lane, state, host, later, prepared).run())).toEqual({ state: "stopped", next: null, reason: REPLACED });
  expect(host.sends).toHaveLength(sends + 1); expect(prepared.count).toBe(1);

  // Activation: the constructor calls committed(false), and a sealed commit calls committed(true). Neither sets a wake.
  const activated = await lane.inside(state => {
    const again = replacedDriver(lane, state, host, later, prepared);
    again.committed(false); const afterActivation = again.wake();
    again.committed(true); return { afterActivation, afterCommit: again.wake() };
  });
  expect(activated).toEqual({ afterActivation: null, afterCommit: null });
  expect(await inspect(lane)).toEqual({ confirmed: head, terminal: { reason: REPLACED }, wake: { pending: false, stopped: true, next: null } });
  expect(prepared.count).toBe(1);
});

test("U2: a replaced scope that is already published stops at its first pass and sends nothing", async () => {
  const host = new ScriptedHost("sha1"), lane = await createNativeArchiveLane({}, {}, archiveDefinition);
  expect(await lane.inside(state => driver(lane, state, host).run())).toMatchObject({ state: "confirmed" });
  const head = await lane.head(), sends = host.sends.length, prepared = { count: 0 };
  expect((await inspect(lane)).confirmed).toEqual(head);
  expect(await lane.inside(state => replacedDriver(lane, state, host, head, prepared).run())).toEqual({ state: "stopped", next: null, reason: REPLACED });
  expect(host.sends).toHaveLength(sends); expect(prepared.count).toBe(1);
  expect(await inspect(lane)).toEqual({ confirmed: head, terminal: { reason: REPLACED }, wake: { pending: false, stopped: true, next: null } });
});

test("U2: Rules 16 proves a replaced installation as replaced, with the proof it had while active", async () => {
  const packet = await applicationCounterPacket2(), lane = await create(), item = 7;
  const refs = {
    directory: created(undefined, { source: "TEST upgrade directory" }, "upgrade-directory").at,
    membership: created(undefined, { source: "TEST upgrade membership" }, "upgrade-membership").at,
    destination: created(undefined, { source: "TEST upgrade destination" }, "upgrade-destination").at,
    application: created(undefined, { source: "TEST upgrade application" }, "upgrade-application").at,
  };
  await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state)), actual = store.scope()!;
    const room = { id: 0, type: "rules", state: "current", refs: { directory: refs.directory }, values: { membership: refs.membership.scope } } as unknown as Item;
    const job = (state: string) => ({ id: item, type: "installation", state, refs: { membership: refs.membership, destination: refs.destination, scope: refs.application },
      values: { definition: packet.package.semantic.entry, ...packet.ids, publisher: packet.package.release.manifest.publisher } }) as unknown as Item;
    const source = (installation: Item) => ({
      scope: () => ({ ...actual, kind: "rules", head: { ...actual.head, seq: item } }), item: (id: number) => id === item ? installation : null,
      page: () => ({ items: [room], more: false }), itemBytes: (id: number) => id === item ? utf8(canonicalize(installation)).length : null,
      itemPositions: () => [{ id: 0, size: utf8(canonicalize(room)).length }],
      retainedSize: store.retainedSize.bind(store), retained: store.retained.bind(store),
    }) as unknown as StateView & Pick<Store, "retainedSize" | "retained"> & Pick<SqliteStore, "itemBytes" | "itemPositions">;
    store.retain({ kind: "value", domain: APPLICATION_SEMANTIC_VALUE2.domain, digest: packet.ids.semantic, bytes: canonicalize(packet.package.semantic) });
    store.retain({ kind: "value", domain: APPLICATION_RELEASE_VALUE2.domain, digest: packet.ids.release, bytes: canonicalize(packet.package.release) });
    const expected = { named: UPGRADE_COHORT.rules, rules: actual.at, directory: refs.directory, item };
    const active = storedApplicationArchiveProof(source(job("active")), UPGRADE_COHORT.rules, refs.directory, item);
    expect(typeof active).toBe("string");
    const replaced = storedApplicationArchiveProof(source(job("replaced")), UPGRADE_COHORT.rules, refs.directory, item);
    expect(isApplicationArchiveProofReplaced(replaced)).toBe(true);
    if (!isApplicationArchiveProofReplaced(replaced)) return;
    // The replaced item's proof is the proof it had while active, wrapped.
    expect(replaced).toEqual({ replaced: active });
    expect(readApplicationArchiveProof(replaced.replaced, expected)).toMatchObject({ installation: { item, ids: packet.ids, scope: refs.application } });
    expect(isApplicationArchiveProofReplaced(active)).toBe(false);
    expect(isApplicationArchiveProofReplaced({ replaced: active, extra: 1 })).toBe(false);
    for (const other of ["pending", "refused"])
      expect(storedApplicationArchiveProof(source(job(other)), UPGRADE_COHORT.rules, refs.directory, item)).toEqual({ reason: other === "pending" ? "installation-not-active" : "malformed-or-unsupported" });
  });
});

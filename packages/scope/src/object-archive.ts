/** Archive driver and fixture floor wiring, in the object's construction order. */
import type { Bounds, FloorInput } from "@generalbusiness/dap-contract";
import { ArchiveDriver } from "./archive-driver.ts";
import { ownOf, type Scope } from "./core.ts";
import { offerFloor } from "./floor-writer.ts";
import type { OutsideGiven } from "./given.ts";
import type { Wiring } from "./object.ts";
import type { Ports } from "./ports.ts";
import type { Chains } from "./signed-reads.ts";
import type { Sql, SqliteStore } from "./sqlite.ts";

export function configuredArchive(wiring: Wiring, outsideGiven: OutsideGiven, archiveSql: Sql, bounds: Bounds) {
  if (wiring.fixtureArchive && wiring.archive) throw new Error("archive wiring must have one owner");
  const archive = wiring.archive?.(outsideGiven, archiveSql, bounds) ?? wiring.fixtureArchive;
  return archive;
}

export function archiveDriver(archive: ReturnType<typeof configuredArchive>, archiveSql: Sql, store: SqliteStore, ports: Ports, bounds: Bounds): ArchiveDriver | null {
  return archive ? new ArchiveDriver({
    ...archive, sql: archiveSql,
    current: () => store.scope(), clock: () => ports.clock.read(), bounds,
  }) : null;
}

export function floorOffer(wiring: Wiring, readSql: Pick<Sql, "exec">, ctx: DurableObjectState, store: SqliteStore, scope: Scope, chains: Chains, ports: Ports, bounds: Bounds): (() => FloorInput | null) | null {
  const floorEnabled = wiring.fixtureArchive && [...wiring.fixtureArchive.policies.registry.values()].some(policy => policy.floor !== undefined);
  return floorEnabled ? () => {
    const pinned = scope.pinned(), pin = pinned?.named, policy = pin ? wiring.fixtureArchive!.policies.registry.get(pin)?.floor : null;
    const sequence = scope.localSequence();
    return policy && pinned?.definition && sequence ? offerFloor({ sql: { ...readSql, transaction: closure => ctx.storage.transactionSync(closure) }, store,
      own: ownOf(store, sequence), definition: pinned.definition, platform: pinned.platform ?? undefined, bounds, now: () => ports.clock.read(), discoveries: () => chains.discoveries() }, policy) : null;
  } : null;
}

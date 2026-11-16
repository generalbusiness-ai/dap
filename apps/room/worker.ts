/** Shared production room entry; Durable Object names remain stable. */
import { scopeWiring, scopeNamespace } from "../../packages/scope/src/internal/room-hooks.ts";
import { DeployedScope as Base, type Env } from "../../packages/scope/src/worker.ts";
import type { Wiring } from "../../packages/scope/src/object.ts";
import { roomArchiveConfiguration, roomArchiveDriver } from "./archive.ts";
import { nativeArchivePolicies } from "./archive-policy.ts";
import { roomArchivePackages } from "./archive-packages.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
export * from "../../packages/scope/src/worker.ts";
export { default } from "./fetch.ts";

// Catalog content is immutable; current package trust never enters this cache.
let native: ArchivePolicyRegistry | undefined;
export class DeployedScope<E extends Env = Env> extends Base<E> {
  protected override [scopeWiring](name: string | undefined): Wiring {
    const deployed = super[scopeWiring](name), config = roomArchiveConfiguration(this.env);
    if (!config) return deployed;
    native ??= nativeArchivePolicies();
    return { ...deployed, archiveHost: config,
      ...("ARCHIVE_RESTART_DIRECTIVE" in this.env ? { archiveRestart: this.env.ARCHIVE_RESTART_DIRECTIVE } : {}),
      archive: (given, sql, bounds) => {
        const policies = new Map(native!), binding = this[scopeNamespace]();
        const packages = roomArchivePackages(given, sql, binding, this.env, policies, bounds);
        return roomArchiveDriver(given, sql, binding, this.env, policies, bounds, undefined, packages);
      },
    };
  }
}

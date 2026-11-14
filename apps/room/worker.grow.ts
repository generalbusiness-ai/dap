/// <reference path="../../examples/grow/worker-env.d.ts" />
import { scopeWiring, scopeNamespace } from "../../packages/scope/src/internal/room-hooks.ts";
/** Grow's existing Durable Object class name and namespace, with explicit
 * room-only archive admission. Generic deployments keep their old entry. */
import currentPacket from "../../examples/grow/demo/application.dap.json";
import { DeployedScope as Base, type Env } from "./worker.ts";
import { growArchiveConfiguration, growArchiveDriver, type GrowArchiveEnvironment } from "./archive.ts";
import { GROW_ARCHIVE_DEFINITIONS, growArchivePolicies, type GrowArchiveRelease } from "./archive-policy.ts";
import { DEMO_PUBLISHER, DEMO_RELEASE } from "../../examples/grow/demo-release.ts";
import type { Wiring } from "../../packages/scope/src/object.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
export * from "./worker.ts";
export { default } from "./worker.ts";

/** The recorded signed demo release that the deployed Grow Worker trusts. */
const TRUSTED: GrowArchiveRelease = { release: DEMO_RELEASE, publisher: DEMO_PUBLISHER, entry: GROW_ARCHIVE_DEFINITIONS[0] };
let policies: ArchivePolicyRegistry | undefined;
export class DeployedScope<E extends Env & GrowArchiveEnvironment = Env & GrowArchiveEnvironment> extends Base<E> {
  protected override [scopeWiring](name: string | undefined): Wiring {
    const deployed = super[scopeWiring](name), config = growArchiveConfiguration(this.env, TRUSTED.release);
    if (!config) return deployed;
    // Grow's Wrangler Text rule supplies the exact signed bytes. A JSON
    // object import must never be serialized into substitute packet bytes.
    if (typeof currentPacket !== "string") throw new Error("Grow archive requires the signed Text module");
    policies ??= growArchivePolicies(currentPacket, TRUSTED);
    const reviewed = policies;
    return { ...deployed, archiveHost: config,
      ...(this.env.ARCHIVE_RESTART_DIRECTIVE === undefined ? {} : { archiveRestart: this.env.ARCHIVE_RESTART_DIRECTIVE }),
      archive: (given, sql, bounds) => growArchiveDriver(given, sql, this[scopeNamespace](), this.env, TRUSTED.release, reviewed, bounds),
    };
  }
}

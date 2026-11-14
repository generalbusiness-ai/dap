/// <reference path="../../examples/grow/worker-env.d.ts" />
import { scopeWiring, scopeNamespace } from "../../packages/scope/src/internal/room-hooks.ts";
/** Grow's existing Durable Object class name and namespace, with explicit
 * room-only archive admission. Generic deployments keep their old entry. */
import earlierPacket from "../../examples/grow/fixtures/earlier-application.dap.json";
import { DeployedScope as Base, type Env } from "./worker.ts";
import { growArchiveConfiguration, growArchiveDriver, type GrowArchiveEnvironment } from "./archive.ts";
import { growArchivePolicies, type GrowArchiveRelease } from "./archive-policy.ts";
import { DEMO_RELEASE } from "../../examples/grow/demo-release.ts";
import { EARLIER_GROW_DEFINITIONS, EARLIER_GROW_PUBLISHER, EARLIER_GROW_RELEASE } from "../../examples/grow/earlier-release.ts";
import type { Wiring } from "../../packages/scope/src/object.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
export * from "./worker.ts";
export { default } from "./worker.ts";

/** The earlier signed install proves policy; the current release gates activation. */
const EARLIER_TRUST: GrowArchiveRelease = { release: EARLIER_GROW_RELEASE, publisher: EARLIER_GROW_PUBLISHER, entry: EARLIER_GROW_DEFINITIONS[0] };
let policies: ArchivePolicyRegistry | undefined;
export class DeployedScope<E extends Env & GrowArchiveEnvironment = Env & GrowArchiveEnvironment> extends Base<E> {
  protected override [scopeWiring](name: string | undefined): Wiring {
    const deployed = super[scopeWiring](name), config = growArchiveConfiguration(this.env, DEMO_RELEASE);
    if (!config) return deployed;
    // Grow's Wrangler Text rule supplies the exact signed bytes. A JSON
    // object import must never be serialized into substitute packet bytes.
    if (typeof earlierPacket !== "string") throw new Error("Grow archive requires the signed Text module");
    policies ??= growArchivePolicies(earlierPacket, EARLIER_TRUST);
    const reviewed = policies;
    return { ...deployed, archiveHost: config,
      ...(this.env.ARCHIVE_RESTART_DIRECTIVE === undefined ? {} : { archiveRestart: this.env.ARCHIVE_RESTART_DIRECTIVE }),
      archive: (given, sql, bounds) => growArchiveDriver(given, sql, this[scopeNamespace](), this.env, DEMO_RELEASE, reviewed, bounds),
    };
  }
}

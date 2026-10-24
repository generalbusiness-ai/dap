/// <reference path="../../examples/grow/worker-env.d.ts" />
/** Grow's existing Durable Object class name and namespace, with explicit
 * room-only archive admission. Generic deployments keep their old entry. */
import packet from "../../examples/grow/demo/application.dap.json";
import { DeployedScope as Base, type Env } from "./worker.ts";
import { growArchiveConfiguration, growArchiveDriver, type GrowArchiveEnvironment } from "./archive.ts";
import { growArchivePolicies } from "./archive-policy.ts";
import type { Wiring } from "../../packages/scope/src/object.ts";
import type { ArchivePolicyRegistry } from "../../packages/scope/src/archive-inventory.ts";
export * from "./worker.ts";
export { default } from "./worker.ts";

let policies: ArchivePolicyRegistry | undefined;
export class DeployedScope<E extends Env & GrowArchiveEnvironment = Env & GrowArchiveEnvironment> extends Base<E> {
  protected override wiring(name: string | undefined): Wiring {
    const deployed = super.wiring(name), config = growArchiveConfiguration(this.env);
    if (!config) return deployed;
    // Grow's Wrangler Text rule supplies the exact signed bytes. A JSON
    // object import must never be serialized into substitute packet bytes.
    if (typeof packet !== "string") throw new Error("Grow archive requires the signed Text module");
    policies ??= growArchivePolicies(packet);
    const reviewed = policies;
    return { ...deployed, archiveHost: config,
      ...(this.env.ARCHIVE_RESTART_DIRECTIVE === undefined ? {} : { archiveRestart: this.env.ARCHIVE_RESTART_DIRECTIVE }),
      archive: (given, sql, bounds) => growArchiveDriver(given, sql, this.scopes(), this.env, reviewed, bounds),
    };
  }
}

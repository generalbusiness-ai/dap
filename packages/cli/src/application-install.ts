/** Portable command port. The Node entry supplies persistent MCP custody. */
import type { Context, Outcome } from "./commands.ts";
function call(ctx: Context, name: "install_application" | "upgrade_application" | "application_installation", args: Record<string, unknown>): Promise<Outcome> {
  return ctx.applicationCommand ? ctx.applicationCommand(name, args) : Promise.resolve({ code: 1, lines: ["Persistent application request custody is unavailable; nothing was signed or sent."] });
}
export function installApplication(ctx: Context, uri: string, options: { release: string; roles: readonly string[]; values: unknown; request: string; owner?: unknown }): Promise<Outcome> {
  return call(ctx, "install_application", { uri, release: options.release, roles: options.roles, values: options.values, ...(options.owner === undefined ? {} : { owner: options.owner }), idempotencyKey: options.request });
}
/** `dap application upgrade`: one upgrade-application act on an active installation, in place or, with `replace`, by a successor. */
export function upgradeApplication(ctx: Context, item: number, uri: string, options: { release: string; request: string; replace: boolean; roles?: readonly string[]; values?: unknown }): Promise<Outcome> {
  return call(ctx, "upgrade_application", { item, uri, release: options.release, replace: options.replace, ...(options.roles === undefined ? {} : { roles: options.roles }), ...(options.values === undefined ? {} : { values: options.values }), idempotencyKey: options.request });
}
export function applicationInstallation(ctx: Context, item: number): Promise<Outcome> { return call(ctx, "application_installation", { item }); }

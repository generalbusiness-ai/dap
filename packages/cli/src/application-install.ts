/** Portable command port. The Node entry supplies persistent MCP custody. */
import type { Context, Outcome } from "./commands.ts";
function call(ctx: Context, name: "install_application" | "application_installation", args: Record<string, unknown>): Promise<Outcome> {
  return ctx.applicationCommand ? ctx.applicationCommand(name, args) : Promise.resolve({ code: 1, lines: ["Persistent application request custody is unavailable; nothing was signed or sent."] });
}
export function installApplication(ctx: Context, uri: string, options: { release: string; roles: readonly string[]; values: unknown; request: string }): Promise<Outcome> {
  return call(ctx, "install_application", { uri, release: options.release, roles: options.roles, values: options.values, idempotencyKey: options.request });
}
export function applicationInstallation(ctx: Context, item: number): Promise<Outcome> { return call(ctx, "application_installation", { item }); }

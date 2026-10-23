/** CLI entry to the same native install and persistent custody used by MCP. */
import { secretSigner } from "@generalbusiness/dap-client";
import { McpService, type CustodyStore } from "@generalbusiness/dap-mcp";
import type { Context, Outcome } from "./commands.ts";

export function applicationCommands(ctx: Context, custody: CustodyStore, applicationFetch?: (request: Request) => Promise<Response>): NonNullable<Context["applicationCommand"]> {
  return (name, args) => call(ctx, custody, applicationFetch, name, args);
}
async function call(ctx: Context, custody: CustodyStore, applicationFetch: ((request: Request) => Promise<Response>) | undefined, name: string, args: Record<string, unknown>): Promise<Outcome> {
  const config = await ctx.store.config();
  if (!config?.repository) return { code: 2, lines: ["Configure a trusted-application or declared-application room before installing a package."] };
  const secret = ctx.store.signer ? null : (await ctx.store.secret(config.key))?.slice() ?? null;
  const signer = ctx.store.signer ? await ctx.store.signer(config.key) : secret ? secretSigner(secret) : null;
  if (!signer) { secret?.fill(0); return { code: 1, lines: ["The configured signing key is unavailable; nothing was signed or sent."] }; }
  try {
    const service = new McpService({ service: config.service, signer, custody,
      config: { read: async () => {
        const current = await ctx.store.config();
        return current ? { service: current.service, ...(current.repository ? { repository: current.repository } : {}) } : { service: "" };
      }, addRoot: async () => { throw Error("Application installs are discovered through the native Directory."); } },
      ...(ctx.fetch ? { fetch: ctx.fetch } : {}), ...(ctx.now ? { now: ctx.now } : {}),
      ...(applicationFetch ? { applicationFetch } : {}),
    });
    const result = await service.call(name, args), value = result.structuredContent;
    if (result.isError) return { code: 1, lines: [typeof value["message"] === "string" ? value["message"] : "The exact application request remains unresolved.", ...(typeof value["next"] === "string" ? [value["next"]] : [])] };
    if (name === "install_application") {
      if (value["answer"] !== "accepted") return { code: 1, lines: [`Install request: ${String(value["answer"])}${typeof value["reason"] === "string" ? ` (${value["reason"]})` : ""}. The exact original is retained.`] };
      return { code: 0, lines: [`Install request recorded: item ${String(value["item"])}.`, `Read its result with: dap application ${String(value["item"])}`, "Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused."] };
    }
    return { code: value["state"] === "refused" ? 1 : 0, lines: [
      `Application install ${String(value["item"])}: ${String(value["state"])} (${String(value["phase"])}).`,
      ...(typeof value["reason"] === "string" ? [`Reason: ${value["reason"]}. Earlier committed grants and activation remain in force.`] : []),
      ...(typeof value["screen"] === "string" ? [`Screen: ${value["screen"]}`] : []),
    ] };
  } catch { return { code: 1, lines: ["The application request could not be read or completed. Keep its original request key and arguments."] }; }
  finally { secret?.fill(0); }
}

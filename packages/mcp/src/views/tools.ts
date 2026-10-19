import type { Tool } from "../catalogue.ts";
import type { CallResult } from "../service.ts";
import { VIEW_KINDS } from "./resources.ts";
import { ViewError, type ViewSessions } from "./session.ts";
import type { PageKind } from "./types.ts";
import { viewToolName } from "./names.ts";

type Args = Record<string, unknown>;
const key = { type: "string", minLength: 1, maxLength: 128 };
const cut = { type: "integer", minimum: 0 };
export function supportsViews(capabilities: unknown): boolean {
  const value = capabilities as { extensions?: Record<string, { mimeTypes?: unknown }> } | null;
  const types = value?.extensions?.["io.modelcontextprotocol/ui"]?.mimeTypes;
  return Array.isArray(types) && types.includes("text/html;profile=mcp-app");
}
/** Capability negotiation changes presentation, never the caller's native authority. */
export function toolsForHost(tools: readonly Tool[], ui: boolean): Tool[] {
  if (ui) return [...tools];
  return tools.filter((tool) => {
    const visibility = (tool._meta?.["ui"] as { visibility?: string[] } | undefined)?.visibility;
    return !visibility || visibility.includes("model");
  }).map((tool) => {
    if (!tool._meta?.["ui"]) return tool;
    const { ui: _ui, ...meta } = tool._meta;
    return { ...tool, _meta: meta };
  });
}
const result = (structuredContent: Record<string, unknown>, text: string, isError = false): CallResult => ({ structuredContent, content: [{ type: "text", text }], isError });
const string = (args: Args, name: string): string => {
  if (typeof args[name] !== "string") throw new ViewError("shape", `${name} must be a string.`);
  return args[name];
};
const integer = (args: Args, name: string): number => {
  const value = args[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ViewError("shape", `${name} must be a nonnegative safe integer.`);
  return value;
};

export function viewTools(sessions: ViewSessions, screens?: readonly { name: string; resource: string }[]): Record<string, { tool: Tool; run: (args: Args) => Promise<CallResult> }> {
  const tools: ReturnType<typeof viewTools> = {};
  const add = (name: string, description: string, properties: Args, required: string[], appOnly: boolean, resource: string | undefined, run: (args: Args) => Promise<CallResult>) => {
    tools[name] = {
      tool: { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false }, _meta: { ui: { visibility: appOnly ? ["app"] : ["model", "app"], ...(resource ? { resourceUri: resource } : {}) } }, annotations: { readOnlyHint: name !== "view_act" } },
      run: async (args) => {
        try { return await run(args); }
        catch (error) {
          if (!(error instanceof ViewError)) throw error;
          return result({ error: "view", reason: error.reason, message: error.message }, error.message, true);
        }
      },
    };
  };
  for (const { name: screen, resource } of screens ?? VIEW_KINDS.map(name => ({ name, resource: `ui://dap/${name}` }))) {
    const name = viewToolName(screen, screens !== undefined);
    if (Object.hasOwn(tools, name) || name === "view_read" || name === "view_act") throw new Error("Declared view tool names collide.");
    add(name, `Open ${screen} as a compact card. Choose and keep a view key for this opening. The tool text exposes only ${screens ? "the declared fallback and identity" : "identity, exact revision, screen and counts"}. Private card details are fetched separately by the app. Without views, use inspect and the ordinary read tools for the named subject.`, { view: key, subject: { type: "string", maxLength: 256 }, ...(screens ? { items: { type: "object", maxProperties: 8, propertyNames: { pattern: "^[A-Za-z][A-Za-z0-9_-]{0,63}$" }, additionalProperties: { type: "integer", minimum: 0 } } } : {}) }, ["view"], false, resource, async (args) => {
      const subject = args["subject"] === undefined ? undefined : string(args, "subject");
      if (subject !== undefined && subject.length > 256) throw new ViewError("shape", "subject exceeds 256 characters.");
      const items = args["items"];
      if (items !== undefined && (!items || typeof items !== "object" || Array.isArray(items) || Object.keys(items).length > 8
        || Object.entries(items).some(([name, id]) => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name) || typeof id !== "number" || !Number.isSafeInteger(id) || id < 0 || Object.is(id, -0)))) throw new ViewError("shape", "items must name at most eight source selections with nonnegative integer IDs.");
      const opening = await sessions.open(string(args, "view"), screen, subject, items as Readonly<Record<string, number>> | undefined);
      const { text, ...data } = opening;
      return result(data, text);
    });
  }
  add("view_read", "Read or navigate the named mounted card. Returns private titles, bodies, actors and entry details to the app. Host app-only visibility does not replace native scope authorization.", { view: key, cut, position: cut, page: { enum: ["summary", "item", "diff", "updates"] }, refresh: { type: "boolean" } }, ["view"], true, undefined, async (args) => {
    const page = args["page"];
    if (page !== undefined && !["summary", "item", "diff", "updates"].includes(String(page))) throw new ViewError("shape", "page is not a card page.");
    const moving = page !== undefined || args["position"] !== undefined || args["refresh"] === true;
    const display = await sessions.read(string(args, "view"), moving ? integer(args, "cut") : undefined, moving ? { ...(page === undefined ? {} : { page: page as PageKind }), ...(args["position"] === undefined ? {} : { position: integer(args, "position") }) } : undefined);
    return result({ display }, JSON.stringify(display));
  });
  add("view_act", "Dispatch one server-retained act of an exact displayed card. The server checks the instance and display cut and signs its captured native revisions under ordinary custody. Duplicate dispatch returns its first outcome. This tool returns private card and receipt data to the app.", { view: key, cut, action: key }, ["view", "cut", "action"], true, undefined, async (args) => {
    const answer = await sessions.act(string(args, "view"), integer(args, "cut"), string(args, "action"));
    return result(answer, JSON.stringify(answer));
  });
  return tools;
}

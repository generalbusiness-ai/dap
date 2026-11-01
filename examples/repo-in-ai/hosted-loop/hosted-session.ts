/**
 * One MCP session of the hosted agent, and the ledger that holds "every fact comes through hosted tools". A value in a call's
 * arguments must have appeared in a reply of this session or be a declared literal of the phase. Anything else stops the phase
 * before the call leaves this process. The ledger starts empty in every session, so a value from an earlier process does not pass.
 */
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { LoopStop, stop } from "./words.ts";

export interface ListedTool { name: string; [field: string]: unknown }
/** The transport that a session holds. `hosted-client.ts` supplies the pinned MCP client over the Worker's `/mcp`. */
export interface McpPort {
  listTools(cursor?: string): Promise<{ tools: ListedTool[]; nextCursor?: string }>;
  getPrompt(name: string, args: Record<string, string>): Promise<{ messages: { role: string; content: { type: string; text?: string } }[] }>;
  callTool(name: string, args: Record<string, unknown>): Promise<{ isError?: boolean; structuredContent?: Record<string, unknown> }>;
  sessionId(): string | null;
  close(): Promise<void>;
}
export type Reply = Record<string, unknown>;

const leaves = (value: unknown, each: (leaf: string | number) => void, depth = 0): void => {
  if (depth > 32) return stop("read-incomplete");
  if (typeof value === "string" || typeof value === "number") each(value);
  else if (Array.isArray(value)) for (const entry of value) leaves(entry, each, depth + 1);
  else if (value !== null && typeof value === "object") for (const entry of Object.values(value)) leaves(entry, each, depth + 1);
};

export class HostedSession {
  readonly #port: McpPort;
  readonly #seen = new Set<string | number>();
  readonly #literal = new Set<string | number>();
  /** Every tool this session called, in order. */
  readonly calls: string[] = [];
  /** The names of the session's list, as tools/list last answered. */
  listed: readonly string[] = [];
  /** A digest of the whole list as the model sees it: names, descriptions and schemas. */
  listDigest: string | null = null;
  constructor(port: McpPort) { this.#port = port; }

  /** A value of this script, such as a fixed text or a tool's scope name. The phase states each one. */
  literal(...values: (string | number)[]): void { for (const value of values) this.#literal.add(value); }

  /** Refuses any argument that this session did not read or state. `idempotencyKey` is the phase's own fixed word. */
  #sourced(args: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(args)) {
      if (name === "idempotencyKey") continue;
      leaves(value, leaf => { if (!this.#seen.has(leaf) && !this.#literal.has(leaf)) stop("unsourced-fact"); });
    }
  }

  async tools(): Promise<readonly string[]> {
    const tools: ListedTool[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 16; page++) {
      const listed = await this.#port.listTools(cursor);
      tools.push(...listed.tools);
      cursor = listed.nextCursor;
      if (cursor === undefined) {
        this.listed = tools.map(tool => tool.name);
        this.listDigest = digestBytes(utf8(canonicalize(tools as never)));
        return this.listed;
      }
    }
    return stop("read-incomplete");
  }

  /** The work-on prompt's text, through prompts/get, as the digest a checker compares. */
  async prompt(goal: string): Promise<string> {
    const reply = await this.#port.getPrompt("work-on", { goal });
    const text = reply.messages.flatMap(message => message.content.type === "text" && typeof message.content.text === "string" ? [message.content.text] : []);
    if (text.length !== 1 || !text[0]!.includes("Do not approve or decide for the person.")) return stop("no-prompt");
    return digestBytes(utf8(text[0]!));
  }

  /** One tool call. The answer's every value becomes a value this session has read. */
  async call(name: string, args: Record<string, unknown> = {}): Promise<Reply> {
    this.#sourced(args);
    if (this.listed.length > 0 && !this.listed.includes(name)) return stop("unknown-tool");
    this.calls.push(name);
    let reply;
    try { reply = await this.#port.callTool(name, args); }
    catch (error) { if (error instanceof LoopStop) throw error; return stop("read-failed"); }
    const body = reply.structuredContent ?? {};
    leaves(body, leaf => { this.#seen.add(leaf); });
    if (reply.isError) return stop("read-failed");
    return body;
  }

  sessionDigest(): string | null {
    const id = this.#port.sessionId();
    return id === null ? null : digestBytes(utf8(id));
  }
  close(): Promise<void> { return this.#port.close(); }
}

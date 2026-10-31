import { canonicalize, digestBytes, isDigest, isRecord, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest } from "@generalbusiness/dap-contract";
import type { Tool } from "./catalogue.ts";
import type { CallResult } from "./service.ts";

export interface ApplicationReadTool {
  readonly tool: Tool;
  run(args: Readonly<Record<string, unknown>>): Promise<CallResult>;
}
/** A trusted local adapter, never a registration of native acts or authority. */
export interface ApplicationReadCatalogue {
  readonly revision: Digest;
  readonly tools: readonly ApplicationReadTool[];
}

const MOST_TOOLS = 16, MOST_DESCRIPTOR = 16 * 1024, MOST_CATALOGUE = 64 * 1024;
const MOST_ARGS = 16 * 1024, MOST_RESULT = 256 * 1024;
const failure = (reason: "shape" | "bounds" | "unavailable"): CallResult => ({
  content: [{ type: "text", text: `The application read is ${reason}.` }],
  structuredContent: { error: "application-read", reason }, isError: true,
});

/** Immutable descriptors and bounded results; annotations describe the trusted adapter. */
export class ApplicationReads {
  readonly generation: Digest;
  readonly #tools: Tool[];
  readonly #runs = new Map<string, ApplicationReadTool["run"]>();
  constructor(catalogue: ApplicationReadCatalogue, reserved: Iterable<string>) {
    if (!isDigest(catalogue.revision) || !Array.isArray(catalogue.tools) || catalogue.tools.length > MOST_TOOLS) throw Error("Invalid application read catalogue.");
    const names = new Set(reserved);
    this.#tools = catalogue.tools.map(entry => {
      const tool = structuredClone(entry.tool);
      if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(tool.name) || names.has(tool.name) || typeof entry.run !== "function"
        || typeof tool.description !== "string" || !isRecord(tool.inputSchema) || tool.inputSchema["type"] !== "object"
        || tool.annotations?.["readOnlyHint"] !== true || tool.annotations?.["destructiveHint"] === true
        || utf8(canonicalize(tool)).length > MOST_DESCRIPTOR) throw Error("Invalid or colliding application read tool.");
      names.add(tool.name);
      const run = entry.run;
      this.#runs.set(tool.name, args => run(args));
      return tool;
    });
    if (utf8(canonicalize(this.#tools)).length > MOST_CATALOGUE) throw Error("Application read catalogue exceeds its byte bound.");
    this.generation = digestBytes(utf8(canonicalize({ revision: catalogue.revision, tools: this.#tools })));
  }
  tools(): Tool[] { return structuredClone(this.#tools); }
  has(name: string): boolean { return this.#runs.has(name); }
  async call(name: string, args: unknown): Promise<CallResult> {
    const run = this.#runs.get(name);
    if (!run || !isRecord(args)) return failure("shape");
    try {
      if (utf8(canonicalize(args)).length > MOST_ARGS) return failure("bounds");
      const result = structuredClone(await run(structuredClone(args)));
      if (!isRecord(result) || !isRecord(result.structuredContent) || typeof result.isError !== "boolean"
        || !Array.isArray(result.content) || result.content.some(entry => !isRecord(entry) || entry["type"] !== "text" || typeof entry["text"] !== "string")) return failure("shape");
      return utf8(canonicalize(result)).length > MOST_RESULT ? failure("bounds") : result;
    } catch { return failure("unavailable"); }
  }
}

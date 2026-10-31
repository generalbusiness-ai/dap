/** Local application composition. Importing this module reads no home or key. */
import { constants, fstatSync, realpathSync, openSync, closeSync, readSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digestBytes } from "@generalbusiness/dap-bytes";
import { McpService, type ConfigPort } from "@generalbusiness/dap-mcp";
import { fileStore as custodyStore, serveStdio } from "@generalbusiness/dap-mcp/node";
import { configDir, fileStore } from "../../../packages/cli/src/files.ts";
import { storedSigner } from "../../../packages/cli/src/store-signer.ts";
import type { ReadOptions } from "./reads.ts";
import { RepoInAi, type AdapterOptions } from "./repo-in-ai.ts";
import { ReviewStore } from "./review-store.ts";
import { decisionSource } from "./decision.ts";

export interface ServiceOptions extends Omit<ReadOptions, "config"> {
  home: string;
  config: ConfigPort;
  brief: AdapterOptions["brief"];
}
export function createRepoInAiService(options: ServiceOptions): { service: McpService; app: RepoInAi } {
  const app = new RepoInAi({ ...options, config: () => options.config.read(), reviewStore: new ReviewStore(options.home) });
  const service = new McpService({ service: options.service, signer: options.signer, config: options.config,
    custody: custodyStore(join(options.home, "private", "mcp-custody")), views: decisionSource(app), applicationReads: app.catalogue(), packageBrief: app.brief,
    ...(options.fetch ? { fetch: options.fetch } : {}), ...(options.now ? { now: options.now } : {}) });
  return { service, app };
}
function briefFile(path: string): Uint8Array {
  if (!isAbsolute(path) || realpathSync(path) !== path) throw new Error("Supply one absolute local --brief package file.");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd); if (!stat.isFile() || stat.size > 65536) throw new Error("The local Brief must be a regular file of at most 64 KiB.");
    const bytes = new Uint8Array(65537); let length = 0, count: number;
    while (length < bytes.length && (count = readSync(fd, bytes, length, bytes.length - length, null)) > 0) length += count;
    if (length > 65536) throw new Error("The local Brief exceeds 64 KiB."); return bytes.slice(0, length);
  } finally { closeSync(fd); }
}
export async function main(argv: readonly string[]): Promise<void> {
  if (argv.length !== 2 || argv[0] !== "--brief" || !argv[1]) throw new Error("Use: node --import tsx apps/views/src/node.ts --brief <absolute-package-file>");
  const bytes = briefFile(argv[1]), home = configDir(), store = fileStore(home), config = await store.config();
  if (!config?.repository) throw new Error("This existing DAP_HOME has no configured room. No identity was created.");
  const signer = await storedSigner(store, config.key); if (!signer) throw new Error("The configured signer is unavailable. No key was created.");
  const port: ConfigPort = {
    read: async () => { const current = await store.config(); if (!current) throw new Error("Room configuration is unavailable."); return current; },
    addRoot: async () => { throw new Error("This application does not provision scopes."); },
  };
  await serveStdio(createRepoInAiService({ home, service: config.service, signer, config: port, brief: { bytes, digest: digestBytes(bytes) } }).service);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(() => { process.stderr.write("S4 local service could not start. Check the explicit Brief and existing room configuration.\n"); process.exitCode = 1; });
}

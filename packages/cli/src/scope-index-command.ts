/** Node-only files and dispatch for the listed-set rollout tool. */
import { constants } from "node:fs";
import { open, link, unlink } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { scopeIndexAccess, type Context, type Outcome } from "./commands.ts";
import { captureIndexManifest, INDEX_INVENTORY_BOUNDS, readIndexManifest, verifyIndexManifest } from "./scope-index-manifest.ts";

export interface IndexFiles { read(path: string): Promise<Uint8Array>; save(path: string, bytes: Uint8Array): Promise<void> }
/** The opened descriptor, not a prior pathname stat, owns the byte bound. */
export async function readIndexFile(path: string): Promise<Uint8Array> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > INDEX_INVENTORY_BOUNDS.bytes) throw Error("Scope manifest must be a regular file of at most 16 MiB");
    const chunks: Buffer[] = []; let total = 0;
    for (;;) {
      const bytes = Buffer.alloc(Math.min(64 * 1024, INDEX_INVENTORY_BOUNDS.bytes - total + 1));
      const read = await file.read(bytes, 0, bytes.length, total);
      if (read.bytesRead === 0) break;
      total += read.bytesRead;
      if (total > INDEX_INVENTORY_BOUNDS.bytes) throw Error("Scope manifest grew beyond 16 MiB");
      chunks.push(bytes.subarray(0, read.bytesRead));
    }
    const after = await file.stat();
    if (before.size !== total || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw Error("Scope manifest changed while reading");
    return new Uint8Array(Buffer.concat(chunks, total));
  } finally { await file.close(); }
}
export async function saveIndexFile(path: string, bytes: Uint8Array): Promise<void> {
  if (bytes.length > INDEX_INVENTORY_BOUNDS.bytes) throw Error("Scope manifest exceeds 16 MiB");
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  const file = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    try { await file.writeFile(bytes); await file.sync(); }
    finally { await file.close(); }
    // Exclusive atomic publication; never replace an existing manifest.
    await link(temporary, path);
    const directory = await open(dirname(path), constants.O_RDONLY);
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await unlink(temporary); }
}
const FILES: IndexFiles = { read: readIndexFile, save: saveIndexFile };
const USAGE = "dap scope-index inventory --out FILE | sweep --manifest FILE | verify --manifest FILE";
export async function scopeIndexCommand(ctx: Context, argv: readonly string[], files: IndexFiles = FILES): Promise<Outcome> {
  const [verb, flag, path, ...extra] = argv;
  if (!(verb === "inventory" || verb === "sweep" || verb === "verify") || flag !== (verb === "inventory" ? "--out" : "--manifest") || !path || extra.length) return { code: 2, lines: [USAGE] };
  try {
    const access = await scopeIndexAccess(ctx);
    if (verb === "inventory") {
      const manifest = await captureIndexManifest(access.service, access.root, access.reads);
      await files.save(path, utf8(`${canonicalize(manifest)}\n`));
      return { code: 0, lines: [`Captured ${manifest.scopes.length} listed scopes in ${path}.`,
        "These are authenticated deployment observations, not independent replay or a global index inventory.",
        "For a no-registration dry run, use the pre-index deployment. Register-mode reads can write registrations."] };
    }
    // Complete local schema/config validation precedes lazy authentication.
    const manifest = readIndexManifest(await files.read(path), access.service, access.root);
    const report = await verifyIndexManifest(manifest, access.reads);
    return { code: report.verified === report.listed ? 0 : 1, lines: [JSON.stringify(report),
      "Exact listed genesis observations only; no deployment mode, index completeness or registration is inferred.",
      "Register-mode reads may register scopes. Indexed reachability requires the planner's recorded enforce deployment."] };
  } catch (error) { return { code: 1, lines: [error instanceof Error ? error.message : "Scope inventory failed"] }; }
}

/** File flushing for the example's retained requests. No request engine lives here. */
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { fileStore as cliFiles } from "../../packages/cli/src/files.ts";
import { fileStore as requestFiles } from "@generalbusiness/dap-mcp/node";
import type { Store } from "@generalbusiness/dap-cli";
import type { CustodyStore } from "@generalbusiness/dap-mcp";

/** Reject linked paths before opening a private record or its directory. */
function unlinked(path: string): void {
  const absolute = resolve(path), root = parse(absolute).root;
  let current = root;
  for (const part of absolute.slice(root.length).split("/").filter(Boolean)) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error("Private custody path is linked");
  }
}

/** A successful return means the file and its directory were flushed. */
export function flushPrivateFile(path: string): void {
  unlinked(path);
  const file = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(file);
    if (!info.isFile() || info.uid !== process.getuid!() || (info.mode & 0o077) !== 0 || info.nlink !== 1) {
      throw new Error("Private custody file is not owner-only");
    }
    fsyncSync(file);
  } finally { closeSync(file); }
  const parent = dirname(path);
  unlinked(parent);
  const directory = openSync(parent, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = fstatSync(directory);
    if (!info.isDirectory() || info.uid !== process.getuid!() || (info.mode & 0o077) !== 0) {
      throw new Error("Private custody directory is not owner-only");
    }
    fsyncSync(directory);
  } finally { closeSync(directory); }
}

/** CLI claim and invitation code retain their existing formats and behavior.
 * The example flushes each saved key, configuration and original before its
 * caller can proceed. `flush` permits an owning test to inject an I/O failure. */
export function durableCliStore(home: string, flush = flushPrivateFile): Store {
  const base = cliFiles(home);
  return {
    ...base,
    async private(name) {
      const bytes = await base.private(name);
      if (bytes !== null) flush(join(home, "private", name + ".data"));
      return bytes;
    },
    save: async config => { await base.save(config); flush(join(home, "config.json")); },
    keep: async (name, secret) => { await base.keep(name, secret); flush(join(home, "keys", `${name}.key`)); },
    keepPrivate: async (name, bytes) => { await base.keepPrivate(name, bytes); flush(join(home, "private", `${name}.data`)); },
  };
}

/** Keep the maintained MCP custody engine, including its locks and archive.
 * Only dispatch writes need a live-record flush: terminal records can have
 * moved to its archive. A failed flush rejects before the engine sends. */
export function durableRequestStore(home: string, flush = flushPrivateFile): CustodyStore {
  const base = requestFiles(home);
  return {
    ...base,
    write: async (id, record, options) => {
      if (options?.dispatch && !/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid retained request identity");
      await base.write(id, record, options);
      if (options?.dispatch) {
        flush(join(home, "records", `${id}.json`));
      }
    },
  };
}

/** A flush adapter over the maintained MCP file store, not a request engine. */
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { fileStore } from "@generalbusiness/dap-mcp/node";
import type { CustodyStore } from "@generalbusiness/dap-mcp";

export function noLinks(path: string): void {
  if (resolve(path) !== path) throw Error("W1 path must be absolute and canonical.");
  for (let part = path;; part = dirname(part)) {
    if (lstatSync(part).isSymbolicLink()) throw Error("W1 linked path refused.");
    if (dirname(part) === part) break;
  }
}
export function flushFile(path: string): void {
  noLinks(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const held = fstatSync(fd);
    if (!held.isFile() || held.uid !== process.getuid?.() || held.nlink !== 1 || (held.mode & 0o777) !== 0o600) throw Error("W1 private record custody refused.");
    fsyncSync(fd);
  } finally { closeSync(fd); }
  const parent = dirname(path); noLinks(parent);
  const dir = openSync(parent, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const held = fstatSync(dir);
    if (!held.isDirectory() || held.uid !== process.getuid?.() || (held.mode & 0o777) !== 0o700) throw Error("W1 private directory custody refused.");
    fsyncSync(dir);
  } finally { closeSync(dir); }
}

/** Every dispatch, including an existing original's explicit Continue, writes
 * and reads through the real store before flushing its live record and parent.
 * Terminal archival stays with the maintained store. No power-loss proof. */
export function durableCustody(home: string, flush = flushFile): CustodyStore {
  const base = fileStore(home);
  return { ...base, write: async (id, record, options) => {
    await base.write(id, record, options);
    if (options?.dispatch) {
      if (!/^[a-f0-9]{64}$/.test(id) || canonicalize(await base.read(id)) !== canonicalize(record)) throw Error("W1 dispatch original readback failed.");
      flush(join(home, "records", `${id}.json`));
    }
  } };
}

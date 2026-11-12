/** Admit only this caller-named directory's format; never read a record. */
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, opendirSync, readSync, writeFileSync, type Stats } from "node:fs";
import { join } from "node:path";
import { StoreFormatError } from "./store-format-error.ts";

export const STORE_FORMAT_FILE = ".dap-store-format";
const WORD = "2\n";
const retired = (): never => { throw new StoreFormatError("retired"); };

function readWord(path: string): boolean {
  let info: Stats;
  try { info = lstatSync(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
  const uid = process.getuid?.();
  if (uid === undefined) throw new StoreFormatError("unavailable");
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.uid !== uid || (info.mode & 0o077) !== 0) retired();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.uid !== uid || (opened.mode & 0o077) !== 0
      || opened.dev !== info.dev || opened.ino !== info.ino || opened.uid !== info.uid || opened.mode !== info.mode || opened.nlink !== info.nlink) retired();
    const bytes = new Uint8Array(3);
    let length = 0, got: number;
    while (length < bytes.length && (got = readSync(fd, bytes, length, bytes.length - length, null)) > 0) length += got;
    if (length !== 2 || bytes[0] !== 0x32 || bytes[1] !== 0x0a) retired();
  } finally { closeSync(fd); }
  return true;
}

/** Synchronous, uncached admission before each actual file-store operation. */
export function requireStoreFormat(dir: string): void {
  try {
    let info: Stats;
    try { info = lstatSync(dir); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      info = lstatSync(dir);
    }
    if (!info.isDirectory() || info.isSymbolicLink()) throw new StoreFormatError("unavailable");
    const path = join(dir, STORE_FORMAT_FILE);
    if (readWord(path)) return;
    // Only absence needs an emptiness check: inspect at most one entry.
    const entries = opendirSync(dir, { bufferSize: 1 });
    try { if (entries.readSync() !== null) retired(); }
    finally { entries.closeSync(); }
    let fd: number;
    try { fd = openSync(path, "wx", 0o600); }
    catch (error) {
      // A current participating initializer may have published this word.
      // A partial or incompatible word refuses; no retry or repair follows.
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!readWord(path)) retired();
      return;
    }
    try { writeFileSync(fd, WORD); fsyncSync(fd); }
    finally { closeSync(fd); }
    const directory = openSync(dir, "r");
    try { fsyncSync(directory); } finally { closeSync(directory); }
    if (!readWord(path)) retired();
  } catch (error) {
    if (error instanceof StoreFormatError) throw error;
    throw new StoreFormatError("unavailable");
  }
}

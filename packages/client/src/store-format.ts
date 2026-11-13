/** Admit only this caller-named directory's format; never read a record. */
import { closeSync, constants, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, opendirSync, readSync, unlinkSync, writeFileSync, type Stats } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { StoreFormatError } from "./store-format-error.ts";

export const STORE_FORMAT_FILE = ".dap-store-format";
const WORD = "2\n";
const retired = (): never => { throw new StoreFormatError("retired"); };
/** A whole word written beside the format file before it is linked into place. */
const PUBLISHING = `${STORE_FORMAT_FILE}.publishing-`;
const publishing = (name: string): boolean => name.startsWith(PUBLISHING) && name.endsWith(".tmp");

/** The second link of a word that an initializer is publishing, or left when it stopped before removing its temporary name. */
function publishedLink(dir: string, info: Stats): boolean {
  const entries = opendirSync(dir);
  try {
    for (let entry = entries.readSync(); entry !== null; entry = entries.readSync()) {
      if (!publishing(entry.name)) continue;
      let other: Stats;
      try { other = lstatSync(join(dir, entry.name)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
      if (other.isFile() && other.dev === info.dev && other.ino === info.ino) return true;
    }
    return false;
  } finally { entries.closeSync(); }
}

function readWord(path: string, dir: string): boolean {
  let info: Stats;
  try { info = lstatSync(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
  const uid = process.getuid?.();
  if (uid === undefined) throw new StoreFormatError("unavailable");
  // A whole word has one link, or two while its initializer links it into place from its temporary name.
  // The initializer can remove that name during the scan, so a second look at the same file settles it.
  if (info.nlink === 2 && !publishedLink(dir, info)) {
    const again = lstatSync(path);
    if (again.dev === info.dev && again.ino === info.ino && again.nlink === 1) info = again;
  }
  const links = info.nlink === 1 || info.nlink === 2 && publishedLink(dir, info) ? info.nlink : 0;
  if (!info.isFile() || info.isSymbolicLink() || links === 0 || info.uid !== uid || (info.mode & 0o077) !== 0) retired();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink > links || opened.uid !== uid || (opened.mode & 0o077) !== 0
      || opened.dev !== info.dev || opened.ino !== info.ino || opened.uid !== info.uid || opened.mode !== info.mode) retired();
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
    if (readWord(path, dir)) return;
    // Only absence needs an emptiness check. Another initializer's temporary word is no record.
    const entries = opendirSync(dir);
    try { for (let entry = entries.readSync(); entry !== null; entry = entries.readSync()) if (!publishing(entry.name)) retired(); }
    finally { entries.closeSync(); }
    // Write the whole word under a temporary name, then link it into place, so that no reader sees a partial word.
    const temporary = join(dir, `${PUBLISHING}${randomUUID()}.tmp`);
    const fd = openSync(temporary, "wx", 0o600);
    try { writeFileSync(fd, WORD); fsyncSync(fd); }
    finally { closeSync(fd); }
    try {
      try { linkSync(temporary, path); }
      catch (error) {
        // A current participating initializer may have published this word.
        // A partial or incompatible word refuses; no retry or repair follows.
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    } finally { unlinkSync(temporary); }
    const directory = openSync(dir, "r");
    try { fsyncSync(directory); } finally { closeSync(directory); }
    if (!readWord(path, dir)) retired();
  } catch (error) {
    if (error instanceof StoreFormatError) throw error;
    throw new StoreFormatError("unavailable");
  }
}

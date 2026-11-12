/** Request custody on files. Source-only Node entry; the browser SDK omits this module. */
import { appendFileSync, chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, renameSync, statSync, truncateSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative, sep } from "node:path";
import { canonicalize, timeMs } from "@generalbusiness/dap-bytes";
import { CustodyError, TERMINAL, type CustodyRecord, type CustodyStore, type Outcome } from "./custody.ts";

// ---------------------------------------------------------------- custody on files

export interface FileStoreBounds {
  /** Terminal records kept as files before the oldest are archived. */
  terminalMost: number;
  /** Days a terminal record is kept as a file before it is archived. */
  ageDays: number;
  /** The most bytes of one archive file. */
  archiveBytes: number;
  /** A test's fault injection: called at each named point of an archival, where a crash may come. */
  fault?: (point: "candidates-selected" | "archive-written" | "index-published") => void;
}
export const FILE_STORE_BOUNDS: FileStoreBounds = { terminalMost: 1024, ageDays: 30, archiveBytes: 64 * 1024 * 1024 };

/** How long admission waits for the capacity lease before it says the store is locked. */
const LEASE_WAIT_MS = 10_000;

const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; } };

/** A lock file this process holds: its path, and the token written in it, which names this holding and no other. */
export interface Holding { path: string; token: string }

const readHolding = (path: string): { pid: number; token: string } | null => {
  try {
    const held = JSON.parse(readFileSync(path, "utf8")) as { pid?: unknown; token?: unknown };
    return typeof held.pid === "number" && typeof held.token === "string" ? { pid: held.pid, token: held.token } : null;
  } catch { return null; }
};

function create(path: string, body: Record<string, unknown>): Holding | null {
  const token = randomUUID();
  try { writeFileSync(path, JSON.stringify({ pid: process.pid, token, ...body }), { mode: 0o600, flag: "wx" }); return { path, token }; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") return null; throw e; }
}

/** Remove a lock file only when it still holds this holding's token: a newer owner's file is never removed. */
export function releaseLock(held: Holding): void {
  if (readHolding(held.path)?.token === held.token) { try { unlinkSync(held.path); } catch { /* already gone */ } }
}

/**
 * The reclaim lock beside a lock file: whoever holds it may remove a dead owner's file. It is taken only by exclusive creation.
 * A reclaim lock left by a process that died inside its short section is never broken here: Node gives no way to replace a file
 * only while it still holds the dead token that was read, and moving it aside could displace a live reclaimer. The lock it
 * guards stays held, and `blockedBy` names the file, for an operator to remove once no process of this store runs.
 */
function takeReclaim(path: string): Holding | null { return create(path, {}); }

/**
 * The reclaim lock that a dead process left beside this lock file, if one blocks its recovery; null otherwise.
 * EPERM is treated as alive, including a PID reused by another user's process, so null does not prove there is no stale lock.
 * For operator recovery, stop every process using this config directory, verify the original holder is gone and identify the
 * unchanged stale lock or reclaim file (with an administrator if process ownership cannot be checked). Only then remove that
 * file, preserving every custody record and archive. If ownership or quiescence is uncertain, leave the lock in place.
 */
export function blockedBy(path: string): string | null {
  const reclaim = `${path}.reclaim`;
  const held = readHolding(reclaim);
  return held && !alive(held.pid) ? reclaim : null;
}

/**
 * Take a lock file: created exclusively, holding the process, a token and the time. A file whose process is gone is broken, one
 * reclaimer at a time: under the reclaim lock, the file is read again, removed only if it is still the dead owner's, and taken.
 * One whose process lives is not broken. Its time and any deadline it records decide nothing: expiry is never an outcome.
 */
export function takeLock(path: string, body: Record<string, unknown>): Holding | null {
  const held = create(path, body);
  if (held) return held;
  const seen = readHolding(path);
  // A file being written has no body yet: its taker lives. Only a whole file naming a process that is gone is broken.
  if (!seen || alive(seen.pid)) return null;
  const reclaim = takeReclaim(`${path}.reclaim`);
  if (!reclaim) return null;
  try {
    const again = readHolding(path);
    if (again && again.token === seen.token && !alive(again.pid)) { try { unlinkSync(path); } catch { /* gone */ } }
    return create(path, body);
  } finally { releaseLock(reclaim); }
}

/** The custody store under `dir` (`ARTROOM_HOME/private/mcp-custody`). `now` is the clock of a test. */
export function fileStore(dir: string, bounds: FileStoreBounds = FILE_STORE_BOUNDS, now: () => number = Date.now): CustodyStore & { archived(): number } {
  const records = join(dir, "records"), locks = join(dir, "locks"), segments = join(dir, "segments"), archives = join(dir, "archive");
  const ensure = () => {
    for (const d of [dir, records, locks, segments, archives]) { mkdirSync(d, { recursive: true, mode: 0o700 }); chmodSync(d, 0o700); }
  };
  const id = (name: string) => { if (!/^[0-9a-f]{64}$/.test(name)) throw new Error("not a record name"); return name; };
  const recordPath = (name: string) => join(records, `${id(name)}.json`);
  const lockPath = (name: string) => join(locks, `${id(name)}.lock`);
  const indexPath = join(archives, "index.json");
  /** A file of this store as an error names it: relative to the store, never the absolute path, whose length the home sets. */
  const shown = (path: string) => relative(dir, path).split(sep).join("/");
  /** Whole file, owner-only, through a temporary name; then read back and compared. */
  const atomic = (path: string, text: string) => {
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporary, text, { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
    if (readFileSync(path, "utf8") !== text) throw new Error(`${path} read back differs`);
  };
  type Index = Record<string, { file: string; offset: number; length: number }>;
  const index = (): Index => (existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) as Index : {});
  const live = (): { name: string; record: CustodyRecord }[] => readdirSync(records).filter((f) => /^[0-9a-f]{64}\.json$/.test(f))
    .flatMap((f) => { try { return [{ name: f.slice(0, 64), record: JSON.parse(readFileSync(join(records, f), "utf8")) as CustodyRecord }]; } catch { return []; } });

  /**
   * Move the oldest terminal records into the archive, past the count or the age, as one transaction under the archive lease.
   * Another process archiving holds the lease, and this run moves nothing. A record whose lock another holds is skipped.
   * Order: the archive file, whole, renamed into place; then the index, renamed into place; then the live records removed. A
   * crash before the index is published leaves every record live and the new archive file unreferenced; the next archival
   * removes unreferenced files and temporary names. A crash after it leaves records both live and archived; the live file is
   * read first, and the next archival removes it.
   */
  const archive = (owned: string) => {
    const lease = takeLock(join(archives, "archive.lease"), { time: new Date(now()).toISOString() });
    if (!lease) return;
    const held: Holding[] = [];
    try {
      const table = index();
      const referenced = new Set(Object.values(table).map((e) => e.file));
      for (const f of readdirSync(archives)) {
        if (f.endsWith(".tmp") || (/^archive-\d+\.jsonl$/.test(f) && !referenced.has(f))) unlinkSync(join(archives, f));
      }
      const terminal = live().filter((r) => TERMINAL.has(r.record.phase)).sort((a, b) => (a.record.updated < b.record.updated ? -1 : 1));
      const old = now() - bounds.ageDays * 86_400_000;
      const due = terminal.filter((r, i) => i < terminal.length - bounds.terminalMost || (timeMs(r.record.updated) ?? now()) < old);
      bounds.fault?.("candidates-selected");
      const moving: { name: string; text: string }[] = [];
      for (const { name } of due) {
        if (name !== owned) {
          const lock = takeLock(lockPath(name), { time: new Date(now()).toISOString(), archiving: true });
          if (!lock) continue;
          held.push(lock);
        }
        // Read again under the lock: a record resubmitted since it was selected is unresolved now, and is not archived.
        let text: string;
        try { text = readFileSync(recordPath(name), "utf8"); } catch { continue; }
        if (!TERMINAL.has((JSON.parse(text) as CustodyRecord).phase)) continue;
        moving.push({ name, text });
      }
      if (moving.length === 0) return;
      let n = Math.max(-1, ...readdirSync(archives).map((f) => /^archive-(\d+)\.jsonl$/.exec(f)).filter((m) => m !== null).map((m) => Number(m![1]))) + 1;
      let batch: string[] = [];
      let size = 0;
      const flush = () => {
        if (batch.length === 0) return;
        const file = `archive-${n++}.jsonl`;
        const temporary = join(archives, `${file}.${process.pid}.${randomUUID()}.tmp`);
        writeFileSync(temporary, batch.join(""), { mode: 0o600, flag: "wx" });
        renameSync(temporary, join(archives, file));
        for (const pending of entries.splice(0)) table[pending.name] = { file, offset: pending.offset, length: pending.length };
        batch = []; size = 0;
      };
      const entries: { name: string; offset: number; length: number }[] = [];
      for (const { name, text } of moving) {
        const bytes = Buffer.byteLength(text) + 1;
        if (size > 0 && size + bytes > bounds.archiveBytes) flush();
        entries.push({ name, offset: size, length: bytes - 1 });
        batch.push(`${text}\n`);
        size += bytes;
      }
      flush();
      bounds.fault?.("archive-written");
      atomic(indexPath, JSON.stringify(table));
      bounds.fault?.("index-published");
      for (const { name, text } of moving) {
        // Removed only when it is still what was archived.
        if (existsSync(recordPath(name)) && readFileSync(recordPath(name), "utf8") === text) unlinkSync(recordPath(name));
      }
    } finally {
      for (const lock of held) releaseLock(lock);
      releaseLock(lease);
    }
  };

  const segmentPaths = (name: string) => ({ data: join(segments, `${id(name)}.jsonl`), ends: join(segments, `${id(name)}.ends`) });
  /** The end offsets of a segment's lines, `from` up to `to` entries; whole 8-byte entries only. */
  const endsOf = (path: string, from: number, to: number): number[] => {
    if (!existsSync(path) || to <= from) return [];
    const count = Math.floor(statSync(path).size / 8);
    const last = Math.min(to, count);
    if (last <= from) return [];
    const buffer = Buffer.alloc((last - from) * 8);
    const fd = openSync(path, "r");
    try { readSync(fd, buffer, 0, buffer.length, from * 8); } finally { closeSync(fd); }
    return Array.from({ length: last - from }, (_, i) => Number(buffer.readBigUInt64LE(i * 8)));
  };

  return {
    archived: () => Object.keys(index()).length,
    lock: async (name, notAfter) => {
      ensure();
      const path = lockPath(name);
      const held = takeLock(path, { time: new Date(now()).toISOString(), notAfter });
      if (held) return async () => { releaseLock(held); };
      const stale = blockedBy(path);
      if (stale) throw new CustodyError({ held: "locked", stale: shown(stale) });
      return null;
    },
    exclusive: async <T>(work: () => Promise<T>): Promise<T> => {
      ensure();
      const path = join(dir, "capacity.lease");
      const until = Date.now() + LEASE_WAIT_MS;
      let held = takeLock(path, { time: new Date(now()).toISOString() });
      while (!held) {
        const stale = blockedBy(path);
        if (stale) throw new CustodyError({ held: "locked", stale: shown(stale) });
        if (Date.now() > until) throw new CustodyError({ held: "locked" });
        await new Promise((resolve) => setTimeout(resolve, 5));
        held = takeLock(path, { time: new Date(now()).toISOString() });
      }
      try { return await work(); } finally { releaseLock(held); }
    },
    read: async (name) => {
      ensure();
      const path = recordPath(name);
      if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as CustodyRecord;
      // A lookup reads the index, never scans the archive.
      const at = index()[name];
      if (!at) return null;
      const fd = openSync(join(archives, at.file), "r");
      try { const buffer = Buffer.alloc(at.length); readSync(fd, buffer, 0, at.length, at.offset); return JSON.parse(buffer.toString("utf8")) as CustodyRecord; }
      finally { closeSync(fd); }
    },
    write: async (name, record) => {
      ensure();
      atomic(recordPath(name), canonicalize(record));
      if (TERMINAL.has(record.phase)) archive(name);
    },
    unresolved: async () => { ensure(); return live().filter((r) => !TERMINAL.has(r.record.phase)).sort((a, b) => (a.record.created < b.record.created ? -1 : 1)).map((r) => ({ id: r.name, key: r.record.identity.key, created: r.record.created })); },
    segment: async (name, at, outcomes) => {
      ensure();
      const { data, ends } = segmentPaths(name);
      const kept = endsOf(ends, 0, at);
      if (kept.length < at) throw new Error(`the segment of ${name} holds fewer outcomes than its record counts`);
      // Cut what an interrupted append left past the record's count, in both files, then append.
      const base = at === 0 ? 0 : kept[at - 1]!;
      if (existsSync(data)) truncateSync(data, base); else writeFileSync(data, "", { mode: 0o600 });
      if (existsSync(ends)) truncateSync(ends, at * 8); else writeFileSync(ends, "", { mode: 0o600 });
      const lines = outcomes.map((o) => Buffer.from(`${JSON.stringify(o)}\n`, "utf8"));
      appendFileSync(data, Buffer.concat(lines), { mode: 0o600 });
      const offsets = Buffer.alloc(lines.length * 8);
      let end = base;
      lines.forEach((line, i) => { end += line.length; offsets.writeBigUInt64LE(BigInt(end), i * 8); });
      appendFileSync(ends, offsets, { mode: 0o600 });
    },
    segmented: async (name, from, limit) => {
      const { data, ends } = segmentPaths(name);
      if (limit <= 0 || !existsSync(data)) return [];
      const offsets = endsOf(ends, Math.max(0, from - 1), from + limit);
      const start = from === 0 ? 0 : offsets.shift();
      if (start === undefined || offsets.length === 0) return [];
      const end = offsets.at(-1)!;
      const buffer = Buffer.alloc(end - start);
      const fd = openSync(data, "r");
      try { readSync(fd, buffer, 0, buffer.length, start); } finally { closeSync(fd); }
      return buffer.toString("utf8").split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l) as Outcome);
    },
  };
}


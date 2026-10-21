/** Source-only Node composition, excluded from the public portable package. */
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";
import type { FactRef } from "@generalbusiness/dap-contract";
import { isDigest, isFactRef, parseStrict, textDigest } from "@generalbusiness/artroom-bytes";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { localJournalRepository, type JournalLocalOptions } from "@generalbusiness/artroom-git/journal-local";
import { archiveSource, type ArchiveReadWork, type ArchiveSource, type ArchiveSourceOptions, type ArchiveTextPort } from "./archive.ts";

export interface GitSourceOptions extends ArchiveSourceOptions { readonly local?: JournalLocalOptions }
export function gitSource(directory: string, options: GitSourceOptions = {}): ArchiveSource {
  const repository = localJournalRepository(directory, options.local);
  return archiveSource({ open: (scope, work) => readJournalRepositoryArchive(repository, scope, work), settle: () => repository.settle?.() ?? Promise.resolve() }, options);
}

export class ArchiveFileFailure extends Error {
  readonly reason: "not-found" | "too-large" | "refused" | "unavailable";
  constructor(reason: "not-found" | "too-large" | "refused" | "unavailable") { super(`archive caller file: ${reason}`); this.reason = reason; }
}
const RECEIPT_BYTES = 64 * 1024;
const decode = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
/** No allocation before a regular descriptor's size is checked. Fixed caller
 * paths only; archive tree paths are not arguments to this function. */
async function fileBytes(path: string, most: number, work?: ArchiveReadWork): Promise<Uint8Array> {
  let file: FileHandle | undefined;
  try {
    work?.check();
    if (!Number.isSafeInteger(most) || most < 0 || most > 8 * 1024 * 1024) throw new ArchiveFileFailure("too-large");
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    work?.check();
    const before = await file.stat({ bigint: true });
    if (!before.isFile()) throw new ArchiveFileFailure("refused");
    if (before.size > BigInt(most)) throw new ArchiveFileFailure("too-large");
    const size = Number(before.size);
    work?.bytes(size + 1); work?.spend({ calls: 1, inputWork: (size + 1) * 4 });
    const bytes = new Uint8Array(size + 1); let length = 0;
    while (length < bytes.length) {
      work?.check();
      const got = await file.read(bytes, length, bytes.length - length, length);
      work?.check(); if (got.bytesRead === 0) break; length += got.bytesRead;
    }
    const after = await file.stat({ bigint: true }); work?.check();
    if (length !== size || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new ArchiveFileFailure("unavailable");
    return bytes.subarray(0, length);
  } catch (error) {
    if (error instanceof ArchiveFileFailure || error && typeof error === "object" && "reason" in error) throw error;
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    throw new ArchiveFileFailure(code === "ENOENT" ? "not-found" : code === "ELOOP" ? "refused" : "unavailable");
  } finally { await file?.close(); }
}

/** Detached text filenames are <64 lowercase digest hex digits>.txt inside
 * this explicitly selected directory. No archive-supplied name is opened. */
export function archiveTexts(directory: string): ArchiveTextPort {
  const pending = new Set<Promise<unknown>>();
  let root: Promise<string> | undefined;
  return {
    async read(digest, most, work) {
      if (!isDigest(digest)) return { ok: false, reason: "refused" };
      const operation = (async () => {
        try {
          work.check(); root ??= realpath(directory);
          const selected = await root; work.check();
          const bytes = await fileBytes(join(selected, `${digest.slice(7)}.txt`), most, work);
          let text: string;
          try { text = decode.decode(bytes); } catch { return { ok: false as const, reason: "unavailable" }; }
          if (textDigest(text) !== digest) return { ok: false as const, reason: "digest-mismatch" };
          return { ok: true as const, text };
        } catch (error) {
          if (error instanceof ArchiveFileFailure) return { ok: false as const, reason: error.reason };
          throw error;
        }
      })();
      pending.add(operation);
      try { return await operation; } finally { pending.delete(operation); }
    },
    async settle() { await Promise.allSettled([...pending]); },
  };
}

/** A bounded caller-selected receipt is a position pin, not a signature or
 * an authorization claim. Only its native fact is used for membership. */
export async function readArchiveReceipt(path: string): Promise<{ readonly fact: FactRef }> {
  let value: unknown;
  try { value = parseStrict(decode.decode(await fileBytes(path, RECEIPT_BYTES))); }
  catch (error) { if (error instanceof ArchiveFileFailure) throw error; throw new ArchiveFileFailure("refused"); }
  if (!value || typeof value !== "object" || !("fact" in value) || !isFactRef(value.fact)) throw new ArchiveFileFailure("refused");
  return { fact: { ...value.fact, at: { ...value.fact.at } } };
}

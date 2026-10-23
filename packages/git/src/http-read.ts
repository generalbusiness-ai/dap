/**
 * SHA-1 smart-HTTP upload-pack as a Web-only GitSource. Protocol sources:
 * git-scm.com/docs/gitprotocol-http, gitprotocol-pack, gitformat-pack and
 * gitprotocol-capabilities and gitprotocol-v2; zlib framing: RFC 1950/1951.
 * No thin pack, retry or inference of absence from an error. Default reads fetch
 * closures; explicit isolated reads require shallow/filter and return only
 * the wanted commit/tree/blob, with no ancestry claim.
 * The caller's maxBytes bounds wire, inflated and retained object bytes;
 * it is a transport allowance, not an adopted platform quota.
 */
import { unreadableGit as fail } from "./names.ts";
import { ascii } from "./ascii.ts";
import { hex } from "@generalbusiness/dap-bytes";
import { sha1 } from "@noble/hashes/legacy.js";
import { GitRefusal, objectId, refName, remoteUrl, ZERO_ID, type ObjectId } from "./names.ts";
import { idOf, READ_BOUNDS, type GitSource, type ObjectType, type ReadBounds, type RefTarget, type StoredObject } from "./reader.ts";
import { COMMAND_MS } from "./program.ts";
import type { SmartHttpOptions } from "./http.ts";

export interface DecodedObject { id: ObjectId; type: ObjectType; data: Uint8Array }
/**
 * `flushAfter`: one flush packet (`0000`) may follow the pack's trailer, as an
 * upload-pack answer of Cloudflare Artifacts sends it. Any other byte
 * after the trailer is refused.
 */
export interface PackReadOptions {
  maxBytes: number; bounds?: ReadBounds; flushAfter?: boolean;
  /** Exact one non-delta commit/tree/blob. Enforced at the header before inflation. */
  singleObjectBytes?: number;
  /** Absolute deadline for isolated framing and inflation; default closure decoding is unchanged. */
  deadline?: number;
}
/** Isolation is explicit. Its conservative payload reservation excludes engine/stream metadata and is not measured peak memory. */
export interface IsolatedObjectReads {
  ownedBytes: number;
  /** Trusted opt-in for object exchanges only. Ref reads and omitted options retain v0. */
  protocol?: "v2";
}
export interface SmartHttpReadOptions extends SmartHttpOptions { isolateObjects?: IsolatedObjectReads }
// Includes wire chunks/concats, advertisement strings, pack/Blob copies,
// inflate chunks/concat, retained bytes and one returned copy. Metadata is
// separately finite by packet, ref and exact-one-object counts.
const ISOLATED_WORKING_MULTIPLE = 16;
const large = (what: string) => new GitRefusal("too-large", what);
const utf8 = new TextEncoder();
const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
function checked(options: PackReadOptions): { maxBytes: number; bounds: ReadBounds } {
  const bounds = { ...(options.bounds ?? READ_BOUNDS) };
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 32 || Object.values(bounds).some((n) => !Number.isSafeInteger(n) || n <= 0)) throw large("read allowance");
  return { maxBytes: options.maxBytes, bounds };
}
const typeLimit = (type: ObjectType, bounds: ReadBounds) => type === "commit" ? bounds.commitBytes : type === "tree" ? bounds.treeBytes : bounds.blobBytes;

function beforeDeadline(deadline: number | undefined): void {
  if (deadline !== undefined && (!Number.isSafeInteger(deadline) || Date.now() >= deadline)) throw fail("read deadline");
}
async function readBytes(stream: ReadableStream<Uint8Array> | null, limit: number, deadline?: number): Promise<Uint8Array> {
  if (stream === null) throw fail("read body");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  try {
    beforeDeadline(deadline);
    if (deadline !== undefined) timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => undefined); }, deadline - Date.now());
    for (;;) {
      const next = await reader.read();
      if (expired) throw fail("read deadline");
      beforeDeadline(deadline);
      if (next.done) return concat(chunks);
      total += next.value.length;
      if (total > limit) throw large("read bytes");
      chunks.push(new Uint8Array(next.value));
    }
  } catch (e) {
    if (e instanceof GitRefusal && e.reason === "unreadable" && e.what === "read deadline") {
      // Let the isolated owner make expiry terminal before its finally.
      // Cancellation is not proof that this stream's cleanup has settled.
      void reader.cancel().catch(() => undefined);
      throw e;
    }
    await reader.cancel().catch(() => undefined);
    if (e instanceof GitRefusal) throw e;
    throw fail("read body");
  } finally { if (timer !== undefined) clearTimeout(timer); reader.releaseLock(); }
}

/** DEFLATE framing only; the Web decompressor validates/inflates the slice. */
class Bits {
  position: number;
  constructor(readonly data: Uint8Array, at: number, readonly deadline?: number) { this.position = at * 8; }
  take(n: number): number {
    beforeDeadline(this.deadline);
    if (this.position + n > this.data.length * 8) throw fail("deflate framing");
    let out = 0;
    for (let i = 0; i < n; i++, this.position++) out |= ((this.data[Math.floor(this.position / 8)]! >>> (this.position % 8)) & 1) << i;
    return out;
  }
  skip(n: number): void {
    beforeDeadline(this.deadline);
    if (this.position + n > this.data.length * 8) throw fail("deflate framing");
    this.position += n;
  }
}
type Huffman = Map<number, number>[];
function huffman(lengths: readonly number[]): Huffman {
  const counts = new Array<number>(16).fill(0);
  for (const n of lengths) {
    if (n < 0 || n > 15) throw fail("deflate code");
    if (n > 0) counts[n]!++;
  }
  const next = new Array<number>(16).fill(0);
  let code = 0;
  let available = 1;
  for (let n = 1; n <= 15; n++) {
    available = available * 2 - counts[n]!;
    if (available < 0) throw fail("deflate code");
    code = (code + counts[n - 1]!) * 2;
    next[n] = code;
  }
  const out = Array.from({ length: 16 }, () => new Map<number, number>());
  lengths.forEach((n, symbol) => { if (n > 0) out[n]!.set(next[n]!++, symbol); });
  return out;
}
function symbol(bits: Bits, codes: Huffman): number {
  let code = 0;
  for (let n = 1; n <= 15; n++) {
    code = code * 2 + bits.take(1);
    const matched = codes[n]!.get(code);
    if (matched !== undefined) return matched;
  }
  throw fail("deflate symbol");
}
const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_BITS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_BITS = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
const FIXED = huffman(Array.from({ length: 288 }, (_, s) => s < 144 ? 8 : s < 256 ? 9 : s < 280 ? 7 : 8));
const FIXED_DIST = huffman(new Array<number>(32).fill(5));

function zlibEnd(data: Uint8Array, start: number, expected: number, deadline?: number): number {
  const cmf = data[start];
  const flg = data[start + 1];
  if (cmf === undefined || flg === undefined || (cmf & 15) !== 8 || (cmf >>> 4) > 7 || ((cmf * 256 + flg) % 31) !== 0 || (flg & 32) !== 0) throw fail("zlib header");
  const bits = new Bits(data, start + 2, deadline);
  let output = 0;
  let final = false;
  while (!final) {
    final = bits.take(1) === 1;
    const kind = bits.take(2);
    if (kind === 0) {
      bits.position = Math.ceil(bits.position / 8) * 8;
      const length = bits.take(16);
      if ((length ^ bits.take(16)) !== 65535) throw fail("deflate stored block");
      bits.skip(length * 8);
      output += length;
    } else {
      if (kind === 3) throw fail("deflate block");
      let literals = FIXED;
      let distances = FIXED_DIST;
      if (kind === 2) {
        const nl = bits.take(5) + 257;
        const nd = bits.take(5) + 1;
        const nc = bits.take(4) + 4;
        if (nl > 286) throw fail("deflate lengths");
        const codeLengths = new Array<number>(19).fill(0);
        for (let i = 0; i < nc; i++) codeLengths[CODE_ORDER[i]!] = bits.take(3);
        const codes = huffman(codeLengths);
        const lengths: number[] = [];
        while (lengths.length < nl + nd) {
          const s = symbol(bits, codes);
          if (s <= 15) lengths.push(s);
          else {
            if (s === 16 && lengths.length === 0) throw fail("deflate repeat");
            const count = s === 16 ? bits.take(2) + 3 : s === 17 ? bits.take(3) + 3 : bits.take(7) + 11;
            if (lengths.length + count > nl + nd) throw fail("deflate repeat");
            const value = s === 16 ? lengths.at(-1)! : 0;
            for (let i = 0; i < count; i++) lengths.push(value);
          }
        }
        if (lengths[256] === 0) throw fail("deflate end code");
        literals = huffman(lengths.slice(0, nl));
        distances = huffman(lengths.slice(nl));
      }
      for (;;) {
        const s = symbol(bits, literals);
        if (s === 256) break;
        if (s < 256) output++;
        else {
          if (s > 285) throw fail("deflate length");
          const length = LENGTH_BASE[s - 257]! + bits.take(LENGTH_BITS[s - 257]!);
          const d = symbol(bits, distances);
          if (d > 29) throw fail("deflate distance");
          const distance = DIST_BASE[d]! + bits.take(DIST_BITS[d]!);
          if (distance > output || distance > 2 ** ((cmf >>> 4) + 8)) throw fail("deflate distance");
          output += length;
        }
        if (output > expected) throw new GitRefusal("wrong-size", "packed object");
      }
    }
    if (output > expected) throw new GitRefusal("wrong-size", "packed object");
  }
  const end = Math.ceil(bits.position / 8) + 4; // zlib Adler-32 trailer
  if (end > data.length || output !== expected) throw new GitRefusal("wrong-size", "packed object");
  return end;
}

class Cursor {
  constructor(readonly data: Uint8Array, public at = 0) {}
  byte(): number {
    const b = this.data[this.at++];
    if (b === undefined) throw fail("pack entry");
    return b;
  }
  variable(first = 0, multiplier = 1): number {
    let n = first;
    for (;;) {
      const b = this.byte();
      n += (b & 127) * multiplier;
      if (!Number.isSafeInteger(n)) throw large("pack size");
      if (b < 128) return n;
      multiplier *= 128;
      if (!Number.isSafeInteger(multiplier)) throw large("pack size");
    }
  }
}

function applyDelta(raw: Uint8Array, base: DecodedObject, limit: number): Uint8Array {
  const cursor = new Cursor(raw);
  if (cursor.variable() !== base.data.length) throw new GitRefusal("wrong-size", "delta base");
  const size = cursor.variable();
  if (size > limit) throw large("delta result");
  const out = new Uint8Array(size);
  let at = 0;
  while (cursor.at < raw.length) {
    const op = cursor.byte();
    if (op === 0) throw fail("delta opcode");
    if ((op & 128) !== 0) {
      let offset = 0;
      let count = 0;
      for (let i = 0; i < 4; i++) if ((op & (1 << i)) !== 0) offset += cursor.byte() * 2 ** (8 * i);
      for (let i = 0; i < 3; i++) if ((op & (1 << (i + 4))) !== 0) count += cursor.byte() * 2 ** (8 * i);
      if (count === 0) count = 65536;
      if (offset + count > base.data.length || at + count > size) throw fail("delta copy");
      out.set(base.data.subarray(offset, offset + count), at);
      at += count;
    } else {
      if (cursor.at + op > raw.length || at + op > size) throw fail("delta insert");
      out.set(raw.subarray(cursor.at, cursor.at + op), at);
      cursor.at += op;
      at += op;
    }
  }
  if (at !== size) throw new GitRefusal("wrong-size", "delta result");
  return out;
}

interface Entry { offset: number; raw: Uint8Array; object?: DecodedObject; dependents: Entry[]; baseId?: string }
/**
 * A full, self-contained SHA-1 pack; delta resolution is linear by
 * dependencies. The pack is read by its own structure: the header, the
 * counted objects, then the 20-byte trailer, which is checked where the
 * objects end, not at the end of the input.
 */
export async function decodePack(input: Uint8Array, options: PackReadOptions): Promise<DecodedObject[]> {
  const { bounds, maxBytes } = checked(options);
  beforeDeadline(options.deadline);
  if (input.length > maxBytes) throw large("pack bytes");
  const pack = new Uint8Array(input);
  if (pack.length < 32 || ascii(pack.subarray(0, 4)) !== "PACK") throw fail("pack header");
  const header = new DataView(pack.buffer);
  const version = header.getUint32(4);
  const count = header.getUint32(8);
  if (version !== 2 && version !== 3) throw fail("pack version");
  if (count > bounds.closureObjects) throw large("pack objects");
  if (options.singleObjectBytes !== undefined && (!Number.isSafeInteger(options.singleObjectBytes) || options.singleObjectBytes < 0 || count !== 1)) throw large("isolated pack objects");
  const cursor = new Cursor(pack, 12);
  const offsets = new Map<number, Entry>();
  const waiting = new Map<string, Entry[]>();
  const ready: Entry[] = [];
  const entries: Entry[] = [];
  let inflated = 0;
  const types: Partial<Record<number, ObjectType>> = { 1: "commit", 2: "tree", 3: "blob", 4: "tag" };
  for (let i = 0; i < count; i++) {
    const offset = cursor.at;
    const first = cursor.byte();
    const kind = (first >>> 4) & 7;
    const type = types[kind];
    if (type === undefined && kind !== 6 && kind !== 7) throw new GitRefusal("wrong-type", "pack entry");
    const size = first < 128 ? first & 15 : cursor.variable(first & 15, 16);
    if (options.singleObjectBytes !== undefined) {
      if (type === undefined || type === "tag") throw new GitRefusal("wrong-type", "isolated pack entry");
      if (size > options.singleObjectBytes) throw large("isolated object allowance");
    }
    if (size > (type === undefined ? maxBytes : typeLimit(type, bounds)) || inflated + size > maxBytes) throw large("inflated bytes");
    let baseOffset: number | undefined;
    let baseId: string | undefined;
    if (kind === 6) {
      let b = cursor.byte();
      let distance = b & 127;
      while ((b & 128) !== 0) {
        b = cursor.byte();
        distance = (distance + 1) * 128 + (b & 127);
        if (!Number.isSafeInteger(distance)) throw large("delta offset");
      }
      baseOffset = offset - distance;
      if (distance === 0 || !offsets.has(baseOffset)) throw fail("delta offset");
    } else if (kind === 7) {
      if (cursor.at + 20 > pack.length) throw fail("delta base");
      baseId = objectId(hex(pack.subarray(cursor.at, cursor.at + 20)), "delta base");
      cursor.at += 20;
    }
    const end = zlibEnd(pack, cursor.at, size, options.deadline);
    const raw = await readBytes(new Blob([pack.slice(cursor.at, end)]).stream().pipeThrough(new DecompressionStream("deflate")), size, options.deadline);
    if (raw.length !== size) throw new GitRefusal("wrong-size", "pack entry");
    cursor.at = end;
    inflated += size;
    const entry: Entry = { offset, raw, dependents: [] };
    if (type !== undefined) { entry.object = { id: idOf(type, raw), type, data: raw }; ready.push(entry); }
    else if (baseOffset !== undefined) offsets.get(baseOffset)!.dependents.push(entry);
    else {
      entry.baseId = baseId!;
      if (!waiting.has(baseId!)) waiting.set(baseId!, []);
      waiting.get(baseId!)!.push(entry);
    }
    offsets.set(offset, entry);
    entries.push(entry);
  }
  // The trailer is the SHA-1 of every byte before it, where the counted objects end.
  const end = cursor.at;
  if (end + 20 > pack.length) throw fail("pack trailer");
  if (hex(sha1(pack.subarray(0, end))) !== hex(pack.subarray(end, end + 20))) throw new GitRefusal("hash-mismatch", "pack trailer");
  const after = pack.subarray(end + 20);
  if (after.length !== 0 && !(options.flushAfter === true && after.length === 4 && ascii(after) === "0000")) throw fail("pack trailing data");
  const resolved = new Map<string, DecodedObject>();
  let constructed = ready.reduce((n, entry) => n + entry.object!.data.length, 0);
  for (let i = 0; i < ready.length; i++) {
    const entry = ready[i]!;
    const object = entry.object!;
    if (resolved.has(object.id)) throw fail("repeated pack object");
    resolved.set(object.id, object);
    const children = [...entry.dependents, ...(waiting.get(object.id) ?? [])];
    waiting.delete(object.id);
    for (const child of children) {
      const data = applyDelta(child.raw, object, Math.min(typeLimit(object.type, bounds), maxBytes - constructed));
      constructed += data.length;
      child.object = { id: idOf(object.type, data), type: object.type, data };
      ready.push(child);
    }
  }
  if (ready.length !== count) throw fail("unresolved delta base");
  return entries.map((entry) => entry.object!);
}

const packet = (line: string) => {
  const data = utf8.encode(line);
  return concat([utf8.encode((data.length + 4).toString(16).padStart(4, "0")), data]);
};
function readPacket(data: Uint8Array, at: number): { line: string | null; next: number } {
  const digits = ascii(data.subarray(at, at + 4));
  if (!/^[0-9a-f]{4}$/.test(digits)) throw fail("upload pkt-line");
  const n = Number.parseInt(digits, 16);
  if (n === 0) return { line: null, next: at + 4 };
  if (n <= 4 || n > 65520 || at + n > data.length) throw fail("upload pkt-line");
  const line = ascii(data.subarray(at + 4, at + n));
  return { line: line.endsWith("\n") ? line.slice(0, -1) : line, next: at + n };
}
interface Advertisement { refs: RefTarget[]; ids: Set<string>; capabilities: string[] }

/** Raw framing: a pack sideband is binary, never an ASCII string. */
function v2Frame(data: Uint8Array, at: number): { kind: "data" | "flush" | "delimiter" | "end"; start: number; next: number } {
  if (at + 4 > data.length) throw fail("upload pkt-line");
  let size = 0;
  for (let i = at; i < at + 4; i++) {
    const c = data[i]!;
    const digit = c >= 48 && c <= 57 ? c - 48 : c >= 97 && c <= 102 ? c - 87 : -1;
    if (digit < 0) throw fail("upload pkt-line");
    size = size * 16 + digit;
  }
  if (size <= 2) return { kind: size === 0 ? "flush" : size === 1 ? "delimiter" : "end", start: at + 4, next: at + 4 };
  if (size < 5 || size > 65520 || at + size > data.length) throw fail("upload pkt-line");
  return { kind: "data", start: at + 4, next: at + size };
}
function wireEquals(data: Uint8Array, start: number, end: number, text: string): boolean {
  if (end - start !== text.length) return false;
  for (let i = 0; i < text.length; i++) if (data[start + i] !== text.charCodeAt(i)) return false;
  return true;
}
/** Only text pkt-lines drop one optional trailing LF. */
function wireTextEquals(data: Uint8Array, start: number, end: number, text: string): boolean {
  return wireEquals(data, start, data[end - 1] === 10 ? end - 1 : end, text);
}

/** Fixed categories only; no status text, response URL, header or body survives. */
export interface HttpResponseRefusalDetail {
  readonly statusClass: "200" | "1xx" | "2xx-other" | "3xx" | "4xx" | "5xx" | "other";
  readonly redirected: boolean;
  readonly url: "empty" | "exact" | "changed";
  readonly mediaType: "missing" | "upload-pack-advertisement" | "upload-pack-result" | "upload-pack-advertisement-case" | "upload-pack-result-case" | "text/plain" | "text/html" | "application/json" | "other" | "unclassified-long";
}
const httpResponseDetails = new WeakMap<GitRefusal, Readonly<HttpResponseRefusalDetail>>();
export function httpResponseRefusalDetail(error: unknown): Readonly<HttpResponseRefusalDetail> | undefined {
  return error instanceof GitRefusal ? httpResponseDetails.get(error) : undefined;
}
function httpResponseRefusal(response: Response, requested: string): GitRefusal {
  const error = fail("HTTP read response");
  try {
    const status = response.status;
    const statusClass: HttpResponseRefusalDetail["statusClass"] = status === 200 ? "200" : status >= 100 && status < 200 ? "1xx"
      : status >= 200 && status < 300 ? "2xx-other" : status >= 300 && status < 400 ? "3xx" : status >= 400 && status < 500 ? "4xx" : status >= 500 && status < 600 ? "5xx" : "other";
    const raw = response.headers.get("content-type");
    // Inspect at most 256 code units. A longer unclassified token stays unknown;
    // parameters after an early semicolon never enter the retained diagnostic.
    const prefix = raw?.slice(0, 256), semicolon = prefix?.indexOf(";") ?? -1;
    const type = raw === null ? null : semicolon >= 0 ? prefix!.slice(0, semicolon).trim() : raw.length <= 256 ? raw.trim() : undefined;
    const folded = type?.toLowerCase(); // Bounded diagnostic copy only; admission remains exact.
    const mediaType: HttpResponseRefusalDetail["mediaType"] = type === null ? "missing" : type === undefined ? "unclassified-long"
      : type === "application/x-git-upload-pack-advertisement" ? "upload-pack-advertisement" : type === "application/x-git-upload-pack-result" ? "upload-pack-result"
      : folded === "application/x-git-upload-pack-advertisement" ? "upload-pack-advertisement-case" : folded === "application/x-git-upload-pack-result" ? "upload-pack-result-case"
      : type === "text/plain" || type === "text/html" || type === "application/json" ? type : "other";
    httpResponseDetails.set(error, Object.freeze({ statusClass, redirected: response.redirected === true, url: response.url === "" ? "empty" : response.url === requested ? "exact" : "changed", mediaType }));
  } catch { /* Diagnostic metadata must not change the original refusal or cancellation. */ }
  return error;
}

/** Fixed diagnostic words only. These describe a refusal, never provider text. */
export interface AdvertisementRefusalDetail {
  readonly subtype: "first-frame-kind" | "first-frame-version" | "trailing-data" | "capability-frame-kind"
    | "capability-name-character" | "capability-value-character" | "capability-empty-name" | "capability-empty-value"
    | "duplicate-fetch" | "duplicate-object-format" | "service-preamble-flush" | "post-preamble-version";
  readonly firstFrame: "version-2" | "service-upload" | "error" | "other" | "non-data";
  readonly postPreamble?: "version-2" | "protocol-0-ref" | "other" | "non-data";
}
const advertisementDetails = new WeakMap<GitRefusal, Readonly<AdvertisementRefusalDetail>>();
/** An absent detail leaves legacy, framing, HTTP and other refusals unchanged. */
export function advertisementRefusalDetail(error: unknown): Readonly<AdvertisementRefusalDetail> | undefined {
  return error instanceof GitRefusal ? advertisementDetails.get(error) : undefined;
}
function advertisementRefusal(what: "upload advertisement" | "upload capabilities", subtype: AdvertisementRefusalDetail["subtype"], firstFrame: AdvertisementRefusalDetail["firstFrame"], postPreamble?: AdvertisementRefusalDetail["postPreamble"]): GitRefusal {
  const error = fail(what);
  advertisementDetails.set(error, Object.freeze({ subtype, firstFrame, ...(postPreamble === undefined ? {} : { postPreamble }) }));
  return error;
}

/** No refs, unknown capability strings, token arrays or growing metadata are retained. */
function v2Capabilities(data: Uint8Array, maximumPackets: number, deadline: number): void {
  let at = 0, count = 1, fetchSeen = false, formatSeen = false, shallow = false, filter = false;
  let version = v2Frame(data, at);
  const firstFrame: AdvertisementRefusalDetail["firstFrame"] = version.kind !== "data" ? "non-data"
    : wireTextEquals(data, version.start, version.next, "version 2") ? "version-2"
    : wireTextEquals(data, version.start, version.next, "# service=git-upload-pack") ? "service-upload"
    : version.next - version.start >= 4 && wireEquals(data, version.start, version.start + 4, "ERR ") ? "error" : "other";
  let postPreamble: AdvertisementRefusalDetail["postPreamble"];
  const refuse = (what: "upload advertisement" | "upload capabilities", subtype: AdvertisementRefusalDetail["subtype"]) => advertisementRefusal(what, subtype, firstFrame, postPreamble);
  if (version.kind !== "data") throw refuse("upload advertisement", "first-frame-kind");
  if (wireTextEquals(data, version.start, version.next, "# service=git-upload-pack")) {
    beforeDeadline(deadline);
    if (++count > maximumPackets) throw large("upload advertisement packets");
    const flush = v2Frame(data, version.next);
    if (flush.kind !== "flush") throw refuse("upload advertisement", "service-preamble-flush");
    beforeDeadline(deadline);
    if (++count > maximumPackets) throw large("upload advertisement packets");
    version = v2Frame(data, flush.next);
    let ref = version.kind === "data" && version.next - version.start >= 41 && data[version.start + 40] === 32;
    for (let i = version.start; ref && i < version.start + 40; i++) {
      const c = data[i]!; ref = c >= 48 && c <= 57 || c >= 97 && c <= 102;
    }
    postPreamble = version.kind !== "data" ? "non-data" : wireTextEquals(data, version.start, version.next, "version 2") ? "version-2" : ref ? "protocol-0-ref" : "other";
    if (postPreamble !== "version-2") throw refuse("upload advertisement", "post-preamble-version");
  } else if (firstFrame !== "version-2") throw refuse("upload advertisement", "first-frame-version");
  at = version.next;
  for (;;) {
    beforeDeadline(deadline);
    if (++count > maximumPackets) throw large("upload advertisement packets");
    const frame = v2Frame(data, at); at = frame.next;
    if (frame.kind === "flush") {
      if (at !== data.length) throw refuse("upload advertisement", "trailing-data");
      break;
    }
    if (frame.kind !== "data") throw refuse("upload capabilities", "capability-frame-kind");
    const end = data[frame.next - 1] === 10 ? frame.next - 1 : frame.next;
    let equals = end;
    // One validation scan, then at most one feature scan. Unknown values
    // remain bounded wire bytes, not retained provider strings.
    for (let i = frame.start; i < end; i++) {
      const c = data[i]!;
      if (equals === end && c === 61) { equals = i; continue; }
      if (i < equals) {
        if (!(c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 48 && c <= 57 || c === 45 || c === 95)) throw refuse("upload capabilities", "capability-name-character");
      } else if (c < 32 || c > 126) throw refuse("upload capabilities", "capability-value-character");
    }
    if (equals === frame.start) throw refuse("upload capabilities", "capability-empty-name");
    if (equals < end && equals + 1 === end) throw refuse("upload capabilities", "capability-empty-value");
    if (wireEquals(data, frame.start, equals, "fetch")) {
      if (fetchSeen) throw refuse("upload capabilities", "duplicate-fetch");
      fetchSeen = true;
      let token = equals + 1;
      for (let i = token; i <= end; i++) {
        if (i !== end && data[i] !== 32) continue;
        if (wireEquals(data, token, i, "shallow")) shallow = true;
        if (wireEquals(data, token, i, "filter")) filter = true;
        token = i + 1;
      }
    } else if (wireEquals(data, frame.start, equals, "object-format")) {
      if (formatSeen) throw refuse("upload capabilities", "duplicate-object-format");
      formatSeen = true;
      if (!wireEquals(data, equals + 1, end, "sha1")) throw new GitRefusal("unsupported-object-format", "upload advertisement");
    }
  }
  if (!fetchSeen || !shallow || !filter) throw fail("isolated object capabilities");
}

/** Exact done-response grammar. Compaction reuses the owned HTTP buffer. */
function v2Pack(data: Uint8Array, id: string, deadline: number): { pack: Uint8Array; boundary: boolean } {
  beforeDeadline(deadline);
  let frame = v2Frame(data, 0), boundary = false;
  if (frame.kind === "data" && wireTextEquals(data, frame.start, frame.next, "shallow-info")) {
    for (;;) {
      beforeDeadline(deadline);
      frame = v2Frame(data, frame.next);
      if (frame.kind === "delimiter") break;
      if (frame.kind !== "data" || boundary || !wireTextEquals(data, frame.start, frame.next, `shallow ${id}`)) throw fail("isolated shallow boundary");
      boundary = true;
    }
    frame = v2Frame(data, frame.next);
  }
  // done forbids acknowledgments. No want-ref, URI or sideband-all was requested.
  if (frame.kind !== "data" || !wireTextEquals(data, frame.start, frame.next, "packfile")) throw fail("upload negotiation");
  let write = 0;
  for (;;) {
    beforeDeadline(deadline);
    frame = v2Frame(data, frame.next);
    if (frame.kind === "flush") {
      // HTTP ends here. remote-curl's helper-only 0002 is not server payload.
      if (frame.next !== data.length) throw fail("upload negotiation");
      return { pack: data.subarray(0, write), boundary };
    }
    if (frame.kind !== "data") throw fail("upload negotiation");
    const channel = data[frame.start];
    if (channel === 1) {
      const length = frame.next - frame.start - 1;
      // Destination ends no later than this payload's end, before the next
      // unread header. Each pack byte moves once; no second pack is allocated.
      data.copyWithin(write, frame.start + 1, frame.next); write += length;
    } else if (channel !== 2) throw fail("upload negotiation"); // fatal text is never returned
  }
}

/**
 * Verified pack objects are cached by exact ID, privately and bounded.
 * A commit want normally supplies its trees/blobs and ancestry in one pack.
 * A v0 uncached nonadvertised want requires the server's advertised allowance;
 * any denial, missing wanted object, bad pack or HTTP failure rejects.
 * Only a complete advertisement can establish a ref's absence.
 */
export class SmartHttpSource implements GitSource {
  readonly #remote: string;
  readonly #authorization: string | undefined;
  readonly #fetch: (request: Request) => Promise<Response>;
  readonly #options: { maxBytes: number; bounds: ReadBounds };
  readonly #timeoutMs: number;
  readonly #objects = new Map<string, DecodedObject>();
  #retainedBytes = 0;
  readonly #isolation: IsolatedObjectReads | undefined;
  #busy = false;
  #abandoned = false;
  #abort: (() => void) | null = null;
  #issuedBytes = 0;
  #deadline: number | null = null;
  /** Fixed per-source payload allowance; null identifies the full-closure mode. */
  get isolatedPayloadAllowance(): number | null { return this.#isolation?.ownedBytes ?? null; }
  constructor(options: SmartHttpReadOptions) {
    this.#remote = remoteUrl(options.remote, options.transport ?? "https").replace(/\/$/, "");
    if (!this.#remote.startsWith("https://") && !this.#remote.startsWith("http://")) throw new GitRefusal("bad-remote", "HTTP read remote");
    this.#authorization = options.authorization;
    this.#fetch = options.fetch ?? ((request) => fetch(request));
    this.#options = checked(options);
    this.#isolation = options.isolateObjects === undefined ? undefined : { ...options.isolateObjects };
    if (this.#isolation?.protocol !== undefined && this.#isolation.protocol !== "v2") throw fail("isolated object capabilities");
    const working = ISOLATED_WORKING_MULTIPLE * this.#options.maxBytes;
    if (this.#isolation && (!Number.isSafeInteger(working) || !Number.isSafeInteger(this.#isolation.ownedBytes) || this.#isolation.ownedBytes < working)) throw large("isolated payload allowance");
    this.#timeoutMs = options.timeoutMs ?? COMMAND_MS;
    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs <= 0) throw large("read deadline");
  }
  #timely(): void {
    if (this.#abandoned) throw fail("isolated source abandoned");
    if (this.#deadline !== null && Date.now() >= this.#deadline) {
      this.#abandon();
      throw fail("isolated read deadline");
    }
  }
  #abandon(): void {
    // A deadline consumes this source's reservation even when cancellation
    // or a detached upstream continuation has not settled.
    if (this.#abandoned) return;
    this.#abandoned = true;
    try { this.#abort?.(); } catch { /* never reuse abandoned work */ }
  }
  #output(bytes: number): void {
    if (!this.#isolation) return;
    this.#timely();
    if (bytes > this.#isolation.ownedBytes - this.#retainedBytes - this.#issuedBytes) throw large("isolated returned payload");
    // Conservatively charge every caller-owned result for this source's lifetime:
    // no guess that a caller released its previous copy.
    this.#issuedBytes += bytes;
  }
  async #isolated<T>(read: () => Promise<T>): Promise<T> {
    if (!this.#isolation) return read();
    this.#timely();
    if (this.#busy) throw large("concurrent isolated read");
    if (ISOLATED_WORKING_MULTIPLE * this.#options.maxBytes > this.#isolation.ownedBytes - this.#retainedBytes - this.#issuedBytes) throw large("isolated working payload");
    const deadline = Date.now() + this.#timeoutMs;
    if (!Number.isSafeInteger(deadline)) throw large("isolated read deadline");
    this.#busy = true;
    this.#deadline = deadline;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        // Cancellation is a request, not proof that an upstream or its
        // cleanup settled. Keep this source and its reservation terminal.
        this.#abandon();
        reject(fail("isolated read deadline"));
      }, this.#timeoutMs);
    });
    try { const result = await Promise.race([read(), expired]); this.#timely(); return result; }
    catch (error) {
      // Shared framing/inflation helpers use the original fixed refusal.
      // Preserve that exact error while making their synchronous expiry terminal.
      if (error instanceof GitRefusal && error.reason === "unreadable" && (error.what === "read deadline" || error.what === "isolated read deadline")) this.#abandon();
      throw error;
    }
    finally {
      if (timer !== undefined) clearTimeout(timer);
      if (!this.#abandoned) { this.#busy = false; this.#deadline = null; }
    }
  }
  async #request(path: string, media: string, body?: Uint8Array, protocolV2 = false): Promise<Uint8Array> {
    const controller = new AbortController();
    this.#timely();
    if (body !== undefined && body.length > this.#options.maxBytes) throw large("upload request");
    const duration = this.#deadline === null ? this.#timeoutMs : Math.min(this.#timeoutMs, this.#deadline - Date.now());
    if (duration <= 0) {
      if (this.#isolation) this.#abandon();
      throw fail("isolated read deadline");
    }
    const timer = setTimeout(() => { if (this.#isolation) this.#abandon(); controller.abort(); }, duration);
    if (this.#isolation) this.#abort = () => controller.abort();
    try {
      const url = `${this.#remote}/${path}`;
      const headers = new Headers({ accept: media, "cache-control": "no-cache" });
      if (protocolV2) headers.set("git-protocol", "version=2");
      if (this.#authorization !== undefined) headers.set("authorization", this.#authorization);
      if (body !== undefined) headers.set("content-type", "application/x-git-upload-pack-request");
      const init: RequestInit & { credentials: "omit" } = { method: body === undefined ? "GET" : "POST", headers, redirect: "manual", credentials: "omit", signal: controller.signal, ...(body === undefined ? {} : { body }) };
      const response = await this.#fetch(new Request(url, init));
      if (this.#isolation && (this.#abandoned || Date.now() >= this.#deadline!)) {
        const error = fail(this.#abandoned ? "isolated source abandoned" : "isolated read deadline");
        this.#abandon();
        void response.body?.cancel().catch(() => undefined);
        throw error;
      }
      if (response.status !== 200 || response.redirected || (response.url !== "" && response.url !== url) || response.headers.get("content-type")?.split(";", 1)[0]?.trim() !== media) {
        const error = httpResponseRefusal(response, url);
        await response.body?.cancel().catch(() => undefined);
        throw error;
      }
      const result = await readBytes(response.body, this.#options.maxBytes, this.#deadline ?? undefined);
      this.#timely();
      return result;
    } catch (e) {
      if (e instanceof GitRefusal) throw e;
      throw fail("HTTP read request");
    } finally { clearTimeout(timer); if (this.#isolation) this.#abort = null; }
  }
  async #advertisement(): Promise<Advertisement> {
    const data = await this.#request("info/refs?service=git-upload-pack", "application/x-git-upload-pack-advertisement");
    const lines: (string | null)[] = [];
    for (let at = 0; at < data.length;) {
      if (this.#isolation && lines.length >= this.#options.bounds.refs + 3) throw large("upload advertisement packets");
      this.#timely();
      const p = readPacket(data, at); lines.push(p.line); at = p.next;
    }
    if (lines[0] !== "# service=git-upload-pack" || lines[1] !== null || lines.at(-1) !== null || lines.length < 3) throw fail("upload advertisement");
    const refs: RefTarget[] = [];
    const ids = new Set<string>();
    const names = new Set<string>();
    const capabilities: string[] = [];
    for (let i = 2; i < lines.length - 1; i++) {
      this.#timely();
      const line = lines[i];
      if (line === null || line === undefined) throw fail("upload advertisement");
      const nul = line.indexOf("\0");
      if ((i === 2 && nul < 0) || (i > 2 && nul >= 0)) throw fail("upload capabilities");
      if (nul >= 0) {
        const list = line.slice(nul + 1);
        if (!/^[!-~]+(?: [!-~]+)*$/.test(list)) throw fail("upload capabilities");
        capabilities.push(...list.split(" "));
        if (capabilities.some((c) => c.startsWith("object-format=") && c !== "object-format=sha1")) throw new GitRefusal("unsupported-object-format", "upload advertisement");
      }
      const match = /^([0-9a-f]{40}) (.+)$/.exec(nul < 0 ? line : line.slice(0, nul));
      if (match === null) throw fail("upload ref");
      const [id, name] = [match[1]!, match[2]!];
      if (id === ZERO_ID && name === "capabilities^{}" && lines.length === 4) continue;
      objectId(id, "upload object");
      if (names.has(name)) throw fail("repeated upload ref");
      names.add(name);
      if (names.size > this.#options.bounds.refs) throw large("upload refs");
      ids.add(id);
      if (name === "HEAD") continue;
      if (name.endsWith("^{}")) { refName(name.slice(0, -3), "peeled upload ref"); continue; }
      refs.push({ ref: refName(name, "upload ref"), target: id });
    }
    refs.sort((a, b) => a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
    return { refs, ids, capabilities };
  }
  object(id: ObjectId, limit: number): Promise<StoredObject> {
    return this.#isolated(() => this.#object(id, limit));
  }
  async #object(id: ObjectId, limit: number): Promise<StoredObject> {
    objectId(id, "read object");
    if (!Number.isSafeInteger(limit) || limit < 0) throw large("object allowance");
    if (!this.#objects.has(id)) {
      const objects = this.#isolation?.protocol === "v2" ? await this.#objectV2(id, limit) : await this.#objectV0(id, limit);
      this.#timely();
      if (!objects.some((o) => o.id === id)) throw fail("wanted object omitted");
      const additions = objects.filter((o) => !this.#objects.has(o.id));
      const bytes = additions.reduce((n, o) => n + o.data.length, 0);
      if (this.#objects.size + additions.length > this.#options.bounds.closureObjects || this.#retainedBytes + bytes > this.#options.maxBytes) throw large("read cache");
      for (const object of additions) this.#objects.set(object.id, object);
      this.#retainedBytes += bytes;
    }
    const object = this.#objects.get(id)!;
    if (object.data.length <= limit) this.#output(object.data.length);
    return { type: object.type, size: object.data.length, data: object.data.length > limit ? null : new Uint8Array(object.data) };
  }
  async #objectV2(id: ObjectId, limit: number): Promise<DecodedObject[]> {
    const ad = await this.#request("info/refs?service=git-upload-pack", "application/x-git-upload-pack-advertisement", undefined, true);
    v2Capabilities(ad, this.#options.bounds.refs + 3, this.#deadline!);
    // v2 want is an exact object ID, not limited to an advertised ref list.
    // The server still authorizes this request with the same repository credential.
    const body = concat([packet("command=fetch\n"), utf8.encode("0001"), packet(`want ${id}\n`), packet("deepen 1\n"), packet("filter tree:0\n"), packet("no-progress\n"), packet("done\n"), utf8.encode("0000")]);
    const answer = await this.#request("git-upload-pack", "application/x-git-upload-pack-result", body, true);
    const framed = v2Pack(answer, id, this.#deadline!);
    const objects = await decodePack(framed.pack, { ...this.#options, bounds: { ...this.#options.bounds, closureObjects: 1 }, singleObjectBytes: Math.min(limit, this.#options.maxBytes), deadline: this.#deadline! });
    this.#timely();
    if (framed.boundary && objects[0]?.type !== "commit") throw fail("isolated shallow object");
    return objects;
  }
  async #objectV0(id: ObjectId, limit: number): Promise<DecodedObject[]> {
    const ad = await this.#advertisement();
    if (this.#isolation && (!ad.capabilities.includes("shallow") || !ad.capabilities.includes("filter"))) throw fail("isolated object capabilities");
    // allow-tip alone does not authorize an arbitrary non-tip tree/blob.
    const allowed = this.#isolation ? ad.capabilities.includes("allow-reachable-sha1-in-want")
      : ad.capabilities.some(c => c === "allow-tip-sha1-in-want" || c === "allow-reachable-sha1-in-want");
    if (!ad.ids.has(id) && !allowed) throw fail("unadvertised want");
    const selected = this.#isolation ? " shallow filter" : ad.capabilities.includes("ofs-delta") ? " ofs-delta" : "";
    const body = concat([packet(`want ${id}${selected}\n`), ...(this.#isolation ? [packet("deepen 1\n"), packet("filter tree:0\n")] : []), utf8.encode("0000"), packet("done\n")]);
    if (body.length > this.#options.maxBytes) throw large("upload request");
    const answer = await this.#request("git-upload-pack", "application/x-git-upload-pack-result", body);
    let offset = 0, boundary: string | null = null;
    if (this.#isolation) {
      for (let count = 0; ; count++) {
        if (count > 1) throw fail("isolated shallow packets");
        const line = readPacket(answer, offset); offset = line.next;
        if (line.line === null) break;
        const match = /^shallow ([0-9a-f]{40})$/.exec(line.line);
        if (!match || boundary !== null || objectId(match[1], "shallow object") !== id) throw fail("isolated shallow boundary");
        boundary = match[1]!;
      }
    }
    const nak = readPacket(answer, offset);
    if (nak.line !== "NAK") throw fail("upload negotiation");
    const objects = await decodePack(answer.subarray(nak.next), { ...this.#options, flushAfter: true,
      ...(this.#isolation ? { bounds: { ...this.#options.bounds, closureObjects: 1 }, singleObjectBytes: Math.min(limit, this.#options.maxBytes), deadline: this.#deadline! } : {}),
    });
    this.#timely();
    if (boundary !== null && objects[0]?.type !== "commit") throw fail("isolated shallow object");
    return objects;
  }
  ref(name: string): Promise<string | null> {
    return this.#isolated(async () => {
      refName(name, "read ref");
      const target = (await this.#advertisement()).refs.find(r => r.ref === name)?.target ?? null;
      this.#output(target === null ? 0 : target.length * 2);
      return target;
    });
  }
  refs(prefix: string, limit: number): Promise<readonly RefTarget[]> {
    return this.#isolated(async () => {
      if (!prefix.endsWith("/")) throw new GitRefusal("bad-ref-name", "read prefix");
      refName(`${prefix}x`, "read prefix");
      if (!Number.isSafeInteger(limit) || limit < 0) throw large("ref allowance");
      const refs = (await this.#advertisement()).refs.filter(r => r.ref.startsWith(prefix)).slice(0, limit + 1);
      this.#output(refs.reduce((bytes, r) => bytes + 2 * (r.ref.length + r.target.length), 0));
      return refs;
    });
  }
}

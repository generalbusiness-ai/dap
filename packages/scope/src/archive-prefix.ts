/** Native metadata sizing before JSON inspection. This is not a complete
 * privacy inventory or permission to select/export payload bodies. */
import { natural } from "@generalbusiness/dap-bytes";
import { DOMAINS, type Bounds, type Digest, type Head, type PlatformDefinition, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, domainBytes, isDigest, isFactRef, isHead, isRecord, isScopeRef, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_NATIVE_DATA, admitArchivePin, type ArchiveExportRefusal } from "@generalbusiness/dap-git/archive-policy";
import { JOURNAL_V2_LAST_POSITION } from "@generalbusiness/dap-git/journal";
import { platform } from "@generalbusiness/dap-platform";
import { validateArchiveNativeRoot } from "./archive-native-root.ts";
import { ArchiveDeclarations, type ArchiveDeclarationClosure } from "./archive-declarations.ts";
import { ArchiveRetainedReader } from "./archive-retained.ts";
import type { ValidDefinition } from "@generalbusiness/dap-derive";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { timeMs, type ScopeState } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin, readArchivePinAfterReceipt, type ArchivePin } from "./archive-pin.ts";
import type { Sql } from "./sqlite.ts";
import { ARCHIVE_PRIVACY_JSON_PASSES, ARCHIVE_POSITION_METADATA_BYTES, ARCHIVE_FRAME_SIZE_METADATA,
  archivePinValidationWork, archiveNativeDataReservation, archiveScopeFrameReservation } from "./archive-inventory-cost.ts";
export { ARCHIVE_PRIVACY_JSON_PASSES, ARCHIVE_POSITION_METADATA_BYTES } from "./archive-inventory-cost.ts";

export type ArchivePrefixReason = ArchiveExportRefusal | "unavailable" | "incomplete" | "mismatch" | "limit" | "foreign-source-unavailable" | "foreign-source-mismatch";
export class ArchivePrefixStopped extends Error { constructor(readonly reason: ArchivePrefixReason) { super(`archive-${reason}`); } }
export const stopArchivePrefix = (reason: ArchivePrefixReason): never => { throw new ArchivePrefixStopped(reason); };
export interface ArchivePosition { readonly seq: number; readonly hash: Digest; readonly bytes: number }
export interface ArchivePrefix {
  readonly pin: ArchivePin;
  readonly frame: ScopeState;
  readonly through: Head;
  readonly positions: readonly ArchivePosition[];
  readonly bytes: number;
  readonly after?: Head | null;
}

/** Re-read bounded native scope metadata inside the caller's current
 * synchronous frame. Identity is bound to this actual append-derived pin;
 * this does not admit an entry class or any payload. */
export function readArchiveScopeFrame(sql: Pick<Sql, "exec">, expected: ScopeRef, pin: ArchivePin,
  bounds: Pick<Bounds, "sendsPerEntry">, budget: ArchiveBudget): ScopeState {
  budget.check();
  const sizeSql = budget.native(sql, () => ({ metadata: ARCHIVE_FRAME_SIZE_METADATA, inputWork: 0 }));
  const sizes = sizeSql.exec("SELECT octet_length(v) AS size, typeof(v) AS type FROM meta WHERE k = 'scope' LIMIT 1").toArray();
  const size = sizes[0]?.["size"];
  if (sizes.length !== 1 || sizes[0]?.["type"] !== "text" || !natural(size) || size > ARCHIVE_SCOPE_METADATA_BYTES) return stopArchivePrefix("unavailable");
  const frameSql = budget.native(sql, () => archiveScopeFrameReservation(size));
  const frames = frameSql.exec("SELECT v FROM meta WHERE k = 'scope' AND typeof(v) = 'text' AND octet_length(v) = ? LIMIT 1", size).toArray(), frameBytes = frames[0]?.["v"];
  if (frames.length !== 1 || typeof frameBytes !== "string" || frameBytes.length > size || utf8(frameBytes).length !== size) return stopArchivePrefix("unavailable");
  const frame: unknown = parseStrict(frameBytes);
  if (!isRecord(frame) || Object.keys(frame).sort().join(",") !== "at,creator,genesis,head,held,status,time" || canonicalize(frame) !== frameBytes || !isScopeRef(frame["at"]) || canonicalize(frame["at"]) !== canonicalize(expected) || frame["creator"] !== null && !isScopeRef(frame["creator"]) || canonicalize(frame["creator"]) !== canonicalize(pin.seed.creator) || !isHead(frame["head"]) || !natural(frame["head"].seq) || typeof frame["time"] !== "string" || timeMs(frame["time"]) === null || !["active", "provisional", "refused"].includes(frame["status"] as string)) return stopArchivePrefix("unavailable");
  const genesis = frame["genesis"], held = frame["held"];
  if (!isRecord(genesis) || Object.keys(genesis).sort().join(",") !== "hash,n,source" || genesis["hash"] !== pin.genesis || genesis["source"] !== null && !isFactRef(genesis["source"]) || (genesis["source"] === null ? genesis["n"] !== null : !natural(genesis["n"])) || !Array.isArray(held) || held.length > bounds.sendsPerEntry || held.some((n, i) => !natural(n) || n >= bounds.sendsPerEntry || i > 0 && n <= held[i - 1])) return stopArchivePrefix("unavailable");
  budget.check();
  return frame as unknown as ScopeState;
}

/** `expected` and certificates come from native caller-owned context and
 * trusted reviewer configuration, never a request's claimed safe flags. */
export function archivePrefixMetadata(sql: Pick<Sql, "exec">, expected: ScopeRef, cutoff: Head | "next", bounds: Pick<Bounds, "entryBytes" | "sendsPerEntry" | "definitionBytes">, budget: ArchiveBudget, certified: Pick<ReadonlySet<Digest>, "has">, after?: Head | null): ArchivePrefix {
  const pin = prefixPin(sql, expected, budget, after);
  let nativeData: Digest | undefined;
  if (Object.hasOwn(ARCHIVE_NATIVE_DATA, pin.seed.definition)) {
    budget.spend(archiveNativeDataReservation(bounds.definitionBytes));
    const native = platform(pin.seed.definition);
    if (!native || utf8(canonicalize(native.data)).length > bounds.definitionBytes) return stopArchivePrefix("unsupported-archive-cohort");
    nativeData = digestBytes(domainBytes(DOMAINS.definition, native.data));
  }
  return prefixAfterPin(sql, expected, cutoff, bounds, budget, certified, pin, nativeData, after);
}

/** Completed native frame only: no callback or prepared admission leaves
 * this operation. Like ordinary inventory, this requires trusted reviewed
 * configuration, truthful Budget and actual synchronous Native SQL ports.
 * Hostile virtual ports are outside that original authority/ledger contract. */
export interface ArchiveRootMetadata {
  readonly prefix: ArchivePrefix;
  readonly definition: ValidDefinition;
  readonly platformClosure: ArchiveDeclarationClosure | null;
  readonly declarations: ArchiveDeclarations;
  readonly reader: ArchiveRetainedReader;
  readonly visited: Set<Digest>;
}
export function archiveRootMetadata(sql: Pick<Sql, "exec">, expected: ScopeRef, cutoff: Head | "next", bounds: Bounds,
  budget: ArchiveBudget, reviewed: ArchivePolicyRegistry, after?: Head | null,
  declarationSizes?: ReadonlyMap<Digest, number | null>, retainedSizes?: ReadonlyMap<string, number | null>, windowHead?: Head): ArchiveRootMetadata {
  const pin = prefixPin(sql, expected, budget, after), named = pin.seed.definition;
  const native = Object.hasOwn(ARCHIVE_NATIVE_DATA, named);
  // Every unique semantic/support check completes before constant admission.
  const checked = native ? validateArchiveNativeRoot(named as PlatformDefinition, bounds, reviewed, budget) : undefined;
  const prefix = prefixAfterPin(sql, expected, cutoff, bounds, budget, { has: digest => reviewed.has(digest) }, pin, checked?.digest, after);
  // Preserve the scalar window's original head fence before child reads.
  if (windowHead && windowHead.seq > prefix.frame.head.seq) return stopArchivePrefix("incomplete");
  if (windowHead && windowHead.seq === prefix.frame.head.seq && windowHead.hash !== prefix.frame.head.hash) return stopArchivePrefix("mismatch");
  const visited = new Set<Digest>(), reader = new ArchiveRetainedReader(sql, budget, [], retainedSizes);
  const declarations = new ArchiveDeclarations(reader, bounds, reviewed, visited, declarationSizes);
  let definition: ValidDefinition, platformClosure: ArchiveDeclarationClosure | null;
  if (checked) {
    definition = checked; visited.add(checked.digest);
    platformClosure = declarations.walk(checked.digest, checked);
    if (!platformClosure.complete) return stopArchivePrefix("incomplete");
  } else ({ definition, platformClosure } = declarations.root(named));
  // No caller regains control until the ordinary local closure is complete.
  return { prefix, definition, platformClosure, declarations, reader, visited };
}

function prefixPin(sql: Pick<Sql, "exec">, expected: ScopeRef, budget: ArchiveBudget, after?: Head | null): ArchivePin {
  budget.check();
  if (after !== undefined && after !== null && (!isHead(after) || after.seq >= JOURNAL_V2_LAST_POSITION)) return stopArchivePrefix("unavailable");
  const predecessor = after ? { ...after } : null;
  // Reserve validation as well as raw metadata replies, including cache hits.
  budget.spend({ inputWork: archivePinValidationWork() });
  const pinSql = budget.native(sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 }));
  const pin = predecessor ? readArchivePinAfterReceipt(pinSql, expected) : readArchivePin(pinSql, expected);
  if (!pin) { budget.check(); return stopArchivePrefix("unavailable"); }
  return pin;
}

function prefixAfterPin(sql: Pick<Sql, "exec">, expected: ScopeRef, cutoff: Head | "next",
  bounds: Pick<Bounds, "entryBytes" | "sendsPerEntry" | "definitionBytes">, budget: ArchiveBudget,
  certified: Pick<ReadonlySet<Digest>, "has">, pin: ArchivePin, nativeData: Digest | undefined, after?: Head | null): ArchivePrefix {
  const predecessor = after ? { ...after } : null, first = predecessor ? predecessor.seq + 1 : 0;
  const admittedPin = admitArchivePin(pin.seed.definition, certified, nativeData);
  if (!admittedPin.ok) return stopArchivePrefix(admittedPin.reason);
  // A scalar window asks for its first position only after pin admission.
  // This adds one ordinary charged lookup, never an earlier history probe.
  let through: Head;
  if (cutoff === "next") {
    const rows = budget.native(sql, () => ({ metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: 0 })).exec(
      "SELECT hash FROM entry WHERE seq = ? AND typeof(hash) = 'text' AND octet_length(hash) = 71 LIMIT 1", first).toArray();
    if (rows.length !== 1 || !isDigest(rows[0]?.["hash"])) return stopArchivePrefix("incomplete");
    through = { seq: first, hash: rows[0]["hash"] };
  } else through = cutoff;
  if (!natural(through.seq) || through.seq < first || !isDigest(through.hash) || !natural(bounds.entryBytes) || bounds.entryBytes === 0) return stopArchivePrefix("unavailable");
  // At most one overflow sentinel; never scan an arbitrary future range.
  if (through.seq - first > ARCHIVE_BOUNDS.entries || after !== undefined && through.seq > JOURNAL_V2_LAST_POSITION) return stopArchivePrefix("limit");
  const frame = readArchiveScopeFrame(sql, expected, pin, bounds, budget);
  const head = frame["head"];
  if (through.seq > head.seq) return stopArchivePrefix("incomplete");
  if (through.seq === head.seq && through.hash !== head.hash) return stopArchivePrefix("mismatch");
  const limit = Math.min(through.seq - first + 1, ARCHIVE_BOUNDS.entries + 1);
  const positionsSql = budget.native(sql, () => ({ metadata: limit * ARCHIVE_POSITION_METADATA_BYTES, inputWork: 0 }));
  // Column byte lengths use SQLite metadata. No entry JSON operation or
  // value projection occurs until the whole input work has been admitted.
  const columns = "SELECT seq, CASE WHEN typeof(hash) = 'text' AND octet_length(hash) = 71 THEN hash ELSE NULL END AS hash, CASE WHEN typeof(size) = 'integer' THEN size ELSE NULL END AS size, octet_length(bytes) AS actual, typeof(bytes) AS type FROM entry ";
  const rows = (after === undefined
    ? positionsSql.exec(columns + "WHERE seq >= 0 AND seq <= ? ORDER BY seq LIMIT ?", through.seq, limit)
    : positionsSql.exec(columns + "WHERE seq >= ? AND seq <= ? ORDER BY seq LIMIT ?", first, through.seq, limit)).toArray();
  if (rows.length > ARCHIVE_BOUNDS.entries) return stopArchivePrefix("limit");
  if (rows.length !== through.seq - first + 1) return stopArchivePrefix("incomplete");
  const positions: ArchivePosition[] = []; let bytes = 0;
  for (const [offset, row] of rows.entries()) {
    const seq = first + offset;
    if (row["seq"] !== seq || !isDigest(row["hash"]) || row["type"] !== "text" || !natural(row["size"]) || row["size"] === 0 || row["size"] > bounds.entryBytes || row["size"] !== row["actual"]) return stopArchivePrefix("mismatch");
    bytes += row["size"];
    if (!Number.isSafeInteger(bytes)) return stopArchivePrefix("limit");
    positions.push({ seq, hash: row["hash"], bytes: row["size"] });
  }
  if (first === 0 && positions[0]?.hash !== pin.genesis || positions.at(-1)?.hash !== through.hash) return stopArchivePrefix("mismatch");
  budget.spend({ entries: positions.length, inputWork: bytes * ARCHIVE_PRIVACY_JSON_PASSES });
  budget.check();
  return { pin, frame: frame as unknown as ScopeState, through, positions, bytes, ...(after === undefined ? {} : { after: predecessor }) };
}

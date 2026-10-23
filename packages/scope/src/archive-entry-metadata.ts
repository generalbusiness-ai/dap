/** Shared bounded classification of local rows and retained foreign copies.
 * Returns headers/classes only. Payload reads and export admission belong
 * to the owning whole-prefix inventory, inside its synchronous frame. */
import { natural } from "@generalbusiness/dap-bytes";
import { DEVICE_COMMAND, RETAINED_INPUT_BYTES } from "@generalbusiness/dap-contract";
import type { Digest, Input, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isPlatformDefinition, isScopeRef } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "./archive-budget.ts";
import { ARCHIVE_PRIVACY_JSON_PASSES, stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";
import { type Capabilities, type OperationRules, type ValidDefinition } from "@generalbusiness/dap-derive";
import { platform } from "@generalbusiness/dap-platform";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";
import { archiveDeclarationValuePlaces, archiveValuePlace } from "./archive-value-policy.ts";
import { ARCHIVE_ENTRY_DETAIL_METADATA, ARCHIVE_ENTRY_HEADER_METADATA, archiveEntryEffectsMetadata } from "./archive-entry-privacy-cost.ts";
import { ARCHIVE_SUPPORT_CAPABILITY_WORK, ARCHIVE_SUPPORT_OWNER_WORK, type ArchiveSupportFootprint } from "./archive-support-cost.ts";
export { sqlJsonText as archiveMetadataText } from "./sqlite.ts";

/** Trusted native code/registry metadata. A request cannot supply this map;
 * unknown owners/capability steps fail closed. No dynamic package runs. */
export interface ArchiveSupport {
  readonly named: Digest | PlatformDefinition;
  readonly definition: ValidDefinition;
  readonly capabilities?: Capabilities;
  readonly owners: ReadonlyMap<string, ReadonlyMap<string, OperationRules>>;
  readonly records: ReadonlyMap<string, ReadonlySet<string>>;
  readonly preparations: ReadonlyMap<string, ReadonlySet<string>>;
}

export type ArchiveMetadataSource = { readonly kind: "local"; readonly position: ArchivePosition }
  | { readonly kind: "copy"; readonly content: Digest; readonly bytes: number };
export interface ArchiveEntryHeader {
  readonly seq: number; readonly at: ScopeRef; readonly input: Input["type"];
  readonly prev: Digest | null; readonly uses: number; readonly effects: number;
}
const variants: readonly unknown[] = ["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint", "floor"];
const OWNER_LIMIT = 65;
/** Finite native metadata. Device commands own no outside operation kind. */
export const DEVICE_COMMAND_ARCHIVE_RECORDS: ReadonlySet<string> = new Set(["command"]);
export const DEVICE_COMMAND_ARCHIVE_PREPARATIONS: ReadonlySet<string> = new Set(["answer"]);
const HEADER = `json_extract(bytes, '$.seq') AS seq, ${text("$.at.scope", 71)} AS scope, ${text("$.at.inc", 64)} AS inc, ${text("$.at.kind", 16)} AS kind, ${text("$.input.type", 16)} AS input, ${text("$.prev", 71)} AS prev, json_type(bytes, '$.prev') AS prevType, json_type(bytes, '$.uses') AS usesType, json_array_length(bytes, '$.uses') AS uses, json_type(bytes, '$.effects') AS effectsType, json_array_length(bytes, '$.effects') AS effects`;
function location(source: ArchiveMetadataSource) {
  return source.kind === "local" ? {
    table: "entry", where: "entry.seq = ? AND entry.hash = ? AND entry.size = ? AND octet_length(entry.bytes) = ?",
    args: [source.position.seq, source.position.hash, source.position.bytes, source.position.bytes],
  } : {
    table: "retained_input", where: "retained_input.kind = 'entry' AND retained_input.digest = ? AND typeof(retained_input.bytes) = 'text' AND octet_length(retained_input.bytes) = ?",
    args: [source.content, source.bytes],
  };
}
/** Local JSON work was reserved by archivePrefixMetadata. A copy reserves
 * the same full-entry equivalents before its first JSON inspection. */
export function archiveEntryHeader(sql: Pick<Sql, "exec">, source: ArchiveMetadataSource, budget: ArchiveBudget): ArchiveEntryHeader {
  budget.check();
  if (source.kind === "copy") {
    if (!isDigest(source.content) || !natural(source.bytes) || source.bytes === 0 || source.bytes > RETAINED_INPUT_BYTES) return stop("unavailable");
    budget.spend({ inputWork: source.bytes * ARCHIVE_PRIVACY_JSON_PASSES });
  }
  const held = location(source);
  const rows = budget.native(sql, () => ({ metadata: ARCHIVE_ENTRY_HEADER_METADATA, inputWork: 0 })).exec(`SELECT ${HEADER} FROM ${held.table} WHERE ${held.where} LIMIT 1`, ...held.args).toArray(), row = rows[0];
  const at = { scope: row?.["scope"], inc: row?.["inc"], kind: row?.["kind"] };
  if (rows.length !== 1 || !row || !natural(row["seq"]) || !isScopeRef(at) || !variants.includes(row["input"])
    || row["usesType"] !== "array" || !natural(row["uses"]) || row["effectsType"] !== "array" || !natural(row["effects"])) return stop("unavailable");
  if (row["seq"] === 0 ? row["input"] !== "genesis" || row["prevType"] !== "null" : row["input"] === "genesis" || !isDigest(row["prev"])) return stop("mismatch");
  return { seq: row["seq"], at, input: row["input"] as Input["type"], prev: row["seq"] === 0 ? null : row["prev"] as Digest, uses: row["uses"], effects: row["effects"] };
}

/** The caller has separately matched the exact pin/declaration and reviewed
 * inline class coverage. This applies the same finite owner/step/record
 * rules to a local entry and a foreign copy. No recursive foreign walk. */
export function archiveEntryPrivacy(sql: Pick<Sql, "exec">, source: ArchiveMetadataSource, header: ArchiveEntryHeader, support: ArchiveSupport, budget: ArchiveBudget): void {
  const held = location(source), read = (metadata: number) => budget.native(sql, () => ({ metadata, inputWork: 0 }));
  const owner = (name: unknown, kind: unknown) => {
    if (typeof name !== "string" || typeof kind !== "string") return stop("unavailable");
    const rules = support.owners.get(name)?.get(kind);
    if (!rules || rules.values !== undefined && rules.valueDomains === undefined) return stop("unsupported-archive-cohort");
    if (rules.valueDomains?.some(domain => !archiveValuePlace(support, domain.domain, domain.max, `owners.${name}.${kind}`))) return stop("unsupported-custom-domain");
  };
  if (header.effects > OWNER_LIMIT - 1) return stop("limit");
  const opened = header.effects === 0 ? [] : read(archiveEntryEffectsMetadata(header.effects)).exec(`SELECT ${text("$.effect", 16, "value")} AS effect, ${text("$.owner", 128, "value")} AS owner, ${text("$.capability", 128, "value")} AS capability, ${text("$.kind", 128, "value")} AS kind FROM ${held.table}, json_each(${held.table}.bytes, '$.effects') WHERE ${held.where} LIMIT ?`, ...held.args, OWNER_LIMIT).toArray();
  if (opened.length >= OWNER_LIMIT) return stop("limit");
  const effects = new Set(["open", "state", "party", "ref", "value", "list", "hold", "redact", "relation", "record", "activate", "operation", "attempt", "index", "attention"]);
  if (opened.length !== header.effects) return stop("unavailable");
  for (const effect of opened) {
    if (typeof effect["effect"] !== "string" || !effects.has(effect["effect"])) return stop("unavailable");
    if (effect["effect"] === "operation") owner(effect["owner"], effect["kind"]);
    if (effect["effect"] === "record" && (typeof effect["capability"] !== "string" || typeof effect["kind"] !== "string" || !support.records.get(effect["capability"])?.has(effect["kind"]))) return stop("unsupported-archive-cohort");
  }
  if (header.input === "outcome") {
    const outcomes = read(ARCHIVE_ENTRY_DETAIL_METADATA).exec(`SELECT ${text("$.input.owner", 128)} AS owner, ${text("$.input.kind", 128)} AS kind FROM ${held.table} WHERE ${held.where} LIMIT 1`, ...held.args).toArray();
    if (outcomes.length !== 1) return stop("unavailable");
    owner(outcomes[0]!["owner"], outcomes[0]!["kind"]);
  } else if (header.input === "preparation") {
    const preparations = read(ARCHIVE_ENTRY_DETAIL_METADATA).exec(`SELECT ${text("$.input.capability", 128)} AS capability, ${text("$.input.step", 128)} AS step FROM ${held.table} WHERE ${held.where} LIMIT 1`, ...held.args).toArray(), preparation = preparations[0];
    if (preparations.length !== 1 || typeof preparation?.["capability"] !== "string" || typeof preparation["step"] !== "string" || !support.preparations.get(preparation["capability"])?.has(preparation["step"])) return stop("unsupported-archive-cohort");
  }
  budget.check();
}

/** Complete trusted support metadata, including owners/domains on selected
 * declarations with no entries in this prefix. The registry is finite;
 * its presence does not create a certificate or load package code. */
export function archiveSupportMetadata(support: ArchiveSupport, budget: ArchiveBudget): void {
  checkArchiveSupportMetadata(support, budget, false);
}

/** Scout the actual trusted metadata, paying all original validation work
 * and new count bookkeeping on this same budget. Fresh inventory still
 * calls archiveSupportMetadata in full; these counts grant no credit. */
export function recordArchiveSupportMetadata(support: ArchiveSupport, budget: ArchiveBudget): Readonly<ArchiveSupportFootprint> {
  budget.spend({ metadata: 128, inputWork: 256 });
  return collectArchiveSupportMetadata(support, budget);
}

/** Complete the same paid validation while collecting only its scalar counts.
 * The caller pays recording bookkeeping separately at its original point.
 * These counts do not admit a later call, entry, policy or inventory frame. */
export function collectArchiveSupportMetadata(support: ArchiveSupport, budget: ArchiveBudget): Readonly<ArchiveSupportFootprint> {
  return checkArchiveSupportMetadata(support, budget, true)!;
}

function checkArchiveSupportMetadata(support: ArchiveSupport, budget: ArchiveBudget, collect: boolean): Readonly<ArchiveSupportFootprint> | undefined {
  budget.check();
  const declarationNodes = archiveDeclarationValuePlaces(support, budget);
  let ownerKinds = 0, ownerDomains = 0, capabilityKinds = 0;
  const known = (name: string) => name === "hold@1" || name === "git-read@1" || isPlatformDefinition(name) && platform(name) !== null;
  if (support.owners.size > 64 || support.preparations.size > 64 || support.records.size > 64) return stop("limit");
  for (const [name, kinds] of support.owners) {
    if (name.length > 128 || !known(name)) return stop("unsupported-archive-cohort");
    if (kinds.size > 64) return stop("limit");
    for (const [kind, rules] of kinds) {
      budget.spend({ inputWork: ARCHIVE_SUPPORT_OWNER_WORK }); ownerKinds++;
      if (!kind || kind.length > 128 || rules.values !== undefined && rules.valueDomains === undefined) return stop("unsupported-archive-cohort");
      if (rules.valueDomains !== undefined && (!Array.isArray(rules.valueDomains) || rules.valueDomains.length > 64)) return stop("limit");
      for (const domain of rules.valueDomains ?? []) {
        budget.spend({ inputWork: ARCHIVE_SUPPORT_OWNER_WORK }); ownerDomains++;
        if (!archiveValuePlace(support, domain.domain, domain.max, `owners.${name}.${kind}`)) return stop("unsupported-custom-domain");
        if (!Number.isSafeInteger(domain.max) || domain.max < 1 || domain.max > 1024 * 1024) return stop("unavailable");
      }
    }
  }
  for (const table of [support.preparations, support.records]) for (const [name, kinds] of table) {
    if (!["hold@1", "git-read@1", DEVICE_COMMAND].includes(name)) return stop("unsupported-archive-cohort");
    if (kinds.size > 64) return stop("limit");
    for (const kind of kinds) {
      budget.spend({ inputWork: ARCHIVE_SUPPORT_CAPABILITY_WORK }); capabilityKinds++;
      if (!kind || kind.length > 128) return stop("unavailable");
      if (name === DEVICE_COMMAND && !(table === support.records ? DEVICE_COMMAND_ARCHIVE_RECORDS : DEVICE_COMMAND_ARCHIVE_PREPARATIONS).has(kind)) return stop("unsupported-archive-cohort");
    }
  }
  budget.check();
  return collect ? Object.freeze({ declarationNodes, ownerKinds, ownerDomains, capabilityKinds }) : undefined;
}

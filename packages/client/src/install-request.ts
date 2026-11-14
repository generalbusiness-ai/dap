/**
 * One application install request and one installation read in a configured room (NF-4). MCP's `install_application` and
 * `application_installation` and the command line's `dap install <uri>` and `dap application` call these functions. Each takes a
 * handle on the configured room, a custody and typed arguments, and returns a typed result. A refusal is a code: each caller
 * writes its own words. This source-only entry imports the platform's catalogue, so the client root does not import it.
 */
import type { Answer, Digest, PlatformDefinition, Read, ScopeId, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, entryHash, intentDigest, isDigest, isPlatformDefinition, isReceipt, isRecord, isScopeRef, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { COMMONS_COHORT, VERSIONS, answersVersionQuestion, mcpApplicationRoomCohort, platform } from "@generalbusiness/dap-platform";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-platform/application-v2";
import { readApplicationInstallOptions, readDeviceApplicationInstallOptions, signedApplicationInstall, signedApplicationInstall2, signedDeviceApplicationInstall, signedPublishedApplicationInstall } from "./application-install.ts";
import { readApplicationPackage } from "./application-package.ts";
import { applicationScreenPath } from "./application-route.ts";
import { applicationTrustForSource, readApplicationTrust } from "./application-trust.ts";
import { ApplicationPackageError } from "./application-types.ts";
import { readApplicationReleaseUri, type ApplicationReleaseUri } from "./application-uri.ts";
import { commonsInstallCheck } from "./commons.ts";
import { CustodyError, Lost, meaningOf, validKey, type ArchivedSettlement, type Custody, type Envelope, type Identity, type Phase } from "./custody.ts";
import { descriptionsOf, type DefinitionLike } from "./describe.ts";
import { ScopeHandle, TransportError, type Transport } from "./handle.ts";
import type { Signer } from "./signer.ts";

// ---------------------------------------------------------------- the declaration digest

/** The platform's mark catalogue: each version's rule refusals, and no executable rule. */
const catalogue = Object.fromEntries(Object.entries(VERSIONS).map(([pin, native]) => [pin, {
  rules: Object.fromEntries(Object.entries(native.rules).map(([code, rule]) => [code,
    "refusals" in rule && rule.refusals !== undefined ? { refusals: rule.refusals } : {},
  ])),
}]));

export const descriptions = descriptionsOf(catalogue);
const { markText, markRefusals } = descriptions;

/** The item types an act names: every string of its declaration that is an item type of the definition. */
function itemsNamed(act: unknown, items: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const named = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") { if (Object.hasOwn(items, v)) named.add(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) { walk(k); walk(x); }
  };
  walk(act);
  return Object.fromEntries([...named].sort().map((name) => [name, items[name]]));
}

/** The names of the rules an act's guards name, and the platform marks (`{ code, row }`) they carry, anywhere in them. */
function rendered(act: unknown): { rules: Set<string>; marks: Map<string, { code: string; row: string }> } {
  const rules = new Set<string>();
  const marks = new Map<string, { code: string; row: string }>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v !== "object" || v === null) return;
    const o = v as Record<string, unknown>;
    if (typeof o["rule"] === "string") rules.add(o["rule"]);
    if (typeof o["code"] === "string") marks.set(`${o["code"]} ${String(o["row"] ?? "")}`, { code: o["code"], row: String(o["row"] ?? "") });
    for (const x of Object.values(o)) walk(x);
  };
  walk(act);
  return { rules, marks };
}

/**
 * The digest of an act declaration and everything its rendering reads (plan 031, section 3, "One tool per act declaration"): the
 * act, the item types it names, the bodies of the rules its guards name, the definition's profile, and, for a platform
 * definition, the text and refusal names of each mark it carries in the pinned version. Two definitions whose rows match but
 * whose rule bodies, profile or marks differ are two declarations, so no description can speak for the other's meaning.
 */
export function declarationDigest(definition: DefinitionLike, kind: string, pinned?: string): Digest {
  const act = definition.acts[kind];
  const { rules, marks } = rendered(act);
  const bodies = Object.fromEntries([...rules].sort().map((name) => [name, definition.rules?.[name] ?? null]));
  const marked = pinned === undefined || !isPlatformDefinition(pinned) ? {} : Object.fromEntries([...marks.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, m]) => [k, [markText(pinned, m), [...markRefusals(pinned, m.code)]]]));
  const profile = (definition as { profile?: unknown }).profile ?? null;
  return digestBytes(utf8(canonicalize({ act, items: itemsNamed(act, definition.items), rules: bodies, profile, marks: marked } as never)));
}

// ---------------------------------------------------------------- the handle, the options and the results

/** The configured room as the caller's configuration records it. */
export interface InstallRoomConfig { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId }

/** The configured room and the key that signs. `repository` is null when no room is configured for this service. */
export interface InstallHandle {
  service: string;
  signer: Signer;
  now: () => number;
  repository: InstallRoomConfig | null;
  /**
   * The operator's APPLICATION_TRUST setting. The install reads it before custody and again inside custody's build, so a getter
   * gives each check the current setting.
   */
  readonly applicationTrust?: string | undefined;
}

/** One read under a membership: its session first, then a signed read. `Reads` is one. */
export interface InstallReader {
  readonly transport: Transport;
  read<R extends { ok: true } | { ok: false; reason: string }>(membership: ScopeRef | null, run: (transport: Transport, reader: string | null) => Promise<R>): Promise<R>;
}

/** The exact Git blob of a package, or why it could not be read. */
export type PackageBytes = { ok: true; bytes: Uint8Array } | { ok: false; reason: "unsupported-object-format" | "unavailable" };

/** The target that the admit hook judges before anything is parsed or signed. */
export interface InstallTarget { rules: ScopeRef; membership: ScopeRef; pinned: PlatformDefinition; definition: DefinitionLike }

export interface InstallOptions {
  /** Every read of the room, the installation and the accepted entry. */
  reader: InstallReader;
  /** The caller's own policy for this target. False refuses with `unknown-tool`. With no hook, the scope judges the install. */
  admit?: (target: InstallTarget) => Promise<boolean>;
  /** Custody's send, or a caller's wrapper with its signature. A wrapper may stop the call with `SendStop`. */
  send: Custody["send"];
  /** The package bytes at an address, at most `limit` bytes. The host fetches them itself as well. */
  packageBytes: (address: ApplicationReleaseUri, limit: number) => Promise<PackageBytes>;
}

/** A send port's own stop. The install function rethrows its cause unchanged. */
export class SendStop extends Error {
  constructor(override readonly cause: unknown) { super("send stopped"); }
}

type ReadReason = Extract<Read<Summary>, { ok: false }>["reason"];

/** Why the configured room cannot take or show an install. Each caller words these. */
export type RoomRefusal =
  | { refused: "unconfigured" }
  | { refused: "read"; scope: ScopeId; reason: ReadReason }
  | { refused: "room-siblings" }
  | { refused: "rules-sibling" }
  | { refused: "commons-membership" };

export type InstallRefusal = RoomRefusal
  | { refused: "key" }
  | { refused: "unknown-tool" }
  | { refused: "installation" }
  | { refused: "trust" }
  | { refused: "commons-missing" }
  | { refused: "unprepared"; why: "unsupported-object-format" | "package" | "unavailable" }
  | { refused: "stopped"; scope: ScopeId }
  | { refused: "lost"; scope: ScopeId }
  | { refused: "receipt" }
  | { refused: "entry-unread" }
  | { refused: "entry" }
  | { refused: "accepted-unread"; scope: ScopeId };

export type InstallRequest =
  | { outcome: "accepted"; rules: ScopeRef; answer: Extract<Answer, { answer: "accepted" }>; item: number; retained: boolean; phase: Phase }
  | { outcome: "answered"; rules: ScopeRef; answer: Exclude<Answer, { answer: "accepted" }>; retained: boolean; phase: Phase }
  | { outcome: "archived"; rules: ScopeRef; archivedSettlement: ArchivedSettlement }
  | { outcome: "refused"; refusal: InstallRefusal };

export type InstallationRefusal = RoomRefusal
  | { refused: "item" }
  | { refused: "installation-read"; reason: string }
  | { refused: "installation-unavailable" };

/** One installation as the room's rules scope holds it. `screen` is set only for an active installation with a presentation. */
export type Installation = {
  rules: ScopeRef; at: unknown; item: number; state: string; phase: unknown; reason: unknown;
  uri: unknown; release: unknown; semantic: unknown; presentation: unknown; scope: unknown; screen: string | null;
};

export type InstallationRead = { outcome: "read"; installation: Installation } | { outcome: "refused"; refusal: InstallationRefusal };

/** The cohort of an application room that MCP and the command line install in. */
export type InstallCohort = NonNullable<ReturnType<typeof mcpApplicationRoomCohort>>;
/** The actual room and its exact Rules sibling, never a caller alias. */
export interface InstallRoom { directory: ScopeRef; membership: ScopeRef; rules: ScopeRef; destination: ScopeRef; cohort: InstallCohort }

// ---------------------------------------------------------------- the room

class Refused extends Error { constructor(readonly refusal: InstallRefusal) { super("refused"); } }
class PackageUnavailable extends Error { constructor(readonly reason: "unsupported-object-format" | "unavailable") { super("package unavailable"); } }

const KIB = 1024;
const PACKAGE_BYTES = 4 * 1024 * 1024;

async function summaryOf(reader: InstallReader, scope: ScopeId, membership: ScopeRef): Promise<Summary | RoomRefusal> {
  const read = await reader.read(membership, (t, r) => t.summary(scope, r));
  return read.ok ? read.value : { refused: "read", scope, reason: read.reason };
}

/** The configured room, read and checked against its exact generic native siblings. */
export async function applicationRoom(repository: InstallRoomConfig | null, reader: InstallReader): Promise<InstallRoom | RoomRefusal> {
  if (!repository) return { refused: "unconfigured" };
  const directory = await summaryOf(reader, repository.directory.scope, repository.membership);
  if ("refused" in directory) return directory;
  const row = directory.items.find(item => item.type === "repository" && item.state === "open"), rules = row?.refs["rules"], destination = row?.refs["destination"];
  const cohort = mcpApplicationRoomCohort(directory.definition);

  if (!cohort || directory.status !== "active" || canonicalize(directory.scope) !== canonicalize(repository.directory)
    || !row || canonicalize(row.refs["membership"]) !== canonicalize(repository.membership)
    || !isScopeRef(rules) || rules.scope !== repository.rules
    || !isScopeRef(destination) || destination.scope !== repository.destination) return { refused: "room-siblings" };
  const summary = await summaryOf(reader, rules.scope, repository.membership);
  if ("refused" in summary) return summary;
  if (summary.status !== "active" || summary.definition !== cohort.rules || canonicalize(summary.scope) !== canonicalize(rules)) return { refused: "rules-sibling" };
  if (answersVersionQuestion(cohort.directory, "mcpCommonsRoomDirectory")) {
    const membership = await summaryOf(reader, repository.membership.scope, repository.membership);
    if ("refused" in membership) return membership;
    if (membership.status !== "active" || membership.definition !== COMMONS_COHORT.membership || canonicalize(membership.scope) !== canonicalize(repository.membership)) return { refused: "commons-membership" };
  }
  return { directory: directory.scope, membership: repository.membership, rules, destination, cohort };
}

// ---------------------------------------------------------------- the install request

/** The install arguments as a caller received them. The function checks each one before it signs. */
export interface InstallArguments { uri: unknown; release: unknown; roles: unknown; values: unknown; owner?: unknown; idempotencyKey: unknown }

/**
 * Sign one native install under custody and send it. Custody keeps the exact envelope before it is sent, and the same key and
 * meaning send that envelope again. Acceptance records the request; the installation read shows its later state.
 */
/** The Rules declaration states its install owner as optional: the pin admits an ordinary version 2 package. */
function ordinaryVersion2(definition: DefinitionLike): boolean {
  const act: unknown = (definition as unknown as { acts?: Record<string, unknown> }).acts?.["install-application"];
  const owner: unknown = isRecord(act) && isRecord(act["fields"]) ? act["fields"]["owner"] : undefined;
  return isRecord(owner) && owner["required"] === false;
}

export async function installApplication(handle: InstallHandle, custody: Custody, args: InstallArguments, options: InstallOptions): Promise<InstallRequest> {
  const refused = (refusal: InstallRefusal): InstallRequest => ({ outcome: "refused", refusal });
  const key = args.idempotencyKey;
  if (!validKey(key)) return refused({ refused: "key" });
  const room = await applicationRoom(handle.repository, options.reader);
  if ("refused" in room) return refused(room);
  const pin = room.cohort.rules;
  const definition = platform(pin)!.data as unknown as DefinitionLike;
  if (options.admit && !await options.admit({ rules: room.rules, membership: room.membership, pinned: pin, definition })) return refused({ refused: "unknown-tool" });
  let selected: ReturnType<typeof readApplicationInstallOptions> | ReturnType<typeof readDeviceApplicationInstallOptions>;
  try {
    const ordinary = { rules: room.rules, uri: args.uri, release: args.release, roles: args.roles, values: args.values };
    // A device Rules pin whose declaration makes the owner optional also installs an ordinary version 2 package.
    selected = answersVersionQuestion(room.cohort.rules, "mcpDeviceInstallOptionsRules") && (args.owner !== undefined || !ordinaryVersion2(definition))
      ? readDeviceApplicationInstallOptions({ ...ordinary, owner: args.owner }) : readApplicationInstallOptions(ordinary);
    if (!answersVersionQuestion(room.cohort.rules, "mcpOwnerFieldRules") && args.owner !== undefined) throw Error("this cohort has no owner selection");
  }
  catch { return refused({ refused: "installation" }); }
  const address = readApplicationReleaseUri(selected.uri);
  const trustForBuild = () => {
    const allowed = applicationTrustForSource(address, selected.release, readApplicationTrust(handle.applicationTrust));
    if (!allowed) throw new ApplicationPackageError("invalid");
    return allowed;
  };
  try { trustForBuild(); }
  catch { return refused({ refused: "trust" }); }
  const identity: Identity = { service: handle.service, membership: room.membership, signer: handle.signer.key, target: room.rules, key: key as string };
  const meaning = meaningOf(selected);
  const build = async () => {
    // Recheck after custody awaits; an earlier list or policy read is no authority.
    const allowed = trustForBuild();
    const fetched = await options.packageBytes(address, PACKAGE_BYTES);
    if (!fetched.ok) throw new PackageUnavailable(fetched.reason);
    const bytes = fetched.bytes;
    const prepare = answersVersionQuestion(pin, "mcpSemanticInstallSignatureRules") ? signedApplicationInstall2
      : ordinaryVersion2(definition) ? signedPublishedApplicationInstall : signedApplicationInstall;
    const packet = prepare !== signedApplicationInstall || "owner" in selected
      ? readPublishedApplicationPackage2(bytes, selected.release, { bytes: PACKAGE_BYTES, definitionBytes: 64 * 1024 })
      : readApplicationPackage(bytes, selected.release, { bytes: PACKAGE_BYTES, definitionBytes: 64 * 1024 });
    if (packet.package.release.manifest.publisher !== allowed.publisher) throw new ApplicationPackageError("invalid");
    const directory = await summaryOf(options.reader, room.directory.scope, room.membership);
    if ("refused" in directory) throw new Refused(directory);
    if (!commonsInstallCheck(directory, packet.package.semantic.host.requires).ok) throw new Refused({ refused: "commons-missing" });
    const prepared = "owner" in selected
      ? await signedDeviceApplicationInstall(handle.signer, bytes, readDeviceApplicationInstallOptions(selected), { idempotencyKey: key as string, now: handle.now() }, allowed.publisher)
      : await prepare(handle.signer, bytes, selected, { idempotencyKey: key as string, now: handle.now() }, allowed.publisher);
    return { binding: { definition: "platform:rules", kind: "install-application", declaration: declarationDigest(definition, "install-application", pin), pinned: pin }, envelope: { signed: prepared.signed, beside: prepared.beside } };
  };
  const scope = room.rules.scope;
  const deliver = async (envelope: Envelope): Promise<Answer> => {
    try { return await options.reader.transport.submit(scope, envelope.signed, [], envelope.beside); }
    catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
  };
  let kept;
  try {
    kept = await options.send(identity, meaning, build, deliver, { notAfter: timeOf(handle.now() + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000), bytes: 768 * KIB });
  } catch (error) {
    if (error instanceof CustodyError) throw error;
    if (error instanceof SendStop) throw error.cause;
    if (error instanceof Refused) return refused(error.refusal);
    // Custody writes `sent` before it delivers, so a record past `prepared` means that a request under this key left. Package
    // preparation runs only with no record, so a failure there leaves none.
    const record = await custody.find(identity);
    if (record && record.phase !== "prepared") return refused({ refused: "stopped", scope });
    return refused({ refused: "unprepared", why: error instanceof PackageUnavailable && error.reason === "unsupported-object-format" ? "unsupported-object-format" : error instanceof ApplicationPackageError ? "package" : "unavailable" });
  }
  if ("lost" in kept) return refused({ refused: "lost", scope });
  if ("archivedSettlement" in kept) return { outcome: "archived", rules: room.rules, archivedSettlement: kept.archivedSettlement };
  // An install never folds a record. A record that another client folded has no answer to project here.
  if ("folded" in kept) throw new CustodyError({ held: "unreadable" });
  if (kept.answer.answer !== "accepted") return { outcome: "answered", rules: room.rules, answer: kept.answer, retained: kept.retained, phase: kept.record.phase };
  const receipt = kept.answer.receipt;
  if (!isReceipt(receipt) || receipt.definition !== pin || receipt.intent !== intentDigest(kept.record.envelope.signed.intent) || canonicalize(receipt.fact.at) !== canonicalize(room.rules)) return refused({ refused: "receipt" });
  let read;
  try { read = await options.reader.read(room.membership, (t, r) => t.entry(scope, r, receipt.fact.seq, { at: receipt.fact.at, head: { seq: receipt.fact.seq, hash: receipt.fact.hash } })); }
  catch (error) { if (error instanceof TransportError) return refused({ refused: "accepted-unread", scope }); throw error; }
  if (!read.ok || !read.complete || read.next !== undefined) return refused({ refused: "entry-unread" });
  if (read.value.hash !== receipt.fact.hash || entryHash(read.value.entry) !== receipt.fact.hash
    || !("genesis" in read.value.entry) || read.value.entry.genesis !== room.rules.genesis || read.value.entry.seq !== receipt.fact.seq || read.value.entry.input.type !== "act"
    || canonicalize(read.value.entry.input.signed) !== canonicalize(kept.record.envelope.signed)) return refused({ refused: "entry" });
  return { outcome: "accepted", rules: room.rules, answer: kept.answer, item: receipt.fact.seq, retained: kept.retained, phase: kept.record.phase };
}

// ---------------------------------------------------------------- the installation read

/** Read one native installation in the configured room: its state, its workflow phase and a final refusal reason. */
export async function applicationInstallation(handle: InstallHandle, item: unknown, options: Pick<InstallOptions, "reader">): Promise<InstallationRead> {
  const refused = (refusal: InstallationRefusal): InstallationRead => ({ outcome: "refused", refusal });
  if (typeof item !== "number" || !Number.isSafeInteger(item) || item < 0) return refused({ refused: "item" });
  const room = await applicationRoom(handle.repository, options.reader);
  if ("refused" in room) return refused(room);
  const read = await options.reader.read(room.membership, (t, r) => new ScopeHandle(t, room.rules.scope, r).queryItems({ v: 1, scope: room.rules, type: "installation", states: ["active", "pending", "refused"], ids: [item], limit: 1, cursor: null }));
  if (!read.ok) return refused({ refused: "installation-read", reason: read.reason });
  const row = read.value.items[0];
  if (!read.complete || read.next !== undefined || !row || row.id !== item || row.type !== "installation") return refused({ refused: "installation-unavailable" });
  const presentation = row.values["presentation"];
  return { outcome: "read", installation: { rules: room.rules, at: read.at, item, state: row.state, phase: row.values["phase"], reason: row.values["reason"] ?? null,
    uri: row.values["uri"], release: row.values["release"], semantic: row.values["semantic"], presentation,
    scope: row.refs["scope"] ?? null,
    screen: row.state === "active" && isDigest(presentation) ? handle.service + applicationScreenPath(room.directory.scope, item, presentation) : null } };
}

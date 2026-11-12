import { EVIDENCE_LANE_PINS } from "./evidence-lane-pins.generated.ts";
import { evidenceIncidentOriginV17 } from "./evidence-incident-origin-v17.ts";
/** Native identities are established by immutable creation facts, not declared names. */
import { same } from "@generalbusiness/dap-bytes";
import type { Digest, FactRef, GenesisInput, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, intentDigest, isEntryBodyOf, isEntryOf, isMemberRef, messageDigest, parseStrict, isDigest, isPlatformDefinition, isSeed, platformName, scopeIdOf, verifySignedIntent, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { creationContextOf, isFactRef, isObject, isScopeRef, sentBy, type SourceCopy } from "@generalbusiness/dap-derive";

export const PUBLISHING_LANE_DIGESTS = [
  "sha256:bdeba17b698c5c56b8ab9255ce190d69df146e7b2784d2a636de832c86c2ba60",
  "sha256:91d40909fb307b024233967419bee436de7da931818bc96d492ef55d598cc00d",
  "sha256:dd77737ebf8d265b96ec9fd69beaa39e05b77abbd09a70fc0f22ae52040b3aae",
  "sha256:36529a73a2ff1fa271509685ae1655916ef6f83766c989438de1477caab51223",
  EVIDENCE_LANE_PINS.change,
  "sha256:e2765ff48621fff251e76fece06bfccccdc9cea5301e30e4615f540220c9634e",
] as const satisfies readonly Digest[];
export const ISSUE_LANE_DIGESTS = [
  "sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad",
  "sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e",
  EVIDENCE_LANE_PINS.issue,
  "sha256:ff901d2e6d25794b1f3719e6786e3c5e73004f1009297dce5f72684b36ac2cc7",
] as const satisfies readonly Digest[];


/**
 * Rule a of ruling 080e7c84, item 2: a row whose own identity or kind an
 * algorithm reads carries a genuine sequence, and the three-argument match
 * ties its body to that sequence. Its kind is `sequence.kind`.
 */
type Genuine = SourceCopy & { readonly sequence: CheckedSequence };
const genuine = (copy: SourceCopy | undefined): copy is Genuine => !!copy && copy.sequence !== null && isEntryOf(copy.entry, copy.fact, copy.sequence);
/**
 * Rule b: the creator entry that an admitted first entry names as `source`
 * may have no sequence. Its body matches that fact, and the seed's creator is
 * the source's address. Its kind is the `sourceKind` that the first entry
 * records (ruling b02334db).
 */
const creatorOf = (copy: SourceCopy, born: GenesisInput): boolean =>
  born.source !== null && isEntryBodyOf(copy.entry, born.source) && same(born.seed.creator, born.source.at);

/** A reserve must address the full Directory and destination of its birth. */
export function publishingLaneAffiliation(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genuine(genesis) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input;
    return born.decision === "applied" && born.kind === "open" && genesis.sequence.kind === "lane" && isSeed(born.seed)
      && born.seed.kind === "lane" && scopeIdOf(born.seed) === from.at.scope
      && same(born.seed.creator, directory) && born.message !== null && born.message.class === "request" && born.message.type === "create" && isObject(born.message.body)
      && same(born.message.body["directory"], directory) && isObject(born.message.body["fields"])
      && same(born.message.body["fields"]["destination"], destination);
  } catch { return false; }
}

/** Null means missing proof. False means positively non-native or invalid proof. */
function nativeOrigin(named: Digest, name: "change" | "issue", facts: readonly SourceCopy[], at?: ScopeRef): boolean | null {
  const genesis = facts.find(copy => copy.fact.seq === 0 && (!at || same(copy.fact.at, at)));
  if (!genesis) return null;
  if (!genuine(genesis) || genesis.entry.input.type !== "genesis") return false;
  const born = genesis.entry.input, seed = born.seed;
  if (born.source === null || seed.creator === null) return false;
  if (!isFactRef(born.source)) return false;
  const creator = facts.find(copy => same(copy.fact, born.source));
  if (!creator) return null;
  if (name === "issue" && named === EVIDENCE_LANE_PINS.issue && creator.entry.input.type === "delivery") return evidenceIncidentOriginV17(named, facts, genesis.fact.at);
  if (!creatorOf(creator, born) || creator.entry.input.type !== "act") return false;
  const childIssue = name === "issue" && creator.under === "issue";
  if (!childIssue && creator.under !== "platform:directory") return false;
  const made = creator.entry.input;
  const route = childIssue ? "add-concern" : name === "change" ? "open-pr" : "open-issue";
  if (born.decision !== "applied" || born.kind !== (name === "change" ? "open" : "file") || !isSeed(seed) || seed.kind !== "lane" || seed.ordinal !== 0
    || seed.definition !== named || genesis.sequence.kind !== "lane" || scopeIdOf(seed) !== genesis.fact.at.scope
    || !isScopeRef(seed.creator) || born.sourceKind !== (childIssue ? "lane" : "directory")
    || !same(seed.creator, born.source.at) || made.signed.intent.kind !== route
    || !same(made.signed.intent.to, seed.creator) || !verifySignedIntent(made.signed)
    || (!childIssue && made.signed.intent.fields["definition"] !== named) || intentDigest(made.signed.intent) !== seed.cause
    || born.n === null || born.message === null || born.message.class !== "request" || born.message.type !== "create") return false;
  const body = born.message.body;
  if (!isObject(body) || !isObject(body["fields"])) return false;
  const fields = body["fields"];
  if (childIssue) {
    // The creator's CURRENT authenticated issue identity is supplied by the
    // runtime/replay. Its own immutable genesis additionally proves self pin
    // and the inherited Directory; a retained raw name is never sufficient.
    const parent = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, seed.creator));
    if (!parent) return null;
    if (!genuine(parent) || parent.entry.input.type !== "genesis") return false;
    const birth = parent.entry.input;
    // QUESTION (ruling 080e7c84, last paragraph): the old test `body["directory"].kind !== "directory"` read a kind that the
    // message body states, which no row and no caller place gives. The reference now ties only to the parent's own birth body.
    if (!isSeed(birth.seed) || birth.seed.definition !== named || birth.decision !== "applied" || birth.kind !== "file"
      || parent.sequence.kind !== "lane" || scopeIdOf(birth.seed) !== parent.fact.at.scope
      || !birth.message || !isObject(birth.message.body) || !isScopeRef(body["directory"])
      || !same(birth.message.body["directory"], body["directory"])) return false;
    // creationFields resolves the exact self marker to the creating entry.
    // Its immutable message retains the marker rather than its own hash.
    const origin = fields["origin"];
    if (!(isObject(origin) && Object.keys(origin).length === 1 && origin["self"] === true)
      && !same(origin, born.source)) return false;
  } else if (!same(body["directory"], seed.creator)) return false;
  // QUESTION (ruling 080e7c84, last paragraph): the old test also read `fields["destination"].kind`, a kind the message body states.
  if (name === "change" && !isScopeRef(fields["destination"])) return false;
  return sentBy(creator.entry, { from: born.source, n: born.n, to: seed, message: born.message });
}

/** Reserved roles require authenticated native creation, including activated extensions. */
export function sourceName(named: Digest | PlatformDefinition, declaredName: string, origin?: readonly SourceCopy[]): string | null {
  if (isPlatformDefinition(named)) return platformName(named);
  if (declaredName.startsWith("platform:")) return `declared:${declaredName}`;
  if (declaredName !== "change" && declaredName !== "issue") return declaredName;
  try {
    const native = nativeOrigin(named, declaredName, origin ?? []);
    return native === null ? null : native ? declaredName : `declared:${declaredName}`;
  } catch { return `declared:${declaredName}`; }
}

/** The additional destination admission boundary requires this room and destination. */
export function publishingLaneOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input;
    if (!isDigest(born.seed.definition)
      || nativeOrigin(born.seed.definition, "change", facts, from.at) !== true
      || !same(born.seed.creator, directory)
      || !born.message || !isObject(born.message.body) || !isObject(born.message.body["fields"])) return false;
    return same(born.message.body["fields"]["destination"], destination);
  } catch { return false; }
}

/**
 * Own-room applications prove the actual native factory, independently of the
 * application's declared name. The Directory genesis pins the factory that
 * reserves destination; a historical Directory alias alone proves no version.
 * Null means that immutable proof is not yet available, not a refusal.
 */
export function applicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis) return null;
    if (!genuine(genesis) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input, seed = born.seed;
    if (!isSeed(seed) || !isDigest(seed.definition) || !isFactRef(born.source)) return false;
    if (genesis.sequence.kind !== "lane" || born.decision !== "applied"
      || seed.kind !== "lane" || seed.ordinal !== 0 || scopeIdOf(seed) !== from.at.scope
      || !same(seed.creator, directory) || !same(born.source.at, directory) || born.sourceKind !== "directory") return false;
    const creator = facts.find(copy => same(copy.fact, born.source));
    const directoryGenesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, directory));
    if (!creator || !directoryGenesis) return null;
    if (creator.under !== "platform:directory" || directoryGenesis.under !== "platform:directory"
      || !creatorOf(creator, born) || creator.entry.input.type !== "act"
      || !genuine(directoryGenesis) || directoryGenesis.entry.input.type !== "genesis") return false;
    const office = directoryGenesis.entry.input;
    if (!isSeed(office.seed) || office.seed.definition !== "platform:directory@8" || directoryGenesis.sequence.kind !== "directory"
      || office.decision !== "applied" || scopeIdOf(office.seed) !== directory.scope) return false;
    const made = creator.entry.input;
    if (made.signed.intent.kind !== "establish-application" || !same(made.signed.intent.to, directory)
      || !verifySignedIntent(made.signed) || made.signed.intent.fields["definition"] !== seed.definition
      || intentDigest(made.signed.intent) !== seed.cause || born.n === null
      || !born.message || born.message.class !== "request" || born.message.type !== "create") return false;
    const body = born.message.body;
    if (!isObject(body) || !same(body["directory"], directory) || !isObject(body["fields"])
      // QUESTION (ruling 080e7c84, last paragraph): the old test also read `body["membership"].kind`, a kind the body states.
      || !isScopeRef(body["membership"])
      || !same(body["creationContext"], { v: 1 })) return false;
    // An application need not declare destination. If it does, this exact
    // factory injects the room reference, and caller values cannot choose it.
    const fields = body["fields"];
    if ("destination" in fields && !same(fields["destination"], destination)) return false;
    return sentBy(creator.entry, { from: born.source, n: born.n, to: seed, message: born.message });
  } catch { return false; }
}

/** M1's new Directory handler factory. Destination7 alone adopts this policy;
 * destination4 keeps its original signed-act factory boundary. */
function installedApplicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[],
  pins: Readonly<{ directory: string; rules: string; destination: string; membership?: string; deviceCommand?: true }>): boolean | null {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis) return null;
    if (!genuine(genesis) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input, seed = born.seed;
    if (!isSeed(seed) || !isDigest(seed.definition) || !isFactRef(born.source) || born.n === null || !born.message
      || born.message.class !== "request" || born.message.type !== "create" || born.decision !== "applied"
      || genesis.sequence.kind !== "lane" || seed.kind !== "lane" || seed.ordinal !== 0 || scopeIdOf(seed) !== from.at.scope
      || !same(seed.creator, directory) || !same(born.source.at, directory) || born.sourceKind !== "directory") return false;
    const creator = facts.find(copy => same(copy.fact, born.source));
    const first = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, directory));
    if (!creator || !first) return null;
    if (creator.under !== "platform:directory" || first.under !== "platform:directory" || !creatorOf(creator, born) || !genuine(first)
      || creator.entry.input.type !== "delivery" || first.entry.input.type !== "genesis") return false;
    const office = first.entry.input, made = creator.entry.input;
    // `made.sourceKind`: the kind that the Directory's own delivery entry records for its source (ruling b02334db).
    if (!isSeed(office.seed) || office.seed.definition !== pins.directory || first.sequence.kind !== "directory" || office.decision !== "applied"
      || scopeIdOf(office.seed) !== directory.scope || made.message.class !== "request" || made.message.type !== "tell"
      || !("decision" in made) || made.decision !== "applied" || made.sourceKind !== "rules" || !isObject(made.message.body) || made.message.body["message"] !== "application-create"
      || !isObject(made.message.body["fields"])) return false;
    const sibling = (kind: "rules" | "membership" | "destination", pin: string, at: ScopeRef) => first.entry.sends.some(send => isSeed(send.to)
      && send.to.kind === kind && send.to.definition === pin && same(send.to.creator, directory) && scopeIdOf(send.to) === at.scope);
    if (!sibling("rules", pins.rules, made.from.at) || !sibling("destination", pins.destination, destination)) return false;
    const requested = made.message.body["fields"];
    if (requested["definition"] !== seed.definition || !isMemberRef(requested["installer"]) || typeof requested["genesis"] !== "string"
      || typeof requested["needsDestination"] !== "boolean" || deliveryCauseDigest({ v: 1, from: made.from, n: made.n, message: messageDigest(made.message) }) !== seed.cause) return false;
    if (!sibling("membership", pins.membership ?? "platform:membership@7", requested["installer"].membership)) return false;
    const body = born.message.body;
    if (!isObject(body) || !same(body["directory"], directory) || !same(body["membership"], requested["installer"].membership)
      || !isObject(body["fields"])) return false;
    if (pins.deviceCommand) {
      const context = creationContextOf(body, seed.definition);
      if (context.kind !== "marked" || context.delegate !== true || !context.deviceCommand || typeof requested["deviceGrant"] !== "string"
        || canonicalize(context.deviceCommand) !== requested["deviceGrant"]) return false;
    } else if (!same(body["creationContext"], { v: 1 })) return false;
    const fields = parseStrict(requested["genesis"]);
    if (!isObject(fields) || canonicalize(fields) !== requested["genesis"] || Object.hasOwn(fields, "destination")
      || Object.hasOwn(fields, "opener") && !same(fields["opener"], requested["installer"])) return false;
    const expected = { ...fields, ...(requested["needsDestination"] ? { destination } : {}) };
    return same(body["fields"], expected) && sentBy(creator.entry, { from: born.source, n: born.n, to: seed, message: born.message });
  } catch { return false; }
}

/** Preserve the exact M1 factory policy for Destination7. */
export function installedApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@11", rules: "platform:rules@5", destination: "platform:destination@7" });
}
/** Only Destination8 adopts the declared-projection cohort's factory. */
export function declaredApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@12", rules: "platform:rules@6", destination: "platform:destination@8" });
}
/** Only the explicit archive destinations adopt the new factory pins. */
export function archiveApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@13", rules: "platform:rules@7", destination: "platform:destination@9", membership: "platform:membership@8" });
}
export function archiveDeclaredApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@14", rules: "platform:rules@8", destination: "platform:destination@10", membership: "platform:membership@8" });
}

/** Only Destination11 adopts Directory15's authenticated device grant. */
export function deviceApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@15", rules: "platform:rules@9", destination: "platform:destination@11", deviceCommand: true });
}

/** Only Destination12 combines Directory16's device grant and Membership8 archive authority. */
export function archiveDeviceApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@16", rules: "platform:rules@10", destination: "platform:destination@12", membership: "platform:membership@8", deviceCommand: true });
}

/** New default family keeps an exact publication tuple. */
export function failedClaimApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@25", rules: "platform:rules@10", destination: "platform:destination@19", membership: "platform:membership@12", deviceCommand: true });
}

/** Corrected publication cohort only; Destination12 retains its original policy.
 * Destination13 also admits the separate-recovery family, never mixed pins. */
export function archiveDevicePublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  const historical = installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@17", rules: "platform:rules@10", destination: "platform:destination@13", membership: "platform:membership@8", deviceCommand: true });
  if (historical !== false) return historical;
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@23", rules: "platform:rules@10", destination: "platform:destination@13", membership: "platform:membership@10", deviceCommand: true });
}

/** Only the certified-rules destination admits this exact device factory. */
export function archiveCertifiedRulesPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@18", rules: "platform:rules@11", destination: "platform:destination@14", membership: "platform:membership@8", deviceCommand: true });
}

/** Exact hardened family; historical publication families stay fixed. */
export function hardenedCertifiedRulesPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@19", rules: "platform:rules@12", destination: "platform:destination@15", membership: "platform:membership@8", deviceCommand: true });
}

/** Destination16 admits each complete factory family, never mixed pins.
 * A refused host-none delivery still verifies its exact native sender. */
export function unpublishedApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  const historical = installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@20", rules: "platform:rules@10", destination: "platform:destination@16", membership: "platform:membership@8", deviceCommand: true });
  if (historical !== false) return historical;
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@22", rules: "platform:rules@14", destination: "platform:destination@16", membership: "platform:membership@9", deviceCommand: true });
}

/** Exact own-agent family. Historical publication origins stay distinct. */
export function ownAgentApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@26", rules: "platform:rules@10", destination: "platform:destination@20", membership: "platform:membership@13", deviceCommand: true });
}

/** Exact later-binding family; earlier creation pins remain distinct. */
export function repositoryBindingApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@24", rules: "platform:rules@10", destination: "platform:destination@18", membership: "platform:membership@11", deviceCommand: true });
}

/** Exact evidence family; admission still validates its recorded source chain. */
export function evidenceRulesPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly SourceCopy[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@21", rules: "platform:rules@13", destination: "platform:destination@17", membership: "platform:membership@8", deviceCommand: true });
}

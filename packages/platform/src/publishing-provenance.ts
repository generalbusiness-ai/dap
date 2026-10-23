/** Native identities are established by immutable creation facts, not declared names. */
import { same } from "@generalbusiness/dap-bytes";
import type { Digest, FactRef, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, deliveryCauseDigest, intentDigest, isMemberRef, messageDigest, parseStrict, isDigest, isPlatformDefinition, isSeed, platformName, scopeIdOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { creationContextOf, isEntryOf, isFactRef, isObject, isScopeRef, sentBy, type Fetched } from "@generalbusiness/dap-derive";

export const PUBLISHING_LANE_DIGESTS = [
  "sha256:3f0389ba644e6d58e96a352debcc77d01661ffcf349c6db53d0645c2513eae70",
  "sha256:d86c64ae0a570165660a6eb4d75153b8c2f59c9cdaec2ecc789e2c38524a17a2",
  "sha256:85cec888905722a8dd051b3eb3388a1b674d82500f1df80044b298d12a285930",
  "sha256:4945948396a0417aabc5bc66520036d39d179d131aaade1428da55ee96ed7b77",
] as const satisfies readonly Digest[];
export const ISSUE_LANE_DIGESTS = [
  "sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad",
  "sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e",
] as const satisfies readonly Digest[];


/** A reserve must address the full Directory and destination of its birth. */
export function publishingLaneAffiliation(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis || !isEntryOf(genesis.entry, genesis.fact) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input;
    return born.decision === "applied" && born.kind === "open" && from.at.kind === "lane" && born.inc === from.at.inc && isSeed(born.seed)
      && born.seed.kind === "lane" && scopeIdOf(born.seed) === from.at.scope
      && directory.kind === "directory" && destination.kind === "destination"
      && same(born.seed.creator, directory) && born.message !== null && born.message.class === "request" && born.message.type === "create" && isObject(born.message.body)
      && same(born.message.body["directory"], directory) && isObject(born.message.body["fields"])
      && same(born.message.body["fields"]["destination"], destination);
  } catch { return false; }
}

/** Null means missing proof. False means positively non-native or invalid proof. */
function nativeOrigin(named: Digest, name: "change" | "issue", facts: readonly Fetched[], at?: ScopeRef): boolean | null {
  const genesis = facts.find(copy => copy.fact.seq === 0 && (!at || same(copy.fact.at, at)));
  if (!genesis) return null;
  if (!isEntryOf(genesis.entry, genesis.fact) || genesis.entry.input.type !== "genesis") return false;
  const born = genesis.entry.input, seed = born.seed;
  if (born.source === null || seed.creator === null) return false;
  if (!isFactRef(born.source)) return false;
  const creator = facts.find(copy => same(copy.fact, born.source));
  if (!creator) return null;
  if (!isEntryOf(creator.entry, creator.fact) || creator.entry.input.type !== "act") return false;
  const childIssue = name === "issue" && creator.under === "issue";
  if (!childIssue && creator.under !== "platform:directory") return false;
  const made = creator.entry.input;
  const route = childIssue ? "add-concern" : name === "change" ? "open-pr" : "open-issue";
  if (born.decision !== "applied" || born.kind !== (name === "change" ? "open" : "file") || !isSeed(seed) || seed.kind !== "lane" || seed.ordinal !== 0
    || seed.definition !== named || genesis.fact.at.kind !== "lane" || born.inc !== genesis.fact.at.inc
    || !same(genesis.entry.at, genesis.fact.at) || scopeIdOf(seed) !== genesis.fact.at.scope
    || !isScopeRef(seed.creator) || seed.creator.kind !== (childIssue ? "lane" : "directory")
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
    if (!isEntryOf(parent.entry, parent.fact) || parent.entry.input.type !== "genesis") return false;
    const birth = parent.entry.input;
    if (!isSeed(birth.seed) || birth.seed.definition !== named || birth.decision !== "applied" || birth.kind !== "file"
      || birth.inc !== parent.fact.at.inc || parent.fact.at.kind !== "lane" || scopeIdOf(birth.seed) !== parent.fact.at.scope
      || !birth.message || !isObject(birth.message.body) || !isScopeRef(body["directory"]) || body["directory"].kind !== "directory"
      || !same(birth.message.body["directory"], body["directory"])) return false;
    // creationFields resolves the exact self marker to the creating entry.
    // Its immutable message retains the marker rather than its own hash.
    const origin = fields["origin"];
    if (!(isObject(origin) && Object.keys(origin).length === 1 && origin["self"] === true)
      && !same(origin, born.source)) return false;
  } else if (!same(body["directory"], seed.creator)) return false;
  if (name === "change" && (!isScopeRef(fields["destination"]) || fields["destination"].kind !== "destination")) return false;
  return sentBy(creator.entry, { from: born.source, n: born.n, to: seed, message: born.message });
}

/** Reserved roles require authenticated native creation, including activated extensions. */
export function sourceName(named: Digest | PlatformDefinition, declaredName: string, origin?: readonly Fetched[]): string | null {
  if (isPlatformDefinition(named)) return platformName(named);
  if (declaredName.startsWith("platform:")) return `declared:${declaredName}`;
  if (declaredName !== "change" && declaredName !== "issue") return declaredName;
  try {
    const native = nativeOrigin(named, declaredName, origin ?? []);
    return native === null ? null : native ? declaredName : `declared:${declaredName}`;
  } catch { return `declared:${declaredName}`; }
}

/** The additional destination admission boundary requires this room and destination. */
export function publishingLaneOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input;
    if (!isDigest(born.seed.definition)
      || nativeOrigin(born.seed.definition, "change", facts, from.at) !== true
      || !same(born.seed.creator, directory) || directory.kind !== "directory" || destination.kind !== "destination"
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
export function applicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis) return null;
    if (!isEntryOf(genesis.entry, genesis.fact) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input, seed = born.seed;
    if (!isSeed(seed) || !isDigest(seed.definition) || !isFactRef(born.source)) return false;
    if (from.at.kind !== "lane" || born.decision !== "applied" || born.inc !== from.at.inc
      || seed.kind !== "lane" || seed.ordinal !== 0 || scopeIdOf(seed) !== from.at.scope
      || directory.kind !== "directory" || destination.kind !== "destination"
      || !same(seed.creator, directory) || !same(born.source.at, directory)) return false;
    const creator = facts.find(copy => same(copy.fact, born.source));
    const directoryGenesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, directory));
    if (!creator || !directoryGenesis) return null;
    if (creator.under !== "platform:directory" || directoryGenesis.under !== "platform:directory"
      || !isEntryOf(creator.entry, creator.fact) || creator.entry.input.type !== "act"
      || !isEntryOf(directoryGenesis.entry, directoryGenesis.fact) || directoryGenesis.entry.input.type !== "genesis") return false;
    const office = directoryGenesis.entry.input;
    if (!isSeed(office.seed) || office.seed.definition !== "platform:directory@8" || office.seed.kind !== "directory"
      || office.decision !== "applied" || office.inc !== directory.inc || scopeIdOf(office.seed) !== directory.scope) return false;
    const made = creator.entry.input;
    if (made.signed.intent.kind !== "establish-application" || !same(made.signed.intent.to, directory)
      || !verifySignedIntent(made.signed) || made.signed.intent.fields["definition"] !== seed.definition
      || intentDigest(made.signed.intent) !== seed.cause || born.n === null
      || !born.message || born.message.class !== "request" || born.message.type !== "create") return false;
    const body = born.message.body;
    if (!isObject(body) || !same(body["directory"], directory) || !isObject(body["fields"])
      || !isScopeRef(body["membership"]) || body["membership"].kind !== "membership"
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
function installedApplicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[],
  pins: Readonly<{ directory: string; rules: string; destination: string; membership?: string; deviceCommand?: true }>): boolean | null {
  try {
    const genesis = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, from.at));
    if (!genesis) return null;
    if (!isEntryOf(genesis.entry, genesis.fact) || genesis.entry.input.type !== "genesis") return false;
    const born = genesis.entry.input, seed = born.seed;
    if (!isSeed(seed) || !isDigest(seed.definition) || !isFactRef(born.source) || born.n === null || !born.message
      || born.message.class !== "request" || born.message.type !== "create" || born.decision !== "applied"
      || from.at.kind !== "lane" || seed.kind !== "lane" || seed.ordinal !== 0 || born.inc !== from.at.inc || scopeIdOf(seed) !== from.at.scope
      || directory.kind !== "directory" || destination.kind !== "destination" || !same(seed.creator, directory) || !same(born.source.at, directory)) return false;
    const creator = facts.find(copy => same(copy.fact, born.source));
    const first = facts.find(copy => copy.fact.seq === 0 && same(copy.fact.at, directory));
    if (!creator || !first) return null;
    if (creator.under !== "platform:directory" || first.under !== "platform:directory" || !isEntryOf(creator.entry, creator.fact) || !isEntryOf(first.entry, first.fact)
      || creator.entry.input.type !== "delivery" || first.entry.input.type !== "genesis") return false;
    const office = first.entry.input, made = creator.entry.input;
    if (!isSeed(office.seed) || office.seed.definition !== pins.directory || office.seed.kind !== "directory" || office.decision !== "applied"
      || office.inc !== directory.inc || scopeIdOf(office.seed) !== directory.scope || made.message.class !== "request" || made.message.type !== "tell"
      || !("decision" in made) || made.decision !== "applied" || made.from.at.kind !== "rules" || !isObject(made.message.body) || made.message.body["message"] !== "application-create"
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
export function installedApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@11", rules: "platform:rules@5", destination: "platform:destination@7" });
}
/** Only Destination8 adopts the declared-projection cohort's factory. */
export function declaredApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@12", rules: "platform:rules@6", destination: "platform:destination@8" });
}
/** Only the explicit archive destinations adopt the new factory pins. */
export function archiveApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@13", rules: "platform:rules@7", destination: "platform:destination@9", membership: "platform:membership@8" });
}
export function archiveDeclaredApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@14", rules: "platform:rules@8", destination: "platform:destination@10", membership: "platform:membership@8" });
}

/** Only Destination11 adopts Directory15's authenticated device grant. */
export function deviceApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@15", rules: "platform:rules@9", destination: "platform:destination@11", deviceCommand: true });
}

/** Only Destination12 combines Directory16's device grant and Membership8 archive authority. */
export function archiveDeviceApplicationPublicationOrigin(from: FactRef, directory: ScopeRef, destination: ScopeRef, facts: readonly Fetched[]): boolean | null {
  return installedApplicationOrigin(from, directory, destination, facts, { directory: "platform:directory@16", rules: "platform:rules@10", destination: "platform:destination@12", membership: "platform:membership@8", deviceCommand: true });
}

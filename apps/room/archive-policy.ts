/** Closed runtime export policy. Catalog/native identity and authenticated
 * installed declarations select policy; signatures alone grant no export. */
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type Digest, type Input, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { isDigest, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-platform/application-v2";
import { outcomeValueDomains, ownersOf, validateDefinition, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, platform, VERSIONS, answersCatalogVocabularyQuestion } from "@generalbusiness/dap-platform";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "../../packages/scope/src/archive-inventory.ts";
import { DEVICE_COMMAND_ARCHIVE_PREPARATIONS, DEVICE_COMMAND_ARCHIVE_RECORDS } from "../../packages/scope/src/archive-privacy.ts";
import { ARCHIVE_NATIVE_DATA } from "@generalbusiness/dap-git/archive-policy";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { CAPABILITY_CODE } from "../../packages/scope/src/ports.ts";

export const GROW_ARCHIVE_DEFINITIONS = Object.freeze([
  "sha256:d2bc830e74caaabab32dbad17adae6812050fb4d36b67e97145d39c2a4cfe2ea",
  "sha256:b89e7f84740dfd8b24f78e8b52aff5aa8d4181750a7b5f385c1ef6f993846787",
] as const);
const inline: ReadonlySet<Input["type"]> = new Set(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
const review = "9674108a368c9e1380ce30a587aa57c4b503c0a4: Grow room binding; exact signed demo and native public places; no private journal export";

/** The release a Grow Worker trusts: its digest, its publisher and its entry definition (ruling e4b72290). */
export interface GrowArchiveRelease { readonly release: Digest; readonly publisher: string; readonly entry: Digest }

/** Policies for the trusted release's entry, every other definition it declares, and the native room places. */
export function growArchivePolicies(packetText: string, trusted: GrowArchiveRelease): ArchivePolicyRegistry {
  const packet = readPublishedApplicationPackage2(utf8(packetText), trusted.release);
  if (packet.package.release.manifest.publisher !== trusted.publisher || packet.package.semantic.entry !== trusted.entry) throw new Error("Grow archive release mismatch");
  const declarations = new Map(packet.package.semantic.definitions.map(part => [part.id, part.bytes]));
  const declared = [trusted.entry, ...[...declarations.keys()].filter(id => id !== trusted.entry)];
  const policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>();
  for (const pin of [...declared, C.directory, C.rules, C.destination, C.register, C.membership]) {
    const native = isDigest(pin) ? null : platform(pin), bytes = isDigest(pin) ? declarations.get(pin) : undefined;
    const checked = validateDefinition(native?.data ?? (bytes ? parseStrict(bytes) : null), PROPOSED_BOUNDS, RULE_PROFILES,
      native ? { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) } : {});
    if (!checked.ok || isDigest(pin) && checked.definition.digest !== pin) throw new Error("Grow archive declaration mismatch");
    const owners = new Map<string, Map<string, OperationRules>>();
    if (native && !isDigest(pin)) {
      const code = ownersOf(checked.definition, { named: pin, rules: native.rules }, null), kinds = new Map<string, OperationRules>();
      for (const kind of Object.keys(native.data.outcomes ?? {})) {
        const rules = code?.rules(pin, kind); if (!rules) throw new Error("Grow archive native rules unavailable");
        kinds.set(kind, rules);
      }
      owners.set(pin, kinds);
    }
    const device = checked.definition.declared.capabilities.some(capability => `${capability.name}@${capability.version}` === DEVICE_COMMAND);
    policies.set(pin, { review, entryTypes: inline, ...(bytes ? { declaration: bytes } : {}), support: { named: pin, definition: checked.definition, owners,
      ...(device ? { capabilities: CAPABILITY_CODE } : {}),
      records: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]) : new Map(),
      preparations: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) : new Map(),
    } });
  }
  return policies;
}

/** Production catalog coverage, including metadata for explicitly bounded
 * private-copy exceptions. The driver separately excludes private roots. */
export function nativeArchivePolicies(): ArchivePolicyRegistry {
  const policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>();
  for (const pin of Object.keys(VERSIONS)) {
    if (!Object.hasOwn(ARCHIVE_NATIVE_DATA, pin) && !answersCatalogVocabularyQuestion(pin, "archiveRegisterForeignCopy") && !answersCatalogVocabularyQuestion(pin, "archiveMembershipForeignCopy")) continue;
    const native = platform(pin);
    if (!native) throw Error("archive catalog pin unavailable");
    const checked = validateDefinition(native.data, PROPOSED_BOUNDS, RULE_PROFILES, { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) });
    if (!checked.ok || ARCHIVE_NATIVE_DATA[pin] !== undefined && checked.definition.digest !== ARCHIVE_NATIVE_DATA[pin]) throw Error("archive catalog declaration mismatch");
    const owners = new Map<string, Map<string, OperationRules>>(), kinds = new Map<string, OperationRules>();
    const code = ownersOf(checked.definition, { named: pin as PlatformDefinition, rules: native.rules }, null);
    for (const kind of Object.keys(native.data.outcomes ?? {})) {
      const rules = code?.rules(pin, kind);
      if (!rules) throw Error("archive catalog outcome unavailable");
      kinds.set(kind, rules);
    }
    owners.set(pin, kinds);
    const device = checked.definition.declared.capabilities.some(capability => `${capability.name}@${capability.version}` === DEVICE_COMMAND);
    policies.set(pin as PlatformDefinition, { review: "AE-1: reviewed native catalog and exact runtime public places", entryTypes: inline,
      support: { named: pin as PlatformDefinition, definition: checked.definition, owners, ...(device ? { capabilities: CAPABILITY_CODE } : {}),
        records: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]) : new Map(),
        preparations: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) : new Map() } });
  }
  return policies;
}

/** Only the caller's authenticated installed proof can select this closure.
 * No package supplies owner code, native value exceptions or policy tables. */
export function archivePackagePolicies(parts: readonly { readonly id: Digest; readonly bytes: string }[]): ArchivePolicyRegistry {
  const policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>();
  for (const part of parts) {
    const checked = validateDefinition(parseStrict(part.bytes) as DeclaredDefinition, PROPOSED_BOUNDS, RULE_PROFILES, { canonical: true });
    if (!checked.ok || checked.definition.digest !== part.id) throw Error("archive package declaration mismatch");
    const device = checked.definition.declared.capabilities.some(capability => `${capability.name}@${capability.version}` === DEVICE_COMMAND);
    policies.set(part.id, { review: "AE-1: authenticated installed package; closed runtime inline policy", declaration: part.bytes, entryTypes: inline,
      support: { named: part.id, definition: checked.definition, owners: new Map(), ...(device ? { capabilities: CAPABILITY_CODE } : {}),
        records: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]) : new Map(),
        preparations: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) : new Map() } });
  }
  return policies;
}

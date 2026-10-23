/** Reviewed Grow-only export coverage. Exact signed deployed declarations;
 * current maintained source declarations grant no production permission. */
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type Digest, type Input, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { isDigest, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { outcomeValueDomains, ownersOf, validateDefinition, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { DEMO_PUBLISHER, DEMO_RELEASE } from "../../examples/grow/demo-release.ts";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "../../packages/scope/src/archive-inventory.ts";
import { DEVICE_COMMAND_ARCHIVE_PREPARATIONS, DEVICE_COMMAND_ARCHIVE_RECORDS } from "../../packages/scope/src/archive-privacy.ts";
import { CAPABILITY_CODE } from "../../packages/scope/src/ports.ts";

export const GROW_ARCHIVE_DEFINITIONS = Object.freeze([
  "sha256:d2bc830e74caaabab32dbad17adae6812050fb4d36b67e97145d39c2a4cfe2ea",
  "sha256:b89e7f84740dfd8b24f78e8b52aff5aa8d4181750a7b5f385c1ef6f993846787",
] as const);
const inline: ReadonlySet<Input["type"]> = new Set(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
const review = "9674108a368c9e1380ce30a587aa57c4b503c0a4: Grow room binding; exact signed demo and native public places; no private journal export";

export function growArchivePolicies(packetText: string): ArchivePolicyRegistry {
  const packet = readPublishedApplicationPackage2(utf8(packetText), DEMO_RELEASE);
  if (packet.package.release.manifest.publisher !== DEMO_PUBLISHER || packet.package.semantic.entry !== GROW_ARCHIVE_DEFINITIONS[0]) throw new Error("Grow archive release mismatch");
  const declarations = new Map(packet.package.semantic.definitions.map(part => [part.id, part.bytes]));
  const policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>();
  for (const pin of [...GROW_ARCHIVE_DEFINITIONS, C.directory, C.rules, C.destination, C.register, C.membership]) {
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

/** Namespace-only installed release metadata. Signature/installation checks
 * grant no operator trust, archive policy, payload read or export permission. */
import type { Digest, KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, freeze, isDigest, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";
import type { StateView } from "@generalbusiness/dap-derive";
import { platform } from "./native-catalog.ts";
import { BASE_COHORT } from "./base-cohort.ts";
import { COMMONS_COHORT } from "./commons-cohort.ts";
import { TRUSTED_APPLICATION_COHORT } from "./application-install-wire.ts";
import { DECLARED_APPLICATION_COHORT } from "./application-install-v2-wire.ts";
import { DEVICE_APPLICATION_COHORT } from "./device-application-wire.ts";
import { EVIDENCE_RULES_COHORT } from "./evidence-cohort.ts";
import { ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT,
  ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT } from "./archive-binding-wire.ts";
import { applicationInstallation } from "./application-install-reader.ts";
import { APPLICATION_RELEASE_VALUE, APPLICATION_SEMANTIC_VALUE } from "./application-install.ts";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2 } from "./application-install-v2.ts";
import { INSTALL_DEFINITION_BYTES, INSTALL_DEFINITIONS } from "./application-install-wire.ts";
import { readApplicationReleaseProof, type ApplicationInstallation, type ApplicationReleaseProof } from "./application-codec/application.ts";
import { readPublishedApplicationReleaseProof2, type PublishedApplicationReleaseProof2 } from "./application-codec/application-v2.ts";

export type ArchiveInstallation = Omit<ApplicationInstallation, "membershipDefinition">;
export type ApplicationArchiveProof = (
  | { readonly v: 1; readonly semantic: ApplicationReleaseProof["semantic"]; readonly release: ApplicationReleaseProof["release"] }
  | { readonly v: 2; readonly semantic: PublishedApplicationReleaseProof2["semantic"]; readonly release: PublishedApplicationReleaseProof2["release"] }
) & { readonly installation: ArchiveInstallation; readonly publisher: KeyId };

const rulesPins: readonly string[] = [BASE_COHORT.rules, COMMONS_COHORT.rules, TRUSTED_APPLICATION_COHORT.rules,
  DECLARED_APPLICATION_COHORT.rules, DEVICE_APPLICATION_COHORT.rules, EVIDENCE_RULES_COHORT.rules,
  ARCHIVE_APPLICATION_COHORT.rules, ARCHIVE_DECLARED_APPLICATION_COHORT.rules, ARCHIVE_DEVICE_APPLICATION_COHORT.rules,
  ARCHIVE_CERTIFIED_RULES_COHORT.rules, HARDENED_CERTIFIED_RULES_COHORT.rules];
const keys = (value: Record<string, unknown>, expected: string): boolean => Object.keys(value).sort().join() === expected;
const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);

/** Select the exact native install's retained domains, never a codec fallback. */
export function applicationArchiveProofFormat(named: string) {
  if (!rulesPins.includes(named)) return null;
  const fields = platform(named)?.data.acts["install-application"]?.fields;
  const semantic = fields?.["semantic"], release = fields?.["release"];
  if (!isRecord(semantic) || !isRecord(release) || !isRecord(semantic["value"]) || !isRecord(release["value"])) return null;
  const selected = same(semantic["value"], APPLICATION_SEMANTIC_VALUE) && same(release["value"], APPLICATION_RELEASE_VALUE)
    ? { v: 1 as const, semantic: APPLICATION_SEMANTIC_VALUE, release: APPLICATION_RELEASE_VALUE }
    : same(semantic["value"], APPLICATION_SEMANTIC_VALUE2) && same(release["value"], APPLICATION_RELEASE_VALUE2)
      ? { v: 2 as const, semantic: APPLICATION_SEMANTIC_VALUE2, release: APPLICATION_RELEASE_VALUE2 } : null;
  return selected;
}

function installationOf(value: unknown): ArchiveInstallation | null {
  if (!isRecord(value) || !keys(value, "definition,destination,directory,ids,item,membership,rules,scope")
    || !["directory", "rules", "membership", "destination", "scope"].every(key => isScopeRef(value[key]))
    || !Number.isSafeInteger(value["item"]) || (value["item"] as number) < 0 || !isDigest(value["definition"])
    || !isRecord(value["ids"]) || !keys(value["ids"], "presentation,release,semantic")
    || !Object.values(value["ids"]).every(isDigest)) return null;
  return value as unknown as ArchiveInstallation;
}

/** Strict metadata proof check shared by the local sender and byte receiver.
 * The receiver must separately authenticate the native Rules birth and the
 * application's creation chain, then check current deployment trust. */
export function checkApplicationArchiveProof(value: unknown, named: string): ApplicationArchiveProof | null {
  try {
    const format = applicationArchiveProofFormat(named);
    if (!format || !isRecord(value) || !keys(value, "installation,publisher,release,semantic,v") || value["v"] !== format.v) return null;
    const installation = installationOf(value["installation"]);
    if (!installation) return null;
    const limits = { bytes: format.semantic.max + format.release.max, definitions: INSTALL_DEFINITIONS, definitionBytes: INSTALL_DEFINITION_BYTES };
    const proof = format.v === 1
      ? readApplicationReleaseProof(value["semantic"], value["release"], installation.ids.release, limits)
      : readPublishedApplicationReleaseProof2(value["semantic"], value["release"], installation.ids.release, limits);
    if (!same(proof.ids, installation.ids) || proof.semantic.entry !== installation.definition
      || proof.release.manifest.publisher !== value["publisher"]) return null;
    const answer = { v: format.v, installation, semantic: proof.semantic, release: proof.release, publisher: proof.release.manifest.publisher };
    freeze(answer);
    return answer as ApplicationArchiveProof;
  } catch { return null; }
}

/** Read one completed native installation and its retained signed proof.
 * No arbitrary digest, package lookup, current source or presentation is read. */
export function applicationArchiveProof(state: StateView, named: string, directory: ScopeRef, item: number,
  value: (domain: string, digest: Digest, most: number) => unknown | undefined): ApplicationArchiveProof | null {
  try {
    const format = applicationArchiveProofFormat(named);
    const installed = format ? applicationInstallation(state, named, directory, item) : null;
    if (!format || !installed) return null;
    const { membershipDefinition: _membershipDefinition, ...installation } = installed;
    const semantic = value(format.semantic.domain, installation.ids.semantic, format.semantic.max);
    if (semantic === undefined) return null;
    const release = value(format.release.domain, installation.ids.release, format.release.max);
    if (release === undefined) return null;
    return checkApplicationArchiveProof({ v: format.v, installation, semantic, release, publisher: state.item(item)?.values["publisher"] }, named);
  } catch { return null; }
}

import { DEVICE_APPLICATION_COHORT as D } from "./device-application-wire.ts";
/** Read only a completed Rules6 install's immutable native proof. This is
 * declaration metadata, never authority, item data or a fallback to R2/Git. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationReleaseProof2, type ApplicationProjectionDeclaration } from "@generalbusiness/dap-bytes/application-v2";
import type { StateView } from "@generalbusiness/dap-derive";
import { applicationInstallation } from "./application-install-reader.ts";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2 } from "./application-install-v2.ts";
import { DECLARED_APPLICATION_COHORT as C } from "./application-install-v2-wire.ts";
import { ARCHIVE_DECLARED_APPLICATION_COHORT as AC, ARCHIVE_DEVICE_APPLICATION_COHORT as ADC } from "./archive-binding-wire.ts";
export function applicationProjectionDeclaration(state: StateView, named: string, directory: ScopeRef, item: number, name: string,
  value: (domain: string, digest: Digest, most: number) => unknown | undefined): ApplicationProjectionDeclaration | null {
  if ((named !== C.rules && named !== D.rules && named !== ADC.rules && named !== AC.rules) || typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(name)) return null;
  const installation = applicationInstallation(state, named, directory, item);
  if (!installation) return null;
  try {
    const semantic = value(APPLICATION_SEMANTIC_VALUE2.domain, installation.ids.semantic, APPLICATION_SEMANTIC_VALUE2.max);
    const release = value(APPLICATION_RELEASE_VALUE2.domain, installation.ids.release, APPLICATION_RELEASE_VALUE2.max);
    if (semantic === undefined || release === undefined) return null;
    const proof = readPublishedApplicationReleaseProof2(semantic, release, installation.ids.release, { bytes: APPLICATION_SEMANTIC_VALUE2.max + APPLICATION_RELEASE_VALUE2.max });
    if (canonicalize(proof.ids) !== canonicalize(installation.ids) || proof.semantic.entry !== installation.definition
      || proof.release.manifest.publisher !== state.item(item)?.values["publisher"] || !Object.hasOwn(proof.semantic.projections, name)) return null;
    const projection = proof.semantic.projections[name]!;
    const definition = proof.semantic.definitions.find(part => part.id === projection.definition);
    // The closed package proof contains this exact definition. The target
    // owner must separately prove a native creation chain to the install root.
    return definition ? Object.freeze({ v: 1, installation, name, projection, definition }) : null;
  } catch { return null; }
}

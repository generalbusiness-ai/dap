/** M2a package wire version. Legacy v1 stays a separate strict reader. */
import type { Base64Url } from "@generalbusiness/dap-contract";
import type { ApplicationIds, ApplicationManifest, ApplicationPresentation, ApplicationSemantics, PackedApplication } from "./application-types.ts";
import type { ApplicationReadProjection } from "./application-projection-types.ts";
import type { ApplicationViews } from "./application-view.ts";
import { ApplicationPackageError } from "./application-types.ts";
import type { PackageComposition, PackageFinding } from "@generalbusiness/dap-package-graph";
export type { PackageComposition, PackageFinding } from "@generalbusiness/dap-package-graph";
export class ApplicationPackageValidationError extends ApplicationPackageError {
  readonly findings: readonly PackageFinding[];
  constructor(findings: readonly PackageFinding[]) { super("invalid"); this.findings = findings; }
}
export interface ApplicationSemantics2 extends Omit<ApplicationSemantics, "v" | "projections">, PackageComposition {
  readonly v: 2;
  readonly projections: Readonly<Record<string, ApplicationReadProjection>>;
}
export interface ApplicationPresentation2 extends Omit<ApplicationPresentation, "v"> {
  readonly v: 2;
  readonly views: ApplicationViews;
  /** Exact ui:// resource URI to an existing HTML asset in this presentation. */
  readonly resources: Readonly<Record<string, string>>;
}
export interface ApplicationManifest2 extends Omit<ApplicationManifest, "v"> { readonly v: 2 }
export interface ApplicationRelease2 { readonly manifest: ApplicationManifest2; readonly sig: Base64Url }
/** Common shape for consuming the bounded, already published v2 release.
 * It does not invent composition members in that release's signed bytes. */
export type PublishedApplicationSemantics2 = Omit<ApplicationSemantics2, keyof PackageComposition>;
export interface ApplicationPackage2<S extends PublishedApplicationSemantics2 = ApplicationSemantics2> {
  readonly v: 2;
  readonly semantic: S;
  readonly presentation: ApplicationPresentation2;
  readonly release: ApplicationRelease2;
}
export interface ApplicationReleaseProof2<S extends PublishedApplicationSemantics2 = ApplicationSemantics2> { readonly semantic: S; readonly release: ApplicationRelease2; readonly ids: ApplicationIds }
export interface PackedApplication2<S extends PublishedApplicationSemantics2 = ApplicationSemantics2> { readonly bytes: Uint8Array; readonly ids: ApplicationIds; readonly package: ApplicationPackage2<S> }
export type PublishedApplicationReleaseProof2 = ApplicationReleaseProof2<PublishedApplicationSemantics2>;
export type PublishedPackedApplication2 = PackedApplication2<PublishedApplicationSemantics2>;
/** Host-side content handling may support both explicit codecs. Native
 * versions still select their one proof reader, never this union. */
export type AnyPackedApplication = PackedApplication | PublishedPackedApplication2;
export interface ApplicationPackageInput2 {
  readonly name: string;
  readonly version: string;
  readonly semantic: Omit<ApplicationSemantics2, "creates">;
  readonly presentation: Omit<ApplicationPresentation2, "semantic">;
}

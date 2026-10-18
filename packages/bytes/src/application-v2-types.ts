/** M2a package wire version. Legacy v1 stays a separate strict reader. */
import type { Base64Url } from "@generalbusiness/dap-contract";
import type { ApplicationIds, ApplicationManifest, ApplicationPresentation, ApplicationSemantics } from "./application-types.ts";
import type { ApplicationReadProjection } from "./application-projection-types.ts";
import type { ApplicationViews } from "./application-view.ts";
export interface ApplicationSemantics2 extends Omit<ApplicationSemantics, "v" | "projections"> {
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
export interface ApplicationPackage2 {
  readonly v: 2;
  readonly semantic: ApplicationSemantics2;
  readonly presentation: ApplicationPresentation2;
  readonly release: ApplicationRelease2;
}
export interface ApplicationReleaseProof2 { readonly semantic: ApplicationSemantics2; readonly release: ApplicationRelease2; readonly ids: ApplicationIds }
export interface PackedApplication2 { readonly bytes: Uint8Array; readonly ids: ApplicationIds; readonly package: ApplicationPackage2 }
export interface ApplicationPackageInput2 {
  readonly name: string;
  readonly version: string;
  readonly semantic: Omit<ApplicationSemantics2, "creates">;
  readonly presentation: Omit<ApplicationPresentation2, "semantic">;
}

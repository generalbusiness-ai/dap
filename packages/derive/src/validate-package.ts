/** The package byte boundary composes native definition admission with the
 * shared package graph. It grants no runtime or installation authority. */
import type { Bounds, Digest } from "@generalbusiness/dap-contract";
import { fitsFieldType, parseStrict } from "@generalbusiness/dap-bytes";
import { ApplicationPackageError, type ApplicationPackageLimits } from "@generalbusiness/dap-bytes/application";
import { ApplicationPackageValidationError, readApplicationPackage2, type PackedApplication2 } from "@generalbusiness/dap-bytes/application-v2";
import { checkPackageGraph, type PackageFinding, type PackageGraphReport } from "@generalbusiness/dap-package-graph";
import { PROFILES, validateDefinition, type Profile, type ProblemCode, type ValidDefinition } from "./validate/index.ts";

export type PackageValidationFinding = Omit<PackageFinding, "reason"> & { readonly reason: PackageFinding["reason"] | ProblemCode };
export type PackageValidation =
  | { readonly ok: false; readonly kind: "codec"; readonly reason: ApplicationPackageError["reason"]; readonly findings: readonly PackageValidationFinding[] }
  | { readonly ok: false; readonly kind: "definitions"; readonly findings: readonly PackageValidationFinding[] }
  | { readonly ok: boolean; readonly kind: "graph"; readonly packet: PackedApplication2; readonly definitions: readonly ValidDefinition[]; readonly findings: readonly PackageValidationFinding[]; readonly report: PackageGraphReport };

export function validatePackage(bytes: Uint8Array, bounds: Bounds, profiles: Readonly<Record<string, Profile>> = PROFILES,
  packageLimits: Partial<ApplicationPackageLimits> = {}, expected: Digest | null = null): PackageValidation {
  let packet: PackedApplication2;
  try { packet = readApplicationPackage2(bytes, expected, packageLimits); }
  catch (error) {
    if (!(error instanceof ApplicationPackageError)) throw error;
    const findings: readonly PackageValidationFinding[] = error instanceof ApplicationPackageValidationError ? error.findings
      : error.reason === "limit" || error.reason === "closure" ? [{ definition: null, row: "package", check: "closure-and-bounds", reason: "bounds", severity: "refusal", message: `The package exceeds a format allowance or has an incomplete closure (${error.reason}).` }] : [];
    return { ok: false, kind: "codec", reason: error.reason, findings };
  }
  const semantic = packet.package.semantic, definitions: ValidDefinition[] = [], findings: PackageValidationFinding[] = [];
  for (const part of semantic.definitions) {
    const native = validateDefinition(parseStrict(part.bytes), bounds, profiles);
    if (native.ok) definitions.push(native.definition);
    else findings.push(...native.problems.map(problem => ({ definition: part.id, row: problem.path, check: "native-definition", reason: problem.code, severity: "refusal" as const, message: problem.message })));
  }
  if (findings.length) return { ok: false, kind: "definitions", findings };
  const report = checkPackageGraph({ bounds, entry: semantic.entry, definitions: definitions.map(definition => ({ id: definition.digest, definition: definition.declared })),
    composition: semantic, roles: semantic.roles, literalFits: (type, value) => fitsFieldType(type, value, bounds) });
  return { ok: !report.findings.some(finding => finding.severity === "refusal"), kind: "graph", packet, definitions, findings: report.findings, report };
}

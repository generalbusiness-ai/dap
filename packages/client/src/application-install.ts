/** One native application-install envelope. Keep it unchanged for submission
 * and settlement; host fetch/admission remains a separate authority. */
import type { Beside, Digest, FieldValue, MemberRef, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { isDigest, isMemberRef, isRecord, isScopeRef, parseStrict, textDigest } from "@generalbusiness/dap-bytes";
import { applicationJson } from "./application-json.ts";
import { readApplicationPackage } from "./application-package.ts";
import { readApplicationReleaseUri } from "./application-uri.ts";
import { ApplicationPackageError, type ApplicationIds } from "./application-types.ts";
import { readPublishedApplicationPackage2, type AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import { signedIntent, type Signer, type Signing } from "./intent.ts";

export type ApplicationInstallRole = "admin" | "maintainer" | "member" | "agent" | "checker";
export interface ApplicationInstallOptions {
  readonly rules: ScopeRef;
  readonly uri: string;
  /** Independent expected release, never inferred from fetched content. */
  readonly release: Digest;
  /** Explicit selection. An empty list adds no default actions. */
  readonly roles: readonly ApplicationInstallRole[];
  readonly values: Readonly<Record<string, FieldValue>>;
}
export interface SignedApplicationInstall {
  readonly signed: SignedIntent;
  readonly beside: Beside;
  readonly ids: ApplicationIds;
}
/** Selected at install, never carried in the signed package requirements. */
export interface DeviceApplicationInstallOptions extends ApplicationInstallOptions { readonly owner: MemberRef }
const roles: readonly string[] = ["admin", "maintainer", "member", "agent", "checker"];
const invalid = (): never => { throw new ApplicationPackageError("invalid"); };

/** An owned, bounded install selection, before network or signing. */
export function readApplicationInstallOptions(value: unknown): ApplicationInstallOptions {
  const owned = parseStrict(applicationJson(value, 32 * 1024)) as unknown as ApplicationInstallOptions;
  if (!isRecord(owned) || Object.keys(owned).sort().join() !== "release,roles,rules,uri,values"
    || !isDigest(owned.release) || !isScopeRef(owned.rules) || owned.rules.kind !== "rules"
    || !Array.isArray(owned.roles) || owned.roles.length > 5 || new Set(owned.roles).size !== owned.roles.length
    || owned.roles.some(role => !roles.includes(role)) || !isRecord(owned.values)) return invalid();
  try { readApplicationReleaseUri(owned.uri); } catch { return invalid(); }
  return owned;
}

export function readDeviceApplicationInstallOptions(value: unknown): DeviceApplicationInstallOptions {
  const owned = parseStrict(applicationJson(value, 32 * 1024));
  if (!isRecord(owned) || !isMemberRef(owned["owner"])) return invalid();
  const { owner, ...ordinary } = owned;
  return { ...readApplicationInstallOptions(ordinary), owner };
}

/** Verify owned package bytes and bounded inputs before asking for one
 * signature. Beside holds semantic/release values and declaration texts;
 * screen bytes never enter this native request. This checks no host trust,
 * native grant, current revision or application genesis guard. */
export async function signedApplicationInstall(signer: Signer, bytes: Uint8Array, options: ApplicationInstallOptions, signing: Signing = {}): Promise<SignedApplicationInstall> {
  const owned = readApplicationInstallOptions(options);
  const packet = readApplicationPackage(bytes, owned.release, { bytes: 4 * 1024 * 1024, definitionBytes: 64 * 1024 });
  return signApplicationInstall(signer, packet, owned, signing);
}

/** The declared-interface cohort uses the separate strict v2 codec.
 * Calling this does not authorize that cohort or select its native pin. */
export async function signedApplicationInstall2(signer: Signer, bytes: Uint8Array, options: ApplicationInstallOptions, signing: Signing = {}): Promise<SignedApplicationInstall> {
  const owned = readApplicationInstallOptions(options);
  const packet = readPublishedApplicationPackage2(bytes, owned.release, { bytes: 4 * 1024 * 1024, definitionBytes: 64 * 1024 });
  return signApplicationInstall(signer, packet, owned, signing);
}

/** Device cohort only. Native Rules verifies the owner's current membership. */
export async function signedDeviceApplicationInstall(signer: Signer, bytes: Uint8Array, options: DeviceApplicationInstallOptions, signing: Signing = {}): Promise<SignedApplicationInstall> {
  const owned = readDeviceApplicationInstallOptions(options);
  const packet = readPublishedApplicationPackage2(bytes, owned.release, { bytes: 4 * 1024 * 1024, definitionBytes: 64 * 1024 });
  return signApplicationInstall(signer, packet, owned, signing, owned.owner);
}

async function signApplicationInstall(signer: Signer, packet: AnyPackedApplication, owned: ApplicationInstallOptions, signing: Signing, owner?: MemberRef): Promise<SignedApplicationInstall> {
  const semantic = applicationJson(packet.package.semantic, 256 * 1024), release = applicationJson(packet.package.release, 4096);
  const values = applicationJson(owned.values, 16 * 1024);
  const texts = packet.package.semantic.definitions.map(part => part.bytes);
  const signed = await signedIntent(signer, { to: owned.rules, kind: "install-application", fields: {
    uri: owned.uri, release: packet.ids.release, semantic: packet.ids.semantic, roles: [...owned.roles], values,
    ...(owner ? { owner } : {}),
    ...Object.fromEntries(texts.map((text, index) => [`definitionText${index}`, textDigest(text)])),
  } }, signing);
  return { signed, beside: { values: [semantic, release], texts }, ids: packet.ids };
}

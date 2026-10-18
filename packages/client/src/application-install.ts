/** One native application-install envelope. Keep it unchanged for submission
 * and settlement; host fetch/admission remains a separate authority. */
import type { Beside, Digest, FieldValue, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { isDigest, isRecord, isScopeRef, parseStrict, textDigest } from "@generalbusiness/artroom-bytes";
import { applicationJson } from "./application-json.ts";
import { readApplicationPackage } from "./application-package.ts";
import { readApplicationReleaseUri } from "./application-uri.ts";
import { ApplicationPackageError, type ApplicationIds } from "./application-types.ts";
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

/** Verify owned package bytes and bounded inputs before asking for one
 * signature. Beside holds semantic/release values and declaration texts;
 * screen bytes never enter this native request. This checks no host trust,
 * native grant, current revision or application genesis guard. */
export async function signedApplicationInstall(signer: Signer, bytes: Uint8Array, options: ApplicationInstallOptions, signing: Signing = {}): Promise<SignedApplicationInstall> {
  const owned = readApplicationInstallOptions(options);
  const packet = readApplicationPackage(bytes, owned.release, { bytes: 4 * 1024 * 1024, definitionBytes: 64 * 1024 });
  const semantic = applicationJson(packet.package.semantic, 256 * 1024), release = applicationJson(packet.package.release, 4096);
  const values = applicationJson(owned.values, 16 * 1024);
  const texts = packet.package.semantic.definitions.map(part => part.bytes);
  const signed = await signedIntent(signer, { to: owned.rules, kind: "install-application", fields: {
    uri: owned.uri, release: packet.ids.release, semantic: packet.ids.semantic, roles: [...owned.roles], values,
    ...Object.fromEntries(texts.map((text, index) => [`definitionText${index}`, textDigest(text)])),
  } }, signing);
  return { signed, beside: { values: [semantic, release], texts }, ids: packet.ids };
}

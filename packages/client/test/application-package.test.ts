import { packageDeclaration as declaration } from "./definition-corpus-data.ts";
/** Real canonical bytes and Ed25519 signatures over small declaration fixtures.
 * Native whole-definition judgment, a Git fetch/install and browser behavior
 * are separate obligations of check and the host-side slice. */
import { expect, test } from "vitest";
import { b64url, canonicalize, newIncarnation, scopeIdOf, textDigest, utf8, verifySignedIntent } from "@generalbusiness/artroom-bytes";
import { ApplicationPackageError, packApplication, readApplicationPackage, readApplicationReleaseProof, secretSigner, signedApplicationInstall, type ApplicationPackageInput, type PackedApplication } from "../src/index.ts";

const signer = secretSigner(new Uint8Array(32).fill(7));
type Mutable<T> = T extends readonly (infer V)[] ? Mutable<V>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;

function input(): Mutable<ApplicationPackageInput> {
  const child = declaration("child"), root = declaration("root", child);
  return { name: "ai.generalbusiness.fixture", version: "0.1.0", semantic: {
    v: 1, entry: root.id, definitions: [root, child], host: { execution: "recorded-do", profiles: ["restricted@1"] },
    projections: {}, capabilities: [], roles: { member: ["app.edit"], admin: ["app.found", "app.edit"] }, predecessor: null,
  }, presentation: { v: 1, entry: "index.html", assets: [
    { path: "main.js", mediaType: "text/javascript; charset=utf-8", bytes: b64url(utf8("export const value = 1;")) },
    { path: "index.html", mediaType: "text/html; charset=utf-8", bytes: b64url(utf8('<script type="module" src="./main.js"></script>')) },
  ], descriptions: { touch: { text: "Record a touch.", fields: {} } } } };
}
function changed(packet: PackedApplication, work: (value: any) => void): Uint8Array {
  const value = JSON.parse(new TextDecoder().decode(packet.bytes)); work(value); return utf8(canonicalize(value));
}
function refusal(work: () => unknown, reason?: ApplicationPackageError["reason"]): void {
  try { work(); expect.fail("the invalid package was accepted"); }
  catch (error) {
    expect(error).toBeInstanceOf(ApplicationPackageError);
    if (reason) expect((error as ApplicationPackageError).reason).toBe(reason);
  }
}
async function rejected(value: ApplicationPackageInput, reason: ApplicationPackageError["reason"]): Promise<void> {
  const outcome = await packApplication(value, signer).then(() => "accepted", error => error instanceof ApplicationPackageError ? error.reason : "unexpected error");
  expect(outcome).toBe(reason);
}

test("canonical signed packages round-trip with three stable and separated identities", async () => {
  const first = await packApplication(input(), signer), repeated = await packApplication(input(), signer);
  expect(repeated.bytes).toEqual(first.bytes); expect(new Set(Object.values(first.ids)).size).toBe(3);
  expect(readApplicationPackage(first.bytes, first.ids.release)).toEqual(first);
  expect(first.package.semantic.creates).toHaveLength(1);
  expect(first.package.release.manifest).toMatchObject({ semantic: first.ids.semantic, presentation: first.ids.presentation, publisher: signer.key });
  expect(first.package.release).not.toHaveProperty("id"); expect(Object.isFrozen(first.package.semantic.definitions)).toBe(true);

  const screen = input(); screen.presentation.assets = [...screen.presentation.assets, { path: "help.txt", mediaType: "text/plain; charset=utf-8", bytes: b64url(utf8("help")) }];
  const presented = await packApplication(screen, signer);
  expect(presented.ids.semantic).toBe(first.ids.semantic); expect(presented.ids.presentation).not.toBe(first.ids.presentation); expect(presented.ids.release).not.toBe(first.ids.release);
  const description = input(); description.presentation.descriptions["touch"] = { text: "A clearer touch description.\nPrêt : 🌱\u2028quoted \\\"text\\\"", fields: {} };
  const described = await packApplication(description, signer);
  expect(described.ids.semantic).toBe(first.ids.semantic); expect(described.ids.presentation).not.toBe(first.ids.presentation);
  expect(readApplicationPackage(described.bytes, described.ids.release).package.presentation.descriptions["touch"]?.text).toBe(description.presentation.descriptions["touch"]!.text);
  const role = input(); role.semantic.roles["member"] = ["app.edit", "app.found"];
  const changedRole = await packApplication(role, signer);
  expect(changedRole.ids.semantic).not.toBe(first.ids.semantic); expect(changedRole.ids.presentation).not.toBe(first.ids.presentation); expect(changedRole.ids.release).not.toBe(first.ids.release);
  const version = input(); version.version = "0.1.1";
  const release = await packApplication(version, signer);
  expect(release.ids.semantic).toBe(first.ids.semantic); expect(release.ids.presentation).toBe(first.ids.presentation); expect(release.ids.release).not.toBe(first.ids.release);
  const publisher = await packApplication(input(), secretSigner(new Uint8Array(32).fill(9)));
  expect(publisher.ids.semantic).toBe(first.ids.semantic); expect(publisher.ids.presentation).toBe(first.ids.presentation); expect(publisher.ids.release).not.toBe(first.ids.release);
});

test("tampered bodies, presentation bindings, signatures and expected releases are refused", async () => {
  const packet = await packApplication(input(), signer);
  for (const bytes of [
    changed(packet, value => { value.semantic.predecessor = `sha256:${"a".repeat(64)}`; }),
    changed(packet, value => { value.presentation.assets[0].bytes = b64url(utf8("altered")); }),
    changed(packet, value => { value.presentation.semantic = `sha256:${"a".repeat(64)}`; }),
    changed(packet, value => { value.release.manifest.version = "0.2.0"; }),
    changed(packet, value => { value.release.sig = "A".repeat(86); }),
    changed(packet, value => { value.unlisted = "body"; }),
    utf8(new TextDecoder().decode(packet.bytes) + "\n"),
    utf8('{"v":1,' + new TextDecoder().decode(packet.bytes).slice(1)),
  ]) refusal(() => readApplicationPackage(bytes, packet.ids.release));
  refusal(() => readApplicationPackage(packet.bytes, `sha256:${"0".repeat(64)}`), "integrity");
});

test("signed bytes cannot claim a different publisher's key even without an external expected id", async () => {
  const other = secretSigner(new Uint8Array(32).fill(9));
  const outcome = await packApplication(input(), { key: signer.key, sign: other.sign }).then(() => "accepted", error => error instanceof ApplicationPackageError ? error.reason : "unexpected error");
  expect(outcome).toBe("signature");
});

test("the actual declaration closure is complete and cannot hide requirements or unrelated definitions", async () => {
  const missing = input(); missing.semantic.definitions = missing.semantic.definitions.filter(part => part.id === missing.semantic.entry);
  await rejected(missing, "closure");
  const extra = input(); extra.semantic.definitions = [...extra.semantic.definitions, declaration("unrelated")]; await rejected(extra, "closure");
  const altered = input(); altered.semantic.definitions = altered.semantic.definitions.map(part => ({ ...part, bytes: part.bytes.replace('"root"', '"different"') })); await rejected(altered, "integrity");
  const profile = input(); profile.semantic.host.profiles = []; await rejected(profile, "integrity");
  const role = input(); role.semantic.roles["member"] = ["rules.activate"]; await rejected(role, "integrity");
  const capability = input(), root = declaration("needs-hold", undefined, true);
  capability.semantic.entry = root.id; capability.semantic.definitions = [root]; await rejected(capability, "integrity");
  const packet = await packApplication(input(), signer);
  refusal(() => readApplicationPackage(changed(packet, value => { value.semantic.creates = []; }), null), "closure");
});

test("asset paths, aliases and encoded allowances fail before an unsafe asset can be served", async () => {
  for (const path of ["../escape", "/absolute", "dir/../escape", "dir\\file", "%2e%2e/file", "a//b"]) {
    const value = input(); value.presentation.assets = [...value.presentation.assets, { path, mediaType: "text/plain", bytes: "" }]; await rejected(value, "invalid");
  }
  const alias = input(); alias.presentation.assets = [...alias.presentation.assets, { path: "INDEX.html", mediaType: "text/html", bytes: "" }]; await rejected(alias, "invalid");
  const prefix = input(); prefix.presentation.assets = [...prefix.presentation.assets, ...["a", "a-b", "a/file"].map(path => ({ path, mediaType: "text/plain", bytes: "" }))]; await rejected(prefix, "invalid");
  const packet = await packApplication(input(), signer);
  refusal(() => readApplicationPackage(new Uint8Array(65).fill(255), null, { bytes: 64 }), "limit");
  refusal(() => readApplicationPackage(packet.bytes, packet.ids.release, { assetBytes: 1 }), "limit");
  refusal(() => readApplicationPackage(packet.bytes, packet.ids.release, { bytes: 17 * 1024 * 1024 }), "limit");
});

test("signing holds owned input and refuses materialized getters without invoking them", async () => {
  const baseline = await packApplication(input(), signer), original = input();
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  const pending = packApplication(original, { key: signer.key, sign: async bytes => { await held; return signer.sign(bytes); } });
  original.semantic.roles["member"] = ["app.found"]; original.presentation.descriptions["touch"] = { text: "changed while signing", fields: {} };
  release(); expect((await pending).bytes).toEqual(baseline.bytes);
  const getter = input(); let calls = 0;
  Object.defineProperty(getter.semantic, "predecessor", { enumerable: true, get: () => { calls++; return null; } });
  await rejected(getter, "invalid"); expect(calls).toBe(0);
});

// Invariant: a journal-sized proof binds its semantic body to the exact signed
// release without treating an omitted screen body as verified package bytes.
test("an install proof verifies exact semantics and signed release without presentation assets", async () => {
  const packet = await packApplication(input(), signer);
  const semantic = JSON.parse(canonicalize(packet.package.semantic)), signed = JSON.parse(canonicalize(packet.package.release));
  const proof = readApplicationReleaseProof(semantic, signed, packet.ids.release);
  expect(proof).toEqual({ semantic: packet.package.semantic, release: packet.package.release, ids: packet.ids });
  expect(proof).not.toHaveProperty("presentation"); expect(proof).not.toHaveProperty("bytes");
  expect(Object.isFrozen(proof.semantic.roles)).toBe(true);
  semantic.roles.member = ["app.found"];
  expect(proof.semantic.roles["member"]).toEqual(["app.edit"]);
  refusal(() => readApplicationReleaseProof(semantic, signed, packet.ids.release), "integrity");
  refusal(() => readApplicationReleaseProof(packet.package.semantic, signed, `sha256:${"0".repeat(64)}`), "integrity");
  const changed = { ...signed, sig: (signed.sig[0] === "A" ? "B" : "A") + signed.sig.slice(1) };
  refusal(() => readApplicationReleaseProof(packet.package.semantic, changed, packet.ids.release), "signature");
  refusal(() => readApplicationReleaseProof(packet.package.semantic, signed, packet.ids.release, { bytes: 32 }), "limit");
  let invoked = 0;
  const getter = Object.defineProperty({ ...packet.package.semantic }, "roles", { enumerable: true, get() { invoked++; return {}; } });
  refusal(() => readApplicationReleaseProof(getter, signed, packet.ids.release)); expect(invoked).toBe(0);
});


// Invariant: the SDK signs one owned native envelope with exact proof/text
// custody and explicit role selection, before any transport or host admission.
test("native install signing owns inputs and excludes screen bytes from its retry envelope", async () => {
  const packet = await packApplication(input(), signer), bytes = packet.bytes.slice();
  const options = { rules: { scope: scopeIdOf({ v: 1, kind: "rules", definition: `sha256:${"a".repeat(64)}`, creator: null, cause: `sha256:${"b".repeat(64)}`, ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(1)), kind: "rules" }, uri: `git+https://example.test/project.git/@${"c".repeat(40)}/application.dap.json`, release: packet.ids.release, roles: ["member"], values: { title: "Original" } } as any;
  const rules = structuredClone(options.rules);
  let calls = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const pending = signedApplicationInstall({ key: signer.key, sign: async value => { calls++; await held; return signer.sign(value); } }, bytes, options, { now: 1_790_000_000_000 });
  options.roles.push("admin"); options.values.title = "Changed"; options.rules.scope = "d".repeat(64); bytes.fill(0);
  release(); const envelope = await pending;
  expect(calls).toBe(1); expect(verifySignedIntent(envelope.signed)).toBe(true);
  expect(envelope.signed.intent).toMatchObject({ to: rules, kind: "install-application", fields: { roles: ["member"], values: '{"title":"Original"}', release: packet.ids.release, semantic: packet.ids.semantic } });
  expect(envelope.beside.values).toEqual([canonicalize(packet.package.semantic), canonicalize(packet.package.release)]);
  expect(envelope.beside.texts).toEqual(packet.package.semantic.definitions.map(part => part.bytes));
  for (const [index, text] of envelope.beside.texts!.entries()) expect(envelope.signed.intent.fields[`definitionText${index}`]).toBe(textDigest(text));
  expect(envelope.ids).toEqual(packet.ids); expect(envelope.beside).not.toHaveProperty("presentation");
  expect(canonicalize(envelope)).not.toContain("export const value = 1");
});

test("invalid package, URI, role selection and accessor inputs never ask the install key to sign", async () => {
  const packet = await packApplication(input(), signer);
  const options = { rules: { scope: scopeIdOf({ v: 1, kind: "rules", definition: `sha256:${"a".repeat(64)}`, creator: null, cause: `sha256:${"b".repeat(64)}`, ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(1)), kind: "rules" }, uri: `git+https://example.test/project.git/@${"c".repeat(40)}/application.dap.json`, release: packet.ids.release, roles: [], values: {} } as any;
  let calls = 0, getters = 0; const key = { key: signer.key, sign: async (bytes: Uint8Array) => { calls++; return signer.sign(bytes); } };
  for (const [bytes, altered] of [
    [changed(packet, value => { value.presentation.assets[0].bytes = ""; }), options],
    [packet.bytes, { ...options, release: `sha256:${"0".repeat(64)}` }],
    [packet.bytes, { ...options, uri: options.uri.replace("c".repeat(40), "main") }],
    [packet.bytes, { ...options, roles: ["admin", "admin"] }],
    [packet.bytes, { ...options, roles: ["owner"] }],
    [packet.bytes, Object.defineProperty({ ...options }, "values", { enumerable: true, get() { getters++; return {}; } })],
  ] as const) await expect(signedApplicationInstall(key, bytes, altered)).rejects.toBeInstanceOf(ApplicationPackageError);
  expect(calls).toBe(0); expect(getters).toBe(0);
  const explicitNone = await signedApplicationInstall(key, packet.bytes, options);
  expect(explicitNone.signed.intent.fields["roles"]).toEqual([]); expect(calls).toBe(1);
});

import { expect, test } from "vitest";
import { b64url, canonicalize, keyIdOfSecret, newIncarnation, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { applicationDeviceIdentity, loadApplicationScreenContext, readApplicationInvitation } from "../src/application-screen.ts";
import { applicationScreenPath, readApplicationScreenAddress, readApplicationScreenContext } from "../src/application-route.ts";
const id = (letter: string): Digest => `sha256:${letter.repeat(64)}`;
const scope = (kind: ScopeKind, ordinal: number): ScopeRef => ({ kind, scope: scopeIdOf({ v: 1, kind, definition: id("a"), creator: null, cause: id("b"), ordinal }), inc: newIncarnation(new Uint8Array(16).fill(ordinal)) });
const directory = scope("directory", 1), presentation = id("c");
// Invariant: one screen address cannot alias another room, install or exact
// presentation, or turn an asset suffix into a relative path traversal.
test("screen addresses have one bounded spelling and preserve nested entry paths", () => {
  const base = applicationScreenPath(directory.scope, 7, presentation);
  expect(readApplicationScreenAddress(base + "screens/main.js")).toEqual({ directory: directory.scope, item: 7, presentation, base, asset: "screens/main.js" });
  expect(readApplicationScreenAddress(base + "_/context")?.asset).toBe("_/context");
  for (const path of [base.replace("/7/", "/07/"), base.replace("%3A", ":"), base.replace("%3A", "%3a"), base + "../private", base + "a//b", base + "a%2fb", base + "a\\b", base + "_private", base + "a?secret=TEST", base + "a#fragment"]) expect(readApplicationScreenAddress(path), path).toBeNull();
});
// Invariant: untrusted metadata must match this page and origin and be an
// owned value; it supplies routing data only, never a native grant.
test("screen context owns exact native routing metadata and rejects mismatched bindings", async () => {
  const address = readApplicationScreenAddress(applicationScreenPath(directory.scope, 7, presentation))!;
  const body = { v: 1, origin: "https://scope.example", deployment: "test", directory, rules: scope("rules", 2), membership: scope("membership", 3), destination: scope("destination", 4), scope: scope("lane", 5),
    item: 7, definition: id("d"), ids: { release: id("e"), semantic: id("f"), presentation }, membershipDefinition: "platform:membership@7" };
  const read = () => readApplicationScreenContext(body, address, body.origin);
  const context = read(); expect(context).toEqual(body); expect(Object.isFrozen(context.ids)).toBe(true); expect(Object.isFrozen(context.scope)).toBe(true);
  let reads = 0;
  const loaded = await loadApplicationScreenContext(body.origin + address.base + "screens/index.html#private-invitation", { fetch: async (url, init) => {
    reads++; expect(url).toBe(body.origin + address.base + "_/context"); expect(init?.headers).toEqual({ accept: "application/json" });
    expect(init).toMatchObject({ method: "GET", redirect: "error", credentials: "omit" });
    return new Response(canonicalize(body));
  } });
  expect(loaded).toEqual(context); expect(reads).toBe(1);
  expect(await loadApplicationScreenContext(body.origin + "/legacy", { fetch: async () => { throw Error("No metadata outside generic route"); } })).toBeNull();
  await expect(loadApplicationScreenContext(body.origin + address.base, { fetch: async () => new Response(canonicalize({ ...body, item: 8 })) })).rejects.toThrow();
  await expect(loadApplicationScreenContext(body.origin + address.base, { fetch: async () => new Response(new Uint8Array(16 * 1024 + 1)) })).rejects.toThrow();
  const seed = new Uint8Array(32).fill(23), publicKey = keyIdOfSecret(seed);
  const link = { v: 1, service: body.origin, definition: "platform:membership@7", repository: { directory: body.directory, membership: body.membership, rules: body.rules.scope, destination: body.destination.scope }, invitation: 1, secret: b64url(seed), handle: "@browser" };
  const encoded = (value: unknown) => "artroom-invite:" + b64url(utf8(canonicalize(value)));
  const invited = readApplicationInvitation(context, encoded(link));
  expect(invited.ok).toBe(true); if (!invited.ok) throw Error("Matching native invitation must be read");
  expect(readApplicationInvitation(context, encoded({ ...link, repository: { ...link.repository, directory: scope("directory", 9) } })).ok).toBe(false);
  expect(readApplicationInvitation(context, encoded({ ...link, definition: "platform:membership@6" })).ok).toBe(false);
  const archived = readApplicationScreenContext({ ...body, membershipDefinition: "platform:membership@8" }, address, body.origin);
  expect(archived.membershipDefinition).toBe("platform:membership@8");
  expect(readApplicationInvitation(archived, encoded({ ...link, definition: "platform:membership@8" })).ok).toBe(true);
  expect(readApplicationInvitation(archived, encoded(link)).ok).toBe(false);
  expect(applicationDeviceIdentity(context, invited.seat, publicKey)).toMatchObject({ scope: body.scope, definition: body.definition, membership: body.membership, member: { membership: body.membership, member: "@browser" }, publicKey });
  expect(() => applicationDeviceIdentity(context, { ...invited.seat, membership: scope("membership", 9) }, publicKey)).toThrow();
  body.ids.release = id("a"); expect(context.ids.release).toBe(id("e"));
  for (const changed of [{ item: 8 }, { directory: scope("directory", 6) }, { ids: { ...body.ids, presentation: id("a") } }, { scope: directory }, { origin: "https://other.example" }, { membershipDefinition: "platform:membership@6" }, { membershipDefinition: "platform:membership@9" }, { membershipDefinition: ["platform:membership@8"] }, { arbitrary: true }]) expect(() => readApplicationScreenContext({ ...body, ...changed }, address, body.origin)).toThrow();
  let calls = 0; Object.defineProperty(body, "deployment", { enumerable: true, get: () => { calls++; return "test"; } });
  expect(read).toThrow(); expect(calls).toBe(0);
});

/** Native installed TEST application, declared root/child creation, issued
 * session reads and SQLite. Package peer, clock, scheduler and reviewed
 * archive policy are explicit fixtures. No provider or production admission.
 * This development witness must be integrated again on reviewed G5a/S2a Main. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest, type Input, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isSeed, scopeIdOf, timeOf } from "@generalbusiness/artroom-bytes";
import { outcomeValueDomains, ownersOf, validateDefinition, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { DECLARED_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/artroom-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { journalRef } from "@generalbusiness/artroom-git/journal";
import { readJournalArchive } from "@generalbusiness/artroom-git/journal-reader";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { planArchive } from "../src/archive-build.ts";
import { ARCHIVE_SOURCE_PINS, FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import type { ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket } from "./support/application-owned-scopes-fixture.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { archiveSql } from "./support/archive.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";

const inline = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
// Finite actual declaration/native-owner metadata. This explicit TEST
// registry is separate from source identity and supplies no certificate.
function reviewed(pin: Digest | PlatformDefinition, declaration?: unknown): ReviewedArchivePolicy {
  const native = isDigest(pin) ? null : platform(pin);
  const checked = validateDefinition(native?.data ?? declaration, PROPOSED_BOUNDS, RULE_PROFILES,
    native ? { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) } : {});
  if (!checked.ok) throw Error("Fixture policy requires a validated exact declaration.");
  const owners = new Map<string, Map<string, OperationRules>>();
  if (native && !isDigest(pin)) {
    const code = ownersOf(checked.definition, { named: pin, rules: native.rules }, null), kinds = new Map<string, OperationRules>();
    for (const kind of Object.keys(native.data.outcomes ?? {})) {
      const rules = code?.rules(pin, kind); if (!rules) throw Error("Fixture native outcome needs its actual rules.");
      kinds.set(kind, rules);
    }
    owners.set(pin, kinds);
  }
  return { review: "TEST fixture inline class/owner coverage; no production permission", entryTypes: inline,
    support: { named: pin, definition: checked.definition, owners, records: new Map(), preparations: new Map() } };
}

test("installed root and child export their genuine genesis after later native acts", async () => {
  const { packet, root, child, rootId, childId } = await applicationOwnedScopesPacket();
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort requires three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native install."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const installed = await life.wait(() => new McpService(port).call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-archive-installed-scopes" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootCreate || !isSeed(rootCreate.to)) throw Error("Directory must genuinely create the installed root.");
    const rootScope = life.platform(scopeIdOf(rootCreate.to)); await driveFixture([R, D, M, A, G, rootScope], life.wait);
    const childCreate = (await life.wait(() => rootScope.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childCreate || !isSeed(childCreate.to)) throw Error("Installed root must genuinely create its child.");
    const childScope = life.platform(scopeIdOf(childCreate.to)); await driveFixture([R, D, M, A, G, rootScope, childScope], life.wait);
    for (const scope of [rootScope, childScope]) await life.wait(async () => scope.did(rita, "bump", { on: 0, expected: await scope.expected({ on: 0 }) }));
    const issued = await life.owner.required(() => requestSession(port.service, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch: routed }));
    if (!issued.ok) throw Error("Native membership must issue the fixture read session.");
    const handle = (scope: typeof rootScope.name) => new ScopeHandle(httpTransport(port.service, { fetch: routed }), scope, issued.session.reader());
    const histories = [];
    for (const scope of [rootScope, childScope]) {
      const read = await life.owner.required(() => handle(scope.name).history());
      if (!read.ok) throw Error("Issued session must read the installed journal.");
      expect(read.complete).toBe(true); expect(read.next).toBeUndefined();
      expect(read.value[0]?.entry.seq).toBe(0); expect(read.value.at(-1)?.entry.seq).toBeGreaterThan(0);
      histories.push({ scope, read });
    }
    const declarations = new Map([[rootId, root], [childId, child]]), policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>([[rootId, reviewed(rootId, root)], [childId, reviewed(childId, child)]]);
    const sourceRefs = new Map(histories.flatMap(({ read }) => read.value.flatMap(sealed => sealed.entry.uses.map(use => [canonicalize(use.fact.at), use.fact.at] as const))));
    expect(sourceRefs.size).toBeGreaterThan(0); expect(sourceRefs.size).toBeLessThanOrEqual(ARCHIVE_SOURCE_PINS);
    const births: FixtureArchiveSourceBirth[] = [];
    for (const source of sourceRefs.values()) {
      // Existing issued-session reader, before any archive inventory frame.
      const birth = await life.owner.required(() => handle(source.scope).entry(0));
      if (!birth.ok || birth.value.entry.input.type !== "genesis") throw Error("Actual native graph birth is required.");
      const pin = birth.value.entry.input.seed.definition, declaration = isDigest(pin) ? declarations.get(pin) : undefined;
      births.push({ at: source, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, ...(declaration ? { declaration: canonicalize(declaration) } : {}) });
      if (!policies.has(pin)) policies.set(pin, reviewed(pin, declaration));
    }
    const fixtureSources = new FixtureArchiveSourcePins(births, PROPOSED_BOUNDS, new ArchiveBudget());
    for (const { scope, read } of histories) {
      // Late fixture configuration: both genuine births and subsequent acts
      // already exist. Actual S2a directory binding remains a separate step.
      const at = await life.wait(() => scope.at());
      const planned = await life.wait(() => runInDurableObject(scope.object, (_instance, state) => planArchive(archiveSql(state), { at, through: read.at, bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources }, new ArchiveBudget())));
      expect(planned.ok, JSON.stringify(planned)).toBe(true); if (!planned.ok) return;
      expect(planned.archive.selection.entries[0]!.seq).toBe(0);
      expect(planned.archive.manifest.foreignSources?.length).toBeGreaterThan(0);
      const objects = new Map(planned.archive.objects.map(object => [object.id, object])), budget = new ArchiveBudget(); let bytes = 0;
      const opened = await readJournalArchive({ format: async () => "sha1", resolve: async ref => ref === journalRef(scope.name) ? planned.archive.commit : null,
        object: async (id, limit) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, scope.name, Object.assign(budget, { bytes: (size: number) => { bytes += size; if (bytes > 8 * 1024 * 1024) budget.stop("limit"); }, scope: () => budget.spend({ nodes: 1 }) }));
      expect(opened.ok, JSON.stringify(opened)).toBe(true); if (!opened.ok) return;
      expect(opened.archive.entries.map(entry => entry.bytes)).toEqual(read.value.map(sealed => canonicalize(sealed.entry)));
      expect(opened.archive.foreignSources).toEqual(planned.archive.manifest.foreignSources);
      expect(opened.archive.head).toEqual(read.at);
    }
  } finally { life.release(); }
}, 30_000);

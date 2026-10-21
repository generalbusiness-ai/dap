/** Native installed TEST application, declared root/child creation, issued
 * session reads and SQLite. Package peer, clock, scheduler and reviewed
 * archive policy are explicit fixtures. No provider or production admission.
 * Device replies are explicit TEST owner input, not physical execution. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type FactRef, type Head, type Input, type PlatformDefinition, type ScopeId, type Sealed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isDigest, isEntry, isSeed, parseStrict, scopeIdOf, textDigest, timeOf, unb64url } from "@generalbusiness/artroom-bytes";
import { readApplicationPackage2 } from "@generalbusiness/artroom-bytes/application-v2";
import { outcomeValueDomains, ownersOf, validateDefinition, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, platform } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/artroom-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { archiveSource, verifyArchive, TRUSTS } from "@generalbusiness/artroom-replay";
import { buildJournalPass, journalRef, verifyJournalAppend, type JournalArchive, type JournalObject, type JournalPassArchive } from "@generalbusiness/artroom-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveInput } from "../src/archive-input.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { ArchiveForeignMetadata } from "../src/archive-foreign.ts";
import { fixtureArchiveTargetIn } from "../src/archive-target.ts";
import { archiveReplayAnchors } from "../src/archive-anchors.ts";
import { planArchive, planArchivePass } from "../src/archive-build.ts";
import { ARCHIVE_SOURCE_PINS, FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import type { ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket } from "./support/application-owned-scopes-fixture.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { localClone } from "./support/local-clone.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { archiveSql } from "./support/archive.ts";
import { namespace } from "../src/namespace.ts";
import { readNativeBirth } from "../src/native-birth.ts";
import { DEVICE_COMMAND_ARCHIVE_PREPARATIONS, DEVICE_COMMAND_ARCHIVE_RECORDS } from "../src/archive-privacy.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import type {} from "./support/maintained-applications.ts";

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
  const device = checked.definition.declared.capabilities.some(capability => `${capability.name}@${capability.version}` === DEVICE_COMMAND);
  return { review: "TEST fixture inline class/owner coverage; no production permission", entryTypes: inline,
    support: { named: pin, definition: checked.definition, owners,
      ...(device ? { capabilities: CAPABILITY_CODE } : {}),
      records: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]) : new Map(),
      preparations: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) : new Map(),
    } };
}

test.for(["fixture", "Grow"])("installed %s scopes export genesis zero after a late native Membership8 directory binding", { timeout: 30_000 }, async (kind, context) => {
  const prepared = kind === "fixture" ? await applicationOwnedScopesPacket() : (() => {
    const captured = inject("maintainedApplications").grow, bytes = unb64url(captured.bytes);
    if (!bytes) throw Error("The maintained TEST Grow packet must be captured.");
    const packet = readApplicationPackage2(bytes, captured.release), rootId = packet.package.semantic.entry, childId = packet.package.semantic.projections["grid"]!.definition;
    const definition = (id: Digest) => parseStrict(packet.package.semantic.definitions.find(part => part.id === id)!.bytes) as DeclaredDefinition;
    return { packet, rootId, childId, root: definition(rootId), child: definition(childId) };
  })();
  const { packet, root, child, rootId, childId } = prepared;
  const C = kind === "fixture" ? ARCHIVE_DECLARED_APPLICATION_COHORT : ARCHIVE_DEVICE_APPLICATION_COHORT;
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort requires three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    expect((await life.wait(() => M.summary())).value.definition).toBe("platform:membership@8");
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native install."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"],
      values: kind === "Grow" ? { label: "TEST archive Grow Site" } : {},
      ...(kind === "Grow" ? { owner: { membership, member: "@rita" } } : {}), idempotencyKey: "TEST-archive-installed-scopes" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootCreate || !isSeed(rootCreate.to)) throw Error("Directory must genuinely create the installed root.");
    const rootScope = life.platform(scopeIdOf(rootCreate.to)); await driveFixture([R, D, M, A, G, rootScope], life.wait);
    if (kind === "Grow") {
      await life.wait(() => rootScope.did(rita, "create-room", { fields: { label: "TEST archive Grow Room" } }));
      await dispatchFixture([R, D, M, A, G, rootScope], life.wait);
    }
    const childCreate = (await life.wait(() => rootScope.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childCreate || !isSeed(childCreate.to)) throw Error("Installed root must genuinely create its child.");
    const childScope = life.platform(scopeIdOf(childCreate.to)); await driveFixture([R, D, M, A, G, rootScope, childScope], life.wait);
    if (kind === "fixture") for (const scope of [rootScope, childScope]) await life.wait(async () => scope.did(rita, "bump", { on: 0, expected: await scope.expected({ on: 0 }) }));
    else {
      const zone = await life.wait(() => childScope.did(rita, "commission-zone", { fields: { label: "TEST Zone", setpoint: 2400, band: 200 } }));
      const heater = await life.wait(async () => childScope.did(rita, "commission-device", { fields: { zone, kind: "heater", label: "TEST Heater", minLevel: 0, maxLevel: 100, target: "off", level: 0 }, expected: await childScope.expected({ zone }) }));
      const command = await life.wait(async () => childScope.did(rita, "set-heater", { on: heater, fields: { target: "on", level: 100 }, expected: await childScope.expected({ on: heater }) }));
      const sealed = (await life.wait(() => childScope.sealed())).find(entry => entry.entry.seq === command)!;
      const answer = await life.wait(() => mcp.call("prepare", { resource: childScope.name, capability: DEVICE_COMMAND, step: "answer", idempotencyKey: "TEST-archive-Grow-owner-answer",
        fields: { command: { at: sealed.entry.at, seq: command, hash: sealed.hash }, outcome: "confirmed", description: "TEST native owner reply" },
      }));
      expect(answer.isError, JSON.stringify(answer.structuredContent)).toBe(false);
      expect(answer.structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
      expect(await life.wait(() => childScope.item(heater))).toMatchObject({ values: { outcome: "confirmed" } });
    }
    const beforeBinding = await Promise.all([rootScope, childScope].map(scope => life.wait(() => scope.summary())));
    expect((await life.wait(() => D.item(0))).values["archive"]).toBeNull();
    await life.wait(async () => D.did(rita, "bind-archive", { on: 0, fields: { archive: "journal" }, expected: await D.expected({ on: 0 }) }));
    expect((await life.wait(() => D.item(0))).values["archive"]).toBe("journal");
    expect(await Promise.all([rootScope, childScope].map(scope => life.wait(() => scope.summary())))).toEqual(beforeBinding);
    const issued = await life.owner.required(() => requestSession(port.service, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch: routed }));
    if (!issued.ok) throw Error("Native membership must issue the fixture read session.");
    const handle = (scope: typeof rootScope.name) => new ScopeHandle(httpTransport(port.service, { fetch: routed }), scope, issued.session.reader());
    const histories: { scope: typeof rootScope; read: { value: readonly Sealed[]; at: Head } }[] = [];
    for (const scope of [rootScope, childScope]) {
      const read = await life.owner.required(() => handle(scope.name).history());
      if (!read.ok) throw Error("Issued session must read the installed journal.");
      expect(read.complete).toBe(true); expect(read.next).toBeUndefined();
      expect(read.value[0]?.entry.seq).toBe(0); expect(read.value.at(-1)?.entry.seq).toBeGreaterThan(0);
      if (kind === "Grow" && scope.name === childScope.name) {
        expect(read.value.some(row => row.entry.input.type === "preparation" && row.entry.input.capability === DEVICE_COMMAND && row.entry.input.step === "answer")).toBe(true);
        expect(read.value.flatMap(row => row.entry.effects)).toContainEqual(expect.objectContaining({ effect: "record", capability: DEVICE_COMMAND, kind: "command" }));
      }
      histories.push({ scope, read });
    }
    const declarations = new Map([[rootId, root], [childId, child]]), policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>([[rootId, reviewed(rootId, root)], [childId, reviewed(childId, child)]]);
    const childBirth = histories[1]!.read.value[0]!.entry;
    if (childBirth.input.type !== "genesis") throw Error("Actual installed child birth is required.");
    const childSeed = childBirth.input.seed;
    const discoveryBudget = new ArchiveBudget();
    const discovery = kind === "Grow" ? await life.wait(() => fixtureArchiveTargetIn(env.PLATFORM, {
      fixture: "archive-target-reader", value: issued.session.reader(),
    }).discover(childBirth.at, childSeed, discoveryBudget)) : null;
    if (kind === "Grow") {
      expect(discovery?.repository).toEqual((await life.wait(() => D.item(0))).values["repository"]);
      expect(discovery?.scopes.map(scope => ({ scope: scope.at.scope, named: scope.named, via: scope.via }))).toEqual([
        { scope: childScope.name, named: childId, via: "self" },
        { scope: rootScope.name, named: rootId, via: "creator" },
        { scope: D.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.directory, via: "creator" },
        { scope: A.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.rules, via: "rules" },
        { scope: G.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.destination, via: "destination" },
      ]);
      if (!discovery) throw Error("The bound native producer graph must be discovered.");
    }
    // Native TEST exports of the room's native producer scopes.
    // These self-journal reads use the fixture inspector, not a new grant.
    // Credential Membership history is deliberately absent.
    const nativeHistories = [];
    for (const selected of discovery?.scopes.filter(selected => !histories.some(history => history.scope.name === selected.at.scope)) ?? []) {
      const scope = life.platform(selected.at.scope);
      expect(await life.wait(() => scope.at())).toEqual(selected.at);
      const value = await life.wait(() => scope.sealed()), last = value.at(-1);
      if (!last) throw Error("The native producer must have its actual genesis.");
      nativeHistories.push({ scope, read: { value, at: { seq: last.entry.seq, hash: last.hash } } });
    }
    const preparedHistories = [...histories, ...nativeHistories];
    const allHistories = discovery ? discovery.scopes.map(selected => preparedHistories.find(history => history.scope.name === selected.at.scope)!) : preparedHistories;
    const sourceRefs = new Map(allHistories.flatMap(({ read }) => read.value.flatMap(sealed => sealed.entry.uses.map(use => [canonicalize(use.fact.at), use.fact.at] as const))));
    expect(sourceRefs.size).toBeGreaterThan(0); expect(sourceRefs.size).toBeLessThanOrEqual(ARCHIVE_SOURCE_PINS);
    const births: FixtureArchiveSourceBirth[] = [];
    for (const source of sourceRefs.values()) {
      if (kind === "fixture") {
        // Preserve the original issued-session boundary for the declaration
        // fixture. Its Directory14 is a foreign source, not a self-export.
        const birth = await life.owner.required(() => handle(source.scope).entry(0));
        if (!birth.ok || birth.value.entry.input.type !== "genesis") throw Error("Actual native graph birth is required.");
        const pin = birth.value.entry.input.seed.definition, declaration = isDigest(pin) ? declarations.get(pin) : undefined;
        births.push({ at: source, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, ...(declaration ? { declaration: canonicalize(declaration) } : {}) });
        if (!policies.has(pin)) policies.set(pin, reviewed(pin, declaration));
        continue;
      }
      // Existing bounded native metadata port, before inventory. It is not
      // read authority or an archive policy; the separate TEST table owns policy.
      const birth = readNativeBirth(await life.wait(() => namespace(env.PLATFORM).births.read(source, 10_000, 256 * 1024)), source, 256 * 1024);
      if (!birth) throw Error("Actual native graph birth is required.");
      const pin = birth.named, declaration = isDigest(pin) ? declarations.get(pin) : undefined;
      births.push({ at: source, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(declaration ? { declaration: canonicalize(declaration) } : {}) });
      if (!policies.has(pin)) policies.set(pin, reviewed(pin, declaration));
    }
    for (const { scope } of nativeHistories) {
      const pin = (await life.wait(() => scope.summary())).value.definition;
      if (!pin) throw Error("The native scope must pin its actual definition.");
      if (!policies.has(pin)) policies.set(pin, reviewed(pin));
    }
    const fixtureSources = new FixtureArchiveSourcePins(births, PROPOSED_BOUNDS, new ArchiveBudget());
    const sourceLookups: (Digest | PlatformDefinition | "missing")[] = [], sourceGet = fixtureSources.get.bind(fixtureSources);
    fixtureSources.get = (at, budget) => {
      const source = sourceGet(at, budget);
      if (sourceLookups.length === 32) sourceLookups.shift();
      sourceLookups.push(source?.pin ?? "missing");
      return source;
    };
    // Record only references and counts at the credential refusal boundary.
    // No membership journal or body is selected for an archive.
    const credentialCopies = allHistories.flatMap(({ scope, read }) => read.value.flatMap(sealed => sealed.entry.uses
      .filter(use => fixtureSources.get(use.fact.at, new ArchiveBudget())?.pin === "platform:membership@8")
      .map(use => ({ consumer: { at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash },
        input: sealed.entry.input.type, source: use.fact, content: use.content, journal: scope.name }))));
    const credentialCounts = allHistories.map(({ scope }) => ({ scope: scope.name,
      entries: new Set(credentialCopies.filter(copy => copy.journal === scope.name).map(copy => copy.consumer.seq)).size,
      copies: credentialCopies.filter(copy => copy.journal === scope.name).length }));
    // First witness the three actual copies at the native metadata boundary.
    // Whole-export admission and offline replay are separate checks below.
    for (const copy of credentialCopies) {
      const history = allHistories.find(history => history.scope.name === copy.journal)!;
      const sealed = history.read.value.find(sealed => sealed.entry.seq === copy.consumer.seq)!;
      const pin = (await life.wait(() => history.scope.summary())).value.definition!;
      const admitted = await life.wait(() => runInDurableObject(history.scope.object, (_instance, state) => {
        const metadata = new ArchiveForeignMetadata(archiveSql(state), fixtureSources, policies, PROPOSED_BOUNDS, new ArchiveBudget(), new Set(), pin);
        metadata.scan({ seq: sealed.entry.seq, hash: sealed.hash, bytes: new TextEncoder().encode(canonicalize(sealed.entry)).length }, sealed.entry.uses.length);
        return metadata.selection().map(held => ({ fact: held.fact, content: held.content }));
      }));
      expect(admitted).toContainEqual({ fact: copy.source, content: copy.content });
    }
    const diagnosticArchives = new Map<ScopeId, JournalArchive | JournalPassArchive>();
    const passAnchors = new Map<ScopeId, readonly FactRef[]>();
    const passSelections = new Map<ScopeId, string>();
    const sharedPassFootprints: unknown[] = [], sharedWholePassFootprints: unknown[] = [];
    if (kind === "Grow") {
      // Invariant: native domain permission belongs to its exact declared
      // place. A TEST owner table cannot relocate it or add another domain.
      const pin = "platform:rules@10", original = policies.get(pin)!;
      const owner = original.support.owners.get(pin)!, history = allHistories.find(history => history.scope.name === A.name)!;
      const actual = owner.get("fetch-application");
      if (!actual) throw Error("The actual Rules fetch owner must be configured.");
      for (const domain of ["dap-application-release-2", "TEST-unlisted-native-value"]) {
        const owners = new Map(original.support.owners), kinds = new Map(owner);
        kinds.set("fetch-application", { ...actual, valueDomains: [{ domain, max: 4096 }] });
        owners.set(pin, kinds);
        const bad = new Map(policies);
        bad.set(pin, { ...original, support: { ...original.support, owners } });
        const result = await life.wait(() => runInDurableObject(A.object, (_instance, state) => planArchive(archiveSql(state), {
          at: history.read.value[0]!.entry.at, through: history.read.at, bounds: PROPOSED_BOUNDS, policies: bad,
          format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources,
        }, new ArchiveBudget())));
        expect(result).toEqual({ ok: false, reason: "unsupported-custom-domain" });
      }
    }
    for (const { scope, read } of allHistories) {
      // Both births and later native acts precede the actual directory
      // binding. Source/policy configuration remains an explicit A2/A3 fixture.
      const at = await life.wait(() => scope.at());
      sourceLookups.length = 0;
      const planned = await life.wait(() => runInDurableObject(scope.object, async (_instance, state) => await (kind === "Grow" ? planArchivePass : planArchive)(archiveSql(state), { at, through: read.at, after: null, bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources,
        ...(discovery ? { replayScopes: discovery.scopes.map(scope => scope.at) } : {}),
      }, new ArchiveBudget())));
      expect(planned.ok, JSON.stringify({ kind, scope: scope.name, definition: (await life.wait(() => scope.summary())).value.definition, planned, sourceLookups, credentialCounts, credentialCopies })).toBe(true); if (!planned.ok) return;
      diagnosticArchives.set(scope.name, planned.archive);
      passSelections.set(scope.name, planned.mark.manifest);
      if (planned.anchors) passAnchors.set(scope.name, planned.anchors);
      expect(planned.archive.selection.entries[0]!.seq).toBe(0);
      expect(planned.archive.manifest.foreignSources?.length).toBeGreaterThan(0);
      const objects = new Map(planned.archive.objects.map(object => [object.id, object])), budget = new ArchiveBudget(); let bytes = 0;
      const opened = await readJournalRepositoryArchive({ format: async () => "sha1", resolve: async ref => ref === journalRef(scope.name) ? planned.archive.commit : null,
        object: async (id, limit) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, scope.name, Object.assign(budget, { bytes: (size: number) => { bytes += size; if (bytes > 8 * 1024 * 1024) budget.stop("limit"); }, scope: () => budget.spend({ nodes: 1 }) }));
      expect(opened.ok, JSON.stringify(opened)).toBe(true); if (!opened.ok) return;
      expect(opened.archive.entries.map(entry => entry.bytes)).toEqual(read.value.map(sealed => canonicalize(sealed.entry)));
      expect(opened.archive.foreignSources).toEqual(planned.archive.manifest.foreignSources);
      expect(opened.archive.head).toEqual(read.at);
      if (kind === "Grow") {
        // Invariant: every actual fixture entry fits alone, with its own
        // retained paths and original native inventory plus append charges.
        // These diagnostic commits are not marked or remotely confirmed.
        sharedWholePassFootprints.push({ scope: scope.name, entries: planned.archive.selection.entries.length,
          cost: planned.archive.cost, inventoryNodes: (JSON.parse(planned.mark.manifest) as { cost: { nodes: number } }).cost.nodes,
          qualification: "Original default budget pays native inventory and writing. Initial whole-prefix pass, no append validator or remote confirmation." });
        const held = new Map<string, JournalObject>(); let parent: string | null = null, after: Head | null = null;
        const written = new Set<string>(), expected = new Set(planned.archive.selection.objects.map(row =>
          row.key.kind === "value" ? `value/${row.key.domain}` : row.key.kind));
        for (const sealed of read.value) {
          const through = { seq: sealed.entry.seq, hash: sealed.hash };
          const old: string | null = parent, receipt: Head | null = after;
          const source = { object: async (id: string, limit: number) => {
            const object = held.get(id); return object ? { type: object.type, size: object.data.length,
              data: object.data.length <= limit ? object.data : null } : null;
          } };
          type Footprint = { ok: false; one: unknown; cost: ArchiveCost } | { ok: true;
            one: Extract<Awaited<ReturnType<typeof planArchivePass>>, { ok: true }>;
            appended: Awaited<ReturnType<typeof verifyJournalAppend>> | null; inventoryNodes: number; cost: ArchiveCost };
          const result: Footprint = await life.wait((): Promise<Footprint> => runInDurableObject(scope.object, async (_instance, state): Promise<Footprint> => {
            const budget = new ArchiveBudget();
            const one = await planArchivePass(archiveSql(state), { at, through, after: receipt, bounds: PROPOSED_BOUNDS, policies,
              format: "sha1", parent: old ? { id: old, source } : null, markedAt: timeOf(life.now()), fixtureSources,
              replayScopes: discovery!.scopes.map(scope => scope.at) }, budget);
            if (!one.ok) return { ok: false as const, one, cost: budget.admitted() };
            const inventoryNodes = (JSON.parse(one.mark.manifest) as { cost: { nodes: number } }).cost.nodes;
            for (const object of one.archive.objects) held.set(object.id, object);
            const appended: Awaited<ReturnType<typeof verifyJournalAppend>> | null = old === null ? null : await verifyJournalAppend({ format: "sha1", at, old, commit: one.archive.commit, source, budget });
            return { ok: true as const, one, appended, inventoryNodes, cost: budget.admitted() };
          }));
          expect(result.ok, JSON.stringify({ scope: scope.name, through, result })).toBe(true); if (!result.ok) return;
          expect(result.appended, JSON.stringify({ scope: scope.name, through, result })).toEqual(old === null ? null : { ok: true });
          expect(result.one.archive.selection.entries.map(row => row.seq)).toEqual([through.seq]);
          const keys = result.one.archive.manifest.retained.filter(row => row.pass === through.seq);
          const kinds = new Set(keys.map(row => row.kind)), domains = new Set(keys.flatMap(row => row.kind === "value" ? [row.domain] : []));
          const namedKinds = new Set(result.one.archive.manifest.retained.map(row => row.kind));
          const namedDomains = new Set(result.one.archive.manifest.retained.flatMap(row => row.kind === "value" ? [row.domain] : []));
          for (const row of keys) written.add(row.kind === "value" ? `value/${row.domain}` : row.kind);
          sharedPassFootprints.push({ scope: scope.name, seq: through.seq,
            inventoryNodes: result.inventoryNodes, nodes: result.cost.nodes, cost: result.cost, appendValidated: old !== null,
            kinds: [...kinds].sort(), domains: [...domains].sort(), kindAndDomainCount: kinds.size + domains.size,
            namedKinds: [...namedKinds].sort(), namedDomains: [...namedDomains].sort(), namedKindAndDomainCount: namedKinds.size + namedDomains.size });
          parent = result.one.archive.commit; after = through;
        }
        expect([...written].sort()).toEqual([...expected].sort());
      }
    }
    if (kind === "Grow") (context.task.meta as Record<string, unknown>)["sharedPassNativeFootprints"] = {
      passes: sharedPassFootprints, wholePasses: sharedWholePassFootprints,
      qualification: "Actual installed Grow and its discovered native Directory16, Rules10 and Destination12 histories. Each diagnostic one-entry pass uses one original default30s ledger for fresh native inventory, canonical Git build and, for each noninitial pass, append validation. Genesis has no prior append and no append-validator claim. Real fixture entries and retained bytes; explicit TEST package peer, owner input, policy/source/authority configuration and scheduler. No remote confirmation, production admission or deployed cadence claim. Kind/domain counts concern these fixture entries, not all theoretically possible native entries."
    };
    if (kind === "Grow") {
      // A constructed enrol copy and a listed kind with a nested secret
      // must refuse the whole export before any body/integrity read. The
      // copied digest is intentionally unchanged: this is the earlier
      // metadata refusal boundary, not a forged journal acceptance test.
      const copy = credentialCopies.find(copy => copy.journal === D.name && copy.source.seq === 5);
      const act = (await life.wait(() => M.sealed())).find(sealed => sealed.entry.input.type === "act")?.entry.input;
      if (!copy || act?.type !== "act") throw Error("Native Membership copy and signed act are required.");
      const refused = await life.wait(() => runInDurableObject(D.object, async (_instance, state) => {
        const sql = archiveSql(state), held = sql.exec("SELECT bytes FROM retained_input WHERE kind = 'entry' AND digest = ? LIMIT 1", copy.content).toArray()[0]?.["bytes"];
        if (typeof held !== "string") throw Error("Actual retained Membership bytes are required.");
        const entry = parseStrict(held);
        if (!isEntry(entry) || entry.input.type !== "delivery") throw Error("The native grant reply copy is required.");
        const enrol = canonicalize({ ...entry, input: { type: "act", signed: { ...act.signed, intent: { ...act.signed.intent, kind: "enrol", fields: { invitation: 1, proof: "TEST" } } }, authority: [], presented: {} } });
        const secret = canonicalize({ ...entry, input: { ...entry.input, extra: [{ secret: "TEST must never be exported" }] } });
        const results = [];
        try {
          for (const bytes of [enrol, secret, secret.replace('"secret":', '"\\u0073ecret":')]) {
            sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", bytes, copy.content);
            results.push(await planArchive(sql, { at: copy.consumer.at, through: allHistories.find(history => history.scope.name === D.name)!.read.at,
              bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources }, new ArchiveBudget()));
          }
        } finally { sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", held, copy.content); }
        return results;
      }));
      expect(refused).toEqual(Array.from({ length: 3 }, () => ({ ok: false, reason: "unsupported-credential-cohort" })));
    }
    if (kind === "fixture") return;
    const directorySelection = diagnosticArchives.get(D.name)!.selection;
    const replayScopes = discovery!.scopes.map(scope => scope.at);
    // A missing ordinary producer cannot silently become caller trust.
    expect(() => archiveReplayAnchors(directorySelection, replayScopes.filter(at => at.scope !== A.name), new ArchiveBudget()))
      .toThrow("unsupported-foreign-copy");
    const directoryGenesis = (await life.wait(() => D.sealed()))[0]!.entry;
    if (directoryGenesis.input.type !== "genesis" || !directoryGenesis.input.source) throw Error("Native directory needs its actual register claim.");
    const claim = directoryGenesis.input.source;
    const anchorFacts = [...new Map([...passAnchors.values()].flat().map(fact => [canonicalize(fact), fact])).values()]
      .sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq);
    const registerEntries = await life.wait(() => R.sealed()), memberEntries = await life.wait(() => M.sealed());
    // Independent fixture facts: three Register copies, two public
    // Membership copies and actual retained observation heads 4 and 6. These
    // expected fixture reads do not feed the export-derived anchor list.
    const expectedAnchors = [1, 2, 3].map(seq => registerEntries.find(entry => entry.entry.seq === seq)!)
      .concat([0, 4, 5, 6].map(seq => memberEntries.find(entry => entry.entry.seq === seq)!))
      .map(sealed => ({ at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash }))
      .sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq);
    expect(anchorFacts).toEqual(expectedAnchors);
    expect(anchorFacts).toContainEqual(claim);
    expect(anchorFacts.every(fact => !diagnosticArchives.has(fact.at.scope))).toBe(true);
    const anchors = anchorFacts.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash }));
    // A2 reads exactly the five self-journal archives,
    // without a service. Private facts and values observed at their heads
    // are caller-trusted; copied bodies supply no source proof.
    const diagnosticObjects = new Map([...diagnosticArchives.values()].flatMap(archive => archive.objects.map(object => [object.id, object] as const)));
    const diagnosticRefs = new Map([...diagnosticArchives].map(([scope, archive]) => [journalRef(scope), archive.commit]));
    const omittedDigest = "sha256:9e0a5a28346594dcd3a95794d1d66951691e6de65adc1582e788ba5ef3085530";
    const expectedOmissions = allHistories.flatMap(({ scope, read }) => {
      const manifest = diagnosticArchives.get(scope.name)!.manifest;
      if (manifest.v !== 2) throw Error("Grow must export native v2 passes.");
      return manifest.omitted.map(row => {
      if (!row.first || row.bytes === undefined) throw Error("A native unredacted omission must have count and first entry.");
      const first = read.value.find(sealed => sealed.entry.seq === row.first!.seq)!;
      return { digest: row.digest, bytes: row.bytes, first: { at: first.entry.at, seq: first.entry.seq, hash: first.hash } };
      });
    });
    // Independent scalar reads of the native retained bodies; no text bytes
    // are read or supplied to the offline verifier.
    for (const { scope } of allHistories) {
      const expected = expectedOmissions.filter(row => row.first.at.scope === scope.name);
      const sizes = await life.wait(() => runInDurableObject(scope.object, (_instance, state) => expected.map(row => ({
        digest: row.digest, size: archiveSql(state).exec("SELECT octet_length(bytes) AS size FROM retained_input WHERE kind = 'text' AND digest = ? LIMIT 1", row.digest).toArray()[0]?.["size"],
      }))));
      expect(sizes).toEqual(expected.map(row => ({ digest: row.digest, size: row.bytes })));
    }
    expect(expectedOmissions.some(row => row.digest === omittedDigest && row.first.at.scope === D.name && row.first.seq === 5)).toBe(true);
    const probe = allHistories[0]!;
    const memberHead = expectedAnchors.find(fact => fact.at.scope === M.name && fact.seq === 4)!;
    const rulesEntry = allHistories.find(history => history.scope.name === A.name)!.read.value[2]!;
    for (const missing of [expectedAnchors.find(fact => fact.at.scope === claim.at.scope && fact.seq === 1)!, memberHead]) for (const wrong of [false, true]) {
      const supplied = anchors.flatMap(anchor => anchor.scope === missing.at.scope && anchor.seq === missing.seq
        ? wrong ? [{ ...anchor, hash: textDigest("TEST wrong private source anchor") }] : [] : [anchor]);
      const offline = await life.wait(() => verifyArchive(archiveSource({ open: (at, work) => readJournalRepositoryArchive({
        format: async () => "sha1", resolve: async ref => diagnosticRefs.get(ref) ?? null,
        object: async (id, limit) => { const object = diagnosticObjects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, at, work) }), { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: probe.scope.name, head: probe.read.at, anchors: supplied }));
      expect(offline.kind).toBe("verification"); if (offline.kind !== "verification") return;
      if (!wrong) expect(offline.verification.report).toMatchObject({ result: "missing-dependency", dependencies: { missing: [missing] } });
      else expect(offline.verification.report).toMatchObject({ result: "mismatch", dependencies: { missing: [] } });
      if (missing === memberHead) expect(offline.verification.report.at).toEqual({ at: rulesEntry.entry.at, seq: 2, hash: rulesEntry.hash });
    }
    const offlineResults = [];
    for (const { scope, read } of allHistories) {
      const offline = await life.wait(() => verifyArchive(archiveSource({ open: (at, work) => readJournalRepositoryArchive({
        format: async () => "sha1", resolve: async ref => diagnosticRefs.get(ref) ?? null,
        object: async (id, limit) => { const object = diagnosticObjects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, at, work) }), { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: scope.name, head: read.at, anchors }));
      offlineResults.push({ scope: scope.name, head: read.at, offline });
      if (offline.kind === "verification" && offline.verification.report.result === "consistent") {
        expect(offline.verification.report.anchors.every(fact => anchorFacts.some(anchor => canonicalize(anchor) === canonicalize(fact)))).toBe(true);
        expect(offline.verification.report.trusts.some(trust => trust.includes("value observed at an anchored head"))).toBe(true);
        expect(offline.verification.report.incompleteBytes).toBeUndefined();
        for (const omission of offline.verification.report.omittedTexts ?? []) expect(expectedOmissions).toContainEqual(omission);
        if (scope.name !== G.name) {
          expect(offline.verification.report.omittedTexts?.some(row => row.digest === omittedDigest)).toBe(true);
          expect(offline.verification.report.trusts).toContain(TRUSTS.omitted);
        }
      }
    }
    const rootCopies = allHistories.flatMap(({ scope, read }) => read.value.flatMap(sealed => sealed.entry.uses
      .filter(use => use.fact.at.scope === claim.at.scope)
      .map(use => ({ journal: scope.name, consumer: { at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash }, source: use.fact, content: use.content }))));
    expect(offlineResults.every(result => result.offline.kind === "verification" && result.offline.verification.report.result === "consistent"),
      JSON.stringify({ kind, exported: allHistories.map(({ scope, read }) => ({ scope: scope.name, entries: read.value.length, head: read.at })),
        copyMetadataPassed: credentialCopies.length, domainRefusalsPassed: 2, credentialRefusalsPassed: 3, anchorRefusalsPassed: 4,
        discovery, discoveryCost: discoveryBudget.admitted(),
        anchorFacts, passAnchors: [...passAnchors], anchors, rootCopies, offlineResults })).toBe(true);
    expect(new Set(offlineResults.flatMap(result => result.offline.kind === "verification" ? result.offline.verification.report.anchors.map(canonicalize) : [])))
      .toEqual(new Set(anchorFacts.map(canonicalize)));
    expect(new Set(offlineResults.flatMap(result => result.offline.kind === "verification" ? (result.offline.verification.report.omittedTexts ?? []).map(canonicalize) : [])))
      .toEqual(new Set(expectedOmissions.map(canonicalize)));
    // Real Git materializes and mirror-clones only the native export. The
    // offline verifier below reads back the clone's objects, not this map.
    const cloned = await life.wait(() => localClone(inject("localClone")).archive(
      [...diagnosticObjects.values()].map(object => ({ id: object.id, type: object.type, data: b64url(object.data) })),
      [...diagnosticRefs].map(([ref, id]) => ({ ref, id })),
    ));
    expect(cloned.fsckPassed).toBe(true);
    expect([...cloned.refs].sort((a, b) => a.ref.localeCompare(b.ref))).toEqual([...diagnosticRefs].map(([ref, id]) => ({ ref, id })).sort((a, b) => a.ref.localeCompare(b.ref)));
    const clonedRefs = new Map(cloned.refs.map(row => [row.ref, row.id]));
    const clonedObjects = new Map(cloned.objects.map(object => {
      const data = unb64url(object.data); if (!data) throw Error("Clone fixture must return binary Git bytes.");
      return [object.id, { type: object.type, data }] as const;
    }));
    diagnosticObjects.clear();
    for (const { scope, read } of allHistories) {
      const replayed = await life.wait(() => verifyArchive(archiveSource({ open: (at, work) => readJournalRepositoryArchive({
        format: async () => "sha1", resolve: async ref => clonedRefs.get(ref) ?? null,
        object: async (id, limit) => { const object = clonedObjects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, at, work) }), { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: scope.name, head: read.at, anchors }));
      expect(replayed.kind).toBe("verification"); if (replayed.kind !== "verification") return;
      const original = offlineResults.find(result => result.scope === scope.name)!.offline;
      expect(original.kind).toBe("verification"); if (original.kind !== "verification") return;
      expect(replayed.verification.report).toEqual(original.verification.report);
    }
    for (const archive of diagnosticArchives.values()) for (const object of archive.objects) diagnosticObjects.set(object.id, object);
    // Corrupt only metadata of a native-produced Directory pass. The real
    // native entry/input port supplies unchanged bytes; no fake history.
    for (const corruption of ["missing", "extra"] as const) {
      const selection = JSON.parse(passSelections.get(D.name)!);
      const omission = selection.omittedTexts.find((row: { key: { digest: string } }) => row.key.digest === omittedDigest);
      expect(omission).toBeDefined();
      if (corruption === "missing") selection.omittedTexts = selection.omittedTexts.filter((row: { key: { digest: string } }) => row.key.digest !== omittedDigest);
      else selection.omittedTexts.push({ ...structuredClone(omission), key: { kind: "text", digest: textDigest("TEST unrelated Grow omission") } });
      const corrupt = await life.wait(() => runInDurableObject(D.object, (_instance, state) => {
        const budget = new ArchiveBudget(); budget.spend(selection.cost);
        return buildJournalPass({ format: "sha1", selection: canonicalize(selection), input: archiveInput(archiveSql(state), selection, budget, fixtureSources), parent: null, budget });
      }));
      expect(corrupt.ok ? "accepted" : corrupt).toBe("accepted"); if (!corrupt.ok) return;
      const objects = new Map(diagnosticObjects), refs = new Map(diagnosticRefs);
      for (const object of corrupt.archive.objects) objects.set(object.id, object);
      refs.set(journalRef(D.name), corrupt.archive.commit);
      const source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
        format: async () => "sha1", resolve: async ref => refs.get(ref) ?? null,
        object: async (id, limit) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, scope, work) });
      const directory = allHistories.find(history => history.scope.name === D.name)!;
      const replayed = await life.wait(() => verifyArchive(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: D.name, head: directory.read.at, anchors }));
      if (corruption === "missing") expect(replayed).toMatchObject({ kind: "verification", verification: { report: { result: "incomplete", at: { at: directory.read.value[5]!.entry.at, seq: 5, hash: directory.read.value[5]!.hash } } } });
      else expect(replayed).toMatchObject({ kind: "archive-failure", result: "refused" });
    }
    await context.annotate(JSON.stringify({
      scopes: discovery!.scopes, repository: discovery!.repository, anchorFacts, omittedTexts: expectedOmissions,
      clone: { gitVersion: cloned.gitVersion, sourceObjects: cloned.sourceObjects, clonedObjects: cloned.objects.length, refs: cloned.refs, fsckPassed: cloned.fsckPassed, offlineReportsEqual: allHistories.length },
      results: offlineResults.map(result => ({ scope: result.scope, head: result.head,
        result: result.offline.kind === "verification" ? result.offline.verification.report.result : result.offline.kind })),
      copies: credentialCounts, refusedDomains: 2, refusedCredentials: 3, anchorRefusals: 4,
      qualification: "Native test-host journals and issued reads; TEST package/owner/scheduler/policy/object repository. Explicit private facts and observed values on caller trust; Real local Git mirror clone and five offline reports; no live private source read by collector, provider, hosted transport or deployment acceptance.",
    }), "native-archive-closure");
  } finally { life.release(); }
});

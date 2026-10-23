/** Native installed TEST application, declared root/child creation, issued
 * session reads and SQLite. Package peer, clock, scheduler and reviewed
 * archive policy are explicit fixtures. No provider or production admission.
 * Device replies are explicit TEST owner input, not physical execution. */
import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type FactRef, type Head, type Input, type PlatformDefinition, type ScopeId, type ScopeRef, type Sealed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, encodeItemQueryParameter, isDigest, isEntry, isFactRef, isScopeId, isRecord, isSeed, parseStrict, scopeIdOf, textDigest, timeMs, timeOf, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import { readApplicationPackage2, readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { inputTexts, outcomeValueDomains, ownersOf, validateDefinition, type OperationRules, type ValidDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, platform } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, invitationIssueFields, invitationRedemptionFields, requestSession, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { archiveSource, verifyArchive, TRUSTS } from "@generalbusiness/dap-replay";
import { buildJournalPass, journalRef, verifyJournalAppend, type JournalArchive, type JournalObject, type JournalPassArchive } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { command as dapCommand, memoryStore as cliMemoryStore } from "../../cli/src/index.ts";
import { artifactsOutside } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { archiveInput } from "../src/archive-input.ts";
import { ArchiveDriver } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { archiveSourceReferences, archiveSourceWindow } from "../src/archive-source-window.ts";
import { stopArchivePrefix } from "../src/archive-prefix.ts";
import { ArchiveArtifactsPeer } from "./support/archive-artifacts.ts";
import { observeDirectoryFinish } from "./support/archive-finish-observer.ts";
import { growArchivePolicies, GROW_ARCHIVE_DEFINITIONS } from "../../../apps/room/archive-policy.ts";
import { growArchiveDriver } from "../../../apps/room/archive.ts";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "../../../examples/grow/demo-release.ts";
import { archiveHostWiring, roomArchiveWiring, roomArchiveConstructions } from "./worker.ts";
import type { OutsideGiven } from "../src/object.ts";
import type { DestinationRepository } from "../src/destination-host.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { archiveEntryHeader, archiveEntryPrivacy, archiveSupportMetadata, recordArchiveSupportMetadata } from "../src/archive-entry-metadata.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { forecastArchiveEntryPrivacy } from "../src/archive-entry-privacy-cost.ts";
import { forecastArchiveSupportMetadata } from "../src/archive-support-cost.ts";
import { forecastArchiveMembershipCopy } from "../src/archive-foreign-cost.ts";
import { archiveMembershipCopy } from "../src/archive-membership-copy.ts";
import { ArchiveForeignMetadata } from "../src/archive-foreign.ts";
import { archiveTarget } from "../src/archive-target.ts";
import { archiveHostItem, type ArchiveHostConfiguration, type ArchiveHostItemAsk } from "../src/archive-host-item.ts";
import { Scope, type Checkpointed } from "../src/core.ts";
import { SqliteStore, type Sql } from "../src/sqlite.ts";
import { archiveReplayAnchors } from "../src/archive-anchors.ts";
import { planArchive, planArchivePass, planPublishedArchivePass } from "../src/archive-build.ts";
import { ARCHIVE_SOURCE_PINS, FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../src/archive-source-pins.ts";
import type { ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket } from "./support/application-owned-scopes-fixture.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { localClone } from "./support/local-clone.ts";
import { sessionRoom, sessionRepository } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { archiveSql } from "./support/archive.ts";
import { namespace } from "../src/namespace.ts";
import { readNativeBirth } from "../src/native-birth.ts";
import { DEVICE_COMMAND_ARCHIVE_PREPARATIONS, DEVICE_COMMAND_ARCHIVE_RECORDS } from "../src/archive-privacy.ts";
import { CAPABILITY_CODE, production } from "../src/ports.ts";
import { rita, una, vic, routed } from "./repository.ts";
import { net, soon } from "./net.ts";
import type {} from "./support/maintained-applications.ts";

const inline = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
function archiveGiven(store: SqliteStore): OutsideGiven {
  const own = (seq: number) => { const row = store.stored(seq); return row ? { entry: parseStrict(row.bytes) as Sealed["entry"], hash: row.hash } : null; };
  const input = own(0)?.entry.input;
  return { ...production(), clock: net.clock, state: store, scope: () => store.scope(),
    genesis: () => input?.type === "genesis" ? input : null, own, retained: (...args) => store.retained(...args) };
}
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
    ...(isDigest(pin) ? { declaration: canonicalize(checked.definition.declared) } : {}),
    support: { named: pin, definition: checked.definition, owners,
      ...(device ? { capabilities: CAPABILITY_CODE } : {}),
      records: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_RECORDS]]) : new Map(),
      preparations: device ? new Map([[DEVICE_COMMAND, DEVICE_COMMAND_ARCHIVE_PREPARATIONS]]) : new Map(),
    } };
}

/** Metadata only from the public executable report, never journal bodies.
 * Original token-output assertions run before this diagnostic is attached. */
function commandReportDiagnostic(value: unknown) {
  const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const text = (v: unknown) => typeof v === "string" ? { text: v.slice(0, 512), truncated: v.length > 512 } : null;
  const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
  const gitId = (v: unknown) => typeof v === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(v) ? v : null;
  const results = ["consistent", "mismatch", "missing-dependency", "unsupported-definition", "incomplete", "refused", "unavailable", "anchors-unpublished", "anchor-unneeded", "limit", "timeout", "not-found"];
  const result = (v: unknown) => typeof v === "string" && results.includes(v) ? v : "unknown";
  const d = object(value), journals = Array.isArray(d["journals"]) ? d["journals"] : [];
  return { publishedAnchorsTrusted: d["publishedAnchorsTrusted"] === true, journals: journals.slice(0, 5).map(raw => {
    const row = object(raw), verification = object(row["verification"]), report = object(verification["report"]), archive = object(row["archive"]), location = object(row["location"]), range = object(location["range"]), dependencies = object(report["dependencies"]);
    return { kind: row["kind"] === "verification" ? "verification" : row["kind"] === "archive-failure" ? "archive-failure" : "unknown",
      result: result(row["kind"] === "verification" ? report["result"] : row["result"]), reason: text(row["kind"] === "verification" ? verification["why"] : row["reason"]),
      scope: isScopeId(location["scope"]) ? location["scope"] : isScopeId(object(archive["scope"])["scope"]) ? object(archive["scope"])["scope"] : null,
      at: isFactRef(report["at"]) ? report["at"] : null, target: isFactRef(report["target"]) ? report["target"] : null,
      commit: gitId(location["commit"]), object: gitId(location["object"]), path: typeof location["path"] === "string" && /^[A-Za-z0-9_./:-]{1,256}$/.test(location["path"]) ? location["path"] : null,
      anchor: isFactRef(location["anchor"]) ? location["anchor"] : null, range: { from: integer(range["from"]), through: integer(range["through"]), legacy: range["legacy"] === true },
      anchors: Array.isArray(report["anchors"]) ? report["anchors"].length : null,
      missing: Array.isArray(dependencies["missing"]) ? { count: dependencies["missing"].length, first: dependencies["missing"].slice(0, 2).filter(isFactRef) } : null };
  }), journalCount: journals.length, journalsTruncated: journals.length > 5 };
}

// Each offline follower immediately follows its own native producer. No
// Native owner, private key or plaintext read token crosses this boundary.
interface NativeCommandHandoff { producer: string; id: string; lines: readonly string[]; refs: readonly { ref: string; id: string }[] }
for (const scenario of ["fixture", "Grow", "Grow production", "Grow activation warm", "Grow activation evicted"]) {
  const producerTitle = `installed ${scenario} scopes export genesis zero after a late native Membership8 directory binding`;
  let retainedCommand: NativeCommandHandoff | null = null;
  test(producerTitle, { timeout: 30_000 }, async context => {
  const activationScenario = scenario.startsWith("Grow activation"), productionScenario = scenario === "Grow production" || activationScenario, kind = scenario === "fixture" ? "fixture" : "Grow";
  const prepared = kind === "fixture" ? await applicationOwnedScopesPacket() : (() => {
    const captured = inject("maintainedApplications")[productionScenario ? "growDemo" : "grow"], bytes = unb64url(captured.bytes);
    if (!bytes) throw Error("The maintained TEST Grow packet must be captured.");
    const packet = (productionScenario ? readPublishedApplicationPackage2 : readApplicationPackage2)(bytes, captured.release), rootId = packet.package.semantic.entry, childId = packet.package.semantic.projections["grid"]!.definition;
    const definition = (id: Digest) => parseStrict(packet.package.semantic.definitions.find(part => part.id === id)!.bytes) as DeclaredDefinition;
    return { packet, rootId, childId, root: definition(rootId), child: definition(childId) };
  })();
  const { packet, root, child, rootId, childId } = prepared;
  if (productionScenario) {
    expect(packet.ids.release).toBe(DEMO_RELEASE);
    expect(packet.package.release.manifest.publisher).toBe(DEMO_PUBLISHER);
    expect([rootId, childId]).toEqual(GROW_ARCHIVE_DEFINITIONS);
  }
  const C = kind === "fixture" ? ARCHIVE_DECLARED_APPLICATION_COHORT : ARCHIVE_DEVICE_APPLICATION_COHORT;
  // Original byte-cost receipts use whole-second timestamps. Other native
  // witnesses may advance this shared clock by milliseconds. Advance it
  // monotonically before creating any scope; keep its identity and history.
  if (kind === "Grow") net.clock.now = timeOf(Math.ceil(timeMs(net.clock.now)! / 1000) * 1000);
  const platformHost = productionScenario ? { host: "artifacts", namespace: "artroom-demo" } : undefined;
  const { life, R, D, children } = await sessionRoom(C.register, undefined, platformHost), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort requires three siblings.");
  let productionPeer: ArchiveArtifactsPeer | undefined;
  let commandHandoff: NativeCommandHandoff | undefined;
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    expect((await life.wait(() => M.summary())).value.definition).toBe("platform:membership@8");
    const operator = { membership, member: "@rita" as const };
    const demoMembers = { operator, sensors: { membership, member: "@demo-sensors" as const }, climate: { membership, member: "@demo-climate" as const } };
    if (productionScenario) {
      // Same native distinct-agent enrolment as grow-demo-tick. These are
      // TEST principals, not hosted operator or simulator credentials.
      for (const [actor, handle, fill] of [[una, "@demo-sensors", 92], [vic, "@demo-climate", 93]] as const) {
        const member = await life.wait(() => M.did(rita, "add-member", { fields: { handle, kind: "agent", controller: operator } }));
        const secret = b64url(new Uint8Array(32).fill(fill));
        const invitation = await life.wait(async () => M.did(rita, "invite-key", { fields: { member, kind: "agent", inviteEnds: timeOf(life.now() + 3_600_000), ...invitationIssueFields(C.membership, secret) }, expected: await M.expected({ member }) }));
        await life.wait(async () => M.did(actor, "enrol", { on: 0, fields: invitationRedemptionFields(C.membership, membership, invitation, actor.key, secret), expected: await M.expected({ on: 0, member }) }));
      }
    }
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native install."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const membershipBeforeInstall = (await life.wait(() => M.summary())).at;
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: productionScenario ? ["admin", "agent"] : ["admin"],
      values: kind === "Grow" ? { label: "TEST archive Grow Site", ...(productionScenario ? demoMembers : {}) } : {},
      ...(kind === "Grow" ? { owner: productionScenario ? demoMembers.sensors : operator } : {}), idempotencyKey: "TEST-archive-installed-scopes" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    // Independent Native setup oracle, captured BEFORE any archive output.
    // A pre-MCP summary is diagnostic only: standing authority is read later.
    const nativeInstallOracle = productionScenario ? await (async () => {
      const rulesAt = await life.wait(() => A.at());
      const installs = (await life.wait(() => A.sealed())).filter(sealed => {
        const input = sealed.entry.input;
        return input.type === "act" && input.signed.intent.kind === "install-application"
          && input.signed.intent.idempotencyKey === "TEST-archive-installed-scopes"
          && input.signed.intent.actor === rita.key && canonicalize(input.signed.intent.to) === canonicalize(rulesAt)
          && input.signed.intent.fields["release"] === packet.ids.release;
      });
      expect(installs).toHaveLength(1);
      const rulesEntry = installs[0]!, input = rulesEntry.entry.input;
      if (input.type !== "act") throw Error("Actual Native installation act required.");
      const observations = input.authority.map(grant => grant.fresh.observation).filter(observed =>
        canonicalize(observed.of) === canonicalize(membership) && "key" in observed && observed.key === rita.key);
      expect(observations).toHaveLength(1);
      const observed = observations[0]!;
      const memberHead: FactRef = { at: { ...observed.of }, seq: observed.head.seq, hash: observed.head.hash };
      const nativeMembers = (await life.wait(() => M.sealed())).filter(sealed =>
        canonicalize(sealed.entry.at) === canonicalize(memberHead.at) && sealed.entry.seq === memberHead.seq && sealed.hash === memberHead.hash);
      expect(nativeMembers).toHaveLength(1);
      const memberInput = nativeMembers[0]!.entry.input;
      (context.task.meta as Record<string, unknown>)["nativeInstallAuthorityOracle"] = {
        preMcpSummary: membershipBeforeInstall, rulesAct: { at: rulesEntry.entry.at, seq: rulesEntry.entry.seq, hash: rulesEntry.hash },
        memberHead, memberInput: { type: memberInput.type, ...(memberInput.type === "act" ? { kind: memberInput.signed.intent.kind } : {}) },
        qualification: "Actual Native install act and exact local Membership sealed fact, before archive processing; no archive-derived expectation or notification-cause claim.",
      };
      return { rulesEntry, memberHead };
    })() : null;
    const nativeStageOracle = productionScenario ? await (async () => {
      const catalog = packet.package.semantic.definitions.map(part => ({
        digest: part.id, text: textDigest(part.bytes), name: (parseStrict(part.bytes) as DeclaredDefinition).name,
      }));
      const stages = (await life.wait(() => D.sealed())).filter(sealed => {
        const input = sealed.entry.input;
        if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell"
          || canonicalize(sealed.entry.at) !== canonicalize(directory)
          || canonicalize(input.from.at) !== canonicalize(nativeInstallOracle!.rulesEntry.entry.at)
          || !isRecord(input.message.body) || input.message.body["message"] !== "application-stage") return false;
        const fields = input.message.body["fields"];
        return isRecord(fields) && fields["job"] === nativeInstallOracle!.rulesEntry.entry.seq
          && fields["definition"] === rootId && fields["release"] === packet.ids.release && fields["semantic"] === packet.ids.semantic;
      });
      expect(stages).toHaveLength(1);
      const stage = stages[0]!, input = stage.entry.input;
      if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell" || !isRecord(input.message.body) || !isRecord(input.message.body["fields"])) throw Error("Actual Native staging fields required.");
      const fields = input.message.body["fields"];
      expect(fields["declarations"]).toEqual(catalog);
      for (const [index, part] of catalog.entries()) expect(fields[`definitionText${index}`]).toBe(part.text);
      expect(Object.keys(fields).filter(key => /^definitionText[0-9]+$/.test(key)).sort()).toEqual(catalog.map((_part, index) => `definitionText${index}`).sort());
      const fact: FactRef = { at: { ...stage.entry.at }, seq: stage.entry.seq, hash: stage.hash };
      expect(fact.at).toEqual(directory);
      (context.task.meta as Record<string, unknown>)["nativeStageOracle"] = { fact, declarations: catalog.map(({ digest, text }) => ({ digest, text })),
        qualification: "Unique actual Native Directory staging delivery with exact sender/recipient/job/release/semantic/root and signed declaration text fields, before archive processing." };
      return { fact, catalog };
    })() : null;
    const rootCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootCreate || !isSeed(rootCreate.to)) throw Error("Directory must genuinely create the installed root.");
    if (productionScenario) expect(rootCreate.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true, deviceCommand: { owner: demoMembers.sensors, root: rootId, definitions: [childId] } } } });
    const rootScope = life.platform(scopeIdOf(rootCreate.to)); await driveFixture([R, D, M, A, G, rootScope], life.wait);
    if (kind === "Grow") {
      await life.wait(() => rootScope.did(rita, "create-room", { fields: { label: "TEST archive Grow Room" }, ...(productionScenario ? { expected: { demoSite: 1 } } : {}) }));
      await dispatchFixture([R, D, M, A, G, rootScope], life.wait);
    }
    const childCreate = (await life.wait(() => rootScope.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childCreate || !isSeed(childCreate.to)) throw Error("Installed root must genuinely create its child.");
    if (productionScenario) expect(childCreate.message).toMatchObject({ body: { creationContext: { v: 2, delegate: false, deviceCommand: { owner: demoMembers.sensors, root: rootId, definitions: [childId] } } } });
    const childScope = life.platform(scopeIdOf(childCreate.to)); await driveFixture([R, D, M, A, G, rootScope, childScope], life.wait);
    if (productionScenario) {
      expect(await life.wait(() => childScope.item(0))).toMatchObject({ parties: demoMembers });
      for (const actor of [una, vic]) expect(await life.wait(() => M.stub.observe({ of: membership, key: actor.key })))
        .toMatchObject({ keyState: "active", role: "agent", actions: expect.arrayContaining(["grow.climate", "grow.sense"]) });
    }
    if (kind === "fixture") for (const scope of [rootScope, childScope]) await life.wait(async () => scope.did(rita, "bump", { on: 0, expected: await scope.expected({ on: 0 }) }));
    else {
      const zone = await life.wait(() => childScope.did(rita, "commission-zone", { fields: { label: "TEST Zone", setpoint: 2400, band: 200 } }));
      const heater = await life.wait(async () => childScope.did(rita, "commission-device", { fields: { zone, kind: "heater", label: "TEST Heater", minLevel: 0, maxLevel: 100, target: "off", level: 0 }, expected: await childScope.expected({ zone }) }));
      const command = await life.wait(async () => childScope.did(rita, "set-heater", { on: heater, fields: { target: "on", level: 100 }, expected: await childScope.expected({ on: heater }) }));
      const sealed = (await life.wait(() => childScope.sealed())).find(entry => entry.entry.seq === command)!;
      const ownerMcp = productionScenario ? new McpService({ ...port, signer: secretSigner(una.secret), custody: memoryStore() }) : mcp;
      const answer = await life.wait(() => ownerMcp.call("prepare", { resource: childScope.name, capability: DEVICE_COMMAND, step: "answer", idempotencyKey: "TEST-archive-Grow-owner-answer",
        fields: { command: { at: sealed.entry.at, seq: command, hash: sealed.hash }, outcome: "confirmed", description: "TEST native owner reply" },
      }));
      expect(answer.isError, JSON.stringify(answer.structuredContent)).toBe(false);
      expect(answer.structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
      expect(await life.wait(() => childScope.item(heater))).toMatchObject({ values: { outcome: "confirmed" } });
    }
    const configuredRepository = (await life.wait(() => D.item(0))).values["repository"] as { host: string; namespace: string };
    const hostConfig: ArchiveHostConfiguration = { registerScope: R.name, host: configuredRepository.host, namespace: configuredRepository.namespace, directory: D.name };
    const hostQueries: string[] = [];
    const hostRead = (where: ScopeRef, ask: ArchiveHostItemAsk, config = hostConfig) => life.wait(() => runInDurableObject(life.platform(where.scope).object, (_instance, state) => {
      const sql = archiveSql(state), store = new SqliteStore(sql), ports = production();
      return archiveHostItem(sql, archiveGiven(store), new Scope(where.scope, store, ports, PROPOSED_BOUNDS).pinned(), config, ask);
    }));
    const productionTarget = archiveTarget({ births: namespace(env.PLATFORM).births,
      query: (where, query, archiving, directory) => { hostQueries.push(where.kind); return hostRead(where, { query, archiving, directory }); },
    });
    if (kind === "Grow") {
      const first = (await life.wait(() => childScope.sealed()))[0]!.entry;
      if (first.input.type !== "genesis") return expect.fail("Actual Grow child genesis is required");
      expect(await productionTarget.discover(first.at, first.input.seed, new ArchiveBudget())).toBeNull();
      expect(hostQueries).toEqual(["directory"]); // no destination item query without binding
      hostQueries.length = 0;
      if (productionScenario) {
        expect(await productionTarget.resolveRoom(first.at, first.input.seed, new ArchiveBudget())).toBeNull();
        expect(hostQueries).toEqual(["directory"]);
        hostQueries.length = 0;
      }
    }
    if (activationScenario) {
      // This separate story runs the real ScopeObject production factory and
      // scheduled alarms. It never substitutes manual driver invocations.
      const repository = (await life.wait(() => D.item(0))).values["repository"] as unknown as DestinationRepository;
      const host = new ArchiveArtifactsPeer(repository, life.now), policies = growArchivePolicies(new TextDecoder().decode(packet.bytes));
      const environment = { ARTIFACTS: host.binding,
        ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: repository.namespace, host: "service.invalid", maxBytes: 8 * 1024 * 1024, credentialIdentity: "adapter-attempt" }),
        GROW_ARCHIVE_CONFIG: canonicalize({ policy: "grow-room-archive-1", release: DEMO_RELEASE, directory: D.name, repositoryName: repository.name }) };
      const reads: { owner: string; source: string }[] = [];
      let threwPrebindTarget = false, interruptedFirstSources = false;
      const ledgers: { owner: string; budget: ArchiveBudget; targetBefore?: ArchiveCost; targetAfter?: ArchiveCost; resolved?: boolean }[] = [];
      for (const scope of [rootScope, childScope, D, A, G]) {
        roomArchiveConstructions.set(scope.name, 0);
        roomArchiveWiring.set(scope.name, (given, sql, bounds) => {
          roomArchiveConstructions.set(scope.name, roomArchiveConstructions.get(scope.name)! + 1);
          let ownLedger: (typeof ledgers)[number] | undefined;
          const binding = { idFromName: (name: string) => env.PLATFORM.idFromName(name), get: (id: DurableObjectId) => {
            const peer = env.PLATFORM.get(id);
            return new Proxy(peer, { get(target, key) {
              if (key !== "nativeBirth") return Reflect.get(target, key);
              return async (where: ScopeRef, milliseconds: number, maxBytes: number) => {
                reads.push({ owner: scope.name, source: where.scope });
                return (target as unknown as { nativeBirth(at: ScopeRef, ms: number, bytes: number): Promise<unknown> }).nativeBirth(where, milliseconds, maxBytes);
              };
            } });
          } };
          const options = growArchiveDriver(given, sql, binding, environment, policies, bounds, host.fetch);
          if (!options) throw Error("Actual exact Grow archive wiring must be present");
          return { ...options,
            sources: async (...args) => {
              if (scope.name === D.name && !interruptedFirstSources) {
                interruptedFirstSources = true;
                // The real initial target save has completed. Interrupt at
                // its first source await, before Mark, then reconstruct below.
                await Promise.resolve();
                throw Error("TEST first source unavailable after durable target");
              }
              return options.sources!(...args);
            },
            budget: () => { ownLedger = { owner: scope.name, budget: new ArchiveBudget() }; ledgers.push(ownLedger); return ownLedger.budget; },
            target: { resolve: async (...args) => {
              expect(args[2]).toBe(ownLedger!.budget); ownLedger!.targetBefore = args[2].admitted();
              const repository = await options.target.resolve(...args);
              ownLedger!.targetAfter = args[2].admitted(); ownLedger!.resolved = repository !== null;
              if (scope.name === D.name && repository === null && scenario === "Grow activation evicted" && !threwPrebindTarget) {
                threwPrebindTarget = true; throw Error("TEST target unavailable after real unbound lookup");
              }
              return repository;
            } },
          };
        });
        life.cleanup(() => { roomArchiveWiring.delete(scope.name); roomArchiveConstructions.delete(scope.name); });
        await life.wait(() => scope.restart());
      }
      for (const scope of [D, G]) {
        archiveHostWiring.set(scope.name, hostConfig); life.cleanup(() => { archiveHostWiring.delete(scope.name); });
      }
      const alarm = (scope: typeof D) => life.wait(() => runInDurableObject(scope.object, async (_instance, state) => state.storage.getAlarm()));
      const wakeIndex = (scope: typeof D) => life.wait(() => runInDurableObject(scope.object, (_instance, state) => {
        const bytes = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k='archive-wake-1'").one().v;
        return parseStrict(bytes);
      }));
      // Warm Directory's actual configured instance before binding. Its
      // missing-binding pass must retain a real retry wake, without a row.
      await life.wait(() => (D.object as unknown as { readiness(): Promise<unknown> }).readiness());
      expect(await life.wait(() => runDurableObjectAlarm(D.object))).toBe(true);
      const retry = await alarm(D); expect(retry).not.toBeNull(); expect(retry).toBeGreaterThan(life.now());
      const deferredWake = { pending: true, stopped: false, next: timeOf(retry!) };
      expect(await wakeIndex(D)).toEqual(deferredWake);
      expect(threwPrebindTarget).toBe(scenario === "Grow activation evicted");
      expect(await life.wait(() => runInDurableObject(D.object, (_instance, state) => new ArchiveRows(archiveSql(state), directory).load()))).toBeNull();
      expect(roomArchiveConstructions.get(A.name)).toBe(0);
      await life.wait(async () => D.did(rita, "bind-archive", { on: 0, fields: { archive: "journal" }, expected: await D.expected({ on: 0 }) }));
      expect(await alarm(D)).toBe(retry); // warm onSealed must not shorten retry
      expect(await wakeIndex(D)).toEqual(deferredWake);
      const directoryConstructions = roomArchiveConstructions.get(D.name)!;
      if (scenario === "Grow activation evicted") await life.wait(() => D.restart());
      const readStart = reads.length;
      await life.wait(() => childScope.did(rita, "commission-zone", { fields: { label: "TEST actual Room activation", setpoint: 2400, band: 200 } }));
      expect(await life.wait(() => runDurableObjectAlarm(childScope.object))).toBe(true);
      expect(reads.slice(readStart).some(read => read.owner === childScope.name && read.source === D.name)).toBe(true);
      expect(reads.slice(readStart).some(read => read.owner === childScope.name && read.source === A.name)).toBe(false);
      expect(roomArchiveConstructions.get(A.name)).toBe(0);
      expect(roomArchiveConstructions.get(D.name)).toBe(directoryConstructions + (scenario === "Grow activation evicted" ? 1 : 0));
      const directoryWake = await alarm(D); expect(directoryWake).toBe(retry);
      expect(await wakeIndex(D)).toEqual(deferredWake);
      life.active(); net.clock.now = timeOf(Math.max(life.now(), directoryWake!));
      expect(await life.wait(() => runDurableObjectAlarm(D.object))).toBe(true);
      expect(reads.some(read => read.owner === D.name && read.source === A.name)).toBe(true);
      expect(ledgers.some(row => row.owner === D.name && row.resolved && row.targetBefore && row.targetAfter
        && row.targetAfter.calls > row.targetBefore.calls && row.targetAfter.inputWork > row.targetBefore.inputWork)).toBe(true);
      // Count before the inspection: that inspection must not be the first
      // activation of the otherwise quiet real Rules object.
      expect(roomArchiveConstructions.get(A.name)).toBe(1);
      const rulesWake = await alarm(A); expect(rulesWake).not.toBeNull();
      expect(roomArchiveConstructions.get(A.name)).toBe(1);
      expect(interruptedFirstSources).toBe(true);
      const sourceRetry = await alarm(D); expect(sourceRetry).not.toBeNull(); expect(sourceRetry).toBeGreaterThan(life.now());
      const sourceWake = { pending: true, stopped: false, next: timeOf(sourceRetry!) };
      expect(await wakeIndex(D)).toEqual(sourceWake);
      const targetOnly = await life.wait(() => runInDurableObject(D.object, (_instance, state) => new ArchiveRows(archiveSql(state), directory).load()));
      expect(targetOnly).toMatchObject({ repository, pending: null, confirmed: null });
      await life.wait(() => D.restart());
      await life.wait(() => (D.object as unknown as { readiness(): Promise<unknown> }).readiness());
      expect(await alarm(D)).toBe(sourceRetry); expect(await wakeIndex(D)).toEqual(sourceWake);
      (context.task.meta as Record<string, unknown>)["productionActivation"] = { scenario, retry, deferredWake, threwPrebindTarget, directoryWake, rulesWake, sourceRetry, sourceWake, reads,
        ledgers: ledgers.map(({ owner, budget, ...row }) => ({ owner, ...row, cost: budget.admitted() })),
        qualification: "Exact signed packet and genuine native distinct agents/creation/binding. Real ScopeObject production constructor, native sealed Room activity, scheduled alarms, warm Directory retry and optional eviction. Each object's actual pass pays its original ledger; no manual ArchiveDriver substitutes this activation path. Namespace/clock/Artifacts HTTP peer/scheduler are TEST stand-ins; no hosted acceptance or complete five-ref archive claim." };
      return;
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
    const declarations = new Map([[rootId, root], [childId, child]]), policies = new Map<Digest | PlatformDefinition, ReviewedArchivePolicy>(productionScenario ? growArchivePolicies(new TextDecoder().decode(packet.bytes)) : [[rootId, reviewed(rootId, root)], [childId, reviewed(childId, child)]]);
    const childBirth = histories[1]!.read.value[0]!.entry;
    if (childBirth.input.type !== "genesis") throw Error("Actual installed child birth is required.");
    const childSeed = childBirth.input.seed;
    const discoveryBudget = new ArchiveBudget();
    const discovery = kind === "Grow" ? await productionTarget.discover(childBirth.at, childSeed, discoveryBudget) : null;
    if (kind === "Grow") {
      expect(hostQueries).toEqual(["directory", "destination"]);
      expect(discovery?.repository).toEqual((await life.wait(() => D.item(0))).values["repository"]);
      expect(discovery?.scopes.map(scope => ({ scope: scope.at.scope, named: scope.named, via: scope.via }))).toEqual([
        { scope: childScope.name, named: childId, via: "self" },
        { scope: rootScope.name, named: rootId, via: "creator" },
        { scope: D.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.directory, via: "creator" },
        { scope: A.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.rules, via: "rules" },
        { scope: G.name, named: ARCHIVE_DEVICE_APPLICATION_COHORT.destination, via: "destination" },
      ]);
      if (!discovery) throw Error("The bound native producer graph must be discovered.");
      // The same production gate admits no other item or pinned register.
      // No public reader, test inspector or session is passed to this port.
      const repositoryQuery = encodeItemQueryParameter({ v: 1, scope: directory, type: "repository", states: ["open"], ids: null, limit: 1, cursor: null })!;
      const ask = { query: repositoryQuery, archiving: childBirth.at, directory };
      expect(await hostRead(directory, ask, { ...hostConfig, registerScope: D.name })).toEqual({ ok: false, reason: "forbidden" });
      const otherItem = encodeItemQueryParameter({ v: 1, scope: directory, type: "application", states: [], ids: null, limit: 1, cursor: null })!;
      expect(await hostRead(directory, { ...ask, query: otherItem })).toEqual({ ok: false, reason: "forbidden" });
      expect(await productionTarget.discover({ ...childBirth.at, scope: D.name }, childSeed, new ArchiveBudget())).toBeNull();
      expect(hostQueries).toEqual(["directory", "destination"]); // substitution refused before either query
      const wrongRegister = archiveTarget({ births: namespace(env.PLATFORM).births,
        query: (where, query, archiving, directory) => hostRead(where, { query, archiving, directory }, { ...hostConfig, registerScope: D.name }),
      });
      expect(await wrongRegister.discover(childBirth.at, childSeed, new ArchiveBudget())).toBeNull();
      if (productionScenario) {
        expect(await wrongRegister.resolveRoom(childBirth.at, childSeed, new ArchiveBudget())).toBeNull();
        expect(await productionTarget.resolveRoom({ ...childBirth.at, scope: D.name }, childSeed, new ArchiveBudget())).toBeNull();
        expect(await productionTarget.resolveRoom(childBirth.at, { ...childSeed, definition: rootId }, new ArchiveBudget())).toBeNull();
      }
      const wrongScopeQuery = encodeItemQueryParameter({ v: 1, scope: await life.wait(() => G.at()), type: "repository", states: ["open"], ids: null, limit: 1, cursor: null })!;
      const wrongQueryScope = archiveTarget({ births: namespace(env.PLATFORM).births,
        query: (where, _query, archiving, directory) => hostRead(where, { query: wrongScopeQuery, archiving, directory }),
      });
      expect(await wrongQueryScope.discover(childBirth.at, childSeed, new ArchiveBudget())).toBeNull();
      if (productionScenario) expect(await wrongQueryScope.resolveRoom(childBirth.at, childSeed, new ArchiveBudget())).toBeNull();
      const unrelated = await sessionRepository(life, C.register, "journal", platformHost), unrelatedDirectory = await life.wait(() => unrelated.D.at());
      const unrelatedQuery = encodeItemQueryParameter({ v: 1, scope: unrelatedDirectory, type: "repository", states: ["open"], ids: null, limit: 1, cursor: null })!;
      expect(await hostRead(unrelatedDirectory, { ...ask, query: unrelatedQuery, directory: unrelatedDirectory }, { ...hostConfig, directory: unrelated.D.name })).toEqual({ ok: false, reason: "forbidden" });
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
    // Native retention semantics over actual complete inputs, independently
    // of archive SQL selectors, selection records, manifests or outputs.
    const nativeTextFirsts = new Map<string, FactRef>();
    if (productionScenario) {
      const schemas = new Map<string, ValidDefinition>();
      const nativeSchemas = [...allHistories.map(history => history.read.value), await life.wait(() => R.sealed()), await life.wait(() => M.sealed())];
      for (const history of nativeSchemas) {
        const first = history[0];
        if (!first || first.entry.seq !== 0 || first.entry.input.type !== "genesis") throw Error("Actual Native genesis schema required.");
        const pin = first.entry.input.seed.definition, coded = isDigest(pin) ? null : platform(pin);
        const declared = isDigest(pin) ? declarations.get(pin) : coded?.data;
        if (!declared) throw Error("Exact signed or native schema required for omission oracle.");
        const checked = validateDefinition(declared, PROPOSED_BOUNDS, RULE_PROFILES,
          coded ? { platform: true, outcomeValues: outcomeValueDomains(coded.data, coded.rules) } : {});
        if (!checked.ok) throw Error("Actual Native schema must validate for omission oracle.");
        schemas.set(canonicalize(first.entry.at), checked.definition);
      }
      const knownTexts = new Set(packet.package.semantic.definitions.map(part => textDigest(part.bytes)));
      for (const { read } of allHistories) for (const sealed of read.value) {
        const schema = schemas.get(canonicalize(sealed.entry.at));
        if (!schema) throw Error("Exact receiver schema required for Native text naming.");
        const input = sealed.entry.input;
        const sender = input.type === "delivery" ? schemas.get(canonicalize(input.from.at)) : undefined;
        if (input.type === "delivery" && (input.message.class === "request" || input.message.class === "advisory") && !sender) throw Error("Exact sender schema required for Native text naming.");
        // inputTexts covers declared act fields, founding/creation genesis
        // fields, and matched delivery fields. Result/control inputs name none.
        for (const digest of inputTexts(schema, input, sender?.declared.name)) {
          if (!knownTexts.has(digest)) throw Error("Native fixture names a detached text outside its signed declaration oracle.");
          const key = canonicalize([sealed.entry.at, digest]);
          if (!nativeTextFirsts.has(key)) nativeTextFirsts.set(key, { at: { ...sealed.entry.at }, seq: sealed.entry.seq, hash: sealed.hash });
        }
      }
      for (const part of nativeStageOracle!.catalog) expect(nativeTextFirsts.get(canonicalize([directory, part.text]))).toEqual(nativeStageOracle!.fact);
    }
    const sourceRefs = new Map(allHistories.flatMap(({ read }) => read.value.flatMap(sealed => sealed.entry.uses.map(use => [canonicalize(use.fact.at), use.fact.at] as const))));
    expect(sourceRefs.size).toBeGreaterThan(0); expect(sourceRefs.size).toBeLessThanOrEqual(ARCHIVE_SOURCE_PINS);
    if (kind === "Grow") {
      const discovered = new Set<string>();
      for (const { scope, read } of allHistories) {
        const window = await life.wait(() => runInDurableObject(scope.object, (_instance, state) => {
          const native = archiveSql(state);
          const metadata = { ...native, exec: (query: string, ...args: Parameters<typeof native.exec> extends [string, ...infer Rest] ? Rest : never) => {
            if (/SELECT\s+(?:entry\.)?bytes\b/i.test(query) || /FROM retained_/i.test(query)) return expect.fail("Source lookahead must read metadata only");
            return native.exec(query, ...args);
          } };
          return archiveSourceWindow(metadata, null, read.at, PROPOSED_BOUNDS, new ArchiveBudget());
        }));
        expect(window.through).toEqual(read.at);
        for (const source of window.sources) discovered.add(canonicalize(source));
      }
      expect([...discovered].sort()).toEqual([...sourceRefs.keys()].sort());
    }
    const births: FixtureArchiveSourceBirth[] = [];
    for (const source of sourceRefs.values()) {
      if (kind === "fixture") {
        // Preserve the original issued-session boundary for the declaration
        // fixture. Its Directory14 is a foreign source, not a self-export.
        const birth = await life.owner.required(() => handle(source.scope).entry(0));
        if (!birth.ok || birth.value.entry.input.type !== "genesis") throw Error("Actual native graph birth is required.");
        const pin = birth.value.entry.input.seed.definition, declaration = isDigest(pin) ? declarations.get(pin) : undefined;
        births.push({ at: source, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, ...(declaration ? { declaration: canonicalize(declaration) } : {}) });
        if (!policies.has(pin)) { if (productionScenario) throw Error("Production source pin has no signed-policy coverage"); policies.set(pin, reviewed(pin, declaration)); }
        continue;
      }
      // Existing bounded native metadata port, before inventory. It is not
      // read authority or an archive policy; the separate TEST table owns policy.
      const birth = readNativeBirth(await life.wait(() => namespace(env.PLATFORM).births.read(source, 10_000, 256 * 1024)), source, 256 * 1024);
      if (!birth) throw Error("Actual native graph birth is required.");
      const pin = birth.named, declaration = isDigest(pin) ? declarations.get(pin) : undefined;
      births.push({ at: source, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash }, ...(declaration ? { declaration: canonicalize(declaration) } : {}) });
      if (!policies.has(pin)) { if (productionScenario) throw Error("Production source pin has no signed-policy coverage"); policies.set(pin, reviewed(pin, declaration)); }
    }
    for (const { scope } of nativeHistories) {
      const pin = (await life.wait(() => scope.summary())).value.definition;
      if (!pin) throw Error("The native scope must pin its actual definition.");
      if (!policies.has(pin)) { if (productionScenario) throw Error("Production journal pin has no signed-policy coverage"); policies.set(pin, reviewed(pin)); }
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
    const sharedPassFootprints: unknown[] = [], sharedWholePassFootprints: unknown[] = [], supportComponents: unknown[] = [];
    const entryPrivacyComponents: { scope: string; seq: number; input: Input["type"]; effects: number; delta: ArchiveCost }[] = [];
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
      const planned = await life.wait(() => runInDurableObject(scope.object, async (_instance, state) => await (productionScenario ? planPublishedArchivePass : kind === "Grow" ? planArchivePass : planArchive)(archiveSql(state), { at, through: read.at, after: null, bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: timeOf(life.now()), fixtureSources,
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
      if (kind === "Grow" && !productionScenario) {
        // Invariant: every actual fixture entry fits alone, with its own
        // retained paths and original native inventory plus append charges.
        // These diagnostic commits are not marked or remotely confirmed.
        sharedWholePassFootprints.push({ scope: scope.name, role: scope.name === rootScope.name ? "root" : scope.name === childScope.name ? "child" : "native", entries: planned.archive.selection.entries.length,
          cost: planned.archive.cost, inventoryNodes: (JSON.parse(planned.mark.manifest) as { cost: { nodes: number } }).cost.nodes,
          qualification: "Original default budget pays native inventory and writing. Initial whole-prefix pass, no append validator or remote confirmation." });
        const held = new Map<string, JournalObject>(); let parent: string | null = null, after: Head | null = null;
        const written = new Set<string>(), expected = new Set(planned.archive.selection.objects.map(row =>
          row.key.kind === "value" ? `value/${row.key.domain}` : row.key.kind));
        const birth = read.value[0]!.entry.input;
        if (birth.type !== "genesis") throw Error("The real fixture must begin at genesis.");
        const privacySupport = policies.get(birth.seed.definition)!.support;
        // Independent original whole-pass receipts from the closed support
        // checkpoint. Later shared price extraction must not move both the
        // actual charges and the future formulas unnoticed.
        const originalPassCosts: Readonly<Record<string, ArchiveCost>> = {
          "sha256:5e2d34fa9965662aa508aaaffd83bdcd4198746ae8d4a8dd24654d74289529a4":
            { entries: 6, attempts: 30, nodes: 20, calls: 87, metadata: 265580, inputWork: 13291923 },
          "sha256:69424c1bbbf7c2f81528fcc6c910b1230a88d061ac3655c5bde916aaa2572c56":
            { entries: 4, attempts: 35, nodes: 20, calls: 79, metadata: 255134, inputWork: 18673194 },
          "platform:directory@16": { entries: 14, attempts: 128, nodes: 23, calls: 223, metadata: 474298, inputWork: 34957641 },
          "platform:rules@10": { entries: 11, attempts: 80, nodes: 23, calls: 164, metadata: 373104, inputWork: 36436351 },
          "platform:destination@12": { entries: 2, attempts: 26, nodes: 20, calls: 54, metadata: 234024, inputWork: 17754830 } };
        // Preserve the original fixture byte receipts verbatim. The separate
        // production scenario uses different recorded repository identity bytes.
        if (!productionScenario) expect(planned.archive.cost).toEqual(originalPassCosts[birth.seed.definition]);
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
            // Independent component receipt before fee extraction. The
            // separate original budget pays its own fresh prefix and JSON
            // allowance; neither scout work nor validation is credited.
            const sql = archiveSql(state), privacyBudget = new ArchiveBudget();
            const prefix = archivePrefixMetadata(sql, at, through, PROPOSED_BOUNDS, privacyBudget,
              { has: digest => policies.has(digest) }, receipt);
            const position = prefix.positions[0]!;
            expect(prefix.positions.map(row => row.seq)).toEqual([through.seq]);
            const beforeSupport = privacyBudget.admitted();
            archiveSupportMetadata(privacySupport, privacyBudget);
            const afterSupport = privacyBudget.admitted();
            const originalSupport = Object.fromEntries(Object.keys(afterSupport).map(key => [key,
              afterSupport[key as keyof ArchiveCost] - beforeSupport[key as keyof ArchiveCost]])) as ArchiveCost;
            const counts = recordArchiveSupportMetadata(privacySupport, privacyBudget), recorded = privacyBudget.admitted();
            expect(forecastArchiveSupportMetadata(counts)).toEqual(originalSupport);
            expect(recorded.metadata - afterSupport.metadata).toBe(128);
            expect(recorded.inputWork - afterSupport.inputWork).toBe(originalSupport.inputWork + 256);
            // Literal receipts measured before shared price extraction.
            const independentSupport: Readonly<Record<string, number>> = {
              "sha256:5e2d34fa9965662aa508aaaffd83bdcd4198746ae8d4a8dd24654d74289529a4": 512,
              "sha256:69424c1bbbf7c2f81528fcc6c910b1230a88d061ac3655c5bde916aaa2572c56": 0,
              "platform:directory@16": 1024, "platform:rules@10": 272640, "platform:destination@12": 378112 };
            expect(originalSupport).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0,
              inputWork: independentSupport[privacySupport.named] });
            supportComponents.push({ named: privacySupport.named, semanticName: privacySupport.definition.declared.name,
              role: scope.name === rootScope.name ? "root" : scope.name === childScope.name ? "child" : "native", digest: privacySupport.definition.digest,
              counts, delta: originalSupport, recordedDelta: { metadata: recorded.metadata - afterSupport.metadata,
                inputWork: recorded.inputWork - afterSupport.inputWork } });
            const beforePrivacy = privacyBudget.admitted(), sourceRow = { kind: "local" as const, position };
            const header = archiveEntryHeader(sql, sourceRow, privacyBudget);
            archiveEntryPrivacy(sql, sourceRow, header, privacySupport, privacyBudget);
            const afterPrivacy = privacyBudget.admitted(), delta = Object.fromEntries(Object.keys(afterPrivacy).map(key => [key,
              afterPrivacy[key as keyof ArchiveCost] - beforePrivacy[key as keyof ArchiveCost]])) as ArchiveCost;
            const quote = forecastArchiveEntryPrivacy({ input: header.input, effects: header.effects });
            expect(quote.ok).toBe(true); if (quote.ok) expect(quote.cost).toEqual(delta);
            // Literal receipts from the distinct original-function run.
            // Shared future and actual prices changing together must fail.
            const independent: Readonly<Record<string, readonly [number, number]>> = {
              "delivery:0": [1, 512], "genesis:11": [2, 6656], "outcome:1": [3, 1856], "preparation:3": [3, 2880] };
            const pinned = independent[`${header.input}:${header.effects}`];
            if (pinned) expect(delta).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: pinned[0], metadata: pinned[1], inputWork: pinned[1] });
            entryPrivacyComponents.push({ scope: scope.name, seq: through.seq, input: header.input, effects: header.effects, delta });
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
    if (kind === "Grow" && !productionScenario) for (const [input, effects] of [["delivery", 0], ["genesis", 11], ["outcome", 1], ["preparation", 3]] as const) {
      expect(entryPrivacyComponents.some(row => row.input === input && row.effects === effects), `${input}:${effects} original receipt is exercised`).toBe(true);
    }
    if (kind === "Grow" && !productionScenario) (context.task.meta as Record<string, unknown>)["sharedPassNativeFootprints"] = {
      passes: sharedPassFootprints, wholePasses: sharedWholePassFootprints,
      supportComponents, supportQualification: "Original trusted support validation plus repeated actual counted scout; same component budget pays fresh prefix, both full support validations,128metadata/256input count bookkeeping and privacy. Scalar forecast matches the original validation delta only, no refund/credit; final native inventory validates support afresh. No declaration payload body is fetched by this trusted support walk. No fresh validation credit or complete driver admission claim.",
      entryPrivacyComponents, entryPrivacyQualification: "Actual native header and entry-privacy calls before extraction, each component has its own unchanged default budget and fresh prefix/JSON reservation. Delta excludes that separately paid prefix, trusted support validation, foreign classification, and all payload reads; no whole-export or driver admission claimed.",
      qualification: "Actual installed Grow and its discovered native Directory16, Rules10 and Destination12 histories. Each diagnostic one-entry pass uses one original default30s ledger for fresh native inventory, canonical Git build and, for each noninitial pass, append validation. Genesis has no prior append and no append-validator claim. Real fixture entries and retained bytes; explicit TEST package peer, owner input, policy/source/authority configuration and scheduler. No remote confirmation, production admission or deployed cadence claim. Kind/domain counts concern these fixture entries, not all theoretically possible native entries."
    };
    if (productionScenario) {
      // Invariant: each actual installed/native entry fits a confirmed
      // one-entry driver pass on one unchanged default all-work allowance.
      // The TEST owner supplies that entry's actual fixed cutoff, not an
      // alarm cadence. HTTP/token/repository/policy remain explicit fixtures.
      const passes: unknown[] = [];
      const repository = (await life.wait(() => D.item(0))).values["repository"] as unknown as DestinationRepository;
      productionPeer = new ArchiveArtifactsPeer(repository, life.now);
      const peer = productionPeer;
      const environment = { ARTIFACTS: peer.binding,
        ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: repository.namespace, host: "service.invalid", maxBytes: 8 * 1024 * 1024, credentialIdentity: "adapter-attempt" }),
        GROW_ARCHIVE_CONFIG: canonicalize({ policy: "grow-room-archive-1", release: DEMO_RELEASE, directory: D.name, repositoryName: repository.name }),
      };
      const defaultAsk = { query: encodeItemQueryParameter({ v: 1, scope: directory, type: "repository", states: ["open"], ids: null, limit: 1, cursor: null })!, archiving: childBirth.at, directory };
      expect(await life.wait(() => (D.object as unknown as { archiveItem(ask: ArchiveHostItemAsk): Promise<unknown> }).archiveItem(defaultAsk))).toEqual({ ok: false, reason: "forbidden" });
      for (const scope of [D, G]) {
        archiveHostWiring.set(scope.name, hostConfig);
        life.cleanup(() => { archiveHostWiring.delete(scope.name); });
        await life.wait(() => scope.restart());
      }
      (context.task.meta as Record<string, unknown>)["adaptiveNativeCohorts"] = { passes,
        qualification: "Actual installed Grow root/child and Directory16/Rules10/Destination12, with native production host-item RPC, growArchiveDriver target/source preparation, adaptive writer, Mark and pending rebuild, actual Artifacts token adapter and smart-HTTP pack/send/readback. Exact committed signed demo packet and growArchivePolicies; TEST namespace, distinct enrolled agents, binding/HTTP peer, clock and scheduler; no real provider, alarm cadence or hosted acceptance. Every individual pass owns its default original30s ledger; first lost send and later rebuild retain separate costs. No source frame survives peer await." };
      let rebuildWitnessed = false;
      for (const { scope, read } of allHistories) {
        const at = await life.wait(() => scope.at());
        for (const sealed of read.value) {
          const cutoff = { seq: sealed.entry.seq, hash: sealed.hash };
          const later = read.value.find(row => row.entry.seq === cutoff.seq + 1);
          const ownerHead = !rebuildWitnessed && later ? { seq: later.entry.seq, hash: later.hash } : cutoff;
          const run = () => life.wait(() => runInDurableObject(scope.object, async (_instance, state) => {
            const native = archiveSql(state); let depth = 0, birthCalls = 0, sourceRefused = false, nativeRootReservations = 0;
            const phases: unknown[] = [];
            const sql: Sql = { ...native, transaction: work => { depth++; try { return native.transaction(work); } finally { depth--; } } };
            const binding = { idFromName: (name: string) => env.PLATFORM.idFromName(name), get: (id: DurableObjectId) => {
              const stub = env.PLATFORM.get(id);
              return new Proxy(stub, { get(target, key) {
                const value = Reflect.get(target, key);
                if (typeof value !== "function") return value;
                return async (...args: unknown[]) => {
                  if (key === "nativeBirth") { expect(depth).toBe(0); birthCalls++; }
                  try {
                    // RPC callables expose remote properties: .apply would itself
                    // become a remote method. Invoke the actual named RPC.
                    const reply = await (target as unknown as Record<PropertyKey, (...args: unknown[]) => Promise<unknown>>)[key]!(...args);
                    if (key === "nativeBirth") phases.push({ birth: { scope: (args[0] as ScopeRef).scope, reply: reply ? { named: (reply as { named: unknown }).named, native: (reply as { native: unknown }).native, birthUnits: (reply as { proof: { bytes: string } }).proof.bytes.length, birthBytes: utf8((reply as { proof: { bytes: string } }).proof.bytes).length } : null } });
                    return reply;
                  } catch (error) { phases.push({ rpc: String(key), error: String(error) }); throw error; }
                };
              } });
            } };
            const store = new SqliteStore(sql); let passBudget: ArchiveBudget | undefined;
            const options = growArchiveDriver(archiveGiven(store), sql, binding, environment, policies, PROPOSED_BOUNDS, peer.fetch);
            if (!options) return expect.fail("The explicit native TEST host configuration must be admitted");
            const sourcePreparation = options.sources!;
            const finishObserver = at.kind === "directory" && cutoff.seq === 2 ? observeDirectoryFinish(at, () => passBudget, cutoff, peer.data) : undefined;
            try {
            const driver = new ArchiveDriver({ ...options, target: { resolve: async (...args) => { const value = await options.target.resolve(...args); phases.push({ target: value, cost: args[2].admitted() }); return value; } }, sql, current: () => ({ at, head: ownerHead }), clock: () => timeOf(life.now()), bounds: PROPOSED_BOUNDS,
              sources: async (after, through, budget, exact) => {
                expect(budget).toBe(passBudget); phases.push({ sources: { after, through, exact }, cost: budget.admitted() });
                const prepared = await sourcePreparation(after, through, budget, exact);
                phases.push({ sourceReturn: { exact, rebuildWitnessed, keys: Object.keys(prepared), prepareType: typeof prepared.prepare } });
                if (exact) return prepared;
                return { ...prepared, prepare: async (seq, original) => {
                  phases.push({ prepareEntered: seq, budgetSame: original === passBudget });
                  expect(original).toBe(passBudget);
                  if (!rebuildWitnessed && seq > cutoff.seq) {
                    // TEST unavailable source after actual bounded metadata;
                    // its spent work stays on the original finish-fenced ledger.
                    sql.transaction(() => archiveSourceReferences(sql, seq, PROPOSED_BOUNDS, original));
                    sourceRefused = true; return stopArchivePrefix("foreign-source-unavailable");
                  }
                  const before = original.admitted();
                  await prepared.prepare!(seq, original);
                  phases.push({ sourcePrepared: seq, before, after: original.admitted() });
                } };
              },
              budget: () => {
                passBudget = new class extends ArchiveBudget {
                  override canSpend(cost: Partial<ArchiveCost>): boolean {
                    const fits = super.canSpend(cost);
                    if (!fits && phases.length < 64) {
                      const used = this.admitted(); phases.push({ rejectedFit: { cost, used } }); finishObserver?.rejected(cost, used);
                    }
                    return fits;
                  }
                  override spend(cost: Partial<ArchiveCost>): void {
                    if (cost.nodes === 1 && cost.inputWork === PROPOSED_BOUNDS.definitionBytes * 16) nativeRootReservations++;
                    const before = this.admitted();
                    try { super.spend(cost); }
                    catch (error) { if (phases.length < 64) phases.push({ rejectedDebit: { cost, used: before, error: String(error) } }); throw error; }
                  }
                }(); return passBudget;
              } });
            let result: Awaited<ReturnType<ArchiveDriver["run"]>>;
            try { result = await driver.run(); }
            finally { finishObserver?.restore(); }
            const finishDiagnostic = finishObserver?.report(), row = new ArchiveRows(sql, at).load();
            return { result, cost: passBudget!.admitted(), confirmed: row?.confirmed ?? null, pending: row?.pending ?? null, sourceRefused, birthCalls, phases, nativeRootReservations,
              ...(finishDiagnostic ? { finishDiagnostic } : {}) };
            } finally { finishObserver?.restore(); }
          }));
          if (!rebuildWitnessed) peer.failBeforeAccept = true;
          const initial = await run();
          // Only settled TEST diagnostics inspect the already captured Native
          // history. This serialization does not schedule/admit any pass.
          const entryShape = at.kind === "directory" && cutoff.seq === 2 ? {
            input: sealed.entry.input.type, inputKeys: Object.keys(sealed.entry.input).sort(),
            entryBytes: utf8(canonicalize(sealed.entry)).length,
            qualification: "Already captured genuine Native entry; post-run shape only, no new journal read or body output." } : undefined;
          if (entryShape) (context.task.meta as Record<string, unknown>)["directoryAppendEntryShape"] = { at, cutoff, ...entryShape };
          expect(initial.cost.entries, JSON.stringify({ scope: scope.name, cutoff, initial, ...(entryShape ? { entryShape } : {}) })).toBe(2);
          let outcome = initial;
          if (!rebuildWitnessed) {
            expect(initial.sourceRefused).toBe(true);
            expect(initial.result).toMatchObject({ state: "retry" });
            expect(initial.pending?.through).toEqual(cutoff);
            const commit = initial.pending!.commit;
            await life.wait(() => scope.restart());
            life.active(); net.clock.now = timeOf(life.now() + PROPOSED_BOUNDS.dispatchRetrySeconds * 1000);
            outcome = await run();
            expect(outcome.confirmed?.commit).toBe(commit);
            expect(peer.posts[1]).toEqual(peer.posts[0]);
            rebuildWitnessed = true;
          }
          passes.push({ scope: scope.name, seq: cutoff.seq, initial, ...(outcome === initial ? {} : { rebuilt: outcome }) });
          expect(outcome.result, JSON.stringify(passes.at(-1))).toMatchObject({ state: "confirmed" });
          expect(outcome.confirmed?.through).toEqual(cutoff);
          if (at.kind === "directory" && cutoff.seq === 0) expect(initial.nativeRootReservations).toBe(2); // fresh Scout + fresh final inventory
          expect(initial.cost.inputWork).toBeLessThanOrEqual(64 * 1024 * 1024);
          expect(outcome.cost.inputWork).toBeLessThanOrEqual(64 * 1024 * 1024);
        }
        expect((await life.wait(() => scope.sealed())).map(row => row.hash)).toEqual(read.value.map(row => row.hash));
      }
      const entries = allHistories.reduce((count, history) => count + history.read.value.length, 0);
      expect(passes).toHaveLength(entries); expect(peer.sends).toHaveLength(entries);
      expect(peer.minted.filter(token => token.scope === "write")).toHaveLength(entries + 1);
      expect(peer.revoked).toHaveLength(entries + 1);
      // Install the actual production factory on an already confirmed,
      // quiescent native Destination. A real alarm must clear idle work.
      roomArchiveWiring.set(G.name, (given, sql, bounds) => {
        const options = growArchiveDriver(given, sql, env.PLATFORM, environment, policies, bounds, peer.fetch);
        if (!options) throw Error("Exact Grow archive factory is required"); return options;
      });
      life.cleanup(() => { roomArchiveWiring.delete(G.name); });
      await life.wait(() => G.restart());
      await life.wait(() => (G.object as unknown as { readiness(): Promise<unknown> }).readiness());
      expect(await life.wait(() => runDurableObjectAlarm(G.object))).toBe(true);
      const idleNativeWake = await life.wait(() => runInDurableObject(G.object, async (_instance, state) => ({
        archive: new ArchiveRows(archiveSql(state), await G.at()).wake(), alarm: await state.storage.getAlarm(),
      })));
      expect(idleNativeWake.archive).toBeNull();
      // Hold a second target reply while a genuine checkpoint seals and its
      // real production onSealed callback signals the index. No row is forged.
      const writesBeforeIdleGuard = peer.minted.filter(token => token.scope === "write").length;
      const concurrentIdle = await life.wait(() => runInDurableObject(G.object, async (_instance, state) => {
        const sql = archiveSql(state), store = new SqliteStore(sql);
        const options = growArchiveDriver(archiveGiven(store), sql, env.PLATFORM, environment, policies, PROPOSED_BOUNDS, peer.fetch);
        if (!options) throw Error("Exact Grow archive wiring is required");
        let checkpoint: Checkpointed | undefined; const budget = new ArchiveBudget();
        const driver = new ArchiveDriver({ ...options, sql, current: () => store.scope(), clock: () => timeOf(life.now()), bounds: PROPOSED_BOUNDS, budget: () => budget,
          target: { resolve: async (...args) => {
            const repository = await options.target.resolve(...args);
            checkpoint = await (G.object as unknown as { checkpoint(): Promise<Checkpointed> }).checkpoint();
            expect(checkpoint).toMatchObject({ answer: "written" }); return repository;
          } },
        });
        const result = await driver.run(), wake = new ArchiveRows(sql, (await G.at())).wake();
        const index = sql.exec("SELECT v FROM meta WHERE k='archive-wake-1'").toArray()[0]?.["v"];
        return { result, wake, index: typeof index === "string" ? parseStrict(index) : null, checkpoint, cost: budget.admitted() };
      }));
      expect(concurrentIdle.result.state).toBe("retry"); expect(concurrentIdle.result.next).toBe(concurrentIdle.wake);
      expect(timeMs(concurrentIdle.wake!)).toBeGreaterThan(life.now());
      expect(concurrentIdle.index).toEqual({ pending: true, stopped: false, next: concurrentIdle.wake });
      expect(peer.minted.filter(token => token.scope === "write")).toHaveLength(writesBeforeIdleGuard);
      (context.task.meta as Record<string, unknown>)["productionIdleWake"] = { idleNativeWake, concurrentIdle,
        qualification: "An actual production ScopeObject alarm cleared its archive wake on confirmed idle. During another real target await a genuine checkpoint/onSealed advanced the Native head; a charged fresh identity/head frame preserved the actual pending index. No Mark, write token or send for that tail. The global alarm can independently belong to another Native owner." };
      for (const excluded of [R, M]) {
        const writes = peer.minted.filter(token => token.scope === "write").length;
        const result = await life.wait(() => runInDurableObject(excluded.object, (_instance, state) => {
          const sql = archiveSql(state), store = new SqliteStore(sql);
          const options = growArchiveDriver(archiveGiven(store), sql, env.PLATFORM, environment, policies, PROPOSED_BOUNDS, peer.fetch);
          if (!options) return expect.fail("The explicit host configuration exists");
          return new ArchiveDriver({ ...options, sql, current: () => store.scope(), clock: () => timeOf(life.now()), bounds: PROPOSED_BOUNDS }).run();
        }));
        expect(result).toEqual({ state: "disabled", next: null });
        expect(peer.minted.filter(token => token.scope === "write")).toHaveLength(writes);
        expect(peer.refs.has(journalRef(excluded.name))).toBe(false);
      }
      for (const object of peer.data.values()) expect(new TextDecoder().decode(object.data)).not.toContain("TEST-write-");
    }

    if (kind === "Grow") {
      // A constructed enrol copy and a listed kind with a nested secret
      // must refuse the whole export before any body/integrity read. The
      // copied digest is intentionally unchanged: this is the earlier
      // metadata refusal boundary, not a forged journal acceptance test.
      const membershipGrants = productionScenario ? (await life.wait(() => M.sealed())).filter(sealed => {
        const input = sealed.entry.input;
        return input.type === "delivery" && input.message.class === "request" && input.message.type === "tell"
          && (input.message.body as { message?: unknown })["message"] === "application-grants";
      }) : [];
      if (productionScenario) expect(membershipGrants).toHaveLength(1);
      const copy = credentialCopies.find(copy => copy.journal === D.name && copy.source.seq === (productionScenario ? membershipGrants[0]!.entry.seq : 5));
      const act = (await life.wait(() => M.sealed())).find(sealed => sealed.entry.input.type === "act")?.entry.input;
      if (!copy || act?.type !== "act") throw Error("Native Membership copy and signed act are required.");
      const refused = await life.wait(() => runInDurableObject(D.object, async (_instance, state) => {
        const sql = archiveSql(state), held = sql.exec("SELECT bytes FROM retained_input WHERE kind = 'entry' AND digest = ? LIMIT 1", copy.content).toArray()[0]?.["bytes"];
        if (typeof held !== "string") throw Error("Actual retained Membership bytes are required.");
        const entry = parseStrict(held);
        if (!isEntry(entry) || entry.input.type !== "delivery") throw Error("The native grant reply copy is required.");
        // Independent component measurement on the actual public grant
        // reply. This budget pays its own header JSON work before the delta;
        // it supplies no credit to any diagnostic export budget above.
        const componentBudget = new ArchiveBudget(), bytes = utf8(held).length;
        const header = archiveEntryHeader(sql, { kind: "copy", content: copy.content, bytes }, componentBudget);
        const before = componentBudget.admitted();
        archiveMembershipCopy(sql, copy.content, bytes, header, "platform:directory@16", componentBudget);
        const after = componentBudget.admitted(), membershipCopyCost = Object.fromEntries(Object.keys(before).map(key =>
          [key, after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]])) as ArchiveCost;
        expect(membershipCopyCost).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 512, inputWork: 512 + bytes * 16 });
        expect(forecastArchiveMembershipCopy(bytes)).toEqual(membershipCopyCost);
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
        return { results, membershipCopyCost, bytes };
      }));
      (context.task.meta as Record<string, unknown>)["membershipCopyCostReceipt"] = { bytes: refused.bytes, cost: refused.membershipCopyCost, qualification: "Actual native public Membership8 application-grants copy in Directory16; independent component budget pays its own original header JSON first. Delta is only original kind/secret-field scan; no diagnostic export credit, new policy or full driver claim." };
      expect(refused.results).toEqual(Array.from({ length: 3 }, () => ({ ok: false, reason: "unsupported-credential-cohort" })));
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
    // Independent Native facts: the original variants retain literal heads
    // 4 and 6; production uses its captured install authority fact. These
    // expected reads do not feed the export-derived anchor list.
    const productionGrants = productionScenario ? memberEntries.filter(sealed => {
      const input = sealed.entry.input;
      return input.type === "delivery" && input.message.class === "request" && input.message.type === "tell"
        && (input.message.body as { message?: unknown })["message"] === "application-grants";
    }) : [];
    if (productionScenario) expect(productionGrants).toHaveLength(1);
    // Actual install authority head and public grant delivery, not exported
    // anchors or a summary captured before the install authority read.
    const expectedMemberPositions = productionScenario ? [0, nativeInstallOracle!.memberHead.seq, productionGrants[0]!.entry.seq, memberEntries.at(-1)!.entry.seq] : [0, 4, 5, 6];
    const expectedAnchors = [1, 2, 3].map(seq => registerEntries.find(entry => entry.entry.seq === seq)!)
      .concat([...new Set(expectedMemberPositions)].map(seq => memberEntries.find(entry => entry.entry.seq === seq)!))
      .map(sealed => ({ at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash }))
      .sort((a, b) => a.at.scope < b.at.scope ? -1 : a.at.scope > b.at.scope ? 1 : a.seq - b.seq);
    if (productionScenario) { expect(expectedAnchors).toHaveLength(7); expect(expectedAnchors).toContainEqual(nativeInstallOracle!.memberHead); }
    expect(anchorFacts).toEqual(expectedAnchors);
    expect(anchorFacts).toContainEqual(claim);
    expect(anchorFacts.every(fact => !diagnosticArchives.has(fact.at.scope))).toBe(true);
    const anchors = anchorFacts.map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash }));
    // A2 reads exactly the five self-journal archives,
    // without a service. Private facts and values observed at their heads
    // are caller-trusted; copied bodies supply no source proof.
    const diagnosticObjects = productionPeer?.data ?? new Map([...diagnosticArchives.values()].flatMap(archive => archive.objects.map(object => [object.id, object] as const)));
    const diagnosticRefs = productionPeer?.refs ?? new Map([...diagnosticArchives].map(([scope, archive]) => [journalRef(scope), archive.commit]));
    const omittedDigest = productionScenario ? textDigest(packet.package.semantic.definitions.find(part => part.id === childId)!.bytes)
      : "sha256:9e0a5a28346594dcd3a95794d1d66951691e6de65adc1582e788ba5ef3085530";
    const knownDeclarationTexts = packet.package.semantic.definitions.map(part => ({ digest: textDigest(part.bytes), bytes: utf8(canonicalize(part.bytes)).length }));
    const nativeExpectedOmissions = productionScenario ? (await Promise.all(allHistories.map(async ({ scope, read }) => {
      // Exact signed installation inputs, with direct Native scalar sizes
      // and first naming entries. No archive manifest supplies this oracle.
      const rows = await life.wait(() => runInDurableObject(scope.object, (_instance, state) => knownDeclarationTexts.map(text => ({ ...text,
        actual: archiveSql(state).exec("SELECT octet_length(bytes) AS size FROM retained_input WHERE kind = 'text' AND digest = ? LIMIT 1", text.digest).toArray()[0]?.["size"],
      }))));
      return rows.filter(row => row.actual !== undefined).map(row => {
        expect(row.actual).toBe(row.bytes);
        const at = read.value[0]!.entry.at, first = nativeTextFirsts.get(canonicalize([at, row.digest]));
        if (!first) throw Error("Native retained declaration text needs a declared detached-field naming entry");
        return { digest: row.digest, bytes: row.bytes, first };
      });
    }))).flat() : [];
    const expectedOmissions = productionScenario ? nativeExpectedOmissions : allHistories.flatMap(({ scope, read }) => {
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
    const declarationFirst = productionScenario ? nativeStageOracle!.fact.seq : 5;
    expect(expectedOmissions.some(row => row.digest === omittedDigest && row.first.at.scope === D.name && row.first.seq === declarationFirst)).toBe(true);
    const probe = allHistories[0]!;
    const memberHead = productionScenario ? nativeInstallOracle!.memberHead : expectedAnchors.find(fact => fact.at.scope === M.name && fact.seq === 4)!;
    const nativeRulesRows = allHistories.find(history => history.scope.name === A.name)!.read.value;
    const rulesEntry = productionScenario ? nativeInstallOracle!.rulesEntry : nativeRulesRows[2]!;
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
      if (missing === memberHead) expect(offline.verification.report.at).toEqual({ at: rulesEntry.entry.at, seq: productionScenario ? rulesEntry.entry.seq : 2, hash: rulesEntry.hash });
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
    if (productionScenario) {
      // Actual dap parser/handler signs and retrieves the read credential on
      // the native destination. Only the Artifacts binding/token authority
      // and loopback transport are TEST stand-ins; Git and replay bin are real.
      const bridge = localClone(inject("localClone"));
      const repository = (await life.wait(() => D.item(0))).values["repository"] as unknown as DestinationRepository;
      const commandSession = await life.wait(() => bridge.archiveCommand(
        cloned.objects, cloned.refs, `https://archive-command.invalid/git/${repository.namespace}/${repository.name}.git`,
      ));
      let mints = 0;
      const binding: ArtifactsNamespace = {
        get: async name => ({
          createToken: async (scope, seconds) => {
            expect(scope).toBe("read"); expect(seconds).toBe(3600); expect(++mints).toBe(1);
            return { id: "public-test-command-read", plaintext: commandSession.token, scope, expiresAt: timeOf(life.now() + seconds * 1000) };
          },
          revokeToken: async () => true,
          info: async () => ({ name, remote: commandSession.remote }),
        }),
        create: async () => { throw Error("No creation in command witness"); }, delete: async () => false,
      };
      life.outside(G.name, (given, sql) => {
        const outside = artifactsOutside(given, sql, { ARTIFACTS: binding, ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: repository.namespace, host: "archive-command.invalid", maxBytes: 8 * 1024 * 1024, credentialIdentity: "adapter-attempt" }) });
        return { ...outside, accepts: (owner, operation) => operation === "mint-read" && outside.accepts(owner, operation), send: request => request.kind === "mint-read" ? outside.send(request) : Promise.resolve(null) };
      });
      await life.wait(() => G.restart());
      const store = cliMemoryStore(); await store.keep("member", rita.secret);
      await store.save({ v: 1, service: port.service, key: "member", repository: { directory, membership, rules: A.name, destination: G.name } });
      const clonedCommand = await life.wait(() => dapCommand({ store, fetch: routed, now: life.now,
        pause: async () => { await driveFixture([G], life.wait); },
        git: { run: (args, env) => life.wait(() => bridge.archiveRun(commandSession.id, args, env)), archiveRun: (args, env) => life.wait(() => bridge.archiveRun(commandSession.id, args, env)) },
      }, ["clone", commandSession.directory, "--hours", "1", "--archive"]));
      expect(clonedCommand.code, clonedCommand.lines.join("\n")).toBe(0); expect(mints).toBe(1);
      commandHandoff = { producer: producerTitle, id: commandSession.id, lines: [...clonedCommand.lines],
        refs: [...diagnosticRefs].map(([ref, id]) => ({ ref, id })) };
    }
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
    // Keep the original transport map cleared. The already verified clone
    // supplies a coherent complete object/ref pair for both negative controls.
    const omissionControls: unknown[] = [];
    (context.task.meta as Record<string, unknown>)["omissionControls"] = omissionControls;
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
      const objects = new Map(clonedObjects), refs = new Map(clonedRefs);
      for (const object of corrupt.archive.objects) objects.set(object.id, object);
      refs.set(journalRef(D.name), corrupt.archive.commit);
      const source = archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
        format: async () => "sha1", resolve: async ref => refs.get(ref) ?? null,
        object: async (id, limit) => { const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
      }, scope, work) });
      const directory = allHistories.find(history => history.scope.name === D.name)!;
      const replayed = await life.wait(() => verifyArchive(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: D.name, head: directory.read.at, anchors }));
      const expectedAt = productionScenario ? nativeStageOracle!.fact : { at: directory.read.value[5]!.entry.at, seq: 5, hash: directory.read.value[5]!.hash };
      // At most two metadata-only results; record BEFORE any assertion so an
      // unexpected category retains its actual reason without payload bodies.
      omissionControls.push({ corruption, expectedAt, result: replayed.kind === "archive-failure"
        ? { kind: replayed.kind, result: replayed.result, reason: replayed.reason.slice(0, 2048), reasonTruncated: replayed.reason.length > 2048, location: replayed.location }
        : { kind: replayed.kind, result: replayed.verification.report.result, at: replayed.verification.report.at } });
      if (corruption === "missing") expect(replayed).toMatchObject({ kind: "verification", verification: { report: { result: "incomplete", at: expectedAt } } });
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
    if (productionScenario) {
      expect(commandHandoff, "the successful native producer must retain its exact command session").toBeDefined();
      if (!commandHandoff) expect.fail("missing native command session");
      expect(retainedCommand, "a producer must publish its handoff once").toBeNull();
      retainedCommand = commandHandoff;
    }
  } finally { life.release(); }
  });

  if (scenario === "Grow production") {
    test(`installed ${scenario} public archive command verifies its native producer clone`, { timeout: 30_000 }, async context => {
      const basis = retainedCommand;
      if (!basis) expect.fail("the immediately preceding native producer did not publish a command session");
      retainedCommand = null;
      const bridge = localClone(inject("localClone"));
      let pending: ReturnType<typeof bridge.archiveFinish> | undefined;
      const close = async () => {
        if (pending) await pending.catch(() => undefined);
        const closed = await bridge.archiveClose(basis.id);
        expect(closed.closed, "the exact producer command session must be closed").toBe(true);
      };
      context.onTestFinished(close);
      try {
        expect(basis.producer).toBe(producerTitle);
        expect(basis.refs).toHaveLength(5);
        pending = bridge.archiveFinish(basis.id, basis.lines);
        const command = await pending;
        expect(command.cloneCode).toBe(0); expect(command.fetchCode).toBe(0);
        expect(command.refs).toHaveLength(5);
        expect([...command.refs].sort((a, b) => a.ref.localeCompare(b.ref))).toEqual([...basis.refs].sort((a, b) => a.ref.localeCompare(b.ref)));
        expect(command.tokenInConfig).toBe(false); expect(command.tokenInArgv).toBe(false); expect(command.tokenInOutput).toBe(false);
        expect(command.readRequests).toBeGreaterThan(1);
        expect(command.withoutTrust.signal).toBeNull(); expect(command.withoutTrust.code).toBe(1);
        const untrusted = command.withoutTrust.report as { journals: { kind: string; verification?: { report: { result: string } } }[]; publishedAnchorsTrusted: boolean };
        expect(untrusted.publishedAnchorsTrusted).toBe(false);
        expect(untrusted.journals).toHaveLength(5);
        expect(untrusted.journals.some(result => result.kind === "verification" && result.verification?.report.result !== "consistent")).toBe(true);
        Object.assign(context.task.meta, { archiveCommandReports: { withoutTrust: commandReportDiagnostic(command.withoutTrust.report), withTrust: commandReportDiagnostic(command.withTrust.report) } });
        expect(command.withTrust.signal).toBeNull(); expect(command.withTrust.code, JSON.stringify(commandReportDiagnostic(command.withTrust.report))).toBe(0);
        const trusted = command.withTrust.report as { journals: { kind: string; verification: { report: { result: string } } }[]; publishedAnchorsTrusted: boolean; secretCheck: { result: string } };
        expect(trusted.publishedAnchorsTrusted).toBe(true);
        expect(trusted.journals).toHaveLength(5);
        expect(trusted.journals.every(result => result.kind === "verification" && result.verification.report.result === "consistent")).toBe(true);
        expect(trusted.secretCheck.result).toBe("no-recognized-secret");
      } finally { await close(); }
    });
  }
}

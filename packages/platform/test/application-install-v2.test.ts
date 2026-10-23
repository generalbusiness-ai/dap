import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
/** Real native v2 proof admission and fold in memory. Rulebook's registrar,
 * authority, host answers and declaration-text availability are labelled
 * fixtures. No object storage, network, driver or browser runs here; the
 * second case creates native siblings and the declared application in memory. */
import { expect, test } from "vitest";
import { canonicalize, definitionDigest, keyIdOfSecret, sign, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { packApplication } from "@generalbusiness/dap-bytes/application";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { Ledger, T0, arriving, creation, grantOf, keys, membership, sent } from "@generalbusiness/dap-derive/testing";
import { clockOf, judgeDelivery, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2, DECLARED_APPLICATION_RULES } from "../src/application-install-v2.ts";
import { APPLICATION_INSTALL_RULES } from "../src/application-install.ts";
import { Rulebook } from "./fixtures-entry.ts";
import { DECLARED_APPLICATION_COHORT } from "../src/application-install-v2-wire.ts";
import { ARCHIVE_DECLARED_APPLICATION_COHORT } from "../src/archive-binding-wire.ts";
import { declaredApplicationPublicationOrigin, installedApplicationPublicationOrigin, archiveDeclaredApplicationPublicationOrigin } from "../src/publishing-provenance.ts";
import { applicationAnnouncement } from "../src/application-install-creation.ts";
import { applicationProjectionDeclaration } from "../src/application-projection-reader.ts";

async function fixture(requireArchive = false) {
  const id = definitionDigest(countingCommitments), declaration = canonicalize(countingCommitments);
  const input = { name: "test.declared-install", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2 as const, entry: id, definitions: [{ id, bytes: declaration }],
    host: { execution: "recorded-do" as const, profiles: ["restricted@1"], ...(requireArchive ? { requires: ["archive"] as const } : {}) }, capabilities: [], roles: { member: ["counting.fulfill"],
      setup: ["counting.activity", "counting.commit", "counting.control", "counting.establish", "counting.fail", "counting.participate"],
    }, predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2 as const, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } };
  const secret = new Uint8Array(32).fill(64), signer = { key: keyIdOfSecret(secret), sign: (bytes: Uint8Array) => sign(secret, bytes) };
  const packet = await packApplication2(input, signer);
  const { views: _views, resources: _resources, ...presentation } = input.presentation;
  const { connections: _connections, rights: _rights, exercises: _exercises, groups: _groups, order: _order, derivation: _derivation, parameters: _parameters, ...legacySemantic } = input.semantic;
  const legacy = await packApplication({ ...input, semantic: { ...legacySemantic, v: 1, projections: {} }, presentation: { ...presentation, v: 1 } }, signer);
  const fields = { definitionText0: textDigest(declaration), uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release,
    semantic: packet.ids.semantic, roles: ["member"], values: '{"target":7}' };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const texts = (digest: string) => digest === textDigest(declaration) ? utf8(declaration).length : undefined;
  return { input, signer, packet, legacy, fields, values, texts };
}
test("new native pin retains exact v2 proof and projection while Rules5 refuses the new wire", async () => {
  const { input, signer, packet, legacy, fields, values, texts } = await fixture();
  const next = new Rulebook(true, membership.scope, DECLARED_APPLICATION_RULES), old = new Rulebook(true, membership.scope, APPLICATION_INSTALL_RULES);
  expect(old.act(keys.rita, "install-application", { fields }, { values, texts }).result).not.toBe("write");
  expect(next.act(keys.rita, "install-application", { fields }, { values, texts: () => undefined }).result).not.toBe("write");
  const written = next.act(keys.rita, "install-application", { fields }, { values, texts });
  expect(written.result, JSON.stringify(written)).toBe("write");
  expect(next.item(next.head.seq)).toMatchObject({ state: "pending", values: { phase: "fetch", semantic: packet.ids.semantic } });
  expect(next.state.operation(`${next.head.seq}:0`)).toMatchObject({ owner: DECLARED_APPLICATION_RULES, kind: "fetch-application" });
  expect(written.result === "write" ? written.draft.values : []).toHaveLength(2);
  expect(written.result === "write" ? written.draft.values : []).toEqual(expect.arrayContaining([
    { domain: APPLICATION_SEMANTIC_VALUE2.domain, digest: packet.ids.semantic, bytes: values[0] },
    { domain: APPLICATION_RELEASE_VALUE2.domain, digest: packet.ids.release, bytes: values[1] },
  ]));
  expect(next.replay().snapshot()).toEqual(next.state.snapshot());
  const legacyFields = { ...fields, semantic: legacy.ids.semantic, release: legacy.ids.release };
  const legacyValues = [canonicalize(legacy.package.semantic), canonicalize(legacy.package.release)];
  expect(next.act(keys.rita, "install-application", { fields: legacyFields }, { values: legacyValues, texts }).result).not.toBe("write");
  expect(old.act(keys.rita, "install-application", { fields: legacyFields }, { values: legacyValues, texts }).result).toBe("write");
  // Portable closure/signatures cannot replace whole native admission.
  // This schema still binds the selected fields but names an unknown state.
  const unsupported = structuredClone(countingCommitments);
  unsupported.acts["establish"]!.guards = [{ state: ["not-a-native-state"] }];
  const unsupportedId = definitionDigest(unsupported), unsupportedText = canonicalize(unsupported);
  const unsupportedPacket = await packApplication2({ ...input, semantic: { ...input.semantic, entry: unsupportedId,
    definitions: [{ id: unsupportedId, bytes: unsupportedText }],
    projections: { board: readApplicationProjection({ ...input.semantic.projections.board, definition: unsupportedId }) },
  } }, signer);
  expect(next.act(keys.rita, "install-application", { fields: { ...fields, definitionText0: textDigest(unsupportedText),
    semantic: unsupportedPacket.ids.semantic, release: unsupportedPacket.ids.release } }, {
    values: [canonicalize(unsupportedPacket.package.semantic), canonicalize(unsupportedPacket.package.release)],
    texts: digest => digest === textDigest(unsupportedText) ? utf8(unsupportedText).length : undefined,
  }).result).toBe("refused");
});

test.each([
  { name: "declared", cohort: DECLARED_APPLICATION_COHORT, origin: declaredApplicationPublicationOrigin, other: archiveDeclaredApplicationPublicationOrigin,
    pins: ["platform:register@13", "platform:directory@12", "platform:membership@7", "platform:rules@6", "platform:destination@8"] },
  { name: "archive declared", cohort: ARCHIVE_DECLARED_APPLICATION_COHORT, origin: archiveDeclaredApplicationPublicationOrigin, other: declaredApplicationPublicationOrigin,
    pins: ["platform:register@15", "platform:directory@14", "platform:membership@8", "platform:rules@8", "platform:destination@10"] },
])("$name cohort creates its exact native siblings and routes selected role additions", async ({ cohort, origin, other, pins }) => {
  const { installGraph } = await import("./support-application-install.ts");
  const { R, D, M, A, G, send } = installGraph(cohort);
  expect([R.named, D.named, M.named, A.named, G.named]).toEqual(pins);
  const { fields, values, texts, packet } = await fixture();
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  expect(A.act(installer, "install-application", { fields }, { values, texts, membership: M.at,
    grants: [{ grant: grantOf(installer, A.at, ["application.install"]), current: true }],
  }).result).toBe("write");
  const job = A.head.seq, answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: textDigest("PUBLIC TEST scripted admission policy") };
  const fetched = A.outcome(`${job}:0`, answer), admitted = A.outcome(`${fetched}:0`, answer);
  A.texts = texts;
  send(D, A, admitted);
  expect(D.state.page("application-catalog", ["retained"], null, 16).items).toMatchObject([{ values: { definition: packet.package.semantic.entry } }]);
  send(A, D, D.head.seq, D.last.sends.find(send => send.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(send => send.message.class === "request")!.n);
  send(M, D, D.head.seq, D.last.sends.find(send => send.message.class === "request")!.n);
  send(A, M, M.head.seq, M.last.sends.find(send => send.message.class === "request")!.n);
  expect(A.item(job).values["phase"]).toBe("creation");
  expect(M.item(0).values["memberActions"]).toContain("counting.fulfill");
  expect(M.item(0).values["adminActions"]).not.toContain("counting.fulfill");
  send(D, A, A.head.seq, A.last.sends.find(send => send.message.class === "request")!.n);
  const create = D.last.sends.find(send => send.message.class === "request")!;
  expect(create, canonicalize(D.last.input)).toBeDefined(); if (!create) return;
  const checked = validateDefinition(countingCommitments, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok).toBe(true); if (!checked.ok) return;
  const app = new Ledger(checked.definition, countingCommitments.name), { asked, source } = creation(D, D.head.seq, create.n, 40);
  const nodes = [R, D, M, A, G, app];
  const facts = () => nodes.flatMap(node => node.entries.map(({ entry }, seq) => ({ fact: node.fact(seq), entry, under: node.under })));
  const born = judgeGenesis(app.state, app.definition, asked, { clock: clockOf(app.state, T0), bounds: app.bounds, facts: facts(), prepared: [], source });
  expect(born.result, JSON.stringify(born)).toBe("write"); if (born.result !== "write") return;
  expect(born.draft.input).toMatchObject({ type: "genesis", decision: "applied" }); app.seal(born.draft);
  expect(origin(app.fact(0), D.at, G.at, facts())).toBe(true);
  expect(other(app.fact(0), D.at, G.at, facts())).toBe(false);
  expect(installedApplicationPublicationOrigin(app.fact(0), D.at, G.at, facts())).toBe(false);
  expect(origin(app.fact(0), D.at, { ...G.at, scope: M.at.scope }, facts())).toBe(false);
  const retained = (domain: string, digest: string, most: number) => {
    const bytes = domain === APPLICATION_SEMANTIC_VALUE2.domain && digest === packet.ids.semantic ? values[0]
      : domain === APPLICATION_RELEASE_VALUE2.domain && digest === packet.ids.release ? values[1] : undefined;
    return bytes !== undefined && utf8(bytes).length <= most ? JSON.parse(bytes) : undefined;
  };
  expect(applicationProjectionDeclaration(A.state, A.named, D.at, job, "board", retained)).toBeNull();
  const result = sent(app, 0, 0);
  D.take(judgeDelivery(D.state, D.definition, result.delivered, { ...arriving(D, result.delivered, result.source, facts()), platform: D.authority }));
  const completed = D.head.seq, confirm = D.last.sends.find(send => send.message.class === "control")!;
  const confirmation = sent(D, completed, confirm.n);
  const active = judgeDelivery(app.state, app.definition, confirmation.delivered, arriving(app, confirmation.delivered, confirmation.source, facts()));
  expect(active.result, JSON.stringify(active)).toBe("write"); if (active.result !== "write") return; app.seal(active.draft);
  const notice = applicationAnnouncement(D.state, D.own, `${completed}:0`);
  expect(notice).not.toBeNull();
  const announced = D.outcome(`${completed}:0`, notice);
  send(A, D, announced, D.last.sends.find(send => send.message.class === "request")!.n);
  expect(A.item(job)).toMatchObject({ state: "active", refs: { scope: app.at } });
  const declared = applicationProjectionDeclaration(A.state, A.named, D.at, job, "board", retained);
  expect(declared).toMatchObject({ name: "board", projection: packet.package.semantic.projections["board"], definition: packet.package.semantic.definitions[0] });
  expect(applicationProjectionDeclaration(A.state, A.named, D.at, job, "missing", retained)).toBeNull();
  expect(applicationProjectionDeclaration(A.state, APPLICATION_INSTALL_RULES, D.at, job, "board", retained)).toBeNull();
  expect(applicationProjectionDeclaration(A.state, A.named, D.at, job, "board", () => undefined)).toBeNull();
  for (const node of nodes) expect(node.replay().snapshot()).toEqual(node.state.snapshot());
});

// Invariant: only the explicit archive pin admits a signed archive requirement.
test("archive v2 admission retains the requirement while the shipped Rules6 pin refuses it", async () => {
  const { ARCHIVE_DECLARED_APPLICATION_COHORT: C } = await import("../src/index.ts");
  const { packet, fields, values, texts } = await fixture(true);
  const next = new Rulebook(true, membership.scope, C.rules), old = new Rulebook(true, membership.scope, DECLARED_APPLICATION_RULES);
  const before = old.state.snapshot();
  expect(old.act(keys.rita, "install-application", { fields }, { values, texts })).toMatchObject({ result: "refused" });
  expect(old.state.snapshot()).toEqual(before);
  expect(next.act(keys.rita, "install-application", { fields }, { values, texts })).toMatchObject({ result: "write" });
  expect(next.item(next.head.seq)).toMatchObject({ state: "pending", values: { semantic: packet.ids.semantic, requirements: { archive: true, destination: false } } });
  expect(next.state.operation(`${next.head.seq}:0`)).toMatchObject({ owner: C.rules, kind: "fetch-application" });
  expect(next.replay().snapshot()).toEqual(next.state.snapshot());
});

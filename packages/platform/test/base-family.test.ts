/** The `base` family of CF-1 in memory (ruling 68356c6c, point 6, and 710a5d76): real Native judges for Register 28,
 * Directory 27, Membership 14, Rules 15 and Destination 21. Host answers and declaration-text availability are
 * labelled fixtures, as in application-install-v2.test.ts. No storage, network, driver or browser runs here. */
import { expect, test } from "vitest";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { canonicalize, definitionDigest, keyIdOfSecret, scopeIdOf, sign, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { Ledger, T0, arriving, creation, grantOf, keys, fixtureSequence, sent } from "@generalbusiness/dap-derive/testing";
import { clockOf, creationContextOf, judgeDelivery, judgeGenesis, validateDefinition } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { packApplication2, readApplicationProjection } from "../src/application-codec/application-v2.ts";
import { APPLICATION_PATHS, BASE_COHORT as C, UNPUBLISHED_COHORT, DIRECTORY_OF, NEWEST, PUBLICATION_PATHS, SIBLINGS_OF, applicationPublicationPrefixes } from "../src/index.ts";
import { baseApplicationPublicationOrigin, ownAgentApplicationPublicationOrigin } from "../src/publishing-provenance.ts";
import { installGraph } from "./support-application-install.ts";

/** One signed Counter package, with or without a publication declaration. */
async function counter(prefixes: readonly string[] | null) {
  const id = definitionDigest(countingCommitments), declaration = canonicalize(countingCommitments);
  const packet = await packApplication2({ name: "test.base-counter", version: prefixes ? "2" : "1", semantic: {
    ...emptyPackageComposition(), v: 2 as const, entry: id, definitions: [{ id, bytes: declaration }],
    host: { execution: "recorded-do" as const, profiles: ["restricted@1"] },
    capabilities: prefixes ? [{ name: PUBLICATION_PATHS, bounds: { prefixes: [...prefixes] } }] : [],
    roles: { member: ["counting.fulfill"], setup: ["counting.activity", "counting.commit", "counting.control", "counting.establish", "counting.fail", "counting.participate"] },
    predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2 as const, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } },
  { key: keyIdOfSecret(new Uint8Array(32).fill(64)), sign: (bytes: Uint8Array) => sign(new Uint8Array(32).fill(64), bytes) });
  const fields = { definitionText0: textDigest(declaration), uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release,
    semantic: packet.ids.semantic, roles: ["member"], values: '{"target":7}' };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const texts = (digest: string) => digest === textDigest(declaration) ? utf8(declaration).length : undefined;
  return { packet, fields, values, texts };
}

test("the base family is the default, and Register 28 creates exactly its Directory and siblings", () => {
  expect(NEWEST).toEqual({ "platform:register": C.register, "platform:directory": C.directory, "platform:membership": C.membership,
    "platform:rules": C.rules, "platform:destination": C.destination, "platform:inbox": C.inbox });
  expect(DIRECTORY_OF[C.register]).toBe(C.directory);
  const { R, D, M, A, G } = installGraph(C, undefined, "artifacts");
  expect([R.named, D.named, M.named, A.named, G.named]).toEqual([C.register, C.directory, C.membership, C.rules, C.destination]);
  expect(SIBLINGS_OF[C.directory]).toEqual({ membership: M.named, rules: A.named, destination: G.named });
  // Founder and recovery differ: the graph founds with rita and names sam's key as recovery.
  expect(canonicalize(R.entries.map(({ entry }) => entry))).toContain(keys.sam.key);
});

test("an ordinary package installs under Rules 15 without an owner; its declared prefixes reach the root's v3 marker and the Destination, and a second claim of the prefix refuses", async () => {
  const { R, D, M, A, G, send } = installGraph(C, undefined, "artifacts");
  const { packet, fields, values, texts } = await counter(["shelf/"]);
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  const grants = [{ grant: grantOf(installer, A.at, ["application.install"]), current: true }];
  const install = () => {
    expect(A.act(installer, "install-application", { fields }, { values, texts, membership: M.at, grants }).result).toBe("write");
    const job = A.head.seq, answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: textDigest("PUBLIC TEST scripted admission policy") };
    const fetched = A.outcome(`${job}:0`, answer), admitted = A.outcome(`${fetched}:0`, answer);
    A.texts = texts;
    return { job, admitted };
  };
  const { admitted } = install();
  send(D, A, admitted);
  send(A, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  send(M, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(A, M, M.head.seq, M.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  const createdAt = D.head.seq;
  const create = D.last.sends.find(one => one.message.class === "request" && one.message.type === "create")!;
  const paths = D.last.sends.find(one => one.message.class === "request" && one.message.type === "tell")!;
  expect(create, canonicalize(D.last.input)).toBeDefined();
  expect(D.item(createdAt).values["publication"]).toBe(canonicalize(["shelf/"]));
  const body = create.message.class === "request" ? create.message.body as Record<string, unknown> : {};
  expect(body["creationContext"]).toEqual({ v: 3, publication: ["shelf/"] });

  // The Destination keeps the application's row from the same Directory entry.
  send(G, D, createdAt, paths.n);
  expect(applicationPublicationPrefixes(G.state, scopeIdOf(create.to as never))).toEqual(["shelf/"]);
  expect(G.state.page(APPLICATION_PATHS, ["kept"], null, 8).items).toHaveLength(1);

  // The root is born with the v3 marker, and the base origin proves it; the own-agent origin does not.
  const checked = validateDefinition(countingCommitments, PROPOSED_BOUNDS, RULE_PROFILES);
  if (!checked.ok) throw Error("Counter validates");
  const app = new Ledger(checked.definition, countingCommitments.name), { asked, source } = creation(D, createdAt, create.n, 40);
  const nodes = [R, D, M, A, G, app];
  const facts = () => nodes.flatMap(node => node.entries.map(({ entry }, seq) => ({ fact: node.fact(seq), entry, under: node.under, bytes: canonicalize(entry), sequence: fixtureSequence(node) })));
  const born = judgeGenesis(app.state, app.definition, asked, { clock: clockOf(app.state, T0), bounds: app.bounds, facts: facts(), prepared: [], source });
  expect(born.result, JSON.stringify(born)).toBe("write"); if (born.result !== "write") return;
  expect(born.draft.input).toMatchObject({ type: "genesis", decision: "applied" }); app.seal(born.draft);
  const genesis = app.entries[0]!.entry.input;
  expect(genesis.type === "genesis" ? creationContextOf(genesis.message?.body, genesis.seed.definition as Digest) : null).toMatchObject({ kind: "marked", publication: ["shelf/"] });
  expect(baseApplicationPublicationOrigin(app.fact(0), D.at, G.at, facts())).toBe(true);
  expect(ownAgentApplicationPublicationOrigin(app.fact(0), D.at, G.at, facts())).toBe(false);
  const result = sent(app, 0, 0);
  D.take(judgeDelivery(D.state, D.definition, result.delivered, { ...arriving(D, result.delivered, result.source, facts()), platform: D.authority }));
  expect(D.item(createdAt).state).toBe("created");

  // A second installation of a package that claims the same prefix refuses at the Directory.
  const second = install();
  send(D, A, second.admitted);
  send(A, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  send(M, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(A, M, M.head.seq, M.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  const refusedAt = D.head.seq;
  expect(D.entries[refusedAt]!.entry.input).toMatchObject({ type: "delivery", decision: "refused" });
  expect(canonicalize(D.entries[refusedAt]!.entry)).toContain("publication-prefix-in-use");
  for (const node of nodes) expect(node.replay().snapshot()).toEqual(node.state.snapshot());
});

test("a package without a declaration installs with the v1 marker and an empty Destination row", async () => {
  const { D, M, A, G, send } = installGraph(C, undefined, "artifacts");
  const { packet, fields, values, texts } = await counter(null);
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  expect(A.act(installer, "install-application", { fields }, { values, texts, membership: M.at,
    grants: [{ grant: grantOf(installer, A.at, ["application.install"]), current: true }] }).result).toBe("write");
  const job = A.head.seq, answer = { uri: fields.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: textDigest("PUBLIC TEST scripted admission policy") };
  const fetched = A.outcome(`${job}:0`, answer), admitted = A.outcome(`${fetched}:0`, answer);
  A.texts = texts;
  send(D, A, admitted);
  send(A, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  send(M, D, D.head.seq, D.last.sends.find(one => one.message.class === "request")!.n);
  send(A, M, M.head.seq, M.last.sends.find(one => one.message.class === "request")!.n);
  send(D, A, A.head.seq, A.last.sends.find(one => one.message.class === "request")!.n);
  const create = D.last.sends.find(one => one.message.class === "request" && one.message.type === "create")!;
  const paths = D.last.sends.find(one => one.message.class === "request" && one.message.type === "tell")!;
  expect(create.message.class === "request" ? (create.message.body as Record<string, unknown>)["creationContext"] : null).toEqual({ v: 1 });
  send(G, D, D.head.seq, paths.n);
  expect(applicationPublicationPrefixes(G.state, scopeIdOf(create.to as never))).toEqual([]);
});

test("bind-archive reads the room's own repository item: Directory 27 binds a hosted room, and Directory 20 refuses as before", () => {
  for (const [cohort, result] of [[C, "write"], [UNPUBLISHED_COHORT, "refused"]] as const) {
    const { D, M } = installGraph(cohort, undefined, "artifacts");
    const who = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
    expect(D.item(0).values["repository"]).not.toBeNull();
    const bound = D.act(who, "bind-archive", { on: 0, fields: { archive: "journal" }, expected: { on: D.item(0).revision } },
      { membership: M.at, grants: [{ grant: grantOf(who, D.at, ["directory.archive"]), current: true }] });
    expect(bound.result, cohort.directory).toBe(result);
  }
});

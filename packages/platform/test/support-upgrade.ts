/** U1 test support: signed Counter releases, and a room of the `upgrade` family with Counter 1 installed and active.
 * Real Native judges throughout; host answers are labelled fixtures, as in base-family.test.ts. */
import { expect } from "vitest";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { canonicalize, definitionDigest, keyIdOfSecret, sign, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { Ledger, T0, arriving, creation, grantOf, keys, fixtureSequence, sent } from "@generalbusiness/dap-derive/testing";
import { clockOf, judgeDelivery, judgeGenesis, judgeOutcome, validateDefinition } from "@generalbusiness/dap-derive";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { packApplication2, readApplicationProjection } from "../src/application-codec/application-v2.ts";
import { UPGRADE_COHORT as C, applicationAnnouncement } from "../src/index.ts";
import { installGraph, type InstallNode } from "./support-application-install.ts";

const SETUP = ["counting.activity", "counting.commit", "counting.control", "counting.establish", "counting.fail", "counting.participate"];
/** One signed Counter release. `page` changes the presentation only; `member` changes the semantic identifier; `key` is the publisher's signing seed. */
export async function counter(version: string, options: { page?: string; member?: readonly string[]; key?: number } = {}) {
  const id = definitionDigest(countingCommitments), declaration = canonicalize(countingCommitments), seed = new Uint8Array(32).fill(options.key ?? 64);
  const packet = await packApplication2({ name: "test.upgrade-counter", version, semantic: {
    ...emptyPackageComposition(), v: 2 as const, entry: id, definitions: [{ id, bytes: declaration }],
    host: { execution: "recorded-do" as const, profiles: ["restricted@1"] }, capabilities: [],
    roles: { member: [...(options.member ?? ["counting.fulfill"])], setup: SETUP }, predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2 as const, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: options.page ?? "VEVTVA" }], descriptions: {}, views: {}, resources: {} } },
  { key: keyIdOfSecret(seed), sign: (bytes: Uint8Array) => sign(seed, bytes) });
  const source = { definitionText0: textDigest(declaration), uri: `git+https://git.example/test.git/@${version.padStart(40, "a")}/application.dap.json`,
    release: packet.ids.release, semantic: packet.ids.semantic };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const texts = (digest: string) => digest === textDigest(declaration) ? utf8(declaration).length : undefined;
  const answer = { uri: source.uri, ...packet.ids, publisher: packet.package.release.manifest.publisher, policy: textDigest("PUBLIC TEST scripted admission policy") };
  return { packet, source, install: { ...source, roles: ["member"], values: '{"target":7}' }, values, texts, answer };
}
export type Release = Awaited<ReturnType<typeof counter>>;

/** A room of the upgrade family with Counter 1 installed and active as item N. */
export async function room() {
  const graph = installGraph(C, undefined, "artifacts"), { D, M, A, send } = graph;
  const installer = { ...keys.rita, member: { membership: M.at, member: "@rita" as const } };
  const grants = [{ grant: grantOf(installer, A.at, ["application.install"]), current: true }];
  const context = (release: Release) => ({ values: release.values, texts: release.texts, membership: M.at, grants });
  const outcome = (operation: `${number}:${number}`, result: "confirmed" | "refused", body: unknown) =>
    judgeOutcome(A.state, A.definition, { type: "outcome", operation, attempt: 1, result, evidence: { basis: "read", body } },
      { clock: clockOf(A.state, T0), bounds: A.bounds, platform: A.authority, own: A.own });
  /** The install pipeline from a confirmed fetch of the job's release to the Directory's result at Rules. */
  const complete = (job: number, release: Release) => {
    const fetched = A.outcome(`${job}:0`, release.answer), admitted = A.outcome(`${fetched}:0`, release.answer);
    A.texts = release.texts;
    const request = (node: InstallNode) => node.last.sends.find(one => one.message.class === "request")!.n;
    send(D, A, admitted); send(A, D, D.head.seq, request(D)); send(D, A, A.head.seq, request(A));
    send(graph.M, D, D.head.seq, request(D)); send(A, graph.M, graph.M.head.seq, request(graph.M)); send(D, A, A.head.seq, request(A));
    const createdAt = D.head.seq, create = D.last.sends.find(one => one.message.class === "request" && one.message.type === "create")!;
    const checked = validateDefinition(countingCommitments, PROPOSED_BOUNDS, RULE_PROFILES);
    if (!checked.ok) throw Error("Counter validates");
    const app = new Ledger(checked.definition, countingCommitments.name), { asked, source } = creation(D, createdAt, create.n, 40 + job);
    const nodes = [graph.R, D, graph.M, A, graph.G, app];
    const facts = () => nodes.flatMap(node => node.entries.map(({ entry }, seq) => ({ fact: node.fact(seq), entry, under: node.under, bytes: canonicalize(entry), sequence: fixtureSequence(node) })));
    const born = judgeGenesis(app.state, app.definition, asked, { clock: clockOf(app.state, T0), bounds: app.bounds, facts: facts(), prepared: [], source });
    if (born.result !== "write") throw Error(JSON.stringify(born));
    app.seal(born.draft);
    const result = sent(app, 0, 0);
    D.take(judgeDelivery(D.state, D.definition, result.delivered, { ...arriving(D, result.delivered, result.source, facts()), platform: D.authority }));
    // The Directory's announcement operation carries the result to Rules; its host answer is a labelled fixture.
    const operation = `${D.head.seq}:0` as const, announced = D.outcome(operation, applicationAnnouncement(D.state, D.own, operation));
    const told = D.entries[announced]!.entry.sends.find(one => one.message.class === "request" && one.message.type === "tell")!;
    send(A, D, announced, told.n);
    return A.head.seq;
  };
  const first = await counter("1");
  expect(A.act(installer, "install-application", { fields: first.install }, context(first)).result).toBe("write");
  const N = A.head.seq;
  complete(N, first);
  expect(A.item(N).state).toBe("active");
  const upgrade = (release: Release, fields: Record<string, unknown>) =>
    A.act(installer, "upgrade-application", { on: N, fields: fields as never, expected: { on: A.item(N).revision } }, context(release));
  return { ...graph, N, first, upgrade, outcome, complete };
}
export const slots = (item: { values: Record<string, unknown>; state: string }) =>
  ({ state: item.state, ...Object.fromEntries(Object.entries(item.values).filter(([slot]) => slot !== "phase")) });

import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { DEVICE_COMMAND, type DeclaredDefinition, type Intent, type ScopeKind, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { CAPABILITY_CODE, valueDigest } from "@generalbusiness/dap-derive";
import { FAILED_CLAIM_COHORT, FILE_PUBLICATION_COHORT, FIRST_ACTIONS_OF, TRUSTED_APPLICATION_COHORT, firstExtents, platform } from "@generalbusiness/dap-platform";
import { Reader } from "@generalbusiness/dap-git";
import { packApplication, secretSigner, signedApplicationInstall, signedDeviceApplicationInstall } from "@generalbusiness/dap-client";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { devicePackageFixture } from "../../derive/test/fixtures-device-command.ts";
import { fixedSigner } from "./fixtures-core.ts";
import { outsideOf } from "../src/worker.ts";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { lending } from "../../../examples/lending/definition.ts";
import { SqliteStore } from "../src/index.ts";
import { publicationExtents, publicationRefusal } from "../src/publication-policy.ts";
import { scopePublisher as publisher } from "./definition-corpus-data.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, routed, sam } from "./repository.ts";
import { reader, driveFixture, nativeFixtureLifetime, effectFixture, dispatchFixture, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";

const extents = firstExtents({ approvals: 0, checks: [] });

// Pure host policy over explicit data. These two cases supply no Native authority.
test("publication policy reserves control aliases and unchanged requested paths while ordinary paths remain open", () => {
  for (const path of [".github/workflows/x.yml", ".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS", "AGENTS.md", "docs/CLAUDE.md"])
    expect(publicationRefusal(path, { paths: [], links: [], unreadable: 0 }, extents)).toMatchObject({ code: "reserved-publication-path", path });
  for (const path of ["shelf/a.md", "docs/AGENTS.md.txt", "other/CODEOWNERS", ".github-other/x.yml"])
    expect(publicationRefusal(path, { paths: [path], links: [], unreadable: 0 }, extents)).toBeNull();
  expect(publicationRefusal("content/manual.md", { paths: ["content/manual.md"], links: [{ path: "AGENTS.md", tree: "both", resolves: ["content/manual.md"] }], unreadable: 0 }, extents))
    .toEqual({ code: "reserved-publication-path", path: "content/manual.md", reserved: "**/AGENTS.md" });
});

// Ruling 68356c6c, point 5b: after the reserved-path check, every touched path and link target stands inside the declared prefixes.
test("publication policy with declared prefixes refuses a touched path or link target outside them before the push", () => {
  const prefixes = ["docs/", "shelf/"], none = { paths: [], links: [], unreadable: 0 };
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md"] }, extents, prefixes)).toBeNull();
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md", "docs/b.md"] }, extents, prefixes)).toBeNull();
  expect(publicationRefusal("notes/a.md", { ...none, paths: ["notes/a.md"] }, extents, prefixes))
    .toEqual({ code: "publication-path-not-declared", path: "notes/a.md", outside: "notes/a.md" });
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["README.md", "shelf/a.md"] }, extents, prefixes))
    .toEqual({ code: "publication-path-not-declared", path: "shelf/a.md", outside: "README.md" });
  // A link inside a prefix that resolves outside it, or that does not resolve, stands outside.
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md"], links: [{ path: "shelf/link", tree: "new", resolves: ["shelf/a.md"] }] }, extents, prefixes)).toBeNull();
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md"], links: [{ path: "shelf/link", tree: "new", resolves: ["README.md"] }] }, extents, prefixes))
    .toEqual({ code: "publication-path-not-declared", path: "shelf/a.md", outside: "README.md" });
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md"], links: [{ path: "shelf/link", tree: "new", resolves: null }] }, extents, prefixes))
    .toMatchObject({ code: "publication-path-not-declared", path: "shelf/a.md" });
  // The reserved-path check comes first; an empty declaration admits no path.
  expect(publicationRefusal(".github/x.yml", none, extents, prefixes)).toMatchObject({ code: "reserved-publication-path" });
  expect(publicationRefusal("shelf/a.md", { ...none, paths: ["shelf/a.md"] }, extents, [])).toMatchObject({ code: "publication-path-not-declared" });
});

test("publication policy takes only the canonical bounded extent bytes of the exact authenticated Rules reference", () => {
  const of = { scope: "sc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", genesis: `sha256:${"a".repeat(64)}` } as ScopeRef;
  const bytes = canonicalize(extents);
  for (const domain of ["artroom-rules-extents-1", "artroom-rules-extents-2", "artroom-rules-extents-3"]) {
    const digest = valueDigest(domain, extents);
    const reply = { answer: { subject: "rules", of, head: { seq: 1, hash: digest }, revision: 1, content: { asked: "rules", extents: digest } }, values: [{ domain, bytes }] };
    expect(publicationExtents(reply, of)).toEqual(extents);
    expect(publicationExtents(reply, { ...of, genesis: `sha256:${"b".repeat(64)}` } as ScopeRef)).toBeNull();
    expect(publicationExtents(reply, { scope: of.scope, pending: true })).toEqual(extents);
    expect(publicationExtents({ ...reply, values: [] }, of)).toBeNull();
    expect(publicationExtents({ ...reply, values: [{ domain, bytes: " " + bytes }] }, of)).toBeNull();
    expect(publicationExtents({ ...reply, values: [{ domain, bytes: "[" }] }, of)).toBeNull();
    expect(publicationExtents({ ...reply, values: [...reply.values, ...reply.values] }, of)).toBeNull();
  }
});

// Actual Native creation, authority, application source proof, SQLite,
// publication adapter, Git objects and replay. OwnGit, inspector reads and
// the fixture clock are explicit stand-ins; no deployed provider runs.
test.each([
  { name: "historical raw application pins", cohort: FILE_PUBLICATION_COHORT, route: "raw" },
  { name: "historical trusted package pins", cohort: TRUSTED_APPLICATION_COHORT, route: "package" },
  { name: "current device package pins", cohort: FAILED_CLAIM_COHORT, route: "device" },
])("$name refuse control publications with a host diagnostic and generic journal reason, preserve ordinary commits, and replay", async ({ cohort, route }) => {
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false });
  const host = ownHost(), diagnostics: unknown[] = [];
  const nodes: Platform[] = [];
  const pause = async () => {
    for (let pass = 0; pass < 64; pass++) {
      await driveFixture(nodes, life.wait);
      let callbacks = 0;
      for (const node of nodes) callbacks += (await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks())).callbacks;
      if (callbacks === 0) return;
    }
    throw Error("The publication fixture exceeded 64 callback rounds");
  };
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: { host: host.host, namespace: host.namespace, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: cohort.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
    const bindings = host.bindings(R.name);
    const wire = (node: Platform) => life.outside(node.name, (given, sql) => {
      const actual = host.outside(given, sql, bindings);
      return { ...actual, send: async request => {
        const answer = await actual.send(request);
        if (answer && request.kind === "push" && "refusal" in answer) diagnostics.push(answer.refusal);
        return answer;
      } };
    });
    wire(R); nodes.push(R);
    expect(await R.stub.create(signIntent(install, rita.secret), cohort.register)).toMatchObject({ answer: "accepted" });
    const found = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } });
    const seed: Seed = { v: 1, kind: "directory", definition: cohort.directory, creator: await R.at(), cause: intentDigest(found.intent), ordinal: 0 };
    const D = life.platform(scopeIdOf(seed)); nodes.push(D);
    expect(await R.stub.submit(found, [])).toMatchObject({ answer: "accepted" });
    await pause();
    const first = (await D.entries())[0]!;
    const sibling = (kind: ScopeKind) => {
      const send = first.sends.find(row => "definition" in row.to && row.to.kind === kind);
      if (!send || !("definition" in send.to)) throw Error("The Native Directory must create each sibling");
      return life.platform(scopeIdOf(send.to));
    };
    const M = sibling("membership"), Q = sibling("rules"), G = sibling("destination");
    nodes.push(M, Q, G); wire(G); await G.restart(); await pause();
    const seat = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    await M.did(rita, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: { role: "admin", actions: [...FIRST_ACTIONS_OF[cohort.membership]!.admin, "lending.member", "lending.staff", "lending.establish"] } });
    const controls = extents.map(extent => extent.name === "rules" ? { ...extent, patterns: [...extent.patterns, "authority/policy.json"] } : extent);
    await Q.did(rita, "publish", { on: 0, expected: await Q.expected({ on: 0 }), fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: controls as never } });
    const establish = async (definition: DeclaredDefinition) => {
      if (route === "raw") {
        const digest = definitionDigest(definition), bytes = canonicalize(definition);
        expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest, name: definition.name } }), [], { values: [bytes] })).toMatchObject({ answer: "accepted" });
        life.advance(301000); // End the Directory's earlier definition-observation reuse window.
        const made = await D.stub.submit(await D.intent(rita, "establish-application", { expected: await D.expected({ repository: 0 }), fields: { definition: digest, values: "{}", execution: "recorded-do" } }), [], { values: [bytes] });
        if (made.answer !== "accepted") return expect.fail("The Native raw application creation must be accepted");
        const C = await D.created(made.receipt.fact.seq); nodes.push(C); await pause(); return C;
      }
      // The current family requires its existing finite device package path.
      // Older trusted-package pins exercise the unchanged real Lending bytes.
      const declared: DeclaredDefinition = route !== "device" ? definition : {
        ...devicePackageFixture,
        items: { ...devicePackageFixture.items, root: { ...devicePackageFixture.items["root"]!, refs: { destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } } } } },
        acts: { ...devicePackageFixture.acts,
          start: { ...devicePackageFixture.acts["start"]!, fields: { destination: { type: "scope", kind: "destination", required: true } }, effects: [{ ref: { slot: "destination", from: { field: "destination" } } }] },
          write: { ...publisher.acts["write"]!, on: "root", grant: "start",
            sends: [{ tell: { to: { slot: "destination" }, message: "publish-file", fields: { path: { field: "path" }, content: { field: "content" } }, result: { refused: [], undelivered: [] } } }],
          },
        },
      };
      const id = definitionDigest(declared), actions = [...new Set(Object.values(declared.acts).map(act => act.grant))].sort();
      const semantic = { entry: id, definitions: [{ id, bytes: canonicalize(declared) }], host: { execution: "recorded-do" as const, profiles: ["restricted@1"] }, roles: { admin: actions }, predecessor: null };
      const presentation = { entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {} };
      const packet = route === "device"
        ? await packApplication2({ name: "test.publication-policy-device", version: "1", semantic: { ...emptyPackageComposition(), ...semantic, v: 2,
          connections: [{ from: id, item: "root", slot: "destination", to: "outside" }], capabilities: [{ name: DEVICE_COMMAND, bounds: { kinds: ["heater"], owners: 1 } }],
          projections: { root: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: { root: { item: "root", read: "one", states: ["ready"], limit: 1, fields: {} } } }) } },
          presentation: { ...presentation, v: 2, views: {}, resources: {} } }, fixedSigner(81))
        : await packApplication({ name: `test.publication-policy-${declared.name}`, version: "1", semantic: { ...semantic, v: 1, capabilities: [], projections: {} }, presentation: { ...presentation, v: 1 } }, fixedSigner(81));
      const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
      const applicationBindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fixture.trust), env.SCOPE_INDEX);
      life.applicationTrust(() => applicationBindings.APPLICATION_TRUST);
      for (const node of [D, Q]) { life.outside(node.name, (given, sql) => outsideOf(given, sql, applicationBindings, peer.fetch)); await node.restart(); }
      const options = { rules: await Q.at(), uri: fixture.uri, release: packet.ids.release, roles: ["admin"] as const, values: {} };
      const prepared = route === "device"
        ? await signedDeviceApplicationInstall(secretSigner(rita.secret), packet.bytes, { ...options, owner: { membership: await M.at(), member: "@rita" } }, { now: life.now(), idempotencyKey: "TEST-reserved-path-package" })
        : await signedApplicationInstall(secretSigner(rita.secret), packet.bytes, options, { now: life.now(), idempotencyKey: `TEST-reserved-path-package-${declared.name}` });
      const installed = await Q.stub.submit(prepared.signed, [], prepared.beside);
      expect(installed).toMatchObject({ answer: "accepted" });
      await effectFixture([Q], life.wait); await dispatchFixture(nodes, life.wait); await pause();
      const creation = (await D.entries()).flatMap(entry => entry.sends).find(send => "definition" in send.to && send.to.definition === id);
      if (!creation || !("definition" in creation.to)) return expect.fail("The Native package installation must create the exact root");
      const C = life.platform(scopeIdOf(creation.to)); nodes.push(C); await pause(); return C;
    };
    const C = await establish(publisher);
    expect((await G.item(0)).state).toBe("ready");
    const state = () => life.wait(() => runInDurableObject(G.object, (_instance, context) => new SqliteStore({ exec: (sql, ...values) => context.storage.sql.exec(sql, ...values), transaction: run => context.storage.transactionSync(run) }).all()));
    for (const path of [".github/workflows/x.yml", "AGENTS.md", "CODEOWNERS", "docs/CODEOWNERS", "authority/policy.json"]) {
      const before = host.stand.refs.get("refs/heads/main"), pushes = host.stand.pushes.filter(push => push.ref === "refs/heads/main").length;
      expect(typeof before).toBe("string");
      const seq = await C.did(rita, "write", { on: 0, expected: await C.expected({ on: 0 }), fields: { path, content: "TEST reserved publication\n" } });
      await pause();
      const item = (await state()).items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === seq && (item.refs["sender"] as ScopeRef).scope === C.name);
      expect(item).toMatchObject({ state: "aborted", values: { path, reason: "host-refused" } });
      expect(diagnostics).toContainEqual(expect.objectContaining({ code: "reserved-publication-path", path }));
      expect(host.stand.refs.get("refs/heads/main")).toBe(before);
      expect(host.stand.pushes.filter(push => push.ref === "refs/heads/main")).toHaveLength(pushes);
      const journal = await G.entries();
      const refused = journal.find(entry => entry.input.type === "outcome" && entry.input.kind === "push" && entry.input.result === "refused" && entry.effects.some(effect => effect.effect === "value" && effect.item === item!.id && effect.slot === "reason" && effect.value === "host-refused"));
      expect(refused?.input).toMatchObject({ type: "outcome", evidence: { body: { send: "not-sent", seen: before } } });
      expect(refused?.input.type === "outcome" ? Object.keys(refused.input.evidence.body as object).sort() : []).toEqual(["seen", "send"]);
    }
    const normal = "shelf/ordinary.md", content = "TEST ordinary file\n";
    await C.did(rita, "write", { on: 0, expected: await C.expected({ on: 0 }), fields: { path: normal, content } }); await pause();
    expect((await state()).items.find(item => item.type === "file-publication" && item.values["path"] === normal)).toMatchObject({ state: "published" });
    const shelf = "shelf/0123456789abcdef.md", shelfContent = "TEST actual Lending publication\n";
    if (route !== "device") {
      const L = await establish(lending);
      await L.did(rita, "donate", { expected: await L.expected({ library: 0 }), fields: { name: "TEST pot", description: "TEST copper", page: shelf, content: shelfContent } }); await pause();
      expect((await state()).items.find(item => item.type === "file-publication" && item.values["path"] === shelf)).toMatchObject({ state: "published" });
    }
    const git = new Reader({ object: async id => { const object = host.stand.objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data } : null; }, ref: async name => host.stand.refs.get(name) ?? null, refs: async () => [] });
    const head = await git.ref("refs/heads/main"); expect(head).not.toBeNull();
    const commit = await git.linked(head!); const top = await git.tree(commit.tree); const shelfTree = top.find(entry => new TextDecoder().decode(entry.name) === "shelf")!;
    const files = await git.tree(shelfTree.id);
    for (const [name, expected] of [["ordinary.md", content], ...(route === "device" ? [] : [["0123456789abcdef.md", shelfContent]])]) {
      const file = files.find(entry => new TextDecoder().decode(entry.name) === name)!;
      expect(new TextDecoder().decode(await git.blob(file.id))).toBe(expected);
    }
    expect((await G.summary()).value.definition).toBe(cohort.destination);
    expect(platform(cohort.destination)).not.toBeNull();
    const replayed = await life.wait(() => verify(httpSource("https://scopes.test", { fetch: routed, reader }), { mode: "replay", scope: G.name, platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven" }));
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { life.release(); }
}, 60_000);

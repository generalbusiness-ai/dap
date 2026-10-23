/** Real native room scopes, production member authority, SQLite commits,
 * operation driver, eviction/recovery, detached-text transport and local R2.
 * Repository creation, Git objects, clock and read-session inspector are
 * explicit fixtures. Native births, Lending publication admission and generic
 * screen routing run through the production code; screen bytes are TEST text. */
import { command, memoryStore as cliStore, type Context } from "../../cli/src/index.ts";
import { applicationCommands } from "../../cli/src/application-install-runtime.ts";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { McpService, memoryStore as custodyStore, type ServerPort } from "@generalbusiness/dap-mcp";
import type { Fetched } from "@generalbusiness/dap-derive";
import type { Sourced } from "../src/namespace.ts";
import { lending } from "../../../examples/lending/definition.ts";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, isSeed, parseStrict, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { TRUSTED_APPLICATION_COHORT as C, applicationPublicationOrigin, installedApplicationPublicationOrigin, platform } from "@generalbusiness/dap-platform";
import { applicationScreenPath, readApplicationScreenAddress, readApplicationScreenContext } from "@generalbusiness/dap-client/application";
import { secretSigner, signedApplicationInstall } from "@generalbusiness/dap-client";
import { outsideOf as hostOutside } from "../src/worker.ts";
import nativeWorker from "../../../apps/room/worker.ts";
import { applicationSandboxPage } from "../src/applications/route.ts";
import { applicationHttpPeer, applicationResolverFixture, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationContentBindings, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, sam, routed } from "./repository.ts";

const refusesAtBirth = { ...countingCommitments, acts: { ...countingCommitments.acts, establish: { ...countingCommitments.acts["establish"]!, guards: [{ rule: "install-refusal" }] } }, rules: { ...countingCommitments.rules, "install-refusal": "false" } };
const installations = [
  { name: "Counter: reply lost after put", mcp: true, application: "Counter", loss: "after-put", declaration: countingCommitments, roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, values: '{"target":7}' },
  { name: "Counter: interrupted before put", application: "Counter", loss: "before-put", declaration: countingCommitments, roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, values: '{"target":7}' },
  { name: "Counter: admission reply lost", application: "Counter", loss: "admission", declaration: countingCommitments, roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, values: '{"target":7}' },
  { name: "Counter: child refuses after grants", mcp: true, application: "Counter", loss: "after-put", refusesAtBirth: true, declaration: refusesAtBirth, roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, values: '{"target":7}' },
  { name: "Lending: reply lost after put", mcp: true, application: "Lending", loss: "after-put", declaration: lending, roles: { admin: ["lending.member", "lending.staff"], member: ["lending.member"] }, values: '{}' },
] as const;
test.each(installations)("$name: one signed native install settles through Directory", async specimen => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room;
  const [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native room must confirm all three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, specimen.roles, specimen.declaration);
  let puts = 0;
  const bucket = new Proxy(env.APPLICATION_CONTENT, { get(target, key) {
    const value: unknown = Reflect.get(target, key, target);
    if (key === "put") return (...args: Parameters<R2Bucket["put"]>) => { puts++; return target.put(...args); };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const peer = applicationHttpPeer(f), bindings = applicationContentBindings(bucket, JSON.stringify(f.trust));
  let fetchSends = 0, admissionSends = 0, preparations = 0, recoveries = 0, forbiddenPreparations = 0;
  try {
    // Counting the first real put requires a cold release, not a prior
    // file's immutable cached copy. Refuse a leaked fixture explicitly.
    expect(await env.APPLICATION_CONTENT.head(f.key), "Custody fixture release must start absent from shared R2").toBeNull();
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    const expected = await life.wait(() => M.expected({ roster: 0, member: seat }));
    await life.wait(() => M.did(rita, "first-key", { fields: { member: seat }, expected }));
    life.outside(D.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
    await life.wait(() => D.restart());
    life.outside(A.name, (given, sql) => {
      const port = hostOutside(given, sql, bindings, peer.fetch);
      return { accepts: port.accepts,
        send: async request => {
          if (request.kind === "fetch-application") {
            fetchSends++;
            if (specimen.loss === "before-put") return null; // TEST crash before host preparation
            const answer = await port.send(request);
            return specimen.loss === "after-put" ? null : answer; // TEST lost prepared reply
          }
          admissionSends++;
          const answer = await port.send(request);
          return specimen.loss === "admission" ? null : answer; // TEST lost safe-read reply
        },
        hostPreparation: {
          // Negative control: even a port willing to resume admission cannot
          // bypass the exact native catalog's host-preparation allowlist.
          accepts: (owner, kind) => kind === "admit-application" || port.hostPreparation!.accepts(owner, kind),
          resume: request => { if (request.kind === "admit-application") { forbiddenPreparations++; throw Error("TEST admission must never resume a host put"); } preparations++; return port.hostPreparation!.resume(request); },
        },
        recovery: { accepts: port.recovery!.accepts, read: request => { recoveries++; return port.recovery!.read(request); } },
      };
    });
    await life.wait(() => A.restart());
    life.setHold(envelope => envelope.from.at.scope === A.name);
    const declarations = f.packet.package.semantic.definitions;
    const fields = {
      uri: f.uri, release: f.packet.ids.release, semantic: f.packet.ids.semantic, roles: ["admin", "member"], values: specimen.values,
      ...Object.fromEntries(declarations.map((part, index) => [`definitionText${index}`, textDigest(part.bytes)])),
    };
    const changed = declarations[0]!.bytes + "\n";
    const refused = await life.wait(() => A.intent(rita, "install-application", { fields: { ...fields, definitionText0: textDigest(changed) } }));
    expect(await life.wait(() => A.stub.submit(refused, [], { values: [canonicalize(f.packet.package.semantic), canonicalize(f.packet.package.release)], texts: [changed] }))).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect(fetchSends).toBe(0); expect(peer.ads()).toBe(0); expect(peer.wants).toEqual([]);
    const rulesAt = await life.wait(() => A.at());
    let signed: SignedIntent, job: number, installedService: McpService | undefined, cli: Context | undefined;
    if ("mcp" in specimen) {
      const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
      const store = custodyStore(), key = "TEST-native-install";
      let lose = specimen.application === "Counter";
      const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: store, now: life.now,
        config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("TEST installs discover through Directory"); } },
        applicationFetch: peer.fetch,
        fetch: async (url, init) => {
          const response = await life.wait(() => routed(url, init));
          if (lose && new URL(url).pathname.endsWith("/acts")) { lose = false; await response.body?.cancel(); throw Error("TEST lost accepted MCP install reply"); }
          return response;
        },
      };
      const args = { uri: f.uri, release: f.packet.ids.release, roles: ["admin", "member"], values: parseStrict(specimen.values), idempotencyKey: key };
      installedService = new McpService({ ...port, mode: specimen.application === "Lending" ? "generic" : "default" });
      let result;
      if (specimen.application === "Counter") {
        const local = cliStore(); await local.keep("operator", rita.secret);
        await local.save({ v: 1, service: port.service, key: "operator", repository: { directory, membership, rules: A.name, destination: G.name } });
        cli = { store: local, fetch: port.fetch!, now: life.now };
        cli.applicationCommand = applicationCommands(cli, store, peer.fetch);
        const argv = ["install", f.uri, "--release", f.packet.ids.release, "--request", key, "--role", "admin", "--role", "member", "--values", specimen.values];
        const uncertain = await life.wait(() => command(cli!, argv));
        expect(uncertain.code, uncertain.lines.join("\n")).toBe(1); expect(lose).toBe(false);
        const restored = { ...cli! }; // another CLI invocation, same durable custody
        restored.applicationCommand = applicationCommands(restored, store, peer.fetch);
        expect(await life.wait(() => command(restored, argv))).toMatchObject({ code: 0, lines: [expect.stringMatching(/^Install request recorded:/), expect.any(String), expect.any(String)] });
        installedService = new McpService(port);
        result = await life.wait(() => installedService!.call("install_application", args));
      } else result = await life.wait(() => installedService!.call("install_application", args));
      expect(result.isError, JSON.stringify(result.structuredContent)).toBe(false);
      expect(result.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
      job = Number(result.structuredContent["item"]);
      const kept = await installedService.custody.find({ service: port.service, membership, signer: rita.key, target: rulesAt, key });
      if (!kept) throw Error("MCP must retain the exact envelope before submission.");
      signed = kept.envelope.signed;
      const reads = peer.ads();
      expect((await life.wait(() => installedService!.call("install_application", args))).structuredContent).toMatchObject({ answer: "accepted", item: job, retained: true });
      expect((await life.wait(() => installedService!.call("install_application", { ...args, roles: [] }))).isError).toBe(true);
      expect(peer.ads()).toBe(reads); // retained/conflicting requests never refetch
      expect((await life.wait(() => installedService!.call("application_installation", { item: job }))).structuredContent).toMatchObject({ item: job, state: "pending", phase: "fetch", screen: null });
      if (cli) expect(await life.wait(() => command(cli!, ["application", String(job)]))).toMatchObject({ code: 0, lines: [`Application install ${job}: pending (fetch).`] });
    } else {
      const envelope = await life.wait(() => signedApplicationInstall(secretSigner(rita.secret), f.packet.bytes, { rules: rulesAt, uri: f.uri, release: f.packet.ids.release, roles: ["admin", "member"], values: parseStrict(specimen.values) as Record<string, import("@generalbusiness/dap-contract").FieldValue> }, { now: life.now() }));
      signed = envelope.signed;
      const answer = await life.wait(() => A.stub.submit(signed, [], envelope.beside));
      expect(answer).toMatchObject({ answer: "accepted" });
      if (answer.answer !== "accepted") throw Error("Original signed install must be recorded.");
      job = answer.receipt.fact.seq;
    }
    await effectFixture([A], life.wait);
    expect(fetchSends).toBe(1);
    expect((await life.wait(() => A.item(job))).values["phase"]).toBe(specimen.loss === "admission" ? "admission" : "fetch");
    expect(await f.store.get(f.packet.ids.release)).toEqual(specimen.loss === "before-put" ? null : f.packet);
    await life.wait(() => A.restart());
    life.advance(PROPOSED_BOUNDS.drainRetrySeconds * 1000);
    await effectFixture([A], life.wait);
    expect(fetchSends).toBe(1); expect(admissionSends).toBe(1); expect(puts).toBe(1);
    expect(specimen.loss === "admission" ? recoveries : preparations).toBeGreaterThan(0);
    expect(forbiddenPreparations).toBe(0);
    expect((await life.wait(() => A.item(job))).values["phase"]).toBe("activation");
    const declared = (node: typeof A, digest: Digest) => life.wait(() => (node.object as unknown as { declared(digest: Digest): Promise<string | null> }).declared(digest));
    expect(await declared(A, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    // Native declaration custody is independent of the screen/content cache.
    await env.APPLICATION_CONTENT.delete(f.key);
    life.setHold(() => false);
    life.advance(PROPOSED_BOUNDS.drainRetrySeconds * 1000);
    await dispatchFixture([R, D, M, A, G], life.wait);
    const creation = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => send.message.class === "request" && send.message.type === "create" && isSeed(send.to) && send.to.kind === "lane");
    if (!creation || !isSeed(creation.to)) throw Error("Directory must record the actual child creation.");
    const C = life.platform(scopeIdOf(creation.to));
    await driveFixture([R, D, M, A, G, C], life.wait);
    if ("refusesAtBirth" in specimen) {
      expect((await life.wait(() => installedService!.call("application_installation", { item: job }))).structuredContent).toMatchObject({ item: job, state: "refused", phase: "creation", reason: "application-creation-refused", screen: null });
      expect(await life.wait(() => command(cli!, ["application", String(job)]))).toMatchObject({ code: 1, lines: [`Application install ${job}: refused (creation).`, expect.stringContaining("application-creation-refused")] });
      const final = await life.wait(() => (A.object as unknown as { items(reader: unknown, type: string): Promise<unknown> }).items(reader, "installation"));
      expect(final).toMatchObject({ ok: true, value: [{ id: job, state: "refused", values: { phase: "creation", reason: "application-creation-refused" } }] });
      expect((await life.wait(() => M.item(0))).values["adminActions"]).toContain("counting.control");
      expect((await life.wait(() => A.summary())).value.items.find(item => item.type === "definition")).toMatchObject({ state: "active", values: { digest: f.packet.package.semantic.entry } });
      const birth = await life.wait(() => (C.object as unknown as { source(seq: number): Promise<Sourced> }).source(0));
      expect(parseStrict(birth.bytes!)).toMatchObject({ input: { type: "genesis", decision: "refused" } });
      expect((await nativeWorker.fetch(new Request("https://scopes.test" + applicationScreenPath(D.name, job, f.packet.ids.presentation)), applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX))).status).toBe(404);
      const history = await life.wait(() => A.entries());
      expect(history.filter(entry => entry.input.type === "act")).toHaveLength(1);
      expect(history.filter(entry => entry.input.type === "outcome")).toHaveLength(2);
      expect((await life.wait(() => M.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "set-actions")).toEqual([]);
      for (const node of [A, D]) {
        const head = (await life.wait(() => node.summary())).at;
        const replay = await life.wait(() => verify(httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) }), { mode: "replay", platform, grants: "proven", scope: node.name, head }));
        expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
      }
      return;
    }
    expect((await life.wait(() => C.summary())).value).toMatchObject({ status: "active", definition: f.packet.package.semantic.entry });
    if (installedService) expect((await life.wait(() => installedService!.call("application_installation", { item: job }))).structuredContent).toMatchObject({ item: job, state: "active", scope: await life.wait(() => C.at()), screen: "https://scopes.test" + applicationScreenPath(D.name, job, f.packet.ids.presentation) });
    if (cli) expect(await life.wait(() => command(cli!, ["application", String(job)]))).toMatchObject({ code: 0, lines: [`Application install ${job}: active (creation).`, "Screen: https://scopes.test" + applicationScreenPath(D.name, job, f.packet.ids.presentation)] });
    const completed = await life.wait(() => A.item(job));
    expect(completed).toMatchObject({ state: "active", refs: { scope: await life.wait(() => C.at()) } });
    if (specimen.application === "Counter") {
      const configuration = await life.wait(() => C.expected({ configuration: 0 }));
      expect(await life.wait(() => C.act(sam, "initialize", { expected: configuration }))).toMatchObject({ answer: "refused" });
      await life.wait(() => C.did(rita, "initialize", { expected: configuration }));
      expect((await life.wait(() => C.summary())).value.items.find(item => item.type === "board")).toMatchObject({ state: "paused", values: { target: 7 } });
    } else {
      expect((await life.wait(() => C.item(0))).refs["destination"]).toEqual(await life.wait(() => G.at()));
      const donation = { expected: await life.wait(() => C.expected({ library: 0 })), fields: { name: "TEST pot", description: "Native install witness", page: "shelf/0000000000000001.md", content: "TEST signed page text; screen agreement is not asserted." } };
      expect(await life.wait(() => C.act(sam, "donate", donation))).toMatchObject({ answer: "refused" });
      await life.wait(() => C.did(rita, "donate", donation));
      await dispatchFixture([C, G], life.wait);
      expect((await life.wait(() => G.summary())).value.items.find(item => item.type === "file-publication")).toMatchObject({ values: { path: donation.fields.page } });
    }
    expect((await life.wait(() => M.item(0))).values["memberActions"]).toContain(specimen.roles.member[0]);
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    await life.wait(() => D.restart());
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    const history = await life.wait(() => A.entries());
    const original = history.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application");
    expect(original).toHaveLength(1);
    expect(original[0]!.input).toMatchObject({ type: "act", signed });
    expect(history.filter(entry => entry.input.type === "outcome")).toHaveLength(2);
    const current = (await life.wait(() => C.summary())).at;
    const provenance = await life.wait(() => (C.object as unknown as { source(seq: number, origin: boolean): Promise<Sourced> }).source(current.seq, true));
    const facts: Fetched[] = provenance.origin!.map(copy => ({ fact: copy.fact, entry: parseStrict(copy.bytes) as Fetched["entry"], under: copy.under }));
    const from = { at: await life.wait(() => C.at()), seq: current.seq, hash: current.hash };
    const directory = await life.wait(() => D.at()), destination = await life.wait(() => G.at());
    expect(installedApplicationPublicationOrigin(from, directory, destination, facts)).toBe(true);
    expect(applicationPublicationOrigin(from, directory, destination, facts)).toBe(false);
    expect(installedApplicationPublicationOrigin(from, directory, destination, facts.slice(0, 2))).toBeNull();
    expect(installedApplicationPublicationOrigin(from, { ...directory, inc: destination.inc }, destination, facts)).toBe(false);
    expect(installedApplicationPublicationOrigin(from, directory, { ...destination, scope: directory.scope }, facts)).toBe(false);
    await f.store.put(f.packet.bytes, f.packet.ids.release);
    const screenEnv = { ...applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX), DEPLOYMENT: "native-install-screen-test" };
    const base = applicationScreenPath(D.name, job, f.packet.ids.presentation);
    expect((await nativeWorker.fetch(new Request("https://scopes.test" + base + "index.html"), screenEnv)).status).toBe(404);
    // Exercise the private renderer against genuine native installation
    // reads; the public room no longer serves these package bytes.
    const screen = async (path: string, init?: RequestInit) => (await applicationSandboxPage(new Request("https://scopes.test" + path, init), screenEnv))!;
    const routedHeads = await Promise.all([A, D, C, G].map(node => life.wait(() => node.summary()).then(summary => summary.at)));
    expect((await screen(base))!.headers.get("location")).toBe(base + "index.html");
    const html = (await screen(base + "index.html"))!;
    expect([html.status, html.headers.get("content-type"), await html.text()]).toEqual([200, "text/html", "TEST"]);
    expect((await screen(base + "index.html", { headers: { "if-none-match": html.headers.get("etag")! } }))!.status).toBe(304);
    const headOnly = (await screen(base + "index.html", { method: "HEAD" }))!;
    expect([headOnly.status, headOnly.headers.get("content-length"), await headOnly.text()]).toEqual([200, "4", ""]);
    expect((await screen(base + "missing.html"))!.status).toBe(404);
    expect((await screen(base + "index.html", { method: "POST", body: "TEST cannot upload screen bytes" }))!.status).toBe(405);
    const metadata = (await screen(base + "_/context"))!;
    expect(metadata.status).toBe(200);
    const bound = readApplicationScreenContext(await metadata.json(), readApplicationScreenAddress(base)!, "https://scopes.test");
    expect(bound).toMatchObject({ scope: await life.wait(() => C.at()), directory, destination, ids: f.packet.ids, membershipDefinition: "platform:membership@7" });
    expect((await screen(applicationScreenPath(D.name, job + 1000, f.packet.ids.presentation)))!.status).toBe(404);
    expect((await screen(applicationScreenPath(R.name, job, f.packet.ids.presentation)))!.status).toBe(404);
    expect((await screen(applicationScreenPath(D.name, job, `sha256:${"f".repeat(64)}`)))!.status).toBe(404);
    expect((await applicationSandboxPage(new Request("https://scopes.test" + base + "index.html"), { ...screenEnv, APPLICATION_TRUST: "[]" }))!.status).toBe(404);
    expect(await Promise.all([A, D, C, G].map(node => life.wait(() => node.summary()).then(summary => summary.at)))).toEqual(routedHeads);
    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [A, D, C, G]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], node.name).toEqual(["consistent", null]);
    }
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);

// Invariant: a definitive fetch refusal is final and visible in the native
// journal before any definition activation, role addition or application birth.
test.each([
  { format: "sha256" as const, listed: true, reason: "unsupported-object-format" },
  { format: "sha1" as const, listed: false, reason: "untrusted-release" },
])("native fetch refuses $reason before subordinate effects or network", async specimen => {
  const { life, R, D, children } = await sessionRoom(C.register), [M, A] = children;
  if (!M || !A) throw Error("The native room must confirm its siblings.");
  const f = await applicationResolverFixture(specimen.format, undefined, { admin: ["counting.control"] });
  let calls = 0;
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    const expected = await life.wait(() => M.expected({ roster: 0, member: seat }));
    await life.wait(() => M.did(rita, "first-key", { fields: { member: seat }, expected }));
    const earlier = (await life.wait(() => M.item(0))).values["adminActions"];
    life.outside(A.name, (given, sql) => hostOutside(given, sql, applicationContentBindings(env.APPLICATION_CONTENT, JSON.stringify(specimen.listed ? f.trust : [])), async () => { calls++; throw Error("TEST refusal must precede network"); }));
    await life.wait(() => A.restart());
    const signed = await life.wait(() => A.intent(rita, "install-application", { fields: { uri: f.uri, release: f.packet.ids.release, semantic: f.packet.ids.semantic,
      roles: ["admin"], values: '{"target":7}', ...Object.fromEntries(f.packet.package.semantic.definitions.map((part, index) => [`definitionText${index}`, textDigest(part.bytes)])),
    } }));
    const accepted = await life.wait(() => A.stub.submit(signed, [], { values: [canonicalize(f.packet.package.semantic), canonicalize(f.packet.package.release)], texts: f.packet.package.semantic.definitions.map(part => part.bytes) }));
    expect(accepted.answer).toBe("accepted");
    await effectFixture([A], life.wait);
    const final = await life.wait(() => (A.object as unknown as { items(reader: unknown, type: string): Promise<unknown> }).items(reader, "installation"));
    expect(final).toMatchObject({ ok: true, value: [{ state: "refused", values: { phase: "fetch", reason: specimen.reason } }] });
    expect((await life.wait(() => M.item(0))).values["adminActions"]).toEqual(earlier);
    expect((await life.wait(() => A.summary())).value.items.filter(item => item.type === "definition")).toEqual([]);
    expect((await life.wait(() => D.summary())).value.items.filter(item => ["application", "application-catalog"].includes(item.type))).toEqual([]);
    expect(calls).toBe(0); expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    const history = await life.wait(() => A.entries());
    expect(history.filter(entry => entry.input.type === "act")).toHaveLength(1);
    expect(history.filter(entry => entry.input.type === "outcome")).toHaveLength(1);
    const head = (await life.wait(() => A.summary())).at;
    const replay = await life.wait(() => verify(httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) }), { mode: "replay", platform, grants: "proven", scope: A.name, head }));
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    expect((await nativeWorker.fetch(new Request("https://scopes.test" + applicationScreenPath(D.name, history.find(entry => entry.input.type === "act")!.seq, f.packet.ids.presentation)), applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX))).status).toBe(404);
    // The register is not an application room, even though it is native.
    expect((await nativeWorker.fetch(new Request("https://scopes.test" + applicationScreenPath(R.name, 0, f.packet.ids.presentation)), applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX))).status).toBe(404);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);

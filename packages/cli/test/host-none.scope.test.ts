/** One real Native unpublished room, CLI, member sessions, installed signed
 * Lending package, delivery/result fold and whole-room replay. Local files,
 * package signer/trust/Git peer, screen bytes, scheduler and clock are TEST
 * fixtures. Package fetch is legitimate; no repository host is installed. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, onTestFinished, test } from "vitest";
import { DOMAINS, type FactRef, type FieldValue, type OutboxId, type ScopeId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, factRefOf, isFactRef, isRecord, isSeed, LATE, scopeIdOf, textDigest, timeOf, utf8, within } from "@generalbusiness/dap-bytes";
import { secretSigner, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { firstExtents, UNPUBLISHED_COHORT as C } from "@generalbusiness/dap-platform";
import { firstExtentsV11, rulesPolicyProposalV11 } from "../../platform/src/rules-policy-v11.ts";
import { McpService, memoryStore as custodyStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { issueDemo, changeDemo, DEMO_DIGESTS } from "../../../apps/room/lanes/src/index.ts";
import { openRoom, listLanes, loadIssue, loadChange } from "../../../apps/room/page/src/data.ts";
import { lending } from "../../../examples/lending/definition.ts";
import { ScriptedClock, net } from "../../scope/src/testing.ts";
import { route, outsideOf as hostOutside } from "../../scope/src/worker.ts";
import roomWorker from "../../../apps/room/worker.ts";
import { beginSessionFixture } from "../../scope/test/session-settings.ts";
import { TEST_DEPLOYMENT } from "../../scope/test/worker.ts";
import { reader } from "../../scope/test/support.ts";
import { nativeFixtureLifetime, driveFixture, dispatchFixture } from "../../scope/test/support/native-fixture-lifetime.ts";
import { applicationResolverFixture } from "../../scope/test/support/application-fixture.ts";
import { applicationHttpPeer } from "../../scope/test/support/application-http-peer.ts";
import { applicationContentBindings } from "../../scope/test/fixtures-core.ts";
import { command, memoryStore, type Context, type Outcome } from "../src/index.ts";

const SERVICE = "https://scopes.test";
let activeClock: { failed: boolean } | null = null;
const ok = (value: Outcome) => { expect(value.code, value.lines.join("\n")).toBe(0); return value; };
const noRepository = (value: Outcome) => { expect(value.code).toBe(1); expect(value.lines.join("\n")).toContain("no-repository"); };
const typed = (value: FieldValue) => typeof value === "string" ? value : canonicalize(value);

test("host none creates a real local room, settles installed publication refusal at its sender and verifies every discovered scope", async context => {
  if (activeClock?.failed) return context.skip("Host-none fixture skipped: prior close failed; ownership retained");
  if (activeClock !== null) throw Error("Host-none fixture clock already owned");
  // A fresh owned clock starts near host ingress time BEFORE any Native
  // object exists. The shared2099 clock object is never rewound. On failed
  // closure this owner/resources stay live; late work cannot reset them.
  const previousClock = net.clock, clock = new ScriptedClock(timeOf(Date.now())), outer = { failed: false };
  activeClock = outer; net.clock = clock;
  const sessionSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const owner = beginSessionFixture({ secret: sessionSecret, sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { finish: "external" });
  let releaseKey: string | null = null, closing: Promise<void> | null = null;
  const pending = new Set<Promise<unknown>>();
  const wait = <T>(action: () => Promise<T>): Promise<T> => {
    if (closing !== null || activeClock !== outer || net.clock !== clock) throw Error("Host-none fixture is closing");
    const task = Promise.resolve().then(() => life.wait(action));
    pending.add(task);
    void task.then(() => pending.delete(task), () => pending.delete(task));
    return task;
  };
  const close = (): Promise<void> => closing ??= (async () => {
    const joined = await within(9, async () => {
      for (let round = 0; round < 64 && pending.size; round++) {
        if (pending.size > 4096) throw Error("Host-none pending-work bound exceeded");
        await Promise.allSettled([...pending]);
      }
      if (pending.size) throw Error("Host-none pending-work rounds exceeded");
      let count = 0;
      for (let round = 0; round < 64; round++) {
        const nodes = life.platforms(), names = new Set(nodes.map(node => node.name));
        let callbacks = 0;
        for (const node of nodes) {
          const result = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
          if (!Number.isSafeInteger(result.callbacks) || result.callbacks < 0) throw Error("Invalid owned callback count");
          callbacks += result.callbacks; count += result.callbacks;
          if (count > 4096) throw Error("Host-none callback bound exceeded");
        }
        if (!callbacks && life.platforms().every(node => names.has(node.name))) return true;
      }
      throw Error("Host-none callback rounds exceeded");
    });
    if (joined === LATE) throw Error("Host-none callbacks did not settle; ownership retained");
    if (activeClock !== outer || net.clock !== clock) throw Error("Host-none clock ownership changed");
    if (releaseKey !== null) await env.APPLICATION_CONTENT.delete(releaseKey);
    life.release();
    if (activeClock !== outer || net.clock !== clock) throw Error("Host-none clock ownership changed during release");
    net.clock = previousClock; activeClock = null;
  })().catch(error => { if (activeClock === outer) outer.failed = true; throw error; });
  onTestFinished(close);
  try {
    const f = await applicationResolverFixture("sha1", undefined,
      { admin: ["lending.member", "lending.staff"], member: ["lending.member"] }, lending);
    expect(await env.APPLICATION_CONTENT.head(f.key)).toBeNull();
    releaseKey = f.key; // Only this initially absent release key belongs to cleanup.
    const peer = applicationHttpPeer(f), bindings = applicationContentBindings(env.APPLICATION_CONTENT, JSON.stringify(f.trust));
    life.applicationTrust(() => bindings.APPLICATION_TRUST);
    const outsideSends: { owner: string; kind: string }[] = [];
    const tracked = new Map<ScopeId, ReturnType<typeof life.platform>>();
    const track = (name: ScopeId) => {
      let node = tracked.get(name);
      if (!node) {
        node = life.platform(name); tracked.set(name, node);
        life.outside(name, (given, sql) => {
          const port = hostOutside(given, sql, bindings, peer.fetch);
          return { ...port, send: request => {
            outsideSends.push({ owner: request.owner, kind: request.kind });
            return port.send(request);
          } };
        });
      }
      return node;
    };
    life.setHold(envelope => { if (isSeed(envelope.to)) track(scopeIdOf(envelope.to)); return false; });
    const pause = async (waiting: readonly ScopeId[]) => {
      for (const name of waiting) track(name);
      // Refresh known children between finite scheduler rounds.
      for (let round = 0; round < 16; round++) {
        const before = tracked.size;
        await driveFixture([...tracked.values()], wait);
        if (tracked.size === before) return;
      }
      throw Error("Host-none creation discovery exceeded finite rounds");
    };
    let register: ScopeId | null = null;
    const requests: { method: string; path: string; signed: boolean }[] = [];
    const fetch: Fetch = async (url, init) => {
      const path = new URL(url).pathname;
      requests.push({ method: init?.method ?? "GET", path, signed: path.endsWith("/acts") || path === "/v1/scopes" });
      // Workerd's Request supports manual rather than Node's redirect:error.
      // Only this TEST bridge adapts that option; actual wire/auth is retained.
      const { redirect: _redirect, credentials: _credentials, ...wire } = init as typeof init & { redirect?: string; credentials?: string };
      const response = await wait(() => route(new Request(url, { ...wire, redirect: "manual" }), env.PLATFORM,
        { REGISTER_SCOPE: register ?? undefined, SCOPE_INDEX: env.SCOPE_INDEX, DEPLOYMENT: TEST_DEPLOYMENT, SESSION_SECRET: sessionSecret }));
      return { status: response.status, body: response.body };
    };
    const body = "TEST detached issue body, kept locally without publication.";
    const content = "# TEST retained file\nThis is signed local proposal content.\n";
    const files: Record<string, Uint8Array> = {
      "issue.json": utf8(canonicalize(issueDemo)), "change.json": utf8(canonicalize(changeDemo)), "local.md": utf8(content),
    };
    let signedIntents = 0, gitRuns = 0;
    const signing = (secret: Uint8Array): Signer => {
      const signer = secretSigner(secret);
      return { key: signer.key, sign: bytes => {
        if (new TextDecoder().decode(bytes).startsWith(DOMAINS.intent + "\n")) signedIntents++;
        return signer.sign(bytes);
      } };
    };
    const person = (): Context => {
      const held = memoryStore();
      return { store: { ...held,
        signer: async name => { const secret = await held.secret(name); return secret === null ? null : signing(secret); },
        newSigner: async name => { const secret = crypto.getRandomValues(new Uint8Array(32)); await held.keep(name, secret); return signing(secret); },
      }, fetch, now: life.now, pause, read: async path => files[path]?.slice() ?? null,
      git: { run: async () => { gitRuns++; throw Error("Unpublished commands must not invoke Git"); } } };
    };
    const admin = person(), member = person();
    const run = (who: Context, argv: readonly string[]) => wait(() => command(who, argv));
    const act = (who: Context, node: ScopeId | "directory" | "rules" | "destination", kind: string,
      fields: Record<string, FieldValue> = {}, target?: number, values: readonly string[] = []) => run(who,
      ["act", kind, "--on", node, ...(target === undefined ? [] : ["--target", String(target)]),
        ...Object.entries(fields).flatMap(([name, value]) => ["--set", name + "=" + typed(value)]), ...values.flatMap(path => ["--value", path])]);
    ok(await run(admin, ["install", "--plan", SERVICE, "--host", "none"]));
    const planned = (await admin.store.config())!.plan!;
    expect(planned.definition).toBe(C.register); register = planned.register;
    expect(planned.founding.intent.fields).toMatchObject({ host: "none", namespace: "" });
    const R = track(register);
    ok(await run(admin, ["install", "--planned"]));
    ok(await run(admin, ["create", "TEST unpublished room", "--handle", "@owner"]));
    const config = (await admin.store.config())!, repository = config.repository!;
    expect(config.register?.scope).toBe(register);
    const D = track(repository.directory.scope), M = track(repository.membership.scope), A = track(repository.rules), G = track(repository.destination);
    await pause([]);
    for (const [node, pin] of [[R, C.register], [D, C.directory], [M, C.membership], [A, C.rules], [G, C.destination]] as const) {
      expect((await wait(() => node.summary())).value).toMatchObject({ status: "active", definition: pin });
    }
    const found = (await wait(() => R.entries())).find(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "found")!;
    const directorySend = found.sends.find(send => isSeed(send.to) && send.to.kind === "directory")!;
    expect(directorySend.message).toMatchObject({ class: "request", type: "create" });
    expect((directorySend.message as { body: { fields: object } }).body.fields).not.toHaveProperty("repository");
    expect((await wait(() => D.item(0))).values["repository"]).toBeNull();
    const branch = await wait(() => G.item(0));
    expect(branch.state).toBe("unpublished");
    for (const name of ["repository", "head", "token", "slot"]) expect(branch.values[name] ?? null).toBeNull();
    expect(branch.refs["slot"] ?? null).toBeNull();
    expect(found.effects.filter(effect => effect.effect === "operation")).toEqual([]);

    const invite = ok(await run(admin, ["invite", "@member", "--role", "member"]));
    const link = invite.lines.find(line => line.startsWith("Link for "))?.split(": ").slice(1).join(": ");
    if (!link) throw Error("Actual CLI invitation link required");
    ok(await run(member, ["join", link])); await pause([]);
    const memberConfig = (await member.store.config())!;
    if (config.repository?.inbox) track(config.repository.inbox);
    if (memberConfig.repository?.inbox) track(memberConfig.repository.inbox);

    ok(await act(admin, "rules", "publish", { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) as unknown as FieldValue }, 0));
    ok(await act(admin, "rules", "activate", { digest: DEMO_DIGESTS.issue, name: "issue" }, undefined, ["issue.json"]));
    ok(await act(admin, "rules", "activate", { digest: DEMO_DIGESTS.change, name: "change" }, undefined, ["change.json"]));
    const opened = ok(await run(member, ["issue", "open", "--title", "TEST local issue", "--body", body]));
    const issueId = /Its lane is (sc_[a-z2-7]+)\./.exec(opened.lines.join("\n"))?.[1] as ScopeId | undefined;
    if (!issueId) throw Error("CLI must expose its actual issue creation");
    const I = track(issueId);
    ok(await run(member, ["issue", "comment", "1", "TEST local comment"]));
    const beforeUnauthorized = (await wait(() => I.summary())).at;
    const unauthorized = await run(member, ["issue", "assign", "1", "@member"]);
    expect(unauthorized.code).toBe(1); expect(unauthorized.lines.join("\n")).toContain("unauthorized");
    expect((await wait(() => I.summary())).at).toEqual(beforeUnauthorized);
    ok(await run(admin, ["issue", "assign", "1", "@member"]));
    ok(await run(member, ["issue", "close", "1"]));

    const secret = await admin.store.secret(config.key);
    if (!secret) throw Error("Actual CLI operator signing key required");
    const mcpPort: ServerPort = { service: SERVICE, signer: secretSigner(secret), custody: custodyStore(), fetch, now: life.now,
      config: { read: async () => ({ service: SERVICE, repository }), addRoot: async () => { throw Error("TEST room discovery must use the real Directory"); } },
      applicationFetch: peer.fetch, applicationTrust: JSON.stringify(f.trust), pause, every: () => () => {} };
    const service = new McpService({ ...mcpPort, mode: "generic" });
    const call = async (name: string, args: Record<string, unknown>) => {
      const answer = await wait(() => service.call(name, args));
      expect(answer.isError, JSON.stringify(answer.structuredContent)).toBe(false);
      return answer.structuredContent;
    };
    expect(await call("text", { scope: I.name, kind: "text", digest: textDigest(body) })).toMatchObject({ text: body });
    const installed = await call("install_application", { uri: f.uri, release: f.packet.ids.release,
      roles: ["admin", "member"], values: {}, idempotencyKey: "TEST-host-none-Lending" });
    expect(installed).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed["item"]); expect(Number.isSafeInteger(job)).toBe(true);
    await pause([]);
    const installation = await wait(() => A.item(job));
    expect(installation.state).toBe("active");
    expect(await env.APPLICATION_CONTENT.head(f.key)).not.toBeNull();
    const applicationAt = installation.refs["scope"];
    if (!isRecord(applicationAt) || typeof applicationAt["scope"] !== "string") throw Error("Native installed application ref required");
    const L = track(applicationAt["scope"] as ScopeId);
    expect((await wait(() => L.summary())).value.definition).toBe(f.packet.package.semantic.entry);
    expect(await call("application_installation", { item: job })).toMatchObject({ state: "active", scope: await wait(() => L.at()) });
    const donated = await call("act", { target: L.name, digest: f.packet.package.semantic.entry, kind: "donate", fields: {
      name: "TEST pot", description: "Local state works without publication", page: "shelf/0000000000000001.md", content: "TEST signed shelf page" }, idempotencyKey: "TEST-host-none-donate" });
    expect(donated["answer"]).toBe("accepted");
    const donation = donated["fact"];
    if (!isFactRef(donation)) throw Error("Actual donated source fact required");
    const sending = (await wait(() => L.sealed())).find(row => row.entry.seq === donation.seq)!;
    expect(factRefOf(sending.entry)).toEqual(donation);
    const publication = sending.entry.sends.find(send => send.message.class === "request" && send.message.type === "tell"
      && isRecord(send.message.body) && send.message.body["message"] === "publish-file");
    if (!publication) throw Error("Actual installed Lending publication request required");
    await dispatchFixture([L, G], wait);
    const refused = (await wait(() => G.entries())).find(entry => entry.input.type === "delivery"
      && entry.input.from.at.scope === L.name && entry.input.from.seq === donation.seq && entry.input.n === publication.n)!;
    expect(refused.input).toMatchObject({ type: "delivery", from: donation, n: publication.n, decision: "refused", reason: { code: "guard-failed", name: "no-repository" } });
    expect(refused.effects.filter(effect => effect.effect === "operation" || effect.effect === "open")).toEqual([]);
    expect(refused.sends).toHaveLength(1);
    expect(refused.sends[0]).toMatchObject({ to: await wait(() => L.at()), message: { class: "result", of: { from: donation, n: publication.n }, outcome: "refused", reason: { code: "guard-failed", name: "no-repository" } } });
    const settlements = (await wait(() => L.entries())).filter(entry => entry.input.type === "delivery" && entry.input.message.class === "result"
      && canonicalize(entry.input.message.of) === canonicalize({ from: donation, n: publication.n }));
    expect(settlements).toHaveLength(1);
    expect(settlements[0]!.input).toMatchObject({ type: "delivery", from: factRefOf(refused), n: 0,
      message: refused.sends[0]!.message, clause: "refused" });
    const outboxId = `${donation.seq}.${publication.n}` as OutboxId;
    expect(await call("sends", { scope: L.name, outboxId })).toMatchObject({ outboxItem: { outboxId, result: { seq: settlements[0]!.seq, clause: "refused" }, diagnosis: null } });
    expect(await call("wait", { scope: L.name, outboxId, seconds: 1 })).toMatchObject({ timedOut: false, outboxItem: { result: { seq: settlements[0]!.seq, clause: "refused" }, diagnosis: null } });
    const pending = await wait(() => runInDurableObject(L.object, (_instance, state) => state.storage.sql.exec<{ n: number }>(
      "SELECT COUNT(*) AS n FROM outbox WHERE seq=? AND n=? AND request IS NOT NULL AND result IS NULL AND (diagnosis IS NULL OR json_extract(diagnosis,'$.finding')<>'undelivered')", donation.seq, publication.n).one().n));
    expect(pending).toBe(0);
    for (const kind of ["borrow", "return"] as const) {
      expect(await call("act", { target: L.name, digest: f.packet.package.semantic.entry, kind, on: donation.seq, fields: { content: "TEST " + kind }, idempotencyKey: "TEST-host-none-" + kind })).toMatchObject({ answer: "accepted" });
      await dispatchFixture([L, G], wait);
    }

    // Actual local file proposal, deliberately NOT a fetched published base.
    ok(await act(admin, "directory", "open-pr", { definition: DEMO_DIGESTS.change, title: "TEST retained local file", draft: false }, undefined, ["change.json"]));
    await pause([]);
    const change = (await wait(() => D.entries())).flatMap(entry => entry.sends)
      .find(send => isSeed(send.to) && send.to.definition === DEMO_DIGESTS.change);
    if (!change || !isSeed(change.to)) throw Error("Actual Native change creation required");
    const V = track(scopeIdOf(change.to));
    ok(await act(admin, V.name, "ask-rules", {}, 0)); await pause([]);
    ok(await act(admin, V.name, "propose-file", { base: "1".repeat(40), path: "local.md", digest: digestBytes(utf8(content)), size: utf8(content).length, content }));
    const proposal = (await wait(() => V.sealed())).find(row => row.entry.input.type === "act" && row.entry.input.signed.intent.kind === "propose-file")!;
    await wait(() => V.restart());
    const retained = (await wait(() => V.entries())).find(entry => entry.seq === proposal.entry.seq)!;
    expect(retained.input).toMatchObject({ type: "act", signed: { intent: { fields: { content } } } });
    const memberSecret = await member.store.secret(memberConfig.key);
    if (!memberSecret) throw Error("Actual joined member key required");
    const page = await wait(() => openRoom({ service: SERVICE, signer: secretSigner(memberSecret), fetch, now: life.now },
      { directory: D.name, membership: repository.membership }));
    expect(page.publication).toBe("unpublished");
    expect((await wait(() => listLanes(page))).issues.map(row => row.scope)).toContain(I.name);
    expect(await wait(() => loadIssue(page, I.name))).toMatchObject({ state: "closed", body });
    const changeView = await wait(() => loadChange(page, V.name));
    expect(changeView.manifests.find(row => row.file?.content === content)?.file?.page).toBe("");
    expect(changeView.manifests.some(row => row.file?.content === content)).toBe(true);
    const status = ok(await run(member, ["status"])); expect(status.lines.join("\n")).toContain("unpublished");

    // Frontend refusals sign no repository act and never invoke Git.
    const beforeFrontend = requests.filter(row => row.signed).length, beforeSigning = signedIntents;
    for (const argv of [["clone", "TEST-target"], ["clone", "--archive", "TEST-target"], ["edit", "local.md", "--file", "local.md"],
      ["propose", "TEST-local-branch"], ["merge", V.name]] as const) noRepository(await run(admin, argv));
    expect(requests.filter(row => row.signed)).toHaveLength(beforeFrontend);
    expect(signedIntents).toBe(beforeSigning); expect(gitRuns).toBe(0);
    expect(ok(await run(member, ["remote"])).lines.join("\n")).toContain("unpublished");
    for (const [node, kind, fields, target] of [[G.name, "read-token", { hours: 1 }, 0], [D.name, "bind-archive", { archive: "journal" }, 0]] as const) {
      const before = requests.filter(row => row.signed).length;
      const answer = await act(admin, node, kind, fields, target);
      noRepository(answer); expect(answer.lines.join("\n")).toContain("guard-failed");
      expect(requests.filter(row => row.signed)).toHaveLength(before + 1);
      expect(requests.filter(row => row.signed).at(-1)?.path).toBe(`/v1/scopes/${node}/acts`);
    }
    const policy = rulesPolicyProposalV11({ approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: firstExtentsV11({ approvals: 1, checks: [] }) });
    if (!policy.ok) throw Error("Authored well-formed certificate proposal required");
    files["policy.json"] = utf8(canonicalize(policy.policy));
    const birth = async (node: typeof D): Promise<FactRef> => factRefOf((await wait(() => node.entries()))[0]!);
    const beforeCertificate = requests.filter(row => row.signed).length;
    const certificate = await act(admin, G.name, "certify-rules-tree", { proposal: policy.digest,
      directoryBirth: await birth(D), rulesBirth: await birth(A), membershipBirth: await birth(M) }, 0, ["policy.json"]);
    noRepository(certificate); expect(certificate.lines.join("\n")).toContain("guard-failed");
    expect(requests.filter(row => row.signed)).toHaveLength(beforeCertificate + 1);
    const manifest = (await wait(() => V.summary())).value.items.find(item => item.type === "manifest" && item.state === "current")!;
    ok(await act(admin, V.name, "merge", { manifest: manifest.id, reports: [] })); await dispatchFixture([V, G], wait);
    const reserve = (await wait(() => G.entries())).find(entry => entry.input.type === "delivery" && entry.input.from.at.scope === V.name
      && entry.input.message.class === "request" && entry.input.message.type === "tell" && isRecord(entry.input.message.body) && entry.input.message.body["message"] === "reserve");
    expect(reserve?.input).toMatchObject({ decision: "refused", reason: { code: "guard-failed", name: "no-repository" } });
    expect(reserve?.effects.filter(effect => effect.effect === "operation" || effect.effect === "open")).toEqual([]);
    if (!page.reader) throw Error("Joined member must receive an actual read session");
    const credential = await wait(() => route(new Request(`${SERVICE}/v1/scopes/${G.name}/credential/TEST-unpublished`,
      { headers: { authorization: page.reader!.reader() } }), env.PLATFORM, { REGISTER_SCOPE: register, SCOPE_INDEX: env.SCOPE_INDEX }));
    expect(await credential.json()).toMatchObject({ ok: false, reason: "no-repository" });
    const credentialTool = await wait(() => service.call("credential", { target: G.name, entry: 1 }));
    expect(JSON.stringify(credentialTool.structuredContent)).toContain("no-repository");
    for (const accept of ["text/plain", "text/html"]) {
      const siteReply = await wait(() => roomWorker.fetch(new Request(`${SERVICE}/site/${D.name}/HEAD/local.md`,
        { headers: { accept, "cf-connecting-ip": "192.0.2.41" } }), { ...env, SCOPES: env.PLATFORM, REGISTER_SCOPE: register, SCOPE_INDEX: env.SCOPE_INDEX }));
      expect(siteReply.status).toBe(404); expect(await siteReply.text()).toBe("no-repository");
      expect(siteReply.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    }
    await pause([]);
    const destination = await wait(() => G.summary());
    expect(destination.value.items.find(item => item.type === "branch")).toMatchObject({ state: "unpublished", values: { repository: null, head: null } });
    expect(destination.value.items.filter(item => ["file-publication", "publication", "reservation", "read-token"].includes(item.type))).toEqual([]);
    expect((await wait(() => G.entries())).flatMap(entry => entry.effects).filter(effect => effect.effect === "operation")).toEqual([]);
    for (const sender of [L, V]) {
      const pendingRequests = await wait(() => runInDurableObject(sender.object, (_instance, state) => state.storage.sql.exec<{ n: number }>(
        "SELECT COUNT(*) AS n FROM outbox WHERE request IS NOT NULL AND result IS NULL AND (diagnosis IS NULL OR json_extract(diagnosis,'$.finding')<>'undelivered')").one().n));
      expect(pendingRequests).toBe(0);
    }
    expect(outsideSends.every(request => ["fetch-application", "admit-application"].includes(request.kind))).toBe(true);
    expect(peer.ads()).toBeGreaterThan(0);
    const single = ok(await run(member, ["verify", I.name]));
    expect(single.lines[0]).toBe("Result: consistent, for the mode, target, coverage and trusts stated below.");
    expect(single.lines.some(line => line.startsWith("Target:") && line.includes(I.name))).toBe(true);
    const verified = ok(await run(member, ["verify", "--all"]));
    const consistent = verified.lines.filter(line => /^[a-z]+ sc_[a-z2-7]+, entry \d+: consistent\.$/.test(line));
    const expected = [...tracked.values()];
    expect(consistent).toHaveLength(expected.length);
    expect(new Set(consistent.map(line => line.split(" ")[1]!.replace(/,$/, "")))).toEqual(new Set(expected.map(node => node.name)));
    expect(verified.lines.at(-1)).toBe(`All consistent: ${expected.length} scopes.`);
    expect(verified.lines.filter(line => line.startsWith("Cleanup status:"))).toEqual([expect.stringContaining(G.name)]);
    Object.assign(context.task.meta, { hostNone: { qualification: "Real CLI/Worker/Native memberships, installed signed TEST Lending package, sender-final refusal and whole-room replay; TEST host-time clock, local files, package Git peer/screen/trust and finite scheduler. No deployed room, repository service or UI rendering claim.",
      registerOnlyAdmission: true, scopes: expected.length, packageRelease: f.packet.ids.release, publicationSource: donation,
      publicationOrdinal: publication.n, publicationResult: "refused", destination: "unpublished", repositoryCalls: 0 } });
  } catch (error) {
    try { await close(); }
    catch (closeError) { throw new AggregateError([error, closeError], "Host-none story and owned cleanup failed"); }
    throw error;
  } finally { if (closing === null) await close(); }
}, 120_000);

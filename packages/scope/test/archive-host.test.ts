/** Actual adapter/send code; all identity, token and HTTP replies are explicit
 * fixture stand-ins. No real credential is minted and no network is used. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeRef, timeOf, utf8 } from "@generalbusiness/artroom-bytes";
import { GitRefusal, snapshotCommit } from "@generalbusiness/artroom-git";
import { buildPack } from "@generalbusiness/artroom-git/http";
import { SmartHttpSource } from "@generalbusiness/artroom-git/http-read";
import { journalRef, type JournalPassArchive } from "@generalbusiness/artroom-git/journal";
import { GitHubProvider } from "../src/github-host.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import type { FixtureArchivePorts } from "../src/archive-host.ts";
import type { ArchiveSend } from "../src/archive-driver.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { finishArchiveParentRead } from "../src/archive-parent-read-diagnostic.ts";
import { forecastArchiveTransfer } from "../src/archive-transfer-cost.ts";
import { planArchivePass } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { create, at as nativeTime } from "./fixtures-native.ts";
import { archiveDefinition, archivePolicies, archiveRepository, archiveSql } from "./support/archive.ts";

const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "destination" };
class RecordingSendBudget extends ArchiveBudget {
  readonly charges: Partial<ArchiveCost>[] = [];
  override spend(cost: Partial<ArchiveCost>): void { super.spend(cost); this.charges.push({ ...cost }); }
}
const other: ScopeRef = { ...at, scope: `sc_${"b".repeat(51)}a` };
const pkt = (text: string) => `${(utf8(text).length + 4).toString(16).padStart(4, "0")}${text}`;
const reply = (text: string, media: string) => new Response(text, { headers: { "content-type": `application/x-git-${media}` } });
function latch() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { release, promise }; }
type ReadStage = "token" | "identity" | "advertisement" | "object";
function fixture(host: "github" | "artifacts", isolated = false, actual?: { at: ScopeRef; previous: JournalPassArchive; archive: JournalPassArchive }) {
  const repository = host === "github" ? { host: "github.com", namespace: "demo", name: "repo", id: "71" } : { host: "artifacts", namespace: "demo", name: "repo", id: "repo" };
  const remote = host === "github" ? "https://github.com/demo/repo.git" : "https://service.invalid/git/demo/repo.git";
  const scope = actual?.at ?? at;
  let now = Date.parse("2026-10-18T00:00:00Z"), pointer: string | null = actual?.previous.commit ?? null, revoked = 0;
  let blocked: ReturnType<typeof latch> | null = null;
  let readBlock: { stage: ReadStage; gate: ReturnType<typeof latch>; started: ReturnType<typeof latch>; error?: unknown } | null = null;
  const pauseRead = async (stage: ReadStage) => {
    const held = readBlock;
    if (held?.stage === stage) { held.started.release(); await held.gate.promise; if (held.error !== undefined) throw held.error; }
  };
  const started = latch(), posts: Uint8Array[] = [], calls: string[] = [];
  const fetchReceivers: unknown[] = [];
  const gitProtocols: { method: string; protocol: string | null }[] = [];
  const archive = actual?.archive ?? snapshotCommit([], "fixture archive boundary\n");
  const fetch = async function(this: unknown, request: Request): Promise<Response> {
    calls.push(request.url);
    if (request.url === `${remote}/git-upload-pack` || request.url === `${remote}/info/refs?service=git-upload-pack`) fetchReceivers.push(this);
    if (new URL(request.url).hostname === "api.github.com") {
      await pauseRead("identity");
      expect(request.url).toBe("https://api.github.com/repos/demo/repo");
      return Response.json({ id: 71, name: "repo", owner: { id: 17, login: "demo", type: "Organization" }, private: false, full_name: "demo/repo", html_url: "https://github.com/demo/repo", clone_url: remote });
    }
    gitProtocols.push({ method: request.method, protocol: request.headers.get("git-protocol") });
    if (request.method === "POST") {
      if (request.url === `${remote}/git-upload-pack`) {
        await pauseRead("object");
        const wanted = isolated ? /want ([0-9a-f]{40})/.exec(new TextDecoder().decode(await request.arrayBuffer()))?.[1] : null;
        const pack = await buildPack(isolated ? archive.objects.filter(object => object.id === wanted) : archive.objects, { maxBytes: 64 * 1024 });
        if (request.headers.get("git-protocol") === "version=2") {
          expect(host).toBe("artifacts"); expect(isolated).toBe(true);
          const prefix = utf8(pkt("packfile\n") + (pack.length + 5).toString(16).padStart(4, "0") + "\x01");
          const body = new Uint8Array(prefix.length + pack.length + 4);
          body.set(prefix); body.set(pack, prefix.length); body.set(utf8("0000"), prefix.length + pack.length);
          return new Response(body, { headers: { "content-type": "application/x-git-upload-pack-result" } });
        }
        const prefix = utf8((isolated ? "0000" : "") + pkt("NAK\n")), body = new Uint8Array(prefix.length + pack.length); body.set(prefix); body.set(pack, prefix.length);
        return new Response(body, { headers: { "content-type": "application/x-git-upload-pack-result" } });
      }
      expect(request.url).toBe(`${remote}/git-receive-pack`);
      posts.push(new Uint8Array(await request.arrayBuffer())); pointer = archive.commit;
      return reply(`${pkt("unpack ok\n")}${pkt(`ok ${journalRef(scope.scope)}\n`)}0000`, "receive-pack-result");
    }
    if (request.url.endsWith("service=git-receive-pack")) {
      started.release(); await blocked?.promise;
      const ref = pointer ? `${pointer} ${journalRef(scope.scope)}` : `${"0".repeat(40)} capabilities^{}`;
      return reply(`${pkt("# service=git-receive-pack\n")}0000${pkt(`${ref}\0report-status\n`)}0000`, "receive-pack-advertisement");
    }
    expect(request.url).toBe(`${remote}/info/refs?service=git-upload-pack`);
    await pauseRead("advertisement");
    if (request.headers.get("git-protocol") === "version=2") {
      expect(host).toBe("artifacts");
      return reply(`${pkt("version 2\n")}${pkt(isolated ? "fetch=shallow filter\n" : "fetch\n")}0000`, "upload-pack-advertisement");
    }
    const capabilities = isolated ? "shallow filter allow-reachable-sha1-in-want" : "ofs-delta";
    const line = pointer ? `${pointer} ${journalRef(scope.scope)}\0${capabilities}\n` : `${"0".repeat(40)} capabilities^{}\0${capabilities}\n`;
    return reply(`${pkt("# service=git-upload-pack\n")}0000${pkt(line)}0000`, "upload-pack-advertisement");
  };
  const ports: FixtureArchivePorts = {
    fixture: "archive-ports", clock: () => timeOf(now), tokens: {
      fixture: "archive-tokens", read: async () => { await pauseRead("token"); return "fixture-read"; },
      mint: async () => ({ id: "fixture-handle", plaintext: "fixture-write", ends: timeOf(now + 60_000) }),
      revoke: async () => { revoked++; },
    },
  };
  const provider = host === "github" ? new GitHubProvider({
    host: repository.host, namespace: "demo", maxBytes: 64 * 1024,
    app: { issuer: "fixture", privateKey: "-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----\n", installationId: 99, account: { id: 17, login: "demo", type: "Organization" }, fetch },
    readCredential: async () => { throw new Error("ledger read port must not run"); }, credentialHandle: async () => { throw new Error("ledger mint must not run"); },
  }).fixtureArchive(ports) : new ArtifactsProvider({
    host: repository.host, namespace: "demo", service: "service.invalid", maxBytes: 64 * 1024, fetch,
    binding: { get: async () => ({ info: async () => { await pauseRead("identity"); return { remote }; }, createToken: async () => { throw new Error("real mint must not run"); }, revokeToken: async () => { throw new Error("ledger revoke must not run"); } }), create: async () => { throw new Error("no create"); }, delete: async () => { throw new Error("no delete"); } },
    credentialHandle: async () => { throw new Error("ledger custody must not run"); },
  }).fixtureArchive(ports);
  const request = async (budget?: ArchiveBudget): Promise<ArchiveSend> => {
    const credential = await provider.mintArchive(repository, scope, () => true);
    if (!credential) throw new Error("fixture credential missing");
    const prior = actual?.previous.objects.filter(object => object.type !== "blob" || new TextDecoder().decode(object.data).startsWith('{"hash":')) ?? [];
    const objects = [...new Map([...prior, ...archive.objects].map(object => [object.id, { ...object, data: new Uint8Array(object.data) }])).values()];
    return { repository: { ...repository }, at: { ...scope }, ref: journalRef(scope.scope), old: actual?.previous.commit ?? null, commit: archive.commit, objects, credential, allowed: () => true,
      ...(actual ? { incremental: { budget: budget ?? new ArchiveBudget() } } : {}) };
  };
  return { provider, repository, archive, posts, calls, fetchReceivers, gitProtocols, started, request, publish: () => { pointer = archive.commit; }, block: () => { blocked = latch(); return blocked; }, expire: () => { now += 60_000; }, revoked: () => revoked,
    blockRead: (stage: ReadStage, error?: unknown) => {
      const gate = latch(), began = latch(); readBlock = { stage, gate, started: began, ...(error === undefined ? {} : { error }) };
      return { release: gate.release, started: began.promise };
    } };
}

// Actual adapters reject wrong native scope/repository/ref and forged or
// revoked identity before any HTTP discovery, including a valid token object.
test.each(["github", "artifacts"] as const)("%s archive credential cannot escape its native journal ref", async host => {
  expect(isScopeRef(at)).toBe(true); expect(isScopeRef(other)).toBe(true);
  const f = fixture(host), request = await f.request();
  const attempts: ArchiveSend[] = [
    { ...request, ref: "refs/heads/main" }, { ...request, ref: `${request.ref}/child` },
    { ...request, at: other, ref: journalRef(other.scope) },
    { ...request, at: { ...at, inc: `in_${"b".repeat(25)}a` } },
    { ...request, repository: { ...request.repository, id: "72" } },
    { ...request, credential: { ...request.credential } },
  ];
  for (const attempt of attempts) await expect(f.provider.sendArchive(attempt)).rejects.toThrow();
  expect(f.calls).toEqual([]); expect(f.posts).toEqual([]);
  await f.provider.revokeArchive(request.credential);
  await expect(f.provider.sendArchive(request)).rejects.toThrow();
  expect(f.revoked()).toBe(1); expect(f.calls).toEqual([]);
});

// A positive send proves the real path remains reachable. Object/ref mutation
// while discovery awaits cannot change the owned bytes or bound command.
test.each(["github", "artifacts"] as const)("%s archive send owns its command and bytes before discovery awaits", async host => {
  const f = fixture(host), request = await f.request(), blocked = f.block();
  const running = f.provider.sendArchive(request); await f.started.promise;
  Object.assign(request, { ref: "refs/heads/main", repository: { ...request.repository, name: "other" } });
  Object.assign(request.at, other);
  for (const object of request.objects) object.data.fill(0);
  blocked.release();
  expect(await running).toEqual({ send: "accepted" }); expect(f.posts).toHaveLength(1);
  const command = new TextDecoder().decode(f.posts[0]);
  expect(command).toContain(journalRef(at.scope)); expect(command).not.toContain("refs/heads/main");
  expect(f.gitProtocols.every(read => read.protocol === null)).toBe(true);
});

// These changes happen after the initial check, while actual smart-HTTP
// discovery awaits. Only its final beforeSend check can prevent the POST.
test.each(["github", "artifacts"] as const)("%s rechecks expiry, revocation and the pass fence after awaits", async host => {
  for (const change of ["expire", "revoke", "fence"] as const) {
    const f = fixture(host), request = await f.request(), blocked = f.block(); let allowed = true;
    const running = f.provider.sendArchive({ ...request, allowed: () => allowed }); await f.started.promise;
    if (change === "expire") f.expire();
    if (change === "revoke") await f.provider.revokeArchive(request.credential);
    if (change === "fence") allowed = false;
    blocked.release();
    const result = await running.then(value => value, () => "unavailable");
    expect(f.posts).toEqual([]); expect(result).toEqual({ send: "not-sent" });
  }
});

// Real pack decode/closure and transport allowance, with scripted HTTP.
// Over-count packs and wire replies fail before an unbounded collection.
test.each(["github", "artifacts"] as const)("%s parent reads cap decoded objects and bytes in the actual transport", async host => {
  const f = fixture(host); f.publish();
  const actual = await f.provider.objects(f.repository, f.archive.commit, { bytes: 64 * 1024, objects: 2 }, () => true);
  expect(actual).toHaveLength(2); expect(actual.map(object => object.id).sort()).toEqual(f.archive.objects.map(object => object.id).sort());
  await expect(f.provider.objects(f.repository, f.archive.commit, { bytes: 64 * 1024, objects: 1 }, () => true)).rejects.toThrow();
  await expect(f.provider.objects(f.repository, f.archive.commit, { bytes: 32, objects: 2 }, () => true)).rejects.toThrow();
  expect(f.posts).toEqual([]);
  expect(f.gitProtocols.every(read => read.protocol === null)).toBe(true);
});

// Actual isolated upload/decode, with TEST identity/token/HTTP. A full
// closure is never a fallback when exact-object negotiation is absent.
test.each(["github", "artifacts"] as const)("%s incremental parent reads one exact object after reserving the original pass work", async host => {
  const f = fixture(host, true); f.publish();
  const budget = new ArchiveBudget();
  const actual = await f.provider.readObject!(f.repository, { id: f.archive.commit, type: "commit", maximum: 1024 }, () => true, budget);
  const expected = f.archive.objects.find(object => object.id === f.archive.commit)!;
  expect(actual).toEqual({ type: "commit", size: expected.data.length, data: expected.data });
  expect(f.fetchReceivers).toHaveLength(2);
  expect(f.fetchReceivers.every(receiver => receiver instanceof SmartHttpSource)).toBe(true);
  expect(f.fetchReceivers[0]).toBe(f.fetchReceivers[1]);
  expect(f.gitProtocols).toEqual(["GET", "POST"].map(method => ({ method, protocol: host === "artifacts" ? "version=2" : null })));
  expect(finishArchiveParentRead(budget)).toEqual({ ordinal: 1, type: "commit", maximum: 1024, phase: "complete", refusal: "none" });
  const stopped = fixture(host, true); stopped.publish();
  await expect(stopped.provider.readObject!(stopped.repository, { id: stopped.archive.commit, type: "commit", maximum: 1024 }, () => true,
    new ArchiveBudget({ inputWork: 1 }))).rejects.toMatchObject({ reason: "limit" });
  expect(stopped.calls).toEqual([]);
  expect(budget.admitted().inputWork).toBeGreaterThanOrEqual(32 * (1024 + 8 * 1024));
  const unsupported = fixture(host); unsupported.publish();
  const unsupportedBudget = new ArchiveBudget();
  await expect(unsupported.provider.readObject!(unsupported.repository, { id: unsupported.archive.commit, type: "commit", maximum: 1024 }, () => true,
    unsupportedBudget)).rejects.toMatchObject({ reason: "unreadable", what: "isolated object capabilities" });
  expect(finishArchiveParentRead(unsupportedBudget)).toEqual({ ordinal: 1, type: "commit", maximum: 1024, phase: "advertisement-response", refusal: "isolated-capabilities" });
  expect(unsupported.calls.some(call => call.endsWith("/git-upload-pack"))).toBe(false);
  expect(unsupported.gitProtocols).toEqual([{ method: "GET", protocol: host === "artifacts" ? "version=2" : null }]);
  expect(f.posts).toEqual([]); expect(stopped.posts).toEqual([]); expect(unsupported.posts).toEqual([]);

  // The actual token/identity/HTTP awaits are held, not inferred from a
  // timer. Freezing at pass completion cannot cancel or change the result,
  // and a late response cannot rewrite the already emitted observation.
  for (const stage of ["token", "identity", "advertisement", "object"] as const) {
    const held = fixture(host, true); held.publish();
    const block = held.blockRead(stage), heldBudget = new ArchiveBudget();
    const running = held.provider.readObject!(held.repository, { id: held.archive.commit, type: "commit", maximum: 1024 }, () => true, heldBudget);
    let snapshot: ReturnType<typeof finishArchiveParentRead> | undefined;
    try {
      await block.started;
      snapshot = finishArchiveParentRead(heldBudget);
      expect(snapshot).toEqual({ ordinal: 1, type: "commit", maximum: 1024,
        phase: stage === "advertisement" ? "advertisement-request" : stage === "object" ? "object-request" : stage, refusal: "none" });
    } finally { block.release(); await running; }
    expect(await running).toEqual(actual);
    expect(finishArchiveParentRead(heldBudget)).toEqual(snapshot);
    expect(held.calls).toEqual(f.calls); expect(held.posts).toEqual([]);
    expect(held.fetchReceivers.every(receiver => receiver instanceof SmartHttpSource)).toBe(true);
    expect(heldBudget.admitted()).toEqual(budget.admitted());
  }
  // Token errors remain the identical rejected value. An unknown Git
  // refusal's private `what` word is never copied into the observation.
  const rejected = fixture(host, true); rejected.publish();
  const secret = new GitRefusal("unreadable", "TEST READ TOKEN ERROR SENTINEL"), block = rejected.blockRead("token", secret), rejectedBudget = new ArchiveBudget();
  const rejectedRead = rejected.provider.readObject!(rejected.repository, { id: rejected.archive.commit, type: "commit", maximum: 1024 }, () => true, rejectedBudget);
  const settled = rejectedRead.then(() => undefined, error => error);
  await block.started; block.release(); expect(await settled).toBe(secret);
  const failed = finishArchiveParentRead(rejectedBudget);
  expect(failed).toEqual({ ordinal: 1, type: "commit", maximum: 1024, phase: "token", refusal: "other" });
  expect(JSON.stringify(failed)).not.toContain(secret.what); expect(rejected.calls).toEqual([]);
  const late = fixture(host, true); late.publish();
  const lateBlock = late.blockRead("token", secret), lateBudget = new ArchiveBudget();
  const lateRead = late.provider.readObject!(late.repository, { id: late.archive.commit, type: "commit", maximum: 1024 }, () => true, lateBudget);
  const lateSettled = lateRead.then(() => undefined, error => error);
  await lateBlock.started;
  const frozen = finishArchiveParentRead(lateBudget); lateBlock.release();
  expect(await lateSettled).toBe(secret);
  expect(frozen.phase).toBe("token"); expect(frozen.refusal).toBe("none");
  expect(finishArchiveParentRead(lateBudget)).toEqual(frozen);
});

// Native entries/SQLite and real smart-HTTP send/pack validation. The policy,
// credentials, identity and HTTP host remain TEST stand-ins; no remote send.
test.for(["github", "artifacts"] as const)("%s incremental send validates exact parent edges and keeps its final credential fence", async (host, context) => {
  const lane = await create({}, {}, archiveDefinition), head = await lane.head();
  const first = await lane.inside(state => planArchivePass(archiveSql(state), { at: lane.at, through: head, after: null,
    bounds: PROPOSED_BOUNDS, policies: archivePolicies, format: "sha1", parent: null, markedAt: nativeTime(0) }, new ArchiveBudget()));
  expect(first.ok ? "accepted" : first).toBe("accepted"); if (!first.ok) return;
  // Manual component receipt/pass metadata, not host-confirmed native driver.
  await lane.inside(state => {
    const rows = new ArchiveRows(archiveSql(state), lane.at); rows.target(archiveRepository, "sha1"); rows.mark(first.mark); rows.confirm(first.mark.commit);
  });
  await lane.submit(lane.remark("native append through actual send adapter"));
  const through = await lane.head(), held = new Map(first.archive.objects.map(object => [object.id, object]));
  const next = await lane.inside(state => planArchivePass(archiveSql(state), { at: lane.at, through, after: head,
    bounds: PROPOSED_BOUNDS, policies: archivePolicies, format: "sha1", markedAt: nativeTime(1), parent: {
      id: first.archive.commit, source: { object: async (id, limit) => {
        const object = held.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
      } },
    } }, new ArchiveBudget()));
  expect(next.ok ? "accepted" : next).toBe("accepted"); if (!next.ok) return;
  const actual = { at: lane.at, previous: first.archive, archive: next.archive };
  const f = fixture(host, false, actual), budget = new RecordingSendBudget(), request = await f.request(budget);
  const shape = { objects: request.objects.length, bytes: request.objects.reduce((n, row) => n + row.data.length, 0), maximum: 64 * 1024 };
  const forecast = forecastArchiveTransfer({ ...shape, incremental: true });
  expect(await f.provider.sendArchive(request)).toEqual({ send: "accepted" }); expect(f.posts).toHaveLength(1);
  // Actual adapter pins for the reviewed shared v2 layout; unit prices stay unchanged.
  expect(shape).toEqual({ objects: 27, bytes: 3789, maximum: 65536 });
  expect(budget.charges[0]).toEqual({ metadata: 3456, inputWork: 15156 });
  expect(budget.charges.at(-1)).toEqual({ inputWork: 30312 });
  expect(budget.admitted()).toEqual({ entries: 0, attempts: 32, nodes: 16, calls: 64, metadata: 27766, inputWork: 98310 });
  // Future transfer includes one outgoing driver copy in addition to the
  // adapter's copy/pack. Append validation remains priced separately.
  expect(forecast).toEqual({ ok: true, cost: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 6912, inputWork: 60624 } });
  expect(forecastArchiveTransfer({ ...shape, incremental: false })).toEqual({ ok: true,
    cost: { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 3456, inputWork: 15156 } });
  expect(forecastArchiveTransfer({ ...shape, incremental: true, maximum: shape.bytes - 1 })).toEqual({ ok: false, reason: "limit" });
  expect(forecastArchiveTransfer({ ...shape, incremental: true, objects: 8193 })).toEqual({ ok: false, reason: "limit" });
  (context.task.meta as Record<string, unknown>)["archiveTransferCost"] = {
    objects: request.objects.length, bytes: request.objects.reduce((n, row) => n + row.data.length, 0),
    first: budget.charges[0], last: budget.charges.at(-1), total: budget.admitted(),
    qualification: "Actual adapters, native prepared entry bytes, append validator and HTTP pack. Fresh original component send budget; native planning/manual receipts used separate setup budgets. Policy, tokens, repository identity and HTTP peer are TEST stand-ins. No network, real host receipt, full native pass, deployment or export claim.",
  };
  const fenced = fixture(host, false, actual), pending = await fenced.request(), blocked = fenced.block();
  const sending = fenced.provider.sendArchive(pending); await fenced.started.promise;
  fenced.expire(); blocked.release();
  expect(await sending).toEqual({ send: "not-sent" }); expect(fenced.posts).toEqual([]);
});

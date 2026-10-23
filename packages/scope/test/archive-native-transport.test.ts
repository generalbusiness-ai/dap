/** Actual native turns/SQLite/driver and Artifacts adapter/HTTP/pack code.
 * Repository identity, credential mint, policy and HTTP peer are TEST
 * stand-ins. No network, hosted repository or deployment is used. */
import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { timeMs, timeOf, utf8 } from "@generalbusiness/artroom-bytes";
import { Reader, type GitSource } from "@generalbusiness/artroom-git";
import { buildPack } from "@generalbusiness/artroom-git/http";
import { decodePack } from "@generalbusiness/artroom-git/http-read";
import { journalRef, type JournalObject } from "@generalbusiness/artroom-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/artroom-git/journal-reader";
import { archiveSource, verifyArchive } from "@generalbusiness/artroom-replay";
import { ArchiveBudget, ARCHIVE_BOUNDS } from "../src/archive-budget.ts";
import { ArchiveDriver, type FixtureArchiveProvider } from "../src/archive-driver.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArtifactsProvider } from "../src/artifacts-host.ts";
import { create } from "./fixtures-native.ts";
import type { TestScope } from "./worker.ts";
import { archiveDefinition, archivePolicies, archiveSql } from "./support/archive.ts";
import { scriptedArchiveV2Pack } from "./support/archive-v2-pack.ts";

const pkt = (line: string) => `${(utf8(line).length + 4).toString(16).padStart(4, "0")}${line}`;
test("native driver parent reads and append sends use the same original budget through the actual adapter", async () => {
  const lane = await create({}, {}, archiveDefinition), repository = { host: "artifacts", namespace: "demo", name: "repo", id: "repo" };
  const remote = "https://service.invalid/git/demo/repo.git", ref = journalRef(lane.name);
  const objects = new Map<string, JournalObject>(), budgets: ArchiveBudget[] = [], uploads: string[] = [], sends: string[] = [];
  const stages: { stage: string; work: ReturnType<ArchiveBudget["admitted"]> }[] = [];
  let pointer: string | null = null, minted = 0, revoked = 0;
  const stored: GitSource = {
    object: async (id, maximum) => {
      const object = objects.get(id);
      return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
    }, ref: async () => pointer, refs: async () => pointer ? [{ ref, target: pointer }] : [],
  };
  const response = (body: string | Uint8Array, media: string) => new Response(body, { headers: { "content-type": `application/x-git-${media}` } });
  const peer = async (request: Request): Promise<Response> => {
    expect(request.url.startsWith(remote + "/")).toBe(true);
    if (request.method === "GET") {
      const receive = request.url.endsWith("service=git-receive-pack"), service = receive ? "git-receive-pack" : "git-upload-pack";
      if (!receive && request.headers.get("git-protocol") === "version=2") {
        return response(`${pkt("version 2\n")}${pkt("fetch=shallow filter\n")}${pkt("object-format=sha1\n")}0000`, "upload-pack-advertisement");
      }
      const caps = receive ? "report-status" : "shallow filter allow-reachable-sha1-in-want";
      const row = pointer ? `${pointer} ${ref}` : `${"0".repeat(40)} capabilities^{}`;
      return response(`${pkt(`# service=${service}\n`)}0000${pkt(`${row}\0${caps}\n`)}0000`, receive ? "receive-pack-advertisement" : "upload-pack-advertisement");
    }
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (request.url.endsWith("/git-upload-pack")) {
      const wanted = /want ([0-9a-f]{40})/.exec(new TextDecoder().decode(bytes))?.[1];
      expect(wanted).toBeDefined(); const object = objects.get(wanted!);
      expect(object).toBeDefined(); if (!object) throw Error("TEST peer has no requested object");
      uploads.push(object.id);
      const pack = await buildPack([object], { maxBytes: 8 * 1024 * 1024 });
      if (request.headers.get("git-protocol") === "version=2") return response(scriptedArchiveV2Pack(pack), "upload-pack-result");
      const prefix = utf8("0000" + pkt("NAK\n"));
      const answer = new Uint8Array(prefix.length + pack.length); answer.set(prefix); answer.set(pack, prefix.length);
      return response(answer, "upload-pack-result");
    }
    expect(request.url).toBe(remote + "/git-receive-pack");
    const size = Number.parseInt(new TextDecoder().decode(bytes.subarray(0, 4)), 16);
    const command = new TextDecoder().decode(bytes.subarray(4, size)).split("\0")[0]!.trim();
    const match = /^([0-9a-f]{40}) ([0-9a-f]{40}) (.+)$/.exec(command);
    expect(match).not.toBeNull(); if (!match) throw Error("TEST peer needs one receive command");
    expect(match[1]).toBe(pointer ?? "0".repeat(40)); expect(match[3]).toBe(ref);
    expect(new TextDecoder().decode(bytes.subarray(size, size + 4))).toBe("0000");
    const decoded = await decodePack(bytes.subarray(size + 4), { maxBytes: 8 * 1024 * 1024 });
    for (const object of decoded) {
      expect(["commit", "tree", "blob"]).toContain(object.type);
      objects.set(object.id, { id: object.id, type: object.type as JournalObject["type"], data: new Uint8Array(object.data) });
    }
    // The scripted peer checks real complete Git closure, including parent
    // ancestry already held from earlier sends. It supplies no stop set.
    expect((await new Reader(stored).closure(match[2]!)).complete).toBe(true);
    pointer = match[2]!; sends.push(pointer);
    return response(`${pkt("unpack ok\n")}${pkt(`ok ${ref}\n`)}0000`, "receive-pack-result");
  };
  const provider = new ArtifactsProvider({ host: "artifacts", namespace: "demo", service: "service.invalid", maxBytes: 8 * 1024 * 1024, fetch: peer,
    binding: { get: async () => ({ info: async () => ({ remote }), createToken: async () => { throw Error("No real mint"); }, revokeToken: async () => { throw Error("No ledger revoke"); } }),
      create: async () => { throw Error("No repository create"); }, delete: async () => { throw Error("No repository delete"); } },
    credentialHandle: async () => { throw Error("No ledger custody"); },
  }).fixtureArchive({ fixture: "archive-ports", clock: () => lane.c.clock.now, tokens: { fixture: "archive-tokens",
    read: async () => "TEST-read", mint: async () => ({ id: `TEST-${++minted}`, plaintext: "TEST-write", ends: timeOf(timeMs(lane.c.clock.now)! + 60_000) }),
    revoke: async () => { revoked++; },
  } });
  const observed: FixtureArchiveProvider = { ...provider,
    readObject: async (repository, object, allowed, budget) => {
      expect(budget).toBe(budgets.at(-1)); stages.push({ stage: `before-object:${object.type}:${object.maximum}`, work: budget.admitted() });
      const value = await provider.readObject!(repository, object, allowed, budget);
      stages.push({ stage: "after-object", work: budget.admitted() }); return value;
    },
    sendArchive: request => {
      if (request.incremental) expect(request.incremental.budget).toBe(budgets.at(-1));
      stages.push({ stage: "before-send", work: budgets.at(-1)!.admitted() });
      return provider.sendArchive(request);
    },
  };
  const pass = () => lane.inside(state => new ArchiveDriver({ sql: archiveSql(state), current: () => {
    const row = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one(), scope = JSON.parse(row.v);
    return { at: scope.at, head: scope.head };
  }, clock: () => lane.c.clock.now, bounds: PROPOSED_BOUNDS, policies: { fixture: "archive-policies", registry: archivePolicies },
  target: { fixture: "archive-target", resolve: async () => repository }, provider: observed,
  budget: () => { const budget = new ArchiveBudget(); budgets.push(budget); return budget; },
  }).run());
  expect(await pass()).toMatchObject({ state: "confirmed" });
  // Each checkpoint is admitted once by Scout and once by fresh inventory.
  // Against the unchanged 4096-entry cap, 4097 checkpoints require at least
  // three incremental appends plus genesis. This keeps one backlog and the
  // same fixed tree path and radix-100 boundary; 9999 did not cross radix 10000.
  await runInDurableObject(lane.object, async instance => {
    for (let i = 0; i < 4097; i++) expect((await (instance as TestScope).checkpoint()).answer).toBe("written");
  });
  const head = await lane.head(); let through = 0;
  expect(head.seq).toBe(4097);
  while (through < head.seq && budgets.length <= head.seq + 1) {
    const result = await pass();
    expect(result, JSON.stringify({ result, used: budgets.at(-1)!.admitted(), uploads, sends, stages })).toMatchObject({ state: "confirmed" });
    const row = await lane.inside(state => new ArchiveRows(archiveSql(state), lane.at).load()!);
    through = row.confirmed!.through.seq;
    if (budgets.length === 2) await lane.restart();
  }
  expect(through).toBe(head.seq); expect(sends.length).toBeGreaterThan(3); expect(uploads.length).toBeGreaterThan(0);
  expect(minted).toBe(sends.length); expect(revoked).toBe(minted);
  for (const budget of budgets) for (const [key, ceiling] of Object.entries(ARCHIVE_BOUNDS)) {
    expect(budget.admitted()[key as keyof typeof ARCHIVE_BOUNDS]).toBeLessThanOrEqual(ceiling);
  }
  const offline = await verifyArchive(archiveSource({ open: (scope, work) => readJournalRepositoryArchive({
    format: async () => "sha1", resolve: async () => pointer, object: (id, maximum) => stored.object(id, maximum),
  }, scope, work) }), { mode: "replay", scope: lane.name, head, grants: "as-recorded" });
  expect(offline).toMatchObject({ kind: "verification", verification: { report: { result: "consistent" } } });
  expect(await lane.head()).toEqual(head);
}, 30_000);

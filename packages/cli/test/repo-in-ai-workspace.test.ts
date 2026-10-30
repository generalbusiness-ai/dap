import { afterAll, expect, test, vi } from "vitest";
import { basename } from "node:path";
import { newIncarnation, same, scopeIdOf, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import type { ScopeRef, Summary } from "@generalbusiness/dap-contract";
import type { Session } from "../../../examples/repo-in-ai/session.ts";
import { pushSeed, retrieveWorkspaceCredential } from "../../../examples/repo-in-ai/workspace.ts";
import type { SeedCandidate } from "../../../examples/repo-in-ai/git.ts";
import { memoryStore } from "../src/store.ts";
import { Host } from "../../git/test/support/host.ts";
import { bare, cleanup, commitText, put, setRef } from "../../git/test/support/repo.ts";

// This replaces only required-session issuance. The actual bounded credential
// decoder, private markers, Git HTTP clients/Reader and local Git server run.
// No Native membership, deployment or production provider enforcement is shown.
vi.mock("../src/command-support.ts", () => ({ requiredReadsOf: () => ({ session: async () => ({ reader: () => "Session SCRIPTED-workspace" }) }) }));
afterAll(cleanup);
const NOW = Date.parse("2030-01-01T00:00:00Z"), TOKEN = "SCRIPTED-private-workspace-token";
const ref = (kind: "membership" | "directory" | "lane"): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: "platform:membership@8", creator: null, cause: textDigest("SCRIPTED workspace " + kind), ordinal: 0 }), kind, inc: newIncarnation(new Uint8Array(16).fill(9)) });

async function sessionFixture(reply: () => Response) {
  const store = memoryStore(), membership = ref("membership"), directory = ref("directory"), lane = ref("lane");
  const writes: unknown[] = [];
  const keep = store.keepPrivate;
  store.keepPrivate = async (name, bytes) => { await keep(name, bytes); writes.push(JSON.parse(new TextDecoder().decode(bytes))); };
  await store.keep("owner", new Uint8Array(32).fill(31));
  await store.save({ v: 1, key: "owner", service: "https://scopes.test", handle: "@owner", repository: { membership, directory, rules: directory.scope, destination: directory.scope } });
  let gets = 0;
  const unused = async (): Promise<never> => { throw Error("UNUSED SESSION METHOD"); };
  const session: Session = {
    ctx: { store, now: () => NOW, fetch: async (url, init) => {
      expect(url).toContain(`/v1/scopes/${encodeURIComponent(lane.scope)}/credential/`);
      expect(init?.headers?.["authorization"]).toBe("Session SCRIPTED-workspace");
      expect(writes.some(value => typeof value === "object" && value !== null && "consumed" in value), "consume marker precedes the one-time GET").toBe(true);
      gets++;
      return reply();
    } },
    read: async target => {
      expect(same(target, lane)).toBe(true);
      return { scope: lane, status: "active", definition: textDigest("SCRIPTED definition"), time: timeOf(NOW), items: [], counts: [] } satisfies Summary;
    },
    intent: unused, call: unused, request: unused, resolve: unused, submitPrepared: unused, accepted: unused,
  };
  return { session, lane, writes, gets: () => gets };
}
const credentialReply = (remote: string) => Response.json({ ok: true, at: { seq: 0, hash: textDigest("SCRIPTED credential read") }, complete: true, value: { token: TOKEN, remote, ends: timeOf(NOW + 120_000) } });

test("uncertain workspace credential consumption never GETs again in any mode", async () => {
  const remote = "https://forks.test/namespace/fork.git";
  const fixture = await sessionFixture(() => new Response("SCRIPTED lost/malformed credential response"));
  await expect(retrieveWorkspaceCredential(fixture.session, fixture.lane, "workspace-token", remote, "new")).rejects.toThrow("may have been consumed");
  for (const mode of ["check", "continue", "new"] as const) await expect(retrieveWorkspaceCredential(fixture.session, fixture.lane, "workspace-token", remote, mode)).rejects.toThrow();
  expect(fixture.gets()).toBe(1);
});

test("seed push retains possible-send bytes; Check never writes and Continue reuses one exact CAS update (session/provider stand-ins, actual local Git)", async () => {
  const repository = bare(), local = bare(), refName = "refs/heads/main";
  const oldBlob = put(repository, "blob", "old\n"), oldTreeBody = Buffer.concat([Buffer.from("100644 file\0"), Buffer.from(oldBlob, "hex")]);
  const oldTree = put(repository, "tree", oldTreeBody), base = put(repository, "commit", commitText(oldTree, [], "base"));
  setRef(repository, refName, base);
  const blob = Buffer.from("new\n"), blobId = put(local, "blob", blob);
  const tree = Buffer.concat([Buffer.from("100644 file\0"), Buffer.from(blobId, "hex")]), treeId = put(local, "tree", tree);
  const commit = Buffer.from(commitText(treeId, [base], "candidate")), commitId = put(local, "commit", commit);
  const candidate: SeedCandidate = { base, tree: treeId, commit: commitId, objects: [{ id: blobId, kind: "blob", body: blob }, { id: treeId, kind: "tree", body: tree }, { id: commitId, kind: "commit", body: commit }], expected: [] };
  const remote = `https://forks.test/${basename(repository)}`;
  const fixture = await sessionFixture(() => credentialReply(remote));
  const credential = await retrieveWorkspaceCredential(fixture.session, fixture.lane, "workspace-token", remote, "new");
  const provider = new Host(repository, TOKEN), sends: Uint8Array[] = [];
  let lose = true;
  const fetch = async (request: Request) => {
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/git-receive-pack")) {
      expect(fixture.writes.some(value => typeof value === "object" && value !== null && "possibleSend" in value), "possible-send marker precedes provider update").toBe(true);
      sends.push(new Uint8Array(await request.clone().arrayBuffer()));
      if (lose) throw Error("SCRIPTED unknown forward; no provider receipt");
    }
    return provider.upstream(request);
  };
  expect((await pushSeed(fixture.session, credential, candidate, "seed-push", "new", { fetch })).state).toBe("unknown");
  expect(sends.length).toBe(1);
  expect((await pushSeed(fixture.session, credential, candidate, "seed-push", "check", { fetch })).state).toBe("unknown");
  expect(sends.length).toBe(1);
  lose = false;
  const applied = await pushSeed(fixture.session, credential, candidate, "seed-push", "continue", { fetch });
  expect([applied.state, applied.commit, sends.length, provider.updates]).toEqual(["confirmed", commitId, 2, 1]);
  expect(sends[1]).toEqual(sends[0]);
  expect((await pushSeed(fixture.session, credential, candidate, "seed-push", "check", { fetch })).state).toBe("confirmed");
  expect(sends.length).toBe(2);
  const other = put(repository, "commit", commitText(oldTree, [base], "different writer"));
  setRef(repository, refName, other);
  expect((await pushSeed(fixture.session, credential, candidate, "seed-push", "continue", { fetch })).state).toBe("unknown");
  expect(sends.length).toBe(2);
  await expect(pushSeed(fixture.session, credential, candidate, "seed-push", "new", { fetch })).rejects.toThrow("push-original-exists");
  expect(fixture.gets()).toBe(1);
  expect(JSON.stringify(applied)).not.toContain(TOKEN);
});

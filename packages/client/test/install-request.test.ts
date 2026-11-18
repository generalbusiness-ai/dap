/**
 * NF-4 moved `declarationDigest` from `packages/mcp/src/catalogue.ts` into `src/install-request.ts`. The digest is the declaration
 * an install request expects of each trusted Rules pin, so it must not change with the move. Each value below is what
 * `declarationDigest` in `packages/mcp/src/catalogue.ts` computed at main 7ea170c9, before the move: `node --import tsx` ran it
 * in a checkout of that commit over the Rules pin of every MCP application room cohort.
 */
import { expect, test } from "vitest";
import type { Digest, PlatformDefinition, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { timeOf } from "@generalbusiness/dap-bytes";
import { BASE_COHORT, VERSIONS, mcpApplicationRoomCohort, platform } from "@generalbusiness/dap-platform";
import type { DefinitionLike } from "../src/describe.ts";
import { declarationDigest, installApplication, type InstallArguments, type InstallHandle, type InstallOptions, type InstallReader } from "../src/install-request.ts";
import { Custody, identityId, meaningOf, memoryStore, type Identity } from "../src/custody.ts";
import { httpTransport } from "../src/http.ts";
import { signedIntent } from "../src/intent.ts";
import type { AbsenceRecovery } from "../src/reads.ts";
import { signer, T0 } from "./support/custody.ts";

const AT_7EA170C9: Record<string, string> = {
  "platform:rules@5": "sha256:bfe7108f746325fffac11325f0e8e30ceb9ae92e7f3cd4a012517752060cdfb4",
  "platform:rules@6": "sha256:f29404560669f33542c73b7113a441549183b2cd5d70d18b4f2e2f7779aa3a7f",
  "platform:rules@7": "sha256:a15fdb217e0e3018232997ddb957f04c58fdb9312ccc48ce0aab687d53d99180",
  "platform:rules@8": "sha256:17b74267f0d3ab4b15964b838d4b8a9c7d79baf19f52d31d0370e7f0a56c7477",
  "platform:rules@9": "sha256:70640a645994770c6fe23dd7a7f6d797bebf6f275fbad1b5157492e1c55cf21f",
  "platform:rules@10": "sha256:864e057e2940a44ec3c6f00ab074fcbe38c331fb24de4e5c0b55785ce7b9c4b7",
  "platform:rules@14": "sha256:de4234715aa5908bf9866dbc4ea989c14cfb74599422f495500e9b6ffb84ad7b",
};

test("the install request's declaration digest of each trusted Rules pin is the digest MCP computed before the move", () => {
  const pins = new Set<string>();
  for (const pin of Object.keys(VERSIONS)) { const cohort = mcpApplicationRoomCohort(pin as PlatformDefinition); if (cohort) pins.add(cohort.rules); }
  expect([...pins].sort()).toEqual([...Object.keys(AT_7EA170C9), "platform:rules@15", "platform:rules@16"].sort());
  pins.delete("platform:rules@15"); pins.delete("platform:rules@16");
  for (const pin of pins) expect(declarationDigest(platform(pin as PlatformDefinition)!.data as unknown as DefinitionLike, "install-application", pin), pin).toBe(AT_7EA170C9[pin]);
});

/** Real Custody with scripted room summaries and dropped submission replies. No package build or absence proof runs here. */
async function repeatedInstall(existing = true) {
  const ref = (letter: string): ScopeRef => ({ scope: `sc_${letter.repeat(51)}a`, genesis: `sha256:${letter.repeat(64)}` });
  const directory = ref("a"), rules = ref("b"), membership = ref("c"), destination = ref("d");
  const head = { seq: 1, hash: rules.genesis };
  const release: Digest = `sha256:${"e".repeat(64)}`;
  const args: InstallArguments = { uri: `git+https://git.example/apps.git/@${"1".repeat(40)}/application.dap.json`, release, roles: ["member"], values: {}, idempotencyKey: "repeat-install" };
  let now = T0, sends = 0, submissions = 0, packageReads = 0;
  const store = memoryStore(), custody = new Custody(store, () => timeOf(now));
  const identity: Identity = { service: "https://install.test", membership, signer: signer.key, target: rules, key: "repeat-install" };
  const meaning = meaningOf({ rules, uri: args.uri, release, roles: args.roles, values: args.values });
  if (existing) await custody.keep(identity, meaning, async () => ({
    binding: { definition: "platform:rules", kind: "install-application", declaration: null, pinned: BASE_COHORT.rules },
    envelope: { signed: await signedIntent(signer, { to: rules, kind: "install-application", fields: {} }, { idempotencyKey: identity.key, now, lifetimeSeconds: 60 }), beside: {} },
  }), timeOf(now + 60_000));
  const summaries: ReadonlyMap<string, Summary> = new Map<string, Summary>([
    [directory.scope, { scope: directory, status: "active", definition: BASE_COHORT.directory, time: timeOf(T0), counts: [], items: [{
      id: 0, type: "repository", state: "open", revision: 0, opened: directory.genesis, parties: {}, values: {}, attributed: [], refs: { rules, membership, destination },
    }] }],
    [rules.scope, { scope: rules, status: "active", definition: BASE_COHORT.rules, time: timeOf(T0), counts: [], items: [] }],
  ]);
  const transport = httpTransport(identity.service, { fetch: async (input, init) => {
    if (init?.method === "POST") { submissions++; throw Error("TEST dropped submission reply"); }
    const scope = new URL(String(input)).pathname.split("/").at(-1)!;
    const value = summaries.get(scope);
    if (!value) throw Error("TEST unexpected room read");
    return new Response(JSON.stringify({ ok: true, at: head, value, complete: true }));
  } });
  const reader: InstallReader = { transport, read: (_membership, run) => run(transport, null) };
  const handle: InstallHandle = { service: identity.service, signer, now: () => now,
    repository: { directory, membership, rules: rules.scope, destination: destination.scope },
    applicationTrust: JSON.stringify([{ host: "git.example", publisher: signer.key, release }]),
  };
  const options: InstallOptions = {
    reader,
    send: async (...request) => { sends++; return custody.send(...request); },
    packageBytes: async () => { packageReads++; return { ok: false, reason: "unavailable" }; },
  };
  return { custody, store, identity, head, rules,
    dead: () => { now = T0 + 120_000; },
    counts: () => ({ sends, submissions, packageReads }),
    install: (more: Pick<InstallOptions, "recoverAbsent"> = {}, input = args) => installApplication(handle, custody, input, { ...options, ...more }),
    args,
  };
}

test("repeated dead installs recover only by opt-in and report current unresolved custody without sending", async () => {
  const s = await repeatedInstall();
  s.dead();
  expect(await s.install()).toMatchObject({ outcome: "refused", refusal: { refused: "lost" } });
  expect(s.counts()).toEqual({ sends: 1, submissions: 1, packageReads: 0 });
  const record = (await s.custody.find(s.identity))!;
  // These are scripted recovery-port replies. Reads' owner verifies actual journal proofs and races.
  const replies: AbsenceRecovery[] = [
    { state: "unproved", record, why: { kind: "head-before-expiry" } },
    { state: "not-needed", record },
    { state: "changed", record: null },
    { state: "present", record, found: { fact: { at: s.rules, seq: 0, hash: s.head.hash }, intent: record.signings[0]!.intent } },
    { state: "absent", record, head: s.head },
  ];
  const recovered: Identity[] = [];
  for (const reply of replies) {
    expect(await s.install({ recoverAbsent: async identity => { recovered.push(identity); return reply; } })).toEqual({
      outcome: "refused", refusal: reply.state === "unproved"
        ? { refused: "recovery", state: reply.state, why: reply.why }
        : { refused: "recovery", state: reply.state === "present" ? "present" : "changed" },
    });
    expect(s.counts()).toEqual({ sends: 1, submissions: 1, packageReads: 0 });
  }
  expect(recovered).toEqual(replies.map(() => s.identity));
  expect((await s.custody.find(s.identity))!.signings).toHaveLength(1);
});

test("missing or live installs skip recovery, and a different meaning retains Custody's conflict without releasing its record", async () => {
  let proofs = 0;
  const recoverAbsent: NonNullable<InstallOptions["recoverAbsent"]> = async () => { proofs++; throw Error("Recovery must not run"); };
  const missing = await repeatedInstall(false);
  expect(await missing.install({ recoverAbsent })).toEqual({ outcome: "refused", refusal: { refused: "unprepared", why: "unavailable" } });
  expect(missing.counts()).toEqual({ sends: 1, submissions: 0, packageReads: 1 });
  const live = await repeatedInstall();
  expect(await live.install({ recoverAbsent })).toMatchObject({ outcome: "refused", refusal: { refused: "lost" } });
  live.dead();
  const before = await live.custody.find(live.identity);
  await expect(live.install({ recoverAbsent }, { ...live.args, values: { changed: true } })).rejects.toMatchObject({ why: { held: "conflicting" } });
  expect(await live.custody.find(live.identity)).toEqual(before);
  expect(await live.store.unresolved()).toHaveLength(1);
  expect(live.counts()).toEqual({ sends: 2, submissions: 1, packageReads: 0 });
  expect(proofs).toBe(0);
});

test("recovery races project current terminal or missing custody without sending or a Native answer", async () => {
  const s = await repeatedInstall();
  s.dead();
  const answer = await s.install({ recoverAbsent: async identity => {
    // A stand-in recovery port changes the actual record while this invocation awaits it.
    const record = await s.custody.absent(identity, 0, s.head);
    return { state: "changed", record };
  } });
  expect(answer).toEqual({ outcome: "refused", refusal: { refused: "unsent" } });
  expect(s.counts()).toEqual({ sends: 0, submissions: 0, packageReads: 0 });
  expect(await s.install({ recoverAbsent: async () => { throw Error("A final record needs no proof"); } })).toEqual({ outcome: "refused", refusal: { refused: "unsent" } });
  expect(s.counts()).toEqual({ sends: 1, submissions: 0, packageReads: 0 });
  expect((await s.custody.find(s.identity))!.signings[0]!.closed).toBe(true);

  const missing = await repeatedInstall(); missing.dead();
  const before = (await missing.custody.find(missing.identity))!;
  expect(await missing.install({ recoverAbsent: async identity => {
    // Return a stale port snapshot after another owner removes the actual custody record.
    missing.store.records.delete(identityId(identity));
    return { state: "unproved", record: before, why: { kind: "head-before-expiry" } };
  } })).toEqual({ outcome: "refused", refusal: { refused: "not-found" } });
  expect(await missing.custody.find(missing.identity)).toBeNull();
  expect(missing.counts()).toEqual({ sends: 0, submissions: 0, packageReads: 0 });
});

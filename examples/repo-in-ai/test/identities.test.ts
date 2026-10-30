import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { b64url, canonicalize, entryHash, intentDigest, newIncarnation, scopeIdOf, textDigest, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import type { Entry, Item, OutboxId, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import { memoryStore } from "../../../packages/cli/src/store.ts";
import type { PendingInvitationIssue, Store } from "../../../packages/cli/src/store.ts";
import { storedSigner } from "../../../packages/cli/src/store-signer.ts";
import { IdentityRefusal, enrollIdentity, initializeOwner, retainedInvitationRequests } from "../identities.ts";
import { durableCliStore } from "../custody.ts";
import { bindPlan, identityHome, retain, type SetupPlan } from "../plan.ts";
import { failureDiagnostic, newDiagnostics, type EnrollmentDiagnostic } from "../diagnostics.ts";
import { main } from "../setup.ts";
import { Roster, rita } from "../../../packages/platform/test/support.ts";

// Local custody only. No native, HTTP or provider judgment runs in this file.
const operation = "11111111-1111-4111-8111-111111111111";
async function chain(length: number) {
  const store = memoryStore(), names: string[] = [];
  let previous: Pick<PendingInvitationIssue, "request" | "digest"> | undefined;
  for (let n = 0; n < length; n++) {
    const request = `i-${String(n).padStart(30, "0")}`;
    const raw = canonicalize({ operation, ...(previous ? { previous } : {}) });
    await store.keepPrivate(request, utf8(raw));
    previous = { request, digest: textDigest(raw) };
    names.push(request);
  }
  return { store, names, pointer: { operation, ...previous! } };
}

test("a retained invitation chain preserves engine order and refuses a changed or missing ancestor, another operation and overflow", async () => {
  const original = await chain(16);
  expect(await retainedInvitationRequests(original.store, original.pointer)).toEqual(original.names);
  const root = original.names[0]!;
  const changed: Store = { ...original.store, private: async name => name === root ? utf8(canonicalize({ operation, changed: true })) : original.store.private(name) };
  await expect(retainedInvitationRequests(changed, original.pointer)).rejects.toMatchObject({ reason: "private-original-digest" });
  const missing: Store = { ...original.store, private: async name => name === root ? null : original.store.private(name) };
  await expect(retainedInvitationRequests(missing, original.pointer)).rejects.toMatchObject({ reason: "private-original-missing" });
  await expect(retainedInvitationRequests(original.store, { ...original.pointer, operation: "another" })).rejects.toMatchObject({ reason: "invitation-operation-changed" });
  const overflow = await chain(17);
  await expect(retainedInvitationRequests(overflow.store, overflow.pointer)).rejects.toMatchObject({ reason: "invitation-chain-bound" });
});

/** Actual CLI invitation engine, filesystem originals and judged in-memory
 * Membership. Sessions, Directory and Inbox confirmation are HTTP stand-ins;
 * this is no native Worker, provider or hosted authority witness. */
async function enrollmentFixture() {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-first-root-")));
  const roster = new Roster("platform:membership@8").seated(), service = "https://identity.test";
  const directory = { ...roster.office.at, kind: "directory" as const };
  const repository = { directory, membership: roster.at, rules: directory.scope, destination: directory.scope };
  const setup: SetupPlan = { v: 1, service, providerOrigin: "https://provider.test", deploymentVersion: "11111111-1111-4111-8111-111111111111", register: { ...directory, kind: "register" }, namespace: "dap-demo", name: "test-room", home,
    handles: { owner: "@rita", "agent-a": "@agent-a", "agent-b": "@agent-b", checker: "@checker" } };
  const ownerHome = identityHome(setup, "owner"), owner = durableCliStore(ownerHome);
  await owner.keep("operator", rita.secret);
  await owner.save({ v: 1, service, key: "operator", repository, handle: "@rita" });
  await bindPlan(owner, setup);
  const receipts = new Map<string, Receipt>(), sent: SignedIntent[] = [], traces: EnrollmentDiagnostic[] = [];
  let refuseSummary = false, stopAtDispatch = false, unknownSession = false, beforeDispatch: ((signed: SignedIntent) => Promise<void>) | null = null;
  const live = (): Item[] => Object.entries(roster.definition.declared.items).flatMap(([type, item]) => roster.state.page(type, Object.keys(item.states).filter(s => !item.states[s]!.final), null, 100).items)
    .map(item => item.type === "roster" ? { ...item, refs: { ...item.refs, directory } } : item);
  const fetcher: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === "/health") return Response.json({ deployment: "dap-demo", version: setup.deploymentVersion, register: "ready", sessions: "ok", wiring: { artifacts: { state: "wired" } } });
    if (path.endsWith("/sessions")) {
      const asked = JSON.parse(init!.body!).request;
      const key = live().find(item => item.type === "key" && item.state === "active" && item.values["id"] === asked.actor);
      const member = key ? live().find(item => item.type === "member" && item.id === key.refs["member"]) : unknownSession ? live().find(item => item.type === "member" && item.values["handle"] === "@rita") : null;
      return Response.json(member ? { ok: true, token: b64url(new Uint8Array(32).fill(9)), session: { v: 1, deployment: "SCRIPTED", membership: roster.at, member: member.values["handle"], key: asked.actor, reads: ["summary", "entry"], ends: asked.notAfter } } : { ok: false, reason: "unauthorized" });
    }
    if (path.endsWith("/acts")) {
      const signed = (JSON.parse(init!.body!) as { signed: SignedIntent }).signed;
      await beforeDispatch?.(signed);
      sent.push(signed);
      if (stopAtDispatch) throw Error("SCRIPTED secret transport detail must stay private");
      const digest = intentDigest(signed.intent);
      let receipt = receipts.get(digest);
      if (!receipt) {
        const judged = roster.submit(signed, { platform: roster.platformRules, membership: roster.at, grants: roster.held(signed.intent.actor) });
        expect(judged.result).toBe("write");
        const entry = roster.entries.at(-1)!.entry;
        receipt = { intent: digest, fact: roster.fact(entry.seq), definition: "platform:membership@8", effects: entry.effects, sends: entry.sends.map(send => `${entry.seq}.${send.n}` as OutboxId), epoch: entry.epoch };
        receipts.set(digest, receipt);
      }
      return Response.json({ answer: "accepted", receipt });
    }
    if (path.endsWith("/settle")) {
      const signed = (JSON.parse(init!.body!) as { signed: SignedIntent }).signed, receipt = receipts.get(intentDigest(signed.intent));
      return Response.json(receipt ? { ok: true, at: roster.head, value: receipt, complete: true } : { ok: false, reason: "not-found" });
    }
    for (const member of live().filter(item => item.type === "member" && item.values["kind"] !== "person")) {
      const source = roster.entries[member.id]!.entry, birth = source.sends.find(send => "creator" in send.to && send.to.kind === "inbox");
      if (!birth || !("creator" in birth.to) || !url.includes(scopeIdOf(birth.to))) continue;
      const at = { scope: scopeIdOf(birth.to), inc: newIncarnation(new Uint8Array(16).fill(member.id + 10)), kind: "inbox" as const };
      const entry: Entry = { v: 1, at, seq: 0, prev: null, time: roster.now, clamped: false, epoch: 0, input: { type: "genesis", seed: birth.to, inc: at.inc, kind: "establish", founding: null, source: roster.fact(member.id), n: birth.n, message: birth.message.class === "request" ? birth.message : null, decision: "applied" }, uses: [], prepared: [], effects: [], sends: [] };
      const head = { seq: 0, hash: entryHash(entry) };
      if (path.endsWith("/entries/0")) return Response.json({ ok: true, at: head, value: { entry, hash: head.hash }, complete: true });
      return Response.json({ ok: true, at: head, value: { scope: at, status: "active", definition: "platform:inbox@1", time: roster.now, counts: [["inbox", "open", 1]], items: [{ id: 0, type: "inbox", state: "open", revision: 1, opened: textDigest("SCRIPTED inbox"), attributed: [], values: {}, parties: { owner: member.parties["member"] }, refs: { membership: roster.at } }] }, complete: true });
    }
    if (url.includes(directory.scope)) return Response.json({ ok: true, at: { seq: 0, hash: textDigest("SCRIPTED directory") }, complete: true, value: { scope: directory, status: "active", definition: "platform:directory@16", time: roster.now, counts: [["repository", "open", 1]], items: [{ id: 0, type: "repository", state: "open", revision: 1, opened: textDigest("SCRIPTED repository"), attributed: [], parties: {}, values: {}, refs: { membership: roster.at, rules: { ...directory, kind: "rules" }, destination: { ...directory, kind: "destination" } } }] } });
    if (path.includes("/entries/")) {
      const entry = roster.entries[Number(path.split("/").at(-1))];
      return Response.json({ ok: true, at: roster.head, value: entry, complete: true });
    }
    if (refuseSummary) return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
    return Response.json({ ok: true, at: roster.head, complete: true, value: { scope: roster.at, status: "active", definition: "platform:membership@8", time: roster.now, items: live(), counts: Object.entries(roster.definition.declared.items).flatMap(([type, item]) => Object.keys(item.states).map(state => [type, state, roster.state.count(type, state)])) } });
  };
  const ctx = { store: owner, fetch: fetcher, now: () => timeMs(roster.now)! };
  return { home, setup, owner, ctx, fetcher, sent, traces,
    failSummary: (value: boolean) => { refuseSummary = value; }, stopDispatch: () => { stopAtDispatch = true; },
    permitUnknownSession: () => { unknownSession = true; },
    beforeDispatch: (callback: (signed: SignedIntent) => Promise<void>) => { beforeDispatch = callback; },
    enroll: (name: "agent-a" | "agent-b", mode: "new" | "check" | "continue", handle = setup.handles[name]) => enrollIdentity(ctx, identityHome(setup, name), "agent", handle, mode, { recoveryPlan: setup, observe: value => traces.push(value) }),
    close: () => rmSync(home, { recursive: true, force: true }),
  };
}

test("plan-only Continue keeps its operation and makes the actual first root durable before dispatch; Check does not start it", async () => {
  const f = await enrollmentFixture();
  try {
    f.failSummary(true);
    await expect(f.enroll("agent-b", "new")).rejects.toThrow();
    const receiver = durableCliStore(identityHome(f.setup, "agent-b")), planBytes = (await receiver.private("s1-identity"))!;
    expect(f.sent).toHaveLength(0);
    expect(f.traces.at(-1)).toMatchObject({ stage: "invitation-pre-root", read: { method: "GET", category: "membership-summary", status: 503 } });
    await expect(f.enroll("agent-b", "check")).rejects.toMatchObject({ reason: "original-invitation-missing" });
    expect(readdirSync(join(f.home, "agent-b", "private"))).toEqual(["s1-identity.data"]);
    await expect(f.enroll("agent-b", "continue", "@changed")).rejects.toMatchObject({ reason: "identity-plan-changed" });
    await expect(enrollIdentity(f.ctx, identityHome(f.setup, "agent-b"), "agent", f.setup.handles["agent-b"], "continue", { recoveryPlan: { ...f.setup, name: "changed-room" } })).rejects.toMatchObject({ reason: "plan-only-binding" });
    const planPath = join(f.home, "agent-b", "private", "s1-identity.data"), saved = readFileSync(planPath);
    writeFileSync(planPath, "!".repeat(Math.ceil(65536 / 3) * 4 + 2));
    // A parse error would mean the inherited private reader saw these bytes.
    await expect(f.enroll("agent-b", "continue")).rejects.toMatchObject({ reason: "plan-only-bound" });
    writeFileSync(planPath, saved);
    f.failSummary(false);
    const secret = f.owner.secret;
    let reads = 0;
    f.owner.secret = async name => ++reads === 2 ? new Uint8Array(32).fill(111) : secret(name);
    f.permitUnknownSession();
    await expect(f.enroll("agent-b", "continue")).rejects.toMatchObject({ reason: "invitation-operation-changed" });
    expect(readdirSync(join(f.home, "agent-b", "private"))).toEqual(["s1-identity.data"]);
    expect(f.sent).toHaveLength(0);
    f.owner.secret = secret;
    f.failSummary(false); f.stopDispatch();
    f.beforeDispatch(async signed => {
      const pointer = (await f.owner.config())!.invitationIssue!;
      const chain = await retainedInvitationRequests(f.owner, pointer);
      expect(chain.length).toBeGreaterThanOrEqual(3);
      const row = JSON.parse(new TextDecoder().decode((await f.owner.private(pointer.request))!));
      expect(canonicalize(row.member.signed)).toBe(canonicalize(signed));
      expect(row.operation).toBe(JSON.parse(new TextDecoder().decode(planBytes)).operation);
      expect(statSync(join(f.home, "owner", "private", pointer.request + ".data")).mode & 0o777).toBe(0o600);
    });
    expect((await f.enroll("agent-b", "continue")).code).toBe(1);
    expect(f.sent).toHaveLength(1);
    expect(await receiver.private("s1-identity")).toEqual(planBytes);
  } finally { f.close(); }
});

test("plan-only Continue accepts completed A's exact owned chain but refuses an unaccounted owner root", async () => {
  const f = await enrollmentFixture();
  try {
    expect((await f.enroll("agent-a", "new")).code).toBe(0);
    const priorFiles = readdirSync(join(f.home, "owner", "private")).filter(name => name.startsWith("i-"));
    expect(priorFiles.length).toBeGreaterThan(1);
    f.failSummary(true);
    await expect(f.enroll("agent-b", "new")).rejects.toThrow();
    await expect(f.enroll("agent-b", "continue")).rejects.toMatchObject({ reason: "plan-only-orphan" });
    // The actual completed engine call above returned successfully; publish
    // exactly the phase receipt that setup.runPhase writes at this boundary.
    await retain(f.owner, "s1-done-enrol-a", { phase: "enrol-a", status: "observed" });
    f.failSummary(false); f.stopDispatch();
    const before = f.sent.length;
    expect((await f.enroll("agent-b", "continue")).code).toBe(1);
    expect(f.sent).toHaveLength(before + 1);
    expect(priorFiles.every(name => existsSync(join(f.home, "owner", "private", name)))).toBe(true);
  } finally { f.close(); }
  for (const conflict of ["matching-operation", "foreign-orphan"] as const) {
    const g = await enrollmentFixture();
    try {
      g.failSummary(true); await expect(g.enroll("agent-b", "new")).rejects.toThrow();
      const receiver = durableCliStore(identityHome(g.setup, "agent-b")), plan = JSON.parse(new TextDecoder().decode((await receiver.private("s1-identity"))!));
      await g.owner.keepPrivate("i-" + "e".repeat(30), utf8(canonicalize({ operation: conflict === "matching-operation" ? plan.operation : operation })));
      g.failSummary(false);
      await expect(g.enroll("agent-b", "continue")).rejects.toMatchObject({ reason: "plan-only-orphan" });
      expect(g.sent).toHaveLength(0);
    } finally { g.close(); }
  }
});

test("plan-only startup refuses absent plans and surviving receiver or owner custody", async () => {
  const f = await enrollmentFixture();
  try {
    mkdirSync(identityHome(f.setup, "agent-b"), { mode: 0o700 });
    await expect(f.enroll("agent-b", "continue")).rejects.toMatchObject({ reason: "identity-plan-missing" });
  } finally { f.close(); }
  for (const conflict of ["started", "key", "envelope", "config", "pointer"] as const) {
    const g = await enrollmentFixture();
    try {
      g.failSummary(true); await expect(g.enroll("agent-b", "new")).rejects.toThrow();
      const receiver = durableCliStore(identityHome(g.setup, "agent-b"));
      if (conflict === "started") await receiver.keepPrivate("s1-receiver-started", utf8("{}"));
      if (conflict === "key") await receiver.keep("k-" + "a".repeat(30), new Uint8Array(32).fill(7));
      if (conflict === "envelope") await receiver.keepPrivate("a-" + "a".repeat(30), utf8("{}"));
      if (conflict === "config") await receiver.save({ v: 1, service: g.setup.service, key: "missing" });
      if (conflict === "pointer") await g.owner.save({ ...(await g.owner.config())!, invitationIssue: { operation, actor: rita.key, membership: (await g.owner.config())!.repository!.membership, request: "i-" + "a".repeat(30), digest: textDigest("orphan") } });
      await expect(g.enroll("agent-b", "continue")).rejects.toBeInstanceOf(IdentityRefusal);
      expect(g.sent).toHaveLength(0);
    } finally { g.close(); }
  }
});

test("the entry point retains actual pre-root failure status and only safe stderr/cause metadata", async () => {
  const f = await enrollmentFixture(), publicRoot = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-diagnostics-")));
  const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  try {
    const input = join(publicRoot, "input.json");
    writeFileSync(input, JSON.stringify(f.setup), { mode: 0o600 });
    f.failSummary(true); vi.stubGlobal("fetch", f.fetcher);
    expect(await main(["--input", input, "--phase", "enrol-b", "--mode", "new"])).toBe(2);
    expect(existsSync(identityHome(f.setup, "agent-b"))).toBe(false);
    const directory = join(publicRoot, "new");
    expect(await main(["--input", input, "--phase", "enrol-b", "--mode", "new", "--diagnostics", directory])).toBe(1);
    const raw = readFileSync(join(directory, "receipt.json"), "utf8"), receipt = JSON.parse(raw);
    expect(receipt).toMatchObject({ exitCode: 1, phase: "enrol-b", enrollment: { stage: "invitation-pre-root", cause: "engine-error", read: { category: "membership-summary", status: 503 } } });
    expect(readFileSync(join(directory, "stderr.log"), "utf8")).toBe(stderr.mock.calls.at(-1)![0]);
    expect(statSync(directory).mode & 0o777).toBe(0o700);
    expect(statSync(join(directory, "receipt.json")).mode & 0o777).toBe(0o600);
    expect(raw).not.toContain("secret transport detail");
    expect(f.sent).toHaveLength(0);
    expect(() => newDiagnostics(directory, f.home)).toThrow();
    expect(() => newDiagnostics(join(f.home, "diagnostics"), f.home)).toThrow();
    const sealed = join(publicRoot, "sealed"); mkdirSync(sealed, { mode: 0o500 });
    expect(() => newDiagnostics(join(sealed, "new"), f.home)).toThrow();
    chmodSync(sealed, 0o700);
    expect(failureDiagnostic(Error("SECRET arbitrary response body"), null)).toEqual({ stage: "identity", cause: "engine-error" });
    expect(failureDiagnostic({ outcome: { lines: ["Read session refused: clock-behind."] } }, null)).toMatchObject({ nativeReason: "clock-behind" });
    expect(failureDiagnostic({ reason: "sessions-unavailable" }, null)).toMatchObject({ nativeReason: "sessions-unavailable" });
    expect(failureDiagnostic({ reason: "SECRET body", outcome: { lines: ["SECRET token"] } }, null)).toEqual({ stage: "identity", cause: "engine-error" });
  } finally { stderr.mockRestore(); vi.unstubAllGlobals(); f.close(); rmSync(publicRoot, { recursive: true, force: true }); }
});

test("owner continuation restores configuration only with the exact retained inputs and original signer", async () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "artroom-s1-owner-")));
  try {
    const register = {
      kind: "register" as const,
      scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@21", creator: null, cause: textDigest("TEST existing register"), ordinal: 0 }),
      inc: newIncarnation(new Uint8Array(16).fill(1)),
    };
    const input = { service: "https://identity.test", register, handle: "@owner" };
    const fresh = await initializeOwner(home, input, "new");
    const original = (await storedSigner(fresh.store, "operator"))!.key;
    const keyPath = join(home, "keys", "operator.key"), keyBytes = readFileSync(keyPath);
    const configPath = join(home, "config.json");
    unlinkSync(configPath);
    await expect(initializeOwner(home, input, "check")).rejects.toMatchObject({ reason: "owner-config-not-published" });
    expect(await fresh.store.config()).toBeNull();
    await expect(initializeOwner(home, { ...input, handle: "@different" }, "continue")).rejects.toMatchObject({ reason: "owner-input-changed" });
    expect(await fresh.store.config()).toBeNull();
    const resumed = await initializeOwner(home, input, "continue");
    expect((await storedSigner(resumed.store, "operator"))!.key).toBe(original);
    expect(readFileSync(keyPath)).toEqual(keyBytes);
    expect((await resumed.store.config())?.handle).toBe(input.handle);
    unlinkSync(keyPath);
    await expect(initializeOwner(home, input, "continue")).rejects.toMatchObject({ reason: "original-owner-key-missing" });
    expect(await storedSigner(resumed.store, "operator")).toBeNull();
    await expect(initializeOwner(home, input, "new")).rejects.toBeInstanceOf(IdentityRefusal);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

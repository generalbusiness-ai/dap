import { descriptions } from "../src/description-context.ts";
import { describe, expect, test } from "vitest";
import type { Answer, DeclaredDefinition, MismatchReason, ReadRefusal, RefusalReason, UnavailableReason } from "@generalbusiness/dap-contract";
import { REFUSAL_REASONS, READ_REFUSALS, b64url, intentDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { INVITATION_LINK, readApplicationInstallOptions, secretSigner, signedIntent, TransportError } from "@generalbusiness/dap-client";
import { TRUSTED_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { projectAnswer, ACT_OUTPUT, type ActResult } from "../src/act-result.ts";
import { earlierSaid } from "../src/errors.ts";
import { Custody, McpService, MISMATCH_NOTES, UNAVAILABLE_NOTES, answered, finding, meaningOf, memoryStore, type Finding } from "../src/index.ts";
import { type DefinitionLike } from "@generalbusiness/dap-client";
import { READ_CREDENTIAL, SERVICE, SESSION_TOKEN, StandIn } from "./support/standin.ts";
import { fixedSigner } from "./fixtures.ts";
import { PERSON_INVITATION, PERSON_INVITATION_CASES, PERSON_SERVICE } from "../../client/test/support/person-invitation-table.ts";

const { guardSentences } = descriptions;

const head = { seq: 41, hash: `sha256:${"c".repeat(64)}` } as const;
const asked = { scope: "sc_the_scope", kind: "close-own", on: 3, action: "issue.close-own" };

// Invariant: only a register's `found` says that the register needs its operator. The name of the kind alone does not decide it.
test("a type-full names the operator for a register's found, and for no other definition or act", () => {
  const refused: Answer = { answer: "refused", reason: "type-full", judgedAt: head };
  const plain = { sentence: `sc_the_scope refused found, because the scope holds as many live items of that type as it may, judged at head ${head.seq}.`, next: "Close or finish one first." };
  expect(answered(refused, { scope: "sc_the_scope", kind: "found", definition: "platform:directory" }, null)).toEqual(plain);
  expect(answered(refused, { scope: "sc_the_scope", kind: "found" }, null)).toEqual(plain);
  expect(answered(refused, { scope: "sc_the_scope", kind: "install", definition: "platform:register" }, null).next).toBe("Close or finish one first.");
  expect(answered(refused, { scope: "sc_the_scope", kind: "found", definition: "platform:register" }, null).next).toContain("the register's operator");
});

// Real MCP custody/projection and scripted transport only. These archive
// locations prove no native judgment, clone verification or provider custody.
test("archived submit and settlement stay explicit and terminal without inventing missing facts", async () => {
  const signer = fixedSigner(21), stand = new StandIn(signer.key), store = memoryStore();
  const at = stand.destination, fact = { at, seq: 3, hash: head.hash };
  const archived = { floor: 5, commit: "b".repeat(40), through: { seq: 6, hash: head.hash } };
  // The act, preparation-step and install projections use this same receipt owner.
  const accepted: Extract<Answer, { answer: "accepted" }> = { answer: "accepted", receipt: { fact, definition: head.hash, intent: null, effects: [], sends: [], epoch: 0 } };
  const acceptedSaid = { sentence: "The request was accepted.", next: "Read its installation." };
  const act = projectAnswer({ answer: accepted }, { scope: at.scope, kind: "apply", tool: "act", retained: false, phase: "accepted", said: acceptedSaid });
  const step = projectAnswer({ answer: accepted });
  const install = projectAnswer({ answer: accepted }, { item: fact.seq, retained: false, phase: "accepted" });
  expect([act.effects, step.effects, install.effects]).toEqual([0, 0, 0]);
  expect(install).toMatchObject({ item: 3, phase: "accepted", fact });
  expect(projectAnswer({ answer: { ...accepted, receipt: { ...accepted.receipt, effects: [{ effect: "state", item: 3, state: "active" }] } } }).effects).toBe(1);
  const refusal = projectAnswer({ answer: { answer: "refused", reason: "guard-failed", judgedAt: head } }, { retained: true, phase: "refused", said: { sentence: "The scope refused the request.", next: "Read the named guard." } });
  expect(refusal).toMatchObject({ sentence: "The scope refused the request. This outcome was kept under custody; this call sent nothing.", next: "Read the named guard. To send the same envelope again, deliberately: resubmit: true." });
  const missing = projectAnswer({ archivedSettlement: { ok: false, reason: "archived", archived } });
  expect(missing).toEqual({ answer: "archived", archived });
  expect(ACT_OUTPUT.required).toEqual(["answer"]);
  expect(ACT_OUTPUT.properties.answer.enum).toEqual(["accepted", "archived", "refused", "unavailable", "mismatch"]);
  expect(ACT_OUTPUT.properties.phase.enum).toEqual(["prepared", "sent", "unknown", "accepted", "archived", "refused", "mismatch", "settled"]);
  // @ts-expect-error Native custody has no recorded phase.
  const synthetic: ActResult = { answer: "accepted", phase: "recorded" };
  void synthetic;
  let posts = 0, settlements = 0;
  const service = new McpService({ service: SERVICE, signer, custody: store, now: () => Date.parse("2099-01-01T00:00:00Z"),
    config: { read: async () => stand.config(), addRoot: async () => { throw Error("must not grant a root"); } },
    fetch: async (url, init) => {
      if (url.endsWith("/acts")) {
        posts++;
        const key = JSON.parse(init!.body!).signed.intent.idempotencyKey;
        if (key === "native-archived") return Response.json({ answer: "archived", archived, fact }, { status: 410 });
        throw new TransportError("scripted lost original reply");
      }
      if (url.endsWith("/settle")) { settlements++; return Response.json({ ok: false, reason: "archived", archived }, { status: 410 }); }
      return stand.fetch(url, init);
    } });
  await service.page();
  for (const key of ["native-archived", "settlement-archived"]) {
    const args = { on: 0, fields: { hours: 1 }, idempotencyKey: key };
    const first = await service.call("repository.read-token", args);
    if (key === "native-archived") expect(first.structuredContent["answer"]).toBe("archived");
    const settled = (await service.call("settle", { target: "destination", idempotencyKey: key })).structuredContent;
    expect([settled["answer"], settled["phase"], settled["archived"]]).toEqual(["archived", "archived", archived]);
    expect(Object.hasOwn(settled, "fact")).toBe(key === "native-archived");
    if (key === "native-archived") expect(settled["fact"]).toEqual(fact);
    expect(settled).not.toHaveProperty("outboxIds");
    expect(String(settled["sentence"])).not.toMatch(/accepted|record stays unknown/);
    expect(String(settled["next"])).toContain("Verify the archive clone");
    expect(String(settled["next"])).not.toContain("resends the same envelope");
    const repeated = await service.call("repository.read-token", { ...args, resubmit: true });
    expect([repeated.structuredContent["answer"], repeated.structuredContent["archived"]]).toEqual(["archived", archived]);
    expect(Object.hasOwn(repeated.structuredContent, "fact")).toBe(key === "native-archived");
    await service.call("settle", { target: "destination", idempotencyKey: key });
  }
  expect([posts, settlements, (await store.unresolved()).length]).toEqual([2, 1, 0]);
  const said = answered({ answer: "archived", archived, fact }, asked, null);
  expect(said.sentence).toContain(`hash ${fact.hash}, genesis ${fact.at.genesis}`);
  expect(said.sentence).toContain(`through entry 6, hash ${head.hash}`);
  expect(said.sentence).not.toContain("accepted");
});

// Real MCP custody and scripted transport only. The MCP service holds no replica, so it cannot project a fold that another
// client of the same store made: it reads the record as unreadable, and sends and settles nothing.
test("a store that holds a folded record gives the MCP service unreadable", async () => {
  const signer = fixedSigner(23), stand = new StandIn(signer.key), store = memoryStore();
  const now = Date.parse("2099-01-01T00:00:00Z");
  let posts = 0, settlements = 0;
  const service = new McpService({ service: SERVICE, signer, custody: store, now: () => now,
    config: { read: async () => stand.config(), addRoot: async () => { throw Error("must not grant a root"); } },
    fetch: async (url, init) => {
      if (url.endsWith("/acts")) { posts++; throw new TransportError("scripted lost reply"); }
      if (url.endsWith("/settle")) { settlements++; throw new TransportError("scripted lost settlement"); }
      return stand.fetch(url, init);
    } });
  await service.page();
  const args = { on: 0, fields: { hours: 1 }, idempotencyKey: "folded-elsewhere" };
  await service.call("repository.read-token", args);
  const [open] = await store.unresolved();
  const record = (await store.read(open!.id))!;
  const fact = { at: stand.destination, seq: 3, hash: head.hash };
  await new Custody(store, () => timeOf(now)).folded(record.identity, { fact, intent: intentDigest(record.envelope.signed.intent) });
  const counted = [posts, settlements];
  for (const [tool, given] of [["settle", { target: "destination", idempotencyKey: "folded-elsewhere" }], ["repository.read-token", args]] as const) {
    // A call that throws instead of giving a finding fails here by the assertion, not by the throw.
    const result = await service.call(tool, given).catch((error: unknown) => ({ isError: true, structuredContent: { error: "thrown", message: String(error) } }));
    // The custody finding of state `unreadable` says so in its message.
    expect([result.isError, result.structuredContent["error"], String(result.structuredContent["message"])])
      .toEqual([true, "custody", expect.stringContaining("This server cannot say whether an earlier send under this key went.")]);
  }
  expect([posts, settlements]).toEqual(counted);
});

// Existing retained envelope and scripted room/settlement only. This tests
// install's custody consumer, not Git package preparation or native admission.
test("install_application returns its archived settlement on repeat without fetching or submitting again", async () => {
  const signer = fixedSigner(22), stand = new StandIn(signer.key, "admin", ["application.install"]), store = memoryStore();
  stand.scopes.get(stand.directory.scope)!.definition = TRUSTED_APPLICATION_COHORT.directory;
  stand.scopes.get(stand.rules.scope)!.definition = TRUSTED_APPLICATION_COHORT.rules;
  const args = { uri: `git+https://packages.test/apps.git/@${"c".repeat(40)}/application.dap.json`, release: head.hash, roles: [], values: {}, idempotencyKey: "retained-install" };
  const selected = readApplicationInstallOptions({ rules: stand.rules, uri: args.uri, release: args.release, roles: args.roles, values: args.values });
  const archived = { floor: 5, commit: "b".repeat(40), through: { seq: 6, hash: head.hash } };
  let posts = 0, settlements = 0, packages = 0;
  const service = new McpService({ service: SERVICE, signer, custody: store, now: () => Date.parse("2099-01-01T00:00:00Z"),
    config: { read: async () => stand.config(), addRoot: async () => { throw Error("must not grant a root"); } },
    applicationTrust: JSON.stringify([{ release: args.release, publisher: signer.key, host: "packages.test" }]),
    applicationFetch: async () => { packages++; throw Error("retained request must not rebuild a package"); },
    fetch: async (url, init) => {
      if (url.endsWith("/acts")) { posts++; throw new TransportError("scripted lost install reply"); }
      if (url.endsWith("/settle")) { settlements++; return Response.json({ ok: false, reason: "archived", archived }, { status: 410 }); }
      return stand.fetch(url, init);
    } });
  const identity = { service: SERVICE, membership: stand.membership, signer: signer.key, target: stand.rules, key: args.idempotencyKey };
  await service.custody.keep(identity, meaningOf(selected), async () => ({
    binding: { definition: "platform:rules", kind: "install-application", declaration: null, pinned: TRUSTED_APPLICATION_COHORT.rules },
    envelope: { signed: await signedIntent(signer, { to: stand.rules, kind: "install-application", fields: {}, expected: {} }, { idempotencyKey: args.idempotencyKey, now: Date.parse("2099-01-01T00:00:00Z") }), beside: {} },
  }), "2099-01-01T00:15:00Z");
  const original = (await service.custody.find(identity))!.envelope;
  await service.call("install_application", args);
  const settled = await service.call("settle", { target: stand.rules.scope, idempotencyKey: args.idempotencyKey });
  expect(settled.structuredContent["answer"]).toBe("archived");
  const repeated = (await service.call("install_application", args)).structuredContent;
  expect([repeated["answer"], repeated["phase"], repeated["archived"], repeated["retained"]]).toEqual(["archived", "archived", archived, true]);
  expect(repeated).not.toHaveProperty("fact"); expect(repeated).not.toHaveProperty("outboxIds");
  expect(String(repeated["sentence"])).not.toContain("accepted");
  expect((await service.custody.find(identity))!.envelope).toEqual(original);
  expect([posts, settlements, packages]).toEqual([1, 1, 0]);
});

// A kept install request and a stand-in room, as above. These cases test what a stop says after the scope's answer or a server failure.
// No native scope judges here, and no Git package is read except where a case says so.
function installOn(options: { store?: ReturnType<typeof memoryStore>; applicationFetch?: () => Promise<never>; trust?: () => string } = {}) {
  const signer = fixedSigner(23), stand = new StandIn(signer.key, "admin", ["application.install"]), store = options.store ?? memoryStore();
  const rules = stand.scopes.get(stand.rules.scope)!;
  stand.scopes.get(stand.directory.scope)!.definition = TRUSTED_APPLICATION_COHORT.directory;
  rules.definition = TRUSTED_APPLICATION_COHORT.rules;
  const args = { uri: `git+https://packages.test/apps.git/@${"c".repeat(40)}/application.dap.json`, release: head.hash, roles: [], values: {}, idempotencyKey: "install-1" };
  const selected = readApplicationInstallOptions({ rules: stand.rules, uri: args.uri, release: args.release, roles: args.roles, values: args.values });
  const trust = JSON.stringify([{ release: args.release, publisher: signer.key, host: "packages.test" }]);
  const seen = { posts: 0, entries: null as null | ((body: string) => Response) };
  const port = { service: SERVICE, signer, custody: store, now: () => Date.parse("2099-01-01T00:00:00Z"),
    config: { read: async () => stand.config(), addRoot: async () => { throw Error("must not grant a root"); } },
    get applicationTrust() { return options.trust ? options.trust() : trust; },
    applicationFetch: options.applicationFetch ?? (async () => { throw Error("a kept request must not read a package"); }),
    fetch: (async (url: string, init?: RequestInit) => {
      if (url.endsWith("/acts")) seen.posts++;
      const reply = await stand.fetch(url, init as never);
      if (seen.entries && new URL(url).pathname.includes("/entries/")) return seen.entries(await new Response(reply.body as never).text());
      return reply;
    }) as never };
  const service = new McpService(port);
  const identity = { service: SERVICE, membership: stand.membership, signer: signer.key, target: stand.rules, key: args.idempotencyKey };
  const keep = () => service.custody.keep(identity, meaningOf(selected), async () => ({
    binding: { definition: "platform:rules", kind: "install-application", declaration: null, pinned: TRUSTED_APPLICATION_COHORT.rules },
    envelope: { signed: await signedIntent(signer, { to: stand.rules, kind: "install-application", fields: {}, expected: {} }, { idempotencyKey: args.idempotencyKey, now: Date.parse("2099-01-01T00:00:00Z") }), beside: {} },
  }), "2099-01-01T00:15:00Z");
  const call = async () => (await service.call("install_application", args)).structuredContent as Record<string, unknown> & { error?: string; message?: string; next?: string };
  return { stand, rules, service, store, identity, keep, call, seen };
}
const REPORT = "A repeat stops at this check again and sends nothing, so report this message and the idempotencyKey. Do not use a new key, because a new key can make a second entry.";

describe("a stop after the scope accepted says what the person does next", () => {
  // Invariant: a failed check of what cannot change stops again on a repeat, with nothing sent, so its next step says to report it.
  test("an install whose acknowledgement does not match stops again on a repeat and says to report it", async () => {
    const at = installOn();
    await at.keep();
    at.stand.answers.set("install-application", signed => {
      const sealed = at.stand.append(at.rules, { type: "act", signed, authority: [], presented: {} } as never);
      return { answer: "accepted", receipt: { ...at.stand.receipt(at.rules, sealed), intent: `sha256:${"0".repeat(64)}` } } as never;
    });
    for (let call = 1; call <= 2; call++) {
      const said = await at.call();
      expect([said.error, said.message], JSON.stringify(said)).toEqual(["target", "The scope accepted this request, and the server could not check it: the install acknowledgement does not match the retained native request."]);
      expect(said.next).toBe(REPORT);
    }
    expect(at.seen.posts, "a repeat sends nothing").toBe(1);
  });

  // Invariant: a read that gave no entry can pass on a repeat, and an entry that does not hold the request cannot.
  test("an install's entry read says to call again, and an entry that does not hold the request says to report it", async () => {
    const at = installOn();
    await at.keep();
    at.seen.entries = () => Response.json({ ok: false, reason: "unavailable" });
    const unread = await at.call();
    expect([unread.error, unread.message], JSON.stringify(unread)).toEqual(["target", "The scope accepted this request, and the server could not check it: the read of the install receipt's native entry gave no entry."]);
    expect(unread.next).toMatch(/^Call again with the same idempotencyKey: nothing goes twice\. If the call stops here again, report this message/);
    at.seen.entries = body => { const read = JSON.parse(body) as { value: { hash: string } }; read.value.hash = `sha256:${"0".repeat(64)}`; return Response.json(read); };
    const other = await at.call();
    expect([other.error, other.message], JSON.stringify(other)).toEqual(["target", "The scope accepted this request, and the server could not check it: the install receipt's native entry does not hold the exact retained request."]);
    expect(other.next).toBe(REPORT);
    at.seen.entries = null;
    const kept = await at.call();
    expect([kept["answer"], kept["retained"]], JSON.stringify(kept)).toEqual(["accepted", true]);
    expect(at.seen.posts, "every repeat read the kept answer").toBe(1);
  });

  // Invariant: an accepted join whose entry names no inbox stops again on a repeat, with nothing sent. The stand-in's entry creates no inbox.
  test("an accepted join with no inbox stops again on a repeat and says to report it", async () => {
    const signer = fixedSigner(24), stand = new StandIn(signer.key);
    let posts = 0;
    const service = new McpService({ service: SERVICE, signer, custody: memoryStore(), now: () => Date.parse("2099-01-01T00:00:00Z"),
      config: { read: async () => ({ service: SERVICE }), addRoot: async () => { throw Error("must not grant a root"); } },
      fetch: (async (url: string, init?: RequestInit) => { if (url.endsWith("/acts")) posts++; return stand.fetch(url, init as never); }) as never });
    const { inbox: _inbox, ...repository } = stand.config().repository!;
    const link = INVITATION_LINK + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository, invitation: 1, secret: "s".repeat(43), handle: "@ann", definition: "platform:membership@2" })));
    for (let call = 1; call <= 2; call++) {
      const said = (await service.call("join", { link, idempotencyKey: "join-1" })).structuredContent;
      expect(said["error"], JSON.stringify(said)).toBe("target");
      expect(String(said["message"])).toMatch(/^The scope accepted this request, and the server could not check it: entry .+ creates no inbox\.$/);
      expect(said["next"]).toBe(REPORT);
    }
    expect(posts, "a repeat sends nothing").toBe(1);
  });
});

describe("install_application's stop says what this call did", () => {
  const NOTHING = "This call sent nothing.";
  // Invariant: a package that cannot be prepared leaves no record and no request, so "This call sent nothing" holds on both branches.
  test("a failed read of the package and a changed trust setting each send nothing, keep nothing and say so", async () => {
    const read = installOn({ applicationFetch: async () => { throw Error("no such host"); } });
    const unread = await read.call();
    expect([unread.error, unread.message], JSON.stringify(unread)).toEqual(["target", `Before signing, the server could not resolve the target: the exact Git package could not be prepared. ${NOTHING}`]);
    expect([read.seen.posts, read.store.records.size]).toEqual([0, 0]);

    // The first read of the setting passes, and custody's recheck before the build refuses it: ApplicationPackageError, inside the build.
    let reads = 0, trust = "";
    const changed = installOn({ trust: () => (reads++ === 0 ? trust : "[]") });
    trust = JSON.stringify([{ release: head.hash, publisher: changed.identity.signer, host: "packages.test" }]);
    const refused = await changed.call();
    expect([refused.error, refused.message], JSON.stringify(refused)).toEqual(["target", `Before signing, the server could not resolve the target: package bytes do not match the expected signed release or install bounds. ${NOTHING}`]);
    expect([changed.seen.posts, changed.store.records.size]).toEqual([0, 0]);
  });

  // Invariant: once a request left under the key, a server failure never reads as a call that sent nothing. This stand-in store fails to
  // release its lock after the send, as a failed unlink would, so the error reaches the install's catch with the outcome kept.
  test("a server failure after the request left says that it left, and settle gives the answer", async () => {
    const inner = memoryStore();
    let failing = false;
    const store = { ...inner, lock: async (id: string, notAfter: string) => {
      const release = await inner.lock(id, notAfter);
      return release && (async () => { await release(); if (failing) { failing = false; throw Error("the lock could not be released"); } });
    } } as typeof inner;
    const at = installOn({ store });
    await at.keep();
    failing = true;
    const said = await at.call();
    expect([said.error, said.message], JSON.stringify(said)).toEqual(["transport", `This server failed after a request under this key went to ${at.stand.rules.scope}, so this call has no answer to show. The envelope is under custody.`]);
    expect(said.next).toMatch(/^Call settle with the same idempotencyKey/);
    expect(at.seen.posts).toBe(1);
    const settled = (await at.service.call("settle", { target: at.stand.rules.scope, idempotencyKey: "install-1" })).structuredContent;
    expect(settled["answer"], JSON.stringify(settled)).toBe("accepted");
  });
});

describe("errors say who said what, from what the judge returned", () => {
  // Invariant: every refusal reason of the contract has a sentence that names the scope, the kind and the judged head, and a next step.
  test("every refusal, unavailable, mismatch and read reason has a sentence and a next step", () => {
    for (const reason of Object.keys(REFUSAL_REASONS) as RefusalReason[]) {
      const said = answered({ answer: "refused", reason, judgedAt: head }, asked, []);
      expect(said.sentence, reason).toMatch(/^sc_the_scope refused close-own, because .+, judged at head 41/);
      expect(said.next.length, reason).toBeGreaterThan(10);
    }
    for (const reason of Object.keys(UNAVAILABLE_NOTES) as UnavailableReason[]) {
      const said = answered({ answer: "unavailable", reason }, asked, []);
      expect(said.sentence).toBe(`sc_the_scope did not judge close-own (${reason}: ${UNAVAILABLE_NOTES[reason]}). Nothing is known to have been accepted; timed entries may have been written.`);
      expect(said.next).toMatch(/settle with the same idempotencyKey/);
    }
    for (const reason of Object.keys(MISMATCH_NOTES) as MismatchReason[]) expect(answered({ answer: "mismatch", reason }, asked, []).next).toMatch(/new idempotencyKey/);
    for (const reason of Object.keys(READ_REFUSALS) as ReadRefusal[]) expect(finding({ error: "read", scope: "sc_x", reason }).sentence).toMatch(new RegExp(`^sc_x did not answer the read: ${reason}`));
  });

  // Invariant: what the server found itself, before or beside the scope, is attributed to the server and says what was sent.
  test("the server's own findings are attributed to the server", () => {
    const findings: Finding[] = [
      { error: "shape", field: "fields.title", what: "is longer than 256 bytes", declared: "text" },
      { error: "stale-descriptor", scope: "sc_x", runs: "change sha256:1", tool: "change.propose-version@aa" },
      { error: "restart" }, { error: "transport", scope: "sc_x", submitted: true },
      { error: "custody", state: "full", key: "k", scope: "sc_x", keys: ["a", "b"] }, { error: "custody", state: "conflicting", key: "k", scope: "sc_x", recorded: "comment on sc_x" },
      { error: "custody", state: "locked", key: "k", scope: "sc_x" }, { error: "custody", state: "terminal", key: "k", scope: "sc_x" },
      { error: "original", why: "full", earlier: false, rowStays: false }, { error: "original", why: "no-reply", earlier: true, rowStays: true },
      { error: "credential", destination: "sc_g", why: "no outcome yet" }, { error: "diff", why: "missing-object: commit", spent: true }, { error: "target", what: "no lane 9" },
    ];
    for (const f of findings) {
      const said = finding(f);
      expect(said.sentence, f.error).toMatch(/server|nothing was sent|this call sent nothing|unknown|list again|nothing was returned/i);
      expect(said.next.length).toBeGreaterThan(5);
    }
    expect(finding(findings[4]!).sentence).toContain("The oldest unresolved keys: a, b.");
    expect(finding(findings[1]!).sentence).toContain("The tool for that target is change.propose-version@aa.");
    expect(finding({ error: "credential", destination: "sc_g", why: "x" }).next).toContain("repository.read-token");
  });

  // Invariant: a stop says what this call did, and only that. It never says that nothing was sent under the key, because an earlier
  // send under the key can have no known outcome.
  test("a stop's own words speak of this call, and name what custody holds under the key first", () => {
    const stops: Finding[] = [
      { error: "commons-missing" }, { error: "shape", field: "f", what: "x", declared: "y" }, { error: "stale-descriptor", scope: "sc_x", runs: "r", tool: null }, { error: "target", what: "x" },
      { error: "transport", scope: "sc_x", submitted: false }, ...(["conflicting", "full", "locked", "unreadable", "terminal", "too-large"] as const).map((state): Finding => ({ error: "custody", state, key: "k", scope: "sc_x" })),
    ];
    const NEW_KEY = "Do not use a new key until the scope has answered, because a new key can make a second entry.";
    for (const f of stops) {
      const said = finding(f);
      expect(`${said.sentence} ${said.next}`, f.error).not.toMatch(/nothing was (sent|submitted)/i);
      expect(said.sentence, f.error).toMatch(/this call (sent|submitted) nothing/i);
      const unknown = earlierSaid("unknown", said.error, said);
      expect(unknown.sentence.startsWith("An earlier send under this key has no known outcome. ")).toBe(true);
      expect(unknown.next, f.error).toContain(NEW_KEY);
      expect(unknown.next, f.error).not.toMatch(/use a new idempotencyKey/i);
      expect(unknown.next.split(NEW_KEY)).toHaveLength(2);
      const blind = earlierSaid("unreadable", said.error, said);
      expect(blind.sentence.startsWith("This server could not read its custody, so it cannot say whether an earlier send under this key went. ")).toBe(true);
      expect(blind.next.split(NEW_KEY)).toHaveLength(2);
      expect(earlierSaid("stepped", said.error, said)).toEqual({ sentence: `An earlier preparation step under this key went, and this request did not. ${said.sentence}`, next: said.next });
    }
    // A request the scope accepted: a lost read or a failed check after it never says that this call sent nothing.
    const accepted = (f: Finding) => {
      const said = finding(f);
      expect(said.sentence.startsWith("The scope accepted this request, and")).toBe(true);
      expect(said.sentence).not.toMatch(/nothing|Before signing/);
      return said.next;
    };
    expect(accepted({ error: "transport", scope: "sc_x", submitted: false, accepted: true })).toBe("Call again with the same idempotencyKey: the kept answer returns, and nothing goes twice.");
    expect(accepted({ error: "target", what: "entry 4 creates no inbox", sent: "report" })).toBe("A repeat stops at this check again and sends nothing, so report this message and the idempotencyKey. Do not use a new key, because a new key can make a second entry.");
    expect(accepted({ error: "target", what: "the read gave no entry", sent: "read" })).toBe("Call again with the same idempotencyKey: nothing goes twice. If the call stops here again, report this message and the key. Do not use a new key, because a new key can make a second entry.");
  });

  // Invariant: the words about an earlier send appear once in a stop, however many layers state them, and the next step does not grow.
  test.each([
    ["unknown", "An earlier send under this key has no known outcome."],
    ["unreadable", "This server could not read its custody, so it cannot say whether an earlier send under this key went."],
    ["stepped", "An earlier preparation step under this key went, and this request did not."],
  ] as const)("the words for an earlier send of kind %s appear once when two layers state them", (earlier, line) => {
    const base = finding({ error: "target", what: "x" });
    const once = earlierSaid(earlier, base.error, base);
    const twice = earlierSaid(earlier, base.error, once);
    expect(once.sentence.split(line)).toHaveLength(2);
    expect(twice).toEqual(once);
  });

  // Invariant: a tool the list no longer holds after a failed read points at settle while the key has an earlier send, and a stop after
  // a request left under the key never says that this call sent nothing.
  test("an unknown tool under a key with an earlier send points at settle", () => {
    const said = earlierSaid("unknown", "unknown-tool", finding({ error: "unknown-tool", name: "issue.comment" }));
    expect(said.sentence).toBe("An earlier send under this key has no known outcome. No tool is named issue.comment in this list.");
    expect(said.next).toBe("Call settle with this idempotencyKey, or repeat the first call's arguments under it. Do not use a new key until the scope has answered, because a new key can make a second entry.");
    const stopped = finding({ error: "transport", scope: "sc_x", submitted: true, stopped: true });
    expect(stopped.sentence).toBe("This server failed after a request under this key went to sc_x, so this call has no answer to show. The envelope is under custody.");
    expect(stopped.next).toMatch(/^Call settle with the same idempotencyKey/);
  });

  // Invariant: a refusal with no guard name attributes no guard: with two unnamed guards, the sentence says the scope does not say
  // which, and lists both sentences without choosing.
  test("an unnamed guard refusal attributes neither of two unnamed guards", () => {
    const act = { step: "transition" as const, on: "task", grant: "g", also: {}, fields: {}, guards: [{ state: ["open"] }, { unset: "owner" }], effects: [] };
    const definition: DefinitionLike = { name: "two", genesis: "x", items: {}, acts: { close: act } };
    const guards = guardSentences(definition, act, { pinned: "sha256:x" });
    const said = answered({ answer: "refused", reason: "guard-failed", judgedAt: head }, { scope: "sc_t", kind: "close" }, guards);
    expect(said.sentence).toBe("sc_t refused close, because one of its guards does not hold, judged at head 41; the scope does not say which. The act's guards are: this task is open; this task's owner is not set.");
    const named = answered({ answer: "refused", reason: "guard-failed", name: "nobody", judgedAt: head }, { scope: "sc_t", kind: "close" }, guards);
    expect(named.sentence).toContain("the guard named nobody; the act's declaration names no such guard");
  });

  // Invariant: the sentence reports the head the scope judged at, never a state read afterwards; and no output of any tool carries
  // the session token, the signing key or an invitation secret, while the read credential appears once in credential's explicit text.
  test("the judged head is reported, and secrets appear nowhere but the credential's field (STAND-IN scope service)", async () => {
    const secret = new Uint8Array(32).fill(9);
    const signer = secretSigner(secret);
    const service = new StandIn(signer.key);
    const room = service.config();
    const mcp = new McpService({ service: SERVICE, fetch: service.fetch, signer, config: { read: async () => room, addRoot: async () => {} }, custody: memoryStore(), now: () => Date.parse("2099-01-01T00:00:00Z"), pause: async () => {} });
    const tools = await mcp.page();
    const outputs: string[] = [JSON.stringify(tools)];
    const byTool: [string, string][] = [];
    const call = async (name: string, args: Record<string, unknown>) => { const result = await mcp.call(name, args); outputs.push(JSON.stringify(result)); byTool.push([`${name} ${JSON.stringify(args)}`, JSON.stringify(result)]); return result; };

    // The scope judges set-role at head 1 and refuses it; then its state moves on. The sentence keeps the judged head.
    service.answers.set("set-role", () => ({ answer: "refused", reason: "guard-failed", name: "last-admin", judgedAt: { seq: 1, hash: `sha256:${"d".repeat(64)}` } }) as Answer);
    const refused = await call("member.role", { on: 1, fields: { role: "member" }, idempotencyKey: "role-1" });
    service.activate({ format: "artroom-definition-1", name: "later", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "g", items: {}, acts: {}, receives: {}, timed: {}, rules: {} } as unknown as DeclaredDefinition);
    expect(refused.structuredContent["sentence"]).toMatch(/refused set-role, because this does not hold: one of: .+ \(last-admin\), judged at head 1\.$/);

    // An invitation secret, given as a join act's field: the act's answer does not echo it.
    const invitationSecret = "INVITATION-SECRET-one-time";
    await call("room.join", { fields: { invitation: 5, secret: invitationSecret }, idempotencyKey: "join-1" });
    // A read token, and the credential, once.
    const token = await call("repository.read-token", { on: 0, fields: { hours: 1 }, idempotencyKey: "token-1" });
    const seq = (token.structuredContent["fact"] as { seq: number }).seq;
    const credential = await call("credential", { entry: seq });
    expect(credential.isError).toBe(false);
    expect(credential.structuredContent).toEqual({ remote: expect.stringMatching(/^https:/), ends: expect.any(String), entry: seq });
    expect(JSON.stringify(credential.structuredContent)).not.toContain(READ_CREDENTIAL);
    expect(credential.content).toEqual([{ type: "text", text: expect.any(String) }]);
    expect(JSON.parse(credential.content[0]!.text)).toEqual({ credential: READ_CREDENTIAL, ...credential.structuredContent });
    for (const scope of ["directory", "membership", "rules", "destination"]) {
      await call("inspect", { scope }); await call("steps", { scope }); await call("record", { scope: scope === "destination" ? "rules" : scope }); await call("sends", { scope }); await call("actions", { scope });
      await call("items", { scope, type: "member" }); await call("wait", { scope, seconds: 1 });
    }
    await call("room", {}); await call("step", { scope: "destination", seq }); await call("settle", { target: "destination", idempotencyKey: "token-1" });
    await call("inspect", { scope: "membership", describe: "join" }); await call("text", { scope: "rules", kind: "text", digest: `sha256:${"0".repeat(64)}` });
    const everything = outputs.join("\n");
    expect(everything).not.toContain(SESSION_TOKEN);
    expect(everything).not.toContain(b64url(secret));
    // The explicitly requested credential appears once, in text, and nowhere in structured content or another tool.
    expect(everything.split(READ_CREDENTIAL).length - 1).toBe(1);
    expect(credential.content[0]!.text).toContain(READ_CREDENTIAL);
    // The invitation secret is in no output but a read of the scope's own record of the join entry: membership keeps the signed
    // intent, secret and all, and record returns it as stored. No sentence, answer or other read carries it.
    expect(byTool.filter(([, out]) => out.includes(invitationSecret)).map(([asked]) => asked)).toEqual(['record {"scope":"membership"}']);
  });
});

// Invariant: invitation URL refusals happen before signing, transport, config or custody writes.
test("join validates its service before signing or changing an empty configuration (STAND-IN transport)", async () => {
  const real = fixedSigner(19);
  const standIn = new StandIn(real.key);
  const repository = standIn.config().repository!;
  const { inbox: _inbox, ...shared } = repository;
  const link = (service: string) => "artroom-invite:" + b64url(utf8(JSON.stringify({ v: 1, service, repository: shared, invitation: 5, secret: "SCRIPTED invitation secret for URL boundary", handle: "@helper", definition: "platform:membership@2" })));
  const invalid = ["not a URL", "http://scopes.test", "http://localhost:7781", "http://127.example.test", "https://user:pass@scopes.test", "https://scopes.test?x=1", "https://scopes.test#x", "https://scopes.test?", "https://scopes.test#"];
  let signed = 0, fetched = 0, configReads = 0, configWrites = 0, custodyWrites = 0;
  const custody = memoryStore();
  const write = custody.write.bind(custody);
  custody.write = async (id, record) => { custodyWrites++; await write(id, record); };
  const empty = { service: "", roots: [] };
  const mcp = new McpService({ service: "", signer: { key: real.key, sign: bytes => { signed++; return real.sign(bytes); } }, fetch: (url, init) => { fetched++; return standIn.fetch(url, init); }, config: { read: async () => { configReads++; return empty; }, addRoot: async () => { configWrites++; throw Error("Unexpected root write"); }, joined: async () => { configWrites++; } }, custody, now: () => Date.parse("2099-01-01T00:00:00Z") });
  for (const service of invalid) {
    const answer = await mcp.call("join", { link: link(service), idempotencyKey: "invalid-join" });
    expect(answer.isError, service).toBe(true);
    expect(answer.structuredContent, service).toMatchObject({ error: "shape", message: expect.stringContaining("link"), next: expect.any(String) });
  }
  // Direct McpService.call also returns a shape finding for unusable private proof input; it must never throw or touch custody.
  const seed = b64url(new Uint8Array(32));
  for (const secret of ["not-a-seed", b64url(new Uint8Array(31)), seed.slice(0, -1) + "B", seed + "="]) {
    const malformed = "artroom-invite:" + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository: shared, invitation: 5, secret, handle: "@helper", definition: "platform:membership@6" })));
    expect(await mcp.call("join", { link: malformed, idempotencyKey: "invalid-seed" })).toMatchObject({ isError: true, structuredContent: { error: "shape" } });
  }
  expect([signed, fetched, configReads, configWrites, custodyWrites]).toEqual([0, 0, 0, 0, 0]);
  expect(empty).toEqual({ service: "", roots: [] });
  // Each accepted form passes the real signing boundary once. A scripted native refusal stops before enrollment reads.
  standIn.answers.set("join", () => ({ answer: "refused", reason: "guard-failed", judgedAt: { seq: 0, hash: `sha256:${"c".repeat(64)}` } }));
  for (const [i, service] of ["https://scopes.test", "https://scopes.test/base/", "https://scopes.test:8443", "http://127.0.0.1:7781", "http://127.2.3.4", "http://[::1]:7781"].entries()) {
    const client = new McpService({ service: "", signer: { key: real.key, sign: bytes => { signed++; return real.sign(bytes); } }, fetch: (url, init) => { fetched++; return standIn.fetch(url.replace("/base/v1/", "/v1/"), init); }, config: { read: async () => empty, addRoot: async () => { configWrites++; throw Error("Unexpected root write"); }, joined: async () => { configWrites++; } }, custody: memoryStore(), now: () => Date.parse("2099-01-01T00:00:00Z") });
    const answer = await client.call("join", { link: link(service), idempotencyKey: `permitted-${i}` });
    expect(answer.isError, service).toBe(false);
    expect(answer.structuredContent, service).toMatchObject({ answer: "refused", reason: "guard-failed" });
  }
  expect([signed, fetched, configWrites]).toEqual([6, 6, 0]);
  // The same five encoding rows use the actual configured MCP join entry.
  // A scripted native refusal proves one submission, never membership acceptance.
  for (const row of PERSON_INVITATION_CASES) {
    if (row.surface !== "all") continue;
    let posts = 0, signatures = 0, writes = 0;
    const held = memoryStore(), write = held.write.bind(held);
    held.write = async (id, record) => { writes++; await write(id, record); };
    const actual = new McpService({ service: PERSON_SERVICE,
      signer: { key: real.key, sign: bytes => { signatures++; return real.sign(bytes); } },
      custody: held, now: () => Date.parse("2099-01-01T00:00:00Z"),
      config: { read: async () => ({ service: PERSON_SERVICE }), addRoot: async () => { throw Error("No root write"); } },
      fetch: async (url, init) => {
        posts++;
        expect(url, row.name).toBe(`${PERSON_SERVICE}/v1/scopes/${PERSON_INVITATION.repository.membership.scope}/acts`);
        expect(init?.method, row.name).toBe("POST");
        const signed = JSON.parse(init!.body!).signed;
        expect([signed.intent.to, signed.intent.kind, signed.intent.fields], row.name).toEqual([
          PERSON_INVITATION.repository.membership, "join", { invitation: 5, secret: PERSON_INVITATION.secret },
        ]);
        return Response.json({ answer: "refused", reason: "guard-failed", judgedAt: { seq: 0, hash: `sha256:${"c".repeat(64)}` } });
      },
    });
    const answer = await actual.call("join", { link: row.text, idempotencyKey: "TEST-person-parity" });
    expect(posts === 1, row.name).toBe(row.admitted);
    if (row.admitted) {
      expect(answer.structuredContent, row.name).toMatchObject({ answer: "refused", reason: "guard-failed" });
      expect(signatures, row.name).toBe(1);
      expect(writes, row.name).toBeGreaterThan(0);
    } else {
      expect(answer.isError, row.name).toBe(true);
      expect([signatures, writes], row.name).toEqual([0, 0]);
      expect(held.records.size, row.name).toBe(0);
    }
  }
});

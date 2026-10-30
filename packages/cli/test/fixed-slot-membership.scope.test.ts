/** Real Native creation, Membership authority, SQLite, member sessions and CLI
 * replay. Clock, local client custody, inspector setup reads and the finite
 * scheduler are TEST fixtures. No provider, physical celld or load claim. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { HISTORY_PAGE_ENTRIES, type FactRef, type ScopeId } from "@generalbusiness/dap-contract";
import { b64url, factRefOf, isReceipt, isRecord, isScopeId, isSeed, LATE, same, scopeIdOf, timeOf, within } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent, type Fetch } from "@generalbusiness/dap-client";
import { UNPUBLISHED_COHORT as C } from "@generalbusiness/dap-platform";
import { SCOPE_INDEX_NAME } from "../../scope/src/scope-index.ts";
import { route } from "../../scope/src/worker.ts";
import { net, ScriptedClock } from "../../scope/src/testing.ts";
import { TEST_DEPLOYMENT } from "../../scope/test/worker.ts";
import { reader } from "../../scope/test/support.ts";
import { beginSessionFixture } from "../../scope/test/session-settings.ts";
import { driveFixture, nativeFixtureLifetime } from "../../scope/test/support/native-fixture-lifetime.ts";
import { StartupOwner } from "../../scope/test/support/serving-startup.ts";
import { command, memoryStore, VERIFY_LIMITS, type Context, type Outcome, type VerifyLimits } from "../src/index.ts";

const SERVICE = "https://fixed-slot.test";
const MEMBER_COUNT = 2000;
const MAX_SCOPES = MEMBER_COUNT + 6;
const CALLBACK_BATCH = 128;
const MAX_CALLBACKS = 131_072;
const MAX_ACTIONS = 1_000_000;
const WHOLE_MILLISECONDS = 1_800_000;
// Ruling 841661d0: the three default verifications are acceptance. One --all
// measurement reports completion or its honest boundary under explicit limits.
const MEASUREMENT_LIMITS: VerifyLimits = { milliseconds: 120_000, bytes: 268_435_456, requests: 100_000, entries: 100_000 };

const ok = (answer: Outcome): Outcome => {
  expect(answer.code, answer.lines.join("\n")).toBe(0);
  return answer;
};

test("a real 2000-member room keeps handle uniqueness and default replay; one bounded whole-room replay measures its boundary", async context => {
  const previousClock = net.clock, clock = new ScriptedClock(timeOf(Date.now()));
  const indexId = env.SCOPE_INDEX.idFromName(`fixed-slot-room-${crypto.randomUUID()}`);
  const indexBinding = new Proxy(env.SCOPE_INDEX, { get(target, property) {
    if (property === "idFromName") return (name: string) => name === SCOPE_INDEX_NAME ? indexId : target.idFromName(name);
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const owner = new StartupOwner(indexBinding);
  net.clock = clock;
  const life = nativeFixtureLifetime(beginSessionFixture({
    secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader,
  }), { finish: "external" });
  // StartupOwner's attached-view join is bounded to 256 scopes. This story
  // uses its request/index lease without attach and owns all callback joins
  // explicitly below, in batches no larger than 128, before releasing life.
  const tracked = new Map<ScopeId, ReturnType<typeof life.platform>>();
  const arriving = new Set<ScopeId>();
  const inboxes = new Set<ScopeId>(), sessionHistories = new Set<ScopeId>();
  let actions = 0, callbacks = 0, callbackBatches = 0, addActs = 0;
  const wait = <T>(action: () => Promise<T>): Promise<T> => {
    if (++actions > MAX_ACTIONS) throw Error("Fixed-slot witness action budget exhausted; ownership retained");
    return owner.wait(() => life.wait(action));
  };
  const track = (name: ScopeId) => {
    let node = tracked.get(name);
    if (!node) {
      if (tracked.size === MAX_SCOPES) throw Error("Fixed-slot witness exceeded its actual-scope bound");
      node = life.platform(name); tracked.set(name, node); arriving.add(name);
    }
    return node;
  };
  life.setHold(envelope => {
    if (isSeed(envelope.to)) {
      const name = scopeIdOf(envelope.to);
      track(name);
      if (envelope.to.kind === "inbox") inboxes.add(name);
    }
    return false; // Observe the real create target; never suppress or acknowledge it.
  });
  type Node = ReturnType<typeof track>;
  const join = async (nodes: readonly Node[]): Promise<number> => {
    if (nodes.length > CALLBACK_BATCH || new Set(nodes.map(node => node.name)).size !== nodes.length)
      throw Error("Fixed-slot callback batch is oversized or duplicated");
    if (++callbackBatches > 100_000) throw Error("Fixed-slot callback batch budget exhausted");
    const counts = await Promise.all(nodes.map(node => wait(() =>
      (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks())));
    let joined = 0;
    for (const count of counts) {
      if (!Number.isSafeInteger(count.callbacks) || count.callbacks < 0) throw Error("Invalid fixed-slot callback count");
      joined += count.callbacks; callbacks += count.callbacks;
      if (callbacks > MAX_CALLBACKS) throw Error("Fixed-slot callback budget exhausted; ownership retained");
    }
    return joined;
  };
  const joinAll = async (): Promise<void> => {
    // finish() first stops new roots and joins its actual request frontier.
    // Enumerate each tracked owner exactly once per pass; arrivals or joined
    // callbacks require another complete pass. No effect pump or clock advance.
    for (let pass = 0; pass < 64; pass++) {
      const nodes = [...tracked.values()], visited = new Set<ScopeId>();
      let joined = 0;
      for (let start = 0; start < nodes.length; start += CALLBACK_BATCH) {
        const batch = nodes.slice(start, start + CALLBACK_BATCH);
        for (const node of batch) {
          if (visited.has(node.name)) throw Error("Fixed-slot retirement duplicated a native owner");
          visited.add(node.name);
        }
        joined += await join(batch);
      }
      if (visited.size !== nodes.length) throw Error("Fixed-slot retirement omitted a native owner");
      if (!joined && tracked.size === nodes.length) return;
    }
    throw Error("Fixed-slot callback retirement incomplete; ownership retained");
  };
  owner.closeWith(joinAll);
  const stateOf = (node: Node) => wait(() => runInDurableObject(node.object, async (_instance, state) => {
    const scope = state.storage.sql.exec<{ status: string; kind: string; head: number; held: number }>(`SELECT
      json_extract(v,'$.status') AS status,json_extract(v,'$.at.kind') AS kind,
      json_extract(v,'$.head.seq') AS head,json_array_length(v,'$.held') AS held FROM meta WHERE k='scope'`).toArray()[0];
    const outbox = state.storage.sql.exec<{ pending: number; held: number; requests: number; next: number | null }>(`SELECT
      count(CASE WHEN held=0 AND ack IS NULL AND result IS NULL AND diagnosis IS NULL THEN 1 END) AS pending,
      count(CASE WHEN held<>0 THEN 1 END) AS held,
      count(CASE WHEN request IS NOT NULL AND result IS NULL AND diagnosis IS NULL THEN 1 END) AS requests,
      min(CASE WHEN held=0 AND ack IS NULL AND result IS NULL AND diagnosis IS NULL THEN next END) AS next FROM outbox`).one();
    return { scope, outbox, alarm: await state.storage.getAlarm() };
  }));
  const settle = async (selected: readonly ScopeId[] = []): Promise<void> => {
    const began = life.now(); let retries = 0;
    for (let round = 0; round < 64; round++) {
      const names = new Set([...selected, ...arriving]), nodes = [...names].map(track);
      if (nodes.length > CALLBACK_BATCH) throw Error("Fixed-slot creation batch exceeded 128 scopes");
      const before = await join(nodes);
      await driveFixture(nodes, wait);
      const after = await join(nodes);
      if ([...arriving].some(name => !names.has(name))) continue;
      const states = await Promise.all(nodes.map(stateOf));
      if (!before && !after && states.every(row => row.scope?.status === "active" && row.scope.held === 0
        && row.outbox.pending === 0 && row.outbox.held === 0 && row.outbox.requests === 0)) {
        for (const name of names) arriving.delete(name);
        return;
      }
      const next = states.flatMap(row => row.outbox.next !== null && row.outbox.next > life.now()
        && row.alarm === row.outbox.next ? [row.outbox.next] : []).sort((a, b) => a - b)[0];
      if (next === undefined) continue;
      if (retries++ === 3 || next - began > 8000) throw Error("Fixed-slot actual creation confirmation exceeded its retry budget");
      life.advance(next - life.now()); // Only an actual retained send's next attempt.
    }
    throw Error("Fixed-slot actual creation did not settle inside 64 rounds");
  };
  let register: ScopeId | undefined, membership: ScopeId | undefined, measuring = false;
  let lastAct: { status: number; body: unknown } | undefined;
  type HTTPObservation = { method: string; path: string; cursor: string | null; status: number; resolvedBy: 200 | null };
  const httpObservations: HTTPObservation[] = [], unresolvedHTTP = new Map<string, HTTPObservation[]>();
  const measurementRequests = new Set<Promise<Awaited<ReturnType<Fetch>>>>();
  const fetch: Fetch = (url, init) => {
    const observed = measuring;
    if (observed && measurementRequests.size === 128) throw Error("Whole-room measurement pending request bound exceeded");
    const task = (async () => {
      const { redirect: _redirect, credentials: _credentials, ...wire } = init as typeof init & { redirect?: string; credentials?: string };
      const response = await wait(() => route(new Request(url, { ...wire, redirect: "manual" }), env.PLATFORM,
        { ...(register ? { REGISTER_SCOPE: register } : {}), SCOPE_INDEX: indexBinding, DEPLOYMENT: TEST_DEPLOYMENT }));
      if (observed) {
        const parsed = new URL(url), method = (init?.method ?? "GET").toUpperCase(), path = parsed.pathname, cursor = parsed.searchParams.get("cursor");
        if (path.length > 2048 || method.length > 8 || cursor !== null && !/^\d{1,16}$/.test(cursor))
          throw Error("Whole-room measurement encountered an unexpected public request key");
        const key = JSON.stringify([method, path, cursor]);
        if (response.status >= 400) {
          if (httpObservations.length === 4096) throw Error("Whole-room measurement HTTP observation bound exceeded");
          const observation: HTTPObservation = { method, path, cursor, status: response.status, resolvedBy: null };
          httpObservations.push(observation);
          const pending = unresolvedHTTP.get(key) ?? [];
          pending.push(observation); unresolvedHTTP.set(key, pending);
        } else if (response.status === 200) {
          for (const pending of unresolvedHTTP.get(key) ?? []) pending.resolvedBy = 200;
          unresolvedHTTP.delete(key);
        }
      }
      const history = /^\/v1\/scopes\/(sc_[a-z2-7]+)\/(?:history|log)$/.exec(new URL(url).pathname);
      const known = history?.[1];
      if (known && isScopeId(known) && tracked.has(known) && response.status === 200
        && new Headers(init?.headers).get("authorization")?.startsWith("Session ")) {
        sessionHistories.add(known);
      }
      if (membership && init?.method === "POST" && new URL(url).pathname === `/v1/scopes/${membership}/acts`)
        lastAct = { status: response.status, body: await response.clone().json() };
      // Keep native body/status; Workerd does not implement Node redirect:error.
      return { status: response.status, body: response.body };
    })();
    if (observed) {
      measurementRequests.add(task);
      void task.then(() => measurementRequests.delete(task), () => measurementRequests.delete(task));
    }
    return task;
  };
  const admin: Context = { store: memoryStore(), fetch, now: life.now,
    trustedCreationService: { service: SERVICE, fetch }, pause: async waiting => { for (const name of waiting) track(name); await settle(waiting); },
  };
  const run = (argv: readonly string[]) => command(admin, argv);
  const acceptedFact = (): FactRef => {
    if (lastAct?.status !== 200 || !isRecord(lastAct.body) || lastAct.body["answer"] !== "accepted" || !isReceipt(lastAct.body["receipt"]))
      throw Error("Fixed-slot CLI add has no actual accepted native receipt");
    return lastAct.body["receipt"].fact;
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([owner.run(async () => {
      ok(await run(["install", "--plan", SERVICE, "--host", "none"]));
      const plan = (await admin.store.config())?.plan;
      if (!plan || plan.definition !== C.register) throw Error("Fixed-slot room has no maintained host-none plan");
      register = plan.register; track(register);
      ok(await run(["install", "--planned"]));
      ok(await run(["create", "TEST fixed-slot room", "--handle", "@fixed-owner"]));
      const config = await admin.store.config(), repository = config?.repository;
      if (!config || !repository) throw Error("Fixed-slot CLI has no genuinely created room");
      const M = track(repository.membership.scope); membership = M.name;
      for (const name of [repository.directory.scope, repository.rules, repository.destination, repository.inbox]) if (name) track(name);
      await settle([...tracked.keys()]);
      const seed = await admin.store.secret(config.key);
      if (!seed || seed.length !== 32) throw Error("Fixed-slot CLI did not retain its owned TEST signer");
      const signer = secretSigner(seed), at = repository.membership;
      const inboxOf = async (fact: FactRef): Promise<Node> => {
        const read = await wait(() => M.stub.entry(reader, fact.seq));
        if (!read.ok || !same(factRefOf(read.value.entry), fact)) throw Error("Fixed-slot source entry does not match the accepted receipt");
        const creates = read.value.entry.sends.filter(send => isSeed(send.to) && send.to.kind === "inbox");
        const target = creates[0]?.to;
        if (creates.length !== 1 || !isSeed(target) || !same(target.creator, at)) throw Error("Fixed-slot add has no exact actual Inbox create seed");
        return track(scopeIdOf(target));
      };
      const before = await wait(() => M.summary());
      const foreign = await signedIntent(secretSigner(crypto.getRandomValues(new Uint8Array(32))), {
        to: at, kind: "add-member", fields: { handle: "@fixed-unauthorized", kind: "checker" },
      }, { now: life.now() });
      addActs++;
      expect(await wait(() => M.stub.submit(foreign, []))).toMatchObject({ answer: "refused", reason: "unauthorized" });
      expect((await wait(() => M.summary())).at).toEqual(before.at);
      for (let ordinal = 1; ordinal < MEMBER_COUNT; ordinal++) {
        const signed = await signedIntent(signer, { to: at, kind: "add-member",
          fields: { handle: `@fixed-member-${ordinal}`, kind: "checker" } }, { now: life.now() });
        if (++addActs > MEMBER_COUNT + 2) throw Error("Fixed-slot add-member act budget exceeded");
        const answer = await wait(() => M.stub.submit(signed, []));
        if (answer.answer !== "accepted") throw Error(`Fixed-slot real member ${ordinal} did not receive an accepted receipt`);
        const inbox = await inboxOf(answer.receipt.fact);
        await settle([M.name, inbox.name]);
      }
      const count = async () => {
        const summary = await wait(() => M.summary());
        expect(summary.complete).toBe(true);
        return summary.value.counts.find(([type, state]) => type === "member" && state === "active")?.[2];
      };
      expect(await count()).toBe(MEMBER_COUNT);
      await wait(() => M.restart());
      addActs++;
      ok(await run(["act", "add-member", "--on", M.name, "--set", "handle=@fixed-fresh", "--set", "kind=checker"]));
      const freshFact = acceptedFact();
      // The accepted source lies beyond page one. Exact entry/hash matching
      // must survive here; Platform.created(seq)'s page-one helper cannot.
      expect(freshFact.seq).toBeGreaterThan(HISTORY_PAGE_ENTRIES);
      const fresh = await inboxOf(freshFact); await settle([M.name, fresh.name]);
      expect(await count()).toBe(MEMBER_COUNT + 1);
      const unchanged = (await wait(() => M.summary())).at, owned = tracked.size;
      addActs++;
      const refused = await run(["act", "add-member", "--on", M.name, "--set", `handle=@fixed-member-${MEMBER_COUNT - 1}`, "--set", "kind=checker"]);
      expect(refused.code).toBe(1);
      expect(lastAct).toMatchObject({ status: 422, body: { answer: "refused", reason: "guard-failed", name: "handle-in-use" } });
      expect(refused.lines.join("\n")).not.toContain("guard-incomplete");
      expect((await wait(() => M.summary())).at).toEqual(unchanged);
      expect(tracked.size).toBe(owned); expect(owned).toBe(MAX_SCOPES);
      expect(addActs).toBe(MEMBER_COUNT + 2);
      expect(inboxes.size).toBe(MEMBER_COUNT + 1);
      const acceptance: { scope: ScopeId; outcome: Outcome }[] = [];
      // No Context.verify override: every command uses shipped defaults.
      for (const scope of [M.name, register, repository.directory.scope]) {
        const outcome = ok(await run(["verify", scope]));
        expect(outcome.lines[0]).toBe("Result: consistent, for the mode, target, coverage and trusts stated below.");
        expect(outcome.lines.some(line => line.startsWith("Target:") && line.includes(scope))).toBe(true);
        acceptance.push({ scope, outcome });
      }
      let progressCount = 0, lastProgress: string | null = null, discoveryCompleted = false;
      sessionHistories.clear(); // Measure actual reads from this --all call only.
      measuring = true;
      const measured = await command({ ...admin, verify: { limits: MEASUREMENT_LIMITS, progress: line => {
        if (++progressCount > 20_000) throw Error("Whole-room measurement progress bound exceeded");
        lastProgress = line;
        if (line.startsWith("Verify replay:")) discoveryCompleted = true;
      } } }, ["verify", "--all"]); // Exactly once; no replacement measurement.
      measuring = false;
      // A logical budget stop may precede an owned response. Join the actual
      // request frontier before classifying recovered versus unresolved HTTP.
      const retired = await within(5, async () => {
        for (let round = 0; measurementRequests.size && round < 64; round++) await Promise.allSettled([...measurementRequests]);
        return measurementRequests.size === 0;
      });
      if (retired === LATE || !retired) throw Error("Whole-room measurement responses remain unjoined; ownership retained");
      const unresolved = [...unresolvedHTTP.values()].flat();
      const measurement = { limits: MEASUREMENT_LIMITS, outcome: measured, progressCount, lastProgress,
        discovery: discoveryCompleted ? "completed" : "not established",
        observedInboxSessionHistories: [...inboxes].filter(name => sessionHistories.has(name)).length,
        httpObservations, unresolvedHTTP: unresolved };
      const retained = JSON.stringify(measurement);
      if (retained.length > 2_000_000) throw Error("Whole-room measurement public output bound exceeded");
      // JSON preserves the actual Outcome without inspect's array truncation.
      // These are CLI reports/counters, never request bodies or credentials.
      console.info("fixed-slot-room-measurement-v1", retained);
      Object.assign(context.task.meta, { fixedSlotRoomMeasurement: measurement });
      expect(unresolved, "Whole-room budget exhaustion must not hide an unresolved HTTP refusal").toEqual([]);
      const reports = measured.lines.filter(line => /^[a-z]+ sc_[a-z2-7]+, entry \d+: consistent\.$/.test(line));
      let boundary: string | null = null;
      if (measured.code === 0) {
        expect(reports).toHaveLength(tracked.size);
        expect(new Set(reports.map(line => line.split(" ")[1]!.replace(/,$/, "")))).toEqual(new Set(tracked.keys()));
        expect(measured.lines.at(-1)).toBe(`All consistent: ${tracked.size} scopes.`);
        discoveryCompleted = true;
      } else {
        expect(measured.code).toBe(1);
        expect(measured.lines).toHaveLength(1);
        boundary = measured.lines[0]!;
        const stopped = /^Stopped at (session|discovery|replay|cleanup), scope (configuration|sc_[a-z2-7]+), input cursor (null|"[^"]*"|\d+): verification (time|bytes|requests|entries) limit; (\d+) elapsed ms, (\d+) received bytes, (\d+) HTTP attempts, (\d+) history entries\. The whole room was not verified\.$/.exec(boundary);
        expect(stopped, "A mismatch, authority refusal or non-budget failure is not a measurement boundary").not.toBeNull();
        if (!stopped) throw Error("Whole-room measurement failed without an actual budget boundary");
        expect(stopped[2] === "configuration" || [...tracked.keys()].some(scope => scope === stopped[2])).toBe(true);
        expect(stopped.slice(5).map(Number).every(value => Number.isSafeInteger(value) && value >= 0)).toBe(true);
      }
      if (discoveryCompleted) expect([...inboxes].filter(name => !sessionHistories.has(name))).toEqual([]);
      // Join the entire set inside the whole-work budget first.
      // finish still performs its own full batched pass and joins arrivals;
      // this does not assume its independent 7.5 s cap has been measured.
      await joinAll();
      Object.assign(context.task.meta, { fixedSlotMembership: { membersBeforeFresh: MEMBER_COUNT, membersAfterFresh: MEMBER_COUNT + 1,
        actualScopes: tracked.size, actualAddMemberActs: addActs, shippedVerificationLimits: VERIFY_LIMITS, acceptance,
        wholeRoomMeasurement: { limits: MEASUREMENT_LIMITS, outcome: measured, progressCount, lastProgress, boundary,
          discovery: discoveryCompleted ? "completed" : "not established", observedInboxSessionHistories: [...inboxes].filter(name => sessionHistories.has(name)).length,
          consistentReportsReturned: reports.length, coverage: measured.code === 0 ? "all actual scopes consistent" : "unknown beyond observations; unreturned partial reports do not prove coverage" },
        qualification: "Real Native room/authority/Inbox creation, SQLite restart and three default CLI replays. One explicit-budget whole-room replay is measurement only; TEST clock/local custody/setup reader/finite scheduler. No default --all completion claim, physical celld, load or cancellation/drain claim." } });
    }), new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(Error("Fixed-slot witness lifetime exceeded; in-flight Native work is not cancelled")), WHOLE_MILLISECONDS);
    })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    // finish has a separate finite 7.5 s join. A failure leaves the session,
    // index and clock owned; do not close custody beneath a continuation.
    await owner.finish();
    life.release();
    if (net.clock !== clock) throw Error("Fixed-slot clock ownership changed before release");
    net.clock = previousClock;
  }
}, WHOLE_MILLISECONDS + 20_000);

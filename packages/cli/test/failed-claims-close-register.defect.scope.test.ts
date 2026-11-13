/**
 * DEFECT RECORD, request c19f25da. These tests retain the historical pins' behaviour. The failed-claim cohort has a separate repair witness.
 *
 * On these retained pins, a claim whose three create attempts failed stays `pending`, and it counts toward `claim.max`, which is 64. So 64 such claims
 * make the register refuse every later `found` with `type-full`, and nothing here frees a place, including the host's return.
 *
 * Real: the CLI's `command`, `McpService` in its two cases, the Worker's HTTP routes and the public creation offer route, the deployed scope class with the production
 * authority and each pin's own rules, the journal, the operations driver, and the production wiring `artifactsOutside` and
 * `gitHubOutside` with their `RegisterProvider`s.
 * STAND-INS: the Artifacts binding and the GitHub `fetch` are scripted, so no host runs. The clock is scripted. `pause` and the fixture
 * drivers stand for the alarm. Each scripted failure is the shape that the provider's code handles, and no real outage was observed.
 * The code INTERNAL_ERROR stands for any code outside the provider's `REFUSED_UNCHANGED`. The creation policy of the test Worker admits every pin.
 *
 * To see the words, run: npx vitest run --project scope failed-claims-close-register --reporter=default --silent=false
 */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { b64url, canonicalize, intentDigest, isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Answer, Entry, Intent, KeyId, PlatformDefinition, Read, ScopeId } from "@generalbusiness/dap-contract";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import type { Item } from "@generalbusiness/dap-derive";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as DEMO, ARCHIVE_DEVICE_PUBLICATION_COHORT as RETAINED, FAILED_CLAIM_COHORT, platform } from "@generalbusiness/dap-platform";
import { demoCreationRoute } from "../../../apps/room/demo-creation.ts";
import type { ArtifactsNamespace } from "../../scope/src/artifacts-host.ts";
import { artifactsOutside } from "../../scope/src/artifacts-wiring.ts";
import { net } from "../../scope/src/testing.ts";
import type { Sealed } from "../../scope/src/index.ts";
import { CREATION_COHORTS } from "../../scope/src/creation-lineage.ts";
import { gitHubOutside } from "../../scope/src/github-wiring.ts";
import type { Binding } from "../../scope/src/namespace.ts";
import { dispatchFixture, driveFixture, effectFixture, nativeFixtureLifetime } from "../../scope/test/support/native-fixture-lifetime.ts";
import { rita, routed, sam, una, vic } from "../../scope/test/repository.ts";
import { beginSessionFixture } from "../../scope/test/session-settings.ts";
import { reader as inspector } from "../../scope/test/support.ts";
import { soon } from "../../scope/test/net.ts";
import { checkClaim, command, memoryStore, type Context } from "../src/index.ts";
import { McpService, memoryStore as mcpCustody, type McpConfig } from "../../mcp/src/index.ts";

const { paul } = keys;
const SERVICE = "https://dap-demo.inguz.workers.dev";
const NAMESPACE = "failed-claims";
const ARTIFACT_HOST = "service.invalid";
const MAX = 64;
const ACCOUNT = { id: 285042784, login: "generalbusiness-ai", type: "Organization" } as const;

/** The stops' words, written out here so that a changed sentence turns a named case red. */
const FULL = "The register is full of unfinished claims, so it refused this one, and this request holds no place. A place frees only when one of those claims finishes. A claim whose attempts have all failed stays unfinished, even after the Git host returns. If this refusal repeats, this needs the register's operator, whose way out is a new register.";
const fullLine = (name: string) => `${FULL} dap create ${name} --again asks the register again with a new request.`;
const gaveUp = (reads: number, name: string) => `Gave up waiting for the directory after ${reads} reads. The register accepted this claim, and its directory has not appeared. This command cannot tell whether the claim is still being tried or all its attempts have failed. Run dap create ${name} to go on waiting. That sends nothing new, and it cannot restart a failed claim, even after the Git host returns. When the Git host is up, dap create ${name} --again signs a new claim. The new claim takes a new place in the register, the old claim keeps its place, and if the old claim still finishes you have a second repository.`;

type Life = ReturnType<typeof nativeFixtureLifetime>;
type Node = ReturnType<Life["platform"]>;
const fixture = (sessions: boolean): Life => nativeFixtureLifetime(beginSessionFixture(sessions
  ? { secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector }
  : { secret: null, sessions: false, inspector: null }), sessions ? {} : { required: false });
const report = (...words: unknown[]): void => { console.log("[failed-claims]", ...words); };
const cut = (scope: string, text: string): string => text.replaceAll(scope, "<register>");

/** What a real binding's failure looks like to `ArtifactsProvider`: a thrown call, with or without the service's coded error. */
const thrown = (message: string, code?: string, numericCode?: number): Error => Object.assign(new Error(message), code === undefined ? {} : { code, numericCode });
type ArtifactsMode = "up" | "network" | "internal" | "not-found" | "malformed";
function artifactsService() {
  const control = { mode: "up" as ArtifactsMode, creates: [] as string[], times: [] as number[] };
  const ns: ArtifactsNamespace = {
    get: async (name) => ({
      createToken: async (scope: string) => ({ id: "tok", plaintext: `${scope}-plaintext`, scope, expiresAt: "2099-01-01T00:00:00Z" }),
      revokeToken: async () => true,
      info: async () => ({ name, remote: `https://${ARTIFACT_HOST}/git/${NAMESPACE}/${name}.git` }),
    }) as never,
    create: async (name) => {
      control.creates.push(name);
      switch (control.mode) {
        case "up": return { name, remote: `https://${ARTIFACT_HOST}/git/${NAMESPACE}/${name}.git`, token: "creation-plaintext" } as never;
        case "network": throw new TypeError("Network connection lost.");
        case "internal": throw thrown("internal error", "INTERNAL_ERROR", 500);
        case "not-found": throw thrown("namespace not found", "NOT_FOUND", 404);
        case "malformed": return { unexpected: true } as never;
      }
    },
    delete: async () => true,
  };
  return { control, ns };
}
const artifactsConfig = (registerScope: ScopeId): string => canonicalize({ registerScope, namespace: NAMESPACE, host: ARTIFACT_HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" });

type GitHubMode = "up" | "network" | "503" | "403" | "422";
function gitHubService() {
  const control = { mode: "up" as GitHubMode, creates: 0 };
  const fetch = async (request: Request): Promise<Response> => {
    control.creates++;
    switch (control.mode) {
      case "network": throw new TypeError("Network connection lost.");
      case "503": return new Response("Service Unavailable", { status: 503 });
      case "403": return new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit." }), { status: 403, headers: { "content-type": "application/json", "retry-after": "60" } });
      case "422": return new Response(JSON.stringify({ message: "Repository creation failed.", errors: [{ message: "name already exists on this account" }] }), { status: 422, headers: { "content-type": "application/json" } });
      case "up": {
        const { name } = await request.clone().json() as { name: string };
        return new Response(JSON.stringify({ id: 71, name, owner: ACCOUNT, private: true, full_name: `${ACCOUNT.login}/${name}`, html_url: `https://github.com/${ACCOUNT.login}/${name}`, clone_url: `https://github.com/${ACCOUNT.login}/${name}.git` }), { status: 201, headers: { "content-type": "application/json" } });
      }
    }
  };
  return { control, fetch };
}
const gitHubBindings = (registerScope: ScopeId) => ({
  GITHUB_APP_CONFIG: canonicalize({ issuer: "Iv1.scripted", installationId: 99, account: ACCOUNT, maxBytes: 1024 * 1024, registerScope, privateRepositories: true, publicReads: false, credentialIdentity: "adapter-attempt" }),
  GITHUB_APP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nYQ==\n-----END PRIVATE KEY-----\n", GITHUB_CREATION_TOKEN: "test_creation_secret", GITHUB_READ_TOKEN: "test_read_secret",
});

/** Every entry of the journal, page by page. `Platform.entries` returns the first page alone. */
const journal = async (life: Life, R: Node): Promise<Entry[]> => {
  const all: Entry[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await life.wait(() => (R.stub as unknown as { history(reader: unknown, cursor?: string): Promise<Read<readonly Sealed[]>> }).history(inspector, cursor));
    if (!page.ok) throw new Error(`no history of ${R.name}: ${page.reason}`);
    all.push(...page.value.map(sealed => sealed.entry));
    if (page.complete || page.next === undefined) return all;
    cursor = page.next;
  }
};
/** The outcomes of one operation, in journal order: `attempt:result`. */
const outcomesOf = (entries: readonly Entry[], seq: number): string[] => entries.flatMap(({ input }) =>
  input.type === "outcome" && input.operation === `${seq}:0` ? [`${input.attempt}:${input.result}`] : []);
/** The driver's passes over the backoff of `dispatchRetrySeconds`: attempt 2 is due 1 second after outcome 1, attempt 3 is due 2 seconds after outcome 2. Each advance is the scripted clock's. */
const exhaust = async (life: Life, R: Node): Promise<void> => {
  await effectFixture([R], life.wait);
  life.advance(1_000);
  await effectFixture([R], life.wait);
  life.advance(2_000);
  await effectFixture([R], life.wait);
};
const founds = (entries: readonly Entry[]): number => entries.filter(({ input }) => input.type === "act" && input.signed.intent.kind === "found").length;
const claimsOf = async (life: Life, R: Node): Promise<readonly Item[]> => (await life.wait(() => R.summary())).value.items.filter(item => item.type === "claim");
const countsOf = async (life: Life, R: Node): Promise<unknown> => (await life.wait(() => R.summary())).value.counts.filter(([type]) => type === "claim");
const refusalOf = (answer: Answer): string => answer.answer === "refused" ? `${answer.reason}${"detail" in answer && answer.detail ? ` (${String(answer.detail)})` : ""}` : answer.answer;

/** An installed register under a real pin, signed directly, so that each pin takes the same route. `founders` holds rita and una. */
async function installed(life: Life, pin: PlatformDefinition, host: string, namespace: string, wire: (R: Node) => void, policy: "keys" | "open" = "keys") {
  const intent: Intent = { v: 1, to: null, actor: paul.key, kind: "install", on: null, expected: {}, fields: { host, namespace, policy, ...(policy === "keys" ? { founders: [rita.key, una.key] } : {}) }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: pin, creator: null, cause: intentDigest(intent), ordinal: 0 }));
  wire(R);
  expect(await life.wait(() => R.stub.create(signIntent(intent, paul.secret), pin))).toMatchObject({ answer: "accepted" });
  return R;
}
const found = (life: Life, R: Node, who: typeof rita, recoveryKey: KeyId = sam.key): Promise<Answer> =>
  life.wait(() => R.act(who, "found", { expected: { register: 1 }, idempotencyKey: crypto.randomUUID(), fields: { branch: "main", founderHandle: "@founder", recoveryKey } }));

/** The real public route to `found` under policy `open`: `dap install`, the demo's offer, and a stored key that is on no list. */
async function publicRegister(life: Life) {
  const { control, ns } = artifactsService();
  let register: Node | undefined;
  /** A scripted reply to one signed act kind. Everything else goes through the real routes. */
  const scripted = { kind: null as string | null, body: null as unknown };
  const fetch: Fetch = async (url, init) => {
    const endpoint = new URL(url);
    if (scripted.kind !== null && endpoint.pathname.endsWith("/acts") && typeof init?.body === "string" && (JSON.parse(init.body) as { signed?: { intent: { kind: string } } }).signed?.intent.kind === scripted.kind) {
      return Response.json(scripted.body, { status: 422 });
    }
    if (endpoint.pathname === "/v1/demo/creation-offer") {
      const response = await life.wait(async () => demoCreationRoute(new Request(url, { ...init, redirect: "manual" }), {
        SCOPES: env.PLATFORM as unknown as Binding, DEPLOYMENT: "TEST failed claims", ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS_CONFIG: artifactsConfig(register!.name),
        DEMO_START_CONFIG: canonicalize({ v: 3, origin: SERVICE, deployment: "TEST failed claims", register: await register!.at(), definition: DEMO.register }),
      }));
      return Object.assign({ status: response.status, body: response.body, url, redirected: false });
    }
    return life.wait(() => routed(url, init));
  };
  const operator = memoryStore();
  const install = await life.wait(() => command({ store: operator, fetch, now: life.now, trustedCreationService: { service: SERVICE, fetch } }, ["install", SERVICE, "--register-policy", "open", "--cohort", "archive-device-application", "--host", "artifacts", "--namespace", NAMESPACE]));
  expect(install.code, install.lines.join("\n")).toBe(0);
  const at = (await operator.config())!.register!;
  register = life.platform(at.scope);
  const R = register;
  life.outside(R.name, (given, sql) => artifactsOutside(given, sql, { ARTIFACTS_CONFIG: artifactsConfig(R.name), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: ns }));
  await life.wait(() => R.restart());
  /** A person's config directory: a key on no list, and the register's reference. */
  const person = async (who: { secret: Uint8Array }) => {
    const store = memoryStore();
    await store.keep("visitor", who.secret);
    await store.save({ v: 2, service: SERVICE, key: "visitor", register: at });
    const pause: NonNullable<Context["pause"]> = async waiting => { life.active(); life.advance(2_000); await driveFixture([R, ...waiting.map(scope => life.platform(scope as never))], life.wait); };
    const ctx = (tries: number): Context => ({ store, fetch, now: life.now, pause, tries });
    return { store, ctx };
  };
  return { R, control, fetch, scripted, operator, person };
}
const words = (R: Node, result: { code: number; lines: readonly string[] }): string => `exit ${result.code}: ${cut(R.name, result.lines.join(" / "))}`;

// Invariant: a failure at the host, of any kind that the provider's code tells apart, ends in `pending`, and it spends the attempts in 3 seconds of backoff.
test("DEFECT: each kind of host failure uses all three attempts within 3 seconds of backoff and leaves the claim pending", async () => {
  const life = fixture(false);
  try {
    const artifacts = artifactsService();
    const A = await installed(life, DEMO.register, "artifacts", NAMESPACE, R => life.outside(R.name, (given, sql) => artifactsOutside(given, sql, { ARTIFACTS_CONFIG: artifactsConfig(R.name), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: artifacts.ns })));
    const expected: Record<Exclude<ArtifactsMode, "up">, string[]> = {
      network: ["1:unknown", "2:unknown", "3:unknown"],
      internal: ["1:unknown", "2:unknown", "3:unknown"],
      malformed: ["1:unknown", "2:unknown", "3:unknown"],
      "not-found": ["1:refused", "2:refused", "3:refused"],
    };
    for (const mode of ["network", "internal", "malformed", "not-found"] as const) {
      artifacts.control.mode = mode;
      const answer = await found(life, A, rita);
      if (answer.answer !== "accepted") return expect.fail(JSON.stringify(answer));
      await exhaust(life, A);
      const seq = answer.receipt.fact.seq, entries = await journal(life, A);
      const claim = (await claimsOf(life, A)).find(item => item.id === seq)!;
      const times = entries.filter(({ input }) => input.type === "outcome" && input.operation === `${seq}:0`).map(entry => Date.parse(entry.time));
      report("artifacts", mode, outcomesOf(entries, seq).join(" "), "state", claim.state, "repository", claim.values["repository"] ?? "unset", "ms from outcome 1 to outcome 3, scripted clock", times.at(-1)! - times[0]!);
      expect(outcomesOf(entries, seq)).toEqual(expected[mode]);
      expect([claim.state, claim.values["repository"] ?? null, times.at(-1)! - times[0]!]).toEqual(["pending", null, 3_000]);
    }
    expect(artifacts.control.creates).toHaveLength(12);
    const github = gitHubService();
    const G = await installed(life, RETAINED.register, "github.com", ACCOUNT.login, R => life.outside(R.name, (given, sql) => gitHubOutside(given, sql, gitHubBindings(R.name), github.fetch)));
    for (const mode of ["network", "503", "403", "422"] as const) {
      github.control.mode = mode;
      const answer = await found(life, G, rita);
      if (answer.answer !== "accepted") return expect.fail(JSON.stringify(answer));
      await exhaust(life, G);
      const seq = answer.receipt.fact.seq, entries = await journal(life, G);
      const claim = (await claimsOf(life, G)).find(item => item.id === seq)!;
      report("github", mode, outcomesOf(entries, seq).join(" "), "state", claim.state);
      expect(outcomesOf(entries, seq)).toEqual(["1:unknown", "2:unknown", "3:unknown"]);
      expect(claim.state).toBe("pending");
    }
    expect(github.control.creates).toBe(12);
  } finally { life.release(); }
}, 60_000);

// Invariant: an absent host setting is not a failed attempt. The attempt stays unsent, so the claim recovers when the setting returns.
test("a missing host setting spends no attempt, the claim holds its place, and the setting's return completes it", async () => {
  const life = fixture(false);
  try {
    const artifacts = artifactsService();
    let configured = false;
    const R = await installed(life, DEMO.register, "artifacts", NAMESPACE, R => life.outside(R.name, (given, sql) => artifactsOutside(given, sql, configured ? { ARTIFACTS_CONFIG: artifactsConfig(R.name), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: artifacts.ns } : {})));
    const answer = await found(life, R, rita);
    if (answer.answer !== "accepted") return expect.fail(JSON.stringify(answer));
    await effectFixture([R], life.wait);
    const seq = answer.receipt.fact.seq;
    report("setting absent: creates", artifacts.control.creates.length, "outcomes", outcomesOf(await journal(life, R), seq).length, "counts", JSON.stringify(await countsOf(life, R)));
    expect(artifacts.control.creates).toHaveLength(0);
    expect((await claimsOf(life, R))[0]!.state).toBe("pending");
    configured = true;
    await life.wait(() => R.restart());
    await effectFixture([R], life.wait);
    report("setting back after a restart: creates", artifacts.control.creates.length, "outcomes", outcomesOf(await journal(life, R), seq).join(" "));
    expect(outcomesOf(await journal(life, R), seq)).toEqual(["1:confirmed"]);
  } finally { life.release(); }
}, 60_000);

// Invariant: through the real CLI, an outage's claims close an open register, and neither the host's return, a restart, nor time reopens it.
test("DEFECT: on the public route, new keys fill the 64 places during an outage; nothing frees a place when the host returns; an existing room is unaffected", async () => {
  const life = fixture(true);
  try {
    const { R, control, operator, person } = await publicRegister(life);
    const entries = () => journal(life, R);

    // A room from before the outage. Its claim is final, so it holds no place.
    const before = await person(sam);
    const made = await life.wait(() => command(before.ctx(8), ["claim", "before", "--handle", "@before"]));
    report("healthy dap claim", words(R, made));
    expect(made.code, made.lines.join("\n")).toBe(0);
    expect(await countsOf(life, R)).toEqual([["claim", "active", 1], ["claim", "pending", 0]]);

    // The host goes down. One person claims, and the three attempts go at once.
    control.mode = "network";
    const stuck = await person(vic);
    const first = await life.wait(() => command(stuck.ctx(3), ["claim", "stuck", "--handle", "@stuck"]));
    report("dap claim during the outage", words(R, first));
    expect(first).toEqual({ code: 1, lines: [gaveUp(3, "stuck")] });
    const seq = (await claimsOf(life, R)).find(item => item.state === "pending")!.id;
    expect(outcomesOf(await entries(), seq)).toEqual(["1:unknown", "2:unknown", "3:unknown"]);
    report("journal of that claim", outcomesOf(await entries(), seq).join(" "), "counts", JSON.stringify(await countsOf(life, R)));

    // The host returns. A rerun, a read-only check, a restart and an hour all leave the claim as it is.
    control.mode = "up";
    const calls = control.creates.length, foundsBefore = founds(await entries());
    const rerun = await life.wait(() => command(stuck.ctx(3), ["claim", "stuck", "--handle", "@stuck"]));
    report("rerun of dap claim with the host back", words(R, rerun));
    expect(rerun).toEqual({ code: 1, lines: [gaveUp(3, "stuck")] });
    const check = await life.wait(() => checkClaim(stuck.ctx(1), "stuck"));
    report("read-only check with the host back", words(R, check));
    life.advance(3_600_000);
    await life.wait(() => R.restart());
    await driveFixture([R], life.wait);
    const later = await life.wait(() => command(stuck.ctx(3), ["claim", "stuck", "--handle", "@stuck"]));
    report("rerun an hour later, after a restart", words(R, later));
    expect(later).toEqual({ code: 1, lines: [gaveUp(3, "stuck")] });
    expect([control.creates.length, founds(await entries())]).toEqual([calls, foundsBefore]);
    expect(outcomesOf(await entries(), seq)).toEqual(["1:unknown", "2:unknown", "3:unknown"]);

    // Only --again gets a room, and it spends a new place. The old place stays held.
    const again = await life.wait(() => command(stuck.ctx(8), ["claim", "stuck", "--handle", "@stuck", "--again"]));
    report("dap claim --again with the host back", words(R, again));
    expect(again.code, again.lines.join("\n")).toBe(0);
    expect(await countsOf(life, R)).toEqual([["claim", "active", 2], ["claim", "pending", 1]]);
    report("counts after --again", JSON.stringify(await countsOf(life, R)));

    // The second outage. One new key fills the other 63 places.
    control.mode = "network";
    const flood = await person(una);
    let last = await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood"]));
    expect(last.lines.join(" ")).toContain("Gave up waiting for the directory");
    await exhaust(life, R);
    for (let n = 2; n <= MAX - 1; n++) {
      last = await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood", "--again"]));
      expect(last.lines.join(" "), `claim ${n}`).toContain("Gave up waiting for the directory");
      await exhaust(life, R);
    }
    const flooded = await claimsOf(life, R);
    report("after 63 claims by one key: counts", JSON.stringify(await countsOf(life, R)), "keys holding pending claims", new Set(flooded.map(item => item.values["founder"])).size);
    expect(flooded).toHaveLength(MAX);
    expect(flooded.every(item => item.state === "pending" && (item.values["repository"] ?? null) === null)).toBe(true);
    expect(flooded.filter(item => item.values["founder"] === una.key)).toHaveLength(MAX - 1);

    // Number 65 is refused, by the same key and by a key that the register never saw.
    const beforeRefusal = (await entries()).length;
    const same = await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood", "--again"]));
    report("claim 65, same key", words(R, same));
    expect(same).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${beforeRefusal - 1}. ${fullLine("flood")}`] });
    const stranger = await person(rita);
    const closed = await life.wait(() => command(stranger.ctx(1), ["claim", "new", "--handle", "@new"]));
    report("claim 65, a new key", words(R, closed));
    expect(closed).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${beforeRefusal - 1}. ${fullLine("new")}`] });
    expect((await entries()).length).toBe(beforeRefusal);

    // A key with a recent entry can read the log. No line says that a claim failed.
    const inWindow = await life.wait(() => command(flood.ctx(1), ["log", "register", "--limit", "4"]));
    report("dap log register by the flooding key, in its 900 seconds", words(R, inWindow).slice(0, 900));

    // The host returns for good. The register stays closed to everyone.
    control.mode = "up";
    const afterOutage = control.creates.length;
    life.advance(86_400_000);
    await life.wait(() => R.restart());
    await driveFixture([R], life.wait);
    await dispatchFixture([R], life.wait);
    const still = await person(paul);
    const reopened = await life.wait(() => command(still.ctx(1), ["claim", "next-day", "--handle", "@nextday"]));
    report("a day later with the host up, a new key", words(R, reopened));
    expect(reopened).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${beforeRefusal - 1}. ${fullLine("next-day")}`] });
    const retry = await life.wait(() => command(stranger.ctx(1), ["claim", "new", "--handle", "@new"]));
    report("a day later, a rerun of the refused claim", words(R, retry));
    report("a day later: counts", JSON.stringify(await countsOf(life, R)), "host calls since the outage ended", control.creates.length - afterOutage);
    expect(control.creates.length).toBe(afterOutage);
    expect(await countsOf(life, R)).toEqual([["claim", "active", 2], ["claim", "pending", MAX]]);

    // What the other reads show. A room from before the outage still reads and acts.
    const log = await life.wait(() => command({ store: operator, fetch: async (url, init) => life.wait(() => routed(url, init)), now: life.now }, ["log", "register", "--limit", "2"]));
    report("operator dap log register, a day after its last entry", words(R, log));
    expect(log).toEqual({ code: 1, lines: [`Cannot read the history of ${R.name}: forbidden.`] });
    const roomLog = await life.wait(() => command(before.ctx(1), ["log", "register", "--limit", "2"]));
    report("dap log register from the room made before the outage", words(R, roomLog).slice(0, 400));
    expect(roomLog.code).toBe(0);

    // The count that docs/deploy.md gives an operator: `dap log` from a room, then `dap show` on each result row.
    const whole = await life.wait(() => command(before.ctx(1), ["log", "register", "--limit", "100000"]));
    expect(whole.code).toBe(0);
    const rowsOf = (pattern: RegExp) => whole.lines.flatMap(line => { const match = pattern.exec(line); return match ? [Number(match[1])] : []; });
    const foundRows = rowsOf(/:(\d+) {2}\S+ {2}act found by /), resultRows = rowsOf(/:(\d+) {2}\S+ {2}delivery result from directory:\d+; 3 effects/), outcomeRows = rowsOf(/:(\d+) {2}\S+ {2}outcome; /);
    const finished = new Set<number>();
    for (const seq of resultRows) {
      const shown = await life.wait(() => command(before.ctx(1), ["show", `register:${seq}`]));
      expect(shown.code).toBe(0);
      const effects = JSON.parse(shown.lines[1]!.replace(/^Effects: /, "").replace(/\.$/, "")) as { effect: string; item?: number; state?: string }[];
      for (const effect of effects) if (effect.effect === "state" && effect.state === "active") finished.add(effect.item!);
    }
    const live = foundRows.filter(seq => !finished.has(seq));
    const actual = (await claimsOf(life, R)).map(item => item.id);
    report("count from the log: found rows", foundRows.length, "outcome rows", outcomeRows.length, "result rows with 3 effects", resultRows.length, "found rows that no result names", live.length, "inspector's pending claims", actual.length, "same IDs", canonicalize(live) === canonicalize(actual));
    expect([foundRows.length, resultRows.length, live]).toEqual([MAX + 2, 2, actual]);
    const outcomeShown = await life.wait(() => command(before.ctx(1), ["show", `register:${outcomeRows.at(-1)!}`]));
    report("dap show of the last outcome row", words(R, outcomeShown).slice(0, 500));
    const resultShown = await life.wait(() => command(before.ctx(1), ["show", `register:${resultRows[0]!}`]));
    report("dap show of a result row", words(R, resultShown).slice(0, 700));
    const roomConfig = (await before.store.config())!;
    const status = await life.wait(() => command(before.ctx(1), ["status"]));
    report("dap status from the room made before the outage", words(R, status).slice(0, 400));
    const directory = life.platform(roomConfig.repository!.directory.scope);
    expect((await life.wait(() => directory.summary())).value.status).toBe("active");
    const summary = await life.wait(() => R.summary());
    report("inspector summary: status", summary.value.status, "complete", summary.complete, "items", summary.value.items.length, "operations named in the summary", "operations" in summary.value);
  } finally { life.release(); }
}, 280_000);

// Invariant: each historical register pin predating FAILED_CLAIM_COHORT behaves the same when it has a host: one founder fills `max`, and a second founder gets `type-full`.
const PINS = [...new Set(CREATION_COHORTS.filter(cohort => cohort.register !== FAILED_CLAIM_COHORT.register).map(cohort => cohort.register))] as PlatformDefinition[];
test.each(PINS)("DEFECT: %s under policy keys and a failing GitHub host: one founder fills 64, the other founder gets type-full, and a stranger gets unauthorized", async (pin) => {
  const life = fixture(false);
  try {
    const github = gitHubService();
    github.control.mode = "503";
    const declared = platform(pin)!.data.items["claim"]!;
    const R = await installed(life, pin, "github.com", ACCOUNT.login, R => life.outside(R.name, (given, sql) => gitHubOutside(given, sql, gitHubBindings(R.name), github.fetch)));
    for (let n = 1; n <= declared.max; n++) {
      const answer = await found(life, R, rita);
      expect(answer.answer, `found ${n}: ${JSON.stringify(answer)}`).toBe("accepted");
      await exhaust(life, R);
    }
    const entries = await journal(life, R);
    const outcomes = entries.filter(({ input }) => input.type === "outcome");
    const claims = await claimsOf(life, R);
    const other = await found(life, R, una);
    const repeat = await found(life, R, rita);
    const outsider = await found(life, R, vic);
    const data = platform(pin)!.data;
    report(pin, "acts", Object.keys(data.acts).join(","), "timed", Object.keys(data.timed).length, "receives", Object.keys(data.receives).length);
    report(pin, "max", declared.max, "states", Object.keys(declared.states).join(","), "pending", claims.filter(item => item.state === "pending").length, "outcomes", outcomes.length, "host calls", github.control.creates,
      "other founder", refusalOf(other), "same founder", refusalOf(repeat), "stranger", refusalOf(outsider));
    expect([declared.max, claims.length, outcomes.length, github.control.creates]).toEqual([MAX, MAX, 3 * MAX, 3 * MAX]);
    expect(outcomes.every(({ input }) => input.type === "outcome" && input.result === "unknown")).toBe(true);
    expect(other).toMatchObject({ answer: "refused", reason: "type-full" });
    expect(repeat).toMatchObject({ answer: "refused", reason: "type-full" });
    expect(outsider).toMatchObject({ answer: "refused", reason: "unauthorized" });
  } finally { life.release(); }
}, 120_000);

// Invariant: on a register of `host: none`, `found` opens no attempt, so this failure cannot occur there.
test.each(["platform:register@21", "platform:register@23"] as PlatformDefinition[])("%s under host none opens no attempt, and its claim goes active with no host", async (pin) => {
  const life = fixture(false);
  try {
    const R = await installed(life, pin, "none", "", () => undefined);
    const answer = await found(life, R, rita);
    if (answer.answer !== "accepted") return expect.fail(JSON.stringify(answer));
    const entry = (await journal(life, R))[answer.receipt.fact.seq]!;
    const opens = entry.effects.filter(effect => effect.effect === "operation").length;
    const sends = entry.sends.length;
    report(pin, "host none: operations opened", opens, "sends in the found entry", sends);
    expect([opens, sends]).toEqual([0, 1]);
  } finally { life.release(); }
}, 60_000);

// Invariant: under policy keys, the words depend on the key's recent entry, because the command reads the summary before it signs.
test("DEFECT: the retained Register18 install pin under policy keys: at 64 a founder in its window reads type-full, and any other founder reads forbidden", async () => {
  const life = fixture(true);
  try {
    const github = gitHubService();
    github.control.mode = "503";
    const pin = RETAINED.register;
    const R = await installed(life, pin, "github.com", ACCOUNT.login, R => life.outside(R.name, (given, sql) => gitHubOutside(given, sql, gitHubBindings(R.name), github.fetch)));
    for (let n = 1; n <= MAX; n++) {
      expect((await found(life, R, rita)).answer).toBe("accepted");
      await exhaust(life, R);
    }
    const at = await life.wait(() => R.at());
    const fetch: Fetch = (url, init) => life.wait(() => routed(url, init));
    const person = async (who: typeof rita) => {
      const store = memoryStore();
      await store.keep("founder", who.secret);
      await store.save({ v: 2, service: "https://scopes.test", key: "founder", register: at });
      return { store, fetch, now: life.now, tries: 1, pause: async () => undefined } satisfies Context;
    };
    const filler = await life.wait(async () => command(await person(rita), ["claim", "room", "--handle", "@rita"]));
    report(pin, "claim 65 by the founder that filled it, in its window", words(R, filler));
    expect(filler.lines.join(" ")).toContain("Refused: type-full");
    const other = await life.wait(async () => command(await person(una), ["claim", "room", "--handle", "@una"]));
    report(pin, "claim 65 by the other founder, no entry here", words(R, other));
    expect(other.code).toBe(1);
    life.advance(901_000);
    const late = await life.wait(async () => command(await person(rita), ["claim", "room", "--handle", "@rita"]));
    report(pin, "the first founder, 901 seconds later", words(R, late));
    expect(late.code).toBe(1);
  } finally { life.release(); }
}, 120_000);

// Invariant: an attempt's own late answer is the one input that moves a stuck claim, and it reaches the claim only while the object that sent it lives.
test("a hung request's own late reply frees the place, after the two later attempts failed", async () => {
  const life = fixture(false);
  let name: string | undefined;
  try {
    const artifacts = artifactsService();
    let release: () => void = () => undefined;
    const held = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    const create = artifacts.ns.create.bind(artifacts.ns);
    const ns: ArtifactsNamespace = { ...artifacts.ns, create: async (repository) => {
      if (++calls === 1) { await held; artifacts.control.mode = "up"; return create(repository); }
      return create(repository);
    } };
    artifacts.control.mode = "network";
    const R = await installed(life, DEMO.register, "artifacts", NAMESPACE, R => {
      name = R.name;
      net.sized.set(R.name, { ...PROPOSED_BOUNDS, dispatchSeconds: 1 });
      life.outside(R.name, (given, sql) => artifactsOutside(given, sql, { ARTIFACTS_CONFIG: artifactsConfig(R.name), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: ns }));
    });
    const answer = await found(life, R, rita);
    if (answer.answer !== "accepted") return expect.fail(JSON.stringify(answer));
    const seq = answer.receipt.fact.seq;
    await exhaust(life, R);
    report("hung attempt 1, dispatchSeconds set to 1 for this test", outcomesOf(await journal(life, R), seq).join(" "), "counts", JSON.stringify(await countsOf(life, R)));
    expect(outcomesOf(await journal(life, R), seq)).toEqual(["1:unknown", "2:unknown", "3:unknown"]);
    release();
    for (let n = 0; n < 200 && outcomesOf(await journal(life, R), seq).length < 4; n++) await life.wait(() => new Promise<void>(resolve => { setTimeout(resolve, 5); }));
    const entries = await journal(life, R);
    report("after the late reply", outcomesOf(entries, seq).join(" "));
    expect(outcomesOf(entries, seq)).toEqual(["1:unknown", "2:unknown", "3:unknown", "1:confirmed"]);
    const send = entries.at(-1)!.sends[0]!;
    if (!isSeed(send.to)) return expect.fail("the selecting outcome sends the directory's create");
    await driveFixture([R, life.platform(scopeIdOf(send.to))], life.wait);
    report("after the directory's result: counts", JSON.stringify(await countsOf(life, R)));
    expect(await countsOf(life, R)).toEqual([["claim", "active", 1], ["claim", "pending", 0]]);
  } finally {
    if (name) net.sized.delete(name);
    life.release();
  }
}, 60_000);

// Invariant: the stop on the directory says what the client knows, what a rerun cannot do, and what --again spends.
test("WORDS: a claim that gave up on the directory states what is known, what a rerun cannot do, and what --again spends", async () => {
  const life = fixture(true);
  try {
    const { R, control, person } = await publicRegister(life);
    control.mode = "network";
    const stuck = await person(vic);
    const first = await life.wait(() => command(stuck.ctx(3), ["claim", "stuck", "--handle", "@stuck"]));
    expect(first).toEqual({ code: 1, lines: [gaveUp(3, "stuck")] });
    // Each statement holds in the run: a rerun adds no entry and no host call, and --again takes one more place while the first stays.
    control.mode = "up";
    const calls = control.creates.length, entries = (await journal(life, R)).length;
    const rerun = await life.wait(() => command(stuck.ctx(3), ["claim", "stuck", "--handle", "@stuck"]));
    expect(rerun).toEqual({ code: 1, lines: [gaveUp(3, "stuck")] });
    expect([control.creates.length, (await journal(life, R)).length]).toEqual([calls, entries]);
    const again = await life.wait(() => command(stuck.ctx(8), ["claim", "stuck", "--handle", "@stuck", "--again"]));
    expect(again.code, again.lines.join("\n")).toBe(0);
    expect(await countsOf(life, R)).toEqual([["claim", "active", 1], ["claim", "pending", 1]]);
  } finally { life.release(); }
}, 60_000);

// Invariant: once the directory exists, the repository exists, so the stop keeps its plain statement and adds what --again spends.
test("WORDS: a claim whose directory exists and whose children wait says --again takes a place and creates a second repository", async () => {
  const life = fixture(true);
  try {
    const { person } = await publicRegister(life);
    life.setHold(envelope => "definition" in envelope.to && envelope.to.kind !== "directory");
    const who = await person(vic);
    const result = await life.wait(() => command(who.ctx(6), ["claim", "waiting", "--handle", "@waiting"]));
    report("children still waiting", result.lines.join(" / "));
    expect(result).toEqual({ code: 1, lines: ["Gave up waiting for membership, the rules scope and the destination after 6 reads. What was asked may still take effect; run dap create waiting again to go on waiting for this claim, or with --again to sign a new one, which takes a new place in the register and creates a second repository."] });
  } finally { life.release(); }
}, 60_000);

// Invariant: `type-full` on a register's `found` names the unfinished claims and the operator, and each route that signs `found` says so.
test("WORDS: a full register's type-full names the unfinished claims and the operator, by dap claim and by dap act found", async () => {
  const life = fixture(true);
  try {
    const { R, control, person } = await publicRegister(life);
    control.mode = "network";
    const flood = await person(una);
    await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood"]));
    await exhaust(life, R);
    for (let n = 2; n <= MAX; n++) {
      await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood", "--again"]));
      await exhaust(life, R);
    }
    const head = (await journal(life, R)).length - 1;
    const stranger = await person(rita);
    const claimed = await life.wait(() => command(stranger.ctx(1), ["claim", "new", "--handle", "@new"]));
    report("type-full by dap claim", words(R, claimed));
    expect(claimed).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${head}. ${fullLine("new")}`] });
    const acted = await life.wait(() => command(flood.ctx(1), ["act", "found", "--on", "register", "--set", "branch=main", "--set", "founderHandle=@flood", "--set", `recoveryKey=${sam.key}`]));
    report("type-full by dap act found", words(R, acted));
    expect(acted).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${head}. ${FULL}`] });
  } finally { life.release(); }
}, 120_000);

// Invariant: the longer sentence belongs to a register's `found`. A `type-full` of any other act keeps the plain last sentence.
test("WORDS: a type-full of another act at another scope keeps its plain words, by dap act and at the claim's seat step", async () => {
  const life = fixture(true);
  try {
    const { scripted, person } = await publicRegister(life);
    const judgedAt = { seq: 7, hash: `sha256:${"a".repeat(64)}` };
    const room = await person(sam);
    expect((await life.wait(() => command(room.ctx(8), ["claim", "room", "--handle", "@room"]))).code).toBe(0);
    const membership = (await room.store.config())!.repository!.membership.scope;
    scripted.kind = "invite-member";
    scripted.body = { answer: "refused", reason: "type-full", judgedAt };
    const acted = await life.wait(() => command(room.ctx(1), ["act", "invite-member", "--on", "membership", "--set", "handle=@guest", "--set", "role=member"]));
    report("type-full at membership, dap act", acted.lines.join(" / "));
    expect(acted).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${membership}:7. The request was refused.`] });
    scripted.kind = "seat";
    const other = await person(vic);
    const seated = await life.wait(() => command(other.ctx(8), ["claim", "seated", "--handle", "@seated"]));
    const otherMembership = (await other.store.config())!.claim!.repository!.membership.scope;
    report("type-full at membership, the claim's seat step", seated.lines.join(" / "));
    expect(seated).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${otherMembership}:7. The request was refused.`] });
  } finally { life.release(); }
}, 60_000);

/** The real `McpService` on this file's routes, with custody in memory. It holds the configuration that a person's config directory holds. */
const mcpOf = (life: Life, fetch: Fetch, who: { secret: Uint8Array }, config: McpConfig): McpService => new McpService({
  service: SERVICE, fetch, signer: secretSigner(who.secret), custody: mcpCustody(), now: life.now, every: () => () => {},
  config: { read: async () => structuredClone(config), addRoot: async () => {} },
});

// Invariant: a person who reaches a full register through MCP learns what the command line says, and no step that the register cannot take.
// Real: `McpService`, the routes and the full register. STAND-IN: the same scripted host failures as the cases above.
test("WORDS: MCP's room.create at a full register names the unfinished claims and the operator", async () => {
  const life = fixture(true);
  try {
    const { R, control, fetch, person } = await publicRegister(life);
    control.mode = "network";
    const flood = await person(una);
    await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood"]));
    await exhaust(life, R);
    for (let n = 2; n <= MAX; n++) {
      await life.wait(() => command(flood.ctx(1), ["claim", "flood", "--handle", "@flood", "--again"]));
      await exhaust(life, R);
    }
    const head = (await journal(life, R)).length - 1;
    // A key with an entry at the register in its read window: a key with none reads `forbidden`, and its list holds no `room.create`.
    const mcp = mcpOf(life, fetch, una, { service: SERVICE, register: (await flood.store.config())!.register! });
    await life.wait(() => mcp.page());
    const result = await life.wait(() => mcp.call("room.create", { target: R.name, fields: { branch: "main", founderHandle: "@new", recoveryKey: sam.key }, idempotencyKey: "after-full" }));
    report("type-full by MCP room.create", cut(R.name, `${String(result.structuredContent["sentence"])} / ${String(result.structuredContent["next"])}`));
    expect([result.structuredContent["answer"], result.structuredContent["reason"], result.structuredContent["sentence"], result.structuredContent["next"]]).toEqual([
      "refused", "type-full",
      `${R.name} refused found, because the register is full of unfinished claims, so this request holds no place, judged at head ${head}.`,
      "A place frees only when one of those claims finishes. A claim whose attempts have all failed stays unfinished, even after the Git host returns. If this refusal repeats, this needs the register's operator, whose way out is a new register.",
    ]);
  } finally { life.release(); }
}, 120_000);

// Invariant: the register's words belong to a register's `found`. Another act's `type-full` keeps its own next step.
// Real: `McpService`, the routes and the room's scopes. STAND-IN: the `/acts` reply for `invite-member` is scripted, because no membership here is full.
test("WORDS: MCP's member.invite at a type-full keeps its plain words", async () => {
  const life = fixture(true);
  try {
    const { scripted, fetch, person } = await publicRegister(life);
    const room = await person(sam);
    expect((await life.wait(() => command(room.ctx(8), ["claim", "room", "--handle", "@room"]))).code).toBe(0);
    const config = (await room.store.config())!;
    scripted.kind = "invite-member";
    scripted.body = { answer: "refused", reason: "type-full", judgedAt: { seq: 7, hash: `sha256:${"a".repeat(64)}` } };
    const mcp = mcpOf(life, fetch, sam, { service: SERVICE, register: config.register!, repository: config.repository! });
    await life.wait(() => mcp.page());
    const result = await life.wait(() => mcp.call("member.invite", { fields: { handle: "@guest", role: "member", inviteEnds: "2099-01-01T00:00:00Z", inviteKey: una.key }, idempotencyKey: "plain-words" }));
    report("type-full by MCP member.invite", `${String(result.structuredContent["sentence"])} / ${String(result.structuredContent["next"])}`);
    expect([result.structuredContent["sentence"], result.structuredContent["next"]]).toEqual([
      `${config.repository!.membership.scope} refused invite-member, because the scope holds as many live items of that type as it may, judged at head 7.`,
      "Close or finish one first.",
    ]);
  } finally { life.release(); }
}, 60_000);

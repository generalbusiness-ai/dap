/**
 * Invariant: on retained Register18, the page names its pending claim and type-full stop. Continue waits on the original; the words name neither `--again` nor `dap create`.
 *
 * Real: the page's `claimRoom`, the CLI's `claim` under it, the Worker's routes, the register under the explicitly retained publication cohort, and the
 * production `artifactsOutside`. STAND-INS: the Artifacts binding fails on every create and no host runs, the clock is scripted, `pause`
 * stands for the alarm, and `testLocks` stands for Web Locks.
 */
import { expect, test } from "vitest";
import { b64url } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import { command, memoryStore, type Context } from "@generalbusiness/dap-cli";
import { artifactsOutside } from "../../../../packages/scope/src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../../../../packages/scope/src/artifacts-host.ts";
import { beginSessionFixture } from "../../../../packages/scope/test/session-settings.ts";
import { driveFixture, effectFixture, nativeFixtureLifetime } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { routed } from "../../../../packages/scope/test/repository.ts";
import { reader } from "../../../../packages/scope/test/support.ts";
import { allowedClaim, claimRoom, type ClaimLocks, type ClaimStorage } from "../src/claim.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";

const SERVICE = "https://scopes.test";
const NAMESPACE = "failed-claim-words";
const MAX = 64;
const GAVE_UP = "Gave up waiting for the directory after 3 reads. The register accepted this claim, and its directory has not appeared. This page cannot tell whether the claim is still being tried or all its attempts have failed. Continuing this creation goes on waiting. That sends nothing new, and it cannot restart a failed claim, even after the Git host returns. This browser starts no other creation while this one is unfinished. If the directory does not appear, tell the register's operator.";
const FULL = "The register is full of unfinished claims, so it refused this one, and this request holds no place. A place frees only when one of those claims finishes. A claim whose attempts have all failed stays unfinished, even after the Git host returns. If this refusal repeats, this needs the register's operator, whose way out is a new register.";

/** Test stand-in for Web Locks: this test takes one lock at a time. */
const locks: ClaimLocks = { request: (_name, run) => run() };
const storageOf = (): ClaimStorage => { const values = new Map<string, string>(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; };

test("WORDS: on retained Register18 the page's directory stop and type-full name what the page can do", async () => {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader }));
  try {
    const down: ArtifactsNamespace = {
      create: async () => { throw new TypeError("Network connection lost."); },
      get: async () => { throw new TypeError("Network connection lost."); },
      delete: async () => { throw new TypeError("Network connection lost."); },
    };
    const fetch: Fetch = (url, init) => life.wait(() => routed(url, init));
    const store = memoryStore();
    const operator: Context = { store, fetch, trustedCreationService: { service: SERVICE, fetch }, now: life.now, tries: 1, pause: async () => undefined };
    expect((await life.wait(() => command(operator, ["install", SERVICE, "--host", "artifacts", "--namespace", NAMESPACE, "--cohort", "archive-device-publication"]))).code).toBe(0);
    const config = (await store.config())!;
    const R = life.platform(config.register!.scope);
    expect((await life.wait(() => R.summary())).value.definition).toBe("platform:register@18");
    life.outside(R.name, (given, sql) => artifactsOutside(given, sql, { ARTIFACTS_CONFIG: JSON.stringify({ registerScope: R.name, namespace: NAMESPACE, host: "service.invalid", maxBytes: 10485760, credentialIdentity: "adapter-attempt" }), ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: down }));
    await life.wait(() => R.restart());
    const secret = (await store.secret(config.key))!;
    const session = { service: SERVICE, secret, now: life.now, fetch };
    const configured = await life.wait(() => allowedClaim(session, config.register!));
    const pause = async () => { life.active(); life.advance(2_000); await driveFixture([R], life.wait); };
    const keys = memoryPageKeys();

    const stuck = await life.wait(() => claimRoom(session, configured, storageOf(), "stuck", { mode: "new", handle: "@stuck", pause, tries: 3, locks, keys }));
    console.log("[failed-claims] page, stop on the directory:", stuck.outcome.lines.join(" / "));
    expect(stuck.outcome).toEqual({ code: 1, lines: [GAVE_UP] });
    expect(stuck.pending).toBe(true);

    for (let n = 2; n <= MAX; n++) {
      const result = await life.wait(() => command(operator, ["claim", "fill", "--handle", "@fill", "--again"]));
      expect(result.lines.join(" "), `claim ${n}`).toContain("Gave up waiting for the directory");
      await effectFixture([R], life.wait); life.advance(1_000); await effectFixture([R], life.wait); life.advance(2_000); await effectFixture([R], life.wait);
    }
    const head = (await life.wait(() => R.summary())).at.seq;
    const full = await life.wait(() => claimRoom(session, configured, storageOf(), "full", { mode: "new", handle: "@full", pause, tries: 1, locks, keys }));
    console.log("[failed-claims] page, type-full:", full.outcome.lines.join(" / "));
    expect(full.outcome).toEqual({ code: 1, lines: [`Refused: type-full, judged at entry ${R.name}:${head}. ${FULL}`] });
    expect(full.outcome.lines.join(" ")).not.toContain("--again");
    expect(full.repository).toBeNull();
  } finally { life.release(); }
}, 120_000);

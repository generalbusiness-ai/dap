/** Real native scopes and production Artifacts wiring; the provider and clock are scripted. No real host outage runs. */
import { expect, test } from "vitest";
import { canonicalize, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import type { Intent } from "@generalbusiness/dap-contract";
import { keys } from "@generalbusiness/dap-derive/testing";
import { FAILED_CLAIM_COHORT as C } from "@generalbusiness/dap-platform";
import { artifactsOutside } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { rita, sam } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { effectFixture, nativeFixtureLifetime } from "./support/native-fixture-lifetime.ts";
import { soon } from "./net.ts";

const { paul } = keys;
const HOST = "failed-claim.invalid", NAMESPACE = "failed-claim-cohort";
const fixture = () => nativeFixtureLifetime(beginSessionFixture({ secret: null, sessions: false, inspector: null }), { required: false });
type Life = ReturnType<typeof fixture>;
type Node = ReturnType<Life["platform"]>;

async function installed(life: Life) {
  const control = { failed: true, creates: 0, deleted: [] as string[] };
  const ns: ArtifactsNamespace = {
    create: async name => {
      control.creates++;
      if (control.failed) throw new TypeError("Scripted provider outage");
      return { name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git`, token: "test-creation-plaintext" } as never;
    },
    delete: async name => { control.deleted.push(name); return true; },
    get: async name => ({
      createToken: async (scope: string) => ({ id: "test-token", plaintext: "test-read-plaintext", scope, expiresAt: "2099-01-01T00:00:00Z" }),
      revokeToken: async () => true,
      info: async () => ({ name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git` }),
    }) as never,
  };
  const intent: Intent = { v: 1, to: null, actor: paul.key, kind: "install", on: null, expected: {},
    fields: { host: "artifacts", namespace: NAMESPACE, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(intent), ordinal: 0 }));
  life.outside(R.name, (given, sql) => artifactsOutside(given, sql, {
    ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
    ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: ns,
  }));
  expect(await life.wait(() => R.stub.create(signIntent(intent, paul.secret), C.register))).toMatchObject({ answer: "accepted" });
  return { R, control };
}
const found = (life: Life, R: Node) => life.wait(() => R.act(rita, "found", {
  expected: { register: 1 }, idempotencyKey: crypto.randomUUID(), fields: { branch: "main", founderHandle: "@founder", recoveryKey: sam.key },
}));
async function exhaust(life: Life, R: Node) {
  await effectFixture([R], life.wait);
  life.advance(1_000); await effectFixture([R], life.wait);
  life.advance(2_000); await effectFixture([R], life.wait);
}

// Invariant: terminal failed claims release the actual64-place item capacity without changing historical registers.
test("failed claims release all64 places, and the returning host can serve a new claim", async () => {
  const life = fixture();
  try {
    const { R, control } = await installed(life);
    for (let n = 0; n < 65; n++) {
      const answer = await found(life, R);
      expect(answer.answer, `claim ${n}`).toBe("accepted");
      if (answer.answer !== "accepted") throw Error("Expected an accepted claim");
      await exhaust(life, R);
      const summary = (await life.wait(() => R.summary())).value;
      // Summary lists live items only; its state counts include final failed claims.
      expect(summary.counts).toContainEqual(["claim", "failed", n + 1]);
      expect(summary.counts).toContainEqual(["claim", "pending", 0]);
    }
    expect(control.creates).toBe(65 * 3);
    control.failed = false;
    const recovered = await found(life, R);
    expect(recovered.answer).toBe("accepted");
    if (recovered.answer !== "accepted") throw Error("Expected recovery claim");
    await effectFixture([R], life.wait);
    const summary = (await life.wait(() => R.summary())).value;
    expect(summary.items.find(item => item.id === recovered.receipt.fact.seq)?.values["repository"]).toBeTruthy();
    expect(summary.counts).toContainEqual(["claim", "failed", 65]);
    expect(control.creates).toBe(65 * 3 + 1);
  } finally { life.release(); }
});

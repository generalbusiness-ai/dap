import { expect, test } from "vitest";
import type { Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, timeMs } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent, type Fetch } from "@generalbusiness/dap-client";
import { command, memoryStore, type Context } from "../src/index.ts";

// Configured-service acknowledgements and refusal replies are SCRIPTED.
// This tests local revision selection, not Native genesis or found authority.
test.each([
  { name: "open unpublished", binding: false, policy: "open", selects: true },
  { name: "open repository-binding", binding: true, policy: "open", selects: true },
  { name: "keys repository-binding operator", binding: true, policy: "keys", selects: true },
  { name: "keys unpublished operator", binding: false, policy: "keys", selects: false },
])("$name: expired custody selects only the supported initial revision; mismatched custody keeps the actual read path", async ({ binding, policy, selects }) => {
  const service = "https://selector.test", store = memoryStore();
  let now = Date.parse("2099-01-01T00:00:00Z"), summaries = 0;
  let receipt!: Receipt;
  const submitted: SignedIntent[] = [];
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === "/v1/scopes" && init?.method === "POST") {
      const given = JSON.parse(init.body!) as { creation: SignedIntent; definition: Receipt["definition"] };
      receipt = { fact: { at: { scope: scopeIdOf({ v: 1, kind: "register", definition: given.definition, creator: null, cause: intentDigest(given.creation.intent), ordinal: 0 }), genesis: textDigest("TEST genesis 7") }, seq: 0, hash: textDigest("SCRIPTED acknowledged genesis") }, definition: given.definition, intent: intentDigest(given.creation.intent), effects: [], sends: [], epoch: 0 };
      return Response.json({ answer: "accepted", receipt });
    }
    if (path.endsWith("/acts")) {
      submitted.push((JSON.parse(init!.body!) as { signed: SignedIntent }).signed);
      // Revision selection is no authority: the actual scope may still refuse.
      return Response.json({ answer: "refused", reason: "unauthorized", judgedAt: { seq: 0, hash: receipt.fact.hash } });
    }
    summaries++;
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  };
  const ctx: Context = { store, fetch, now: () => now, trustedCreationService: { service, fetch } };
  expect((await command(ctx, ["install", "--plan", service, "--host", "none", "--register-policy", policy,
    ...(binding ? ["--cohort", "repository-binding"] : [])])).code).toBe(0);
  expect((await command(ctx, ["install", "--planned"])).code).toBe(0);
  const kept = (await store.config())!, plan = kept.plan!;
  const original = canonicalize(plan.founding);
  now += 16 * 60_000;
  expect(timeMs(plan.founding.intent.notAfter)!).toBeLessThan(now);
  // Local selection never relies on the selected marker as authority.
  const { selected: _selected, ...withoutMarker } = plan;
  await store.save({ ...kept, plan: withoutMarker });
  const outcome = await command(ctx, ["create", "second", "--handle", "@owner"]);
  expect(outcome.code).toBe(1);
  if (!selects) {
    expect(outcome.lines.join("\n")).toContain("forbidden");
    expect(summaries).toBe(1);
    expect(submitted).toHaveLength(0);
    expect(canonicalize((await store.config())!.plan!.founding)).toBe(original);
    return;
  }
  expect(outcome.lines[0]).toContain("Refused: unauthorized");
  expect(summaries).toBe(0);
  expect(submitted).toHaveLength(1);
  expect(submitted[0]!.intent.expected).toEqual({ register: 1 });
  expect(timeMs(submitted[0]!.intent.notAfter)!).toBeGreaterThan(now);
  expect(canonicalize((await store.config())!.plan!.founding)).toBe(original);

  const other = newIncarnation(new Uint8Array(16).fill(8));
  const wrong = { ...plan, acknowledged: { ...plan.acknowledged!, receipt: { ...receipt, fact: { ...receipt.fact, at: { ...receipt.fact.at, inc: other } } } } };
  await store.save({ ...kept, plan: wrong });
  const mismatched = await command(ctx, ["create", "other", "--handle", "@owner"]);
  expect(mismatched.code).toBe(1);
  expect(mismatched.lines.join("\n")).toContain("forbidden");
  expect(summaries).toBe(1);
  expect(submitted).toHaveLength(1);
  // A marker from another attempt likewise cannot bypass the aged read.
  await store.save({ ...kept, plan: { ...plan, attempted: textDigest("different attempted install") } });
  expect((await command(ctx, ["create", "other", "--handle", "@owner"])).code).toBe(1);
  expect(summaries).toBe(2);
  expect(submitted).toHaveLength(1);
  if (binding && policy === "keys") {
    // A separate SCRIPTED installation names another founder. Its operator
    // signed the install, but this exception must not select for that operator.
    const operator = secretSigner((await store.secret("operator"))!);
    const another = secretSigner(new Uint8Array(32).fill(9));
    const founding = await signedIntent(operator, { to: null, kind: "install", fields: {
      ...plan.founding.intent.fields, founders: [another.key],
    } }, { now: now - 16 * 60_000 });
    const register = scopeIdOf({ v: 1, kind: "register", definition: plan.definition, creator: null,
      cause: intentDigest(founding.intent), ordinal: 0 });
    const acknowledged = { ...plan.acknowledged!, receipt: { ...receipt,
      intent: intentDigest(founding.intent), fact: { ...receipt.fact, at: { ...receipt.fact.at, scope: register } },
    } };
    const attempted = textDigest(canonicalize({ service, operator: operator.key, founding, definition: plan.definition, register }));
    await store.save({ ...kept, register: acknowledged.receipt.fact.at,
      plan: { ...plan, founding, register, attempted, acknowledged } });
    expect((await command(ctx, ["create", "not-a-founder", "--handle", "@owner"])).lines.join("\n")).toContain("forbidden");
    expect(summaries).toBe(3);
    expect(submitted).toHaveLength(1);
  }
});

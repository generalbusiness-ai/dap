import { expect, test } from "vitest";
import type { Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, timeMs } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import { command, memoryStore, type Context } from "../src/index.ts";

// Configured-service acknowledgements and refusal replies are SCRIPTED.
// This tests local revision selection, not Native genesis or found authority.
test("expired retained install custody selects a fresh open-register revision without a summary; a mismatched incarnation keeps the actual read path", async () => {
  const service = "https://selector.test", store = memoryStore();
  let now = Date.parse("2099-01-01T00:00:00Z"), summaries = 0;
  let receipt!: Receipt;
  const submitted: SignedIntent[] = [];
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === "/v1/scopes" && init?.method === "POST") {
      const given = JSON.parse(init.body!) as { creation: SignedIntent; definition: Receipt["definition"] };
      receipt = { fact: { at: { scope: scopeIdOf({ v: 1, kind: "register", definition: given.definition, creator: null, cause: intentDigest(given.creation.intent), ordinal: 0 }), kind: "register", inc: newIncarnation(new Uint8Array(16).fill(7)) }, seq: 0, hash: textDigest("SCRIPTED acknowledged genesis") }, definition: given.definition, intent: intentDigest(given.creation.intent), effects: [], sends: [], epoch: 0 };
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
  expect((await command(ctx, ["install", "--plan", service, "--host", "none", "--register-policy", "open"])).code).toBe(0);
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
});

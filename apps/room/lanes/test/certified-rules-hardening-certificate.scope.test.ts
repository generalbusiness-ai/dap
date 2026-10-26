import { expect, test } from "vitest";
import { canonicalize, factRefOf, utf8 } from "@generalbusiness/dap-bytes";
import { RULES_CERTIFICATE_KIND, RULES_PATTERNS, platform, rulesPolicyProposalV11 } from "@generalbusiness/dap-platform";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { CAPABILITY_CODE } from "@generalbusiness/dap-scope";
import { rita, routed } from "../../../../packages/scope/test/repository.ts";
import { effectFixture, reader } from "../../../../packages/scope/test/fixtures-native.ts";
import { certificateGate, hardeningCertificate, hardeningEntries, hardeningNativeRoom, openHardeningCertificate, publishHardeningCertificate } from "../../../../packages/scope/test/certified-rules-hardening-fixture.ts";

function policy() {
  const proposed = rulesPolicyProposalV11({ approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: [
    { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
    { name: "readme", patterns: ["README.md"], approvals: 1, approver: "change.review", checks: [], class: "content" },
    { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
  ] });
  if (!proposed.ok) return expect.fail("The native witness needs a strict policy");
  return proposed.policy;
}

// Native signing, grants, host certificate parsing, SQLite and rule evaluation
// are real. Git objects and callback scheduling are the fixture's TEST stands.
test("Q12 consumes a certificate once at a fresh revision and keeps the full Destination reference", { timeout: 30_000 }, async () => {
  const room = await hardeningNativeRoom();
  try {
    const p = policy(), destination = await room.G.at(), first = await hardeningCertificate(room, p);
    const publish = (certificate: typeof first) => publishHardeningCertificate(room, p, certificate.request, certificate.certificate, certificate.proof, certificate.proofBytes);
    const firstPublished = await publish(first);
    expect(firstPublished, canonicalize(firstPublished)).toMatchObject({ answer: "accepted" });
    const configured = structuredClone(await room.Q.item(0));
    expect(await publish(first)).toMatchObject({ answer: "refused", reason: "guard-failed", name: "rules-certificate-used" });
    expect(await room.Q.item(0)).toEqual(configured);
    const second = await hardeningCertificate(room, p);
    expect(second.request.seq).toBeGreaterThan(first.request.seq);
    expect(second.request.at).toEqual(destination);
    expect(first.request.at).toEqual(destination);
    expect(await publish(second)).toMatchObject({ answer: "accepted" });
    const newer = structuredClone(await room.Q.item(0));
    expect(newer.revision).toBeGreaterThan(configured.revision);
    expect(await publish(first)).toMatchObject({ answer: "refused", reason: "guard-failed", name: "rules-certificate-stale" });
    expect(await room.Q.item(0)).toEqual(newer);
    expect(newer.values["certificate"]).toMatchObject({ request: second.request, certificate: second.certificate });
  } finally { room.life.release(); }
});

for (const boundary of ["heldBeforeSend", "heldRead", "heldAnswer"] as const) {
  test(`G15 names a real intervening native fact at ${boundary}`, { timeout: 30_000 }, async () => {
    const room = await hardeningNativeRoom(), gate = certificateGate();
    let running: ReturnType<typeof effectFixture> | null = null;
    try {
      const p = policy(), configured = structuredClone(await room.Q.item(0));
      room.control[boundary] = gate.hold;
      const request = await openHardeningCertificate(room, p);
      running = effectFixture([room.G], room.life.wait);
      await Promise.race([gate.entered, running.then(() => expect.fail("The actual certificate boundary must be reached"))]);
      const heldAnswer = room.control.answers.at(-1);
      if (boundary === "heldAnswer") expect(heldAnswer).toMatchObject({ result: "confirmed", evidence: { basis: "own-answer" } });
      // Two signed entries distinguish the observed head from the first
      // intervening entry. No head, operation, input or answer is fabricated.
      const first = await room.G.did(rita, "read-token", { on: 0, expected: await room.G.expected({ on: 0 }), fields: { hours: 1 } });
      const second = await room.G.did(rita, "read-token", { on: 0, expected: await room.G.expected({ on: 0 }), fields: { hours: 1 } });
      expect(second).toBeGreaterThan(first); expect(first).toBeGreaterThan(request.seq);
      gate.release(); room.control[boundary] = null; await running; running = null;
      await room.pause(room.nodes);
      expect(room.providerCalls).toHaveLength(boundary === "heldBeforeSend" ? 0 : 1);
      expect(room.control.answers).toHaveLength(1);
      const entries = await hardeningEntries(room.G);
      const outcome = entries.find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
      if (!outcome || outcome.input.type !== "outcome") return expect.fail("The actual interrupted native outcome is required");
      expect(outcome.input.kind).toBe(RULES_CERTIFICATE_KIND);
      expect(outcome.effects).toEqual(expect.arrayContaining([expect.objectContaining({ effect: "attempt", operation: `${request.seq}:0`, selected: boundary === "heldAnswer" ? false : null })]));
      const declined = outcome.effects.filter(effect => effect.effect === "value" && effect.slot === "rulesCertificateDeclined");
      expect(declined).toHaveLength(1);
      const value = declined[0];
      if (!value || value.effect !== "value") return expect.fail("A named native decline value is required");
      expect(value.value).toMatchObject({ answer: "certificate-declined", request });
      const named = value.value as { answer: string; request: typeof request; interveningFact: typeof request };
      expect(Object.keys(named).sort()).toEqual(["answer", "interveningFact", "request"]);
      expect(utf8(canonicalize(named)).length).toBeLessThanOrEqual(1024);
      expect(named.interveningFact.seq).toBeGreaterThanOrEqual(second);
      expect(named.interveningFact).toEqual(factRefOf(entries[named.interveningFact.seq]!));
      expect((await room.G.item(0)).values["rulesCertificateDeclined"]).toEqual(named);
      if (boundary === "heldAnswer") {
        expect(outcome.input.result).toBe("confirmed");
        expect(outcome.input.evidence).toEqual(heldAnswer!.evidence);
        expect(canonicalize(outcome.input.evidence)).toBe(canonicalize(heldAnswer!.evidence));
        expect(named.interveningFact).toEqual(factRefOf(entries[outcome.seq - 1]!));
        const replayed = await verify(httpSource("https://scopes.test", { fetch: routed, reader }), { mode: "replay", scope: room.G.name, platform, grants: "proven", anchors: [], capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, head: (await room.G.summary()).at });
        expect([replayed.report.result, replayed.why ?? null]).toEqual(["consistent", null]);
      } else {
        expect(outcome.input).toMatchObject({ result: "refused", evidence: { basis: "own-answer", body: named } });
      }
      expect(await room.Q.item(0)).toEqual(configured);
    } finally {
      gate.release(); room.control[boundary] = null;
      if (running) await running;
      room.life.release();
    }
  });
}

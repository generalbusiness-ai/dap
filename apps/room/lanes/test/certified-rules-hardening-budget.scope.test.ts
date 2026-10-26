import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type MemberRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, factRefOf, isRecord, utf8 } from "@generalbusiness/dap-bytes";
import { CONFIGURATION_DOMAIN, HARDENED_CERTIFIED_RULES_COHORT, RULES_PATTERNS, certifiedCaptureBudgetV15, certifiedPublicationStateV15, platform, rulesPolicyProposalV11, type CertifiedPublicationStateV15, type RulesPolicyV11 } from "@generalbusiness/dap-platform";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { valueDigest } from "@generalbusiness/dap-derive";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { CAPABILITY_CODE } from "@generalbusiness/dap-scope";
import { reader } from "../../../../packages/scope/test/fixtures-native.ts";
import { rita, routed, una } from "../../../../packages/scope/test/repository.ts";
import { soon } from "../../../../packages/scope/test/net.ts";
import { configureHardeningRules, hardeningEntries, hardeningItems, hardeningNativeRoom } from "../../../../packages/scope/test/certified-rules-hardening-fixture.ts";
import { changeDemo3 } from "../src/index.ts";

type RulesCheckV11 = RulesPolicyV11["checks"][number];

// One monotone grammar-valid padding class. These future paths do not touch
// the proposed file and grant no authority. Five extents keep each list and
// each pattern inside its actual grammar bounds, including at the endpoints.
const PADDING_MAX = 5 * 32 * 220;
function paddedPolicy(checks: readonly RulesCheckV11[], padding: number): RulesPolicyV11 {
  let remaining = padding;
  const extents: RulesPolicyV11["extents"] = [
    { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
    { name: "readme", patterns: ["README.md"], approvals: 0, allowZeroApprovals: true, approver: "change.review", checks: [], class: "content" },
    ...Array.from({ length: 5 }, (_, extent) => {
      const patterns = Array.from({ length: 32 }, (_, index) => {
        const size = Math.min(220, remaining); remaining -= size;
        return `future-${extent}/${String(index).padStart(2, "0")}-${"a".repeat(size)}.md`;
      });
      return { name: `padding-${extent}`, patterns, futurePatterns: [...patterns], approvals: 0, allowZeroApprovals: true,
        approver: "change.review", checks: [], class: "content" as const };
    }),
    { name: "other", patterns: [], approvals: 0, allowZeroApprovals: true, approver: "change.review", checks: [], class: "content" },
  ];
  const proposed = rulesPolicyProposalV11({ approvals: 0, allowZeroApprovals: true, ownerMayReview: false, checks, labels: [], extents });
  if (!proposed.ok || remaining !== 0) return expect.fail("The boundary construction must remain a strict complete policy");
  return proposed.policy;
}

function capturedRecord(entry: Entry): CertifiedPublicationStateV15 {
  const effect = entry.effects.find(effect => effect.effect === "value" && effect.slot === "passes");
  if (!effect || effect.effect !== "value") return expect.fail("The actual native capture must store its complete passes record");
  const record = certifiedPublicationStateV15(effect.value, PROPOSED_BOUNDS);
  if (!record) return expect.fail("The native passes record must decode under the G15 codec");
  return record;
}

// Native signatures, grants, lane jobs, current-key observations, retained
// check proofs, SQLite entries and replay are real. Git objects, callback
// scheduling and the checker's known result use explicit TEST stands. No live
// checker runner or external provider HTTP is exercised.
test("G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes", { timeout: 180_000 }, async () => {
  const room = await hardeningNativeRoom(), { life, host, D, M, Q, G, nodes, pause } = room;
  try {
    let base = host.stand.refs.get("refs/heads/main");
    if (!base) return expect.fail("The native room must have its actual Git head");
    const secret = b64url(new Uint8Array(32).fill(94)); // Public TEST invitation seed.
    const invitation = await M.did(rita, "invite-member", { fields: { handle: "@una", role: "checker", ...invitationIssueFields(HARDENED_CERTIFIED_RULES_COHORT.membership, secret), inviteEnds: soon(3600) } });
    await M.did(una, "join", { fields: invitationRedemptionFields(HARDENED_CERTIFIED_RULES_COHORT.membership, await M.at(), invitation, una.key, secret) });
    const checker: MemberRef = { membership: await M.at(), member: "@una" };
    const checks: RulesCheckV11[] = [];
    for (let index = 0; index < 32; index++) {
      const name = `c${String(index).padStart(2, "0")}`;
      const value = { name, image: `sha256:${"7".repeat(64)}`, environment: [], steps: [["check", name]],
        judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds: 60, outputBytes: 65536 } };
      const configuration = valueDigest(CONFIGURATION_DOMAIN, value);
      expect(await Q.stub.submit(await Q.intent(rita, "keep-configuration", { fields: { name, digest: configuration } }), [], { values: [canonicalize(value)] })).toMatchObject({ answer: "accepted" });
      checks.push({ name, configuration, required: true, checker });
    }
    await configureHardeningRules(room, paddedPolicy(checks.map((check, index) => ({ ...check, required: index === 0 })), 0));
    const declaration = canonicalize(changeDemo3), digest = definitionDigest(changeDemo3);
    expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest, name: "change" } }), [], { values: [declaration] })).toMatchObject({ answer: "accepted" });
    const prepare = async (name: string) => {
      const laneBase = base;
      if (!laneBase) return expect.fail("Each native lane needs the actual Git base");
      const opening = await D.stub.submit(await D.intent(rita, "open-pr", { expected: await D.expected({ repository: 0 }), fields: { definition: digest, title: name, draft: false } }), [], { values: [declaration] });
      if (opening.answer !== "accepted") return expect.fail(`A genuine native lane must open: ${canonicalize(opening)}`);
      const lane = life.platform((await D.created(opening.receipt.fact.seq)).name); nodes.push(lane); await pause(nodes);
      await lane.did(rita, "ask-rules", { on: 0, expected: await lane.expected({ on: 0 }) }); await pause(nodes);
      const rules = (await lane.summary()).value.items.find(item => item.type === "rules");
      if (!rules) return expect.fail("The lane must retain its real rules reply");
      const content = `# ${name}\n`, path = `${name}.md`;
      const source = await lane.did(rita, "propose-file", { expected: await lane.expected({ proposal: 0 }), fields: { base: laneBase, path, digest: digestBytes(utf8(content)), size: utf8(content).length, content } });
      const file = { path, entry: factRefOf((await hardeningEntries(lane))[source]!), digest: digestBytes(utf8(content)) };
      const manifest = await lane.did(rita, "propose-manifest", { expected: await lane.expected({ proposal: 0 }), fields: { base: laneBase, files: [file] } });
      return { lane, rules, manifest, fact: factRefOf((await hardeningEntries(lane))[manifest]!) };
    };
    const merge = async (prepared: Awaited<ReturnType<typeof prepare>>) => {
      const seq = await prepared.lane.did(rita, "merge", { expected: await prepared.lane.expected({ proposal: 0, manifest: prepared.manifest, rules: prepared.rules.id }), fields: { manifest: prepared.manifest, reports: [] } });
      await pause(nodes);
      const operation = factRefOf((await hardeningEntries(prepared.lane))[seq]!);
      const publication = (await hardeningItems(G, "publication")).find(item => canonicalize(item.refs["operation"]) === canonicalize(operation));
      if (!publication) return expect.fail("The real reserve send must create a native publication");
      return publication;
    };
    const small = await prepare("template");
    const baseline = await merge(small);
    const template = (await hardeningEntries(G)).find(entry => entry.effects.some(effect => effect.effect === "value" && effect.item === baseline.id && effect.slot === "passes"));
    if (!template) return expect.fail("One real small native capture supplies the exact envelope template");
    const smallRecord = capturedRecord(template);
    expect(smallRecord.policy.required).toHaveLength(1); expect(smallRecord.generations).toEqual([]);
    const smallStage = await small.lane.item(small.manifest), firstCheck = checks[0]!;
    const smallJob = await small.lane.did(rita, "request-check", { expected: await small.lane.expected({ manifest: small.manifest, proposal: 0, rules: small.rules.id }), fields: { manifest: small.manifest, name: firstCheck.name, configuration: firstCheck.configuration } });
    await pause(nodes);
    await small.lane.did(una, "check", { expected: await small.lane.expected({ job: smallJob, rules: small.rules.id, proposal: 0, manifest: small.manifest }), fields: { job: smallJob, tree: smallStage.values["tree"]!, configuration: firstCheck.configuration, outcome: "passed" } });
    await pause(nodes);
    expect((await hardeningItems(G, "publication")).find(item => item.id === baseline.id)).toMatchObject({ state: "cleaned" });
    base = host.stand.refs.get("refs/heads/main");
    if (!base) return expect.fail("The template publication must leave an actual Git head");
    const admitted = await prepare("admitted");

    // Forecast exact upcoming certificate and Q12 positions from paused real
    // journals. Hashes/digests have fixed canonical widths. No native retry is
    // used to find the boundary; only this local pure padding axis is searched.
    const boundary = async (manifest: FactRef) => {
      const q = await Q.summary(), g = await G.summary(), destination = await G.at();
      const forecast = (padding: number) => {
        const p = paddedPolicy(checks, padding), proposal = rulesPolicyProposalV11(p);
        if (!proposal.ok) return expect.fail("The pure candidate must remain strict");
        const record = structuredClone(smallRecord);
        const envelope = record.policy.input.extents;
        if (!isRecord(envelope) || !isRecord(envelope["certificate"])) return expect.fail("The actual capture envelope must retain its certificate");
        envelope["policy"] = p; envelope["proposal"] = proposal.digest;
        const certificate = envelope["certificate"];
        certificate["request"] = { ...smallRecord.policy.manifest, at: destination, seq: g.at.seq + 1 };
        certificate["certificate"] = { ...smallRecord.policy.manifest, at: destination, seq: g.at.seq + 2 };
        record.policy.observation.head = { ...q.at, seq: q.at.seq + 1 };
        record.policy.observation.revision = q.at.seq + 1;
        if (record.policy.observation.content.asked !== "rules") return expect.fail("The native capture must contain a rules observation");
        record.policy.observation.content.extents = valueDigest("artroom-rules-extents-2", envelope);
        record.policy.observation.content.checks = checks.map(check => ({ ...check, checker: check.checker.member }));
        record.policy.required = checks;
        record.policy.manifest = manifest;
        if (template.input.type !== "outcome") return expect.fail("The capture template must be an actual outcome");
        // Certificate opening/outcome are the next two G15 entries. The
        // following real reserve delivery opens judge as operation zero.
        const operation = `${g.at.seq + 3}:0` as const;
        const shell: Entry = { ...template, input: { ...template.input, operation }, effects: template.effects.map(effect =>
          effect.effect === "value" && effect.slot === "requiredChecks" ? { ...effect, value: checks.map(check => check.name) }
            : effect.effect === "attempt" && typeof effect.operation === "string" ? { ...effect, operation } : effect) };
        const budget = certifiedCaptureBudgetV15(record, PROPOSED_BOUNDS, shell);
        return { p, record, budget };
      };
      let low = 0, high = PADDING_MAX;
      expect(forecast(low).budget.admitted).toBe(true); expect(forecast(high).budget.admitted).toBe(false);
      while (low + 1 < high) { const middle = Math.floor((low + high) / 2); if (forecast(middle).budget.admitted) low = middle; else high = middle; }
      return { last: forecast(low), next: forecast(high), padding: low };
    };
    const positive = await boundary(admitted.fact);
    expect(positive.next.budget.captureEntryBytes - positive.last.budget.captureEntryBytes).toBe(2);
    expect(positive.last.budget.captureEntryBytes).toBeLessThanOrEqual(PROPOSED_BOUNDS.entryBytes);
    expect(positive.next.budget.captureEntryBytes).toBeGreaterThan(PROPOSED_BOUNDS.entryBytes);
    expect(certifiedPublicationStateV15(positive.next.record, PROPOSED_BOUNDS)).not.toBeNull();
    await configureHardeningRules(room, positive.last.p);
    const publication = await merge(admitted);
    const actualCapture = (await hardeningEntries(G)).find(entry => entry.effects.some(effect => effect.effect === "value" && effect.item === publication.id && effect.slot === "passes"));
    if (!actualCapture) return expect.fail("The maximal constructed admitted policy must really capture");
    const actualRecord = capturedRecord(actualCapture), actualBudget = certifiedCaptureBudgetV15(actualRecord, PROPOSED_BOUNDS, actualCapture);
    expect(actualBudget.captureEntryBytes).toBe(positive.last.budget.captureEntryBytes);
    expect(utf8(canonicalize(actualCapture)).length).toBeLessThanOrEqual(PROPOSED_BOUNDS.entryBytes);
    expect(actualRecord.policy.required).toEqual(checks);

    const staged = await admitted.lane.item(admitted.manifest);
    expect(staged.values["tree"]).toMatch(/^[0-9a-f]{40}$/);
    expect((await hardeningEntries(G)).flatMap(entry => entry.effects).filter(effect => effect.effect === "operation" && effect.for === publication.id && effect.kind === "push")).toEqual([]);
    const nativeProofs = new Map<string, { job: FactRef; result: FactRef }>();
    for (const descriptor of checks) {
      const job = await admitted.lane.did(rita, "request-check", { expected: await admitted.lane.expected({ manifest: admitted.manifest, proposal: 0, rules: admitted.rules.id }), fields: { manifest: admitted.manifest, name: descriptor.name, configuration: descriptor.configuration } });
      await pause(nodes);
      const result = await admitted.lane.did(una, "check", { expected: await admitted.lane.expected({ job, rules: admitted.rules.id, proposal: 0, manifest: admitted.manifest }), fields: { job, tree: staged.values["tree"]!, configuration: descriptor.configuration, outcome: "passed" } });
      await pause(nodes);
      const laneEntries = await hardeningEntries(admitted.lane);
      expect(laneEntries[result]!.input).toMatchObject({ type: "act", signed: { intent: { kind: "check", actor: una.key } } });
      nativeProofs.set(descriptor.name, { job: factRefOf(laneEntries[job]!), result: factRefOf(laneEntries[result]!) });
    }
    const final = (await hardeningItems(G, "publication")).find(item => item.id === publication.id);
    expect(final).toMatchObject({ state: "cleaned" });
    expect(host.stand.refs.get("refs/heads/main")).toBe(staged.values["integration"]);
    // A second coherent construction uses its own exact upcoming positions.
    // It is the first overflowing member, not an arbitrary oversized record.
    base = host.stand.refs.get("refs/heads/main");
    if (!base) return expect.fail("The 32-proof publication must leave an actual Git head");
    const overflow = await prepare("overflow");
    const negative = await boundary(overflow.fact);
    expect(negative.last.budget.admitted).toBe(true); expect(negative.next.budget.admitted).toBe(false);
    expect(certifiedPublicationStateV15(negative.next.record, PROPOSED_BOUNDS)).not.toBeNull();
    await configureHardeningRules(room, negative.next.p);
    const rejected = await merge(overflow);
    expect(rejected).toMatchObject({ state: "not-reserved", values: { reason: "evidence-too-large" } });
    expect((await hardeningEntries(G)).flatMap(entry => entry.effects).filter(effect => effect.effect === "value" && effect.item === rejected.id && effect.slot === "passes")).toEqual([]);
    expect(host.stand.refs.get("refs/heads/main")).toBe(base);


    const entries = await hardeningEntries(G);
    const records = entries.flatMap(entry => entry.effects.filter(effect => effect.effect === "value" && effect.item === publication.id && effect.slot === "passes").map(effect => {
      if (effect.effect !== "value") return expect.fail("A passes effect must be a value");
      const record = certifiedPublicationStateV15(effect.value, PROPOSED_BOUNDS);
      if (!record) return expect.fail("Every actually stored generation record must decode");
      return { entry, record };
    }));
    const complete = records.find(({ record }) => record.generations.length === 32 && record.generations.every(row => row.passed && row.proof));
    if (!complete) return expect.fail("All 32 complete native proofs must coexist in one actually stored record");
    expect(new Set(complete.record.generations.map(row => row.proof!.key))).toEqual(new Set([una.key]));
    expect(complete.record.generations.map(row => row.name).sort()).toEqual(checks.map(check => check.name));
    for (const row of complete.record.generations) {
      const native = nativeProofs.get(row.name), descriptor = checks.find(check => check.name === row.name)!;
      expect(native).toBeDefined();
      expect(row).toMatchObject({ name: descriptor.name, job: native!.job, passed: true,
        proof: { result: native!.result, key: una.key, checker, configuration: descriptor.configuration, tree: staged.values["tree"] } });
    }
    for (const entry of entries) expect(utf8(canonicalize(entry)).length, `actual complete stored G15 entry ${entry.seq}`).toBeLessThanOrEqual(PROPOSED_BOUNDS.entryBytes);
    expect(utf8(canonicalize(complete.entry)).length).toBeGreaterThan(utf8(canonicalize(complete.record)).length);
    const replayed = await verify(httpSource("https://scopes.test", { fetch: routed, reader }), { mode: "replay", scope: G.name, platform, grants: "proven", anchors: [], capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, head: (await G.summary()).at });
    expect([replayed.report.result, replayed.why ?? null]).toEqual(["consistent", null]);
    console.info("G15 native hardening bytes", JSON.stringify({ entryBytes: PROPOSED_BOUNDS.entryBytes, maxStoredEntryBytes: Math.max(...entries.map(entry => utf8(canonicalize(entry)).length)), maxPassesRecordBytes: Math.max(...records.map(({ record }) => utf8(canonicalize(record)).length)), proof32RecordBytes: utf8(canonicalize(complete.record)).length, proof32EntryBytes: utf8(canonicalize(complete.entry)).length, positiveCaptureForecastBytes: positive.last.budget.captureEntryBytes, positiveCaptureBudgetBytes: actualBudget.captureEntryBytes, positiveCaptureActualBytes: utf8(canonicalize(actualCapture)).length, negativeNextForecastBytes: negative.next.budget.captureEntryBytes }));
  } finally { life.release(); }
});

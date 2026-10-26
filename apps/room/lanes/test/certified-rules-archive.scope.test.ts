/** Actual signed R19/D18/M8/Q11/G14 and declared lane histories. Provider
 * objects, package-independent host/clock/scheduler and reviewed archive
 * policies are TEST stands; no live service or production admission. */
import { runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest, type FactRef, type Input, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, factRefOf, isPlatformDefinition, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_PATTERNS, RULES_POLICY_VALUE_V11, RULES_TREE_PROOF, platform, rulesPolicyProposalV11 } from "@generalbusiness/dap-platform";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { localRetainedPlan, ownersOf, outcomeValueDomains, validateDefinition, valueDigest, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { archiveSource, verifyArchive } from "@generalbusiness/dap-replay";
import { journalRef, type JournalObject } from "@generalbusiness/dap-git/journal";
import { readJournalRepositoryArchive } from "@generalbusiness/dap-git/journal-reader";
import { certifiedNativeRoom, configureRules } from "../../../../packages/scope/test/certified-rules-fixture.ts";
import { rita, una } from "../../../../packages/scope/test/repository.ts";
import { reader } from "../../../../packages/scope/test/fixtures-native.ts";
import { soon } from "../../../../packages/scope/test/net.ts";
import { archiveSql } from "../../../../packages/scope/test/support/archive.ts";
import { localClone } from "../../../../packages/scope/test/support/local-clone.ts";
import { ArchiveBudget } from "../../../../packages/scope/src/archive-budget.ts";
import { ArchiveRows } from "../../../../packages/scope/src/archive-row.ts";
import { ArchiveFrontiers } from "../../../../packages/scope/src/archive-frontier-store.ts";
import { planPublishedArchivePass } from "../../../../packages/scope/src/archive-build.ts";
import { FixtureArchiveSourcePins, type FixtureArchiveSourceBirth } from "../../../../packages/scope/src/archive-source-pins.ts";
import type { ReviewedArchivePolicy } from "../../../../packages/scope/src/archive-inventory.ts";
import type { DestinationRepository } from "../../../../packages/scope/src/destination-host.ts";
import { CAPABILITY_CODE } from "../../../../packages/scope/src/ports.ts";
import { changeDemo } from "../src/index.ts";

const EXTENTS_DOMAIN = "artroom-rules-extents-2";
const inline = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
function reviewed(pin: PlatformDefinition | Digest): ReviewedArchivePolicy {
  const native = isPlatformDefinition(pin) ? platform(pin) : null;
  if (!native && pin !== definitionDigest(changeDemo)) throw Error("No TEST policy for an unknown pin");
  const checked = validateDefinition(native?.data ?? changeDemo, PROPOSED_BOUNDS, RULE_PROFILES,
    native ? { platform: true, outcomeValues: outcomeValueDomains(native.data, native.rules) } : {});
  if (!checked.ok) throw Error("TEST policy needs the actual validated owner declaration");
  const owners = new Map<string, Map<string, OperationRules>>();
  if (native && isPlatformDefinition(pin)) {
    const code = ownersOf(checked.definition, { named: pin, rules: native.rules }, null), kinds = new Map<string, OperationRules>();
    for (const kind of Object.keys(native.data.outcomes ?? {})) {
      const rules = code?.rules(pin, kind); if (!rules) throw Error("Actual native outcome owner required");
      kinds.set(kind, rules);
    }
    owners.set(pin, kinds);
  }
  return { review: "TEST exact native/declaration coverage; no production permission", entryTypes: inline,
    ...(!native ? { declaration: canonicalize(checked.definition.declared) } : {}),
    support: { named: pin, definition: checked.definition, ...(!native ? { capabilities: CAPABILITY_CODE } : {}), owners, records: new Map(), preparations: new Map() } };
}

// A new120s case: actual certificate+publication+native reserve, four complete
// archives and real local Git clone/offline replay. No historical deadline changes.
test("certified native policy and proof plus its consumed single policy envelope survive Mark and offline replay", { timeout: 120_000 }, async context => {
  const room = await certifiedNativeRoom(), { life, host, R, D, M, Q, G, nodes, pause } = room;
  try {
    const C = ARCHIVE_CERTIFIED_RULES_COHORT;
    expect((await D.sealed())[0]!.entry.input).toMatchObject({ type: "genesis", seed: { definition: C.directory } });
    expect((await Q.sealed())[0]!.entry.input).toMatchObject({ type: "genesis", seed: { definition: C.rules } });
    expect((await G.sealed())[0]!.entry.input).toMatchObject({ type: "genesis", seed: { definition: C.destination } });
    const firstHead = host.stand.refs.get("refs/heads/main"); expect(firstHead).toMatch(/^[0-9a-f]{40}$/);
    const proposal = rulesPolicyProposalV11({ approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "readme", patterns: ["README.md"], approvals: 1, approver: "change.review", checks: [], class: "content" },
      { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
    if (!proposal.ok) throw Error("Strict policy required");
    const certified = await configureRules(room, proposal.policy);
    const configured = await Q.item(0);
    expect(configured.values).toMatchObject({ configured: true, policy: proposal.policy, proposal: proposal.digest });
    const envelope = { configured: true, policy: configured.values["policy"], proposal: configured.values["proposal"], certificate: configured.values["certificate"] };
    const envelopeDigest = valueDigest(EXTENTS_DOMAIN, envelope);
    const rulesHead = factRefOf((await Q.sealed()).at(-1)!.entry);

    // Real lane creation/review/reserve; no CLI precheck or supplied observation.
    const change = definitionDigest(changeDemo);
    expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest: change, name: "change" } }), [], { values: [canonicalize(changeDemo)] })).toMatchObject({ answer: "accepted" });
    const opening = await D.stub.submit(await D.intent(rita, "open-pr", { fields: { definition: change, title: "TEST certified archive consumer", draft: false }, expected: await D.expected({ repository: 0 }) }), [], { values: [canonicalize(changeDemo)] });
    if (opening.answer !== "accepted") throw new Error(`open-pr was not accepted: ${JSON.stringify(opening)}`);
    const opened = opening.receipt.fact.seq;
    const L = life.platform((await D.created(opened)).name); nodes.push(L); await pause(nodes);
    const laneRules = (await L.summary()).value.items.find(item => item.type === "rules");
    if (!laneRules) throw Error("Actual native lane rules item required");
    const secret = b64url(new Uint8Array(32).fill(94)); // Public TEST invitation only.
    const invitation = await M.did(rita, "invite-member", { fields: { handle: "@una", role: "member", inviteEnds: soon(3600), ...invitationIssueFields(C.membership, secret) } });
    await M.did(una, "join", { fields: invitationRedemptionFields(C.membership, await M.at(), invitation, una.key, secret) });
    const content = "# Native certified archive consumer\n";
    const manifest = await L.did(rita, "propose-file", { fields: { base: firstHead!, path: "archive-native.md", digest: digestBytes(utf8(content)), size: utf8(content).length, content }, expected: await L.expected({ proposal: 0 }) });
    await L.did(una, "review-verdict", { expected: await L.expected({ manifest, proposal: 0 }), fields: { manifest, verdict: "approve" } });
    await L.did(rita, "merge", { expected: await L.expected({ proposal: 0, manifest, rules: laneRules.id }), fields: { manifest, reports: [] } }); await pause(nodes);
    const gHistory = await G.sealed();
    const observed = gHistory.flatMap(sealed => "observed" in sealed.entry.input ? (sealed.entry.input.observed ?? []).flatMap(use => {
      const observation = use.observation;
      return "subject" in observation && observation.subject === "rules" && observation.content.asked === "rules" && observation.content.extents === envelopeDigest
        ? [{ consumer: factRefOf(sealed.entry), observation }] : [];
    }) : []);
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.some(row => canonicalize(row.observation.of) === canonicalize(rulesHead.at) && row.observation.head.seq >= rulesHead.seq)).toBe(true);
    const heldEnvelope = await G.stub.retained(reader, "value", envelopeDigest, EXTENTS_DOMAIN);
    expect(heldEnvelope).toMatchObject({ ok: true }); if (!heldEnvelope.ok) throw Error("Real consumed observation envelope required");
    expect(heldEnvelope.value.bytes).toBe(canonicalize(envelope));
    const nativeValues = [
      { scope: G, digest: proposal.digest, domain: RULES_POLICY_VALUE_V11.domain },
      { scope: G, digest: certified.proof, domain: RULES_TREE_PROOF.domain },
      { scope: G, digest: envelopeDigest, domain: EXTENTS_DOMAIN },
    ];
    const expectedValues = await Promise.all(nativeValues.map(async value => {
      const retained = await value.scope.stub.retained(reader, "value", value.digest, value.domain);
      if (!retained.ok) throw Error("Actual native named value required");
      return { digest: value.digest, domain: value.domain, bytes: retained.value.bytes };
    }));

    // Inspector reads are the TEST source oracle, never new archive admission.
    // Private R19/M8 supply actual birth/credential anchors, not self archives.
    const histories = await Promise.all([D, Q, G, L].map(async scope => ({ scope, rows: await scope.sealed() })));
    const sources = new Map(histories.flatMap(({ rows }) => rows.flatMap(sealed => sealed.entry.uses.map(use => [canonicalize(use.fact.at), use.fact.at] as const))));
    const policies = new Map<PlatformDefinition | Digest, ReviewedArchivePolicy>([C.register, C.directory, C.membership, C.rules, C.destination, change].map(pin => [pin, reviewed(pin)]));
    const outcome = gHistory.find(sealed => sealed.entry.seq === certified.certificate.seq);
    if (!outcome || outcome.entry.input.type !== "outcome") throw Error("Real certificate outcome required");
    const gPolicy = policies.get(C.destination)!;
    const rules = gPolicy.support.owners.get(C.destination)?.get(outcome.entry.input.kind);
    if (!rules) throw Error("Actual certificate owner selector required");
    const nativePlan = localRetainedPlan(gPolicy.support.definition, outcome.entry, outcome.hash, rules, PROPOSED_BOUNDS);
    const outcomeValues = nativePlan.dependencies.flatMap(({ dependency }) => dependency.mode === "required" && dependency.consumer === "outcome-value" && dependency.key.kind === "value" ? [dependency.key] : []);
    expect(outcomeValues).toEqual([
      { kind: "value", domain: RULES_POLICY_VALUE_V11.domain, digest: proposal.digest },
      { kind: "value", domain: RULES_TREE_PROOF.domain, digest: certified.proof },
    ]);
    const births: FixtureArchiveSourceBirth[] = [];
    for (const at of sources.values()) {
      const birth = (await life.platform(at.scope).sealed())[0];
      if (!birth || birth.entry.input.type !== "genesis" || canonicalize(birth.entry.at) !== canonicalize(at)) throw Error("Actual full source birth required");
      const pin = birth.entry.input.seed.definition;
      expect(policies.has(pin)).toBe(true);
      births.push({ at, birth: { bytes: canonicalize(birth.entry), hash: birth.hash }, ...(pin === change ? { declaration: canonicalize(changeDemo) } : {}) });
    }
    const fixtureSources = new FixtureArchiveSourcePins(births, PROPOSED_BOUNDS, new ArchiveBudget());
    const repository = (await D.item(0)).values["repository"] as unknown as DestinationRepository;
    const replayScopes = await Promise.all(histories.map(({ scope }) => scope.at()));
    const objects = new Map<string, JournalObject>(), refs = new Map<string, string>(), anchors = new Map<string, FactRef>();
    const costs: unknown[] = [];
    for (const { scope, rows } of histories) {
      const at = await scope.at(), last = rows.at(-1)!;
      const result = await life.wait(() => runInDurableObject(scope.object, async (_instance, state) => {
        const sql = archiveSql(state), budget = new ArchiveBudget(), owner = new ArchiveRows(sql, at);
        const target = owner.target(repository, "sha1", budget);
        const made = await planPublishedArchivePass(sql, { at, through: { seq: last.entry.seq, hash: last.hash }, after: null,
          bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: soon(0), fixtureSources, replayScopes }, budget);
        if (!made.ok) return { ok: false as const, result: made, cost: budget.admitted() };
        const source = { object: async (id: string, maximum: number) => {
          const object = made.archive.objects.find(row => row.id === id);
          return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
        } };
        const frontiers = new ArchiveFrontiers(sql, { at, repository: digestBytes(utf8(canonicalize(target.repository))), format: "sha1" });
        const prepared = await frontiers.prepareFromSource(source, made.mark, null, budget);
        const confirmed = sql.transaction(() => {
          owner.markAttempt(made.mark, soon(0), budget); frontiers.stage(prepared, budget);
          frontiers.promote(prepared, budget); return owner.confirm(made.archive.commit, budget).confirmed!;
        });
        return { ok: true as const, archive: made.archive, anchors: made.anchors ?? [], confirmed, cost: budget.admitted() };
      }));
      expect(result.ok).toBe(true); if (!result.ok) throw Error("Actual full archive plan/Mark required");
      expect(result.confirmed).toMatchObject({ commit: result.archive.commit, through: { seq: last.entry.seq, hash: last.hash }, layout: 2, anchorsPublished: true });
      for (const object of result.archive.objects) objects.set(object.id, object);
      for (const fact of result.anchors) anchors.set(canonicalize(fact), fact);
      refs.set(journalRef(scope.name), result.archive.commit);
      costs.push({ scope: scope.name, cost: result.cost });
      if (scope === G) for (const value of expectedValues) expect(result.archive.selection.objects.some(row => row.key.kind === "value" && row.key.domain === value.domain && row.key.digest === value.digest)).toBe(true);
    }
    expect(refs.has(journalRef(R.name))).toBe(false); expect(refs.has(journalRef(M.name))).toBe(false);
    const directoryBirth = (await D.sealed())[0]!.entry.input;
    if (directoryBirth.type !== "genesis" || !directoryBirth.source) throw Error("Applied D18 Register claim required");
    expect([...anchors.values()]).toContainEqual(directoryBirth.source);
    const cloned = await life.wait(() => localClone(inject("localClone")).archive([...objects.values()].map(object => ({ id: object.id, type: object.type, data: b64url(object.data) })), [...refs].map(([ref, id]) => ({ ref, id }))));
    expect(cloned.fsckPassed).toBe(true);
    const clonedRefs = new Map(cloned.refs.map(row => [row.ref, row.id]));
    const clonedObjects = new Map(cloned.objects.map(object => {
      const data = unb64url(object.data); if (!data) throw Error("Real cloned Git bytes required");
      return [object.id, { type: object.type, data }] as const;
    }));
    objects.clear(); // Every replay below has only offline clone bytes.
    const replay = (scope: typeof G, available = clonedObjects) => life.wait(() => verifyArchive(archiveSource({ open: (at, work) => readJournalRepositoryArchive({
      format: async () => "sha1", resolve: async ref => clonedRefs.get(ref) ?? null,
      object: async (id, limit) => { const object = available.get(id); return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null; },
    }, at, work) }), { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: scope.name,
      head: { seq: histories.find(row => row.scope === scope)!.rows.at(-1)!.entry.seq, hash: histories.find(row => row.scope === scope)!.rows.at(-1)!.hash },
      anchors: [...anchors.values()].map(fact => ({ scope: fact.at.scope, seq: fact.seq, hash: fact.hash })) }));
    for (const { scope } of histories) {
      const verified = await replay(scope);
      expect(verified.kind).toBe("verification"); if (verified.kind !== "verification") throw Error("Offline replay result required");
      expect(verified.verification.report.result).toBe("consistent"); expect(verified.verification.report.incompleteBytes).toBeUndefined();
    }
    // Removing a genuine retained object in a copied offline map is a read
    // dependency witness, not a Native mutation or replacement authority.
    const missingValueResults: unknown[] = [];
    for (const value of expectedValues) {
      const files = [...clonedObjects].filter(([, object]) => object.type === "blob" && new TextDecoder().decode(object.data) === value.bytes);
      expect(files).toHaveLength(1);
      const missing = new Map(clonedObjects); missing.delete(files[0]![0]);
      const refused = await replay(G, missing);
      missingValueResults.push({ domain: value.domain, digest: value.digest, result: refused });
      expect(refused.kind === "archive-failure" || refused.verification.report.result !== "consistent").toBe(true);
    }
    Object.assign(context.task.meta, { certifiedArchive: { certificate: certified, observed: observed.map(row => row.consumer),
      namedValues: expectedValues.map(({ digest, domain }) => ({ digest, domain })), missingValueResults, costs,
      qualification: "Actual signed native family/certificate/publish/consumer and bounded full export, Mark and local Git clone replay; explicit TEST review policies, provider objects/HTTP/clock/scheduler. No hosted or production archive admission, full-family fit or secret-admission claim." } });
  } finally { life.release(); }
});

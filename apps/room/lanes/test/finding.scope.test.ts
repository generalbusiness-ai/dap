import { expect, test } from "vitest";
import type { FactRef, FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, keyIdOfSecret, signIntent, signInvitationProof } from "@generalbusiness/dap-bytes";
import type { AskedOf, Kind } from "@generalbusiness/dap-client";
import { valueDigest } from "@generalbusiness/dap-derive";
import { CONFIGURATION_DOMAIN, firstExtents } from "@generalbusiness/dap-platform";
import { changeFinding } from "../src/index.ts";
import { answered, net, reader } from "./support/graph.ts";
import { WorkspaceStandIn } from "./support/workspace.ts";
import { checkerKey, oid, publicationOf, rita, room, soon, una, vic, type Room } from "./support/room.ts";

const definition = changeFinding;
type Definition = typeof definition;
/** Computed, not the pin: a control that changes one row keeps its setup. `finding-definition.test.ts` holds the pin. */
const digest = definitionDigest(definition);

/** A checker member on the workspace cohort's invitation: a source that holds `change.check` and no `change.review`. */
async function enrolChecker(r: Room, who: typeof una, handle: string, fill: number): Promise<void> {
  const seed = new Uint8Array(32).fill(fill);
  const invitation = await r.M.did(rita, "invite-member", { fields: { handle, role: "checker", inviteKey: keyIdOfSecret(seed), inviteEnds: soon(3600) } });
  await r.M.did(who, "join", { fields: { invitation, proof: signInvitationProof(seed, await r.M.at(), invitation, who.key) } });
}

/**
 * A room whose rules name three sources, with the successor active, and a function that opens a lane and takes a hold on it. The room's scopes, its
 * members and their authority are real. The Git host and the changed set are the labelled stand-ins of `room.ts`, and `WorkspaceStandIn` above. The checker keys
 * sign each answer by hand: no runner and no model reviews anything.
 */
async function sources() {
  const r = await room({ workspaceCohort: true, roster: ["@vic"] });
  await enrolChecker(r, checkerKey, "@check", 90);
  await enrolChecker(r, una, "@una", 91);
  const configuration = { name: "review", image: `sha256:${"e".repeat(64)}`, environment: {}, steps: [["review"]], judged: { passed: { exit: 0, line: "ok" }, failed: { exit: 1, line: "not ok" } }, limits: { seconds: 600, bytes: 65536 } };
  const config = valueDigest(CONFIGURATION_DOMAIN, configuration);
  expect(await r.rules.stub.submit(await r.rules.intent(rita, "keep-configuration", { fields: { digest: config, name: "review" } }), [], { values: [canonicalize(configuration)] })).toMatchObject({ answer: "accepted" });
  const check = await r.member("@check");
  // A source is a row of the rules' checks. `security-review` is required; `style-review` is not; `other-review` names another checker.
  const checks = [
    { name: "security-review", configuration: config, required: true, checker: check },
    { name: "style-review", configuration: config, required: false, checker: check },
    { name: "other-review", configuration: config, required: false, checker: await r.member("@una") },
  ];
  expect(await r.publishRules({ approvals: 1, ownerMayReview: false, checks, labels: [], extents: firstExtents({ approvals: 1, checks }) })).toMatchObject({ answer: "accepted" });
  await r.activate(definition, digest);

  /** `who` integrates on the hold. `opener` opens the change, and is its author. */
  const lane = async (who: typeof vic, handle: string, title: string, opener: typeof vic = who) => {
    const host = new WorkspaceStandIn(r.firstHead, () => soon(600));
    const C = await r.lane(opener, "open-pr", definition, digest, { title, draft: false }, undefined, undefined, host);
    // Empty caller grants force the actual Platform authority to read Membership.
    const ask = async <K extends Kind<Definition>>(signer: typeof vic, kind: K, asked: AskedOf<Definition, K>): Promise<string> => {
      const signed = await C.signed(signer, kind, asked);
      return answered(await C.handle.submit(signed.signed, [], signed.beside));
    };
    const did = async <K extends Kind<Definition>>(signer: typeof vic, kind: K, asked: AskedOf<Definition, K>): Promise<number> => {
      const signed = await C.signed(signer, kind, asked);
      const answer = await C.handle.submit(signed.signed, [], signed.beside);
      if (answer.answer !== "accepted") return expect.fail(`${kind}: ${JSON.stringify(answer)}`);
      return answer.receipt.fact.seq;
    };
    await did(who, "ask-rules", { on: 0 });
    await r.settle();
    const offer = await C.fact(await did(who, "offer", { fields: { offeree: await r.member(handle), terms: "Work." } }));
    await did(who, "accept", { on: offer.seq, fields: { terms: offer } });
    const hold = await did(who, "take-hold", { fields: { commitment: offer.seq } });
    await C.effects();
    const prepare = (step: string, fields: Record<string, FieldValue>) => C.stub.prepare(signIntent({ v: 1, to: C.at, actor: who.key, kind: `hold@2:${step}`, on: null, expected: {}, fields, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) }, who.secret), [], "hold@2", step);
    expect(await prepare("instance", { hold, task: C.at, instance: "i-1" })).toMatchObject({ answer: "accepted" });
    expect(await prepare("token", { hold, instance: "i-1" })).toMatchObject({ answer: "accepted" });
    await C.effects();
    /** One version on a commit and a tree, with a passed job of the required source on it. */
    const propose = async (commit: string, tree: string, previous?: number): Promise<{ manifest: number; fact: FactRef }> => {
      const intent = await C.signed(who, "propose-manifest", { fields: { hold, instance: "i-1", base: r.firstHead, integration: oid(commit), tree: oid(tree), complete: true, selected: [], decisions: [], ...(previous === undefined ? {} : { previous }) } });
      expect(await C.stub.prepare(intent.signed, [], "hold@2", "stage")).toMatchObject({ answer: "accepted" });
      await C.effects();
      const submitted = await C.handle.submit(intent.signed, [], intent.beside);
      if (submitted.answer !== "accepted") return expect.fail(`propose-manifest: ${JSON.stringify(submitted)}`);
      const manifest = submitted.receipt.fact.seq;
      const job = await did(who, "request-check", { fields: { manifest, name: "security-review", configuration: config } });
      await did(checkerKey, "check", { fields: { job, tree: oid(tree), configuration: config, outcome: "passed" } });
      return { manifest, fact: await C.fact(manifest) };
    };
    return { C, ask, did, propose };
  };

  return { r, lane };
}

/**
 * Each send of the room and its dispatch log, for a merge whose withdrawal did not reach `aborted`. Request `c5f0cff9` asks why this
 * assertion failed once, and that failed gate kept no outbox state. A read that fails prints its error, and the assertion still decides.
 */
async function printOutboxes(r: Room): Promise<void> {
  const lines = [`outbox attempts: clock ${net.clock.now}`];
  for (const node of r.scopes) {
    try {
      const read = await node.stub.outbox(reader);
      if (!read.ok) { lines.push(`${node.name}: not read: ${read.reason}`); continue; }
      lines.push(`${node.name}: head ${read.at.seq}, first page ${read.complete ? "complete" : "only"}`);
      for (const { outboxId, to, class: kind, held, attempts, acknowledged, result, diagnosis } of read.value) lines.push(`  ${JSON.stringify({ outboxId, to, kind, held, attempts, acknowledged, result, diagnosis })}`);
    } catch (error) { lines.push(`${node.name}: not read: ${String(error)}`); }
  }
  console.log(lines.join("\n"));
}

/** One finding, as a source files it. */
const raised = (version: FactRef, source: string, tree: string, start = 10) => ({ fields: {
  version, file: "src/a.ts", start, end: start + 2, class: "race", severity: "high", confidence: 80, scenario: "Two writers lose an update.", source, sourceVersion: "reviewer 1.2", tree: oid(tree),
} }) as AskedOf<Definition, "file-finding">;
const merge = (manifest: number) => ({ fields: { manifest, reports: [] } }) as AskedOf<Definition, "merge">;

test("a finding from a required source holds the merge across versions until it is answered; review input is no approval (STAND-IN: provider and credentials; no runner)", async () => {
  const { r, lane } = await sources();
  const { C, ask, did, propose } = await lane(vic, "@vic", "A change with findings");
  const first = await propose("c", "3");
  /** The lane accepts a merge. The test withdraws it, so that a later step can ask again. */
  const allowed = async (manifest: number): Promise<string> => {
    const signed = await C.signed(rita, "merge", merge(manifest));
    const answer = await C.handle.submit(signed.signed, [], signed.beside);
    if (answer.answer !== "accepted") return answered(answer);
    const seq = answer.receipt.fact.seq;
    await did(rita, "cancel-merge", { on: seq });
    await r.settle();
    const { state } = await C.item(seq);
    if (state !== "aborted") await printOutboxes(r);
    expect(state).toBe("aborted");
    return "accepted";
  };

  const F1 = await did(checkerKey, "file-finding", raised(first.fact, "security-review", "3"));
  expect(await C.item(F1)).toMatchObject({ state: "open", values: { tree: oid("3"), source: "security-review", severity: "high" } });
  await did(rita, "review-verdict", { fields: { manifest: first.manifest, verdict: "approve", extent: "source" } });

  // An open finding from a required source refuses the merge.
  expect(await ask(rita, "merge", merge(first.manifest)), "open required finding refuses").toBe("guard-failed: finding-open");
  // A re-review does not raise the same finding twice.
  expect(await ask(checkerKey, "file-finding", raised(first.fact, "security-review", "3")), "same finding twice").toBe("guard-failed: finding-exists");
  // A source files only under its own row, and only on the tree of the version it names.
  expect(await ask(vic, "file-finding", raised(first.fact, "style-review", "3", 90)), "no change.check").toBe("unauthorized");
  expect(await ask(checkerKey, "file-finding", raised(first.fact, "other-review", "3", 90)), "another source's row").toBe("guard-failed: not-the-source");
  expect(await ask(checkerKey, "file-finding", raised(first.fact, "style-review", "9", 90)), "another tree").toBe("guard-failed: not-this-version");
  // A member without `change.dismiss` cannot answer it: not the change's author, and not another source. Another source cannot resolve it as its own.
  const answer = { on: F1, fields: { answer: "Fixed." } };
  expect(await ask(vic, "resolve-finding-any", answer), "unauthorized author").toBe("unauthorized");
  expect(await ask(vic, "mark-finding-irrelevant", answer), "unauthorized author, irrelevant").toBe("unauthorized");
  expect(await ask(una, "resolve-finding-any", answer), "unauthorized member").toBe("unauthorized");
  expect(await ask(una, "mark-finding-irrelevant", answer), "unauthorized member, irrelevant").toBe("unauthorized");
  expect(await ask(una, "resolve-finding-own", answer), "another source").toBe("guard-failed");
  expect((await C.item(F1)).state).toBe("open");

  // A finding from another change refuses as not this change.
  const other = await lane(vic, "@vic", "Another change, opened by rita", rita);
  const foreign = await other.propose("d", "4");
  expect(await ask(checkerKey, "file-finding", raised(foreign.fact, "style-review", "4", 90)), "another change").toBe("guard-failed: not-this-change");
  // rita holds `change.dismiss` and cannot answer a finding on a change she opened, or on a version she wrote.
  const onOpened = await other.did(checkerKey, "file-finding", raised(foreign.fact, "security-review", "4"));
  expect(await other.ask(rita, "resolve-finding-any", { on: onOpened, fields: { answer: "Mine." } }), "author of the change").toBe("guard-failed: author-cannot-answer");
  const written = await lane(rita, "@rita", "A change integrated by rita", vic);
  const version = await written.propose("a", "2");
  const onWritten = await written.did(checkerKey, "file-finding", raised(version.fact, "security-review", "2"));
  expect(await written.ask(rita, "mark-finding-irrelevant", { on: onWritten, fields: { answer: "Mine." } }), "author of the version").toBe("guard-failed: author-cannot-answer");

  // A new version keeps the finding open. The finding stays bound to the version and the tree it described, and the re-review adds nothing.
  const second = await propose("e", "5", first.manifest);
  expect(await C.item(F1)).toMatchObject({ state: "open", values: { tree: oid("3") }, refs: { version: first.manifest } });
  await did(rita, "review-verdict", { fields: { manifest: second.manifest, verdict: "approve", extent: "source" } });
  expect(await ask(rita, "merge", merge(second.manifest)), "new version keeps the finding open").toBe("guard-failed: finding-open");
  expect(await ask(checkerKey, "file-finding", raised(second.fact, "security-review", "5")), "same finding on a new version").toBe("guard-failed: finding-exists");

  // Resolving it allows the merge.
  await did(rita, "resolve-finding-any", { on: F1, fields: { answer: "Fixed in the new version." } });
  expect(await C.item(F1)).toMatchObject({ state: "resolved", values: { answer: "Fixed in the new version." } });
  expect(await allowed(second.manifest), "resolving allows merge").toBe("accepted");

  // Marking one irrelevant allows the merge, and it is not raised again. A source may resolve its own finding and may not call it irrelevant.
  const F2 = await did(checkerKey, "file-finding", raised(second.fact, "security-review", "5", 20));
  expect(await ask(rita, "merge", merge(second.manifest))).toBe("guard-failed: finding-open");
  expect(await ask(checkerKey, "mark-finding-irrelevant", { on: F2, fields: { answer: "Mine." } })).toBe("unauthorized");
  await did(rita, "mark-finding-irrelevant", { on: F2, fields: { answer: "This path has one writer." } });
  expect((await C.item(F2)).state).toBe("irrelevant");
  expect(await allowed(second.manifest), "irrelevant allows merge").toBe("accepted");
  expect(await ask(checkerKey, "file-finding", raised(second.fact, "security-review", "5", 20)), "irrelevant is not raised again").toBe("guard-failed: finding-exists");
  const F3 = await did(checkerKey, "file-finding", raised(second.fact, "security-review", "5", 30));
  expect(await ask(rita, "merge", merge(second.manifest))).toBe("guard-failed: finding-open");
  await did(checkerKey, "resolve-finding-own", { on: F3, fields: { answer: "A re-review no longer finds it." } });
  expect(await C.item(F3)).toMatchObject({ state: "resolved" });

  // An open finding from a source that is not required does not refuse.
  const F4 = await did(checkerKey, "file-finding", raised(second.fact, "style-review", "5", 40));
  expect((await C.item(F4)).state).toBe("open");
  expect(await allowed(second.manifest), "open finding from a source that is not required").toBe("accepted");

  // A source's finding records review input and no approval: with every required finding answered, a version with no verdict still needs one.
  // A source cannot give a verdict either, for a checker holds no `change.review`.
  const third = await propose("f", "6", second.manifest);
  expect(await ask(rita, "merge", merge(third.manifest)), "a finding is no approval").toBe("guard-failed: approvals-needed");
  expect(await ask(una, "review-verdict", { fields: { manifest: third.manifest, verdict: "approve", extent: "source" } }), "a source gives no verdict").toBe("unauthorized");
}, 120_000);

test("the real destination publishes a merge whose required finding is answered, beside an open finding from a source that is not required (STAND-IN: provider and credentials; no runner)", async () => {
  const { r, lane } = await sources();
  const { C, did, propose } = await lane(vic, "@vic", "A change that lands");
  const { manifest, fact } = await propose("c", "3");
  const required = await did(checkerKey, "file-finding", raised(fact, "security-review", "3"));
  await did(checkerKey, "file-finding", raised(fact, "style-review", "3", 40));
  await did(rita, "resolve-finding-any", { on: required, fields: { answer: "Fixed." } });
  await did(rita, "review-verdict", { fields: { manifest, verdict: "approve", extent: "source" } });
  const seq = await did(rita, "merge", merge(manifest));
  await r.publish();
  expect((await C.item(seq)).state).toBe("published");
  expect((await publicationOf(r, C, seq))?.state).toMatch(/^(published|cleaned)$/);
  expect((await r.G.item(0)).values["head"]).toBe(oid("c"));
}, 60_000);

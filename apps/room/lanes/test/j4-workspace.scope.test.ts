import { expect, test } from "vitest";
import type { FieldValue, Receipt } from "@generalbusiness/dap-contract";
import { signIntent } from "@generalbusiness/dap-bytes";
import type { AskedOf, Kind } from "@generalbusiness/dap-client";
import { snapshotInput, stagedRefName, type AncestryCheck } from "@generalbusiness/dap-derive";
import type { EffectAnswer, EffectRequest } from "@generalbusiness/dap-scope";
import { firstExtents } from "@generalbusiness/dap-platform";
import { J4_DIGESTS, changeJ4, issueJ4 } from "../src/index.ts";
import { Host } from "./support/graph.ts";
import { oid, publicationOf, rita, room, soon, una, vic } from "./support/room.ts";

/** STAND-IN: no provider, repository, credential or Git walk exists here.
 * Native operations carry these scripted replies through the real ledger. */
class WorkspaceStandIn extends Host {
  constructor(readonly head: string) { super(); }
  override accepts(owner: string, kind: string): boolean {
    return owner === "hold@2" && ["head", "fork", "mint", "revoke", "stage", "check"].includes(kind);
  }
  override send(request: EffectRequest): EffectAnswer | null {
    this.asked.push(request.kind);
    const records = request.origin.entry.effects.filter(effect => effect.effect === "record");
    const answer = (body: FieldValue, basis: "own-answer" | "read" = "own-answer"): EffectAnswer => ({ result: "confirmed", evidence: { basis, body } });
    if (request.kind === "head") return answer({ commit: this.head });
    if (request.kind === "fork") {
      const fork = records.find(record => record.kind === "fork" && record.values["operation"] === request.operation);
      if (!fork) return null;
      const name = `scripted-j4-${fork.key[0]}`;
      return answer({ id: name, name });
    }
    if (request.kind === "mint") return answer({ token: `scripted-token-${request.operation}`, ends: soon(600) });
    if (request.kind === "revoke") return answer({});
    if (request.kind === "stage") {
      const root = records.find(record => record.kind === "root" && record.values["operation"] === request.operation);
      if (!root) return null;
      const commit = root.values["commit"] as string;
      const ref = stagedRefName(request.scope, commit, root.key[0] as number);
      this.refs.push({ ref, target: commit });
      return answer({ ref, value: commit }, "read");
    }
    const pin = records.find(record => record.kind === "pin" && record.values["check"] === request.operation);
    const snapshot = snapshotInput(this.refs);
    if (!pin || !snapshot) return null;
    const record: AncestryCheck = {
      commit: pin.values["commit"] as string,
      root: { number: pin.values["root"] as number, state: "live" },
      head: this.head, snapshot: { digest: snapshot.digest, count: this.refs.length },
      start: { foreign: null }, stops: [], F: [], visited: 1,
    };
    return { ...answer({ record } as unknown as FieldValue), retain: [snapshot] };
  }
}

// The shared room fixture invites person members with role agent. This
// scenario does not establish controlled agent kind; that live check is pending.
test("J4 native room: two agent-role holders select separate forks, keep lane-kind instances, revoke one hold and publish the other's prepared manifest through Destination12 (STAND-IN: provider and credentials)", async () => {
  const started = performance.now();
  const stage = (name: string) => console.info("j4-native-stage", name, performance.now() - started);
  stage("setup");
  const r = await room({ workspaceCohort: true, roster: ["@una", "@vic"] });
  expect((await r.G.summary()).value.definition).toBe("platform:destination@12");
  expect((await r.M.summary()).value.definition).toBe("platform:membership@8");
  for (const handle of ["@una", "@vic"]) {
    expect(await r.M.item(r.members[handle]!)).toMatchObject({ state: "active", values: { role: "agent" } });
  }
  const policy = await r.publishRules({ approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) });
  expect(policy, JSON.stringify(policy)).toMatchObject({ answer: "accepted" });
  await r.activate(issueJ4, J4_DIGESTS.issue);
  await r.activate(changeJ4, J4_DIGESTS.change);
  const I = await r.lane(rita, "open-issue", issueJ4, J4_DIGESTS.issue, { title: "J4 native work", conditions: ["chosen workspace publishes"] });
  const host = new WorkspaceStandIn(r.firstHead);
  const C = await r.lane(vic, "open-pr", changeJ4, J4_DIGESTS.change, { title: "J4 chosen workspace", draft: false }, undefined, undefined, host);
  // Empty caller grants force the actual Platform authority to read Membership.
  const did = async <K extends Kind<typeof changeJ4>>(who: typeof una, kind: K, asked: AskedOf<typeof changeJ4, K>): Promise<Receipt> => {
    const signed = await C.signed(who, kind, asked);
    const answer = await C.handle.submit(signed.signed, [], signed.beside);
    if (answer.answer !== "accepted") throw new Error(`${kind}: ${JSON.stringify(answer)}`);
    return answer.receipt;
  };
  await did(vic, "ask-rules", { on: 0 });
  await r.settle();
  await did(vic, "link-own", { fields: { issue: I.at, how: "keyword" } });
  stage("holds");
  const holds: number[] = [];
  for (const [who, handle, instance] of [[una, "@una", "j4-a"], [vic, "@vic", "j4-b"]] as const) {
    const offer = (await did(who, "offer", { fields: { offeree: await r.member(handle), terms: `Work by ${handle}` } })).fact;
    await did(who, "accept", { on: offer.seq, fields: { terms: offer } });
    const hold = (await did(who, "take-hold", { fields: { commitment: offer.seq } })).fact.seq;
    holds.push(hold);
    await C.effects();
    const prepare = (step: string, fields: Record<string, FieldValue>) => C.stub.prepare(signIntent({ v: 1, to: C.at, actor: who.key, kind: `hold@2:${step}`, on: null, expected: {}, fields, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) }, who.secret), [], "hold@2", step);
    expect(await prepare("instance", { hold, task: C.at, instance })).toMatchObject({ answer: "accepted" });
    expect(await prepare("token", { hold, instance })).toMatchObject({ answer: "accepted" });
    await C.effects();
    const state = await C.state();
    expect(state.record("hold@2", "instance", [hold, instance])).toMatchObject({ state: "current", values: { task: C.at, epoch: 1 } });
    expect(state.record("hold@2", "fork", [hold])).toMatchObject({ state: "selected", values: { seed: { commit: r.firstHead }, name: `scripted-j4-${hold}` } });
    expect(state.records("hold@1", "fork")).toEqual([]);
  }
  const [first, chosen] = holds as [number, number];
  const state = await C.state();
  expect(state.record("hold@2", "fork", [first])!.values["name"]).not.toBe(state.record("hold@2", "fork", [chosen])!.values["name"]);
  expect(state.records("hold@2", "token", { states: ["live"] })).toHaveLength(2);
  const selectedBefore = state.record("hold@2", "fork", [chosen]);
  await did(una, "release-hold", { on: first });
  await C.effects();
  expect(await C.item(first)).toMatchObject({ state: "ended", values: { epoch: 2 } });
  expect(await C.item(chosen)).toMatchObject({ state: "held", values: { epoch: 1 } });
  expect((await C.state()).record("hold@2", "instance", [first, "j4-a"])?.state).toBe("past");
  expect((await C.state()).record("hold@2", "fork", [chosen])).toEqual(selectedBefore);
  const workspaceTokens = (await C.state()).records("hold@2", "token", { member: "hold", value: first })
    .filter(token => token.values["purpose"] === "workspace");
  expect(workspaceTokens).toMatchObject([{ state: "ended" }]);
  const revocation = workspaceTokens[0]!.values["revocation"];
  expect(typeof revocation).toBe("string");
  expect((await C.entries()).some(entry => entry.input.type === "outcome" && entry.input.owner === "hold@2" && entry.input.kind === "revoke"
    && entry.input.operation === revocation && entry.input.result === "confirmed")).toBe(true);
  stage("manifest");
  const manifestIntent = await C.signed(vic, "propose-manifest", { fields: { hold: chosen, instance: "j4-b", base: r.firstHead, integration: oid("c"), tree: oid("3"), complete: true, selected: [], decisions: [] } });
  expect(await C.stub.prepare(manifestIntent.signed, [], "hold@2", "stage")).toMatchObject({ answer: "accepted" });
  await C.effects();
  const submitted = await C.handle.submit(manifestIntent.signed, [], manifestIntent.beside);
  expect(submitted).toMatchObject({ answer: "accepted" });
  if (submitted.answer !== "accepted") throw new Error("Prepared J4 manifest must be recorded.");
  const manifest = submitted.receipt.fact.seq;
  expect(submitted.receipt.effects).toContainEqual(expect.objectContaining({ effect: "record", capability: "hold@2", kind: "pin", state: "held" }));
  expect((await C.entries()).some(entry => entry.input.type === "outcome" && entry.input.owner === "hold@2" && entry.input.kind === "check" && entry.input.result === "confirmed")).toBe(true);
  expect(host.asked.filter(kind => kind === "head")).toHaveLength(2);
  expect(host.asked.filter(kind => kind === "fork")).toHaveLength(2);
  expect(host.asked).toContain("stage");
  stage("publication");
  const merge = (await did(rita, "merge", { fields: { manifest, reports: [] } })).fact.seq;
  await r.publish();
  const publication = await C.item(merge);
  expect(publication.state).toBe("published");
  expect((await publicationOf(r, C, publication.id))?.state).toMatch(/^(published|cleaned)$/);
  expect((await r.G.item(0)).values["head"]).toBe(oid("c"));
  expect((await I.item(0)).state).toBe("closed");
  stage("complete");
}, 60_000);

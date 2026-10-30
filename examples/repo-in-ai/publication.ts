/** Retained clone, workspace preparation and seed publication phases. */
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalize, isEntry, isFactRef, isScopeRef, timeMs } from "@generalbusiness/dap-bytes";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as cohort, initialCommitObjects } from "@generalbusiness/dap-platform";
import { cloneRetained } from "../../packages/cli/src/commands.ts";
import { J4_DIGESTS } from "../../apps/room/lanes/src/digests-j4.ts";
import { laneState } from "./journal.ts";
import { seedLane } from "./lane.ts";
import { buildSeedCandidate, compareClone, loadTaskList, type SeedCandidate } from "./git.ts";
import { seedTree } from "./seed.ts";
import { identityHome, retain, retained, type SetupPlan } from "./plan.ts";
import type { Session, SessionArgs, SessionMode } from "./session.ts";
import { actPhase, done, nativeResult, requiredDone, roomRefs, singleton, type PhaseResult } from "./workflow.ts";
import { pushSeed, retrieveWorkspaceCredential } from "./workspace.ts";
import { agentReviewControl } from "./review-control.ts";

const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const instance = "repo-in-ai-seed";
type WireCandidate = Omit<SeedCandidate, "objects" | "expected"> & { objects: { id: string; kind: "commit" | "tree" | "blob"; body: string }[]; expected: { path: string; mode: string; bytes: string }[] };
interface Workspace { tokenId: string; tokenNumber: number; remote: string; ends: string }
const pack = (candidate: SeedCandidate): WireCandidate => ({ ...candidate, objects: candidate.objects.map(object => ({ ...object, body: Buffer.from(object.body).toString("base64") })), expected: candidate.expected.map(file => ({ ...file, bytes: Buffer.from(file.bytes).toString("base64") })) });
export async function candidateOf(owner: Session): Promise<SeedCandidate> {
  const wire = await retained<WireCandidate>(owner.ctx.store, "s1-candidate");
  if (wire === null) throw new Error("Build the seed candidate first.");
  return { ...wire, objects: wire.objects.map(object => ({ ...object, body: Buffer.from(object.body, "base64") })), expected: wire.expected.map(file => ({ ...file, bytes: Buffer.from(file.bytes, "base64") })) };
}

async function observed(owner: Session, phase: string, extra: Omit<PhaseResult, "phase" | "status"> = {}): Promise<PhaseResult> {
  const result: PhaseResult = { phase, status: "observed", ...extra };
  await retain(owner.ctx.store, "s1-done-" + phase, result);
  return result;
}

export async function preparePhase(owner: Session, agent: Session, phase: string, mode: SessionMode, step: string, fields: Record<string, unknown>, act?: SessionArgs): Promise<PhaseResult> {
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  const target = await seedLane(owner), name = "s1-pre-" + phase;
  let original = await retained<{ target: ScopeRef; args: SessionArgs }>(owner.ctx.store, name);
  if (original === null) {
    if (mode !== "new") throw new Error("No preparation original is retained.");
    original = { target, args: { ...(act ?? {}), resource: target.scope, capability: "hold@2", step, fields, idempotencyKey: act ? "s1:manifest" : "s1:" + phase } };
    await retain(owner.ctx.store, name, original);
  } else if (!equal(original.target, target)) throw new Error("The preparation target incarnation differs.");
  const response = (await agent.request(mode, "prepare", original.args, { target, resource: target })).result;
  if (response.isError) throw new Error("The native preparation is unresolved.");
  const body = response.structuredContent;
  const steps = body["steps"] as Record<string, unknown>[] | undefined;
  const result = (body["step"] ?? steps?.find(value => value["step"] === step && value["resource"] === target.scope)) as Record<string, unknown> | undefined;
  const answer = (typeof result?.["answer"] === "object" ? result["answer"] : result?.["last"]) as Record<string, unknown> | undefined;
  if (answer?.["answer"] !== "accepted" || !isFactRef(answer["fact"])) throw new Error("The native preparation is unresolved.");
  const intent = await agent.intent(String(original.args["idempotencyKey"]));
  const receipt: PhaseResult = { phase, status: "accepted", fact: answer["fact"], intent };
  await retain(owner.ctx.store, "s1-done-" + phase, receipt);
  return receipt;
}

export async function clonePhase(owner: Session, plan: SetupPlan, phase: "clone-base" | "clone-verify", mode: SessionMode): Promise<PhaseResult> {
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  const key = phase === "clone-base" ? "read-base" : "read-verify";
  await requiredDone(owner, key);
  const original = await owner.accepted("s1:" + key);
  const directory = join(plan.home, "clones", phase);
  const marker = "s1-use-" + phase, resultName = "s1-result-" + phase;
  const result = await retained<{ code: number }>(owner.ctx.store, resultName);
  if (result !== null) {
    if (result.code !== 0) throw new Error("The clone handoff failed. It is not retried.");
    return observed(owner, phase);
  }
  if (mode === "check" || await retained(owner.ctx.store, marker) !== null) throw new Error("The clone handoff is unknown. Its one-time credential is not read again.");
  if (existsSync(directory)) throw new Error("The fresh clone directory exists already.");
  mkdirSync(join(plan.home, "clones"), { recursive: true, mode: 0o700 });
  await retain(owner.ctx.store, marker, { directory, request: original });
  const git = owner.ctx.git;
  if (!git?.archiveRun) throw new Error("The private Git runner is unavailable.");
  const outcome = await cloneRetained({ ...owner.ctx, git: { ...git, run: git.archiveRun.bind(git) } }, directory, original, { hours: 1 });
  await retain(owner.ctx.store, resultName, { code: outcome.code });
  if (outcome.code !== 0) throw new Error("The fresh clone failed. No credential retry was made.");
  return observed(owner, phase);
}

export async function buildPhase(owner: Session, plan: SetupPlan): Promise<PhaseResult> {
  const phase = "build-seed", prior = await done(owner, phase);
  if (prior !== null) return prior;
  await requiredDone(owner, "clone-base");
  const refs = await roomRefs(owner), destination = await owner.read(refs.destination), branch = singleton(destination, "branch");
  const claim = branch.refs["claim"], directory = branch.refs["directory"], repository = branch.values["repository"] as { name?: unknown; namespace?: unknown; host?: unknown } | null;
  const genesis = (await owner.call("step", { scope: refs.destination.scope, seq: 0 })).result.structuredContent["entry"];
  if (!isFactRef(claim) || !isScopeRef(directory) || !equal(directory, refs.directory) || !repository || repository.host !== "artifacts" || repository.namespace !== plan.namespace || typeof repository.name !== "string"
    || branch.values["founderHandle"] !== plan.handles.owner || !isEntry(genesis) || genesis.input.type !== "genesis" || !equal(genesis.at, refs.destination)) throw new Error("The founding destination data is unavailable or differs.");
  const initial = initialCommitObjects("sha1", refs.destination.scope, genesis.time, claim, { name: repository.name, handle: plan.handles.owner, directory: refs.directory.scope });
  if (branch.values["head"] !== initial.commit) throw new Error("The room head is no longer its founding commit.");
  const seed = seedTree(initial, loadTaskList(resolve(fileURLToPath(new URL("./task-list/", import.meta.url)))));
  const candidate = await buildSeedCandidate(join(plan.home, "clones", "clone-base"), seed);
  await retain(owner.ctx.store, "s1-candidate", pack(candidate));
  return observed(owner, phase);
}

export async function publicationPhase(owner: Session, agent: Session, reviewer: Session, plan: SetupPlan, phase: string, mode: SessionMode): Promise<PhaseResult> {
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  if (phase === "read-base" || phase === "read-verify") {
    if (phase === "read-verify") await requiredDone(owner, "published");
    const refs = await roomRefs(owner);
    return actPhase(owner, owner, phase, mode, refs.destination, cohort.destination, "read-token", { hours: 1 }, { on: 0 });
  }
  if (phase === "clone-base" || phase === "clone-verify") return clonePhase(owner, plan, phase, mode);
  if (phase === "build-seed") return buildPhase(owner, plan);
  const lane = await seedLane(owner), hold = (await requiredDone(owner, "hold")).fact;
  if (!hold) throw new Error("The seed hold is unavailable.");
  if (phase === "fork-ready") {
    const state = await laneState(owner, lane), fork = state.memory.record("hold@2", "fork", [hold.seq]);
    const seed = fork?.values["seed"] as { commit?: unknown } | undefined;
    const selected = state.entries.some(value => value.entry.input.type === "outcome" && value.entry.input.owner === "hold@2" && value.entry.input.operation === fork?.values["operation"] && value.entry.input.kind === "fork" && value.entry.input.result === "confirmed" && value.entry.effects.some(effect => effect.effect === "attempt" && effect.selected === true));
    if (fork?.state !== "selected" || seed?.commit !== (await candidateOf(owner)).base || !selected || !(await owner.read(lane)).items.some(item => item.type === "rules")) throw new Error("The selected fork and retained rules are not ready. Read this phase again.");
    return observed(owner, phase);
  }
  if (phase === "instance") { await requiredDone(owner, "fork-ready"); return preparePhase(owner, agent, phase, mode, "instance", { hold: hold.seq, task: lane, instance }); }
  if (phase === "workspace-token") { await requiredDone(owner, "instance"); return preparePhase(owner, agent, phase, mode, "token", { hold: hold.seq, instance }); }
  if (phase === "workspace-ready") {
    await requiredDone(owner, "instance"); await requiredDone(owner, "workspace-token");
    const state = await laneState(owner, lane), fork = state.memory.record("hold@2", "fork", [hold.seq]);
    const tokens = state.memory.records("hold@2", "token", { states: ["live"], member: "hold", value: hold.seq }).filter(token => token.values["purpose"] === "workspace");
    const token = tokens[0], candidate = await candidateOf(owner);
    const seed = fork?.values["seed"] as { commit?: unknown } | undefined;
    const mint = state.entries.find(value => value.entry.input.type === "outcome" && value.entry.input.owner === "hold@2" && value.entry.input.operation === token?.values["mint"] && value.entry.input.kind === "mint" && value.entry.input.result === "confirmed");
    const selected = state.entries.find(value => value.entry.input.type === "outcome" && value.entry.input.owner === "hold@2" && value.entry.input.operation === fork?.values["operation"] && value.entry.input.kind === "fork" && value.entry.input.result === "confirmed" && value.entry.effects.some(effect => effect.effect === "attempt" && effect.selected === true));
    const ends = token?.values["ends"], name = fork?.values["name"], tokenId = token?.values["id"], tokenNumber = token?.key[0];
    if (fork?.state !== "selected" || fork.values["id"] !== name || typeof name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name)
      || seed?.commit !== candidate.base || !selected || tokens.length !== 1 || !mint || token?.values["instance"] !== instance
      || typeof ends !== "string" || (timeMs(ends) ?? 0) <= Date.now() + 60_000 || typeof tokenId !== "string" || typeof tokenNumber !== "number") throw new Error("The selected workspace and confirmed live token are not ready.");
    const workspace: Workspace = { tokenId, tokenNumber, ends, remote: plan.providerOrigin + "/git/" + plan.namespace + "/" + name + ".git" };
    await retain(owner.ctx.store, "s1-workspace", workspace);
    return observed(owner, phase);
  }
  if (phase === "workspace-key" || phase === "seed-push") {
    const workspace = await retained<Workspace>(owner.ctx.store, "s1-workspace");
    if (workspace === null || (timeMs(workspace.ends) ?? 0) <= Date.now() + 15_000) throw new Error("The original workspace token is unavailable or expired. It was not replaced.");
    const credential = await retrieveWorkspaceCredential(agent, lane, workspace.tokenId, workspace.remote, phase === "workspace-key" ? mode : "check");
    if (phase === "seed-push") {
      const result = await pushSeed(agent, credential, await candidateOf(owner), "seed-push", mode);
      if (result.state !== "confirmed") throw new Error("The original seed push is unresolved. No replacement was sent.");
    }
    return observed(owner, phase);
  }
  if (phase === "manifest-stage") {
    await requiredDone(owner, "seed-push");
    const candidate = await candidateOf(owner);
    return preparePhase(owner, agent, phase, mode, "stage", { hold: hold.seq, instance, base: candidate.base, integration: candidate.commit, tree: candidate.tree, complete: true, selected: [], decisions: [] }, { target: lane.scope, digest: J4_DIGESTS.change, kind: "propose-manifest" });
  }
  if (phase === "stage-ready") {
    const staged = await requiredDone(owner, "manifest-stage"), state = await laneState(owner, lane);
    if (!staged.intent) throw new Error("The staged intent digest is unavailable.");
    const pin = state.memory.record("hold@2", "pin", [lane, staged.intent]);
    const checks = state.memory.records("hold@2", "check", { states: ["recorded"], member: "intent", value: staged.intent });
    if (pin?.state !== "provisional" || checks.length !== 1 || state.memory.record("hold@2", "root", [pin.values["root"]!])?.state !== "live") throw new Error("The actual stage/check outcome is not ready. Read this phase again.");
    return observed(owner, phase);
  }
  if (phase === "manifest") {
    await requiredDone(owner, "stage-ready");
    const result = nativeResult(phase, await agent.submitPrepared(mode === "check" ? "check" : "continue", "s1:manifest"));
    await retain(owner.ctx.store, "s1-done-" + phase, result);
    return result;
  }
  const manifest = (await requiredDone(owner, "manifest")).fact;
  if (!manifest) throw new Error("The admitted manifest is unavailable.");
  if (phase === "agent-review") {
    const result = nativeResult(phase, await agentReviewControl(reviewer, identityHome(plan, "agent-b"), lane, manifest.seq, mode), true);
    await retain(owner.ctx.store, "s1-done-" + phase, result);
    return result;
  }
  if (phase === "owner-review") return actPhase(owner, owner, phase, mode, lane, J4_DIGESTS.change, "review-verdict", { manifest: manifest.seq, verdict: "approve", extent: "source" });
  if (phase === "merge") {
    await requiredDone(owner, "agent-review"); await requiredDone(owner, "owner-review");
    return actPhase(owner, owner, phase, mode, lane, J4_DIGESTS.change, "merge", { manifest: manifest.seq, reports: [] });
  }
  if (phase === "published") {
    const merge = (await requiredDone(owner, "merge")).fact;
    const item = merge ? (await laneState(owner, lane)).memory.item(merge.seq) : null;
    const refs = await roomRefs(owner), destination = await owner.read(refs.destination), candidate = await candidateOf(owner);
    if (item?.state !== "published" || singleton(destination, "branch").values["head"] !== candidate.commit) throw new Error("The actual publication is not complete. Read this phase again.");
    return observed(owner, phase);
  }
  if (phase === "verify-seed") {
    await requiredDone(owner, "clone-verify"); const candidate = await candidateOf(owner);
    const comparison = await compareClone(join(plan.home, "clones", "clone-verify"), candidate.commit, candidate.expected);
    if (!comparison.matches) throw new Error("The fresh destination clone differs in paths, modes or bytes.");
    await retain(owner.ctx.store, "s1-seed-comparison", comparison);
    return observed(owner, phase);
  }
  if (phase === "released") {
    await requiredDone(owner, "release");
    const workspace = await retained<Workspace>(owner.ctx.store, "s1-workspace"), state = await laneState(owner, lane);
    const token = workspace === null ? null : state.memory.record("hold@2", "token", [workspace.tokenNumber]);
    const revoked = state.entries.some(value => value.entry.input.type === "outcome" && value.entry.input.owner === "hold@2" && value.entry.input.operation === token?.values["revocation"] && value.entry.input.kind === "revoke" && value.entry.input.result === "confirmed");
    if (token?.state !== "ended" || !revoked) throw new Error("Workspace token revocation is still owed.");
    return observed(owner, phase);
  }
  throw new Error("This is not a publication phase.");
}

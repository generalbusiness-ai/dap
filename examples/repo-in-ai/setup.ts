/** S1 operator entry point. Every write phase has an explicit recovery mode. */
import { bindPlan, checkDeployment, identityHome, readPlan, retain, type Identity, type SetupPlan } from "./plan.ts";
import { openSession, type Session, type SessionMode } from "./session.ts";
import { initializeOwner, createRoom, enrollIdentity } from "./identities.ts";
import { configurePhase, done, type PhaseResult } from "./workflow.ts";
import { lanePhase } from "./lane.ts";
import { witnessMembers } from "./members.ts";
import { publicationPhase } from "./publication.ts";
import { durableCliStore } from "./custody.ts";
import { newDiagnostics, type Diagnostics, type EnrollmentDiagnostic } from "./diagnostics.ts";

export const setupPhases = [
  "owner", "create", "enrol-a", "enrol-b", "enrol-checker", "members",
  "activate-issue", "activate-change", "roles-before", "role-admin", "role-maintainer", "role-member", "role-agent", "role-checker", "roles-after", "rules",
  "open-change", "ask-rules", "offer", "accept", "hold",
  "read-base", "clone-base", "build-seed", "fork-ready", "instance", "workspace-token", "workspace-ready", "workspace-key", "seed-push",
  "manifest-stage", "stage-ready", "manifest", "agent-review", "owner-review", "merge", "published", "read-verify", "clone-verify", "verify-seed", "release", "released",
] as const;
export type SetupPhase = typeof setupPhases[number];
const configured = new Set<string>(["activate-issue", "activate-change", "roles-before", "role-admin", "role-maintainer", "role-member", "role-agent", "role-checker", "roles-after", "rules"]);

async function session(plan: SetupPlan, identity: Identity): Promise<Session> {
  const opened = await openSession(identityHome(plan, identity));
  await bindPlan(opened.ctx.store, plan);
  return opened;
}

export async function runPhase(plan: SetupPlan, phase: SetupPhase, mode: SessionMode, observe?: (value: EnrollmentDiagnostic) => void): Promise<PhaseResult> {
  if (phase === "owner") {
    const existing = durableCliStore(identityHome(plan, "owner"));
    if (await existing.config()) {
      const owner = await session(plan, "owner"), prior = await done(owner, phase);
      if (prior !== null) return prior;
    }
    const ctx = await initializeOwner(identityHome(plan, "owner"), { service: plan.service, register: plan.register, handle: plan.handles.owner }, mode);
    await bindPlan(ctx.store, plan);
    const result: PhaseResult = { phase, status: "observed" };
    await retain(ctx.store, "s1-done-owner", result);
    return result;
  }
  const owner = await session(plan, "owner");
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  if (phase === "create") {
    const ctx = await initializeOwner(identityHome(plan, "owner"), { service: plan.service, register: plan.register, handle: plan.handles.owner }, "continue");
    const outcome = await createRoom(ctx, plan.name, mode);
    if (outcome.code !== 0) throw new Error("Room creation is unresolved. Check the retained original.");
  } else if (phase === "enrol-a" || phase === "enrol-b" || phase === "enrol-checker") {
    const identity = phase === "enrol-a" ? "agent-a" : phase === "enrol-b" ? "agent-b" : "checker";
    const outcome = await enrollIdentity(owner.ctx, identityHome(plan, identity), identity === "checker" ? "checker" : "agent", plan.handles[identity], mode, { recoveryPlan: plan, ...(observe ? { observe } : {}) });
    if (outcome.code !== 0) throw new Error("Identity enrollment is unresolved. Check the retained original.");
    await session(plan, identity);
  } else if (phase === "members") {
    const sessions = { owner, "agent-a": await session(plan, "agent-a"), "agent-b": await session(plan, "agent-b"), checker: await session(plan, "checker") };
    await witnessMembers(sessions);
  } else if (configured.has(phase)) return configurePhase(owner, phase, mode);
  else if (["open-change", "ask-rules", "offer", "accept", "hold", "release"].includes(phase)) return lanePhase(owner, await session(plan, "agent-a"), phase, mode, plan.name);
  else return publicationPhase(owner, await session(plan, "agent-a"), await session(plan, "agent-b"), plan, phase, mode);
  const result: PhaseResult = { phase, status: "observed" };
  await retain(owner.ctx.store, "s1-done-" + phase, result);
  return result;
}

export async function main(argv: readonly string[]): Promise<number> {
  let input: string | undefined, phase: string | undefined, diagnosticsPath: string | undefined, mode: SessionMode = "new";
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i], value = argv[++i];
    if (name === "--input") input = value;
    else if (name === "--phase") phase = value;
    else if (name === "--diagnostics") diagnosticsPath = value;
    else if (name === "--mode" && (value === "new" || value === "check" || value === "continue")) mode = value;
    else { process.stderr.write("Use --input <file> --phase <phase> --mode new|check|continue --diagnostics <NEW-directory>.\n"); return 2; }
  }
  if (!input || !diagnosticsPath || !phase || phase !== "all" && !setupPhases.includes(phase as SetupPhase) || phase === "all" && mode !== "new") {
    process.stderr.write("Supply --input, --diagnostics <NEW-directory>, and one setup phase: " + setupPhases.join(", ") + ".\n");
    return 2;
  }
  let diagnostics: Diagnostics | null = null, enrollment: EnrollmentDiagnostic | null = null;
  try {
    const plan = readPlan(input);
    diagnostics = newDiagnostics(diagnosticsPath, plan.home);
    await checkDeployment(plan);
    for (const selected of phase === "all" ? setupPhases : [phase as SetupPhase]) {
      phase = selected;
      enrollment = null;
      const result = await runPhase(plan, selected, mode, value => { enrollment = value; });
      // Explicit public projection. The private SDK result and links never enter stdout.
      process.stdout.write(JSON.stringify({ phase: result.phase, status: result.status, ...(result.fact ? { fact: result.fact } : {}) }) + "\n");
    }
    diagnostics.finish({ phase, mode, exitCode: 0, enrollment }, "");
    return 0;
  } catch {
    const stderr = "Setup stopped at " + phase + ". Private originals and receipts remain in the selected identity homes. Use check on this phase; use continue only for the same retained original.\n";
    try { diagnostics?.finish({ phase, mode, exitCode: 1, enrollment }, stderr); }
    catch { process.stderr.write("Safe diagnostics could not be retained; preserve the partial metadata unit.\n"); }
    process.stderr.write(stderr);
    return 1;
  }
}

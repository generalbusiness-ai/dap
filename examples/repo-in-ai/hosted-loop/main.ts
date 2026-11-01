/** The hosted loop's operator entry point: one command per phase, and one public line per command. */
import { closeSync, constants, fchmodSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { same, utf8 } from "@generalbusiness/dap-bytes";
import type { FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { issueInvitation, type Context, type InvitationIssueOptions } from "@generalbusiness/dap-cli";
import { durableCliStore, flushPrivateFile } from "../custody.ts";
import { newDiagnostics, type Diagnostics } from "../diagnostics.ts";
import { createRoom, initializeOwner, retainedInvitationRequests } from "../identities.ts";
import { retain, retained } from "../plan.ts";
import { openSession, type Session } from "../session.ts";
import { actPhase, done } from "../workflow.ts";
import { agentPhase } from "./agent.ts";
import { createAgent, rotateBearer } from "./control.ts";
import { openHosted } from "./hosted-client.ts";
import { HostedSession, type McpPort } from "./hosted-session.ts";
import { personPhase, type PersonPort } from "./person.ts";
import { agentHome, bearerPath, checkEndpoint, checkTarget, isLoopback, personHome, readLoopPlan, type LoopPlan } from "./plan.ts";
import { publicLine, scanPublic, type PublicResult } from "./public.ts";
import { TEXT, LoopStop, agentPhases, loopPhases, stop, type AgentPhase, type LoopPhase, type Mode, type PersonPhase } from "./words.ts";

const USAGE = "Use --input <file> --phase <phase> --mode new|check|continue --diagnostics <NEW-directory>.\n";
const INVITE_RECHECKS = 10, INVITE_RECHECK_MS = 1000;
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
export interface LoopOptions { fetch?: Fetcher; open?: (service: string, bearer: string) => Promise<McpPort>; pause?: (ms: number) => Promise<void> }

// ---------------------------------------------------------------- the agent's home: one file

/** The hosted client keeps one file: the bearer. The agent's key, configuration and custody live in the agent's object on the Worker. */
function readBearer(plan: LoopPlan): string {
  const home = agentHome(plan);
  let names: string[];
  try { names = readdirSync(home); } catch { return stop("no-bearer"); }
  if (names.length === 0) return stop("no-bearer");
  if (names.length !== 1 || names[0] !== "bearer") return stop("agent-home-differs");
  flushPrivateFile(bearerPath(plan));
  const bearer = readFileSync(bearerPath(plan), "utf8");
  return /^[0-9a-f]{64}\.[A-Za-z0-9_-]{32,}$/.test(bearer) ? bearer : stop("bearer-unusable");
}
function writeBearer(plan: LoopPlan, bearer: string): void {
  const home = agentHome(plan);
  mkdirSync(dirname(home), { recursive: true, mode: 0o700 });
  mkdirSync(home, { recursive: true, mode: 0o700 });
  if (readdirSync(home).length !== 0) stop("agent-home-differs");
  const file = openSync(bearerPath(plan), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { fchmodSync(file, 0o600); writeFileSync(file, bearer); fsyncSync(file); } finally { closeSync(file); }
  flushPrivateFile(bearerPath(plan));
}
const hasBearer = (plan: LoopPlan): boolean => {
  try { lstatSync(bearerPath(plan)); return true; } catch { return false; }
};

async function runAgent(plan: LoopPlan, phase: AgentPhase, mode: Mode, options: LoopOptions): Promise<PublicResult> {
  const bearer = readBearer(plan);
  const port = await (options.open ?? openHosted)(plan.service, bearer).catch(error => { if (error instanceof LoopStop) throw error; return stop("bearer-unusable"); });
  const session = new HostedSession(port);
  try {
    const result = await agentPhase(phase, session, mode, plan.standInBase);
    readBearer(plan);
    return result;
  } finally { await session.close().catch(() => {}); }
}

// ---------------------------------------------------------------- the person's session

async function person(plan: LoopPlan, options: LoopOptions): Promise<Session> {
  const home = personHome(plan);
  if (await durableCliStore(home).config() === null) return stop("no-person-home");
  const session = await openSession(home, options.fetch ? { fetch: options.fetch as never } : {});
  const held = await retained<LoopPlan>(session.ctx.store, "hosted-loop-plan");
  if (held !== null && !same(held, plan)) return stop("plan-differs");
  await retain(session.ctx.store, "hosted-loop-plan", plan);
  return session;
}
export function personPort(session: Session, mode: Mode): PersonPort {
  return {
    read: async (name, args) => {
      const { result } = await session.call(name, args);
      return result.isError ? stop("read-failed") : result.structuredContent;
    },
    act: async (phase, target, digest, kind, input) => {
      const result = await actPhase(session, session, phase, mode, target, digest, kind, input.fields, { ...(input.on === undefined ? {} : { on: input.on }), ...(input.values ? { values: input.values } : {}) });
      return result.fact ?? stop("act-unresolved");
    },
  };
}

async function runInvite(plan: LoopPlan, session: Session, mode: Mode, options: LoopOptions): Promise<PublicResult> {
  const { store } = session.ctx, config = await store.config();
  if (!config?.repository || !config.handle) return stop("room-unresolved");
  if (await store.private("hosted-loop-link") !== null) return { phase: "invite-agent", actor: "person", status: "observed", values: { invited: true } };
  const input = { kind: "agent-key" as const, handle: plan.handles.agent, hours: 1, controller: { membership: config.repository.membership, member: config.handle as `@${string}` } };
  let operation = await retained<string>(store, "hosted-loop-operation");
  if (operation === null) {
    if (mode !== "new") return stop("no-original");
    operation = crypto.randomUUID();
    await retain(store, "hosted-loop-operation", operation);
  }
  const requests = async (): Promise<string[]> => {
    const pointer = (await store.config())?.invitationIssue;
    return pointer ? retainedInvitationRequests(store, pointer) : [];
  };
  const issue = async (given: Mode) => issueInvitation(session.ctx, input, { operation: operation!, mode: given, privateRequests: await requests() } satisfies InvitationIssueOptions);
  let result = await issue(mode);
  // A new member's inbox stays provisional until its creator's confirmation arrives. Each recheck signs and submits no act.
  for (let recheck = 0; mode !== "check" && result.state === "unknown" && recheck < INVITE_RECHECKS; recheck++) {
    await (options.pause ?? (ms => new Promise(resolve => { setTimeout(resolve, ms); })))(INVITE_RECHECK_MS);
    result = await issue("check");
  }
  if (result.state !== "verified" || !result.link) return stop("invitation-unresolved");
  await store.keepPrivate("hosted-loop-link", utf8(result.link));
  const held = await store.config();
  if (held?.invitationIssue) { const { invitationIssue: _finished, ...released } = held; await store.save(released); }
  return { phase: "invite-agent", actor: "person", status: "accepted", values: { invited: true } };
}

async function runCreateAgent(plan: LoopPlan, session: Session, mode: Mode, options: LoopOptions): Promise<PublicResult> {
  const { store } = session.ctx, config = await store.config();
  const link = await store.private("hosted-loop-link"), secret = config ? await store.secret(config.key) : null;
  if (!config?.repository || link === null || secret === null) return stop("no-original");
  if (hasBearer(plan)) { readBearer(plan); return { phase: "create-agent", actor: "person", status: "observed", values: { bearerHeld: true } }; }
  if (mode === "check") return { phase: "create-agent", actor: "person", status: "unresolved", values: { bearerHeld: false } };
  const fetcher = options.fetch ?? globalThis.fetch, key = { secret, now: Date.now };
  const answer = await createAgent(fetcher, key, plan.service, config.repository.membership, new TextDecoder().decode(link));
  // A lost first answer leaves only the receipt, and the bearer is not shown twice. Only an explicit Continue rotates it.
  if (answer.state === "shown" && mode !== "continue") return stop("bearer-unusable");
  writeBearer(plan, answer.state === "issued" ? answer.bearer : await rotateBearer(fetcher, key, plan.service, config.repository.membership, answer.agent));
  return { phase: "create-agent", actor: "person", status: "accepted", values: { agentKey: answer.key, bearerHeld: true } };
}

// ---------------------------------------------------------------- one command

export async function runPhase(plan: LoopPlan, phase: LoopPhase, mode: Mode, options: LoopOptions = {}): Promise<PublicResult> {
  const fetcher = options.fetch ?? globalThis.fetch;
  await checkTarget(plan, fetcher);
  if (phase === "preflight") {
    await checkEndpoint(plan, fetcher);
    return { phase, actor: "operator", status: "observed", values: { version: plan.deploymentVersion, deployment: plan.deployment, endpoint: "open" } };
  }
  if ((agentPhases as readonly string[]).includes(phase)) return runAgent(plan, phase as AgentPhase, mode, options);
  if (phase === "owner") {
    await checkEndpoint(plan, fetcher);
    const home = personHome(plan);
    mkdirSync(dirname(home), { recursive: true, mode: 0o700 });
    const existing = durableCliStore(home), found = await existing.config();
    // STAND-IN, on loopback only: a local register has no public creation offer, so the key that planned it creates the room.
    if (found?.plan && isLoopback(plan.service)) {
      if (found.key !== "operator" || !same(found.register, plan.register)) return stop("plan-differs");
      await existing.save({ ...found, handle: plan.handles.person });
      await retain(existing, "hosted-loop-plan", plan);
      await retain(existing, "s1-done-owner", { phase, status: "observed" });
      return { phase, actor: "person", status: "observed", values: { localFounder: true } };
    }
    if (found !== null && mode === "new") {
      const session = await person(plan, options);
      if (await done(session, phase) !== null) return { phase, actor: "person", status: "observed" };
    }
    const ctx = await initializeOwner(home, { service: plan.service, register: plan.register, handle: plan.handles.person }, mode, { loopback: isLoopback(plan.service) });
    await retain(ctx.store, "hosted-loop-plan", plan);
    await retain(ctx.store, "s1-done-owner", { phase, status: "observed" });
    return { phase, actor: "person", status: "observed" };
  }
  const session = await person(plan, options);
  if (phase === "create") {
    const config = await session.ctx.store.config();
    if (config?.repository && mode === "new") return { phase, actor: "person", status: "observed", refs: roomRefs(config.repository) };
    const ctx: Context = { ...session.ctx, ...(options.fetch ? { fetch: options.fetch as never } : {}) };
    const outcome = await createRoom(ctx, plan.name, mode);
    const after = await session.ctx.store.config();
    if (outcome.code !== 0 || !after?.repository) return stop("room-unresolved");
    return { phase, actor: "person", status: "accepted", refs: roomRefs(after.repository) };
  }
  if (phase === "invite-agent") return runInvite(plan, session, mode, options);
  if (phase === "create-agent") return runCreateAgent(plan, session, mode, options);
  const held = await done(session, phase);
  if (held !== null) return { phase, actor: "person", status: held.status, ...(held.fact ? { facts: { [phase]: held.fact as FactRef } } : {}) };
  return personPhase(phase as PersonPhase, personPort(session, mode), plan.handles.agent);
}
const roomRefs = (repository: { directory: ScopeRef; membership: ScopeRef; rules: string; destination: string }) => ({ directory: repository.directory, membership: repository.membership, rules: repository.rules, destination: repository.destination });

/** Private bytes a line must not carry, known to this process. The closed projection already refuses them; the scan is the second check. */
function privateValues(plan: LoopPlan): string[] {
  const values: string[] = [TEXT.body, TEXT.question, TEXT.comment, TEXT.content, TEXT.goal, TEXT.issueTitle, TEXT.changeTitle, ...TEXT.conditions, ...TEXT.newConditions];
  try { const bearer = readFileSync(bearerPath(plan), "utf8"); values.push(bearer, bearer.slice(bearer.indexOf(".") + 1)); } catch { /* No bearer yet. */ }
  return values;
}

export async function main(argv: readonly string[], options: LoopOptions = {}): Promise<number> {
  let input: string | undefined, phase: string | undefined, diagnosticsPath: string | undefined, mode: Mode = "new";
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i], value = argv[++i];
    if (name === "--input") input = value;
    else if (name === "--phase") phase = value;
    else if (name === "--diagnostics") diagnosticsPath = value;
    else if (name === "--mode" && (value === "new" || value === "check" || value === "continue")) mode = value;
    else { process.stderr.write(USAGE); return 2; }
  }
  if (!input || !diagnosticsPath || !phase || !loopPhases.includes(phase as LoopPhase)) {
    process.stderr.write("Supply --input, --diagnostics <NEW-directory>, and one phase: " + loopPhases.join(", ") + ".\n");
    return 2;
  }
  let diagnostics: Diagnostics | null = null, word = "stopped-unclassified";
  try {
    const plan = readLoopPlan(input);
    diagnostics = newDiagnostics(diagnosticsPath, plan.home);
    const line = publicLine(await runPhase(plan, phase as LoopPhase, mode, options));
    if (scanPublic(line, privateValues(plan)).length > 0) stop("public-output");
    process.stdout.write(line);
    diagnostics.finish({ phase, mode, exitCode: 0, enrollment: null }, "");
    return 0;
  } catch (error) {
    if (error instanceof LoopStop) word = error.word;
    const stderr = `Hosted loop stopped at ${phase}: ${word}. Use check on this phase; use continue only for the same retained original.\n`;
    try { diagnostics?.finish({ phase, mode, exitCode: 1, enrollment: null, stop: word }, stderr); }
    catch { process.stderr.write("Safe diagnostics could not be retained.\n"); }
    process.stderr.write(stderr);
    return 1;
  }
}


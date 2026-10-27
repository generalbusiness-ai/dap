/** Public operational readiness, without a scope read or provider call. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { readDeployment } from "./deployment-setting.ts";
import { artifactsRegisterScope, artifactsReadiness } from "./artifacts-wiring.ts";
import { gitHubRegisterScope, gitHubReadiness } from "./github-wiring.ts";
import type { Binding } from "./namespace.ts";
import type { MetricEnvironment } from "./operational.ts";
import { sessionsOf } from "./sessions.ts";
import { readRegisterScope } from "./register-setting.ts";
import { LATE, within } from "./turn.ts";

export type Readiness = "ready" | "absent" | "not-ready" | "unavailable";
interface HealthEnvironment extends Omit<MetricEnvironment, "DEPLOYMENT"> {
  DEPLOYMENT?: unknown;
  SCOPES: Binding;
  SESSION_SECRET?: unknown;
  GITHUB_APP_CONFIG?: unknown;
  REGISTER_SCOPE?: unknown;
  ARTIFACTS_CONFIG?: unknown;
  ARTIFACTS_NAMESPACE?: unknown;
  ARTIFACTS?: unknown;
  GITHUB_APP_PRIVATE_KEY?: unknown;
  GITHUB_READ_TOKEN?: unknown;
  GITHUB_CREATION_TOKEN?: unknown;
  GITHUB_CLEANUP_TOKENS?: unknown;
}
interface Key { binding: Binding; scope: ScopeId }
const sameHealthKey = (a: Key, b: Key): boolean => a.binding === b.binding && a.scope === b.scope;
const ready = (value: unknown): Readiness => value === "ready" || value === "absent" || value === "not-ready" ? value : "unavailable";

/** One physical probe until it settles, including after a caller's timeout. */
export class HealthProbe {
  #pending: (Key & { promise: Promise<Readiness> }) | null = null;
  #cached: (Key & { result: Readiness; time: number }) | null = null;
  constructor(readonly now: () => number = Date.now, readonly wait: (promise: Promise<Readiness>) => Promise<Readiness | typeof LATE> = promise => within(() => promise, 2)) {}
  async read(binding: Binding, scope: ScopeId): Promise<Readiness> {
    const key = { binding, scope }, cached = this.#cached, age = cached ? this.now() - cached.time : Infinity;
    if (cached && sameHealthKey(cached, key) && age >= 0 && age < 5000) return cached.result;
    let pending = this.#pending;
    if (pending && !sameHealthKey(pending, key)) return "unavailable";
    if (!pending) {
      const promise = Promise.resolve().then(async () => {
        const object = binding.get(binding.idFromName(scope)) as unknown as { readiness(): Promise<unknown> };
        return ready(await object.readiness());
      }).catch((): Readiness => "unavailable");
      pending = { ...key, promise };
      this.#pending = pending;
      const own = pending;
      void promise.then(result => {
        this.#cached = { ...key, result, time: this.now() };
        if (this.#pending === own) this.#pending = null;
      });
    }
    const result = await this.wait(pending.promise);
    return result === LATE ? "unavailable" : result;
  }
}
const probe = new HealthProbe();

/** Null means this is another route; health accepts no query or request body. */
export async function health(request: Request, env: HealthEnvironment, observer = probe): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/health") return null;
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { ...headers, allow: "GET, HEAD" } });
  if (url.search || request.body !== null) return new Response(null, { status: 400, headers });
  const sessions = sessionsOf(env.SESSION_SECRET, env.DEPLOYMENT) ? "ok" : "unavailable";
  const github = gitHubRegisterScope(env.GITHUB_APP_CONFIG), artifacts = artifactsRegisterScope(env.ARTIFACTS_CONFIG);
  const selected = github ?? artifacts;
  const explicit = env.REGISTER_SCOPE === undefined ? null : readRegisterScope(env);
  const register = explicit !== null ? explicit.kind === "pinned" ? await observer.read(env.SCOPES, explicit.scope) : "unavailable"
    : github && artifacts && github !== artifacts ? "ambiguous" : selected === null ? "unconfigured" : await observer.read(env.SCOPES, selected);
  const deployment = readDeployment(env.DEPLOYMENT) ?? "unknown";
  const artifactsState = artifactsReadiness(env), githubState = gitHubReadiness(env);
  const wiring = { artifacts: artifactsState.state === "wired" ? { state: "wired" as const } : artifactsState,
    github: githubState.state === "wired" ? { state: "wired" as const } : githubState };
  const configuredOff = [artifactsState, githubState].some(state => state.state === "off" && state.reason !== "unconfigured");
  const version = typeof env.VERSION_METADATA?.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(env.VERSION_METADATA.id) ? env.VERSION_METADATA.id : "unknown";
  return new Response(request.method === "HEAD" ? null : JSON.stringify({ deployment, version, sessions, register, wiring }), { status: sessions === "ok" && register === "ready" && !configuredOff ? 200 : 503, headers });
}

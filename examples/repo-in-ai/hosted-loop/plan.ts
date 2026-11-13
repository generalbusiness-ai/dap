/** The run's input and the check of its target. The input holds only inert public references. */
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { isScopeRef, parseStrict } from "@generalbusiness/dap-bytes";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { isHandle } from "@generalbusiness/dap-platform";
import { stop } from "./words.ts";

export interface LoopPlan {
  v: 1;
  service: string;
  deployment: string;
  deploymentVersion: string;
  register: ScopeRef;
  name: string;
  home: string;
  handles: { person: string; agent: string };
  /** A STAND-IN for a published head, on a loopback Worker whose room publishes nothing. An HTTPS input refuses it. */
  standInBase?: string;
}
const VERSION = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const closed = (x: unknown, required: readonly string[], optional: readonly string[] = []): x is Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x) && required.every(field => Object.hasOwn(x, field)) && Object.keys(x).every(field => required.includes(field) || optional.includes(field));
export const isLoopback = (service: string): boolean => {
  const url = new URL(service);
  return url.protocol === "http:" && url.hostname === "127.0.0.1";
};

/** Refuses an input with a usable shape that names the real room, a deployed version it cannot show, or a stand-in on a deployed Worker. */
export function readLoopPlan(path: string): LoopPlan {
  let value: unknown;
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 16_384) return stop("input");
    value = parseStrict(readFileSync(path, "utf8"));
  } catch { return stop("input"); }
  if (!closed(value, ["v", "service", "deployment", "deploymentVersion", "register", "name", "home", "handles"], ["standInBase"]) || value["v"] !== 1
    || typeof value["service"] !== "string" || typeof value["deployment"] !== "string" || typeof value["deploymentVersion"] !== "string"
    || !isScopeRef(value["register"]) || typeof value["home"] !== "string" || typeof value["name"] !== "string"
    || !closed(value["handles"], ["person", "agent"]) || !isHandle(value["handles"]["person"]) || !isHandle(value["handles"]["agent"]) || value["handles"]["person"] === value["handles"]["agent"]) return stop("input");
  let service: URL;
  try { service = new URL(value["service"]); } catch { return stop("input"); }
  if (service.origin !== value["service"] || service.username || service.password || !(service.protocol === "https:" || isLoopback(value["service"]))) return stop("input");
  if (!isAbsolute(value["home"]) || resolve(value["home"]) !== value["home"]) return stop("input");
  // A local Worker has no version metadata and answers `unknown`. A deployed target always shows its exact version.
  const loopback = isLoopback(value["service"]);
  if (!VERSION.test(value["deploymentVersion"]) && !(loopback && value["deploymentVersion"] === "unknown")) return stop("input");
  if (value["standInBase"] !== undefined && (!loopback || typeof value["standInBase"] !== "string" || !/^[0-9a-f]{40}$/.test(value["standInBase"]))) return stop("input");
  // A scratch room only. The label and the home keep this script away from the real room's identities.
  if (!/^hosted-loop-[a-z0-9-]{1,36}$/.test(value["name"]) || value["home"].split("/").includes("repo-in-ai")) return stop("scratch-only");
  return value as unknown as LoopPlan;
}

export const personHome = (plan: LoopPlan): string => join(plan.home, "person");
export const agentHome = (plan: LoopPlan): string => join(plan.home, "agent");
export const bearerPath = (plan: LoopPlan): string => join(agentHome(plan), "bearer");

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** The Worker that answers now against the input: its deployment and exact version, and its readiness. */
export async function checkTarget(plan: LoopPlan, fetcher: Fetcher = globalThis.fetch): Promise<void> {
  let health: Record<string, unknown>;
  try {
    const response = await fetcher(plan.service + "/health", { redirect: "error", signal: AbortSignal.timeout(8_000) });
    const text = await response.text();
    if (text.length > 32_768) return stop("target-unavailable");
    health = parseStrict(text) as Record<string, unknown>;
  } catch { return stop("target-unavailable"); }
  if (health["deployment"] !== plan.deployment || health["version"] !== plan.deploymentVersion) return stop("target-version");
  if (health["sessions"] !== "ok" || health["register"] !== "ready") return stop("target-unavailable");
}

/**
 * Whether the hosted endpoint answers at all, with no bearer and no body. An open endpoint refuses the missing bearer with 401, and a
 * closed one (`MCP_ENABLED` unset or invalid) answers 404. It reads nothing of a room and spends nothing.
 */
export async function checkEndpoint(plan: LoopPlan, fetcher: Fetcher = globalThis.fetch): Promise<void> {
  let status: number;
  try {
    const response = await fetcher(plan.service + "/mcp", { method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000) });
    status = response.status;
    await response.body?.cancel();
  } catch { return stop("target-unavailable"); }
  if (status === 404) return stop("endpoint-closed");
  if (status !== 401) return stop("target-unavailable");
}

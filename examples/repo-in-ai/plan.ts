/** Private setup plan and immutable phase receipts. No invitation is public output. */
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { canonicalize, isScopeRef, parseStrict, same, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import type { Store } from "../../packages/cli/src/store.ts";
import { isHandle } from "@generalbusiness/dap-platform";

export interface SetupPlan {
  v: 1;
  service: string;
  providerOrigin: string;
  deploymentVersion: string;
  register: ScopeRef;
  namespace: "dap-demo";
  name: string;
  home: string;
  handles: { owner: string; "agent-a": string; "agent-b": string; checker: string };
}
export type Identity = keyof SetupPlan["handles"];
const closed = (x: unknown, fields: readonly string[]): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x) && Object.keys(x).length === fields.length && fields.every(field => Object.hasOwn(x, field));
const label = (x: unknown): x is string => typeof x === "string" && /^[a-z][a-z0-9-]{0,47}$/.test(x);

export function readPlan(path: string): SetupPlan {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 16_384) throw new Error("Use a regular setup input file under 16 KiB.");
  const value = parseStrict(readFileSync(path, "utf8"));
  if (!closed(value, ["v", "service", "providerOrigin", "deploymentVersion", "register", "namespace", "name", "home", "handles"]) || value["v"] !== 1
    || typeof value["service"] !== "string" || typeof value["providerOrigin"] !== "string" || !isScopeRef(value["register"]) || value["register"].kind !== "register"
    || typeof value["deploymentVersion"] !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value["deploymentVersion"])
    || value["namespace"] !== "dap-demo" || !label(value["name"]) || typeof value["home"] !== "string"
    || !isAbsolute(value["home"]) || resolve(value["home"]) !== value["home"]
    || !closed(value["handles"], ["owner", "agent-a", "agent-b", "checker"])
    || !Object.values(value["handles"]).every(handle => typeof handle === "string" && isHandle(handle)) || new Set(Object.values(value["handles"])).size !== 4) throw new Error("The setup input is incomplete or invalid.");
  const service = new URL(value["service"]);
  if (service.protocol !== "https:" || service.username || service.password || service.origin !== value["service"]) throw new Error("Use the explicit HTTPS scope service origin.");
  const provider = new URL(value["providerOrigin"]);
  if (provider.protocol !== "https:" || provider.origin !== value["providerOrigin"] || provider.username || provider.password || provider.origin === service.origin) throw new Error("Use the explicit HTTPS Artifacts provider origin.");
  return value as unknown as SetupPlan;
}

export const identityHome = (plan: SetupPlan, identity: Identity): string => join(plan.home, identity);

/** The operator supplies the version from the reviewed deployment receipt. */
export async function checkDeployment(plan: SetupPlan): Promise<void> {
  const response = await fetch(plan.service + "/health", { redirect: "error", signal: AbortSignal.timeout(8_000) });
  if (!response.ok || !response.body) throw new Error("The selected deployment is unavailable.");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const value = await reader.read();
      if (value.done) break;
      size += value.value.length;
      if (size > 32_768) throw new Error("The deployment answer exceeds its bound.");
      chunks.push(value.value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const health = parseStrict(new TextDecoder("utf8", { fatal: true }).decode(bytes)) as Record<string, unknown>;
  const wiring = health["wiring"] as { artifacts?: { state?: unknown } } | undefined;
  if (health["deployment"] !== "dap-demo" || health["version"] !== plan.deploymentVersion || health["register"] !== "ready" || health["sessions"] !== "ok" || wiring?.artifacts?.state !== "wired") throw new Error("The live Worker does not match the selected deployment.");
}

export async function retain(store: Store, name: string, value: unknown): Promise<void> {
  const bytes = utf8(canonicalize(value));
  if (bytes.length > 256 * 1024) throw new Error("The private setup receipt exceeds its bound.");
  const old = await store.private(name);
  if (old !== null) {
    if (old.length !== bytes.length || !old.every((byte, i) => byte === bytes[i])) throw new Error("A retained setup value differs. Nothing was replaced.");
    return;
  }
  await store.keepPrivate(name, bytes);
  const readback = await store.private(name);
  if (readback === null || readback.length !== bytes.length || !readback.every((byte, i) => byte === bytes[i])) throw new Error("The private setup receipt could not be read back.");
}

export async function retained<T>(store: Store, name: string): Promise<T | null> {
  const bytes = await store.private(name);
  if (bytes === null) return null;
  if (bytes.length > 256 * 1024) throw new Error("The private setup receipt exceeds its bound.");
  return parseStrict(new TextDecoder("utf8", { fatal: true }).decode(bytes)) as T;
}

export async function bindPlan(store: Store, plan: SetupPlan): Promise<void> {
  const old = await retained<SetupPlan>(store, "repo-in-ai-plan");
  if (old !== null && !same(old, plan)) throw new Error("This identity belongs to a different setup plan.");
  await retain(store, "repo-in-ai-plan", plan);
}

export function receiptName(phase: string, value: unknown): string {
  // The full value is checked by retain; a short filename is only a lookup key.
  return "s1-" + textDigest(canonicalize({ phase, value })).slice(7, 35);
}

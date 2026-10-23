/** One configured Register17 projection; grants nothing and wakes no work. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord as record, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { isScopeRef } from "@generalbusiness/dap-derive";
import type { CreationOffer } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, DEMO_PURPOSE, DEMO_REGISTER, WEB_DEMO_REGISTER } from "@generalbusiness/dap-platform";
import { artifactsConfiguration, ARTIFACTS_HOST, ARTIFACTS_NAMESPACE, type ArtifactsBindings } from "./artifacts-wiring.ts";
import type { Store } from "./store.ts";
const ORIGIN = "https://dap-demo.inguz.workers.dev";
export interface DemoCreationBindings extends Pick<ArtifactsBindings, "ARTIFACTS_CONFIG" | "ARTIFACTS_NAMESPACE"> { DEMO_START_CONFIG?: string; DEPLOYMENT?: string }
/** Checked internal native projection context, not the public config wire. */
interface CurrentDemoCreationConfig { v: 2; origin: string; deployment: string; register: ScopeRef; definition: typeof ARCHIVE_DEVICE_APPLICATION_COHORT.register; namespace: string }
export type DemoCreationConfig = CurrentDemoCreationConfig | LegacyGitHubDemoContext;
interface DemoCreationSettings { current: CurrentDemoCreationConfig }
export type DemoCreationOffer = CreationOffer;
export const registerRef = (value: unknown): value is ScopeRef => record(value) && Object.keys(value).length === 3 && isScopeRef(value) && value.kind === "register";
export function demoCreationConfig(raw: string | undefined, deployment: string | undefined, bindings: Pick<ArtifactsBindings, "ARTIFACTS_CONFIG" | "ARTIFACTS_NAMESPACE"> = {}): DemoCreationSettings | null {
  try {
    if (!raw || utf8(raw).length > 4096) return null;
    const value = parseStrict(raw), artifacts = artifactsConfiguration(bindings.ARTIFACTS_CONFIG);
    if (!record(value) || Object.keys(value).sort().join() !== "definition,deployment,origin,register,v" || value["v"] !== 3
      || typeof deployment !== "string" || !deployment || deployment.length > 256 || value["deployment"] !== deployment
      || value["origin"] !== ORIGIN || value["definition"] !== ARCHIVE_DEVICE_APPLICATION_COHORT.register || !registerRef(value["register"])
      || !artifacts || artifacts.namespace !== (bindings.ARTIFACTS_NAMESPACE ?? ARTIFACTS_NAMESPACE)
      || value["register"].scope !== artifacts.registerScope) return null;
    return { current: { v: 2, origin: ORIGIN, deployment, register: structuredClone(value["register"]), definition: ARCHIVE_DEVICE_APPLICATION_COHORT.register, namespace: artifacts.namespace } };
  } catch { return null; }
}
/** Recorded state only; actual incarnation is checked after this native lookup. */
export function demoCreationOffer(store: Pick<Store, "scope" | "page">, pinned: string | undefined, config: DemoCreationConfig): DemoCreationOffer | null {
  // Exact retained context only. The HTTP route requires an explicit full
  // reference and never selects this branch for fresh discovery.
  if (config.v === 1) {
    const scope = store.scope();
    if (!scope || scope.status !== "active" || ![DEMO_REGISTER, WEB_DEMO_REGISTER].includes(config.definition)
      || pinned !== config.definition || canonicalize(scope.at) !== canonicalize(config.register)) return null;
    const page = store.page("register", ["open"], null, 1), item = page.items[0];
    if (page.more || page.items.length !== 1 || !item || item.type !== "register" || item.state !== "open"
      || item.values["purpose"] !== DEMO_PURPOSE || item.values["policy"] !== "open"
      || typeof item.values["host"] !== "string" || typeof item.values["namespace"] !== "string") return null;
    const offer: DemoCreationOffer = { v: 1, origin: config.origin, register: structuredClone(config.register), definition: config.definition,
      at: structuredClone(scope.head), registerItem: { id: item.id, revision: item.revision, state: "open",
        host: item.values["host"], namespace: item.values["namespace"], policy: "open", purpose: DEMO_PURPOSE } };
    return utf8(canonicalize(offer)).length <= 16 * 1024 ? offer : null;
  }
  const scope = store.scope();
  if (config.v !== 2 || config.definition !== ARCHIVE_DEVICE_APPLICATION_COHORT.register || !scope || scope.status !== "active"
    || pinned !== config.definition || canonicalize(scope.at) !== canonicalize(config.register)) return null;
  const page = store.page("register", ["open"], null, 1), item = page.items[0];
  if (page.more || page.items.length !== 1 || !item || item.type !== "register" || item.state !== "open"
    || item.values["policy"] !== "open" || item.values["host"] !== ARTIFACTS_HOST || item.values["namespace"] !== config.namespace) return null;
  const offer: DemoCreationOffer = { v: 2, origin: config.origin, register: structuredClone(config.register), definition: config.definition,
    at: structuredClone(scope.head), registerItem: { id: item.id, revision: item.revision, state: "open", host: ARTIFACTS_HOST, namespace: config.namespace, policy: "open" } };
  return utf8(canonicalize(offer)).length <= 16 * 1024 ? offer : null;
}

/** Retained GitHub host authority and exact-reference preflight only.
 * Fresh discovery never selects this legacy decoder. */
const LEGACY_ORIGINS = new Set(["https://artroom-scope.inguz.workers.dev", "https://artroom-rehearsal.inguz.workers.dev"]);
interface LegacyGitHubDemoContext { v: 1; origin: string; deployment: string; register: ScopeRef; definition: typeof DEMO_REGISTER | typeof WEB_DEMO_REGISTER }
interface LegacyGitHubDemoSettings { current: LegacyGitHubDemoContext; legacy: LegacyGitHubDemoContext | null }
export function legacyGitHubDemoConfig(raw: string | undefined, deployment: string | undefined): LegacyGitHubDemoSettings | null {
  try {
    if (!raw || utf8(raw).length > 4096) return null;
    const value = parseStrict(raw);
    if (!record(value) || !["v", "origin", "deployment", "register", "definition", "legacy"].every(key => key === "legacy" || Object.hasOwn(value, key)) || Object.keys(value).some(key => !["v", "origin", "deployment", "register", "definition", "legacy"].includes(key))) return null;
    if (typeof deployment !== "string" || !deployment || deployment.length > 256 || value["deployment"] !== deployment || typeof value["origin"] !== "string" || !LEGACY_ORIGINS.has(value["origin"]) || !registerRef(value["register"])) return null;
    if (value["v"] === 1 ? Object.keys(value).length !== 5 || value["definition"] !== DEMO_REGISTER : value["v"] !== 2 || value["definition"] !== WEB_DEMO_REGISTER) return null;
    const current: LegacyGitHubDemoContext = { v: 1, origin: value["origin"], deployment, register: structuredClone(value["register"]), definition: value["v"] === 1 ? DEMO_REGISTER : WEB_DEMO_REGISTER };
    let legacy: LegacyGitHubDemoContext | null = null;
    const held = value["legacy"];
    if (held !== undefined && held !== null) {
      if (!record(held) || Object.keys(held).sort().join(",") !== "definition,register" || held["definition"] !== DEMO_REGISTER || !registerRef(held["register"]) || held["register"].scope === current.register.scope) return null;
      legacy = { ...current, register: structuredClone(held["register"]), definition: DEMO_REGISTER };
    }
    return { current, legacy };
  } catch { return null; }
}

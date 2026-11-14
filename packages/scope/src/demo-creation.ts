import { answersVersionQuestion, BASE_COHORT, FAILED_CLAIM_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { readDeployment } from "./deployment-setting.ts";
import { readPublicOrigin } from "./public-origin.ts";
/** One configured native register projection; grants nothing and wakes no work. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord as record, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { isScopeRef } from "@generalbusiness/dap-derive";
import type { CreationOffer } from "@generalbusiness/dap-client";

import { artifactsConfiguration, ARTIFACTS_HOST, ARTIFACTS_NAMESPACE, type ArtifactsBindings } from "./artifacts-wiring.ts";
import type { Store } from "./store.ts";
export interface DemoCreationBindings extends Pick<ArtifactsBindings, "ARTIFACTS_CONFIG" | "ARTIFACTS_NAMESPACE"> { DEMO_START_CONFIG?: string; DEPLOYMENT?: string }
/** Checked internal native projection context, not the public config wire. */
type DemoDefinition = typeof ARCHIVE_DEVICE_APPLICATION_COHORT.register | typeof FAILED_CLAIM_COHORT.register | typeof BASE_COHORT.register;
const demoDefinition = (value: unknown): value is DemoDefinition => answersVersionQuestion(value, "scopeDemoCreationRegister");
interface CurrentDemoCreationConfig { v: 2; origin: string; deployment: string; register: ScopeRef; definition: DemoDefinition; namespace: string }
export type DemoCreationConfig = CurrentDemoCreationConfig;
interface DemoCreationSettings { current: CurrentDemoCreationConfig }
export type DemoCreationOffer = CreationOffer;
export const registerRef = (value: unknown): value is ScopeRef => record(value) && Object.keys(value).length === 2 && isScopeRef(value);
export function demoCreationConfig(raw: string | undefined, deployment: string | undefined, bindings: Pick<ArtifactsBindings, "ARTIFACTS_CONFIG" | "ARTIFACTS_NAMESPACE"> = {}): DemoCreationSettings | null {
  try {
    if (!raw || utf8(raw).length > 4096) return null;
    const value = parseStrict(raw), artifacts = artifactsConfiguration(bindings.ARTIFACTS_CONFIG);
    if (!record(value) || Object.keys(value).sort().join() !== "definition,deployment,origin,register,v" || value["v"] !== 3
      || typeof deployment !== "string" || readDeployment(deployment) === null || value["deployment"] !== deployment
      || typeof value["origin"] !== "string" || !demoDefinition(value["definition"]) || !registerRef(value["register"])
      || !artifacts || artifacts.namespace !== (bindings.ARTIFACTS_NAMESPACE ?? ARTIFACTS_NAMESPACE)
      || value["register"].scope !== artifacts.registerScope) return null;
    const origin = readPublicOrigin({ PUBLIC_ORIGIN: value["origin"] }, value["origin"]);
    if (origin === null) return null;
    return { current: { v: 2, origin, deployment, register: structuredClone(value["register"]), definition: value["definition"], namespace: artifacts.namespace } };
  } catch { return null; }
}
/** Recorded state only; actual incarnation is checked after this native lookup. */
export function demoCreationOffer(store: Pick<Store, "scope" | "page">, pinned: string | undefined, config: DemoCreationConfig): DemoCreationOffer | null {
  const scope = store.scope();
  if (config.v !== 2 || !demoDefinition(config.definition) || !scope || scope.status !== "active"
    || pinned !== config.definition || canonicalize(scope.at) !== canonicalize(config.register)) return null;
  const page = store.page("register", ["open"], null, 1), item = page.items[0];
  if (page.more || page.items.length !== 1 || !item || item.type !== "register" || item.state !== "open"
    || item.values["policy"] !== "open" || item.values["host"] !== ARTIFACTS_HOST || item.values["namespace"] !== config.namespace) return null;
  const offer: DemoCreationOffer = { v: 2, origin: config.origin, register: structuredClone(config.register), definition: config.definition,
    at: structuredClone(scope.head), registerItem: { id: item.id, revision: item.revision, state: "open", host: ARTIFACTS_HOST, namespace: config.namespace, policy: "open" } };
  return utf8(canonicalize(offer)).length <= 16 * 1024 ? offer : null;
}

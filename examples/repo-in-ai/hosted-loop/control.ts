/** The controller's hosted agent: one signed control request, with the plaintext bearer shown once. */
import { b64url, canonicalize, digestBytes, signControl, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import type { ControlRequest, KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { keyIdOfSecret } from "@generalbusiness/dap-bytes";
import { stop } from "./words.ts";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
const CREATE_OP = "hosted-loop-create-agent", ROTATE_OP = "hosted-loop-rotate-agent";
export interface ControlKey { secret: Uint8Array; now: () => number }

function header(key: ControlKey, action: ControlRequest["action"], service: string, membership: ScopeRef, agent: string | null, body: string, op: string): string {
  const request: ControlRequest = { v: 1, action, service, membership, agent, actor: keyIdOfSecret(key.secret) as KeyId, body: digestBytes(utf8(body)), op, notAfter: timeOf(key.now() + 60_000) };
  const signed = signControl(request, key.secret);
  return `Control ${b64url(utf8(canonicalize(request as never)))}.${signed.sig}`;
}
async function json(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}
export type CreatedAgent = { state: "issued"; agent: string; key: string; bearer: string } | { state: "shown"; agent: string; key: string };

/** `create`, under the fixed op. A repeat returns the receipt, and no repeat returns the bearer. A 503 leaves the reservation for the same op. */
export async function createAgent(fetcher: Fetcher, key: ControlKey, service: string, membership: ScopeRef, link: string): Promise<CreatedAgent> {
  const body = JSON.stringify({ link });
  const response = await fetcher(service + "/mcp/agents", { method: "POST", headers: { authorization: header(key, "create", service, membership, null, body, CREATE_OP), "content-type": "application/json" }, body, redirect: "error" });
  const answer = await json(response);
  if (response.status === 503) return stop("agent-unresolved");
  if (response.status !== 201 || typeof answer["agent"] !== "string" || typeof answer["key"] !== "string") return stop("agent-create-refused");
  return typeof answer["bearer"] === "string" ? { state: "issued", agent: answer["agent"], key: answer["key"], bearer: answer["bearer"] } : { state: "shown", agent: answer["agent"], key: answer["key"] };
}

/** A new bearer for a bearer whose first answer was lost. Rotation is the documented road: the server cannot show the old one again. */
export async function rotateBearer(fetcher: Fetcher, key: ControlKey, service: string, membership: ScopeRef, agent: string): Promise<string> {
  const body = "{}";
  const response = await fetcher(`${service}/mcp/agents/${agent}/bearer`, { method: "POST", headers: { authorization: header(key, "bearer", service, membership, agent, body, ROTATE_OP), "content-type": "application/json" }, body, redirect: "error" });
  const answer = await json(response);
  return response.status === 200 && typeof answer["bearer"] === "string" ? answer["bearer"] : stop("bearer-unusable");
}

/** TEST-only bounded loopback hop to the actual Node Runner. No signer or
 * credential is in RunAsk. This bridge does not replace native admission. */
import { b64url } from "@generalbusiness/dap-bytes";
import { RunIdentityRefusal, type Configuration, type Job, type RunAsk, type Runner } from "../../../../../packages/checkers/src/index.ts";

export interface ContainerRunnerTest { url: string; nonce: string; image: Configuration["image"]; environment: Configuration["environment"] }
declare module "vitest" { interface ProvidedContext { j3Runner: ContainerRunnerTest | null } }
export function containerTestRunner(settings: ContainerRunnerTest): Runner {
  const url = new URL(settings.url);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/" || url.search || url.hash || url.username || url.password || !/^[a-f0-9]{64}$/.test(settings.nonce)) throw Error("TEST runner bridge address refused");
  const call = async (kind: "run" | "find", value: RunAsk | { run: string; expectedJob?: Job }): Promise<unknown> => {
    const bytes = JSON.stringify(value, (_key, field) => field instanceof Uint8Array ? { $bytes: b64url(field) } : field);
    if (new TextEncoder().encode(bytes).length > 2 * 1024 * 1024) throw Error("TEST runner bridge request bound");
    const response = await fetch(new URL(kind, url), { method: "POST", headers: { "content-type": "application/json", "x-j3-test": settings.nonce }, body: bytes, redirect: "manual", signal: AbortSignal.timeout(210_000) });
    if (![200, 409].includes(response.status) || !response.body) throw Error("TEST runner bridge did not complete");
    const reader = response.body.getReader(); let size = 0, text = ""; const decoder = new TextDecoder("utf-8", { fatal: true });
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 64 * 1024) throw Error("TEST runner bridge response bound"); text += decoder.decode(chunk.value, { stream: true }); } const value: unknown = JSON.parse(text + decoder.decode());
      if (response.status === 409) { if (value && typeof value === "object" && Object.keys(value).length === 1 && "error" in value && value.error === "run-identity-refused") throw new RunIdentityRefusal(); throw Error("TEST runner bridge refusal malformed"); }
      return value; }
    finally { await reader.cancel().catch(() => undefined); }
  };
  return { run: ask => call("run", ask), find: (run, expectedJob) => call("find", { run, ...(expectedJob ? { expectedJob } : {}) }) };
}

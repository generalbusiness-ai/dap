/** Explicit physical runner case. Native authority and job facts come from
 * the actual cohort fixture; Git/provider, clock and durability remain TEST stands. */
import { expect } from "vitest";
import type { Digest } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, sign, timeMs } from "@generalbusiness/dap-bytes";
import { CheckerService, Outcomes, RunIdentityRefusal, type Durable, type Job, type RunAsk, type Runner, type Variable } from "../../checkers/src/index.ts";
import type { EvidenceRoom, PreparedEvidenceWork } from "./evidence-rules-real-fixture.ts";
import { net } from "./net.ts";

export interface EvidenceRunnerSettings { url: string; nonce: string; image: Digest; environment: readonly Variable[] }
declare module "vitest" { interface ProvidedContext { evidenceRunner: EvidenceRunnerSettings | null } }

function physicalRunner(settings: EvidenceRunnerSettings): Runner {
  const url = new URL(settings.url);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/" || url.search || url.hash || url.username || url.password
    || !/^[a-f0-9]{64}$/.test(settings.nonce)) throw Error("TEST evidence bridge address refused");
  const call = async (kind: "run" | "find", value: RunAsk | { run: string; expectedJob?: Job }): Promise<unknown> => {
    const wire = JSON.stringify(value, (_key, field) => field instanceof Uint8Array ? { $bytes: b64url(field) } : field);
    if (new TextEncoder().encode(wire).length > 24 * 1024 * 1024) throw Error("TEST evidence bridge request bound");
    const response = await fetch(new URL(kind, url), { method: "POST", headers: { "content-type": "application/json", "x-evidence-test": settings.nonce },
      body: wire, redirect: "manual", signal: AbortSignal.timeout(210_000) });
    if (![200, 409].includes(response.status) || !response.body) throw Error("TEST evidence bridge did not complete");
    const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
    let size = 0, text = "";
    try {
      for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length;
        if (size > 65536) throw Error("TEST evidence bridge response bound"); text += decoder.decode(chunk.value, { stream: true }); }
      const result: unknown = JSON.parse(text + decoder.decode());
      if (response.status === 409) {
        if (result && typeof result === "object" && Object.keys(result).join() === "error" && "error" in result && result.error === "run-identity-refused") throw new RunIdentityRefusal();
        throw Error("TEST evidence bridge refusal malformed");
      }
      return result;
    } finally { await reader.cancel().catch(() => undefined); }
  };
  return { run: ask => call("run", ask), find: (run, expectedJob) => call("find", { run, ...(expectedJob ? { expectedJob } : {}) }) };
}

/** The in-memory durable port is TEST storage; the production Outcomes state machine runs unchanged. */
class TestDurable implements Durable {
  readonly values = new Map<string, string>();
  async create(key: string, value: string) { if (this.values.has(key)) return false; this.values.set(key, value); return true; }
  async read(key: string) { return this.values.get(key) ?? null; }
  async replace(key: string, expected: string, next: string) { if (this.values.get(key) !== expected) return false; this.values.set(key, next); return true; }
}

export async function runEvidenceContainerCase(room: EvidenceRoom, prepared: PreparedEvidenceWork, settings: EvidenceRunnerSettings) {
  expect(prepared.configuration.image).toBe(settings.image);
  expect(canonicalize(prepared.configuration.environment)).toBe(canonicalize(settings.environment));
  expect(prepared.binding.source).toBe("room");
  expect(prepared.binding.roomService?.key).toBe(prepared.service.actor.key);
  const admitted = await prepared.record();
  expect(admitted).toMatchObject({ state: "admitted", job: prepared.job, bindingDigest: prepared.bindingDigest });
  const physical = physicalRunner(settings), outcomes = new Outcomes(new TestDurable());
  let runs = 0;
  const runner: Runner = { find: (run, expected) => physical.find(run, expected), run: async ask => {
    runs++;
    expect(ask.job.fact).toEqual(prepared.job);
    expect(ask.job.overlay).toMatchObject({ commit: prepared.commit, tree: prepared.tree, base: prepared.base });
    expect(ask.job.snapshot).toBeUndefined();
    return physical.run(ask);
  } };
  const service = new CheckerService({ signer: { key: prepared.service.actor.key, sign: bytes => sign(prepared.service.actor.secret, bytes) },
    scopes: prepared.scopes, runner, outcomes, evidenceDefinitions: prepared.definitions,
    clock: () => timeMs(net.clock.now)!, random: length => crypto.getRandomValues(new Uint8Array(length)) });
  const reply = await room.life.wait(() => service.deliver(prepared.notice));
  expect(reply).toMatchObject({ did: "submitted", ran: true, outcome: { act: "check", outcome: "passed" } });
  const counted = await prepared.assertCounted();
  expect(counted.bindingDigest).toBe(prepared.bindingDigest);
  expect(await outcomes.get(prepared.job)).toMatchObject({ state: "admitted", signed: { intent: { actor: prepared.service.actor.key, fields: { bindingDigest: prepared.bindingDigest } } } });
  await room.life.wait(() => service.deliver(prepared.notice));
  expect(runs).toBe(1);
  expect((await prepared.record()).result).toEqual(counted.result);
}

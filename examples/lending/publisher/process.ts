/** Actual Node child for the publisher witnesses. Scope calls use IPC, never HTTP. */
import { isMemberRef, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";
import type { ScopeApi } from "@generalbusiness/dap-contract";
import { Custody, ScopeHandle, TransportError, secretSigner, type Signer } from "@generalbusiness/dap-client";
import { fileStore } from "@generalbusiness/dap-client/node";
import { LocalGit } from "./git.ts";
import { SCOPE_METHODS, type ChildMessage, type ProcessConfig, type ScopeMethod } from "./ipc.ts";
import { publish } from "./publisher.ts";
import { PUBLISHER_READER } from "./support.ts";

interface Waiting { kind: "reply" | "resume"; resolve(value: unknown): void; reject(reason: Error): void }
const waiting = new Map<number, Waiting>();
let next = 0, started = false;

function send(message: ChildMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!process.send || !process.connected) { reject(new TransportError("Test parent disconnected.")); return; }
    process.send(message, error => error ? reject(new TransportError("Test parent disconnected.")) : resolve());
  });
}

function ask(message: (id: number) => Extract<ChildMessage, { kind: "call" | "stage" }>): Promise<unknown> {
  const id = ++next;
  const question = message(id);
  return new Promise((resolve, reject) => {
    waiting.set(id, { kind: question.kind === "call" ? "reply" : "resume", resolve, reject });
    void send(question).catch(error => { waiting.delete(id); reject(error); });
  });
}

function call(method: ScopeMethod, args: readonly unknown[]): Promise<unknown> {
  return ask(id => ({ kind: "call", id, method, args }));
}

function isConfig(value: unknown): value is ProcessConfig {
  if (!isRecord(value) || !Array.isArray(value["seed"]) || value["seed"].length !== 32
    || !value["seed"].every(byte => typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255)
    || !isScopeRef(value["target"]) || !isMemberRef(value["member"]) || typeof value["now"] !== "number" || !Number.isSafeInteger(value["now"])) return false;
  if (!["service", "bare", "work", "custody"].every(name => typeof value[name] === "string")) return false;
  const repository = value["repository"];
  return isRecord(repository) && ["host", "namespace", "name"].every(name => typeof repository[name] === "string");
}

async function run(config: ProcessConfig): Promise<void> {
  const base = secretSigner(new Uint8Array(config.seed));
  const signer: Signer = { key: base.key, sign: async bytes => {
    const signature = await base.sign(bytes);
    await send({ kind: "signed" });
    return signature;
  } };
  // The fixed internal method table is the only cast across the IPC boundary.
  const transport = Object.fromEntries(SCOPE_METHODS.map(method => [method, (...args: unknown[]) => call(method, args)])) as unknown as ScopeApi;
  const scope = new ScopeHandle(transport, config.target.scope, PUBLISHER_READER);
  const git = await LocalGit.open(config.bare, config.work);
  const custody = new Custody(fileStore(config.custody, undefined, () => config.now), () => new Date(config.now).toISOString());
  const result = await publish({
    scope, target: config.target, member: config.member, service: config.service, repository: config.repository,
    signer, git, custody, now: () => config.now,
    stage: async (name, publication) => {
      await ask(id => ({ kind: "stage", id, name, ...(publication === undefined ? {} : { publication }) }));
    },
  });
  await send({ kind: "result", result });
}

function close(): void { if (process.connected) process.disconnect(); }

process.on("message", (message: unknown) => {
  if (!isRecord(message)) return;
  if (message["kind"] === "start" && !started) {
    started = true;
    // The owning test supplies this closed, public TEST fixture configuration.
    const start = async () => {
      if (!isConfig(message["config"])) throw new Error("Invalid TEST configuration.");
      await run(message["config"]);
    };
    void start().then(close, async () => {
      process.exitCode = 1;
      try { await send({ kind: "error", message: "fixed" }); } catch { /* The parent already disconnected. */ } finally { close(); }
    });
    return;
  }
  const id = message["id"];
  if (typeof id !== "number" || !Number.isSafeInteger(id)) return;
  const pending = waiting.get(id);
  if (!pending) return;
  if (message["kind"] === "resume" && pending.kind === "resume") {
    waiting.delete(id); pending.resolve(undefined);
  } else if (message["kind"] === "reply" && pending.kind === "reply") {
    waiting.delete(id);
    if (message["error"] !== undefined) pending.reject(new TransportError("Test scope reply was lost."));
    else pending.resolve(message["value"]);
  }
});
process.on("disconnect", () => {
  for (const pending of waiting.values()) pending.reject(new TransportError("Test parent disconnected."));
  waiting.clear();
});
void send({ kind: "ready" }).catch(() => { process.exitCode = 1; close(); });

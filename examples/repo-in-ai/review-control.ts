/** One deliberate native negative control; MCP catalogue policy stays intact. */
import { lstatSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { canonicalize, intentDigest, isLocalId, isScopeRef, same, timeOf, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { httpTransport, signedIntent, TransportError } from "@generalbusiness/dap-client";
import type { Answer, FieldValue, ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { Custody, Lost, TERMINAL, declarationDigest, expectedOf, identityId, meaningOf, projectAnswer, type BindingRecord, type CustodyRecord, type Identity } from "@generalbusiness/dap-mcp";
import { changeJ4 } from "../../apps/room/lanes/src/j4.ts";
import { J4_DIGESTS } from "../../apps/room/lanes/src/digests-j4.ts";
import { storedSigner } from "../../packages/cli/src/store-signer.ts";
import { durableCliStore, durableRequestStore } from "./custody.ts";
import { receiptName, retain, retained } from "./plan.ts";
import type { PrivateResult, Session, SessionMode } from "./session.ts";

const KEY = "s1:agent-review", INPUT = "s1-native-review";
const KIND = "review-verdict", PIN = J4_DIGESTS.change;
interface Original {
  v: 1; home: string; identity: Identity; binding: BindingRecord;
  fields: Record<string, FieldValue>; expected: Record<string, number>;
}
const equal = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const stop = (): never => { throw new Error("The native review control is unresolved. Its original was not replaced."); };

/** Check each existing component before custody can create directories. The
 * identity home already exists and belongs to this operator. */
function custodyPath(home: string): string {
  if (!isAbsolute(home) || resolve(home) !== home) return stop();
  const path = join(home, "private", "native-review-custody");
  for (let current = path;; current = dirname(current)) {
    let info;
    try { info = lstatSync(current); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || current === home) return stop();
    }
    if (info && (!info.isDirectory() || info.isSymbolicLink() || (current === home || current.startsWith(home + "/")) && (info.uid !== process.getuid!() || (info.mode & 0o077) !== 0))) return stop();
    if (current === dirname(current)) break;
  }
  return path;
}

/** Fixed agent-b approval attempt against the same manifest the owner reviews.
 * Check settles only. Continue can send only the original signed envelope. */
export async function agentReviewControl(agent: Session, home: string, target: ScopeRef, manifest: number, mode: SessionMode): Promise<PrivateResult> {
  if (!["new", "check", "continue"].includes(mode) || !isScopeRef(target) || target.kind !== "lane" || !isLocalId(manifest)) return stop();
  const path = custodyPath(home), config = await agent.ctx.store.config();
  const local = durableCliStore(home), localConfig = await local.config();
  if (!config?.repository || !config.handle || !equal(localConfig, config)) return stop();
  const signer = await storedSigner(agent.ctx.store, config.key), homeSigner = await storedSigner(local, config.key);
  if (!signer || !homeSigner || signer.key !== homeSigner.key) return stop();
  const summary = await agent.read(target);
  if (summary.status !== "active" || summary.definition !== PIN) return stop();
  const identity: Identity = { service: config.service, membership: config.repository.membership, signer: signer.key, target, key: KEY };
  const binding: BindingRecord = { definition: "change", kind: KIND, declaration: declarationDigest(changeJ4, KIND, PIN), pinned: PIN };
  const fields: Record<string, FieldValue> = { manifest, verdict: "approve", extent: "source" };
  const meaning = meaningOf({ kind: KIND, on: null, fields });
  const now = () => agent.ctx.now?.() ?? Date.now();
  const custody = new Custody(durableRequestStore(path), () => timeOf(now()));
  let original = await retained<Original>(local, INPUT);
  const existing = await custody.find(identity);
  if (mode === "new") {
    if (original || existing || !summary.items.some(item => item.type === "manifest" && item.id === manifest && item.state === "current")) return stop();
    original = { v: 1, home, identity, binding, fields, expected: expectedOf(changeJ4.acts[KIND], summary.items, null, fields) };
    await retain(local, INPUT, original);
  } else if (!original || !existing) return stop();
  if (!original || original.v !== 1 || original.home !== home || !equal(original.identity, identity) || !equal(original.binding, binding) || !equal(original.fields, fields)) return stop();
  const validate = (record: CustodyRecord): void => {
    const signed = record.envelope.signed, intent = signed.intent;
    if (!equal(record.identity, identity) || record.meaning !== meaning || !equal(record.binding, binding) || record.standalone || Object.keys(record.steps).length !== 0
      || !equal(record.envelope.beside, {}) || record.envelope.creation !== undefined || !verifySignedIntent(signed)
      || intent.actor !== signer.key || !same(intent.to, target) || intent.kind !== KIND || intent.on !== null || intent.idempotencyKey !== KEY
      || !equal(intent.fields, original!.fields) || !equal(intent.expected, original!.expected)) return stop();
  };
  if (existing) validate(existing);
  const transport = httpTransport(config.service, { ...(agent.ctx.fetch ? { fetch: agent.ctx.fetch } : {}), seconds: 8, bytes: 64 * 1024 });
  const checked = (answer: Answer, record: CustodyRecord): Answer => {
    if (answer.answer === "accepted" && (answer.receipt.definition !== PIN || !same(answer.receipt.fact.at, target) || answer.receipt.intent !== intentDigest(record.envelope.signed.intent))) throw new Lost();
    return answer;
  };
  if (mode !== "new") {
    await custody.settle(identity, async envelope => {
      try {
        const read = await transport.settle(target.scope, envelope.signed);
        if (read.ok) {
          if (read.value.definition !== PIN || !same(read.value.fact.at, target) || read.value.intent !== intentDigest(envelope.signed.intent)) throw new Lost();
          return read.value;
        }
        return read.reason === "archived" ? read : null;
      } catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
    });
  }
  let record = await custody.find(identity);
  if (record) validate(record);
  if (mode !== "check" && (!record || !TERMINAL.has(record.phase))) {
    const current = original;
    await custody.send(identity, meaning, async () => {
      // A lost record between Find and Send must never trigger re-signing.
      if (mode !== "new") return stop();
      return { binding, envelope: {
        signed: await signedIntent(signer, { to: target, kind: KIND, on: null, fields: current.fields, expected: current.expected }, { idempotencyKey: KEY, now: now() }), beside: {},
      } };
    }, async envelope => {
      try {
        const held = await custody.find(identity);
        if (!held) return stop();
        validate(held);
        return checked(await transport.submit(target.scope, envelope.signed, [], envelope.beside), held);
      } catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
    }, { notAfter: record?.envelope.signed.intent.notAfter ?? timeOf(now() + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000), bytes: utf8(canonicalize(fields)).length });
    record = await custody.find(identity);
  }
  if (!record) return stop();
  validate(record);
  const decided = await custody.decided(identityId(identity), record);
  const body = { ...(decided?.answer ? projectAnswer(checked(decided.answer, record)) : decided?.archivedSettlement ? { answer: "archived", archived: decided.archivedSettlement.archived } : { answer: "unknown" }), phase: record.phase };
  const privateRecord = receiptName("agent-review-native", { identity, body });
  await retain(local, privateRecord, { v: 1, identity, body });
  return { result: { content: [], structuredContent: body, isError: false }, privateRecord };
}

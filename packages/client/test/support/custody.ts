/**
 * Custody fixtures shared by `custody.test.ts` and the child processes it starts (`custody-child.ts`). The scope's answers are
 * scripted: `deliver` and `settle` are STAND-INs for a scope's submit and settlement.
 */
import type { Answer, Receipt, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { intentDigest, timeOf } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { Custody, Lost, identityId, meaningOf, type CustodyMetrics, type CustodyStore, type Envelope, type Identity } from "../../src/index.ts";

export const signer = secretSigner(new Uint8Array(32).fill(7));
export const lane: ScopeRef = { scope: "sc_lane", genesis: `sha256:${"a".repeat(64)}` } as ScopeRef;
export const resource: ScopeRef = { scope: "sc_other", genesis: `sha256:${"b".repeat(64)}` } as ScopeRef;
export const T0 = Date.parse("2099-01-01T00:00:00Z");
export const notAfter = timeOf(T0 + 15 * 60_000);

export const identity = (key: string): Identity => ({ service: "https://scopes.test", membership: null, signer: signer.key, target: lane, key });
export const build = (key: string, comment = "hello") => async (): Promise<{ binding: { definition: string; kind: string; declaration: null; pinned: "platform:inbox@1" }; envelope: Envelope }> => ({
  binding: { definition: "issue", kind: "comment", declaration: null, pinned: "platform:inbox@1" },
  envelope: { signed: await signedIntent(signer, { to: lane, kind: "comment", fields: { body: comment } }, { idempotencyKey: key, now: T0 }), beside: {} },
});
export const receiptOf = (signed: SignedIntent, seq: number): Receipt => ({ fact: { at: lane, seq, hash: `sha256:${"a".repeat(64)}` }, definition: "platform:inbox@1", intent: intentDigest(signed.intent), effects: [], sends: [], epoch: 0 });
export const accepted = (signed: SignedIntent, seq = 3): Answer => ({ answer: "accepted", receipt: receiptOf(signed, seq) });
export const refused: Answer = { answer: "refused", reason: "guard-failed", name: "nope", judgedAt: { seq: 2, hash: `sha256:${"b".repeat(64)}` } };

/** The exact TEST scenario captured before the owner moved. Callers compare raw store bytes to the retained literal. */
export async function goldenRecord<S extends CustodyStore>(make: (now: () => number) => S, metrics?: CustodyMetrics) {
  let clock = T0, builds = 0, steps = 0, sends = 0, settlements = 0;
  const store = make(() => clock), custody = new Custody(store, () => timeOf(clock), metrics);
  const key = "NF3-golden-v1", who = identity(key), id = identityId(who);
  const meaning = meaningOf({ purpose: "NF3 stored-byte move golden", revision: 1 });
  const original = await custody.keep(who, meaning, async () => {
    builds++;
    const value = await build(key, "NF3 stored bytes")();
    value.envelope.beside = { texts: ["NF3 detached text"], presented: { source: receiptOf(value.envelope.signed, 2).fact }, values: ['{"nf3":1}'] };
    return value;
  }, notAfter);
  const copies: SignedIntent[] = [];
  clock = T0 + 1000;
  await custody.step(who, lane, "hold@1", "instance", async value => { copies.push(value); steps++; return accepted(value, 4); });
  clock = T0 + 2000;
  const lost = await custody.send(who, meaning, async () => { throw Error("A kept envelope must not be built again"); }, async value => {
    copies.push(value.signed); sends++; throw new Lost();
  }, { notAfter });
  clock = T0 + 3000;
  const settled = await custody.settle(who, async value => { copies.push(value.signed); settlements++; return receiptOf(value.signed, 3); });
  return { store, custody, who, id, original, copies, lost, settled, record: await store.read(id), builds, steps, sends, settlements };
}

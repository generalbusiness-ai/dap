import { contextDeclared as declared, contextParentData, contextPlatformData, contextNamedData } from "./definition-corpus/general-creation-data.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeviceCommandGrant, type ScopeKind } from "@generalbusiness/dap-contract";
import { canonicalize, isSeed, newIncarnation } from "@generalbusiness/dap-bytes";
import { clockOf, judgeGenesis, validateDefinition, type ValidDefinition } from "../src/index.ts";
import { Ledger, T0, creation, deliver, created, keys, valid } from "./fixtures-entry.ts";

// Pure judge/send boundary. Parent metadata and authority are SCRIPTED in a
// draft before it seals; no native emitter/membership/session proof is claimed.
const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS));
const membership = keys.rita.member.membership;

function receive(from: Ledger, seq: number, n: number, under = definition) {
  const { asked, source } = creation(from, seq, n);
  const child = new Ledger(under);
  const judgment = judgeGenesis(child.state, under, asked, { clock: clockOf(child.state, T0), bounds: child.bounds, facts: [], prepared: [], source });
  if (judgment.result === "write") child.seal(judgment.draft);
  return { child, judgment, asked, source };
}
function incoming(metadata: Record<string, unknown>, under = definition, kind: ScopeKind = "lane") {
  const parentDefinition = valid(validateDefinition(contextParentData(under.digest, kind), PROPOSED_BOUNDS));
  const parent = created(parentDefinition, {});
  const result = parent.judge(parent.intent(keys.rita, "spawn", { on: 0, expected: { on: parent.item(0).revision } }));
  if (result.result !== "write") throw new Error(`scripted parent create was ${result.result}${"reason" in result ? `: ${result.reason}` : ""}`);
  const send = result.draft.sends[0];
  if (!send || !isSeed(send.to) || send.message.class !== "request" || send.message.type !== "create") throw new Error("the actual drafted send is a creation");
  const body = send.message.body as Record<string, unknown>;
  parent.seal({ ...result.draft, sends: [{ ...send, message: { ...send.message, body: { ...body, ...metadata } } }] });
  return { parent, ...receive(parent, 1, 0, under) };
}
function bodyOf(child: Ledger, seq = 0, n = 1) {
  const message = child.entries[seq]!.entry.sends.find((send) => send.n === n)!.message;
  if (message.class !== "request" || message.type !== "create") throw new Error("the selected native form is a creation");
  return message.body;
}
function confirm(parent: Ledger, child: Ledger) {
  expect(deliver(parent, child, 0, 0).result).toBe("write");
  expect(deliver(child, parent, parent.last.seq, 0).result).toBe("write");
}

test("unmarked genesis create bytes stay legacy even with incoming membership or a domain creationContext; later creates keep their old retained-genesis membership", () => {
  const { parent, child, judgment } = incoming({ membership });
  expect(judgment.result).toBe("write");
  const legacy = { fields: { creationContext: { v: 99 } }, directory: parent.at };
  expect(canonicalize(bodyOf(child))).toBe(canonicalize(legacy));
  confirm(parent, child);
  child.did(keys.rita, "spawn", { on: 0, expected: { on: child.item(0).revision } });
  expect(canonicalize(bodyOf(child, child.last.seq, 0))).toBe(canonicalize({ ...legacy, membership }));
});

test("recognized verified-context metadata and the same full membership flow through two genesis edges and a later actual retained-genesis create", () => {
  const { parent, child, judgment } = incoming({ creationContext: { v: 1 }, membership });
  expect(judgment.result).toBe("write");
  const marked = { fields: { creationContext: { v: 99 } }, directory: parent.at, membership, creationContext: { v: 1 } };
  expect(bodyOf(child)).toEqual(marked);
  const nested = receive(child, 0, 1).child;
  expect(bodyOf(nested)).toEqual(marked);
  confirm(parent, child);
  child.did(keys.rita, "spawn", { on: 0, expected: { on: child.item(0).revision } });
  expect(bodyOf(child, child.last.seq, 0)).toEqual(marked);
  expect(child.act(keys.rita, "spawn", { on: 0, expected: { on: child.item(0).revision } }, { own: () => null })).toMatchObject({ result: "unavailable" });
});

test("unknown or malformed opt-in and marked missing/invalid full membership record bad-field refusal with only the native result; source-message proof and typed lower bounds still hold", () => {
  for (const metadata of [{ creationContext: { v: 2 }, membership }, { creationContext: { v: 1, other: true }, membership }, { creationContext: { v: 1 } }, { creationContext: { v: 1 }, membership: { ...membership, kind: "lane" } }, { creationContext: { v: 1 }, membership, fields: { creationContext: { v: 0 } } }]) {
    const { child, judgment, asked, source } = incoming(metadata);
    expect(judgment).toMatchObject({ result: "write", draft: { input: { decision: "refused" }, sends: [{ n: 0, message: { class: "result", outcome: "refused", reason: { code: "bad-field" } } }] } });
    expect(child.last.sends).toHaveLength(1);
    const empty = new Ledger(definition);
    expect(judgeGenesis(empty.state, definition, { ...asked, message: { ...asked.message, body: {} } }, { clock: clockOf(empty.state, T0), bounds: empty.bounds, facts: [], prepared: [], source })).toMatchObject({ result: "source-unverified" });
  }
});

test("marked declared genesis does not stamp a platform creation, and membership-self retains its own full reference without a stamp", () => {
  const platform: ValidDefinition = valid(validateDefinition(contextPlatformData(), PROPOSED_BOUNDS));
  const received = incoming({ creationContext: { v: 1 }, membership }, platform);
  expect(received.judgment.result).toBe("write");
  expect(bodyOf(received.child)).toEqual({ fields: {} });
  const self = incoming({ creationContext: { v: 1 }, membership }, definition, "membership");
  expect(bodyOf(self.child)).toEqual({ fields: { creationContext: { v: 99 } }, directory: self.parent.at, membership: self.child.at });
});

test("a recorded device grant reaches only an allowed first child and cannot be delegated again", () => {
  const grant: DeviceCommandGrant = { capability: "device-command@1", owner: keys.rita.member,
    bounds: { kinds: ["fan", "heater", "vent"], owners: 1 }, root: definition.digest, definitions: [definition.digest] };
  const { parent, child, judgment } = incoming({ creationContext: { v: 2, deviceCommand: grant, delegate: true }, membership });
  expect(judgment.result).toBe("write");
  const delegated = { fields: { creationContext: { v: 99 } }, directory: parent.at, membership,
    creationContext: { v: 2, deviceCommand: grant, delegate: false } };
  expect(bodyOf(child)).toEqual(delegated);
  const nested = receive(child, 0, 1).child;
  expect(bodyOf(nested)).toEqual({ fields: { creationContext: { v: 99 } }, directory: parent.at, membership, creationContext: { v: 1 } });
  confirm(parent, child);
  child.did(keys.rita, "spawn", { on: 0, expected: { on: child.item(0).revision } });
  expect(bodyOf(child, child.last.seq, 0)).toEqual(delegated);

  const other = valid(validateDefinition(contextNamedData("other-device-definition"), PROPOSED_BOUNDS));
  const unlisted = incoming({ creationContext: { v: 2, deviceCommand: { ...grant, definitions: [other.digest] }, delegate: true }, membership });
  expect(unlisted.judgment.result).toBe("write");
  expect(bodyOf(unlisted.child)).toEqual({ fields: { creationContext: { v: 99 } }, directory: unlisted.parent.at, membership, creationContext: { v: 1 } });
});

test("a device grant for another membership incarnation or definition refuses before any child send", () => {
  const grant: DeviceCommandGrant = { capability: "device-command@1", owner: keys.rita.member,
    bounds: { kinds: ["heater"], owners: 1 }, root: definition.digest, definitions: [definition.digest] };
  const other = valid(validateDefinition(contextNamedData("foreign-device-definition"), PROPOSED_BOUNDS));
  const foreignOwner = { ...grant, owner: { ...grant.owner, membership: { ...membership, inc: newIncarnation(new Uint8Array(16).fill(93)) } } };
  for (const marker of [{ v: 2, deviceCommand: foreignOwner, delegate: true },
    { v: 2, deviceCommand: { ...grant, root: other.digest }, delegate: true },
    { v: 2, deviceCommand: { ...grant, definitions: [other.digest] }, delegate: false }]) {
    const { child, judgment } = incoming({ creationContext: marker, membership });
    expect(judgment).toMatchObject({ result: "write", draft: { input: { decision: "refused" }, sends: [{ n: 0, message: { class: "result", outcome: "refused", reason: { code: "bad-field" } } }] } });
    expect(child.last.sends).toHaveLength(1);
  }
});

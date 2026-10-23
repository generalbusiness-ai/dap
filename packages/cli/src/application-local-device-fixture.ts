import { scriptedDeviceParentDefinition } from "./application-local-device-parent.ts";
/** Developer-only scripted parent proof, explicitly anchored in replay.
 * This is not a native installation, membership, or production issuer. */
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeclaredDefinition, type DeviceCommandGrant, type Digest, type FactRef, type MemberRef, type RetainedInput, type ScopeRef, type Sealed, type Seed, type SignedIntent, type Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, factRefOf, intentDigest, isSeed, newIncarnation, parseStrict, scopeIdOf, utf8 } from "@generalbusiness/artroom-bytes";
import type { AnyPackedApplication } from "@generalbusiness/artroom-bytes/application-v2";
import { applyEntry, clockOf, entryOf, judgeDelivery, judgeGenesis, MemoryState, validateDefinition, type Draft } from "@generalbusiness/dap-derive";
import { deviceApplicationRequirement } from "@generalbusiness/dap-platform";
import { MemorySource } from "@generalbusiness/artroom-replay";

export interface ScriptedDeviceGrantEvidence {
  readonly authority: "scripted-parent-creation";
  readonly anchors: readonly FactRef[];
  readonly owner: MemberRef;
  readonly nativeIssuanceWitness: "packages/scope/test/device-command-install.test.ts";
}

/** The ordinary parent forms are judged first. Only the still-unsealed
 * creation draft gets the explicitly scripted reserved metadata. */
export function scriptedDeviceParent(packet: AnyPackedApplication, founding: SignedIntent, owner: MemberRef, selected: Digest, now: Timestamp) {
  owner = parseStrict(canonicalize(owner)) as MemberRef;
  const requirement = deviceApplicationRequirement(packet.package.semantic);
  if (packet.package.v !== 2 || !requirement || selected !== packet.package.semantic.entry && !requirement.definitions.includes(selected)) throw Error("The scripted device fixture requires a verified supported package and selected definition.");
  const part = packet.package.semantic.definitions.find(part => part.id === selected);
  if (!part) throw Error("The selected device fixture is outside the package.");
  const child = parseStrict(part.bytes) as DeclaredDefinition, fields = child.acts[child.genesis]!.fields;
  const parent = scriptedDeviceParentDefinition(selected, fields);
  const checked = validateDefinition(parent, PROPOSED_BOUNDS);
  if (!checked.ok) throw Error("The scripted parent declaration must validate.");
  const definition = checked.definition, state = new MemoryState(), entries: Sealed[] = [];
  const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(founding.intent), ordinal: 0 };
  const inc = newIncarnation(new Uint8Array(16).fill(73)), at: ScopeRef = { kind: "directory", scope: scopeIdOf(seed), inc };
  const seal = (draft: Draft) => {
    const entry = entryOf(state, draft, clockOf(state, now)), sealed = { entry, hash: entryHash(entry) };
    applyEntry(state, definition, entry, sealed.hash); entries.push(sealed); return sealed;
  };
  const judged = judgeGenesis(state, definition, { name: at.scope, inc, seed, creation: founding }, { clock: clockOf(state, now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null });
  if (judged.result !== "write" || judged.draft.input.type !== "genesis" || judged.draft.input.decision !== "applied") throw Error("The scripted parent founding did not derive.");
  const grant: DeviceCommandGrant = { capability: DEVICE_COMMAND, owner, root: packet.package.semantic.entry, bounds: requirement.bounds, definitions: requirement.definitions };
  const first = seal({ ...judged.draft, sends: judged.draft.sends.map(send => {
    if (send.message.class !== "request" || send.message.type !== "create") throw Error("The scripted parent emits exactly one creation.");
    return { ...send, message: { ...send.message, body: { ...(send.message.body as object), membership: owner.membership,
      creationContext: { v: 2, deviceCommand: grant, delegate: selected === grant.root } } } };
  }) });
  const send = first.entry.sends[0]!;
  if (!isSeed(send.to)) throw Error("The scripted parent must name its child by seed.");
  const retained: RetainedInput[] = [{ kind: "definition", digest: definition.digest, bytes: canonicalize(parent) }];
  const proof = (seq: number, maxBytes: number) => {
    const sealed = entries[seq];
    if (!sealed || !Number.isSafeInteger(maxBytes) || maxBytes < 1) return null;
    const bytes = canonicalize(sealed.entry);
    return utf8(bytes).length <= maxBytes ? { fact: factRefOf(sealed.entry), bytes } : null;
  };
  return {
    at, name: scopeIdOf(send.to), creation: { ...send, from: factRefOf(first.entry) },
    get evidence() { return { authority: "scripted-parent-creation", anchors: entries.map(sealed => factRefOf(sealed.entry)), owner,
      nativeIssuanceWitness: "packages/scope/test/device-command-install.test.ts" } satisfies ScriptedDeviceGrantEvidence; },
    read: (seq: number) => entries[seq] ? { entry: entries[seq]!.entry, under: parent.name } : null,
    proof,
    birth: (maxBytes: number) => {
      const held = proof(0, maxBytes);
      return held ? { v: 1 as const, proof: held, named: definition.digest, declarationName: parent.name, native: false } : null;
    },
    history: () => new MemorySource([{ scope: at, entries: entries.map(sealed => ({ seq: sealed.entry.seq, hash: sealed.hash, bytes: canonicalize(sealed.entry) })), retained }]),
    confirm: (genesis: Sealed) => {
      const result = genesis.entry.sends.find(send => send.n === 0 && send.message.class === "result");
      if (!result) throw Error("The actual child must answer its creation.");
      const judged = judgeDelivery(state, definition, { ...result, from: factRefOf(genesis.entry) }, {
        clock: clockOf(state, now), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: { entry: genesis.entry, under: child.name }, origin: first.entry,
        own: seq => entries[seq] ?? null,
      });
      if (judged.result !== "write") throw Error("The actual child's result did not derive its creator confirmation.");
      const confirmed = seal(judged.draft), confirmation = confirmed.entry.sends.find(send => send.message.class === "control" && send.message.type === "confirm");
      if (!confirmation) throw Error("The creator must confirm the actual child genesis.");
      retained.push({ kind: "entry", digest: genesis.hash, bytes: canonicalize(genesis.entry), under: child.name });
      return { ...confirmation, from: factRefOf(confirmed.entry) };
    },
  };
}

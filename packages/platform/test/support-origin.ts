/** SCRIPTED immutable facts for pure provenance and runtime-boundary tests. No factory judge ran. */
import type { Digest, GenesisInput, Request, ScopeKind, ScopeRef, Seed, SequenceEntry, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, intentDigest, newGenesisNonce, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { type SourceCopy } from "@generalbusiness/dap-derive";
import { d, forged, keys, T0, t } from "@generalbusiness/dap-derive/testing";
import { ISSUE_LANE_DIGESTS, PUBLISHING_LANE_DIGESTS } from "../src/publishing-provenance.ts";

type Founding = { source: SourceCopy["fact"]; sourceKind: ScopeKind; n: number; message: Request };

/** SCRIPTED: a genesis made by hand and admitted from its own bytes. Its reference is the seed's scope ID and its hash. */
function born(seed: Seed, fill: number, kind: string, from: Founding | null) {
  const input: GenesisInput = { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(fill)), kind, founding: null,
    ...(from ?? { source: null, sourceKind: null, n: null, message: null }), decision: "applied" };
  const { entry, sequence } = forged({ scope: scopeIdOf(seed), genesis: d("0") }, 0, input, []);
  return { entry, sequence, at: { ...sequence.at } as ScopeRef };
}

/** SCRIPTED: a later entry of a sequence, at `seq`, that acts on `signed`. */
function acted(at: ScopeRef, seq: number, prev: Digest, signed: SignedIntent, sends: SequenceEntry["sends"] = []): SequenceEntry {
  return { v: 1, genesis: at.genesis, seq, prev, time: T0, clamped: false, epoch: 0,
    input: { type: "act", signed, authority: [], presented: {} }, uses: [], prepared: [], effects: [], sends };
}

export function scriptedOrigin(name: "change" | "issue" = "change", route = name === "change" ? "open-pr" : "open-issue", under = "platform:directory", extension?: Digest) {
  const ref = (kind: ScopeKind, fill: string) =>
    born({ v: 1, kind, definition: d(fill), creator: null, cause: d(fill), ordinal: 0 }, fill.charCodeAt(0), "establish", null);
  const office = ref("directory", "d"), directory = office.at, destination = ref("destination", "e").at;
  const definition = extension ?? (name === "change" ? PUBLISHING_LANE_DIGESTS[1] : ISSUE_LANE_DIGESTS[1]);
  const signed = signIntent({ v: 1, to: directory, actor: keys.rita.key, kind: route, on: null, expected: {},
    fields: { definition }, idempotencyKey: "scripted-origin", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "lane", definition, creator: directory, cause: intentDigest(signed.intent), ordinal: 0 };
  const message = { class: "request", type: "create", body: { directory, fields: name === "change"
    ? { opener: keys.rita.member, title: "scripted source", draft: false, destination }
    : { opener: keys.rita.member, title: "scripted issue", conditions: [] } } } as const;
  const creator = acted(directory, 1, d("0"), signed, [{ n: 0, to: seed, message }]);
  const lane = born(seed, 9, name === "change" ? "open" : "file", { source: factRefOf(creator, directory), sourceKind: "directory", n: 0, message });
  const at = lane.at, genesis = lane.entry;
  const merge = acted(at, 2, factRefOf(genesis, at).hash, signIntent({ v: 1, to: at, actor: keys.rita.key, kind: "merge", on: null,
    expected: {}, fields: {}, idempotencyKey: "scripted-merge", notAfter: t(60) }, keys.rita.secret));
  const origin: readonly SourceCopy[] = [{ fact: factRefOf(genesis, at), entry: genesis, bytes: canonicalize(genesis), under: name, sequence: lane.sequence },
    { fact: factRefOf(creator, directory), entry: creator, bytes: canonicalize(creator), under, sequence: office.sequence }];
  return { definition, directory, destination, at, creator, genesis, merge, origin, from: factRefOf(merge, at), sequence: lane.sequence };
}

/** SCRIPTED factory proof only: signed coherent facts, no native factory judge. */
export function scriptedApplicationOrigin(pin: "platform:directory@8" | "platform:directory@5" = "platform:directory@8", destinationField = true) {
  const native = scriptedOrigin("change", "establish-application");
  const directorySeed: Seed = { v: 1, kind: "directory", definition: pin, creator: null, cause: d("d"), ordinal: 0 };
  const office = born(directorySeed, 100, "found", null), directory = office.at;
  const signed = signIntent({
    v: 1, to: directory, actor: keys.rita.key, kind: "establish-application", on: null, expected: {}, fields: { definition: native.definition },
    idempotencyKey: "scripted-application", notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "lane", definition: native.definition, creator: directory, cause: intentDigest(signed.intent), ordinal: 0 };
  // A membership reference that no fact here proves: the request names it, and nothing reads it.
  const membership: ScopeRef = { scope: directory.scope, genesis: d("1") };
  const message = { class: "request", type: "create", body: { directory, membership, creationContext: { v: 1 },
    fields: destinationField ? { destination: native.destination } : {} } } as const;
  const creator = acted(directory, 1, d("0"), signed, [{ n: 0, to: seed, message }]);
  const lane = born(seed, 9, "open", { source: factRefOf(creator, directory), sourceKind: "directory", n: 0, message });
  const at = lane.at, genesis = lane.entry;
  const merge = acted(at, 2, factRefOf(genesis, at).hash, signIntent({ v: 1, to: at, actor: keys.rita.key,
    kind: "merge", on: null, expected: {}, fields: {}, idempotencyKey: "scripted-application-merge", notAfter: t(60) }, keys.rita.secret));
  const origin: readonly SourceCopy[] = [{ fact: factRefOf(genesis, at), entry: genesis, bytes: canonicalize(genesis), under: "declared:change", sequence: lane.sequence },
    { fact: factRefOf(creator, directory), entry: creator, bytes: canonicalize(creator), under: "platform:directory", sequence: office.sequence },
    { fact: factRefOf(office.entry, directory), entry: office.entry, bytes: canonicalize(office.entry), under: "platform:directory", sequence: office.sequence }];
  return { ...native, directory, at, creator, genesis, merge, origin, from: factRefOf(merge, at), sequence: lane.sequence };
}

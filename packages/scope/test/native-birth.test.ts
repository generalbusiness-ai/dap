import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { GenesisEntry } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, intentDigest, scopeIdOf, signIntent, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { readNativeBirth, type NativeBirth } from "../src/native-birth.ts";
import { namespace } from "../src/namespace.ts";
import { controls } from "../src/testing.ts";
import { PreparationBudget } from "../src/preparation-budget.ts";
import { PROOF_BYTE_BOUNDS } from "../src/proof-bytes.ts";
import { at, definition, create, rita, type Remote } from "./fixtures-native.ts";
type Peer = Remote & { nativeBirth(at: unknown, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null>; nativeBirthByName(name: unknown, kind: unknown, milliseconds: number, maxBytes?: number): Promise<NativeBirth | null> };

// Actual native register genesis, preparation, code pin and SQLite. Clock/key
// fixtures are the existing test ports. No new partition factory is claimed.
test("native raw birth reads the exact accepted pin without an activation turn, writes, authority or a derived under label", async () => {
  const intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: { host: "git.example", namespace: "birth-test", policy: "keys", "founders": [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: at(60) } as const;
  const name = scopeIdOf({ v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(intent), ordinal: 0 });
  controls(name);
  const object = env.SCOPES.get(env.SCOPES.idFromName(name)), peer = object as unknown as Peer;
  const answer = await peer.create(signIntent(intent, rita.secret), "platform:register@3");
  if (answer.answer !== "accepted") return expect.fail("native register was not founded");
  const ref = answer.receipt.fact.at;
  const snapshot = () => runInDurableObject(object, (_instance, state) => ({ entries: state.storage.sql.exec("SELECT seq,hash,bytes FROM entry ORDER BY seq").toArray(), outbox: state.storage.sql.exec("SELECT * FROM outbox ORDER BY seq,n").toArray(), meta: state.storage.sql.exec("SELECT * FROM meta ORDER BY k").toArray() }));
  const before = await snapshot();
  const birth = await peer.nativeBirth(ref, 10000);
  expect(birth).toMatchObject({ v: 1, named: "platform:register@3", declarationName: "platform:register", native: true, proof: { fact: { at: ref, seq: 0, hash: answer.receipt.fact.hash } } });
  if (!birth) throw Error("Actual Native birth required");
  const budget = new PreparationBudget(), debits: number[] = [];
  const debit = (bytes: number) => { budget.spend({ calls: 1, candidates: 1 }); debits.push(bytes); };
  const admitted = readNativeBirth(birth, ref, PROOF_BYTE_BOUNDS.body, debit);
  expect(admitted?.birth).toEqual(birth);
  expect(admitted?.sequence.at).toEqual(ref); expect(admitted?.sequence.kind).toBe("register");
  expect(admitted?.entry.input.seed.kind).toBe("register");
  expect(debits).toEqual([utf8(birth.proof.bytes).length]);
  expect(Reflect.apply(readNativeBirth, undefined, [birth, ref, PROOF_BYTE_BOUNDS.body])).toBeNull();
  expect(admitted && [admitted, admitted.birth, admitted.entry, admitted.sequence].every(Object.isFrozen)).toBe(true);
  expect(readNativeBirth(admitted, ref, PROOF_BYTE_BOUNDS.body, debit)).toBeNull();
  // A malformed byte body still reaches the debit before parsing. A budget
  // stop must keep its exact identity rather than become malformed data.
  const stop = new Error("TEST original budget stop"); let caught: unknown;
  try { readNativeBirth({ ...birth, proof: { ...birth.proof, bytes: "{" } }, ref, PROOF_BYTE_BOUNDS.body, () => { throw stop; }); }
  catch (error) { caught = error; }
  expect(caught).toBe(stop);
  const mutable = { ...birth, proof: { ...birth.proof, fact: { ...birth.proof.fact, at: { ...birth.proof.fact.at } } } };
  const ownedBirth = readNativeBirth(mutable, ref, PROOF_BYTE_BOUNDS.body, bytes => { debit(bytes); mutable.proof.bytes = "{"; });
  expect(ownedBirth?.birth.proof.bytes).toBe(birth.proof.bytes); expect(ownedBirth?.sequence.at).toEqual(ref);
  expect(Object.keys(birth!).sort()).toEqual(["declarationName", "named", "native", "proof", "v"]);
  const via = await namespace(env.SCOPES).births.read(ref, 10000);
  expect(via).toEqual(birth);
  expect(await peer.nativeBirthByName(ref.scope, "register", 10000)).toEqual(birth);
  expect(await namespace(env.SCOPES).birthNames.read(ref.scope, "register", 10000)).toEqual(birth);
  expect(await peer.nativeBirthByName(ref.scope, "directory", 10000)).toBeNull();
  expect(await peer.nativeBirthByName(`sc_${"z".repeat(52)}`, "register", 10000)).toBeNull();
  expect(await peer.nativeBirthByName(ref.scope, "register", 10000, 1)).toBeNull();
  expect(await peer.nativeBirthByName(ref.scope, "register", 0)).toBeNull();
  expect(await peer.nativeBirth({ ...ref, genesis: textDigest("TEST wrong genesis") }, 10000)).toBeNull();
  expect(await peer.nativeBirth(ref, 10000, 1)).toBeNull();
  expect(await peer.nativeBirth(ref, 0)).toBeNull(); expect(await peer.nativeBirth(ref, 10001)).toBeNull();
  expect(await snapshot()).toEqual(before);
});

test("declared raw birth retains its actual name without promoting identity; oversized genesis is refused before its body is selected", async () => {
  const scope = await create(), peer = scope.object as unknown as Peer;
  const birth = await peer.nativeBirth(scope.at, 10000);
  expect(birth).toMatchObject({ named: definition.digest, declarationName: definition.declared.name, native: false });
  const budget = new PreparationBudget(), debit = (_bytes: number) => budget.spend({ calls: 1, candidates: 1 });
  expect(readNativeBirth({ ...birth, under: "issue" }, scope.at, PROOF_BYTE_BOUNDS.body, debit)).toBeNull();
  expect(readNativeBirth({ ...birth, native: true }, scope.at, PROOF_BYTE_BOUNDS.body, debit)).toBeNull();
  expect(readNativeBirth({ ...birth, v: 2 }, scope.at, PROOF_BYTE_BOUNDS.body, debit)).toBeNull();
  const admitted = readNativeBirth(birth, scope.at, PROOF_BYTE_BOUNDS.body, debit);
  if (!admitted) throw Error("Actual original genesis bytes required");
  // Byte-association fixture only, not a Native refused creation judgment.
  const refused: GenesisEntry = { ...admitted.entry, input: { ...admitted.entry.input, decision: "refused" }, effects: [], sends: [] };
  const bytes = canonicalize(refused), hash = entryHash(refused), at = { scope: scope.at.scope, genesis: hash };
  const negative = readNativeBirth({ ...admitted.birth, proof: { fact: { at, seq: 0, hash }, bytes } }, at, PROOF_BYTE_BOUNDS.body, debit);
  expect(negative?.entry.input.decision).toBe("refused"); expect(negative?.sequence.at).toEqual(at);
  expect(negative?.birth.named).toBe(admitted.birth.named);
  // An explicit storage-corruption fixture, not a native transition. The
  // production bounded reader rejects its size before loading entry bytes.
  await scope.inside(async (state) => {
    const original = state.storage.sql.exec("SELECT bytes FROM entry WHERE seq=0").toArray()[0]!["bytes"] as string;
    state.storage.sql.exec("UPDATE entry SET bytes=? WHERE seq=0", original + " ".repeat(1024 * 1024)).toArray();
    try {
      const { ReadPreparation } = await import("../src/read-preparation.ts");
      const { nativeBirth } = await import("../src/native-birth.ts");
      let bodies = 0;
      const preparation = new ReadPreparation({ exec: (query, ...args) => {
        if (query.startsWith("SELECT bytes FROM entry")) bodies++;
        return state.storage.sql.exec(query, ...args);
      } }, { policy: () => "birth-storage-fixture", declared: () => definition, platform: () => null });
      expect(nativeBirth(preparation, scope.at, undefined, 1)).toBeNull(); expect(bodies).toBe(0);
      expect(nativeBirth(preparation, scope.at)).toBeNull(); expect(bodies).toBe(0);
    } finally { state.storage.sql.exec("UPDATE entry SET bytes=? WHERE seq=0", original).toArray(); }
  });
  expect(await peer.nativeBirth(scope.at, 10000)).toEqual(birth);
});

// Protocol stand-in only. Unsupported peers cannot fall back to legacy source
// or a summary, and invalid input reaches no namespace.
test("raw birth protocol refuses unsupported senders and invalid admission without a legacy fallback", async () => {
  const ref = { scope: `sc_${"a".repeat(52)}`, genesis: textDigest("TEST raw protocol reference, not a birth") } as const;
  let lookups = 0, legacy = 0;
  const binding = { idFromName: () => ref.scope, get: () => { lookups++; return { source: () => { legacy++; }, summary: () => { legacy++; } }; } };
  const births = namespace(binding as never).births;
  expect(await births.read(ref, 10000)).toBeNull(); expect([lookups, legacy]).toEqual([1, 0]);
  expect(await Reflect.apply(births.read, births, [{}, 10000])).toBeNull(); expect(await births.read(ref, 10001)).toBeNull();
  expect(await births.read(ref, 10000, 0)).toBeNull();
  expect([lookups, legacy]).toEqual([1, 0]);
});

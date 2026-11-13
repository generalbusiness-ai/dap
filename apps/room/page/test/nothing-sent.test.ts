/** Invariant: a stop over a saved creation or enrollment does not say that nothing was submitted, because an earlier send can have gone.
 * The Page's real custody code runs over STAND-IN storage and locks. No request leaves: each case stops before its first read. */
import { afterEach, expect, test, vi } from "vitest";
import { canonicalize, keyIdOfSecret, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { claimRoom, claimStatus, type ClaimLocks, type ClaimRegister, type ClaimStorage } from "../src/claim.ts";
import { startRoom } from "../src/start-custody.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";

const origin = "https://nothing-sent.test";
const secret = new Uint8Array(32).fill(81);
const session = { service: origin, signer: secretSigner(secret) };
const register = { genesis: textDigest("TEST nothing sent genesis"), scope: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@8", creator: null, cause: textDigest("TEST nothing sent"), ordinal: 0 }) };
const configured: ClaimRegister = { register, definition: "platform:register@8" };
const binding = canonicalize([origin, register, "platform:register@8", keyIdOfSecret(secret)]);
const name = `dap-page-claim-2:${binding}`;
const operation = "60000000-0000-4000-8000-000000000001";
const locks: ClaimLocks = { request: async (_name, run) => run() };
const record = canonicalize({ v: 1, binding, label: "Room", config: { v: 1, service: origin, key: "browser", register } });
const journal = (claims: Record<string, string>, active = operation) => canonicalize({ v: 2, binding, active, claims });
const storageOf = (bytes?: string): ClaimStorage => {
  const values = new Map<string, string>(bytes === undefined ? [] : [[name, bytes]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
};
const resume = (storage: ClaimStorage, wanted = operation) => claimRoom(session, configured, storage, "Room", { mode: "resume", operation: wanted, locks, keys: memoryPageKeys() });
const UNKNOWN = "This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room.";

/** The words of the stop. A wrong sentence fails the comparison below, as an assertion. */
const stopOf = (work: Promise<unknown>): Promise<string> => work.then(() => "no stop", (error: Error) => error.message);

afterEach(() => { vi.unstubAllGlobals(); });

test.each([
  ["a journal that is not JSON", "not json", "The private claim journal cannot be read. It is kept."],
  ["a journal of another context", canonicalize({ v: 2, binding: "another", active: operation, claims: { [operation]: record } }), "The private claim journal does not match this context. It is kept."],
  ["a record that is not JSON", journal({ [operation]: "not json" }), "The private claim record cannot be read. It is kept."],
  ["a record of another register", journal({ [operation]: canonicalize({ v: 1, binding: "another", label: "Room", config: { v: 1, service: origin, key: "browser", register } }) }), "The private claim record does not match this Worker, register and key. It is kept."],
])("resuming over %s cannot say what an earlier send did", async (_case, bytes, first) => {
  expect(await stopOf(resume(storageOf(bytes)))).toBe(`${first} ${UNKNOWN}`);
});

test("an operation that the journal has lost cannot say what an earlier send did", async () => {
  const lost = "60000000-0000-4000-8000-000000000002";
  expect(await stopOf(resume(storageOf(journal({ [operation]: record })), lost))).toBe(`The creation operation does not match the private journal. ${UNKNOWN}`);
  expect(await stopOf((async () => claimStatus(session, configured, storageOf(journal({ [operation]: record })), lost))())).toBe(`The exact original creation is missing from its private journal. ${UNKNOWN}`);
});

test("a saved room with no proof says that an earlier step went ahead", async () => {
  const directory = { genesis: register.genesis, scope: register.scope };
  const saved = canonicalize({ v: 1, binding, label: "Room", config: { v: 1, service: origin, key: "browser", register, repository: { directory, membership: directory, rules: register.scope, destination: register.scope } } });
  expect(await stopOf(resume(storageOf(journal({ [operation]: saved }))))).toBe("The saved room has no exact native claim recovery proof. It is kept. This step sent nothing, and an earlier step of this creation went ahead. Report it. A new creation makes a second room.");
});

test("a stop before the lock reads no custody, so it says that a saved request can have gone", async () => {
  vi.stubGlobal("navigator", {});
  expect(await stopOf(claimRoom(session, configured, storageOf(journal({ [operation]: record })), "Room", { mode: "resume", operation, keys: memoryPageKeys() }))).toBe("This browser cannot lock private claim recovery across tabs. This step sent nothing. A saved creation stays kept, and an earlier send of it can have gone. A new creation can make a second room.");
  expect(await stopOf(startRoom(origin, storageOf(), { mode: "check", keys: memoryPageKeys() }))).toBe("Private Start locking is unavailable. This step sent nothing. A saved Start stays kept, and an earlier send of it can have gone. A new creation can make a second room.");
});

test("a fresh creation with no record keeps the plain words", async () => {
  // Control: a new operation has no earlier send, so an invalid offer stops before any send of it.
  expect(await stopOf(claimRoom(session, configured, storageOf(), "Room", { mode: "new", locks, keys: memoryPageKeys(), creationOffer: async () => ({}) as never }))).toBe("The creation offer does not match this exact origin and register. Nothing was submitted.");
});

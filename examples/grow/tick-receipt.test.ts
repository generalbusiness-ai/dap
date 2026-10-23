/** The real native receipt projection over a SCRIPTED preparation entry.
 * This protects the public receipt/read binding only. No preparation judge,
 * owner authority, install, reservation or settlement runs in this fixture. */
import { expect, test } from "vitest";
import type { Entry, Sealed } from "@generalbusiness/dap-contract";
import { entryHash, intentDigest } from "@generalbusiness/dap-bytes";
import { signedIntent, secretSigner } from "@generalbusiness/dap-client";
import { receiptOf } from "@generalbusiness/dap-scope/runtime";
import { otherLane, d, T0, keys } from "@generalbusiness/dap-derive/testing";
import { acceptedTickFact } from "./simulator-tick.ts";

test("a native-shaped owner receipt with intent null binds only its exact sealed signed preparation, definition and scope", async () => {
  const signed = await signedIntent(secretSigner(keys.vic.secret), { to: otherLane, kind: "device-command@1:answer", fields: {
    command: { at: otherLane, seq: 1, hash: d("1") }, outcome: "confirmed", description: "SCRIPTED protocol fixture; no device owner ran.",
  } }, { now: Date.parse(T0) });
  // A scripted wire entry, like the public-journal fixture. G5a's name is
  // not in this old Main's type union yet; no judge or codec admits it here.
  // The installed integration must wait for the actual reviewed landing.
  const entry: Entry = JSON.parse(JSON.stringify({ v: 1, at: otherLane, seq: 2, prev: d("1"), time: T0, clamped: false, epoch: 0,
    input: { type: "preparation", signed, authority: [], capability: "device-command@1", step: "answer" }, uses: [], prepared: [], effects: [], sends: [] }));
  const sealed: Sealed = { entry, hash: entryHash(entry) }, receipt = receiptOf(sealed, d("a"));
  expect(receipt.intent).toBeNull();
  const answer = { answer: "accepted" as const, receipt }, reader = { entry: async () => ({ ok: true as const, at: { seq: 2, hash: sealed.hash }, complete: true, value: sealed }) };
  expect(await acceptedTickFact(answer, otherLane, d("a"), signed, true, reader)).toEqual(receipt.fact);
  await expect(acceptedTickFact(answer, otherLane, d("b"), signed, true, reader)).rejects.toThrow("receipt-mismatch");
  await expect(acceptedTickFact({ ...answer, receipt: { ...receipt, intent: intentDigest(signed.intent) } }, otherLane, d("a"), signed, true, reader)).rejects.toThrow("receipt-mismatch");
  const different = await signedIntent(secretSigner(keys.vic.secret), { to: otherLane, kind: signed.intent.kind, fields: { ...signed.intent.fields, outcome: "unknown" } }, { now: Date.parse(T0) });
  let refusedDifferent = false;
  try { await acceptedTickFact(answer, otherLane, d("a"), different, true, reader); }
  catch (error) { refusedDifferent = error instanceof Error && error.message === "owner-preparation-mismatch"; }
  expect(refusedDifferent).toBe(true);
  const bad = { entry: async () => ({ ok: true as const, at: { seq: 2, hash: d("2") }, complete: true, value: { ...sealed, hash: d("2") } }) };
  await expect(acceptedTickFact(answer, otherLane, d("a"), signed, true, bad)).rejects.toThrow("preparation-unavailable");
});

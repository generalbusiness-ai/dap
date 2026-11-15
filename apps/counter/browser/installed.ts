/** The installed Counter enrolls a browser key through native membership. */
import { canonicalize, isRecord } from "@generalbusiness/dap-bytes";
import { applicationDeviceIdentity, browserJoining, browserPrivateSlots, generateBrowserDeviceKey, readApplicationInvitation, storedWebCryptoSigner,
  type ApplicationScreenContext, type BrowserKeptJoin, type BrowserJoinSeat, type Fetch } from "@generalbusiness/dap-client";
import { COUNTING_COMMITMENTS_DEFINITION } from "../commitments-pin.ts";
import type { SavedDevice } from "./device-key.ts";
import { counterCustody } from "./storage.ts";
interface Device { publicKey: import("@generalbusiness/dap-contract").KeyId; pair: CryptoKeyPair }
export function counterEnrollment(context: ApplicationScreenContext, current: () => boolean, fetch?: Fetch) {
  if (context.definition !== COUNTING_COMMITMENTS_DEFINITION) throw Error("This presentation does not match the installed Counter definition.");
  const prefix = canonicalize(context.scope), slots = browserPrivateSlots({ database: "dap-counter-enrollment-2", store: "slots", lock: "dap-counter-enrollment" });
  const get = (name: string) => slots.load(prefix + ":" + name), put = (name: string, value: unknown) => slots.save(prefix + ":" + name, value);
  const usable = () => { if (!current()) throw Error("This device context is no longer current."); };
  const device = (make: boolean) => slots.run(async (): Promise<Device | null> => {
    usable();
    let value = await get("device");
    usable();
    if (value === null && make) { value = await generateBrowserDeviceKey(); usable(); await put("device", value); usable(); }
    if (value === null) return null;
    if (!isRecord(value) || !isRecord(value["pair"])) throw Error("The original browser key is unavailable.");
    const held = value as unknown as Device, signer = storedWebCryptoSigner(held.publicKey, held.pair.privateKey);
    await signer.sign(crypto.getRandomValues(new Uint8Array(32)));
    usable();
    return held;
  });
  const saved = (key: Device, seat: BrowserJoinSeat): SavedDevice => ({ name: seat.handle, binding: applicationDeviceIdentity(context, seat, key.publicKey), key: key.pair.privateKey });
  const api = (key: Device) => browserJoining(storedWebCryptoSigner(key.publicKey, key.pair.privateKey), { origin: context.origin, membershipDefinition: context.membershipDefinition, current, ...(fetch ? { fetch, actFetch: fetch } : {}),
    lock: slots, custody: counterCustody(), store: { load: () => get("join"), save: value => put("join", value), clear: async outcome => {
      if (!current()) throw Error("This join context is no longer current.");
      const value = await get("join") as BrowserKeptJoin | null;
      if (!current()) throw Error("This join context is no longer current.");
      // Preserve the verified seat before clearing the join slot. A later
      // device-store failure can recover this handoff without signing.
      if (outcome === "joined" && value?.v === 2) await put("seat", value.seat);
      if (!current()) throw Error("This join context is no longer current.");
      await slots.remove(prefix + ":join");
    } },
  });
  return {
    forget: () => slots.run(async () => {
      usable();const join = await get("join");usable();
      if (join !== null) throw Error("Check the original enrollment before forgetting this browser.");
      await slots.remove(prefix + ":seat");usable();await slots.remove(prefix + ":device");usable();
    }),
    async restore(): Promise<SavedDevice | null> {
      const key = await device(false);usable();const seat = await get("seat") as BrowserJoinSeat | null;usable();
      return key && seat ? saved(key, seat) : null;
    },
    async perform(mode: "join" | "check" | "continue", text = ""): Promise<{ device?: SavedDevice; reason: string }> {
      const invitation = mode === "join" ? readApplicationInvitation(context, text) : null;
      if (invitation && !invitation.ok) return { reason: invitation.reason };
      const key = await device(mode === "join");
      usable();
      if (!key) return { reason: "No original browser enrollment is kept." };
      const joining = api(key), result = mode === "join" && invitation?.ok ? await joining.join(invitation.link, invitation.seat)
        : mode === "continue" ? await joining.continueOriginal() : await joining.check();
      usable();
      return result?.status === "joined" ? { device: saved(key, result.seat), reason: "This browser's membership is confirmed. Choose a voice, then Join count." }
        : { reason: result?.reason ?? "No original enrollment is kept. Paste an invitation to enroll this browser." };
    },
  };
}

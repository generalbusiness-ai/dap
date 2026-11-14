// The page of custody-witness.mjs: browser joining with the browser custody store, in a real browser. The script bundles this
// file and serves it at /custody-witness/ on the Worker's origin, so the invitation's service is the page's origin.
import { browserCustodyStore, browserJoining, browserPrivateSlots, generateBrowserDeviceKey, invitationOf, readBrowserInvitation, storedWebCryptoSigner, type KeyId } from "@generalbusiness/dap-client";

const custody = browserCustodyStore({ database: "custody-witness-records", lock: "custody-witness" });
const slots = browserPrivateSlots({ database: "custody-witness-slots", store: "slots", lock: "custody-witness-slots" });
interface Device { publicKey: KeyId; pair: CryptoKeyPair }
async function device(): Promise<Device> {
  let held = await slots.load("device") as Device | null;
  if (!held) { held = await generateBrowserDeviceKey() as Device; await slots.save("device", held); }
  return held;
}
const joining = async (definition: string) => {
  const held = await device();
  return browserJoining(storedWebCryptoSigner(held.publicKey, held.pair.privateKey), { origin: location.origin, membershipDefinition: definition, lock: slots, custody,
    store: { load: () => slots.load("join"), save: (value) => slots.save("join", value), clear: () => slots.remove("join") } });
};
/** Each custody record as the IndexedDB of this origin holds it, read past the store. */
const records = (): Promise<unknown[]> => new Promise((resolve, reject) => {
  const open = indexedDB.open("custody-witness-records");
  open.onerror = () => reject(new Error("no custody database"));
  open.onsuccess = () => {
    const read = open.result.transaction(["records"], "readonly").objectStore("records").getAll();
    read.onsuccess = () => { resolve((read.result as { text: string }[]).map((row) => JSON.parse(row.text))); open.result.close(); };
    read.onerror = () => reject(new Error("no custody records"));
  };
});
(globalThis as unknown as { witness: unknown }).witness = {
  async join(text: string) {
    const link = invitationOf(text, location.origin);
    if (!link) return { status: "no-link" };
    const offered = readBrowserInvitation(text, { origin: location.origin, membershipDefinition: link.definition });
    if (!offered.ok) return { status: "refused-link", reason: offered.reason };
    return (await joining(link.definition)).join(offered.link, offered.seat);
  },
  async check(definition: string) { return (await joining(definition)).check(); },
  async slot() { return slots.load("join"); },
  records,
};

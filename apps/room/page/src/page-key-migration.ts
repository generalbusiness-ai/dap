/** Local-only startup migration shared by entry surfaces. No network calls
 * or new enrollment are performed while converting retained key custody. */
import { pageKeyStore, type KeySettingsStorage } from "./browser-key-store.ts";
import { migrateAllClaimCustody } from "./claim.ts";
import { migrateOriginalJoin } from "./join-custody.ts";
import { migrateOriginalStart } from "./start-custody.ts";
export async function migratePageOperations(origin: string, storage: KeySettingsStorage & { length: number; key(n: number): string | null }, keys = pageKeyStore()): Promise<void> {
  await migrateOriginalJoin(origin, storage, { keys });
  await migrateOriginalStart(origin, storage, keys);
  await migrateAllClaimCustody(origin, storage, keys);
}

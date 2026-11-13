/** Named local-store refusals; no record, Node or authority dependency. */
import { RETIRED_ROOM_READER_COMMIT } from "@generalbusiness/dap-bytes";

export function retiredStoreMessage(store: string): string {
  return `The ${store} belongs to the retired room format. Commit ${RETIRED_ROOM_READER_COMMIT} reads its old records. Keep the old store unchanged and choose a fresh store directory for new work.`;
}

export class StoreFormatError extends Error {
  override readonly name = "StoreFormatError";
  readonly code: "store-retired" | "store-unavailable";
  readonly reader = RETIRED_ROOM_READER_COMMIT;
  constructor(readonly reason: "retired" | "unavailable") {
    super(reason === "retired" ? retiredStoreMessage("caller-named custody store") : "The custody store format could not be checked. Keep its original requests unchanged.");
    this.code = reason === "retired" ? "store-retired" : "store-unavailable";
  }
}

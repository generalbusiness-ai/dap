/** Retired-room HTTP refusal. The shared reader constant is not bound yet. */
import { RETIRED_ROOM_READER_COMMIT } from "@generalbusiness/dap-contract";
import { jsonReply } from "./response.ts";

export function roomRetiredResponse(): Response {
  return jsonReply(410, {
    error: "room-retired",
    message: `This room retired at the identifier cutover. Commit ${RETIRED_ROOM_READER_COMMIT} reads its journal.`,
    reader: RETIRED_ROOM_READER_COMMIT,
  });
}

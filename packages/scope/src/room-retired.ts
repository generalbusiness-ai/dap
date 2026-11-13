/** Retired-room HTTP refusal. The shared reader constant is not bound yet. */
// HELD Q-S4: no commit of the contract defines RETIRED_ROOM_READER_COMMIT; the S4 merge imports it.
import { RETIRED_ROOM_READER_COMMIT } from "@generalbusiness/dap-contract";
import { jsonReply } from "./response.ts";

export function roomRetiredResponse(): Response {
  return jsonReply(410, {
    error: "room-retired",
    message: `This room retired at the identifier cutover. Commit ${RETIRED_ROOM_READER_COMMIT} reads its journal.`,
    reader: RETIRED_ROOM_READER_COMMIT,
  });
}

/** The closed transport stop for an entire retired room. Never a Native answer. */
export type RoomRetiredStop = Readonly<{ stop: "retired" }>;
export const ROOM_RETIRED_STOP: RoomRetiredStop = Object.freeze({ stop: "retired" });

/** Check the closed wire word without invoking an accessor. */
export function isRoomRetiredStop(value: unknown): value is RoomRetiredStop {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Reflect.ownKeys(value).length !== 1) return false;
  const word = Object.getOwnPropertyDescriptor(value, "stop");
  return word !== undefined && "value" in word && word.enumerable === true && word.value === "retired";
}

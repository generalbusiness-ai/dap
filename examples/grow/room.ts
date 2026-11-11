/** Generated runtime data. Author it in authoring/room.ts. */
import type { RoomDefinition } from "./authoring/room.ts";
import definition from "./definitions/room.json" with { type: "json" };

export { ROOM } from "./names.ts";
export const room: RoomDefinition = definition as RoomDefinition;

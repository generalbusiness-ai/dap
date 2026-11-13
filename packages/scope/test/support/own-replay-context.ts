import { archiveOwnReplayContext } from "../../src/archive-publication.ts";
import type { ArchiveReplayContext } from "../../src/archive-publication.ts";
/** The fixture scope's own replay context. A fixture scope always holds its
 * own genesis, so a missing one is a fixture fault, not a pass refusal. */
export function ownReplayContext(...args: Parameters<typeof archiveOwnReplayContext>): ArchiveReplayContext {
  const context = archiveOwnReplayContext(...args);
  if (!context) throw Error("The fixture scope must hold its own genesis.");
  return context;
}

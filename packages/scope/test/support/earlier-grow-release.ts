/** The immutable earlier Grow release used by historical archive witnesses. */
import type { GrowArchiveRelease } from "../../../../apps/room/archive-policy.ts";
import { EARLIER_GROW_DEFINITIONS, EARLIER_GROW_PUBLISHER, EARLIER_GROW_RELEASE } from "../../../../examples/grow/earlier-release.ts";

export const EARLIER_GROW_ARCHIVE_RELEASE: GrowArchiveRelease = { release: EARLIER_GROW_RELEASE, publisher: EARLIER_GROW_PUBLISHER, entry: EARLIER_GROW_DEFINITIONS[0] };

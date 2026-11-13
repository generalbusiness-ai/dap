/** The recorded signed Grow demo release, as the deployed Grow Worker trusts it (ruling e4b72290). */
import { GROW_ARCHIVE_DEFINITIONS, type GrowArchiveRelease } from "../../../../apps/room/archive-policy.ts";
import { DEMO_PUBLISHER, DEMO_RELEASE } from "../../../../examples/grow/demo-release.ts";

export const RECORDED_GROW_RELEASE: GrowArchiveRelease = { release: DEMO_RELEASE, publisher: DEMO_PUBLISHER, entry: GROW_ARCHIVE_DEFINITIONS[0] };

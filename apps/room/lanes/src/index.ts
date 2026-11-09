/**
 * The two lane definitions, `issue` and `change`, as data. A lane is a
 * definition: this package holds no rule and no code that judges.
 *
 * `DIGESTS` holds each pinned digest. `definitions/issue.json` and
 * `definitions/change.json` hold readable JSON. Their canonical values
 * determine the digests and provide the canonical bytes that a creator
 * retains for its children or a rules scope activates by digest. The
 * package exports both files. `scripts/pin.mjs` writes them from the values.
 */

import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { change } from "./change.ts";
import { issue } from "./issue.ts";

export { issue, change };
export { change3, changeDemo3 } from "./change3.ts";
export { issueDemo, changeDemo } from "./demo.ts";
export { MANIFEST_DIGESTS } from "./digests3.ts";
export { DEMO_DIGESTS, DIGESTS, LANE_FORMS } from "./digests.ts";
export type { LaneDefinition } from "./shared.ts";

/** Both declarations, as a creator supplies them in `definitions`, so that a directory which names their digests in a `create` retains their bytes. */
export const definitions: readonly DeclaredDefinition[] = [issue, change];

/** Explicit evidence-rules profile. Existing definitions retain their pins. */
export { issueEvidence4 } from "./issue4.ts";
export { changeEvidence4 } from "./change4.ts";
export { EVIDENCE_DIGESTS } from "./digests4.ts";

/** Explicit workspace profile; creation and activation select these pins. */
export { issueJ4, changeJ4 } from "./j4.ts";
export { J4_DIGESTS } from "./digests-j4.ts";

/** Explicit question approval successor; earlier issue definitions keep their pins. */
export { issueQuestions } from "./issue-questions.ts";
export { QUESTION_DIGESTS } from "./digests-questions.ts";

/** Explicit Question profile that fixes the Brief digest for each ask. */
export { issueQuestionsBrief } from "./issue-questions-brief.ts";
export { QUESTION_BRIEF_DIGESTS } from "./digests-questions-brief.ts";

/** Explicit finding successor of the workspace Change; earlier change definitions keep their pins. */
export { changeFinding } from "./change-finding.ts";
export { FINDING_DIGESTS } from "./digests-finding.ts";

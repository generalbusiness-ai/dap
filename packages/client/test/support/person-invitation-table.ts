/** TEST person links shared by the actual Start, CLI and MCP entry witnesses.
 * These expected encoding decisions assert no native membership admission. */
import { b64url, newIncarnation, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { InvitationLink } from "../../src/invitation.ts";

export const PERSON_SERVICE = "https://person-invitation.test";
const scope = (kind: "directory" | "membership" | "rules" | "destination") =>
  scopeIdOf({ v: 1, kind, definition: "platform:directory@3", creator: null, cause: textDigest(`TEST person invitation ${kind}`), ordinal: 0 });
export const PERSON_INVITATION: InvitationLink = {
  v: 1, service: PERSON_SERVICE,
  repository: {
    directory: { scope: scope("directory"), inc: newIncarnation(new Uint8Array(16).fill(11)), kind: "directory" },
    membership: { scope: scope("membership"), inc: newIncarnation(new Uint8Array(16).fill(12)), kind: "membership" },
    rules: scope("rules"), destination: scope("destination"),
  },
  invitation: 5, secret: "TEST person invitation secret", handle: "@test-person", definition: "platform:membership@2",
};
export const personLinkText = (value: unknown): string => "artroom-invite:" + b64url(utf8(JSON.stringify(value)));
export const PERSON_INVITATION_CASES = [
  { name: "valid", surface: "all", text: personLinkText(PERSON_INVITATION), normalized: PERSON_INVITATION, admitted: true },
  { name: "missing pin", surface: "all", text: personLinkText({ ...PERSON_INVITATION, definition: undefined }), normalized: { v: 1, service: PERSON_SERVICE, repository: PERSON_INVITATION.repository, invitation: 5, secret: PERSON_INVITATION.secret, handle: PERSON_INVITATION.handle }, admitted: false },
  { name: "trailing service slash", surface: "all", text: personLinkText({ ...PERSON_INVITATION, service: PERSON_SERVICE + "/" }), normalized: PERSON_INVITATION, admitted: true },
  { name: "another service", surface: "all", text: personLinkText({ ...PERSON_INVITATION, service: "https://another-person.test" }), normalized: { ...PERSON_INVITATION, service: "https://another-person.test" }, admitted: false },
  { name: "malformed", surface: "all", text: "artroom-invite:not-base64!", normalized: null, admitted: false },
  { name: "fresh CLI only", surface: "cli", text: personLinkText({ ...PERSON_INVITATION, service: PERSON_SERVICE + "/" }), normalized: PERSON_INVITATION, admitted: true },
] as const;

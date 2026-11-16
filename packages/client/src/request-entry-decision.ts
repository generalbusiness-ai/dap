/** The first two C3 rules need only an actual entry's meaning and the present meaning. */
import type { Digest } from "@generalbusiness/dap-contract";
import type { SignedEntry } from "./replica.ts";

export function requestEntryDecision(entry: Pick<SignedEntry, "meaning"> | null, presentMeaning: Digest): { status: "recorded" | "other-recorded" } | null {
  if (!entry) return null;
  return { status: entry.meaning === presentMeaning ? "recorded" : "other-recorded" };
}

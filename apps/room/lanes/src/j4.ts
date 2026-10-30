/** Explicit workspace profiles. Older lane definitions keep their own pins. */
import { changeDemo, issueDemo } from "./demo.ts";
import { issue } from "./issue.ts";
import type { LaneDefinition } from "./shared.ts";

const capabilities = [
  { name: "hold", version: 2 },
  { name: "git-read", version: 1 },
] as const;

/** The demo Issue rows with version 2 holds and explicit hold release. */
export const issueJ4 = {
  ...issueDemo,
  capabilities,
  acts: { ...issueDemo.acts, "release-hold": issue.acts["release-hold"] },
} as const satisfies LaneDefinition;

/** The demo Change rows with version 2 holds and matching foreign checks. */
export const changeJ4 = {
  ...changeDemo,
  capabilities,
  items: {
    ...changeDemo.items,
    manifest: {
      ...changeDemo.items.manifest,
      refs: {
        ...changeDemo.items.manifest.refs,
        pin: {
          ...changeDemo.items.manifest.refs.pin,
          to: { type: "fact", kind: ["hold@2:check"], under: "issue" },
        },
      },
    },
  },
  acts: {
    ...changeDemo.acts,
    "propose-manifest": {
      ...changeDemo.acts["propose-manifest"],
      presents: {
        pin: { kind: ["hold@2:check"], under: "issue", required: false },
      },
    },
  },
} as const satisfies LaneDefinition;

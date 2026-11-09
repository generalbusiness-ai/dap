/**
 * The commands, as functions over a scope service's base URL and a signing
 * key. Each takes a `Context` and returns an `Outcome`: an exit code and
 * one or two plain lines. `main.ts` runs them under Node with the files of
 * `files.ts` and the runtime's `fetch`; a test runs the same functions
 * against the test Worker's routes, with a store in memory.
 *
 * The command judges nothing. Whether an act takes effect is the scope's
 * judgment, and its answer is printed as it came: a refusal writes nothing,
 * and its reason is the outcome. What the command reads to build an intent
 * (an item's revision, the caller's role) is a reading, and the scope
 * checks each part of the intent again.
 *
 * | Command | What it does |
 * |---|---|
 * | `install` | Creates the register by an `install` intent, signed by a new operator key that is also the one creator key. With `--plan`, it signs the intent and prints the register ID it will create, and creates nothing; `--planned` creates that plan. |
 * | `claim` | Signs the register's `found` act, then waits until the directory, membership, rules scope and destination are created and confirmed. Then it takes the creator's seat and first key in membership. A claim it gave up waiting on is kept as pending, and the next `claim` goes on from it; `--again` signs a new one. |
 * | `invite`, `join` | Membership's `invite-member` and `join`. The link carries the invitation's number and secret; the joining key is made and kept locally. |
 * | `inviteDevice`, `enrolDeviceKey` | Membership's `invite-key` with kind `device` and `enrol`: a new key of an existing member, by the same kind of private link. |
 * | `acts` | The acts of a scope's definition, with the ones the caller's role holds. |
 * | `act` | One act of any kind, through the client's declared handle for a declared definition, or as a signed intent for a platform one. |
 * | `log`, `show` | The scope's history, and one entry, over the read routes. |
 * | `verify` | The replay verifier over the read routes: with the caller's session, and by signed reads where the session is refused. With `--all`, every scope of the room, one line each. |
 * | `remote` | The repository's host, namespace, name and remote URL, from the destination's branch item. |
 * | `clone` | Signs the destination's `read-token`, waits for its outcome, reads the read token once, and runs `git clone` with it in an `Authorization` header that git reads from its environment. The token is never an argument and never printed. |
 * | `edit` | Opens a change through the directory under the change definition that the rules scope holds active, proposes one file as its only version (`propose-file`), and merges it as `merge` does. The room, not the person, writes the repository. |
 * | `merge` | Signs `merge` of a change's current version, and waits until the room has published it or refused it. `edit` and `merge` take `--closes <issue>`: the lane's `link-own` first. |
 * | `issue`, `issues` | `open` is the directory's `open-issue`; `comment`, `assign` and `close` are the issue lane's own acts. `issues` lists each issue as its lane has it. |
 */
export { describe, expectedOf, heldActs, LINK, linkOf, valueOf, type ActShape, type DefinitionShape, type Link, type Standing } from "./browser-helpers.ts";
export { claim, checkClaim } from "./claim.ts";
export { VERIFY_LIMITS, type VerifyLimits, type VerifyOptions } from "./verification.ts";
export { CAPABILITY_CODE as REPLAY_CAPABILITY_CODE } from "@generalbusiness/dap-derive";
export { type InstallCohort, type RegisterPolicy, type InstallOptions, CREATION_INSTALL_COHORTS, install, planInstall, installPlanned } from "./command-install.ts";
export type { Context, Git, Outcome } from "./command-context.ts";
export { scopeIndexAccess, standing, acts, act, apps, items, log, show, status } from "./command-scope.ts";
export { invite, inviteDevice, join } from "./command-membership.ts";
export { verifyScopeCommand } from "./command-verify.ts";
export { remote, clone, cloneRetained } from "./command-repository.ts";
export { EDIT_BYTES, edit, propose, merge } from "./command-change.ts";
export { issueNamed, issueOpen, issueComment, issueAssign, issueClose, issues } from "./command-issues.ts";
export { verifyScopeCommand as verify } from "./command-verify.ts";

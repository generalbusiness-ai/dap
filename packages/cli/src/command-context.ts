/** Command ports and outcomes. */
import type { ClaimSteps } from "./claim.ts";
import type { CloneWait } from "./clone-outcome.ts";
import type { Store } from "./store.ts";
import type { VerifyOptions } from "./verification.ts";
import type { CreationOffer, Fetch } from "@generalbusiness/dap-client";
import type { ScopeId, ScopeRef } from "@generalbusiness/dap-contract";

export interface Context {
  /** One verification command's total read work and incremental progress. */
  verify?: VerifyOptions;
  /** An explicit runtime port with persistent request custody. The browser
   * command surface has no MCP server or Node dependency. */
  applicationCommand?: (name: "install_application" | "application_installation", args: Record<string, unknown>) => Promise<Outcome>;
  store: Store;
  /** Replaces the runtime's `fetch`: a test passes the Worker's routes. */
  fetch?: Fetch;
  /** Internal configured-service trust for this exact injected creation
   * transport. It authenticates no independent remote history. */
  trustedCreationService?: { service: string; fetch: Fetch };
  /** Explicit fixed-origin demo projection for fresh claim preflight only.
   * It grants no authority and is never used to resume/check an original. */
  creationOffer?: (register: ScopeRef) => Promise<CreationOffer>;
  /** The clock that intents are signed by, in milliseconds. The default is the runtime's. */
  now?: () => number;
  /**
   * Called between two reads while a command waits for scopes to be created
   * and confirmed, with the scopes it waits on. The default waits one
   * second. A deployment's alarms do the work meanwhile; a test drives the
   * dispatchers here instead.
   */
  pause?: (waiting: readonly ScopeId[]) => Promise<void>;
  /** How many reads a wait makes before it gives up. The default is 120. */
  tries?: number;
  /** What a claim's stops tell a person to do next. The default names the command's `--again`. */
  claimSteps?: ClaimSteps;
  /** History pages per scope while discovering the room for `verify --all`. The default is 1,000. */
  historyPages?: number;
  /** The `git` program, for `clone`. `main.ts` gives Node's (`git.ts`); a test gives a stand-in. Absent: there is none. */
  git?: Git;
  /** Read-token outcome bounds and caller cancellation; never mint authority. */
  cloneWait?: CloneWait;
  /** A local file's bytes, for `edit --file` and `act --value`, or null when it cannot be read. `main.ts` gives Node's; a test gives its own. */
  read?: (path: string) => Promise<Uint8Array | null>;
}

/**
 * One run of `git`: its arguments, and the environment it adds. The answer is its exit code, or null when there is no `git` to
 * run. `env` is how a secret reaches git: as configuration that git reads from its environment, never as an argument.
 */
export interface Git {
  run(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  /** Credential-bearing archive clone/fetch only: fresh environment, fixed config, no raw child output. */
  archiveRun?(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  files?(base: string, branch: string): Promise<{ ok: true; tip: string; files: readonly { path: string; bytes: Uint8Array }[] } | { ok: false; reason: string }>;
}

/** What a command ends with: its exit code, and the lines it prints. 0: done. 1: refused, unavailable or not found. 2: not a command this can run. */
export interface Outcome { code: 0 | 1 | 2 | 3; lines: string[]; claimState?: "failed" }

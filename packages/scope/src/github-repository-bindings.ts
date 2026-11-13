/** Operator authorization for a repository attached after a destination's birth. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeRef, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { repositoryBindingBranch } from "@generalbusiness/dap-platform";
import type { DestinationRepository } from "./destination-host.ts";
import { exact } from "./host-wiring.ts";

export interface GitHubRepositoryBinding {
  destination: ScopeRef;
  repository: DestinationRepository;
  branch: string;
}
/** Missing configuration grants nothing. Invalid configuration disables the wiring. */
export function gitHubRepositoryBindings(raw: unknown, namespace: string): readonly GitHubRepositoryBinding[] | null {
  if (raw === undefined) return [];
  if (typeof raw !== "string" || utf8(raw).length > 65536) return null;
  try {
    const rows: unknown = parseStrict(raw);
    if (!Array.isArray(rows) || rows.length > 64) return null;
    const destinations = new Set<string>(), repositories = new Set<string>();
    const bindings: GitHubRepositoryBinding[] = [];
    for (const row of rows) {
      const value = exact(row, ["destination", "repository", "branch"]);
      const destination = value?.["destination"];
      const repository = exact(value?.["repository"], ["host", "namespace", "name", "id"]);
      const branch = value?.["branch"];
      if (!value || !isScopeRef(destination)
        || !repository || repository["host"] !== "github.com" || repository["namespace"] !== namespace
        || typeof repository["name"] !== "string" || !/^[A-Za-z0-9_.-]{1,100}$/.test(repository["name"])
        || [".", ".."].includes(repository["name"]) || repository["name"].toLowerCase().endsWith(".git")
        || typeof repository["id"] !== "string" || !/^[1-9][0-9]*$/.test(repository["id"])
        || !Number.isSafeInteger(Number(repository["id"])) || String(Number(repository["id"])) !== repository["id"]
        || !repositoryBindingBranch(branch)) return null;
      const destinationKey = canonicalize(destination);
      const repositoryKey = canonicalize({ id: repository["id"], branch });
      if (destinations.has(destinationKey) || repositories.has(repositoryKey)) return null;
      destinations.add(destinationKey);
      repositories.add(repositoryKey);
      bindings.push({ destination, repository: repository as unknown as DestinationRepository, branch });
    }
    return bindings;
  } catch { return null; }
}

/** All parts of the reviewed binding must match the destination's live record. */
export function gitHubRepositoryBindingAllowed(bindings: readonly GitHubRepositoryBinding[], destination: ScopeRef,
  repository: unknown, branch: unknown): boolean {
  return bindings.some(row => same(row.destination, destination) && same(row.repository, repository) && row.branch === branch);
}

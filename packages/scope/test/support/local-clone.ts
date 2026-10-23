/** Test-only bridge to Node's real Git. Host identity/mint rights are stand-ins. */
import type {} from "vitest";
export interface LocalCloneAddress { url: string; nonce: string }
export interface LocalCloneRunDiagnostic {
  admission: "unconfigured" | "argv-env-token-refused" | "version" | "clone";
  outerCode?: number | null; outerSignal?: string | null;
  ipcResults?: number; gitCode?: number | null;
  outputBytes?: number; outputBoundExceeded?: boolean; timedOut?: boolean;
  spawnError?: boolean; stdinError?: boolean; outputHints?: readonly string[];
}
export interface LocalCloneRun {
  code: number | null; outputClean: boolean; diagnostic?: LocalCloneRunDiagnostic;
}
export interface LocalCloneInspection {
  head: string; tree: string; expectedTree: string; paths: string; readme: string; origin: string;
  tokenInConfig: boolean; tokenInOutput: boolean; readRequests: number;
}
export interface LocalArchiveClone {
  refs: readonly { ref: string; id: string }[];
  objects: readonly { id: string; type: "blob" | "tree" | "commit"; data: string }[];
  sourceObjects: number; fsckPassed: true; gitVersion: string;
}
export interface ArchiveCommandWitness {
  cloneCode: number | null; fetchCode: number | null;
  refs: readonly { ref: string; id: string }[];
  tokenInConfig: boolean; tokenInArgv: boolean; tokenInOutput: boolean;
  readRequests: number;
  withoutTrust: { code: number | null; signal: string | null; report: unknown };
  withTrust: { code: number | null; signal: string | null; report: unknown };
}
declare module "vitest" { interface ProvidedContext { localClone: LocalCloneAddress } }

export function localClone(at: LocalCloneAddress) {
  const headers = { "x-clone-fixture": at.nonce };
  const json = async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${at.url}${path}`, { headers: { ...headers, "content-type": "application/json" }, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error(path === "/archive-clone" ? `local archive clone fixture refused: ${(await response.text()).slice(0, 2048)}` : "local clone fixture refused");
    return response.json() as Promise<T>;
  };
  return {
    configure: (name: string) => json<{ remote: string; directory: string }>("/configure", { name }),
    mint: (name: string, scope: "read" | "write", seconds: number) => json<{ id: string; scope: "read" | "write"; plaintext: string }>("/mint", { name, scope, seconds }),
    revoke: (name: string, plaintext: string) => json<boolean>("/revoke", { name, plaintext }),
    run: (args: readonly string[], env: Readonly<Record<string, string>>) => json<LocalCloneRun>("/run", { args, env }),
    inspect: () => json<LocalCloneInspection>("/inspect"),
    archive: (objects: LocalArchiveClone["objects"], refs: LocalArchiveClone["refs"]) => json<LocalArchiveClone>("/archive-clone", { objects, refs }),
    archiveCommand: (objects: LocalArchiveClone["objects"], refs: LocalArchiveClone["refs"], remote: string) => json<{ id: string; remote: string; directory: string; token: string }>("/archive-command", { objects, refs, remote }),
    archiveRun: async (id: string, args: readonly string[], env: Readonly<Record<string, string>>) => (await json<{ code: number | null }>("/archive-command-run", { id, args, env })).code,
    archiveFinish: (id: string, lines: readonly string[]) => json<ArchiveCommandWitness>("/archive-command-finish", { id, lines }),
    archiveClose: (id: string) => json<{ closed: true }>("/archive-command-close", { id }),
    status: () => json<unknown>("/status"),
    forward: async (request: Request) => {
      // Fixed trusted test proxy, as Host.upstream's synthetic Response. The
      // local transport URL is not evidence about HTTPS/redirect behavior.
      const response = await fetch(`${at.url}/backend`, {
        method: request.method, redirect: "manual", signal: request.signal,
        headers: { ...Object.fromEntries(request.headers), ...headers, "x-clone-remote": request.url },
        ...(request.method === "POST" ? { body: request.body } : {}),
      });
      return new Response(response.body, { status: response.status, headers: response.headers });
    },
  };
}

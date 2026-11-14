/** Run one member publication cycle, or wait and repeat. Importing opens no home. */
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Custody, ScopeHandle, httpTransport, newIdempotencyKey, requestSession, signerSessionRequest } from "@generalbusiness/dap-client";
import { fileStore as custodyStore } from "@generalbusiness/dap-client/node";
import { isScopeRef } from "@generalbusiness/dap-bytes";
import { fileStore } from "../../../packages/cli/src/files.ts";
import { storedSigner } from "../../../packages/cli/src/store-signer.ts";
import { LocalGit } from "./git.ts";
import { PACKAGE } from "./identity.ts";
import { publish } from "./publisher.ts";

export const USAGE = `${PACKAGE.name}@${PACKAGE.version}
node --import tsx examples/lending/publisher/publish.ts \\
  --home <existing-member-home> --scope <scope-id> --genesis <digest> \\
  --repository <absolute-local-bare-path> --work <absolute-work-directory> \\
  --host <recorded-host> --namespace <recorded-namespace> --name <recorded-name> \\
  [--branch main] [--watch]

Staff must already have bound the repository and appointed this member.
This script reads the existing member key, creates no identity, and reads no Git credential.
The room's owner carries the local branch to a remote Git host with their own Git.
P1 has no authenticated remote connector. P2 owns credential delivery.
`;

export async function main(argv: readonly string[]): Promise<void> {
  if (argv.length === 1 && argv[0] === "--help") { process.stdout.write(USAGE); return; }
  const fields = new Map<string, string>(); let watch = false;
  const names = new Set(["--home", "--scope", "--genesis", "--repository", "--work", "--host", "--namespace", "--name", "--branch"]);
  for (let at = 0; at < argv.length; at++) {
    const name = argv[at]!;
    if (name === "--watch" && !watch) { watch = true; continue; }
    if (!names.has(name) || fields.has(name) || argv[at + 1] === undefined || argv[at + 1]!.startsWith("--")) throw new Error("arguments");
    fields.set(name, argv[++at]!);
  }
  const required = (name: string) => { const value = fields.get(name); if (!value) throw new Error("arguments"); return value; };
  const home = required("--home");
  if (!isAbsolute(home) || resolve(home) !== home) throw new Error("home");
  const target = { scope: required("--scope"), genesis: required("--genesis") };
  if (!isScopeRef(target)) throw new Error("scope");
  const repository = { host: required("--host"), namespace: required("--namespace"), name: required("--name") };
  const git = await LocalGit.open(required("--repository"), required("--work"), fields.get("--branch") ?? "main");
  const store = fileStore(home), config = await store.config();
  if (!config?.repository) throw new Error("existing-room");
  const signer = await storedSigner(store, config.key);
  if (!signer) throw new Error("signer");
  const now = () => new Date().toISOString();
  const signed = await signerSessionRequest(config.repository.membership, signer, new Date(Date.now() + 60_000).toISOString(),
    `publisher-${newIdempotencyKey()}`);
  const opened = await requestSession(config.service, config.repository.membership.scope, signed);
  if (!opened.ok) throw new Error("session");
  const member = { membership: config.repository.membership, member: opened.session.claims.member };
  const scope = new ScopeHandle(httpTransport(config.service), target.scope, opened.session.reader());
  const custody = new Custody(custodyStore(join(home, "private", "lending-publisher")), now);
  do {
    if (opened.session.endedBy(now())) throw new Error("session-ended");
    const result = await publish({ scope, target, service: config.service, member, signer, repository, git, custody });
    process.stdout.write(JSON.stringify({ package: PACKAGE, ...result }) + "\n");
    if (result.status === "stopped" || !watch) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 2_000));
  } while (watch);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(() => { process.stderr.write("Publisher stopped. Check its explicit arguments, member home and whole read access.\n"); process.exitCode = 1; });
}

# Configure a Git host

dap keeps each room's repository at a Git host, or at no host. The scope
Worker supports three choices: Cloudflare Artifacts, GitHub, and no host.
Each section below lists what the host needs, what it does, and the remote
that a person sees.

## How a register chooses its host

The operator names the host when installing the register:

```
dap install --plan <base-url> --host artifacts --namespace <namespace>
dap install --plan <base-url> --host github.com --namespace <organization>
dap install --plan <base-url> --host none
```

The register records `host` and `namespace` and never changes them. Every
repository that the register creates for a room is at that host and in
that namespace. The directory and the destination copy the same record,
`{ host, namespace, name, id }`.

The Worker builds one outside port for each host that it is configured
for. It sends each host operation to the port of the host that the scope's
own journal records. A deployment can serve Artifacts and GitHub at once. A
register on `none`, or on a host that the Worker has no configuration for,
gets no outside port. Its operations stay recorded and unsent.

`REGISTER_SCOPE` pins the one register that the Worker accepts for new
installs. Each host port also checks its own authority: its setting names
the same register scope ID. Only that register, and the destinations born
of its rooms, can use the host. Another register on the same host and
namespace gets nothing. [The order](deploy.md#the-order) shows when to set
each value.

## No host (host `none`)

`--host none` takes no namespace. The CLI plans the register under the
unpublished cohort, `platform:register@21`, and a deployed Worker refuses a
`none` install under any other register definition. The room publishes no
repository and keeps no journal archive. Its entries stay in the service,
within the service's bounds, so the operator must back up the service.
The register needs `REGISTER_SCOPE` and no host setting.
[Run the local Worker](celld.md) uses this host.

## Cloudflare Artifacts (host `artifacts`)

The Worker reaches Artifacts through its binding and needs no outside
credential. The namespace belongs to each deployment. For example,
[`wrangler.demo.jsonc`](../apps/room/wrangler.demo.jsonc) uses `dap-demo`
and [`wrangler.lending.jsonc`](../apps/room/wrangler.lending.jsonc) uses
`dap-lending`.

What it needs:

- The binding `ARTIFACTS` in the Worker's configuration, with the
  deployment's namespace.
- The variable `ARTIFACTS_NAMESPACE`, set to the same namespace. If it is
  absent, the Worker uses `artroom-demo`, the project's first namespace.
- The variable `ARTIFACTS_CONFIG`. It is nonsecret JSON with exactly these
  fields:

  | Field | Value |
  |---|---|
  | `registerScope` | The register's scope ID, from `dap install --plan`. It must equal `REGISTER_SCOPE`. |
  | `namespace` | The binding's namespace. |
  | `host` | The service's hostname, as it appears in its remote URLs. |
  | `maxBytes` | The most bytes one Git transfer may hold, at least 32. |
  | `credentialIdentity` | `adapter-attempt`. |

  A missing, malformed or extra field turns the port off. If the
  namespace differs from `ARTIFACTS_NAMESPACE` or from the binding's
  namespace, the port turns off before any service call. When
  `REGISTER_SCOPE` is absent, the Worker reads the pin from
  `registerScope`, as older deployments do.

What it does:

- **Creation.** One create for the room's own repository name, which is
  `repositoryName(seed, attempt)`. The service answers with one write
  token, and the port revokes that token at once. If the revocation is not
  confirmed, the result names the token by a local handle,
  `creation:<name>`, and the register owes a `revoke-credential`
  operation. The register keeps the token's plaintext in private storage
  until the revocation is confirmed. The plaintext never enters a
  journal. The port reports a cleanup handle only when it holds that exact
  plaintext durably. Deleting the plaintext does not show that the
  provider revoked the token. Only a confirmed revocation shows that. If
  custody and the immediate revocation both fail, the result is unknown.
  The reported remote must match the configured host, namespace and name
  before the port confirms any creation metadata.
- **Refusals.** A taken name is a refusal with `nameExists: true`. Other
  errors that the service states changed nothing are refusals with
  `nameExists: false`. Any other failure is no answer. The result stays
  unknown, and the register's rules decide whether another attempt
  follows. The port sends no request twice.
- **Deletion.** One delete, by the exact name that the creation answered.
  The repository's ID is its name.
- **Writes.** A destination requests one write token for each write, with
  a 900-second TTL, and records its expiry as the service reports it. The
  push goes through the same receive-pack client and checks as GitHub's.
- **Reads.** Each read requests a read token with a 120-second TTL and
  revokes it after the read. A published site's reads reuse a shared token
  instead, as [Pages](pages.md) describes. A token reply must state the requested scope
  and a valid ISO expiry. The port infers no expiry from the TTL. A failed
  revocation stays unconfirmed, and the expiry is the service's own
  statement. Before it reads, the port checks that the service reports the
  expected remote URL for the name.

What a person sees as the remote:

```
https://<host>/git/<namespace>/<name>.git
```

`<host>` is the setting's `host`. `<name>` is the repository's name. The
register's `create-repository` result entry, the directory's genesis and
the destination's branch item each record it as `{ host: "artifacts",
namespace, name, id }`. `dap show <scope>:<seq>` prints an entry's effects
when the reader may read that entry. The name is 52 lowercase base32
letters, a hyphen, and the attempt number. The attempt number is 1 unless
an earlier attempt failed.

The repository is private, so a clone needs a read token. `dap clone`
gets one for the member who runs it (see
[How a member reads the repository](#how-a-member-reads-the-repository)).

## GitHub (host `github.com`)

What it needs:

- The variable `GITHUB_APP_CONFIG`, described below.
- The App's private key, `GITHUB_APP_PRIVATE_KEY`, as PKCS #8 PEM
  (`BEGIN PRIVATE KEY`). GitHub gives a PKCS #1 key
  (`BEGIN RSA PRIVATE KEY`). Convert it, with no passphrase. The Worker
  uses it to mint short-lived tokens that let a destination push.
- `GITHUB_CREATION_TOKEN`, which creates repositories. See
  [The creation credential](deploy.md#the-creation-credential). Without
  it, a room's repository creation is recorded and waits.
- `GITHUB_READ_TOKEN`, which reads private repositories. It is not needed
  when `publicReads` is true.
- Optionally `GITHUB_CLEANUP_TOKENS`: JSON that maps a repository ID to
  `{ "name", "plaintext", "expiresAt" }`. Each token covers that one
  repository with Administration write. The Worker uses it to delete a
  repository that a creation made but the register did not select.
  Without it, the deletion is recorded and waits.

`GITHUB_APP_CONFIG` has exactly these fields. Without the setting, or with
an invalid one, the Worker sends nothing to GitHub. Attempts are recorded
and wait.

| Field | Meaning |
|---|---|
| `issuer` | The App's client ID: the issuer of the App's signed requests. |
| `installationId` | The number of the App's installation on the account. |
| `account` | `{ "id", "login", "type" }` of that installation's account. `type` is `User` or `Organization`. `login` is where repositories are made. |
| `maxBytes` | The most bytes of Git objects that one push sends or one read takes. At least 32. |
| `registerScope` | The register's scope ID. It must equal `REGISTER_SCOPE`. Only that register's creations are sent. |
| `privateRepositories` | Whether new repositories are private. |
| `publicReads` | Whether the Worker reads repositories with no token. Must be false when `privateRepositories` is true. |
| `credentialIdentity` | Always `"adapter-attempt"`. |

[`packages/scope/src/github-wiring.ts`](../packages/scope/src/github-wiring.ts)
states each field and check.

The remote is `https://github.com/<organization>/<name>.git`.

## How a member reads the repository

On Artifacts or GitHub, a member runs `dap clone`. It signs the
destination's `read-token` act, which any active member may sign, with a
lifetime from 1 to 24 hours. The destination opens one host operation,
`mint-read`:

- On Artifacts, the port mints a read token for the repository through the
  binding, `createToken("read", hours * 3600)`.
- On GitHub, the port mints an installation token restricted to the
  repository's ID with contents read. GitHub fixes its lifetime at one
  hour.

The result records the token by a nonsecret handle and its end, never the
token itself. The token goes to the destination's private custody, as a
write token does. The credential route gives it once to the session of the
key that signed the act, before its end. The command then runs
`git clone` with the token in an `Authorization` header that Git reads
from its environment. `dap remote` prints the repository's remote URL in
the host's form.

## A fork for a hold

Lane profiles that pin `hold@2` on Artifacts give each eligible hold its
own fork of the room repository. Profiles that pin `hold@1` keep their
recorded behavior. Deploying the adapter does not move them to `hold@2`.

- **Fork.** The service authenticates the lane's Directory creation and its
  Register and Destination births before it picks a repository. A caller
  cannot pick another namespace or repository. The fork's name comes from
  the lane incarnation, the hold, the opening and the attempt. A lost
  creation answer stays unknown, and another attempt uses a different
  name.
- **Setup credential.** Each fork attempt has a `hold@2` token record with
  purpose `setup`. A confirmed fork answer opens its revoke operation in
  the same result. Only a confirmed revoke ends the token and clears its
  plaintext. An unknown revoke leaves the token `revoking` and the
  operation open. A refused fork attempt issued no credential and ends its
  setup record. An unknown fork answer leaves the record `minting` until
  that attempt's own answer arrives. The host makes no retry of its own.
- **Workspace credential.** The holder prepares an instance and a
  workspace token with the `hold@2:instance` and `hold@2:token` steps. The
  credential route gives the fork's write credential once to the
  preparing key's current session, while the hold and instance stay
  eligible. The token cannot write the room repository. Ending the hold
  opens the token's revocation, which settles only on the provider's
  confirmed answer.
- **Staging and publication.** Staging reads the fork with a scoped read
  credential and copies a bounded object closure to the room's staged ref
  with an internal write credential. Publication uses the Destination's
  checks and push path. The performer receives no room write credential.
  If the fork is unavailable, dependent mints stay recorded and unsent.
- **Deletion.** The `retire` step deletes a selected fork when its guards
  allow it. A late confirmed answer for a fork that was not selected opens
  deletion for that answer's exact ID and name, and the revoke of its
  setup credential.

This path covers lanes that the native Directory creates. It does not
cover child concern workspaces or GitHub workspaces. It grants no archive
or optional evidence-host permission.

## What is not built

- A command that gives `git fetch` or `git pull` a token in an existing
  clone. Each `dap clone` gets a new token.
- A sweep of read tokens that were minted and never read. Each token ends
  at its end. Its plaintext stays in custody until it is read or the read
  is refused at its end.
- Public repositories on Artifacts.
- Workspace hosting for `hold@1` lanes or for GitHub.
- Automatic fork deletion when a hold ends.
- A sweep for a repository or fork whose creation answer was lost. Its
  result stays unknown, and the next attempt uses a new name. A fork's
  setup-token record stays `minting` until that attempt's own answer
  arrives. Elapsed time, a restart or another fork cannot settle it.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [packages/cli/src/commands.ts](../packages/cli/src/commands.ts), [packages/platform/src/archive-binding-wire.ts](../packages/platform/src/archive-binding-wire.ts), [packages/scope/src/creation-admission.ts](../packages/scope/src/creation-admission.ts), [packages/scope/src/artifacts-wiring.ts](../packages/scope/src/artifacts-wiring.ts), [packages/scope/src/artifacts-host.ts](../packages/scope/src/artifacts-host.ts), [packages/scope/src/github-wiring.ts](../packages/scope/src/github-wiring.ts).

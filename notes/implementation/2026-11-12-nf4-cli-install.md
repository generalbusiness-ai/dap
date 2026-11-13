# The command line installs an application without MCP

NF-4 is request `d2aff067`, head 2 of `feb01e7d`. Rulings `19a509a5` (Q1 to Q4) and `f4f50949` (Q5 to Q7) set its shape. The base is main `2216316e`, which holds the NF-3 landing `7ea170c9`.

Before this head, `dap install <uri>` and `dap application <item>` built an `McpService` and called its `install_application` and `application_installation` tools. That loaded 51 modules under `packages/mcp` into each command. Now the client owns the install request and the installation read. The command line and MCP each call the client and write their own words.

## What moved

**The reader moves to the client (Q1).** `packages/mcp/src/reads.ts` moves to `packages/client/src/reads.ts` with no change in behaviour. Its imports become relative, and the client root exports `Reads`, `ReadSessions` and `ReadPort`. `packages/mcp/src/index.ts` keeps the same three names as aliases from the client, as NF-3 did for custody. The MCP source, two MCP tests and one lanes scope test import the reader from the client. `packages/client/src/web.d.ts` declares `crypto.randomUUID`, which the reader uses to name each session request.

**One new client module (Q6, Q7).** `packages/client/src/install-request.ts` is the source-only subpath `@generalbusiness/dap-client/install`. The client root does not import it. The public-release guards exclude it as they exclude `./node`. It holds the following:

- The mark catalogue that MCP built from `VERSIONS`, `itemsNamed`, `rendered` and `declarationDigest`. `packages/mcp/src/catalogue.ts` imports `declarationDigest` from it, and `packages/mcp/src/description-context.ts` re-exports its `descriptions`.
- `applicationRoom(repository, reader)`, which reads the configured room and checks its native siblings.
- `installApplication(handle, custody, args, options)`, the install request under custody.
- `applicationInstallation(handle, item, { reader })`, the bounded installation read.

**One options type with four parts (Q2, Q3, Q5).** `InstallOptions` has `reader`, `admit`, `send` and `packageBytes`.

- `reader` is the client's `Reads`.
- `admit` is optional. MCP passes its tool policy, so an unadmitted target still gives `unknown-tool`. The command line passes none.
- `send` has the signature of `Custody.send`. MCP passes `#sendAct`, so a person's server still keeps the original at membership and a hosted call still goes through its dispatch. The command line passes `custody.send`.
- `packageBytes(address, limit)` returns the exact package bytes or a typed failure. MCP and the command line each build it from `@generalbusiness/dap-git/application`. The client gains no dependency on `dap-git`. `packages/cli/package.json` gains `@generalbusiness/dap-git`, and `scripts/active-source.test.mjs` gains one allowance for it. The same test lets `packages/client/src/install-request.ts` and its test `packages/client/test/install-request.test.ts` name the platform package, as it lets the other client application files.

**Typed refusals, no words in the client (Q4).** Both client functions return a typed refusal and never throw MCP's `Stop`. `InstallRefusal` names `unconfigured`, `read`, `room-siblings`, `rules-sibling`, `commons-membership`, `key`, `unknown-tool`, `installation`, `trust`, `commons-missing`, `unprepared`, `stopped`, `lost`, `receipt`, `entry-unread`, `entry` and `accepted-unread`. `InstallationRefusal` adds `item`, `installation-read` and `installation-unavailable`. MCP maps each refusal to the same `failed` or `stopCall` finding that it built before. `#invalidate` stays in MCP, after an accepted install.

`InstallHandle.applicationTrust` is read before custody and again inside custody's build. MCP's handle gives it through a getter, so the second check reads the setting as it is then. A changed setting still stops the build before any package fetch.

## The command line

`packages/cli/src/application-install-runtime.ts` no longer imports `@generalbusiness/dap-mcp`. It builds `Custody` over the shared custody store and `Reads`, and calls the client. `packages/cli/src/main.ts` takes the file custody store from `@generalbusiness/dap-client/node`. It loads `mcp.ts` only for `dap mcp`.

These lines do not change:

- The pre-check without a configured room, with exit code 2.
- The line for an unavailable signing key.
- `Install request: <answer> (<reason>). The exact original is retained.` and the archived line.
- The three lines of an accepted install.
- `Application install <item>: <state> (<phase>).`, and the `Reason:` and `Screen:` lines.
- `The application request could not be read or completed. Keep its original request key and arguments.`

Each refusal line changes. Before, the command printed MCP's message and then MCP's next step, two lines written for a model. Now it prints one short line of its own. In the table, `<rules>` is the rules scope, `<scope>` a scope ID, `<reason>` a read refusal, and `KEY` the request key.

| Refusal | Before (two lines: MCP message, then next step) | After (one line) |
|---|---|---|
| `key` | Before signing, the server found field idempotencyKey is missing or invalid; declared: a key you choose and keep. This call sent nothing. / Correct the field and call again with the same idempotencyKey. | The request key must be 1 to 128 bytes of UTF-8. This command signed and sent nothing. |
| `unconfigured` | Before signing, the server could not resolve the target: configure a trusted-application room before installing. This call sent nothing. / Call room for the scopes and lanes of the room; give target as a scope ID or a number. | Configure a trusted-application or declared-application room before installing a package. This command signed and sent nothing. |
| `read` | `<scope>` did not answer the read: forbidden (your key may not read it). / Call room to see your standing; a signed read reads only what your key signed, within its window. | The read of `<scope>` was refused (`<reason>`). This command signed and sent nothing. |
| `room-siblings` | Before signing, the server could not resolve the target: the configured room does not match its exact generic native siblings. This call sent nothing. / Call room for the scopes and lanes of the room; give target as a scope ID or a number. | The configured room does not match its native directory, rules and destination. This command signed and sent nothing. |
| `rules-sibling` | Before signing, the server could not resolve the target: the actual Rules sibling does not support native application installation. This call sent nothing. / Call room for … | The room's rules scope does not support application installs. This command signed and sent nothing. |
| `commons-membership` | Before signing, the server could not resolve the target: the Commons room does not hold its exact Membership sibling. This call sent nothing. / Call room for … | The Commons room does not hold its exact membership. This command signed and sent nothing. |
| `installation` | Before signing, the server found field installation needs an immutable Git URI, expected release, explicit unique roles, bounded genesis values and a full existing owner for a device package; declared: the install_application input. This call sent nothing. / Correct the field and call again with the same idempotencyKey. | The install needs a Git URI at a full commit, the expected release, unique roles, bounded values, and a full owner for a device package. This command signed and sent nothing. |
| `trust` | Before signing, the server could not resolve the target: the expected release and Git host are not in a valid APPLICATION_TRUST setting; this call fetched nothing. This call sent nothing. / Call room for … | APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing. |
| `commons-missing` | Before signing, the host reports commons-missing: this package requires Commons and the room has none. This call submitted nothing. / Choose a room with Commons. This host finding is not a recorded native refusal. | The package requires Commons, and this room has none. This command signed and sent nothing. |
| `unprepared`, SHA-256 | Before signing, the server could not resolve the target: the public HTTPS Git transport does not support SHA-256 repositories. This call sent nothing. / Call room for … | The public HTTPS Git reader does not support SHA-256 repositories. This command signed and sent nothing. |
| `unprepared`, package | Before signing, the server could not resolve the target: package bytes do not match the expected signed release or install bounds. This call sent nothing. / Call room for … | The package bytes do not match the expected signed release or the install bounds. This command signed and sent nothing. |
| `unprepared`, unavailable | Before signing, the server could not resolve the target: the exact Git package could not be prepared. This call sent nothing. / Call room for … | The Git package could not be read. This command signed and sent nothing. |
| `stopped` | This server failed after a request under this key went to `<rules>`, so this call has no answer to show. The envelope is under custody. / Call settle with the same idempotencyKey; do not sign again first. | The command stopped after the request went to `<rules>`. The request is under custody. Repeat the same command to settle it. |
| `lost` | The reply from `<rules>` was lost or malformed; the outcome is unknown. The envelope is under custody. / Call settle with the same idempotencyKey; do not sign again first. | The reply from `<rules>` was lost, so the outcome is unknown. The request is under custody. Repeat the same command to settle it. |
| `receipt` | The scope accepted this request, and the server could not check it: the install acknowledgement does not match the retained native request. / A repeat stops at this check again and sends nothing, so report this message and the idempotencyKey. Do not use a new key, because a new key can make a second entry. | The room's receipt does not match the kept request. Report this, and do not send a new request. Keep the original request key and arguments. |
| `accepted-unread` | The scope accepted this request, and the reply to the read after it was lost or malformed. / Call again with the same idempotencyKey: the kept answer returns, and nothing goes twice. | The room accepted the request, and the reply to the read after it was lost. The request is under custody. Repeat the same command to settle it. |
| `entry-unread` | The scope accepted this request, and the server could not check it: the read of the install receipt's native entry gave no entry. / Call again with the same idempotencyKey: nothing goes twice. If the call stops here again, report this message and the key. Do not use a new key, because a new key can make a second entry. | The room accepted the request, and the read of its entry gave nothing. The request is under custody. Repeat the same command to settle it. |
| `entry` | The scope accepted this request, and the server could not check it: the install receipt's native entry does not hold the exact retained request. / A repeat stops at this check again and sends nothing, so report this message and the idempotencyKey. Do not use a new key, because a new key can make a second entry. | The room's entry does not hold the exact kept request. Report this, and do not send a new request. Keep the original request key and arguments. |
| `item` | Before signing, the server found field item is not a native install item; declared: a nonnegative integer. This call sent nothing. / Correct the field and call again with the same idempotencyKey. | The install item must be a nonnegative integer. |
| `installation-read` | Before signing, the server could not resolve the target: the bounded installation read refused: forbidden. This call sent nothing. / Call room for … | The installation read was refused (`<reason>`). |
| `installation-unavailable` | Before signing, the server could not resolve the target: that installation is unavailable in this exact room. This call sent nothing. / Call room for … | That installation is not in this room. |
| custody `conflicting` | The server's record for key KEY on `<rules>` is conflicting; this call sent nothing. / Use a new idempotencyKey for a new meaning. | This request key holds a different request. Use a new key for a new request. This command signed and sent nothing. |
| custody `full` | The server's record for key KEY on `<rules>` is full; this call sent nothing. / Call settle for the unresolved keys first. | Request custody is full. Settle the open requests first. This command signed and sent nothing. |
| custody `locked` | The server's record for key KEY on `<rules>` is locked; this call sent nothing. Another call under this key holds the record, and its send can be in flight. / Wait a moment and call again with the same idempotencyKey. Do not use a new key until the scope has answered, because a new key can make a second entry. | Another command holds this request key. Wait, then repeat the same command. |
| custody `unkept` | The envelope for key KEY on `<rules>` was sent and the scope answered undefined, and the server could not keep that outcome. The act may have taken effect; the kept envelope stays, and nothing was sent twice. / Call settle with the same idempotencyKey: it reads the scope's settlement of that envelope and keeps it. Do not use a new key. | The request went, and custody could not keep its outcome. It may have taken effect. Keep the original request key and arguments. |
| custody `too-large` | The server's record for key KEY on `<rules>` is too-large; this call sent nothing. / Make the act smaller. | The request is too large for custody. This command signed and sent nothing. |
| custody `unreadable` | The server's record for key KEY on `<rules>` is unreadable; this call sent nothing. This server cannot say whether an earlier send under this key went. / Report it. Do not use a new key until the scope has answered, because a new key can make a second entry. | The custody record of this request key cannot be read. Keep the original request key and arguments. |

"Call room for …" stands for "Call room for the scopes and lanes of the room; give target as a scope ID or a number." `old-cli-lines.script.mts` in the evidence directory rendered each "Before" line with `finding` from `packages/mcp/src/errors.ts` at `7ea170c9`.

MCP added a sentence to a stop before signing when custody held an open request under the same key. The command line keeps that warning in its own words. After a refusal before signing, it reads its custody store with no lock. If an open request under the key has gone, it adds "An earlier request under this key has no known outcome. Repeat the same command to settle it. Do not use a new key." If the store cannot be read, it adds "Request custody cannot be read, so an earlier request under this key may have gone. Do not use a new key."

The command line passes no `admit`, so it never meets `unknown-tool`. Its line for that refusal is "This room does not offer application installs to this key. This command signed and sent nothing."

`docs/cli.md` quotes none of these lines, so it does not change.

## Tests

- `packages/cli/test/install-without-mcp.test.ts` is the witness. It runs the real `bin/dap.js` in its own Node process, with `ARTROOM_HOME` files, a module recorder and a stand-in room and Git host. `dap install` sends one install act and keeps one accepted custody record. `dap application <item>` prints `Application install <item>: pending (fetch).` Neither command loads a module under `packages/mcp`, `@generalbusiness/dap-mcp` or `@modelcontextprotocol`. Each loads `packages/client/src/install-request.ts`. A second case fixes the new `trust` line byte for byte and sees no fetch and no act.
- `packages/mcp/test/install-words.test.ts` fixes what MCP returns, byte for byte, in 21 cases: `key`, `unconfigured`, `room-siblings`, `rules-sibling`, `read`, `trust`, three `unprepared` cases, `unknown-tool`, `lost`, a refused answer, `receipt`, an accepted install, its installation read and its repeat, and four installation-read refusals. `support/install-words-7ea170c9.json` is the output of the same cases at `7ea170c9`, before the move. `node --import tsx` ran `support/install-words.ts` in a checkout of that commit and in this head, and the two outputs are equal. The existing tests in `errors.test.ts`, `commons.test.ts` and `hosted-tools.test.ts` fix the `stopped`, `entry-unread`, `entry`, `commons-missing` and changed-trust words.
- `packages/client/test/install-request.test.ts` fixes `declarationDigest` of each trusted Rules pin to the value MCP computed at `7ea170c9`. Before the move, `node --import tsx` ran `declarationDigest` from `packages/mcp/src/catalogue.ts` in a checkout of `7ea170c9` over the Rules pin of every `mcpApplicationRoomCohort`: `platform:rules@5` to `@10` and `@14`.
- `packages/mcp/test/support/install-room.ts` holds the stand-in room and Git host that the witness and the MCP cases share.

The control is the command at `7ea170c9`: `dap application 0` loaded 526 modules, 51 of them under `packages/mcp`.

## Security seals

The seals come from `sourceSeal` and `namedSourceSeals` in `scripts/security-entry-points.mjs`.

| Owner | Before | After |
|---|---|---|
| `packages/mcp/src/catalogue.ts` | `32f361d456a36b46fc828b030b1cc5969dc2bee1ebe77aa26f8bd7c4c025fec7` | `0ee898b27949f5450f991f70e0fe1fc9f0820e6fb45aa97afe1a04a593a98d24` |
| `packages/mcp/src/description-context.ts` | `d249472e0f84ef0984c884685d85ba287a9bc35f1fce6800874b896eac138a41` | `ef86ba4f8fc9e67f792d10510b9e9c20132b80c3d8915774fede7de714c4be17` |
| `packages/mcp/src/index.ts` | `a47dac62009a93316fbbfc8994abb2e08543bec2824fe8ca7db5e554f47e78f6` | `57b6af93a24656bd5fa79527ddce02ddedb9460b3e84035fb3286219e5e971e4` |
| `packages/mcp/src/inventory.ts` | `dad209ef8960de581efb010769f9307908dddf6aa49214d275303f55b35dab7f` | `a567a96acf07da2d27da9fd25e9267e7f52afe2294fe08b4c5e23373bb33dfc3` |
| `packages/mcp/src/service.ts:$module` | `381909028d0f917fe836b3d05a55f40ef6290a741f0f8dff07ff3dcd7268d58b` | `70866d46d4256c2360558c9533e785e1f11cc459820510ed41694ef0b531200c` |
| `packages/mcp/src/service.ts:McpService` | `e6ed1a95fe57c10d078115df653098b00b6636a39359aa525c47c89786b3cdd4` | `3a997768dc1d0e0e203cf21024c4f4345bbeb1c4830f64fe408129bd3291a788` |
| `packages/mcp/src/service.ts:applicationPackageBytes` | none: a new named owner | `505ea3aede390299e67669f8d600f2b33e6866a7c498858b47c91edf3a5dfc5d` |

`applicationPackageBytes` is MCP's `packageBytes` port: the public HTTPS Git read of the exact package bytes. No moved or new file had a seal before: `packages/client/src/reads.ts`, `packages/client/src/install-request.ts` and `packages/cli/src/application-install-runtime.ts` have none.

## Evidence

The working evidence is in `~/play/artroom-evidence/2026-11-12-nf4-working/`. It holds each compile and test run with its exit code, the digest script and output at `7ea170c9`, the MCP cases at `7ea170c9` and at this head, the rendered old command-line lines, and the module list of the control.

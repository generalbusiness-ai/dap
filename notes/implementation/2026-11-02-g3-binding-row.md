# G3 binding row for the existing witness room

This record names one real, unpublished Destination and the GitHub repository
it may acquire. Child `1e5471b9` follows planner handoff `dab39a02` under
parent `3c6ec378`. The child prepares configuration for exact review.
The planner stages and deploys the binding project after approval and landing.
The parent still owes the binding, agent proposal, owner review and merge,
independent GitHub check, and content-preservation witness.

## Filled configuration

[bindings.json](2026-11-02-g3-binding-row/bindings.json) names Destination18:

```json
{
	"scope": "sc_cctdph4kebiqgylk2lrea55a4yzsk52ovselgkidjjydqvjbksjq",
	"inc": "in_4cc2x4avk2mtipewqqhz2aj7ky",
	"kind": "destination"
}
```

The only repository is `generalbusiness-ai/dap-g3-binding-witness-20261102`,
GitHub ID `1442980126`, branch `main`.
[github-app.json](2026-11-02-g3-binding-row/github-app.json) replaces the
previous template's sole placeholder with installed Register25 scope
`sc_wktzr3u2uv33drdyiqcehcgrro46adjdxl7vyy5iguddbjrlnybq`.
Every other App field matches the landed configuration at `8e9f0942`.
The App installation still covers all 26 repositories, as Hugh chose.
The provider narrows each installation token to the configured repository ID
and requested permission. This map does not narrow the App installation.

## Content before binding

The actual fixed-source CLI at `afdd8ee5` created the room on
`https://inguz.local` with the existing G3 client home and handle `@g3owner`.
It published rules with one approval, `ownerMayReview=false`, and no checks
or labels. Production `firstExtents` supplied the three review extents.
The owner activated `issueDemo` and manifest-list `changeDemo3`, then opened
issue 1 with this text:

> TEST G3 content before repository binding
>
> Keep this issue, its original text, and its native history when this room
> gains its reviewed GitHub repository.

Every CLI process returned 0. The Native reads use a fresh read session,
the existing owner signer, and verified TLS. The read helper permits only
GET requests and session issuance to the exact configured Membership.
It recomputes every journal entry hash and verifies each chain from genesis.
The helper also fetches the detached body through `ScopeHandle.text`.

| Scope | Definition | Before head | Entries |
|---|---|---|---|
| Directory | `platform:directory@24` | 7, `sha256:5ab0d801f9252c74c3d5ff92f94a89d4ca1bb2a05e3249acaf0fb0a693b8efe2` | 8 |
| Destination | `platform:destination@18` | 1, `sha256:77b359dc41658b1e33ea5695ab9721c1bec4bf3392e0cecf379f0b8722ed66e3` | 2 |
| Issue | `issueDemo` | 1, `sha256:9b3c695d71d3eec7e67040ed3db4b8da4f3f0151c6b733fb5f626465a9e89130` | 2 |

The issue's full reference is
`sc_ryr2bq5o3r22hmzvly6gpspl7tpzekmqmiwj52aj4asgvxdo4e4a`,
incarnation `in_clfa53jyc4vbq3tor4qt5u75y4`, kind `lane`.
Its body digest is
`sha256:489e2d124a3e6e49b9f85b1082383212838ca6d34625bfb11be1cfe870c9d23e`.
The Destination remains `unpublished`, with repository, Git head, and token
all null. No binding, installation-token request, Git write, or agent
enrollment occurred in this child.

The first snapshot's formatter overwrote the Destination journal `head`
with its null Git head. Capture `07` retains that fault. Corrected capture
`08` uses `repositoryHead` for the Git value and records the journal head
separately. Both captures verify the same journals and issue text.

## Validation and limits

This head changes only documents under `notes/implementation`. Production
source, tests, package files, dependencies, and deployed configuration stay
unchanged. The documentation follow-up rule in `docs/testing.md` applies.
The final review names this head's tree alongside the earlier checkpoints.

The previous full gate at `2f0e82952a232f11e9969bb26ca70ae24f56aab8`,
tree `99f8fc502d89eb2cefd6f7d5675686059fa022fe`, returned `exit 1`.
It recorded 15 plain timeouts and never reached Native. The separate Native
follow-up at `465ca2740bfd35b9fe1c5e549345e65d21ca76c0`, tree
`92c5126fbaeca5b2cda9eeb048324ca9171572e9`, returned `exit 0` with
1,039 passes and two skips. The landed configuration review `cf407350`
accepted those separate outcomes. This follow-up claims no passing full gate.
[The earlier record](2026-11-02-g3-mini-configuration.md) retains both
diagnostics and their limits.

The focused production-parser checks and sealed evidence index follow in the
final evidence account. They validate these operator inputs. They do not
establish the later deployment, binding, GitHub write, or parent acceptance.

## Sealed evidence

The final evidence account names the frozen checkpoint and manifest.
Raw CLI output stays private because native requests can contain credentials
or signed envelopes. Public evidence contains only selected nonsecret results,
producer source, command metadata, hashes, and exit files.

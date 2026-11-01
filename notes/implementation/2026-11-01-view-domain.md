# Declare no sandbox domain on a view resource by default

Status: source implementation. The gate passed at `4c2fedf3`. No desktop AI app has rendered this code, so no run shows that this removes the failure. No Worker change is needed for the person's session, because the card runs from the local stdio process. The Worker bundle's bytes change at the next hosted head.

Request `ff774ebf9764a37ed218554c056f7fa75ace8f6b` and promise `288bffdcb4f448d4c0ecc5e6df5b802aa47a00cd` own this head. It comes from the J2 acceptance, `2082efd9`, which stays open.

## What happened

At 11:07 EST a person ran the J2 steps. The desktop AI app connected to `dap-views` and showed "There was a problem displaying content from dap-views." in place of the card. The server's log ends at `resources/read`, with a result, and holds no `tools/call`. So that session signed nothing. The app's log from the 17 October prototype `dap-cards` shows the order on a card that rendered: `resources/read`, then `tools/call` 273 ms later. So the app stopped at or after the resource's bytes and before it called the tool.

## The cause, as far as I can show

Every view resource declared `_meta.ui.domain` as `<label>.inguz.space`. Claude's troubleshooting page says the value must be exactly `{hash}.claudemcpcontent.com`, that the app shows an error in place of a bad value, and that a local stdio server has no URL to hash, so "`ui.domain` isn't available for them. Remove the field." The prototypes declare no domain, and they rendered.

Two facts leave this unproven. The page names the errors `Invalid ui.domain format` and `ui.domain mismatch`, and the person saw other words. The app's `main.log`, `mcp.log` and server log name no reason.

## What changed

- **`packages/mcp/src/views/resources.ts`.** A resource declares a domain only when its package declares one. No package does today.
- **`packages/mcp/src/views/hosts.ts`.** `sandboxDomain` takes only a declared label. It no longer derives one from the presentation digest.
- **`packages/mcp/test/view-resources.test.ts`.** The new test holds a package with no domain and the four shipped resources: none carries the field, in the listing or in a read. The older test keeps the declared case.
- **`notes/2026-10-17-compact-cards-design.md`.** The note now says that `inguz.space` origins serve a dap web host, and it points here.

`ViewResources.generation` keeps its value, because it already hashed `domain: null` for these packages.

## What a hosted view needs for this app

A hosted view works with no domain, and it takes the app's default sandbox origin. It declares a domain only if the card needs a stable origin, for example to run its own OAuth flow. Then the value is `{hash}.claudemcpcontent.com`, where `{hash}` is the first 32 hexadecimal characters of the SHA-256 digest of the full connector URL as the person configured it, so a trailing slash changes the hash. The present label form cannot express that value, so that head changes `PresentationPackage.domain` too. I built nothing for this.

## If the card still fails

These differences from `~/play/dap-views-prototype/cards-server.mjs` remain, by reading both and from the resources as served. Each is the next thing to try, in this order.

| Difference | `dap-views` | `dap-cards`, which rendered |
|---|---|---|
| The read's `_meta.ui` | `csp: {}`, `permissions: {}`, `prefersBorder: true` | `prefersBorder: true` |
| The listing's `_meta` | `ui` as above, and a `description` | none, and a `title` |
| The tool's `_meta` | `ui.resourceUri`, `ui.visibility` | also the older key `ui/resourceUri` |
| Tool annotations | `readOnlyHint` | `readOnlyHint`, `openWorldHint: false` |
| Resource size | 45,038 bytes | 176,829 bytes, so the 1 MiB bound is not the difference |
| Content-Security-Policy in the HTML | none | none |

The next person's steps also open the app's developer tools, which name the error in the card's frame. Claude's page says: **Help > Troubleshooting > Enable Developer Mode**, then `Cmd+Option+I`.

## Evidence

The head is `4c2fedf3dc40178e64775f1b755ac6cbef92fbd2`, tree `80e52ab2`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-view-domain/`, `SHA256SUMS` `feebd81b8fa788290029f619d17b77857c3b63e480750a4e9c4bcc8aba98ca76`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3535 plain and 1013 native tests, 116 Node and 56 Counting | `6f25b9fbc171eb16` |
| Red | observed run with `scripts/control.mjs`: restoring a default domain | `controls/default-domain.log` holds the output | exit 0: "a resource carries no sandbox domain by default" fails by an assertion | `069577d39cc35e1f` |
| Second control | observed run: the metadata always names a domain | `controls/metadata-always.log` holds the output | exit 0: the same test fails by an assertion | `267f7c32113539ea` |
| Browser script | observed run at this source, by the planner's rule in `a9e57c01`. A loopback host stands in for the app | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0: 24 of 24 cases, no errors | `2cf634f1a196a21e` |
| The app's server log | read from the app's log: method names only | `app-log/dap-views-2026-11-01.txt` | ends at `resources/read`, with a result and no `tools/call` | `af6c5adf7e87e593` |
| A card that rendered | read from the app's log of 18 October | `app-log/dap-cards-read-then-call.txt` | `resources/read`, then `tools/call` 273 ms later | `9acc181aca6b285b` |

The gate ran at `4c2fedf3`. This head then merged main at `7207db06`. That merge touches no file of this head, so the gate was not run again. `view-resources.test.ts` and the seals ran after the merge.

## Open limits

- **Whether this is the cause.** The next person's session decides. The planner owns asking for that session, and the builder owns the steps.
- **S2's desktop acceptance.** No card from the landed view kit has rendered in this app. The planner treats that acceptance as open.
- **The app's other two unknowns.** Whether it takes the answer's size, and whether it passes `structuredContent`, stay unknown until a card renders. The J2 acceptance owns them.

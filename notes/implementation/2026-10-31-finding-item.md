# Finding item in the change lane, with a merge guard

Status: source implementation. The gate passed at `c83c21cc`. No Worker serves this definition, and no room runs it.

Request `d711f37df741b80997448110a6ffda36f73871f6` and promise `e18ad8a927a60acf684c7a85188688271501b078` own this head.

## What changed

A check source can now record what it found in a change, and a required source's open finding stops the merge until someone answers it.

- **Definition.** `apps/room/lanes/src/change-finding.ts` is a successor of `changeJ4`. It adds one item type, `finding`, four acts and one guard on `merge`. Every other row stays. Its pinned bytes are `definitions/change-finding.json`, with the digest in `src/digests-finding.ts`.
- **Finding.** A finding holds a file, a line range, a class, a severity, a confidence, a failure scenario, a source, a source version, a tree and the version it describes. Its states are `open`, `resolved` and `irrelevant`.
- **Sources.** A source is a row of the rules' `checks`. The row's `name` is the source's name, its `checker` is the one member who files for it, and `required: true` makes it a required source. No platform definition changes.
- **Across versions.** A finding binds to one version and carries across later versions until someone answers it. A source cannot file the same finding again while it is open or irrelevant. Sameness means the same source, file, start, end and class. A resolved finding that a source finds again is a new finding.
- **Merge guard.** `merge` refuses with `finding-open` while a required source has an open finding on any version of the change.
- **Reference.** `docs/lanes-reference.md` and `apps/room/lanes/README.md` describe the definition. `scripts/pin.mjs` and `scripts/reference.mjs` generate it.

## Decisions

- **Who answers.** The source that filed a finding may resolve it, with `resolve-finding-own`, because a source withdraws only its own input. A holder of `change.dismiss` may resolve it or mark it irrelevant, because that grant already sets review input aside in `dismiss-review`. A source cannot mark its own finding irrelevant, because that is a judgment about the source. The change's opener and the version's authors cannot answer even with the grant, so an author cannot clear a finding on their own work. These all use existing guard forms.
- **Not an approval.** A finding adds no `review` item, so no approval counts it, and `reserve` does not carry it.
- **Merges in progress.** No act on a finding waits for a merge in progress. A late finding holds the next merge if this one is refused. The guard stands in the lane alone, so changing that would touch shared rows.
- **Views.** I recommend showing open findings in `needs_you` and in the Change view, for the planner to file separately. This definition adds no attention form. A room on this successor loses S6's Change card with `change-profile-unsupported`, and S4 views report it as an unsupported profile. I inferred both from the code and ran neither. A room that uses findings needs those views to accept this profile first.

## Evidence

The checkpoint is `c83c21cc97ab75230fa497b30bff769b2cf080ac`, tree `8185b3b213998d43354f37ee7f5d26096c9ff227`. Raw evidence is in `~/play/artroom-evidence/2026-10-31-finding-item/`, `SHA256SUMS` `83041f537f93fd4680a5d2eeee9337874833a01db4f0062955c64a5cf78af54d`. The reviewed head adds only this note and its manifest, so the source and tests are the tree above.

The request's seven assertions are in `apps/room/lanes/test/finding.scope.test.ts`, and each has a control that removes what the assertion depends on. Controls C1 to C14 ran at `d2ddf228`, before main merged. The merge after them replaced the scenario's copy of the workspace stand-in with the shared one, and changed nothing in the definition. All fourteen distinguished.

| Done-when assertion | Control |
|---|---|
| An open finding from a required source refuses merge | C1 |
| Resolving it allows merge | C2 |
| Irrelevant allows merge | C3 |
| An open finding from a source that is not required does not refuse | C4 |
| A finding from another change refuses as `not-this-change` | C5 |
| A new version keeps the finding open | C6 |
| An unauthorized member cannot resolve it | C7 |

C8 covers the repeat refusal, C10 `not-the-source`, C11 `not-this-version`, C12 the opener, C13 the version author, and C14 another source's `resolve-finding-own`. C9 shows that the merge still needs a review when a finding is present, which is weaker than the claim that no finding ever counts as an approval. The design carries that claim: a finding adds no `review` item.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `953eb6d3557c9346` |
| Finding scenario, focused, at `d2ddf228` | `vitest --config vitest.scope.config.ts test/finding.scope.test.ts` | 0 | `6be43871a44ad9e6` |
| Pinned definition, focused, at `d2ddf228` | plain definitions project | 0 | `de1af6b12cf2a0c7` |
| J4 workspace scope, focused, at `d2ddf228` | scope project | 0 | `35d723f20631fb57` |
| Controls C1 to C7 at `d2ddf228` | `node scripts/control.mjs` | 0 each | `9c275e165f14eda9` `be88b813196ef7b7` `1412dfbe4bc6f138` `ca5389b85a6ddb83` `79692b14079e4b44` `271ae5f50efc03a5` `214eddb1a4933093` |
| Controls C8 to C14 at `d2ddf228` | `node scripts/control.mjs` | 0 each | `64cf0de2aeb43112` `98a52ee188606b32` `071b36de5a6afc89` `36a87bceeaac31a7` `873c6da122c24fad` `76b07020c13350a8` `399ef047a9d4b386` |

The gate reports 3218 plain and 899 native tests, 98 Node and 56 Counting.

## Open limits

Request `d711f37d` owns these limits until the planner files a successor.

- **Line drift.** A finding's range belongs to the version it names. A later version can move those lines, and the finding does not follow them.
- **Ranges.** The definition cannot compare two numbers, so nothing refuses `end` before `start`. A reader must treat such a finding as malformed.
- **One-file versions.** A one-file version states no tree, so it takes no finding.
- **Authors.** The author check reaches only the finding's own version, so an author of a later version can answer with the grant.
- **Cap.** At most 256 findings wait for an answer on one change, shared across sources. I inferred that sharing from the item's `max`, and no test reaches the cap.
- **Rules change.** Rules that drop a source free the merge, because the guard reads the current rules.
- **Guard reach.** The guard stands in the lane alone, and no platform check repeats it.
- **Not controlled.** No control covers `file-finding` on a draft or a merged change.
- **Live.** No Worker, room or real source has run this.

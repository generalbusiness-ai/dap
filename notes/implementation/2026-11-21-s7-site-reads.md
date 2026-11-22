# Site reads within bounded work

GitHub Site uses isolated Git object reads. The source asks for one object with shallow and filter capabilities, rather than fetching a commit's closure. Artifacts Site retains closure reads: the hosted protocol-0 advertisement lacked shallow or filter, and a hosted protocol-2 probe refused tree:0, as recorded in [the archive parent protocol note](2026-10-23-archive-parent-protocol.md) and [the sprint report](../reports/2026-10-23-sprint-report.md). Those observations do not establish current provider behavior. The wire bound remains the smaller of the configured maximum and 16 MiB. The isolated source reserves 18 times that bound for its owned payload allowance. GitHub isolated reads refuse hosts that do not advertise the required capabilities. Artifacts closure reads retain the 4,096-object limit. A page exceeding its byte bound keeps the 413 response; other Git refusals keep their existing handling.

GitHub Site keeps at most 128 successful repository identity observations per isolate for 30 seconds. A digest of the complete configuration, repository and read credential identifies an observation; the transport function must also match. A configuration, credential, repository or transport change requires another lookup. The digest key holds no raw credential. Failures are not cached. At capacity, a new success evicts the oldest entry. Concurrent misses can each call GitHub. A repository replacement can remain undetected until the observation expires.

The existing Site token owner checks a held key before its 256-key admission limit. Its witness fills the table, rejects a new key, and serves the held key without a new mint. The separate limits of 32 reserved mints, eight waiters per flight and 64 total waiters remain in force. No token-owner code changed.

The local Git witness builds 4,098 commits through Git fast-import and reads the selected commit, tree and blob through Git's HTTP backend. Full closure mode refuses the 4,096-object limit; isolated mode reads the selected objects. A separate room-lanes Node witness sends an anonymous request through the production Site handler and GitHub reader to the local Git HTTP backend, and asserts 200 and the rendered content. Its admission and native publication selection are stand-ins, as is the GitHub identity answer. The token witness uses its real SQLite owner with a scripted provider.

## Focused evidence

The files below are in `~/play/artroom-evidence/2026-11-21-s7-on-lv4-focused/`. The commands ran from the S7 checkout after `node scripts/cloudflare-pool-compat.mjs`. The original focused evidence keeps its original source cut; copies are also under `~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/2026-11-21-s7-on-lv4-focused/`.

| File | SHA-256 | Result |
|---|---|---|
| `artroom-s7-provider-boundary-20261121.log` | `348ae26b675d6f70f10f6c26f3e68c4a2bce9a9f07ec6a94e8f5c5bd0c445562` | Default dispatch and Artifacts compatibility: 2 passed |
| `artroom-s7-github-history-final-20261121.log` | `e7a2264ceb75cb87eb021340b76cc1ce63c0de72f5b147661f690b1e616b6839` | GitHub Site and local Git: 1 passed |
| `artroom-s7-artifacts-control-20261121.log` | `1e92a82a982294b968f79b8a72c8f0d0398becf77884385e9a5ad3292e7248a3` | Artifacts closure-mode control distinguishes |
| `artroom-s7-provider-owner-20261121.log` | `a67ff707e664dbce07ce2f30f864ef31a763393e5ec75e2d9ebec8cbbc014c86` | Security owner inventory: 1 passed |
| `artroom-s7-provider-typecheck-20261121.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | Scope typecheck passed |
| `artroom-s7-site-focused-20261121.log` | `a63d8ac8388e738e4e62d186e6fc3af61f5f7d1a42306d776cdb35af0a6e0f68` | Host and immutable publication: 6 passed |
| `artroom-s7-route-publication-20261121.log` | `9557085160237a222f1f3e54f6b3894d9cfab6ba5a6ef4e57d6b081e710b5be5` | Route and selected publication: 22 passed |
| `artroom-s7-git-history-20261121.log` | `f5341be41ede8bcb80275cf46769b29d23c82d97ecd579c74ed3ed93535a4344` | Local Git history: 1 passed |
| `artroom-s7-lanes-witness-20261121.log` | `6c97e255619382b1082d0e5633e44358017d74293e3ac532ac4fc8ad370f5f68` | Site and local Git: 1 passed |
| `artroom-s7-lanes-control-20261121.log` | `f2c5e279a95bae9888f0d52b62ce76e1d391a3e651ec1255303ab8c3f543d230` | Site shallow-mode control distinguishes |
| `artroom-s7-active-source-20261121.log` | `168055c830beb18315aa3ec1c5f3ed92858c88e0aabbaeccd12aba3b98957689` | Active-source inventory: 12 passed |
| `artroom-s7-lanes-typecheck-20261121.log` | `b91d29384f35cb1d0b20da37e74ed8bda5d069d9bbf6ede67718ff209e87c945` | Room lanes typecheck passed |
| `artroom-s7-token-20261121.log` | `e1f9bd2d3ec2a58de8fa7b730a82398de5d8301a6554e7e1cd89a50c6674af6f` | Token owner: 9 passed |
| `artroom-s7-identity-control-20261121.log` | `dea67cd0876365a0669fb6b4e8eaef47ce58401f3e2d7e8c810cbcf0c0bfe536` | Cache-hit control distinguishes |
| `artroom-s7-shallow-control-20261121.log` | `19c009ac9f97c2494ce4eda2d7d9b0a61d200f9f91d0723dfc8e7379d6c59f99` | Earlier shared-transport shallow-mode control |
| `artroom-s7-security-20261121.log` | `a1524626b6ffba9569f9e60679eeb8ee327938af82e03b695fa053327584b386` | Security entry-point inventory: 13 passed |
| `artroom-s7-typecheck-20261121.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | Scope typecheck passed |

The evidence directory also records the commands. The security inventory updates only the two changed Site owner seals.

The five focused repair commands and exact checkout are in
`2026-11-21-s7-fixture-repair-on-security/s7-repair-commands-20261121.txt`
under the follow-up evidence directory, SHA-256
`e83bd880b9cdb9f4c3f72ad34879782dfef289cf40e5fbdafa7bf89b64e64c02`.
Each ran with one worker and exited 0:

| Focused file and selection | Result | Log SHA-256 |
|---|---|---|
| `packages/scope/test/hosts-pack-cache.test.ts` | 1 passed | `3eedf646c4681faf4710efda35da59944034a41d0befdfbb95938c51dc0ea009` |
| `apps/room/lanes/test/demo.scope.test.ts`, GitHub | 1 passed | `5d7166de368f1534e5943b177c33899445f198f33edeae588f86f7647c58b390` |
| `apps/room/lanes/test/edit.scope.test.ts`, GitHub | 1 passed | `32047b10299a019461081ae437a0ffdb489dfd818dc2722193dc2adaacf819c9` |
| `apps/room/lanes/test/site-history.test.ts` | 1 passed | `f6020d500329a57de4b94f2303c4129a98d65841c12ab640843a40a11d4f1098` |
| `apps/room/lanes/test/demo-scale.scope.test.ts`, GitHub | 1 passed | `d0e237c204b37e7b5b0c7e58fe6e69873d5869ad1969d94d8b657feee27d9467` |

The exact commands ran from the repair worktree:

```sh
./node_modules/.bin/vitest run --project scope packages/scope/test/hosts-pack-cache.test.ts --maxWorkers 1
./node_modules/.bin/vitest run --project scope-stories apps/room/lanes/test/demo.scope.test.ts -t 'on github.com' --maxWorkers 1
./node_modules/.bin/vitest run --project scope-stories apps/room/lanes/test/edit.scope.test.ts -t 'on GitHub' --maxWorkers 1
./node_modules/.bin/vitest run --project lanes apps/room/lanes/test/site-history.test.ts --maxWorkers 1
./node_modules/.bin/vitest run --project scope-scale apps/room/lanes/test/demo-scale.scope.test.ts -t 'on github.com: the optional manifest sequence' --maxWorkers 1
```

The demo, edit and cache cases use scripted hosts. The cache control's
headerless synthetic request checks its original snapshot timing. The
separate Site history case uses local Git's HTTP backend for a synthetic
4,098-commit repository; its identity and admission are stand-ins. None
proves current GitHub or Artifacts behavior.

## Security group gate and retry

The Security gate at `6228f2ecabc9f3ab03492952cf598876f03e3a2b`, tree
`5933cacc7f69450e8d083ed6ca630029fc6348ed`, exited 1 in 1,529.92 seconds.
Node passed 246 cases, Counting passed 60, Plain passed 5,087 with one
skipped, and Native passed 1,251 with four failures and two skipped. The
selection included 16 moved-scale cases in nine owners: 15 passed and one
failed. Native timeout crossings were zero lost, five stale and zero
unowned. The failed gate log is
`~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/failed-gates/native-first/gate.txt`, SHA-256
`cdee0f6dc091aef12faa2a60979189ee486c37e6834824cdf2d636cd1223320f`.
The exit and time files remain beside it.

The test-only fixture repair `94518da216afe62d8306916e2072d75a70465826`,
tree `7a90edf19929573f59692ceea06b9912930c749c`, changes only the shared
Git host fixture. Two subsequent full gates at this head failed in the
plain stage: the first exited 1 after 485.57 seconds, with 5,086 plain
cases passed, one failed and one skipped. Its log is
`failed-gates/cli-timeout/gate.txt`, SHA-256
`e6a0ae0736ea2f84851577ae88e2a892067f3f97c12010e72919b05d1d3617f5`.
The quiet rerun on `origin/main` `95ec0456` exited 1 after 446.21 seconds.
Node passed 246 and Counting passed 60; Plain passed 5,086 with one
timeout and one skipped. Its log is
`failed-gates/2026-11-21-security-quiet-rerun-gate/gate.txt`, SHA-256
`64f2c46fdf9bf2c695d7ddce2a150f0b300976aae163106b8724f78c39a9ff73`.
Both paths are under
`~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/`. Native
was unreached in both runs. The gate selection named the 16 moved-scale
cases in nine owners; neither run executed them.

The isolated test-file repair `44f2a0b321824fdc9f5f01df7c071769c909c5e7`,
tree `59b1c2d0eabdf88c5541660e03837d99f9732f81`, overlaps the real CLI
check and independent preparation, waits for both, and keeps the original
assertions and deadline. The complete owning file passed two tests; its
CLI test compiler context passed. Exact commands and logs are in
`2026-11-21-security-cli-witness-repair/` under the same evidence directory.
The focused file log has SHA-256
`f7c8f6cfafa91018e9130f4da257144b8c1ed52501e038c30a6f5583ba0c704e`;
the compiler log has SHA-256
`62df2ee0e74f25f29f95806874f679bdcf81470b7027e0a24a68e7eb26779c38`.
The focused test time was 3.78 seconds on the repair and 3.73 seconds
on the previous head. Those isolated runs establish that the file passes
in isolation. Both full-suite timeouts retain their original results.

The Native diagnosis on the repaired source covered the stage that both
Plain failures left unreached and recorded exit 0 in 951.01 seconds wall time. Native passed 1,255 cases with two
skipped across 312 passing files and one skipped file. All 16 moved-scale
cases passed across nine owners. Crossings were zero lost, four stale
and zero unowned. Its retained `native.txt` has SHA-256 `627ff7ff6557128c1b520f9445550d06c5cf18a964c413a52b1aed1e24d497aa`;
`native.time` and `native-crossings.txt` hold the timing and crossing
results. The review considers the follow-up alongside each failed gate.

## Plain-stage comparison

The production Plain stage ran on the previous candidate `94518da2` and
published main `95ec0456`, in that order, with the same Node version,
Vitest executable, dependency lock and 5,000 ms CLI deadline. The builder ran no concurrent tests or builds. Both used incoming power and were charging.
The battery started at 5 percent for the candidate and 11 percent for main.

The candidate exited 1 in 305.20 seconds with 5,083 passing cases, four
CLI timeouts and one skip. The project-creation case took 6,393.325 ms.
The two application example cases and the release reproduction case also
timed out. Main exited 0 in 253.74 seconds with 5,081 passing cases and
one skip. Its project-creation case passed in 4,766.024 ms. The candidate
selected six more cases. The measurements show a 1,627.301 ms difference
for that case across these two runs. They do not identify its cause.

Evidence is in
`~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/2026-11-21-security-plain-comparison/`.
`previous/plain.txt` has SHA-256
`b392c5e689796b81775e08d74319188edf79788b72920ab4140f6c7c1bc056cd`.
`main/plain.txt` has SHA-256
`23da9716158ef6fe12b3faaf128f2c1947adee7b55d01479d684df1062aea2a6`.
Their reporters, exact commands, exits and power readbacks are beside them.

## Deadline stack

A full gate on the overlap repair `44f2a0b3`, tree `59b1c2d0`, exited 1
in 471.21 seconds. Node passed 246 cases and Counting passed 60. Plain
passed 5,086, skipped one and timed out only the project-creation case
at 5,002.401 ms against its 5,000 ms deadline. Native and the 16
moved-scale cases across nine owners remained unreached.
`failed-gates/cli-overlap-repair/gate.txt` has SHA-256
`7c3e4c136f43bb20e4147e22031ae7151086febc0651c501daf88c548dca60a3`.
The Plain reporter and stage ledger are in that directory's `full-test/`.

Commit `0a09f66acdef49a7984956167325749d09eb8e87` puts explicit
30-second deadlines on four CLI integration cases before the Security
commits. The cases run real CLI commands, native scenarios and replay,
or package and browser compilation. The deadline commit preserves the
commands and assertions. Its commit message records all eight measured
case times. The stack carries the earlier overlap repair on top.

The gate checks the composed source `0dae01065f5d5d70edd5ac99ef32383f1be97106`,
tree `a04f7a98bdcef266f98f541f7b3543a17fa1cc16`. The CLI test compiler
passed in 0.86 seconds. All six cases in the three CLI owning files
passed in 16.14 seconds wall time. `cli-focus.log` has SHA-256
`bbd018fbf3556b0c3981bb1860e6ccce51a98ddfbfb2d0071e51309f24e7c310`.
`cli-types.log` is empty on exit 0 and hashes to
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

The full gate exited 0 in 1,407.74 seconds wall time. Node passed 246
cases and Counting passed 60. Plain passed 5,087 cases and skipped one.
Native passed 1,255 cases and skipped two. All 16 moved-scale cases
passed across nine owners. Timeout crossings were zero lost, five stale
and zero unowned. The selector used published `ec11f1b8` as its base.
The tested stack incorporates `02d93554`, which published during the run.

| CLI case | Elapsed ms on the stack |
| --- | ---: |
| New project, replay and bundle | 4304.638 |
| Counter and Lending packages | 3741.436 |
| Grow declarations and room grid | 3159.149 |
| Reviewed release reproduction | 4534.985 |

In `~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/`,
the `npm run gate` output `gate.txt` has SHA-256
`3b5a2c8b91c3501bb7e325268b9845d6c7878f3114721b8057a509dab649a050`.
`full-test/plain.jsonl` hashes to
`5ce581863a441bf16547d36e211b5297ea4192658ad6a7247b73ac9b9ab22793`
and `full-test/native.jsonl` to
`d9c4e7e66639c89b48f9edeae101a4a7f21ccc2d28de3283afac0df8d2a6e6f1`.
The stage ledger, selector and detailed test log are in `full-test/`.
The four prior gate failures and the passing Native diagnosis retain
their original outcomes and logs. The note-only commit carries every
gated source and test byte verbatim.

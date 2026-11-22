# Refuse expired hosted controls before Agent reads

An expired, validly signed grant, connection control, bearer rotation, or
retirement now refuses before the Agent reads its row. Each route keeps its
normal binding and authority checks for current requests, and checks the
deadline again after authority reads. A missing Agent remains a 404 for a
current request.

Each operation reserves 4 KiB of the Agent's durable control budget before
it starts. The reservation covers its row and answer; an answer that exceeds
it costs more. Every distinct operation can add one durable control row.
Answer expiry removes the answer bytes, but the row and its remaining charge
stay. The row fences a freshly signed retry with the same operation ID: the
fingerprint excludes the signature and deadline, so a later deadline alone
cannot make that ID new. Pending reservations stay too. Deleting those rows
would change the at-most-once contract.

The Agent has a 16 MiB aggregate control budget, with the final 1 MiB reserved
for retirement. Answer expiry does not bound the number of durable rows over
the Agent's lifetime. Controller shares and safe release of retained row
charges remain open; this change does not alter either policy or the reserve.

The local SQLite witness signs each of the five operations, checks the exact
deadline, and counts Agent-row reads. It also checks that a current request
still reaches the missing-row 404. Its clock and outside authority are test
stand-ins; it makes no host or provider request.

## Focused O2 carry

At `1a8bdf45db7afb187396a1d995112164f42b727e`, the five selected
expired-control cases passed and three unrelated cases were skipped. The
Node SQLite witness uses a test clock and scripted outside authority; it
does not exercise Workerd or a provider. The command record and outputs are
in `~/play/artroom-evidence/2026-11-21-security-fixture-retry-gate/2026-11-21-s10-on-o2-focused/`.
The controls log SHA-256 is
`d70a5792b4c520df961fcc3e336cc82865fa51b4ba4cfb774266821df83a1b84`;
MCP typecheck and security inventory also passed.

## Security group gate and retry

The Security gate at `6228f2ecabc9f3ab03492952cf598876f03e3a2b`, tree
`5933cacc7f69450e8d083ed6ca630029fc6348ed`, exited 1 in 1,529.92 seconds.
Node passed 246 cases, Counting passed 60, Plain passed 5,087 with one
skipped, and Native passed 1,251 with four failures and two skipped. The
selection included 16 moved-scale cases in nine owners: 15 passed and one
failed. Native timeout crossings were zero lost, five stale and zero
unowned. The log and elapsed time are in the evidence directory below.

The test-only repair `94518da216afe62d8306916e2072d75a70465826`, tree
`7a90edf19929573f59692ceea06b9912930c749c`, changes the shared Git
host fixture. Two full retries at that head failed in Plain, before Native.
The first exited 1 in 485.57 seconds, with 5,086 Plain passes, one timeout
and one skip. The quiet retry against `origin/main` `95ec0456` exited 1 in
446.21 seconds with the same Plain counts. Node passed 246 and Counting
passed 60 in each. Both timed out in `application-new.test.ts` at its 5,000 ms deadline.
Native and the 16 moved-scale cases across nine owners remained unreached.

The three failed raw logs are retained under
`~/play/artroom-evidence/2026-11-21-security-deadline-stack-gate/failed-gates/`.
`native-first/gate.txt` has SHA-256
`cdee0f6dc091aef12faa2a60979189ee486c37e6834824cdf2d636cd1223320f`;
`cli-timeout/gate.txt` has
`e6a0ae0736ea2f84851577ae88e2a892067f3f97c12010e72919b05d1d3617f5`;
`2026-11-21-security-quiet-rerun-gate/gate.txt` has
`64f2c46fdf9bf2c695d7ddce2a150f0b300976aae163106b8724f78c39a9ff73`.
Each directory also keeps the exit and time files.

The proposed review source `44f2a0b321824fdc9f5f01df7c071769c909c5e7`,
tree `59b1c2d0eabdf88c5541660e03837d99f9732f81`, changes only the CLI
witness. Its owning file passed two cases in 5.94 seconds of command wall
time, and its test compiler passed in 0.82 seconds. Under the evidence
directory's `2026-11-21-security-cli-witness-repair/`, the owner log
`security-cli-witness-file-20261121.log` has SHA-256
`f7c8f6cfafa91018e9130f4da257144b8c1ed52501e038c30a6f5583ba0c704e`,
the compiler log `security-cli-witness-types-20261121.log` has
`62df2ee0e74f25f29f95806874f679bdcf81470b7027e0a24a68e7eb26779c38`,
and the exact command record has
`1fbefd4cbd8be9981ef520556027cbbc834522d205d0da7f9a291e45cd279a1a`.

The separate Native diagnosis on the proposed source recorded
exit 0 in 951.01 seconds wall time. Native passed 1,255 cases with two
skipped across 312 passing files and one skipped file. All 16 moved-scale
cases passed across nine owners. Crossings were zero lost, four stale
and zero unowned. Its raw
`native.txt` has SHA-256 `627ff7ff6557128c1b520f9445550d06c5cf18a964c413a52b1aed1e24d497aa`; `native.time` and
`native-crossings.txt` are beside it. This follow-up does not turn any of
the three failed full gates into a pass.

The [Site implementation note](2026-11-21-s7-site-reads.md#plain-stage-comparison) records both isolated Plain runs.

The [Site implementation note](2026-11-21-s7-site-reads.md#deadline-stack)
records the deadline commit and exact stacked gate.

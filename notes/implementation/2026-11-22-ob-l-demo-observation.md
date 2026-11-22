# Demo and Grow observability windows

OB-L request `b3d586a9` authorized one read-only Demo observation. Ruling
`023b7d7b` approved the scratch adapter and the checked-in evaluator's query
and response bounds. The observation used published source
`42d35b88884cc99e9dae179495e584e4701d8a9d`.

The public health response identified deployment `dap-demo` and Worker version
`9c2c2413-8fc1-4b90-bc2e-ba97461b8a8b`. The adapter queried the 15-minute
window from 09:52:35 through 10:07:35 UTC on 22 November 2026. The launcher
exited 0 after 1.753 seconds and recorded the observation.

The evaluator found zero weighted routes, turns, and errors. It reported a
null error rate and route p95. Coverage was `unknown` because the query returned
no observations. The result reported `calibration`, `no-data`, and `coverage`
findings. It supplied no latency bound and did not establish a calibrated pass
or the absence of busy turns.

## Grow observation

Ruling `9213f9a2` authorized one Grow observation. Act `1229ed1a`
records its result. The Worker was `dap-grow`, and health identified
deployment `dap-grow-v1` and version
`25e3ae1a-01e3-428d-97a1-4d15777e6dc8`. The adapter queried the 15-minute
window from 10:05:50 through 10:20:50 UTC on 22 November 2026. The launcher
exited 0 after 1.511 seconds.

The evaluator counted 149 weighted routes and 71 turns. It observed zero
errors and an error rate of 0. The weighted route p95 was 864 ms in this one
15-minute Grow window. Ruling `9647a0f4a68b61b10a0466dbd9df15307236fb14`
sets the Grow-only bound at 1,800 ms, about twice the observation. Tighten the
bound after three more deploy windows. The evaluator measured this window
without a prior bound. Sampling left coverage `unknown` and deployment
acceptance open.

## Evidence

The credential-free files remain in
`~/play/artroom-evidence/2026-11-22-ob-l-demo-observation/`.
The table records SHA-256 digests of the exact files.

| File | SHA-256 | What it records |
|---|---|---|
| `observe-demo.mjs` | `7d121ec54abb00ebac5f86898e018416f892b028da3254d2b8bffa9acf7b328f` | The bounded, observation-only adapter. |
| `run-observation.mjs` | `cedfa12ce226b459b748c56f0b8d178ad62893a95f335b9f28840f281dab3276` | The launcher, source check, and output filter. |
| `invocation.json` | `694be439b048896b7b9c85031faf6e2acdb3085cf77c1988ab2b7ec1a02fbf89` | The source head, start time, elapsed time, and exit. |
| `observation.stdout.json` | `39cea21530251e2810a6b34d8c0c9c5188a875a61a7d5fe7d42844ec1193f996` | The aggregate, window, and evaluator findings. |
| `observation.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | An empty standard error stream. |

The Grow credential-free files remain in
`~/play/artroom-evidence/2026-11-22-ob-l-grow-observation/`.

| File | SHA-256 | What it records |
|---|---|---|
| `observe-grow.mjs` | `f5cabc674b09096e0970abff55b8696ce7c1fd7acb879413475fda9ff060c1f5` | The bounded Grow observation adapter. |
| `run-observation.mjs` | `6d709255b1e6e3abdf40ed3d5d29107da78afc69279065731b985b8c433b79d7` | The launcher, source check, and output filter. |
| `invocation.json` | `c3f43ad512481f4ee1d2bc70eac2178751cf93d88750ee0f213141868fea8dd5` | The source head, start time, elapsed time, and exit. |
| `observation.stdout.json` | `b03272caf523ce387cffeebb32ecddaea253da84dcbb46fc0901f1ac613140f9` | The aggregate, window, and evaluator findings. |
| `observation.stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | An empty standard error stream. |

The adapter imported `scripts/deploy-check-evaluate.mjs` from the published
source. That evaluator's SHA-256 was
`a62950f060926cbc3474469d19da0e4b57cb789550aa4d545554a3e3da437cec`.

The invocation used `node run-observation.mjs <published-checkout>
<fresh-evidence-directory>` with the adapter beside the launcher. The
launcher checked both output streams for the token and authorization header
before writing them.

The earlier Demo-only notes `npm run gate` passed on
`a4d73d40b03629908f2f1825a1dcfe2b684a35c8`, tree
`71d80a4736fb067d65e983c37aa21e4dc2ca27df`. The wrapper measured
32.11 seconds and returned 0. The notes-only selection skipped the test
stages. Gate END `e02b1082` records the result. The log at
`~/play/artroom-evidence/2026-11-22-a4d73d40-ob-l-notes-gate/gate.txt`
has SHA-256 `14de247b01c4609a626a3e78295fde1aac9d347897177b2b19ecd227f6f25b9c`.
That gate covered the earlier Demo-only source. This notes-only head carries
both observations over published E5 `b77be3f9`.

The notes-only `npm run gate` on published E5 passed at
`13adb42e995a769f15a11b33710f0c1c16081f70`, tree
`f788cbb32c9871760c31accb430dfcf6c76872c9`. It exited 0 in 31.51 seconds.
The notes-only selection skipped the test stages. Gate END `6f261691`
records the result. The log at
`~/play/artroom-evidence/2026-11-22-13adb42-ob-l-on-e5-gate/gate.txt`
has SHA-256 `469f5edceafac4533c38d3550b6bd530b9304b73283dc65331cace948117158d`.
The continuation at `0e406156` added the gate evidence. The bound ruling
updates the two notes. Source and tests match the gated tree.

## Open limits

The deploy-check CLI requires an observed bound before it queries a window.
Tightening the Grow-only bound awaits three further deploy windows under
OB-L `b3d586a9`.

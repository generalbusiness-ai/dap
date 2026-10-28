# Run a checker in a container

The platform-neutral entry exports `CheckerService`, `Runner`, checkout,
judgment and signing. The separate `@generalbusiness/dap-checkers/node`
entry exports `containerRunner` and `gatewayOrigin`. It starts real containers through nerdctl;
it does not deploy a checker service or configure a Worker.

Use Node 26 and launch the host with `node --import tsx`. The adapter
resolves its pinned `tsx` 4.21.0 loader beside the package when it starts
the detached supervisor. No loader is fetched at runtime. The adapter targets
nerdctl 2.4.1 and containerd on Linux. A macOS host can use the same engine
through Lima. The runner image must contain `/usr/bin/git`, `/usr/bin/id`,
`/bin/mkdir`, `/bin/sh` and the reviewed relay at
`/usr/local/bin/artroom-git-relay`.

## Prepare the image and configuration

Build from a content-addressed Go image with the tools the check needs.
Pass a full repository digest as `BASE_IMAGE`; do not use a mutable tag.
The build context is only this package's `runner` directory:

```sh
nerdctl build --network=none --build-arg BASE_IMAGE="$CHECKER_BASE_IMAGE" \
  --tag artroom-checker-build packages/checkers/runner
```

Record the resulting image digest from the engine. Publish that digest as
the check configuration's `image`. The tag is only a build name. The
adapter uses the configured digest, refuses a different resolved image,
and never pulls a missing image.

Publish the complete measured environment in the configuration. This
includes image defaults and the engine's `HOSTNAME` and `HOME` values.
The fixed hostname is `artroom-checker`; no TTY is allocated. The adapter
compares the actual environment with the declared ordered list before
checkout or a configured step. It does not silently add variables or
inherit the service's credentials into the job.

## Connect the runner to the service

Keep the execution records in a persistent directory owned by the service
user, with mode `0700`. Run records use `0600`; retain them after container
cleanup so the same run identifier cannot launch another execution.

```ts
import { containerRunner } from "@generalbusiness/dap-checkers/node";

const runner = containerRunner({
  root: "/private/checker-runs",
  command: ["/usr/local/bin/nerdctl"],
  execCommand: ["/usr/local/bin/ctr", "--address", containerdSocket,
    "--namespace", containerdNamespace, "tasks", "exec", "--fifo-dir", privateFifoDirectory],
  originFor,
});
```

`command` controls the container lifecycle through nerdctl. `execCommand`
is the complete ctr tasks exec prefix for that same containerd instance.
Both are trusted operator configuration, never shell text or a job value.
Set `containerdSocket` and `containerdNamespace` to the actual engine's
socket and namespace. Create `privateFifoDirectory` in the guest with mode
`0700`, owned by the operator who runs ctr. The adapter appends the task's
measured container ID and execution arguments. It retains both prefixes
only in its private execution claim, outside `Job` and the container environment.

For the Lima instance used in development, the lifecycle prefix is:

```ts
["/opt/homebrew/bin/limactl", "shell", "gitseq", "--", "nerdctl"]
```

Use the same Lima prefix before `ctr` and its complete address, namespace
and tasks exec arguments. The FIFO directory is inside that guest.
The adapter judges the last stdout line. Both stdout and stderr count
toward the output limit. An abnormal close, status `255`, or a nonzero
status with any stderr leaves the run lost because the adapter cannot
distinguish that result from a transport or ctr setup failure. A nonzero
status with empty stderr remains judgeable. For a check that needs stderr
in its judgment, combine the job's streams in its configured shell command.

Give this runner and the external `ResultSigner` to `CheckerService`.
The service authenticates the job and configuration before calling
`Runner.run`. Neither the signer nor a credential enters `RunAsk`.

Snapshot jobs use their verified reservation objects and never call
`originFor`. For a legacy job, `originFor(ask, signal)` is trusted host-side
custody wiring. It must obtain the job's live read token, bind it with
`readGrant`, and open `gatewayOrigin(options, grant)` with `update: null`.
This Node wrapper uses the existing `runnerGateway` and carries request
cancellation through to its upstream. Return its canonical repository URL,
`forward(request)` and `close()`.
Close the grant when the token ends or the signal aborts. Do not substitute
an unrestricted fetch callback, a write grant or a token from another job.

The token stays in that Gateway's memory. A private Unix socket connects
the detached supervisor to the owner. The container receives only Git
requests and responses through its immutable relay. The socket, run
records, service configuration and `DAP_HOME` are not mounted into it.
The owner stops admission, cancels pending reads and joins its owned work
before acknowledging origin closure. The supervisor requires that durable
acknowledgement before a legacy run's result is eligible. An uncooperative
callback whose cleanup cannot be confirmed leaves a lost run.

Successor evidence jobs use `Job.overlay`, a separate immutable checkout
overlay backed by an actual Destination 17 admission. It is not a legacy
`ReservationSnapshot`. The service selects the exact commissioned Issue and
Change digests through optional trusted `evidenceDefinitions`; absent or
wrong pins cannot fall back to an unbound successor job. `Scopes.stageSnapshot`
reads the actual admitted job, subject facts and immutable objects with the
external signer's existing signed job-read intent. The HTTP adapter uses
`{signed, stage: true}` on the existing reservation-snapshot route; the hint
selects routing and supplies no authority.

The stage proof has a 256 KiB canonical ceiling. Its overlay allows at most
4,096 unique objects and 16 MiB of decoded bytes, with the existing per-object
limits. These are transport bounds, not native capacity allowances. Work
staging separately proves at most 32 KiB of actual commit bytes through a
48 KiB canonical proof. Published jobs read their recorded commit after
publication and reservation cleanup without recreating a reservation ref.

The service retains the same admission and object proof with its one run.
Fresh execution cannot start after the native waiting deadline. An existing
fenced run can recover and settle late under current source and key standing;
a room-service generation change still invalidates its old fence. A lost
accepted result reply retries only the original stored signed bytes. It
creates no replacement run or signature and does not assert new authority.

## What one job can do

Each job gets a fresh container with `--network=none`, a read-only root
filesystem and private temporary filesystems. The only Git access is the
relay's loopback service, which delegates to the existing read-only
Gateway. No network bridge, host port, daemon socket, host directory or
device is given to the job.

The relay runs as UID `65533`; checkout and configured steps run as UID
`65532`. The job cannot write the relay's control stream or replace its
code. The host confirms the exact checkout before any configured step
runs, and constructs the report from engine status and bounded output.
JSON printed by a step is output, never a supervisor report.

Trusted checkout tools run by absolute path through the static relay's
separate execution mode with a fixed safe environment. A configured job
`PATH` or loader variable cannot replace the Git used for confirmation.
Configured steps keep their declared environment.

The trusted adapter policy gives a job 512 MiB of memory without swap,
64 processes, one CPU, no capabilities and no new privileges. Its private
work filesystem is 128 MiB. The native configuration still has only its
existing time and output limits. Missing enforcement metadata, an image
or environment mismatch, an unreadable checkout or a lost supervisor
cannot become a passed check.

## Recover a lost reply

`run` reserves its private record before engine actions. A duplicate with
the same identifier and different input is refused. A detached host
supervisor owns the execution and persists its terminal report after
cleanup.

`find(run)` only reads the retained record and engine state. It can return
the same terminal report, `running`, or a truthful lost/unreadable result.
It never starts a replacement. A crash between the service's durable
start and the runner's execution may remain `run-lost`: the contract is
at most one execution, not guaranteed execution. Keep the terminal record
after removing the container.

The service supplies the authenticated job to `find(run, expectedJob)` on
every recovery lookup. A different job is refused before releasing a
retained report; the refusal cannot recover another job's passing result.

## Verify a real adapter

The ordinary suite keeps its labelled stand-ins and does not claim that
a container ran. The explicit acceptance driver requires a public manual
configuration with exactly `command`, `execCommand`, `image`, `environment` and
`canaryPort`. Its image additionally contains the test-only Go probe at
`/j3-test-probe`.

```sh
node --import tsx scripts/test-j3-runner.mjs \
  --config /absolute/path/to/public-runner.json \
  --out /absolute/path/to/new-evidence-directory
```

The driver does not install packages or pull an image. It tests the real
adapter and then supplies a bounded test bridge to the existing Native
reservation scenario. That scenario retains its test host, scheduler,
rules and configuration boundaries; the runner is real in this mode.
An unavailable runtime or missing image fails this explicit command.
It is not a skipped trusted pass. Follow [the testing guide](../../docs/testing.md)
for focused checks and the final ordinary gate.

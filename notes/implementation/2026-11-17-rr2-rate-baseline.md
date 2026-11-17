# A tracked rate baseline for each deployment

RR-2 (request `23dce34b`) gives the post-deployment rate read a written
floor. AR-4 raised `dap-grow` from about 98 to about 360 Durable Object
requests an hour. No one had a written floor to compare against, so the
rise came to light only from memory of the earlier rate.

## The baseline file

`ops/do-rate-baseline.json` gives each room Worker a floor and a limit in
Durable Object requests a minute. The floor is the measured rate. A minute
flags when its count is above the limit. The figures come from the
planner's rate read after the AR-10 deployment (END `5995bf0a`, 20:37 to
20:52Z on 2026-11-17):

| Worker        | Floor | Limit | Source                                     |
| ------------- | ----- | ----- | ------------------------------------------ |
| `dap-grow`    | 32    | 36    | 29 to 35 a minute, mean 32.3               |
| `dap-lending` | 0     | 2     | idle; a new scope or a deployment bumps it |
| `dap-demo`    | 0     | 2     | idle; a deployment bumps it                |

The Grow simulator runs a fault cycle each hour
(`examples/grow/simulator.ts`). The file states its minutes as known peaks,
not as floors. A peak applies only to its minute of each hour. Every other
minute is compared with the limit. Each peak is the highest count at that
minute from 19:30 to 20:55Z, after AR-8, plus 4:

| Minute | Highest seen | Peak |
| ------ | ------------ | ---- |
| :10    | 49           | 53   |
| :11    | 43           | 47   |
| :35    | 47           | 51   |
| :36    | 44           | 48   |
| :40    | 38           | 42   |
| :41    | 37           | 41   |

No other minute in that window rose above 36. The deployment itself woke
`dap-lending` (1 and 9) and `dap-demo` (2, 7 and 1) at 20:35 to 20:37Z.
The deployment step therefore starts its read with `--since` at the minute
after the last Worker deploys.

Keys that start with `$` are comments. The file records its source in
`$source`.

## The format

`parseBaseline` in `scripts/do-rate.mjs` accepts two forms for each
Worker:

- a number: the floor;
- an object: `{"floor": n, "limit": n, "peaks": {"MM": n}}`, where `MM` is
  a minute of the hour from `00` to `59`. The limit defaults to the floor.

It refuses a negative or non-numeric floor, a limit below the floor, a
minute that is not two digits, a peak below the limit and any other key
that does not start with `$`. `limitAt` gives the limit for one minute: the
peak for that minute of the hour, otherwise the limit. A minute flags when its count is above its
limit. A file with only numbers reads as before.

## Requests per object

The operator's next step on a flag is to find the object that grew. The
new `--objects` option makes that a repository command:

```sh
node scripts/do-rate.mjs --objects --worker dap-grow \
  --since 2026-11-17T20:37Z --until 2026-11-17T21:07Z \
  --token-file /absolute/analytics-token
```

It reads one Worker and prints each Durable Object's requests over the
window, the busiest first, with its rate a minute. It refuses `--all`, more
than one Worker, and `--baseline`.

## The deployment step

Step 7 of "Deploy the hosted Workers" in `docs/operate-a-service.md` now
waits 30 minutes, then runs `do-rate.mjs --all --since … --until …
--baseline ops/do-rate-baseline.json` over the 30 minutes that start the
minute after the last Worker deploys. On a flag,
the operator stops, reads the requests per object with `--objects`, and
files a finding. A head that changes a rate on purpose changes the
baseline file too, and its note gives the new figures and their window.

## Tests

`scripts/do-rate.test.mjs` adds three cases:

- A peak raises the limit for its minute of the hour only. The same count
  at another minute flags. A limit above the floor raises every minute.
  Each malformed form is refused.
- The tracked file parses and names `dap-grow`. At a minute with no peak,
  a count at the limit does not flag, and a count one above it does.
- `--objects` sends one query for one Worker, grouped by object, and
  prints the objects by requests. It refuses bad argument sets before any
  query and never prints the token.

No runtime source changes. The Node stage covers the change.

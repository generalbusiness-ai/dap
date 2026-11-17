/** Read Durable Object requests per minute per Worker from the Cloudflare
 * GraphQL analytics API. Read-only: the script sends one query per window
 * and prints counts. It never prints the token. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkout, readConfig } from "./deploy-config.mjs";

export const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
export const TOKEN_ENV = "CLOUDFLARE_ANALYTICS_TOKEN";
export const ACCOUNT_ENV = "CLOUDFLARE_ACCOUNT_ID";
export const ROW_LIMIT = 10_000;
export const MAX_MINUTES = 7 * 24 * 60;
// The hosted names whose Workers deploy.mjs deploys after a landing. Their
// Worker script names come from the tracked configurations.
export const DEFAULT_HOSTED = Object.freeze([
  "grow",
  "lending",
  "demo",
  "artroom-scope",
  "sandbox",
]);
const MINUTE = 60_000;
const TOKEN_KEYS = [TOKEN_ENV, "CLOUDFLARE_API_TOKEN"];

export const USAGE = `Usage: node scripts/do-rate.mjs (--minutes N | --since ISO --until ISO) [options]

Print Durable Object requests per minute per Worker, then per-Worker totals
and the per-hour rate. Times are UTC at minute precision, for example
2026-11-17T07:00Z. --until is exclusive. --minutes N ends at the current minute.

Options:
  --worker NAME      Worker script name; repeat for more. Default: the Workers
                     of ${DEFAULT_HOSTED.join(", ")} in their tracked configurations.
  --all              Every Worker in the account that has Durable Object
                     requests in the window, the busiest first.
  --account ID       Cloudflare account ID. Default: $${ACCOUNT_ENV}, then a
                     ${ACCOUNT_ENV}= line in the token file.
  --token-file PATH  File with the API token: a bare token, or KEY=value lines
                     with ${TOKEN_ENV}= or CLOUDFLARE_API_TOKEN=.
                     Default: $${TOKEN_ENV}.
  --baseline FILE    JSON {"worker": requests per minute}. Flags each minute
                     above a Worker's floor.

Exit 0 on a report, 2 on bad arguments, 1 on an API failure.`;

class ArgumentError extends Error {}
const bad = (message) => {
  throw new ArgumentError(message);
};

/** Parse a UTC timestamp at minute precision into epoch milliseconds. */
export function parseMinute(text) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::00(?:\.0+)?)?Z$/.exec(
    text ?? "",
  );
  if (!match)
    bad("Give a UTC time at minute precision, for example 2026-11-17T07:00Z.");
  const ms = Date.parse(`${match[1]}T${match[2]}:${match[3]}:00Z`);
  if (!Number.isFinite(ms)) bad("Give a valid UTC time.");
  return ms;
}

export const isoMinute = (ms) => new Date(ms).toISOString().slice(0, 16) + "Z";
const hhmm = (ms) => new Date(ms).toISOString().slice(11, 16) + "Z";

/** Return the token, and an account ID when the file names one. A bare token
 * is one non-comment line. Errors never quote the file. */
export function parseTokenFile(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const pairs = new Map();
  for (const line of lines) {
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      (value[0] === '"' || value[0] === "'") &&
      value.at(-1) === value[0]
    )
      value = value.slice(1, -1);
    pairs.set(match[1], value);
  }
  let token;
  if (pairs.size) token = TOKEN_KEYS.map((key) => pairs.get(key)).find(Boolean);
  else if (lines.length === 1) token = lines[0];
  if (!token || !/^[A-Za-z0-9._~+/=-]+$/.test(token))
    bad(
      `The token file holds no bare token and no ${TOKEN_KEYS.join(" or ")} line.`,
    );
  return { token, account: pairs.get(ACCOUNT_ENV) || null };
}

/** Parse a baseline document: Worker name to a requests-per-minute floor. */
export function parseBaseline(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    bad("The baseline file is not JSON.");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value))
    bad("The baseline file must be a JSON object.");
  const floors = new Map();
  for (const [worker, floor] of Object.entries(value)) {
    if (typeof floor !== "number" || !Number.isFinite(floor) || floor < 0)
      bad("Each baseline floor must be a non-negative number.");
    floors.set(worker, floor);
  }
  return floors;
}

/** The GraphQL request body for one window. --until is exclusive. With
 * `workers` null (--all), the query names no Worker and reads every Worker
 * in the account. */
export function buildQuery({ account, workers, since, until }) {
  const all = workers === null;
  return {
    query: `query($a:String!,${all ? "" : "$s:[String!],"}$f:Time!,$t:Time!){viewer{accounts(filter:{accountTag:$a}){durableObjectsInvocationsAdaptiveGroups(limit:${ROW_LIMIT},filter:{${all ? "" : "scriptName_in:$s,"}datetimeMinute_geq:$f,datetimeMinute_lt:$t}){sum{requests} dimensions{datetimeMinute scriptName}}}}}`,
    variables: {
      a: account,
      ...(all ? {} : { s: [...workers] }),
      f: new Date(since).toISOString(),
      t: new Date(until).toISOString(),
    },
  };
}

/** --all: every Worker that has a row, the busiest first, then by name. */
export function workersOf(rows) {
  const totals = new Map();
  for (const row of rows)
    totals.set(row.worker, (totals.get(row.worker) ?? 0) + row.requests);
  return [...totals]
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
    .map(([worker]) => worker);
}

/** Return rows {minute, worker, requests}, or throw an error that names the
 * API errors. */
export function parseReply(json) {
  if (json === null || typeof json !== "object")
    throw Error("The analytics API answered with no JSON object.");
  if (Array.isArray(json.errors) && json.errors.length) {
    const messages = json.errors.map((error) =>
      typeof error?.message === "string" ? error.message : "unnamed error",
    );
    throw Error(`The analytics API refused the query: ${messages.join("; ")}`);
  }
  const accounts = json.data?.viewer?.accounts;
  if (!Array.isArray(accounts))
    throw Error("The analytics reply has no account list.");
  if (accounts.length !== 1)
    throw Error(
      "The analytics reply names no readable account; check the account ID and the token's Account Analytics permission.",
    );
  const groups = accounts[0]?.durableObjectsInvocationsAdaptiveGroups;
  if (!Array.isArray(groups))
    throw Error("The analytics reply has no Durable Object groups.");
  return groups.map((group) => {
    const minute = Date.parse(group?.dimensions?.datetimeMinute),
      worker = group?.dimensions?.scriptName,
      requests = group?.sum?.requests;
    if (
      !Number.isFinite(minute) ||
      minute % MINUTE !== 0 ||
      typeof worker !== "string" ||
      !Number.isSafeInteger(requests) ||
      requests < 0
    ) {
      throw Error("The analytics reply has a malformed group.");
    }
    return { minute, worker, requests };
  });
}

/** Read every row in the window. A reply at the row limit splits the window
 * in half and reads each half; a one-minute window at the limit fails. */
export async function readRows({ account, workers, since, until }, post) {
  const rows = parseReply(
    await post(buildQuery({ account, workers, since, until })),
  );
  if (rows.length < ROW_LIMIT) return rows;
  if (until - since <= MINUTE)
    throw Error(
      `One minute holds ${ROW_LIMIT} or more groups; the reply may be truncated.`,
    );
  const middle = since + Math.floor((until - since) / MINUTE / 2) * MINUTE;
  return [
    ...(await readRows({ account, workers, since, until: middle }, post)),
    ...(await readRows({ account, workers, since: middle, until }, post)),
  ];
}

/** Count requests per minute per Worker. Every minute in [since, until)
 * appears, with zero for a Worker that has no row. */
export function aggregate(rows, { since, until, workers }) {
  const minutes = [];
  for (let at = since; at < until; at += MINUTE)
    minutes.push({ at, counts: new Map(workers.map((worker) => [worker, 0])) });
  for (const row of rows) {
    const index = (row.minute - since) / MINUTE;
    if (!Number.isInteger(index) || index < 0 || index >= minutes.length)
      throw Error("The analytics reply has a minute outside the window.");
    const counts = minutes[index].counts;
    if (!counts.has(row.worker))
      throw Error("The analytics reply names a Worker outside the query.");
    counts.set(row.worker, counts.get(row.worker) + row.requests);
  }
  const totals = new Map(
    workers.map((worker) => [
      worker,
      minutes.reduce((sum, minute) => sum + minute.counts.get(worker), 0),
    ]),
  );
  return { since, until, workers: [...workers], minutes, totals };
}

/** Format the report as lines: a window line, one line per minute, the
 * totals, the per-hour rate, and with a baseline the count of flagged minutes. */
export function formatReport(report, { baseline = null } = {}) {
  const pairs = (map) =>
    report.workers.map((worker) => `${worker}=${map.get(worker)}`).join(" ");
  const length = report.minutes.length;
  const lines = [
    `window ${isoMinute(report.since)} ${isoMinute(report.until)} minutes=${length}`,
  ];
  const above = new Map(
    report.workers
      .filter((worker) => baseline?.has(worker))
      .map((worker) => [worker, 0]),
  );
  for (const minute of report.minutes) {
    let line = `${hhmm(minute.at)} ${pairs(minute.counts)}`;
    const flags = [];
    for (const worker of above.keys()) {
      const count = minute.counts.get(worker),
        floor = baseline.get(worker);
      if (count > floor) {
        flags.push(`${worker}(${count}>${floor})`);
        above.set(worker, above.get(worker) + 1);
      }
    }
    if (flags.length) line += ` above: ${flags.join(" ")}`;
    lines.push(line);
  }
  lines.push(`total ${pairs(report.totals)}`);
  const hourly = new Map(
    report.workers.map((worker) => [
      worker,
      ((report.totals.get(worker) * 60) / length).toFixed(1),
    ]),
  );
  lines.push(`per-hour ${pairs(hourly)}`);
  if (baseline)
    lines.push(
      above.size
        ? `above-baseline ${[...above].map(([worker, count]) => `${worker}=${count}`).join(" ")}`
        : "above-baseline none: the baseline names no selected Worker",
    );
  return lines;
}

/** The Worker script names of the default hosted configurations. */
export async function defaultWorkers(root = checkout) {
  return Promise.all(
    DEFAULT_HOSTED.map(
      async (name) => (await readConfig(root, name)).config.name,
    ),
  );
}

function windowOf(values, now) {
  if (values.minutes !== undefined) {
    if (values.since !== undefined || values.until !== undefined)
      bad("Give --minutes or --since and --until, not both.");
    if (!/^[1-9][0-9]*$/.test(values.minutes))
      bad("--minutes takes a positive whole number.");
    const count = Number(values.minutes);
    if (count > MAX_MINUTES) bad(`--minutes takes at most ${MAX_MINUTES}.`);
    const until = Math.floor(now.getTime() / MINUTE) * MINUTE;
    return { since: until - count * MINUTE, until };
  }
  if (values.since === undefined || values.until === undefined)
    bad("Give --minutes, or both --since and --until.");
  const since = parseMinute(values.since),
    until = parseMinute(values.until);
  if (until <= since) bad("--until must follow --since.");
  if ((until - since) / MINUTE > MAX_MINUTES)
    bad(`The window holds at most ${MAX_MINUTES} minutes.`);
  return { since, until };
}

/** Parse arguments, read the token, query, and print. Tests inject env,
 * fetch, the clock and the output streams. Returns the exit code. */
export async function run(
  argv,
  {
    env = process.env,
    fetch = globalThis.fetch,
    now = () => new Date(),
    stdout = process.stdout,
    stderr = process.stderr,
  } = {},
) {
  let token = null;
  const say = (stream, text) =>
    stream.write((token ? text.split(token).join("[token]") : text) + "\n");
  let options;
  try {
    const { values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        worker: { type: "string", multiple: true },
        all: { type: "boolean" },
        account: { type: "string" },
        since: { type: "string" },
        until: { type: "string" },
        minutes: { type: "string" },
        "token-file": { type: "string" },
        baseline: { type: "string" },
        help: { type: "boolean" },
      },
    });
    if (values.help) {
      say(stdout, USAGE);
      return 0;
    }
    const window = windowOf(values, now());
    if (values.all && values.worker) bad("Give --all or --worker, not both.");
    const workers = values.all
      ? null
      : (values.worker ?? (await defaultWorkers()));
    if (
      workers !== null &&
      (!workers.length ||
        workers.some((worker) => !/^[a-z0-9-]{1,63}$/.test(worker)) ||
        new Set(workers).size !== workers.length)
    )
      bad("Name each Worker once, in lower case.");
    let fileAccount = null;
    if (values["token-file"] !== undefined) {
      let text;
      try {
        text = await readFile(resolve(values["token-file"]), "utf8");
      } catch {
        bad("Cannot read the token file.");
      }
      ({ token, account: fileAccount } = parseTokenFile(text));
    } else if (env[TOKEN_ENV]) token = env[TOKEN_ENV].trim();
    else bad(`Give --token-file or set ${TOKEN_ENV}.`);
    const account = values.account ?? env[ACCOUNT_ENV] ?? fileAccount;
    if (!account) bad(`Give --account or set ${ACCOUNT_ENV}.`);
    if (!/^[0-9a-f]{32}$/.test(account))
      bad("The account ID must be 32 lower-case hexadecimal digits.");
    let baseline = null;
    if (values.baseline !== undefined) {
      let text;
      try {
        text = await readFile(resolve(values.baseline), "utf8");
      } catch {
        bad("Cannot read the baseline file.");
      }
      baseline = parseBaseline(text);
    }
    options = { ...window, workers, account, baseline };
  } catch (error) {
    if (
      !(error instanceof ArgumentError) &&
      error?.code?.startsWith?.("ERR_PARSE_ARGS") !== true
    )
      throw error;
    say(stderr, `do-rate: ${error.message}`);
    say(stderr, USAGE);
    return 2;
  }
  const post = async (body) => {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw Error(
        `The analytics API answered HTTP ${response.status} without JSON.`,
      );
    }
    if (!response.ok && !(Array.isArray(json?.errors) && json.errors.length))
      throw Error(`The analytics API answered HTTP ${response.status}.`);
    return json;
  };
  try {
    const rows = await readRows(options, post);
    const report = aggregate(rows, {
      ...options,
      workers: options.workers ?? workersOf(rows),
    });
    say(
      stdout,
      formatReport(report, { baseline: options.baseline }).join("\n"),
    );
    return 0;
  } catch (error) {
    say(stderr, `do-rate: ${error?.message ?? "the query failed"}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = await run(process.argv.slice(2));
  } catch {
    process.stderr.write("do-rate: unexpected failure\n");
    process.exitCode = 1;
  }
}

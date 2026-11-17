import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  aggregate,
  buildQuery,
  defaultWorkers,
  formatReport,
  parseBaseline,
  parseMinute,
  parseReply,
  parseTokenFile,
  readRows,
  run,
  ROW_LIMIT,
} from "./do-rate.mjs";

// A recorded reply shape from durableObjectsInvocationsAdaptiveGroups, with
// invented counts. 07:01Z has no rows, so both Workers count zero there.
const recorded = {
  data: {
    viewer: {
      accounts: [
        {
          durableObjectsInvocationsAdaptiveGroups: [
            {
              sum: { requests: 12 },
              dimensions: {
                datetimeMinute: "2026-11-17T07:00:00Z",
                scriptName: "dap-grow",
              },
            },
            {
              sum: { requests: 3 },
              dimensions: {
                datetimeMinute: "2026-11-17T07:00:00Z",
                scriptName: "dap-lending",
              },
            },
            {
              sum: { requests: 55 },
              dimensions: {
                datetimeMinute: "2026-11-17T07:02:00Z",
                scriptName: "dap-grow",
              },
            },
          ],
        },
      ],
    },
  },
  errors: null,
};
const workers = ["dap-grow", "dap-lending"];
const since = parseMinute("2026-11-17T07:00Z"),
  until = parseMinute("2026-11-17T07:03Z");
const account = "0123456789abcdef0123456789abcdef";
const secret = "tok_SECRET_value_123";

test("aggregation fills a missing minute with zero for two Workers", () => {
  const report = aggregate(parseReply(recorded), { since, until, workers });
  assert.deepEqual(
    report.minutes.map((minute) => Object.fromEntries(minute.counts)),
    [
      { "dap-grow": 12, "dap-lending": 3 },
      { "dap-grow": 0, "dap-lending": 0 },
      { "dap-grow": 55, "dap-lending": 0 },
    ],
  );
  assert.deepEqual(Object.fromEntries(report.totals), {
    "dap-grow": 67,
    "dap-lending": 3,
  });
});

test("the report prints each minute, the totals and the per-hour rate", () => {
  const lines = formatReport(
    aggregate(parseReply(recorded), { since, until, workers }),
  );
  assert.deepEqual(lines, [
    "window 2026-11-17T07:00Z 2026-11-17T07:03Z minutes=3",
    "07:00Z dap-grow=12 dap-lending=3",
    "07:01Z dap-grow=0 dap-lending=0",
    "07:02Z dap-grow=55 dap-lending=0",
    "total dap-grow=67 dap-lending=3",
    "per-hour dap-grow=1340.0 dap-lending=60.0",
  ]);
});

test("a baseline flags minutes above a Worker's floor and counts them", () => {
  const baseline = parseBaseline(
    '{"dap-grow": 40, "dap-lending": 3, "dap-other": 1}',
  );
  const lines = formatReport(
    aggregate(parseReply(recorded), { since, until, workers }),
    { baseline },
  );
  assert.equal(lines[1], "07:00Z dap-grow=12 dap-lending=3");
  assert.equal(
    lines[3],
    "07:02Z dap-grow=55 dap-lending=0 above: dap-grow(55>40)",
  );
  assert.equal(lines.at(-1), "above-baseline dap-grow=1 dap-lending=0");
  assert.throws(() => parseBaseline('{"dap-grow": -1}'), /non-negative/);
});

test("the query groups by minute and Worker script name", () => {
  const body = buildQuery({ account, workers, since, until });
  assert.match(body.query, /scriptName_in:\$s/);
  assert.match(body.query, /dimensions\{datetimeMinute scriptName\}/);
  assert.match(body.query, new RegExp(`limit:${ROW_LIMIT}`));
  assert.deepEqual(body.variables, {
    a: account,
    s: workers,
    f: "2026-11-17T07:00:00.000Z",
    t: "2026-11-17T07:03:00.000Z",
  });
});

test("an API errors reply exits 1 and prints no token text", async () => {
  const reply = {
    data: null,
    errors: [{ message: "not authorized for that account" }],
  };
  assert.throws(
    () => parseReply(reply),
    /refused the query: not authorized for that account/,
  );
  const out = [],
    err = [];
  let authorization;
  const code = await run(
    ["--minutes", "3", "--worker", "dap-grow", "--account", account],
    {
      env: { CLOUDFLARE_ANALYTICS_TOKEN: secret },
      fetch: async (url, init) => {
        authorization = init.headers.authorization;
        return new Response(JSON.stringify(reply), { status: 200 });
      },
      now: () => new Date(until + 30_000),
      stdout: { write: (text) => out.push(text) },
      stderr: { write: (text) => err.push(text) },
    },
  );
  assert.equal(code, 1);
  assert.equal(authorization, `Bearer ${secret}`);
  assert.match(err.join(""), /not authorized/);
  assert.ok(!(out.join("") + err.join("")).includes(secret));
});

test("a reply at the row limit splits the window; one full minute fails", async () => {
  const full = (minute) => ({
    data: {
      viewer: {
        accounts: [
          {
            durableObjectsInvocationsAdaptiveGroups: Array.from(
              { length: ROW_LIMIT },
              () => ({
                sum: { requests: 1 },
                dimensions: { datetimeMinute: minute, scriptName: "dap-grow" },
              }),
            ),
          },
        ],
      },
    },
  });
  const windows = [];
  const rows = await readRows(
    { account, workers, since, until },
    async (body) => {
      windows.push([body.variables.f, body.variables.t]);
      return windows.length === 1 ? full("2026-11-17T07:00:00Z") : recorded;
    },
  );
  assert.deepEqual(windows, [
    ["2026-11-17T07:00:00.000Z", "2026-11-17T07:03:00.000Z"],
    ["2026-11-17T07:00:00.000Z", "2026-11-17T07:01:00.000Z"],
    ["2026-11-17T07:01:00.000Z", "2026-11-17T07:03:00.000Z"],
  ]);
  assert.equal(rows.length, 6);
  await assert.rejects(
    readRows({ account, workers, since, until: since + 60_000 }, async () =>
      full("2026-11-17T07:00:00Z"),
    ),
    /may be truncated/,
  );
});

test("a KEY=value token file gives the token and the account", async () => {
  const dir = mkdtempSync(join(tmpdir(), "do-rate-"));
  try {
    const path = join(dir, "cloudflare.env");
    writeFileSync(
      path,
      `# analytics\nexport CLOUDFLARE_API_TOKEN="${secret}"\nCLOUDFLARE_ACCOUNT_ID=${account}\n`,
    );
    assert.deepEqual(parseTokenFile(`${secret}\n`), {
      token: secret,
      account: null,
    });
    assert.deepEqual(
      parseTokenFile(`CLOUDFLARE_ANALYTICS_TOKEN=${secret}\nOTHER=x\n`),
      { token: secret, account: null },
    );
    assert.throws(
      () => parseTokenFile(`OTHER=${secret}\n`),
      (error) => !error.message.includes(secret),
    );
    const out = [];
    const code = await run(
      [
        "--since",
        "2026-11-17T07:00Z",
        "--until",
        "2026-11-17T07:03Z",
        "--token-file",
        path,
        "--worker",
        "dap-grow",
        "--worker",
        "dap-lending",
      ],
      {
        env: {},
        fetch: async () =>
          new Response(JSON.stringify(recorded), { status: 200 }),
        stdout: { write: (text) => out.push(text) },
        stderr: { write: () => {} },
      },
    );
    assert.equal(code, 0);
    assert.match(out.join(""), /^total dap-grow=67 dap-lending=3$/m);
    assert.ok(!out.join("").includes(secret));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("bad arguments exit 2 without a query", async () => {
  let called = false;
  const io = {
    env: {},
    fetch: async () => {
      called = true;
    },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
  };
  assert.equal(await run(["--minutes", "0", "--worker", "dap-grow"], io), 2);
  assert.equal(
    await run(
      [
        "--since",
        "2026-11-17T07:00:30Z",
        "--until",
        "2026-11-17T07:03Z",
        "--worker",
        "dap-grow",
      ],
      io,
    ),
    2,
  );
  assert.equal(
    await run(
      ["--minutes", "5", "--worker", "dap-grow", "--account", account],
      io,
    ),
    2,
  );
  assert.equal(await run(["--bogus"], io), 2);
  assert.equal(called, false);
});

test("the default Workers come from the tracked configurations", async () => {
  assert.deepEqual(await defaultWorkers(), [
    "dap-grow",
    "dap-lending",
    "dap-demo",
    "artroom-scope",
    "dap-application-sandbox",
  ]);
});

test("--all queries every Worker and reports each one that has rows, the busiest first", async () => {
  const body = buildQuery({ account, workers: null, since, until });
  assert.doesNotMatch(body.query, /scriptName_in|\$s/);
  assert.deepEqual(Object.keys(body.variables), ["a", "f", "t"]);
  // A Worker outside the deploy.mjs list, as artroom-counting was.
  const reply = structuredClone(recorded);
  reply.data.viewer.accounts[0].durableObjectsInvocationsAdaptiveGroups.push({
    sum: { requests: 117 },
    dimensions: {
      datetimeMinute: "2026-11-17T07:01:00Z",
      scriptName: "artroom-counting",
    },
  });
  const out = [],
    err = [],
    queries = [];
  const code = await run(["--all", "--minutes", "3", "--account", account], {
    env: { CLOUDFLARE_ANALYTICS_TOKEN: secret },
    fetch: async (url, init) => {
      queries.push(JSON.parse(init.body));
      return new Response(JSON.stringify(reply), { status: 200 });
    },
    now: () => new Date(until + 30_000),
    stdout: { write: (text) => out.push(text) },
    stderr: { write: (text) => err.push(text) },
  });
  assert.equal(code, 0, err.join(""));
  assert.equal(queries.length, 1);
  assert.ok(!("s" in queries[0].variables));
  const lines = out.join("").trim().split("\n");
  assert.equal(lines[1], "07:00Z artroom-counting=0 dap-grow=12 dap-lending=3");
  assert.equal(
    lines[2],
    "07:01Z artroom-counting=117 dap-grow=0 dap-lending=0",
  );
  assert.match(
    out.join(""),
    /total artroom-counting=117 dap-grow=67 dap-lending=3/,
  );
  const both = await run(["--all", "--worker", "dap-grow", "--minutes", "3"], {
    env: { CLOUDFLARE_ANALYTICS_TOKEN: secret },
    fetch: async () => assert.fail("no query on bad arguments"),
    now: () => new Date(until + 30_000),
    stdout: { write: () => {} },
    stderr: { write: () => {} },
  });
  assert.equal(both, 2);
});

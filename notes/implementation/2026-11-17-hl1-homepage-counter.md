# The Counter page drops its dead link

HL-1 (request `e4dc5fdd`, narrowed by `8523eab5`) removes the link to the
deleted Counter Worker. On 2026-11-17 Hugh asked to delete the
`artroom-counting` Worker, and the planner deleted it at 10:07. It used about
7,000 Durable Object requests an hour, and dap did not use it. Hugh then
narrowed the change: keep the Counter card and page, and remove only the
link.

## The change

- `homepage/src/counter/index.html` drops the "Open counter" anchor to
  `https://artroom-counting.inguz.workers.dev/counting/`. The rest of the
  page, its copy and its header stay.
- `homepage/test/home.test.mjs` drops that target and the words "Open
  counter" from the page's expected links and copy.

The homepage keeps its Counter card, and the build still copies
`counter/index.html`.

No README or `docs/` line names `artroom-counting.inguz.workers.dev`. Older
notes under `notes/` keep their history.

## Tests

`homepage/test/home.test.mjs` passes. The named red,
`artroom-evidence/2026-11-17-hl1-red/red-old-test.txt`, runs the old test
against the new page, and the old test fails on the removed link.

The planner deploys `dap-home` after landing.

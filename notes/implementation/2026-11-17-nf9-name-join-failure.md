# Name the request that stops the hosted Counter join

NF-9 (request `a75440d3`) makes a failed hosted Counter enrollment name its
cause. NF-7 run 3 (act `cf494324`) stopped at the page's catch-all message,
"The enrollment remains unconfirmed". The room had already recorded
@counter-witness-3 as an active member. The page could not say which step
failed, and the witness kept only its own timeout.

## What the witness keeps

`apps/room/page/test/witness-request-shape.mjs` records one shape for each
request that the hosted Counter page makes:

- the method;
- the host;
- the path, with each scope id replaced by `<scope>`, each digest by
  `<digest>`, and each segment that is longer than 24 characters or holds other
  characters by `<id>`;
- the sorted query key names, with no values;
- the HTTP status, a bounded network failure name such as `net::ERR_ABORTED`,
  or `failed`.

A shape holds no header, body, query value, token or invitation. When a hosted
run stops, `custody-witness.mjs` writes the shapes into the private failure
note after the error, oldest first, and replaces the invitation in that note.
The note keeps at most 400 shapes and counts the rest.

## What the page says

`apps/counter/browser/enrollment-step.ts` names four enrollment steps:

| Step | Work |
| --- | --- |
| browser key | Read or make this browser's key in the enrollment slots. |
| join record | Read, keep or clear the kept join in the enrollment slots. |
| enrollment request | Send the join and read its receipt and confirmation. |
| custody save | Keep the confirmed device in the Counter device custody. |

A throw in a step becomes an `EnrollmentStepError` with the step and the
error's class name. A class name that is not a short identifier becomes
`other`, and a thrown non-error becomes `non-error`. The page shows, for
example, "The enrollment remains unconfirmed at the custody save step
(QuotaExceededError). Check its original request before continuing." It never
shows the error's message.

`browserJoining` turns a failed receipt read or confirmation read into an
"unknown" outcome with its own words, so those reads do not reach the
catch-all. A throw from the enrollment request step therefore comes from its
lock, its request custody or a lost context. The witness's request shapes
show whether a request failed.

## Release

The page change is an open-version change to Counter 0.6.0, so the hosted
0.5.0 page (item 11) does not carry it. The witness change alone runs against
0.5.0 and names the failing request when a request fails. When no request
fails, the stop is local to the browser, and the 0.6.0 page names the step.
The open Counter 0.6.0 presentation in `apps/counter/release-identifiers.json`
moves from `c4275588` to
`sha256:76ad09f8101d86a57ca950a56251045db0c55faa841043feaf4dd684de6da4a8`.

## Tests

- `apps/room/page/test/witness-request-shape.test.mjs`: marks for scope ids
  and digests, query keys without values, a token in a path, bounded failure
  names, and non-http addresses.
- `apps/counter/browser/app.test.ts`: each of the four steps names itself and
  the class and hides the message, an inner step keeps its name, and the
  enrollment key-generation and key-save stops name the browser key step.

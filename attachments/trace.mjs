// Dynamic traces: run the real source modules of the checkout at main 7177b87b in Node.
// No network, no storage, no Worker. Usage: node trace.mjs <repo root>
import { randomBytes } from "node:crypto";
const root = process.argv[2];
const load = path => import(`${root}/${path}`);
const { ServingLimits, SERVING_WINDOW_CAPACITY } = await load("packages/scope/src/serving-limits.ts");
const { SiteReadWindow, SITE_READ_WINDOW_KEYS, SITE_READS_PER_WINDOW } = await load("packages/scope/src/site/window.ts");
const { keyIdOf, addressKey } = await load("packages/bytes/src/index.ts");
const freshKey = () => keyIdOf(randomBytes(32));

console.log("== Trace 1: serving windows, one address and fresh keys");
{
  const limits = new ServingLimits();
  const attacker = "203.0.113.7", t0 = 1_000_000;
  let admitted = 0, sent = 0;
  while (limits.counts().total < SERVING_WINDOW_CAPACITY) { if (limits.account("creation", freshKey(), attacker, t0)) admitted++; sent++; }
  console.log(`requests sent from one address: ${sent}; admitted: ${admitted}; windows held: ${JSON.stringify(limits.counts())}`);
  const visitor = "198.51.100.20";
  console.log(`new key, new address, creation, 1 s later:      ${limits.account("creation", freshKey(), visitor, t0 + 1000)}`);
  console.log(`new key, new address, signed read, 1 s later:   ${limits.account("signed-read", freshKey(), visitor, t0 + 1000)}`);
  console.log(`new key, new address, signed read, 59 min later: ${limits.account("signed-read", freshKey(), visitor, t0 + 59 * 60_000)}`);
  console.log(`new key, new address, signed read, 61 min later: ${limits.account("signed-read", freshKey(), visitor, t0 + 61 * 60_000)}`);
}

console.log("== Trace 2: a reader already admitted, then the table fills");
{
  const fill = (limits, now) => { while (limits.counts().total < SERVING_WINDOW_CAPACITY) limits.account("creation", freshKey(), "203.0.113.7", now); };
  const reader = freshKey(), home = "198.51.100.20", t0 = 1_000_000;
  let limits = new ServingLimits();
  console.log(`reader's signed read before the fill:                       ${limits.account("signed-read", reader, home, t0)}`);
  fill(limits, t0 + 1);
  console.log(`30 s later (its read windows are still live):               ${limits.account("signed-read", reader, home, t0 + 30_000)}`);
  console.log(`2 min later, sender idle (its own two slots came free):     ${limits.account("signed-read", reader, home, t0 + 120_000)}`);
  limits = new ServingLimits();
  limits.account("signed-read", reader, home, t0);
  fill(limits, t0 + 1);
  limits.account("signed-read", freshKey(), "203.0.113.7", t0 + 90_000);   // expires the reader's windows and takes one freed slot
  fill(limits, t0 + 90_001);                                               // the sender takes the other
  console.log(`2 min later, sender refilled the freed slots:               ${limits.account("signed-read", reader, home, t0 + 120_000)}`);
}

console.log("== Trace 3: public Site window, addresses of one IPv6 /64");
{
  const site = new SiteReadWindow(), t0 = 1_000_000;
  let admitted = 0;
  const prefix = "2001:db8:1:2";
  const keys = new Set();
  for (let i = 0; i < SITE_READ_WINDOW_KEYS; i++) { const a = `${prefix}::${(i + 1).toString(16)}`; keys.add(addressKey(a)); if (site.admit(a, t0)) admitted++; }
  console.log(`addresses used: ${SITE_READ_WINDOW_KEYS}; admitted: ${admitted}; site keys held: ${site.size}; per-address limit: ${SITE_READS_PER_WINDOW}`);
  console.log(`distinct keys the other windows give those addresses (addressKey): ${keys.size} -> ${[...keys][0]}`);
  console.log(`a visitor at another address, same minute:  ${site.admit("198.51.100.20", t0 + 1000)}`);
  console.log(`that visitor after the minute ends:         ${site.admit("198.51.100.20", t0 + 61_000)}`);
}


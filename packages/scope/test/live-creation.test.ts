/** LV1 cannot pin or run live before LV2's platform mode. Real runtime/SQLite; no outside service or browser runs. */
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Intent, type Seed } from "@generalbusiness/dap-contract";
import { definitionDigest, intentDigest, scopeIdOf, signIntent, timeOf } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { liveBase } from "../../derive/test/definition-corpus/live-data.ts";
import { rita, stubOf } from "./fixtures-native.ts";

test("LV1 runtime creation refuses live with no retained writes; the recorded counterpart creates", async () => {
  for (const live of [false, true]) {
    const declared = liveBase(live);
    expect(validateDefinition(declared, PROPOSED_BOUNDS).ok).toBe(true);
    const intent: Intent = { v: 1, to: null, actor: rita.key, kind: declared.genesis, on: null, expected: {}, fields: {},
      idempotencyKey: crypto.randomUUID(), notAfter: timeOf(Date.now() + 60_000) };
    const signed = signIntent(intent, rita.secret);
    const seed: Seed = { v: 1, kind: "directory", definition: definitionDigest(declared), creator: null, cause: intentDigest(intent), ordinal: 0 };
    const name = scopeIdOf(seed), id = env.AS_DEPLOYED.idFromName(name), object = env.AS_DEPLOYED.get(id);
    const snapshot = () => runInDurableObject(object, async (_instance, state) => {
      const tables = state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").toArray();
      const rows = tables.map(({ name }) => [name, state.storage.sql.exec(`SELECT * FROM "${name.replaceAll('"', '""')}"`).toArray()]);
      return { rows, kv: [...await state.storage.list()], alarm: await state.storage.getAlarm() };
    });
    const before = await snapshot();
    const answer = await stubOf(name, env.AS_DEPLOYED).create(signed, declared);
    if (live) {
      expect(answer).toEqual({ answer: "refused", reason: "unsupported-definition" });
      expect(await snapshot()).toEqual(before);
    } else {
      expect(answer).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 0 } } });
      expect(await snapshot()).not.toEqual(before);
    }
  }
});

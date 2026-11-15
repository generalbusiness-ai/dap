import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Where } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { created, grantOf, keys, t, valid, type Ledger } from "@generalbusiness/dap-derive/testing";
import { lending, lendingClosure } from "./definition.ts";
import { LENDING_DEFINITION } from "./pin.ts";
import { destination, donation, make, over, submit } from "./test-support.ts";
const room = (s: Ledger) => ({ grants: [keys.rita, keys.una, keys.vic].map((who) => ({ grant: grantOf(who, s.at, who === keys.rita ? ["lending.member", "lending.staff"] : ["lending.member"]), current: true })) });
const wrote = (j: Awaited<ReturnType<typeof submit>>) => expect(j.result, JSON.stringify(j)).toBe("write");
const donate = async (s: Ledger, who: typeof keys.rita, name: string, description = "Copper.") => { wrote(await submit(s, who, "donate", donation(s, name, description), room(s))); return s.last.seq; };
const act = (s: Ledger, who: typeof keys.rita, kind: string, id: number, fields = {}) => submit(s, who, kind, over(s, id, fields), room(s));

// Retain R's prerequisite fixture independently of the production reservation forms.
function reservationContract(where: readonly Where[] = [
 { equals: { a: { slot: "tool" }, b: { field: "tool" } } },
 { equals: { a: { slot: "day" }, b: { field: "day" } } },
]): DeclaredDefinition {
 const base = structuredClone(lending);
 delete base.acts["release"];
 delete base.acts["release-by-staff"];
 return {
  ...base, name: "lending-reservation-contract",
  items: { ...base.items, reservation: {
   many: true, max: 8, initial: "held", states: { held: { final: false }, lapsed: { final: true } },
   parties: {}, refs: { tool: { fixed: true, required: true, to: { type: "item", of: "thing" } } },
   values: {
    day: { fixed: true, required: true, of: { type: "text", max: 10 } },
    until: { fixed: true, required: true, of: { type: "time" } },
   },
  } },
  acts: { ...base.acts, reserve: {
   step: "open", on: "reservation", also: {}, grant: "lending.member",
   fields: { tool: { type: "item", of: "thing", required: true }, day: { type: "text", max: 10, required: true }, until: { type: "time", required: true } },
   guards: [{ none: { type: "reservation", states: ["held"], where }, reason: "tool-day-taken" }],
   effects: [
    { ref: { slot: "tool", from: { field: "tool" } } },
    { value: { slot: "day", from: { field: "day" } } },
    { value: { slot: "until", from: { field: "until" } } },
   ], sends: [], attention: [],
  } },
  timed: { lapse: { on: "reservation", states: ["held"], deadline: "until", effects: [{ state: "lapsed" }], attention: [] } },
 };
}
function reservationLedger() {
 const checked = validateDefinition(reservationContract(), PROPOSED_BOUNDS, RULE_PROFILES);
 expect(checked.ok ? [] : checked.problems).toEqual([]);
 return created(valid(checked), { opener: keys.rita.member, destination });
}
const reserve = (tool: number, day = "2026-11-14") => ({ expected: {}, fields: { tool, day, until: t(30) } });

test("reservation contract: a timed lapse changes only its reservation and availability reads its state", async () => {
 const s = reservationLedger(), tool = await donate(s, keys.rita, "Drill");
 wrote(await submit(s, keys.una, "reserve", reserve(tool), room(s)));
 const reservation = s.last.seq, before = structuredClone(s.item(tool));
 s.now = t(30);
 expect(s.drain().map(judgment => judgment.result)).toEqual(["write"]);
 expect(s.last.input).toMatchObject({ type: "timed", item: reservation, rule: "lapse", due: t(30) });
 expect(s.item(reservation).state).toBe("lapsed");
 expect(s.item(tool)).toEqual(before);
 expect(s.last.effects.every(effect => !("item" in effect) || effect.item === reservation)).toBe(true);
 expect(s.judge(s.intent(keys.vic, "reserve", reserve(tool)), room(s)).result).toBe("write");
 expect(s.replay().snapshot()).toBe(s.state.snapshot());

 const outside = reservationContract();
 outside.timed["lapse"]!.effects = [{ of: "also.tool", state: "lent" }];
 const refused = validateDefinition(outside, PROPOSED_BOUNDS, RULE_PROFILES);
 expect(refused.ok).toBe(false);
 if (!refused.ok) expect(refused.problems.some(problem => problem.path.startsWith("timed.lapse.effects.0"))).toBe(true);
});

test("reservation contract: Where admits equals and differs but refuses an ordered comparison", () => {
 const equals = reservationContract(), differs = reservationContract([
  { equals: { a: { slot: "tool" }, b: { field: "tool" } } },
  { differs: { a: { slot: "day" }, b: { field: "day" } } },
 ]);
 for (const definition of [equals, differs]) {
  const checked = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
  expect(checked.ok ? [] : checked.problems).toEqual([]);
 }
 const ordered = reservationContract(), guard = ordered.acts["reserve"]!.guards[0]!;
 if (!("none" in guard)) throw new Error("The contract fixture needs its availability range");
 // Deliberately malformed runtime data enters the real validator without widening Where.
 Object.assign(guard.none, { where: [{ lessThan: { a: { slot: "day" }, b: { field: "day" } } }] });
 const refused = validateDefinition(ordered, PROPOSED_BOUNDS, RULE_PROFILES);
 expect(refused.ok).toBe(false);
 if (!refused.ok) expect(refused.problems.some(problem => problem.path.startsWith("acts.reserve.guards.0.none.where.0"))).toBe(true);
});

test("reservation contract: same-head opens share no revision and the second loses at the named guard", async () => {
 const s = reservationLedger(), tool = await donate(s, keys.rita, "Drill");
 const first = s.intent(keys.una, "reserve", reserve(tool)), second = s.intent(keys.vic, "reserve", reserve(tool));
 expect(first.intent.actor).not.toBe(second.intent.actor);
 expect([first.intent.expected, second.intent.expected]).toEqual([{}, {}]);
 // Both judgments use the same head and clock, before either act is recorded.
 expect([s.judge(first, room(s)).result, s.judge(second, room(s)).result]).toEqual(["write", "write"]);
 wrote(s.submit(first, room(s)));
 const count = s.entries.length, fresh = s.judge(second, room(s));
 expect(fresh).toMatchObject({ result: "refused", reason: "guard-failed", name: "tool-day-taken" });
 expect(s.submit(second, room(s))).toEqual(fresh);
 expect(s.entries).toHaveLength(count);
 expect(s.judge(s.intent(keys.vic, "reserve", reserve(tool, "2026-11-15")), room(s)).result).toBe("write");
 expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

test("production reservation slots compare opaque day labels and lapse without changing their tool", async () => {
 const s = make(), tool = await donate(s, keys.rita, "Drill"), before = structuredClone(s.item(tool));
 for (const day of ["2026-11-14", "2026/11/14"]) {
  wrote(await submit(s, keys.una, "reserve", reserve(tool, day), room(s)));
  expect(s.item(s.last.seq)).toMatchObject({ state: "held", refs: { tool }, values: { day, until: t(30) } });
 }
 const count = s.entries.length;
 expect(await submit(s, keys.vic, "reserve", reserve(tool), room(s))).toMatchObject({ result: "refused", reason: "guard-failed", name: "tool-day-taken" });
 expect(s.entries).toHaveLength(count);
 s.now = t(30);
 expect(s.drain().map(judgment => judgment.result)).toEqual(["write", "write"]);
 expect(s.item(tool)).toEqual(before);
 wrote(await submit(s, keys.vic, "reserve", { expected: {}, fields: { tool, day: "2026-11-14", until: t(60) } }, room(s)));
 expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

test("two live holds per member: holder or staff release frees a slot without changing its tool", async () => {
 const s = make(), tool = await donate(s, keys.rita, "Drill"), before = structuredClone(s.item(tool));
 wrote(await submit(s, keys.una, "reserve", reserve(tool, "2026-11-14"), room(s)));
 const first = s.last.seq;
 wrote(await submit(s, keys.una, "reserve", reserve(tool, "2026-11-15"), room(s)));
 const second = s.last.seq, count = s.entries.length;
 expect(s.item(first).parties["holder"]).toEqual(keys.una.member);
 expect(await submit(s, keys.una, "reserve", reserve(tool, "2026-11-16"), room(s))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.1" });
 const release = (id: number) => ({ on: id, expected: { on: s.item(id).revision }, fields: {} });
 expect(await submit(s, keys.vic, "release", release(first), room(s))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.1" });
 expect(s.entries).toHaveLength(count);
 wrote(await submit(s, keys.una, "release", release(first), room(s)));
 expect(s.item(first).state).toBe("released");
 wrote(await submit(s, keys.vic, "reserve", reserve(tool, "2026-11-14"), room(s)));
 expect(s.item(s.last.seq)).toMatchObject({ state: "held", parties: { holder: keys.vic.member } });
 // This grant has staff authority alone: the alternate act does not require membership authority.
 wrote(await submit(s, keys.rita, "release-by-staff", release(second), { grants: [{ grant: grantOf(keys.rita, s.at, ["lending.staff"]), current: true }] }));
 expect(s.item(second).state).toBe("released");
 for (const day of ["2026-11-15", "2026-11-16"]) wrote(await submit(s, keys.una, "reserve", reserve(tool, day), room(s)));
 expect(s.item(tool)).toEqual(before);
 expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

test("the declaration is its canonical bytes and pin, with publication tells and a local reservation lapse", () => {
 const checked = validateDefinition(lending, PROPOSED_BOUNDS, RULE_PROFILES);
 expect(checked.ok ? [] : checked.problems).toEqual([]);
 expect(lendingClosure).toEqual([lending]);
 const bytes = readFileSync(new URL("./definition.json", import.meta.url));
 expect(canonicalize(parseStrict(bytes.toString("utf8")))).toBe(canonicalize(lending)); expect(parseStrict(bytes.toString("utf8"))).toEqual(lending);
 expect(definitionDigest(lending)).toBe(LENDING_DEFINITION);
 expect([lending.capabilities, lending.receives]).toEqual([[], {}]);
 expect(Object.fromEntries(Object.entries(lending.acts).map(([kind, act]) => [kind, act.sends.length]))).toEqual({ establish: 0, donate: 1, borrow: 1, return: 1, cancel: 1, publish: 1, reserve: 0, release: 0, "release-by-staff": 0 });
 expect(lending.timed).toEqual({ lapse: { on: "reservation", states: ["held"], deadline: "until", effects: [{ state: "lapsed" }], attention: [] } });
});

test("Nasruddin and the pot: nine steps, two refusals, every accepted act sends its stored page, and the record refolds", async () => {
 const s = make(), libraryRevision = s.item(0).revision;
 expect(s.item(0).refs["destination"]).toEqual(destination);
 const big = await donate(s, keys.rita, "Big pot", "A heavy copper pot. Holds eight litres.");
 const path = s.item(big).values["page"];
 wrote(await act(s, keys.una, "borrow", big));
 expect(s.item(big)).toMatchObject({ state: "lent", parties: { borrower: keys.una.member } });
 expect(await act(s, keys.vic, "borrow", big)).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.0" });
 wrote(await act(s, keys.una, "return", big));
 expect(s.item(big).parties["borrower"]).toBeNull();
 const small = await donate(s, keys.una, "Small pot", "Baby born when the big pot was with me");
 wrote(await act(s, keys.una, "borrow", big));
 expect(await act(s, keys.una, "cancel", big, { reason: "The pot died" })).toMatchObject({ result: "refused", reason: "unauthorized" });
 wrote(await act(s, keys.rita, "cancel", big, { reason: "Nasruddin says the pot died" }));
 expect(s.item(big)).toMatchObject({ state: "gone", values: { reason: "Nasruddin says the pot died", page: path } });
 const fresh = await donate(s, keys.rita, "New big pot");
 expect(s.state.page("thing", ["available", "lent", "gone"], null, 64).items.map(x => [x.id, x.state])).toEqual([[big, "gone"], [small, "available"], [fresh, "available"]]);
 expect(s.entries.map(({entry}) => entry.input.type === "act" ? entry.input.signed.intent.kind : entry.input.type)).toEqual(["genesis", "donate", "borrow", "return", "donate", "borrow", "cancel", "donate"]);
 for (const {entry} of s.entries.slice(1)) expect(entry.sends).toHaveLength(1);
 expect(s.item(0).revision).toBe(libraryRevision);
 expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

test("shelf paths belong to one thing forever, publication repairs a gone thing without changing it, and oversized content is refused", async () => {
 const s = make(), fixed = "shelf/0123456789abcdef.md";
 for (const page of ["README.md", "shelf/../x.md", "shelf/x.txt"]) expect(await submit(s, keys.rita, "donate", donation(s, "Pot", "Copper", page))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.0" });
 wrote(await submit(s, keys.rita, "donate", donation(s, "Pot", "Copper", fixed))); const id = s.last.seq;
 expect(await submit(s, keys.una, "donate", donation(s, "Other", "Copper", fixed))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.1" });
 wrote(await act(s, keys.una, "borrow", id)); wrote(await act(s, keys.vic, "return", id)); wrote(await act(s, keys.rita, "cancel", id, {reason:"Lost"}));
 for (const kind of ["borrow", "return", "cancel"]) expect(await act(s, keys.rita, kind, id, kind === "cancel" ? { reason: "Again" } : {})).toMatchObject({ result: "refused", reason: "final" });
 expect(await submit(s, keys.una, "donate", donation(s, "Other", "Copper", fixed))).toMatchObject({ result: "refused", reason: "guard-failed", detail: "guards.1" });
 const before = [s.item(0), s.item(id)];
 wrote(await submit(s, keys.una, "publish", {on:0, expected:{on:s.item(0).revision, thing:s.item(id).revision}, fields:{thing:id,content:"Corrected gone page"}}, room(s)));
 expect([s.item(0), s.item(id)]).toEqual(before);
 expect(s.last.sends[0]).toMatchObject({to:destination,message:{class:"request",type:"tell",body:{message:"publish-file",fields:{path:fixed,content:"Corrected gone page"}}}});
 expect(await submit(s, keys.una, "publish", {on:0, expected:{on:s.item(0).revision, thing:s.item(id).revision}, fields:{thing:id,content:"x".repeat(4097)}}, room(s))).toMatchObject({result:"refused",reason:"bad-field"});
 expect(s.replay().snapshot()).toBe(s.state.snapshot());
});

test("64 live things and bounded text: cancellation frees capacity while the gone page remains owned", async () => {
 const s=make();
 for (const [name, description] of [["n".repeat(81),"d"],["n","d".repeat(1001)]]) expect(await submit(s,keys.rita,"donate",donation(s,name!,description!))).toMatchObject({result:"refused",reason:"bad-field"});
 const first=await donate(s,keys.rita,"n".repeat(80),"d".repeat(1000));
 expect(await act(s,keys.rita,"cancel",first,{reason:"r".repeat(281)})).toMatchObject({result:"refused",reason:"bad-field"});
 for(let n=2;n<=64;n++) await donate(s,keys.una,`Thing ${n}`);
 expect(await submit(s,keys.una,"donate",donation(s,"Thing65","Too many"))).toMatchObject({result:"refused",reason:"type-full"});
 wrote(await act(s,keys.rita,"cancel",first,{reason:"r".repeat(280)})); await donate(s,keys.una,"Thing65");
 expect(s.state.count("thing","available")).toBe(64); expect(s.state.count("thing","gone")).toBe(1);
});

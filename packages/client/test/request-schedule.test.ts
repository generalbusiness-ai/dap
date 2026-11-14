import { expect, test } from "vitest";
import { Lost } from "../src/custody.ts";
import { RequestSchedule, type ClientClock } from "../src/request-schedule.ts";

function scene() {
  let now = 0, next = 0;
  const timers = new Map<number, { at: number; run(): void }>();
  const clock: ClientClock = { now: () => now, set(run, delay) { const id = next++; timers.set(id, { at: now + delay, run }); return id; },
    clear(id) { timers.delete(id as number); } };
  const schedule = new RequestSchedule(clock);
  const advance = (by: number): void => {
    now += by;
    for (;;) {
      const ready = [...timers].find(([, due]) => due.at <= now);
      if (!ready) break;
      timers.delete(ready[0]); ready[1].run();
    }
  };
  return { schedule, timers, advance, jump: (by: number) => { now += by; } };
}

// Invariant: retry wakeups and send deadlines share one earliest timer, and close owns every pending callback.
test("one timer owns wakeups and send expiry; a late reply and close publish no answer", async () => {
  const s = scene(), seen: number[] = [];
  const first = {}, second = {};
  s.schedule.at(first, 1000, () => seen.push(1));
  s.schedule.at(second, 2000, () => seen.push(2));
  let resolve!: (value: string) => void;
  const send = s.schedule.bounded(() => new Promise<string>(done => { resolve = done; }));
  const rejected = expect(send).rejects.toBeInstanceOf(Lost);
  await Promise.resolve();
  expect(s.timers.size).toBe(1);
  s.advance(1000); expect(seen).toEqual([1]); expect(s.timers.size).toBe(1);
  s.advance(1000); expect(seen).toEqual([1, 2]); expect(s.timers.size).toBe(1);
  s.advance(28_000); await rejected;
  resolve("late"); await Promise.resolve();
  expect(s.timers.size).toBe(0);
  const closed = s.schedule.bounded(() => new Promise<void>(() => {}));
  const ended = expect(closed).rejects.toBeInstanceOf(Lost);
  s.schedule.at({}, 40_000, () => seen.push(3));
  s.schedule.close(); await ended;
  expect(s.timers.size).toBe(0);
  s.advance(100_000); expect(seen).toEqual([1, 2]);
});

// Invariant: a delayed timer callback cannot admit a reply after the send deadline.
test("a suspended timer still rejects a reply at the thirty-second deadline", async () => {
  const s = scene();
  let resolve!: (value: string) => void;
  const send = s.schedule.bounded(() => new Promise<string>(done => { resolve = done; }));
  const rejected = expect(send).rejects.toBeInstanceOf(Lost);
  await Promise.resolve();
  s.jump(30_000);
  resolve("too late");
  await rejected;
  expect(s.timers.size).toBe(0);
});

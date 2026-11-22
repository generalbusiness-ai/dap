# Count fulfilled pledges across Counting histories

*Enumerate small, closed sets of histories.*

Status: design decision under request `d9477b7f`, 2026-11-21. Full
`npm run gate` pending before review.

**Guarantee.** Within one Counting Commitments generation, the board's
`lastNumber` equals the number of pledges the scope has fulfilled.

dap tests a guarantee over a small, closed set of histories by
enumerating them without a generator or shrinking library.

Keep one pure test that tries all 16 pairs of pledge resolutions.
The fixed sequence `fulfill → fail` exposes the control fault. The matrix
also checks how each of the four resolutions preserves or advances the
total after every preceding resolution. The [4 November ruling](reports/2026-11-04-sprint-report.md#decisions)
`d6aa9122` asks for one guarantee and the smallest mechanism that delivers
it. The earlier assessments `7f7def61` and `baa75642` informed that ruling.

Each resolution checks the current board through `resolution-plan` and
determines the next count through its own effects, so pairs exercise
each resolution against the count the preceding resolution leaves. The fixture uses target
three to keep both fulfillments below the target. This witness covers
resolutions before the board finishes.

## The test

The [Counting test file](../apps/counter/commitments.test.ts) already has
the helpers this test uses. Its `act()` helper gives each actor every
grant in the definition. The witness therefore checks the count, with
the judge's signer guards still in place. The expected total comes from
successful resolutions in the test history. The production count helps
shape the next submitted pledge through `claimFields`, and the assertion
compares that count with the independently tracked total.

```ts
test("lastNumber counts fulfilled pledges across every pair of resolutions", async () => {
  const resolutions = ["fulfill", "fail", "cancel", "expire"] as const;
  for (const first of resolutions) for (const second of resolutions) {
    const s = make(3), participant = await activate(s, keys.una);
    let fulfilled = 0;
    for (const step of [first, second]) {
      if (board(s).state === "paused") await wrote(act(s, keys.rita, "start"));
      await wrote(act(s, keys.una, "commit", claimFields(s, participant)));
      const held = promise(s);
      if (step === "expire") {
        s.now = held.values["until"] as typeof s.now;
        expect(s.drain().map(j => j.result)).toEqual(["write", "write"]);
      } else {
        const fields = resolution(s, held.id);
        await wrote(act(s, step === "cancel" ? keys.rita : keys.una, step,
          step === "fail" ? { ...fields, reason: "process-error" } : fields, held.id));
      }
      if (step === "fulfill") fulfilled++;
      expect(board(s).values["lastNumber"], [first, second].join(" → ")).toBe(fulfilled);
    }
  }
});
```

## What the control shows

In a scratch copy of main `95ec0456`, the control added a write of zero
to `lastNumber` in the [`fail` effect](../apps/counter/commitments.ts).
The control changes the definition bytes, so the run deselected the
byte-pin test. The four behavior tests, including the new one, passed
on the original source. With the control, the three existing tests passed and
the new test failed by assertion at `fulfill → fail`. It expected one
and read zero. The gitseq record `12449934` retains the combined
`scripts/control.mjs` output as `counting-fulfillment-control.log`.

The independent scratch run of the four behavior tests, including the
new one, took 1.25 seconds wall time. Running the new test alone took
1.18 seconds wall time, including test startup. The fixed order needs no
seed. The [test-stage runner](../scripts/test.mjs) includes the Counting
project in its `plain` phase.

The [native Counting witness](../packages/scope/test/counting-commitments.test.ts)
checks a count of one after cancellation and expiry after a fulfillment.
It fails a pledge only after resetting the total. That is a source
reading. The control did not run the native suite.

## What this asks of a test author

Here the author supplies four resolution names and a count. Two loops
give the histories a deterministic order and the assertion identifies a
failure by its two resolutions. The test needs no separate model.

The [settlement ledger](implementation/2026-11-04-settlement-ledger.md)
uses an expected ledger that never reads the production fold. The
[card histories](implementation/2026-11-04-card-history.md) derive fixed
seeds from history indices and use gates for event order. The
[Git framing variants](implementation/2026-11-04-git-framing-variants.md)
enumerate bounded wire forms and use independent object bytes. In each,
the author supplies the model, the choices, and the boundary the test
drives.

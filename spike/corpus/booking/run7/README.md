# Booking run 7: public actor and payload leaks

The checker found that the original readable-event budget did not check
the actors or private fields of occupancy, free and clock events. The
amended guard fails 99 of 200 seeds before any repair. Every failing seed
is listed in `seeds.txt`, with its full original script, genesis nonce and
violations under `full/`, and a deletion-minimal public-event leak in
`seed-<n>.json`. Each record pins the manifest and original package.

Reproduce with `node scripts/booking-public-campaign.ts` at the commit
whose subject is "spike V4: checker run 7 snapshot: preserve public actor
and payload leaks". That snapshot preserves the unrepaired foundation,
model and client. Later foundation or client repairs change the outcome;
replaying a literal disclosure that ignores the repaired client policy
can still expose a private attempt.

Shrinking preserves the readable public actor/payload failure. Removing
steps can invalidate a request-id reference without removing that
failure. The full seed-1 script therefore also retains the exact case
from V4-F1: Carol's public occupancy at position 50 names her earlier
private request, followed by Alice's publication of that same id.

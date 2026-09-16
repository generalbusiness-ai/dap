# Booking run 7: public actor and payload leaks

The checker found that the original readable-event budget did not check
the actors or private fields of occupancy, free and clock events. The
amended guard fails 99 of 200 seeds before any repair. Every failing seed
is listed in `seeds.txt`, with its full original script, genesis nonce and
violations under `full/`, and a deletion-minimal public-event leak in
`seed-<n>.json`. Each record pins the manifest and original package.

Reproduce with `node scripts/booking-public-campaign.ts` at commit
`7ffa50814ec558781feeeae09b36ff8f089c2fb4` ("spike V4: checker run 7
snapshot: preserve public actor and payload leaks"). `boundary.txt`
pins that snapshot, manifest, original package and the Git blob ids of
the relevant foundation, replay, generator, model and manifest files.
That snapshot preserves the unrepaired foundation,
model and client. Later foundation or client repairs change the outcome;
replaying a literal disclosure that ignores the repaired client policy
can still expose a private attempt.

The kept `model.ts` differs from that snapshot only in import paths. It
lets the seed-1 regression recreate the old client's choices under the
new foundation; it does not by itself recreate the old foundation.

Shrinking preserves the readable public actor/payload failure. Removing
steps can invalidate a request-id reference without removing that
failure. The full seed-1 script therefore also retains the exact case
from V4-F1: Carol's public occupancy at position 50 names her earlier
private request, followed by Alice's publication of that same id.

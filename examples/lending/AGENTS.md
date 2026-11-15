# Lending reservation requests

Write every reservation's `day` as `YYYY-MM-DD` and supply its `until`
explicitly. Treat this spelling as a convention, not a scope guard.
The scope compares opaque day text of at most ten bytes. Two spellings
of the same calendar day occupy different slots. The scope never checks
that `until` falls on `day` and applies no calendar or timezone policy.

Keep the original signed reservation after sending it. A named
`tool-day-taken` refusal means a held reservation already occupies the
exact tool and day label. The lapse changes the reservation alone.

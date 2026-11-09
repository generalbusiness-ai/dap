---- MODULE Observation ----
EXTENDS Naturals
VARIABLES phase, active, pending, obsolete, paintedLate
vars == <<phase, active, pending, obsolete, paintedLate>>
Init == phase = "Reading" /\ active = TRUE /\ pending = TRUE /\ obsolete = FALSE /\ paintedLate = FALSE
Invalidate == active /\ active'= FALSE /\ obsolete'= TRUE /\ phase'= "Cancelled" /\ UNCHANGED <<pending, paintedLate>>
ReadReturns == pending /\ active /\ ~obsolete /\ pending'= FALSE /\ phase'= "Current" /\ paintedLate'= obsolete /\ UNCHANGED <<active, obsolete>>
Discard == pending /\ ~active /\ pending'= FALSE /\ UNCHANGED <<phase, active, obsolete, paintedLate>>
Wait == phase \in {"Cancelled"} /\ UNCHANGED vars
Next == Invalidate \/ ReadReturns \/ Discard \/ Wait
NoObsoletePaint == ~paintedLate
====

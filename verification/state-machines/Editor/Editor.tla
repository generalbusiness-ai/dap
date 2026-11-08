---- MODULE Editor ----
EXTENDS Naturals
VARIABLES phase, accepted, verified, advanced
vars == <<phase, accepted, verified, advanced>>
Init == phase = "Prepared" /\ accepted = FALSE /\ verified = FALSE /\ advanced = FALSE
Attempt == phase = "Prepared" /\ phase'= "Unknown" /\ UNCHANGED <<accepted, verified, advanced>>
Accept == phase = "Unknown" /\ ~accepted /\ accepted'= TRUE /\ phase'= "Checking receipt" /\ UNCHANGED <<verified, advanced>>
Verify == accepted /\ ~verified /\ verified'= TRUE /\ phase'= "Receipt verified" /\ UNCHANGED <<accepted, advanced>>
Advance == verified /\ ~advanced /\ advanced'= TRUE /\ phase'= "Next stage ready" /\ UNCHANGED <<accepted, verified>>
Refuse == phase = "Unknown" /\ phase'= "Refused" /\ UNCHANGED <<accepted, verified, advanced>>
Wait == phase \in {"Next stage ready", "Refused"} /\ UNCHANGED vars
Next == Attempt \/ Accept \/ Verify \/ Advance \/ Refuse \/ Wait
EvidenceBeforeProgress == advanced => accepted /\ verified
====

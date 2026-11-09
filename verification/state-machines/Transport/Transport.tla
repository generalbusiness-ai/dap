---- MODULE Transport ----
EXTENDS Naturals
VARIABLES phase, pending, retired
vars == <<phase, pending, retired>>
Init == phase = "Opening" /\ pending = TRUE /\ retired = FALSE
FactoryReturns == pending /\ pending'= FALSE /\ phase'= (IF retired THEN phase ELSE "Connected") /\ UNCHANGED retired
Retire == ~retired /\ phase'= "Retired" /\ retired'= TRUE /\ UNCHANGED pending
LateFactoryDisposed == phase = "Retired" /\ ~pending /\ phase'= "Closed" /\ UNCHANGED <<pending, retired>>
Wait == phase \in {"Closed"} /\ UNCHANGED vars
Next == FactoryReturns \/ Retire \/ LateFactoryDisposed \/ Wait
NoRevival == retired => phase # "Connected"
====

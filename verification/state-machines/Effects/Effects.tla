---- MODULE Effects ----
EXTENDS Naturals
VARIABLES phase, marked, permit, sends, decisive
vars == <<phase, marked, permit, sends, decisive>>
Init == phase = "Recorded" /\ marked = FALSE /\ permit = FALSE /\ sends = 0 /\ decisive = FALSE
Mark == ~marked /\ marked'= TRUE /\ permit'= TRUE /\ phase'= "May have been sent" /\ UNCHANGED <<sends, decisive>>
Send == permit /\ sends < 2 /\ sends'= sends + 1 /\ permit'= FALSE /\ phase'= "Waiting for answer" /\ UNCHANGED <<marked, decisive>>
Restart == marked /\ ~decisive /\ permit'= FALSE /\ phase'= "Unknown" /\ UNCHANGED <<marked, sends, decisive>>
LateAnswer == marked /\ ~decisive /\ decisive'= TRUE /\ permit'= FALSE /\ phase'= "Settled" /\ UNCHANGED <<marked, sends>>
Wait == phase \in {"Settled"} /\ UNCHANGED vars
Next == Mark \/ Send \/ Restart \/ LateAnswer \/ Wait
AtMostOneSend == sends <= 1
MarkBeforeEffect == sends > 0 => marked
====

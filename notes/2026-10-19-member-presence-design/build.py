"""Generate fictional D1 member/presence snapshots. No service or signing."""
from pathlib import Path
from html import escape as E
import base64
import hashlib
import json

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "examples"
OUT.mkdir(exist_ok=True)
THEMES = ["light", "dark"]

def ident(label, prefix, size):
    return prefix + (base64.urlsafe_b64encode(hashlib.sha256(label.encode()).digest()[:size]).decode().rstrip("=") if prefix == "key_" else base64.b32encode(hashlib.sha256(label.encode()).digest()[:size]).decode().lower().rstrip("="))

MEMBERSHIP = {"scope": ident("D1 fictional membership", "sc_", 32), "inc": ident("D1 fictional incarnation", "in_", 16), "kind": "membership"}
ROOM_A = {"scope": ident("D1 fictional Room A", "sc_", 32), "inc": ident("D1 fictional Room A incarnation", "in_", 16), "kind": "lane"}
REFERENCE = {"membership": MEMBERSHIP, "member": "@unresolved"}
PAGES = {}
MEMBER_FIXTURES = {}


def link(key, title, theme, css="quiet"):
    return f'<a class="control {css}" href="{key}-{theme}.html">{E(title)}</a>'


def member(theme, handle="@maya", kind="person", state="active", presence=None, controller="@maya", eligibility=None, compact=False):
    if handle is None:
        raw = E(json.dumps(REFERENCE, separators=(",", ":")))
        return f'<div class="member-unavailable"><strong>Member unavailable</strong><code>{raw}</code><p class="muted">Presence unavailable · eligibility unknown</p></div>'
    MEMBER_FIXTURES.setdefault(handle, {"handle": handle, "kind": kind, "state": state, "controller": controller})
    parts = handle.lstrip("@").replace("-", " ").split()
    initials = "".join(p[0] for p in parts[:2]).upper() if len(parts) > 1 else handle.lstrip("@")[:2].upper()
    state_word = {"invited": "invited", "removed": "removed", "lapsed": "invitation lapsed", "unknown": "standing unavailable"}.get(state, "")
    detail = f'{kind}' + (f' · <span class="state-word">{state_word}</span>' if state_word else "")
    controlled = '<span class="controller">' + (f'controlled by {E(controller)}' if controller else 'controller unavailable') + '</span>' if kind == "agent" else ""
    mark = f'<span class="mark {kind} {state}" aria-hidden="true"><span>{E(initials)}</span></span>'
    target = {"@maya": "record-person", "@climate": "record-agent", "@eli": "record-removed-found"}.get(handle, "record-" + handle.lstrip("@"))
    identity = f'<a class="member-identity" href="{target}-{theme}.html">{mark}<span class="identity-copy"><strong>{E(handle)}</strong><span class="kind-line">{detail}</span>{controlled}</span></a>'
    extra = ""
    if presence:
        mode, text = presence
        extra = f'<p class="presence {E(mode, quote=True)}">{text}</p>'
    if eligibility:
        extra += f'<p class="eligibility muted">{E(eligibility)}</p>'
    return f'<div class="member {"compact" if compact else ""}" data-kind="{kind}" data-state="{state}">{identity}{extra}</div>'


def page(key, title, body, theme, source="Recorded design", back="index"):
    filename = f"{key}-{theme}.html"
    back_html = link(back, "Back", theme) if key != "index" else ""
    document = f'''<!doctype html><html lang="en" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>{E(title)} · D1 static design</title><link rel="icon" href="../../../brand/dist/favicon.svg"><link rel="stylesheet" href="../../../brand/tokens.css"><link rel="stylesheet" href="../../../brand/fonts.css"><link rel="stylesheet" href="../mockups.css"></head><body><div class="preview-label">Static design · fictional data · {E(source)}</div><main id="card-root" data-page="{key}"><nav>{back_html}</nav>{body}</main><footer class="preview-foot">No service, act, lease or native receipt. Links open fixed design snapshots.</footer></body></html>'''
    (OUT / filename).write_text(document + "\n")
    PAGES[filename] = {"key": key, "title": title, "theme": theme, "source": source}


CASES = [
    ("person-active", "Active person", dict(), "Recorded identity. Active has no redundant state word."),
    ("agent-active", "Active agent", dict(handle="@climate", kind="agent"), "The controller accompanies every agent element."),
    ("checker-active", "Active checker", dict(handle="@checks", kind="checker"), "The checker keeps its outlined diamond; initials remain upright."),
    ("invited", "Invited member", dict(handle="@lina", state="invited"), "Outlined mark and the word invited."),
    ("removed", "Removed member", dict(handle="@eli", state="removed"), "State is known. Removal provenance appears only on the record."),
    ("lapsed", "Lapsed invitation", dict(handle="@noor", state="lapsed"), "Muted mark; invitation lapsed is explicit."),
    ("agent-invited", "Invited agent", dict(handle="@agent-invited", kind="agent", state="invited"), "Sharp outlined square; invited and controlled by remain explicit."),
    ("agent-removed", "Removed agent", dict(handle="@agent-removed", kind="agent", state="removed"), "Muted square; removed and controlled by remain explicit."),
    ("agent-lapsed", "Lapsed agent invitation", dict(handle="@agent-lapsed", kind="agent", state="lapsed"), "Muted square and invitation lapsed; the controller stays readable."),
    ("checker-invited", "Invited checker", dict(handle="@checker-invited", kind="checker", state="invited"), "The diamond stays outlined. The invited word distinguishes standing."),
    ("checker-removed", "Removed checker", dict(handle="@checker-removed", kind="checker", state="removed"), "Muted outlined diamond and removed; initials stay upright."),
    ("checker-lapsed", "Lapsed checker invitation", dict(handle="@checker-lapsed", kind="checker", state="lapsed"), "Muted outlined diamond and invitation lapsed."),
    ("controller-unavailable", "Agent controller unavailable", dict(handle="@irrigation", kind="agent", controller=None), "A controller is not guessed from a role or another agent."),
    ("long-identity", "Long agent identity", dict(handle="@climate-observation-and-room-recovery-for-west-house", kind="agent", controller="@maya-operator-for-the-west-house-growing-rooms"), "The full handle and controller wrap inside the identity target; neither is shortened."),
    ("identity-unavailable", "Identity unavailable", dict(handle=None), "Keep the raw full reference; infer no handle, kind or initials."),
    ("standing-unavailable", "Standing unavailable", dict(state="unknown", eligibility="Eligibility unknown; role unavailable."), "Identity remains readable. No role is inferred."),
    ("eligible", "Action held at this read", dict(eligibility="Holds grow.heat at this read."), "The receiving scope still judges the actual act."),
    ("ineligible", "Action not held", dict(handle="@tender", eligibility="Does not hold grow.heat at this read."), "The identity link reads a record and supplies no authority."),
    ("live-available", "Live available", dict(presence=("live", '<span class="badge">available</span>')), "Live expression · B4 design only."),
    ("live-busy", "Live busy", dict(presence=("live", '<span class="badge">busy</span>')), "Live expression · B4 design only."),
    ("live-waiting", "Live waiting", dict(presence=("live", '<span class="badge">waiting</span>')), "Live expression · B4 design only."),
    ("live-blocked", "Live blocked", dict(presence=("live", '<span class="badge">blocked</span>')), "Live expression · B4 design only."),
    ("live-here", "Live focus includes this subject", dict(presence=("live", '<span class="badge">busy</span><span class="here"><span aria-hidden="true">•</span> here</span>')), "Here means the viewer's exact subject is in the reported focus."),
    ("live-focus-only", "Live focus without a status", dict(presence=("live", '<span class="here"><span aria-hidden="true">•</span> here</span>')), "A focus-only lease supplies here, without inventing available or busy. B4 design only."),
    ("live-lease", "Live lease within its window", dict(presence=("live", '<span class="badge">busy</span><span class="provenance">seen 12 s ago · lease ends in 18 s</span>')), "Fixed capture at 14:02:30 UTC. This live lease is known to end at 14:02:48 UTC; recorded presence has no freshness."),
    ("live-note", "Live note", dict(presence=("live", '<span class="badge">blocked</span><span class="note">Waiting for the heater decision.</span>')), "A member's reported note is text, not an inferred intention."),
    ("live-projection", "Several live sessions", dict(presence=("live", '<span class="badge">blocked</span><span class="here"><span aria-hidden="true">•</span> here</span><span class="note">Waiting for the heater decision.</span><span class="provenance">projection · 3 sessions</span>')), "Blocked over waiting over busy over available; union of focus; first note."),
    ("recorded-here", "Reported in this room", dict(presence=("recorded", 'in Room A, reported at entry 412 <span class="here"><span aria-hidden="true">•</span> here</span>')), "The room's full scope matches the viewer. Entry 412 comes from reportedAt."),
    ("recorded-elsewhere", "Reported in another room", dict(presence=("recorded", 'in Room B, reported at entry 517')), "The viewer is in Room A. The label alone cannot establish here."),
    ("recorded-partial", "Reported room address unavailable", dict(presence=("recorded", 'in Room A<span class="provenance">room address unavailable</span>')), "No here marker until the room item exposes its full scope."),
    ("recorded-left", "Left the recorded room", dict(presence=("recorded", 'left Room A at entry 518')), "The away state is a report, not live absence."),
    ("recorded-report-unavailable", "Present report fact unavailable", dict(presence=("recorded", 'in Room A<span class="provenance">report entry unavailable</span>')), "An item revision never replaces a missing report fact."),
    ("recorded-left-report-unavailable", "Leave report fact unavailable", dict(presence=("recorded", 'left Room A<span class="provenance">report entry unavailable</span>')), "Known room/state remain; no entry position is fabricated."),
    ("recorded-not-reported", "No arrival reported", dict(presence=("recorded", 'no arrival reported')), "An unknown provisioned item or no item is not absence."),
    ("presence-unavailable", "Presence source unavailable", dict(presence=("recorded", 'Presence unavailable')), "Identity and known standing remain. No offline or absent claim."),
    ("live-absent-known", "Live lease ended", dict(presence=("absent", 'last seen at 14:02:30 UTC<span class="provenance">known lease end · no status badge</span>')), "Only a known lease end permits last seen."),
    ("live-absent-unknown", "No live lease information", dict(), "No badge and no last-seen time when the lease end is unknown. Live B4 preview."),
    ("ready-not-present", "Provisioned agent, attendance unknown", dict(handle="@climate", kind="agent", presence=("provisioning", 'provisioning ready<span class="provenance">Presence unavailable</span>')), "Provisioning ready never means attending."),
    ("late-opening", "Recorded report beyond the activity window", dict(handle="@rita", presence=("recorded", 'in Room A, reported at entry 2 <span class="here"><span aria-hidden="true">•</span> here</span>')), "At Site head 103, reportedAt is entry 2 and item revision 1. Recent activity, last 100 entries: state unknown. No wider scan."),
    ("moved-report", "Move uses the report fact", dict(handle="@rita", presence=("recorded", 'in Room B, reported at entry 108')), "Opened at entry 8; revision 2; last report 108. A wrong-room leave does not move this fixed snapshot."),
]

for theme in THEMES:
    for key, title, props, explanation in CASES:
        mode = "Live B4 design only" if key.startswith("live-") else "Recorded design"
        body = f'<p class="eyebrow">Member element</p><h1>{E(title)}</h1>' + member(theme, **props) + f'<p class="specification">{E(explanation)}</p>'
        page(key, title, body, theme, mode)
    people = [
        dict(presence=("recorded", 'in Room A, reported at entry 412 <span class="here"><span aria-hidden="true">•</span> here</span>')),
        dict(handle="@tender", presence=("recorded", 'in Room A, reported at entry 407 <span class="here"><span aria-hidden="true">•</span> here</span>')),
        dict(handle="@climate", kind="agent", presence=("recorded", 'Presence unavailable')),
        dict(handle="@checks", kind="checker", presence=("recorded", 'no arrival reported')),
        dict(handle="@lina", state="invited", presence=("recorded", 'no arrival reported')),
        dict(handle="@eli", state="removed", presence=("recorded", 'left Room A at entry 398')),
    ]
    rows = ''.join('<li>' + member(theme, **p) + '</li>' for p in people)
    page("members", "Members", '<p class="eyebrow">Grow site · recorded source</p><h1>Members</h1><p class="muted">6 members · where they last reported</p><ul class="member-list">'+rows+'</ul><p class="read-point">Membership entry 560 · Site entry 518</p>', theme)
    overflow = ''.join('<li>'+member(theme, handle=f'@guest-{i:02}', presence=("recorded", 'no arrival reported'))+'</li>' for i in range(1,33))
    page("members-overflow", "Member display bound", '<p class="eyebrow">Captured view bound</p><h1>Members</h1><p class="notice">32 resolved references shown. 5 more references were not resolved because this view reached its bound.</p><ul class="member-list">'+overflow+'</ul><p class="muted">37 distinct references in this fixed example; no hidden resolution or automatic scan.</p>', theme)
    for key, title, person in [("record-person", "@maya", dict()), ("record-agent", "@climate", dict(handle="@climate", kind="agent"))]:
        role = 'admin' if key == 'record-person' else 'agent'
        keys = '<dl class="facts"><dt>Role</dt><dd>'+role+'</dd><dt>Member opened</dt><dd>Membership entry 8</dd><dt>Key one</dt><dd><code>'+ident(key+' key1','key_',32)+'</code><span>active · '+('agent' if role=='agent' else 'device')+'</span></dd><dt>Key two</dt><dd><code>'+ident(key+' key2','key_',32)+'</code><span>retired</span></dd></dl>'
        actions = '<section class="actions"><h2>Membership actions</h2><p class="muted">Shown to an authorized admin on this kit-owned screen. Static previews only.</p><div class="controls"><button disabled>Invite key</button>'+('<button disabled>Set role</button>' if role!='agent' else '')+'<button class="remove" disabled>Remove member</button></div></section>'
        body = '<p class="eyebrow">Member record · kit-owned</p><h1>'+title+'</h1>'+member(theme, **person, presence=("recorded", 'in Room A, reported at entry 412'))+keys+actions+ '<p class="read-point">Presence reportedAt names Site entry 412; this is not a lease.</p>'
        page(key,title+' member record',body,theme,back="members")
    for key, sentence in [("record-removed-found","removed at entry 540"),("record-removed-old","removal entry not in the last 100 entries"),("record-removed-unavailable","removal entry unavailable")]:
        body = '<p class="eyebrow">Member record · kit-owned</p><h1>@eli</h1>'+member(theme,handle="@eli",state="removed",presence=("recorded",'left Room A at entry 398'))+'<dl class="facts"><dt>State</dt><dd>removed</dd><dt>Last recorded role</dt><dd>member</dd><dt>Member opened</dt><dd>Membership entry 23</dd><dt>Removal provenance</dt><dd>'+sentence+'</dd><dt>Key</dt><dd>retired · identity remains known</dd></dl><p class="read-point">One bounded Membership window, entries 461–560. '+('Read unavailable; no completeness claim.' if key.endswith('unavailable') else 'Complete captured window.')+'</p>'
        page(key,'Removed member: '+sentence,body,theme,back="members")
    own = '<p class="eyebrow">Your presence · kit-owned</p><h1>Your presence</h1>'+member(theme,presence=("live",'<span class="badge">busy</span><span class="here"><span aria-hidden="true">•</span> here</span>'))+'<fieldset disabled><legend>Status</legend><div class="status-options">'+''.join(f'<label><input type="radio" name="status" {"checked" if state=="busy" else ""}>{state}</label>' for state in ['available','busy','waiting','blocked'])+'</div><label for="note">Note · up to 160 UTF-8 bytes</label><textarea id="note" readonly>Checking the heater decision.</textarea></fieldset><dl class="facts"><dt>Focus held by the service</dt><dd>Room A · zone 2</dd><dt>Source</dt><dd>Live presence · design for B4</dd><dt>Sessions</dt><dd>1 session · own key only</dd></dl><div class="controls"><button disabled>Save presence</button><button disabled>Leave presence</button></div><p class="notice">Live executor and renewal are not implemented. This fixed preview sends no Enter, Renew or Leave act.</p>'
    page('own-presence','Your live presence control',own,theme,'Live B4 design only',back='own-header')
    header = '<div class="header-row"><h1>Room A</h1>'+link('own-presence','Your presence · busy',theme)+'</div><p class="eyebrow">Kit-owned header · B4 design only</p><h2>Cut heater 2?</h2><p>The card identifies the member. Only your own header opens presence controls.</p>'+member(theme,handle='@climate',kind='agent',presence=("live",'<span class="badge">blocked</span><span class="note">Waiting for the heater decision.</span>'))
    page('own-header','Presence in the kit header',header,theme,'Live B4 design only')
    recorded = '<p class="eyebrow">Your presence · recorded source</p><h1>Your reported room</h1>'+member(theme,presence=("recorded",'in Room A, reported at entry 412 <span class="here"><span aria-hidden="true">•</span> here</span>'))+'<p class="muted">The recorded item supplies a room and a report fact. It supplies no live status, note, lease or renewal.</p><p>No live presence control is available from this source.</p>'
    page('own-recorded','Your recorded presence',recorded,theme)
    # Every identity link remains bound to its own fictional member,
    # including unavailable-controller and overflow examples.
    for handle, fixture in list(MEMBER_FIXTURES.items()):
        if handle in ["@maya", "@climate", "@eli"]:
            continue
        role = "agent" if fixture["kind"] == "agent" else "checker" if fixture["kind"] == "checker" else "member"
        raw = E(json.dumps({"membership": MEMBERSHIP, "member": handle}, separators=(",", ":")))
        keys = 'Retired key · removed member' if fixture["state"] == "removed" else 'No active key · invitation lapsed' if fixture["state"] == "lapsed" else 'No active key · invited member' if fixture["state"] == "invited" else 'One active '+('agent' if role == 'agent' else 'checker' if role == 'checker' else 'device')+' key'
        body = '<p class="eyebrow">Member record · kit-owned</p><h1>'+E(handle)+'</h1>'+member(theme, **fixture)+'<dl class="facts"><dt>Role</dt><dd>'+role+'</dd><dt>Member reference</dt><dd><code>'+raw+'</code></dd><dt>Keys</dt><dd>'+keys+'</dd></dl><p class="muted">Presence unavailable. No status, room or report entry is inferred.</p>'
        page('record-'+handle.lstrip('@'),handle+' member record',body,theme,back='members')

    nav = '<p class="eyebrow">D1 · member and presence</p><h1>Static design packet</h1><p>Fixed fictional members. Recorded and future live expressions stay separate.</p><h2>Member element states</h2><ul class="index-list">'+''.join('<li>'+link(k,t,theme)+'</li>' for k,t,_,_ in CASES)+'</ul><h2>Kit-owned screens</h2><ul class="index-list">'+''.join('<li>'+link(k,t,theme)+'</li>' for k,t in [('members','Member list'),('members-overflow','Bounded list with overflow'),('record-person','Person record'),('record-agent','Agent record'),('record-removed-found','Removal found'),('record-removed-old','Removal outside complete window'),('record-removed-unavailable','Removal read unavailable'),('own-header','Own presence in header'),('own-presence','Own live control, B4'),('own-recorded','Own recorded presence')])+'</ul>'
    page('index','D1 design index',nav,theme,back='index')

manifest = {"v":1,"fictional":True,"native_execution":False,"base_main":"3ed2a08a50f31e84ea42b4f6027684e14a8cedb8","design_head":"c16fe0aa3a5d22e7cc5b44030122ee524b813a43","state_cases":[k for k,_,_,_ in CASES],"pages":PAGES,"membership":MEMBERSHIP,"roomA":ROOM_A}
(ROOT / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({"pages":len(PAGES),"states":len(CASES),"themes":THEMES}))

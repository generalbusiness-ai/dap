#!/usr/bin/env python3
"""Static mockups for the grow-operation design note.

Writes one HTML page per state and theme into this directory. The data is
fictional and fixed, so the pages are reproducible. No dependencies.

    python3 build.py
"""

from __future__ import annotations

import html
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
SET, BAND = 24.0, 2.0
ROWS = "ABCDEFGHIJ"
ZONES = [
    (1, "north-west", range(0, 5), range(0, 5)),
    (2, "north-east", range(0, 5), range(5, 10)),
    (3, "south-west", range(5, 10), range(0, 5)),
    (4, "south-east", range(5, 10), range(5, 10)),
]
STOPS = {
    "light": [(20, 210, 60, 82), (24, 150, 35, 80), (26, 70, 60, 76), (28, 25, 85, 68), (30, 0, 80, 60)],
    "dark": [(20, 210, 45, 32), (24, 150, 25, 30), (26, 90, 35, 32), (28, 25, 70, 42), (30, 0, 75, 48)],
}


def esc(s: object) -> str:
    return html.escape(str(s), quote=True)


def colour(t: float, theme: str) -> str:
    stops = STOPS[theme]
    x = max(20.0, min(30.0, t))
    i = 0
    while i < len(stops) - 2 and x > stops[i + 1][0]:
        i += 1
    a, b = stops[i], stops[i + 1]
    f = (x - a[0]) / (b[0] - a[0])
    h, s, l = (a[k] + (b[k] - a[k]) * f for k in (1, 2, 3))
    return f"hsl({h:.0f} {s:.0f}% {l:.0f}%)"


def zone_of(i: int) -> int:
    r, c = divmod(i, 10)
    return (0 if r < 5 else 2) + (0 if c < 5 else 1) + 1


def cells(hot: bool) -> list[float]:
    out = []
    for i in range(100):
        r, c = divmod(i, 10)
        base = 24.1 + math.sin(i * 7.3) * 0.35 + math.cos(i * 2.1) * 0.25
        if hot and zone_of(i) == 2:
            d = math.hypot(r, 9 - c) / 10
            base = 28.2 - 1.9 * d + math.sin(i * 3.1) * 0.15
        out.append(round(base, 1))
    return out


def zone_stats(cs: list[float]):
    out = []
    for zid, name, rs, cs_ in ZONES:
        vals = [cs[r * 10 + c] for r in rs for c in cs_]
        out.append((zid, name, round(sum(vals) / len(vals), 1), round(max(vals), 1), all(SET - BAND <= v <= SET + BAND for v in vals)))
    return out


def grid(cs: list[float], theme: str, labels: bool = True) -> str:
    head = '<div class="cols"><span></span>' + "".join(f"<span>{c + 1}</span>" for c in range(10)) + "</div>" if labels else ""
    rows = []
    for r in range(10):
        row = f'<span class="rl">{ROWS[r]}</span>' if labels else ""
        for c in range(10):
            i = r * 10 + c
            t = cs[i]
            out = " out" if (t < SET - BAND or t > SET + BAND) else ""
            cls = "cell" + (" zr" if c == 4 else "") + (" zb" if r == 4 else "") + out
            row += f'<span class="{cls}" style="background:{colour(t, theme)}" title="{ROWS[r]}{c + 1} · {t:.1f}°" role="img" aria-label="{ROWS[r]}{c + 1} {t:.1f}°"></span>'
        rows.append(f'<div class="row">{row}</div>')
    return f'<div class="grid">{head}{"".join(rows)}</div>'


def mini(cs: list[float], theme: str) -> str:
    return '<span class="mini">' + "".join(f'<i style="background:{colour(t, theme)}"></i>' for t in cs) + "</span>"


def legend(theme: str) -> str:
    g = ",".join(colour(t, theme) for t in (20, 22, 24, 26, 28, 30))
    return f'<div class="legend"><span class="scale" style="background:linear-gradient(to right,{g})"></span><span class="tag">20°</span><span class="tag mid">{SET - BAND:.0f}–{SET + BAND:.0f}° band</span><span class="tag">30°</span></div>'


def who(name: str, kind: str, controller: str | None = None) -> str:
    ctl = f'<span class="ctl"> · {esc(controller)}</span>' if controller else ""
    return f'<span class="who"><span class="mk {kind}"></span>{esc(name)}{ctl}</span>'


def devices(z: int, hot: bool) -> str:
    if z == 2 and hot:
        return ('<span class="dev bad" title="commanded open, reads closed, no response">vent error</span>'
                '<span class="dev bad" title="overcurrent trip, stopped">fan error</span><span class="dev">heater on</span>')
    lvl = "100%" if hot and z in (1, 4) else "60%"
    return f'<span class="dev">vent {lvl}</span><span class="dev">fan 40%</span><span class="dev">heater on</span>'


def page(name: str, theme: str, width: int, body: str, title: str) -> None:
    doc = f"""<!doctype html>
<html lang="en" data-theme="{theme}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>dap design · {esc(title)} · {theme}</title>
<link rel="stylesheet" href="grow-mockups.css"></head>
<body><main class="chat" style="max-width:{width}px">{body}</main></body></html>
"""
    (HERE / f"{name}-{theme}.html").write_text(doc)


def alert_block(mean2: float) -> str:
    return (f'<div class="alert"><p class="at"><span class="warn">▲</span> Zone 2 is at {mean2:.1f}° and rising. Vent 2: commanded open, reads closed, no response. Fan 2: overcurrent trip, stopped.</p>'
            '<p class="ap">Cut heater 2 and hold it off until zone 2 is back in band. <span class="muted">Heaters are outside my authority.</span></p>'
            '<div class="acts"><button class="b p">Authorize</button><button class="b">Hold 60 s</button><button class="ask">Ask the assistant</button></div></div>')


def grid_card(theme: str, hot: bool) -> str:
    cs = cells(hot)
    zs = zone_stats(cs)
    n = sum(1 for v in cs if SET - BAND <= v <= SET + BAND)
    rows = "".join(
        f'<li class="{"" if ok else "hot"}"><a href="zone-{theme}.html"><b>Z{z}</b> {esc(name)}</a><span class="t {"" if ok else "bad"}">{m:.1f}°</span>{devices(z, hot)}</li>'
        for z, name, m, mx, ok in zs)
    status = "Waiting for the operator" if hot else "All zones in band"
    return (f'{alert_block(zs[1][2]) if hot else ""}'
            f'<div class="top">{who("Climate agent", "agent", "the operator")}<span class="tag">Grow room A · entry {306 if hot else 301}</span></div>'
            f'<div class="tabs"><span class="on">Temperature</span><span>Moisture</span><span>Scouting</span></div>'
            f'<div class="room"><div>{grid(cs, theme)}{legend(theme)}</div><div class="side">'
            f'<p class="stats"><b>{n}</b> of 100 in band<br><span class="muted">min {min(cs):.1f}° · mean {sum(cs) / 100:.1f}° · max {max(cs):.1f}°</span></p>'
            f'<ul class="zones">{rows}</ul></div></div>'
            f'<p class="act-line">{"<span class=pulse></span>" if hot else ""}{status}<a class="log-link" href="#">Log ›</a></p>')


def spark(points: list[float], w: int = 240, h: int = 56) -> str:
    lo, hi = min(SET - BAND - 1, *points), max(SET + BAND + 1, *points)
    x = lambda i: i / (len(points) - 1) * w
    y = lambda t: h - (t - lo) / (hi - lo) * h
    pts = " ".join(f"{x(i):.1f},{y(t):.1f}" for i, t in enumerate(points))
    return (f'<svg class="spark" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-label="last {len(points)} readings">'
            f'<rect x="0" y="{y(SET + BAND):.1f}" width="{w}" height="{y(SET - BAND) - y(SET + BAND):.1f}" class="bandfill"/>'
            f'<polyline points="{pts}" class="line"/><circle cx="{w}" cy="{y(points[-1]):.1f}" r="3" class="dot"/></svg>')


def zone_card(theme: str) -> str:
    hist = [25.0 + 0.05 * i for i in range(20)] + [26.0 + 0.065 * i for i in range(20)] + [27.3 + 0.015 * i for i in range(20)]
    zs = zone_stats(cells(True))[1]
    return (f'<div class="top"><a class="back" href="grid-alert-{theme}.html">‹ Back</a><span class="tag">zone 2 · out of band · v3</span></div>'
            f'<h2>Zone 2 · north-east <span class="tag">{zs[2]:.1f}°</span></h2>{spark(hist)}'
            f'<div class="facts">{devices(2, True)}<span class="tag">max {zs[3]:.1f}°</span></div>'
            f'<p class="rules">The climate agent may open or close vents and set fans. Heaters, the setpoint and the band need the operator.</p>'
            f'<div class="acts"><button class="b p">Heater off</button><button class="b" disabled title="commanded open, reads closed, no response">Vent open</button></div>')


def overview_card(theme: str) -> str:
    a, b, c = cells(True), cells(False), [v - 0.9 if i in (3, 13) else v for i, v in enumerate(cells(False))]
    rows = [
        ("Room A", a, "1 alert open", "Maya", True),
        ("Room B", b, "", None, False),
        ("Room C", c, "", "Theo", False),
    ]
    items = ""
    for name, cs, note, person, bad in rows:
        n = sum(1 for v in cs if SET - BAND <= v <= SET + BAND)
        items += (f'<li class="{"hot" if bad else ""}"><a href="grid-{"alert" if bad else "normal"}-{theme}.html">{mini(cs, theme)}<b>{esc(name)}</b></a>'
                  f'<span class="t {"bad" if bad else ""}">{n} of 100</span>'
                  f'<span class="dev {"bad" if bad else ""}">{esc(note) if note else "in band"}</span>'
                  f'<span class="dev">{who(person, "person") if person else "nobody in the room"}</span></li>')
    return (f'<div class="top">{who("Climate agent", "agent", "the operator")}<span class="tag">Site · 3 rooms</span></div>'
            f'<ul class="rooms">{items}</ul>'
            f'<p class="act-line"><span class="pulse"></span>Room A: alert 1 waits for you<a class="log-link" href="#">Log ›</a></p>')


def tender_task(theme: str) -> str:
    return (f'<div class="slide">{who("Climate agent", "agent", "the operator")}<h2><a class="open" href="#">Check vent 2’s actuator</a></h2>'
            f'<p class="sum">Room A, zone 2 · reads closed, no response · you are in room A</p></div>'
            f'<div class="acts"><button class="b p">Take</button></div>'
            f'<div class="pager"><button class="b nav" disabled aria-label="Previous">‹</button><span class="count">1 / 4</span><button class="b nav" aria-label="Next">›</button></div>')


def tender_bench(theme: str) -> str:
    return (f'<div class="slide">{who("Theo", "person")}<h2><a class="open" href="#">Bench C4</a></h2>'
            f'<p class="sum">moisture 31% · EC 2.1 · pH 5.9 · Theo probed it 2 days ago</p></div>'
            f'<p class="hint">Type the new probe in the chat.</p>'
            f'<div class="pager"><button class="b nav" aria-label="Previous">‹</button><span class="count">2 / 4</span><button class="b nav" aria-label="Next">›</button></div>')


def main() -> None:
    for theme in ("light", "dark"):
        page("overview", theme, 560, f'<p class="host">Here is the site.</p><div class="card">{overview_card(theme)}</div>', "Overview")
        page("grid-normal", theme, 560, f'<p class="host">Here is room A.</p><div class="card">{grid_card(theme, False)}</div>', "Room A, all in band")
        page("grid-alert", theme, 560, f'<p class="host">Here is room A.</p><div class="card">{grid_card(theme, True)}</div>', "Room A, alert open")
        page("zone", theme, 560, f'<p class="host">Here is room A.</p><div class="card">{zone_card(theme)}</div>', "Zone 2")
        page("tender-task", theme, 320, f'<p class="host">Here is what needs you.</p><div class="card">{tender_task(theme)}</div>', "Tender: a task")
        page("tender-bench", theme, 320, f'<p class="host">Here is what needs you.</p><div class="card">{tender_bench(theme)}</div>', "Tender: a stale bench")
    print("built 12 pages")


if __name__ == "__main__":
    main()

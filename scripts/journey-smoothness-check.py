# Per-frame homepage journey smoothness trace (Round G).
# python3 scripts/journey-smoothness-check.py [URL]   (default http://localhost:8080/)
# For every paged transition at 390x844 touch and 1280x800 / 1440x900 wheel it checks:
#  (a) scrollY strictly monotonic from gesture to landing
#  (b) at the landing frame old layer <= 0.02, new layer >= 0.98, copy >= 0.98, then no
#      opacity/transform change for 600 ms
#  (c) <= 3 frames over 50 ms per transition
#  (d) a 12 x 8 px trackpad burst moves exactly one stage
#  (e) boundary flicks land on Discovery / Little Falls / the next section's top
#  (f) a 100 px hero drag stays on the hero
#  (g) outgoing layer takes >= 350 ms from 0.9 to 0.1, monotonic (no cut)
import asyncio, json, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"

STOPS_JS = """() => [...document.querySelectorAll('[data-journey-section]')].map(sec => {
  const n = sec.querySelectorAll('.journey-layer').length, vh = sec.querySelector('.journey-viewport').offsetHeight;
  const base = scrollY + sec.getBoundingClientRect().top, total = sec.offsetHeight - vh;
  const f = k => k <= 0 ? 0 : k >= n - 1 ? 1 : (k + 0.4) / n;
  return { stops: [...Array(n)].map((_, k) => Math.round(base + total * f(k))), end: Math.round(base + sec.offsetHeight) };
})"""

REC_JS = """() => { window.__rec = []; let last = performance.now();
  const op = e => { let o = 1; for (; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const step = now => { const secs = [...document.querySelectorAll('[data-journey-section]')];
    const s = secs.map(sec => ({ L: [...sec.querySelectorAll('.journey-layer')].map(l => [+getComputedStyle(l).opacity, getComputedStyle(l).transform]),
      c: sec.querySelector('.journey-copy') ? op(sec.querySelector('.journey-copy')) : 0 }));
    window.__rec.push({ t: now, dt: now - last, y: scrollY, s, html: document.documentElement.className }); last = now;
    if (window.__rec.length < 4000 && !window.__stop) requestAnimationFrame(step); };
  window.__stop = false; requestAnimationFrame(step); }"""

async def trace(pg, gesture, wait=1900):
    await pg.evaluate(REC_JS); await gesture(); await pg.wait_for_timeout(wait)
    await pg.evaluate("window.__stop = true"); await pg.wait_for_timeout(50)
    return await pg.evaluate("window.__rec")

def analyse(rec, j, k, target, y0):
    # landing = first frame at target
    idx = next((i for i, r in enumerate(rec) if abs(r["y"] - target) <= 1), None)
    moved = [r["y"] for r in rec[: (idx or len(rec)) + 1]]
    mono = all(b >= a - 0.5 for a, b in zip(moved, moved[1:])) and min(moved) >= y0 - 0.5
    back = min((b - a for a, b in zip(moved, moved[1:])), default=0)
    if idx is None: return dict(ok=False, why=f"never landed (end {rec[-1]['y']:.0f} vs {target})", mono=mono)
    L = rec[idx]["s"][j]; old = L["L"][k - 1][0]; new = L["L"][k][0]; copy = L["c"]
    land_t = rec[idx]["t"]
    after = [r for r in rec[idx:] if r["t"] - land_t <= 600]
    still = all(json.dumps(r["s"]) == json.dumps(after[0]["s"]) and abs(r["y"] - target) <= 1 for r in after)
    # first frame after landing that matched the final state (how long the old layer lingers)
    settle = next((r["t"] - land_t for r in rec[idx:] if r["s"][j]["L"][k - 1][0] <= 0.02 and r["s"][j]["c"] >= 0.98), None)
    long_frames = sum(1 for r in rec[1: idx + 1] if r["dt"] > 50)
    ops = [r["s"][j]["L"][k - 1][0] for r in rec[: idx + 1]]
    fmono = all(b <= a + 1e-3 for a, b in zip(ops, ops[1:]))
    t9 = next((r["t"] for r in rec[: idx + 1] if r["s"][j]["L"][k - 1][0] <= 0.9), None)
    t1 = next((r["t"] for r in rec[: idx + 1] if r["s"][j]["L"][k - 1][0] <= 0.1), None)
    fade = None if t9 is None or t1 is None else round(t1 - t9)
    ok = mono and old <= 0.02 and new >= 0.98 and copy >= 0.98 and still and long_frames <= 3 and fmono and fade is not None and fade >= 350
    return dict(ok=ok, fade=fade, fmono=fmono, mono=mono, back=round(back), old=round(old, 3), new=round(new, 3), copy=round(copy, 3), still=still, long=long_frames, settle=None if settle is None else round(settle), dur=round(land_t - rec[0]["t"]))

async def touch_drag(cdp, x, y0, dy, ms, steps=10):
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y0}]})
    for i in range(1, steps + 1):
        await asyncio.sleep(ms / steps / 1000)
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y0 - dy * i / steps}]})
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})

async def rest(pg):
    prev, same = -1, 0
    while same < 4:
        await pg.wait_for_timeout(100); v = await pg.evaluate("scrollY"); same = same + 1 if abs(v - prev) < 0.5 else 0; prev = v
    return round(prev)

async def to(pg, v): await pg.evaluate("v => scrollTo({top: v, behavior: 'instant'})", v); await pg.wait_for_timeout(500)

async def run(b, w, h, touch):
    ctx = await b.new_context(viewport={"width": w, "height": h}, is_mobile=touch, has_touch=touch)
    pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg)
    await pg.goto(URL, wait_until="networkidle"); await pg.wait_for_timeout(1200)
    J = await pg.evaluate(STOPS_JS)
    label = f"{w}x{h} {'touch' if touch else 'wheel'}"
    html = await pg.evaluate("document.documentElement.className")
    print(f"\n== {label}  html: {html}")
    one = (lambda: touch_drag(cdp, w / 2, h * 0.6, 60, 120)) if touch else (lambda: pg.mouse.wheel(0, 100))
    results = []
    for j, jr in enumerate(J):
        for k in range(1, len(jr["stops"])):
            await to(pg, jr["stops"][k - 1]); y0 = await pg.evaluate("scrollY")
            if not touch: await pg.mouse.move(w / 2, h / 2)
            rec = await trace(pg, one)
            r = analyse(rec, j, k, jr["stops"][k], y0); results.append(r)
            print(f"[{label}] J{j} {k-1}->{k}: {r}")
    # (d) trackpad burst
    burst = None
    if not touch:
        S = J[0]["stops"]; await to(pg, S[1])
        async def b12():
            for _ in range(12): await pg.mouse.wheel(0, 8); await asyncio.sleep(0.02)
        await b12(); end = await rest(pg)
        moved = sum(1 for s in S if S[1] < s <= end + 2)
        burst = moved == 1; print(f"[{label}] (d) 12x8px burst from {S[1]} -> {end}: stages moved {moved}")
    # (e) boundary flicks
    async def flick():
        if touch: await touch_drag(cdp, w / 2, h * 0.8, 420, 140, 7)
        else:
            for _ in range(4): await pg.mouse.wheel(0, 100); await asyncio.sleep(0.03)
    edges = []
    for name, start, want in [("hero->Discovery", 0, J[0]["stops"][0]), ("Right seat->Little Falls", J[0]["stops"][-1], J[1]["stops"][0]), ("Cottonwood->below", J[1]["stops"][-1], J[1]["end"])]:
        await to(pg, start); await flick(); end = await rest(pg)
        ok = abs(end - want) <= 3; edges.append(ok); print(f"[{label}] (e) {name}: {start} -> {end}, want {want}: {ok}")
    # (f) small hero drag
    await to(pg, 0)
    if touch: await touch_drag(cdp, w / 2, h * 0.6, 100, 300, 10)
    else: await pg.mouse.wheel(0, 100)
    end = await rest(pg); small = end < J[0]["stops"][0] - 0.3 * h; print(f"[{label}] (f) 100px hero move: 0 -> {end}: stays on hero {small}")
    await ctx.close()
    return results, burst, edges, small

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        summary = []
        for w, h, t in [(390, 844, True), (1280, 800, False), (1440, 900, False)]:
            res, burst, edges, small = await run(b, w, h, t)
            summary.append((w, h, t, sum(r["ok"] for r in res), len(res), burst, edges, small))
        await b.close()
    print("\nSUMMARY")
    bad = False
    for w, h, t, ok, n, burst, edges, small in summary:
        print(f"{w}x{h} {'touch' if t else 'wheel'}: transitions {ok}/{n}, burst one stage {burst}, edges {edges}, hero drag stays {small}")
        bad |= ok != n or burst is False or not all(edges) or not small
    sys.exit(1 if bad else 0)

asyncio.run(main())

# Homepage journey walk: smallest downward gestures land on every stop; upward flicks never snap back.
# Run with the dev server on :8080: python3 scripts/journey-walk-check.py
import asyncio, json, sys
from playwright.async_api import async_playwright
URL="http://localhost:8080/"
async def stops(page): return await page.evaluate("window.__journeyStops ? window.__journeyStops() : null")
async def y(page): return await page.evaluate("Math.round(window.scrollY)")
async def walk(page, gesture, label):
    await page.goto(URL, wait_until="networkidle"); await page.wait_for_function("!!window.__journeyStops", timeout=60000); await page.wait_for_timeout(800)
    S = await stops(page); assert S, "no stops exposed"
    fails=[]; n=0
    while True:
        cur=await y(page); tgt=next((s for s in S if s>cur+2),None)
        if tgt is None: break
        await gesture(); await page.wait_for_timeout(1100)
        S2=await stops(page); now=await y(page); n+=1
        tgt=next((s for s in S2 if s>cur+2),None); S=S2
        ok = tgt is not None and abs(now-tgt)<=3
        print(f"[{label}] gesture {n}: {cur} -> {now} (expected {tgt}) {'OK' if ok else 'FAIL'}")
        if not ok: fails.append((cur,now,tgt))
        if n>40: break
    return fails, n
async def up_check(page, flick, label):
    # go to the last stage of the airport journey then flick up
    S=await stops(page)
    await page.evaluate(f"window.scrollTo(0,{S[-2]})"); await page.wait_for_timeout(800)
    start=await y(page); await flick()
    # wait until motion ends
    prev=-1; same=0
    while same<3:
        await page.wait_for_timeout(100); v=await y(page); same = same+1 if v==prev else 0; prev=v
    ended=prev; await page.wait_for_timeout(1200); rest=await y(page)
    info=await page.evaluate("""() => [...document.querySelectorAll('.journey-layer')].map(l=>({stack:l.hasAttribute('data-stack'),t:l.style.transform,o:l.style.opacity})).filter(x=>x.o!=='0')""")
    translated=all(x['stack'] and 'translate3d(0' in x['t'] for x in info) and len(info)>0
    print(f"[{label}] up flick: {start} -> motion ended {ended} -> after rest {rest}; visible layers {info}")
    return start>ended and ended==rest and translated
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True); allfails=[]; ups=[]
        ctx=await b.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True,device_scale_factor=2)
        page=await ctx.new_page(); cdp=await ctx.new_cdp_session(page)
        async def touch(y0,y1,steps,ms):
            await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":195,"y":y0}]})
            for i in range(1,steps+1):
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":195,"y":y0+(y1-y0)*i/steps}]}); await asyncio.sleep(ms/1000/steps)
            await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        f,n=await walk(page, lambda: touch(500,484,2,80), "phone 16px drag"); allfails+=f
        ups.append(await up_check(page, lambda: touch(300,700,6,90), "phone"))
        await page.screenshot(path="/tmp/phone_up.png")
        ctx2=await b.new_context(viewport={"width":1280,"height":800}); pg=await ctx2.new_page()
        async def notch(): await pg.mouse.move(640,400); await pg.mouse.wheel(0,100)
        f,n2=await walk(pg, notch, "desktop wheel notch"); allfails+=f
        async def upflick():
            await pg.mouse.move(640,400)
            for _ in range(12): await pg.mouse.wheel(0,-120); await asyncio.sleep(0.016)
        ups.append(await up_check(pg, upflick, "desktop"))
        await pg.screenshot(path="/tmp/desktop_up.png")
        print("RESULT down-fails:", allfails, "up-ok:", ups)
        await b.close()
asyncio.run(main())

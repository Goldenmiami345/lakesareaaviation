# Homepage journey walk: native boundaries, pinned paging, and mouse-free reversals.
# Run with the dev server on :8080: python3 scripts/journey-walk-check.py
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
URL="http://localhost:8080/"
async def stops(page): return await page.evaluate("window.__journeyStops ? window.__journeyStops() : null")
async def y(page): return await page.evaluate("Math.round(window.scrollY)")
async def walk(page, gesture, label):
    await page.goto(URL, wait_until="networkidle"); await page.wait_for_function("!!window.__journeyStops", timeout=60000); await page.wait_for_timeout(800)
    S = await stops(page); assert S, "no stops exposed"
    fails=[]; n=0
    for group in [S[:6],S[6:]]:
        # Boundaries are native. Begin the test at a fully pinned first stage.
        await page.evaluate('(v)=>scrollTo({top:v,behavior:"instant"})',group[0]); await page.wait_for_timeout(250)
        for tgt in group[1:]:
            cur=await y(page); await gesture(); await page.wait_for_timeout(750)
            now=await y(page); n+=1; ok=abs(now-tgt)<=3
            print(f'[{label}] pinned {cur} -> {now}, expected {tgt}: {ok}')
            if not ok: fails.append((cur,now,tgt))
        cur=await y(page); await gesture(); await page.wait_for_timeout(750); now=await y(page)
        assert now>cur and now-cur<400, f'{label}: last stage exit was forced/stuck {cur}->{now}'
        rest=now; await page.wait_for_timeout(900); assert await y(page)==rest,'native exit settled'
    # Native hero entry must not jump to the first stop.
    await page.evaluate('(v)=>scrollTo({top:v,behavior:"instant"})',S[0]-80); await page.wait_for_timeout(250)
    await gesture(); await page.wait_for_timeout(750); cur=await y(page)
    assert cur<S[1]-3, f'{label}: entry forced a stage glide'
    return fails, n
async def up_check(page, flick, label):
    # go to the last stage of the airport journey then flick up
    S=await stops(page)
    await page.evaluate("(v)=>scrollTo({top:v,behavior:'instant'})",S[-1]); await page.wait_for_timeout(800)
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
    Path('/tmp/browser/journey').mkdir(parents=True,exist_ok=True)
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
        await page.screenshot(path="/tmp/browser/journey/phone-up.png")
        ctx2=await b.new_context(viewport={"width":1280,"height":800}); pg=await ctx2.new_page()
        async def notch(): await pg.mouse.wheel(0,100)
        f,n2=await walk(pg, notch, "desktop wheel notch"); allfails+=f
        async def upflick():
            for _ in range(12): await pg.mouse.wheel(0,-120); await asyncio.sleep(0.016)
        ups.append(await up_check(pg, upflick, "desktop"))
        await pg.screenshot(path="/tmp/browser/journey/desktop-up.png")
        # Mouse never moves anywhere in this desktop context.
        for burst in [False,True]:
            S=await stops(pg); await pg.evaluate('(v)=>scrollTo({top:v,behavior:"instant"})',S[0]); await pg.wait_for_timeout(300)
            async def down():
                if burst:
                    for _ in range(20): await pg.mouse.wheel(0,5); await asyncio.sleep(.02)
                else: await pg.mouse.wheel(0,100)
            for _ in range(3): await down(); await pg.wait_for_timeout(750)
            for _ in range(8): await pg.mouse.wheel(0,-50); await asyncio.sleep(.06)
            await pg.wait_for_timeout(300)
            for i in range(4):
                before=await y(pg)
                if burst:
                    task=asyncio.create_task(down()); await pg.wait_for_timeout(280)
                    after=await y(pg); await task
                else:
                    await down(); await pg.wait_for_timeout(280); after=await y(pg)
                assert after>before, f'wheel reversal stuck burst={burst} notch={i}: {before}->{after}'
                await pg.wait_for_timeout(750)
            print(f'wheel-only reversal burst={burst}: 4/4 moved within 280ms')
        await pg.screenshot(path='/tmp/browser/journey/reversal.png')
        print("RESULT down-fails:", allfails, "up-ok:", ups)
        assert not allfails and all(ups)
        await b.close()
asyncio.run(main())

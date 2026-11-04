"""Live regression: no touch parallax/next-photo sliver; one swipe per pinned stage."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    output = Path('/tmp/browser/mobile-sections')
    output.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width, height in [(402, 725), (390, 844), (360, 780)]:
            context = await browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, device_scale_factor=3)
            page = await context.new_page()
            await page.goto('http://localhost:8080/', wait_until='networkidle')
            await page.wait_for_function('!!window.__journeyStops')
            await page.wait_for_timeout(800)
            cdp = await context.new_cdp_session(page)
            stops = await page.evaluate('window.__journeyStops()')
            async def swipe(dy):
                await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':width-40,'y':height*.6}]})
                for i in range(1, 5):
                    await cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':width-40,'y':height*.6-dy*i/4}]})
                    await asyncio.sleep(.025)
                await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                await page.wait_for_timeout(800)
            checked = 0
            for group in [stops[:6], stops[6:]]:
                await page.evaluate('(y)=>scrollTo({top:y,behavior:"instant"})', group[0])
                await page.wait_for_timeout(250)
                for target in group[1:]:
                    await swipe(16)
                    actual = await page.evaluate('scrollY')
                    assert abs(actual-target)<=3, f'{width}: one swipe landed {actual}, expected {target}'
                    # A touch at the right side used to translate the top photo left,
                    # revealing the next fully opaque photo behind it at rest.
                    visible = await page.locator('.journey-layer').evaluate_all('ls=>ls.filter(l=>l.style.visibility==="visible"&&+l.style.opacity>0).map(l=>({opacity:+l.style.opacity, transform:l.style.transform}))')
                    assert all(v['opacity']==1 and v['transform'].startswith('translate3d(0.00px, 0.00px') for v in visible), visible
                    checked += 1
                    if target==stops[1]:
                        await page.screenshot(path=str(output/f'private-pilot-{width}.png'))
            before = await page.evaluate('scrollY')
            await swipe(-100)
            after = await page.evaluate('scrollY')
            assert after<before, 'upward swipe blocked'
            await page.wait_for_timeout(600)
            assert await page.evaluate('scrollY')==after, 'upward scroll forced a settle'
            print(f'{width}x{height}: {checked}/7 single-swipe transitions; no photo-edge parallax; native upward scroll {before}->{after}')
            await context.close()
        await browser.close()

asyncio.run(main())

## Make the homepage title "BECOME A PROFESSIONAL PILOT" much smaller

At your screen width right now the title tops out at about 116px tall and fills the whole width of the screen.

**Change**
- On desktop and tablet, shrink the title by about half. It would range from about 36px on small tablets up to about 64px on very wide screens (around 56px at your screen size), and always fit on one line.
- On phones, keep it on one line at about its current size (it's already small there).
- Keep the entrance animation, the buttons, the location chips and the photo exactly as they are.

**Technical details**
- `src/routes/index.tsx` line 40: change the h1 size `sm:text-[clamp(2.65rem,1.1rem+4.4vw,7.25rem)]` to `sm:text-[clamp(2.25rem,1rem+2.4vw,4rem)]` and add `sm:whitespace-nowrap`.
- Check with screenshots at 1795×1135, 1440×900, 1280×800 and 390×844 that the title sits on one line and nothing is cut off.
- Update the hero title size noted in memory.

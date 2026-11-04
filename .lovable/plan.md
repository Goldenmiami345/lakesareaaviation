## Make the homepage title small, minimal and one line within the left third

**Change**
- Size "BECOME A PROFESSIONAL PILOT" so it stays on one line and never runs past about a third of the screen width on desktop. At your screen size that's about 30px tall; on a laptop it's about 21px.
- Phones keep today's one-line size, since a third of a phone screen would be too small to read.
- Save this as a standing rule: the home title stays minimal, on one line, and within the left third of the screen on desktop.

**Technical details**
- `src/routes/index.tsx` line 40: replace the h1 `sm:text-[clamp(2.25rem,1rem+2.4vw,4rem)]` with `sm:text-[clamp(1.25rem,1.65vw,2.75rem)]` and keep `sm:whitespace-nowrap`. The title's width is about 20 times its font size, so 1.65vw keeps it at roughly 33vw wide.
- Measure the h1 width at 1795, 1440 and 1280 px wide and confirm it is no wider than 34% of the screen.
- Update the Core line in mem://index.md.

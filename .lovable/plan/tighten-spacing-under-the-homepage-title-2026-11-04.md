# Tighten spacing under the homepage title

The title size stays as is. Only the gaps below it shrink, so the title, the "Build my training plan" link and the location chips read as one compact group.

## Changes (homepage top section)
- Gap from title to "Build my training plan": phones about 20px down to about 10px, computers about 28px down to about 14px.
- Gap from "Build my training plan" to the location chips: phones about 16px down to about 6px, computers about 24px down to about 10px.
- The small label above the title ("Accelerated flight training") moves slightly closer to the title as well.
- Tap areas stay at least 44px tall; only the empty space between items is removed.

## Check
- Measure the gaps at phone (390px), laptop (1280px) and the owner's wide screen, and take a screenshot of each to confirm the group looks tight and balanced.

## Technical details
- `src/routes/index.tsx`: h1 `mt-2.5 sm:mt-3` -> `mt-1.5 sm:mt-2`; HeroCta wrapper `mt-5 lg:mt-7` -> `mt-2.5 lg:mt-3.5`; locations nav `mt-4 lg:mt-6` -> `mt-1.5 lg:mt-2.5`.

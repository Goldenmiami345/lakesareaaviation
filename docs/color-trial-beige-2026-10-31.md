# Color trial: beige light surfaces (2026-10-31)

Requested by Carter. Reversible: every light surface that was white or near-white now reads one token, `--surface-light`.

## Values
- Beige (home page light sections, token `--background`): `oklch(0.975 0.012 75)`
- New token: `--surface-light: oklch(0.975 0.012 75)` in `src/styles.css` `:root`
- Old near-white surface (`--card`): `oklch(0.995 0.005 75)`
- Old popover/menu surface: `--popover` was **undefined**, so `bg-popover` panels (dropdown, select, popover, hover-card, menubar, context-menu, command, calendar, navigation-menu) rendered transparent.

## Changes (all in `src/styles.css`)
| Selector / token | Before | After |
|---|---|---|
| `:root --surface-light` | (none) | `oklch(0.975 0.012 75)` |
| `:root --card` | `oklch(0.995 0.005 75)` | `var(--surface-light)` |
| `:root --popover` | (undefined) | `var(--surface-light)` |
| `:root --popover-foreground` | (undefined) | `oklch(0.19 0.012 55)` (same as text) |
| `@theme inline --color-popover / --color-popover-foreground` | (none) | `var(--popover)` / `var(--popover-foreground)` |

Users of `bg-card` now beige: Team page cards (`src/routes/team.tsx`), Students page cards (`src/routes/students.tsx`), `src/components/ui/card.tsx`.

Already beige before the trial (unchanged, use `bg-background`): page backgrounds, Fleet cards and accordions, Contact form surroundings and inputs, mobile menu (`bg-background/95`), rates tables, section bands.

## Exceptions (not changed)
- Text colors, dark ink sections, blue accent: unchanged.
- Form inputs: already `bg-background` (beige); contrast is fine, so no white exception needed.
- `bg-white/10` in `site-shell.tsx`: a translucent highlight on dark ink, not a white surface.
- `src/lib/error-page.ts`: standalone fallback HTML shown only when the app fails to load; it can't read site tokens. Left white.
- `src/components/ui/chart.tsx` `#fff`: selectors matching Recharts strokes, not backgrounds.

## Contrast on the beige (WCAG AA)
- Body text `--foreground`: 17.2:1 (pass)
- Muted text `--muted-foreground`: 6.1:1 (pass)
- Blue accent text `--primary`: 4.48:1 (passes for large/bold text; just under 4.5 for small regular text; it was used on this same beige before the trial)

## Revert (one line)
In `src/styles.css`, change `--surface-light: oklch(0.975 0.012 75);` to `--surface-light: oklch(0.995 0.005 75);`.
(The `--popover` mapping can stay; it only fixes previously transparent menus.)

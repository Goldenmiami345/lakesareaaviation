# Color & Conversion Plan — Lakes Area Aviation Rebuild

## Why the site looks yellow

The design palette is not yellow. It uses the school's real brand: rust orange (#DD6D3F), near-black charcoal, and warm cream, with their Andada Pro / Montserrat fonts. The yellow comes from the hero photograph — the school's actual yellow 1946 Taylorcraft (N96150), which fills the full screen and tints the whole first impression. So the fix is mostly about photography and balance, not a rebrand.

## What the market research says

- Big, high-converting academies (ATP, Acron/L3Harris) lean on **deep navy/blue + white + one strong accent** — blue reads as trust, safety, and professionalism in aviation.
- Specialist flight-school agencies agree the palette matters less than **contrast and clarity**: real fleet photos, visible prices, instructor faces, and a booking CTA above the fold drive enquiries ([Right Rudder Marketing](https://rightruddermarketing.com/marketing-system/flight-school-website-design/)).
- Rebrand case studies show schools moving **toward** sophisticated dark+navy+metallic-accent palettes (e.g. Spirit Aviation went red/black → navy with gold accents) ([Cosmic Designs](https://cosmicdesigns.org/portfolio/spirit-aviation/)).
- Lifestyle schools use soft airy sky tones; career/accelerated schools use dark, confident, high-contrast schemes. Lakes Area's accelerated CFI/CFII offer fits the second group.

## Recommendation (marketing perspective)

Keep the school's brand equity (rust + charcoal + cream + their logo) but rebalance so the site reads "premium and trustworthy" instead of "yellow":

1. **Swap the hero photo** to a less yellow-dominant real aircraft shot (e.g. the Piper Apache ramp photo or the Cessna 172 in flight), keeping the Taylorcraft elsewhere on the page.
2. **Deepen the dark sections** — richer near-black with a subtle navy undertone for hero overlays, page intros, and footer, echoing the trust palette big academies use without copying them.
3. **Sharpen the rust accent** — reserve it strictly for CTAs, eyebrows, and key numbers so the eye always lands on the conversion action.
4. **Increase contrast on conversion points** — inquiry band, mobile Call/Apply bar, and form buttons get the boldest color pairing on the site.
5. **Rebalance section rhythm** — alternate cream / dark / rust bands so no single hue dominates any viewport.

## Technical details

- All changes confined to `src/styles.css` design tokens plus hero image selection in `src/routes/index.tsx` — no structural changes.
- Colors stay semantic tokens (no hardcoded utilities), preserving theming.
- Hero swap uses existing verified real fleet photos only (per project imagery rule — no AI-generated aircraft).
- Verify on desktop + mobile after the change; check build log and console for errors.

## Out of scope (flag for later)

- A full rebrand to navy/blue would break from the school's actual brand (logo, signage, print). Not recommended without the owner's sign-off — the current plan gets 90% of the conversion benefit while staying on-brand.

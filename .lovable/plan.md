# Redesign the "Scroll to climb" indicator

## Problem
The small centered "↓ Scroll to climb" text on the flight-path hero looks off-center and underwhelming on both desktop and mobile. It reads as an afterthought, not part of the zoom-scroll experience.

## What changes

Replace the tiny arrow-and-text chip with one large, abstract, aviation-flavored element that sits dead center of the hero and fades away the moment the visitor starts scrolling:

- **A big "horizon ring":** a large thin-line circle (roughly 40% of screen height on desktop, ~70% width on mobile) centered on the hero, drawn in a faint cream line with one short rust arc segment that slowly travels around the ring like a compass needle / radar sweep.
- **Inside the ring:** the word "SCROLL" in small tracked-out uppercase letters, with a thin vertical line beneath it that continuously extends and retracts (like an altimeter needle settling) — an abstract hint of downward motion instead of a literal arrow.
- **Behavior:** the ring gently scales and breathes; it fades out and shrinks as soon as scrolling begins, so it never overlaps the first stage content.
- **Centering fix:** position it with a fixed, truly-centered anchor independent of the text block above, so it is optically centered on both desktop and mobile.
- **Reduced motion:** with reduced-motion on, it renders as a static ring and label, no sweep or breathing.

## Technical details

- Edit `src/components/flight-journey.tsx` (line ~117): remove the `↓` / "Scroll to climb" paragraph, render the new ring element shown only while `active === 0` and scroll progress is near zero.
- Add the ring, sweep, and needle animations to `src/styles.css` using existing design tokens (cream `background` color for the line, `primary` rust for the arc); keyframes respect the existing `prefers-reduced-motion` rule.
- No new dependencies; pure CSS + the existing scroll progress state already in the component.
- Verify on desktop (1280px) and mobile (393px) viewports: centered, visible on load, disappears on scroll, no console errors.

## Out of scope
No changes to the five flight-path stages, headline, or the Call/Apply bar.

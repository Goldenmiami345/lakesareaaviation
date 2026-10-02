# Simplified scroll cues

## Goal
Make the homepage’s scroll guidance quieter and more modern, especially on mobile.

## Changes
- Replace the landing-page mouse/finger with a tiny centered animated line anchored at the bottom edge on both mobile and desktop.
- Remove the centered cue from inside both parallax journeys.
- On mobile, turn the existing right-side stage rail into the scroll signal: keep the progress line and send a subtle light stroke downward periodically.
- Keep desktop journey navigation readable without adding another mouse icon.
- Preserve reduced-motion behavior and all existing parallax content and timing.

## Validation
- Check the landing page and both journeys at 393×852 and desktop size.
- Confirm the cues never overlap copy or buttons, and the page has no horizontal overflow or runtime errors.

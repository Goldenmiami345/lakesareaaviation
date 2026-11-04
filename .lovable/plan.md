# Private Pilot traffic: bigger, sharper planes, circles back, and a live view

## 1. Circles back, always bigger than the plane
- Remove the square brackets and bring back the round radar circles.
- Each circle is sized from that airplane's on-screen size: always about 1.6 times the plane's wingspan, with a 15px minimum, so it never sits inside or on the plane. It grows and shrinks as the plane gets nearer or farther along the pattern.
- The circles keep the same faint, thin, digital look as before.

## 2. Bigger, high-definition planes made from our real airplanes
- The Private Pilot planes get about 1.6 times bigger on screen than now.
- I'll replace the flat drawn shapes with pictures made from our own 3D models of N8570B (Phoenix), N4383P (Apache) and N46201 (Cardinal). Each airplane gets 36 views, one for every 10 degrees of heading, seen from this camera angle at high resolution. As the plane turns around the pattern, the closest matching view is shown, so zooming in shows its real paint and shape.
- Paint and registration numbers come straight from the models and are never redrawn by AI.
- The planes the site simulates stay our three airplanes. Other fleet airplanes have no 3D model, so they would stay drawn shapes if they ever appear.
- The views are made once, ahead of time, and kept under about 400KB per airplane. They load only when the Private Pilot stage is close to the screen.

## 3. Pattern line only every now and then
- The site setting is already on "pulse". I'll make it rarer and shorter on the Private Pilot stage: it appears for about 2.5 seconds roughly every 15–20 seconds instead of every 6–8.
- It still never shows while a plane's card is open, or for people who prefer reduced motion. I'll check it on both phone and computer.

## 4. Live view when real planes are in the pattern
- The site checks real ADS-B positions (the same free adsb.lol feed used now) every 10 seconds while the stage is on screen, instead of once a minute.
- If any real airplane is in or near the Little Falls pattern, the view switches to live:
  - A small, subtle "● LIVE" tag appears at the top left.
  - The simulated planes fade out, and the real airplanes are drawn at their reported position, height and direction. Between updates they glide smoothly along their reported speed and direction.
  - If the real airplane is one of our tail numbers, it shows that airplane's own 3D-made picture. Any other airplane shows a neutral generic airplane picture.
- When the real traffic leaves, the view fades back to the simulated pattern. If the live feed fails, nothing changes for visitors.

## 5. Tapping a live airplane
- **One of our tail numbers:** opens the same airplane card as today, with its photo, model and specs, plus its live height and speed.
- **Any other airplane:** opens a flight card with:
  - its tail number or callsign and aircraft type
  - height, ground speed, direction and climb or descent rate
  - origin and destination, when the free feed knows them. Most small private planes don't file one, so the card shows "Not filed" instead of guessing.
  - a "Track on ADS-B Exchange" button that opens that exact airplane on globe.adsb.lol in a new tab.
- Full flight plans aren't in any free public feed, so I can't show them; the card shows origin and destination only.

## Checks
- Screenshots on phone and computer: circle versus plane size, plane sharpness when zoomed in, and the pattern line turning on and off.
- Tests for each rule: circles always bigger than the plane, live mode only for real traffic near the field, our tail numbers open our card, others link to their tracker.
- Live mode tested with sample traffic, since Little Falls may be quiet at the time.

## Technical details
- Sprite bake: headless model-viewer/three render of each GLB at the KLXL oblique camera pitch, 36 headings, packed into a WebP atlas per registration (lovable-assets). TrafficPerspective renders an `<image>` clipped to the nearest heading frame instead of TrafficVector for those regs, positioned and sized via the existing projectMatrix span, with a 1.6x display scale.
- RadarTag: drop `compact`; add a `ringR` prop set per frame by use-traffic-animation from the projected span (max(7.5, span*0.8)).
- usePatternPulse gains interval/duration options; Private Pilot passes 15–20s / 2.5s.
- live-traffic API: keep the 3 fixed fields, TTL 8s, return hex, reg, type (t), lat/lon, track, baro_rate, callsign; add origin/destination lookup via adsb.lol routeset for callsigns (cached 10 min). Client projects lat/lon into KLXL pattern feet and then obliqueProject, and dead-reckons between polls.
- Update src/components/AGENTS.md: the oblique view uses baked model sprites, and replaces the old rule that it keeps vectors.

# Next: finish rates, then Phase 2 (photos and text editor)

## Step A: Close the gaps left by Phase 1
The training plan estimator on "Build my training plan" still uses fixed prices (Private $9,600, Instrument $8,300, housing $30/night, car $20/day, and so on). A rate change in admin does not reach it yet.
- Connect the estimator's course costs and its housing, car and pickup prices to the saved rates, so a visitor's estimate always matches the Rates page.
- Make the downloadable PDF rate sheet follow saved rates: a "Download rate sheet" that is built from the live prices at click time, keeping today's PDF layout and look.
- Confirm the Multi-Engine Instructor price ($4,475 published vs $4,400 from its own breakdown) with you before touching it.

## Step B: Phase 2, photo and text editor (design locked)
The owner can swap words and pictures in fixed, named slots. He can never change layout, fonts, colors, spacing or animation.

What becomes editable (first batch, the most-changed content):
- Course pages: descriptions, "what you'll train" lists, course photos (including the 5 stand-in photos)
- Programs: short descriptions and notes
- Fleet: airplane notes and photos
- Testimonials: quotes, names
- Home: supporting line under the headline and the services tiles' short text

How it works for him:
- New "Content" section in admin, grouped by page, each slot showing the current text or photo.
- Text slots have a character limit sized to the design, so a long sentence can't push a layout out of shape. A live preview shows how it fits.
- Photo/video slots: upload, then the site crops to the slot's existing shape automatically and makes web-optimized sizes. A focal-point tap chooses what stays in frame.
- Save publishes for everyone. Every save is kept as a version with one-click Restore, plus "Restore original" per slot and for the whole site, same as the rates.

How design stays protected:
- Visitors first see exactly today's page. Saved changes fill the same spots in the same format after load.
- Anything empty, too long or failing to load falls back to the original text or photo.
- Only a verified administrator can save. Everyone else can only read.

Optional later: an "Edit mode" on the live site with pencil icons on each editable slot. It uses the same slots and rules.

## Technical details
- Estimator: replace the hardcoded RATINGS costs and service prices in contact.tsx with values from useLiveRates (map rating ids to program option names). The server-side lead validation stays unchanged.
- PDF: generate client-side from applyRates output with the existing layout (or a server function), replacing the static file link only after a fidelity check against today's PDF.
- Content: one `site_content` table (key, value jsonb, note, updated_by) with public read and admin-only write, plus a `site_content_history` table filled by a BEFORE UPDATE trigger, the same pattern as site_rates. Media go in a public storage bucket that only admins can write to. A registry file (content-slots.ts) lists every slot with its default, type, max length and aspect ratio. Pages read slots through a `useContent(key)` hook that returns the default on first render.
- Tests: estimator totals follow rate overrides; content falls back on empty or too-long values; restore round-trips.

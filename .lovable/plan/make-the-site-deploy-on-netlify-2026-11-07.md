# Make the site deploy on Netlify

## Why it fails today
Netlify found no build instructions, guessed "Python", and never installed the site. The site is also set up to build for Lovable's hosting (Cloudflare style), so even with the right command Netlify would get files it can't run: the training-plan form and live traffic need a small server, not just static pages.

## What I'll do
1. Add a `netlify.toml` at the project root telling Netlify:
   - Node 22, install with npm, build command `npm run build`.
   - Build for Netlify instead of Cloudflare (`NITRO_PRESET=netlify`), so pages, the training-plan form and live traffic run as Netlify functions.
   - The correct publish folder produced by that build.
2. Keep Lovable hosting working unchanged (the Netlify switch only applies inside Netlify's build).
3. Run the Netlify-style build here to confirm all 27 pages, the form and live traffic come out in the right shape, and that the page checks still pass.
4. Note it in AGENTS.md so future changes keep both hosts working.

## What you'll do in Netlify (one time)
- Site configuration → Build & deploy: Base directory empty, branch `main` (the file handles the rest).
- Environment variables: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (I'll give you the exact values; they are safe public values). Without them the form and settings can't reach the database.
- Trigger "Clear cache and deploy".

## Limits
- Admin settings, leads and the database stay on Lovable Cloud; Netlify only hosts the pages.
- I can't log into your Netlify account, so the first deploy must be confirmed on your side.

# Make the fleet 3D models look real

## Your question about credits
Lovable credits pay only for Lovable's own AI (text, images, video). They can't pay for outside 3D tools like Meshy, Tripo, Rodin (Hyper3D) or Replicate. Those tools charge on their own accounts, usually $10 to $30 a month or a few cents to a dollar per model. Once you have an account, you give me its key and I connect it. Then the site can send each airplane's real photos to that tool and bring the finished model back.

Honest expectation: AI 3D tools still make wings wavy and registration numbers blurry. Paying a 3D artist ($150 to $400 per airplane) or buying a marketplace model and repainting it to match each airplane's real colours gives the most realistic result.

## Phase 1: improve the current models now (no outside cost)
1. **Clean up the shapes:** smooth the faceted surfaces, fix normals so curved panels stop looking blocky, and remove stray and duplicate pieces. Each model's outline and proportions stay the same.
2. **Real materials:** glossy painted metal for the body, clear tinted glass for the windscreen and windows, dark rubber tyres, and chrome spinners and props. Paint colours are sampled from each airplane's real photos.
3. **Better lighting:** an outdoor sky and ramp lighting setup instead of the flat studio grey, a soft shadow under the airplane, a slightly warmer exposure, and lighting tuned so the paint shows highlights as the model spins.
4. **Sharper detail:** a higher-resolution paint texture where the source files allow, and each registration number stays exactly as on the real airplane, never redrawn by AI.
5. **Check:** render all three on /fleet and in the traffic cards on phone and desktop, then compare side by side with the real photos. Model file limits and loading speed stay as they are now.

## Phase 2: optional outside AI or artist sourcing (needs your account)
- If you pick an AI tool, I add its key as a private secret and build a small admin-only page. There you upload photos of one airplane, get a new model back, preview it beside the current one, and choose whether to use it. Nothing replaces a model without your approval.
- If you pick an artist or marketplace model, you send me the file and I fit it into the site with the same checks.

## Technical details
- Use gltf-transform on models-src originals: weld, normals with angle threshold, dedup, prune, material PBR edits (metallic/roughness, KHR_materials_clearcoat for paint, transmission/alpha for glass). Then re-pack with the existing gltfpack -cc -vpf settings and run check-models.mjs (≤2.5MB rule).
- Change model-settings.ts: replace `environment-image: neutral` with a small self-hosted HDR sky (public/models, versioned), set tone-mapping to neutral/aces, and tune exposure and shadow. Bump the ?v= cache-buster.
- Phase 2: a createServerFn that calls the chosen provider with the key from server env, saves results to storage, and an admin role check that matches the existing site_settings admin.

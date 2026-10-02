<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Shared navigation and layout live in src/components/site-shell.tsx so every public page stays visually consistent.
- Static program, fleet, location, and testimonial content lives in src/lib/site-data.ts to keep route pages concise and facts consistent.
- Aircraft imagery must originate from Lakes Area Aviation's official site and preserve each real airplane's registration, paint, and physical details.

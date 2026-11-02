import { createFileRoute } from '@tanstack/react-router';
import n6717a from '../assets/fleet/n6717a.webp';
import n6641f from '../assets/fleet/n6641f.webp';
import n7108g from '../assets/fleet/n7108g.webp';
import n11059 from '../assets/fleet/n11059.webp';
import n96150 from '../assets/fleet/n96150.webp';
import n8570b from '../assets/fleet/n8570b.webp';

export const Route = createFileRoute('/fleet-originals')({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: 'Original Fleet Photographs | Lakes Area Aviation' },
    { name: 'description', content: 'Original full-frame fleet photographs for owner review.' },
    { property: 'og:title', content: 'Original Fleet Photographs | Lakes Area Aviation' },
    { property: 'og:description', content: 'Full-resolution originals for fleet photograph review.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: Originals,
});
function Originals() {
  return <main className="bg-background text-foreground">
    <h1 className="px-4 py-6 font-display text-3xl">Original fleet photographs</h1>
    {Object.entries({ N6717A:n6717a, N6641F:n6641f, N7108G:n7108g, N11059:n11059, N96150:n96150, N8570B:n8570b }).map(([reg,src]) => <figure key={reg}>
      <figcaption className="px-4 py-3 font-mono">{reg}</figcaption>
      <img src={src} alt={reg} className="block h-auto max-w-full" />
    </figure>)}
  </main>;
}
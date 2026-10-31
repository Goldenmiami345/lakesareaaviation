import { createFileRoute } from '@tanstack/react-router';
import { AircraftMedia } from '../components/aircraft-media';
import { fleet } from '../lib/site-data';

export const Route = createFileRoute('/models-preview')({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: 'Aircraft Model Review | Lakes Area Aviation' },
    { name: 'description', content: 'Private review of Phoenix, Apache and Cardinal aircraft models.' },
    { property: 'og:title', content: 'Aircraft Model Review | Lakes Area Aviation' },
    { property: 'og:description', content: 'Review three aircraft models before visitor release.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: ModelsPreview,
});

function ModelsPreview() {
  return <main className="bg-background text-foreground">
    <header className="border-b border-border px-5 py-5"><h1 className="font-display text-3xl">Aircraft model review</h1><p className="mt-2 text-sm text-muted-foreground">Phoenix · Apache · Cardinal</p></header>
    {['N8570B', 'N4383P', 'N46201'].map(reg => {
      const plane = fleet.find(p => p.registration === reg);
      if (!plane) return null;
      return <section key={reg} aria-label={`${reg} model`} className="border-b border-border">
        <div className="px-5 py-4"><h2 className="font-display text-2xl">{reg}{plane.nickname ? ` · ${plane.nickname}` : ''}</h2><p className="text-sm text-muted-foreground">{plane.name}</p></div>
        <div className="h-[75svh] min-h-96 w-full"><AircraftMedia reg={reg} photo={plane.image} preview /></div>
      </section>;
    })}
  </main>;
}
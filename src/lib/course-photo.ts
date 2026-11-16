import type { SiteContent } from "./content-slots";

/** Saved photo, published photo, or the photo uploaded with an owner-added course. */
export const coursePhoto = (site: SiteContent, c: { slug: string; name: string; photo?: string }) =>
  site.photo(c.slug) ?? (c.photo ? { src: c.photo, alt: c.name, standIn: false } : undefined);

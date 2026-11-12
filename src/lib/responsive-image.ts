// Responsive srcset for bundled photos and CDN cut-outs. Variants are real
// downscales of the held source (scripts/make-image-variants.py); nothing is
// ever larger than the source file, so the largest candidate is the source itself.
import widths from "./image-widths.json";
import n6641f from "../assets/fleet/cutouts/n6641f.webp.asset.json";
import n6641f800 from "../assets/fleet/cutouts/n6641f-w800.webp.asset.json";
import n6641f1280 from "../assets/fleet/cutouts/n6641f-w1280.webp.asset.json";
import n7108g from "../assets/fleet/cutouts/n7108g.webp.asset.json";
import n7108g800 from "../assets/fleet/cutouts/n7108g-w800.webp.asset.json";
import n7108g1280 from "../assets/fleet/cutouts/n7108g-w1280.webp.asset.json";
import n6717a from "../assets/fleet/cutouts/n6717a.webp.asset.json";
import n6717a800 from "../assets/fleet/cutouts/n6717a-w800.webp.asset.json";
import n6717a1280 from "../assets/fleet/cutouts/n6717a-w1280.webp.asset.json";
import n96150 from "../assets/fleet/cutouts/n96150.webp.asset.json";
import n96150800 from "../assets/fleet/cutouts/n96150-w800.webp.asset.json";
import n961501280 from "../assets/fleet/cutouts/n96150-w1280.webp.asset.json";
import n46201 from "../assets/fleet/cutouts/n46201.webp.asset.json";
import n46201800 from "../assets/fleet/cutouts/n46201-w800.webp.asset.json";
import n462011280 from "../assets/fleet/cutouts/n46201-w1280.webp.asset.json";
import heroWide from "../assets/photos/sunset-ramp-crisp.webp.asset.json";
import heroWide1280 from "../assets/photos/sunset-ramp-crisp-w1280.webp.asset.json";
import heroTall from "../assets/photos/sunset-ramp-tall.webp.asset.json";
import heroTall780 from "../assets/photos/sunset-ramp-tall-w780.webp.asset.json";
import heroTall1170 from "../assets/photos/sunset-ramp-tall-w1170.webp.asset.json";

const variantUrls = import.meta.glob("../assets/**/*-w{780,1170,1280}.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const byBase: Record<string, Record<number, string>> = {};
for (const [path, url] of Object.entries(variantUrls)) {
  const m = /([^/]+)-w(\d+)\.webp$/.exec(path);
  if (m?.[1]) (byBase[m[1]] ??= {})[Number(m[2])] = url;
}

/** CDN images: url → srcset (source width last). */
const CDN: Record<string, string> = {
  [n6641f.url]: `${n6641f800.url} 800w, ${n6641f1280.url} 1280w, ${n6641f.url} 2205w`,
  [n7108g.url]: `${n7108g800.url} 800w, ${n7108g1280.url} 1280w, ${n7108g.url} 2141w`,
  [n6717a.url]: `${n6717a800.url} 800w, ${n6717a1280.url} 1280w, ${n6717a.url} 2262w`,
  [n96150.url]: `${n96150800.url} 800w, ${n961501280.url} 1280w, ${n96150.url} 1439w`,
  [n46201.url]: `${n46201800.url} 800w, ${n462011280.url} 1280w, ${n46201.url} 2380w`,
  [heroWide.url]: `${heroWide1280.url} 1280w, ${heroWide.url} 1584w`,
  [heroTall.url]: `${heroTall780.url} 780w, ${heroTall1170.url} 1170w, ${heroTall.url} 1280w`,
};

const W = widths as Record<string, { w: number; variants: number[] }>;
function baseOf(url: string) {
  const file = url.split("?")[0]?.split("/").pop()?.replace(/\.webp$/, "") ?? "";
  if (W[file]) return file;
  const stripped = file.replace(/-[\w-]{8}$/, ""); // Vite content hash in production
  return W[stripped] ? stripped : null;
}

/** srcset for a bundled photo or known CDN cut-out; undefined when only one size exists. */
export function srcSetFor(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const cdn = CDN[url];
  if (cdn) return cdn;
  const base = baseOf(url);
  if (!base) return undefined;
  const v = byBase[base] ?? {};
  const list = (W[base]?.variants ?? []).filter((w) => v[w]).map((w) => `${v[w]} ${w}w`);
  return list.length ? [...list, `${url} ${W[base]!.w}w`].join(", ") : undefined;
}

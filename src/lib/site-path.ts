/** Prerender visits trailing-slash URLs; browser navigation may not. */
export function sitePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}
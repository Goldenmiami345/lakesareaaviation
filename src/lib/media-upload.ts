import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
/** Shrink to at most 2560px wide and re-encode as WebP so uploads stay web-light. */
async function optimize(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error("Could not read that photo"))), "image/webp", 0.85));
}
/** Upload an optimized photo for a slot; returns a long-lived URL (the bucket is private). */
export async function uploadSlotPhoto(slotKey: string, file: File) {
  const blob = await optimize(file);
  const path = `${slotKey.replace(/[^a-z0-9.-]/gi, "_")}-${Date.now()}.webp`;
  const up = await supabase.storage.from("site-media").upload(path, blob, { contentType: "image/webp" });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from("site-media").createSignedUrl(path, TEN_YEARS);
  if (signed.error || !signed.data) throw signed.error ?? new Error("Upload failed");
  return signed.data.signedUrl;
}

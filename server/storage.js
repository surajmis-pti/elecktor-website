// Product photos -> Supabase Storage (public bucket "products").
// SUPABASE_URL + SUPABASE_SERVICE_KEY sirf server par rehte hain, browser ko kabhi nahi milte.

const BUCKET = "products";

export async function uploadImage(dataUrl, name = "product") {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!m) throw httpError(400, "Only PNG, JPG or WEBP images are allowed");
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 3 * 1024 * 1024) throw httpError(400, "Image too large (max 3 MB)");

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    // local testing bina Supabase ke: photo seedha data URL ki tarah save
    return dataUrl;
  }
  const ext = m[2].toLowerCase() === "png" ? "png" : m[2].toLowerCase() === "webp" ? "webp" : "jpg";
  const safe = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product";
  const path = `${safe}-${Date.now()}.${ext}`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": m[1], "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw httpError(502, "Photo upload failed: " + (await res.text()).slice(0, 200));
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

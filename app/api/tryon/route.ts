import { NextRequest, NextResponse } from "next/server";
import { tryOnPayloadSchema } from "@/lib/validation";
import { tryOnWithGeminiFiles } from "@/lib/ai/gemini-tryon";
import { getProviderFromEnv, Provider } from "@/lib/ai/providers";
import sharp from "sharp";

export const runtime = "nodejs"; // important if you use Buffer and file bytes

// small helper: fetch a public image and return bytes or throw
async function fetchPublicImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Cannot load product image");
  return new Uint8Array(await res.arrayBuffer());
}

// Simple Sharp-based composer used as a fallback (or as the "sharp" provider).
async function composeWithSharp(
  userArray: Uint8Array,
  productArray: Uint8Array,
  productSlug: string
) {
  const userImg = sharp(userArray).rotate();
  const meta = await userImg.metadata();
  const uw = meta.width ?? 800;

  // heuristics for overlay size/position — keep simple and safe for demo
  let overlayWidth = Math.floor((uw || 800) * 0.35);
  let top = Math.floor((uw || 800) * 0.18);
  let left = Math.floor(((uw || 800) - overlayWidth) / 2);

  const lc = productSlug.toLowerCase();
  if (
    lc.includes("pant") ||
    lc.includes("jean") ||
    lc.includes("trouser") ||
    lc.includes("chino")
  ) {
    top = Math.floor((uw || 800) * 0.4);
  } else if (
    lc.includes("shoe") ||
    lc.includes("sneaker") ||
    lc.includes("boot")
  ) {
    overlayWidth = Math.floor((uw || 800) * 0.22);
    top = Math.floor((uw || 800) * 0.72);
    left = Math.floor(((uw || 800) - overlayWidth) / 2);
  } else if (lc.includes("dress") || lc.includes("skirt")) {
    top = Math.floor((uw || 800) * 0.2);
  }

  const productResized = await sharp(productArray)
    .resize({ width: overlayWidth })
    .toBuffer();

  const composed = await userImg
    .composite([
      {
        input: productResized,
        top,
        left,
      },
    ])
    .png()
    .toBuffer();

  const b64 = Buffer.from(composed).toString("base64");
  return `data:image/png;base64,${b64}`;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const json = form.get("json");
    const file = form.get("userImage");
    if (!json || typeof json !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const payload = tryOnPayloadSchema.parse(JSON.parse(json));
    const userArray = new Uint8Array(await file.arrayBuffer());

    // Load product bytes from your public path
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const productUrl = new URL(payload.productImageUrl, base).toString();
    const productArray = await fetchPublicImage(productUrl);

    const provider = getProviderFromEnv();

    // dispatch to provider implementations
    if (provider === Provider.Gemini) {
      // Use the Gemini file-based flow (already returns a data: URI)
      const imageUrl = await tryOnWithGeminiFiles({
        userImage: userArray,
        productImage: productArray,
        measures: payload.measures,
        prompt: payload.prompt,
      });

      return NextResponse.json({ imageUrl, provider: "gemini-image" });
    }

    if (provider === Provider.Sharp) {
      const imageUrl = await composeWithSharp(
        userArray,
        productArray,
        payload.productSlug
      );
      return NextResponse.json({ imageUrl, provider: "sharp" });
    }

    // Other providers not implemented yet — return a 501 so you can test switching.
    return NextResponse.json(
      { error: `Provider ${provider} not implemented` },
      { status: 501 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

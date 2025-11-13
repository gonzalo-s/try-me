import { NextRequest, NextResponse } from "next/server";
import { tryOnPayloadSchema } from "@/lib/validation";
import { ProductData, tryOnWithGeminiFiles } from "@/lib/ai/gemini-tryon";
import { getProviderFromEnv, Provider } from "@/lib/ai/providers";

export const runtime = "nodejs"; // important if you use Buffer and file bytes

// small helper: fetch a public image and return bytes or throw
async function fetchPublicImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Cannot load product image");
  return new Uint8Array(await res.arrayBuffer());
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
        userImageAspect: payload.userImageAspect,
        prductData: payload.productData as ProductData,
      });

      return NextResponse.json({ imageUrl, provider: "gemini-image" });
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

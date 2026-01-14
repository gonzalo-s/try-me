import { NextRequest, NextResponse } from "next/server";
import { tryOnPayloadSchema } from "@/lib/validation";
import { ProductData } from "@/lib/ai/gemini-tryon-b";
import { getProviderFromEnv, Provider } from "@/lib/ai/providers";
import { tryOnWithGeminiFilesb } from "@/lib/ai/gemini-tryon-b";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs"; // important if you use Buffer and file bytes

// small helper: fetch a public image and return bytes or throw
async function fetchPublicImage(urlOrPath: string) {
  // If it's a remote URL, fetch it
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error("Cannot load product image");
    return new Uint8Array(await res.arrayBuffer());
  }

  // Otherwise treat as a local file in public/
  // Remove leading slash if present
  const relativePath = urlOrPath.startsWith("/")
    ? urlOrPath.slice(1)
    : urlOrPath;
  const filePath = path.join(process.cwd(), "public", relativePath);
  const buffer = await fs.readFile(filePath);
  return new Uint8Array(buffer);
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

    // Load product bytes from your public path or remote URL
    const productArray = await fetchPublicImage(payload.productImageUrl);
    const provider = getProviderFromEnv();

    // dispatch to provider implementations
    if (provider === Provider.Gemini) {
      // Use the Gemini file-based flow (already returns a data: URI)
      const imageUrl = await tryOnWithGeminiFilesb({
        userImage: userArray,
        productImage: productArray,
        measures: payload.measures,
        prompt: payload.prompt,
        userImageAspect: payload.userImageAspect,
        productData: payload.productData as ProductData,
      });

      return NextResponse.json({ imageUrl, provider: "gemini-image" });
    }

    // Other providers not implemented yet — return a 501 so you can test switching.
    return NextResponse.json(
      { error: `Provider ${provider} not implemented` },
      { status: 501 }
    );
  } catch (err: any) {
    console.error("SERVER ERROR:_", err);
    // If the error object has a structured responseBody (JSON string), try to extract message from it
    let message = err.message || "Server error";
    try {
      if (err.responseBody) {
        const parsed = JSON.parse(err.responseBody);
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      }
    } catch {
      // ignore parse errors
    }

    return NextResponse.json({ message }, { status: err.statusCode || 500 });
  }
}

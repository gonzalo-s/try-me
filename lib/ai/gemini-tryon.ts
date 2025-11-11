// lib/ai/gemini-tryon.ts
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type Measures = {
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  footSize?: string;
};

export async function tryOnWithGeminiFiles(input: {
  userImage: Uint8Array;
  productImage: Uint8Array;
  measures?: Measures;
  prompt?: string;
}) {
  const m = input.measures ?? {};
  const measureText =
    `User measurements: height ${m.heightCm ?? "?"} cm, chest ${
      m.chestCm ?? "?"
    } cm, ` +
    `waist ${m.waistCm ?? "?"} cm, hips ${m.hipsCm ?? "?"} cm, foot size ${
      m.footSize ?? "?"
    }.`;

  const instruction = [
    "Edit the person photo so they are wearing the provided product image. Product image might be a piece of clothing, accessories or footwear.",
    "Keep identity and background intact. Realistic lighting. Natural fit. No extra accessories.",
    "show full body if possible.",
    "keep product details visible.",
    "keep product colors accurate.",
    "keep product proportions as in the input.",
  ].join(" ");

  const extra = input.prompt?.trim() ? ` ${input.prompt?.trim()}` : "";
  const fullPrompt = `${instruction} ${measureText}${extra}`;

  // Must be an image capable Gemini model
  const modelName =
    process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const model = google(modelName);

  const result = await generateText({
    model,
    // The guide shows this is not strictly required, but it is explicit
    providerOptions: { google: { responseModalities: ["IMAGE"] } },
    maxRetries: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          // Per docs: use type: "image" and the "image" field for bytes or URL
          { type: "image", image: input.userImage, mediaType: "image/png" },
          { type: "image", image: input.productImage, mediaType: "image/png" },
        ],
      },
    ],
  });

  // Primary path per docs: images come in result.files
  let file = result.files?.find(
    (f) => typeof f.mediaType === "string" && f.mediaType.startsWith("image/")
  );

  // Fallback: some SDK builds include image parts on step content
  if (!file && Array.isArray(result.steps)) {
    for (const step of result.steps) {
      const parts = (step as any).content as Array<any> | undefined;
      const imgPart = parts?.find(
        (p) =>
          p?.type === "image" &&
          typeof p?.mediaType === "string" &&
          p.mediaType.startsWith("image/") &&
          p?.data
      );
      if (imgPart) {
        file = imgPart;
        break;
      }
    }
  }

  if (!file) {
    // Log a detailed WHY to your server console
    const firstStep = (result as any)?.steps?.[0];
    console.error("[gemini try-on] No image in response", {
      modelName,
      finishReason: firstStep?.finishReason,
      warnings: firstStep?.warnings,
      providerMetadata: firstStep?.providerMetadata, // often contains safety or rate info
      filesCount: result.files?.length ?? 0,
      hasSteps: Array.isArray(result.steps),
      stepContentTypes: Array.isArray(result.steps)
        ? (firstStep?.content || []).map((p: any) => p?.type || typeof p)
        : [],
      hint: "Use an image capable model like gemini-2.5-flash-image. Check quota and safety blocks. Make sure inputs use type: 'image' and small PNG or JPEG.",
    });
    throw new Error(
      `Gemini returned no image. Model "${modelName}". Check quota, safety filters, or invalid inputs. See server logs for details.`
    );
  }

  const data: Uint8Array | undefined =
    (file as any).data ?? (file as any).uint8Array;
  if (!data) {
    console.error("[gemini try-on] Image part missing binary data", {
      modelName,
      fileKeys: Object.keys(file),
    });
    throw new Error("Image part missing binary data");
  }

  const mime = (file as any).mediaType || "image/png";
  const base64 = Buffer.from(data).toString("base64");
  return `data:${mime};base64,${base64}`;
}

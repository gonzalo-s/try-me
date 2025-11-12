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
  userImage: Uint8Array; // PNG or JPEG bytes
  productImage: Uint8Array; // PNG or JPEG bytes
  measures?: Measures;
  prompt?: string;
}) {
  const m = input.measures ?? {};
  const measuresLine =
    `User measurements: height ${m.heightCm ?? "?"} cm, chest ${
      m.chestCm ?? "?"
    } cm, ` +
    `waist ${m.waistCm ?? "?"} cm, hips ${m.hipsCm ?? "?"} cm, foot size ${
      m.footSize ?? "?"
    }.`;

  // System rules to preserve the product exactly
  const system = [
    "You are a photo editor that composes a realistic try-on image from a user photo and a product photo.",
    "Rules:",
    "1) Maintain the product exactly as provided. Do not change proportions, silhouette, logo placement, textures, or colors.",
    "2) Fit the product naturally to the user without stretching or warping the product.",
    "3) Preserve the user identity and the original background. Use realistic lighting and shadows consistent with the user photo.",
    "4) Do not add accessories, text, or additional elements.",
    "5) If uncertain, favor minimal changes over hallucination.",
  ].join(" ");

  const instruction = [
    "Task: make the person in USER_PHOTO wear the item in PRODUCT_PHOTO.",
    "Show full body if possible. Keep product details visible, colors accurate, and proportions unchanged.",
    measuresLine,
    input.prompt?.trim() ? `Extra notes: ${input.prompt.trim()}` : "",
  ].join(" ");

  const modelName =
    process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const model = google(modelName);

  const result = await generateText({
    model,
    system,
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"], // request an image back
        // imageConfig: { aspectRatio: "1:1" }, // optional
      },
    },
    maxRetries: 0,
    messages: [
      {
        role: "user",
        content: [
          // Tag files with adjacent text markers so the model knows which is which
          { type: "text", text: instruction },

          { type: "text", text: "USER_PHOTO:" },
          { type: "file", data: input.userImage, mediaType: "image/png" },

          { type: "text", text: "PRODUCT_PHOTO:" },
          { type: "file", data: input.productImage, mediaType: "image/png" },
        ],
      },
    ],
  });

  // Expected location for image output
  let file = result.files?.find(
    (f) => typeof f.mediaType === "string" && f.mediaType.startsWith("image/")
  );

  // Fallback for SDK builds that place files inside step content
  if (!file && Array.isArray(result.steps)) {
    for (const step of result.steps) {
      const parts = (step as any).content as Array<any> | undefined;
      const img = parts?.find(
        (p) =>
          (p?.type === "file" || p?.type === "image") &&
          typeof p?.mediaType === "string" &&
          p.mediaType.startsWith("image/") &&
          (p?.data || p?.uint8Array)
      );
      if (img) {
        file = img;
        break;
      }
    }
  }

  if (!file) {
    const first = (result as any)?.steps?.[0];
    console.error("[gemini try-on] No image in response", {
      modelName,
      finishReason: first?.finishReason,
      warnings: first?.warnings,
      providerMetadata: first?.providerMetadata,
      filesCount: result.files?.length ?? 0,
      hasSteps: Array.isArray(result.steps),
      stepContentTypes: Array.isArray(result.steps)
        ? (first?.content || []).map((p: any) => p?.type || typeof p)
        : [],
      hint: "Use an image-capable model, include responseModalities: ['IMAGE'], and ensure inputs are small PNG or JPEG. Also check quota and safety.",
    });
    throw new Error(
      `Gemini returned no image. Model "${modelName}". See server logs for details.`
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
  return `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
}

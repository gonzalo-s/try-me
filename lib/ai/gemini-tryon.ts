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

type AllowedAspect = "1:1" | "3:4" | "9:16";

export async function tryOnWithGeminiFiles(input: {
  userImage: Uint8Array; // PNG or JPEG bytes
  productImage: Uint8Array; // PNG or JPEG bytes
  userImageAspect: AllowedAspect; // computed on client, validated by Zod
  measures?: Measures;
  prompt?: string;
}) {
  const m = input.measures ?? {};

  const height = m.heightCm ? `height ${m.heightCm} cm` : null;
  const chest = m.chestCm ? `chest ${m.chestCm} cm` : null;
  const waist = m.waistCm ? `waist ${m.waistCm} cm` : null;
  const hips = m.hipsCm ? `hips ${m.hipsCm} cm` : null;
  const footSize = m.footSize ? `foot size ${m.footSize}` : null;

  const hasMeasures = height || chest || waist || hips || footSize;

  // if hasMeasures is null, then measuresLine will be null"
  const measuresLine = hasMeasures
    ? `User measurements: ${[height, chest, waist, hips, footSize]
        .filter(Boolean)
        .join(", ")}.`
    : null;

  const system = [
    "You are a photo editor that composes a realistic try-on image from a user photo and a product photo.",
    "Rules:",
    "1) Maintain the product exactly as provided. Do not change proportions, silhouette, logo placement, textures, or colors.",
    "2) Fit the product naturally to the user without stretching or warping the product.",
    "3) Preserve the user identity and the original background. Use realistic lighting and shadows consistent with the user photo.",
    "4) Do not add accessories, text, or additional elements.",
    "5) If uncertain, favor minimal changes over hallucination.",
    "6) NEVER truncate or crop the product or the user.",
  ].join(" ");

  const instruction = [
    "Task: make the person in USER_PHOTO wear the item in PRODUCT_PHOTO.",
    "Show full body if USER_PHOTO has full body. Keep product details visible, colors accurate, and proportions unchanged.",
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
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: input.userImageAspect }, // use client aspect directly
      },
    },
    maxRetries: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },

          { type: "text", text: "USER_PHOTO:" },
          { type: "file", data: input.userImage, mediaType: "image/png" },

          { type: "text", text: "PRODUCT_PHOTO:" },
          { type: "file", data: input.productImage, mediaType: "image/png" },
        ],
      },
    ],
  });

  let file = result.files?.find(
    (f) => typeof f.mediaType === "string" && f.mediaType.startsWith("image/")
  );

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
      aspectRequested: input.userImageAspect,
      finishReason: first?.finishReason,
      warnings: first?.warnings,
      providerMetadata: first?.providerMetadata,
      filesCount: result.files?.length ?? 0,
      hint: "Use an image-capable model, include responseModalities ['IMAGE'], ensure inputs are small PNG or JPEG, and check quota or safety.",
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

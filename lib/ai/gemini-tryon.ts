// lib/ai/gemini-tryon.ts
import { google } from "@ai-sdk/google";
import { GeneratedFile, generateText, GenerateTextResult, ToolSet } from "ai";
import { Product } from "../products";

type Measures = {
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  footSize?: string;
};

type AllowedAspect = "1:1" | "3:4" | "9:16";

type GeneratedFileExtended = GeneratedFile & {
  uint8Array?: Uint8Array;
  uint8ArrayData?: Uint8Array;
  base64Data?: string;
  data?: Uint8Array;
};

export type ProductData = Pick<
  Product,
  "title" | "category" | "description" | "composition"
>;

function isImage(mt: unknown): mt is string {
  return typeof mt === "string" && mt.startsWith("image/");
}

function pickFirstImageFile(r: GenerateTextResult<ToolSet, never>) {
  const top = r.files?.find((f) => isImage(f.mediaType));
  if (top) return top;

  for (const s of r.steps ?? []) {
    const parts = Array.isArray(s.content) ? s.content : [];
    const found = parts.find((p) => "mediaType" in p && isImage(p.mediaType));
    if (found) return found as unknown as GeneratedFileExtended;
  }
  return undefined;
}

function extractBytesAndMime(file: GeneratedFileExtended): {
  mime: string;
  bytes: Uint8Array;
} {
  const mime = isImage(file.mediaType) ? file.mediaType : "image/png";

  if (file?.uint8Array) return { mime, bytes: file.uint8Array };
  if (file?.data) return { mime, bytes: file.data };
  if (file?.uint8ArrayData) return { mime, bytes: file.uint8ArrayData };
  if (file?.base64Data) {
    const buf = Buffer.from(file.base64Data, "base64");
    return { mime, bytes: new Uint8Array(buf) };
  }
  throw new Error("No binary data on generated file");
}

export async function tryOnWithGeminiFiles(input: {
  userImage: Uint8Array;
  productImage: Uint8Array;
  userImageAspect: AllowedAspect;
  prductData: ProductData;
  measures?: Measures;
  prompt?: string;
}) {
  const m = input.measures ?? {};
  const pieces: string[] = [];
  if (m.heightCm) pieces.push(`height ${m.heightCm} cm`);
  if (m.chestCm) pieces.push(`chest ${m.chestCm} cm`);
  if (m.waistCm) pieces.push(`waist ${m.waistCm} cm`);
  if (m.hipsCm) pieces.push(`hips ${m.hipsCm} cm`);
  if (m.footSize) pieces.push(`foot size ${m.footSize}`);
  const measuresLine = pieces.length
    ? `User measurements: ${pieces.join(", ")}.`
    : "";

  const system = [
    "You are a photo editor that composes a realistic try-on image from a user photo and a product photo.",
    `Product details: Title: ${input.prductData.title}; Category: ${input.prductData.category}; Description: ${input.prductData.description}; Composition: ${input.prductData.composition}.`,
    "Rules:",
    "1) Maintain the product exactly as provided. Do NOT change proportions, silhouette, logo placement, textures, or colors.",
    "2) Fit the product naturally to the user without stretching or warping the product.",
    "3) Preserve the user identity and the original background. Use realistic lighting and shadows consistent with the user photo.",
    "4) Do not add accessories, text, or additional elements.",
    "5) If uncertain, favor minimal changes over hallucination.",
    "6) Never crop the product or the user.",
    "7) Do NOT change color, shade, material, fabric",
    "7) apply shades and light according to the USER_PHOTO lighting conditions.",
  ].join(" ");

  //   const system = [
  //   "You are an image compositor that creates realistic try-on images.",
  //   "You must treat PRODUCT_PHOTO as the single source of truth for the item.",
  //   "Hard rules (never break these):",
  //   "1) ALWAYS preserve the product exactly as shown in PRODUCT_PHOTO.",
  //   "   - Do NOT change color, shade, material, fabric, or brightness relative to the garment itself.",
  //   "   - Do NOT change shape, length, silhouette, neckline, sleeve length, or fit design.",
  //   "   - Do NOT remove or modify logos, prints, buttons, zippers, seams, or patterns.",
  //   "2) You may only apply minimal geometric transforms to fit the body:",
  //   "   - Small rotation, translation, and perspective warping are OK.",
  //   "   - Do NOT stretch or squash the product in a way that changes its proportions.",
  //   "3) The final garment in the output image must be visually identical to PRODUCT_PHOTO.",
  //   "   If you cannot keep it visually identical, you must fail instead of inventing a new design.",
  //   "4) Preserve the user identity and original background from USER_PHOTO.",
  //   "5) Do NOT add any new accessories, text, logos, or background elements.",
  //   "6) If the user prompt asks to change color, pattern, design, or shape, IGNORE that part of the prompt.",
  //   "7) Favor minimal changes and composition over creativity. This is a try-on, not a redesign.",
  // ].join(" ");

  const instruction = [
    "Task: make the person in USER_PHOTO wear the item in PRODUCT_PHOTO.",
    "Show full body if present. Keep product details visible, colors accurate, and proportions unchanged.",
    measuresLine,
    input.prompt?.trim() ? `Extra notes: ${input.prompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // const instruction = [
  //   "Task: make the person in USER_PHOTO wear the item in PRODUCT_PHOTO.",
  //   "Use USER_PHOTO as the base image and overlay the product from PRODUCT_PHOTO onto the body.",
  //   "Show full body if USER_PHOTO contains full body.",
  //   "Keep product details visible and sharp. Keep product colors, patterns, and proportions identical to PRODUCT_PHOTO.",
  //   measuresLine,
  //   input.prompt?.trim()
  //     ? `Extra notes (only if they do NOT change product color, pattern, or design): ${input.prompt.trim()}`
  //     : "",
  // ]
  //   .filter(Boolean)
  //   .join(" ");

  const model = google(
    process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image"
  );

  const result = await generateText({
    model,
    system,
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: input.userImageAspect },
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

  const file = pickFirstImageFile(result);
  if (!file) {
    const step0 = result.steps?.[0];
    console.error("[gemini try-on] No image in response", {
      aspectRequested: input.userImageAspect,
      finishReason: step0?.finishReason,
      warnings: step0?.warnings,
      filesCount: result.files?.length ?? 0,
    });
    throw new Error("Gemini returned no image");
  }

  const { mime, bytes } = extractBytesAndMime(file);

  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

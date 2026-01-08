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

function pickImageFromPro(r: GenerateTextResult<ToolSet, never>) {
  const raw = r.steps?.[0]?.response?.body;
  if (!raw) return undefined;

  // @ts-expect-error Missing 'candidates' property on typed response body for pro image responses
  const candidates = raw.candidates || [];
  const first = candidates[0];
  if (!first?.content?.parts) return undefined;

  // Search for inlineData in parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const part of first.content.parts as any[]) {
    if (part.inlineData && part.inlineData.data) {
      return {
        mediaType: part.inlineData.mimeType ?? "image/png",
        base64Data: part.inlineData.data,
      } as GeneratedFileExtended;
    }
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

export async function tryOnWithGeminiFilesb(input: {
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

  // Simplified prompt approach based on "Advanced composition"
  // Just provide the task and the images directly.
  const instruction = [
    "Generate a realistic image of the person provided in the first image wearing the garment provided in the second image.",
    `Product info: ${input.prductData.title} - ${input.prductData.description}`,
    measuresLine,
    "Ensure the garment fits naturally and preserves the person's identity and lighting conditions.",
    input.prompt?.trim()
      ? `Additional requirements: ${input.prompt.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const model = google(
    process.env.GOOGLE_GEMINI_IMAGE_MODEL || "gemini-3-pro-preview"
  );

  const result = await generateText({
    model,
    // No system prompt needed for this advanced composition style usually,
    // or keep it very minimal if required.
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"],
      },
    },
    maxRetries: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "file", data: input.userImage, mediaType: "image/png" },
          { type: "file", data: input.productImage, mediaType: "image/png" },
        ],
      },
    ],
  });

  // Use the Pro extractor for gemini-3-pro-preview
  const file = pickImageFromPro(result);

  if (!file) {
    const step0 = result.steps?.[0];
    console.error("[gemini try-on-b] No image in response", {
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

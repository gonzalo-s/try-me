// lib/ai/fal-tryon.ts
import { experimental_generateImage as generateImage } from "ai";
import { fal } from "@ai-sdk/fal";

type Measures = {
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  footSize?: string;
};

export async function tryOnWithFalFlux(input: {
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
    "Edit the person image so they are wearing the provided product image.",
    "Keep identity and background intact. Realistic lighting. Natural fit.",
    measureText,
    input.prompt ? `Extra notes: ${input.prompt}` : "",
  ].join(" ");

  // Pick a Fal image model. Flux models are a good start.
  const modelId = process.env.FAL_IMAGE_MODEL || "fal-ai/flux-realism";

  const { image } = await generateImage({
    model: fal.image(modelId),
    prompt: instruction,
    images: [
      { data: input.userImage, mimeType: "image/png" },
      { data: input.productImage, mimeType: "image/png" },
    ],
    size: "1024x1024",
    maxRetries: 0,
  });

  if (image?.url) return image.url;
  if (image?.base64) return `data:image/png;base64,${image.base64}`;
  if (image?.uint8Array) {
    return `data:image/png;base64,${Buffer.from(image.uint8Array).toString(
      "base64"
    )}`;
  }
  throw new Error("No image returned from Fal");
}

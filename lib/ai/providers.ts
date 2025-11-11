export type TryOnInput = {
  userImage: Uint8Array;
  productImage: Uint8Array;
  prompt?: string;
  productSlug: string;
  // pass measurements so the prompt always includes them
  measures?: {
    heightCm?: number;
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    footSize?: string;
  };
};

export type TryOnResult = {
  imageBuffer: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
};

export enum Provider {
  Sharp = "sharp",
  Stability = "stability",
  Replicate = "replicate",
  Gemini = "gemini",
}

export function getProviderFromEnv(): Provider {
  const v = (process.env.TRYME_PROVIDER || "").toLowerCase();
  if (v === "stability") return Provider.Stability;
  if (v === "replicate") return Provider.Replicate;
  if (v === "gemini") return Provider.Gemini;
  return Provider.Sharp;
}

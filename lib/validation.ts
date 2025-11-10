import { z } from "zod";

export const measuresSchema = z.object({
  heightCm: z.number().min(120).max(230).optional(),
  chestCm: z.number().min(60).max(140).optional(),
  waistCm: z.number().min(50).max(140).optional(),
  hipsCm: z.number().min(60).max(150).optional(),
  footSize: z.string().max(8).optional(),
});

export const tryOnPayloadSchema = z.object({
  productSlug: z.string(),
  productImageUrl: z.string().url(),
  prompt: z.string().max(200).optional(),
  // user image will come via multipart, not here
  measures: measuresSchema,
});
export type TryOnPayload = z.infer<typeof tryOnPayloadSchema>;

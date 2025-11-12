import { z } from "zod";

export const measuresSchema = z.object({
  heightCm: z.number().min(100).max(230).optional(),
  chestCm: z.number().min(50).max(140).optional(),
  waistCm: z.number().min(50).max(140).optional(),
  hipsCm: z.number().min(60).max(150).optional(),
  footSize: z.string().max(8).optional(),
});

// only square or vertical
export const allowedAspects = z.enum(["1:1", "3:4", "9:16"]);

export const tryOnPayloadSchema = z.object({
  productSlug: z.string(),
  productImageUrl: z.string().url(),
  prompt: z.string().max(200).optional(),
  userImageAspect: allowedAspects, // required: computed on client
  measures: measuresSchema.optional(),
});

export type TryOnPayload = z.infer<typeof tryOnPayloadSchema>;

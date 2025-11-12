import { z } from "zod";

// Accept empty inputs: react-hook-form may send `NaN` for empty number fields
// (when using `valueAsNumber`). We preprocess values to convert empty strings
// or `NaN` to `undefined` so the optional numeric fields are truly optional.
const numberOrEmpty = (min?: number, max?: number) =>
  z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      if (typeof v === "number" && Number.isNaN(v)) return undefined;
      // allow strings that look like numbers too
      if (typeof v === "string") {
        const n = Number(v);
        if (Number.isNaN(n)) return undefined;
        return n;
      }
      return v;
    },
    z
      .number()
      .refine((n) => n == null || !Number.isNaN(n))
      .transform((n) => n as number)
      .optional()
      .superRefine((val, ctx) => {
        if (val == null) return;
        if (typeof min === "number" && val < min)
          ctx.addIssue({
            code: z.ZodIssueCode.too_small as any,
            minimum: min,
            path: [],
            message: `Must be >= ${min}`,
          });
        if (typeof max === "number" && val > max)
          ctx.addIssue({
            code: z.ZodIssueCode.too_big as any,
            maximum: max,
            path: [],
            message: `Must be <= ${max}`,
          });
      })
  );

export const measuresSchema = z.object({
  heightCm: numberOrEmpty(100, 230),
  chestCm: numberOrEmpty(50, 140),
  waistCm: numberOrEmpty(50, 140),
  hipsCm: numberOrEmpty(60, 150),
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

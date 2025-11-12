"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { tryOnPayloadSchema } from "@/lib/validation";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof tryOnPayloadSchema> & {
  userImageFile?: FileList; // keep file in RHF, not in Zod
};

function pickAspectLabelFromWH(
  width: number,
  height: number
): "1:1" | "3:4" | "9:16" {
  if (width === height) return "1:1";
  // vertical only here: width <= height already checked
  const r = width / height;
  const cands = [
    { label: "1:1" as const, val: 1 },
    { label: "3:4" as const, val: 3 / 4 },
    { label: "9:16" as const, val: 9 / 16 },
  ];
  let best = cands[0];
  let bestDiff = Math.abs(r - best.val);
  for (let i = 1; i < cands.length; i++) {
    const d = Math.abs(r - cands[i].val);
    if (d < bestDiff) {
      best = cands[i];
      bestDiff = d;
    }
  }
  return best.label;
}

export default function TryMePanel({ product }: { product: Product }) {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(tryOnPayloadSchema),
    defaultValues: {
      productSlug: product.slug,
      productImageUrl: product.images[0],
      prompt: "",
      measures: {},
      // userImageAspect set after file load
    } as any,
  });

  const fileRegister = register("userImageFile");

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🚀 ~ onFileChange ~ e:", e, "--", e.target.files?.[0]);
    // keep RHF in sync
    fileRegister.onChange?.(e);

    const file = e.target.files?.[0];
    console.log("🚀 ~ onFileChange ~ file:", file);

    if (!file) {
      setError("userImageFile" as any, {
        type: "required",
        message: "Please upload a user photo",
      });
      return;
    }

    try {
      const bmp = await createImageBitmap(file);
      const width = bmp.width;
      const height = bmp.height;

      // reject horizontal
      if (width > height) {
        // clear file from RHF and input
        setValue("userImageFile", undefined as any, { shouldValidate: false });
        e.target.value = "";
        setError("userImageFile" as any, {
          type: "validate",
          message: "Image must be vertical or square, not horizontal",
        });
        return;
      }

      const aspectLabel = pickAspectLabelFromWH(width, height);
      setValue("userImageAspect", aspectLabel, { shouldValidate: true });
    } catch {
      setError("userImageFile" as any, {
        type: "validate",
        message: "Could not read image. Try another file",
      });
    }
  };

  async function onSubmit(values: FormValues) {
    console.log("🚀 ~ onSubmit ~ values:", values);
    setServerError(null);

    // read the file from RHF state, not from the DOM
    const fileList = watch("userImageFile");
    const file = fileList?.[0];

    if (!file) {
      setError("userImageFile" as any, {
        type: "required",
        message: "Please upload a user photo",
      });
      return;
    }

    const fd = new FormData();
    fd.set(
      "json",
      JSON.stringify({
        productSlug: values.productSlug,
        productImageUrl: values.productImageUrl,
        prompt: values.prompt,
        measures: values.measures,
        userImageAspect: values.userImageAspect, // required by schema
      })
    );
    fd.set("userImage", file, file.name);

    try {
      const res = await fetch("/api/tryon", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "Generation failed");
        setServerError(text || "Generation failed");
        return;
      }
      const data = await res.json();
      setResultUrl(data.imageUrl); // data:image/png;base64,...
    } catch (err: any) {
      setServerError(err?.message ?? "Network error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border bg-white p-4 space-y-3"
      aria-labelledby="tryme-heading"
      noValidate
      encType="multipart/form-data"
    >
      <h2 id="tryme-heading" className="font-medium">
        Your data
      </h2>

      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded bg-red-50 border border-red-200 p-2 text-red-800"
        >
          {serverError}
        </div>
      )}

      <fieldset
        className="grid grid-cols-2 gap-3"
        aria-describedby="measures-desc"
      >
        <legend className="sr-only">Measurements</legend>
        <p id="measures-desc" className="sr-only">
          Provide your measurements in centimeters where available.
        </p>

        <div>
          <Label htmlFor="heightCm">Height cm</Label>
          <Input
            id="heightCm"
            type="number"
            aria-invalid={!!errors?.measures?.heightCm}
            aria-describedby={
              errors?.measures?.heightCm ? "heightCm-error" : undefined
            }
            {...register("measures.heightCm", { valueAsNumber: true })}
          />
          {errors?.measures?.heightCm?.message && (
            <p
              id="heightCm-error"
              role="alert"
              className="text-sm text-red-600 mt-1"
            >
              {String(errors.measures.heightCm.message)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="chestCm">Chest cm</Label>
          <Input
            id="chestCm"
            type="number"
            aria-invalid={!!errors?.measures?.chestCm}
            aria-describedby={
              errors?.measures?.chestCm ? "chestCm-error" : undefined
            }
            {...register("measures.chestCm", { valueAsNumber: true })}
          />
          {errors?.measures?.chestCm?.message && (
            <p
              id="chestCm-error"
              role="alert"
              className="text-sm text-red-600 mt-1"
            >
              {String(errors.measures.chestCm.message)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="waistCm">Waist cm</Label>
          <Input
            id="waistCm"
            type="number"
            aria-invalid={!!errors?.measures?.waistCm}
            aria-describedby={
              errors?.measures?.waistCm ? "waistCm-error" : undefined
            }
            {...register("measures.waistCm", { valueAsNumber: true })}
          />
          {errors?.measures?.waistCm?.message && (
            <p
              id="waistCm-error"
              role="alert"
              className="text-sm text-red-600 mt-1"
            >
              {String(errors.measures.waistCm.message)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="footSize">Foot size</Label>
          <Input
            id="footSize"
            placeholder="EU 42"
            aria-invalid={!!errors?.measures?.footSize}
            aria-describedby={
              errors?.measures?.footSize ? "footSize-error" : undefined
            }
            {...register("measures.footSize")}
          />
          {errors?.measures?.footSize?.message && (
            <p
              id="footSize-error"
              role="alert"
              className="text-sm text-red-600 mt-1"
            >
              {String(errors.measures.footSize.message)}
            </p>
          )}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Short instruction, for example place the cap on my head"
          aria-invalid={!!errors?.prompt}
          aria-describedby={errors?.prompt ? "prompt-error" : undefined}
          {...register("prompt")}
        />
        {errors?.prompt?.message && (
          <p
            id="prompt-error"
            role="alert"
            className="text-sm text-red-600 mt-1"
          >
            {String(errors.prompt.message)}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="userImageFile">Your photo</Label>
        <Input
          id="userImageFile"
          type="file"
          accept="image/*"
          {...fileRegister} // name + ref for RHF
          onChange={onFileChange} // compose custom logic
          aria-describedby={
            errors?.userImageFile ? "userImage-error" : undefined
          }
        />
        {errors?.userImageFile?.message && (
          <p
            id="userImage-error"
            role="alert"
            className="text-sm text-red-600 mt-1"
          >
            {String(errors.userImageFile.message)}
          </p>
        )}
      </div>

      {/* hidden field that we set after analyzing the file */}
      <input type="hidden" {...register("userImageAspect")} />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Generating..." : "Try me"}
      </Button>

      {resultUrl && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Try-me output</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="result"
            className="rounded border h-[500]"
          />
        </div>
      )}

      {/* keep these hidden fields */}
      <input type="hidden" {...register("productSlug")} />
      <input type="hidden" {...register("productImageUrl")} />
    </form>
  );
}

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
  userImageFile?: File | null;
};

export default function TryMePanel({ product }: { product: Product }) {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(tryOnPayloadSchema),
    defaultValues: {
      productSlug: product.slug,
      productImageUrl: product.images[0],
      prompt: "",
      measures: {},
    } as any,
  });
  console.log("🚀 ~ TryMePanel ~ errors:", errors);
  console.log("🚀 ~ TryMePanel ~ register:", register);

  async function onSubmit(values: any) {
    setServerError(null);
    const fd = new FormData();
    fd.set("json", JSON.stringify(values));
    const file = (document.getElementById("userImage") as HTMLInputElement)
      ?.files?.[0];
    if (!file) {
      // set an accessible form error and focus it
      setError("userImageFile" as any, {
        type: "required",
        message: "Please upload a user photo",
      });
      return;
    }
    fd.set("userImage", file, file.name);

    try {
      const res = await fetch("/api/tryon", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "Generation failed");
        setServerError(text || "Generation failed");
        return;
      }
      const data = await res.json();
      setResultUrl(data.imageUrl); // data:image/png;base64,....
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
        <Label htmlFor="userImage">Your photo</Label>
        <Input
          id="userImage"
          type="file"
          accept="image/*"
          aria-describedby={
            errors?.userImageFile ? "userImage-error" : undefined
          }
          {...register("userImageFile")}
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Generating..." : "Try me"}
      </Button>

      {resultUrl && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Try-me output</h3>
          {/* resultUrl is a data URL from the API */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="result" className="rounded border" />
        </div>
      )}

      {/* hidden fields (values are provided via defaultValues above) */}
      <input type="hidden" {...register("productSlug")} />
      <input type="hidden" {...register("productImageUrl")} />
    </form>
  );
}

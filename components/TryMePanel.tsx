"use client";

import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { tryOnPayloadSchema } from "@/lib/validation";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import InnerImageZoom from "react-inner-image-zoom";
import { ProductData } from "@/lib/ai/gemini-tryon-b";

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
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    // zodResolver typing can be strict when using preprocess transforms; cast to any
    resolver: zodResolver(tryOnPayloadSchema) as Resolver<FormValues>,
    defaultValues: {
      productSlug: product.slug,
      productImageUrl: product.images[0],
      prompt: "",
      measures: {},
      // userImageAspect set after file load
    } as FormValues,
  });
  console.log("🚀 ~ TryMePanel ~ formState:", isSubmitting);

  const fileRegister = register("userImageFile");

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // keep RHF in sync
    fileRegister.onChange?.(e);

    const file = e.target.files?.[0];

    if (!file) {
      setError("userImageFile", {
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
        setValue("userImageFile", undefined, { shouldValidate: false });
        e.target.value = "";
        setError("userImageFile", {
          type: "validate",
          message: "Image must be vertical or square, not horizontal",
        });
        return;
      }

      const aspectLabel = pickAspectLabelFromWH(width, height);
      setValue("userImageAspect", aspectLabel, { shouldValidate: true });

      // Create object URL for immediate feedback
      setUserPreviewUrl(URL.createObjectURL(file));
      // Clear previous generated result if any, so user sees the new upload
      setResultUrl(null);
    } catch {
      setError("userImageFile", {
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
      setError("userImageFile", {
        type: "required",
        message: "Please upload a user photo",
      });
      return;
    }

    const productData: ProductData = {
      title: product.title,
      category: product.category,
      description: product.description,
      composition: product.composition,
    };

    const fd = new FormData();
    fd.set(
      "json",
      JSON.stringify({
        productSlug: values.productSlug,
        productImageUrl: values.productImageUrl,
        prompt: values.prompt,
        measures: values.measures,
        userImageAspect: values.userImageAspect, // required by schema
        productData,
      })
    );
    fd.set("userImage", file, file.name);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => "Generation failed");
        let errorMessage = text;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) {
            errorMessage = json.error.message;
          } else if (json.message) {
            errorMessage = json.message;
          }
        } catch {
          // ignore
        }
        setServerError(errorMessage || "Generation failed");
        return;
      }
      const data = await res.json();
      setResultUrl(data.imageUrl); // data:image/png;base64,...
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setServerError("Request timed out. Please try again.");
        } else {
          setServerError(err.message ?? "Network error");
        }
      } else {
        setServerError(String(err) || "Network error");
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border bg-white p-4 space-y-3 text-stone-950 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
      aria-labelledby="tryme-heading"
      noValidate
      encType="multipart/form-data"
    >
      <h2 id="tryme-heading" className="font-medium">
        Your data
      </h2>

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
              className="text-sm text-red-200 font-medium mt-1"
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
              className="text-sm text-red-200 font-medium mt-1"
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
              className="text-sm text-red-200 font-medium mt-1"
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
              className="text-sm text-red-200 font-medium mt-1"
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
          placeholder="E.g.: Tuck my shirt in."
          aria-invalid={!!errors?.prompt}
          aria-describedby={errors?.prompt ? "prompt-error" : undefined}
          {...register("prompt")}
        />
        {errors?.prompt?.message && (
          <p
            id="prompt-error"
            role="alert"
            className="text-sm text-red-200 font-medium mt-1"
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
          className="hover:cursor-pointer hover:file:cursor-pointer"
        />
        {errors?.userImageFile?.message && (
          <p
            id="userImage-error"
            role="alert"
            className="text-sm text-red-200 font-medium mt-1"
          >
            {String(errors.userImageFile.message)}
          </p>
        )}
      </div>

      {/* hidden field that we set after analyzing the file */}
      <input type="hidden" {...register("userImageAspect")} />

      {/* action area: keep a fixed min width so swapping button <-> loader doesn't cause layout shift */}
      <div className="inline-block min-w-[8rem] w-full">
        {
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-lg font-bold shadow-md hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            {!isSubmitting ? "TRY ME" : "Generating Image..."}
          </Button>
        }
      </div>

      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-2 text-sm text-red-600 font-medium text-center"
        >
          {serverError}
        </div>
      )}

      {(resultUrl || userPreviewUrl) && (
        <div className="mt-6">
          <h3 className="font-bold text-lg mb-3 text-primary">
            {resultUrl ? "Try-me output" : "Preview"}
          </h3>
          <div className="p-1.5 shadow-xl rounded-xl inline-block">
            <div
              className={`rounded-lg bg-white overflow-hidden max-w-[500px] transition-all duration-700 ${
                isSubmitting ? "blur-md opacity-80" : ""
              }`}
            >
              <InnerImageZoom
                src={resultUrl || userPreviewUrl || ""}
                zoomSrc={resultUrl || userPreviewUrl || ""}
                zoomType="hover"
                zoomScale={1.5}
              />
            </div>
          </div>
        </div>
      )}

      <input type="hidden" {...register("productSlug")} />
      <input type="hidden" {...register("productImageUrl")} />
    </form>
  );
}

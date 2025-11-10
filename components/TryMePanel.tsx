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
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(tryOnPayloadSchema),
    defaultValues: {
      productSlug: product.slug,
      productImageUrl: product.images[0],
      prompt: "",
      measures: {},
    } as any,
  });

  async function onSubmit(values: any) {
    const fd = new FormData();
    fd.set("json", JSON.stringify(values));
    const file = (document.getElementById("userImage") as HTMLInputElement)
      ?.files?.[0];
    if (!file) {
      alert("Upload a user photo");
      return;
    }
    fd.set("userImage", file, file.name);

    const res = await fetch("/api/tryon", { method: "POST", body: fd });
    if (!res.ok) {
      alert("Generation failed");
      return;
    }
    const data = await res.json();
    setResultUrl(data.imageUrl); // data:image/png;base64,....
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h2 className="font-medium">Your data</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="heightCm">Height cm</Label>
          <Input
            id="heightCm"
            type="number"
            {...register("measures.heightCm", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="chestCm">Chest cm</Label>
          <Input
            id="chestCm"
            type="number"
            {...register("measures.chestCm", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="waistCm">Waist cm</Label>
          <Input
            id="waistCm"
            type="number"
            {...register("measures.waistCm", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="footSize">Foot size</Label>
          <Input
            id="footSize"
            placeholder="EU 42"
            {...register("measures.footSize")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Short instruction, for example place the cap on my head"
          {...register("prompt")}
        />
      </div>

      <div>
        <Label htmlFor="userImage">Your photo</Label>
        <Input id="userImage" type="file" accept="image/*" />
      </div>

      <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
        {isSubmitting ? "Generating..." : "Try me"}
      </Button>

      {resultUrl && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Try-me output</h3>
          {/* resultUrl is a data URL from the API */}
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resultUrl} alt="result" className="rounded border" />
        </div>
      )}

      {/* hidden fields */}
      <input type="hidden" {...register("productSlug")} value={product.slug} />
      <input
        type="hidden"
        {...register("productImageUrl")}
        value={product.images[0]}
      />
    </div>
  );
}

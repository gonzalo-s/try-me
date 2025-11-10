import { NextRequest, NextResponse } from "next/server";
import { tryOnPayloadSchema } from "@/lib/validation";
import sharp from "sharp";

/**
 * Very simple compositor for the POC:
 * - reads user image from multipart
 * - loads product image from the public folder
 * - resizes and overlays at a fixed position based on category
 * - returns PNG as a data URL
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const json = form.get("json");
    const file = form.get("userImage");

    if (!json || typeof json !== "string") {
      return NextResponse.json(
        { error: "Missing json payload" },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing userImage file" },
        { status: 400 }
      );
    }

    const payload = tryOnPayloadSchema.parse(JSON.parse(json));
    const userArray = new Uint8Array(await file.arrayBuffer());

    // load product from public
    const productUrl = new URL(
      payload.productImageUrl,
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
    );
    const productRes = await fetch(productUrl.toString());
    if (!productRes.ok) {
      return NextResponse.json(
        { error: "Cannot load product image" },
        { status: 400 }
      );
    }
    const productArray = new Uint8Array(await productRes.arrayBuffer());

    // decode base images
    const userImg = sharp(userArray).rotate();
    const { width: uw = 800 } = await userImg.metadata();

    // naive placement rules
    // tune these later or replace with real AI
    let overlayWidth = Math.floor((uw || 800) * 0.35);
    let left = Math.floor((uw || 800) * 0.33);
    let top = Math.floor((uw || 800) * 0.18);

    const lc = payload.productSlug;
    if (lc.includes("hat") || lc.includes("cap")) {
      overlayWidth = Math.floor((uw || 800) * 0.28);
      left = Math.floor((uw || 800) * 0.36);
      top = Math.floor((uw || 800) * 0.04);
    } else if (lc.includes("watch")) {
      overlayWidth = Math.floor((uw || 800) * 0.18);
      left = Math.floor((uw || 800) * 0.58);
      top = Math.floor((uw || 800) * 0.45);
    } else if (lc.includes("shoes") || lc.includes("sneaker")) {
      overlayWidth = Math.floor((uw || 800) * 0.35);
      left = Math.floor((uw || 800) * 0.33);
      top = Math.floor((uw || 800) * 0.7);
    } else if (lc.includes("jacket") || lc.includes("shirt")) {
      overlayWidth = Math.floor((uw || 800) * 0.55);
      left = Math.floor((uw || 800) * 0.23);
      top = Math.floor((uw || 800) * 0.2);
    } else if (lc.includes("pants")) {
      overlayWidth = Math.floor((uw || 800) * 0.55);
      left = Math.floor((uw || 800) * 0.23);
      top = Math.floor((uw || 800) * 0.48);
    }

    const productResized = await sharp(productArray)
      .resize({ width: overlayWidth })
      .toBuffer();

    const userPng = await userImg.png().toBuffer();

    const composed = await sharp(userPng)
      .composite([{ input: productResized, left, top }])
      .png()
      .toBuffer();

    const base64 = Buffer.from(composed).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

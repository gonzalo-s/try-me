import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products";
// import TryMePanel from "@/components/TryMePanel";

export default async function PDP({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return notFound();

  return (
    <main className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          {product.images.map((src, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] w-full overflow-hidden rounded border bg-white"
            >
              <Image
                src={src}
                alt={product.title}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div>
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <p className="text-sm text-neutral-500 mb-4">
            Category: {product.category}
          </p>

          {/* <TryMePanel product={product} /> */}
        </div>
      </div>
    </main>
  );
}

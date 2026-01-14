import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products";
import TryMePanel from "@/components/TryMePanel";

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
        <div className="space-y-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
          {product.images.map((src, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border bg-card shadow-sm group"
            >
              <Image
                src={src}
                alt={product.title}
                fill
                className="object-contain group-hover:scale-150 transition-transform duration-700 drop-shadow-[0_4px_16px_rgba(255,200,50,0.8)]"
              />
            </div>
          ))}
        </div>

        <div className="sticky top-6 h-fit">
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary uppercase text-secondary-foreground hover:bg-secondary/80 mb-3">
              {product.category}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">
              {product.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="prose prose-sm text-muted-foreground mb-8 border-l-4 border-primary/20 pl-4 italic">
            Composition: {product.composition}
          </div>

          <TryMePanel product={product} />
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getAllProducts } from "@/lib/products";

export default function PLP() {
  const products = getAllProducts();
  return (
    <main>
      <h1 className="text-4xl font-bold mb-8 text-primary tracking-tight">
        TRY-ON PRODUCTS
      </h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 list-none">
        {products.map((p) => (
          <li
            key={p.slug}
            className="flex justify-center list-none items-stretch drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
          >
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-primary/20 block w-full group"
            >
              <div className="relative aspect-square border-border/50 mb-4  rounded-md bg-muted drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                <Image
                  src={p.images[0]}
                  alt={p.title}
                  fill
                  className="object-cover group-hover:scale-[1.6] transition-transform duration-300 p-4 drop-shadow-[0_4px_12px_rgba(255,255,255,0.8)]"
                />
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs font-medium text-secondary-foreground px-2 py-0.5 rounded-full bg-secondary w-fit inline-block uppercase">
                  {p.category}
                </div>
                <div className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                  {p.title}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

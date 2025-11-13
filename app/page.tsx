import Link from "next/link";
import Image from "next/image";
import { getAllProducts } from "@/lib/products";

export default function PLP() {
  const products = getAllProducts();
  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">try-me: Product List</h1>
      <ul className="grid grid-cols-3 gap-4 list-none">
        {products.map((p) => (
          <li
            key={p.slug}
            className="flex justify-center items-center list-none max-w-64"
          >
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="rounded-lg border bg-white p-3 hover:shadow"
            >
              <div className="relative w-56 h-56 border-b mb-2">
                <Image
                  src={p.images[0]}
                  alt={p.title}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-2">
                <div className="text-sm text-neutral-500">{p.category}</div>
                <div className="font-medium">{p.title}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

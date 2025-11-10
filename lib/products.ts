import data from "../data/products.json";

export type Category = "shirt" | "pants" | "jacket" | "hat" | "watch" | "shoes";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  images: string[];
};

export function getAllProducts(): Product[] {
  return data as Product[];
}

export function getProduct(slug: string): Product | undefined {
  return getAllProducts().find((p) => p.slug === slug);
}

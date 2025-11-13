import { products } from "../data/products";

export type Category =
  | "shirt"
  | "pants"
  | "jacket"
  | "hat"
  | "watch"
  | "shoes"
  | "eyewear";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  images: string[];
  description: string;
  composition: string;
};

export function getAllProducts(): Product[] {
  return products;
}

export function getProduct(slug: string): Product | undefined {
  return getAllProducts().find((p) => p.slug === slug);
}

import type { Category } from "./products";

export function suggestSize(
  category: Category,
  chest?: number,
  waist?: number
) {
  if (category === "shirt" || category === "jacket") {
    const c = chest ?? 100;
    if (c < 92) return "S";
    if (c < 104) return "M";
    if (c < 116) return "L";
    return "XL";
  }
  if (category === "pants") {
    const w = waist ?? 84;
    if (w < 78) return "S";
    if (w < 90) return "M";
    if (w < 102) return "L";
    return "XL";
  }
  return "One size";
}

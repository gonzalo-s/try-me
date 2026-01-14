import { Product } from "@/lib/products";

export const products: Product[] = [
  {
    slug: "shirt-oxford-blue",
    title: "Oxford Shirt Blue",
    category: "shirt",
    images: ["/products/shirt-front-b.png", "/products/shirt-back-b.png"],
    description:
      "Regular fit shirt made of cotton fabric. Buttoned collar and long sleeves with buttoned cuffs. Chest patch pocket. Front button closure. No labels or tags are visible.",
    composition: "OUTER SHELL 100% cotton",
  },
  {
    slug: "pants-chino-khaki",
    title: "Chino Pants Khaki",
    category: "pants",
    images: ["/products/pants-front-b.png", "/products/pants-back-b.png"],
    description:
      "Skinny fit full-length trousers made of stretchy cotton blend fabric that extend completely to the ankles. Front pockets and back welt pockets. Front zip and button closure. Hemline rests on the shoe, ensuring total leg coverage.",
    composition: "OUTER SHELL 97% cotton 3% elastane",
  },
  {
    slug: "jacket-bomber-checkered",
    title: "CHECKERED BOMBER JACKET",
    category: "jacket",
    images: ["/products/jacket-front-b.png", "/products/jacket-back-b.png"],
    description:
      "Regular fit jacket made of dense, micro-scale grey plaid polyester and wool blend fabric. Contrasting shaggy long-pile blue faux fur collar. Long sleeves covering both full arms with tall black ribbed cuffs. Welt pockets at the hip. Wide black ribbed waistband. Button-up front closure.",
    composition:
      "OUTER SHELL 33% acrylic 31% polyester 29% wool 5% polyamide 2% other fibres LINING 80% polyester 20% cotton",
  },
  {
    slug: "washed-bucket-hat",
    title: "WASHED BUCKET HAT",
    category: "hat",
    images: ["/products/hat-b.png"],
    description:
      "Bucket hat made in cotton fabric. Wide brim with topstitching detail. Washed effect.",
    composition: "OUTER SHELL 100% cotton",
  },
  {
    slug: "tag-heuer-formula-1-chronograph",
    title: "TAG Heuer Formula 1 Chronograph",
    category: "watch",
    images: ["/products/watch-b.png"],
    description:
      "Inspired by the intensity of racing, the TAG Heuer Formula 1 Chronograph in 44mm is crafted for true racing enthusiasts. The sleek titanium grade 2 case and vibrant red accents make this timepiece a bold statement on and off the track.",
    composition: "Case: Titanium Grade 2 Strap: Rubber",
  },
  {
    slug: "chunky-rolled-seam-shoes",
    title: "CHUNKY ROLLED SEAM SHOES",
    category: "shoes",
    images: ["/products/shoe-front-b.png", "/products/shoe-side-b.png"],
    description:
      "Dress shoes. Rolled seam detail at instep. Lacing with two pairs of eyelets. Rounded shape. Chunky lug soles.",
    composition:
      "UPPER 100% polyurethane LINING 56% polyurethane 44% polyester SOLE 100% sbs INSOLE 100% polyurethane",
  },
  {
    slug: "vulk-rolling-stone-sunglasses",
    title: "Rolling Stone Sunglasses",
    category: "eyewear",
    images: [
      "/products/sunglasses-front-b.png",
      "/products/sunglasses-side-b.png",
    ],
    description:
      "Rolling Stone Glossy black acetate sunglasses in a squared navigator silhouette, defined by a rigid, straight flat-top clean brow bar running the full width. A secondary lower bridge creates a distinct central rectangular cutout (double bridge).The frame front surface is completely clean and unadorned. Features light blue-to-clear gradient lenses and wide temples adorned with a silver crown logo on the sides.",
    composition:
      "Frame: Acetate, Temples: Acetate, Lenses: CR39 | 100% UVA & UVB",
  },
];

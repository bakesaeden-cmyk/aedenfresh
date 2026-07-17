import type { Metadata } from "next";

import MarketingProductDetail from "@/components/marketing/marketing-product-detail";

export const metadata: Metadata = {
  title: "Product Guide",
  description:
    "Discover origins, flavour, nutrition, and health notes for the premium produce at Aeden Fresh.",
};

export default function ProductDetailPage() {
  return <MarketingProductDetail />;
}

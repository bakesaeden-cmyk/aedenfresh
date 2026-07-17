import type { Metadata } from "next";

import MarketingProducts from "@/components/marketing/marketing-products";

export const metadata: Metadata = {
  title: "Our Products",
  description:
    "Browse Aeden Fresh's imported fruits, Indian varieties, and premium fresh produce.",
};

export default function ProductsPage() {
  return <MarketingProducts />;
}

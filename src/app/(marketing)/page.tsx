import type { Metadata } from "next";

import MarketingHome from "@/components/marketing/marketing-home";

export const metadata: Metadata = {
  title: "Premium Fresh Grocery in Kochi",
  description:
    "Explore Aeden Fresh's global fruit, farm-fresh vegetables, artisan bakery, premium dairy, fresh kitchen, stores, and story.",
};

export default function MarketingPage() {
  return <MarketingHome />;
}

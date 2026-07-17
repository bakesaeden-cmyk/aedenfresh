import type { Metadata } from "next";

import MarketingStores from "@/components/marketing/marketing-stores";

export const metadata: Metadata = {
  title: "Our Stores",
  description:
    "Find Aeden Fresh stores across Kochi, with opening hours, directions, and contact details.",
};

export default function StoresPage() {
  return <MarketingStores />;
}

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: {
    default: "Aeden Fresh — Feel Good Food, Made Around You",
    template: "%s · Aeden Fresh",
    },
    description:
      "Build a personalised fresh bowl, see live nutrition, schedule flexible deliveries, and order on web or WhatsApp from Aeden Fresh in Kochi.",
    keywords: [
      "fresh bowls Kochi",
      "healthy food delivery Kochi",
      "salad subscription Kochi",
      "build your own salad",
      "Aeden Fresh",
    ],
    category: "food and drink",
    icons: { icon: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Aeden Fresh",
      title: "Aeden Fresh — Feel Good Food, Made Around You",
      description:
        "Personalised bowls, honest nutrition, and recurring fresh deliveries that move with your week.",
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "Aeden Fresh — Feel good food, made around you" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Aeden Fresh — Feel Good Food, Made Around You",
      description: "Personalised bowls, honest nutrition, and flexible fresh deliveries in Kochi.",
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F2E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

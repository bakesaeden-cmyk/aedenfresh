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
    default: "Aeden Fresh — Fresh From the World. Fresh to Your Table.",
    template: "%s · Aeden Fresh",
    },
    description:
      "Kerala's premium fresh grocery experience: imported fruit, local produce, artisan bakery, premium dairy, and Fresh Commerce in Kochi.",
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
      title: "Aeden Fresh — Fresh From the World. Fresh to Your Table.",
      description:
        "Premium global fruit, local produce, artisan bakery, and Fresh Commerce—beautifully curated in Kochi.",
      images: [{ url: "/opengraph.jpg", width: 1280, height: 720, alt: "Aeden Fresh — Fresh from the world. Fresh to your table." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Aeden Fresh — Fresh From the World. Fresh to Your Table.",
      description: "Premium fresh grocery and flexible Fresh Commerce in Kochi.",
      images: ["/opengraph.jpg"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#F9F7F1",
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
